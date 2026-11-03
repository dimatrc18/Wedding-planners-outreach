// Event Outreach Templates & Corporate Rate Card View
// 100% Isolated from Wedding Planners and Bus Fleets.
// Stripe Sail Design System: responsive, zero horizontal scroll, live exhibitor simulator.

import { esc, attr, icon, toast } from '../ui.js';
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

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px">
      <!-- Top Tab Navigation -->
      <div class="sail-tabs" style="display:flex;gap:6px;border-bottom:2px solid var(--sail-line);padding-bottom:10px;margin-bottom:2px;flex-wrap:wrap">
        <a href="#event_partners" class="sail-tab " style="height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 14px;font-size:12.5px;font-weight:700;text-decoration:none">
          🏛️ Foreign Exhibiting Teams (78)
        </a>
        <a href="#event_templates" class="sail-tab active" style="height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 14px;font-size:12.5px;font-weight:700;text-decoration:none">
          ✉️ Fair Sequences &amp; Corporate Rates
        </a>
        <a href="#event_outbox" class="sail-tab " style="height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 14px;font-size:12.5px;font-weight:700;text-decoration:none">
          📤 Event Outbox &amp; Replies
        </a>
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
                <h2 style="font-size:14px;font-weight:700;color:var(--sail-ink);margin:0">
                  Live Exhibitor Preview
                </h2>
                <div style="font-size:11px;color:var(--sail-muted)">
                  Simulate exact rendered email for any of the 78 teams
                </div>
              </div>

              <!-- Exhibitor Selector -->
              <select id="preview-exhibitor-select" style="height:30px;padding:0 8px;border:1px solid var(--sail-line);border-radius:6px;font-size:11.5px;background:#FFF;color:var(--sail-ink);cursor:pointer;max-width:210px">
                ${exhibitors.map((p) => `
                  <option value="${attr(p.id)}" ${p.id === selectedExhibitorId ? 'selected' : ''}>
                    ${esc(p.flag || '🌍')} ${esc(p.name)} (${esc(p.country)})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Email Mock Container -->
            <div style="background:#F8FAFC;border:1px solid var(--sail-line);border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:10px">
              <div style="display:flex;flex-direction:column;gap:4px;border-bottom:1px solid var(--sail-line);padding-bottom:10px">
                <div style="font-size:11.5px;color:var(--sail-muted)">
                  <strong>From:</strong> Igor &lt;igor@b2b-dorogo.eu&gt;
                </div>
                <div style="font-size:11.5px;color:var(--sail-muted)">
                  <strong>To:</strong> ${esc(selectedExhibitor?.contact_person || 'Trade Sales Desk')} &lt;${esc(selectedExhibitor?.email || 'sales@company.com')}&gt;
                </div>
                <div style="font-size:12px;font-weight:700;color:var(--sail-ink);margin-top:2px">
                  ${esc(rendered.subject)}
                </div>
              </div>

              <!-- Body Render -->
              <div style="font-size:12px;line-height:1.6;color:var(--sail-body);white-space:pre-wrap;font-family:inherit">
${esc(rendered.body)}
              </div>
            </div>

            <!-- Copy Shortcut -->
            <div style="display:flex;justify-content:flex-end">
              <button class="sail-btn default" id="btn-copy-preview" style="font-size:11px;padding:4px 10px">
                📋 Copy Rendered Draft
              </button>
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
    const full = `Subject: ${rendered.subject}\n\n${rendered.body}`;
    navigator.clipboard?.writeText(full).then(() => {
      toast('Rendered email copied to clipboard');
    });
  });
}
