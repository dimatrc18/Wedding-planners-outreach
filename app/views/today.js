// Today: everything that needs Dmitri, in the order it matters. Built for 15 minutes a day, also on a phone.
import * as core from '../../supabase/functions/_shared/core/index.js';
import { S, api, isDemo, refreshLive } from '../store.js';
import { esc, attr, icon, ago, fmtDateTime, pct, plural, toast, copyText, confirmDialog, dialog } from '../ui.js';
import * as A from '../actions.js';

const STEP_LABEL = {
  T1_intro: 'Step 1 (Intro)', T3_followup: 'Step 2 (Follow-up 1)', T4_breakup: 'Step 3 (Follow-up 2)',
  rate_card_delivery: 'Rate card', reply: 'Reply', ratecard_nudge: 'Rate card nudge', fam_followup: 'FAM follow-up', custom: 'Custom',
};
export const stepLabel = (k) => STEP_LABEL[k] || k;
const SENT_CHIP = { positive: 'ok', neutral: '', negative: 'bad', ooo: 'outline', unsubscribe: 'bad' };
const INTENT = { wants_rate_card: 'wants rate card', asks_pricing: 'asks prices', has_supplier: 'has supplier', not_now: 'not now', referral_to_other: 'refers colleague', meeting_request: 'wants a call' };
export const sentimentChip = (t) => `${t.reply_sentiment ? `<span class="chip ${SENT_CHIP[t.reply_sentiment] || ''}">${esc(t.reply_sentiment)}</span>` : ''}${t.reply_intent ? `<span class="chip outline">${esc(INTENT[t.reply_intent] || t.reply_intent)}</span>` : ''}`;

let focusIdx = 0;
let editing = null;
let todayTab = 'queue'; // 'queue' | 'scheduled' | 'manual' | 'bus' | 'research'

const cleanWebUrl = (url) => {
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

const displayDomain = (url) => {
  if (!url) return '';
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
};

function lintHtml(l) {
  if (!l || (!l.errors?.length && !l.warnings?.length)) return '';
  return `<div class="lint">${(l.errors || []).map((e) => `<span class="e">${esc(e)}</span>`).join('')}${(l.warnings || []).map((w) => `<span class="w">${esc(w)}</span>`).join('')}</div>`;
}

export function cleanDuplicateDraftGreetings(body = '') {
  if (!body) return '';
  let clean = core.stripSignOff ? core.stripSignOff(body) : body;
  const SIG_BLOCK_RE = /\n*(?:Dmitri(?:\s+Traciuc)?|Дмитрий(?:\s+Трачук)?)\s*\n+(?:Senior Dispatcher|Старший диспетчер|Founder|DOROGO)[^\n]*\n+(?:(?:Lake Como|Lago di Como|Озеро Комо|Tuscany|Venice|Toscana|Venezia|Milano|Milan)[^\n]*\n*|(?:dmitri@dorogo\.eu|wa\.me)[^\n]*\n*)*/gi;
  clean = clean.replace(SIG_BLOCK_RE, '\n\n').replace(/Founder,\s*DOROGO/gi, 'Senior Dispatcher');
  clean = clean
    .replace(/(?:Warm regards|Kind regards|Best regards|With warm regards|Regards|Sincerely|Un cordiale saluto|Cordiali saluti|Distinti saluti|A presto|С уважением|Всего доброго),?[\s\S]*$/i, '')
    .replace(/\n*(?:Dmitri(?:\s+Traciuc)?|Дмитрий(?:\s+Трачук)?)\s*\n+(?:Senior Dispatcher|Старший диспетчер|Founder|DOROGO)[\s\S]*$/i, '')
    .replace(/\n*(?:Dmitri|Дмитрий)\s*\n+(?:DOROGO|WhatsApp|wa\.me|dmitri@dorogo\.eu)[^\n]*[\s\S]*$/i, '')
    .replace(/\n+(?:Dmitri(?:\s+Traciuc)?|Дмитрий(?:\s+Трачук)?)\s*$/i, '')
    .trim();
  const paras = clean.split(/\n\s*\n/);
  if (paras.length >= 2) {
    let p0 = paras[0].trim();
    let p1 = paras[1].trim();
    // Sanitize accidental agency name used as Russian contact first name (e.g. Desìo from Desìo Planning Team)
    if (/^Здравствуйте,\s+Desìo,/i.test(p0)) {
      p0 = 'Здравствуйте,';
      paras[0] = p0;
    }
    // Clean Russian duplicate greeting
    if (/^(?:Здравствуйте|Добрый день|Приветствую)[,\s!]*/i.test(p0) &&
        /^(?:Здравствуйте|Добрый день|Приветствую)[,\s!]+/i.test(p1)) {
      p1 = p1.replace(/^(?:Здравствуйте|Добрый день|Приветствую)[,\s!]+\s*/i, '');
      if (p1) p1 = p1.charAt(0).toUpperCase() + p1.slice(1);
      paras[1] = p1;
    }
    // Clean Italian duplicate greeting
    if (/^(?:Buongiorno|Buonasera|Ciao)[,\s!]*/i.test(p0) &&
        /^(?:Buongiorno|Buonasera|Ciao)[,\s!]+/i.test(p1)) {
      p1 = p1.replace(/^(?:Buongiorno|Buonasera|Ciao)[,\s!]+\s*/i, '');
      if (p1) p1 = p1.charAt(0).toUpperCase() + p1.slice(1);
      paras[1] = p1;
    }
    // Clean English duplicate greeting
    if (/^(?:Hi|Hello|Dear)[,\s!]*/i.test(p0) &&
        /^(?:Hi|Hello|Dear)[,\s!]+/i.test(p1)) {
      p1 = p1.replace(/^(?:Hi|Hello|Dear)[,\s!]+\s*/i, '');
      if (p1) p1 = p1.charAt(0).toUpperCase() + p1.slice(1);
      paras[1] = p1;
    }
    clean = paras.join('\n\n');
  }
  return clean;
}

function draftCard(t, i) {
  const p = A.prospectById(t.prospect_id);
  const lint = A.lintOf(t);
  const isEdit = editing === t.id;
  const inbound = t.suggested_for ? S.touches.find((x) => x.id === t.suggested_for) : null;
  const displayBody = cleanDuplicateDraftGreetings(t.body || '');
  return `<article class="draft ${i === focusIdx ? 'focus' : ''}" data-card="${attr(t.id)}" data-idx="${i}">
    <div class="who">
      <a href="#prospect/${attr(p.id)}"><b>${esc(p.agency_name)}</b></a>
      ${p.website ? `<a href="${attr(p.website)}" target="_blank" rel="noopener" class="small muted" style="display:inline-flex;align-items:center;gap:3px;text-decoration:underline" title="Open verified agency website">${icon('external', 13)} ${esc(core.domainOf(p.website))}</a>` : ''}
      ${p.contact_name ? `<span class="muted small">${esc(p.contact_name)}</span>` : ''}
      <span class="chip" title="${esc(core.marketLabel(core.inferMarket(p)))}">${core.marketFlag(core.inferMarket(p))} ${(p.market || core.inferMarket(p)).toUpperCase()}</span>
      <span class="chip gold">${esc(stepLabel(t.step_name))}</span>
      ${p.enrichment?.verification?.resultcode === 1 ? `<span class="chip ok" title="${p.enrichment?.verification?.provider === 'zerobounce' ? 'ZeroBounce' : p.enrichment?.verification?.provider === 'debounce' ? 'DeBounce' : 'MillionVerifier'}: Mailbox confirmed deliverable">🛡️ Verified (${p.enrichment?.verification?.provider === 'zerobounce' ? 'ZB' : p.enrichment?.verification?.provider === 'debounce' ? 'DeBounce' : 'MV'})</span>` : (p.enrichment?.verification?.resultcode === 2 ? `<span class="chip warn" title="Catch-all domain (requires verbatim page proof)">⚠️ Catch-all</span>` : (p.email_status === 'mx_ok' || p.email_status === 'valid' ? `<span class="chip ok" title="DNS MX verified: active mail server">🛡️ MX OK</span>` : p.email_status === 'invalid' || p.email_status === 'no_mx' ? `<span class="chip bad" title="Email verification failed: cannot deliver email">⚠️ Invalid</span>` : ''))}
      ${t.variant && ['T1_intro', 'T4_breakup'].includes(t.step_name) ? `<span class="chip outline">${t.step_name === 'T1_intro' ? (p.type === 'venue' || p.type === 'concierge_hotel' ? 'Variant C · Hotel/Venue' : (t.variant === 'B' ? 'Variant B · Late returns' : 'Variant A · Intro')) : `Subject ${esc(t.variant)}`}</span>` : ''}
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
      <textarea class="body-edit" id="ed-body" aria-label="Message">${esc(displayBody)}</textarea>
      <div class="actions"><button class="btn primary" data-act="save" data-id="${attr(t.id)}">Save <kbd>⌘↵</kbd></button><button class="btn ghost" data-act="cancel">Cancel <kbd>Esc</kbd></button></div>`
    : `${t.subject ? `<div class="subject">${esc(t.subject)}</div>` : ''}<div class="body">${esc(displayBody)}</div>`}
    ${lintHtml(lint)}
    ${isEdit ? '' : `<div class="actions">
      <button class="btn primary" data-act="approve" data-id="${attr(t.id)}" ${lint.errors.length ? 'disabled' : ''}>${icon('check', 16)} Approve <kbd>A</kbd></button>
      <button class="btn" data-act="edit" data-id="${attr(t.id)}">${icon('edit', 16)} Edit <kbd>E</kbd></button>
      <button class="btn ghost" data-act="skip" data-id="${attr(t.id)}">Skip <kbd>S</kbd></button>
      <button class="btn ghost" data-act="snooze" data-id="${attr(t.id)}">${icon('clock', 16)} Snooze 3 days</button>
      <button class="btn ghost" data-act="regen" data-id="${attr(t.id)}" title="Rebuild from the template">Rebuild</button>
      ${t.step_name === 'T1_intro' && p.type !== 'venue' && p.type !== 'concierge_hotel' ? `<button class="btn ghost" data-act="toggle-variant" data-id="${attr(t.id)}" title="Switch between Variant A (Introduction) and Variant B (Late returns scenario)">Switch to Variant ${t.variant === 'B' ? 'A' : 'B'}</button>` : ''}
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
  const isIntlProspect = (p) => Boolean(p && ((p.market && p.market !== 'it') || p.segment === 'international'));
  const drafts = d.drafts.sort((a, b) => {
    const ord = order(a) - order(b);
    if (ord !== 0) return ord;
    const pA = A.prospectById(a.prospect_id);
    const pB = A.prospectById(b.prospect_id);
    const intlA = isIntlProspect(pA) ? 1 : 0;
    const intlB = isIntlProspect(pB) ? 1 : 0;
    if (intlA !== intlB) return intlB - intlA; // Prioritize high-yield international drafts
    return (core.priorityScore(pB).score || 0) - (core.priorityScore(pA).score || 0);
  });
  focusIdx = Math.min(focusIdx, Math.max(0, drafts.length - 1));
  const clean = drafts.filter((t) => { const l = A.lintOf(t); return !l.errors.length && !l.warnings.length; });
  const dueUndrafted = d.due.length;
  const now = new Date();
  const busList = (S.busPartners || []).filter((b) => b.status !== 'NOT_RELEVANT');
  const busContacted = busList.filter((b) => ['t1_sent', 't2_sent', 't3_sent', 'replied'].includes(b.outreach_stage) || b.sent_at).length;
  const busReplied = busList.filter((b) => b.outreach_stage === 'replied' || b.replied_at).length;
  const busTotalSent = busList.reduce((sum, b) => {
    if (b.outreach_stage === 't3_sent') return sum + 3;
    if (b.outreach_stage === 't2_sent') return sum + 2;
    if (b.outreach_stage === 't1_sent' || b.outreach_stage === 'replied' || b.sent_at) return sum + (b.last_followup_at ? 2 : 1);
    return sum;
  }, 0);
  const todayKey = core.localDateKey(now, S.settings.timezone || 'Europe/Rome');
  const busSentToday = busList.filter((b) => {
    const ts = b.last_followup_at || b.sent_at;
    return ts && core.localDateKey(new Date(ts), S.settings.timezone || 'Europe/Rome') === todayKey;
  }).length;
  const wpSentToday = S.touches.filter((t) => t.direction === 'out' && t.state === 'sent' && t.sent_at && core.localDateKey(new Date(t.sent_at), S.settings.timezone || 'Europe/Rome') === todayKey).length;
  const manualLeads = (S.prospects || []).filter((p) => p.email_status === 'bounced' || !p.email || ['no_mx', 'invalid'].includes(p.email_status));
  const busRepliedRows = busList.filter((b) => b.outreach_stage === 'replied' || b.replied_at);

  const renderQueuePanel = () => `
    <div style="padding:16px 18px;display:flex;flex-direction:column;gap:16px">
      ${d.replies.length ? `
        <div>
          <div class="row between" style="margin-bottom:8px">
            <span style="font-size:13.5px;font-weight:600;color:var(--sail-ink)">Inbound Replies Waiting (${d.replies.length})</span>
            <span style="font-size:11.5px;color:var(--sail-muted)">Aim to answer positive replies within 15 minutes</span>
          </div>
          <div class="card flush list">${d.replies.map((t) => {
            const p = A.prospectById(t.prospect_id);
            const sugg = S.touches.find((x) => x.suggested_for === t.id && ['draft', 'approved'].includes(x.state));
            const late = now - new Date(t.replied_at || t.created_at) > 86400000;
            return `<div class="list-item" style="align-items:flex-start">
              <div class="t stack" style="gap:6px">
                <div class="row"><a href="#prospect/${attr(p.id)}"><b>${esc(p.agency_name)}</b></a>${sentimentChip(t)}${t.classification?.needs_human ? `<span class="chip bad" title="${attr(t.classification.escalation_reason || 'Needs human reply')}">Needs human</span>` : ''}<span class="chip ${late ? 'warn' : ''}">${esc(ago(t.replied_at || t.created_at))}</span><span class="chip outline">${esc(t.channel)}</span></div>
                <div class="reply-quote">${esc(core.stripQuoted(t.body || '').slice(0, 420))}</div>
                <div class="actions">${sugg ? `<button class="sail-btn xs primary" data-act="goto-draft" data-id="${attr(sugg.id)}">Review suggested reply</button>` : `<button class="sail-btn xs" data-act="draft-reply" data-id="${attr(t.id)}">Draft a reply</button>`}
                  <button class="sail-btn xs" data-act="handled" data-id="${attr(t.id)}">Mark handled</button>
                  ${p.phone ? `<a class="sail-btn xs" href="tel:${attr(p.phone)}">Call</a>` : ''}</div>
              </div></div>`;
          }).join('')}</div>
        </div>
      ` : ''}

      <div id="queue">
        <div class="row between" style="margin-bottom:10px;flex-wrap:wrap;gap:8px">
          <div class="row" style="gap:8px;align-items:center">
            <span style="font-size:13.5px;font-weight:600;color:var(--sail-ink)">Draft Approval Queue (${drafts.length})</span>
            <span style="font-size:11.5px;color:var(--sail-muted)">J/K move · A approve · E edit · S skip</span>
          </div>
          <div class="row" style="gap:6px">
            ${clean.length > 1 ? `<button class="sail-btn xs primary" data-act="approve-clean">Approve ${clean.length} clean drafts</button>` : ''}
            ${drafts.length > 0 ? `<button class="sail-btn xs" data-act="refresh-all">Refresh All Drafts</button>` : ''}
          </div>
        </div>
        ${drafts.length
          ? `<div class="queue">${drafts.map(draftCard).join('')}</div>`
          : `<div style="padding:20px;border:1px dashed var(--sail-line);border-radius:6px;background:#F8FAFC;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
              <div>
                <div style="font-size:13px;font-weight:600;color:var(--sail-ink)">
                  ${dueUndrafted ? `${plural(dueUndrafted, 'step is', 'steps are')} due to draft.` : 'Approval queue is clear — all approved drafts are in the Scheduled Outbox.'}
                </div>
                <div style="font-size:12px;color:var(--sail-muted);margin-top:2px">
                  ${d.scheduled.length} approved wedding emails are queued to send automatically during recipient morning windows (08:30–14:30).
                </div>
              </div>
              <div class="row" style="gap:8px">
                ${dueUndrafted ? `<button class="sail-btn xs primary" data-act="gen">Draft ${plural(dueUndrafted, 'due step')}</button>` : ''}
                <button class="sail-btn xs primary" data-today-tab="scheduled">View Scheduled Outbox (${d.scheduled.length}) →</button>
                <button class="sail-btn xs" data-today-tab="manual">Manual IG / WA (${manualLeads.length}) →</button>
              </div>
            </div>`}
      </div>

      ${d.failed.length ? `
        <div>
          <div class="row between" style="margin-bottom:8px">
            <span style="font-size:13.5px;font-weight:600;color:var(--sail-ink)">Failed Sends (${d.failed.length})</span>
            <div class="row" style="gap:6px">
              <button class="sail-btn xs primary" data-act="retry-all-failed">Retry all (${d.failed.length})</button>
              <button class="sail-btn xs" data-act="unapprove-all-failed">Move all to drafts</button>
            </div>
          </div>
          <div class="card flush list">${d.failed.map((t) => `<div class="list-item"><div class="t"><b>${esc(A.prospectById(t.prospect_id)?.agency_name)}</b><span class="small" style="color:var(--bad)">${esc(t.error || '')}</span></div>
            <div class="row gap-xs">
              <button class="sail-btn xs" data-act="retry-failed" data-id="${attr(t.id)}">Retry</button>
              <button class="sail-btn xs" data-act="unapprove" data-id="${attr(t.id)}">Back to drafts</button>
            </div></div>`).join('')}</div>
        </div>
      ` : ''}
    </div>
  `;

  const renderScheduledPanel = () => {
    if (!d.scheduled.length) {
      return `<div style="padding:32px 20px;text-align:center;color:var(--sail-muted)">No scheduled emails waiting in the outbox right now.</div>`;
    }
    return `
      <div class="sail-table-wrap">
        <table class="sail-table" style="table-layout:fixed;width:100%">
          <thead>
            <tr>
              <th style="width:22%">Agency &amp; Market</th>
              <th style="width:18%">Recipient Email</th>
              <th style="width:28%">Step &amp; Subject Line</th>
              <th style="width:16%">Scheduled Slot &amp; Gate</th>
              <th style="width:16%">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${d.scheduled.map((t) => {
              const p = A.prospectById(t.prospect_id) || {};
              const mkt = p.market || core.inferMarket(p);
              const gate = core.canSend(t, p, A.touchesOf(p.id), S.settings, { now, sentToday: 0, firstSendAt: core.firstColdSend(S.touches) });
              return `
                <tr>
                  <td>
                    <div style="font-weight:600;color:var(--sail-ink);font-size:13px">
                      <a href="#prospect/${attr(p.id)}" style="color:inherit;text-decoration:none">${esc(p.agency_name || 'Agency')}</a>
                    </div>
                    <div style="margin-top:3px;display:flex;gap:5px;align-items:center">
                      <span class="sail-pill std" style="font-size:10px;padding:0 5px">${core.marketFlag(mkt)} ${esc(mkt.toUpperCase())}</span>
                      <span style="font-size:11px;color:var(--sail-muted)">${esc(p.location || '')}</span>
                    </div>
                  </td>
                  <td style="font-size:12px;color:var(--sail-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${attr(p.email || '')}">
                    ${esc(p.email || '—')}
                  </td>
                  <td>
                    <span class="sail-pill info" style="font-size:10.5px;padding:1px 6px">${esc(stepLabel(t.step_name))}</span>
                    <div style="font-size:12px;color:var(--sail-ink);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${attr(t.subject || '')}">
                      ${esc(t.subject || '')}
                    </div>
                  </td>
                  <td>
                    <span class="sail-pill ${gate.ok ? 'ok' : 'std'}" style="font-size:10.5px;padding:1px 6px" title="${attr(gate.ok ? 'Inside local send window' : core.BLOCK_REASONS[gate.reason] || gate.reason)}">
                      <span class="sail-pill-dot"></span>${gate.ok ? 'Window Open' : esc(gate.reason === 'outside_window' ? 'Waiting Local Window' : gate.reason)}
                    </span>
                    <div style="font-size:11px;color:var(--sail-muted);margin-top:3px;font-variant-numeric:tabular-nums">
                      ${t.scheduled_at ? esc(fmtDateTime(t.scheduled_at)) : 'Next cron run'}
                    </div>
                  </td>
                  <td>
                    <div class="row" style="gap:5px;flex-wrap:wrap">
                      ${smtp || isDemo()
                        ? `<button class="sail-btn xs primary" data-act="send-now" data-id="${attr(t.id)}">Send Now</button>`
                        : `<a class="sail-btn xs primary" href="${attr(A.mailtoHref(t))}">Mail ↗</a><button class="sail-btn xs" data-act="mark-sent" data-id="${attr(t.id)}">Mark Sent</button>`}
                      <button class="sail-btn xs" data-act="unapprove" data-id="${attr(t.id)}">To Drafts</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const renderManualPanel = () => {
    if (!manualLeads.length) {
      return `<div style="padding:32px 20px;text-align:center;color:var(--sail-muted)">No manual IG / WhatsApp leads right now.</div>`;
    }
    return `
      <div class="sail-table-wrap">
        <table class="sail-table" style="table-layout:fixed;width:100%">
          <thead>
            <tr>
              <th style="width:23%">Agency &amp; Website</th>
              <th style="width:16%">Reason</th>
              <th style="width:23%">Direct Channels</th>
              <th style="width:20%">Opening Hook</th>
              <th style="width:18%">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${manualLeads.map((p) => {
              const mkt = p.market || core.inferMarket(p);
              const cleanPhone = (p.whatsapp || p.phone || '').replace(/[^0-9+]/g, '');
              const igHandle = p.instagram ? p.instagram.replace(/^@/, '') : '';
              const webUrl = cleanWebUrl(p.website);
              const webDomain = displayDomain(p.website);
              const isBounced = p.email_status === 'bounced' || p.bounced;
              const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(p.agency_name + ' wedding planner Lake Como')}`;
              return `
                <tr>
                  <td>
                    <div style="font-weight:600;color:var(--sail-ink);font-size:13px">
                      <a href="#prospect/${attr(p.id)}" style="color:inherit;text-decoration:none" title="Open planner CRM card">${esc(p.agency_name)}</a>
                    </div>
                    <div style="font-size:11px;color:var(--sail-muted);margin-top:2px">
                      ${core.marketFlag(mkt)} ${esc(p.location || 'Lake Como')}
                    </div>
                    <div style="margin-top:4px;font-size:11.5px">
                      ${webUrl
                        ? `<a href="${attr(webUrl)}" target="_blank" rel="noopener" style="color:var(--sail-primary, #635bff);text-decoration:none;display:inline-flex;align-items:center;gap:3px;font-weight:500" title="Open ${attr(webDomain)} in new tab">🌐 ${esc(webDomain)} ↗</a>`
                        : `<a href="${attr(searchUrl)}" target="_blank" rel="noopener" style="color:var(--sail-muted);text-decoration:none;display:inline-flex;align-items:center;gap:3px" title="Search agency website on Google">🔍 Search Site ↗</a>`
                      }
                    </div>
                  </td>
                  <td>
                    <button class="sail-pill ${isBounced ? 'warn' : 'missing'}" style="font-size:10.5px;padding:2px 7px;cursor:pointer;border:1px solid transparent;display:inline-flex;align-items:center;gap:4px;font-family:inherit" data-act="rescue-lead" data-id="${attr(p.id)}" title="Click to add email & put lead back in queue">
                      <span>${isBounced ? '⚠️ Bounced' : '⚠️ Missing Email'}</span>
                      <span style="font-weight:700;text-decoration:underline">${isBounced ? 'Fix ↗' : '+Add ↗'}</span>
                    </button>
                    ${(p.bounced_email || (isBounced && p.email)) ? `
                      <div style="font-size:10px;color:var(--sail-muted);margin-top:3px;max-width:140px;overflow:hidden;text-overflow:ellipsis" title="${attr(p.bounced_email || p.email)}">
                        ${esc(p.bounced_email || p.email)}
                      </div>
                    ` : ''}
                  </td>
                  <td>
                    <div class="row" style="gap:5px;flex-wrap:wrap;font-size:12px">
                      ${webUrl ? `<a class="sail-btn xs" href="${attr(webUrl)}" target="_blank" rel="noopener" title="Open official agency website">Site ↗</a>` : ''}
                      ${cleanPhone ? `<a class="sail-btn xs primary" href="https://wa.me/${cleanPhone.replace(/^\+/, '')}" target="_blank" rel="noopener">WhatsApp ↗</a>` : ''}
                      ${igHandle ? `<a class="sail-btn xs" href="https://instagram.com/${attr(igHandle)}" target="_blank" rel="noopener">@${esc(igHandle)} ↗</a>` : `<a class="sail-btn xs" href="https://www.google.com/search?q=${encodeURIComponent(p.agency_name + ' Instagram wedding')}" target="_blank" rel="noopener">Find IG ↗</a>`}
                    </div>
                  </td>
                  <td style="font-size:11.5px;color:var(--sail-body)">
                    ${esc((p.personalization_hook || 'Bespoke Lake Como & Milan guest logistics').slice(0, 95))}
                  </td>
                  <td>
                    <div class="row" style="gap:5px;flex-wrap:wrap">
                      <button class="sail-btn xs ${isBounced ? 'warn' : 'primary'}" data-act="rescue-lead" data-id="${attr(p.id)}" title="Add verified email and queue for sending">${isBounced ? 'Fix & Retry' : '+ Add Email'}</button>
                      <button class="sail-btn xs" data-act="copy-social-pitch" data-id="${attr(p.id)}" title="Copy personalized social pitch">Pitch</button>
                      <a class="sail-btn xs" href="#prospect/${attr(p.id)}" title="Open detail view">Open →</a>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const renderBusPanel = () => `
    <div class="sail-table-wrap">
      <table class="sail-table" style="table-layout:fixed;width:100%">
        <thead>
          <tr>
            <th style="width:22%">Bus Operator &amp; City</th>
            <th style="width:18%">Direct Contact</th>
            <th style="width:24%">Verified Fleet &amp; Capacity</th>
            <th style="width:22%">Latest Reply / Rate Summary</th>
            <th style="width:14%">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${busRepliedRows.map((b) => `
            <tr>
              <td>
                <div style="font-weight:600;color:var(--sail-ink);font-size:13px">${esc(b.name)}</div>
                <div style="font-size:11.5px;color:var(--sail-muted);margin-top:2px">${esc(b.base_city || 'Lombardy')}</div>
              </td>
              <td>
                <div style="font-size:12px;font-weight:600;color:var(--sail-ink)">${esc(b.contact_person || 'Dispatch')}</div>
                <div style="font-size:11.5px;color:var(--sail-body);margin-top:2px">${esc(b.phone || b.email || '')}</div>
              </td>
              <td>
                <span class="sail-pill info" style="font-size:10.5px;padding:1px 6px">${esc(b.pax_capacity || 'Minibus / Coach')}</span>
                <div style="font-size:11.5px;color:var(--sail-body);margin-top:3px">${esc(b.bus_models || '')}</div>
              </td>
              <td style="font-size:11.5px;color:var(--sail-body);line-height:1.35">
                ${esc(b.rate_standby || b.rate_hourly || b.notes || 'Replied')}
              </td>
              <td>
                <div class="row" style="gap:5px;flex-wrap:wrap">
                  <a class="sail-btn xs primary" href="#fleet_showcase">Rate Ledger →</a>
                  <a class="sail-btn xs" href="#bus_partners">Directory →</a>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  const renderResearchPanel = () => `
    <div style="padding:16px 18px">
      ${d.research.length ? `
        <div class="sail-table-wrap">
          <table class="sail-table" style="table-layout:fixed;width:100%">
            <thead>
              <tr>
                <th style="width:12%">Fit Score</th>
                <th style="width:28%">Agency</th>
                <th style="width:20%">Town &amp; Market</th>
                <th style="width:26%">Missing Info</th>
                <th style="width:14%">Action</th>
              </tr>
            </thead>
            <tbody>
              ${d.research.slice(0, 15).map((p) => {
                const sc = core.priorityScore(p).score;
                return `
                  <tr>
                    <td><span class="sail-pill ${sc >= 65 ? 'ok' : 'warn'}">${sc}/100</span></td>
                    <td style="font-weight:600;color:var(--sail-ink)">${esc(p.agency_name)}</td>
                    <td style="font-size:12px;color:var(--sail-body)">${esc(p.location || 'Lake Como')}</td>
                    <td style="font-size:12px;color:var(--sail-muted)">${esc(A.readinessProblems(p).join(' · ') || 'Ready to approve')}</td>
                    <td><a class="sail-btn xs primary" href="#prospect/${attr(p.id)}">Research →</a></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div style="padding:24px;text-align:center;color:var(--sail-muted)">All leads are researched! <a href="#add">Add prospects</a>.</div>`}
    </div>
  `;

  el.innerHTML = `
  <div class="sail-page">
    <!-- Stripe Header -->
    <div class="sail-header">
      <div>
        <div class="sail-breadcrumb">
          <span>OUTREACH COMMAND CENTER</span>
          <span style="color:#CBD5E1">/</span>
          <span>${esc(now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' }).toUpperCase())}</span>
          ${live ? `<span class="sail-pill ok" style="padding:1px 7px;font-size:10.5px;margin-left:4px" title="Auto-refreshes every 30s and via Supabase Realtime"><span class="sail-pill-dot"></span>Live${S.lastSyncAt ? ` · synced ${esc(ago(S.lastSyncAt))}` : ''}</span>` : ''}
        </div>
        <h1 class="sail-title">Today Command Center</h1>
        <div class="sail-subtitle">
          All-time wedding planner &amp; bus partner outreach telemetry, scheduled outbox, and inbound replies.
        </div>
      </div>

      <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
        ${live ? `<button class="sail-btn" data-act="sync-live" title="Pull latest live data from Supabase">↻ Sync Now</button>` : ''}
        ${dueUndrafted ? `<button class="sail-btn primary" data-act="gen">Draft ${plural(dueUndrafted, 'Due Step')}</button>` : ''}
        <a class="sail-btn" href="#fleet_showcase">Fleet &amp; Rate Ledger →</a>
        <a class="sail-btn" href="#bus_partners">Bus Partners (${busList.length}) →</a>
        <a class="sail-btn primary" href="#add">+ Add Prospects</a>
      </div>
    </div>

    <!-- Stripe 5-Column All-Time Telemetry Strip -->
    <div class="sail-stat-strip">
      <div class="sail-stat-cell clickable ${todayTab === 'scheduled' ? 'active-filter' : ''}" data-today-tab="scheduled" title="Click to inspect Scheduled Outbox">
        <div class="sail-stat-label">
          <span>Wedding Planners Contacted</span>
          <span class="sail-pill ok" style="padding:1px 6px;font-size:10.5px">All-Time</span>
        </div>
        <div class="sail-stat-val">${m.contacted} <span style="font-size:13px;font-weight:500;color:var(--sail-muted)">/ ${(S.prospects || []).length} leads</span></div>
        <div class="sail-stat-meta">${m.emailsSent} emails sent all-time${wpSentToday ? ` · ${wpSentToday} today` : ''}</div>
      </div>

      <div class="sail-stat-cell clickable ${todayTab === 'bus' ? 'active-filter' : ''}" data-today-tab="bus" title="Click to inspect Bus Fleet Replies">
        <div class="sail-stat-label">
          <span>Bus Operators Contacted</span>
          <span class="sail-pill lux" style="padding:1px 6px;font-size:10.5px">${busReplied} Replied</span>
        </div>
        <div class="sail-stat-val">${busContacted} <span style="font-size:13px;font-weight:500;color:var(--sail-muted)">/ ${busList.length} fleet</span></div>
        <div class="sail-stat-meta">${busTotalSent} emails sent all-time${busSentToday ? ` · ${busSentToday} today` : ''}</div>
      </div>

      <div class="sail-stat-cell clickable ${todayTab === 'queue' ? 'active-filter' : ''}" data-today-tab="queue" title="Click to view Replies & Approval Queue">
        <div class="sail-stat-label">
          <span>Positive Reply Rate</span>
          <span class="sail-pill info" style="padding:1px 6px;font-size:10.5px">${d.replies.length} Waiting</span>
        </div>
        <div class="sail-stat-val">${m.contacted > 0 ? pct(m.positiveRate.p, m.positiveRate.p !== null && m.positiveRate.p < 0.1 ? 1 : 0) : '0%'} <span style="font-size:13px;font-weight:500;color:var(--sail-muted)">· ${m.won} won</span></div>
        <div class="sail-stat-meta">${m.positive} of ${m.contacted} wedding + ${busReplied} bus replies</div>
      </div>

      <div class="sail-stat-cell clickable ${todayTab === 'scheduled' ? 'active-filter' : ''}" data-today-tab="scheduled" title="Click to inspect all ${d.scheduled.length} scheduled emails">
        <div class="sail-stat-label">
          <span>Scheduled Outbox</span>
          <span class="sail-pill info" style="padding:1px 6px;font-size:10.5px">Auto-Cron</span>
        </div>
        <div class="sail-stat-val">${d.scheduled.length} <span style="font-size:13px;font-weight:500;color:var(--sail-muted)">queued</span></div>
        <div class="sail-stat-meta">Window ${esc(S.settings.window_start)}–${esc(S.settings.window_end)} local</div>
      </div>

      <div class="sail-stat-cell clickable ${todayTab === 'manual' ? 'active-filter' : ''}" data-today-tab="manual" title="Click to view Manual IG / WhatsApp leads">
        <div class="sail-stat-label">
          <span>Bounced &amp; Manual IG/WA</span>
          <span class="sail-pill warn" style="padding:1px 6px;font-size:10.5px">${manualLeads.length} Manual</span>
        </div>
        <div class="sail-stat-val">${m.bounced} <span style="font-size:13px;font-weight:500;color:var(--sail-muted)">(${pct(m.bounceRate.p || (m.emailsSent > 0 ? m.bounced / m.emailsSent : 0), 1)})</span></div>
        <div class="sail-stat-meta">${m.bounced} bounced of ${m.emailsSent} sent · ${manualLeads.length} social</div>
      </div>
    </div>

    <!-- Traction Verdict & Analytics Strip -->
    <div class="sail-card" style="padding:11px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div class="row" style="gap:10px;align-items:center">
        <span class="sail-pill info" style="font-size:11px">Campaign Verdict</span>
        <span style="font-size:13px;font-weight:600;color:var(--sail-ink)">${esc(v.headline)}</span>
        <span style="font-size:12.5px;color:var(--sail-muted)">${esc(v.detail)}</span>
      </div>
      <div class="row" style="gap:8px">
        <a class="sail-btn xs" href="#pipeline">Open Partner Pipeline (${(S.prospects || []).length}) →</a>
        <a class="sail-btn xs" href="#analytics">Full Analytics →</a>
      </div>
    </div>

    <!-- Main Tabbed Workspace Card -->
    <div class="sail-card">
      <div class="sail-card-head" style="padding-bottom:0;border-bottom:1px solid var(--sail-line)">
        <div class="sail-tabs" role="tablist">
          <button class="sail-tab ${todayTab === 'queue' ? 'active' : ''}" data-today-tab="queue">
            Approval &amp; Replies <span class="sail-tab-count">${drafts.length + d.replies.length}</span>
          </button>
          <button class="sail-tab ${todayTab === 'scheduled' ? 'active' : ''}" data-today-tab="scheduled">
            Scheduled Outbox <span class="sail-tab-count">${d.scheduled.length}</span>
          </button>
          <button class="sail-tab ${todayTab === 'manual' ? 'active' : ''}" data-today-tab="manual">
            Manual IG / WhatsApp <span class="sail-tab-count">${manualLeads.length}</span>
          </button>
          <button class="sail-tab ${todayTab === 'bus' ? 'active' : ''}" data-today-tab="bus">
            Bus Partner Replies <span class="sail-tab-count">${busRepliedRows.length}</span>
          </button>
          <button class="sail-tab ${todayTab === 'research' ? 'active' : ''}" data-today-tab="research">
            Research Queue <span class="sail-tab-count">${d.research.length}</span>
          </button>
        </div>
      </div>

      ${todayTab === 'scheduled'
        ? renderScheduledPanel()
        : todayTab === 'manual'
          ? renderManualPanel()
          : todayTab === 'bus'
            ? renderBusPanel()
            : todayTab === 'research'
              ? renderResearchPanel()
              : renderQueuePanel()}
    </div>
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
        case 'sync-live': {
          await refreshLive(false);
          paint();
          toast('Synced with live database');
          break;
        }
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
        case 'refresh-all': {
          if (btn) btn.disabled = true;
          toast('Refreshing drafts with updated 2027 season templates…');
          try {
            const res = await api('refresh_touches');
            toast(`Refreshed ${res.updated || 0} drafts`);
          } catch {
            let count = 0;
            for (const d of A.todayData().drafts) {
              const p = A.prospectById(d.prospect_id);
              if (!p) continue;
              const t1 = A.touchesOf(p.id).find((x) => x.step_name === 'T1_intro' && x.subject && x.id !== d.id);
              const stepCfg = (S.settings.steps || core.DEFAULT_STEPS).find((s) => s.key === d.step_name);
              const dr = core.buildDraft({ prospect: p, key: d.step_name, templates: S.templates, threadSubject: t1?.subject || d.subject || '', step: stepCfg, extraVars: d.variant ? { variant: d.variant } : {} });
              if (dr) { await A.saveDraft(d, { subject: dr.subject || d.subject, body: dr.body, variant: dr.variant || d.variant }); count++; }
            }
            toast(`Refreshed ${count} drafts`);
          }
          paint();
          break;
        }
        case 'edit': editing = id; paint(); el.querySelector('#ed-body')?.focus(); return;
        case 'cancel': editing = null; paint(); return;
        case 'save': {
          const rawBody = el.querySelector('#ed-body').value;
          const body = core.stripSignOff ? core.stripSignOff(rawBody) : rawBody;
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
          const dr = core.buildDraft({ prospect: p, key: t.template_key || t.step_name, templates: S.templates, threadSubject: ['T1_intro', 'T4_breakup'].includes(t.step_name) ? '' : (t1?.subject || t.subject), step: stepCfg, extraVars: t.variant ? { variant: t.variant } : {} });
          if (dr) await A.saveDraft(t, { subject: dr.subject || t.subject, body: dr.body, variant: dr.variant || t.variant, ai_generated: false });
          toast('Rebuilt from the template');
          break;
        }
        case 'toggle-variant': {
          const p = A.prospectById(t.prospect_id);
          const nextVar = t.variant === 'B' ? 'A' : 'B';
          const newHook = core.buildVerifiedFallbackHook(p, null, nextVar);
          await A.saveProspect(p.id, { personalization_hook: newHook });
          const stepCfg = (S.settings.steps || core.DEFAULT_STEPS).find((s) => s.key === t.step_name);
          const dr = core.buildDraft({ prospect: { ...p, personalization_hook: newHook }, key: t.template_key || t.step_name, templates: S.templates, step: stepCfg, extraVars: { variant: nextVar, hook: newHook } });
          if (dr) await A.saveDraft(t, { subject: dr.subject, body: dr.body, variant: nextVar, ai_generated: false });
          paint();
          toast(`Switched to Variant ${nextVar} (${nextVar === 'B' ? 'Late returns scenario' : 'Introduction'})`);
          break;
        }
        case 'ai': toast('Rewriting…'); await api('ai_redraft', { touch_id: id }); toast('AI rewrite ready, check it before approving'); break;
        case 'copy': await copyText(cleanDuplicateDraftGreetings(t.body || '')); break;
        case 'mark-sent': await A.markSent(t); toast('Marked as sent'); break;
        case 'send-now': await A.sendNow(t); break;
        case 'unapprove': await A.unapprove(t); break;
        case 'retry-failed': await A.retryFailed(t); toast('Touch re-approved'); paint(); break;
        case 'retry-all-failed': {
          const failed = d.failed;
          for (const item of failed) await A.retryFailed(item);
          toast(`${plural(failed.length, 'failed send')} re-approved`);
          paint();
          break;
        }
        case 'unapprove-all-failed': {
          const failed = d.failed;
          for (const item of failed) await A.unapprove(item);
          toast(`${plural(failed.length, 'failed send')} moved back to drafts`);
          paint();
          break;
        }
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
        case 'copy-social-pitch': {
          const p = A.prospectById(id);
          if (p) {
            const channel = p.whatsapp || p.phone ? 'whatsapp' : 'instagram';
            const msg = core.buildSocialOpener(p, channel);
            await copyText(msg);
            toast(`Copied ${channel === 'whatsapp' ? 'WhatsApp' : 'Instagram'} pitch for ${p.agency_name}`);
          }
          break;
        }
        case 'rescue-lead': {
          const p = A.prospectById(id);
          if (p) {
            openRescueLeadModal(p, (res) => {
              paint();
              const msg = res.scheduledAt
                ? `Saved email! ${p.agency_name} scheduled in Outbox for ${fmtDateTime(res.scheduledAt)}`
                : `Saved email! ${p.agency_name} returned to the active queue`;
              toast(msg);
            });
          }
          break;
        }
      }
    } catch (e) {
      toast(e.message, 'error');
    } finally { if (btn && btn.isConnected) btn.disabled = false; }
  }

  el.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('[data-today-tab]');
    if (tabBtn) {
      e.preventDefault();
      todayTab = tabBtn.dataset.todayTab || 'queue';
      paint();
      return;
    }
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

export function openRescueLeadModal(p, onSaved) {
  const mkt = p.market || core.inferMarket(p);
  const webUrl = cleanWebUrl(p.website);
  const webDomain = displayDomain(p.website);
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(p.agency_name + ' wedding planner Lake Como contact')}`;
  const isBounced = p.email_status === 'bounced' || p.bounced;
  const prevEmail = p.bounced_email || p.email || '';

  return dialog({
    title: isBounced ? `Fix Bounced Email · ${p.agency_name}` : `Add Contact Email · ${p.agency_name}`,
    body: `
      <form id="rescue-form" style="display:flex;flex-direction:column;gap:14px">
        <div style="background:var(--sail-card-subtle, #f8fafc);border:1px solid var(--sail-border, #e2e8f0);border-radius:8px;padding:12px;font-size:12.5px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-weight:600;color:var(--sail-ink, #0f172a);font-size:13.5px">${esc(p.agency_name)}</span>
            <span class="sail-pill std" style="font-size:10px">${core.marketFlag(mkt)} ${esc(mkt.toUpperCase())}</span>
          </div>
          <div style="color:var(--sail-muted, #64748b);font-size:12px;display:flex;gap:12px;flex-wrap:wrap">
            ${webUrl
              ? `<a href="${attr(webUrl)}" target="_blank" rel="noopener" style="color:var(--sail-primary, #635bff);text-decoration:none;font-weight:500;display:inline-flex;align-items:center;gap:3px">🌐 ${esc(webDomain || p.website)} ↗</a>`
              : `<a href="${attr(searchUrl)}" target="_blank" rel="noopener" style="color:var(--sail-muted, #64748b);text-decoration:none;display:inline-flex;align-items:center;gap:3px">🔍 Search Contact Page ↗</a>`}
            ${p.contact_name ? `<span>👤 ${esc(p.contact_name)}</span>` : ''}
            ${p.location ? `<span>📍 ${esc(p.location)}</span>` : ''}
          </div>
          ${isBounced && prevEmail ? `
            <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--sail-border, #e2e8f0);color:var(--sail-missing-fg, #e11d48);font-size:11.5px">
              ⚠️ Previous bounced address: <code>${esc(prevEmail)}</code>
            </div>
          ` : ''}
        </div>

        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-weight:600;font-size:13px;color:var(--sail-ink, #0f172a)">New Contact Email Address</span>
          <input
            id="rescue-email-field"
            type="email"
            class="input"
            required
            placeholder="e.g. info@${webDomain || 'agency.com'}"
            value="${isBounced ? '' : (p.email || '')}"
            style="width:100%;font-size:14px;padding:8px 12px;border:1px solid var(--sail-border, #cbd5e1);border-radius:6px;background:var(--sail-input-bg, #fff);color:var(--sail-ink, #0f172a)"
            autocomplete="email"
          />
        </label>

        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;user-select:none;background:var(--surface, #fff);border:1px solid var(--sail-border, #e2e8f0);padding:10px 12px;border-radius:6px">
          <input type="checkbox" id="rescue-requeue-check" checked style="margin-top:3px" />
          <div style="display:flex;flex-direction:column;gap:2px">
            <span style="font-weight:600;font-size:13px;color:var(--sail-ink, #0f172a)">Put lead back in queue to be contacted</span>
            <span style="font-size:11.5px;color:var(--sail-muted, #64748b)">
              Auto-approve Step 1 (Intro) into Scheduled Outbox. It will send in the next active local window within your daily cap.
            </span>
          </div>
        </label>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px">
          <button type="button" class="sail-btn" data-close>Cancel</button>
          <button type="submit" class="sail-btn primary" id="rescue-submit-btn">
            Save &amp; Queue Outreach →
          </button>
        </div>
      </form>
    `,
    onMount: (box, close) => {
      const form = box.querySelector('#rescue-form');
      const input = box.querySelector('#rescue-email-field');
      const check = box.querySelector('#rescue-requeue-check');
      const submitBtn = box.querySelector('#rescue-submit-btn');

      setTimeout(() => input?.focus(), 60);

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const entered = (input.value || '').trim();
        if (!entered || !core.isValidEmailSyntax(entered)) {
          toast('Please enter a valid email address', 'error');
          input.focus();
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving & Queuing…';

        try {
          const autoQueue = check ? check.checked : true;
          const res = await A.rescueManualLead(p, entered, { autoApprove: autoQueue });
          close(res);
          if (onSaved) onSaved(res);
        } catch (err) {
          toast(err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save & Queue Outreach →';
        }
      });
    },
  });
}
