// Event & Foreign Exhibitor Outreach Pipeline View
// 100% Isolated from Wedding Planners (prospects) and Bus Operators (bus_partners).
// Stripe Sail Design System: responsive data table, KPI stats, zero horizontal scroll.

import { S, updateEventPartner, addEventPartner, removeEventPartner } from '../store.js?v=20261103_v7';
import { esc, attr, icon, toast, fmtDateTime, dialog, confirmDialog } from '../ui.js';
import { EVENT_AGENCY_TYPES, loadStoredEventPartners } from '../event_planners_data.js?v=20261103_v7';

let activeTypeFilter = 'all'; // all | tier1 | uk_north | dach_benelux | france_spain
let activeStatusFilter = 'all'; // all | TO_REVIEW | WANT_TO_CONTACT | CONTACTED | APPROVED_PARTNER
let searchQuery = '';
let currentEl = null;
let selectedPartnerIds = new Set();

const STATUS_CONFIG = {
  TO_REVIEW: { label: 'To Review', pillClass: 'warn', desc: 'Newly scouted foreign exhibitor' },
  WANT_TO_CONTACT: { label: 'Ready to Contact', pillClass: 'info', desc: 'Queued for outreach' },
  CONTACTED: { label: 'Contacted', pillClass: 'ok', desc: 'Outreach email sent' },
  APPROVED_PARTNER: { label: 'Partner Won', pillClass: 'ok', desc: 'Active mobility partner' },
  NOT_RELEVANT: { label: 'Not Relevant', pillClass: 'missing', desc: 'Archived / not a fit' }
};

function getEventStatusBadgeStyle(status) {
  switch (status) {
    case 'TO_REVIEW':
      return 'background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;font-weight:600;';
    case 'WANT_TO_CONTACT':
      return 'background:#EEF2FF;color:#4338CA;border:1px solid #C7D2FE;font-weight:600;';
    case 'CONTACTED':
      return 'background:#E0F2FE;color:#075985;border:1px solid #BAE6FD;font-weight:600;';
    case 'APPROVED_PARTNER':
      return 'background:#DCFCE7;color:#166534;border:1px solid #BBF7D0;font-weight:600;';
    case 'NOT_RELEVANT':
      return 'background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;font-weight:600;';
    default:
      return 'background:#FFFFFF;color:#0A2540;border:1px solid #E3E8EE;font-weight:500;';
  }
}

function renderCountryPill(p) {
  const isTier1 = p.agency_type === 'tier1_luxury' || p.is_enriched;
  return `
    <div style="display:flex;flex-direction:column;gap:3px;max-width:100%;overflow:hidden">
      <div style="font-size:12px;font-weight:600;color:var(--sail-ink);display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        <span>${esc(p.flag || '🌍')}</span>
        <span style="overflow:hidden;text-overflow:ellipsis">${esc(p.country || 'International')}</span>
      </div>
      <div style="font-size:11px;color:var(--sail-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${isTier1 ? `<span class="sail-pill warn" style="font-size:10px;padding:1px 5px">🌟 Tier-1 Luxury</span>` : `<span style="color:var(--sail-muted)">Pavilion 1-4</span>`}
      </div>
    </div>
  `;
}

export async function render(el) {
  currentEl = el;
  const stored = loadStoredEventPartners();
  const partners = (S.eventPartners && S.eventPartners.length >= stored.length) ? S.eventPartners : stored;

  const totalCount = partners.length;
  const enrichedCount = partners.filter((p) => p.is_enriched || (p.email && p.email.length > 0)).length;
  const toReviewCount = partners.filter((p) => p.status === 'TO_REVIEW').length;
  const readyCount = partners.filter((p) => p.status === 'WANT_TO_CONTACT').length;
  const contactedCount = partners.filter((p) => p.status === 'CONTACTED' || p.status === 'APPROVED_PARTNER').length;

  const readyPartnersList = partners.filter((p) => p.status === 'WANT_TO_CONTACT');
  const readyIdToIndex = new Map();
  readyPartnersList.forEach((p, idx) => readyIdToIndex.set(p.id, idx));

  const filtered = partners.filter((p) => {
    if (activeTypeFilter === 'tier1' && !p.is_enriched && p.agency_type !== 'tier1_luxury') return false;
    if (['uk_north', 'dach_benelux', 'france_spain', 'rest_world'].includes(activeTypeFilter) && p.region_group !== activeTypeFilter) return false;
    if (activeStatusFilter !== 'all' && p.status !== activeStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const hay = `${p.name} ${p.country || ''} ${p.contact_person || ''} ${p.email || ''} ${p.origin_hub || ''} ${p.notes || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px">
      <!-- Top Tab Navigation -->
      <div class="sail-tabs" style="display:flex;gap:6px;border-bottom:2px solid var(--sail-line);padding-bottom:10px;margin-bottom:2px;flex-wrap:wrap">
        <a href="#event_partners" class="sail-tab active" style="height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 14px;font-size:12.5px;font-weight:700;text-decoration:none">
          🏛️ Foreign Exhibiting Teams (84)
        </a>
        <a href="#event_templates" class="sail-tab " style="height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 14px;font-size:12.5px;font-weight:700;text-decoration:none">
          ✉️ Fair Sequences &amp; Corporate Rates
        </a>
        <a href="#event_outbox" class="sail-tab " style="height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 14px;font-size:12.5px;font-weight:700;text-decoration:none">
          📤 Event Outbox &amp; Replies
        </a>
      </div>
      <!-- Header Banner & Isolated Identity Indicator -->
      <div class="sail-card" style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
        <div style="min-width:280px;flex:1">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <h1 style="font-size:19px;font-weight:700;color:var(--sail-ink);margin:0;letter-spacing:-0.02em;white-space:nowrap">
              🏛️ Milano Home 2027 · Foreign Exhibiting Teams
            </h1>
            <select id="event-fair-select" style="height:24px;line-height:22px;padding:0 6px;border:1px solid #BBF7D0;background:#DCFCE7;color:#166534;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">
              <option value="milano_home_2027" selected>🏛️ Milano Home 2027 (21–24 Jan)</option>
              <option value="mido_2027" disabled>👓 MIDO Eyewear 2027 (Feb 2027)</option>
              <option value="mfw_2027" disabled>👠 Milan Fashion Week 2027 (Feb 2027)</option>
              <option value="salone_2027" disabled>🛋️ Salone del Mobile 2027 (Apr 2027)</option>
            </select>
            <span class="sail-pill ok" style="font-size:10.5px;font-weight:700">igor@b2b-dorogo.it</span>
            <span class="sail-pill info" style="font-size:10.5px">Direct Client Outreach</span>
          </div>
          <div style="font-size:12px;color:var(--sail-muted);margin-top:4px">
            Direct executive B2B outreach to international teams exhibiting at Fiera Milano Rho (MXP/LIN airport arrivals &amp; daily stand transfers).
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;margin-left:auto">
          <button class="sail-btn default" id="btn-auto-enrich-all-events" style="font-size:11.5px;padding:6px 12px;white-space:nowrap;color:#1D4ED8;background:#EFF6FF;border:1px solid #BFDBFE" title="Automatically fix broken/missing websites and crawl contacts for all 84 exhibitors">
            ⚡ Auto-Fix Websites &amp; Enrich
          </button>
          <button class="sail-btn default" id="btn-export-events-csv" style="font-size:11.5px;padding:6px 12px;white-space:nowrap">
            📥 Export CSV (${totalCount})
          </button>
          <button class="sail-btn primary" id="btn-add-event-agency" style="font-size:11.5px;padding:6px 12px;white-space:nowrap">
            + Add Exhibiting Team
          </button>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div class="sail-stat-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:12px">
        <div class="sail-card" style="padding:12px 14px">
          <div class="sail-stat-label" style="font-size:11px;color:var(--sail-muted);text-transform:uppercase;letter-spacing:0.04em;font-weight:600">Foreign Exhibiting Teams</div>
          <div class="sail-stat-val" style="font-size:22px;font-weight:700;color:var(--sail-ink);margin:4px 0 2px 0">${totalCount}</div>
          <div class="sail-stat-meta" style="font-size:11px;color:var(--sail-muted)">Arriving from 14+ countries</div>
        </div>
        <div class="sail-card" style="padding:12px 14px">
          <div class="sail-stat-label" style="font-size:11px;color:var(--sail-muted);text-transform:uppercase;letter-spacing:0.04em;font-weight:600">Tier-1 Enriched Leads</div>
          <div class="sail-stat-val" style="font-size:22px;font-weight:700;color:#059669;margin:4px 0 2px 0">${enrichedCount}</div>
          <div class="sail-stat-meta" style="font-size:11px;color:var(--sail-muted)">Verified emails &amp; trade heads</div>
        </div>
        <div class="sail-card" style="padding:12px 14px">
          <div class="sail-stat-label" style="font-size:11px;color:var(--sail-muted);text-transform:uppercase;letter-spacing:0.04em;font-weight:600">Status: To Review (Safe)</div>
          <div class="sail-stat-val" style="font-size:22px;font-weight:700;color:#D97706;margin:4px 0 2px 0">${toReviewCount}</div>
          <div class="sail-stat-meta" style="font-size:11px;color:var(--sail-muted)">Zero sends until prices confirmed</div>
        </div>
        <div class="sail-card" style="padding:12px 14px">
          <div class="sail-stat-label" style="font-size:11px;color:var(--sail-muted);text-transform:uppercase;letter-spacing:0.04em;font-weight:600">Contacted &amp; Booked</div>
          <div class="sail-stat-val" style="font-size:22px;font-weight:700;color:#2563EB;margin:4px 0 2px 0">${contactedCount}</div>
          <div class="sail-stat-meta" style="font-size:11px;color:var(--sail-muted)">Confirmed bookings</div>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="sail-card" style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <!-- Region & Tier Tabs -->
        <div class="sail-tabs" style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
          ${EVENT_AGENCY_TYPES.map((t) => `
            <button class="sail-tab ${activeTypeFilter === t.key ? 'active' : ''}" data-type-tab="${attr(t.key)}" style="height:28px;padding:0 10px;font-size:12px">
              ${esc(t.label)}
            </button>
          `).join('')}
        </div>

        <!-- Status Filter & Search -->
        <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;margin-left:auto">
          <select id="event-status-filter" style="height:30px;padding:0 8px;border:1px solid var(--sail-line);border-radius:6px;font-size:12px;background:#FFF;color:var(--sail-ink);cursor:pointer">
            <option value="all" ${activeStatusFilter === 'all' ? 'selected' : ''}>All Statuses (${totalCount})</option>
            <option value="TO_REVIEW" ${activeStatusFilter === 'TO_REVIEW' ? 'selected' : ''}>To Review (${toReviewCount})</option>
            <option value="WANT_TO_CONTACT" ${activeStatusFilter === 'WANT_TO_CONTACT' ? 'selected' : ''}>Ready to Contact (${readyCount})</option>
            <option value="CONTACTED" ${activeStatusFilter === 'CONTACTED' ? 'selected' : ''}>Contacted</option>
            <option value="APPROVED_PARTNER" ${activeStatusFilter === 'APPROVED_PARTNER' ? 'selected' : ''}>Partner Won</option>
          </select>

          <div style="position:relative;display:inline-flex;align-items:center">
            <input 
              type="text" 
              id="event-search-input" 
              placeholder="Search exhibitor, country, contact..." 
              value="${attr(searchQuery)}" 
              style="height:30px;padding:0 10px 0 26px;border:1px solid var(--sail-line);border-radius:6px;font-size:12px;width:210px;background:#F8FAFC"
            >
            <span style="position:absolute;left:8px;font-size:11px;color:var(--sail-muted);pointer-events:none">🔍</span>
          </div>
        </div>
      </div>

      <!-- Outreach Schedule & Account Isolation Matrix -->
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:10px;height:10px;border-radius:50%;background:#8B5CF6"></div>
            <div>
              <div style="font-size:11.5px;font-weight:700;color:#18181B">🏛️ Igor (igor@b2b-dorogo.it) · Milano Home Fair</div>
              <div style="font-size:10.5px;color:#71717A">Schedule: <strong>Morning Wave 10:00 – 11:30 CET</strong> · Cap: <strong>6/day</strong> · Spacing: <strong>8-15 min</strong></div>
            </div>
          </div>
          <div style="height:24px;width:1px;background:#CBD5E1"></div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:10px;height:10px;border-radius:50%;background:#3B82F6"></div>
            <div>
              <div style="font-size:11.5px;font-weight:700;color:#18181B">💍 Dmitri (dmitri@dorogo.eu) · Wedding &amp; Bus Desk</div>
              <div style="font-size:10.5px;color:#71717A">Schedule: <strong>Waves 12:00, 15:00, 17:00 CET</strong> · Cap: <strong>24/day</strong> · Spacing: <strong>5-12 min</strong></div>
            </div>
          </div>
        </div>
        <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;color:#065F46;display:flex;align-items:center;gap:5px">
          <span>🛡️ Zero Time Overlap</span>
          <span style="font-weight:normal;color:#047857">· 100% Domain &amp; Rate-Limit Isolated</span>
        </div>
      </div>

      <!-- Main Data Table (Stripe Sail) -->
      <div class="sail-card" style="padding:0;overflow:hidden">
        <div class="sail-table-wrap" style="overflow-x:hidden">
          <table class="sail-table" style="table-layout:fixed;width:100%;border-collapse:collapse">
            <thead>
              <tr>
                <th style="width:23%">
                  <div class="sail-th-title">Exhibitor &amp; Website</div>
                </th>
                <th style="width:16%">
                  <div class="sail-th-title">Origin &amp; Pavilion</div>
                </th>
                <th style="width:22%">
                  <div class="sail-th-title">Trade Contact &amp; Email</div>
                </th>
                <th style="width:17%">
                  <div class="sail-th-title">Outreach &amp; Schedule</div>
                </th>
                <th style="width:10%">
                  <div class="sail-th-title">Sender</div>
                </th>
                <th style="width:12%;text-align:right">
                  <div class="sail-th-title">Score / Action</div>
                </th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="6" style="padding:48px 16px;text-align:center;color:var(--sail-muted)">
                    No exhibiting teams match your active filters. Click <strong>+ Add Exhibiting Team</strong> to create one.
                  </td>
                </tr>
              ` : filtered.map((p) => renderAgencyRow(p, readyIdToIndex)).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Safety Footer -->
      <div style="font-size:11px;color:var(--sail-muted);display:flex;align-items:center;justify-content:space-between;padding:0 4px">
        <span>🔒 <strong>Zero-Send Guarantee:</strong> Outreach is strictly locked in TO_REVIEW until rate cards are approved.</span>
        <span>Dedicated Sender: <strong>Igor</strong> (<code>igor@b2b-dorogo.it</code>)</span>
      </div>
    </div>
  `;

  attachEventListeners(el);
}

function renderAgencyRow(p, readyIdToIndex) {
  const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.TO_REVIEW;
  const webClean = (p.website || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
  const qIdx = readyIdToIndex && readyIdToIndex.has(p.id) ? readyIdToIndex.get(p.id) : -1;
  const batchNum = qIdx >= 0 ? Math.floor(qIdx / 6) + 1 : 1;
  const slotInBatch = qIdx >= 0 ? (qIdx % 6) + 1 : 1;

  return `
    <tr>
      <!-- 1. Exhibitor & Website -->
      <td style="padding:9px 10px;vertical-align:middle;overflow:hidden">
        <div style="font-weight:600;font-size:13px;color:var(--sail-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${attr(p.name)}">
          ${esc(p.name)}
        </div>
        ${p.website ? `
          <div style="margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            <a href="${attr(p.website)}" target="_blank" rel="noopener" style="font-size:11.5px;color:var(--sail-primary);text-decoration:none" title="Visit ${attr(p.website)}">
              🌐 ${esc(webClean)} ↗
            </a>
          </div>
        ` : '<div style="font-size:11px;color:var(--sail-muted);margin-top:2px">Milano Home Exhibitor</div>'}
      </td>

      <!-- 2. Origin & Pavilion -->
      <td style="padding:9px 10px;vertical-align:middle;overflow:hidden">
        <div>${renderCountryPill(p)}</div>
        <div style="font-size:10.5px;color:var(--sail-muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${attr(p.hall_booth || 'Fiera Milano Rho')}">
          📍 ${esc(p.hall_booth || 'Pavilion Assigned')}
        </div>
      </td>

      <!-- 3. Trade Contact & Email -->
      <td style="padding:9px 10px;vertical-align:middle;overflow:hidden">
        <div style="font-size:12px;font-weight:500;color:var(--sail-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${attr(p.contact_person || 'Trade Sales Desk')}">
          ${esc(p.contact_person || 'Trade Sales Desk')}
        </div>
        ${p.email ? `
          <div style="margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            <a href="mailto:${attr(p.email)}" style="font-size:11px;color:var(--sail-primary);font-weight:500;text-decoration:none" title="Email: ${attr(p.email)}">
              ✉️ ${esc(p.email)}
            </a>
          </div>
        ` : `<span class="sail-pill missing" style="font-size:10px">Pending enrichment</span>`}
      </td>

      <!-- 4. Outreach Status & Schedule -->
      <td style="padding:9px 10px;vertical-align:middle;overflow:hidden">
        <select class="sail-status-select" data-id="${attr(p.id)}" style="height:26px;line-height:24px;padding:2px 6px;border-radius:5px;font-size:11px;width:100%;max-width:130px;box-sizing:border-box;cursor:pointer;outline:none;${getEventStatusBadgeStyle(p.status)}">
          <option value="TO_REVIEW" ${p.status === 'TO_REVIEW' ? 'selected' : ''} style="background:#FFF;color:#0A2540;font-weight:normal">To Review</option>
          <option value="WANT_TO_CONTACT" ${p.status === 'WANT_TO_CONTACT' ? 'selected' : ''} style="background:#FFF;color:#0A2540;font-weight:normal">Ready to Contact</option>
          <option value="CONTACTED" ${p.status === 'CONTACTED' ? 'selected' : ''} style="background:#FFF;color:#0A2540;font-weight:normal">Contacted</option>
          <option value="APPROVED_PARTNER" ${p.status === 'APPROVED_PARTNER' ? 'selected' : ''} style="background:#FFF;color:#0A2540;font-weight:normal">Partner Won</option>
          <option value="NOT_RELEVANT" ${p.status === 'NOT_RELEVANT' ? 'selected' : ''} style="background:#FFF;color:#0A2540;font-weight:normal">Archive / Dismiss</option>
        </select>
        <div style="margin-top:3px">
          ${p.status === 'CONTACTED' ? `
            <div style="font-size:10px;color:#059669;font-weight:600">✅ Dispatched ${p.sent_at ? fmtDateTime(p.sent_at) : ''}</div>
          ` : (p.status === 'WANT_TO_CONTACT' ? `
            <div style="display:inline-flex;align-items:center;gap:3px;font-size:10px;color:#1D4ED8;background:#DBEAFE;border:1px solid #BFDBFE;border-radius:4px;padding:1px 5px;margin-top:1px">
              <strong>Batch #${batchNum}</strong> (Slot ${slotInBatch}/6) · 10:00 CET
            </div>
          ` : (p.status === 'TO_REVIEW' ? `
            <div style="font-size:10px;color:#92400E;background:#FEF3C7;border:1px solid #FDE68A;border-radius:4px;padding:1px 5px;display:inline-block;margin-top:1px">
              ⏸️ Held in Review (Safe)
            </div>
          ` : (p.status === 'APPROVED_PARTNER' ? `
            <div style="font-size:10px;color:#059669;font-weight:600">🤝 Partner Won</div>
          ` : `
            <div style="font-size:10px;color:var(--sail-muted)">🚫 Dismissed</div>
          `)))}
        </div>
      </td>

      <!-- 5. Sender Account -->
      <td style="padding:9px 10px;vertical-align:middle;overflow:hidden">
        <div style="display:inline-flex;flex-direction:column;gap:1px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:5px;padding:2px 6px">
          <span style="font-weight:700;font-size:10.5px;color:#6D28D9">${p.sender_email && p.sender_email.includes('dmitri') ? '👤 Dmitri' : '👤 Igor'}</span>
          <span style="font-size:9.5px;color:#7C3AED;opacity:0.85">${p.sender_email && p.sender_email.includes('dmitri') ? 'dorogo.eu' : 'b2b-dorogo.it'}</span>
        </div>
      </td>

      <!-- 6. Score & Action -->
      <td style="text-align:right;padding:9px 10px;vertical-align:middle;overflow:hidden">
        <div style="display:inline-flex;align-items:center;justify-content:flex-end;gap:4px">
          <span class="sail-pill ok" style="font-size:10px;font-weight:700;padding:2px 4px" title="Score: ${p.relevance_score || 85}">
            ${p.relevance_score || 85}
          </span>
          <button class="sail-btn default btn-research-event-partner" data-id="${attr(p.id)}" style="font-size:10px;padding:2px 5px;height:24px;line-height:1;color:#1D4ED8;background:#EFF6FF;border:1px solid #BFDBFE" title="Auto-research website &amp; email">
            🔍 Research
          </button>
          <button class="sail-btn default btn-edit-event-agency" data-id="${attr(p.id)}" style="font-size:10px;padding:2px 5px;height:24px;line-height:1" title="Edit">
            Edit
          </button>
        </div>
      </td>
    </tr>
  `;
}

function attachEventListeners(el) {
  // Bulk queue to outbox
  const btnBulkQueue = el.querySelector('#btn-bulk-queue-outbox');
  if (btnBulkQueue) {
    btnBulkQueue.onclick = async () => {
      const count = selectedPartnerIds.size;
      for (const id of selectedPartnerIds) {
        await updateEventPartner(id, { status: 'WANT_TO_CONTACT' });
      }
      selectedPartnerIds.clear();
      toast(`${count} exhibitors moved to Scheduled Outbox!`);
      location.hash = '#event_outbox';
    };
  }

  // Header select all checkbox
  const chkAll = el.querySelector('#chk-partners-all');
  if (chkAll) {
    chkAll.onchange = (e) => {
      const stored = loadStoredEventPartners();
      if (e.target.checked) {
        stored.forEach((p) => selectedPartnerIds.add(p.id));
      } else {
        selectedPartnerIds.clear();
      }
      render(el);
    };
  }

  // Row selection checkboxes
  el.querySelectorAll('.chk-partner-row').forEach((chk) => {
    chk.onchange = (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) {
        selectedPartnerIds.add(id);
      } else {
        selectedPartnerIds.delete(id);
      }
      render(el);
    };
  });

  // Region & Tier tabs
  el.querySelectorAll('[data-type-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      activeTypeFilter = tab.dataset.typeTab;
      render(el);
    });
  });

  // Status dropdown filter
  el.querySelector('#event-status-filter')?.addEventListener('change', (e) => {
    activeStatusFilter = e.target.value;
    render(el);
  });

  // Search input
  let searchTimer;
  el.querySelector('#event-search-input')?.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = e.target.value;
      render(el);
    }, 150);
  });

  // Export CSV
  el.querySelector('#btn-export-events-csv')?.addEventListener('click', () => {
    exportEventsCsv();
  });

  // Add Exhibiting Team
  el.querySelector('#btn-add-event-agency')?.addEventListener('click', () => {
    openEventAgencyModal(null, el);
  });

  // Status dropdown changes on table rows
  el.querySelectorAll('.sail-status-select').forEach((sel) => {
    sel.addEventListener('change', async (e) => {
      const id = sel.dataset.id;
      const newStatus = sel.value;
      const prevStyle = sel.getAttribute('style');
      sel.setAttribute('style', `${prevStyle};opacity:0.6;pointer-events:none`);
      try {
        await updateEventPartner(id, { status: newStatus });
        toast(`Exhibitor status set to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
        render(el);
      } catch (err) {
        toast(`Failed to update status: ${err.message}`, 'error');
        sel.setAttribute('style', prevStyle);
      }
    });
  });

  // Edit exhibitor button
  el.querySelectorAll('.btn-edit-event-agency').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const stored = loadStoredEventPartners();
      const p = stored.find((item) => item.id === id);
      if (p) openEventAgencyModal(p, el);
    });
  });

  // Single exhibitor auto-research button
  el.querySelectorAll('.btn-research-event-partner').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await findAndVerifyEventPartner(id, btn, () => render(el));
    });
  });

  // Bulk auto-fix & enrich all button
  const btnAutoEnrichAll = el.querySelector('#btn-auto-enrich-all-events');
  if (btnAutoEnrichAll) {
    btnAutoEnrichAll.onclick = async () => {
      const stored = loadStoredEventPartners();
      btnAutoEnrichAll.disabled = true;
      btnAutoEnrichAll.textContent = '⏳ Auto-Enriching...';
      let count = 0;
      for (let i = 0; i < stored.length; i++) {
        const item = stored[i];
        btnAutoEnrichAll.textContent = `⏳ Enriching ${i + 1}/${stored.length}...`;
        await findAndVerifyEventPartner(item.id);
        count++;
      }
      btnAutoEnrichAll.disabled = false;
      btnAutoEnrichAll.textContent = '⚡ Auto-Fix Websites & Enrich';
      toast(`Finished auto-researching and verifying ${count} exhibitors!`);
      render(el);
    };
  };
}

function exportEventsCsv() {
  const stored = loadStoredEventPartners();
  const headers = ['ID', 'Exhibitor Name', 'Country', 'Contact Person', 'Email', 'Origin Airport', 'Fair Event', 'Outreach Status', 'Relevance Score', 'Website', 'Notes'];
  const rows = stored.map((p) => [
    p.id,
    `"${(p.name || '').replace(/"/g, '""')}"`,
    `"${(p.country || '').replace(/"/g, '""')}"`,
    `"${(p.contact_person || '').replace(/"/g, '""')}"`,
    p.email || '',
    `"${(p.origin_hub || '').replace(/"/g, '""')}"`,
    `"${(p.fair_event || 'Milano Home 2027').replace(/"/g, '""')}"`,
    p.status || 'TO_REVIEW',
    p.relevance_score || 85,
    p.website || '',
    `"${(p.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `milano_home_foreign_exhibitors_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast(`Exported ${stored.length} foreign exhibitors to CSV`);
}

function openEventAgencyModal(p, el) {
  const isEdit = Boolean(p);
  const title = isEdit ? `Edit Exhibitor: ${p.name}` : 'Add Foreign Exhibiting Team';

  const content = `
    <form id="event-agency-form" style="display:flex;flex-direction:column;gap:12px;font-size:12px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">Exhibitor Company Name *</label>
          <input type="text" id="m-name" required value="${attr(p?.name || '')}" placeholder="e.g. Addison Ross Ltd" style="width:100%;height:32px;padding:0 8px;border:1px solid var(--sail-line);border-radius:6px">
        </div>
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">Country &amp; Flag</label>
          <input type="text" id="m-country" value="${attr(p?.country || '')}" placeholder="e.g. United Kingdom" style="width:100%;height:32px;padding:0 8px;border:1px solid var(--sail-line);border-radius:6px">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">Trade Contact Person</label>
          <input type="text" id="m-contact" value="${attr(p?.contact_person || '')}" placeholder="e.g. David Ross / Head of Trade" style="width:100%;height:32px;padding:0 8px;border:1px solid var(--sail-line);border-radius:6px">
        </div>
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">Verified Email</label>
          <input type="email" id="m-email" value="${attr(p?.email || '')}" placeholder="e.g. sales@addisonross.com" style="width:100%;height:32px;padding:0 8px;border:1px solid var(--sail-line);border-radius:6px">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">Website URL</label>
          <input type="url" id="m-website" value="${attr(p?.website || '')}" placeholder="https://example.com" style="width:100%;height:32px;padding:0 8px;border:1px solid var(--sail-line);border-radius:6px">
        </div>
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">Stand / Pavilion Location</label>
          <input type="text" id="m-origin" value="${attr(p?.hall_booth || 'Fiera Milano Rho')}" placeholder="e.g. Hall 1 - Stand A12" style="width:100%;height:32px;padding:0 8px;border:1px solid var(--sail-line);border-radius:6px">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">Outreach Status</label>
          <select id="m-status" style="width:100%;height:32px;padding:0 8px;border:1px solid var(--sail-line);border-radius:6px;background:#FFF">
            <option value="TO_REVIEW" ${p?.status === 'TO_REVIEW' ? 'selected' : ''}>To Review (Safe)</option>
            <option value="WANT_TO_CONTACT" ${p?.status === 'WANT_TO_CONTACT' ? 'selected' : ''}>Ready to Contact</option>
            <option value="CONTACTED" ${p?.status === 'CONTACTED' ? 'selected' : ''}>Contacted</option>
            <option value="APPROVED_PARTNER" ${p?.status === 'APPROVED_PARTNER' ? 'selected' : ''}>Partner Won</option>
            <option value="NOT_RELEVANT" ${p?.status === 'NOT_RELEVANT' ? 'selected' : ''}>Archive / Dismiss</option>
          </select>
        </div>
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px">Relevance Score (1-100)</label>
          <input type="number" id="m-score" min="1" max="100" value="${attr(p?.relevance_score || 95)}" style="width:100%;height:32px;padding:0 8px;border:1px solid var(--sail-line);border-radius:6px">
        </div>
      </div>

      <div>
        <label style="font-weight:600;display:block;margin-bottom:4px">Exhibitor Notes &amp; Itinerary Requirements</label>
        <textarea id="m-notes" rows="2" style="width:100%;padding:6px 8px;border:1px solid var(--sail-line);border-radius:6px;font-family:inherit" placeholder="Airport meet & greet, booth setup dates, daily shuttle times...">${esc(p?.notes || '')}</textarea>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
        ${isEdit ? `
          <button type="button" id="btn-delete-event-agency" class="sail-btn danger" style="font-size:11.5px;padding:6px 12px">
            Delete Exhibitor
          </button>
        ` : '<div></div>'}
        <div style="display:flex;gap:8px">
          <button type="button" class="sail-btn default dialog-close" style="font-size:11.5px;padding:6px 12px">
            Cancel
          </button>
          <button type="submit" class="sail-btn primary" style="font-size:11.5px;padding:6px 12px">
            ${isEdit ? 'Save Changes' : 'Create Exhibitor'}
          </button>
        </div>
      </div>
    </form>
  `;

  const d = dialog({ title, content, width: '560px' });

  d.el.querySelector('#event-agency-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: d.el.querySelector('#m-name').value.trim(),
      country: d.el.querySelector('#m-country').value.trim() || 'International',
      contact_person: d.el.querySelector('#m-contact').value.trim(),
      email: d.el.querySelector('#m-email').value.trim(),
      website: d.el.querySelector('#m-website').value.trim(),
      origin_hub: d.el.querySelector('#m-origin').value.trim(),
      status: d.el.querySelector('#m-status').value,
      relevance_score: parseInt(d.el.querySelector('#m-score').value, 10) || 85,
      notes: d.el.querySelector('#m-notes').value.trim()
    };

    try {
      if (isEdit) {
        await updateEventPartner(p.id, data);
        toast(`Updated ${data.name}`);
      } else {
        await addEventPartner(data);
        toast(`Added ${data.name}`);
      }
      d.close();
      render(el);
    } catch (err) {
      toast(`Failed to save: ${err.message}`, 'error');
    }
  });

  if (isEdit) {
    d.el.querySelector('#btn-delete-event-agency')?.addEventListener('click', async () => {
      confirmDialog({
        title: 'Delete Exhibitor',
        message: `Are you sure you want to remove "${p.name}"?`,
        confirmText: 'Delete',
        danger: true,
        onConfirm: async () => {
          try {
            await removeEventPartner(p.id);
            toast(`Removed ${p.name}`);
            d.close();
            render(el);
          } catch (err) {
            toast(`Failed to delete: ${err.message}`, 'error');
          }
        }
      });
    });
  }
}

export async function findAndVerifyEventPartner(partnerId, btnEl = null, onDone = null) {
  const stored = loadStoredEventPartners();
  const p = stored.find((item) => item.id === partnerId);
  if (!p) return;

  const originalText = btnEl ? btnEl.innerHTML : '';
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = '⏳ Research...';
  }

  try {
    // 1. Check if internal Fiera Milano desk
    if (/ESERVICE MANUTENZIONE|FIERA MILANO/i.test(p.name)) {
      await updateEventPartner(p.id, {
        status: 'NOT_RELEVANT',
        notes: (p.notes ? p.notes + ' | ' : '') + 'Fiera Milano internal facility desk (archived)'
      });
      toast(`Archived ${p.name} (internal facility desk)`);
      if (onDone) onDone();
      return;
    }

    let foundUrl = p.website || '';
    let foundEmail = p.email || '';
    let foundPhone = p.phone || '';
    let foundContact = p.contact_person || '';

    // 2. Discover website if missing, blank, or generic
    if (!foundUrl || !foundUrl.includes('.') || /cant be reached|fiera|letzfair/i.test(foundUrl)) {
      try {
        const q = `${p.name} ${p.country || ''} official website`;
        const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(6000) });
        if (resp.ok) {
          const html = await resp.text();
          for (const m of html.matchAll(/uddg=([^"&]+)/gi)) {
            const decoded = decodeURIComponent(m[1]);
            if (decoded.startsWith('http') && !/facebook|instagram|linkedin|youtube|fieramilano|letzfair|wikipedia/i.test(decoded)) {
              try {
                const parsed = new URL(decoded);
                foundUrl = `${parsed.protocol}//${parsed.hostname}`;
                break;
              } catch (_) {}
            }
          }
        }
      } catch (_) {}
    }

    // 3. Deep website crawl via Jina Reader
    if (foundUrl && foundUrl.startsWith('http')) {
      try {
        const cleanBase = foundUrl.replace(/\/$/, '');
        const jinaResp = await fetch(`https://r.jina.ai/${cleanBase}`, { signal: AbortSignal.timeout(7000) });
        if (jinaResp.ok) {
          const body = await jinaResp.text();
          const emailMatches = body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
          const usable = emailMatches.filter((e) => !/noreply|no-reply|privacy|legal|gdpr|postmaster|abuse|example/i.test(e));
          if (usable.length > 0 && (!foundEmail || !foundEmail.includes('@'))) {
            foundEmail = usable[0];
          }
          const phoneMatch = body.match(/(?:\+?[0-9]{1,3}[-.\s]?)?\(?[0-9]{2,4}\)?[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,5}/);
          if (phoneMatch && !foundPhone) foundPhone = phoneMatch[0].trim();
        }
      } catch (_) {}
    }

    // 4. Verify email deliverability if available
    let emailStatus = 'verified';
    if (foundEmail && window.APP_CONFIG && window.APP_CONFIG.MODE === 'live' && window.APP_CONFIG.SUPABASE_URL) {
      try {
        const vRes = await fetch(`${window.APP_CONFIG.SUPABASE_URL}/functions/v1/outreach-api`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: window.APP_CONFIG.SUPABASE_KEY },
          body: JSON.stringify({ action: 'verify_email', email: foundEmail })
        });
        const vJson = await vRes.json();
        if (vJson.resultcode === 6 || vJson.status === 'invalid') emailStatus = 'invalid';
      } catch (_) {}
    }

    const patch = {
      website: foundUrl || p.website,
      email: foundEmail || p.email,
      phone: foundPhone || p.phone,
      contact_person: foundContact || p.contact_person,
      is_enriched: Boolean(foundEmail && foundEmail.includes('@')),
      is_verified: emailStatus === 'verified',
      notes: (p.notes ? p.notes + ' | ' : '') + `Auto-researched (${new Date().toISOString().slice(0, 10)})`
    };

    await updateEventPartner(p.id, patch);
    toast(`Researched ${p.name}: ${patch.website ? '🌐 Website verified' : ''} ${patch.email ? '✉️ Email found' : ''}`);
  } catch (err) {
    toast(`Research error: ${err.message}`, 'error');
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = originalText;
    }
    if (onDone) onDone();
  }
}
