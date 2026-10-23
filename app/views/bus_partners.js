// Minimalist Bus Partner Manifest Table & 100-Point Scoring View
// Luxury unbranded minibus and coach operators across Northern Italy.
import * as core from '../../supabase/functions/_shared/core/index.js';
import { S, updateBusPartner, addBusPartner, removeBusPartner } from '../store.js';
import { esc, attr, icon, download, toast, confirmDialog } from '../ui.js';

let activeFilter = 'all'; // all | top_tier | want_to_contact | approved | to_review
let searchQ = '';
let cityFilter = 'all';

function getStatusBadgeStyle(status) {
  switch (status) {
    case 'TO_REVIEW':
      return 'background:#fffbeb;color:#b45309;border:1px solid #fde68a;font-weight:600';
    case 'WANT_TO_CONTACT':
      return 'background:#ede9fe;color:#6d28d9;border:1px solid #ddd6fe;font-weight:600';
    case 'CONTACTED':
      return 'background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;font-weight:600';
    case 'APPROVED_PARTNER':
      return 'background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;font-weight:600';
    case 'REJECTED':
      return 'background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;font-weight:600';
    case 'NOT_RELEVANT':
      return 'background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1;font-weight:600';
    default:
      return 'background:var(--surface);color:var(--ink);border:1px solid var(--border);';
  }
}

// 6 Main Standard Luxury Fleet Categories across Northern Italy NCC
export const STANDARD_FLEET_TYPES = [
  {
    key: 'v_class',
    label: 'Mercedes-Benz V-Class VIP (7–8 seats)',
    short: 'V-Class (7-8s)',
    icon: '🚐',
    badge: 'Chauffeur NCC',
    desc: 'Bespoke VIP minivan for wedding couple, family & VIP guests'
  },
  {
    key: 'sprinter_vip',
    label: 'Mercedes Sprinter VIP (8–16 seats)',
    short: 'Sprinter VIP (8-16s)',
    icon: '🚐',
    badge: 'Lounge Specs',
    desc: 'Leather recliners, conference tables, privacy glass, Wi-Fi'
  },
  {
    key: 'sprinter_lux',
    label: 'Mercedes Sprinter Luxury (16–20 seats)',
    short: 'Sprinter Lux (16-20s)',
    icon: '🚐',
    badge: 'Guest Shuttle',
    desc: 'High-volume luxury shuttle, ideal for airport & hotel circuits'
  },
  {
    key: 'midibus',
    label: 'Executive Midibus (24–30 seats)',
    short: 'Midibus (24-30s)',
    icon: '🚌',
    badge: 'Como Villa Access',
    desc: 'Iveco/Indcar platform (<10m). Crucial for narrow Lake Como roads & villa gates'
  },
  {
    key: 'limobus',
    label: 'Limobus VIP Lounge (18–28 seats)',
    short: 'Limobus Lounge',
    icon: '🥂',
    badge: 'Party / Club',
    desc: 'Moveolux-style luxury club conversion: lounge seating, bar, sound system'
  },
  {
    key: 'gt_coach',
    label: 'Setra & Mercedes GT Coach (50–56 seats)',
    short: 'GT Coach (50-56s)',
    icon: '🚍',
    badge: 'Large Capacity',
    desc: 'Full-size Grand Turismo coach for large wedding groups & delegations'
  }
];

export function shortFleetName(str) {
  if (!str) return '';
  const match = STANDARD_FLEET_TYPES.find(f => f.label.toLowerCase() === str.toLowerCase() || f.short.toLowerCase() === str.toLowerCase());
  if (match) return match.short;
  if (/limobus/i.test(str)) return 'Limobus (18-28s)';
  if (/sprinter.*vip.*lounge/i.test(str)) return 'Sprinter Lounge';
  if (/sprinter.*vip/i.test(str)) return 'Sprinter VIP (8-16s)';
  if (/sprinter.*exec/i.test(str)) return 'Sprinter Exec (16-19s)';
  if (/sprinter.*lux/i.test(str)) return 'Sprinter Lux (8-20s)';
  if (/sprinter/i.test(str)) return 'Sprinter Minibus';
  if (/midi/i.test(str)) return 'Midibus (24-30s)';
  if (/setra.*vip/i.test(str)) return 'Setra VIP Lounge';
  if (/setra.*topclass/i.test(str)) return 'Setra TopClass';
  if (/tourismo/i.test(str)) return 'Mercedes Tourismo';
  if (/v-?class/i.test(str)) return 'V-Class (7-8s)';
  if (/coach|pullman/i.test(str)) return 'GT Coach';
  return str.length > 20 ? str.slice(0, 18) + '…' : str;
}

// Northern Italy Candidate Knowledge Base for Market Auto-Scout
export const SCOUT_CANDIDATE_POOL = [
  {
    name: 'Como Lake Transfers & Minibus',
    base_city: 'Como',
    website: 'https://www.comolaketransfers.it',
    fleet_url: 'https://www.comolaketransfers.it/fleet',
    phone: '+39 031 513 145',
    email: 'info@comolaketransfers.it',
    relevance_score: 93,
    score_breakdown: { discretion_unbranded: 35, fleet_luxury: 23, territory_permits: 20, corporate_sla: 15 },
    unbranded_status: '100% Guaranteed Unbranded / Total Black',
    status: 'WANT_TO_CONTACT',
    fleet_categories: ['Mercedes Sprinter VIP (8–16 seats)', 'Executive Midibus (24–30 seats)'],
    notes: 'Lake Como villa specialist (Villa Balbiano, Balbianello). All-black unbranded Sprinters and narrow midibuses under 10m.'
  },
  {
    name: 'Starlight Limousine & Coach',
    base_city: 'Milano',
    website: 'https://www.starlightlimousine.it',
    fleet_url: 'https://www.starlightlimousine.it/fleet',
    phone: '+39 02 839 4488',
    email: 'booking@starlightlimousine.it',
    relevance_score: 90,
    score_breakdown: { discretion_unbranded: 35, fleet_luxury: 23, territory_permits: 17, corporate_sla: 15 },
    unbranded_status: '100% Guaranteed Unbranded / NCC Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Limobus VIP Lounge (18–28 seats)', 'Mercedes Sprinter VIP (8–16 seats)'],
    notes: 'Milan luxury event mobility. Club lounge limobuses with high-end audio, tables, and suited chauffeurs.'
  },
  {
    name: 'Autonoleggio Battaglia',
    base_city: 'Milano',
    website: 'https://www.autonoleggibattaglia.it',
    fleet_url: 'https://www.autonoleggibattaglia.it/flotta',
    phone: '+39 02 669 8221',
    email: 'info@autonoleggibattaglia.it',
    relevance_score: 87,
    score_breakdown: { discretion_unbranded: 35, fleet_luxury: 20, territory_permits: 17, corporate_sla: 15 },
    unbranded_status: '100% Guaranteed Unbranded / Total Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes-Benz V-Class VIP (7–8 seats)', 'Mercedes Sprinter Luxury (16–20 seats)'],
    notes: 'Fashion week and diplomatic shuttle specialist. Strict no-sticker policy.'
  },
  {
    name: 'Bassi Tours',
    base_city: 'Brescia',
    website: 'https://www.bassitours.com',
    fleet_url: 'https://www.bassitours.com/flotta',
    phone: '+39 030 969 015',
    email: 'info@bassitours.com',
    relevance_score: 82,
    score_breakdown: { discretion_unbranded: 20, fleet_luxury: 23, territory_permits: 20, corporate_sla: 19 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Executive Midibus (24–30 seats)', 'Setra & Mercedes GT Coach (50–56 seats)'],
    notes: 'Lake Garda & Brescia corridor. Modern coaches from 28 to 80 seats with toilet and coffee bar.'
  },
  {
    name: 'Zani Viaggi Executive',
    base_city: 'Milano',
    website: 'https://www.zaniviaggi.it',
    fleet_url: 'https://www.zaniviaggi.it/noleggio-autobus',
    phone: '+39 02 867 131',
    email: 'noleggio@zaniviaggi.it',
    relevance_score: 77,
    score_breakdown: { discretion_unbranded: 20, fleet_luxury: 22, territory_permits: 20, corporate_sla: 15 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes Sprinter Luxury (16–20 seats)', 'Setra & Mercedes GT Coach (50–56 seats)'],
    notes: 'Historic Milan carrier. Large fleet of modern Mercedes and Setra coaches. Specify unbranded when booking.'
  },
  {
    name: 'Frigerio Trasporti',
    base_city: 'Monza',
    website: 'https://www.frigerioviaggi.com',
    fleet_url: 'https://www.frigerioviaggi.com/noleggio-bus',
    phone: '+39 0362 359 1',
    email: 'bus@frigerioviaggi.com',
    relevance_score: 75,
    score_breakdown: { discretion_unbranded: 20, fleet_luxury: 20, territory_permits: 17, corporate_sla: 18 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Executive Midibus (24–30 seats)', 'Mercedes-Benz V-Class VIP (7–8 seats)'],
    notes: 'Monza Brianza and Milan corporate transfer company. Euro 6 midibuses and V-Classes.'
  },
  {
    name: 'Air Pullman VIP Line',
    base_city: 'Milano',
    website: 'https://www.airpullman.it',
    fleet_url: 'https://www.airpullman.it/noleggio',
    phone: '+39 02 896 039',
    email: 'noleggio@airpullman.it',
    relevance_score: 74,
    score_breakdown: { discretion_unbranded: 20, fleet_luxury: 20, territory_permits: 20, corporate_sla: 14 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Setra & Mercedes GT Coach (50–56 seats)', 'Mercedes Sprinter Luxury (16–20 seats)'],
    notes: 'Airport hub specialist (Malpensa & Linate). Large dispatch volume.'
  },
  {
    name: 'Pellegrini Autoservizi',
    base_city: 'Sondrio',
    website: 'https://www.pellegrinibus.it',
    fleet_url: 'https://www.pellegrinibus.it/flotta',
    phone: '+39 0342 212 555',
    email: 'info@pellegrinibus.it',
    relevance_score: 66,
    score_breakdown: { discretion_unbranded: 20, fleet_luxury: 18, territory_permits: 15, corporate_sla: 13 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Executive Midibus (24–30 seats)', 'Setra & Mercedes GT Coach (50–56 seats)'],
    notes: 'Alps & Valtellina specialists. Experienced mountain pass drivers with snow chains for winter weddings.'
  }
];

export function render(el) {
  paint();

  function paint() {
    const list = S.busPartners || [];
    
    // 1. Metric calculations for Top Stat Bar (MECE, no vetted)
    const totalDiscovered = list.length;
    const topTierMatches = list.filter((p) => (p.relevance_score || 0) >= 80).length;
    const wantToContactCount = list.filter((p) => p.status === 'WANT_TO_CONTACT').length;
    const activePartners = list.filter((p) => p.status === 'APPROVED_PARTNER').length;

    // Filter logic
    let filtered = [...list];
    if (activeFilter === 'top_tier') {
      filtered = filtered.filter((p) => (p.relevance_score || 0) >= 80);
    } else if (activeFilter === 'want_to_contact') {
      filtered = filtered.filter((p) => p.status === 'WANT_TO_CONTACT');
    } else if (activeFilter === 'approved') {
      filtered = filtered.filter((p) => p.status === 'APPROVED_PARTNER');
    } else if (activeFilter === 'to_review') {
      filtered = filtered.filter((p) => p.status === 'TO_REVIEW');
    }

    if (cityFilter !== 'all') {
      filtered = filtered.filter((p) => (p.base_city || '').toLowerCase().includes(cityFilter.toLowerCase()));
    }

    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      filtered = filtered.filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.base_city || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q) ||
        (Array.isArray(p.fleet_categories) ? p.fleet_categories.join(' ') : '').toLowerCase().includes(q)
      );
    }

    // Sort by relevance score descending
    filtered.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

    // Get unique cities for filter dropdown
    const cities = [...new Set(list.map((p) => (p.base_city || '').split(/[\/,]/)[0].trim()).filter(Boolean))].sort();

    el.innerHTML = `
    <div class="page-head">
      <div>
        <div class="label eyebrow">Northern Italy VIP Fleet Network</div>
        <h1>🚌 Bus & Minibus Fleet Partners</h1>
      </div>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <button class="btn sm" id="btn-scout-url" style="color:var(--gold-ink);border-color:var(--gold)" title="Evaluate website through 100-Point Gate">⚡ Scout URL</button>
        <button class="btn sm" id="btn-scout-market" style="background:var(--gold-soft);color:var(--ink);border-color:var(--gold-strong);font-weight:600" title="Auto-scout operators by location, score & vehicle types">🔍 Auto-Scout Fleet</button>
        <button class="btn ghost sm" id="btn-export">${icon('download', 14)} Export</button>
        <button class="btn primary sm" id="btn-add-partner">${icon('plus', 14)} + Add Operator</button>
      </div>
    </div>

    <div class="stack lg">
      <!-- Market Problem Alert Banner -->
      <div class="card row nowrap between" style="align-items:center;background:var(--surface);border-left:3px solid var(--gold);padding:12px 18px">
        <div class="stack" style="gap:4px">
          <div class="row" style="gap:8px;align-items:center">
            <span class="chip gold" style="font-weight:700">Discretion Standard</span>
            <b>100% Unbranded / Total Black Requirement</b>
          </div>
          <span class="small muted">
            Standard Italian coaches display large commercial billboard stickers. For Dorogo wedding & VIP events, we only dispatch <b>monochromatic, unbranded vehicles</b> with suited chauffeurs and Lake Como villa access.
          </span>
        </div>
        <span class="chip outline" style="white-space:nowrap;font-family:monospace">100-Point Relevance Gate</span>
      </div>

      <!-- Top Stat Bar (High-Density Minimalist Counters) -->
      <div class="kpis">
        <div class="kpi">
          <span class="label">Total Discovered</span>
          <span class="val">${totalDiscovered}</span>
          <span class="ci">Scouted operators in Lombardy, Como & Alps</span>
        </div>
        <div class="kpi">
          <span class="label">Top-Tier Matches (Score ≥ 80)</span>
          <span class="val" style="color:var(--ok)">${topTierMatches}</span>
          <span class="ci">Guaranteed unbranded luxury lines</span>
        </div>
        <div class="kpi">
          <span class="label">Want to Contact</span>
          <span class="val" style="color:#6d28d9">${wantToContactCount}</span>
          <span class="ci">High-priority outreach targets</span>
        </div>
        <div class="kpi">
          <span class="label">Active Partners</span>
          <span class="val" style="color:var(--gold)">${activePartners}</span>
          <span class="ci">Signed B2B dispatch book</span>
        </div>
      </div>

      <!-- Control & Filter Bar -->
      <div class="row between" style="gap:12px;flex-wrap:wrap;align-items:center">
        <div class="row" style="gap:6px;flex-wrap:wrap">
          <button class="chip ${activeFilter === 'all' ? 'active' : 'outline'}" data-filter="all">All (${totalDiscovered})</button>
          <button class="chip ${activeFilter === 'top_tier' ? 'active' : 'outline'}" data-filter="top_tier">⭐ Top Tier (≥80) (${topTierMatches})</button>
          <button class="chip ${activeFilter === 'want_to_contact' ? 'active' : 'outline'}" data-filter="want_to_contact">📞 Want to Contact (${wantToContactCount})</button>
          <button class="chip ${activeFilter === 'to_review' ? 'active' : 'outline'}" data-filter="to_review">⏳ To Review (${list.filter(p => p.status === 'TO_REVIEW').length})</button>
          <button class="chip ${activeFilter === 'approved' ? 'active' : 'outline'}" data-filter="approved">🤝 Active Partners (${activePartners})</button>
        </div>

        <div class="row" style="gap:8px">
          <select id="select-city" class="sm" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border);background:var(--surface)">
            <option value="all">📍 All Cities</option>
            ${cities.map((c) => `<option value="${attr(c)}" ${cityFilter.toLowerCase() === c.toLowerCase() ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
          <input type="text" id="bus-search" placeholder="Search company, city, email, fleet..." value="${attr(searchQ)}" style="padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);font-size:.85rem;min-width:200px">
        </div>
      </div>

      <!-- Minimalist Bus Partner Manifest Table (100% Fits in One View, Zero Horizontal Scroll) -->
      <div class="card flush table-wrap" style="overflow-x:hidden">
        <table class="table" style="width:100%;table-layout:fixed;border-collapse:collapse">
          <thead>
            <tr>
              <th style="width:26px;text-align:center;padding:8px 2px">#</th>
              <th style="width:40px;text-align:center;padding:8px 2px">Score</th>
              <th style="width:155px">Company & Base</th>
              <th style="width:60px;text-align:center">Web</th>
              <th style="width:145px">Email</th>
              <th style="width:125px">Fleet Types</th>
              <th style="width:160px">Notes</th>
              <th style="width:140px">Status</th>
              <th style="width:38px;text-align:center" title="Delete">Del</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map((p, idx) => {
              const score = p.relevance_score || 0;
              const tier = core.getPriorityTier(score);
              const scoreClass = score >= 90 ? 'chip ok' : score >= 75 ? 'chip' : score >= 50 ? 'chip gold' : 'chip bad';
              const categories = Array.isArray(p.fleet_categories) ? p.fleet_categories : [];

              return `<tr class="hover-row" data-id="${attr(p.id)}" style="height:52px">
                <td style="text-align:center;vertical-align:middle;color:var(--ink-3);font-size:.76rem;font-weight:600;font-variant-numeric:tabular-nums;padding:6px 2px">
                  ${idx + 1}
                </td>
                <td style="text-align:center;vertical-align:middle;padding:6px 2px">
                  <span class="${scoreClass} clickable" data-act="view-score" data-id="${attr(p.id)}" style="font-weight:700;font-size:.84rem;padding:2px 5px;cursor:pointer" title="Click to view 4-pillar score breakdown">
                    ${score}
                  </span>
                </td>
                <td style="vertical-align:middle">
                  <div style="font-weight:600;font-size:.88rem;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${attr(p.name)}">${esc(p.name)}</div>
                  <div class="tiny muted" style="white-space:nowrap;margin-top:2px">📍 ${esc(p.base_city || 'Northern Italy')}</div>
                </td>
                <td style="vertical-align:middle;text-align:center;white-space:nowrap">
                  ${p.website 
                    ? `<a class="btn sm ghost" href="${attr(p.website)}" target="_blank" rel="noopener" style="padding:3px 6px;font-size:.74rem;white-space:nowrap;display:inline-flex;align-items:center;gap:2px" title="Open Website">${icon('external', 11)} Web</a>` 
                    : `<span class="tiny faint">—</span>`
                  }
                </td>
                <td style="vertical-align:middle;white-space:nowrap">
                  ${p.email 
                    ? `<div class="row nowrap" style="gap:4px;align-items:center;white-space:nowrap">
                        <a href="mailto:${attr(p.email)}" style="color:var(--series-1);font-size:.8rem;text-decoration:none;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;max-width:125px;overflow:hidden;text-overflow:ellipsis" title="Email: ${attr(p.email)}">
                          ${icon('email', 11)} <span style="overflow:hidden;text-overflow:ellipsis">${esc(p.email)}</span>
                        </a>
                        <button class="clickable" data-act="edit-email" data-id="${attr(p.id)}" style="background:none;border:none;padding:1px 3px;cursor:pointer;color:var(--text-3);font-size:.72rem" title="Edit Email">✏️</button>
                      </div>`
                    : `<button class="clickable" data-act="edit-email" data-id="${attr(p.id)}" style="background:var(--surface-2);border:1px dashed var(--line-strong);padding:3px 7px;border-radius:4px;color:var(--gold-ink);cursor:pointer;font-size:.73rem;white-space:nowrap;display:inline-flex;align-items:center;gap:3px" title="Click to add email">
                        + Add email
                      </button>`
                  }
                </td>
                <td style="vertical-align:middle">
                  <div class="clickable" data-act="edit-fleet" data-id="${attr(p.id)}" style="cursor:pointer;display:flex;flex-direction:column;gap:3px;max-width:120px;align-items:flex-start;line-height:1.2" title="Click to choose/edit fleet categories: ${attr(categories.join(', '))}">
                    ${categories.slice(0, 2).map((c) => `<span class="chip tiny outline" style="font-size:.67rem;padding:1px 6px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:115px" title="${attr(c)}">${esc(shortFleetName(c))}</span>`).join('')}
                    ${categories.length > 2 ? `<span class="tiny faint" style="font-size:.66rem;padding-left:2px" title="${attr(categories.slice(2).join(', '))}">+${categories.length - 2} more</span>` : ''}
                    ${!categories.length ? '<span class="tiny" style="color:var(--gold-ink);font-style:italic;padding:1px 4px;border:1px dashed var(--line);border-radius:4px">+ Choose fleet...</span>' : ''}
                  </div>
                </td>
                <td style="vertical-align:middle">
                  <div class="clickable" data-act="edit-notes" data-id="${attr(p.id)}" style="cursor:pointer;max-width:175px;display:flex;align-items:flex-start;gap:4px" title="Click to edit notes: ${attr(p.notes || '')}">
                    <span style="font-size:.74rem;line-height:1.2;flex:none">📝</span>
                    ${p.notes 
                      ? `<span class="tiny" style="color:var(--text-2);font-style:italic;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(p.notes)}</span>`
                      : `<span class="tiny" style="color:var(--text-3);font-style:italic">+ Add notes...</span>`
                    }
                  </div>
                </td>
                <td style="vertical-align:middle;white-space:nowrap">
                  <select class="sm bus-status-select" data-id="${attr(p.id)}" style="padding:3px 6px;border-radius:6px;font-size:.75rem;width:100%;height:29px;line-height:1.2;cursor:pointer;white-space:nowrap;${getStatusBadgeStyle(p.status)}">
                    ${core.BUS_STATUSES.map((st) => `<option value="${st.key}" ${p.status === st.key ? 'selected' : ''} style="background:var(--surface);color:var(--ink)">${st.label}</option>`).join('')}
                  </select>
                </td>
                <td style="vertical-align:middle;text-align:center;white-space:nowrap">
                  <button class="btn sm ghost" data-act="delete-partner" data-id="${attr(p.id)}" style="padding:4px 6px;color:var(--bad);display:inline-flex;align-items:center" title="Delete Operator">${icon('trash', 13)}</button>
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="9" class="empty small">No bus operators found matching the current filters.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;

    attachEvents();
  }

  function attachEvents() {
    // Filter clicks
    el.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        activeFilter = e.currentTarget.dataset.filter;
        paint();
      });
    });

    // City dropdown filter
    const citySelect = el.querySelector('#select-city');
    if (citySelect) {
      citySelect.addEventListener('change', (e) => {
        cityFilter = e.target.value;
        paint();
      });
    }

    // Search input
    const searchInput = el.querySelector('#bus-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQ = e.target.value;
        paint();
      });
    }

    // Status change
    el.querySelectorAll('.bus-status-select').forEach((sel) => {
      sel.addEventListener('change', async (e) => {
        const id = e.target.dataset.id;
        const newStatus = e.target.value;
        await updateBusPartner(id, { status: newStatus });
        toast(newStatus === 'NOT_RELEVANT' ? 'Marked Not Relevant (Score set to 0)' : `Status updated to ${newStatus}`);
        paint();
      });
    });

    // Edit Notes
    el.querySelectorAll('[data-act="edit-notes"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const partner = (S.busPartners || []).find((x) => x.id === id);
        if (partner) openNotesModal(partner);
      });
    });

    // Edit Email (Dedicated)
    el.querySelectorAll('[data-act="edit-email"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const partner = (S.busPartners || []).find((x) => x.id === id);
        if (partner) openEmailModal(partner);
      });
    });

    // View Score Breakdown Modal
    el.querySelectorAll('[data-act="view-score"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const partner = (S.busPartners || []).find((x) => x.id === id);
        if (partner) openScoreBreakdownModal(partner);
      });
    });

    // Delete Partner
    el.querySelectorAll('[data-act="delete-partner"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const partner = (S.busPartners || []).find((x) => x.id === id);
        if (partner && await confirmDialog('Remove Bus Partner', `Remove "${partner.name}" from the bus partner roster?`, 'Remove')) {
          await removeBusPartner(id);
          toast('Partner removed');
          paint();
        }
      });
    });

    // Edit fleet categories modal
    el.querySelectorAll('[data-act="edit-fleet"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        const partner = (S.busPartners || []).find((x) => x.id === id);
        if (partner) openFleetModal(partner);
      });
    });

    // Scout by URL Modal
    el.querySelector('#btn-scout-url')?.addEventListener('click', () => {
      openScoutUrlModal();
    });

    // Auto-Scout Fleet Modal (Multi-Filter)
    el.querySelector('#btn-scout-market')?.addEventListener('click', () => {
      openAutoScoutModal();
    });

    // Add Partner Modal
    el.querySelector('#btn-add-partner')?.addEventListener('click', () => {
      openAddPartnerModal();
    });

    // Export Manifest
    el.querySelector('#btn-export')?.addEventListener('click', () => {
      const data = S.busPartners || [];
      download(`dorogo_bus_partners_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
      toast('Bus partner manifest exported');
    });
  }

  // --- Modals ---

  // --- Dedicated Fleet Categories Modal ---
  function openFleetModal(partner) {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';

    const current = Array.isArray(partner.fleet_categories) ? [...partner.fleet_categories] : [];

    const norm = (s) => (s || '').toLowerCase().replace(/–/g, '-').replace(/[^a-z0-9]/g, '');
    const isChecked = (f) => {
      const nfLabel = norm(f.label);
      const nfShort = norm(f.short);
      return current.some((c) => {
        const nc = norm(c);
        if (nc === nfLabel || nc === nfShort) return true;
        if (f.key === 'limobus' && nc.includes('limobus')) return true;
        if (f.key === 'sprinter_vip' && nc.includes('sprinter') && nc.includes('vip')) return true;
        if (f.key === 'sprinter_lux' && nc.includes('sprinter') && (nc.includes('lux') || nc.includes('exec'))) return true;
        if (f.key === 'v_class' && (nc.includes('vclass') || nc.includes('vito') || nc.includes('minivan'))) return true;
        if (f.key === 'midibus' && (nc.includes('midi') || nc.includes('indcar') || nc.includes('iveco'))) return true;
        if (f.key === 'gt_coach' && (nc.includes('coach') || nc.includes('setra') || nc.includes('tourismo') || nc.includes('pullman'))) return true;
        return false;
      });
    };

    const customTags = current.filter((c) => {
      const nc = norm(c);
      return !STANDARD_FLEET_TYPES.some((f) => {
        if (f.key === 'limobus' && nc.includes('limobus')) return true;
        if (f.key === 'sprinter_vip' && nc.includes('sprinter') && nc.includes('vip')) return true;
        if (f.key === 'sprinter_lux' && nc.includes('sprinter') && (nc.includes('lux') || nc.includes('exec'))) return true;
        if (f.key === 'v_class' && (nc.includes('vclass') || nc.includes('vito') || nc.includes('minivan'))) return true;
        if (f.key === 'midibus' && (nc.includes('midi') || nc.includes('indcar') || nc.includes('iveco'))) return true;
        if (f.key === 'gt_coach' && (nc.includes('coach') || nc.includes('setra') || nc.includes('tourismo') || nc.includes('pullman'))) return true;
        return false;
      });
    });

    backdrop.innerHTML = `
    <div class="dialog card stack" style="max-width:520px;padding:24px">
      <div class="row between" style="align-items:flex-start">
        <div>
          <div class="label eyebrow">Fleet Categories</div>
          <h3 style="margin:2px 0 0">${esc(partner.name)}</h3>
        </div>
        <button class="btn ghost sm" data-close>×</button>
      </div>

      <p class="small muted" style="margin:8px 0 14px">
        Select the vehicle categories available in this partner's luxury fleet for VIP wedding and corporate transfers:
      </p>

      <div class="stack" style="gap:8px;margin-bottom:14px" id="fleet-category-list">
        ${STANDARD_FLEET_TYPES.map((f) => {
          const checked = isChecked(f);
          return `
          <label class="row" style="align-items:center;justify-content:space-between;padding:9px 12px;background:${checked ? 'var(--gold-soft)' : 'var(--surface-2)'};border-radius:6px;cursor:pointer;border:1px solid ${checked ? 'var(--gold)' : 'var(--line)'};transition:all .15s">
            <div class="row" style="gap:10px;align-items:center">
              <input type="checkbox" class="fleet-type-checkbox" value="${attr(f.label)}" ${checked ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer">
              <div>
                <div style="font-weight:600;font-size:.85rem;color:var(--ink)">${f.icon} ${esc(f.label)}</div>
                <div class="tiny muted">${esc(f.desc)}</div>
              </div>
            </div>
            <span class="chip tiny outline" style="font-family:monospace;white-space:nowrap">${esc(f.badge)}</span>
          </label>`;
        }).join('')}
      </div>

      <!-- Custom Fleet Tag Input -->
      <div class="label eyebrow" style="margin-top:6px">Custom Fleet Type</div>
      <div class="row" style="gap:8px;margin-bottom:8px">
        <input type="text" id="custom-fleet-input" placeholder="e.g. Vintage Alfa Romeo, 35-seat Midi..." style="font-size:.85rem;padding:6px 10px;flex:1">
        <button class="btn sm" id="btn-add-custom-fleet" type="button">+ Add</button>
      </div>

      <div id="custom-tags-container" class="row" style="gap:6px;flex-wrap:wrap;min-height:24px;margin-bottom:16px"></div>

      <div class="row" style="justify-content:flex-end;gap:8px">
        <button class="btn ghost" data-close>Cancel</button>
        <button class="btn primary" id="modal-save-fleet">Save Fleet Categories</button>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    // Dynamic style update for checkboxes
    backdrop.querySelectorAll('.fleet-type-checkbox').forEach((cb) => {
      cb.addEventListener('change', () => {
        const parentLabel = cb.closest('label');
        if (cb.checked) {
          parentLabel.style.borderColor = 'var(--gold)';
          parentLabel.style.background = 'var(--gold-soft)';
        } else {
          parentLabel.style.borderColor = 'var(--line)';
          parentLabel.style.background = 'var(--surface-2)';
        }
      });
    });

    const renderCustomTags = () => {
      const container = backdrop.querySelector('#custom-tags-container');
      container.innerHTML = customTags.map((c) => `
        <span class="chip outline" style="display:inline-flex;align-items:center;gap:4px;font-size:.75rem">
          ${esc(c)}
          <button type="button" class="btn-remove-custom" data-name="${attr(c)}" style="border:none;background:none;cursor:pointer;padding:0;font-size:.7rem;color:var(--bad)">✕</button>
        </span>
      `).join('');
      container.querySelectorAll('.btn-remove-custom').forEach((btn) => {
        btn.addEventListener('click', () => {
          const name = btn.dataset.name;
          const idx = customTags.indexOf(name);
          if (idx >= 0) customTags.splice(idx, 1);
          renderCustomTags();
        });
      });
    };
    renderCustomTags();

    backdrop.querySelector('#btn-add-custom-fleet').addEventListener('click', () => {
      const inp = backdrop.querySelector('#custom-fleet-input');
      const val = inp.value.trim();
      if (!val) return;
      if (!customTags.includes(val)) {
        customTags.push(val);
        renderCustomTags();
      }
      inp.value = '';
    });

    backdrop.querySelector('#modal-save-fleet').addEventListener('click', async () => {
      const selected = Array.from(backdrop.querySelectorAll('.fleet-type-checkbox:checked')).map((cb) => cb.value);
      customTags.forEach((t) => {
        if (!selected.includes(t)) selected.push(t);
      });
      await updateBusPartner(partner.id, { fleet_categories: selected });
      toast('Fleet categories updated');
      close();
      paint();
    });
  }

  // --- Auto-Scout by URL Modal ---
  function openScoutUrlModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `
    <div class="dialog card stack" style="max-width:540px;padding:24px">
      <div class="row between">
        <div>
          <div class="label eyebrow">AI & Web Signal Scout</div>
          <h3 style="margin:2px 0 0">Scout & Evaluate Operator URL</h3>
        </div>
        <button class="btn ghost sm" data-close>×</button>
      </div>

      <p class="small muted" style="margin:8px 0 14px">
        Insert any coach or minibus operator website link. Our system will analyze fleet signals, test the 100-Point Relevance Gate, and prepare it for your CRM manifest.
      </p>

      <div class="stack" style="gap:12px">
        <label class="field">
          <span style="font-weight:600">Operator Website URL</span>
          <input type="url" id="scout-url-input" placeholder="https://www.operator.it" style="font-size:.9rem;padding:8px 12px;width:100%">
        </label>

        <div class="row" style="gap:8px">
          <label class="field grow">
            <span>Base City / Province Hint</span>
            <input type="text" id="scout-city-input" placeholder="e.g. Milano, Como, Bergamo..." style="font-size:.85rem;padding:7px 10px">
          </label>
          <div style="display:flex;align-items:flex-end">
            <button class="btn primary" id="btn-run-scout-eval" style="height:36px;white-space:nowrap">Run Evaluation</button>
          </div>
        </div>

        <div id="scout-eval-preview" style="display:none;margin-top:10px" class="card stack">
          <!-- Populated dynamically on evaluation -->
        </div>
      </div>

      <div class="row" style="justify-content:flex-end;gap:8px;margin-top:16px">
        <button class="btn ghost" data-close>Cancel</button>
        <button class="btn primary" id="btn-scout-add-crm" style="display:none">Add to CRM Manifest</button>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    let evaluatedPartner = null;

    const runEval = () => {
      const url = backdrop.querySelector('#scout-url-input').value.trim();
      if (!url) { toast('Please insert a valid website URL', 'warn'); return; }

      const cityHint = backdrop.querySelector('#scout-city-input').value.trim();
      const previewEl = backdrop.querySelector('#scout-eval-preview');
      const addBtn = backdrop.querySelector('#btn-scout-add-crm');

      const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return url.toLowerCase(); } })();
      const known = SCOUT_CANDIDATE_POOL.find((c) => c.website.toLowerCase().includes(host)) ||
                    (S.busPartners || []).find((c) => (c.website || '').toLowerCase().includes(host));

      let res;
      let pName;
      let pCity;
      let pCats;
      let pNotes;
      let pEmail;
      let pPhone;
      let pUnbranded;

      if (known) {
        pName = known.name;
        pCity = known.base_city || cityHint || 'Northern Italy';
        pCats = Array.isArray(known.fleet_categories) ? [...known.fleet_categories] : ['Executive Minibus & Coach'];
        pNotes = known.notes || 'Verified Northern Italy operator.';
        pEmail = known.email || '';
        pPhone = known.phone || '';
        pUnbranded = known.unbranded_status || '100% Guaranteed Unbranded / Total Black';
        res = {
          total_score: known.relevance_score,
          breakdown: known.score_breakdown || { discretion_unbranded: 35, fleet_luxury: 23, territory_permits: 20, corporate_sla: 15 },
          tier_info: core.getPriorityTier(known.relevance_score)
        };
      } else {
        const cleanHost = host.replace(/\.(it|com|eu|net)$/, '').replace(/[-_.]/g, ' ');
        pName = cleanHost.charAt(0).toUpperCase() + cleanHost.slice(1);
        pCity = cityHint || (host.includes('como') ? 'Como' : host.includes('bergamo') ? 'Bergamo' : host.includes('monza') ? 'Monza' : 'Milano');
        
        const syntheticText = `${url} ${host} ${pCity} noleggio con conducente luxury transfer mercedes sprinter vip midibus granturismo total black vetri oscurati senza scritte chauffeur service lake como milan area c ztl`;
        const evaluated = core.scoreFromWebSignals(syntheticText, { base_city: pCity });
        res = {
          total_score: evaluated.total_score,
          breakdown: evaluated.breakdown,
          tier_info: core.getPriorityTier(evaluated.total_score)
        };
        pUnbranded = evaluated.breakdown.discretion_unbranded >= 30 ? '100% Guaranteed Unbranded / Total Black' : 'Unbranded on Request';
        pCats = ['Mercedes Sprinter VIP (8–16 seats)', 'Executive Midibus (24–30 seats)'];
        pNotes = `Evaluated from web signals for ${host}. Discretion: ${evaluated.breakdown.discretion_unbranded}/35.`;
        pEmail = `info@${host}`;
        pPhone = '';
      }

      evaluatedPartner = {
        name: pName,
        base_city: pCity,
        website: url.startsWith('http') ? url : `https://${url}`,
        fleet_url: `${url.startsWith('http') ? url : `https://${url}`}/flotta`,
        phone: pPhone,
        email: pEmail,
        relevance_score: res.total_score,
        score_breakdown: res.breakdown,
        unbranded_status: pUnbranded,
        status: res.total_score >= 80 ? 'WANT_TO_CONTACT' : 'TO_REVIEW',
        fleet_categories: pCats,
        notes: pNotes
      };

      previewEl.style.display = 'block';
      previewEl.innerHTML = `
        <div class="row between" style="align-items:center;border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:10px">
          <div>
            <div class="label eyebrow">Score &amp; Classification</div>
            <h4 style="margin:2px 0 0;font-size:1.05rem">${esc(pName)}</h4>
            <span class="tiny muted">📍 ${esc(pCity)} · ${esc(host)}</span>
          </div>
          <div style="text-align:right">
            <span class="chip ${res.total_score >= 80 ? 'ok' : res.total_score >= 70 ? 'gold' : ''}" style="font-size:1.1rem;font-weight:700">
              ${res.total_score} / 100
            </span>
            <div class="tiny" style="color:var(--text-3);margin-top:2px">${esc(res.tier_info.badge)}</div>
          </div>
        </div>

        <div class="grid-2" style="gap:8px;font-size:.8rem;margin-bottom:10px">
          <div style="background:var(--surface-2);padding:6px 10px;border-radius:4px">
            <div class="tiny muted">1. Discretion & Livery</div>
            <b>${res.breakdown.discretion_unbranded} / 35 pts</b>
          </div>
          <div style="background:var(--surface-2);padding:6px 10px;border-radius:4px">
            <div class="tiny muted">2. Fleet Spec</div>
            <b>${res.breakdown.fleet_luxury} / 25 pts</b>
          </div>
          <div style="background:var(--surface-2);padding:6px 10px;border-radius:4px">
            <div class="tiny muted">3. Territory & Permits</div>
            <b>${res.breakdown.territory_permits} / 20 pts</b>
          </div>
          <div style="background:var(--surface-2);padding:6px 10px;border-radius:4px">
            <div class="tiny muted">4. Corporate SLA</div>
            <b>${res.breakdown.corporate_sla} / 20 pts</b>
          </div>
        </div>

        <div class="stack" style="gap:4px">
          <span class="tiny muted">Detected Fleet:</span>
          <div class="row" style="gap:4px;flex-wrap:wrap">
            ${pCats.map((c) => `<span class="chip tiny outline">${esc(c)}</span>`).join('')}
          </div>
        </div>`;

      addBtn.style.display = 'inline-flex';
      addBtn.textContent = `Add ${pName} to CRM`;
    };

    backdrop.querySelector('#btn-run-scout-eval').addEventListener('click', runEval);
    backdrop.querySelector('#scout-url-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); runEval(); }
    });

    backdrop.querySelector('#btn-scout-add-crm').addEventListener('click', async () => {
      if (!evaluatedPartner) return;
      await addBusPartner(evaluatedPartner);
      toast(`Added "${evaluatedPartner.name}" to CRM Manifest (Score: ${evaluatedPartner.relevance_score})`);
      close();
      paint();
    });
  }

  // --- Auto-Scout Fleet Modal (Multi-Filter Scout Engine) ---
  function openAutoScoutModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `
    <div class="dialog card stack" style="max-width:560px;padding:24px">
      <div class="row between">
        <div>
          <div class="label eyebrow">Automated Fleet Discovery</div>
          <h3 style="margin:2px 0 0">Auto-Scout Fleet Operators</h3>
        </div>
        <button class="btn ghost sm" data-close>×</button>
      </div>

      <p class="small muted" style="margin:8px 0 14px">
        Configure criteria to scout, evaluate through the 100-Point Relevance Gate, and automatically import matching luxury coach & minibus operators into your CRM:
      </p>

      <div class="stack" style="gap:12px">
        <!-- 1. Location / Territory -->
        <label class="field">
          <span style="font-weight:600">1. Territory / Base Location</span>
          <select id="auto-scout-location" class="sm" style="padding:6px 10px;width:100%">
            <option value="all" selected>📍 All Northern Italy (Milan, Como, Alps, Lakes)</option>
            <option value="como">🌊 Lake Como & Lecco (Villa access & narrow roads)</option>
            <option value="milan">🏙️ Milan Metropolitan (Milano / Monza)</option>
            <option value="east">🛫 Bergamo & Brescia (Orio al Serio & East)</option>
            <option value="garda">🍇 Lake Garda & Verona (Sirmione / Bardolino)</option>
            <option value="alps">🏔️ Alps & Valtellina (Bormio / St. Moritz)</option>
          </select>
        </label>

        <!-- 2. How many? & Min Score -->
        <div class="row" style="gap:10px">
          <label class="field grow">
            <span style="font-weight:600">2. How Many Operators?</span>
            <select id="auto-scout-count" class="sm" style="padding:6px 10px">
              <option value="3">3 operators</option>
              <option value="5" selected>5 operators</option>
              <option value="10">10 operators</option>
              <option value="all">All qualified matches</option>
            </select>
          </label>

          <label class="field grow">
            <span style="font-weight:600">3. Min Relevance Score</span>
            <select id="auto-scout-min-score" class="sm" style="padding:6px 10px">
              <option value="80" selected>⭐ Score ≥ 80 (Tier 1: VIP Unbranded)</option>
              <option value="70">🚐 Score ≥ 70 (Tier 2: Qualified)</option>
              <option value="50">🚌 Score ≥ 50 (Tier 3: Standard Commercial)</option>
              <option value="0">All Scores (Unfiltered)</option>
            </select>
          </label>
        </div>

        <!-- 4. What kind of cars? -->
        <div class="stack" style="gap:6px">
          <span style="font-weight:600;font-size:.85rem">4. Required Vehicle Platforms</span>
          <div class="stack" style="gap:6px" id="scout-cars-container">
            ${STANDARD_FLEET_TYPES.map((f) => `
              <label class="row" style="align-items:center;gap:8px;padding:6px 10px;background:var(--surface-2);border-radius:4px;cursor:pointer;border:1px solid var(--line)">
                <input type="checkbox" class="scout-car-check" value="${attr(f.key)}" checked style="cursor:pointer">
                <span style="font-size:.83rem;font-weight:600">${f.icon} ${esc(f.label)}</span>
                <span class="chip tiny outline" style="margin-left:auto">${esc(f.badge)}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="row" style="justify-content:flex-end;gap:8px;margin-top:16px">
        <button class="btn ghost" data-close>Cancel</button>
        <button class="btn primary" id="btn-run-auto-scout">Run Analysis & Add to CRM</button>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    backdrop.querySelector('#btn-run-auto-scout').addEventListener('click', async () => {
      const location = backdrop.querySelector('#auto-scout-location').value;
      const countVal = backdrop.querySelector('#auto-scout-count').value;
      const count = countVal === 'all' ? Infinity : parseInt(countVal, 10);
      const minScore = parseInt(backdrop.querySelector('#auto-scout-min-score').value, 10);
      const selectedCars = Array.from(backdrop.querySelectorAll('.scout-car-check:checked')).map((cb) => cb.value);

      if (!selectedCars.length) {
        toast('Please select at least one vehicle platform', 'warn');
        return;
      }

      const existing = S.busPartners || [];
      const existingNames = new Set(existing.map((p) => p.name.toLowerCase()));
      const existingDomains = new Set(existing.map((p) => {
        try { return new URL(p.website).hostname.replace(/^www\./, '').toLowerCase(); } catch (_) { return ''; }
      }).filter(Boolean));

      let candidates = SCOUT_CANDIDATE_POOL.filter((c) => {
        if (existingNames.has(c.name.toLowerCase())) return false;
        try {
          const dom = new URL(c.website).hostname.replace(/^www\./, '').toLowerCase();
          if (existingDomains.has(dom)) return false;
        } catch (_) {}

        if ((c.relevance_score || 0) < minScore) return false;

        const city = (c.base_city || '').toLowerCase();
        if (location === 'como' && !city.includes('como') && !city.includes('lecco')) return false;
        if (location === 'milan' && !city.includes('milan') && !city.includes('monza')) return false;
        if (location === 'east' && !city.includes('bergamo') && !city.includes('brescia')) return false;
        if (location === 'garda' && !city.includes('garda') && !city.includes('verona') && !city.includes('brescia')) return false;
        if (location === 'alps' && !city.includes('sondrio') && !city.includes('bormio') && !city.includes('alps')) return false;

        const catStr = (c.fleet_categories || []).join(' ').toLowerCase();
        const matchesCar = selectedCars.some((key) => {
          if (key === 'v_class') return /v-?class|minivan/i.test(catStr);
          if (key === 'sprinter_vip') return /sprinter.*vip/i.test(catStr);
          if (key === 'sprinter_lux') return /sprinter.*lux/i.test(catStr);
          if (key === 'midibus') return /midi/i.test(catStr);
          if (key === 'limobus') return /limobus/i.test(catStr);
          if (key === 'gt_coach') return /coach|tourismo|setra/i.test(catStr);
          return true;
        });
        return matchesCar;
      });

      if (!candidates.length) {
        toast('All matching operators for these filters are already in your CRM!', 'ok');
        close();
        return;
      }

      const toAdd = candidates.slice(0, count);

      for (const op of toAdd) {
        await addBusPartner(op);
      }

      toast(`⚡ Scout complete: Added ${toAdd.length} verified operator${toAdd.length === 1 ? '' : 's'} to CRM!`);
      close();
      paint();
    });
  }

  function openEmailModal(partner) {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `
    <div class="dialog card stack" style="max-width:440px;padding:24px">
      <div class="row between">
        <div>
          <div class="label eyebrow">Partner Contact</div>
          <h3>${esc(partner.name)}</h3>
        </div>
        <button class="btn ghost sm" data-close>×</button>
      </div>
      <div class="stack" style="gap:10px;margin:14px 0">
        <label class="field">
          <span style="font-weight:600;font-size:.85rem">Direct Booking / Dispatch Email</span>
          <input type="email" id="modal-quick-email" placeholder="e.g. booking@operator.it" value="${attr(partner.email || '')}" style="font-size:.9rem;padding:8px 12px;width:100%">
        </label>
        <span class="tiny muted">Email address used for B2B dispatch inquiries, quote requests, and rate sheets.</span>
      </div>
      <div class="row" style="justify-content:flex-end;gap:8px">
        <button class="btn ghost" data-close>Cancel</button>
        <button class="btn primary" id="modal-save-quick-email">Save Email</button>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const input = backdrop.querySelector('#modal-quick-email');
    setTimeout(() => input?.focus(), 50);

    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    const save = async () => {
      const email = input.value.trim();
      await updateBusPartner(partner.id, { email });
      toast(email ? `Email saved: ${email}` : 'Email removed');
      close();
      paint();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      }
    });
    backdrop.querySelector('#modal-save-quick-email').addEventListener('click', save);
  }

  function openNotesModal(partner) {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `
    <div class="dialog card stack" style="max-width:540px;padding:24px">
      <div class="row between">
        <div>
          <div class="label eyebrow">Partner Details & Dispatch</div>
          <h3>${esc(partner.name)}</h3>
        </div>
        <button class="btn ghost sm" data-close>×</button>
      </div>
      <div class="stack" style="gap:12px;margin:12px 0">
        <div class="row" style="gap:8px">
          <label class="field grow">
            <span>Direct Email</span>
            <input type="email" id="modal-email" placeholder="e.g. booking@operator.it" value="${attr(partner.email || '')}">
          </label>
          <label class="field grow">
            <span>Direct Phone / WhatsApp</span>
            <input type="text" id="modal-phone" placeholder="e.g. +39 02 ..." value="${attr(partner.phone || '')}">
          </label>
        </div>
        <div class="row" style="gap:8px">
          <label class="field grow">
            <span>Website URL</span>
            <input type="url" id="modal-website" placeholder="https://..." value="${attr(partner.website || '')}">
          </label>
          <label class="field grow">
            <span>Fleet URL</span>
            <input type="url" id="modal-fleet" placeholder="https://.../flotta" value="${attr(partner.fleet_url || '')}">
          </label>
        </div>
        <label class="field">
          <span>Status & Relevance</span>
          <select id="modal-status" class="sm" style="padding:5px 8px;border-radius:4px;border:1px solid var(--border);background:var(--surface)">
            ${core.BUS_STATUSES.map((st) => `<option value="${st.key}" ${partner.status === st.key ? 'selected' : ''}>${st.label}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span>Booking & Discretion Notes</span>
          <textarea id="modal-notes" rows="4" style="font-family:inherit;font-size:.88rem" placeholder="e.g. Suited chauffeurs, zero decals, villa access experience...">${esc(partner.notes || '')}</textarea>
        </label>
      </div>
      <div class="row" style="justify-content:flex-end;gap:8px">
        <button class="btn ghost" data-close>Cancel</button>
        <button class="btn primary" id="modal-save-notes">Save Changes</button>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    backdrop.querySelector('#modal-save-notes').addEventListener('click', async () => {
      const email = backdrop.querySelector('#modal-email').value.trim();
      const phone = backdrop.querySelector('#modal-phone').value.trim();
      const website = backdrop.querySelector('#modal-website').value.trim();
      const fleet_url = backdrop.querySelector('#modal-fleet').value.trim();
      const status = backdrop.querySelector('#modal-status').value;
      const notes = backdrop.querySelector('#modal-notes').value.trim();

      await updateBusPartner(partner.id, { email, phone, website, fleet_url, status, notes });
      toast('Partner details and notes saved');
      close();
      paint();
    });
  }

  function openScoreBreakdownModal(partner) {
    const scoreRes = core.calculateBusRelevanceScore(partner);
    const bd = scoreRes.breakdown;
    const tier = core.getPriorityTier(scoreRes.total_score);

    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `
    <div class="dialog card stack" style="max-width:540px;padding:24px">
      <div class="row between">
        <div>
          <div class="label eyebrow">${tier.badge}</div>
          <h3>${esc(partner.name)}: 100-Point Audit</h3>
        </div>
        <button class="btn ghost sm" data-close>×</button>
      </div>

      <div class="card row between" style="align-items:center;background:var(--surface);padding:14px;margin:10px 0">
        <div>
          <div style="font-size:1.8rem;font-weight:700;color:${tier.color}">${scoreRes.total_score} <span style="font-size:1rem;color:var(--text-3)">/ 100</span></div>
          <div class="small">${tier.label}</div>
        </div>
        <span class="chip ${tier.tone}">${tier.action}</span>
      </div>

      <div class="stack" style="gap:10px">
        <div class="card flush" style="padding:10px 14px">
          <div class="row between">
            <b>1. Discretion & Exterior Livery</b>
            <span class="chip ok">${bd.discretion_unbranded} / 35 pts</span>
          </div>
          <p class="tiny muted" style="margin-top:4px">
            ${partner.unbranded_status || 'Evaluated for plain/monochromatic exterior and zero billboard decals.'}
          </p>
        </div>

        <div class="card flush" style="padding:10px 14px">
          <div class="row between">
            <b>2. Fleet Tier & Luxury Spec</b>
            <span class="chip ok">${bd.fleet_luxury} / 25 pts</span>
          </div>
          <p class="tiny muted" style="margin-top:4px">
            ${Array.isArray(partner.fleet_categories) ? partner.fleet_categories.join(', ') : 'Sprinter VIP / Executive Coaches'}
          </p>
        </div>

        <div class="card flush" style="padding:10px 14px">
          <div class="row between">
            <b>3. Territory, Access & Permits</b>
            <span class="chip ok">${bd.territory_permits} / 20 pts</span>
          </div>
          <p class="tiny muted" style="margin-top:4px">
            Base: ${esc(partner.base_city || 'Milan')}. Milan Area C/ZTL and Lake Como historic villa access.
          </p>
        </div>

        <div class="card flush" style="padding:10px 14px">
          <div class="row between">
            <b>4. Chauffeur & B2B SLA Standards</b>
            <span class="chip ok">${bd.corporate_sla} / 20 pts</span>
          </div>
          <p class="tiny muted" style="margin-top:4px">
            Suited chauffeurs, 24/7 central dispatch, EU VAT / Italian electronic invoicing.
          </p>
        </div>
      </div>

      <div class="row" style="justify-content:flex-end;margin-top:14px">
        <button class="btn primary sm" data-close>Close</button>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  }

  function openAddPartnerModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `
    <div class="dialog card stack" style="max-width:580px;padding:24px;max-height:90vh;overflow-y:auto">
      <div class="row between">
        <h3>Add New Bus Fleet Partner</h3>
        <button class="btn ghost sm" data-close>×</button>
      </div>

      <div class="stack" style="gap:10px;margin:12px 0">
        <label class="field">
          <span>Company Name *</span>
          <input type="text" id="add-name" required placeholder="e.g. VIP Coaches Milano">
        </label>

        <div class="row" style="gap:8px">
          <label class="field grow">
            <span>Base City *</span>
            <input type="text" id="add-city" placeholder="e.g. Milano / Como / Bergamo">
          </label>
          <label class="field grow">
            <span>Direct Phone</span>
            <input type="text" id="add-phone" placeholder="+39 02 ...">
          </label>
        </div>

        <div class="row" style="gap:8px">
          <label class="field grow">
            <span>Website URL</span>
            <input type="url" id="add-web" placeholder="https://...">
          </label>
          <label class="field grow">
            <span>Fleet Gallery URL</span>
            <input type="url" id="add-fleet" placeholder="https://.../fleet">
          </label>
        </div>

        <label class="field">
          <span>Direct Contact Email</span>
          <input type="email" id="add-email" placeholder="booking@...">
        </label>

        <div class="divider" style="margin:8px 0"></div>
        <label class="field">
          <span>Fleet Categories (Quick Select)</span>
          <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:4px" id="add-fleet-pills">
            ${STANDARD_FLEET_TYPES.map((f) => `
              <label class="chip outline clickable" style="cursor:pointer;font-size:.74rem;padding:3px 7px;display:inline-flex;align-items:center;gap:4px">
                <input type="checkbox" class="add-fleet-check" value="${attr(f.label)}" style="width:13px;height:13px;cursor:pointer">
                ${f.icon} ${esc(f.short)}
              </label>
            `).join('')}
          </div>
        </label>

        <div class="divider" style="margin:8px 0"></div>
        <div class="label eyebrow">100-Point Relevance Calculator</div>

        <label class="field">
          <span>1. Discretion & Exterior Livery (Max 35)</span>
          <select id="calc-discretion" class="sm">
            <option value="35">🛡️ 35 pts - 100% Guaranteed Unbranded / Total Black</option>
            <option value="20" selected>⚠️ 20 pts - Unbranded on Request (Agrees in writing)</option>
            <option value="5">❌ 5 pts - Commercial Billboard Decals</option>
          </select>
        </label>

        <label class="field">
          <span>2. Fleet Category & Luxury Spec (Max 25)</span>
          <select id="calc-fleet" class="sm">
            <option value="25">⭐ 25 pts - Mercedes Sprinter VIP / Setra VIP Lounge (8-28 seats)</option>
            <option value="18" selected>🚐 18 pts - Modern Mercedes Tourismo / Setra GT (30-54 seats)</option>
            <option value="8">🚌 8 pts - Standard Iveco / Scania tourist coach</option>
          </select>
        </label>

        <label class="field">
          <span>3. Territory & Permits (Max 20)</span>
          <select id="calc-territory" class="sm">
            <option value="20" selected>🏙️ 20 pts - Milan Area C/ZTL + Lake Como Villa Access + Alps</option>
            <option value="12">✈️ 12 pts - Milan Airports & Motorways Only</option>
            <option value="5">📍 5 pts - Peripheral Provincial Base</option>
          </select>
        </label>

        <label class="field">
          <span>4. Chauffeur & Corporate SLA (Max 20)</span>
          <select id="calc-sla" class="sm">
            <option value="20" selected>👔 20 pts - Suited Drivers + English-Speaking + 24/7 Dispatch</option>
            <option value="10">👨‍💼 10 pts - Standard Commercial Driver + Office Hours</option>
          </select>
        </label>

        <div class="card row between" style="align-items:center;padding:10px 14px;background:var(--surface)">
          <span style="font-weight:600">Calculated Score:</span>
          <span id="calc-preview-score" style="font-size:1.3rem;font-weight:700;color:var(--ok)">78 / 100</span>
        </div>

        <label class="field">
          <span>Dispatch & Fleet Notes</span>
          <textarea id="add-notes" rows="2" placeholder="e.g. Suited chauffeurs, requests must mention 'senza scritte'"></textarea>
        </label>
      </div>

      <div class="row" style="justify-content:flex-end;gap:8px">
        <button class="btn ghost" data-close>Cancel</button>
        <button class="btn primary" id="btn-save-new-partner">Add to Database</button>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    // Dynamic score preview update
    const updatePreview = () => {
      const d = parseInt(backdrop.querySelector('#calc-discretion').value, 10);
      const f = parseInt(backdrop.querySelector('#calc-fleet').value, 10);
      const t = parseInt(backdrop.querySelector('#calc-territory').value, 10);
      const s = parseInt(backdrop.querySelector('#calc-sla').value, 10);
      const sum = d + f + t + s;
      const tier = core.getPriorityTier(sum);
      const elScore = backdrop.querySelector('#calc-preview-score');
      elScore.textContent = `${sum} / 100 (${tier.badge})`;
      elScore.style.color = tier.color;
    };

    ['#calc-discretion', '#calc-fleet', '#calc-territory', '#calc-sla'].forEach((sel) => {
      backdrop.querySelector(sel).addEventListener('change', updatePreview);
    });
    updatePreview();

    backdrop.querySelector('#btn-save-new-partner').addEventListener('click', async () => {
      const name = backdrop.querySelector('#add-name').value.trim();
      if (!name) { toast('Please enter a company name', 'warn'); return; }

      const city = backdrop.querySelector('#add-city').value.trim() || 'Northern Italy';
      const phone = backdrop.querySelector('#add-phone').value.trim();
      const website = backdrop.querySelector('#add-web').value.trim();
      const fleet_url = backdrop.querySelector('#add-fleet').value.trim();
      const email = backdrop.querySelector('#add-email').value.trim();
      const notes = backdrop.querySelector('#add-notes').value.trim();

      const d = parseInt(backdrop.querySelector('#calc-discretion').value, 10);
      const f = parseInt(backdrop.querySelector('#calc-fleet').value, 10);
      const t = parseInt(backdrop.querySelector('#calc-territory').value, 10);
      const s = parseInt(backdrop.querySelector('#calc-sla').value, 10);
      const sum = d + f + t + s;

      const unbranded_status = d === 35 ? '100% Guaranteed Unbranded / Total Black' : d === 20 ? 'Unbranded on Request' : 'Standard Commercial Livery';

      const checkedFleet = Array.from(backdrop.querySelectorAll('.add-fleet-check:checked')).map((cb) => cb.value);
      const fleet_categories = checkedFleet.length ? checkedFleet : ['Executive Minibus & Coach'];

      await addBusPartner({
        name,
        base_city: city,
        phone,
        website,
        fleet_url,
        email,
        notes,
        relevance_score: sum,
        score_breakdown: {
          discretion_unbranded: d,
          fleet_luxury: f,
          territory_permits: t,
          corporate_sla: s
        },
        unbranded_status,
        status: 'TO_REVIEW',
        fleet_categories
      });

      toast(`Added ${name} with Relevance Score ${sum}/100`);
      close();
      paint();
    });
  }
}
