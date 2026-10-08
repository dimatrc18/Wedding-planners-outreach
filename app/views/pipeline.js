// Pipeline: Kid-friendly 5-Step Journey Funnel + AI Research (65/100 gate), 5-Column Board, and Quick-Edit Cards.
import * as core from '../../supabase/functions/_shared/core/index.js';
import { S, insert, update, remove, api, startDemo } from '../store.js';
import { buildDemoData } from '../demo.js';
import { esc, attr, icon, ago, fmtDate, pct, plural, toast, download, dialog, confirmDialog } from '../ui.js';
import * as A from '../actions.js';

const KEY = 'dorogo-pipeline-v2';
const MIN_FIT_SCORE = 65;
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (f) => { try { localStorage.setItem(KEY, JSON.stringify(f)); } catch { /* storage blocked */ } };

const SEG = {
  boutique_local: 'Boutique local',
  high_volume_uk_us: 'High volume UK/US',
  international: 'International',
};
const TYPE = {
  planner: 'Wedding planner',
  venue: 'Villa / Venue',
  photographer: 'Photographer',
  concierge_hotel: 'Hotel concierge',
};

// Plain-English labels for every internal stage key so there is zero jargon
const PLAIN_STAGE = {
  researching: '1. Needs Info (To Check)',
  ready: '2. Ready for Email 1',
  t1_sent: '3a. Email 1 Sent (Intro)',
  t3_sent: '3b. Email 2 Sent (Follow-up)',
  t4_sent: '3c. Email 3 Sent (Final note)',
  replied: '4a. Replied!',
  rate_card_sent: '4b. Rate Card Sent',
  in_conversation: '4c. Talking / In Conversation',
  quote_requested: '4d. Quote Requested',
  fam_offered: '4e. Trial Ride Offered',
  partner_won: '5. Partner Won 🎉',
  nurture: 'Paused · Next Season',
  lost: 'Closed · Not a Fit',
  do_not_contact: 'Closed · Do Not Contact',
};

const plainStage = (st) => PLAIN_STAGE[st] || core.stageLabel(st);

// Plain-English translations for Flow diagram node labels so a 16-year-old reads it effortlessly
const PLAIN_NODE_LABEL = {
  'T1 Intro Sent': 'Email 1 Sent (Intro)',
  'T3 Follow-up Sent': 'Email 2 Sent (Follow-up)',
  'T4 Breakup Sent': 'Email 3 Sent (Final Note)',
  'T1 Drafted': 'Email 1 Drafted',
  'T1 Scheduled': 'Email 1 Scheduled',
  'T3 Drafted': 'Email 2 Drafted',
  'T3 Scheduled': 'Email 2 Scheduled',
  'T4 Drafted': 'Email 3 Drafted',
  'T4 Scheduled': 'Email 3 Scheduled',
  'Ready for T1': 'Ready for Email 1',
  'Queued for T1': 'Waiting for Email 1',
  'No T1 sent yet': 'Not Emailed Yet',
  'No Reply (After T4)': 'No Reply After 3 Emails',
  'In Sequence (Waiting)': 'Waiting for Reply',
  'Pre-Outreach (Research)': 'Not Emailed Yet (To Check)',
  'Queued for Approval': 'Ready for Email 1',
  'Ready to Mark': 'Has Info · Ready to Approve',
  'Needs Hook': 'Missing Personal Note',
  'Needs Email & Hook': 'Missing Email & Note',
  'Active Cadence (T1–T3)': 'Waiting for Reply (Email 1–2)',
  'Cadence Done (T4)': 'Finished 3 Emails',
  'FAM Offered': 'Trial Ride Offered',
  'High Priority (60+)': 'High Fit (65+/100)',
  'Medium Priority (40–59)': 'Medium Fit (40–64/100)',
  'Low Priority (<40)': 'Low Fit (<40/100)',
};

const friendlyNodeLabel = (label) => PLAIN_NODE_LABEL[label] || label;

// Friendly column titles for default presets
const FRIENDLY_COL_TITLE = {
  entry: { step: 'STEP 1', title: 'Where They Started' },
  cadence_step: { step: 'STEP 2', title: 'Last Email Sent' },
  response: { step: 'STEP 3', title: 'How They Responded' },
  stage: { step: 'STEP 4', title: 'Current Deal Stage' },
  stage_group: { step: 'STEP 4', title: 'Outcome Bucket' },
  touch_1: { step: 'ACTION 1', title: '1st Touch' },
  touch_2: { step: 'ACTION 2', title: '2nd Touch' },
  touch_3: { step: 'ACTION 3', title: '3rd Touch' },
  touch_4: { step: 'OUTCOME', title: 'Latest Step' },
  segment: { step: 'GROUP', title: 'Client Segment' },
  type: { step: 'TYPE', title: 'Partner Type' },
  location: { step: 'TOWN', title: 'Location / Town' },
  language: { step: 'LANGUAGE', title: 'Language' },
  hook_type: { step: 'NOTE', title: 'Personal Note Type' },
  variant: { step: 'SUBJECT', title: 'Email Subject Tested' },
  priority_tier: { step: 'FIT', title: 'Fit Score Tier (/100)' },
};

// The 5-Step Journey buckets that a 16-year-old understands at a glance
const JOURNEY_STEPS = [
  {
    key: 'researching',
    num: '1',
    label: 'To Check',
    sub: 'Find email & 1-line note',
    tone: 'muted',
    dropStage: 'researching',
    match: (p) => p.status === 'researching',
  },
  {
    key: 'ready',
    num: '2',
    label: 'Ready to Email',
    sub: 'Approved · drafts Email 1',
    tone: 'gold',
    dropStage: 'ready',
    match: (p) => p.status === 'ready',
  },
  {
    key: 'cadence',
    num: '3',
    label: 'Emailed (Waiting)',
    sub: 'In 3-email sequence',
    tone: 'info',
    dropStage: 't1_sent',
    match: (p) => ['t1_sent', 't2_sent', 't3_sent', 't4_sent'].includes(p.status),
  },
  {
    key: 'engaged',
    num: '4',
    label: 'Talking & Quotes',
    sub: 'Replied · send rates or quote',
    tone: 'gold',
    dropStage: 'replied',
    match: (p) => ['replied', 'rate_card_sent', 'in_conversation', 'quote_requested', 'fam_offered'].includes(p.status),
  },
  {
    key: 'won',
    num: '5',
    label: 'Won Partners',
    sub: 'Active referral partner',
    tone: 'ok',
    dropStage: 'partner_won',
    match: (p) => p.status === 'partner_won',
  },
  {
    key: 'closed',
    num: '·',
    label: 'Later / Closed',
    sub: 'Next season or declined',
    tone: 'bad',
    dropStage: 'nurture',
    match: (p) => ['nurture', 'lost', 'do_not_contact'].includes(p.status),
  },
];

const STAGE_GROUPS = [
  { key: 'all', label: 'All leads', match: () => true },
  ...JOURNEY_STEPS,
];

const PRESET_HELP = {
  outreach: {
    label: '📧 Email → Reply → Deal',
    desc: 'Shows how leads move from your first email to a reply and a confirmed partnership.',
  },
  territory: {
    label: '📍 By Town & Fit Score',
    desc: 'Shows where your leads are located (Como, Bellagio, Milan…) and how well they fit DOROGO.',
  },
  events: {
    label: '⏱️ Step-by-Step Timeline',
    desc: 'Shows the exact order of emails sent and replies received for each lead.',
  },
  segment: {
    label: '🏢 By Agency Size',
    desc: 'Compares Boutique Italian planners vs. International / UK & US agencies.',
  },
};

let sampleCache = null;
function getSampleData() {
  if (!sampleCache) sampleCache = buildDemoData();
  return sampleCache;
}

const pathSession = {
  selectedPath: {},
  expandedCols: new Set(),
  stageFilter: 'all',
  previewSample: true,
  customizeCols: false,
  detailedBoard: false,
  researchingIds: new Set(),
  batchRunning: false,
  batchStatus: '',
  undoStack: [],
  redoStack: [],
};

function nextAction(p, touchesList, settings) {
  const hasEmail = !!(p.email && String(p.email).trim());
  const hasHook = !!(p.personalization_hook && String(p.personalization_hook).trim());
  // Detect a prospect that was accidentally moved to T1/T3/T4 without an email address or sent touch
  if (['t1_sent', 't2_sent', 't3_sent', 't4_sent'].includes(p.status) && !hasEmail) {
    return {
      text: '⚠️ Marked "Email Sent" but has no email address!',
      at: null,
      canDraft: false,
      needsInfo: true,
      brokenStage: true,
    };
  }
  const st = core.sequenceState(p, touchesList, settings);
  if (st.active && st.step) {
    const friendlyStep = st.step.key === 'T1_intro'
      ? 'Email 1 (Intro)'
      : st.step.key === 'T3_followup'
        ? 'Email 2 (Follow-up)'
        : st.step.key === 'T4_breakup'
          ? 'Email 3 (Final note)'
          : st.step.label;
    return {
      text: st.pending
        ? `${friendlyStep}: ${st.pending.state === 'draft' ? 'draft waiting in Today' : 'scheduled to send'}`
        : st.blocked === 'no_email'
          ? '⚠️ Missing email address'
          : !hasHook && st.step.key === 'T1_intro'
            ? '⚠️ Missing 1-line personal note'
            : `Next up: ${friendlyStep}`,
      at: st.pending?.scheduled_at || st.dueAt,
      canDraft: !st.pending && !st.blocked && (hasHook || st.step.key !== 'T1_intro'),
      hasPendingDraft: !!st.pending,
      needsInfo: Boolean(st.blocked === 'no_email' || (!hasHook && st.step.key === 'T1_intro')),
    };
  }
  if (p.status === 'researching') {
    const probs = A.readinessProblems(p);
    return {
      text: probs.length ? `Needs: ${probs.join(' + ').toLowerCase()}` : '✓ Info complete — ready for Email 1!',
      at: null,
      canDraft: false,
      needsInfo: probs.length > 0,
      canMarkReady: probs.length === 0,
    };
  }
  if (['replied', 'rate_card_sent', 'in_conversation', 'quote_requested', 'fam_offered'].includes(p.status)) {
    return {
      text: p.status === 'replied'
        ? '💬 They replied — send Rate Card or answer'
        : p.status === 'rate_card_sent'
          ? '📄 Rate card sent — follow up on dates'
          : p.status === 'quote_requested'
            ? '💶 Quote requested — confirm booking'
            : '💬 Active conversation',
      at: null,
      canDraft: false,
      isEngaged: true,
    };
  }
  if (p.status === 'partner_won') return { text: 'Confirmed partner 🎉', at: p.reengage_at, canDraft: false };
  if (p.status === 'nurture') return { text: 'Paused until next season', at: p.nurture_until, canDraft: false };
  if (p.snoozed_until && new Date(p.snoozed_until) > new Date()) return { text: 'Snoozed', at: p.snoozed_until, canDraft: false };
  return { text: '', at: null, canDraft: false };
}

function emailProgressDots(p, pTouches) {
  if (!['t1_sent', 't2_sent', 't3_sent', 't4_sent'].includes(p.status)) return '';
  const sentSteps = new Set(
    pTouches.filter((t) => t.direction === 'out' && t.state === 'sent').map((t) => t.step_name)
  );
  const e1 = sentSteps.has('T1_intro') || ['t1_sent', 't2_sent', 't3_sent', 't4_sent'].includes(p.status);
  const e2 = sentSteps.has('T3_followup') || ['t3_sent', 't4_sent'].includes(p.status);
  const e3 = sentSteps.has('T4_breakup') || p.status === 't4_sent';
  return `<div class="pcard-progress" title="3-Email Sequence Progress">
    <span class="pstep ${e1 ? 'done' : ''}"><i></i>Email 1</span>
    <span class="pstep-line ${e2 ? 'done' : ''}"></span>
    <span class="pstep ${e2 ? 'done' : ''}"><i></i>Email 2</span>
    <span class="pstep-line ${e3 ? 'done' : ''}"></span>
    <span class="pstep ${e3 ? 'done' : ''}"><i></i>Email 3</span>
  </div>`;
}

function card(p, { touchesByP, settings, showStageSelect = true } = {}) {
  const last = p.last_touch_at;
  const pTouches = touchesByP ? (touchesByP.get(p.id) || []) : A.touchesOf(p.id);
  const na = nextAction(p, pTouches, settings || S.settings);
  const pr = core.priorityScore(p);
  const sc = pr.score;
  const isQualifiedScore = sc >= MIN_FIT_SCORE;
  const scoreTip = pr.parts?.length
    ? `Fit Score ${sc}/100 (${isQualifiedScore ? 'Qualifies ≥ 65/100' : 'Below 65/100 cutoff — run AI Research to verify'}): ${pr.parts.map((x) => `${x.label || x.why} (${x.pts > 0 ? '+' : ''}${x.pts})`).join(', ')}`
    : `Fit Score ${sc}/100`;

  const hasEmail = !!(p.email && String(p.email).trim());
  const hasHook = !!(p.personalization_hook && String(p.personalization_hook).trim());
  const cleanWeb = (p.website || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/.*$/, '');
  const webHref = p.website ? (/^https?:\/\//i.test(p.website) ? p.website : `https://${p.website}`) : '';
  const isResearchingNow = pathSession.researchingIds.has(p.id);

  let quickBtn = '';
  if (isResearchingNow) {
    quickBtn = `<button class="btn sm gold-btn" disabled>⏳ Researching…</button>`;
  } else if (na.needsInfo) {
    quickBtn = `<div class="row" style="gap:5px">
      <button class="btn sm primary" data-ai-research="${attr(p.id)}" title="Automatically find website, email, and 1-line personal note">🤖 AI Research</button>
      <button class="btn sm gold-btn" data-quick-edit="${attr(p.id)}">✏️ Fill Info</button>
    </div>`;
  } else if (na.canMarkReady) {
    quickBtn = `<button class="btn sm primary" data-mark-ready="${attr(p.id)}">✓ Approve & Draft Email 1</button>`;
  } else if (na.canDraft) {
    quickBtn = `<button class="btn sm primary" data-draft-next="${attr(p.id)}">✉️ Draft Email</button>`;
  } else if (na.hasPendingDraft) {
    quickBtn = `<a class="btn sm primary" href="#today" data-stop-card>👀 Review & Send Draft</a>`;
  } else if (na.isEngaged) {
    quickBtn = `<button class="btn sm primary" data-open="${attr(p.id)}">💬 Open & Reply</button>`;
  }

  return `<div class="pcard ${!isQualifiedScore ? 'low-score' : ''}" draggable="true" data-id="${attr(p.id)}" tabindex="0" role="button" aria-label="${attr(p.agency_name)}">
    <div class="pcard-top">
      <div class="pcard-title-wrap">
        <span class="name">${esc(p.agency_name)}</span>
        <div class="pcard-sub">
          ${p.location ? `<span>📍 ${esc(p.location)}</span>` : '<span class="muted">📍 No town</span>'}
          <span>· ${esc(TYPE[p.type] || p.type || 'Planner')}</span>
          ${p.language ? `<span class="chip">${esc((p.language || 'en').toUpperCase())}</span>` : ''}
          ${p.do_not_contact ? '<span class="chip bad">Do Not Contact</span>' : ''}
        </div>
      </div>
      <div class="row" style="gap:4px">
        <span class="score ${isQualifiedScore ? 'hi' : 'low'}" data-tip="${attr(scoreTip)}">${sc}/100</span>
        <button class="icon-btn sm" data-quick-edit="${attr(p.id)}" title="Quick edit contact info & note" aria-label="Quick edit ${attr(p.agency_name)}">${icon('edit', 14)}</button>
      </div>
    </div>

    <div class="pcard-facts">
      <div class="pcard-fact">
        <span class="fact-lbl">Contact:</span>
        ${p.contact_name ? `<b>${esc(p.contact_name)}</b>` : '<span class="muted">Team</span>'}
        ${hasEmail
          ? `<span class="fact-email" title="${attr(p.email)}">· ${esc(p.email)}</span>`
          : `<span class="chip warn" data-quick-edit="${attr(p.id)}">⚠️ No email yet</span>`}
      </div>
      ${cleanWeb ? `<div class="pcard-fact">
        <span class="fact-lbl">Website:</span>
        <a href="${attr(webHref)}" target="_blank" rel="noopener" data-stop-card class="fact-link">${esc(cleanWeb)} ↗</a>
      </div>` : `<div class="pcard-fact"><span class="fact-lbl">Website:</span><span class="muted">Not set (AI Research can find it)</span></div>`}
      <div class="pcard-fact hook-row">
        <span class="fact-lbl">Email 1 Opener:</span>
        ${hasHook
          ? `<span class="hook">“${esc(p.personalization_hook)}”</span>`
          : `<span class="chip warn" data-quick-edit="${attr(p.id)}">⚠️ Missing 1-line note</span>`}
      </div>
    </div>

    ${emailProgressDots(p, pTouches)}

    <div class="pcard-foot">
      <div class="pcard-next">
        ${na.text ? `<span class="next-txt ${na.brokenStage ? 'bad-txt' : ''}">${esc(na.text)}${na.at ? ` · <b>${esc(fmtDate(na.at))}</b>` : ''}</span>` : ''}
        <span class="muted small">${last ? `Last email activity ${esc(ago(last))}` : 'No emails sent yet'}</span>
      </div>
      <div class="pcard-actions">
        ${quickBtn}
        ${showStageSelect ? `<select class="stage-pill-select" data-stage-select="${attr(p.id)}" aria-label="Change stage for ${attr(p.agency_name)}">
          ${core.STAGES.map((s) => `<option value="${s.key}" ${p.status === s.key ? 'selected' : ''}>${esc(plainStage(s.key))}</option>`).join('')}
        </select>` : ''}
      </div>
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
    `<optgroup label="${attr(grp)}">${dims.map((d) => `<option value="${attr(d.key)}" ${d.key === selectedKey ? 'selected' : ''}>${esc(FRIENDLY_COL_TITLE[d.key]?.title || d.label)}</option>`).join('')}</optgroup>`
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
    onlyHighFit: false,
    sort: 'score',
    preset: defaultPreset.key,
    steps: [...defaultPreset.steps],
    ...saved,
  };
  if (!['flow', 'board', 'list'].includes(f.view)) f.view = 'flow';
  if (!Array.isArray(f.steps) || f.steps.length < 2) f.steps = [...defaultPreset.steps];

  let { selectedPath, expandedCols, stageFilter, previewSample, customizeCols, detailedBoard } = pathSession;
  const { undoStack, redoStack } = pathSession;
  const syncSession = () => {
    pathSession.selectedPath = selectedPath;
    pathSession.expandedCols = expandedCols;
    pathSession.stageFilter = stageFilter;
    pathSession.previewSample = previewSample;
    pathSession.customizeCols = customizeCols;
    pathSession.detailedBoard = detailedBoard;
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
    if (f.onlyHighFit && core.priorityScore(p).score < MIN_FIT_SCORE) return false;
    if (f.q) {
      const q = f.q.toLowerCase();
      if (![p.agency_name, p.contact_name, p.email, p.location, p.notes, p.personalization_hook].some((x) => (x || '').toLowerCase().includes(q))) return false;
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
      f.q = ''; f.type = ''; f.segment = ''; f.location = ''; f.language = ''; f.tag = ''; f.onlyHighFit = false;
      save(f);
    }
  }

  function hasActiveFilters() {
    return Boolean(f.q || f.type || f.segment || f.location || f.language || f.tag || f.onlyHighFit);
  }

  let lastFlow = null;
  let tip = null;
  const removeTip = () => { if (tip) { tip.remove(); tip = null; } };
  const clearHover = () => {
    el.querySelectorAll('.path-link.hover, .path-node.hover').forEach((x) => x.classList.remove('hover'));
  };

  function renderJourneyBar(list, data) {
    const missingInfoCount = data.prospects.filter((p) =>
      ['researching', 't1_sent'].includes(p.status) && (!p.email || !p.personalization_hook)
    ).length;
    const lowFitCount = data.prospects.filter((p) => core.priorityScore(p).score < MIN_FIT_SCORE).length;

    return `<div class="journey-strip" role="region" aria-label="5-Step Outreach Journey">
      <div class="journey-head">
        <div>
          <span class="journey-title">How Your Outreach Works (5 Simple Steps)</span>
          <span class="muted small"> · Click any step to filter leads, or drag a card onto a step to move it</span>
        </div>
        <div class="row" style="gap:8px">
          ${!data.isSample ? `<button class="btn sm" data-act="auto-discover-partners" title="Automatically search for new luxury wedding planners, venues &amp; hotel concierges scoring ≥ 65/100">
            🔍 Auto-Find New Partners
          </button>` : ''}
          ${missingInfoCount > 0 ? `<button class="btn sm primary" data-act="batch-ai-research" ${pathSession.batchRunning ? 'disabled' : ''}>
            ${pathSession.batchRunning ? `⏳ ${esc(pathSession.batchStatus || 'Researching…')}` : `🤖 Auto-Research ${missingInfoCount} Leads (Find Emails & Notes)`}
          </button>` : ''}
          ${lowFitCount > 0 && !data.isSample ? `<button class="btn sm ghost" data-act="purge-low-fit" title="Delete leads scoring below ${MIN_FIT_SCORE}/100">
            🧹 Remove ${lowFitCount} leads &lt; ${MIN_FIT_SCORE}/100
          </button>` : ''}
          ${stageFilter !== 'all' ? `<button class="btn ghost sm" data-stage-filter="all">${icon('x', 13)} Show all ${list.length} leads</button>` : ''}
        </div>
      </div>
      <div class="journey-steps">
        ${JOURNEY_STEPS.map((st, idx) => {
          const cnt = list.filter((p) => st.match(p)).length;
          const active = stageFilter === st.key;
          return `${idx > 0 && idx < 5 ? '<span class="journey-arrow" aria-hidden="true">→</span>' : ''}
          <button class="journey-step tone-${st.tone} ${active ? 'on' : ''}" data-stage-filter="${st.key}" data-drop-stage="${st.dropStage}" aria-pressed="${active}">
            <div class="j-top">
              <span class="j-badge">${st.num}</span>
              <span class="j-name">${esc(st.label)}</span>
              <span class="j-count">${cnt}</span>
            </div>
            <div class="j-sub">${esc(st.sub)}</div>
          </button>`;
        }).join('')}
      </div>
    </div>`;
  }

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
        <div class="label eyebrow">${list.length} of ${data.prospects.length} partners & leads${data.isSample ? ' · interactive sample preview' : ''} · Target Fit ≥ ${MIN_FIT_SCORE}/100</div>
        <h1>Partner Pipeline</h1>
      </div>
      <div class="row">
        <div class="seg" role="group" aria-label="View mode">
          <button data-view="board" class="${f.view === 'board' ? 'on' : ''}" title="5-column board view">📋 5-Step Board</button>
          <button data-view="flow" class="${f.view === 'flow' ? 'on' : ''}" title="Visual flow diagram">${icon('flow', 15)} Visual Flow</button>
          <button data-view="list" class="${f.view === 'list' ? 'on' : ''}" title="Spreadsheet table view">📑 Table</button>
        </div>
        ${!data.isSample ? `<button class="btn" data-act="auto-discover-partners">🔍 Auto-Find New Partners</button>` : ''}
        <a class="btn primary" href="#add">${icon('plus', 16)} Add Partner Lead</a>
      </div>
    </div>

    ${S.prospects.length === 0 ? `<div class="banner demo">
      ${icon('sparkle')}
      <span>${previewSample
        ? `<b>Sample pipeline preview (${data.prospects.length} demo leads).</b> Your live account (${esc(S.user?.email || 'signed in')}) has 0 leads right now, so we loaded an interactive example so you can test clicking, editing, and dragging.`
        : `<b>0 leads in your pipeline yet.</b> Add your first wedding planner or preview the sample pipeline.`}</span>
      <span class="grow"></span>
      <button class="btn sm" data-act="toggle-preview">${previewSample ? 'Show empty pipeline' : 'Show sample preview'}</button>
      <a class="btn sm primary" href="#add">${icon('plus', 14)} Add real leads</a>
    </div>` : ''}

    ${renderJourneyBar(list, data)}

    <div class="filters">
      <input type="search" id="f-q" placeholder="🔍 Search agency, person, email, villa, town…" value="${attr(f.q)}" aria-label="Search">
      <select id="f-location" aria-label="Location"><option value="">📍 All towns</option>${locations.map((l) => `<option ${f.location === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
      <select id="f-type" aria-label="Type"><option value="">All partner types</option>${Object.entries(TYPE).map(([k, v]) => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="f-segment" aria-label="Segment"><option value="">All agency sizes</option>${Object.entries(SEG).map(([k, v]) => `<option value="${k}" ${f.segment === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="f-language" aria-label="Language"><option value="">All languages</option>${['en', 'it', 'de', 'fr'].map((l) => `<option value="${l}" ${f.language === l ? 'selected' : ''}>${l.toUpperCase()}</option>`).join('')}</select>
      ${tags.length ? `<select id="f-tag" aria-label="Tag"><option value="">All tags</option>${tags.map((t) => `<option ${f.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>` : ''}
      <label class="check small" title="Hide leads scoring below 65/100"><input type="checkbox" id="f-highfit" ${f.onlyHighFit ? 'checked' : ''}> Only ≥ ${MIN_FIT_SCORE}/100 Fit</label>
      <label class="check small"><input type="checkbox" id="f-closed" ${f.hideClosed ? 'checked' : ''}> Hide Declined</label>
      ${hasActiveFilters() || stageFilter !== 'all' ? `<button class="btn ghost sm" data-act="reset-filters">${icon('x', 14)} Reset filters</button>` : ''}
    </div>

    ${f.view === 'flow'
      ? flowView(list, data, touchesByP, hidden)
      : f.view === 'board'
        ? boardView(list, data, touchesByP, hidden)
        : listView(list, data, touchesByP)}`;
  }

  function flowView(list, data, touchesByP) {
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

    const activePresetHelp = PRESET_HELP[f.preset] || {
      label: 'Custom Flow',
      desc: 'Read from left to right. Click any bar to zoom in on that group of leads.',
    };

    return `<div class="path-wrap">
      <section class="path-card" aria-label="Visual flow diagram">
        <div class="path-toolbar">
          <div class="path-presets" role="tablist" aria-label="Choose what to visualize">
            ${core.PATH_PRESETS.map((pr) => {
              const info = PRESET_HELP[pr.key] || { label: pr.label, desc: '' };
              return `<button class="path-preset-btn ${f.preset === pr.key ? 'on' : ''}" data-preset="${attr(pr.key)}" role="tab" aria-selected="${f.preset === pr.key}" title="${attr(info.desc)}">
                <span>${esc(info.label)}</span>
              </button>`;
            }).join('')}
          </div>
          <div class="path-tools">
            <button class="btn ghost sm" data-act="toggle-customize" aria-expanded="${customizeCols}">
              ⚙️ ${customizeCols ? 'Hide column settings' : 'Customize columns'}
            </button>
            ${canReset ? `<button class="path-reset-btn" data-act="path-reset">↺ Reset view</button>` : ''}
            <button class="icon-btn" data-act="export-csv" title="Download these leads as CSV spreadsheet" aria-label="Export CSV">${icon('download', 16)}</button>
          </div>
        </div>

        <div class="path-subhead">
          <div class="path-title-row">
            <span class="path-title">${hasSel ? '🔍 Zoomed-in Group' : 'All Leads in Flow'}</span>
            <span class="chip ${hasSel ? 'gold' : ''}">${flow.activeCount} of ${list.length} leads${list.length ? ` (${pct(flow.activeCount / list.length)})` : ''}</span>
            <span class="muted small">${esc(activePresetHelp.desc)}</span>
            ${hasSel ? `<div class="path-crumbs">
              ${flow.breadcrumbs.map((b) => `<button class="path-crumb" data-clear-col="${b.col}" title="Remove filter">
                <span>${esc(friendlyNodeLabel(b.label))} · <b>${b.count}</b></span>
                ${icon('x', 12)}
              </button>`).join('<span class="faint">→</span>')}
            </div>` : ''}
          </div>
          <div class="path-legend">
            <span><i class="dot" style="background:var(--path-info)"></i> Emailed (${m.contacted})</span>
            <span><i class="dot gold"></i> Replied / Ready (${m.replied} replied · ${pct(m.replyRate.p)})</span>
            <span><i class="dot ok"></i> Interested / Won (${m.won} won)</span>
          </div>
        </div>

        ${list.length === 0 ? `<div class="empty" style="margin:18px">
          <p><b>No leads match your current search or filter.</b></p>
          <div class="row" style="justify-content:center;margin-top:10px">
            ${hasActiveFilters() || stageFilter !== 'all' ? '<button class="btn primary sm" data-act="reset-filters">Clear all filters</button>' : ''}
            ${S.prospects.length === 0 && !previewSample ? '<button class="btn primary sm" data-act="toggle-preview">Show sample preview</button>' : ''}
            <a class="btn sm" href="#add">${icon('plus', 14)} Add leads</a>
          </div>
        </div>` : `
        <div class="path-scroll">
          <div class="path-inner" style="width:${flow.svgWidth}px">
            <div class="path-steps-head">
              ${flow.columns.map((col, idx) => {
                const friendly = FRIENDLY_COL_TITLE[col.dimKey] || { step: `STEP ${idx + 1}`, title: col.label };
                return `
                <div class="step-col-head">
                  <div class="step-meta">
                    <span>${esc(friendly.step)}</span>
                    ${customizeCols && flow.columns.length > 2 && idx > 0 ? `<button class="step-remove" data-remove-step="${idx}" title="Remove column" aria-label="Remove column">×</button>` : ''}
                  </div>
                  <div class="step-box-row">
                    ${customizeCols ? `
                      <div class="step-box">
                        <span class="step-ico">${icon('node', 13)}</span>
                        <select class="step-select" data-step-col="${idx}" aria-label="${attr(friendly.title)}">
                          ${stepSelectOptions(col.dimKey)}
                        </select>
                      </div>
                    ` : `
                      <div class="step-box static">
                        <span class="step-static-title">${esc(friendly.title)}</span>
                      </div>
                    `}
                    ${idx < flow.columns.length - 1 ? `<span class="step-arrow" aria-hidden="true">${icon('arrowRight', 15)}</span>` : ''}
                  </div>
                </div>`;
              }).join('')}
              ${customizeCols && f.steps.length < 5 ? `<div style="padding-bottom:4px"><button class="btn sm ghost" data-act="add-step">${icon('plus', 14)} Add Column</button></div>` : ''}
            </div>

            <svg class="path-svg" width="${flow.svgWidth}" height="${flow.svgHeight}" viewBox="0 0 ${flow.svgWidth} ${flow.svgHeight}" role="img" aria-label="Interactive pipeline flow">
              <g class="path-links">
                ${flow.links.map((l) => {
                  const share = flow.columns[l.col]?.total ? pct(l.count / flow.columns[l.col].total) : '';
                  const srcName = friendlyNodeLabel(l.sourceLabel);
                  const dstName = friendlyNodeLabel(l.targetLabel);
                  const tipText = `${srcName} → ${dstName}: ${plural(l.count, 'lead')} (${share})`;
                  const stateCls = hasSel ? (l.highlighted ? 'hi' : 'dim') : '';
                  return `<path class="path-link tone-${attr(l.tone)} ${stateCls}" d="${l.d}" data-col="${l.col}" data-src="${attr(l.sourceKey)}" data-dst="${attr(l.targetKey)}" data-tip="${attr(tipText)}"/>`;
                }).join('')}
              </g>
              <g class="path-nodes">
                ${flow.columns.map((col) => col.nodes.map((n) => {
                  const hitW = col.index < flow.columns.length - 1 ? Math.min(186, flow.colStride - 24) : 190;
                  const labelX = n.x + flow.barWidth + 10;
                  const labelY = n.y + 13;
                  const countY = n.y + 30;
                  const niceLabel = friendlyNodeLabel(n.label);
                  const showUpstreamMatch = hasSel && n.highlighted && !n.selected && n.matchedCount > 0 && n.matchedCount < n.count;
                  const tipText = n.isMore
                    ? `Click to show ${n.hiddenCount} more groups: ${(n.hiddenLabels || []).join(', ')}`
                    : `${niceLabel}: ${plural(n.count, 'lead')} (${pct(n.shareOfCol)} of column) · Avg Fit Score ${n.avgScore}/100 · Click to filter cards below`;
                  const stateCls = `${n.selected ? 'selected' : ''} ${hasSel && !n.highlighted ? 'dim' : ''}`;
                  const shortLabel = niceLabel.length > 23 ? `${niceLabel.slice(0, 22)}…` : niceLabel;
                  const countMarkup = showUpstreamMatch
                    ? `${n.matchedCount}<tspan class="node-of">/${n.count}</tspan> <tspan class="node-pct">${pct(n.matchedCount / Math.max(1, flow.activeCount))}</tspan>`
                    : `${n.count} <tspan class="node-pct">${pct(n.shareOfCol)}</tspan>`;
                  return `<g class="path-node tone-${attr(n.tone)} ${stateCls}" data-col="${col.index}" data-node="${attr(n.key)}" ${n.dropStage ? `data-drop-stage="${attr(n.dropStage)}"` : ''} data-tip="${attr(tipText)}" tabindex="0" role="button" aria-pressed="${n.selected}" aria-label="${attr(`${niceLabel}, ${n.count} leads`)}">
                    <rect class="node-hit" x="${n.x - 4}" y="${n.y - 3}" width="${hitW}" height="${n.slotHeight + 4}"/>
                    <rect class="node-bar" x="${n.x}" y="${n.y}" width="${flow.barWidth}" height="${n.barHeight}" rx="2"/>
                    <text class="node-label" x="${labelX}" y="${labelY}">${esc(shortLabel)}</text>
                    <text class="node-count" x="${labelX}" y="${countY}">${countMarkup}</text>
                  </g>`;
                }).join('')).join('')}
              </g>
            </svg>

            ${flow.columns.some((c) => c.canCollapse) ? `<div class="path-collapse-row">
              ${flow.columns.map((c) => `<div class="path-collapse-cell">${c.canCollapse ? `<button class="btn ghost sm" data-collapse-col="${c.index}">Collapse list</button>` : ''}</div>`).join('')}
            </div>` : ''}
          </div>
        </div>`}
      </section>

      <section class="path-inspector" aria-label="Lead cards">
        <div class="path-inspector-head">
          <div>
            <div class="row">
              <h2>${hasSel || stageFilter !== 'all' ? 'Matching Partner Leads' : 'Partner Leads in Pipeline'} <span class="muted small">(${inspectorList.length})</span></h2>
              ${hasSel || stageFilter !== 'all' ? `<button class="btn ghost sm" data-act="path-clear-selection">Show all (${list.length})</button>` : ''}
            </div>
            <div class="small muted">Each card shows the partner's Fit Score out of 100 (target ≥ ${MIN_FIT_SCORE}/100), contact info, and the next action.</div>
          </div>
          <div class="row">
            <label class="row small muted" style="gap:6px">
              <span>Sort by</span>
              <select id="f-sort" aria-label="Sort prospects" style="width:auto;padding:4px 8px;font-size:.8rem">
                <option value="score" ${f.sort === 'score' ? 'selected' : ''}>★ Best Fit Score (/100)</option>
                <option value="last" ${f.sort === 'last' ? 'selected' : ''}>🕒 Recent Activity</option>
                <option value="stage" ${f.sort === 'stage' ? 'selected' : ''}>📊 Pipeline Step</option>
                <option value="name" ${f.sort === 'name' ? 'selected' : ''}>🔤 Agency Name (A–Z)</option>
              </select>
            </label>
          </div>
        </div>

        ${inspectorList.length
          ? `<div class="path-cards-grid">${inspectorList.map((p) => card(p, { touchesByP, settings: data.settings, showStageSelect: true })).join('')}</div>`
          : `<div class="empty small">No leads in this step right now.${stageFilter !== 'all' || hasSel ? ' <button class="btn ghost sm" data-act="path-clear-selection">Show all leads</button>' : ''}</div>`}
      </section>
    </div>`;
  }

  function boardView(list, data, touchesByP, hidden) {
    const sgObj = STAGE_GROUPS.find((g) => g.key === stageFilter) || STAGE_GROUPS[0];
    const filteredList = stageFilter === 'all' ? list : list.filter((p) => sgObj.match(p));

    if (!detailedBoard) {
      const cols = f.hideClosed ? JOURNEY_STEPS.slice(0, 5) : JOURNEY_STEPS;
      return `<div class="stack">
        <div class="row between">
          <span class="small muted">💡 Drag any lead card from one column to the next, or click <b>🤖 AI Research</b> / <b>✓ Approve & Draft Email 1</b> on a card.</span>
          <button class="btn ghost sm" data-act="toggle-board-detail">Show all 13 detailed stages</button>
        </div>
        <div class="board-wrap">
          <div class="board simple-board">
            ${cols.map((b) => {
              const items = filteredList.filter((p) => b.match(p)).sort((a, c) => core.priorityScore(c).score - core.priorityScore(a).score);
              return `<div class="col tone-${b.tone}" data-stage="${b.dropStage}">
                <div class="col-head">
                  <div>
                    <span class="j-badge">${b.num}</span>
                    <span>${esc(b.label)}</span>
                  </div>
                  <span class="n">${items.length}</span>
                </div>
                <div class="col-sub">${esc(b.sub)}</div>
                ${items.map((p) => card(p, { touchesByP, settings: data.settings, showStageSelect: true })).join('')}
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
    }

    return `<div class="stack">
      <div class="row between">
        <span class="small muted">Showing all detailed sub-stages. Drag any card between columns.</span>
        <button class="btn ghost sm" data-act="toggle-board-detail">Switch to Simple 5-Step Board</button>
      </div>
      <div class="board-wrap"><div class="board">${core.STAGES.filter((s) => !hidden.includes(s.key)).map((s) => {
        const items = filteredList.filter((p) => p.status === s.key).sort((a, b) => core.priorityScore(b).score - core.priorityScore(a).score);
        return `<div class="col" data-stage="${s.key}"><div class="col-head"><span>${esc(plainStage(s.key))}</span><span class="n">${items.length}</span></div>${items.map((p) => card(p, { touchesByP, settings: data.settings, showStageSelect: false })).join('')}</div>`;
      }).join('')}</div></div>
    </div>`;
  }

  function listView(list, data, touchesByP) {
    const sgObj = STAGE_GROUPS.find((g) => g.key === stageFilter) || STAGE_GROUPS[0];
    const filteredList = stageFilter === 'all' ? list : list.filter((p) => sgObj.match(p));
    const sorters = {
      score: (a, b) => core.priorityScore(b).score - core.priorityScore(a).score,
      name: (a, b) => a.agency_name.localeCompare(b.agency_name),
      stage: (a, b) => core.STAGE_KEYS.indexOf(a.status) - core.STAGE_KEYS.indexOf(b.status),
      last: (a, b) => new Date(b.last_touch_at || 0) - new Date(a.last_touch_at || 0),
    };
    const rows = [...filteredList].sort(sorters[f.sort] || sorters.score);
    const th = (k, label, cls = '') => `<th class="${cls}"><button class="btn ghost sm" data-sort="${k}" style="padding:0;text-transform:inherit;letter-spacing:inherit;font-size:inherit;color:${f.sort === k ? 'var(--ink)' : 'inherit'}">${label}</button></th>`;
    return `<div class="card flush table-wrap"><table><thead><tr>${th('score', 'Fit Score')}${th('name', 'Agency')}<th>Contact Person</th><th>Email</th><th>Town</th><th>Email 1 Opener (Hook)</th>${th('stage', 'Current Step')}${th('last', 'Last Activity')}<th>Next Step</th><th>Actions</th></tr></thead><tbody>
      ${rows.map((p) => {
        const na = nextAction(p, touchesByP.get(p.id) || [], data.settings);
        const sc = core.priorityScore(p).score;
        return `<tr class="clickable" data-open="${attr(p.id)}" tabindex="0" role="button" aria-label="${attr(p.agency_name)}">
          <td><span class="score ${sc >= MIN_FIT_SCORE ? 'hi' : 'low'}">${sc}/100</span></td>
          <td><b>${esc(p.agency_name)}</b><div class="small muted">${esc(TYPE[p.type] || p.type || 'Planner')}</div></td>
          <td>${esc(p.contact_name || '—')}</td>
          <td class="small">${p.email ? esc(p.email) : '<span class="chip warn">Missing email</span>'}</td>
          <td>${esc(p.location || '—')}</td>
          <td class="small" style="max-width:220px">${p.personalization_hook ? `“${esc(p.personalization_hook)}”` : '<span class="chip warn">Missing note</span>'}</td>
          <td><span class="chip">${esc(plainStage(p.status))}</span></td>
          <td class="small">${esc(ago(p.last_touch_at))}</td>
          <td class="small muted">${esc(na.text)}</td>
          <td>
            <div class="row" style="gap:4px">
              ${!p.email || !p.personalization_hook ? `<button class="btn sm primary" data-ai-research="${attr(p.id)}">🤖 AI</button>` : ''}
              <button class="btn ghost sm" data-quick-edit="${attr(p.id)}">${icon('edit', 13)} Edit</button>
            </div>
          </td>
        </tr>`;
      }).join('')}
      </tbody></table></div>`;
  }

  async function fetchJinaStorySignals(targetUrl) {
    if (!targetUrl) return null;
    try {
      const cleanUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
      const r = await fetch(`https://r.jina.ai/${cleanUrl}`, { signal: AbortSignal.timeout(6500) });
      if (!r.ok) return null;
      let md = await r.text();
      // If the page links to a /real-weddings or /portfolio subpage, read that too for real couple names & stories
      const subMatch = md.match(/https?:\/\/[^\s)]+\/(?:real-weddings|portfolio|weddings|stories|about-me|about)\/?/i);
      if (subMatch && core.domainOf(subMatch[0]) === core.domainOf(cleanUrl)) {
        try {
          const r2 = await fetch(`https://r.jina.ai/${subMatch[0]}`, { signal: AbortSignal.timeout(5500) });
          if (r2.ok) md += `\n${await r2.text()}`;
        } catch { /* ignore subpage timeout */ }
      }
      const emails = core.extractEmails(md);
      const venues = core.LAKE_VENUES.filter((v) => md.toLowerCase().includes(v.name.toLowerCase())).map((v) => v.name);
      const towns = core.LAKE_TOWNS.filter((t) => new RegExp(`\\b${t.toLowerCase()}\\b`, 'i').test(md));
      const story = core.extractUniqueStorySignals(md);
      return { emails, venues, towns, story };
    } catch {
      return null;
    }
  }

  async function researchSingleProspect(prospectId, { silent = false } = {}) {
    const data = activeData();
    const p = data.prospects.find((x) => x.id === prospectId);
    if (!p) return null;
    if (data.isSample) {
      toast('Switch to your live account to run AI website research.');
      return null;
    }
    pathSession.researchingIds.add(p.id);
    paint();
    try {
      const seed = core.resolveProspectResearchSeed(p);
      const targetUrl = p.website || seed.website || seed.guessedUrl || '';
      const [r, jina] = await Promise.all([
        targetUrl ? api('enrich', {
          url: targetUrl,
          agency_name: p.agency_name,
          location: p.location || seed.location || '',
          segment: p.segment || seed.segment || '',
          type: p.type || 'planner',
          rating: p.rating || seed.rating,
          verified_reviews_count: p.verified_reviews_count || seed.verified_reviews_count,
          prospect_id: p.id,
        }).catch(() => null) : Promise.resolve(null),
        fetchJinaStorySignals(targetUrl),
      ]);

      const s = { ...seed, ...(r?.suggestions || {}) };
      const patch = {};
      if ((s.website || seed.website) && !p.website) patch.website = s.website || seed.website;
      const bestEmail = s.email || jina?.emails?.[0] || '';
      if (bestEmail && !p.email) { patch.email = bestEmail; patch.email_status = s.email_status || 'unknown'; }
      if (s.phone && !p.phone) patch.phone = s.phone;
      if (s.whatsapp && !p.whatsapp) patch.whatsapp = s.whatsapp;
      const bestContact = s.contact_name || jina?.story?.founderName || '';
      if (bestContact && !p.contact_name) patch.contact_name = bestContact;
      const bestLoc = s.location || jina?.towns?.[0] || '';
      if (bestLoc && !p.location) patch.location = bestLoc;
      if (s.language && !p.language) patch.language = s.language;
      if (s.segment && !p.segment) patch.segment = s.segment;
      if (seed.rating && !p.rating) patch.rating = seed.rating;
      if (seed.verified_reviews_count && !p.verified_reviews_count) patch.verified_reviews_count = seed.verified_reviews_count;
      const combinedVenues = [...new Set([...(p.key_venues || []), ...(s.key_venues || []), ...(jina?.venues || [])])];
      if (combinedVenues.length) patch.key_venues = combinedVenues;

      const preHookProspect = { ...p, ...patch };
      const hookText = r?.suggestions?.personalization_hook || core.buildVerifiedFallbackHook(preHookProspect, jina?.story);
      if (hookText && (!p.personalization_hook || seed.personalization_hook)) {
        patch.personalization_hook = hookText;
        patch.hook_type = s.hook_type || (jina?.story?.couples?.length ? 'event' : preHookProspect.key_venues?.length ? 'venue' : 'aesthetic');
        patch.hook_confidence = s.hook_confidence || 'high';
        patch.hook_needs_review = false;
        patch.hook_source_url = s.hook_source_url || patch.website || p.website || null;
      }

      const mergedProspect = { ...p, ...patch };
      const newScore = core.priorityScore(mergedProspect).score;
      patch.priority_score = newScore;

      // If it now has email + hook and meets the 65/100 threshold, mark Ready and draft Email 1!
      const nowReady = Boolean(mergedProspect.email && mergedProspect.personalization_hook && newScore >= MIN_FIT_SCORE);
      if (nowReady && ['researching', 't1_sent'].includes(p.status) && A.touchesOf(p.id).length === 0) {
        patch.status = 'ready';
      }

      if (Object.keys(patch).length > 0) {
        await update('prospects', p.id, patch);
      }

      const updatedP = S.prospects.find((x) => x.id === p.id) || mergedProspect;
      if (updatedP.status === 'ready' && A.touchesOf(p.id).length === 0) {
        await A.draftNextStep(updatedP);
      }

      if (!silent) {
        if (nowReady) {
          toast(`✓ ${p.agency_name} researched (${newScore}/100) → Ready & Email 1 drafted!`);
        } else if (mergedProspect.email) {
          toast(`Found email (${mergedProspect.email}) · Score ${newScore}/100`);
        } else {
          toast(`Checked ${p.agency_name} (${newScore}/100) — no public email found on site.`, 'error');
        }
      }
      return { prospect: updatedP, score: newScore, nowReady };
    } catch (err) {
      if (!silent) toast(`${p.agency_name}: ${err.message}`, 'error');
      return { prospect: p, score: core.priorityScore(p).score, error: err.message };
    } finally {
      pathSession.researchingIds.delete(p.id);
      paint();
    }
  }

  async function runBatchAiResearch() {
    const data = activeData();
    if (data.isSample || pathSession.batchRunning) return;
    const targets = data.prospects.filter((p) =>
      ['researching', 't1_sent'].includes(p.status) && (!p.email || !p.personalization_hook)
    );
    if (!targets.length) {
      toast('All leads already have emails and personal notes!');
      return;
    }
    pathSession.batchRunning = true;
    let readyCount = 0;
    let foundEmails = 0;
    try {
      for (let i = 0; i < targets.length; i++) {
        const p = targets[i];
        pathSession.batchStatus = `Researching ${i + 1}/${targets.length}: ${p.agency_name}…`;
        paint();
        const res = await researchSingleProspect(p.id, { silent: true });
        if (res?.nowReady) readyCount++;
        if (res?.prospect?.email) foundEmails++;
      }
      const lowRemaining = S.prospects.filter((p) => core.priorityScore(p).score < MIN_FIT_SCORE).length;
      toast(`✓ AI Research finished: ${foundEmails} emails found, ${readyCount} moved to Ready for Email 1!${lowRemaining ? ` (${lowRemaining} leads scored < ${MIN_FIT_SCORE}/100)` : ''}`);
    } finally {
      pathSession.batchRunning = false;
      pathSession.batchStatus = '';
      paint();
    }
  }

  async function purgeLowFitProspects() {
    const low = S.prospects.filter((p) => core.priorityScore(p).score < MIN_FIT_SCORE);
    if (!low.length) return;
    const ok = await confirmDialog({
      title: `Remove ${low.length} leads below ${MIN_FIT_SCORE}/100?`,
      body: `This will permanently delete ${low.length} leads scoring under ${MIN_FIT_SCORE}/100 (${low.slice(0, 5).map((p) => `${p.agency_name} · ${core.priorityScore(p).score}/100`).join(', ')}${low.length > 5 ? '…' : ''}). Tip: Run "🤖 Auto-Research" first if you haven't checked their websites yet!`,
      okText: `Delete ${low.length} low-fit leads`,
      danger: true,
    });
    if (!ok) return;
    for (const p of low) {
      await remove('prospects', p.id);
    }
    toast(`Removed ${low.length} leads below ${MIN_FIT_SCORE}/100`);
    paint();
  }

  function openAutoDiscoverModal() {
    dialog({
      title: '🔍 AI Partner Auto-Discovery (Self-Searching Engine)',
      wide: true,
      body: `<form id="ad-form" class="stack">
        <div class="banner" style="margin-bottom:4px">
          <span>🤖 <b>How Auto-Discovery works:</b> The engine scans luxury wedding planners, villas, and 5★ hotel concierges around Lake Como &amp; Milan, reads their <b>Real Weddings / Portfolio / Social stories</b> via Jina Reader, writes a warm personal 1-line opener, <b>discards anyone scoring under ${MIN_FIT_SCORE}/100</b>, and adds the winners directly to <b>Ready for Email 1</b>.</span>
        </div>
        <div class="grid-3">
          <label class="field"><span>Partner Category</span>
            <select name="category">
              <option value="all">All Luxury Partners (Planners, Villas &amp; 5★ Hotels)</option>
              <option value="planner">Wedding Planners Only</option>
              <option value="venue">Luxury Villas &amp; Private Estates Only</option>
              <option value="concierge_hotel">5★ Hotel Concierges Only</option>
            </select>
          </label>
          <label class="field"><span>Target Region</span>
            <select name="region">
              <option value="all">Lake Como &amp; Milan (All Towns)</option>
              <option value="como">Lake Como Only (Como, Bellagio, Tremezzina, Varenna…)</option>
              <option value="milan">Milan Only</option>
            </select>
          </label>
          <label class="field"><span>Minimum Fit Score Cutoff</span>
            <select name="min_score">
              <option value="65" selected>≥ 65/100 (Recommended Quality Gate)</option>
              <option value="75">≥ 75/100 (High Priority Only)</option>
              <option value="85">≥ 85/100 (Top Boutique Tier Only)</option>
            </select>
          </label>
        </div>
        <label class="field">
          <span>Optional: Paste extra Website or Portfolio URLs to scan live (one per line)</span>
          <textarea name="custom_urls" rows="3" placeholder="https://www.exampleweddingplanner.com&#10;Or leave blank to automatically search &amp; import verified Lake Como / Milan luxury partners not yet in your pipeline…"></textarea>
        </label>
        <label class="check small">
          <input type="checkbox" name="auto_draft" checked>
          Automatically mark imported partners (≥ 65/100) as <b>Ready for Email 1</b> and generate their Email 1 draft
        </label>
        <div id="ad-status" class="small muted"></div>
        <div class="row between" style="margin-top:8px">
          <span class="tiny faint">Tip: You can also run <code>npm run discover</code> in terminal or enable the weekly GitHub Action for 24/7 background discovery.</span>
          <div class="row gap">
            <button type="button" class="btn ghost" data-close>Cancel</button>
            <button type="submit" class="btn primary" id="ad-submit">🚀 Search &amp; Import Best Matches (≥ 65/100)</button>
          </div>
        </div>
      </form>`,
      onMount: (dlg, close) => {
        dlg.querySelector('#ad-form')?.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const btn = dlg.querySelector('#ad-submit');
          const statusEl = dlg.querySelector('#ad-status');
          btn.disabled = true;
          const fd = new FormData(ev.target);
          const category = String(fd.get('category') || 'all');
          const region = String(fd.get('region') || 'all');
          const minScore = Number(fd.get('min_score') || MIN_FIT_SCORE);
          const autoDraft = fd.get('auto_draft') !== null;
          const customUrls = String(fd.get('custom_urls') || '')
            .split(/[\n,\s]+/)
            .map((u) => u.trim())
            .filter(Boolean);

          let importedCount = 0;
          let skippedLowScore = 0;
          let skippedDup = 0;

          try {
            // 1. Scan curated verified Lake Como / Milan partner catalog
            const catalog = (core.DISCOVERY_PARTNER_CATALOG || []).filter((c) => {
              if (category !== 'all' && c.type !== category) return false;
              if (region === 'milan' && !/milan/i.test(c.location || '')) return false;
              if (region === 'como' && /milan/i.test(c.location || '')) return false;
              return true;
            });

            for (const item of catalog) {
              if (core.findDuplicates(item, S.prospects).length > 0) {
                skippedDup++;
                continue;
              }
              statusEl.textContent = `🔍 Checking portfolio & stories for ${item.agency_name}…`;
              const jina = await fetchJinaStorySignals(item.website);
              const candidate = {
                ...item,
                key_venues: [...new Set([...(item.key_venues || []), ...(jina?.venues || [])])],
              };
              candidate.personalization_hook = core.buildVerifiedFallbackHook(candidate, jina?.story);
              const sc = core.priorityScore(candidate).score;
              candidate.priority_score = sc;
              if (sc < minScore) {
                skippedLowScore++;
                continue;
              }
              candidate.status = (autoDraft && candidate.email && candidate.personalization_hook) ? 'ready' : 'researching';
              candidate.hook_confidence = 'high';
              candidate.hook_needs_review = false;
              candidate.hook_source_url = candidate.website;
              candidate.email_status = 'mx_ok';
              const [saved] = await insert('prospects', candidate);
              if (saved && saved.status === 'ready' && autoDraft) {
                await A.draftNextStep(saved);
              }
              importedCount++;
            }

            // 2. Scan any custom URLs pasted by the user
            for (const rawUrl of customUrls) {
              const cleanUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
              if (core.findDuplicates({ website: cleanUrl }, S.prospects).length > 0) {
                skippedDup++;
                continue;
              }
              statusEl.textContent = `🌐 Reading website & Real Weddings stories from ${cleanUrl}…`;
              const [r, jina] = await Promise.all([
                api('enrich', { url: cleanUrl }).catch(() => null),
                fetchJinaStorySignals(cleanUrl),
              ]);
              const s = r?.suggestions || {};
              const dom = core.domainOf(cleanUrl);
              const agencyName = s.agency_name || dom.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
              const candidate = {
                agency_name: agencyName,
                contact_name: s.contact_name || jina?.story?.founderName || null,
                email: s.email || jina?.emails?.[0] || null,
                email_status: s.email_status || (jina?.emails?.[0] ? 'unknown' : null),
                phone: s.phone || null,
                whatsapp: s.whatsapp || null,
                website: s.website || cleanUrl,
                location: s.location || jina?.towns?.[0] || 'Lake Como',
                type: category === 'all' ? 'planner' : category,
                segment: s.segment || 'boutique_local',
                source: 'ai_discovery',
                key_venues: [...new Set([...(s.key_venues || []), ...(jina?.venues || [])])],
              };
              candidate.personalization_hook = s.personalization_hook || core.buildVerifiedFallbackHook(candidate, jina?.story);
              candidate.hook_type = s.hook_type || (jina?.story?.couples?.length ? 'event' : 'venue');
              candidate.hook_confidence = 'high';
              candidate.hook_needs_review = false;
              candidate.hook_source_url = candidate.website;
              const sc = core.priorityScore(candidate).score;
              candidate.priority_score = sc;
              if (!candidate.email || sc < minScore) {
                skippedLowScore++;
                continue;
              }
              candidate.status = autoDraft ? 'ready' : 'researching';
              const [saved] = await insert('prospects', candidate);
              if (saved && saved.status === 'ready' && autoDraft) {
                await A.draftNextStep(saved);
              }
              importedCount++;
            }

            close();
            paint();
            if (importedCount > 0) {
              toast(`✓ Imported ${importedCount} new high-fit partners (≥ ${minScore}/100) & drafted Email 1!`);
            } else {
              toast(`No new partners ≥ ${minScore}/100 found (${skippedDup} already in pipeline, ${skippedLowScore} below ${minScore}/100). Paste new URLs or adjust filters!`);
            }
          } catch (err) {
            toast(err.message, 'error');
          } finally {
            btn.disabled = false;
          }
        });
      },
    });
  }

  function openQuickEditModal(prospectId, reasonBanner = '') {
    const data = activeData();
    const p = data.prospects.find((x) => x.id === prospectId);
    if (!p) return;
    const sc = core.priorityScore(p).score;
    dialog({
      title: `Complete Info · ${p.agency_name} (${sc}/100)`,
      body: `<form id="qe-form" class="stack">
        ${reasonBanner ? `<div class="banner" style="margin-bottom:4px">
          <span>⚠️ <b>Why couldn't we move ${esc(p.agency_name)} to Email 1 yet?</b><br>${esc(reasonBanner)}</span>
        </div>` : `<p class="small muted">Fill in the email and 1-line opener below, or click <b>🤖 Auto-Find with AI</b> to pull them from their website automatically.</p>`}
        ${!data.isSample ? `<div class="row between" style="background:var(--surface-2);padding:10px 12px;border-radius:8px;border:1px solid var(--line)">
          <span class="small"><b>Want AI to find their website, email &amp; villas automatically?</b></span>
          <button type="button" class="btn sm primary" id="qe-ai-btn">🤖 Auto-Find with AI</button>
        </div>` : ''}
        <div class="grid-2">
          <label class="field"><span>Agency / Company Name *</span><input name="agency_name" required value="${attr(p.agency_name || '')}"></label>
          <label class="field"><span>Contact Person Name</span><input name="contact_name" placeholder="e.g. Sofia Rossi" value="${attr(p.contact_name || '')}"></label>
          <label class="field"><span>Email Address *</span><input name="email" type="email" placeholder="name@agency.it" value="${attr(p.email || '')}"></label>
          <label class="field"><span>Website URL</span><input name="website" placeholder="https://…" value="${attr(p.website || '')}"></label>
          <label class="field"><span>Town / Location</span><input name="location" placeholder="e.g. Como, Bellagio, Milan" value="${attr(p.location || '')}"></label>
          <label class="field"><span>Partner Type</span>
            <select name="type">
              ${Object.entries(TYPE).map(([k, v]) => `<option value="${k}" ${p.type === k ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </label>
        </div>
        <label class="field">
          <span>1-Line Personal Note (Used as the first sentence of Email 1) *</span>
          <textarea name="personalization_hook" rows="2" placeholder="e.g. Your recent wedding celebration at Villa del Balbianello caught our eye.">${esc(p.personalization_hook || '')}</textarea>
        </label>
        <label class="field">
          <span>Internal Notes (Villas they work with, phone number, preferences)</span>
          <textarea name="notes" rows="2" placeholder="Optional notes…">${esc(p.notes || '')}</textarea>
        </label>
        <div class="row between" style="margin-top:8px">
          <a class="btn ghost sm" href="#prospect/${attr(p.id)}" data-close>Open full profile →</a>
          <div class="row gap">
            <button type="button" class="btn ghost" data-close>Cancel</button>
            <button type="submit" class="btn" data-save-mode="save">Save</button>
            <button type="submit" class="btn primary" data-save-mode="ready">✓ Save, Mark Ready &amp; Draft Email 1</button>
          </div>
        </div>
      </form>`,
      onMount: (dlg, close) => {
        let mode = 'save';
        dlg.querySelectorAll('[data-save-mode]').forEach((btn) => {
          btn.addEventListener('click', () => { mode = btn.dataset.saveMode; });
        });
        dlg.querySelector('#qe-ai-btn')?.addEventListener('click', async (ev) => {
          const btn = ev.currentTarget;
          btn.disabled = true;
          btn.textContent = '⏳ Searching website…';
          const form = dlg.querySelector('#qe-form');
          const webVal = form.elements.website.value.trim();
          const nameVal = form.elements.agency_name.value.trim();
          const locVal = form.elements.location.value.trim();
          try {
            const seed = core.resolveProspectResearchSeed({ ...p, agency_name: nameVal, website: webVal });
            const targetUrl = webVal || seed.website || seed.guessedUrl || '';
            let r = null;
            if (targetUrl) {
              try {
                r = await api('enrich', { url: targetUrl, agency_name: nameVal, location: locVal || seed.location || '', prospect_id: p.id });
              } catch { /* fallback to seed */ }
            }
            const s = { ...seed, ...(r?.suggestions || {}) };
            if (s.website || seed.website) form.elements.website.value = s.website || seed.website;
            if (s.email) form.elements.email.value = s.email;
            if (s.contact_name) form.elements.contact_name.value = s.contact_name;
            if (s.location && !form.elements.location.value) form.elements.location.value = s.location;
            const hook = s.personalization_hook || core.buildVerifiedFallbackHook({ ...p, ...s, agency_name: nameVal, location: form.elements.location.value });
            if (hook && !form.elements.personalization_hook.value) form.elements.personalization_hook.value = hook;
            const newSc = core.priorityScore({ ...p, ...s, email: form.elements.email.value, personalization_hook: form.elements.personalization_hook.value }).score;
            toast(form.elements.email.value ? `Found ${form.elements.email.value} (${newSc}/100)!` : 'Website checked — review fields below');
          } catch (err) {
            toast(err.message, 'error');
          } finally {
            btn.disabled = false;
            btn.textContent = '🤖 Auto-Find with AI';
          }
        });
        dlg.querySelector('#qe-form')?.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const fd = new FormData(ev.target);
          const patch = {
            agency_name: String(fd.get('agency_name') || '').trim(),
            contact_name: String(fd.get('contact_name') || '').trim(),
            email: String(fd.get('email') || '').trim(),
            website: String(fd.get('website') || '').trim(),
            location: String(fd.get('location') || '').trim(),
            type: String(fd.get('type') || 'planner'),
            personalization_hook: String(fd.get('personalization_hook') || '').trim(),
            notes: String(fd.get('notes') || '').trim(),
            hook_needs_review: false,
          };
          if (mode === 'ready') {
            if (!patch.email || !patch.personalization_hook) {
              toast('Please fill in both Email and the 1-Line Personal Note to mark Ready', 'error');
              return;
            }
            patch.status = 'ready';
          }
          patch.priority_score = core.priorityScore({ ...p, ...patch }).score;
          if (data.isSample) {
            Object.assign(p, patch);
            toast(mode === 'ready' ? `${p.agency_name} → Ready for Email 1` : 'Saved (sample preview)');
            close(true);
            paint();
            return;
          }
          try {
            await update('prospects', p.id, patch);
            if (mode === 'ready') {
              const updatedP = S.prospects.find((x) => x.id === p.id) || { ...p, ...patch };
              await A.draftNextStep(updatedP);
              toast(`✓ ${p.agency_name} marked Ready & Email 1 drafted!`);
            } else {
              toast('Saved');
            }
            close(true);
            paint();
          } catch (err) {
            toast(err.message, 'error');
          }
        });
      },
    });
  }

  async function moveProspectStage(prospectId, toStage) {
    const data = activeData();
    const p = data.prospects.find((x) => x.id === prospectId);
    if (!p || !toStage || p.status === toStage) return;

    if (data.isSample) {
      p.status = toStage;
      p.updated_at = new Date().toISOString();
      toast(`${p.agency_name} → ${plainStage(toStage)} (sample preview)`);
      paint();
      return;
    }

    // Guardrail 1: Never allow moving to Ready or Email 1/2/3 Sent if the lead is missing an email address or personal note!
    if (['ready', 't1_sent', 't3_sent', 't4_sent'].includes(toStage)) {
      const probs = A.readinessProblems(p);
      if (probs.length) {
        paint(); // Reset the select dropdown back to current status
        openQuickEditModal(
          p.id,
          `${p.agency_name} is missing: ${probs.join(' and ')}. Changing the dropdown to "${plainStage(toStage)}" cannot send an email without an email address and opening line.`
        );
        return;
      }
    }

    // Guardrail 2: What happens if user moves to "Ready for Email 1"?
    // -> Move to Ready AND automatically create the Email 1 draft right now!
    if (toStage === 'ready') {
      try {
        await A.setStatus(p, 'ready');
        const updatedP = S.prospects.find((x) => x.id === p.id) || { ...p, status: 'ready' };
        await A.draftNextStep(updatedP);
        toast(`✓ ${p.agency_name} → Ready & Email 1 drafted! Review it in Today.`);
        paint();
      } catch (err) {
        toast(err.message, 'error');
      }
      return;
    }

    // Guardrail 3: What happens if user picks "Email 1 Sent (T1)" when no T1 email was sent yet?
    // Explain the difference clearly: Draft & Send Email 1 now vs. Record that you already sent it outside the app.
    const existingTouches = A.touchesOf(p.id);
    const hasSentT1 = existingTouches.some((t) => t.direction === 'out' && t.state === 'sent' && t.step_name === 'T1_intro');
    if (toStage === 't1_sent' && !hasSentT1) {
      paint(); // Keep dropdown on current value until they choose
      dialog({
        title: `Email 1 for ${p.agency_name}`,
        body: `<div class="stack">
          <p class="small">Setting the stage to <b>“Email 1 Sent”</b> tells the CRM that Email 1 has <i>already</i> been sent, and starts the 4-day timer for Email 2.</p>
          <p class="small"><b>What would you like to do?</b></p>
          <div class="stack" style="gap:8px;margin-top:4px">
            <button class="btn primary" id="dlg-draft-t1">✉️ Create &amp; Review Email 1 Draft Now (Recommended)</button>
            <button class="btn" id="dlg-log-t1">✓ I already sent Email 1 myself outside the app (Start 4-day timer for Email 2)</button>
            <button class="btn ghost" data-close>Cancel</button>
          </div>
        </div>`,
        onMount: (dlg, close) => {
          dlg.querySelector('#dlg-draft-t1')?.addEventListener('click', async () => {
            close(true);
            await A.setStatus(p, 'ready');
            const updatedP = S.prospects.find((x) => x.id === p.id) || { ...p, status: 'ready' };
            await A.draftNextStep(updatedP);
            toast(`✓ Email 1 drafted for ${p.agency_name}! Opening Today queue…`);
            location.hash = 'today';
          });
          dlg.querySelector('#dlg-log-t1')?.addEventListener('click', async () => {
            close(true);
            await A.logOutbound(p, {
              channel: 'email',
              step_name: 'T1_intro',
              subject: 'Logged external Email 1',
              body: '(Marked as sent outside the app)',
            });
            toast(`${p.agency_name} marked as Email 1 Sent · Email 2 will be due in 4 days.`);
            paint();
          });
        },
      });
      return;
    }

    try {
      await A.setStatus(p, toStage);
      toast(`${p.agency_name} → ${plainStage(toStage)}`);
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
      title: `${p.agency_name} (Sample Lead)`,
      body: `<div class="stack">
        <div class="row between">
          <span class="chip gold">${esc(plainStage(p.status))}</span>
          <span class="score ${sc >= MIN_FIT_SCORE ? 'hi' : 'low'}">${sc}/100 Fit</span>
        </div>
        ${p.personalization_hook ? `<p class="small"><b>Opening Note (Hook):</b> “${esc(p.personalization_hook)}”</p>` : ''}
        <div class="small muted">${[p.contact_name, p.email, p.location, SEG[p.segment] || p.segment].filter(Boolean).map(esc).join(' · ')}</div>
        <div>
          <div class="label" style="margin-bottom:6px">Step-by-step history</div>
          <div class="row">${trail.map((ev) => `<span class="chip">${esc(friendlyNodeLabel(ev.label))}</span>`).join('<span class="faint">→</span>')}</div>
        </div>
        <div class="row end gap" style="margin-top:6px">
          <button class="btn ghost" data-close>Close</button>
          <button class="btn" data-edit-sample="${attr(p.id)}">✏️ Edit Info</button>
          <button class="btn primary" data-demo-full>Open Full Demo Mode</button>
        </div>
      </div>`,
      onMount: (dlg, close) => {
        dlg.querySelector('[data-edit-sample]')?.addEventListener('click', () => {
          close(true);
          openQuickEditModal(p.id);
        });
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
    else if (id === 'f-highfit') f.onlyHighFit = e.target.checked;
    else if (id === 'f-sort') f.sort = e.target.value;
    else if (id && id.startsWith('f-') && id !== 'f-q') f[id.slice(2)] = e.target.value;
    else return;
    persist();
  });

  el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-stage-select]') || e.target.closest('[data-step-col]') || e.target.closest('[data-stop-card]')) return;
    removeTip();

    const aiBtn = e.target.closest('[data-ai-research]');
    if (aiBtn) {
      e.stopPropagation();
      await researchSingleProspect(aiBtn.dataset.aiResearch);
      return;
    }

    const qe = e.target.closest('[data-quick-edit]');
    if (qe) {
      e.stopPropagation();
      openQuickEditModal(qe.dataset.quickEdit);
      return;
    }

    const mr = e.target.closest('[data-mark-ready]');
    if (mr) {
      e.stopPropagation();
      await moveProspectStage(mr.dataset.markReady, 'ready');
      return;
    }

    const dn = e.target.closest('[data-draft-next]');
    if (dn) {
      e.stopPropagation();
      const data = activeData();
      const p = data.prospects.find((x) => x.id === dn.dataset.draftNext);
      if (!p) return;
      if (data.isSample) {
        toast(`Sample preview: Email 1 drafted for ${p.agency_name}`);
        return;
      }
      await A.draftNextStep(p);
      paint();
      return;
    }

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
    if (act === 'auto-discover-partners') {
      openAutoDiscoverModal();
      return;
    }
    if (act === 'batch-ai-research') {
      await runBatchAiResearch();
      return;
    }
    if (act === 'purge-low-fit') {
      await purgeLowFitProspects();
      return;
    }
    if (act === 'toggle-customize') {
      customizeCols = !customizeCols;
      return paint();
    }
    if (act === 'toggle-board-detail') {
      detailedBoard = !detailedBoard;
      return paint();
    }
    if (act === 'path-reset') {
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
      pushUndo();
      selectedPath = {};
      stageFilter = 'all';
      return paint();
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
      f.q = ''; f.type = ''; f.segment = ''; f.location = ''; f.language = ''; f.tag = ''; f.onlyHighFit = false;
      selectedPath = {};
      stageFilter = 'all';
      return persist();
    }
    if (act === 'toggle-preview') {
      previewSample = !previewSample;
      selectedPath = {};
      return paint();
    }
    if (act === 'export-csv' && lastFlow) {
      const cols = ['agency_name', 'contact_name', 'email', 'website', 'location', 'segment', 'type', 'language', 'status', 'priority_score'];
      download(`dorogo_pipeline_${new Date().toISOString().slice(0, 10)}.csv`, core.toCSV(lastFlow.matchedProspects, cols), 'text/csv');
      return;
    }

    const rmStep = e.target.closest('[data-remove-step]');
    if (rmStep && f.steps.length > 2) {
      const idx = Number(rmStep.dataset.removeStep);
      pushUndo();
      f.steps.splice(idx, 1);
      f.preset = 'custom';
      const nextSelected = {};
      for (const [k, val] of Object.entries(selectedPath)) {
        const col = Number(k);
        if (col < idx) nextSelected[col] = val;
        else if (col > idx && !selectedPath[idx]) nextSelected[col - 1] = val;
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
      const targetKey = sgBtn.dataset.stageFilter;
      stageFilter = (stageFilter === targetKey && targetKey !== 'all') ? 'all' : targetKey;
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

  // Drag and drop: onto Board columns, Journey bar steps, or Flow SVG stage nodes.
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
    el.querySelectorAll('.col.drop, .journey-step.drop, .path-node.drop-hover').forEach((x) => {
      x.classList.remove('drop', 'drop-hover');
    });
  });
  el.addEventListener('dragover', (e) => {
    if (!dragId) return;
    const col = e.target.closest('.col');
    const node = e.target.closest('.path-node[data-drop-stage]');
    const jStep = e.target.closest('.journey-step[data-drop-stage]');
    if (!col && !node && !jStep) return;
    e.preventDefault();
    el.querySelectorAll('.col.drop, .journey-step.drop, .path-node.drop-hover').forEach((x) => {
      if (x !== col && x !== node && x !== jStep) x.classList.remove('drop', 'drop-hover');
    });
    if (col) col.classList.add('drop');
    if (node) node.classList.add('drop-hover');
    if (jStep) jStep.classList.add('drop');
  });
  el.addEventListener('drop', async (e) => {
    if (!dragId) return;
    const col = e.target.closest('.col');
    const node = e.target.closest('.path-node[data-drop-stage]');
    const jStep = e.target.closest('.journey-step[data-drop-stage]');
    const to = col?.dataset.stage || node?.dataset.dropStage || jStep?.dataset.dropStage;
    const id = dragId;
    dragId = null;
    el.classList.remove('is-dragging');
    if (!to) return;
    e.preventDefault();
    await moveProspectStage(id, to);
  });

  return () => removeTip();
}
