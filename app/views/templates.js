// Sequence & templates: cadence steps, send window, and the template editor with live preview and copy-lint.
import * as core from '../../supabase/functions/_shared/core/index.js';
import { S, upsertTemplate, saveSettings } from '../store.js';
import { esc, attr, icon, toast } from '../ui.js';

const DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
let sel = null; // `${key}|${language}`
let previewId = null;

export function render(el) {
  const tpls = () => [...S.templates].filter((x) => x.key !== 'T2_ig_dm').sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'sequence' ? -1 : 1) || a.key.localeCompare(b.key) || a.language.localeCompare(b.language));
  if (!sel) { const t = tpls()[0]; sel = t ? `${t.key}|${t.language}` : null; }
  const sample = () => S.prospects.find((p) => p.id === previewId) || S.prospects.find((p) => p.personalization_hook && p.contact_name) || S.prospects[0] ||
    { id: 'x', agency_name: 'Sample Planner', contact_name: 'Giulia Rossi', language: 'en', personalization_hook: 'Your September wedding at Villa Melzi was beautifully paced.' };

  function paint() {
    const s = S.settings;
    const t = tpls().find((x) => `${x.key}|${x.language}` === sel);
    el.innerHTML = `
    <div class="page-head"><div><div class="label eyebrow">Default cadence: 9 days, 3 emails (2+1 thread split)</div><h1>Sequence & templates</h1></div></div>
    <div class="stack lg">
      <section class="card stack">
        <div class="section-head"><h2>Cadence</h2><span class="hint">Day = days after the intro email. A reply at any point stops the cadence.</span></div>
        <div class="table-wrap"><table><thead><tr><th>Step</th><th>Channel</th><th class="num">Day</th><th>On</th><th>Needs approval</th></tr></thead><tbody>
          ${s.steps.map((st, i) => `<tr><td><b>${esc(st.label)}</b> <span class="faint small">${esc(st.key)}</span></td><td>${esc(st.channel.replace('_', ' '))}${st.thread ? ' <span class="chip">same thread</span>' : ''}</td>
            <td class="num"><input type="number" min="0" max="60" data-step="${i}" data-k="day" value="${st.day}" style="width:70px" ${i === 0 ? 'disabled' : ''} aria-label="Day"></td>
            <td><label class="switch"><input type="checkbox" data-step="${i}" data-k="enabled" ${st.enabled !== false ? 'checked' : ''}><span></span></label></td>
            <td><label class="switch" title="Off = drafts that pass the linter are approved and scheduled automatically"><input type="checkbox" data-step="${i}" data-k="require_approval" ${st.require_approval !== false ? 'checked' : ''} ${st.channel !== 'email' ? 'disabled' : ''}><span></span></label></td></tr>`).join('')}
        </tbody></table></div>
        <p class="small muted">Approval stays on for every step until you switch it off here.</p>
        <div class="divider"></div>
        <div class="section-head"><h2>Send window</h2><span class="hint">In the recipient's time zone; Italian holidays and 7 December (Milan) are skipped.</span></div>
        <div class="row">${[1, 2, 3, 4, 5, 6, 7].map((d) => `<label class="check chip ${s.send_days.includes(d) ? 'gold' : 'outline'}" style="cursor:pointer"><input type="checkbox" data-day="${d}" ${s.send_days.includes(d) ? 'checked' : ''} style="display:none">${DAYS[d]}</label>`).join('')}</div>
        <div class="fields">
          <label class="field"><span>From</span><input type="time" id="w-start" value="${attr(s.window_start)}"></label>
          <label class="field"><span>Until</span><input type="time" id="w-end" value="${attr(s.window_end)}"></label>
          <label class="field"><span>Min. minutes between sends</span><input type="number" id="w-jmin" value="${s.jitter_min}" min="1"></label>
          <label class="field"><span>Max. minutes between sends</span><input type="number" id="w-jmax" value="${s.jitter_max}" min="2"></label>
        </div>
        <div class="row end"><button class="btn primary sm" data-act="save-cadence">Save cadence</button></div>
      </section>

      <section class="grid-2" style="align-items:start">
        <div class="card flush list">${tpls().map((x) => `<button class="list-item clickable" data-sel="${attr(`${x.key}|${x.language}`)}" style="border:0;border-top:1px solid var(--line);background:${`${x.key}|${x.language}` === sel ? 'var(--gold-soft)' : 'none'};width:100%;text-align:left">
          <div class="t"><b>${esc(x.name || x.key)}</b><span class="small muted">${esc(x.key)} · ${esc(x.kind)}${x.subject_b ? ' · A/B subject' : ''}</span></div><span class="chip">${esc(x.language.toUpperCase())}</span></button>`).join('')}
          <div class="list-item"><button class="btn sm" data-act="new-lang">${icon('plus', 15)} Add a language version</button></div>
        </div>
        ${t ? editor(t) : '<div class="empty">Pick a template.</div>'}
      </section>
    </div>`;
    if (t) refreshPreview();
  }

  function editor(t) {
    const vars = ['greeting', 'first_name', 'agency', 'hook', 'venue', 'location', 'signature', 'optout'];
    return `<div class="card stack">
      <div class="section-head"><h2>${esc(t.name || t.key)}</h2><span class="chip">v${t.version || 1}</span></div>
      <label class="field"><span>Name</span><input type="text" id="t-name" value="${attr(t.name || '')}"></label>
      <div class="fields"><label class="field"><span>Subject A</span><input type="text" id="t-sa" value="${attr(t.subject_a || '')}" placeholder="${t.kind === 'sequence' && t.key === 'T3_followup' ? 'Empty: replies in the intro thread' : ''}"></label>
        <label class="field"><span>Subject B (A/B test)</span><input type="text" id="t-sb" value="${attr(t.subject_b || '')}" placeholder="Leave empty for no test"></label></div>
      <label class="field"><span>Body</span><textarea id="t-body" rows="14" class="mono" style="font-size:.84rem">${esc(t.body)}</textarea></label>
      <p class="tiny faint">Variables: ${vars.map((v) => `<code>{{${v}}}</code>`).join(' ')}</p>
      <label class="check small"><input type="checkbox" id="t-attach" ${t.attach_rate_card ? 'checked' : ''}> Attach the rate card PDF</label>
      <label class="check small"><input type="checkbox" id="t-active" ${t.active !== false ? 'checked' : ''}> Active</label>
      <div class="divider"></div>
      <div class="row between"><h3>Preview</h3><select id="t-prev" style="width:auto" aria-label="Preview with prospect">${S.prospects.slice(0, 200).map((p) => `<option value="${attr(p.id)}" ${p.id === sample().id ? 'selected' : ''}>${esc(p.agency_name)}</option>`).join('')}</select></div>
      <div id="t-preview"></div>
      <div class="row end"><button class="btn ghost sm" data-act="reset">Restore default</button><button class="btn primary" data-act="save-tpl">Save template</button></div>
    </div>`;
  }

  function current() {
    return {
      name: el.querySelector('#t-name')?.value, subject_a: el.querySelector('#t-sa')?.value ?? '', subject_b: el.querySelector('#t-sb')?.value ?? '',
      body: el.querySelector('#t-body')?.value || '', attach_rate_card: !!el.querySelector('#t-attach')?.checked, active: !!el.querySelector('#t-active')?.checked,
    };
  }

  function refreshPreview() {
    const box = el.querySelector('#t-preview'); if (!box) return;
    const [key] = sel.split('|');
    const c = current();
    const p = sample();
    const vars = core.buildVars(p);
    const channel = 'email';
    const body = core.merge(c.body, vars);
    const subjects = [['A', c.subject_a], ['B', c.subject_b]].filter(([, x]) => x).map(([v, x]) => [v, core.merge(x, vars)]);
    const subject = subjects[0]?.[1] || 'Re: (intro thread subject)';
    const l = core.lintMessage({ subject, body, channel, step: key });
    const lb = subjects[1] ? core.lintMessage({ subject: subjects[1][1], body, channel, step: key }) : null;
    const htmlPreview = `<div style="background:#ffffff;border:1px solid var(--line);border-radius:8px;overflow:hidden">${core.renderDorogoLuxuryHtmlEmail(body, { fromEmail: S.settings?.sender?.email || 'booking@dorogo.eu' })}</div>`;
    box.innerHTML = `<div class="draft" style="background:var(--bg)">${subjects.map(([v, x]) => `<div class="subject">${subjects.length > 1 ? `<span class="chip outline">${v}</span> ` : ''}${esc(x)}</div>`).join('')}
      ${htmlPreview}
      <div class="lint">${[...new Set([...l.errors, ...(lb?.errors || [])])].map((e) => `<span class="e">${esc(e)}</span>`).join('')}${[...new Set([...l.warnings, ...(lb?.warnings || [])])].map((w) => `<span class="w">${esc(w)}</span>`).join('')}${!l.errors.length && !l.warnings.length ? '<span style="color:var(--ok)">Passes the copy-linter · DOROGO Executive Email Layout</span>' : ''}</div>
      <span class="hint">${l.words} words without signature${key === 'T1_intro' ? ' · target under 120' : ''}</span></div>`;
  }

  paint();
  el.addEventListener('input', (e) => { if (['t-body', 't-sa', 't-sb'].includes(e.target.id)) refreshPreview(); });
  el.addEventListener('change', async (e) => {
    if (e.target.id === 't-prev') { previewId = e.target.value; refreshPreview(); return; }
    if (e.target.dataset.day) { e.target.closest('label').className = `check chip ${e.target.checked ? 'gold' : 'outline'}`; return; }
    if (e.target.dataset.step !== undefined) {
      const i = +e.target.dataset.step; const k = e.target.dataset.k;
      const steps = S.settings.steps.map((x) => ({ ...x }));
      steps[i][k] = e.target.type === 'checkbox' ? e.target.checked : +e.target.value;
      await saveSettings({ steps }); toast('Cadence saved');
    }
  });
  el.addEventListener('click', async (e) => {
    const sb = e.target.closest('[data-sel]'); if (sb) { sel = sb.dataset.sel; return paint(); }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const [key, language] = (sel || '|').split('|');
    const t = S.templates.find((x) => x.key === key && x.language === language);
    try {
      if (b.dataset.act === 'save-tpl') {
        const c = current();
        const [k] = sel.split('|');
        const l = core.lintMessage({ subject: core.merge(c.subject_a, core.buildVars(sample())), body: core.merge(c.body, core.buildVars(sample())), channel: 'email', step: k });
        const banned = l.errors.filter((x) => x.startsWith('Banned'));
        if (banned.length) return toast(banned[0], 'error');
        await upsertTemplate({ ...t, ...c, version: (t.version || 1) + 1 });
        toast('Template saved. New drafts use it; existing drafts keep their text.');
      } else if (b.dataset.act === 'reset') {
        const d = core.DEFAULT_TEMPLATES.find((x) => x.key === key && x.language === language);
        if (!d) return toast('No default for this one', 'error');
        await upsertTemplate({ ...t, ...d, version: (t.version || 1) + 1 }); toast('Default restored');
      } else if (b.dataset.act === 'new-lang') {
        const lang = ['it', 'de', 'fr', 'en'].find((lg) => !S.templates.some((x) => x.key === key && x.language === lg));
        if (!lang) return toast('All languages exist for this template');
        await upsertTemplate({ ...t, id: undefined, language: lang, name: `${t.name} (${lang.toUpperCase()})`, version: 1 });
        sel = `${key}|${lang}`; toast(`${lang.toUpperCase()} copy created. Translate it before use.`);
      } else if (b.dataset.act === 'save-cadence') {
        const send_days = [...el.querySelectorAll('[data-day]')].filter((x) => x.checked).map((x) => +x.dataset.day);
        if (!send_days.length) return toast('Pick at least one send day', 'error');
        const window_start = el.querySelector('#w-start').value, window_end = el.querySelector('#w-end').value;
        if (window_end <= window_start) return toast('The window must end after it starts', 'error');
        const jitter_min = Math.max(1, +el.querySelector('#w-jmin').value), jitter_max = Math.max(jitter_min + 1, +el.querySelector('#w-jmax').value);
        await saveSettings({ send_days, window_start, window_end, jitter_min, jitter_max }); toast('Send window saved');
      }
    } catch (err) { toast(err.message, 'error'); }
  });
}
