// Event Outreach Outbox & Reply Triage View
// 100% Isolated from Wedding Planners and Bus Fleets.
// Stripe Sail Design System: safety gates, zero-accidental-send invariants, manual draft approval.

import { S, updateEventPartner } from '../store.js?v=20261103_v5';
import { esc, attr, icon, toast } from '../ui.js';
import { 
  loadStoredEventPartners, 
  loadStoredEventTemplates, 
  renderEventTemplate 
} from '../event_planners_data.js?v=20261103_v5';

let currentEl = null;

export async function render(el) {
  currentEl = el;
  const stored = loadStoredEventPartners();
  const partners = (S.eventPartners && S.eventPartners.length >= stored.length) ? S.eventPartners : stored;
  const templates = loadStoredEventTemplates();
  const t1 = templates.find((t) => t.key === 'T1_exhibitor_intro') || templates[0];

  const totalCount = partners.length;
  const toReviewCount = partners.filter((p) => p.status === 'TO_REVIEW').length;
  const readyPartners = partners.filter((p) => p.status === 'WANT_TO_CONTACT');
  const contactedPartners = partners.filter((p) => p.status === 'CONTACTED' || p.status === 'APPROVED_PARTNER');

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px">
      <!-- Header Banner -->
      <div class="sail-card" style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <h1 style="font-size:19px;font-weight:700;color:var(--sail-ink);margin:0;letter-spacing:-0.02em">
              📤 Event Outbox &amp; Replies
            </h1>
            <span class="sail-pill ok" style="font-size:10.5px;font-weight:700">events@dorogo-events.eu</span>
            <span class="sail-pill warn" style="font-size:10.5px">Safe Mode Active</span>
          </div>
          <div style="font-size:12px;color:var(--sail-muted);margin-top:4px">
            Manual review and dispatch gatekeeper for foreign exhibiting teams arriving for Milano Home 2027.
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <a href="#event_templates" class="sail-btn default" style="font-size:11.5px;padding:6px 12px;text-decoration:none">
            Review Sequences &amp; Rates
          </a>
          <a href="#event_partners" class="sail-btn primary" style="font-size:11.5px;padding:6px 12px;text-decoration:none">
            ← Exhibitor Directory
          </a>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div class="sail-stat-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:12px">
        <div class="sail-card" style="padding:12px 14px">
          <div class="sail-stat-label" style="font-size:11px;color:var(--sail-muted);text-transform:uppercase;letter-spacing:0.04em;font-weight:600">Total Foreign Exhibitors</div>
          <div class="sail-stat-val" style="font-size:22px;font-weight:700;color:var(--sail-ink);margin:4px 0 2px 0">${totalCount}</div>
          <div class="sail-stat-meta" style="font-size:11px;color:var(--sail-muted)">Milano Home 2027 database</div>
        </div>
        <div class="sail-card" style="padding:12px 14px">
          <div class="sail-stat-label" style="font-size:11px;color:var(--sail-muted);text-transform:uppercase;letter-spacing:0.04em;font-weight:600">Locked in Review</div>
          <div class="sail-stat-val" style="font-size:22px;font-weight:700;color:#D97706;margin:4px 0 2px 0">${toReviewCount}</div>
          <div class="sail-stat-meta" style="font-size:11px;color:var(--sail-muted)">Zero sends allowed (Safe)</div>
        </div>
        <div class="sail-card" style="padding:12px 14px">
          <div class="sail-stat-label" style="font-size:11px;color:var(--sail-muted);text-transform:uppercase;letter-spacing:0.04em;font-weight:600">Ready to Send (Outbox)</div>
          <div class="sail-stat-val" style="font-size:22px;font-weight:700;color:#2563EB;margin:4px 0 2px 0">${readyPartners.length}</div>
          <div class="sail-stat-meta" style="font-size:11px;color:var(--sail-muted)">Drafts reviewed &amp; queued</div>
        </div>
        <div class="sail-card" style="padding:12px 14px">
          <div class="sail-stat-label" style="font-size:11px;color:var(--sail-muted);text-transform:uppercase;letter-spacing:0.04em;font-weight:600">Contacted &amp; Booked</div>
          <div class="sail-stat-val" style="font-size:22px;font-weight:700;color:#059669;margin:4px 0 2px 0">${contactedPartners.length}</div>
          <div class="sail-stat-meta" style="font-size:11px;color:var(--sail-muted)">Dispatched emails</div>
        </div>
      </div>

      <!-- Safety Gate Status Banner -->
      <div class="sail-card" style="padding:14px 16px;background:#F8FAFC;border-left:4px solid #D97706;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div>
          <div style="font-weight:700;font-size:12.5px;color:var(--sail-ink)">
            🔒 Zero-Accidental-Send Guardrail Active
          </div>
          <div style="font-size:11.5px;color:var(--sail-muted);margin-top:2px">
            All 78 foreign exhibitors start in <code>TO_REVIEW</code>. An email draft is only generated when you move an exhibitor to <code>Ready to Contact</code> in the directory.
          </div>
        </div>
        <span class="sail-pill info" style="font-size:11px">Send Window: Tue–Thu 08:30–11:30 CET</span>
      </div>

      <!-- Section 1: Ready to Send Queue (WANT_TO_CONTACT) -->
      <div class="sail-card" style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <h2 style="font-size:14px;font-weight:700;color:var(--sail-ink);margin:0">
              📬 Scheduled Outbox Queue (${readyPartners.length})
            </h2>
            <div style="font-size:11px;color:var(--sail-muted)">
              Exhibitors queued for outreach. Inspect drafts and approve or copy to your mail client.
            </div>
          </div>
        </div>

        ${readyPartners.length === 0 ? `
          <div style="padding:32px 16px;text-align:center;color:var(--sail-muted);border:1px dashed var(--sail-line);border-radius:8px">
            <div style="font-size:13px;font-weight:600;color:var(--sail-ink);margin-bottom:4px">No drafts currently in outbox queue</div>
            <div style="font-size:11.5px;max-width:440px;margin:0 auto">
              All 78 exhibiting teams are currently safe in <code>TO_REVIEW</code>. To queue outreach for an exhibitor, open the 
              <a href="#event_partners" style="color:var(--sail-primary);font-weight:600;text-decoration:none">Exhibitor Directory</a> 
              and change their status dropdown to <strong>Ready to Contact</strong>.
            </div>
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:12px">
            ${readyPartners.map((p) => {
              const draft = renderEventTemplate(t1, p);
              return `
                <div style="border:1px solid var(--sail-line);border-radius:8px;padding:14px;background:#FFF;display:flex;flex-direction:column;gap:10px">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
                    <div>
                      <span style="font-weight:700;font-size:13px;color:var(--sail-ink)">
                        ${esc(p.flag || '🌍')} ${esc(p.name)}
                      </span>
                      <span style="font-size:11.5px;color:var(--sail-muted);margin-left:6px">
                        (${esc(p.country)} · ✈️ ${esc((p.origin_hub || 'MXP').split(' ')[0])})
                      </span>
                    </div>
                    <div style="display:flex;gap:6px">
                      <button class="sail-btn default btn-copy-outbox" data-id="${attr(p.id)}" style="font-size:11px;padding:4px 8px">
                        📋 Copy Email
                      </button>
                      <button class="sail-btn default btn-unqueue-outbox" data-id="${attr(p.id)}" style="font-size:11px;padding:4px 8px;color:#D97706">
                        ↩ Back to Review
                      </button>
                      <button class="sail-btn primary btn-mark-sent" data-id="${attr(p.id)}" style="font-size:11px;padding:4px 10px">
                        ✓ Mark as Sent
                      </button>
                    </div>
                  </div>

                  <div style="background:#F8FAFC;padding:10px;border-radius:6px;font-size:11.5px;display:flex;flex-direction:column;gap:4px">
                    <div><strong>To:</strong> ${esc(p.contact_person)} &lt;${esc(p.email)}&gt;</div>
                    <div><strong>Subject:</strong> ${esc(draft.subject)}</div>
                  </div>

                  <div style="font-size:11.5px;line-height:1.55;color:var(--sail-body);white-space:pre-wrap;background:#FAFAFA;padding:10px;border-radius:6px;max-height:160px;overflow-y:auto">
${esc(draft.body)}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Section 2: Contacted Exhibitors (CONTACTED / APPROVED_PARTNER) -->
      <div class="sail-card" style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <h2 style="font-size:14px;font-weight:700;color:var(--sail-ink);margin:0">
          💬 Contacted Exhibitors &amp; Conversations (${contactedPartners.length})
        </h2>

        ${contactedPartners.length === 0 ? `
          <div style="padding:24px 16px;text-align:center;color:var(--sail-muted);font-size:11.5px">
            No exhibitors have been contacted yet. Outreach will be tracked here once confirmed.
          </div>
        ` : `
          <div style="overflow-x:auto">
            <table class="sail-table" style="width:100%">
              <thead>
                <tr>
                  <th>Exhibitor Name</th>
                  <th>Country</th>
                  <th>Contact Person &amp; Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${contactedPartners.map((p) => `
                  <tr>
                    <td><strong>${esc(p.name)}</strong></td>
                    <td>${esc(p.flag || '🌍')} ${esc(p.country)}</td>
                    <td>${esc(p.contact_person)} (${esc(p.email)})</td>
                    <td><span class="sail-pill ok" style="font-size:10.5px">${esc(p.status)}</span></td>
                    <td>
                      <button class="sail-btn default btn-unqueue-outbox" data-id="${attr(p.id)}" style="font-size:10.5px;padding:2px 6px">
                        Reset Status
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

    </div>
  `;

  attachEventListeners(el);
}

function attachEventListeners(el) {
  // Mark as sent
  el.querySelectorAll('.btn-mark-sent').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      try {
        await updateEventPartner(id, { status: 'CONTACTED' });
        toast('Exhibitor moved to Contacted');
        render(el);
      } catch (err) {
        toast(`Error: ${err.message}`, 'error');
      }
    });
  });

  // Unqueue / Back to review
  el.querySelectorAll('.btn-unqueue-outbox').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      try {
        await updateEventPartner(id, { status: 'TO_REVIEW' });
        toast('Exhibitor moved back to To Review (Safe)');
        render(el);
      } catch (err) {
        toast(`Error: ${err.message}`, 'error');
      }
    });
  });

  // Copy email
  el.querySelectorAll('.btn-copy-outbox').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const stored = loadStoredEventPartners();
      const p = stored.find((item) => item.id === id);
      const templates = loadStoredEventTemplates();
      const t1 = templates.find((t) => t.key === 'T1_exhibitor_intro') || templates[0];
      if (p) {
        const draft = renderEventTemplate(t1, p);
        const full = `To: ${p.email}\nSubject: ${draft.subject}\n\n${draft.body}`;
        navigator.clipboard?.writeText(full).then(() => {
          toast(`Draft for ${p.name} copied to clipboard`);
        });
      }
    });
  });
}
