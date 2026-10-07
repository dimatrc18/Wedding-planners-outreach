// Add prospects: quick form, paste-a-URL research, CSV import with duplicate check, bookmarklet.
import * as core from '../../supabase/functions/_shared/core/index.js';
import { S, insert, api, isDemo, log } from '../store.js';
import { esc, attr, icon, toast, plural, download } from '../ui.js';
import * as A from '../actions.js';

let preview = null; // parsed CSV rows awaiting confirmation

export function render(el, param) {
  const fromBookmarklet = param ? decodeURIComponent(param) : '';
  const appUrl = location.href.split('#')[0];
  const bookmarklet = `javascript:void(window.open('${appUrl}#add/'+encodeURIComponent(location.href)))`;

  function paint() {
    el.innerHTML = `
    <div class="page-head"><div><div class="label eyebrow">${S.prospects.length} prospects in the CRM</div><h1>Add prospects</h1></div></div>
    <div class="grid-2">
      <section class="card stack">
        <div class="section-head"><h2>From a website or Instagram link</h2></div>
        <p class="small muted">Reads the planner's public website (and its contact page) for email, phone, Instagram, venues and town. With a Gemini key it also drafts a hook, quoting its evidence. Instagram links only fill in the handle.</p>
        <div class="row nowrap"><input type="url" id="url" placeholder="https://planner-website.it" value="${attr(fromBookmarklet)}" aria-label="URL"><button class="btn primary" id="go">${icon('search', 16)} Research</button></div>
        <div id="url-out"></div>
        <p class="tiny faint">Bookmarklet: drag <a href="${attr(bookmarklet)}" class="chip gold" onclick="return false">+ DOROGO prospect</a> to your bookmarks bar, then click it on any planner's website.</p>
      </section>

      <section class="card stack">
        <div class="section-head"><h2>Quick add</h2></div>
        <form id="quick" class="stack">
          <div class="fields">
            <label class="field"><span>Agency / business *</span><input type="text" name="agency_name" required></label>
            <label class="field"><span>Contact name</span><input type="text" name="contact_name"></label>
            <label class="field"><span>Email</span><input type="email" name="email"></label>
            <label class="field"><span>Instagram</span><input type="text" name="instagram_handle" placeholder="@handle"></label>
            <label class="field"><span>Website</span><input type="url" name="website"></label>
            <label class="field"><span>Location</span><input type="text" name="location" list="towns"></label>
            <label class="field"><span>Type</span><select name="type"><option value="planner">Planner</option><option value="venue">Venue</option><option value="photographer">Photographer</option><option value="concierge_hotel">Hotel concierge</option></select></label>
            <label class="field"><span>Language</span><select name="language"><option value="en">EN</option><option value="it">IT</option><option value="de">DE</option><option value="fr">FR</option></select></label>
            <label class="field"><span>Source</span><select name="source"><option>manual</option><option>matrimonio.com</option><option>instagram</option><option>wedding_wire</option><option>referral</option></select></label>
          </div>
          <label class="field"><span>Personalization hook</span><textarea name="personalization_hook" rows="2" placeholder="One specific, true sentence about their work"></textarea></label>
          <div class="row end"><span id="dup" class="small" style="color:var(--warn)"></span><button class="btn primary" type="submit">Add prospect</button></div>
        </form>
        <datalist id="towns">${core.LAKE_TOWNS.map((t) => `<option>${esc(t)}</option>`).join('')}</datalist>
      </section>
    </div>

    <section class="card stack" style="margin-top:16px">
      <div class="section-head"><h2>Import a CSV</h2><button class="btn sm ghost" id="tpl">${icon('download', 15)} Download a template</button></div>
      <p class="small muted">Columns are matched by name (agency, contact, email, instagram, website, location, rating, reviews, language, hook, notes, tags…). Unknown columns go to notes. Invalid emails are dropped, never guessed. Duplicates by email, domain, Instagram or name are skipped.</p>
      <input type="file" id="csv" accept=".csv,text/csv" aria-label="CSV file">
      <div id="csv-out">${preview ? previewHtml() : ''}</div>
    </section>`;
  }

  function previewHtml() {
    const fresh = preview.filter((r) => !r.dup);
    return `<div class="stack"><p class="small"><b>${plural(preview.length, 'row')}</b> read · ${fresh.length} new · ${preview.length - fresh.length} duplicates skipped</p>
      <div class="table-wrap card flush"><table><thead><tr><th>Agency</th><th>Contact</th><th>Email</th><th>Instagram</th><th>Location</th><th>Status</th></tr></thead><tbody>
      ${preview.slice(0, 200).map((r) => `<tr><td>${esc(r.agency_name || '')}</td><td>${esc(r.contact_name || '')}</td><td class="small">${esc(r.email || '')}</td><td class="small">${esc(r.instagram_handle || '')}</td><td>${esc(r.location || '')}</td><td>${r.dup ? `<span class="chip warn">duplicate of ${esc(r.dup)}</span>` : '<span class="chip ok">new</span>'}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="row end"><button class="btn ghost" id="csv-cancel">Cancel</button><button class="btn primary" id="csv-go" ${fresh.length ? '' : 'disabled'}>Import ${fresh.length}</button></div></div>`;
  }

  paint();

  el.addEventListener('input', (e) => {
    const f = e.target.closest('#quick'); if (!f) return;
    const data = Object.fromEntries(new FormData(f));
    const d = core.findDuplicates({ ...data, instagram_handle: core.normalizeHandle(data.instagram_handle) }, S.prospects);
    el.querySelector('#dup').textContent = d.length ? `Possible duplicate: ${d[0].agency_name}` : '';
  });

  el.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    for (const k of Object.keys(data)) if (data[k] === '') data[k] = null;
    if (data.instagram_handle) data.instagram_handle = core.normalizeHandle(data.instagram_handle);
    if (data.email) { data.email = data.email.toLowerCase(); data.email_status = await A.verifyEmail(data.email); }
    data.priority_score = core.priorityScore(data).score;
    data.status = 'researching';
    try {
      const [row] = await insert('prospects', data);
      log('prospect_added', { via: 'quick_add' }, row.id);
      toast(`${row.agency_name} added`);
      location.hash = `prospect/${row.id}`;
    } catch (err) { toast(/unique|duplicate/i.test(err.message) ? 'That email is already in the CRM' : err.message, 'error'); }
  });

  el.addEventListener('click', async (e) => {
    const id = e.target.closest('button')?.id;
    if (id === 'go') return research();
    if (id === 'tpl') return download('dorogo_prospects_template.csv', 'agency,contact,email,instagram,website,location,type,segment,language,rating,reviews,source,hook,notes,tags\n', 'text/csv');
    if (id === 'csv-cancel') { preview = null; return paint(); }
    if (id === 'csv-go') {
      const rows = preview.filter((r) => !r.dup).map(({ dup, ...r }) => ({ type: 'planner', language: 'en', status: 'researching', ...r, priority_score: core.priorityScore(r).score }));
      try {
        for (let i = 0; i < rows.length; i += 100) await insert('prospects', rows.slice(i, i + 100));
        log('csv_import', { count: rows.length });
        toast(`${plural(rows.length, 'prospect')} imported`);
        preview = null; location.hash = 'pipeline';
      } catch (err) { toast(err.message, 'error'); }
    }
    if (e.target.closest('[data-create]')) return createFromResearch();
  });

  el.addEventListener('change', async (e) => {
    if (e.target.id !== 'csv' || !e.target.files[0]) return;
    const text = await e.target.files[0].text();
    const rows = core.csvToProspects(text);
    const seen = [...S.prospects];
    preview = rows.map((r) => { const d = core.findDuplicates(r, seen); seen.push(r); return { ...r, dup: d.length ? d[0].agency_name || d[0].email || 'a row above' : null }; });
    el.querySelector('#csv-out').innerHTML = previewHtml();
  });

  let found = null;
  async function research() {
    const url = el.querySelector('#url').value.trim();
    const out = el.querySelector('#url-out');
    if (!url) return toast('Paste a URL first', 'error');
    const quick = core.parseProfileUrl(url);
    const dup = core.findDuplicates(quick, S.prospects);
    if (dup.length) { out.innerHTML = `<p class="small">Already in the CRM: <a href="#prospect/${attr(dup[0].id)}">${esc(dup[0].agency_name)}</a></p>`; return; }
    if (isDemo()) { found = { suggestions: quick }; out.innerHTML = `<p class="small muted">Demo mode: website research runs on the live system. You can still create the prospect from the link.</p><button class="btn sm primary" data-create>Create prospect</button>`; return; }
    out.innerHTML = '<p class="small muted">Reading the public website…</p>';
    try {
      found = await api('enrich', { url });
      const s = found.suggestions || {};
      out.innerHTML = `<div class="stack" style="gap:8px">${found.note ? `<p class="small muted">${esc(found.note)}</p>` : ''}
        <div class="card flush list">${Object.entries(s).filter(([k, v]) => v && !(Array.isArray(v) && !v.length) && !['hook_type', 'hook_needs_review', 'hook_source_url', 'source'].includes(k)).map(([k, v]) => `<div class="list-item"><span class="tiny label" style="min-width:110px">${esc(k.replace(/_/g, ' '))}</span><span class="small t" style="overflow-wrap:anywhere">${esc(Array.isArray(v) ? v.join(', ') : v)}</span></div>`).join('')}</div>
        <label class="field"><span>Agency name *</span><input type="text" id="new-name" value="${attr((found.title || '').split(/[|–—-]/)[0].trim())}"></label>
        <div class="row end"><button class="btn primary" data-create>Create prospect</button></div></div>`;
    } catch (err) { out.innerHTML = `<p class="small" style="color:var(--bad)">${esc(err.message)}</p>`; }
  }

  async function createFromResearch() {
    const s = { ...(found?.suggestions || {}) };
    const name = el.querySelector('#new-name')?.value.trim() || s.instagram_handle || core.domainOf(s.website || '') || 'New prospect';
    const row = {
      agency_name: name, status: 'researching', type: 'planner', source: s.source || 'manual',
      ...Object.fromEntries(Object.entries(s).filter(([k, v]) => v !== '' && v !== null && v !== undefined && k !== 'source')),
      enrichment: found?.sources ? { last: { at: new Date().toISOString(), sources: found.sources, evidence: found.evidence } } : {},
    };
    if (!row.language) row.language = 'en';
    row.priority_score = core.priorityScore(row).score;
    try {
      const [saved] = await insert('prospects', row);
      log('prospect_added', { via: 'research' }, saved.id);
      toast('Prospect created'); location.hash = `prospect/${saved.id}`;
    } catch (err) { toast(err.message, 'error'); }
  }

  if (fromBookmarklet) research();
}
