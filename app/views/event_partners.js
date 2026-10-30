// Event & Corporate Outreach Pipeline View
// 100% Isolated from Wedding Planners (prospects) and Bus Operators (bus_partners).
// Stripe Sail Design System: responsive data table, KPI stats, zero horizontal scroll.

import { S, updateEventPartner, addEventPartner, removeEventPartner } from '../store.js';
import { esc, attr, icon, toast, dialog, confirmDialog } from '../ui.js';
import { EVENT_AGENCY_TYPES } from '../event_planners_data.js';

let activeTypeFilter = 'all'; // all | corporate_mice | fashion_luxury | brand_activation
let activeStatusFilter = 'all'; // all | TO_REVIEW | WANT_TO_CONTACT | CONTACTED | APPROVED_PARTNER
let searchQuery = '';
let currentEl = null;

const STATUS_CONFIG = {
  TO_REVIEW: { label: 'To Review', pillClass: 'warn', desc: 'Newly scouted event agency' },
  WANT_TO_CONTACT: { label: 'Ready to Contact', pillClass: 'info', desc: 'Queued for outreach' },
  CONTACTED: { label: 'Contacted', pillClass: 'ok', desc: 'Outreach email sent' },
  APPROVED_PARTNER: { label: 'Partner Won', pillClass: 'ok', desc: 'Active mobility partner' },
  NOT_RELEVANT: { label: 'Not Relevant', pillClass: 'missing', desc: 'Archived / not a fit' }
};

export async function render(el) {
  currentEl = el;
  const partners = S.eventPartners || [];

  const totalCount = partners.length;
  const toReviewCount = partners.filter((p) => p.status === 'TO_REVIEW').length;
  const readyCount = partners.filter((p) => p.status === 'WANT_TO_CONTACT').length;
  const contactedCount = partners.filter((p) => p.status === 'CONTACTED' || p.status === 'APPROVED_PARTNER').length;

  const filtered = partners.filter((p) => {
    if (activeTypeFilter !== 'all' && p.agency_type !== activeTypeFilter) return false;
    if (activeStatusFilter !== 'all' && p.status !== activeStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const hay = `${p.name} ${p.contact_person} ${p.email} ${p.base_city} ${p.notes || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px">
      <!-- Header Banner & Isolated Identity Indicator -->
      <div class="sail-card" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div>
          <div style="display:flex;align-items:center;gap:8px">
            <h1 style="font-size:21px;font-weight:700;color:var(--sail-ink);margin:0;letter-spacing:-0.02em">
              🎪 Event &amp; Corporate Outreach
            </h1>
            <span class="sail-pill ok" style="font-size:11px;font-weight:700">events.dorogo-events.eu</span>
            <span class="sail-pill info" style="font-size:10.5px">100% Isolated Pipeline</span>
          </div>
          <div style="font-size:12.5px;color:var(--sail-muted);margin-top:4px">
            Dedicated B2B outreach for Milan Fashion Week, MICE conventions, brand activations, and corporate retreats.
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="sail-btn default" id="btn-export-events-csv" style="font-size:12px">
            📥 Export CSV
          </button>
          <button class="sail-btn primary" id="btn-add-event-agency" style="font-size:12px">
            + Add Event Agency
          </button>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div class="sail-stat-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px">
        <div class="sail-card">
          <div class="sail-stat-label">Total Event Agencies</div>
          <div class="sail-stat-val" style="color:var(--sail-ink)">${totalCount}</div>
          <div class="sail-stat-meta">Verified in pipeline</div>
        </div>
        <div class="sail-card">
          <div class="sail-stat-label">To Review</div>
          <div class="sail-stat-val" style="color:#D97706">${toReviewCount}</div>
          <div class="sail-stat-meta">Awaiting intake audit</div>
        </div>
        <div class="sail-card">
          <div class="sail-stat-label">Ready to Contact</div>
          <div class="sail-stat-val" style="color:#2563EB">${readyCount}</div>
          <div class="sail-stat-meta">Verified emails queued</div>
        </div>
        <div class="sail-card">
          <div class="sail-stat-label">Contacted &amp; Won</div>
          <div class="sail-stat-val" style="color:#059669">${contactedCount}</div>
          <div class="sail-stat-meta">In conversation / active</div>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="sail-card" style="padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <!-- Vertical Specialization Tabs -->
        <div class="sail-tabs" style="display:flex;gap:4px;flex-wrap:wrap">
          ${EVENT_AGENCY_TYPES.map((t) => `
            <button class="sail-tab ${activeTypeFilter === t.key ? 'active' : ''}" data-type-tab="${attr(t.key)}" style="height:28px;padding:0 10px;font-size:12px">
              ${esc(t.label)}
            </button>
          `).join('')}
        </div>

        <!-- Status Filter & Search -->
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <select id="event-status-filter" style="height:30px;padding:0 8px;border:1px solid var(--sail-line);border-radius:6px;font-size:12px;background:#FFF">
            <option value="all" ${activeStatusFilter === 'all' ? 'selected' : ''}>All Statuses (${totalCount})</option>
            <option value="TO_REVIEW" ${activeStatusFilter === 'TO_REVIEW' ? 'selected' : ''}>To Review (${toReviewCount})</option>
            <option value="WANT_TO_CONTACT" ${activeStatusFilter === 'WANT_TO_CONTACT' ? 'selected' : ''}>Ready to Contact (${readyCount})</option>
            <option value="CONTACTED" ${activeStatusFilter === 'CONTACTED' ? 'selected' : ''}>Contacted</option>
            <option value="APPROVED_PARTNER" ${activeStatusFilter === 'APPROVED_PARTNER' ? 'selected' : ''}>Partner Won</option>
          </select>

          <input 
            type="text" 
            id="event-search-input" 
            placeholder="Search agency, contact, city..." 
            value="${attr(searchQuery)}" 
            style="height:30px;padding:0 10px;border:1px solid var(--sail-line);border-radius:6px;font-size:12px;width:210px;background:#F8FAFC"
          >
        </div>
      </div>

      <!-- Main Data Table (Stripe Sail) -->
      <div class="sail-card" style="padding:0;overflow:hidden">
        <div class="sail-table-wrap">
          <table class="sail-table" style="table-layout:fixed;width:100%">
            <thead>
              <tr>
                <th style="width:26%">
                  <div class="sail-th-title">Agency &amp; Website</div>
                </th>
                <th style="width:19%">
                  <div class="sail-th-title">Event Specialization</div>
                </th>
                <th style="width:22%">
                  <div class="sail-th-title">Contact Person &amp; Email</div>
                </th>
                <th style="width:12%">
                  <div class="sail-th-title">Base HQ</div>
                </th>
                <th style="width:11%">
                  <div class="sail-th-title">Status</div>
                </th>
                <th style="width:10%;text-align:right">
                  <div class="sail-th-title">Score / Actions</div>
                </th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="6" style="padding:48px 16px;text-align:center;color:var(--sail-muted)">
                    No event agencies match your active filters. Click <strong>+ Add Event Agency</strong> to create one.
                  </td>
                </tr>
              ` : filtered.map((p) => renderAgencyRow(p)).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Safety Footer -->
      <div style="font-size:11px;color:var(--sail-muted);display:flex;align-items:center;justify-content:space-between;padding:0 4px">
        <span>🔒 <strong>Isolation Guarantee:</strong> Event records and queues never modify wedding planners or bus fleets.</span>
        <span>Sender Mailbox: <code>events@dorogo-events.eu</code></span>
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
        <div style="font-weight:600;font-size:13px;color:var(--sail-ink)">
          ${esc(p.name)}
        </div>
        ${p.website ? `
          <div style="margin-top:2px">
            <a href="${attr(p.website)}" target="_blank" rel="noopener" style="font-size:11.5px;color:var(--sail-primary);text-decoration:none">
              🌐 ${esc(webClean)} ↗
            </a>
          </div>
        ` : ''}
      </td>

      <td>
        <span class="sail-pill info" style="font-size:10.5px">
          ${esc(p.agency_type_label || p.agency_type || 'Event Production')}
        </span>
      </td>

      <td>
        <div style="font-size:12px;font-weight:500;color:var(--sail-body)">
          ${esc(p.contact_person || 'Logistics Desk')}
        </div>
        ${p.email ? `
          <div style="margin-top:2px">
            <a href="mailto:${attr(p.email)}" style="font-size:11.5px;color:var(--sail-muted);text-decoration:none">
              ✉️ ${esc(p.email)}
            </a>
          </div>
        ` : `<span class="sail-pill missing" style="font-size:10px">No email</span>`}
      </td>

      <td>
        <div style="font-size:12px;color:var(--sail-body)">
          📍 ${esc(p.base_city || 'Milano')}
        </div>
      </td>

      <td>
        <select class="sail-status-select" data-id="${attr(p.id)}" style="font-size:11px;height:24px;border:1px solid var(--sail-line);border-radius:4px;background:#FFF">
          <option value="TO_REVIEW" ${p.status === 'TO_REVIEW' ? 'selected' : ''}>To Review</option>
          <option value="WANT_TO_CONTACT" ${p.status === 'WANT_TO_CONTACT' ? 'selected' : ''}>Ready to Contact</option>
          <option value="CONTACTED" ${p.status === 'CONTACTED' ? 'selected' : ''}>Contacted</option>
          <option value="APPROVED_PARTNER" ${p.status === 'APPROVED_PARTNER' ? 'selected' : ''}>Partner Won</option>
          <option value="NOT_RELEVANT" ${p.status === 'NOT_RELEVANT' ? 'selected' : ''}>Archive / Dismiss</option>
        </select>
      </td>

      <td style="text-align:right">
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px">
          <span class="sail-pill ok" style="font-size:11px;font-weight:700">
            ${p.relevance_score || 85}
          </span>
          <button class="sail-btn xs" data-edit-agency="${attr(p.id)}" title="Edit Agency">
            Edit
          </button>
        </div>
      </td>
    </tr>
  `;
}

function attachEventListeners(el) {
  // Specialization filter tabs
  el.querySelectorAll('[data-type-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTypeFilter = btn.dataset.typeTab;
      render(el);
    });
  });

  // Status dropdown filter
  el.querySelector('#event-status-filter')?.addEventListener('change', (e) => {
    activeStatusFilter = e.target.value;
    render(el);
  });

  // Search input
  el.querySelector('#event-search-input')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    render(el);
  });

  // Inline Status Change dropdowns
  el.querySelectorAll('.sail-status-select').forEach((sel) => {
    sel.addEventListener('change', async (e) => {
      const id = sel.dataset.id;
      const newStatus = e.target.value;
      await updateEventPartner(id, { status: newStatus });
      toast(`Status updated to ${newStatus}`, 'ok');
      render(el);
    });
  });

  // Add Agency modal trigger
  el.querySelector('#btn-add-event-agency')?.addEventListener('click', () => {
    openAddAgencyModal(el);
  });

  // Edit Agency modal trigger
  el.querySelectorAll('[data-edit-agency]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.editAgency;
      const agency = (S.eventPartners || []).find((p) => p.id === id);
      if (agency) openEditAgencyModal(agency, el);
    });
  });

  // Export CSV
  el.querySelector('#btn-export-events-csv')?.addEventListener('click', () => {
    exportEventsCsv();
  });
}

function openAddAgencyModal(el) {
  dialog({
    wide: true,
    title: 'Add Event Agency / Corporate Planner',
    body: `
      <form id="form-add-event-agency" style="display:flex;flex-direction:column;gap:14px;padding:4px 0">
        <div style="font-size:12.5px;color:var(--sail-muted);line-height:1.4">
          Add an event production agency or corporate MICE organizer to the isolated Event pipeline.
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label class="sail-calc-label">Agency Name *</label>
            <input type="text" id="add-event-name" class="sail-calc-input" placeholder="e.g. Balich Wonder Studio" required>
          </div>
          <div>
            <label class="sail-calc-label">Specialization *</label>
            <select id="add-event-type" class="sail-calc-input">
              <option value="corporate_mice">🏢 Corporate Summits &amp; MICE</option>
              <option value="fashion_luxury">👠 Fashion Shows &amp; Luxury Galas</option>
              <option value="brand_activation">✨ Brand Activations &amp; PR</option>
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label class="sail-calc-label">Contact Person</label>
            <input type="text" id="add-event-contact" class="sail-calc-input" placeholder="e.g. Daniela Esse">
          </div>
          <div>
            <label class="sail-calc-label">Email Address *</label>
            <input type="email" id="add-event-email" class="sail-calc-input" placeholder="events@agency.com" required>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div>
            <label class="sail-calc-label">Website</label>
            <input type="url" id="add-event-web" class="sail-calc-input" placeholder="https://agency.com">
          </div>
          <div>
            <label class="sail-calc-label">Phone / WhatsApp</label>
            <input type="text" id="add-event-phone" class="sail-calc-input" placeholder="+39 02 ...">
          </div>
          <div>
            <label class="sail-calc-label">Base City</label>
            <input type="text" id="add-event-city" class="sail-calc-input" value="Milano">
          </div>
        </div>

        <div>
          <label class="sail-calc-label">Internal Logistics &amp; Mobility Notes</label>
          <textarea id="add-event-notes" class="sail-calc-input" rows="3" placeholder="Key VIP routes, events handled, fleet requirements..."></textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px">
          <button type="button" class="sail-btn default" data-close>Cancel</button>
          <button type="submit" class="sail-btn primary">Save Event Agency</button>
        </div>
      </form>
    `,
    onMount: (box) => {
      box.querySelector('#form-add-event-agency')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const typeKey = box.querySelector('#add-event-type').value;
        const typeObj = EVENT_AGENCY_TYPES.find((t) => t.key === typeKey) || EVENT_AGENCY_TYPES[1];

        const newAgency = {
          name: box.querySelector('#add-event-name').value.trim(),
          agency_type: typeKey,
          agency_type_label: typeObj.label,
          contact_person: box.querySelector('#add-event-contact').value.trim(),
          email: box.querySelector('#add-event-email').value.trim(),
          website: box.querySelector('#add-event-web').value.trim(),
          phone: box.querySelector('#add-event-phone').value.trim(),
          base_city: box.querySelector('#add-event-city').value.trim() || 'Milano',
          notes: box.querySelector('#add-event-notes').value.trim(),
          status: 'TO_REVIEW',
          relevance_score: 90
        };

        await addEventPartner(newAgency);
        toast(`Added ${newAgency.name} to Event Outreach!`, 'ok');
        box.querySelector('[data-close]')?.click();
        render(el);
      });
    }
  });
}

function openEditAgencyModal(agency, el) {
  dialog({
    wide: true,
    title: `Edit: ${agency.name}`,
    body: `
      <form id="form-edit-event-agency" style="display:flex;flex-direction:column;gap:14px;padding:4px 0">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label class="sail-calc-label">Agency Name</label>
            <input type="text" id="edit-event-name" class="sail-calc-input" value="${attr(agency.name)}" required>
          </div>
          <div>
            <label class="sail-calc-label">Specialization</label>
            <select id="edit-event-type" class="sail-calc-input">
              <option value="corporate_mice" ${agency.agency_type === 'corporate_mice' ? 'selected' : ''}>🏢 Corporate Summits &amp; MICE</option>
              <option value="fashion_luxury" ${agency.agency_type === 'fashion_luxury' ? 'selected' : ''}>👠 Fashion Shows &amp; Luxury Galas</option>
              <option value="brand_activation" ${agency.agency_type === 'brand_activation' ? 'selected' : ''}>✨ Brand Activations &amp; PR</option>
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label class="sail-calc-label">Contact Person</label>
            <input type="text" id="edit-event-contact" class="sail-calc-input" value="${attr(agency.contact_person || '')}">
          </div>
          <div>
            <label class="sail-calc-label">Email Address</label>
            <input type="email" id="edit-event-email" class="sail-calc-input" value="${attr(agency.email || '')}" required>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div>
            <label class="sail-calc-label">Website</label>
            <input type="url" id="edit-event-web" class="sail-calc-input" value="${attr(agency.website || '')}">
          </div>
          <div>
            <label class="sail-calc-label">Phone / WhatsApp</label>
            <input type="text" id="edit-event-phone" class="sail-calc-input" value="${attr(agency.phone || '')}">
          </div>
          <div>
            <label class="sail-calc-label">Base City</label>
            <input type="text" id="edit-event-city" class="sail-calc-input" value="${attr(agency.base_city || 'Milano')}">
          </div>
        </div>

        <div>
          <label class="sail-calc-label">Logistics Notes</label>
          <textarea id="edit-event-notes" class="sail-calc-input" rows="3">${esc(agency.notes || '')}</textarea>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
          <button type="button" class="sail-btn default" id="btn-delete-event-agency" style="color:#DC2626">
            Delete Agency
          </button>
          <div style="display:flex;gap:8px">
            <button type="button" class="sail-btn default" data-close>Cancel</button>
            <button type="submit" class="sail-btn primary">Save Changes</button>
          </div>
        </div>
      </form>
    `,
    onMount: (box) => {
      box.querySelector('#form-edit-event-agency')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const typeKey = box.querySelector('#edit-event-type').value;
        const typeObj = EVENT_AGENCY_TYPES.find((t) => t.key === typeKey) || EVENT_AGENCY_TYPES[1];

        const patch = {
          name: box.querySelector('#edit-event-name').value.trim(),
          agency_type: typeKey,
          agency_type_label: typeObj.label,
          contact_person: box.querySelector('#edit-event-contact').value.trim(),
          email: box.querySelector('#edit-event-email').value.trim(),
          website: box.querySelector('#edit-event-web').value.trim(),
          phone: box.querySelector('#edit-event-phone').value.trim(),
          base_city: box.querySelector('#edit-event-city').value.trim(),
          notes: box.querySelector('#edit-event-notes').value.trim()
        };

        await updateEventPartner(agency.id, patch);
        toast(`Updated ${patch.name}`, 'ok');
        box.querySelector('[data-close]')?.click();
        render(el);
      });

      box.querySelector('#btn-delete-event-agency')?.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete ${agency.name} from Event Outreach?`)) {
          await removeEventPartner(agency.id);
          toast(`Deleted ${agency.name}`, 'ok');
          box.querySelector('[data-close]')?.click();
          render(el);
        }
      });
    }
  });
}

function exportEventsCsv() {
  const rows = S.eventPartners || [];
  if (!rows.length) {
    toast('No event agencies to export', 'warn');
    return;
  }
  const headers = ['ID', 'Agency Name', 'Specialization', 'Contact Person', 'Email', 'Phone', 'City', 'Status', 'Score', 'Notes'];
  const csvLines = [headers.join(',')];

  for (const r of rows) {
    const fields = [
      r.id,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${(r.agency_type_label || r.agency_type || '').replace(/"/g, '""')}"`,
      `"${(r.contact_person || '').replace(/"/g, '""')}"`,
      r.email || '',
      r.phone || '',
      r.base_city || '',
      r.status || '',
      r.relevance_score || '',
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ];
    csvLines.push(fields.join(','));
  }

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dorogo_event_outreach_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Exported Event Outreach CSV', 'ok');
}
