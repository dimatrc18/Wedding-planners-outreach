// Event Outreach Templates & Corporate Rate Card View
// 100% Isolated from Wedding Planners and Bus Fleets.
// Stripe Sail Design System: responsive, zero horizontal scroll, live exhibitor simulator.

import { esc, attr, icon, toast } from '../ui.js';
import { updateEventPartner } from '../store.js?v=20261104_v1';
import { 
  DEFAULT_EVENT_TEMPLATES, 
  loadStoredEventTemplates, 
  saveStoredEventTemplates, 
  renderEventTemplate,
  loadStoredEventPartners 
} from '../event_planners_data.js?v=20261103_v7';

let currentStepKey = 'T1_exhibitor_intro';
let selectedExhibitorId = '';
let currentEl = null;


function renderPreviewSignatureHtml() {
  return `
    <div style="margin-top:14px;padding-top:10px;border-top:1px solid #E2E8F0;font-size:11px;color:#71717A;font-family:-apple-system, BlinkMacSystemFont, sans-serif">
      <div style="font-weight:600;color:#18181B;font-size:12.5px">Igor</div>
      <div style="color:#71717A;font-size:11px;margin-top:1px">Trade &amp; Event Logistics</div>
      <div style="font-family:Cinzel, Georgia, serif;font-size:13px;letter-spacing:2.5px;color:#18181B;margin-top:6px;font-weight:500">DOROGO</div>
      <div style="font-size:9px;letter-spacing:1px;color:#71717A;text-transform:uppercase">PRIVATE TRANSPORTATION</div>
      <div style="margin-top:6px;font-size:11px;display:flex;flex-direction:column;gap:2px">
        <div><span style="color:#71717A">WhatsApp:</span> <a href="https://wa.me/393780940554" style="color:#18181B;text-decoration:none !important;font-weight:500">+39 378 094 0554</a></div>
        <div><span style="color:#71717A">Email:</span> <a href="mailto:igor@b2b-dorogo.it" style="color:#18181B;text-decoration:none !important">igor@b2b-dorogo.it</a></div>
        <div><span style="color:#71717A">Web:</span> <a href="https://dorogo.eu/" target="_blank" rel="noopener noreferrer" style="color:#18181B;text-decoration:none !important">dorogo.eu</a></div>
      </div>
    </div>
  `;
}

export async function render(el) {
  currentEl = el;
  const templates = loadStoredEventTemplates();
  const exhibitors = loadStoredEventPartners();
  
  if (!selectedExhibitorId && exhibitors.length) {
    selectedExhibitorId = exhibitors[0].id;
  }

  const currentTemplate = templates.find((t) => t.key === currentStepKey) || templates[0];
  const selectedExhibitor = exhibitors.find((p) => p.id === selectedExhibitorId) || exhibitors[0];
  const rendered = selectedExhibitor ? renderEventTemplate(currentTemplate, selectedExhibitor) : { subject: '', body: '' };

  const readyList = exhibitors.filter((p) => p.status === 'WANT_TO_CONTACT');
  const contactedList = exhibitors.filter((p) => p.status === 'CONTACTED' || p.status === 'APPROVED_PARTNER');
  const toReviewList = exhibitors.filter((p) => p.status !== 'WANT_TO_CONTACT' && p.status !== 'CONTACTED' && p.status !== 'APPROVED_PARTNER');

  function renderOption(p) {
    let statusLabel = '⏳ Review';
    if (p.status === 'WANT_TO_CONTACT') {
      statusLabel = '🚀 Ready';
    } else if (p.status === 'CONTACTED' || p.status === 'APPROVED_PARTNER') {
      statusLabel = '✓ Sent';
    } else if (!p.email) {
      statusLabel = '⚠️ No Email';
    }
    return `<option value="${attr(p.id)}" ${p.id === selectedExhibitorId ? 'selected' : ''}>
      [${statusLabel}] ${esc(p.flag || '🌍')} ${esc(p.name)} (${esc(p.country)})
    </option>`;
  }

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px">
      <!-- Top Tab Navigation -->
      <div class="sail-tabs" style="display:flex;gap:6px;border-bottom:2px solid var(--sail-line);padding-bottom:10px;margin-bottom:2px;flex-wrap:wrap">
        <a href="#event_partners" class="sail-tab " style="height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 14px;font-size:12.5px;font-weight:700;text-decoration:none">
          🏛️ Foreign Exhibiting Teams (84)
        </a>
        <a href="#event_templates" class="sail-tab active" style="height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 14px;font-size:12.5px;font-weight:700;text-decoration:none">
          ✉️ Fair Sequences &amp; Corporate Rates
        </a>
        <a href="#event_outbox" class="sail-tab " style="height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 14px;font-size:12.5px;font-weight:700;text-decoration:none">
          📤 Event Outbox &amp; Replies
        </a>
      </div>
      
      <!-- Whali Executive Outreach Intelligence Card -->
      <div class="sail-card" style="background:linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);border-left:4px solid #635BFF;padding:14px 18px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap">
          <div style="font-weight:700;font-size:13px;color:#0A2540;display:flex;align-items:center;gap:6px">
            📊 Whali Outreach Intelligence · Data-Backed Timing &amp; Messaging Rules
          </div>
          <span class="sail-pill ok" style="font-size:10.5px;font-weight:700">6x Reply Rate Multiplier</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(190px, 1fr));gap:10px;font-size:11.5px;color:#425466">
          <div style="background:#FFF;padding:10px 12px;border-radius:6px;border:1px solid var(--sail-line)">
            <div style="font-weight:700;color:#0A2540;margin-bottom:3px">🎯 Subject &lt; 30 Chars</div>
            <div><strong>83.7% open rate</strong> vs 69.5% for &gt;70 chars. Short, specific, non-salesy.</div>
          </div>
          <div style="background:#FFF;padding:10px 12px;border-radius:6px;border:1px solid var(--sail-line)">
            <div style="font-weight:700;color:#0A2540;margin-bottom:3px">⚡ Body &lt; 100 Words</div>
            <div><strong>6x higher reply rate</strong> than 200-300 words. Reads as a peer question, not a pitch.</div>
          </div>
          <div style="background:#FFF;padding:10px 12px;border-radius:6px;border:1px solid var(--sail-line)">
            <div style="font-weight:700;color:#0A2540;margin-bottom:3px">📅 Send: Tue &amp; Wed</div>
            <div><strong>Wed 79.4% / Tue 78.3%</strong>. Thu &amp; Fri under 70%. Best slots: <strong>12pm, 3pm, 5pm</strong>.</div>
          </div>
          <div style="background:#FFF;padding:10px 12px;border-radius:6px;border:1px solid var(--sail-line)">
            <div style="font-weight:700;color:#0A2540;margin-bottom:3px">🔁 1 Follow-Up (+60% Lift)</div>
            <div>One follow-up lifts replies 60%+. Max 2 cold touches (stops unsubscribe surge).</div>
          </div>
        </div>
      </div>

      <!-- Header Banner -->
      <div class="sail-card" style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <h1 style="font-size:19px;font-weight:700;color:var(--sail-ink);margin:0;letter-spacing:-0.02em">
              ✉️ Fair Sequences &amp; Corporate Rates
            </h1>
            <span class="sail-pill ok" style="font-size:10.5px;font-weight:700">Milano Home 2027</span>
            <span class="sail-pill info" style="font-size:10.5px">Direct Exhibitor Cadence</span>
          </div>
          <div style="font-size:12px;color:var(--sail-muted);margin-top:4px">
            Discreet luxury B2B outreach for international exhibiting teams arriving at MXP/LIN for Fiera Milano Rho.
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="sail-btn default" id="btn-reset-templates" style="font-size:11.5px;padding:6px 12px">
            Reset to Defaults
          </button>
          <a href="#event_partners" class="sail-btn default" style="font-size:11.5px;padding:6px 12px;text-decoration:none">
            ← Exhibitor Directory
          </a>
        </div>
      </div>

      <!-- Main Two-Column Layout -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:16px;align-items:start">
        
        <!-- Column 1: Sequence Step Selector & Template Editor -->
        <div class="sail-card" style="padding:16px;display:flex;flex-direction:column;gap:14px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <h2 style="font-size:14px;font-weight:700;color:var(--sail-ink);margin:0">
              Sequence Step &amp; Template Copy
            </h2>
            <span class="sail-pill warn" style="font-size:10.5px">Active: Step ${currentTemplate.step_num}</span>
          </div>

          <!-- Step Tabs -->
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${templates.map((t) => `
              <button 
                class="sail-tab ${t.key === currentStepKey ? 'active' : ''}" 
                data-step-key="${attr(t.key)}" 
                style="height:30px;padding:0 12px;font-size:11.5px;white-space:nowrap"
              >
                ${esc(t.name.split(':')[0])}
              </button>
            `).join('')}
          </div>

          <!-- Template Form -->
          <form id="template-editor-form" style="display:flex;flex-direction:column;gap:12px;margin-top:4px">
            <div>
              <label style="display:block;font-size:11.5px;font-weight:600;color:var(--sail-ink);margin-bottom:4px">
                Subject Line
              </label>
              <input 
                type="text" 
                id="tpl-subject" 
                value="${attr(currentTemplate.subject)}" 
                style="width:100%;height:32px;padding:0 10px;border:1px solid var(--sail-line);border-radius:6px;font-size:12.5px;color:var(--sail-ink);background:#FFF"
                required
              >
            </div>

            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <label style="font-size:11.5px;font-weight:600;color:var(--sail-ink)">
                  Email Body (Markdown / Plain Text)
                </label>
                <span style="font-size:10.5px;color:var(--sail-muted)">
                  Dynamic merge tokens supported
                </span>
              </div>
              <textarea 
                id="tpl-body" 
                rows="14" 
                style="width:100%;padding:10px;border:1px solid var(--sail-line);border-radius:6px;font-size:12px;line-height:1.55;font-family:inherit;color:var(--sail-ink);background:#FFF;resize:vertical"
                required
              >${esc(currentTemplate.body)}</textarea>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:4px">
              <div style="font-size:11px;color:var(--sail-muted)">
                Merge tags: <code>{{company_name}}</code>, <code>{{contact_person}}</code>, <code>{{country}}</code>
              </div>
              <button type="submit" class="sail-btn primary" style="font-size:11.5px;padding:6px 14px">
                Save Template
              </button>
            </div>
          </form>
        </div>

        <!-- Column 2: Live Simulator & Rate Reference -->
        <div style="display:flex;flex-direction:column;gap:16px">
          
          <!-- Live Preview Simulator -->
          <div class="sail-card" style="padding:16px;display:flex;flex-direction:column;gap:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
              <div>
                <div style="display:flex;align-items:center;gap:6px">
                  <h2 style="font-size:14px;font-weight:700;color:var(--sail-ink);margin:0">
                    Live Exhibitor Preview
                  </h2>
                  <span class="sail-pill ${selectedExhibitor?.status === 'WANT_TO_CONTACT' ? 'info' : ((selectedExhibitor?.status === 'CONTACTED' || selectedExhibitor?.status === 'APPROVED_PARTNER') ? 'ok' : 'warn')}" style="font-size:10.5px;font-weight:700">
                    ${selectedExhibitor?.status === 'WANT_TO_CONTACT' ? '🚀 Ready in Outbox' : ((selectedExhibitor?.status === 'CONTACTED' || selectedExhibitor?.status === 'APPROVED_PARTNER') ? '✓ Sent / Contacted' : '⏳ To Review')}
                  </span>
                </div>
                <div style="font-size:11px;color:var(--sail-muted);margin-top:2px">
                  Simulate exact email · <span style="font-weight:600;color:var(--sail-ink)">${readyList.length} Ready</span> · <span style="font-weight:600;color:var(--sail-muted)">${toReviewList.length} To Review</span> · <span style="font-weight:600;color:#059669">${contactedList.length} Sent</span>
                </div>
              </div>

              <!-- Exhibitor Selector with Status Optgroups & Status Badges -->
              <select id="preview-exhibitor-select" style="height:32px;padding:0 8px;border:1px solid #CBD5E1;border-radius:6px;font-size:11.5px;background:#FFF;color:var(--sail-ink);cursor:pointer;min-width:280px;max-width:380px;font-weight:600">
                ${readyList.length > 0 ? `
                  <optgroup label="🚀 Ready to Send / In Outbox (${readyList.length})">
                    ${readyList.map(renderOption).join('')}
                  </optgroup>
                ` : ''}
                ${toReviewList.length > 0 ? `
                  <optgroup label="⏳ To Review (${toReviewList.length})">
                    ${toReviewList.map(renderOption).join('')}
                  </optgroup>
                ` : ''}
                ${contactedList.length > 0 ? `
                  <optgroup label="✓ Contacted / Already Sent (${contactedList.length})">
                    ${contactedList.map(renderOption).join('')}
                  </optgroup>
                ` : ''}
              </select>
            </div>

            <!-- Email Mock Container -->
            <div style="background:#F8FAFC;border:1px solid var(--sail-line);border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:10px">
              <div style="display:flex;flex-direction:column;gap:4px;border-bottom:1px solid var(--sail-line);padding-bottom:10px">
                <div style="font-size:11.5px;color:var(--sail-muted)">
                  <strong>From:</strong> Igor &lt;igor@b2b-dorogo.it&gt;
                </div>
                <div style="font-size:11.5px;color:var(--sail-muted)">
                  <strong>To:</strong> ${selectedExhibitor?.email ? `${esc(selectedExhibitor?.contact_person || 'Trade Fair Team')} &lt;<span style="color:#2563EB;font-weight:600">${esc(selectedExhibitor.email)}</span>&gt;` : `<span class="sail-pill warn" style="font-size:10px;font-weight:700;padding:2px 8px;background:#FEF3C7;color:#92400E;border:1px solid #FCD34D">⚠️ Missing Email (Enrichment Needed)</span>`}
                </div>
                <div style="font-size:12px;font-weight:700;color:var(--sail-ink);margin-top:2px">
                  ${esc(rendered.subject)}
                </div>
              </div>

              <!-- Body Render -->
              <div style="font-size:12px;line-height:1.6;color:var(--sail-body);background:#FFF;padding:12px;border-radius:6px;border:1px solid #E2E8F0;max-height:240px;overflow-y:auto">
                <div style="white-space:pre-wrap;font-family:inherit">${esc(rendered.body)}</div>
                ${renderPreviewSignatureHtml()}
              </div>
            </div>

            <!-- Actions Toolbar: Ready to Send Button & Copy -->
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding-top:4px">
              <button class="sail-btn default" id="btn-copy-preview" style="font-size:11px;padding:5px 10px">
                📋 Copy Rendered Draft
              </button>

              <div style="display:flex;gap:6px;align-items:center">
                ${selectedExhibitor?.status === 'WANT_TO_CONTACT' ? `
                  <span class="sail-pill info" style="font-size:11px;font-weight:700;padding:4px 8px">
                    ✓ In Outbox (Ready to Send)
                  </span>
                  <a href="#event_outbox" class="sail-btn primary" style="font-size:11px;padding:5px 12px;background:#2563EB;text-decoration:none">
                    Open Outbox ➔
                  </a>
                  <button class="sail-btn default" id="btn-unqueue-preview" style="font-size:11px;padding:5px 8px;color:#D97706">
                    ↩ Back to Review
                  </button>
                ` : `
                  <button class="sail-btn primary" id="btn-mark-ready-preview" style="font-size:11.5px;padding:5px 14px;background:#2563EB;font-weight:700">
                    🚀 Mark Ready to Send (Move to Outbox)
                  </button>
                `}
              </div>
            </div>
          </div>

          <!-- B2B Rate Card Reference -->
          <div class="sail-card" style="padding:14px 16px">
            <h3 style="font-size:13px;font-weight:700;color:var(--sail-ink);margin:0 0 8px 0">
              📋 Milano Home 2027 Corporate Tariffs (Reference)
            </h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11.5px">
              <div style="background:#F8FAFC;padding:8px 10px;border-radius:6px;border:1px solid var(--sail-line)">
                <div style="font-weight:600;color:var(--sail-ink)">MXP ➔ Milan / Rho Fiera</div>
                <div style="color:var(--sail-muted);margin-top:2px">E-Class: <strong>€140</strong> · V-Class: <strong>€170</strong></div>
              </div>
              <div style="background:#F8FAFC;padding:8px 10px;border-radius:6px;border:1px solid var(--sail-line)">
                <div style="font-weight:600;color:var(--sail-ink)">LIN ➔ Milan / Rho Fiera</div>
                <div style="color:var(--sail-muted);margin-top:2px">E-Class: <strong>€95</strong> · V-Class: <strong>€130</strong></div>
              </div>
              <div style="background:#F8FAFC;padding:8px 10px;border-radius:6px;border:1px solid var(--sail-line)">
                <div style="font-weight:600;color:var(--sail-ink)">Daily Stand Shuttle</div>
                <div style="color:var(--sail-muted);margin-top:2px">Hotel ➔ Rho Pavilion: <strong>€95</strong></div>
              </div>
              <div style="background:#F8FAFC;padding:8px 10px;border-radius:6px;border:1px solid var(--sail-line)">
                <div style="font-weight:600;color:var(--sail-ink)">Hourly Standby (Min 4h)</div>
                <div style="color:var(--sail-muted);margin-top:2px">E-Class: <strong>€85/h</strong> · V-Class: <strong>€95/h</strong></div>
              </div>
            </div>
            <div style="font-size:10.5px;color:var(--sail-muted);margin-top:8px">
              * Rates include driver meet &amp; greet, airport parking, Milan ZTL permits, highway tolls, and VAT.
            </div>
          </div>

        </div>

      </div>
    </div>
  `;

  attachEventListeners(el, templates);
}

function attachEventListeners(el, templates) {
  // Step tabs
  el.querySelectorAll('[data-step-key]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentStepKey = btn.dataset.stepKey;
      render(el);
    });
  });

  // Exhibitor simulator dropdown
  el.querySelector('#preview-exhibitor-select')?.addEventListener('change', (e) => {
    selectedExhibitorId = e.target.value;
    render(el);
  });

  // Save template form
  el.querySelector('#template-editor-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const updated = templates.map((t) => {
      if (t.key === currentStepKey) {
        return {
          ...t,
          subject: el.querySelector('#tpl-subject').value.trim(),
          body: el.querySelector('#tpl-body').value.trim()
        };
      }
      return t;
    });
    saveStoredEventTemplates(updated);
    toast('Template changes saved successfully');
    render(el);
  });

  // Reset to defaults
  el.querySelector('#btn-reset-templates')?.addEventListener('click', () => {
    if (confirm('Reset all event email templates to factory defaults?')) {
      saveStoredEventTemplates(DEFAULT_EVENT_TEMPLATES);
      toast('Templates reset to defaults');
      render(el);
    }
  });

  // Copy rendered preview
  el.querySelector('#btn-copy-preview')?.addEventListener('click', () => {
    const exhibitors = loadStoredEventPartners();
    const currentTemplate = templates.find((t) => t.key === currentStepKey) || templates[0];
    const selectedExhibitor = exhibitors.find((p) => p.id === selectedExhibitorId) || exhibitors[0];
    const rendered = renderEventTemplate(currentTemplate, selectedExhibitor);
    const sig = `\n\n―\nIgor\nTrade & Event Logistics\n\nDOROGO | PRIVATE TRANSPORTATION\nWhatsApp: +39 378 094 0554\nEmail: igor@b2b-dorogo.it\nWeb: dorogo.eu`;
    const full = `Subject: ${rendered.subject}\n\n${rendered.body}${sig}`;
    navigator.clipboard?.writeText(full).then(() => {
      toast('Rendered email copied to clipboard (with signature)');
    });
  });

  // Mark Ready to Send button
  const btnMarkReady = el.querySelector('#btn-mark-ready-preview');
  if (btnMarkReady) {
    btnMarkReady.onclick = async () => {
      const exhibitors = loadStoredEventPartners();
      const p = exhibitors.find((x) => x.id === selectedExhibitorId) || exhibitors[0];
      if (p) {
        if (!p.email || p.email.includes('sales@company.com')) {
          toast('⚠️ Cannot queue to Outbox: Please enrich this exhibitor with a verified email first.', 'warn');
          return;
        }
        await updateEventPartner(p.id, { status: 'WANT_TO_CONTACT' });
        toast(`✓ ${p.name} moved to Ready to Send (Outbox)!`);
        render(el);
      }
    };
  }

  // Unqueue / Back to Review button
  const btnUnqueue = el.querySelector('#btn-unqueue-preview');
  if (btnUnqueue) {
    btnUnqueue.onclick = async () => {
      const exhibitors = loadStoredEventPartners();
      const p = exhibitors.find((x) => x.id === selectedExhibitorId) || exhibitors[0];
      if (p) {
        await updateEventPartner(p.id, { status: 'TO_REVIEW' });
        toast(`${p.name} moved back to To Review`);
        render(el);
      }
    };
  }
}
