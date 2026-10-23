// Minimalist Bus Partner Manifest Table & 100-Point Scoring View
// Luxury unbranded minibus and coach operators across Northern Italy.
import * as core from '../../supabase/functions/_shared/core/index.js';
import { S, updateBusPartner, addBusPartner, removeBusPartner } from '../store.js';
import { esc, attr, icon, download, toast, confirmDialog } from '../ui.js';

let activeFilter = 'all'; // all | top_tier | vetted | approved | to_review
let searchQ = '';
let cityFilter = 'all';

export function render(el) {
  paint();

  function paint() {
    const list = S.busPartners || [];
    
    // 1. Metric calculations for Top Stat Bar
    const totalDiscovered = list.length;
    const topTierMatches = list.filter((p) => (p.relevance_score || 0) >= 80).length;
    const vettedCount = list.filter((p) => ['VETTED', 'APPROVED_PARTNER'].includes(p.status)).length;
    const activePartners = list.filter((p) => p.status === 'APPROVED_PARTNER').length;

    // Filter logic
    let filtered = [...list];
    if (activeFilter === 'top_tier') {
      filtered = filtered.filter((p) => (p.relevance_score || 0) >= 80);
    } else if (activeFilter === 'vetted') {
      filtered = filtered.filter((p) => p.status === 'VETTED');
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
          <span class="label">Vetted / Verified</span>
          <span class="val" style="color:var(--series-1)">${vettedCount}</span>
          <span class="ci">Photos & zero-decal policy reviewed</span>
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
          <button class="chip ${activeFilter === 'vetted' ? 'active' : 'outline'}" data-filter="vetted">🛡️ Vetted (${list.filter(p => p.status === 'VETTED').length})</button>
          <button class="chip ${activeFilter === 'approved' ? 'active' : 'outline'}" data-filter="approved">🤝 Active Partners (${activePartners})</button>
          <button class="chip ${activeFilter === 'to_review' ? 'active' : 'outline'}" data-filter="to_review">⏳ To Review (${list.filter(p => p.status === 'TO_REVIEW').length})</button>
        </div>

        <div class="row" style="gap:8px">
          <select id="select-city" class="sm" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border);background:var(--surface)">
            <option value="all">📍 All Cities</option>
            ${cities.map((c) => `<option value="${attr(c)}" ${cityFilter.toLowerCase() === c.toLowerCase() ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
          <input type="text" id="bus-search" placeholder="Search company, city, fleet..." value="${attr(searchQ)}" style="padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);font-size:.85rem;min-width:200px">
        </div>
      </div>

      <!-- Minimalist Bus Partner Manifest Table -->
      <div class="card flush table-wrap" style="overflow-x:auto">
        <table class="table" style="width:100%;min-width:1120px;border-collapse:collapse">
          <thead>
            <tr>
              <th style="width:60px;min-width:60px;text-align:center">Score</th>
              <th style="width:280px;min-width:280px">Company & Base</th>
              <th style="width:220px;min-width:220px">Fleet Types</th>
              <th style="width:160px;min-width:160px">Discretion / Livery</th>
              <th style="width:165px;min-width:165px">Status</th>
              <th style="width:185px;min-width:185px">Direct Links</th>
              <th style="width:100px;min-width:100px;text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map((p) => {
              const score = p.relevance_score || 0;
              const tier = core.getPriorityTier(score);
              const scoreClass = score >= 90 ? 'chip ok' : score >= 75 ? 'chip' : score >= 50 ? 'chip gold' : 'chip bad';
              const categories = Array.isArray(p.fleet_categories) ? p.fleet_categories : [];

              return `<tr class="hover-row" data-id="${attr(p.id)}" style="height:48px">
                <td style="text-align:center;vertical-align:middle">
                  <span class="${scoreClass} clickable" data-act="view-score" data-id="${attr(p.id)}" style="font-weight:700;font-size:.88rem;padding:3px 8px;cursor:pointer" title="Click to view 4-pillar score breakdown">
                    ${score}
                  </span>
                </td>
                <td style="vertical-align:middle">
                  <div class="row nowrap" style="gap:6px;align-items:baseline;white-space:nowrap">
                    <span style="font-weight:600;font-size:.92rem;color:var(--ink)">${esc(p.name)}</span>
                    <span class="tiny muted" style="white-space:nowrap">📍 ${esc(p.base_city || 'Northern Italy')}</span>
                  </div>
                  <div class="row nowrap" style="gap:8px;align-items:center;margin-top:3px;font-size:.76rem;white-space:nowrap">
                    ${p.email 
                      ? `<a href="mailto:${attr(p.email)}" class="clickable" style="color:var(--series-1);text-decoration:none;display:inline-flex;align-items:center;gap:3px;white-space:nowrap" title="Email: ${attr(p.email)}">${icon('email', 11)} ${esc(p.email)}</a>`
                      : `<button class="clickable" data-act="edit-notes" data-id="${attr(p.id)}" style="background:none;border:none;padding:0;color:var(--gold);cursor:pointer;font-size:.74rem;text-decoration:underline;white-space:nowrap" title="Click to add email">+ Add email</button>`
                    }
                    <span class="faint">·</span>
                    <div class="clickable" data-act="edit-notes" data-id="${attr(p.id)}" style="cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px" title="Click to edit notes: ${attr(p.notes || '')}">
                      ${p.notes 
                        ? `<span style="color:var(--text-2);font-style:italic">📝 ${esc(p.notes)}</span>`
                        : `<span style="color:var(--text-3);font-style:italic">+ Notes</span>`
                      }
                    </div>
                  </div>
                </td>
                <td style="vertical-align:middle">
                  <div class="row nowrap" style="gap:4px;flex-wrap:nowrap;overflow:hidden;white-space:nowrap">
                    ${categories.slice(0, 2).map((c) => `<span class="chip tiny outline" style="font-size:.72rem;white-space:nowrap" title="${attr(c)}">${esc(c.length > 24 ? c.slice(0, 23) + '…' : c)}</span>`).join('')}
                    ${categories.length > 2 ? `<span class="chip tiny outline faint" title="${attr(categories.slice(2).join(', '))}">+${categories.length - 2}</span>` : ''}
                    ${!categories.length ? '<span class="faint tiny">Minibus / GT Coaches</span>' : ''}
                  </div>
                </td>
                <td style="vertical-align:middle;white-space:nowrap">
                  ${p.unbranded_status?.includes('Total Black') || p.unbranded_status?.includes('Guaranteed')
                    ? `<span class="chip tiny ok" style="font-weight:600;white-space:nowrap">🛡️ Total Black</span>`
                    : p.unbranded_status?.includes('On Request')
                      ? `<span class="chip tiny gold" style="white-space:nowrap">⚠️ On Request</span>`
                      : `<span class="chip tiny outline" style="white-space:nowrap">${esc(p.unbranded_status ? (p.unbranded_status.length > 20 ? p.unbranded_status.slice(0, 19) + '…' : p.unbranded_status) : 'Standard Livery')}</span>`}
                </td>
                <td style="vertical-align:middle;white-space:nowrap">
                  <select class="sm bus-status-select" data-id="${attr(p.id)}" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border);font-size:.78rem;width:100%;min-width:148px;background:var(--surface);white-space:nowrap;${p.status === 'NOT_RELEVANT' ? 'color:var(--bad);font-weight:600' : ''}">
                    ${core.BUS_STATUSES.map((st) => `<option value="${st.key}" ${p.status === st.key ? 'selected' : ''}>${st.label}</option>`).join('')}
                  </select>
                </td>
                <td style="vertical-align:middle;white-space:nowrap">
                  <div class="row nowrap" style="gap:4px;flex-wrap:nowrap;white-space:nowrap;align-items:center">
                    ${p.website ? `<a class="btn sm ghost" href="${attr(p.website)}" target="_blank" rel="noopener" style="padding:3px 7px;font-size:.74rem;white-space:nowrap" title="Open Website">${icon('external', 12)} Web</a>` : ''}
                    ${p.fleet_url ? `<a class="btn sm ghost" href="${attr(p.fleet_url)}" target="_blank" rel="noopener" style="padding:3px 7px;font-size:.74rem;white-space:nowrap" title="Open Fleet Gallery">Fleet ↗</a>` : ''}
                    ${p.email 
                      ? `<a class="btn sm ghost" href="mailto:${attr(p.email)}" style="padding:3px 6px;font-size:.74rem;white-space:nowrap" title="Email: ${attr(p.email)}">${icon('email', 12)}</a>` 
                      : `<button class="btn sm ghost" data-act="edit-notes" data-id="${attr(p.id)}" style="padding:3px 6px;font-size:.74rem;color:var(--gold);white-space:nowrap" title="Add Email">+✉️</button>`
                    }
                    ${p.phone ? `<a class="btn sm ghost" href="tel:${attr(p.phone)}" style="padding:3px 6px;font-size:.74rem;white-space:nowrap" title="${attr(p.phone)}">${icon('phone', 12)}</a>` : ''}
                  </div>
                </td>
                <td style="vertical-align:middle;text-align:right;white-space:nowrap">
                  <div class="row nowrap end" style="gap:4px;flex-wrap:nowrap;white-space:nowrap;justify-content:flex-end;align-items:center">
                    <button class="btn sm ghost" data-act="edit-notes" data-id="${attr(p.id)}" style="padding:3px 8px;font-size:.75rem;white-space:nowrap" title="Edit Email & Dispatch Notes">✏️ Notes</button>
                    <button class="btn sm ghost" data-act="delete-partner" data-id="${attr(p.id)}" style="padding:3px 6px;font-size:.85rem;color:var(--bad);white-space:nowrap" title="Delete Partner">×</button>
                  </div>
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="7" class="empty small">No bus operators found matching the current filters.</td></tr>`}
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

  function openNotesModal(partner) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
    <div class="modal card stack" style="max-width:540px;padding:24px">
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
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
    <div class="modal card stack" style="max-width:540px;padding:24px">
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
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
    <div class="modal card stack" style="max-width:580px;padding:24px;max-height:90vh;overflow-y:auto">
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
