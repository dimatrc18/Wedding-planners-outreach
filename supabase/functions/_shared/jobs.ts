// The outreach jobs: draft due steps, send approved mail, sync the inbox, daily digest, approve from Telegram.
// Every decision about timing, caps and do-not-contact comes from ./core (unit-tested in /tests).
import * as core from './core/index.js';
import { env, logEvent, getState, setState, integrations } from './server.ts';
import { sendMail, appendToSent, fetchNewMessages } from './mail.ts';
import { gemini } from './ai.ts';
import { tgSend, tgEscape, appUrl } from './telegram.ts';

export async function loadAll(db: any) {
  const [p, t, tpl, o] = await Promise.all([
    db.from('prospects').select('*'),
    db.from('touches').select('*').order('created_at'),
    db.from('templates').select('*'),
    db.from('opportunities').select('*'),
  ]);
  for (const r of [p, t, tpl, o]) if (r.error) throw r.error;
  return { prospects: p.data || [], touches: t.data || [], templates: tpl.data || [], opps: o.data || [] };
}

const group = (touches: any[]) => {
  const m = new Map<string, any[]>();
  for (const t of touches) { if (!m.has(t.prospect_id)) m.set(t.prospect_id, []); m.get(t.prospect_id)!.push(t); }
  return m;
};

// ---------------- Drafting ----------------
export async function draftDueSteps(db: any, settings: any, now = new Date()) {
  const { prospects, touches, templates } = await loadAll(db);
  const by = group(touches);
  let created = 0;
  const insert = async (row: any) => {
    const { error } = await db.from('touches').insert(row);
    if (!error) { created++; touches.push(row); } else if (error.code !== '23505') console.error('draft insert', error.message);
  };
  for (const p of prospects) {
    const list = by.get(p.id) || [];
    const st: any = core.sequenceState(p, list, settings, now);
    if (st.active && st.isDue && !st.pending && !st.blocked) {
      const t1 = list.find((t: any) => t.step_name === 'T1_intro' && t.direction === 'out' && t.subject);
      const d: any = core.buildDraft({ prospect: p, key: st.step.key, templates, threadSubject: t1?.subject || '', step: st.step });
      if (d) {
        const row: any = {
          prospect_id: p.id, channel: d.channel, direction: 'out', step_name: st.step.key, state: 'draft',
          subject: d.subject, body: d.body, template_key: d.template_key, variant: d.variant, lint: d.lint, attach_rate_card: d.attach_rate_card,
        };
        if (st.step.require_approval === false && !d.lint.errors.length && d.channel === 'email') {
          row.state = 'approved'; row.approved_by = 'auto'; row.approved_at = now.toISOString();
          row.scheduled_at = core.scheduleApproved(row, p, settings, core.takenSlots(touches, now), { now, firstSendAt: core.firstColdSend(touches) })?.toISOString() || null;
        }
        await insert(row);
      }
    }
    if (core.isBlocked(p)) continue;
    // Rate card sent, no answer after N days → gentle nudge draft.
    if (p.status === 'rate_card_sent' && !list.some((t: any) => t.step_name === 'ratecard_nudge')) {
      const rc = [...list].reverse().find((t: any) => t.step_name === 'rate_card_delivery' && t.state === 'sent');
      const answered = rc && list.some((t: any) => core.isRealReply(t) && new Date(t.replied_at || t.created_at) > new Date(rc.sent_at));
      if (rc && !answered && core.daysBetween(rc.sent_at, now) >= settings.ratecard_nudge_days) {
        const d: any = core.buildDraft({ prospect: p, key: 'ratecard_nudge', templates, threadSubject: rc.subject || '' });
        if (d) await insert({ prospect_id: p.id, channel: 'email', direction: 'out', step_name: 'ratecard_nudge', state: 'draft', subject: d.subject, body: d.body, template_key: d.template_key, lint: d.lint });
      }
    }
    // FAM transfer completed → thank-you draft within 24 h.
    if (p.fam_status === 'completed' && p.fam_at && core.daysBetween(p.fam_at, now) <= 2 && !list.some((t: any) => t.step_name === 'fam_followup')) {
      const last = [...list].reverse().find((t: any) => t.subject);
      const d: any = core.buildDraft({ prospect: p, key: 'fam_followup', templates, threadSubject: last?.subject || 'Your DOROGO transfer' });
      if (d) await insert({ prospect_id: p.id, channel: 'email', direction: 'out', step_name: 'fam_followup', state: 'draft', subject: d.subject, body: d.body, template_key: d.template_key, lint: d.lint });
    }
  }
  return { created };
}

// ---------------- Sending ----------------
async function rateCardAttachment(db: any, settings: any) {
  const path = settings.rate_card_path;
  if (!path) throw new Error('Upload the rate card PDF in Settings first');
  const { data, error } = await db.storage.from('outreach').download(path);
  if (error || !data) throw new Error(`Rate card not found in storage (${path})`);
  return { filename: settings.rate_card_filename || 'DOROGO_Wedding_Partner_Rate_Card_2026.pdf', content: new Uint8Array(await data.arrayBuffer()), contentType: 'application/pdf' };
}

export async function sendDue(db: any, settings: any, now = new Date(), { onlyTouchId = null as string | null, actor = 'cron' } = {}) {
  if (!integrations().smtp) return { sent: 0, skipped: 'smtp_not_configured', results: [] };
  const { prospects, touches } = await loadAll(db);
  const pmap = new Map(prospects.map((p: any) => [p.id, p]));
  const firstSendAt = core.firstColdSend(touches);
  const today = core.localDateKey(now, settings.timezone);
  const coldSent = touches.filter((t: any) => t.direction === 'out' && t.state === 'sent' && t.channel === 'email' && core.COLD_STEPS.includes(t.step_name));
  let sentToday = coldSent.filter((t: any) => t.sent_at && core.localDateKey(new Date(t.sent_at), settings.timezone) === today).length;
  const emailsSent = touches.filter((t: any) => t.direction === 'out' && t.state === 'sent' && t.channel === 'email');
  let sentTotal = emailsSent.length;
  const bouncedTotal = emailsSent.filter((t: any) => t.bounced).length;

  let due = touches.filter((t: any) => t.direction === 'out' && t.state === 'approved' && t.channel === 'email' && (!t.scheduled_at || new Date(t.scheduled_at) <= now));
  if (onlyTouchId) due = touches.filter((t: any) => t.id === onlyTouchId);
  due.sort((a: any, b: any) => new Date(a.scheduled_at || a.created_at).getTime() - new Date(b.scheduled_at || b.created_at).getTime());

  const fromEmail = env('OUTREACH_FROM_EMAIL') || settings.sender?.email || 'booking@dorogo.eu';
  const fromName = settings.sender?.display_name || 'Dmitri | DOROGO';
  const results: any[] = [];
  let sent = 0;
  for (const t of due.slice(0, 25)) {
    const p: any = pmap.get(t.prospect_id);
    if (!p) continue;
    const list = touches.filter((x: any) => x.prospect_id === p.id);
    let gate: any = core.canSend(t, p, list, settings, { now, sentToday, firstSendAt, sentTotal, bouncedTotal });
    if (!gate.ok && gate.reason === 'not_due' && onlyTouchId) gate = { ok: true }; // "Send now" overrides the slot, nothing else
    if (!gate.ok) {
      results.push({ id: t.id, reason: gate.reason });
      if (['replied', 'do_not_contact'].includes(gate.reason)) await db.from('touches').update({ state: 'skipped', error: core.BLOCK_REASONS[gate.reason] }).eq('id', t.id);
      continue;
    }
    const lint = core.lintMessage({ subject: t.subject, body: t.body, channel: 'email', step: t.step_name });
    if (lint.errors.length) {
      await db.from('touches').update({ state: 'draft', lint, error: `Blocked by copy-lint: ${lint.errors[0]}` }).eq('id', t.id);
      results.push({ id: t.id, reason: 'lint' });
      continue;
    }
    const thread = list.filter((x: any) => x.message_id && x.id !== t.id)
      .sort((a: any, b: any) => new Date(a.sent_at || a.replied_at || a.created_at).getTime() - new Date(b.sent_at || b.replied_at || b.created_at).getTime());
    const stepCfg = (settings.steps || core.DEFAULT_STEPS).find((s: any) => s.key === t.step_name);
    const shouldThread = stepCfg ? Boolean(stepCfg.thread) : !['T1_intro', 'T2_ig_dm', 'T4_breakup'].includes(t.step_name);
    const threaded = shouldThread && thread.length > 0;
    const lastInbound = [...thread].reverse().find((x: any) => x.direction === 'in');
    const inReplyTo = threaded ? (lastInbound || thread[thread.length - 1]).message_id : null;
    try {
      const attachments = t.attach_rate_card ? [await rateCardAttachment(db, settings)] : [];
      const pixelUrl = settings.track_opens ? `${env('SUPABASE_URL')}/functions/v1/outreach-api?open=${t.id}` : null;
      const { messageId, raw } = await sendMail({
        fromName, fromEmail, replyTo: settings.sender?.reply_to || fromEmail, to: p.email, subject: t.subject, text: t.body,
        inReplyTo, references: threaded ? thread.map((x: any) => x.message_id).slice(-10) : [], attachments, pixelUrl,
      });
      const at = new Date().toISOString();
      await db.from('touches').update({ state: 'sent', sent_at: at, message_id: messageId, in_reply_to: inReplyTo, to_address: p.email, from_address: fromEmail, error: null, send_attempts: (t.send_attempts || 0) + 1 }).eq('id', t.id);
      await db.from('prospects').update({ status: core.statusAfterSend(p.status, t.step_name, core.FUNNEL_RANK), last_touch_at: at }).eq('id', p.id);
      if (t.suggested_for) await db.from('touches').update({ handled_at: at }).eq('id', t.suggested_for);
      appendToSent(raw).catch((e) => console.error('append to Sent failed', e.message));
      if (core.COLD_STEPS.includes(t.step_name)) sentToday++;
      sentTotal++; sent++;
      await logEvent(db, 'email_sent', { touch_id: t.id, step: t.step_name, to: p.email }, p.id, actor);
      results.push({ id: t.id, sent: true });
    } catch (e) {
      const attempts = (t.send_attempts || 0) + 1;
      await db.from('touches').update({ state: attempts >= 3 ? 'failed' : 'approved', send_attempts: attempts, error: (e as Error).message }).eq('id', t.id);
      results.push({ id: t.id, error: (e as Error).message });
    }
  }
  return { sent, results };
}

// ---------------- Inbox & Conversational AI ----------------
function formatThreadHistory(list: any[]) {
  return list
    .filter((t: any) => (t.direction === 'out' && t.state === 'sent') || t.direction === 'in')
    .slice(-6)
    .map((t: any) => {
      const who = t.direction === 'out' ? 'DOROGO (Dmitri)' : 'Planner';
      const at = (t.sent_at || t.replied_at || t.created_at || '').slice(0, 16);
      return `[${who} · ${at}]\n${core.stripQuoted(t.body || '').slice(0, 800)}`;
    })
    .join('\n\n---\n\n');
}

export async function applyInbound(db: any, p: any, list: any[], inbound: any, cls: any, settings: any, templates: any[], now: Date) {
  const fx: any = core.inboundEffects({ prospect: p, touches: list, cls, templates, settings, now, inbound });
  await db.from('prospects').update(fx.patch).eq('id', p.id);
  if (fx.skipIds.length) await db.from('touches').update({ state: 'skipped', error: 'Stopped: planner replied' }).in('id', fx.skipIds);
  for (const r of fx.reschedule) await db.from('touches').update({ scheduled_at: r.scheduled_at }).eq('id', r.id);
  if (fx.opportunity) {
    const { data: existing } = await db.from('opportunities').select('id').eq('prospect_id', p.id).neq('stage', 'lost').limit(1);
    if (!existing?.length) await db.from('opportunities').insert(fx.opportunity);
  }

  // Conversational AI for ongoing partner conversations (e.g., questions after rate card or custom inquiries)
  let needsHuman = Boolean(cls.needs_human);
  let escalationReason: string | null = cls.escalation_reason || null;
  const isOngoingConversation = ['replied', 'rate_card_sent', 'in_conversation', 'quote_requested', 'active_partner'].includes(p.status);
  const needsConversationalDraft =
    !['ooo', 'unsubscribe', 'negative'].includes(cls.sentiment) &&
    (isOngoingConversation || !cls.intent || cls.intent === 'specific_question' || needsHuman);

  if (needsConversationalDraft && integrations().gemini && fx.draft) {
    try {
      const aiReply: any = await gemini(
        db,
        'partner_reply',
        {
          agency: p.agency_name,
          contact_name: p.contact_name || '',
          language: p.language || 'en',
          status: p.status,
          thread_history: formatThreadHistory(list),
          latest_reply: core.stripQuoted(inbound.body || '').slice(0, 3000),
        },
        p.id,
      );
      if (aiReply?.body) {
        fx.draft.body = aiReply.body;
        fx.draft.attach_rate_card = Boolean(aiReply.attach_rate_card || fx.draft.attach_rate_card);
        fx.draft.lint = core.lintMessage({ subject: fx.draft.subject, body: fx.draft.body, channel: fx.draft.channel, step: fx.draft.step_name });
        fx.draft.ai_generated = true;
      }
      if (aiReply?.needs_human) {
        needsHuman = true;
        escalationReason = aiReply.escalation_reason || escalationReason;
      }
    } catch (e) {
      console.error('partner_reply AI failed', (e as Error).message);
      needsHuman = true;
      escalationReason = escalationReason || 'AI could not draft a verified answer; human reply needed';
    }
  }

  if (needsHuman && inbound?.id) {
    const updatedCls = { ...(inbound.classification || cls), needs_human: true, escalation_reason: escalationReason };
    await db.from('touches').update({ classification: updatedCls }).eq('id', inbound.id);
  }

  let insertedDraft: any = null;
  if (fx.draft) {
    const { data: insDraft } = await db.from('touches').insert(fx.draft).select().single();
    insertedDraft = insDraft || fx.draft;
  }

  await logEvent(db, 'reply_received', { sentiment: cls.sentiment, intent: cls.intent, summary: fx.summary, needs_human: needsHuman, escalation_reason: escalationReason }, p.id);

  if (needsHuman || fx.alert || cls.sentiment === 'unsubscribe') {
    const head = needsHuman
      ? '🚨 <b>Human reply needed</b>'
      : fx.alert
        ? '🟢 <b>Positive reply</b>'
        : '⛔ <b>Opt-out</b>';
    const reasonLine = needsHuman && escalationReason ? `\n⚠️ <b>Why:</b> ${tgEscape(escalationReason)}` : '';
    const draftLine = insertedDraft?.body ? `\n\n✍️ <b>AI Draft ready:</b>\n<i>${tgEscape(insertedDraft.body.slice(0, 350))}</i>` : '';
    const buttons: any[] = [{ text: 'Open in app', url: appUrl(`prospect/${p.id}`) }];
    if (insertedDraft?.id && !insertedDraft.lint?.errors?.length && !needsHuman) {
      buttons.unshift({ text: '✅ Approve Reply', data: `approve:${insertedDraft.id}` });
    }
    await tgSend(
      `${head} from <b>${tgEscape(p.agency_name)}</b>\n${tgEscape(fx.summary)}${reasonLine}\n\n💬 <i>"${tgEscape(core.stripQuoted(inbound.body || '').slice(0, 400))}"</i>${draftLine}${fx.alert || needsHuman ? '\n\nAim to answer within 15 minutes.' : ''}`,
      [buttons],
    );
  }
  return fx;
}

export async function syncInbox(db: any, settings: any, now = new Date()) {
  if (!integrations().imap) return { skipped: 'imap_not_configured' };
  const state: any = await getState(db, 'imap');
  let fetched: any;
  try {
    fetched = await fetchNewMessages(state.last_uid || null);
  } catch (e) {
    await setState(db, 'imap', { ...state, last_error: (e as Error).message, last_attempt_at: now.toISOString() });
    throw e;
  }
  const { prospects, touches, templates } = await loadAll(db);
  const byEmail = new Map(prospects.filter((p: any) => p.email).map((p: any) => [p.email.toLowerCase(), p]));
  const byMsg = new Map(touches.filter((t: any) => t.message_id).map((t: any) => [t.message_id, t]));
  const pById = new Map(prospects.map((p: any) => [p.id, p]));
  let stored = 0, bounces = 0;
  for (const m of fetched.messages) {
    if (m.messageId && byMsg.has(m.messageId)) continue;
    const viaThread = [m.inReplyTo, ...m.references].map((id: string) => byMsg.get(id)).find(Boolean);
    const bounce = core.detectBounce({ from: m.from, subject: m.subject, body: m.text });
    if (bounce) {
      const failed = (m.failedRecipients || '').toLowerCase();
      const p: any = (failed && byEmail.get(failed)) || (viaThread && pById.get(viaThread.prospect_id)) ||
        prospects.find((x: any) => x.email && m.text.toLowerCase().includes(x.email.toLowerCase()));
      if (!p) continue;
      const lastOut = [...touches].reverse().find((t: any) => t.prospect_id === p.id && t.direction === 'out' && t.state === 'sent' && t.channel === 'email');
      if (lastOut) await db.from('touches').update({ bounced: true }).eq('id', lastOut.id);
      const patch: any = { email_status: 'bounced' };
      if (bounce.hard) Object.assign(patch, { do_not_contact: true, status: 'do_not_contact' });
      await db.from('prospects').update(patch).eq('id', p.id);
      await db.from('touches').update({ state: 'skipped', error: 'Address bounced' }).eq('prospect_id', p.id).in('state', ['draft', 'approved']);
      await logEvent(db, 'bounce', { hard: bounce.hard, subject: m.subject }, p.id);
      bounces++;
      continue;
    }
    const p: any = byEmail.get(m.from) || (viaThread && pById.get(viaThread.prospect_id));
    if (!p) continue; // mail from anyone who is not a prospect is never stored
    let cls: any = core.classifyReply({ from: m.from, subject: m.subject, body: m.text }, now);
    if (/auto-(replied|generated)/i.test(m.autoSubmitted) && cls.sentiment !== 'ooo') cls = { ...cls, sentiment: 'ooo', intent: null, ooo_until: new Date(now.getTime() + 7 * 86400000).toISOString() };
    if (cls.confidence === 'low' && integrations().gemini) {
      try {
        const ai: any = await gemini(db, 'classify', { body: core.stripQuoted(m.text).slice(0, 4000) }, p.id);
        if (ai?.sentiment) cls = { ...cls, sentiment: ai.sentiment, intent: ai.intent || null, wedding_date: ai.wedding_date || null, ai_summary: ai.summary, needs_human: Boolean(ai.needs_human), confidence: 'medium', by: 'ai' };
      } catch (e) { console.error(e); }
    }
    const row = {
      prospect_id: p.id, channel: 'email', direction: 'in', state: 'received', step_name: 'reply', subject: m.subject, body: m.text,
      replied_at: m.date, message_id: m.messageId, in_reply_to: m.inReplyTo, from_address: m.from,
      reply_sentiment: cls.sentiment, reply_intent: cls.intent, classification: cls,
    };
    const { data: ins, error } = await db.from('touches').insert(row).select().single();
    if (error) { if (error.code !== '23505') console.error(error.message); continue; }
    await applyInbound(db, p, touches.filter((t: any) => t.prospect_id === p.id), ins, cls, settings, templates, now);
    stored++;
  }
  await setState(db, 'imap', { last_uid: fetched.lastUid, last_sync_at: now.toISOString(), last_error: null, last_count: stored });
  return { fetched: fetched.messages.length, stored, bounces };
}

// ---------------- Human Check-up / Unanswered Reply Escalation ----------------
export async function checkUnansweredReplies(db: any, settings: any, now = new Date()) {
  if (!integrations().telegram) return { escalated: 0, skipped: 'telegram_not_configured' };
  const state: any = await getState(db, 'escalations');
  const notifiedIds: string[] = Array.isArray(state?.notified_ids) ? state.notified_ids : [];
  const { prospects, touches } = await loadAll(db);
  const overdue = core.findUnansweredReplies({ prospects, touches, settings, now, notifiedIds });
  if (!overdue.length) return { escalated: 0 };

  const newlyNotified: string[] = [];
  for (const item of overdue.slice(0, 10)) {
    const p = item.prospect;
    if (!p) continue;
    const snippet = core.stripQuoted(item.inbound.body || '').slice(0, 350);
    const reason = item.needsHumanReason
      ? `\n⚠️ <b>Reason:</b> ${tgEscape(item.needsHumanReason)}`
      : item.pendingDraft
        ? `\n✍️ A draft reply is waiting for your approval.`
        : `\n⚠️ No reply has been sent yet.`;
    const buttons: any[] = [{ text: 'Open Conversation', url: appUrl(`prospect/${p.id}`) }];
    if (item.pendingDraft?.id && item.pendingDraft.state === 'draft' && !item.pendingDraft.lint?.errors?.length && !item.needsHumanReason) {
      buttons.unshift({ text: '✅ Approve AI Draft', data: `approve:${item.pendingDraft.id}` });
    }
    await tgSend(
      `⏰ <b>Check-up: Partner reply waiting (${item.hoursWaiting}h)</b>\n<b>${tgEscape(p.agency_name)}</b> (${tgEscape(p.email || '')}) replied and hasn't received an answer yet.${reason}\n\n💬 <i>"${tgEscape(snippet)}"</i>`,
      [buttons],
    );
    await logEvent(db, 'unanswered_reply_escalated', { touch_id: item.inbound.id, hours_waiting: item.hoursWaiting }, p.id, 'cron');
    newlyNotified.push(item.inbound.id);
  }

  const mergedIds = [...new Set([...notifiedIds, ...newlyNotified])].slice(-500);
  await setState(db, 'escalations', { notified_ids: mergedIds, last_checked_at: now.toISOString() });
  return { escalated: newlyNotified.length };
}

// ---------------- Approve (Telegram, API) ----------------
export async function approveTouch(db: any, touchId: string, settings: any, actor: string, now = new Date()) {
  const { data: t } = await db.from('touches').select('*').eq('id', touchId).single();
  if (!t) throw new Error('Draft not found');
  if (t.state !== 'draft') return { ok: false, reason: `Already ${t.state}` };
  const lint = core.lintMessage({ subject: t.subject, body: t.body, channel: t.channel, step: t.step_name });
  if (lint.errors.length) return { ok: false, reason: lint.errors[0] };
  const { data: p } = await db.from('prospects').select('*').eq('id', t.prospect_id).single();
  if (core.isBlocked(p)) return { ok: false, reason: 'Do not contact' };
  const { data: all } = await db.from('touches').select('direction,channel,step_name,state,sent_at,scheduled_at');
  const at = core.scheduleApproved(t, p, settings, core.takenSlots(all || [], now), { now, firstSendAt: core.firstColdSend(all || []) });
  await db.from('touches').update({ state: 'approved', approved_by: actor, approved_at: now.toISOString(), scheduled_at: at ? at.toISOString() : null, lint }).eq('id', t.id);
  await logEvent(db, 'draft_approved', { touch_id: t.id, via: actor }, t.prospect_id, actor);
  return { ok: true, scheduled_at: at };
}

// ---------------- Daily digest ----------------
export async function buildDigest(db: any, settings: any, now = new Date()) {
  const { prospects, touches, opps } = await loadAll(db);
  const by = group(touches);
  const pmap = new Map(prospects.map((p: any) => [p.id, p]));
  const drafts = touches.filter((t: any) => t.direction === 'out' && t.state === 'draft');
  const dms = touches.filter((t: any) => t.channel === 'instagram_dm' && t.direction === 'out' && t.state === 'approved');
  const waiting = touches.filter((t: any) => core.isRealReply(t) && !t.handled_at && !(by.get(t.prospect_id) || []).some((o: any) => o.direction === 'out' && o.state === 'sent' && new Date(o.sent_at) > new Date(t.replied_at || t.created_at)));
  const late = waiting.filter((t: any) => core.daysBetween(t.replied_at || t.created_at, now) >= 1);
  const quotes = opps.filter((o: any) => o.stage === 'quote_sent' && o.quote_sent_at && core.daysBetween(o.quote_sent_at, now) >= 3);
  const nurture = prospects.filter((p: any) => p.status === 'nurture' && p.nurture_until && new Date(p.nurture_until) <= now);
  const name = (id: string) => tgEscape((pmap.get(id) as any)?.agency_name || '?');
  const lines = [
    `<b>DOROGO outreach · ${core.localDateKey(now, settings.timezone)}</b>`,
    settings.kill_switch ? '⛔ Kill switch is ON. Nothing is sending.' : '',
    `✍️ ${drafts.length} draft${drafts.length === 1 ? '' : 's'} to approve`,
    `📷 ${dms.length} Instagram DM${dms.length === 1 ? '' : 's'} to send by hand`,
    `💬 ${waiting.length} repl${waiting.length === 1 ? 'y' : 'ies'} waiting${late.length ? ` (${late.length} over 24 h: ${late.slice(0, 4).map((t: any) => name(t.prospect_id)).join(', ')})` : ''}`,
    quotes.length ? `📄 ${quotes.length} quote${quotes.length === 1 ? '' : 's'} awaiting an answer` : '',
    nurture.length ? `🌱 ${nurture.length} nurture lead${nurture.length === 1 ? '' : 's'} due again: ${nurture.slice(0, 4).map((p: any) => tgEscape(p.agency_name)).join(', ')}` : '',
  ].filter(Boolean);
  return { text: lines.join('\n'), drafts: drafts.slice(0, 8), pmap };
}

export async function sendDigest(db: any, settings: any, now = new Date(), force = false) {
  if (!integrations().telegram) return { skipped: 'telegram_not_configured' };
  const local = core.localParts(now, settings.timezone);
  const today = core.localDateKey(now, settings.timezone);
  const st: any = await getState(db, 'digest');
  if (!force && (st.last_date === today || local.hh * 60 + local.mm < 8 * 60 + 30)) return { skipped: 'not_time' };
  const d = await buildDigest(db, settings, now);
  await tgSend(d.text, [[{ text: 'Open Today', url: appUrl('today') }]]);
  for (const t of d.drafts) {
    const p: any = d.pmap.get(t.prospect_id);
    const lintNote = t.lint?.errors?.length ? `\n⚠️ ${tgEscape(t.lint.errors[0])}` : '';
    await tgSend(`<b>${tgEscape(p?.agency_name)}</b> · ${tgEscape(t.step_name)}${t.subject ? `\n<i>${tgEscape(t.subject)}</i>` : ''}\n\n${tgEscape((t.body || '').slice(0, 700))}${lintNote}`,
      [[{ text: '✅ Approve', data: `approve:${t.id}` }, { text: '⏭ Skip', data: `skip:${t.id}` }, { text: 'Edit', url: appUrl(`prospect/${t.prospect_id}`) }]]);
  }
  await setState(db, 'digest', { last_date: today, sent_at: now.toISOString() });
  return { sent: true, drafts: d.drafts.length };
}

