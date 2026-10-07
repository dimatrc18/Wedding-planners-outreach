// Domain actions used by the views. All rules come from the shared core so the browser and the server agree.
import * as core from '../supabase/functions/_shared/core/index.js';
import { S, insert, update, updateMany, remove, log, api, isDemo, nowIso } from './store.js';
import { toast } from './ui.js';

export const prospectById = (id) => S.prospects.find((p) => p.id === id);
export const touchesOf = (pid) => S.touches.filter((t) => t.prospect_id === pid);
export const oppsOf = (pid) => S.opps.filter((o) => o.prospect_id === pid);
export const smtpReady = () => !!S.health?.integrations?.smtp;
const me = () => S.user?.email || 'me';

// ---------- Drafting ----------
function draftRow(p, key, step, extra = {}) {
  const t1 = touchesOf(p.id).find((t) => t.step_name === 'T1_intro' && t.direction === 'out' && t.subject);
  const d = core.buildDraft({ prospect: p, key, templates: S.templates, threadSubject: extra.threadSubject ?? (t1 ? t1.subject : ''), step });
  if (!d) return null;
  return {
    prospect_id: p.id, channel: d.channel, direction: 'out', step_name: extra.step_name || key, state: 'draft', subject: d.subject, body: d.body,
    template_key: d.template_key, variant: d.variant, lint: d.lint, attach_rate_card: d.attach_rate_card, suggested_for: extra.suggested_for || null,
  };
}

async function insertDraft(row) {
  try { await insert('touches', row); return true; } catch (e) {
    if (/duplicate|unique/i.test(e.message)) return false; // already drafted (by the server or another tab)
    throw e;
  }
}

/** Draft every cadence step that is due now (same rule as the server's tick job). */
export async function generateDueDrafts(now = new Date()) {
  let n = 0;
  for (const p of S.prospects) {
    const st = core.sequenceState(p, touchesOf(p.id), S.settings, now);
    if (!st.active || !st.isDue || st.pending || st.blocked) continue;
    const row = draftRow(p, st.step.key, st.step);
    if (row && await insertDraft(row)) n++;
  }
  return n;
}

/** One-click "draft the next step" from a prospect page, even before it is due. */
export async function draftNextStep(p) {
  const st = core.sequenceState(p, touchesOf(p.id), S.settings, new Date(8.64e15));
  if (!st.active) { toast(st.reason === 'stage' ? 'Move the prospect to Ready first' : `No next step: ${st.reason}`, 'error'); return null; }
  if (st.pending) { toast('A draft for this step already exists'); return st.pending; }
  if (st.blocked === 'no_email') { toast('Add an email address first', 'error'); return null; }
  const row = draftRow(p, st.step.key, st.step);
  await insertDraft(row);
  toast(`${st.step.label} drafted`);
  return row;
}

export async function draftReply(p, key, inbound = null) {
  const lastSubject = [...touchesOf(p.id)].reverse().find((t) => t.subject)?.subject || '';
  const row = draftRow(p, key, null, { threadSubject: inbound?.subject || lastSubject, step_name: key === 'rate_card_delivery' ? 'rate_card_delivery' : 'reply', suggested_for: inbound?.id || null });
  if (!p.email) row.channel = inbound?.channel || 'email';
  await insert('touches', row);
  return row;
}

// ---------- Approval queue ----------
export function lintOf(t) { return core.lintMessage({ subject: t.subject || '', body: t.body || '', channel: t.channel, step: t.step_name }); }

export async function saveDraft(t, patch) {
  const next = { ...t, ...patch };
  await update('touches', t.id, { ...patch, lint: lintOf(next) });
}

export async function approve(t) {
  const lint = lintOf(t);
  if (lint.errors.length) { toast(lint.errors[0], 'error'); return false; }
  const p = prospectById(t.prospect_id);
  if (core.isBlocked(p)) { toast('This prospect is marked Do Not Contact', 'error'); return false; }
  const at = core.scheduleApproved(t, p, S.settings, core.takenSlots(S.touches), { firstSendAt: core.firstColdSend(S.touches) });
  await update('touches', t.id, { state: 'approved', approved_by: me(), approved_at: nowIso(), scheduled_at: at ? at.toISOString() : null, lint });
  log('draft_approved', { touch_id: t.id, step: t.step_name, scheduled_at: at }, p.id);
  return at;
}

export async function unapprove(t) { await update('touches', t.id, { state: 'draft', scheduled_at: null, approved_at: null, approved_by: null }); }

export async function skip(t) {
  await update('touches', t.id, { state: 'skipped' });
  log('draft_skipped', { touch_id: t.id, step: t.step_name }, t.prospect_id);
}

// Snooze a draft: drop it and hold the prospect; the cadence drafts it again after the snooze.
export async function snooze(t, days = 3) {
  const until = new Date(Date.now() + days * 86400000).toISOString();
  await update('prospects', t.prospect_id, { snoozed_until: until });
  await update('touches', t.id, { state: 'skipped', error: `Snoozed until ${until.slice(0, 10)}` });
}

/** Sent outside the app (own mail client, WhatsApp): record it as sent. */
export async function markSent(t) {
  const p = prospectById(t.prospect_id);
  const at = nowIso();
  await update('touches', t.id, { state: 'sent', sent_at: at, approved_by: t.approved_by || me(), approved_at: t.approved_at || at });
  await update('prospects', p.id, { status: core.statusAfterSend(p.status, t.step_name, core.FUNNEL_RANK), last_touch_at: at });
  if (t.suggested_for) await update('touches', t.suggested_for, { handled_at: at });
  log('marked_sent', { touch_id: t.id, step: t.step_name, channel: t.channel }, p.id);
}

export async function sendNow(t) {
  if (isDemo()) { await markSent(t); toast('Demo: marked as sent'); return; }
  if (t.state === 'draft') { const ok = await approve(t); if (ok === false) return; }
  const r = await api('send_now', { touch_id: t.id });
  const res = (r.results || [])[0];
  if (r.skipped === 'smtp_not_configured') throw new Error('The mailbox is not connected yet (Settings → Mailbox)');
  if (res?.error) throw new Error(res.error);
  if (res?.reason) throw new Error(core.BLOCK_REASONS[res.reason] || res.reason);
  toast('Sent');
}

export function mailtoHref(t) {
  const p = prospectById(t.prospect_id);
  return `mailto:${encodeURIComponent(p.email || '')}?subject=${encodeURIComponent(t.subject || '')}&body=${encodeURIComponent(t.body || '')}`;
}

// ---------- Logging ----------
export async function logOutbound(p, { channel, subject = '', body = '', step_name = 'custom', at = nowIso() }) {
  await insert('touches', { prospect_id: p.id, direction: 'out', channel, step_name, state: 'sent', subject, body, sent_at: at, approved_by: me(), approved_at: at });
  await update('prospects', p.id, { last_touch_at: at, status: core.statusAfterSend(p.status, step_name, core.FUNNEL_RANK) });
  log('touch_logged', { channel, step_name }, p.id);
}

/** A reply that arrived anywhere (pasted from WhatsApp, a call note, or an email the sync missed). */
export async function logInbound(p, { channel = 'email', subject = '', body = '', cls, at = nowIso() }) {
  const [row] = await insert('touches', {
    prospect_id: p.id, direction: 'in', channel, step_name: 'reply', state: 'received', subject, body, replied_at: at,
    reply_sentiment: cls.sentiment, reply_intent: cls.intent || null, classification: cls, from_address: p.email || null,
  });
  const fx = core.inboundEffects({ prospect: p, touches: touchesOf(p.id), cls, templates: S.templates, settings: S.settings, inbound: row });
  await update('prospects', p.id, fx.patch);
  if (fx.skipIds.length) await updateMany('touches', fx.skipIds, { state: 'skipped', error: 'Stopped: planner replied' });
  for (const r of fx.reschedule) await update('touches', r.id, { scheduled_at: r.scheduled_at });
  if (fx.opportunity && !oppsOf(p.id).some((o) => o.stage !== 'lost')) await insert('opps', fx.opportunity);
  if (fx.draft) await insert('touches', fx.draft);
  log('reply_logged', { sentiment: cls.sentiment, intent: cls.intent, summary: fx.summary }, p.id);
  return fx;
}

export async function markHandled(inbound) { await update('touches', inbound.id, { handled_at: nowIso() }); }

// ---------- Status ----------
export async function setStatus(p, status, extra = {}) {
  const patch = { status, ...extra };
  if (status === 'do_not_contact') Object.assign(patch, { do_not_contact: true });
  if (status === 'nurture' && !p.nurture_until && !extra.nurture_until) patch.nurture_until = core.nurtureDate(new Date(), S.settings).toISOString();
  if (status === 'partner_won' && !p.reengage_at) patch.reengage_at = new Date(new Date().getFullYear() + 1, 0, 10).toISOString();
  if (status === 'fam_offered' && !p.fam_status) patch.fam_status = 'offered';
  await update('prospects', p.id, patch);
  if (['do_not_contact', 'lost', 'nurture', 'partner_won'].includes(status)) {
    const pending = touchesOf(p.id).filter((t) => t.direction === 'out' && ['draft', 'approved'].includes(t.state) && core.COLD_STEPS.includes(t.step_name)).map((t) => t.id);
    if (pending.length) await updateMany('touches', pending, { state: 'skipped', error: `Prospect moved to ${core.stageLabel(status)}` });
  }
  log('status_changed', { from: p.status, to: status }, p.id);
}

/** Checks before a prospect enters the cadence. Returns a list of problems (empty = ready). */
export function readinessProblems(p) {
  const probs = [];
  if (!p.email) probs.push('No email address');
  else if (!core.isValidEmailSyntax(p.email)) probs.push('Email address looks invalid');
  else if (p.email_status === 'no_mx' || p.email_status === 'bounced') probs.push(`Email ${p.email_status === 'bounced' ? 'bounced before' : 'domain has no mail server'}`);
  if (!(p.personalization_hook || '').trim()) probs.push('No personalization hook');
  if (p.hook_needs_review) probs.push('Hook is flagged for review');
  if (core.isBlocked(p)) probs.push('Marked Do Not Contact');
  return probs;
}

export async function eraseProspect(p) {
  await remove('prospects', p.id);
  log('prospect_erased', { agency: p.agency_name, reason: 'GDPR erase from app' });
}

// ---------- Email verification (syntax + MX over DNS-over-HTTPS) ----------
export async function verifyEmail(email) {
  if (!core.isValidEmailSyntax(email)) return 'invalid';
  try {
    const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(core.domainOf(email))}&type=MX`);
    const j = await r.json();
    return (j.Answer || []).some((a) => a.type === 15) ? 'mx_ok' : 'no_mx';
  } catch { return 'syntax_ok'; }
}

// ---------- Today ----------
export function todayData(now = new Date()) {
  const byP = new Map();
  for (const t of S.touches) { if (!byP.has(t.prospect_id)) byP.set(t.prospect_id, []); byP.get(t.prospect_id).push(t); }
  const P = new Map(S.prospects.map((p) => [p.id, p]));
  const drafts = S.touches.filter((t) => t.direction === 'out' && t.state === 'draft' && t.channel === 'email' && P.has(t.prospect_id));
  const scheduled = S.touches.filter((t) => t.direction === 'out' && t.state === 'approved' && t.channel === 'email' && P.has(t.prospect_id))
    .sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0));
  const failed = S.touches.filter((t) => t.direction === 'out' && t.state === 'failed');
  const replies = S.touches.filter((t) => core.isRealReply(t) && !t.handled_at && P.has(t.prospect_id) && !(byP.get(t.prospect_id) || [])
    .some((o) => o.direction === 'out' && o.state === 'sent' && new Date(o.sent_at) > new Date(t.replied_at || t.created_at)))
    .filter((t) => t.reply_sentiment !== 'unsubscribe')
    .sort((a, b) => ({ positive: 0, neutral: 1, negative: 2 }[a.reply_sentiment] ?? 1) - ({ positive: 0, neutral: 1, negative: 2 }[b.reply_sentiment] ?? 1) || new Date(a.replied_at) - new Date(b.replied_at));
  const due = [];
  for (const p of S.prospects) {
    const st = core.sequenceState(p, byP.get(p.id) || [], S.settings, now);
    if (st.active && st.isDue && !st.pending) due.push({ p, st });
  }
  const DAY = 86400000;
  const reminders = [];
  for (const p of S.prospects) {
    if (core.isBlocked(p)) continue;
    const list = byP.get(p.id) || [];
    const last = p.last_touch_at || list.map((t) => t.sent_at || t.replied_at || t.created_at).sort().pop();
    if (p.status === 'nurture' && p.nurture_until && new Date(p.nurture_until) <= now) reminders.push({ p, kind: 'nurture', text: 'Nurture date reached: re-engage before the season', at: p.nurture_until });
    if (['replied', 'rate_card_sent', 'in_conversation', 'quote_requested', 'fam_offered'].includes(p.status) && last && now - new Date(last) > S.settings.stale_days * DAY) {
      reminders.push({ p, kind: 'stale', text: `No activity for ${Math.floor((now - new Date(last)) / DAY)} days`, at: last });
    }
    if (p.fam_status === 'completed' && p.fam_at && now - new Date(p.fam_at) < 2 * DAY && !list.some((t) => t.step_name === 'fam_followup')) reminders.push({ p, kind: 'fam', text: 'FAM ride done: send the follow-up within 24 h', at: p.fam_at });
    if (p.fam_status === 'accepted' && p.fam_at && new Date(p.fam_at) < now) reminders.push({ p, kind: 'fam', text: 'FAM ride date passed: mark it completed', at: p.fam_at });
    if (p.status === 'partner_won' && p.reengage_at && new Date(p.reengage_at) <= now) reminders.push({ p, kind: 'reengage', text: 'Re-engage this partner for the new season', at: p.reengage_at });
  }
  for (const o of S.opps) {
    if (o.stage === 'quote_sent' && o.quote_sent_at && now - new Date(o.quote_sent_at) > 3 * DAY && P.has(o.prospect_id)) {
      reminders.push({ p: P.get(o.prospect_id), kind: 'quote', text: `Quote sent ${Math.floor((now - new Date(o.quote_sent_at)) / DAY)} days ago, no answer`, at: o.quote_sent_at });
    }
  }
  const research = S.prospects.filter((p) => p.status === 'researching').sort((a, b) => core.priorityScore(b).score - core.priorityScore(a).score);
  const readyNoDraft = S.prospects.filter((p) => p.status === 'ready' && !(byP.get(p.id) || []).some((t) => t.direction === 'out'));
  return { drafts, scheduled, failed, replies, due, reminders, research, readyNoDraft };
}
