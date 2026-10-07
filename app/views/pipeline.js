// Pipeline: Interactive Path Exploration flow diagram (GA4 style), Kanban board, or sortable list.
import * as core from '../../supabase/functions/_shared/core/index.js';
import { S, startDemo } from '../store.js';
import { buildDemoData } from '../demo.js';
import { esc, attr, icon, ago, fmtDate, pct, plural, toast, download, dialog } from '../ui.js';
import * as A from '../actions.js';

const KEY = 'dorogo-pipeline-v2';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (f) => { try { localStorage.setItem(KEY, JSON.stringify(f)); } catch { /* storage blocked */ } };

const SEG = { boutique_local: 'Boutique local', high_volume_uk_us: 'High volume UK/US', international: 'International' };
const TYPE = { planner: 'Planner', venue: 'Venue', photographer: 'Photographer', concierge_hotel: 'Hotel concierge' };

const STAGE_GROUPS = [
  { key: 'all', label: 'All stages', match: () => true },
  { key: 'researching', label: 'Researching', dropStage: 'researching', match: (p) => p.status === 'researching' },
  { key: 'ready', label: 'Ready', dropStage: 'ready', match: (p) => p.status === 'ready' },
  { key: 'cadence', label: 'In Cadence (T1–T4)', dropStage: 't1_sent', match: (p) => ['t1_sent', 't2_sent', 't3_sent', 't4_sent'].includes(p.status) },
  { key: 'engaged', label: 'Replied & Active', dropStage: 'replied', match: (p) => ['replied', 'rate_card_sent', 'in_conversation', 'quote_requested', 'fam_offered'].includes(p.status) },
  { key: 'won', label: 'Partner Won', dropStage: 'partner_won', match: (p) => p.status === 'partner_won' },
  { key: 'closed', label: 'Nurture / Lost', dropStage: 'nurture', match: (p) => ['nurture', 'lost', 'do_not_contact'].includes(p.status) },
];

let sampleCache = null;
function getSampleData() {
  if (!sampleCache) sampleCache = buildDemoData();
  return sampleCache;
}

// Module-scoped interactive session state so store/main.js re-renders never wipe active path exploration
const pathSession = {
  selectedPath: {},
  expandedCols: new Set(),
  stageFilter: 'all',
  previewSample: true,
  undoStack: [],
  redoStack: [],
};

function nextAction(p, touchesList, settings) {
  const st = core.sequenceState(p, touchesList, settings);
  if (st.active && st.step) {
    return {
      text: st.pending
        ? `${st.step.label}: ${st.pending.state === 'draft' ? 'awaiting approval' : 'scheduled'}`
        : st.blocked === 'no_email'
          ? 'Needs an email'
          : `${st.step.label}`,
      at: st.pending?.scheduled_at || st.dueAt,
      canDraft: !st.pending && !st.blocked,
    };
  }
  if (p.status === 'researching') return { text: A.readinessProblems(p)[0] || 'Mark Ready', at: null, canDraft: false };
  if (p.status === 'nurture') return { text: 'Nurture', at: p.nurture_until, canDraft: false };
  if (p.snoozed_until && new Date(p.snoozed_until) > new Date()) return { text: 'Snoozed', at: p.snoozed_until, canDraft: false };
  return { text: '', at: null, canDraft: false };
}

function card(p, { touchesByP, settings, showStageSelect = false } = {}) {
  const last = p.last_touch_at;
  const pTouches = touchesByP ? (touchesByP.get(p.id) || []) : A.touchesOf(p.id);
  const na = nextAction(p, pTouches, settings || S.settings);
  const sc = core.priorityScore(p).score;
  return `<div class="pcard" draggable="true" data-id="${attr(p.id)}" tabindex="0" role="button" aria-label="${attr(p.agency_name)}">
    <div class="row nowrap between">
      <span class="name">${esc(p.agency_name)}</span>
      <span class="score ${sc >= 60 ? 'hi' : ''}" title="Priority score">${sc}</span>
    </div>
    ${p.personalization_hook ? `<div class="hook">${esc(p.personalization_hook)}</div>` : ''}
    <div class="meta">
      ${showStageSelect ? `<select class="stage-pill-select" data-stage-select="${attr(p.id)}" aria-label="Change stage for ${attr(p.agency_name)}">
        ${core.STAGES.map((s) => `<option value="${s.key}" ${p.status === s.key ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
      </select>` : ''}
      ${p.location ? `<span>${esc(p.location)}</span>` : ''}
      ${p.type !== 'planner' ? `<span class="chip">${esc(TYPE[p.type] || p.type)}</span>` : ''}
      ${p.language !== 'en' ? `<span class="chip">${esc((p.language || '').toUpperCase())}</span>` : ''}
      ${p.do_not_contact ? '<span class="chip bad">DNC</span>' : ''}
    </div>
    <div class="meta">
      ${last ? `<span title="Last touch">${icon('clock', 13)} ${esc(ago(last))}</span>` : '<span>No touches yet</span>'}
      ${na.text ? `<span>· ${esc(na.text)}${na.at ? ` ${esc(fmtDate(na.at))}` : ''}</span>` : ''}
    </div>
  </div>`;
}

function stepSelectOptions(selectedKey) {
  const groups = new Map();
  for (const d of core.PATH_DIMENSIONS) {
    if (!groups.has(d.group)) groups.set(d.group, []);
    groups.get(d.group).push(d);
  }
  return [...groups.entries()].map(([grp, dims]) =>
    `<optgroup label="${attr(grp)}">${dims.map((d) => `<option value="${attr(d.key)}" ${d.key === selectedKey ? 'selected' : ''}>${esc(d.label)}</option>`).join('')}</optgroup>`
  ).join('');
}

export function render(el) {
  const saved = load();
  const defaultPreset = core.PATH_PRESETS[0];
  const f = {
    q: '',
    type: '',
    segment: '',
    location: '',
    language: '',
    tag: '',
    view: 'flow',
    hideClosed: false,
    sort: 'score',
    preset: defaultPreset.key,
    steps: [...defaultPreset.steps],
    ...saved,
  };
  if (!['flow', 'board', 'list'].includes(f.view)) f.view = 'flow';
  if (!Array.isArray(f.steps) || f.steps.length < 2) f.steps = [...defaultPreset.steps];

  let { selectedPath, expandedCols, stageFilter, previewSample } = pathSession;
  const { undoStack, redoStack } = pathSession;
  const syncSession = () => {
    pathSession.selectedPath = selectedPath;
    pathSession.expandedCols = expandedCols;
    pathSession.stageFilter = stageFilter;
    pathSession.previewSample = previewSample;
  };

  function snapshot() {
    return {
      preset: f.preset,
      steps: [...f.steps],
      selectedPath: { ...selectedPath },
      expandedCols: [...expandedCols],
      stageFilter,
    };
  }
  function pushUndo() {
    undoStack.push(snapshot());
    if (undoStack.length > 30) undoStack.shift();
    redoStack.length = 0;
  }
  function applySnapshot(snap) {
    if (!snap) return;
    f.preset = snap.preset;
    f.steps = [...snap.steps];
    selectedPath = { ...snap.selectedPath };
    expandedCols = new Set(snap.expandedCols);
    if (snap.stageFilter) stageFilter = snap.stageFilter;
    syncSession();
  }

  function activeData() {
    if (S.prospects.length === 0 && previewSample) {
      const d = getSampleData();
      return { prospects: d.prospects, touches: d.touches, opps: d.opps, settings: d.settings, isSample: true };
    }
    return { prospects: S.prospects, touches: S.touches, opps: S.opps, settings: S.settings, isSample: false };
  }

  function matchesFilters(p, hiddenStages) {
    if (hiddenStages.includes(p.status)) return false;
    if (f.q) {
      const q = f.q.toLowerCase();
      if (![p.agency_name, p.contact_name, p.email, p.location, p.notes].some((x) => (x || '').toLowerCase().includes(q))) return false;
    }
    if (f.type && p.type !== f.type) return false;
    if (f.segment && p.segment !== f.segment) return false;
    if (f.location && p.location !== f.location) return false;
    if (f.language && p.language !== f.language) return false;
    if (f.tag && !(p.tags || []).includes(f.tag)) return false;
    return true;
  }

  // Clear stale saved filters on mount if they hide 100% of available prospects
  {
    const src = activeData().prospects;
    const hidden = f.hideClosed ? ['lost', 'do_not_contact'] : [];
    if (src.length > 0 && src.filter((p) => matchesFilters(p, hidden)).length === 0) {
      f.q = ''; f.type = ''; f.segment = ''; f.location = ''; f.language = ''; f.tag = '';
      save(f);
    }
  }

  function hasActiveFilters() {
    return Boolean(f.q || f.type || f.segment || f.location || f.language || f.tag);
  }

  let lastFlow = null;
  let tip = null;
  const removeTip = () => { if (tip) { tip.remove(); tip = null; } };
  const clearHover = () => {
    el.querySelectorAll('.path-link.hover, .path-node.hover').forEach((x) => x.classList.remove('hover'));
  };

  function paint() {
    removeTip();
    syncSession();
    const data = activeData();
    const locations = [...new Set(data.prospects.map((p) => p.location).filter(Boolean))].sort();
    const tags = [...new Set(data.prospects.flatMap((p) => p.tags || []))].sort();
    const hidden = f.hideClosed ? ['lost', 'do_not_contact'] : [];
    const list = data.prospects.filter((p) => matchesFilters(p, hidden));
    const touchesByP = core.groupTouches(data.touches);

    el.innerHTML = `
    <div class="page-head">
      <div>
        <div class="label eyebrow">${list.length} of ${data.prospects.length} prospects${data.isSample ? ' · sample flow preview' : ''}</div>
        <h1>Pipeline</h1>
      </div>
      <div class="row">
        <div class="seg" role="group" aria-label="View">
          <button data-view="flow" class="${f.view === 'flow' ? 'on' : ''}">${icon('flow', 15)} Flow</button>
          <button data-view="board" class="${f.view === 'board' ? 'on' : ''}">Board</button>
          <button data-view="list" class="${f.view === 'list' ? 'on' : ''}">List</button>
        </div>
        <a class="btn primary" href="#add">${icon('plus', 16)} Add</a>
      </div>
    </div>

    ${S.prospects.length === 0 ? `<div class="banner demo">
      ${icon('sparkle')}
      <span>${previewSample
        ? `<b>Sample pipeline flow preview.</b> Your live account (${esc(S.user?.email || 'signed in')}) currently has 0 prospects loaded, so this interactive preview shows how prospects move through the outreach steps.`
        : `<b>0 prospects loaded</b> for ${esc(S.user?.email || 'this account')}. Add prospects or preview the interactive sample flow.`}</span>
      <span class="grow"></span>
      <button class="btn sm" data-act="toggle-preview">${previewSample ? 'Show empty state' : 'Preview sample flow'}</button>
      <button class="btn sm primary" data-act="switch-demo">Explore full Demo</button>
    </div>` : ''}

    <div class="filters">
      <input type="search" id="f-q" placeholder="Search name, email, town…" value="${attr(f.q)}" aria-label="Search">
      <select id="f-type" aria-label="Type"><option value="">All types</option>${Object.entries(TYPE).map(([k, v]) => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="f-segment" aria-label="Segment"><option value="">All segments</option>${Object.entries(SEG).map(([k, v]) => `<option value="${k}" ${f.segment === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="f-location" aria-label="Location"><option value="">All locations</option>${locations.map((l) => `<option ${f.location === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
      <select id="f-language" aria-label="Language"><option value="">All languages</option>${['en', 'it', 'de', 'fr'].map((l) => `<option value="${l}" ${f.language === l ? 'selected' : ''}>${l.toUpperCase()}</option>`).join('')}</select>
      ${tags.length ? `<select id="f-tag" aria-label="Tag"><option value="">All tags</option>${tags.map((t) => `<option ${f.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>` : ''}
      <label class="check small"><input type="checkbox" id="f-closed" ${f.hideClosed ? 'checked' : ''}> Hide Lost & DNC</label>
      ${hasActiveFilters() ? `<button class="btn ghost sm" data-act="reset-filters">${icon('x', 14)} Reset filters</button>` : ''}
    </div>

    ${f.view === 'flow'
      ? flowView(list, data, touchesByP, hidden)
      : f.view === 'board'
        ? boardView(list, data, touchesByP, hidden)
        : listView(list, data, touchesByP)}`;
  }

  function flowView(list, data, touchesByP, hidden) {
    const flow = core.buildPathExploration(list, data.touches, data.opps, {
      steps: f.steps,
      selectedPath,
      expandedCols,
      maxNodesPerCol: 6,
    });
    lastFlow = flow;
    selectedPath = { ...flow.selectedPath };
    syncSession();

    const m = core.computeMetrics(flow.matchedProspects, data.touches, data.opps);
    const hasSel = flow.breadcrumbs.length > 0;
    const canReset = hasSel || expandedCols.size > 0 || stageFilter !== 'all' || f.preset === 'custom';

    // Filter inspector cards by stageFilter pill
    const sgObj = STAGE_GROUPS.find((g) => g.key === stageFilter) || STAGE_GROUPS[0];
    const sorters = {
      score: (a, b) => core.priorityScore(b).score - core.priorityScore(a).score,
      name: (a, b) => a.agency_name.localeCompare(b.agency_name),
      stage: (a, b) => core.STAGE_KEYS.indexOf(a.status) - core.STAGE_KEYS.indexOf(b.status),
      last: (a, b) => new Date(b.last_touch_at || 0) - new Date(a.last_touch_at || 0),
    };
    const inspectorList = flow.matchedProspects
      .filter((p) => sgObj.match(p))
      .sort(sorters[f.sort] || sorters.score);

    return `<div class="path-wrap">
      <section class="path-card" aria-label="Path exploration">
        <div class="path-toolbar">
          <div class="path-presets" role="tablist" aria-label="Path presets">
            ${core.PATH_PRESETS.map((pr) => `<button class="path-preset-btn ${f.preset === pr.key ? 'on' : ''}" data-preset="${attr(pr.key)}" role="tab" aria-selected="${f.preset === pr.key}">
              ${f.preset === pr.key ? `<span class="preset-dot">${icon('edit', 11)}</span>` : icon('flow', 14)}
              <span>${esc(pr.label)}</span>
            </button>`).join('')}
            ${f.steps.length < 5 ? `<button class="btn sm ghost" data-act="add-step" title="Add another step column to the path">${icon('plus', 14)} Step</button>` : ''}
          </div>
          <div class="path-tools">
            <button class="path-reset-btn" data-act="path-reset" ${canReset ? '' : 'disabled'}>Start over</button>
            <button class="icon-btn" data-act="path-undo" title="Undo path step" aria-label="Undo" ${undoStack.length ? '' : 'disabled'}>${icon('undo', 16)}</button>
            <button class="icon-btn" data-act="path-redo" title="Redo path step" aria-label="Redo" ${redoStack.length ? '' : 'disabled'}>${icon('redo', 16)}</button>
            <button class="icon-btn" data-act="export-csv" title="Export active path prospects as CSV" aria-label="Export CSV">${icon('download', 16)}</button>
          </div>
        </div>

        <div class="path-subhead">
          <div class="path-title-row">
            <span class="path-title">${hasSel ? 'Selected Path' : 'All Prospects'}</span>
            <span class="chip ${hasSel ? 'gold' : ''}">${flow.activeCount} of ${list.length} ${list.length === 1 ? 'prospect' : 'prospects'}${list.length ? ` (${pct(flow.activeCount / list.length)})` : ''}</span>
            ${hasSel ? `<div class="path-crumbs">
              ${flow.breadcrumbs.map((b) => `<button class="path-crumb" data-clear-col="${b.col}" title="Remove ${attr(b.stepLabel)} filter">
                <span>${esc(b.label)} · <b>${b.count}</b></span>
                ${icon('x', 12)}
              </button>`).join('<span class="faint">→</span>')}
            </div>` : ''}
          </div>
          <div class="row small muted">
            <span class="chip outline"><span class="dot" style="background:var(--info)"></span> ${m.contacted} contacted</span>
            <span class="chip outline"><span class="dot gold"></span> ${m.replied} replied (${pct(m.replyRate.p)})</span>
            <span class="chip outline"><span class="dot ok"></span> ${m.positive} positive (${pct(m.positiveRate.p)})</span>
            <span class="chip outline"><span class="dot ok"></span> ${m.won} won</span>
          </div>
        </div>

        ${list.length === 0 ? `<div class="empty" style="margin:18px">
          <p><b>No prospects match the current filters.</b></p>
          <div class="row" style="justify-content:center;margin-top:10px">
            ${hasActiveFilters() ? '<button class="btn primary sm" data-act="reset-filters">Clear all filters</button>' : ''}
            ${S.prospects.length === 0 && !previewSample ? '<button class="btn primary sm" data-act="toggle-preview">Preview sample flow</button>' : ''}
            <a class="btn sm" href="#add">${icon('plus', 14)} Add prospects</a>
          </div>
        </div>` : `
        <div class="path-scroll">
          <div class="path-inner" style="width:${flow.svgWidth}px">
            <div class="path-steps-head">
              ${flow.columns.map((col, idx) => `
                <div class="step-col-head">
                  <div class="step-meta">
                    <span>${esc(col.headerTitle)}</span>
                    ${idx > 0 ? icon('edit', 12) : ''}
                    ${flow.columns.length > 2 && idx > 0 ? `<button class="step-remove" data-remove-step="${idx}" title="Remove step column" aria-label="Remove Step +${idx}">×</button>` : ''}
                  </div>
                  <div class="step-box-row">
                    <div class="step-box">
                      <span class="step-ico">${icon('node', 13)}</span>
                      <select class="step-select" data-step-col="${idx}" aria-label="${attr(col.headerTitle)} dimension">
                        ${stepSelectOptions(col.dimKey)}
                      </select>
                    </div>
                    ${idx < flow.columns.length - 1 ? `<span class="step-arrow" aria-hidden="true">${icon('arrowRight', 15)}</span>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>

            <svg class="path-svg" width="${flow.svgWidth}" height="${flow.svgHeight}" viewBox="0 0 ${flow.svgWidth} ${flow.svgHeight}" role="img" aria-label="Interactive pipeline path exploration">
              <g class="path-links">
                ${flow.links.map((l) => {
                  const share = flow.columns[l.col]?.total ? pct(l.count / flow.columns[l.col].total) : '';
                  const matchNote = hasSel && l.matchedCount > 0 && l.matchedCount < l.count
                    ? ` · ${l.matchedCount} in selected path`
                    : '';
                  const tip = `${l.sourceLabel} → ${l.targetLabel} · ${plural(l.count, 'prospect')} (${share} of step)${matchNote}`;
                  const stateCls = hasSel ? (l.highlighted ? 'hi' : 'dim') : '';
                  return `<path class="path-link tone-${attr(l.tone)} ${stateCls}" d="${l.d}" data-col="${l.col}" data-src="${attr(l.sourceKey)}" data-dst="${attr(l.targetKey)}" data-tip="${attr(tip)}"/>`;
                }).join('')}
              </g>
              <g class="path-nodes">
                ${flow.columns.map((col) => col.nodes.map((n) => {
                  const hitW = col.index < flow.columns.length - 1 ? Math.min(186, flow.colStride - 24) : 190;
                  const labelX = n.x + flow.barWidth + 10;
                  const labelY = n.y + 13;
                  const countY = n.y + 30;
                  const showUpstreamMatch = hasSel && n.highlighted && !n.selected && n.matchedCount > 0 && n.matchedCount < n.count;
                  const tip = n.isMore
                    ? `Click to expand ${n.hiddenCount} more categories: ${(n.hiddenLabels || []).join(', ')}`
                    : `${n.label} · ${plural(n.count, 'prospect')} (${pct(n.shareOfCol)} of step, ${pct(n.shareOfTotal)} of total)${showUpstreamMatch ? ` · ${n.matchedCount} of ${n.count} in selected path (${pct(n.matchedCount / Math.max(1, flow.activeCount))} of path)` : ''} · Avg score ${n.avgScore}${n.dropStage ? ' · Click to branch path or drag a prospect here' : ' · Click to branch path'}`;
                  const stateCls = `${n.selected ? 'selected' : ''} ${hasSel && !n.highlighted ? 'dim' : ''}`;
                  const shortLabel = n.label.length > 23 ? `${n.label.slice(0, 22)}…` : n.label;
                  const countMarkup = showUpstreamMatch
                    ? `${n.matchedCount}<tspan class="node-of">/${n.count}</tspan> <tspan class="node-pct">${pct(n.matchedCount / Math.max(1, flow.activeCount))} of path</tspan>`
                    : `${n.count} <tspan class="node-pct">${pct(n.shareOfCol)}</tspan>`;
                  return `<g class="path-node tone-${attr(n.tone)} ${stateCls}" data-col="${col.index}" data-node="${attr(n.key)}" ${n.dropStage ? `data-drop-stage="${attr(n.dropStage)}"` : ''} data-tip="${attr(tip)}" tabindex="0" role="button" aria-pressed="${n.selected}" aria-label="${attr(`${n.label}, ${n.count} prospects`)}">
                    <rect class="node-hit" x="${n.x - 4}" y="${n.y - 3}" width="${hitW}" height="${n.slotHeight + 4}"/>
                    <rect class="node-bar" x="${n.x}" y="${n.y}" width="${flow.barWidth}" height="${n.barHeight}" rx="2"/>
                    <text class="node-label" x="${labelX}" y="${labelY}">${esc(shortLabel)}</text>
                    <text class="node-count" x="${labelX}" y="${countY}">${countMarkup}</text>
                  </g>`;
                }).join('')).join('')}
              </g>
            </svg>

            ${flow.columns.some((c) => c.canCollapse) ? `<div class="path-collapse-row">
              ${flow.columns.map((c) => `<div class="path-collapse-cell">${c.canCollapse ? `<button class="btn ghost sm" data-collapse-col="${c.index}">Show top nodes</button>` : ''}</div>`).join('')}
            </div>` : ''}
          </div>
        </div>`}
      </section>

      <section class="path-inspector" aria-label="Prospects in active path">
        <div class="path-inspector-head">
          <div class="row">
            <h2>${hasSel ? 'Prospects in selected path' : 'Prospects in pipeline'} <span class="muted small">(${inspectorList.length})</span></h2>
            ${hasSel ? `<button class="btn ghost sm" data-act="path-clear-selection">Show all (${list.length})</button>` : ''}
          </div>
          <div class="row">
            <label class="row small muted" style="gap:6px">
              <span>Sort</span>
              <select id="f-sort" aria-label="Sort prospects" style="width:auto;padding:4px 8px;font-size:.8rem">
                <option value="score" ${f.sort === 'score' ? 'selected' : ''}>Priority score</option>
                <option value="last" ${f.sort === 'last' ? 'selected' : ''}>Last touch</option>
                <option value="stage" ${f.sort === 'stage' ? 'selected' : ''}>Stage</option>
                <option value="name" ${f.sort === 'name' ? 'selected' : ''}>Agency name</option>
              </select>
            </label>
          </div>
        </div>

        <div class="path-stage-pills" role="group" aria-label="Filter cards by stage group">
          ${STAGE_GROUPS.map((g) => {
            const cnt = flow.matchedProspects.filter((p) => g.match(p)).length;
            return `<button class="stage-pill ${stageFilter === g.key ? 'on' : ''}" data-stage-filter="${g.key}" ${g.dropStage ? `data-drop-stage="${g.dropStage}"` : ''}>
              <span>${esc(g.label)}</span>
              <span class="faint num">${cnt}</span>
            </button>`;
          }).join('')}
        </div>

        ${inspectorList.length
          ? `<div class="path-cards-grid">${inspectorList.map((p) => card(p, { touchesByP, settings: data.settings, showStageSelect: true })).join('')}</div>`
          : `<div class="empty small">No prospects in this stage slice.${stageFilter !== 'all' ? ' <button class="btn ghost sm" data-stage-filter="all">Show all in path</button>' : ''}</div>`}
        <p class="hint">Click any node or ribbon in the flow diagram to branch and filter prospects. Change a prospect's stage using the pill on its card, or drag a card directly onto a stage node in the diagram.</p>
      </section>
    </div>`;
  }

  function boardView(list, data, touchesByP, hidden) {
    return `<div class="board-wrap"><div class="board">${core.STAGES.filter((s) => !hidden.includes(s.key)).map((s) => {
      const items = list.filter((p) => p.status === s.key).sort((a, b) => core.priorityScore(b).score - core.priorityScore(a).score);
      return `<div class="col" data-stage="${s.key}"><div class="col-head"><span>${esc(s.label)}</span><span class="n">${items.length}</span></div>${items.map((p) => card(p, { touchesByP, settings: data.settings })).join('')}</div>`;
    }).join('')}</div></div><p class="hint">Drag a card to another column to change its stage. On a phone, open the prospect and change the stage there.</p>`;
  }

  function listView(list, data, touchesByP) {
    const sorters = {
      score: (a, b) => core.priorityScore(b).score - core.priorityScore(a).score,
      name: (a, b) => a.agency_name.localeCompare(b.agency_name),
      stage: (a, b) => core.STAGE_KEYS.indexOf(a.status) - core.STAGE_KEYS.indexOf(b.status),
      last: (a, b) => new Date(b.last_touch_at || 0) - new Date(a.last_touch_at || 0),
    };
    const rows = [...list].sort(sorters[f.sort] || sorters.score);
    const th = (k, label, cls = '') => `<th class="${cls}"><button class="btn ghost sm" data-sort="${k}" style="padding:0;text-transform:inherit;letter-spacing:inherit;font-size:inherit;color:${f.sort === k ? 'var(--ink)' : 'inherit'}">${label}</button></th>`;
    return `<div class="card flush table-wrap"><table><thead><tr>${th('score', 'Score')}${th('name', 'Agency')}<th>Contact</th><th>Email</th><th>Location</th>${th('stage', 'Stage')}${th('last', 'Last touch')}<th>Next</th></tr></thead><tbody>
      ${rows.map((p) => {
        const na = nextAction(p, touchesByP.get(p.id) || [], data.settings);
        const sc = core.priorityScore(p).score;
        return `<tr class="clickable" data-open="${attr(p.id)}" tabindex="0" role="button" aria-label="${attr(p.agency_name)}"><td><span class="score ${sc >= 60 ? 'hi' : ''}">${sc}</span></td><td><b>${esc(p.agency_name)}</b></td><td>${esc(p.contact_name || '')}</td><td class="small">${esc(p.email || '')}</td><td>${esc(p.location || '')}</td><td><span class="chip">${esc(core.stageLabel(p.status))}</span></td><td class="small">${esc(ago(p.last_touch_at))}</td><td class="small muted">${esc(na.text)}</td></tr>`;
      }).join('')}
      </tbody></table></div>`;
  }

  async function moveProspectStage(prospectId, toStage) {
    const data = activeData();
    const p = data.prospects.find((x) => x.id === prospectId);
    if (!p || !toStage || p.status === toStage) return;
    if (data.isSample) {
      p.status = toStage;
      p.updated_at = new Date().toISOString();
      toast(`${p.agency_name} → ${core.stageLabel(toStage)} (sample preview)`);
      paint();
      return;
    }
    if (toStage === 'ready') {
      const probs = A.readinessProblems(p);
      if (probs.length) toast(`Moved, but check: ${probs.join(', ')}`, 'error');
    }
    try {
      await A.setStatus(p, toStage);
      toast(`${p.agency_name} → ${core.stageLabel(toStage)}`);
      paint();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function openProspectOrSample(prospectId) {
    const data = activeData();
    if (!data.isSample) {
      location.hash = `prospect/${prospectId}`;
      return;
    }
    const p = data.prospects.find((x) => x.id === prospectId);
    if (!p) return;
    const pTouches = data.touches.filter((t) => t.prospect_id === p.id);
    const trail = core.prospectEventTrail(p, pTouches, data.opps);
    const sc = core.priorityScore(p).score;
    dialog({
      title: `${p.agency_name} (Sample Preview)`,
      body: `<div class="stack">
        <div class="row between">
          <span class="chip gold">${esc(core.stageLabel(p.status))}</span>
          <span class="score ${sc >= 60 ? 'hi' : ''}">Score ${sc}</span>
        </div>
        ${p.personalization_hook ? `<p class="small"><b>Hook:</b> ${esc(p.personalization_hook)}</p>` : ''}
        <div class="small muted">${[p.contact_name, p.email, p.location, SEG[p.segment] || p.segment].filter(Boolean).map(esc).join(' · ')}</div>
        <div>
          <div class="label" style="margin-bottom:6px">Event trail</div>
          <div class="row">${trail.map((ev) => `<span class="chip">${esc(ev.label)}</span>`).join('<span class="faint">→</span>')}</div>
        </div>
        <div class="row end gap" style="margin-top:6px">
          <button class="btn ghost" data-close>Close</button>
          <button class="btn primary" data-demo-full>Explore full Demo</button>
        </div>
      </div>`,
      onMount: (dlg, close) => {
        dlg.querySelector('[data-demo-full]')?.addEventListener('click', () => {
          close(true);
          startDemo();
        });
      },
    });
  }

  function handleNodeActivate(colIdx, nodeKey) {
    pushUndo();
    if (nodeKey.startsWith('__more__:')) {
      expandedCols.add(colIdx);
      return paint();
    }
    if (selectedPath[colIdx] === nodeKey) {
      delete selectedPath[colIdx];
      for (const k of Object.keys(selectedPath)) if (Number(k) > colIdx) delete selectedPath[k];
    } else {
      selectedPath[colIdx] = nodeKey;
      for (const k of Object.keys(selectedPath)) if (Number(k) > colIdx) delete selectedPath[k];
    }
    paint();
  }

  paint();
  const persist = () => { syncSession(); save(f); paint(); };

  el.addEventListener('mousemove', (e) => {
    const t = e.target.closest('[data-tip]');
    if (!t) {
      removeTip();
      clearHover();
      return;
    }
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'tooltip';
      document.body.append(tip);
    }
    tip.textContent = t.dataset.tip;
    tip.style.left = `${Math.max(8, Math.min(window.innerWidth - 260, e.clientX + 12))}px`;
    tip.style.top = `${Math.max(8, Math.min(window.innerHeight - 68, e.clientY + 14))}px`;

    clearHover();
    const nodeEl = t.closest('.path-node');
    if (nodeEl) {
      const col = Number(nodeEl.dataset.col);
      const key = nodeEl.dataset.node;
      nodeEl.classList.add('hover');
      el.querySelectorAll('.path-link').forEach((lk) => {
        const lkCol = Number(lk.dataset.col);
        if (lkCol === col && lk.dataset.src === key) {
          lk.classList.add('hover');
          el.querySelectorAll(`.path-node[data-col="${col + 1}"]`).forEach((n) => {
            if (n.dataset.node === lk.dataset.dst) n.classList.add('hover');
          });
        } else if (lkCol === col - 1 && lk.dataset.dst === key) {
          lk.classList.add('hover');
          el.querySelectorAll(`.path-node[data-col="${col - 1}"]`).forEach((n) => {
            if (n.dataset.node === lk.dataset.src) n.classList.add('hover');
          });
        }
      });
      return;
    }
    const linkEl = t.closest('.path-link');
    if (linkEl) {
      const col = Number(linkEl.dataset.col);
      linkEl.classList.add('hover');
      el.querySelectorAll(`.path-node[data-col="${col}"]`).forEach((n) => {
        if (n.dataset.node === linkEl.dataset.src) n.classList.add('hover');
      });
      el.querySelectorAll(`.path-node[data-col="${col + 1}"]`).forEach((n) => {
        if (n.dataset.node === linkEl.dataset.dst) n.classList.add('hover');
      });
    }
  });
  el.addEventListener('mouseleave', () => {
    removeTip();
    clearHover();
  });

  el.addEventListener('input', (e) => {
    if (e.target.id === 'f-q') {
      f.q = e.target.value;
      save(f);
      const pos = e.target.selectionStart;
      paint();
      const q = el.querySelector('#f-q');
      if (q) { q.focus(); q.setSelectionRange(pos, pos); }
    }
  });

  el.addEventListener('change', (e) => {
    const stageSel = e.target.closest('[data-stage-select]');
    if (stageSel) {
      e.stopPropagation();
      moveProspectStage(stageSel.dataset.stageSelect, stageSel.value);
      return;
    }
    const stepCol = e.target.closest('[data-step-col]');
    if (stepCol) {
      const idx = Number(stepCol.dataset.stepCol);
      pushUndo();
      f.steps[idx] = stepCol.value;
      f.preset = 'custom';
      delete selectedPath[idx];
      expandedCols.delete(idx);
      return persist();
    }
    const id = e.target.id;
    if (id === 'f-closed') f.hideClosed = e.target.checked;
    else if (id === 'f-sort') f.sort = e.target.value;
    else if (id && id.startsWith('f-') && id !== 'f-q') f[id.slice(2)] = e.target.value;
    else return;
    persist();
  });

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-stage-select]') || e.target.closest('[data-step-col]')) return;
    removeTip();

    const v = e.target.closest('[data-view]');
    if (v) { f.view = v.dataset.view; return persist(); }

    const pr = e.target.closest('[data-preset]');
    if (pr) {
      const found = core.PATH_PRESETS.find((x) => x.key === pr.dataset.preset);
      if (found) {
        pushUndo();
        f.preset = found.key;
        f.steps = [...found.steps];
        selectedPath = {};
        expandedCols.clear();
        return persist();
      }
    }

    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'path-reset') {
      const hasSel = Object.keys(selectedPath).length > 0;
      if (!hasSel && expandedCols.size === 0 && stageFilter === 'all' && f.preset !== 'custom') return;
      pushUndo();
      selectedPath = {};
      expandedCols.clear();
      stageFilter = 'all';
      if (f.preset === 'custom') {
        f.preset = defaultPreset.key;
        f.steps = [...defaultPreset.steps];
      }
      return persist();
    }
    if (act === 'path-clear-selection') {
      if (Object.keys(selectedPath).length === 0) return;
      pushUndo();
      selectedPath = {};
      stageFilter = 'all';
      return paint();
    }
    if (act === 'path-undo' && undoStack.length) {
      redoStack.push(snapshot());
      applySnapshot(undoStack.pop());
      return persist();
    }
    if (act === 'path-redo' && redoStack.length) {
      undoStack.push(snapshot());
      applySnapshot(redoStack.pop());
      return persist();
    }
    if (act === 'add-step' && f.steps.length < 5) {
      pushUndo();
      const used = new Set(f.steps);
      const nextDim = core.PATH_DIMENSIONS.find((d) => !used.has(d.key)) || core.PATH_DIMENSIONS[3];
      f.steps.push(nextDim.key);
      f.preset = 'custom';
      return persist();
    }
    if (act === 'reset-filters') {
      f.q = ''; f.type = ''; f.segment = ''; f.location = ''; f.language = ''; f.tag = '';
      selectedPath = {};
      return persist();
    }
    if (act === 'toggle-preview') {
      previewSample = !previewSample;
      selectedPath = {};
      return paint();
    }
    if (act === 'switch-demo') {
      startDemo();
      return;
    }
    if (act === 'export-csv' && lastFlow) {
      const cols = ['agency_name', 'contact_name', 'email', 'website', 'location', 'segment', 'type', 'language', 'status', 'priority_score'];
      download(`dorogo_pipeline_path_${new Date().toISOString().slice(0, 10)}.csv`, core.toCSV(lastFlow.matchedProspects, cols), 'text/csv');
      return;
    }

    const rmStep = e.target.closest('[data-remove-step]');
    if (rmStep && f.steps.length > 2) {
      const idx = Number(rmStep.dataset.removeStep);
      pushUndo();
      f.steps.splice(idx, 1);
      f.preset = 'custom';
      const nextSelected = {};
      for (const [k, v] of Object.entries(selectedPath)) {
        const col = Number(k);
        if (col < idx) nextSelected[col] = v;
        else if (col > idx && !selectedPath[idx]) nextSelected[col - 1] = v;
      }
      selectedPath = nextSelected;
      const nextExpanded = new Set();
      for (const col of expandedCols) {
        if (col < idx) nextExpanded.add(col);
        else if (col > idx) nextExpanded.add(col - 1);
      }
      expandedCols = nextExpanded;
      return persist();
    }

    const clearCol = e.target.closest('[data-clear-col]');
    if (clearCol) {
      pushUndo();
      const col = Number(clearCol.dataset.clearCol);
      delete selectedPath[col];
      return paint();
    }

    const collapseCol = e.target.closest('[data-collapse-col]');
    if (collapseCol) {
      pushUndo();
      expandedCols.delete(Number(collapseCol.dataset.collapseCol));
      return paint();
    }

    const sgBtn = e.target.closest('[data-stage-filter]');
    if (sgBtn) {
      stageFilter = sgBtn.dataset.stageFilter;
      return paint();
    }

    const nodeEl = e.target.closest('.path-node');
    if (nodeEl) {
      handleNodeActivate(Number(nodeEl.dataset.col), nodeEl.dataset.node);
      return;
    }

    const linkEl = e.target.closest('.path-link');
    if (linkEl) {
      const col = Number(linkEl.dataset.col);
      const src = linkEl.dataset.src;
      const dst = linkEl.dataset.dst;
      pushUndo();
      if (!src.startsWith('__more__:') && !dst.startsWith('__more__:') && selectedPath[col] === src && selectedPath[col + 1] === dst) {
        delete selectedPath[col];
        delete selectedPath[col + 1];
        for (const k of Object.keys(selectedPath)) if (Number(k) > col + 1) delete selectedPath[k];
      } else {
        if (src.startsWith('__more__:')) expandedCols.add(col);
        else selectedPath[col] = src;
        if (dst.startsWith('__more__:')) expandedCols.add(col + 1);
        else selectedPath[col + 1] = dst;
        for (const k of Object.keys(selectedPath)) if (Number(k) > col + 1) delete selectedPath[k];
      }
      return paint();
    }

    const s = e.target.closest('[data-sort]');
    if (s) { f.sort = s.dataset.sort; return persist(); }

    const row = e.target.closest('[data-open]');
    if (row) {
      openProspectOrSample(row.dataset.open);
      return;
    }

    const c = e.target.closest('.pcard');
    if (c) {
      openProspectOrSample(c.dataset.id);
    }
  });

  el.addEventListener('keydown', (e) => {
    if (e.target.closest('[data-stage-select]') || e.target.closest('[data-step-col]')) return;
    const nodeEl = e.target.closest('.path-node');
    if (nodeEl && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleNodeActivate(Number(nodeEl.dataset.col), nodeEl.dataset.node);
      return;
    }
    const row = e.target.closest('[data-open]');
    if (row && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openProspectOrSample(row.dataset.open);
      return;
    }
    const c = e.target.closest('.pcard');
    if (c && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openProspectOrSample(c.dataset.id);
    }
  });

  // Drag and drop: onto Board columns, Flow SVG stage nodes, or Flow stage-group pills.
  let dragId = null;
  el.addEventListener('dragstart', (e) => {
    const c = e.target.closest('.pcard');
    if (!c) return;
    dragId = c.dataset.id;
    c.classList.add('dragging');
    el.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
  });
  el.addEventListener('dragend', (e) => {
    dragId = null;
    el.classList.remove('is-dragging');
    e.target.closest('.pcard')?.classList.remove('dragging');
    el.querySelectorAll('.col.drop, .stage-pill.drop, .path-node.drop-hover').forEach((x) => {
      x.classList.remove('drop', 'drop-hover');
    });
  });
  el.addEventListener('dragover', (e) => {
    if (!dragId) return;
    const col = e.target.closest('.col');
    const node = e.target.closest('.path-node[data-drop-stage]');
    const pill = e.target.closest('.stage-pill[data-drop-stage]');
    if (!col && !node && !pill) return;
    e.preventDefault();
    el.querySelectorAll('.col.drop, .stage-pill.drop, .path-node.drop-hover').forEach((x) => {
      if (x !== col && x !== node && x !== pill) x.classList.remove('drop', 'drop-hover');
    });
    if (col) col.classList.add('drop');
    if (node) node.classList.add('drop-hover');
    if (pill) pill.classList.add('drop');
  });
  el.addEventListener('drop', async (e) => {
    if (!dragId) return;
    const col = e.target.closest('.col');
    const node = e.target.closest('.path-node[data-drop-stage]');
    const pill = e.target.closest('.stage-pill[data-drop-stage]');
    const to = col?.dataset.stage || node?.dataset.dropStage || pill?.dataset.dropStage;
    const id = dragId;
    dragId = null;
    el.classList.remove('is-dragging');
    if (!to) return;
    e.preventDefault();
    await moveProspectStage(id, to);
  });

  return () => removeTip();
}
