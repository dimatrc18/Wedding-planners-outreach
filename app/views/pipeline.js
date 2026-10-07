// Pipeline: Kanban board (drag a card to change stage) or a sortable list. Filters persist per browser.
import * as core from '../../supabase/functions/_shared/core/index.js';
import { S } from '../store.js';
import { esc, attr, icon, ago, fmtDate, toast } from '../ui.js';
import * as A from '../actions.js';

const KEY = 'dorogo-pipeline-filters';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (f) => { try { localStorage.setItem(KEY, JSON.stringify(f)); } catch { /* storage blocked */ } };

const SEG = { boutique_local: 'Boutique local', high_volume_uk_us: 'High volume UK/US', international: 'International' };
const TYPE = { planner: 'Planner', venue: 'Venue', photographer: 'Photographer', concierge_hotel: 'Hotel concierge' };

function nextAction(p) {
  const list = A.touchesOf(p.id);
  const st = core.sequenceState(p, list, S.settings);
  if (st.active && st.step) return { text: st.pending ? `${st.step.label}: ${st.pending.state === 'draft' ? 'awaiting approval' : 'scheduled'}` : st.blocked === 'no_email' ? 'Needs an email' : `${st.step.label}`, at: st.pending?.scheduled_at || st.dueAt };
  if (p.status === 'researching') return { text: A.readinessProblems(p)[0] || 'Mark Ready', at: null };
  if (p.status === 'nurture') return { text: 'Nurture', at: p.nurture_until };
  if (p.snoozed_until && new Date(p.snoozed_until) > new Date()) return { text: 'Snoozed', at: p.snoozed_until };
  return { text: '', at: null };
}

function card(p) {
  const last = p.last_touch_at;
  const na = nextAction(p);
  const sc = core.priorityScore(p).score;
  return `<div class="pcard" draggable="true" data-id="${attr(p.id)}" tabindex="0" role="button" aria-label="${attr(p.agency_name)}">
    <div class="row nowrap between"><span class="name">${esc(p.agency_name)}</span><span class="score ${sc >= 60 ? 'hi' : ''}">${sc}</span></div>
    ${p.personalization_hook ? `<div class="hook">${esc(p.personalization_hook)}</div>` : ''}
    <div class="meta">${p.location ? `<span>${esc(p.location)}</span>` : ''}${p.type !== 'planner' ? `<span class="chip">${esc(TYPE[p.type] || p.type)}</span>` : ''}${p.language !== 'en' ? `<span class="chip">${esc(p.language.toUpperCase())}</span>` : ''}${p.do_not_contact ? '<span class="chip bad">DNC</span>' : ''}</div>
    <div class="meta">${last ? `<span title="Last touch">${icon('clock', 13)} ${esc(ago(last))}</span>` : '<span>No touches yet</span>'}${na.text ? `<span>· ${esc(na.text)}${na.at ? ` ${esc(fmtDate(na.at))}` : ''}</span>` : ''}</div>
  </div>`;
}

export function render(el) {
  const f = { q: '', type: '', segment: '', location: '', language: '', tag: '', view: 'board', hideClosed: true, sort: 'score', ...load() };
  const locations = [...new Set(S.prospects.map((p) => p.location).filter(Boolean))].sort();
  const tags = [...new Set(S.prospects.flatMap((p) => p.tags || []))].sort();

  const filtered = () => S.prospects.filter((p) => {
    if (f.q) { const q = f.q.toLowerCase(); if (![p.agency_name, p.contact_name, p.email, p.instagram_handle, p.location, p.notes].some((x) => (x || '').toLowerCase().includes(q))) return false; }
    if (f.type && p.type !== f.type) return false;
    if (f.segment && p.segment !== f.segment) return false;
    if (f.location && p.location !== f.location) return false;
    if (f.language && p.language !== f.language) return false;
    if (f.tag && !(p.tags || []).includes(f.tag)) return false;
    return true;
  });

  function paint() {
    const list = filtered();
    const hidden = f.hideClosed ? ['lost', 'do_not_contact'] : [];
    el.innerHTML = `
    <div class="page-head"><div><div class="label eyebrow">${list.length} of ${S.prospects.length} prospects</div><h1>Pipeline</h1></div>
      <div class="row"><div class="seg" role="group" aria-label="View"><button data-view="board" class="${f.view === 'board' ? 'on' : ''}">Board</button><button data-view="list" class="${f.view === 'list' ? 'on' : ''}">List</button></div>
      <a class="btn primary" href="#add">${icon('plus', 16)} Add</a></div></div>
    <div class="filters">
      <input type="search" id="f-q" placeholder="Search name, email, town…" value="${attr(f.q)}" aria-label="Search">
      <select id="f-type" aria-label="Type"><option value="">All types</option>${Object.entries(TYPE).map(([k, v]) => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="f-segment" aria-label="Segment"><option value="">All segments</option>${Object.entries(SEG).map(([k, v]) => `<option value="${k}" ${f.segment === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="f-location" aria-label="Location"><option value="">All locations</option>${locations.map((l) => `<option ${f.location === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
      <select id="f-language" aria-label="Language"><option value="">All languages</option>${['en', 'it', 'de', 'fr'].map((l) => `<option value="${l}" ${f.language === l ? 'selected' : ''}>${l.toUpperCase()}</option>`).join('')}</select>
      ${tags.length ? `<select id="f-tag" aria-label="Tag"><option value="">All tags</option>${tags.map((t) => `<option ${f.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>` : ''}
      <label class="check small"><input type="checkbox" id="f-closed" ${f.hideClosed ? 'checked' : ''}> Hide Lost & DNC</label>
    </div>
    ${f.view === 'board' ? `<div class="board-wrap"><div class="board">${core.STAGES.filter((s) => !hidden.includes(s.key)).map((s) => {
      const items = list.filter((p) => p.status === s.key).sort((a, b) => core.priorityScore(b).score - core.priorityScore(a).score);
      return `<div class="col" data-stage="${s.key}"><div class="col-head"><span>${esc(s.label)}</span><span class="n">${items.length}</span></div>${items.map(card).join('')}</div>`;
    }).join('')}</div></div><p class="hint">Drag a card to another column to change its stage. On a phone, open the prospect and change the stage there.</p>`
    : listView(list)}`;
  }

  function listView(list) {
    const sorters = {
      score: (a, b) => core.priorityScore(b).score - core.priorityScore(a).score,
      name: (a, b) => a.agency_name.localeCompare(b.agency_name),
      stage: (a, b) => core.STAGE_KEYS.indexOf(a.status) - core.STAGE_KEYS.indexOf(b.status),
      last: (a, b) => new Date(b.last_touch_at || 0) - new Date(a.last_touch_at || 0),
    };
    const rows = [...list].sort(sorters[f.sort] || sorters.score);
    const th = (k, label, cls = '') => `<th class="${cls}"><button class="btn ghost sm" data-sort="${k}" style="padding:0;text-transform:inherit;letter-spacing:inherit;font-size:inherit;color:${f.sort === k ? 'var(--ink)' : 'inherit'}">${label}</button></th>`;
    return `<div class="card flush table-wrap"><table><thead><tr>${th('score', 'Score')}${th('name', 'Agency')}<th>Contact</th><th>Email</th><th>Location</th>${th('stage', 'Stage')}${th('last', 'Last touch')}<th>Next</th></tr></thead><tbody>
      ${rows.map((p) => { const na = nextAction(p); return `<tr class="clickable" data-open="${attr(p.id)}"><td><span class="score ${core.priorityScore(p).score >= 60 ? 'hi' : ''}">${core.priorityScore(p).score}</span></td><td><b>${esc(p.agency_name)}</b></td><td>${esc(p.contact_name || '')}</td><td class="small">${esc(p.email || '')}</td><td>${esc(p.location || '')}</td><td><span class="chip">${esc(core.stageLabel(p.status))}</span></td><td class="small">${esc(ago(p.last_touch_at))}</td><td class="small muted">${esc(na.text)}</td></tr>`; }).join('')}
      </tbody></table></div>`;
  }

  paint();
  const persist = () => { save(f); paint(); };
  el.addEventListener('input', (e) => {
    if (e.target.id === 'f-q') { f.q = e.target.value; save(f); const pos = e.target.selectionStart; paint(); const q = el.querySelector('#f-q'); q.focus(); q.setSelectionRange(pos, pos); }
  });
  el.addEventListener('change', (e) => {
    const id = e.target.id;
    if (id === 'f-closed') f.hideClosed = e.target.checked;
    else if (id && id.startsWith('f-') && id !== 'f-q') f[id.slice(2)] = e.target.value;
    else return;
    persist();
  });
  el.addEventListener('click', (e) => {
    const v = e.target.closest('[data-view]'); if (v) { f.view = v.dataset.view; return persist(); }
    const s = e.target.closest('[data-sort]'); if (s) { f.sort = s.dataset.sort; return persist(); }
    const row = e.target.closest('[data-open]'); if (row) { location.hash = `prospect/${row.dataset.open}`; return; }
    const c = e.target.closest('.pcard'); if (c) location.hash = `prospect/${c.dataset.id}`;
  });
  el.addEventListener('keydown', (e) => { const c = e.target.closest('.pcard'); if (c && e.key === 'Enter') location.hash = `prospect/${c.dataset.id}`; });

  // Drag and drop between columns.
  let dragId = null;
  el.addEventListener('dragstart', (e) => { const c = e.target.closest('.pcard'); if (!c) return; dragId = c.dataset.id; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
  el.addEventListener('dragend', (e) => { e.target.closest('.pcard')?.classList.remove('dragging'); el.querySelectorAll('.col.drop').forEach((c) => c.classList.remove('drop')); });
  el.addEventListener('dragover', (e) => { const col = e.target.closest('.col'); if (!col || !dragId) return; e.preventDefault(); el.querySelectorAll('.col.drop').forEach((c) => c !== col && c.classList.remove('drop')); col.classList.add('drop'); });
  el.addEventListener('drop', async (e) => {
    const col = e.target.closest('.col'); if (!col || !dragId) return;
    e.preventDefault();
    const p = A.prospectById(dragId); const to = col.dataset.stage; dragId = null;
    if (!p || p.status === to) return paint();
    if (to === 'ready') { const probs = A.readinessProblems(p); if (probs.length) toast(`Moved, but check: ${probs.join(', ')}`, 'error'); }
    try { await A.setStatus(p, to); toast(`${p.agency_name} → ${core.stageLabel(to)}`); } catch (err) { toast(err.message, 'error'); }
  });
}
