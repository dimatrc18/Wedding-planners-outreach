// Analytics: "Do we have traction yet, and what should I change?" Every rate shows its 95% interval.
import * as core from '../../supabase/functions/_shared/core/index.js';
import { S } from '../store.js';
import { esc, attr, icon, eur, pct, download } from '../ui.js';
import { rateMeter } from './today.js';

const DIM_LABEL = {
  variant: 'Subject line (T1)', reply_step: 'Touch that got the reply', segment: 'Segment', language: 'Language', type: 'Prospect type',
  hook_type: 'Hook type', location: 'Location', weekday: 'T1 send day', hour: 'T1 send hour (Rome)', reply_channel: 'Reply channel',
};
const STEP = { T1_intro: 'T1 intro email', T2_ig_dm: 'T2 Instagram DM', T3_followup: 'T3 follow-up', T4_breakup: 'T4 breakup' };

function ciCell(ci, target) {
  if (!ci.n) return '<span class="faint">no data</span>';
  const x = (v) => `${Math.min(100, (v / 0.6) * 100)}%`;
  return `<div class="ci-cell"><span class="num" style="min-width:42px">${pct(ci.p)}</span><div class="ci-bar" role="img" aria-label="${pct(ci.p)}, likely ${pct(ci.lo)} to ${pct(ci.hi)}"><div class="track"></div>
    <div class="rng" style="left:${x(ci.lo)};width:calc(${x(ci.hi)} - ${x(ci.lo)})"></div>${target ? `<div class="tg" style="left:${x(target)}"></div>` : ''}<div class="p" style="left:${x(ci.p)}"></div></div></div>`;
}

function breakdownTable(rows, labelFn = (k) => k, target) {
  if (!rows.length) return '<div class="empty small">No contacted prospects yet.</div>';
  return `<div class="table-wrap"><table><thead><tr><th></th><th class="num">Contacted</th><th class="num">Replied</th><th>Reply rate (95% range)</th><th class="num">Positive</th><th>Positive rate</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${esc(labelFn(r.key))}${r.n < 10 ? ' <span class="chip outline" title="Fewer than 10 contacts: read with care">small n</span>' : ''}</td><td class="num">${r.n}</td><td class="num">${r.replied}</td><td>${ciCell(r.replyRate)}</td><td class="num">${r.positive}</td><td>${ciCell(r.positiveRate, target)}</td></tr>`).join('')}
  </tbody></table></div>`;
}

function trendChart(rows) {
  const W = 720, H = 220, L = 34, R = 10, T = 14, B = 28;
  const max = Math.max(4, ...rows.map((r) => Math.max(r.contacted, r.replied)));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const bw = (W - L - R) / rows.length;
  const barW = Math.max(4, Math.min(16, bw / 2 - 4));
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step);
  const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly first contacts and replies">
    ${ticks.map((t) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke-width="1"/><text x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join('')}
    ${rows.map((r, i) => {
      const cx = L + bw * i + bw / 2;
      const bar = (v, dx, cls, label) => v ? `<path d="M${cx + dx - barW / 2},${y(0)} V${y(v) + 3} q0,-3 3,-3 h${barW - 6} q3,0 3,3 V${y(0)} Z" fill="var(${cls})" data-tip="${attr(`Week of ${fmt(r.week)} · ${label}: ${v}`)}"/>` : '';
      return `${bar(r.contacted, -barW / 2 - 1, '--series-1', 'first contacts')}${bar(r.replied, barW / 2 + 1, '--series-2', 'replies')}
        <rect x="${cx - bw / 2}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent" data-tip="${attr(`Week of ${fmt(r.week)} · ${r.contacted} first contacts · ${r.replied} replies (${r.positive} positive)`)}"/>
        ${i % 2 === 0 || rows.length <= 8 ? `<text x="${cx}" y="${H - 8}" text-anchor="middle">${esc(fmt(r.week))}</text>` : ''}`;
    }).join('')}
    <line class="axis" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke-width="1"/>
  </svg>`;
}

export function render(el) {
  const m = core.computeMetrics(S.prospects, S.touches, S.opps);
  const v = core.tractionVerdict(m, m.facts, S.settings);
  const tg = { ...core.DEFAULT_SETTINGS.targets, ...S.settings.targets };
  const trend = core.weeklyTrend(m.facts, 12);
  const steps = core.stepBreakdown(m.facts, S.touches);
  const variants = core.breakdown(m.facts, core.DIMENSIONS.variant);
  const va = variants.find((x) => x.key === 'Subject A'), vb = variants.find((x) => x.key === 'Subject B');
  const pv = va && vb ? core.compareRates({ k: va.replied, n: va.n }, { k: vb.replied, n: vb.n }) : null;
  const t1Subjects = {};
  for (const t of S.touches) if (t.step_name === 'T1_intro' && t.state === 'sent' && t.subject) t1Subjects[t.variant || 'A'] ||= t.subject;
  const maxF = Math.max(1, m.funnel[0].count);
  const byP = new Map(S.prospects.map((p) => [p.id, p]));
  const perPlanner = [...new Set(S.opps.map((o) => o.prospect_id))].map((pid) => {
    const os = S.opps.filter((o) => o.prospect_id === pid);
    return {
      p: byP.get(pid), bookings: os.filter((o) => o.stage === 'won').length,
      revenue: os.filter((o) => o.stage === 'won').reduce((s, o) => s + (+o.actual_revenue || 0), 0),
      pipeline: os.filter((o) => !['won', 'lost'].includes(o.stage)).reduce((s, o) => s + (+o.estimated_value || 0), 0),
      owed: os.reduce((s, o) => s + (+o.commission_owed || 0), 0) - os.reduce((s, o) => s + (+o.commission_paid || 0), 0),
    };
  }).filter((r) => r.p).sort((a, b) => b.revenue + b.pipeline - a.revenue - a.pipeline);
  const hrs = (h) => (h === null ? '–' : h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} days`);
  const badge = { traction: 'check', below: 'flag', unclear: 'chart', early: 'clock', none: 'clock' }[v.level];

  el.innerHTML = `
  <div class="page-head"><div><div class="label eyebrow">${m.contacted} contacted · ${m.emailsSent} emails sent</div><h1>Do we have traction?</h1></div>
    <button class="btn ghost" id="export">${icon('download', 16)} Export metrics</button></div>
  <div class="stack lg">
    <section class="verdict ${v.level}"><div class="badge">${icon(badge, 22)}</div>
      <div class="stack" style="gap:6px"><h2>${esc(v.headline)}</h2><p class="muted">${esc(v.detail)}</p>
        ${v.suggestions.length ? `<div><span class="label">What to change</span><ul>${v.suggestions.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}</div></section>

    <div class="kpis">
      <div class="kpi"><span class="label">Positive reply rate</span><span class="val">${pct(m.positiveRate.p, 1)}</span><span class="ci">${m.positive} of ${m.contacted} · range ${pct(m.positiveRate.lo)} to ${pct(m.positiveRate.hi)}</span>${rateMeter(m.positiveRate, tg.positive_reply_rate)}<span class="target">Target ${pct(tg.positive_reply_rate)} to ${pct(tg.positive_reply_rate_high)}</span></div>
      <div class="kpi"><span class="label">Reply rate (any)</span><span class="val">${pct(m.replyRate.p, 1)}</span><span class="ci">${m.replied} of ${m.contacted} · range ${pct(m.replyRate.lo)} to ${pct(m.replyRate.hi)}</span>${rateMeter(m.replyRate, tg.positive_reply_rate_high)}</div>
      <div class="kpi"><span class="label">Rate card → quote, 30 days</span><span class="val">${pct(m.ratecardToQuote.p)}</span><span class="ci">${m.ratecardToQuote.k} of ${m.ratecardToQuote.n} rate cards old enough to judge</span>${rateMeter(m.ratecardToQuote, tg.ratecard_to_quote, 1)}<span class="target">Target ${pct(tg.ratecard_to_quote)}</span></div>
      <div class="kpi"><span class="label">Open rate</span><span class="val">${S.settings.track_opens ? pct(m.openRate.p) : '–'}</span><span class="ci">${S.settings.track_opens ? `${m.openRate.k} of ${m.openRate.n} emails · Apple Mail inflates this` : 'Not tracked (better deliverability). Turn on in Settings.'}</span></div>
    </div>
    <div class="kpis">
      <div class="kpi"><span class="label">Partners won</span><span class="val">${m.won}</span><span class="ci">Season target ${tg.partners_won} to ${tg.partners_won_high}</span></div>
      <div class="kpi"><span class="label">Revenue from partners</span><span class="val">${eur(m.revenue)}</span><span class="ci">Open pipeline ${eur(m.pipeline)}</span></div>
      <div class="kpi"><span class="label">Commission owed</span><span class="val">${eur(m.commissionOutstanding)}</span><span class="ci">${eur(m.commissionPaid)} paid of ${eur(m.commissionOwed)}</span></div>
      <div class="kpi"><span class="label">Speed</span><span class="val" style="font-size:1.5rem">${hrs(m.medianMyResponseHours)}</span><span class="ci">Your median reply time · planners take ${hrs(m.medianHoursToReply)} to answer</span></div>
    </div>

    <div class="grid-2">
      <section class="card stack"><div class="section-head"><h2>Funnel</h2></div>
        <div class="funnel">${m.funnel.map((f, i) => `<div class="funnel-row"><span>${esc(f.label)}</span><div class="funnel-bar"><span style="width:${(f.count / maxF) * 100}%"></span></div><span class="num small">${f.count}${i > 0 && m.funnel[i - 1].count ? ` <span class="faint">${pct(f.count / m.funnel[i - 1].count)}</span>` : ''}</span></div>`).join('')}</div>
        <p class="hint">Right column: count, and conversion from the stage above.</p></section>
      <section class="card stack"><div class="section-head"><h2>Weekly trend</h2><div class="legend"><span><i style="background:var(--series-1)"></i>First contacts</span><span><i style="background:var(--series-2)"></i>Replies</span></div></div>
        ${trendChart(trend)}
        <details><summary class="small muted">Show as table</summary><div class="table-wrap"><table><thead><tr><th>Week of</th><th class="num">First contacts</th><th class="num">Replies</th><th class="num">Positive</th></tr></thead><tbody>${trend.map((r) => `<tr><td>${r.week.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td><td class="num">${r.contacted}</td><td class="num">${r.replied}</td><td class="num">${r.positive}</td></tr>`).join('')}</tbody></table></div></details></section>
    </div>

    <section class="card stack"><div class="section-head"><h2>A/B: intro subject line</h2>${pv !== null ? `<span class="chip ${pv < 0.1 ? 'gold' : 'outline'}">p = ${pv.toFixed(2)}${pv < 0.1 ? ', likely a real difference' : ', no clear winner yet'}</span>` : ''}</div>
      ${breakdownTable(variants, (k) => `${k}${t1Subjects[k.slice(-1)] ? `: “${t1Subjects[k.slice(-1)]}”` : ''}`, tg.positive_reply_rate)}</section>

    <section class="card stack"><div class="section-head"><h2>Which touch gets the reply?</h2><span class="hint">Reply credited to the last touch sent before it</span></div>
      <div class="table-wrap"><table><thead><tr><th>Step</th><th class="num">Prospects reached</th><th class="num">Replies after it</th><th>Reply rate</th></tr></thead><tbody>
      ${steps.map((r) => `<tr><td>${esc(STEP[r.key] || r.key)}</td><td class="num">${r.n}</td><td class="num">${r.replied}</td><td>${ciCell(r.replyRate)}</td></tr>`).join('')}</tbody></table></div></section>

    <div class="grid-2 wide">
      ${['segment', 'language', 'hook_type', 'type', 'weekday', 'hour', 'location', 'reply_channel'].map((d) => `<section class="card stack"><div class="section-head"><h2>${esc(DIM_LABEL[d])}</h2></div>${breakdownTable(core.breakdown(m.facts, core.DIMENSIONS[d]), (k) => String(k).replace(/_/g, ' '), tg.positive_reply_rate)}</section>`).join('')}
    </div>

    <section class="card stack"><div class="section-head"><h2>Revenue by planner</h2></div>
      ${perPlanner.length ? `<div class="table-wrap"><table><thead><tr><th>Planner</th><th>Model</th><th class="num">Bookings won</th><th class="num">Revenue</th><th class="num">Open pipeline</th><th class="num">Commission due</th></tr></thead><tbody>
      ${perPlanner.map((r) => `<tr class="clickable" data-open="${attr(r.p.id)}"><td><b>${esc(r.p.agency_name)}</b></td><td>${r.p.partner_model === 'referral_12' ? 'A · 12%' : r.p.partner_model === 'net_whitelabel' ? 'B · net' : '–'}</td><td class="num">${r.bookings}</td><td class="num">${eur(r.revenue)}</td><td class="num">${eur(r.pipeline)}</td><td class="num">${eur(r.owed)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty small">No opportunities yet.</div>'}
    </section>
  </div>`;

  // Hover tooltips for chart marks.
  let tip = null;
  el.addEventListener('mousemove', (e) => {
    const t = e.target.closest('[data-tip]');
    if (!t) { tip && tip.remove(); tip = null; return; }
    if (!tip) { tip = document.createElement('div'); tip.className = 'tooltip'; document.body.append(tip); }
    tip.textContent = t.dataset.tip;
    tip.style.left = `${Math.min(window.innerWidth - 250, e.clientX + 12)}px`; tip.style.top = `${e.clientY + 14}px`;
  });
  el.addEventListener('mouseleave', () => { tip && tip.remove(); tip = null; });
  el.addEventListener('click', (e) => {
    const r = e.target.closest('[data-open]'); if (r) location.hash = `prospect/${r.dataset.open}`;
    if (e.target.closest('#export')) {
      const { facts, ...rest } = m;
      download(`dorogo_outreach_metrics_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ generated_at: new Date().toISOString(), verdict: v, metrics: rest, trend, steps, variants }, null, 2), 'application/json');
    }
  });
  return () => { tip && tip.remove(); };
}
