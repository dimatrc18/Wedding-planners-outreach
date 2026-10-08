// Analytics with small-sample honesty: every rate carries a Wilson 95% interval.

import { FUNNEL_RANK, DEFAULT_SETTINGS } from './constants.js';
import { COLD_STEPS, isRealReply } from './sequence.js';
import { localParts } from './time.js';

export function wilson(k, n, z = 1.96) {
  if (!n) return { k, n, p: null, lo: 0, hi: 1 };
  const p = k / n, z2 = z * z, den = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / den;
  return { k, n, p, lo: Math.max(0, center - half), hi: Math.min(1, center + half) };
}

// Contacts needed for a ±halfWidth interval around rate p (uses 0.12 when nothing is known yet).
export function samplesNeeded(p, halfWidth = 0.05, z = 1.96) {
  const q = p === null || p === 0 || p === 1 ? 0.12 : p;
  return Math.ceil((z * z * q * (1 - q)) / (halfWidth * halfWidth));
}

export function confidenceLabel(ci) {
  if (!ci.n) return 'none';
  const half = (ci.hi - ci.lo) / 2;
  return half > 0.1 ? 'low' : half > 0.05 ? 'medium' : 'high';
}

function normCdf(x) {
  // Abramowitz-Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

// Two-proportion z-test. Returns a two-sided p-value (null when a side has no data).
export function compareRates(a, b) {
  if (!a.n || !b.n) return null;
  const p = (a.k + b.k) / (a.n + b.n);
  const se = Math.sqrt(p * (1 - p) * (1 / a.n + 1 / b.n));
  if (!se) return 1;
  const z = (a.k / a.n - b.k / b.n) / se;
  return 2 * (1 - normCdf(Math.abs(z)));
}

const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const t0 = (x) => (x ? new Date(x).getTime() : null);

export function groupTouches(touches) {
  const by = new Map();
  for (const t of touches) { if (!by.has(t.prospect_id)) by.set(t.prospect_id, []); by.get(t.prospect_id).push(t); }
  for (const list of by.values()) list.sort((a, b) => (t0(a.sent_at || a.created_at) || 0) - (t0(b.sent_at || b.created_at) || 0));
  return by;
}

// Per-prospect facts reused by every metric.
export function prospectFacts(p, list = [], opps = []) {
  const sentCold = list.filter((t) => t.direction === 'out' && t.state === 'sent' && COLD_STEPS.includes(t.step_name));
  const firstOut = sentCold[0] || null;
  const replies = list.filter(isRealReply);
  const firstReply = replies.sort((a, b) => t0(a.replied_at || a.created_at) - t0(b.replied_at || b.created_at))[0] || null;
  const rateCard = list.find((t) => t.direction === 'out' && t.state === 'sent' && t.step_name === 'rate_card_delivery') || null;
  const rank = FUNNEL_RANK[p.status] ?? 0;
  const myOpps = opps.filter((o) => o.prospect_id === p.id);
  const replyAt = firstReply ? t0(firstReply.replied_at || firstReply.created_at) : null;
  const lastStepBeforeReply = replyAt ? [...sentCold].filter((t) => t0(t.sent_at) <= replyAt).pop() : null;
  return {
    contacted: !!firstOut || rank >= 2,
    firstOut, firstReply, replied: !!firstReply,
    positive: replies.some((t) => t.reply_sentiment === 'positive'),
    rateCardSent: !!rateCard || rank >= 4,
    rateCardAt: rateCard ? t0(rateCard.sent_at) : null,
    quoteRequested: rank >= 6 || myOpps.some((o) => o.wedding_date || o.quote_sent_at || o.stage === 'quote_sent' || o.stage === 'won'),
    quoteAt: myOpps.length ? Math.min(...myOpps.map((o) => t0(o.created_at))) : null,
    won: p.status === 'partner_won',
    t1: sentCold.find((t) => t.step_name === 'T1_intro') || null,
    replyStep: lastStepBeforeReply ? lastStepBeforeReply.step_name : null,
    replyChannel: firstReply ? firstReply.channel : null,
  };
}

/** Headline metrics, funnel and timing. */
export function computeMetrics(prospects, touches, opportunities = [], now = new Date()) {
  const by = groupTouches(touches);
  const facts = prospects.map((p) => ({ p, f: prospectFacts(p, by.get(p.id) || [], opportunities) }));
  const c = (fn) => facts.filter(({ f, p }) => fn(f, p)).length;
  const contacted = c((f) => f.contacted);
  const replied = c((f) => f.contacted && f.replied);
  const positive = c((f) => f.contacted && f.positive);
  const rateCard = c((f) => f.rateCardSent);
  const quote = c((f) => f.quoteRequested);
  const won = c((f) => f.won);

  // Rate card → quote within 30 days, counted only on rate cards old enough to have had 30 days (or already converted).
  const DAY = 86400000;
  const mature = facts.filter(({ f }) => f.rateCardSent && (f.quoteRequested || (f.rateCardAt && now - f.rateCardAt >= 30 * DAY) || (!f.rateCardAt)));
  const conv30 = mature.filter(({ f }) => f.quoteRequested && (!f.rateCardAt || !f.quoteAt || f.quoteAt - f.rateCardAt <= 30 * DAY)).length;

  const emailsSent = touches.filter((t) => t.direction === 'out' && t.state === 'sent' && t.channel === 'email');
  const opened = emailsSent.filter((t) => t.opened_at).length;
  const bounced = emailsSent.filter((t) => t.bounced).length;

  const hoursToReply = facts.filter(({ f }) => f.firstOut && f.firstReply)
    .map(({ f }) => (t0(f.firstReply.replied_at || f.firstReply.created_at) - t0(f.firstOut.sent_at)) / 3600000).filter((h) => h >= 0);
  const myResponse = [];
  for (const list of by.values()) {
    for (const r of list.filter(isRealReply)) {
      const at = t0(r.replied_at || r.created_at);
      const next = list.find((t) => t.direction === 'out' && t.state === 'sent' && t0(t.sent_at) > at);
      if (next) myResponse.push((t0(next.sent_at) - at) / 3600000);
    }
  }

  const wonOpps = opportunities.filter((o) => o.won === true || o.stage === 'won');
  const revenue = wonOpps.reduce((s, o) => s + (+o.actual_revenue || 0), 0);
  const commissionOwed = opportunities.reduce((s, o) => s + (+o.commission_owed || 0), 0);
  const commissionPaid = opportunities.reduce((s, o) => s + (+o.commission_paid || 0), 0);
  const pipeline = opportunities.filter((o) => !['won', 'lost'].includes(o.stage) && o.won !== true && o.won !== false)
    .reduce((s, o) => s + (+o.estimated_value || 0), 0);

  return {
    total: prospects.length,
    active: prospects.filter((p) => p.status !== 'do_not_contact').length,
    contacted, replied, positive, rateCard, quote, won,
    replyRate: wilson(replied, contacted),
    positiveRate: wilson(positive, contacted),
    ratecardToQuote: wilson(conv30, mature.length),
    openRate: emailsSent.length ? wilson(opened, emailsSent.length) : wilson(0, 0),
    bounceRate: wilson(bounced, emailsSent.length),
    emailsSent: emailsSent.length, bounced,
    medianHoursToReply: median(hoursToReply),
    medianMyResponseHours: median(myResponse),
    revenue, commissionOwed, commissionPaid, commissionOutstanding: commissionOwed - commissionPaid, pipeline,
    funnel: [
      { key: 'prospects', label: 'Prospects', count: prospects.length },
      { key: 'contacted', label: 'Contacted', count: contacted },
      { key: 'replied', label: 'Replied', count: replied },
      { key: 'positive', label: 'Positive', count: positive },
      { key: 'rate_card', label: 'Rate card sent', count: rateCard },
      { key: 'quote', label: 'Quote requested', count: quote },
      { key: 'won', label: 'Partner won', count: won },
    ],
    facts,
  };
}

/** Reply and positive rates split by a dimension. keyFn({p, f}) returns the group key or null to skip. */
export function breakdown(facts, keyFn) {
  const rows = new Map();
  for (const x of facts) {
    if (!x.f.contacted) continue;
    const key = keyFn(x);
    if (key === null || key === undefined || key === '') continue;
    if (!rows.has(key)) rows.set(key, { key, n: 0, replied: 0, positive: 0 });
    const r = rows.get(key); r.n++; if (x.f.replied) r.replied++; if (x.f.positive) r.positive++;
  }
  return [...rows.values()].map((r) => ({ ...r, replyRate: wilson(r.replied, r.n), positiveRate: wilson(r.positive, r.n) }))
    .sort((a, b) => b.n - a.n);
}

// Which touch gets the reply: replies attributed to the last step sent before the first reply.
export function stepBreakdown(facts, touches) {
  const reached = {};
  for (const t of touches) if (t.direction === 'out' && t.state === 'sent' && COLD_STEPS.includes(t.step_name)) {
    (reached[t.step_name] ||= new Set()).add(t.prospect_id);
  }
  return COLD_STEPS.map((step) => {
    const n = reached[step] ? reached[step].size : 0;
    const k = facts.filter(({ f }) => f.replyStep === step).length;
    return { key: step, n, replied: k, replyRate: wilson(k, n) };
  });
}

export const DIMENSIONS = {
  variant: ({ f }) => (f.t1 ? `Subject ${f.t1.variant || 'A'}` : null),
  segment: ({ p }) => p.segment || 'unknown',
  language: ({ p }) => p.language || 'en',
  type: ({ p }) => p.type || 'planner',
  location: ({ p }) => p.location || 'other',
  hook_type: ({ p }) => p.hook_type || (p.personalization_hook ? 'unlabelled' : 'no hook'),
  weekday: ({ f }) => (f.t1 && f.t1.sent_at ? ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][localParts(new Date(f.t1.sent_at)).dow] : null),
  hour: ({ f }) => (f.t1 && f.t1.sent_at ? `${String(localParts(new Date(f.t1.sent_at)).hh).padStart(2, '0')}:00` : null),
  reply_channel: ({ f }) => (f.replied ? f.replyChannel || 'email' : null),
};

// ISO-week trend of first contacts, replies and positive replies.
export function weeklyTrend(facts, weeks = 12, now = new Date()) {
  const DAY = 86400000;
  const monday = (d) => { const x = new Date(d); const dow = (x.getUTCDay() + 6) % 7; x.setUTCHours(0, 0, 0, 0); return x.getTime() - dow * DAY; };
  const start = monday(now) - (weeks - 1) * 7 * DAY;
  const rows = Array.from({ length: weeks }, (_, i) => ({ week: new Date(start + i * 7 * DAY), contacted: 0, replied: 0, positive: 0 }));
  const idx = (ts) => Math.floor((monday(ts) - start) / (7 * DAY));
  for (const { f } of facts) {
    if (f.firstOut) { const i = idx(f.firstOut.sent_at); if (rows[i]) rows[i].contacted++; }
    if (f.firstReply) {
      const i = idx(f.firstReply.replied_at || f.firstReply.created_at);
      if (rows[i]) { rows[i].replied++; if (f.positive) rows[i].positive++; }
    }
  }
  return rows;
}

const pct = (x) => (x === null || x === undefined ? 'n/a' : `${(x * 100).toFixed(x < 0.1 && x > 0 ? 1 : 0)}%`);
export { pct };

/** Plain-language answer to "do we have traction, and what should I change?" */
export function tractionVerdict(m, facts = [], settings = DEFAULT_SETTINGS) {
  const tg = { ...DEFAULT_SETTINGS.targets, ...(settings.targets || {}) };
  const n = m.contacted;
  const ci = m.positiveRate;
  const suggestions = [];
  if (!n) {
    return { level: 'none', headline: 'No planners contacted yet.', detail: 'Approve the first intro emails in Today. The verdict appears after the first contacts.', confidence: 'none', needMore: samplesNeeded(null), suggestions };
  }
  const range = `${pct(ci.lo)} to ${pct(ci.hi)}`;
  const need = Math.max(0, samplesNeeded(ci.p) - n);
  const confidence = confidenceLabel(ci);
  let level, headline;
  if (n < 10) {
    level = 'early';
    headline = `${n} planner${n === 1 ? '' : 's'} contacted, ${m.positive} positive. Too early to judge.`;
  } else if (ci.lo >= tg.positive_reply_rate) {
    level = 'traction';
    headline = `Positive reply rate ${pct(ci.p)} after ${n} contacts. Above the ${pct(tg.positive_reply_rate)} target.`;
  } else if (ci.hi < tg.positive_reply_rate) {
    level = 'below';
    headline = `Positive reply rate ${pct(ci.p)} after ${n} contacts. Below the ${pct(tg.positive_reply_rate)} target.`;
  } else {
    level = 'unclear';
    headline = `Positive reply rate ${pct(ci.p)} after ${n} contacts. Not yet distinguishable from the ${pct(tg.positive_reply_rate)} target.`;
  }
  const detail = `Likely range ${range} (95% interval). Confidence: ${confidence}.` + (need > 0 ? ` About ${need} more contacts would narrow it to ±5 points.` : '');

  // What to change
  const variants = breakdown(facts, DIMENSIONS.variant);
  const a = variants.find((v) => v.key === 'Subject A'), b = variants.find((v) => v.key === 'Subject B');
  if (!b) suggestions.push('Only subject A has been sent. Add a B subject on the T1 template to start learning.');
  else if (a && a.n >= 10 && b.n >= 10) {
    const pv = compareRates({ k: a.replied, n: a.n }, { k: b.replied, n: b.n });
    const better = a.replyRate.p >= b.replyRate.p ? a : b;
    suggestions.push(pv !== null && pv < 0.1
      ? `${better.key} is winning (${pct(better.replyRate.p)} replies, p=${pv.toFixed(2)}). Make it the default and write a new challenger.`
      : `Subjects A and B are level so far (p=${pv === null ? 'n/a' : pv.toFixed(2)}). Keep both running.`);
  } else suggestions.push('A/B test is running; each subject needs about 10 sends before comparing.');

  const noHook = facts.filter(({ f, p }) => f.contacted && !(p.personalization_hook || '').trim()).length;
  if (noHook) suggestions.push(`${noHook} contacted planner${noHook === 1 ? '' : 's'} had no specific hook. Generic first lines cost replies.`);
  if (m.replyRate.p !== null && n >= 10 && m.replyRate.p >= 0.15 && ci.p < tg.positive_reply_rate) suggestions.push('Planners reply but rarely say yes. Revisit the offer line (5% vs net rates) rather than the subject.');
  if (m.bounceRate.n >= 10 && m.bounceRate.p > 0.03) suggestions.push(`Bounce rate ${pct(m.bounceRate.p)}. Verify addresses before marking prospects Ready.`);
  if (m.rateCard >= 4 && m.ratecardToQuote.n && m.ratecardToQuote.p < tg.ratecard_to_quote) suggestions.push('Rate cards are going out but few turn into quotes. Offer a free FAM transfer after the rate card.');
  if (m.medianMyResponseHours !== null && m.medianMyResponseHours > 4) suggestions.push(`Your median response time is ${m.medianMyResponseHours.toFixed(1)} h. Aim for under 15 minutes on positive replies.`);
  return { level, headline, detail, confidence, needMore: need, suggestions };
}
