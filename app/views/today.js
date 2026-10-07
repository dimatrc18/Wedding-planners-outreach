// Today: everything that needs Dmitri, in the order it matters. Built for 15 minutes a day, also on a phone.
import * as core from '../../supabase/functions/_shared/core/index.js';
import { S, api, isDemo } from '../store.js';
import { esc, attr, icon, ago, fmtDateTime, pct, plural, toast, copyText, confirmDialog, dialog } from '../ui.js';
import * as A from '../actions.js';

const STEP_LABEL = {
  T1_intro: 'T1 intro', T3_followup: 'T3 follow-up', T4_breakup: 'T4 breakup',
  rate_card_delivery: 'Rate card', reply: 'Reply', ratecard_nudge: 'Rate card nudge', fam_followup: 'FAM follow-up', custom: 'Custom',
};
export const stepLabel = (k) => STEP_LABEL[k] || k;
const SENT_CHIP = { positive: 'ok', neutral: '', negative: 'bad', ooo: 'outline', unsubscribe: 'bad' };
const INTENT = { wants_rate_card: 'wants rate card', asks_pricing: 'asks prices', has_supplier: 'has supplier', not_now: 'not now', referral_to_other: 'refers colleague', meeting_request: 'wants a call' };
export const sentimentChip = (t) => `${t.reply_sentiment ? `<span class="chip ${SENT_CHIP[t.reply_sentiment] || ''}">${esc(t.reply_sentiment)}</span>` : ''}${t.reply_intent ? `<span class="chip outline">${esc(INTENT[t.reply_intent] || t.reply_intent)}</span>` : ''}`;

let focusIdx = 0;
let editing = null;

function lintHtml(l) {
  if (!l || (!l.errors?.length && !l.warnings?.length)) return '';
  return `<div class="lint">${(l.errors || []).map((e) => `<span class="e">${esc(e)}</span>`).join('')}${(l.warnings || []).map((w) => `<span class="w">${esc(w)}</span>`).join('')}</div>`;
}

function draftCard(t, i) {
  const p = A.prospectById(t.prospect_id);
  const lint = A.lintOf(t);
  const isEdit = editing === t.id;
  const inbound = t.suggested_for ? S.touches.find((x) => x.id === t.suggested_for) : null;
  return `<article class="draft ${i === focusIdx ? 'focus' : ''}" data-card="${attr(t.id)}" data-idx="${i}">
    <div class="who">
      <a href="#prospect/${attr(p.id)}"><b>${esc(p.agency_name)}</b></a>
      ${p.contact_name ? `<span class="muted small">${esc(p.contact_name)}</span>` : ''}
      <span class="chip gold">${esc(stepLabel(t.step_name))}</span>
      ${t.variant && ['T1_intro', 'T4_breakup'].includes(t.step_name) ? `<span class="chip outline">Subject ${esc(t.variant)}</span>` : ''}
      ${p.language !== 'en' ? `<span class="chip">${esc(p.language.toUpperCase())}</span>` : ''}
      ${t.ai_generated ? '<span class="chip">AI</span>' : ''}
      ${inbound?.classification?.needs_human ? `<span class="chip bad" title="${attr(inbound.classification.escalation_reason || 'Needs human review')}">Needs human</span>` : ''}
      ${t.attach_rate_card ? '<span class="chip">+ rate card PDF</span>' : ''}
      <span class="grow"></span>
      <span class="score ${p.priority_score >= 60 ? 'hi' : ''}" title="Priority score">${core.priorityScore(p).score}</span>
    </div>
    ${inbound ? `<div class="reply-quote small">${esc(core.stripQuoted(inbound.body || '').slice(0, 280))}${inbound.classification?.escalation_reason ? `<div class="tiny" style="color:var(--bad);margin-top:4px">⚠️ ${esc(inbound.classification.escalation_reason)}</div>` : ''}</div>` : ''}
    ${p.personalization_hook && p.hook_needs_review ? '<span class="chip warn">Hook flagged for review</span>' : ''}
    ${isEdit ? `
      ${t.channel === 'email' ? `<label class="field"><span>Subject</span><input type="text" id="ed-subject" value="${attr(t.subject || '')}"></label>` : ''}
      <textarea class="body-edit" id="ed-body" aria-label="Message">${esc(t.body || '')}</textarea>
      <div class="actions"><button class="btn primary" data-act="save" data-id="${attr(t.id)}">Save <kbd>⌘↵</kbd></button><button class="btn ghost" data-act="cancel">Cancel <kbd>Esc</kbd></button></div>`
    : `${t.subject ? `<div class="subject">${esc(t.subject)}</div>` : ''}<div class="body">${esc(t.body || '')}</div>`}
    ${lintHtml(lint)}
    ${isEdit ? '' : `<div class="actions">
      <button class="btn primary" data-act="approve" data-id="${attr(t.id)}" ${lint.errors.length ? 'disabled' : ''}>${icon('check', 16)} Approve <kbd>A</kbd></button>
      <button class="btn" data-act="edit" data-id="${attr(t.id)}">${icon('edit', 16)} Edit <kbd>E</kbd></button>
      <button class="btn ghost" data-act="skip" data-id="${attr(t.id)}">Skip <kbd>S</kbd></button>
      <button class="btn ghost" data-act="snooze" data-id="${attr(t.id)}">${icon('clock', 16)} Snooze 3 days</button>
      <button class="btn ghost" data-act="regen" data-id="${attr(t.id)}" title="Rebuild from the template">Rebuild</button>
      ${!isDemo() && S.health?.integrations?.gemini ? `<button class="btn ghost" data-act="ai" data-id="${attr(t.id)}">${icon('sparkle', 16)} AI rewrite</button>` : ''}
      <span class="grow"></span>
      <span class="hint">${lint.words} words</span>
    </div>`}
  </article>`;
}

function kpiTile(label, value, sub, meter) {
  return `<div class="kpi"><span class="label">${esc(label)}</span><span class="val">${value}</span>${sub ? `<span class="ci">${sub}</span>` : ''}${meter || ''}</div>`;
}

export function rateMeter(ci, target, max = 0.5) {
  const x = (v) => `${Math.min(100, (v / max) * 100)}%`;
  if (ci.p === null) return `<div class="meter"><div class="tgt" style="left:${x(target)}" title="Target ${pct(target)}"></div></div>`;
  return `<div class="meter" role="img" aria-label="${pct(ci.p)}, likely ${pct(ci.lo)} to ${pct(ci.hi)}, target ${pct(target)}">
    <div class="range" style="left:${x(ci.lo)};width:calc(${x(ci.hi)} - ${x(ci.lo)})"></div><div class="tgt" style="left:${x(target)}"></div><div class="pt" style="left:${x(ci.p)}"></div></div>`;
}

export function render(el) {
  paint();
  function paint() {
  const d = A.todayData();
  const m = core.computeMetrics(S.prospects, S.touches, S.opps);
  const v = core.tractionVerdict(m, m.facts, S.settings);
  const tg = S.settings.targets;
  const live = !isDemo();
  const smtp = A.smtpReady();
  const peak = core.isPeakSeason();
  const order = (t) => (t.suggested_for ? 0 : t.step_name === 'rate_card_delivery' ? 1 : t.step_name === 'reply' ? 1 : t.step_name === 'T1_intro' ? 3 : 2);
  const drafts = d.drafts.sort((a, b) => order(a) - order(b) || core.priorityScore(A.prospectById(b.prospect_id)).score - core.priorityScore(A.prospectById(a.prospect_id)).score);
  focusIdx = Math.min(focusIdx, Math.max(0, drafts.length - 1));
  const clean = drafts.filter((t) => { const l = A.lintOf(t); return !l.errors.length && !l.warnings.length; });
  const dueUndrafted = d.due.length;
  const now = new Date();

  el.innerHTML = `
  <div class="page-head">
    <div><div class="label eyebrow">${esc(now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' }))}</div><h1>Today</h1></div>
    <div class="row">
      ${peak && S.settings.season_mode === 'auto' ? '<span class="chip warn" title="May to September: planners are in execution mode. Daily cap is halved.">Peak season: half speed</span>' : ''}
      ${S.settings.season_mode === 'paused' ? '<span class="chip bad">Campaign paused</span>' : ''}
      ${dueUndrafted ? `<button class="btn primary" data-act="gen">${icon('sparkle', 16)} Draft ${plural(dueUndrafted, 'due step')}</button>` : ''}
      <a class="btn" href="#add">${icon('plus', 16)} Add prospects</a>
    </div>
  </div>
  <div class="stack lg">
    <div class="kpis">
      ${kpiTile('Positive reply rate', pct(m.positiveRate.p, m.positiveRate.p !== null && m.positiveRate.p < 0.1 ? 1 : 0), m.positiveRate.n ? `${m.positive} of ${m.contacted} · likely ${pct(m.positiveRate.lo)} to ${pct(m.positiveRate.hi)}` : 'No contacts yet', rateMeter(m.positiveRate, tg.positive_reply_rate))}
      ${kpiTile('Replies waiting', `${d.replies.length}`, d.replies.length ? `oldest ${ago(d.replies.reduce((a, t) => (new Date(t.replied_at) < new Date(a) ? t.replied_at : a), d.replies[0].replied_at))}` : 'Inbox clear', '')}
      ${kpiTile('Partners won', `${m.won}`, `target ${tg.partners_won} to ${tg.partners_won_high} this season · ${m.contacted} contacted`, rateMeter({ p: Math.min(m.won / tg.partners_won_high, 1), lo: Math.min(m.won / tg.partners_won_high, 1), hi: Math.min(m.won / tg.partners_won_high, 1) }, tg.partners_won / tg.partners_won_high, 1))}
    </div>
    <a class="card row nowrap" href="#analytics" style="text-decoration:none;color:inherit">${icon('chart')}<span class="grow"><b>${esc(v.headline)}</b> <span class="muted small">${esc(v.detail)}</span></span><span class="small">Analytics →</span></a>

    ${live && !smtp && S.health && !S.health.error ? `<div class="banner warn">${icon('mail')}<span><b>Mailbox not connected.</b> Approved emails wait under Scheduled. Send them from your mail app with “Open in mail”, then “Mark sent”. <a href="#settings">Connect it</a>.</span></div>` : ''}

    ${d.replies.length ? `<section class="section"><div class="section-head"><h2>Replies waiting <span class="count">${d.replies.length}</span></h2><span class="hint">Aim to answer positive replies within 15 minutes</span></div>
      <div class="card flush list">${d.replies.map((t) => {
        const p = A.prospectById(t.prospect_id);
        const sugg = S.touches.find((x) => x.suggested_for === t.id && ['draft', 'approved'].includes(x.state));
        const late = now - new Date(t.replied_at || t.created_at) > 86400000;
        return `<div class="list-item" style="align-items:flex-start">
          <div class="t stack" style="gap:6px">
            <div class="row"><a href="#prospect/${attr(p.id)}"><b>${esc(p.agency_name)}</b></a>${sentimentChip(t)}${t.classification?.needs_human ? `<span class="chip bad" title="${attr(t.classification.escalation_reason || 'Needs human reply')}">Needs human</span>` : ''}<span class="chip ${late ? 'warn' : ''}">${esc(ago(t.replied_at || t.created_at))}</span><span class="chip outline">${esc(t.channel)}</span></div>
            <div class="reply-quote">${esc(core.stripQuoted(t.body || '').slice(0, 420))}</div>
            <div class="actions">${sugg ? `<button class="btn primary sm" data-act="goto-draft" data-id="${attr(sugg.id)}">${icon('reply', 15)} Review suggested reply</button>` : `<button class="btn sm" data-act="draft-reply" data-id="${attr(t.id)}">${icon('reply', 15)} Draft a reply</button>`}
              <button class="btn ghost sm" data-act="handled" data-id="${attr(t.id)}">Mark handled</button>
              ${p.phone ? `<a class="btn ghost sm" href="tel:${attr(p.phone)}">${icon('phone', 15)} Call</a>` : ''}</div>
          </div></div>`;
      }).join('')}</div></section>` : ''}

    <section class="section" id="queue">
      <div class="section-head"><h2>Approval queue <span class="count">${drafts.length}</span></h2>
        <div class="row">${clean.length > 1 ? `<button class="btn sm" data-act="approve-clean">Approve ${clean.length} with no warnings</button>` : ''}<span class="hint">J/K move · A approve · E edit · S skip</span></div></div>
      ${drafts.length ? `<div class="queue">${drafts.map(draftCard).join('')}</div>` : `<div class="empty">${dueUndrafted ? `${plural(dueUndrafted, 'step is', 'steps are')} due. <button class="btn sm primary" data-act="gen">Draft them now</button>` : 'Nothing to approve. New drafts appear here when a step falls due.'}</div>`}
    </section>

    ${d.scheduled.length ? `<section class="section"><div class="section-head"><h2>Scheduled <span class="count">${d.scheduled.length}</span></h2><span class="hint">Send window ${esc(S.settings.window_start)} to ${esc(S.settings.window_end)}, ${esc(S.settings.send_days.map((x) => ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][x]).join(' '))}</span></div>
      <div class="card flush list">${d.scheduled.map((t) => {
        const p = A.prospectById(t.prospect_id);
        const gate = core.canSend(t, p, A.touchesOf(p.id), S.settings, { now, sentToday: 0, firstSendAt: core.firstColdSend(S.touches) });
        return `<div class="list-item"><div class="t"><b>${esc(p.agency_name)}</b><span class="small muted">${esc(stepLabel(t.step_name))} · ${esc(t.subject || '')}</span></div>
          <span class="small num ${gate.ok ? '' : 'faint'}" title="${attr(gate.ok ? 'Ready to send' : core.BLOCK_REASONS[gate.reason] || gate.reason)}">${t.scheduled_at ? esc(fmtDateTime(t.scheduled_at)) : 'next run'}</span>
          ${smtp || isDemo() ? `<button class="btn sm" data-act="send-now" data-id="${attr(t.id)}">${icon('send', 15)} Send now</button>` : `<a class="btn sm" href="${attr(A.mailtoHref(t))}">${icon('mail', 15)} Open in mail</a><button class="btn sm" data-act="mark-sent" data-id="${attr(t.id)}">Mark sent</button>`}
          <button class="btn ghost sm" data-act="unapprove" data-id="${attr(t.id)}">Back to drafts</button></div>`;
      }).join('')}</div></section>` : ''}

    ${d.failed.length ? `<section class="section"><div class="section-head"><h2>Failed sends <span class="count">${d.failed.length}</span></h2></div>
      <div class="card flush list">${d.failed.map((t) => `<div class="list-item"><div class="t"><b>${esc(A.prospectById(t.prospect_id)?.agency_name)}</b><span class="small" style="color:var(--bad)">${esc(t.error || '')}</span></div><button class="btn sm" data-act="unapprove" data-id="${attr(t.id)}">Back to drafts</button></div>`).join('')}</div></section>` : ''}

    ${d.reminders.length ? `<section class="section"><div class="section-head"><h2>Follow-ups & reminders <span class="count">${d.reminders.length}</span></h2></div>
      <div class="card flush list">${d.reminders.map((r) => `<a class="list-item clickable" href="#prospect/${attr(r.p.id)}" style="color:inherit;text-decoration:none"><span class="dot ${r.kind === 'stale' || r.kind === 'quote' ? 'warn' : 'gold'}"></span><div class="t"><b>${esc(r.p.agency_name)}</b><span class="small muted">${esc(r.text)}</span></div><span class="chip">${esc(core.stageLabel(r.p.status))}</span></a>`).join('')}</div></section>` : ''}

    <section class="section"><div class="section-head"><h2>Research next <span class="count">${d.research.length}</span></h2><span class="hint">Highest Fit Score (/100) first · Target ≥ 65/100.</span></div>
      ${d.research.length ? `<div class="card flush list">${d.research.slice(0, 6).map((p) => `<a class="list-item clickable" href="#prospect/${attr(p.id)}" style="color:inherit;text-decoration:none"><span class="score ${core.priorityScore(p).score >= 65 ? 'hi' : 'low'}">${core.priorityScore(p).score}/100</span><div class="t"><b>${esc(p.agency_name)}</b><span class="small muted">${esc(A.readinessProblems(p).join(' · ') || 'Ready to move to Ready to Contact')}</span></div><span class="small">Research →</span></a>`).join('')}</div>` : '<div class="empty">Research list is empty. <a href="#add">Add prospects</a>.</div>'}
      ${d.readyNoDraft.length ? `<p class="small muted">${plural(d.readyNoDraft.length, 'Ready prospect has', 'Ready prospects have')} no draft yet: ${d.readyNoDraft.slice(0, 5).map((p) => `<a href="#prospect/${attr(p.id)}">${esc(p.agency_name)}</a>`).join(', ')}.</p>` : ''}
    </section>
  </div>`;
  }

  const byId = (id) => S.touches.find((t) => t.id === id);
  const cards = () => [...el.querySelectorAll('[data-card]')];
  const setFocus = (i, scroll = true) => {
    const cs = cards(); if (!cs.length) return;
    focusIdx = Math.max(0, Math.min(cs.length - 1, i));
    cs.forEach((c, k) => c.classList.toggle('focus', k === focusIdx));
    if (scroll) cs[focusIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  const focusedId = () => cards()[focusIdx]?.dataset.card;

  async function act(name, id, btn) {
    const t = id ? byId(id) : null;
    try {
      if (btn) btn.disabled = true;
      switch (name) {
        case 'gen': { const n = await A.generateDueDrafts(); toast(n ? `${plural(n, 'draft')} ready` : 'Nothing new to draft'); break; }
        case 'approve': {
          const at = await A.approve(t);
          if (at !== false) toast(t.channel === 'email' ? (at && at - Date.now() > 120000 ? `Scheduled ${fmtDateTime(at)}` : 'Approved, sending on the next run') : 'Approved');
          break;
        }
        case 'approve-clean': {
          const list = A.todayData().drafts.filter((x) => { const l = A.lintOf(x); return !l.errors.length && !l.warnings.length; });
          if (!await confirmDialog(`Approve ${list.length} drafts?`, 'Each one has passed the copy-linter with no warnings. They go out in the next send windows, within the daily cap.', 'Approve all')) break;
          for (const x of list) await A.approve(x);
          toast(`${list.length} approved`);
          break;
        }
        case 'edit': editing = id; paint(); el.querySelector('#ed-body')?.focus(); return;
        case 'cancel': editing = null; paint(); return;
        case 'save': {
          const body = el.querySelector('#ed-body').value;
          const subject = el.querySelector('#ed-subject')?.value;
          editing = null;
          document.activeElement?.blur();
          await A.saveDraft(t, subject === undefined ? { body } : { body, subject });
          paint();
          toast('Saved');
          break;
        }
        case 'skip': await A.skip(t); toast('Skipped'); break;
        case 'snooze': await A.snooze(t, 3); toast('Snoozed for 3 days'); break;
        case 'regen': {
          const p = A.prospectById(t.prospect_id);
          const t1 = A.touchesOf(p.id).find((x) => x.step_name === 'T1_intro' && x.subject && x.id !== t.id);
          const stepCfg = (S.settings.steps || core.DEFAULT_STEPS).find((s) => s.key === t.step_name);
          const dr = core.buildDraft({ prospect: p, key: t.template_key || t.step_name, templates: S.templates, threadSubject: ['T1_intro', 'T4_breakup'].includes(t.step_name) ? '' : (t1?.subject || t.subject), step: stepCfg });
          if (dr) await A.saveDraft(t, { subject: dr.subject || t.subject, body: dr.body, ai_generated: false });
          toast('Rebuilt from the template');
          break;
        }
        case 'ai': toast('Rewriting…'); await api('ai_redraft', { touch_id: id }); toast('AI rewrite ready, check it before approving'); break;
        case 'copy': await copyText(t.body); break;
        case 'mark-sent': await A.markSent(t); toast('Marked as sent'); break;
        case 'send-now': await A.sendNow(t); break;
        case 'unapprove': await A.unapprove(t); break;
        case 'handled': await A.markHandled(t); toast('Marked handled'); break;
        case 'goto-draft': {
          const i = cards().findIndex((c) => c.dataset.card === id);
          if (i >= 0) setFocus(i); else { location.hash = `prospect/${t.prospect_id}`; }
          return;
        }
        case 'draft-reply': {
          const p = A.prospectById(t.prospect_id);
          const key = await pickReplyTemplate();
          if (key) { await A.draftReply(p, key, t); toast('Reply drafted in the queue'); }
          break;
        }
      }
    } catch (e) {
      toast(e.message, 'error');
    } finally { if (btn && btn.isConnected) btn.disabled = false; }
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b) { e.preventDefault(); act(b.dataset.act, b.dataset.id, b); return; }
    const card = e.target.closest('[data-card]');
    if (card && !e.target.closest('a, button, textarea, input')) setFocus(+card.dataset.idx, false);
  });

  const onKey = (e) => {
    const tag = document.activeElement?.tagName;
    if (editing) {
      if (e.key === 'Escape') { e.preventDefault(); act('cancel'); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); act('save', editing); }
      return;
    }
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('.dialog')) return;
    const id = focusedId();
    const k = e.key.toLowerCase();
    if (k === 'j') { e.preventDefault(); setFocus(focusIdx + 1); }
    else if (k === 'k') { e.preventDefault(); setFocus(focusIdx - 1); }
    else if (k === 'a' && id) { e.preventDefault(); act('approve', id, el.querySelector(`[data-card="${id}"] [data-act=approve]`)); }
    else if (k === 'e' && id) { e.preventDefault(); act('edit', id); }
    else if (k === 's' && id) { e.preventDefault(); act('skip', id); }
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

export function pickReplyTemplate() {
  const opts = S.templates.filter((t) => t.kind !== 'sequence' && t.language === 'en');
  return dialog({
    title: 'Draft a reply',
    body: `<div class="list card flush">${opts.map((t) => `<button class="list-item clickable" style="border:0;background:none;text-align:left;width:100%" data-key="${attr(t.key)}"><div class="t"><b>${esc(t.name || t.key)}</b><span class="small muted">${esc((t.body || '').split('\n').filter(Boolean)[1] || '').slice(0, 90)}</span></div></button>`).join('')}</div>`,
    onMount: (box, close) => box.addEventListener('click', (e) => { const b = e.target.closest('[data-key]'); if (b) close(b.dataset.key); }),
  });
}
