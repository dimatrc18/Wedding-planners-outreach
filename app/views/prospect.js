// Prospect detail: research, hook, fields, timeline, opportunities, one-click actions.
import * as core from '../../supabase/functions/_shared/core/index.js';
import { S, update, insert, api, isDemo, log } from '../store.js';
import { esc, attr, icon, ago, fmtDate, fmtDateTime, eur, toast, dialog, confirmDialog, download, copyText } from '../ui.js';
import * as A from '../actions.js';
import { stepLabel, sentimentChip } from './today.js';

const FIELDS = [
  ['agency_name', 'Agency / business', 'text'], ['contact_name', 'Contact name', 'text'], ['role', 'Role', 'text'],
  ['email', 'Email', 'email'], ['phone', 'Phone', 'text'], ['whatsapp', 'WhatsApp', 'text'],
  ['website', 'Website', 'url'], ['linkedin', 'LinkedIn', 'url'],
  ['location', 'Location', 'text'], ['type', 'Type', 'select', ['planner', 'venue', 'photographer', 'concierge_hotel']],
  ['segment', 'Segment', 'select', ['', 'boutique_local', 'high_volume_uk_us', 'international']],
  ['language', 'Language', 'select', ['en', 'it', 'de', 'fr']], ['timezone', 'Time zone', 'text'],
  ['source', 'Source', 'select', ['manual', 'matrimonio.com', 'wedding_wire', 'referral', 'website']],
  ['source_detail', 'Source detail', 'text'],
  ['rating', 'Rating', 'number'], ['verified_reviews_count', 'Verified reviews', 'number'], ['review_source', 'Review source', 'text'],
  ['avg_weddings_per_year_estimate', 'Weddings / year (est.)', 'number'], ['typical_guest_count', 'Typical guests', 'number'],
  ['key_venues', 'Key venues (comma separated)', 'list'], ['tags', 'Tags (comma separated)', 'list'], ['owner', 'Owner', 'text'],
];

function fieldInput([k, label, type, opts], p) {
  const v = p[k];
  if (type === 'select') return `<label class="field"><span>${label}</span><select data-f="${k}">${opts.map((o) => `<option value="${o}" ${String(v ?? '') === o ? 'selected' : ''}>${o || '–'}</option>`).join('')}</select></label>`;
  const val = type === 'list' ? (v || []).join(', ') : v ?? '';
  return `<label class="field"><span>${label}</span><input data-f="${k}" type="${type === 'list' ? 'text' : type}" value="${attr(val)}" ${type === 'number' ? 'step="any"' : ''}></label>`;
}

function readFields(root) {
  const out = {};
  root.querySelectorAll('[data-f]').forEach((i) => {
    const k = i.dataset.f; const def = FIELDS.find((f) => f[0] === k) || [k, '', i.type];
    let v = i.type === 'checkbox' ? i.checked : i.value.trim();
    if (def[2] === 'number') v = v === '' ? null : Number(v);
    else if (def[2] === 'list') v = v ? v.split(',').map((x) => x.trim()).filter(Boolean) : [];
    else if (i.type === 'datetime-local' || i.type === 'date') v = v ? new Date(v).toISOString() : null;
    else if (v === '' && k !== 'agency_name') v = null;
    if (k === 'email' && v) v = v.toLowerCase();
    out[k] = v;
  });
  return out;
}

const toLocalInput = (d) => (d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

function touchHtml(t) {
  const pending = ['draft', 'approved'].includes(t.state);
  const stateChip = { draft: '<span class="chip warn">Draft</span>', approved: `<span class="chip gold">Scheduled${t.scheduled_at ? ` ${esc(fmtDateTime(t.scheduled_at))}` : ''}</span>`, skipped: '<span class="chip">Skipped</span>', failed: '<span class="chip bad">Failed</span>', sent: '', received: '' }[t.state] || '';
  const when = t.sent_at || t.replied_at || t.created_at;
  const long = (t.body || '').length > 500;
  return `<div class="tl ${t.direction} ${pending ? 'pending' : ''}">
    <div class="head">${icon(t.channel === 'call' ? 'phone' : 'mail', 14)}<b>${t.direction === 'in' ? 'Reply' : esc(stepLabel(t.step_name))}</b>
      <span>${esc(t.channel.replace('_', ' '))}</span>${stateChip}${t.bounced ? '<span class="chip bad">Bounced</span>' : ''}${t.opened_at ? '<span class="chip">Opened</span>' : ''}
      ${t.variant && t.step_name === 'T1_intro' ? `<span class="chip outline">Subject ${esc(t.variant)}</span>` : ''}${sentimentChip(t)}
      <span class="grow"></span><span class="faint" title="${attr(fmtDateTime(when))}">${esc(ago(when))}</span></div>
    ${t.subject ? `<div class="small"><b>${esc(t.subject)}</b></div>` : ''}
    ${long ? `<details><summary>${esc(core.stripQuoted(t.body).slice(0, 160))}…</summary><div class="text">${esc(t.body)}</div></details>` : `<div class="text">${esc(t.body || '')}</div>`}
    ${t.classification?.ai_summary ? `<div class="small muted">AI: ${esc(t.classification.ai_summary)}</div>` : ''}
    ${t.error && t.state !== 'sent' ? `<div class="small faint">${esc(t.error)}</div>` : ''}
    ${pending ? `<div class="actions">${t.state === 'draft' ? `<a class="btn sm primary" href="#today">Review in Today</a>` : ''}<button class="btn sm ghost" data-act="skip-touch" data-id="${attr(t.id)}">Skip</button></div>` : ''}
  </div>`;
}

export function render(el, id) {
  let researchResult = null;
  function paint() {
    const p = A.prospectById(id);
    if (!p) { el.innerHTML = `<div class="empty">This prospect no longer exists. <a href="#pipeline">Back to the pipeline</a></div>`; return; }
    const touches = A.touchesOf(p.id).slice().sort((a, b) => new Date(a.sent_at || a.replied_at || a.created_at) - new Date(b.sent_at || b.replied_at || b.created_at));
    const opps = A.oppsOf(p.id);
    const sc = core.priorityScore(p);
    const st = core.sequenceState(p, touches, S.settings);
    const probs = A.readinessProblems(p);
    const events = S.events.filter((e) => e.prospect_id === p.id).slice(0, 12);
    el.innerHTML = `
    <div class="page-head">
      <div class="stack" style="gap:6px"><a class="small" href="#pipeline">← Pipeline</a><h1>${esc(p.agency_name)}</h1>
        <div class="row">${p.contact_name ? `<span class="muted">${esc(p.contact_name)}${p.role ? `, ${esc(p.role)}` : ''}</span>` : ''}
          <span class="score ${sc.score >= 65 ? 'hi' : 'low'}" title="${attr(sc.parts.map((x) => `${x.pts > 0 ? '+' : ''}${x.pts} ${x.why}`).join('\n'))}">Fit ${sc.score}/100</span>
          <span class="chip">${esc(p.type)}</span>${p.segment ? `<span class="chip">${esc(p.segment.replace(/_/g, ' '))}</span>` : ''}<span class="chip">${esc(p.language.toUpperCase())}</span>
          ${p.do_not_contact ? '<span class="chip bad">Do not contact</span>' : ''}${p.email_status && p.email_status !== 'unknown' ? `<span class="chip ${p.email_status === 'mx_ok' ? 'ok' : ['no_mx', 'bounced', 'invalid'].includes(p.email_status) ? 'bad' : ''}">email ${esc(p.email_status.replace('_', ' '))}</span>` : ''}</div>
      </div>
      <label class="field" style="min-width:210px"><span>Stage</span><select id="status">${core.STAGES.map((s) => `<option value="${s.key}" ${p.status === s.key ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select></label>
    </div>

    <div class="actions" style="margin-bottom:18px">
      <button class="btn primary" data-act="next">${icon('sparkle', 16)} Draft next step</button>
      <button class="btn" data-act="ratecard">${icon('send', 16)} Send rate card</button>
      <button class="btn" data-act="log-reply">${icon('reply', 16)} Log a reply</button>
      <button class="btn" data-act="log-touch">${icon('phone', 16)} Log call / meeting</button>
      <button class="btn ghost" data-act="snooze">${icon('clock', 16)} Snooze</button>
      <button class="btn ghost" data-act="lost">Mark lost</button>
      ${p.do_not_contact ? '' : '<button class="btn ghost" data-act="dnc">Do not contact</button>'}
      <span class="grow"></span>
      <button class="btn ghost sm" data-act="export">${icon('download', 15)} Export</button>
      <button class="btn ghost sm" data-act="erase">${icon('trash', 15)} Erase</button>
    </div>

    ${p.status === 'researching' ? `<div class="banner ${probs.length ? 'warn' : ''}">${probs.length ? `<span><b>Before contacting:</b> ${esc(probs.join(' · '))}</span>` : '<span><b>Research complete.</b> Move to Ready and the intro email will be drafted for approval.</span>'}<span class="grow"></span><button class="btn sm ${probs.length ? '' : 'primary'}" data-act="make-ready">Mark Ready</button></div>` : ''}
    ${st.active && st.step ? `<div class="banner"><span>Next in the cadence: <b>${esc(st.step.label)}</b> ${st.pending ? `(${st.pending.state === 'draft' ? 'drafted, awaiting approval' : 'approved'})` : st.dueAt ? `due ${esc(fmtDate(st.dueAt, { weekday: 'short' }))}` : ''}${st.blocked === 'no_email' ? ' · needs an email address' : ''}</span></div>` : ''}
    ${!st.active && st.reason === 'replied' ? '<div class="banner"><span>Planner replied: the automatic cadence is stopped for good.</span></div>' : ''}

    <div class="split">
      <div class="stack lg">
        <section class="card stack">
          <div class="section-head"><h2>Research</h2><span class="hint">Public pages only · Leave URL blank to auto-search by agency name.</span></div>
          <div class="row nowrap"><input type="url" id="research-url" placeholder="Paste website URL (or leave blank to auto-find)" value="${attr(p.website || '')}" aria-label="Website URL"><button class="btn primary" data-act="research">${icon('search', 16)} 🤖 Research</button></div>
          <div id="research-out">${researchResult ? researchHtml(researchResult, p) : ''}</div>
          <div class="row">${p.website ? `<a class="small" href="${attr(p.website)}" target="_blank" rel="noopener">${icon('external', 14)} Website</a>` : ''}
            ${p.email ? `<button class="btn ghost sm" data-act="verify">Check email (MX)</button>` : ''}</div>
        </section>

        <section class="card stack">
          <div class="section-head"><h2>Personalization hook</h2>${p.hook_confidence ? `<span class="chip ${p.hook_confidence === 'high' ? 'ok' : p.hook_confidence === 'low' ? 'warn' : ''}">${esc(p.hook_confidence)} confidence</span>` : ''}</div>
          <textarea id="hook" rows="3" placeholder="One specific, true sentence: a villa they worked at, a recent wedding, a style choice.">${esc(p.personalization_hook || '')}</textarea>
          <div class="fields">
            <label class="field"><span>Hook type</span><select id="hook_type">${['', 'venue', 'event', 'style', 'press', 'award', 'other'].map((o) => `<option value="${o}" ${(p.hook_type || '') === o ? 'selected' : ''}>${o || '–'}</option>`).join('')}</select></label>
            <label class="field"><span>Source URL</span><input type="url" id="hook_source_url" value="${attr(p.hook_source_url || '')}"></label>
          </div>
          <label class="check small"><input type="checkbox" id="hook_needs_review" ${p.hook_needs_review ? 'checked' : ''}> Needs review before use</label>
          <div class="lint" id="hook-lint"></div>
          <div class="row end"><button class="btn primary sm" data-act="save-hook">Save hook</button></div>
        </section>

        <section class="card stack">
          <div class="section-head"><h2>Details</h2><span class="hint">Created ${esc(fmtDate(p.created_at, { year: 'numeric' }))} · source ${esc(p.source)}</span></div>
          <div class="fields" id="details">${FIELDS.map((f) => fieldInput(f, p)).join('')}</div>
          <label class="field"><span>Notes</span><textarea data-f="notes" rows="3">${esc(p.notes || '')}</textarea></label>
          <div class="row end"><button class="btn primary sm" data-act="save-details">Save details</button></div>
        </section>

        <section class="card stack">
          <div class="section-head"><h2>Partnership & dates</h2></div>
          <div class="fields" id="dates">
            <label class="field"><span>Partner model</span><select data-f="partner_model"><option value="">–</option><option value="referral_12" ${p.partner_model === 'referral_12' ? 'selected' : ''}>A · 12% referral</option><option value="net_whitelabel" ${p.partner_model === 'net_whitelabel' ? 'selected' : ''}>B · Net / white-label</option></select></label>
            <label class="field"><span>FAM transfer</span><select data-f="fam_status"><option value="">–</option>${['offered', 'accepted', 'completed', 'declined'].map((o) => `<option ${p.fam_status === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
            <label class="field"><span>FAM date</span><input type="datetime-local" data-f="fam_at" value="${toLocalInput(p.fam_at)}"></label>
            <label class="field"><span>Nurture until</span><input type="datetime-local" data-f="nurture_until" value="${toLocalInput(p.nurture_until)}"></label>
            <label class="field"><span>Snoozed until</span><input type="datetime-local" data-f="snoozed_until" value="${toLocalInput(p.snoozed_until)}"></label>
            <label class="field"><span>Re-engage on</span><input type="datetime-local" data-f="reengage_at" value="${toLocalInput(p.reengage_at)}"></label>
            <label class="field"><span>WhatsApp opt-in</span><select data-f="whatsapp_opt_in"><option value="false">No</option><option value="true" ${p.whatsapp_opt_in ? 'selected' : ''}>Yes, they agreed</option></select></label>
            ${p.status === 'lost' ? `<label class="field"><span>Lost reason</span><select data-f="lost_reason">${core.LOST_REASONS.map((r) => `<option ${p.lost_reason === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>` : ''}
          </div>
          <div class="row end"><button class="btn primary sm" data-act="save-dates">Save</button></div>
        </section>
      </div>

      <div class="stack lg">
        <section class="section"><div class="section-head"><h2>Timeline <span class="count">${touches.length}</span></h2></div>
          <div class="timeline">${touches.length ? touches.map(touchHtml).join('') : '<div class="empty">No touches yet.</div>'}</div></section>

        <section class="section"><div class="section-head"><h2>Opportunities <span class="count">${opps.length}</span></h2><button class="btn sm" data-act="opp-new">${icon('plus', 15)} Add</button></div>
          ${opps.length ? `<div class="card flush list">${opps.map((o) => `<button class="list-item clickable" style="border:0;border-top:1px solid var(--line);background:none;width:100%;text-align:left" data-opp="${attr(o.id)}">
            <div class="t"><b>${esc(o.title || 'Wedding')}</b><span class="small muted">${[o.wedding_date && fmtDate(o.wedding_date, { year: 'numeric' }), o.venue, o.guest_count && `${o.guest_count} guests`, o.model === 'referral_12' ? '12% referral' : o.model === 'net_whitelabel' ? 'net' : ''].filter(Boolean).map(esc).join(' · ')}</span></div>
            <span class="chip ${o.stage === 'won' ? 'ok' : o.stage === 'lost' ? 'bad' : 'gold'}">${esc(o.stage)}</span><span class="num">${eur(o.actual_revenue ?? o.estimated_value)}</span></button>`).join('')}</div>` : '<div class="empty small">Created automatically when a planner asks for prices or a call.</div>'}
        </section>

        ${events.length ? `<section class="section"><div class="section-head"><h2>Activity</h2></div><div class="card flush list">${events.map((e) => `<div class="list-item small"><span class="faint num" style="min-width:86px">${esc(fmtDate(e.at))}</span><span class="t">${esc(e.action.replace(/_/g, ' '))}${e.detail?.summary ? `: ${esc(e.detail.summary)}` : e.detail?.to ? ` → ${esc(core.stageLabel(e.detail.to))}` : ''}</span><span class="faint">${esc((e.actor || '').split('@')[0])}</span></div>`).join('')}</div></section>` : ''}
      </div>
    </div>`;
    lintHook();
  }

  function lintHook() {
    const box = el.querySelector('#hook-lint'); const h = el.querySelector('#hook');
    if (!box || !h) return;
    const r = core.lintMessage({ body: h.value, channel: 'note' });
    const words = core.wordCount(h.value);
    const msgs = [...r.errors.map((e) => `<span class="e">${esc(e)}</span>`), ...r.warnings.map((w) => `<span class="w">${esc(w)}</span>`)];
    if (words > 30) msgs.push(`<span class="w">${words} words; a hook reads best under 25</span>`);
    box.innerHTML = msgs.join('');
  }

  paint();
  el.addEventListener('input', (e) => { if (e.target.id === 'hook') lintHook(); });
  el.addEventListener('change', async (e) => {
    if (e.target.id !== 'status') return;
    const p = A.prospectById(id); const to = e.target.value;
    try {
      if (to === 'lost') return void (await markLost(p));
      if (to === 'ready') { const probs = A.readinessProblems(p); if (probs.length && !await confirmDialog('Mark Ready anyway?', `Missing: ${probs.join(', ')}. The intro email will be blocked until these are fixed.`, 'Mark Ready')) return paint(); }
      await A.setStatus(p, to); toast(`Moved to ${core.stageLabel(to)}`);
    } catch (err) { toast(err.message, 'error'); paint(); }
  });

  async function markLost(p) {
    const reason = await dialog({
      title: 'Mark as lost', body: `<label class="field"><span>Reason</span><select id="lr">${core.LOST_REASONS.map((r) => `<option>${r}</option>`).join('')}</select></label><div class="row end"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-ok>Mark lost</button></div>`,
      onMount: (b, close) => b.querySelector('[data-ok]').addEventListener('click', () => close(b.querySelector('#lr').value)),
    });
    if (!reason) return paint();
    await A.setStatus(p, 'lost', { lost_reason: reason }); toast('Marked lost');
  }

  el.addEventListener('click', async (e) => {
    const oppBtn = e.target.closest('[data-opp]');
    if (oppBtn) return oppDialog(A.prospectById(id), S.opps.find((o) => o.id === oppBtn.dataset.opp));
    const b = e.target.closest('[data-act]'); if (!b) return;
    const p = A.prospectById(id);
    const a = b.dataset.act;
    try {
      if (a === 'next') await A.draftNextStep(p);
      else if (a === 'ratecard') {
        const key = 'rate_card_delivery';
        const last = [...A.touchesOf(p.id)].reverse().find((t) => t.direction === 'in');
        await A.draftReply(p, key, last || null); toast('Rate card email drafted. Approve it in Today.');
        if (!S.settings.rate_card_path) toast('Upload the rate card PDF in Settings before sending', 'error');
      }
      else if (a === 'log-reply') await logReplyDialog(p);
      else if (a === 'log-touch') await logTouchDialog(p);
      else if (a === 'snooze') {
        const days = await dialog({ title: 'Snooze', body: `<div class="row">${[3, 7, 14, 30, 90].map((d) => `<button class="btn" data-d="${d}">${d} days</button>`).join('')}</div>`, onMount: (bx, close) => bx.addEventListener('click', (ev) => { const x = ev.target.closest('[data-d]'); if (x) close(+x.dataset.d); }) });
        if (days) { await update('prospects', p.id, { snoozed_until: new Date(Date.now() + days * 86400000).toISOString() }); toast(`Snoozed ${days} days`); }
      }
      else if (a === 'lost') await markLost(p);
      else if (a === 'dnc') { if (await confirmDialog('Do not contact?', 'No message will ever be drafted or sent to this prospect again. Pending drafts are cancelled.', 'Do not contact', true)) { await A.setStatus(p, 'do_not_contact', { unsubscribed_at: new Date().toISOString() }); toast('Marked Do Not Contact'); } }
      else if (a === 'make-ready') { const probs = A.readinessProblems(p); if (probs.length && !await confirmDialog('Mark Ready anyway?', `Missing: ${probs.join(', ')}.`, 'Mark Ready')) return; await A.setStatus(p, 'ready'); toast('Ready. Draft the intro from Today.'); }
      else if (a === 'export') download(`${p.agency_name.replace(/\W+/g, '_')}.json`, JSON.stringify({ prospect: p, touches: A.touchesOf(p.id), opportunities: A.oppsOf(p.id), events: S.events.filter((x) => x.prospect_id === p.id) }, null, 2), 'application/json');
      else if (a === 'erase') { if (await confirmDialog('Erase this prospect?', 'Deletes the prospect with every touch, reply and opportunity (GDPR erasure). This cannot be undone.', 'Erase everything', true)) { await A.eraseProspect(p); toast('Erased'); location.hash = 'pipeline'; } }
      else if (a === 'verify') { b.disabled = true; const s = await A.verifyEmail(p.email); await update('prospects', p.id, { email_status: s }); toast(`Email check: ${s.replace('_', ' ')}`); }
      else if (a === 'save-hook') {
        const hook = el.querySelector('#hook').value.trim();
        await update('prospects', p.id, { personalization_hook: hook || null, hook_type: el.querySelector('#hook_type').value || null, hook_source_url: el.querySelector('#hook_source_url').value || null, hook_needs_review: el.querySelector('#hook_needs_review').checked, hook_confidence: p.hook_confidence || (hook ? 'high' : null) });
        // keep pending drafts in sync with the new hook
        for (const t of A.touchesOf(p.id).filter((t) => t.state === 'draft' && t.step_name === 'T1_intro')) {
          const d = core.buildDraft({ prospect: A.prospectById(p.id), key: 'T1_intro', templates: S.templates });
          await A.saveDraft(t, { body: d.body });
        }
        toast('Hook saved');
      }
      else if (a === 'save-details') {
        const patch = readFields(el.querySelector('#details').parentElement);
        if (!patch.agency_name) return toast('Agency name is required', 'error');
        const dup = core.findDuplicates({ ...p, ...patch }, S.prospects);
        if (dup.length) toast(`Looks like a duplicate of ${dup[0].agency_name}`, 'error');
        if (patch.email && patch.email !== p.email) patch.email_status = await A.verifyEmail(patch.email);
        patch.priority_score = core.priorityScore({ ...p, ...patch }).score;
        await update('prospects', p.id, patch); toast('Saved');
      }
      else if (a === 'save-dates') {
        const patch = readFields(el.querySelector('#dates'));
        patch.whatsapp_opt_in = patch.whatsapp_opt_in === 'true' || patch.whatsapp_opt_in === true;
        await update('prospects', p.id, patch); toast('Saved');
      }
      else if (a === 'research') await research(p);
      else if (a === 'apply') await applyResearch(p);
      else if (a === 'skip-touch') await A.skip(S.touches.find((t) => t.id === b.dataset.id));
      else if (a === 'opp-new') await oppDialog(p, null);
    } catch (err) { toast(err.message, 'error'); } finally { if (b.isConnected) b.disabled = false; }
  });

  async function research(p) {
    const seed = core.resolveProspectResearchSeed(p);
    const inputEl = el.querySelector('#research-url');
    const url = inputEl.value.trim() || seed.website || seed.guessedUrl || '';
    if (url && !inputEl.value.trim()) inputEl.value = url;
    const out = el.querySelector('#research-out');
    out.innerHTML = '<p class="small muted">Reading the public website…</p>';
    try {
      let r = null;
      if (url) {
        try {
          r = await api('enrich', { url, prospect_id: p.id, agency_name: p.agency_name, location: p.location || seed.location || '' });
        } catch { /* fallback to seed */ }
      }
      const mergedSuggestions = { ...seed, ...(r?.suggestions || {}) };
      delete mergedSuggestions.guessedUrl;
      if (!mergedSuggestions.personalization_hook) {
        const fbHook = core.buildVerifiedFallbackHook({ ...p, ...mergedSuggestions });
        if (fbHook) {
          mergedSuggestions.personalization_hook = fbHook;
          mergedSuggestions.hook_type = mergedSuggestions.key_venues?.length ? 'venue' : 'aesthetic';
          mergedSuggestions.hook_confidence = 'high';
        }
      }
      researchResult = {
        ...(r || {}),
        suggestions: mergedSuggestions,
        sources: r?.sources || (mergedSuggestions.website ? [mergedSuggestions.website] : []),
      };
      out.innerHTML = researchHtml(researchResult, p);
    } catch (e) { out.innerHTML = `<p class="small" style="color:var(--bad)">${esc(e.message)}</p>`; }
  }

  async function applyResearch(p) {
    const s = researchResult?.suggestions || {};
    const patch = {};
    el.querySelectorAll('[data-apply]:checked').forEach((c) => { patch[c.dataset.apply] = s[c.dataset.apply]; });
    if (!Object.keys(patch).length) return toast('Tick what to apply');
    if (patch.personalization_hook) Object.assign(patch, { hook_type: s.hook_type || null, hook_confidence: s.hook_confidence || null, hook_needs_review: !!s.hook_needs_review, hook_source_url: s.hook_source_url || null });
    if (patch.email) patch.email_status = s.email_status || 'unknown';
    patch.enrichment = { ...(p.enrichment || {}), last: { at: new Date().toISOString(), sources: researchResult.sources, evidence: researchResult.evidence } };
    await update('prospects', p.id, patch);
    log('enriched', { fields: Object.keys(patch) }, p.id);
    researchResult = null; toast('Applied');
  }

  return () => {};
}

function researchHtml(r, p) {
  const s = r.suggestions || {};
  const rows = Object.entries(s).filter(([k, v]) => v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && !v.length) && !['hook_type', 'hook_confidence', 'hook_needs_review', 'hook_source_url', 'email_status', 'source', 'instagram_handle'].includes(k));
  return `<div class="stack" style="gap:8px">
    ${r.note ? `<p class="small muted">${esc(r.note)}</p>` : ''}
    ${rows.length ? `<div class="card flush list">${rows.map(([k, v]) => {
      const cur = p[k]; const same = JSON.stringify(cur ?? '') === JSON.stringify(v);
      return `<label class="list-item" style="align-items:flex-start"><input type="checkbox" data-apply="${attr(k)}" ${!same && (cur === null || cur === undefined || cur === '' || (Array.isArray(cur) && !cur.length)) ? 'checked' : ''}>
        <div class="t"><span class="tiny label">${esc(k.replace(/_/g, ' '))}</span><span class="small" style="overflow-wrap:anywhere">${esc(Array.isArray(v) ? v.join(', ') : v)}</span>
        ${k === 'email' && s.email_status ? `<span class="chip ${s.email_status === 'mx_ok' ? 'ok' : 'warn'}">${esc(s.email_status.replace('_', ' '))}</span>` : ''}
        ${k === 'personalization_hook' ? `<span class="chip ${s.hook_confidence === 'high' ? 'ok' : 'warn'}">${esc(s.hook_confidence || '')} confidence</span>${r.evidence?.quote ? `<span class="tiny faint">Evidence${r.evidence.found_on_page ? '' : ' (not found on page)'}: “${esc(r.evidence.quote)}”</span>` : ''}` : ''}
        ${cur && !same ? `<span class="tiny faint">Now: ${esc(Array.isArray(cur) ? cur.join(', ') : cur)}</span>` : ''}</div></label>`;
    }).join('')}</div><div class="row between"><span class="tiny faint">${esc((r.sources || []).join(' · '))}</span><button class="btn sm primary" data-act="apply">Apply selected</button></div>` : '<p class="small muted">Nothing new found.</p>'}
    ${r.alternatives?.emails?.length > 1 ? `<p class="tiny faint">Other emails on the site: ${esc(r.alternatives.emails.slice(1).join(', '))}</p>` : ''}
  </div>`;
}

export async function logReplyDialog(p) {
  return dialog({
    title: `Log a reply from ${p.agency_name}`, wide: true,
    body: `<div class="fields"><label class="field"><span>Channel</span><select id="lr-ch">${['email', 'whatsapp', 'call', 'in_person', 'linkedin'].map((c) => `<option>${c}</option>`).join('')}</select></label>
      <label class="field"><span>When</span><input type="datetime-local" id="lr-at" value="${toLocalInput(new Date())}"></label></div>
      <label class="field"><span>What they said</span><textarea id="lr-body" rows="6" placeholder="Paste the message, or write a short note of the call"></textarea></label>
      <div class="fields"><label class="field"><span>Sentiment</span><select id="lr-s">${core.SENTIMENTS.map((s) => `<option>${s}</option>`).join('')}</select></label>
      <label class="field"><span>Intent</span><select id="lr-i"><option value="">–</option>${core.INTENTS.map((s) => `<option>${s}</option>`).join('')}</select></label></div>
      <p class="small muted" id="lr-why">Paste the text and the classification fills in. Adjust it if it is wrong.</p>
      <div class="row end"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-ok>Save reply</button></div>`,
    onMount: (b, close) => {
      let cls = null;
      b.querySelector('#lr-body').addEventListener('input', (e) => {
        cls = core.classifyReply({ body: e.target.value });
        b.querySelector('#lr-s').value = cls.sentiment; b.querySelector('#lr-i').value = cls.intent || '';
        b.querySelector('#lr-why').textContent = `Detected: ${cls.sentiment}${cls.intent ? ` · ${cls.intent}` : ''} (${cls.confidence} confidence)${cls.ooo_until ? ` · back ${cls.ooo_until.slice(0, 10)}` : ''}${cls.nurture_until ? ` · nurture until ${cls.nurture_until.slice(0, 10)}` : ''}`;
      });
      b.querySelector('[data-ok]').addEventListener('click', async () => {
        const body = b.querySelector('#lr-body').value.trim();
        if (!body) return toast('Paste what they said', 'error');
        const final = { ...(cls || core.classifyReply({ body })), sentiment: b.querySelector('#lr-s').value, intent: b.querySelector('#lr-i').value || null, by: 'human' };
        try {
          const fx = await A.logInbound(p, { channel: b.querySelector('#lr-ch').value, body, cls: final, at: new Date(b.querySelector('#lr-at').value).toISOString() });
          toast(fx.summary + (fx.draft ? ' A suggested reply is in Today.' : '')); close(true);
        } catch (e) { toast(e.message, 'error'); }
      });
    },
  });
}

export async function logTouchDialog(p) {
  return dialog({
    title: 'Log an outbound touch',
    body: `<div class="fields"><label class="field"><span>Channel</span><select id="lt-ch">${['call', 'whatsapp', 'email', 'in_person', 'linkedin'].map((c) => `<option>${c}</option>`).join('')}</select></label>
      <label class="field"><span>Step</span><select id="lt-step">${['custom', 'T1_intro', 'T3_followup', 'T4_breakup', 'rate_card_delivery'].map((s) => `<option value="${s}">${stepLabel(s)}</option>`).join('')}</select></label>
      <label class="field"><span>When</span><input type="datetime-local" id="lt-at" value="${toLocalInput(new Date())}"></label></div>
      <label class="field"><span>Subject (email)</span><input type="text" id="lt-subj"></label>
      <label class="field"><span>Notes or message</span><textarea id="lt-body" rows="5"></textarea></label>
      <div class="row end"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-ok>Log it</button></div>`,
    onMount: (b, close) => b.querySelector('[data-ok]').addEventListener('click', async () => {
      try {
        await A.logOutbound(p, { channel: b.querySelector('#lt-ch').value, step_name: b.querySelector('#lt-step').value, subject: b.querySelector('#lt-subj').value, body: b.querySelector('#lt-body').value, at: new Date(b.querySelector('#lt-at').value).toISOString() });
        toast('Logged'); close(true);
      } catch (e) { toast(e.message, 'error'); }
    }),
  });
}

export async function oppDialog(p, o) {
  const items = o?.quote_items?.length ? o.quote_items : [{ kind: 'route', route: 'mxp_como', vehicle: 'V', qty: 0 }];
  return dialog({
    title: o ? 'Opportunity' : 'New opportunity', wide: true,
    body: `<div class="fields">
      <label class="field"><span>Title</span><input type="text" id="o-title" value="${attr(o?.title || `${p.agency_name} wedding`)}"></label>
      <label class="field"><span>Stage</span><select id="o-stage">${['open', 'quote_sent', 'won', 'lost'].map((s) => `<option ${o?.stage === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      <label class="field"><span>Model</span><select id="o-model"><option value="">–</option><option value="referral_12" ${(o?.model || p.partner_model) === 'referral_12' ? 'selected' : ''}>A · 12% referral</option><option value="net_whitelabel" ${(o?.model || p.partner_model) === 'net_whitelabel' ? 'selected' : ''}>B · Net / white-label</option></select></label>
      <label class="field"><span>Wedding date</span><input type="date" id="o-date" value="${attr(o?.wedding_date || '')}"></label>
      <label class="field"><span>Venue</span><input type="text" id="o-venue" value="${attr(o?.venue || '')}"></label>
      <label class="field"><span>Guests</span><input type="number" id="o-guests" value="${attr(o?.guest_count ?? '')}"></label>
      <label class="field"><span>Estimated value €</span><input type="number" id="o-est" value="${attr(o?.estimated_value ?? '')}"></label>
      <label class="field"><span>Actual revenue €</span><input type="number" id="o-rev" value="${attr(o?.actual_revenue ?? '')}"></label>
      <label class="field"><span>Commission owed €</span><input type="number" id="o-owed" value="${attr(o?.commission_owed ?? '')}"></label>
      <label class="field"><span>Commission paid €</span><input type="number" id="o-paid" value="${attr(o?.commission_paid ?? '')}"></label>
      <label class="field"><span>Concierge booking ref</span><input type="text" id="o-ref" value="${attr(o?.concierge_ref || '')}"></label>
      <label class="field"><span>Lost reason</span><input type="text" id="o-lost" value="${attr(o?.lost_reason || '')}"></label>
    </div>
    <label class="check small"><input type="checkbox" id="o-dep" ${o?.deposit_received ? 'checked' : ''}> 25% deposit received</label>
    <div class="card stack" style="background:var(--bg)"><div class="section-head"><h3>Quote calculator · net rates ${core.RATE_CARD.year}</h3><span class="hint">Internal. Never shown to planners.</span></div>
      <div id="q-items" class="stack" style="gap:8px"></div>
      <div class="row"><button class="btn sm" data-add="route">+ Transfer</button><button class="btn sm" data-add="hourly">+ Hourly</button><button class="btn sm" data-add="shuttle">+ Late-night shuttle</button><span class="grow"></span><b id="q-total" class="num"></b></div>
      <div class="row end"><button class="btn sm ghost" id="q-use">Use as estimated value</button></div></div>
    <label class="field"><span>Notes</span><textarea id="o-notes" rows="2">${esc(o?.notes || '')}</textarea></label>
    <div class="row end"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-ok>Save</button></div>`,
    onMount: (b, close) => {
      const qi = b.querySelector('#q-items');
      const drawItems = () => {
        qi.innerHTML = items.map((it, i) => `<div class="row nowrap" data-i="${i}">
          ${it.kind === 'route' ? `<select data-k="route">${core.RATE_CARD.routes.map((r) => `<option value="${r.key}" ${it.route === r.key ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}</select>
            <select data-k="vehicle" style="width:auto">${['E', 'V', 'S'].map((v) => `<option ${it.vehicle === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`
          : it.kind === 'hourly' ? `<span class="grow small">Hourly</span><select data-k="vehicle" style="width:auto">${['V', 'S'].map((v) => `<option ${it.vehicle === v ? 'selected' : ''}>${v}</option>`).join('')}</select><input type="number" data-k="hours" value="${it.hours || 3}" style="width:70px" aria-label="Hours">`
          : '<span class="grow small">Late-night villa shuttle, V-Class 00:00 to 04:00</span>'}
          <input type="number" data-k="qty" value="${it.qty}" style="width:70px" aria-label="Quantity" min="0"></div>`).join('');
        const q = core.quoteNet(items);
        b.querySelector('#q-total').textContent = `${eur(q.total)} net · deposit ${eur(q.deposit)}`;
      };
      drawItems();
      qi.addEventListener('input', (e) => { const row = e.target.closest('[data-i]'); const it = items[+row.dataset.i]; const k = e.target.dataset.k; it[k] = ['qty', 'hours'].includes(k) ? +e.target.value : e.target.value; const q = core.quoteNet(items); b.querySelector('#q-total').textContent = `${eur(q.total)} net · deposit ${eur(q.deposit)}`; });
      b.addEventListener('click', (e) => { const ad = e.target.closest('[data-add]'); if (ad) { items.push({ kind: ad.dataset.add, route: 'mxp_como', vehicle: 'V', hours: 3, qty: 1 }); drawItems(); } });
      b.querySelector('#q-use').addEventListener('click', () => { b.querySelector('#o-est').value = core.quoteNet(items).total; });
      b.querySelector('#o-rev').addEventListener('change', () => {
        const model = b.querySelector('#o-model').value; const owed = b.querySelector('#o-owed');
        if (model === 'referral_12' && !owed.value) owed.value = core.commissionFor(b.querySelector('#o-rev').value, model);
      });
      b.querySelector('[data-ok]').addEventListener('click', async () => {
        const num = (s) => { const v = b.querySelector(s).value; return v === '' ? null : Number(v); };
        const stage = b.querySelector('#o-stage').value;
        const row = {
          prospect_id: p.id, title: b.querySelector('#o-title').value, stage, model: b.querySelector('#o-model').value || null,
          wedding_date: b.querySelector('#o-date').value || null, venue: b.querySelector('#o-venue').value || null, guest_count: num('#o-guests'),
          estimated_value: num('#o-est'), actual_revenue: num('#o-rev'), commission_owed: num('#o-owed') ?? 0, commission_paid: num('#o-paid') ?? 0,
          concierge_ref: b.querySelector('#o-ref').value || null, lost_reason: b.querySelector('#o-lost').value || null, notes: b.querySelector('#o-notes').value || null,
          deposit_received: b.querySelector('#o-dep').checked, quote_items: items.filter((x) => x.qty > 0),
          won: stage === 'won' ? true : stage === 'lost' ? false : null,
        };
        if (stage === 'quote_sent' && !o?.quote_sent_at) row.quote_sent_at = new Date().toISOString();
        try {
          if (o) await update('opps', o.id, row); else await insert('opps', row);
          if (stage === 'quote_sent' && core.FUNNEL_RANK[p.status] < core.FUNNEL_RANK.quote_requested) await A.setStatus(p, 'quote_requested');
          if (stage === 'won' && p.status !== 'partner_won') { if (await confirmDialog('Mark partner won?', `${p.agency_name} has a won booking. Move them to Partner Won?`, 'Partner won')) await A.setStatus(p, 'partner_won', { partner_model: row.model || p.partner_model }); }
          toast('Saved'); close(true);
        } catch (e) { toast(e.message, 'error'); }
      });
    },
  });
}

export { copyText };
