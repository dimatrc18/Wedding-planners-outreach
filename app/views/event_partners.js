// Event & Foreign Exhibitor Outreach Pipeline View
// 100% Isolated from Wedding Planners (prospects) and Bus Operators (bus_partners).
// Stripe Sail Design System: responsive data table, KPI stats, zero horizontal scroll.

import { S, updateEventPartner, addEventPartner, removeEventPartner } from '../store.js?v=20261103_v7';
import { esc, attr, icon, toast, dialog, confirmDialog } from '../ui.js';
import { EVENT_AGENCY_TYPES, loadStoredEventPartners } from '../event_planners_data.js?v=20261103_v7';

let activeTypeFilter = 'all'; // all | tier1 | uk_north | dach_benelux | france_spain
let activeStatusFilter = 'all'; // all | TO_REVIEW | WANT_TO_CONTACT | CONTACTED | APPROVED_PARTNER
let searchQuery = '';
let currentEl = null;

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
            <span class="sail-pill ok" style="font-size:10.5px;font-weight:700">events@dorogo-events.eu</span>
            <span class="sail-pill info" style="font-size:10.5px">Direct Client Outreach</span>
          </div>
          <div style="font-size:12px;color:var(--sail-muted);margin-top:4px">
            Direct executive B2B outreach to international teams exhibiting at Fiera Milano Rho (MXP/LIN airport arrivals &amp; daily stand transfers).
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;margin-left:auto">
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

      <!-- Main Data Table (Stripe Sail) -->
      <div class="sail-card" style="padding:0;overflow:hidden">
        <div class="sail-table-wrap" style="overflow-x:auto;-webkit-overflow-scrolling:touch">
          <table class="sail-table" style="table-layout:fixed;width:100%;min-width:760px">
            <thead>
              <tr>
                <th style="width:24%;min-width:160px">
                  <div class="sail-th-title">Exhibitor &amp; Website</div>
                </th>
                <th style="width:18%;min-width:130px">
                  <div class="sail-th-title">Origin &amp; Country</div>
                </th>
                <th style="width:23%;min-width:160px">
                  <div class="sail-th-title">Trade Contact &amp; Email</div>
                </th>
                <th style="width:10%;min-width:80px">
                  <div class="sail-th-title">Arrival Hub</div>
                </th>
                <th style="width:15%;min-width:130px">
                  <div class="sail-th-title">Outreach Status</div>
                </th>
                <th style="width:10%;min-width:80px;text-align:right">
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
              ` : filtered.map((p) => renderAgencyRow(p)).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Safety Footer -->
      <div style="font-size:11px;color:var(--sail-muted);display:flex;align-items:center;justify-content:space-between;padding:0 4px">
        <span>🔒 <strong>Zero-Send Guarantee:</strong> Outreach is strictly locked in TO_REVIEW until rate cards are approved.</span>
        <span>Dedicated Sender: <code>events@dorogo-events.eu</code></span>
      </div>
    </div>
  `;

  attachEventListeners(el);
}

function renderAgencyRow(p) {
  const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.TO_REVIEW;
  const webClean = (p.website || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];

  return `
    <tr>
      <td>
        <div style="font-weight:600;font-size:13px;color:var(--sail-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${attr(p.name)}">
          ${esc(p.name)}
        </div>
        ${p.website ? `
          <div style="margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            <a href="${attr(p.website)}" target="_blank" rel="noopener" style="font-size:11.5px;color:var(--sail-primary);text-decoration:none;display:inline-block;max-width:100%;overflow:hidden;text-overflow:ellipsis" title="Visit ${attr(p.website)}">
              🌐 ${esc(webClean)} ↗
            </a>
          </div>
        ` : '<div style="font-size:11px;color:var(--sail-muted);margin-top:2px">Milano Home Exhibitor</div>'}
      </td>

      <td>
        ${renderCountryPill(p)}
      </td>

      <td>
        <div style="font-size:12px;font-weight:500;color:var(--sail-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${attr(p.contact_person || 'Trade Sales Desk')}">
          ${esc(p.contact_person || 'Trade Sales Desk')}
        </div>
        ${p.email ? `
          <div style="margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            <a href="mailto:${attr(p.email)}" style="font-size:11.5px;color:var(--sail-primary);font-weight:500;text-decoration:none;display:inline-block;max-width:100%;overflow:hidden;text-overflow:ellipsis" title="Email: ${attr(p.email)}">
              ✉️ ${esc(p.email)}
            </a>
          </div>
        ` : `<span class="sail-pill missing" style="font-size:10px">Pending enrichment</span>`}
      </td>

      <td>
        <div style="font-size:12px;color:var(--sail-body);white-space:nowrap" title="${attr(p.origin_hub || 'International Airport')}">
          ✈️ ${esc((p.origin_hub || 'MXP').split(' ')[0])}
        </div>
      </td>

      <td>
        <select class="sail-status-select" data-id="${attr(p.id)}" style="height:28px;line-height:26px;padding:2px 6px;border-radius:6px;font-size:11.5px;width:100%;max-width:138px;box-sizing:border-box;cursor:pointer;outline:none;${getEventStatusBadgeStyle(p.status)}">
          <option value="TO_REVIEW" ${p.status === 'TO_REVIEW' ? 'selected' : ''} style="background:#FFF;color:#0A2540;font-weight:normal">To Review</option>
          <option value="WANT_TO_CONTACT" ${p.status === 'WANT_TO_CONTACT' ? 'selected' : ''} style="background:#FFF;color:#0A2540;font-weight:normal">Ready to Contact</option>
          <option value="CONTACTED" ${p.status === 'CONTACTED' ? 'selected' : ''} style="background:#FFF;color:#0A2540;font-weight:normal">Contacted</option>
          <option value="APPROVED_PARTNER" ${p.status === 'APPROVED_PARTNER' ? 'selected' : ''} style="background:#FFF;color:#0A2540;font-weight:normal">Partner Won</option>
          <option value="NOT_RELEVANT" ${p.status === 'NOT_RELEVANT' ? 'selected' : ''} style="background:#FFF;color:#0A2540;font-weight:normal">Archive / Dismiss</option>
        </select>
      </td>

      <td style="text-align:right">
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;white-space:nowrap">
          <span class="sail-pill ok" style="font-size:11px;font-weight:700;padding:2px 6px" title="Relevance Score: ${p.relevance_score || 85}/100">
            ${p.relevance_score || 85}
          </span>
          <button class="sail-btn default btn-edit-event-agency" data-id="${attr(p.id)}" style="font-size:11px;padding:2px 6px;height:24px;line-height:1" title="Edit Exhibiting Team">
            Edit
          </button>
        </div>
      </td>
    </tr>
  `;
}

function attachEventListeners(el) {
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
          <label style="font-weight:600;display:block;margin-bottom:4px">Home Origin Airport</label>
          <input type="text" id="m-origin" value="${attr(p?.origin_hub || 'London Heathrow (LHR)')}" placeholder="e.g. LHR, CDG, FRA" style="width:100%;height:32px;padding:0 8px;border:1px solid var(--sail-line);border-radius:6px">
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
