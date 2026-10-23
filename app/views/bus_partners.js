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
      <div class="row" style="gap:8px">
        <button class="btn ghost sm" id="btn-export">${icon('download', 14)} Export Manifest</button>
        <button class="btn primary sm" id="btn-add-partner">${icon('plus', 14)} Add Operator</button>
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
              <th style="width:44px;text-align:center">Score</th>
              <th style="width:165px">Company & Base</th>
              <th style="width:155px">Email</th>
              <th style="width:120px">Fleet Types</th>
              <th style="width:180px">Notes</th>
              <th style="width:145px">Status</th>
              <th style="width:55px;text-align:center">Web</th>
              <th style="width:36px;text-align:center" title="Delete">Del</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map((p) => {
              const score = p.relevance_score || 0;
              const tier = core.getPriorityTier(score);
              const scoreClass = score >= 90 ? 'chip ok' : score >= 75 ? 'chip' : score >= 50 ? 'chip gold' : 'chip bad';
              const categories = Array.isArray(p.fleet_categories) ? p.fleet_categories : [];

              return `<tr class="hover-row" data-id="${attr(p.id)}" style="height:52px">
                <td style="text-align:center;vertical-align:middle">
                  <span class="${scoreClass} clickable" data-act="view-score" data-id="${attr(p.id)}" style="font-weight:700;font-size:.85rem;padding:3px 6px;cursor:pointer" title="Click to view 4-pillar score breakdown">
                    ${score}
                  </span>
                </td>
                <td style="vertical-align:middle">
                  <div style="font-weight:600;font-size:.88rem;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${attr(p.name)}">${esc(p.name)}</div>
                  <div class="tiny muted" style="white-space:nowrap;margin-top:2px">📍 ${esc(p.base_city || 'Northern Italy')}</div>
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
                  <div style="display:flex;flex-direction:column;gap:3px;max-width:115px;line-height:1.2">
                    ${categories.slice(0, 2).map((c) => `<span class="chip tiny outline" style="font-size:.67rem;padding:0 5px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px" title="${attr(c)}">${esc(c)}</span>`).join('')}
                    ${categories.length > 2 ? `<span class="tiny faint" style="font-size:.66rem;padding-left:2px" title="${attr(categories.slice(2).join(', '))}">+${categories.length - 2} more</span>` : ''}
                    ${!categories.length ? '<span class="faint tiny">Minibus</span>' : ''}
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
                  ${p.website 
                    ? `<a class="btn sm ghost" href="${attr(p.website)}" target="_blank" rel="noopener" style="padding:3px 6px;font-size:.74rem;white-space:nowrap;display:inline-flex;align-items:center;gap:2px" title="Open Website">${icon('external', 11)} Web</a>` 
                    : `<span class="tiny faint">—</span>`
                  }
                </td>
                <td style="vertical-align:middle;text-align:center;white-space:nowrap">
                  <button class="btn sm ghost" data-act="delete-partner" data-id="${attr(p.id)}" style="padding:4px 6px;color:var(--bad);display:inline-flex;align-items:center" title="Delete Operator">${icon('trash', 13)}</button>
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="8" class="empty small">No bus operators found matching the current filters.</td></tr>`}
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
        fleet_categories: ['Minibus & Coach Executive']
      });

      toast(`Added ${name} with Relevance Score ${sum}/100`);
      close();
      paint();
    });
  }
}
