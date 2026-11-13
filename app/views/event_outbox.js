// Event Outreach Outbox & Reply Triage View
// 100% Isolated from Wedding Planners and Bus Fleets.
// Full Portal Control: batch size limit, throttling delay, live Hostinger SMTP dispatch, test sends, and delivery audit.

import { S, updateEventPartner } from '../store.js?v=20261104_v1';
import { esc, attr, icon, toast, fmtDateTime, dialog, confirmDialog } from '../ui.js';
import { 
  loadStoredEventPartners, 
  loadStoredEventTemplates, 
  renderEventTemplate 
} from '../event_planners_data.js?v=20261104_v1';

let currentEl = null;
let activeOutboxTab = 'queue'; // 'queue' | 'contacted'
let selectedPartnerIds = new Set();
let isDispatching = false;
let stopRequested = false;
let throttleDelayMs = 90000; // 90 seconds (Recommended B2B delay)
let scheduleMode = 'now'; // 'now' | 'planned'
let plannedSendTime = '15:00'; // Default planned send time

function getPlannedDate(timeStr) {
  const d = new Date();
  if (!timeStr) return d;
  const [h, m] = timeStr.split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function formatTimeSlot(baseDate, index, delayMs) {
  const d = new Date(baseDate.getTime() + index * delayMs);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getCountdownSummary(targetDate) {
  const diffMs = targetDate.getTime() - Date.now();
  if (diffMs <= 0) return '⚡ Scheduled for now';
  const totalSecs = Math.floor(diffMs / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (hrs > 0) return `⏳ Starts in ${hrs}h ${mins}m`;
  if (mins > 0) return `⏳ Starts in ${mins}m ${secs}s`;
  return `⏳ Starts in ${secs}s`;
}

// Saved password storage key
const SMTP_PASS_KEY = 'dorogo_event_hostinger_pass';

function getStoredPass() {
  try {
    return localStorage.getItem(SMTP_PASS_KEY) || sessionStorage.getItem(SMTP_PASS_KEY) || '';
  } catch (_) {
    return '';
  }
}

function setStoredPass(pass) {
  try {
    if (pass) {
      localStorage.setItem(SMTP_PASS_KEY, pass);
    } else {
      localStorage.removeItem(SMTP_PASS_KEY);
    }
  } catch (_) {}
}

async function sendEventEmailViaApi(payload) {
  if (window.APP_CONFIG && window.APP_CONFIG.MODE === 'live' && window.APP_CONFIG.SUPABASE_URL) {
    try {
      const res = await fetch(`${window.APP_CONFIG.SUPABASE_URL}/functions/v1/outreach-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': window.APP_CONFIG.SUPABASE_KEY
        },
        body: JSON.stringify({
          action: 'send_event_email',
          ...payload
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) return data;
      if (data.error) throw new Error(data.error);
    } catch (err) {
      console.warn('Supabase edge dispatch error, trying fallback to local:', err);
    }
  }

  const r = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await r.json();
}

async function testEventsSmtpViaApi(pass) {
  if (window.APP_CONFIG && window.APP_CONFIG.MODE === 'live' && window.APP_CONFIG.SUPABASE_URL) {
    try {
      const res = await fetch(`${window.APP_CONFIG.SUPABASE_URL}/functions/v1/outreach-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': window.APP_CONFIG.SUPABASE_KEY
        },
        body: JSON.stringify({
          action: 'test_events_smtp',
          hostingerPass: pass
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) return data;
      if (data.error) throw new Error(data.error);
    } catch (err) {
      console.warn('Supabase SMTP test error, trying fallback to local:', err);
    }
  }

  const r = await fetch('/api/test-smtp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostingerPass: pass, email: 'igor@b2b-dorogo.it' })
  });
  return await r.json();
}

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

  // Default selection: if none selected, select up to 5 by default
  if (selectedPartnerIds.size === 0 && readyPartners.length > 0) {
    readyPartners.slice(0, 5).forEach((p) => selectedPartnerIds.add(p.id));
  } else {
    // Clean up IDs that are no longer ready
    const readyIds = new Set(readyPartners.map((p) => p.id));
    for (const id of selectedPartnerIds) {
      if (!readyIds.has(id)) selectedPartnerIds.delete(id);
    }
  }

  const savedPass = getStoredPass();
  const isSmtpConfigured = !!savedPass;

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px">
      <!-- Top Tab Navigation -->
      <div class="sail-tabs" style="display:flex;gap:6px;border-bottom:2px solid var(--sail-line);padding-bottom:10px;margin-bottom:2px;flex-wrap:wrap">
        <a href="#event_partners" class="sail-tab " style="height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 14px;font-size:12.5px;font-weight:700;text-decoration:none">
          🏛️ Foreign Exhibiting Teams (${totalCount})
        </a>
        <a href="#event_templates" class="sail-tab " style="height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 14px;font-size:12.5px;font-weight:700;text-decoration:none">
          ✉️ Fair Sequences &amp; Corporate Rates
        </a>
        <a href="#event_outbox" class="sail-tab active" style="height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 14px;font-size:12.5px;font-weight:700;text-decoration:none">
          📤 Event Outbox &amp; Dispatcher ${readyPartners.length > 0 ? `<span class="sail-pill info" style="font-size:10px;padding:0 5px">${readyPartners.length}</span>` : ''}
        </a>
      </div>

      <!-- Header Banner & SMTP Connection Status -->
      <div class="sail-card" style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <h1 style="font-size:19px;font-weight:700;color:var(--sail-ink);margin:0;letter-spacing:-0.02em">
              📤 Event Outreach Dispatcher &amp; Outbox
            </h1>
            <span class="sail-pill ok" style="font-size:10.5px;font-weight:700">igor@b2b-dorogo.it</span>
            <span id="smtp-status-pill" class="sail-pill ${isSmtpConfigured ? 'ok' : 'warn'}" style="font-size:10.5px;cursor:pointer" title="Click to configure Hostinger SMTP password">
              ${isSmtpConfigured ? '🟢 Hostinger SMTP Ready' : '🟡 Hostinger Password Needed'}
            </span>
          </div>
          <div style="font-size:12px;color:var(--sail-muted);margin-top:4px">
            Direct executive dispatch engine for Milano Home 2027 foreign exhibitors. Review drafts, set send limits, and dispatch live emails through Hostinger.
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button id="btn-configure-smtp" class="sail-btn default" style="font-size:11.5px;padding:6px 12px">
            ⚙️ Mailbox Settings
          </button>
          <a href="#event_partners" class="sail-btn primary" style="font-size:11.5px;padding:6px 12px;text-decoration:none">
            ← Exhibitor Directory (${totalCount})
          </a>
        </div>
      </div>

      <!-- KPI Stat Grid -->
      <div class="sail-stat-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:12px">
        <div class="sail-card" style="padding:12px 14px">
          <div class="sail-stat-label" style="font-size:11px;color:var(--sail-muted);text-transform:uppercase;letter-spacing:0.04em;font-weight:600">Total Foreign Exhibitors</div>
          <div class="sail-stat-val" style="font-size:22px;font-weight:700;color:var(--sail-ink);margin:4px 0 2px 0">${totalCount}</div>
          <div class="sail-stat-meta" style="font-size:11px;color:var(--sail-muted)">Milano Home 2027</div>
        </div>
        <div class="sail-card" style="padding:12px 14px">
          <div class="sail-stat-label" style="font-size:11px;color:var(--sail-muted);text-transform:uppercase;letter-spacing:0.04em;font-weight:600">Locked in Review</div>
          <div class="sail-stat-val" style="font-size:22px;font-weight:700;color:#D97706;margin:4px 0 2px 0">${toReviewCount}</div>
          <div class="sail-stat-meta" style="font-size:11px;color:var(--sail-muted)">Safe / unqueued</div>
        </div>
        <div class="sail-card" style="padding:12px 14px">
          <div class="sail-stat-label" style="font-size:11px;color:var(--sail-muted);text-transform:uppercase;letter-spacing:0.04em;font-weight:600">Ready to Send (Outbox)</div>
          <div class="sail-stat-val" style="font-size:22px;font-weight:700;color:#2563EB;margin:4px 0 2px 0">${readyPartners.length}</div>
          <div class="sail-stat-meta" style="font-size:11px;color:var(--sail-muted)">Drafts reviewed &amp; queued</div>
        </div>
        <div class="sail-card" style="padding:12px 14px">
          <div class="sail-stat-label" style="font-size:11px;color:var(--sail-muted);text-transform:uppercase;letter-spacing:0.04em;font-weight:600">Delivered &amp; Contacted</div>
          <div class="sail-stat-val" style="font-size:22px;font-weight:700;color:#059669;margin:4px 0 2px 0">${contactedPartners.length}</div>
          <div class="sail-stat-meta" style="font-size:11px;color:var(--sail-muted)">Live emails dispatched</div>
        </div>
      </div>

      <!-- Outbox Section Tabs: Scheduled vs Contacted -->
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--sail-line);padding-bottom:8px;flex-wrap:wrap;gap:8px">
        <div style="display:flex;gap:6px">
          <button id="tab-btn-queue" class="sail-tab ${activeOutboxTab === 'queue' ? 'active' : ''}" style="height:30px;padding:0 12px;font-size:12px;font-weight:700;cursor:pointer">
            📬 Scheduled Outbox Queue (${readyPartners.length})
          </button>
          <button id="tab-btn-contacted" class="sail-tab ${activeOutboxTab === 'contacted' ? 'active' : ''}" style="height:30px;padding:0 12px;font-size:12px;font-weight:700;cursor:pointer">
            💬 Contacted &amp; Sent (${contactedPartners.length})
          </button>
        </div>
      </div>

      ${activeOutboxTab === 'queue' ? renderQueueView(readyPartners, t1, savedPass) : renderContactedView(contactedPartners)}

    </div>
  `;

  attachEventListeners(el, readyPartners, t1);
}


function renderSignatureHtml(senderEmail = 'igor@b2b-dorogo.it') {
  if (senderEmail && senderEmail.includes('dmitri')) {
    return `
      <div style="margin-top:14px;padding-top:10px;border-top:1px solid #E2E8F0;font-size:11px;color:#71717A;font-family:-apple-system, BlinkMacSystemFont, sans-serif">
        <div style="font-weight:600;color:#18181B;font-size:12.5px">Dmitri</div>
        <div style="color:#71717A;font-size:11px;margin-top:1px">Executive Director</div>
        <div style="font-family:Cinzel, Georgia, serif;font-size:13px;letter-spacing:2.5px;color:#18181B;margin-top:6px;font-weight:500">DOROGO</div>
        <div style="font-size:9px;letter-spacing:1px;color:#71717A;text-transform:uppercase">PRIVATE TRANSPORTATION</div>
        <div style="margin-top:6px;font-size:11px;display:flex;flex-direction:column;gap:2px">
          <div><span style="color:#71717A">WhatsApp:</span> <a href="https://wa.me/393780940554" style="color:#18181B;text-decoration:none !important;font-weight:500">+39 378 094 0554</a></div>
          <div><span style="color:#71717A">Email:</span> <a href="mailto:dmitri@dorogo.eu" style="color:#18181B;text-decoration:none !important">dmitri@dorogo.eu</a></div>
          <div><span style="color:#71717A">Web:</span> <a href="https://dorogo.eu/" target="_blank" rel="noopener noreferrer" style="color:#18181B;text-decoration:none !important">dorogo.eu</a></div>
        </div>
      </div>
    `;
  }
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

function renderQueueView(readyPartners, t1, savedPass) {
  const selectedCount = selectedPartnerIds.size;
  const isAllSelected = readyPartners.length > 0 && selectedCount === readyPartners.length;

  return `
    <!-- Batch Control Panel -->
    <div class="sail-card" style="padding:16px;background:#F8FAFC;border:1px solid #E2E8F0;display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:13.5px;font-weight:700;color:var(--sail-ink)">
            ⚡ Outreach Volume &amp; Batch Sending Controls
          </div>
          <div style="font-size:11.5px;color:var(--sail-muted);margin-top:2px">
            Select the number of emails to dispatch in this batch. Anti-spam throttling spaces out deliveries.
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <button id="btn-test-send-modal" class="sail-btn default" style="font-size:11.5px;padding:6px 12px" title="Send a single test email to your address before bulk sending">
            🧪 Send 1 Test Email
          </button>
          <button id="btn-batch-send" class="sail-btn primary" style="font-size:12px;padding:6px 16px;font-weight:700;background:#2563EB" ${selectedCount === 0 ? 'disabled' : ''}>
            🚀 Send Selected (${selectedCount}) Through Portal
          </button>
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid #E2E8F0;padding-top:12px;flex-wrap:wrap;gap:12px">
        <!-- Quick Volume Chips -->
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="font-size:11.5px;font-weight:600;color:var(--sail-ink)">Batch Volume:</span>
          <button class="sail-btn default btn-select-qty" data-qty="5" style="font-size:11px;padding:3px 8px">Next 5</button>
          <button class="sail-btn default btn-select-qty" data-qty="8" style="font-size:11px;padding:3px 8px">Next 8 (Day 2 Target)</button>
          <button class="sail-btn default btn-select-qty" data-qty="10" style="font-size:11px;padding:3px 8px">Next 10</button>
          <button class="sail-btn default btn-select-qty" data-qty="all" style="font-size:11px;padding:3px 8px">All Ready (${readyPartners.length})</button>
        </div>

        <!-- Schedule Mode & Planned Time -->
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:#FFF;padding:4px 10px;border-radius:6px;border:1px solid #CBD5E1">
          <span style="font-size:11.5px;font-weight:600;color:var(--sail-ink)">🕒 Planned Start:</span>
          <select id="select-schedule-mode" style="height:26px;font-size:11.5px;padding:0 6px;border:1px solid #CBD5E1;border-radius:4px;background:#F8FAFC">
            <option value="now" ${scheduleMode === 'now' ? 'selected' : ''}>⚡ Send Immediately (Now)</option>
            <option value="planned" ${scheduleMode === 'planned' ? 'selected' : ''}>📅 Specific Planned Time</option>
          </select>
          <input type="time" id="input-planned-time" value="${plannedSendTime}" style="height:26px;font-size:11.5px;padding:0 6px;border:1px solid #CBD5E1;border-radius:4px;background:#FFF;${scheduleMode === 'planned' ? '' : 'display:none'}" />
        </div>

        <!-- Throttling & Selection -->
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:11.5px;color:var(--sail-muted)">Cooldown Delay:</span>
            <select id="select-throttle-delay" style="height:26px;font-size:11.5px;padding:0 6px;border:1px solid #CBD5E1;border-radius:4px;background:#FFF">
              <option value="45000" ${throttleDelayMs === 45000 ? 'selected' : ''}>45 seconds (Fast)</option>
              <option value="60000" ${throttleDelayMs === 60000 ? 'selected' : ''}>60 seconds (1 min)</option>
              <option value="90000" ${throttleDelayMs === 90000 ? 'selected' : ''}>90 seconds (1.5 min - Recommended)</option>
              <option value="120000" ${throttleDelayMs === 120000 ? 'selected' : ''}>120 seconds (2 min - Stealth)</option>
              <option value="180000" ${throttleDelayMs === 180000 ? 'selected' : ''}>180 seconds (3 min - Safe Warm-up)</option>
            </select>
          </div>

          <div style="display:flex;align-items:center;gap:6px">
            <label style="font-size:11.5px;color:var(--sail-ink);cursor:pointer;display:inline-flex;align-items:center;gap:4px">
              <input type="checkbox" id="chk-select-all" ${isAllSelected ? 'checked' : ''} style="cursor:pointer">
              <span>Select All (${readyPartners.length})</span>
            </label>
            ${selectedCount > 0 ? `
              <button id="btn-unqueue-selected" class="sail-btn default" style="font-size:11px;padding:3px 8px;color:#D97706">
                ↩ Return Selected to Review
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Interactive Planned Timeline Preview -->
      ${selectedCount > 0 ? `
        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:10px 14px;font-size:12px;color:#1E40AF;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <strong>📅 Planned Staggered Sequence:</strong>
            ${scheduleMode === 'planned' 
              ? `First email (#1) at <strong>${formatTimeSlot(getPlannedDate(plannedSendTime), 0, throttleDelayMs)}</strong> · Last email (#${selectedCount}) at <strong>${formatTimeSlot(getPlannedDate(plannedSendTime), selectedCount - 1, throttleDelayMs)}</strong>`
              : `First email <strong>Immediate</strong> · Last email (#${selectedCount}) in <strong>${Math.round(((selectedCount - 1) * throttleDelayMs) / 60000 * 10) / 10} minutes</strong>`
            }
            <span style="font-size:11px;color:#3B82F6;margin-left:6px">(${Math.round(throttleDelayMs / 1000)}s cooldown between deliveries)</span>
          </div>
          <div style="font-weight:700;font-size:11.5px;background:#DBEAFE;color:#1E3A8A;padding:4px 12px;border-radius:12px">
            ${scheduleMode === 'planned' ? getCountdownSummary(getPlannedDate(plannedSendTime)) : '⚡ Ready for instant dispatch'}
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Ready Draft Cards -->
    ${readyPartners.length === 0 ? `
      <div class="sail-card" style="padding:40px 16px;text-align:center;color:var(--sail-muted);border:1px dashed var(--sail-line)">
        <div style="font-size:14px;font-weight:700;color:var(--sail-ink);margin-bottom:6px">No drafts currently in Scheduled Outbox</div>
        <div style="font-size:12px;max-width:480px;margin:0 auto;line-height:1.5">
          All foreign exhibiting teams are currently safe in <code>TO_REVIEW</code>. To queue outreach for an exhibitor, open the 
          <a href="#event_partners" style="color:var(--sail-primary);font-weight:700;text-decoration:none">Exhibitor Directory</a> 
          and set their status to <strong>Ready to Contact</strong>.
        </div>
      </div>
    ` : `
      <div style="display:flex;flex-direction:column;gap:14px">
        ${readyPartners.map((p, idx) => {
          const draft = renderEventTemplate(t1, p);
          const isSelected = selectedPartnerIds.has(p.id);
          const selectedList = readyPartners.filter(x => selectedPartnerIds.has(x.id));
          const selectedIdx = selectedList.findIndex(x => x.id === p.id);
          const plannedDate = getPlannedDate(plannedSendTime);
          const slotTime = selectedIdx >= 0
            ? (scheduleMode === 'planned' ? formatTimeSlot(plannedDate, selectedIdx, throttleDelayMs) : (selectedIdx === 0 ? 'Now (Slot #1)' : `+${Math.round((selectedIdx * throttleDelayMs) / 1000)}s`))
            : null;

          return `
            <div class="sail-card" style="padding:16px;display:flex;flex-direction:column;gap:12px;border:1px solid ${isSelected ? '#3B82F6' : 'var(--sail-line)'};background:#FFF;box-shadow:${isSelected ? '0 0 0 1px #3B82F6' : 'none'}">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
                <div style="display:flex;align-items:center;gap:10px">
                  <input type="checkbox" class="chk-partner-select" data-id="${attr(p.id)}" ${isSelected ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer">
                  <div>
                    <span style="font-weight:700;font-size:14px;color:var(--sail-ink)">
                      ${esc(p.flag || '🌍')} ${esc(p.name)}
                    </span>
                    <span style="font-size:11.5px;color:var(--sail-muted);margin-left:6px">
                      (${esc(p.country)} · ✈️ ${esc((p.origin_hub || 'MXP').split(' ')[0])} · Pavilion ${esc(p.stand || '1-4')})
                    </span>
                    ${slotTime ? `
                      <span class="sail-pill info" style="font-size:10.5px;font-weight:700;margin-left:8px;background:#DBEAFE;color:#1E40AF;border:1px solid #93C5FD;padding:2px 8px">
                        🕒 Planned Slot #${selectedIdx + 1}: ${slotTime}
                      </span>
                    ` : ''}
                  </div>
                </div>

                <div style="display:flex;gap:6px;align-items:center">
                  <button class="sail-btn default btn-edit-draft" data-id="${attr(p.id)}" style="font-size:11px;padding:4px 8px">
                    ✏️ Edit Draft
                  </button>
                  <button class="sail-btn default btn-single-test" data-id="${attr(p.id)}" style="font-size:11px;padding:4px 8px" title="Send a test copy to yourself">
                    🧪 Test Send
                  </button>
                  <button class="sail-btn default btn-copy-draft" data-id="${attr(p.id)}" style="font-size:11px;padding:4px 8px">
                    📋 Copy
                  </button>
                  <button class="sail-btn default btn-unqueue-single" data-id="${attr(p.id)}" style="font-size:11px;padding:4px 8px;color:#D97706">
                    ↩ To Review
                  </button>
                  <button class="sail-btn primary btn-single-send" data-id="${attr(p.id)}" style="font-size:11.5px;padding:4px 12px;font-weight:700;background:#2563EB">
                    ⚡ Send Now (Portal)
                  </button>
                </div>
              </div>

              <!-- Recipient & Subject Header -->
              <div style="background:#F8FAFC;padding:10px 12px;border-radius:6px;font-size:11.5px;display:flex;flex-direction:column;gap:4px;border:1px solid #E2E8F0">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
                  <div><strong>To:</strong> ${esc(p.contact_person)} &lt;<span style="color:#2563EB;font-weight:600">${esc(p.email)}</span>&gt;</div>
                  <div style="display:flex;align-items:center;gap:6px">
                    <span class="sail-badge" style="font-size:10.5px;background:${p.sender_email && p.sender_email.includes('dmitri') ? '#EFF6FF' : '#EDE9FE'};color:${p.sender_email && p.sender_email.includes('dmitri') ? '#1E40AF' : '#5B21B6'};border:1px solid ${p.sender_email && p.sender_email.includes('dmitri') ? '#BFDBFE' : '#DDD6FE'};border-radius:4px;padding:1px 6px">
                      👤 From: ${esc(p.sender_email || 'igor@b2b-dorogo.it')}
                    </span>
                    <span class="sail-pill ok" style="font-size:10px">Deliverable</span>
                  </div>
                </div>
                <div><strong>Subject:</strong> ${esc(draft.subject)}</div>
              </div>

              <!-- Email Body Preview -->
              <div id="body-preview-${attr(p.id)}" style="font-size:12px;line-height:1.6;color:var(--sail-body);background:#FAFAFA;padding:12px;border-radius:6px;border:1px solid #F1F5F9;max-height:220px;overflow-y:auto">
                <div style="white-space:pre-wrap">${esc(draft.body)}</div>
                ${renderSignatureHtml(p.sender_email)}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;
}

function renderContactedView(contactedPartners) {
  return `
    <div class="sail-card" style="padding:16px;display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div>
          <h2 style="font-size:14px;font-weight:700;color:var(--sail-ink);margin:0">
            💬 Contacted Foreign Exhibitors (${contactedPartners.length})
          </h2>
          <div style="font-size:11px;color:var(--sail-muted)">
            Audit log of all outreach dispatched from <code>igor@b2b-dorogo.it</code> with timestamps and Hostinger delivery IDs.
          </div>
        </div>
      </div>

      ${contactedPartners.length === 0 ? `
        <div style="padding:32px 16px;text-align:center;color:var(--sail-muted);font-size:12px">
          No exhibitors have been contacted yet. Dispatched emails will appear here automatically.
        </div>
      ` : `
        <div style="overflow-x:auto">
          <table class="sail-table" style="width:100%">
            <thead>
              <tr>
                <th>Exhibitor Name</th>
                <th>Country</th>
                <th>Sender Account</th>
                <th>Contact &amp; Email</th>
                <th>Dispatched At</th>
                <th>Hostinger Delivery ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${contactedPartners.map((p) => `
                <tr>
                  <td><strong>${esc(p.name)}</strong></td>
                  <td>${esc(p.flag || '🌍')} ${esc(p.country)}</td>
                  <td>
                    <span class="sail-badge" style="font-size:11px;background:#EDE9FE;color:#5B21B6;border:1px solid #DDD6FE;border-radius:4px;padding:2px 6px">
                      👤 ${esc(p.sender_email || 'igor@b2b-dorogo.it')}
                    </span>
                  </td>
                  <td>${esc(p.contact_person)} &lt;${esc(p.email)}&gt;</td>
                  <td><span style="font-size:11px;color:var(--sail-muted)">${p.sent_at ? fmtDateTime(p.sent_at) : 'Recent'}</span></td>
                  <td>
                    ${p.queue_id ? `<code style="font-size:10.5px;background:#F1F5F9;padding:2px 6px;border-radius:4px">${esc(p.queue_id)}</code>` : '<span class="sail-pill ok" style="font-size:10px">Sent</span>'}
                  </td>
                  <td>
                    <div style="display:flex;gap:4px">
                      <button class="sail-btn default btn-unqueue-single" data-id="${attr(p.id)}" style="font-size:10.5px;padding:2px 6px">
                        Reset Status
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

function attachEventListeners(el, readyPartners, t1) {
  // Tab switching
  const tabQueue = el.querySelector('#tab-btn-queue');
  const tabContacted = el.querySelector('#tab-btn-contacted');
  if (tabQueue) tabQueue.onclick = () => { activeOutboxTab = 'queue'; render(el); };
  if (tabContacted) tabContacted.onclick = () => { activeOutboxTab = 'contacted'; render(el); };

  // Mailbox settings dialog
  const btnConfig = el.querySelector('#btn-configure-smtp');
  const statusPill = el.querySelector('#smtp-status-pill');
  const openConfig = () => showMailboxModal(el);
  if (btnConfig) btnConfig.onclick = openConfig;
  if (statusPill) statusPill.onclick = openConfig;

  // Select all checkbox
  const chkAll = el.querySelector('#chk-select-all');
  if (chkAll) {
    chkAll.onchange = (e) => {
      if (e.target.checked) {
        readyPartners.forEach((p) => selectedPartnerIds.add(p.id));
      } else {
        selectedPartnerIds.clear();
      }
      render(el);
    };
  }

  // Row selection checkboxes
  el.querySelectorAll('.chk-partner-select').forEach((chk) => {
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

  // Batch Volume Quick Select Chips
  el.querySelectorAll('.btn-select-qty').forEach((btn) => {
    btn.onclick = () => {
      const qty = btn.dataset.qty;
      selectedPartnerIds.clear();
      if (qty === 'all') {
        readyPartners.forEach((p) => selectedPartnerIds.add(p.id));
      } else {
        const count = parseInt(qty, 10) || 5;
        readyPartners.slice(0, count).forEach((p) => selectedPartnerIds.add(p.id));
      }
      render(el);
    };
  });

  // Return selected to review
  const btnUnqueueSelected = el.querySelector('#btn-unqueue-selected');
  if (btnUnqueueSelected) {
    btnUnqueueSelected.onclick = async () => {
      const ids = [...selectedPartnerIds];
      if (ids.length === 0) return;
      const ok = await confirmDialog('Return to Review', `Move ${ids.length} exhibitors back to safe review mode?`);
      if (!ok) return;
      for (const id of ids) {
        await updateEventPartner(id, { status: 'TO_REVIEW' });
      }
      selectedPartnerIds.clear();
      toast(`${ids.length} exhibitors moved back to To Review`);
      render(el);
    };
  }

  // Single card: Unqueue
  el.querySelectorAll('.btn-unqueue-single').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      await updateEventPartner(id, { status: 'TO_REVIEW' });
      selectedPartnerIds.delete(id);
      toast('Exhibitor moved back to To Review');
      render(el);
    };
  });

  // Single card: Copy
  el.querySelectorAll('.btn-copy-draft').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const p = readyPartners.find((x) => x.id === id);
      if (p) {
        const draft = renderEventTemplate(t1, p);
        const sig = `\n\n―\nIgor\nTrade & Event Logistics\n\nDOROGO | PRIVATE TRANSPORTATION\nWhatsApp: +39 378 094 0554\nEmail: igor@b2b-dorogo.it\nWeb: dorogo.eu`;
        const text = `To: ${p.email}\nSubject: ${draft.subject}\n\n${draft.body}${sig}`;
        navigator.clipboard?.writeText(text).then(() => {
          toast(`Draft for ${p.name} copied to clipboard (with signature)`);
        });
      }
    };
  });

  // Single card: Test Send
  el.querySelectorAll('.btn-single-test').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const p = readyPartners.find((x) => x.id === id);
      if (p) showTestSendModal(p, t1);
    };
  });

  // Single card: Edit Draft
  el.querySelectorAll('.btn-edit-draft').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const p = readyPartners.find((x) => x.id === id);
      if (p) showEditDraftModal(p, t1, el);
    };
  });

  // Single card: Send Now (Portal)
  el.querySelectorAll('.btn-single-send').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const p = readyPartners.find((x) => x.id === id);
      if (!p) return;
      await executeSingleSend(p, t1, btn, el);
    };
  });

  // Cooldown delay change listener
  el.querySelector('#select-throttle-delay')?.addEventListener('change', (e) => {
    throttleDelayMs = parseInt(e.target.value, 10) || 90000;
    render(el);
  });

  // Schedule mode change listener
  el.querySelector('#select-schedule-mode')?.addEventListener('change', (e) => {
    scheduleMode = e.target.value;
    render(el);
  });

  // Planned time change listener
  el.querySelector('#input-planned-time')?.addEventListener('change', (e) => {
    plannedSendTime = e.target.value || '15:00';
    render(el);
  });

  // Batch Send Launch
  const btnBatch = el.querySelector('#btn-batch-send');
  if (btnBatch) {
    btnBatch.onclick = () => {
      const delayMs = parseInt(el.querySelector('#select-throttle-delay')?.value, 10) || throttleDelayMs;
      const mode = el.querySelector('#select-schedule-mode')?.value || scheduleMode;
      const timeVal = el.querySelector('#input-planned-time')?.value || plannedSendTime;
      const targets = readyPartners.filter((p) => selectedPartnerIds.has(p.id));
      if (targets.length === 0) {
        toast('No exhibitors selected for batch', 'error');
        return;
      }
      showBatchDispatchModal(targets, t1, delayMs, mode, timeVal, el);
    };
  }

  // 1 Test Email Button
  const btnTestModal = el.querySelector('#btn-test-send-modal');
  if (btnTestModal) {
    btnTestModal.onclick = () => {
      const first = readyPartners[0] || { name: 'TEST.co', fair_event: 'Milano Home', contact_person: 'traciuc04' };
      showTestSendModal(first, t1);
    };
  }
}

// ---------------- Modals & Execution Engine ----------------

function showMailboxModal(rootEl) {
  const currentPass = getStoredPass();
  const dlg = dialog({
    title: '⚙️ Hostinger SMTP Configuration',
    body: `
      <div style="display:flex;flex-direction:column;gap:12px;font-size:12.5px">
        <div>
          Configure the credentials for <strong>igor@b2b-dorogo.it</strong> to dispatch event outreach directly from the portal.
        </div>
        <div style="background:#F8FAFC;padding:12px;border-radius:6px;border:1px solid #E2E8F0;display:flex;flex-direction:column;gap:6px">
          <div><strong>Sender Address:</strong> igor@b2b-dorogo.it</div>
          <div><strong>SMTP Host:</strong> smtp.hostinger.com (Port 465 SSL)</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-weight:600;font-size:12px">Hostinger Mailbox Password:</label>
          <input type="password" id="modal-smtp-pass" value="${attr(currentPass)}" placeholder="Enter mailbox password" style="height:32px;padding:0 8px;border:1px solid #CBD5E1;border-radius:6px;font-size:12px">
        </div>
        <div id="smtp-test-result" style="font-size:11.5px;padding:6px 8px;border-radius:4px;display:none"></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px">
          <button id="modal-btn-test-smtp" class="sail-btn default" style="font-size:12px;padding:6px 12px">
            Test Connection
          </button>
          <button id="modal-btn-save-smtp" class="sail-btn primary" style="font-size:12px;padding:6px 16px;background:#2563EB">
            Save &amp; Connect
          </button>
        </div>
      </div>
    `,
    onMount(el, close) {
      const passInput = el.querySelector('#modal-smtp-pass');
      const resBox = el.querySelector('#smtp-test-result');
      const btnTest = el.querySelector('#modal-btn-test-smtp');
      const btnSave = el.querySelector('#modal-btn-save-smtp');

      btnTest.onclick = async () => {
        const pass = passInput.value.trim();
        if (!pass) {
          toast('Please enter a password', 'error');
          return;
        }
        btnTest.disabled = true;
        btnTest.textContent = 'Testing...';
        resBox.style.display = 'block';
        resBox.style.background = '#EFF6FF';
        resBox.style.color = '#1D4ED8';
        resBox.textContent = 'Connecting to smtp.hostinger.com:465...';

        try {
          const j = await testEventsSmtpViaApi(pass);
          if (j.ok) {
            resBox.style.background = '#DCFCE7';
            resBox.style.color = '#166534';
            resBox.textContent = '🟢 Authentication Successful: 235 2.7.0 OK';
            toast('SMTP connection verified!');
          } else {
            resBox.style.background = '#FEE2E2';
            resBox.style.color = '#991B1B';
            resBox.textContent = `❌ ${j.error || 'Authentication Failed'}`;
          }
        } catch (e) {
          resBox.style.background = '#FEE2E2';
          resBox.style.color = '#991B1B';
          resBox.textContent = `❌ Network Error: ${e.message}`;
        } finally {
          btnTest.disabled = false;
          btnTest.textContent = 'Test Connection';
        }
      };

      btnSave.onclick = () => {
        const pass = passInput.value.trim();
        setStoredPass(pass);
        toast('Hostinger credentials saved locally');
        close();
        render(rootEl);
      };
    }
  });
}

function showTestSendModal(partner, template) {
  const draft = renderEventTemplate(template, partner);
  const dlg = dialog({
    title: '🧪 Dispatch Test Email',
    wide: true,
    body: `
      <div style="display:flex;flex-direction:column;gap:12px;font-size:12.5px">
        <div>
          Send a live test email through <code>igor@b2b-dorogo.it</code> to verify subject, body, and formatting in your actual email client.
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-weight:600;font-size:12px">Recipient Test Address:</label>
          <input type="email" id="test-recipient-email" value="traciuc04@gmail.com" style="height:32px;padding:0 8px;border:1px solid #CBD5E1;border-radius:6px;font-size:12px">
        </div>
        <div style="background:#F8FAFC;padding:10px 12px;border-radius:6px;border:1px solid #E2E8F0;display:flex;flex-direction:column;gap:6px">
          <div><strong>From:</strong> Igor &lt;igor@b2b-dorogo.it&gt;</div>
          <div><strong>Subject:</strong> ${esc(draft.subject)}</div>
        </div>
        <div style="font-size:11.5px;line-height:1.5;background:#FAFAFA;padding:10px;border-radius:6px;border:1px solid #F1F5F9;max-height:180px;overflow-y:auto">
          <div style="white-space:pre-wrap">${esc(draft.body)}</div>
          ${renderSignatureHtml()}
        </div>
        <div id="test-dispatch-status" style="font-size:11.5px;display:none;padding:6px 8px;border-radius:4px"></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px">
          <button id="modal-btn-cancel-test" class="sail-btn default" style="font-size:12px;padding:6px 12px">Cancel</button>
          <button id="modal-btn-send-test-now" class="sail-btn primary" style="font-size:12px;padding:6px 16px;background:#2563EB;font-weight:700">
            🚀 Send Test Now
          </button>
        </div>
      </div>
    `,
    onMount(el, close) {
      const emailInput = el.querySelector('#test-recipient-email');
      const statusBox = el.querySelector('#test-dispatch-status');
      const btnSend = el.querySelector('#modal-btn-send-test-now');
      const btnCancel = el.querySelector('#modal-btn-cancel-test');

      btnCancel.onclick = () => close();

      btnSend.onclick = async () => {
        const toEmail = emailInput.value.trim();
        if (!toEmail) {
          toast('Please enter a recipient email', 'error');
          return;
        }
        const pass = getStoredPass();
        if (!pass) {
          toast('Please enter Hostinger password in Mailbox Settings first', 'error');
          showMailboxModal(currentEl);
          return;
        }

        btnSend.disabled = true;
        btnSend.textContent = 'Sending...';
        statusBox.style.display = 'block';
        statusBox.style.background = '#EFF6FF';
        statusBox.style.color = '#1D4ED8';
        statusBox.textContent = `Connecting to Hostinger SMTP and sending to ${toEmail}...`;

        try {
          const j = await sendEventEmailViaApi({
            to: toEmail,
            toName: 'Test Recipient',
            subject: draft.subject,
            body: draft.body,
            hostingerPass: pass,
            fromEmail: 'igor@b2b-dorogo.it',
            fromName: 'Igor'
          });
          if (j.ok) {
            statusBox.style.background = '#DCFCE7';
            statusBox.style.color = '#166534';
            statusBox.textContent = `✅ Test Email Successfully Sent! Queue ID: ${j.queueId || 'OK'}`;
            toast('Test email delivered!');
            setTimeout(() => close(), 2500);
          } else {
            statusBox.style.background = '#FEE2E2';
            statusBox.style.color = '#991B1B';
            statusBox.textContent = `❌ Delivery Failed: ${j.error || 'Unknown error'}`;
            btnSend.disabled = false;
            btnSend.textContent = 'Retry Send';
          }
        } catch (e) {
          statusBox.style.background = '#FEE2E2';
          statusBox.style.color = '#991B1B';
          statusBox.textContent = `❌ Error: ${e.message}`;
          btnSend.disabled = false;
          btnSend.textContent = 'Retry Send';
        }
      };
    }
  });
}

function showEditDraftModal(partner, template, rootEl) {
  const draft = renderEventTemplate(template, partner);
  const dlg = dialog({
    title: `✏️ Edit Draft: ${partner.name}`,
    wide: true,
    body: `
      <div style="display:flex;flex-direction:column;gap:12px;font-size:12.5px">
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-weight:600;font-size:12px">Subject Line:</label>
          <input type="text" id="edit-draft-subject" value="${attr(draft.subject)}" style="height:32px;padding:0 8px;border:1px solid #CBD5E1;border-radius:6px;font-size:12px">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-weight:600;font-size:12px">Email Body (Whali &lt;100 words format):</label>
          <textarea id="edit-draft-body" rows="8" style="padding:8px;border:1px solid #CBD5E1;border-radius:6px;font-size:12px;font-family:inherit;line-height:1.5">${esc(draft.body)}</textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px">
          <button id="modal-btn-cancel-edit" class="sail-btn default" style="font-size:12px;padding:6px 12px">Cancel</button>
          <button id="modal-btn-save-draft" class="sail-btn primary" style="font-size:12px;padding:6px 16px;background:#2563EB">
            Save Changes
          </button>
        </div>
      </div>
    `,
    onMount(el, close) {
      el.querySelector('#modal-btn-cancel-edit').onclick = () => close();
      el.querySelector('#modal-btn-save-draft').onclick = async () => {
        const sub = el.querySelector('#edit-draft-subject').value.trim();
        const bdy = el.querySelector('#edit-draft-body').value.trim();
        await updateEventPartner(partner.id, { custom_subject: sub, custom_body: bdy });
        toast(`Draft updated for ${partner.name}`);
        close();
        render(rootEl);
      };
    }
  });
}

async function executeSingleSend(partner, template, btn, rootEl) {
  const pass = getStoredPass();
  if (!pass) {
    toast('Hostinger password needed. Please configure Mailbox Settings', 'error');
    showMailboxModal(rootEl);
    return;
  }

  const ok = await confirmDialog('Send Email Now?', `Send live email to ${partner.contact_person} at ${partner.email}?`);
  if (!ok) return;

  const draft = renderEventTemplate(template, partner);
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const senderEmail = partner.sender_email || 'igor@b2b-dorogo.it';
    const senderName = senderEmail.includes('dmitri') ? 'Dmitri' : 'Igor';
    const j = await sendEventEmailViaApi({
      to: partner.email,
      toName: partner.contact_person,
      subject: partner.custom_subject || draft.subject,
      body: partner.custom_body || draft.body,
      hostingerPass: pass,
      fromEmail: senderEmail,
      fromName: senderName
    });
    if (j.ok) {
      await updateEventPartner(partner.id, {
        status: 'CONTACTED',
        sent_at: new Date().toISOString(),
        sender_email: senderEmail,
        queue_id: j.queueId || 'OK'
      });
      selectedPartnerIds.delete(partner.id);
      toast(`Email successfully sent to ${partner.name}!`);
      render(rootEl);
    } else {
      toast(`Delivery failed: ${j.error || 'Server error'}`, 'error');
      btn.disabled = false;
      btn.textContent = origText;
    }
  } catch (e) {
    toast(`Network error: ${e.message}`, 'error');
    btn.disabled = false;
    btn.textContent = origText;
  }
}

function showBatchDispatchModal(targets, template, delayMs, mode = 'now', plannedTimeStr = '15:00', rootEl) {
  const pass = getStoredPass();
  if (!pass) {
    toast('Please set Hostinger password in Mailbox Settings first', 'error');
    showMailboxModal(rootEl);
    return;
  }

  stopRequested = false;
  isDispatching = true;
  const plannedDate = getPlannedDate(plannedTimeStr);
  const isScheduled = mode === 'planned' && plannedDate.getTime() > Date.now();

  const dlg = dialog({
    title: isScheduled ? '🕒 Scheduled Batch Sending Engine' : '🚀 Live Batch Sending Engine',
    wide: true,
    body: `
      <div style="display:flex;flex-direction:column;gap:14px;font-size:12.5px">
        <div style="background:#F8FAFC;padding:10px 14px;border-radius:6px;border:1px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            Batch: <strong>${targets.length} emails</strong> via Hostinger SMTP (<code>igor@b2b-dorogo.it</code>).<br>
            Anti-spam delay: <strong>${Math.round(delayMs / 1000)}s</strong> between deliveries.
          </div>
          <div style="text-align:right">
            ${isScheduled ? `
              <span class="sail-pill info" style="font-size:11.5px;font-weight:700;background:#DBEAFE;color:#1E40AF">
                🕒 Planned Start: ${formatTimeSlot(plannedDate, 0, delayMs)}
              </span>
            ` : `
              <span class="sail-pill success" style="font-size:11.5px;font-weight:700;background:#D1FAE5;color:#065F46">
                ⚡ Immediate Dispatch Mode
              </span>
            `}
          </div>
        </div>

        <!-- Progress Bar -->
        <div style="display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;justify-content:space-between;font-size:11.5px;font-weight:600">
            <span id="batch-progress-label">${isScheduled ? `Armed: Waiting for ${formatTimeSlot(plannedDate, 0, delayMs)}...` : 'Preparing dispatch...'}</span>
            <span id="batch-progress-pct">0%</span>
          </div>
          <div style="background:#E2E8F0;height:10px;border-radius:5px;overflow:hidden">
            <div id="batch-progress-bar" style="background:#2563EB;height:100%;width:0%;transition:width 0.3s ease"></div>
          </div>
        </div>

        <!-- Real-time Console Log -->
        <div id="batch-console-log" style="background:#0F172A;color:#E2E8F0;font-family:monospace;font-size:11px;padding:12px;border-radius:6px;height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:4px">
          <div>[INFO] Initialized batch for ${targets.length} exhibitors...</div>
          ${isScheduled ? `<div>[SCHEDULE] Target start: ${plannedDate.toLocaleTimeString()} (${getCountdownSummary(plannedDate)})</div>` : ''}
        </div>

        <!-- Modal Controls -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;flex-wrap:wrap;gap:8px">
          <span id="batch-status-sub" style="font-size:11.5px;color:var(--sail-muted)">Keep this tab open while scheduled dispatch is armed.</span>
          <div style="display:flex;gap:8px;align-items:center">
            <button id="modal-btn-skip-wait" class="sail-btn primary" style="font-size:11.5px;padding:5px 12px;background:#2563EB;${isScheduled ? '' : 'display:none'}">
              ⚡ Launch Now (Skip Countdown)
            </button>
            <button id="modal-btn-skip-cooldown" class="sail-btn default" style="font-size:11.5px;padding:5px 12px;color:#2563EB;display:none">
              ⏩ Skip Cooldown (Send Next)
            </button>
            <button id="modal-btn-stop-batch" class="sail-btn default" style="font-size:12px;padding:6px 12px;color:#DC2626">
              ⏹️ Stop Batch
            </button>
            <button id="modal-btn-done-batch" class="sail-btn primary" style="font-size:12px;padding:6px 16px;display:none;background:#059669">
              Done
            </button>
          </div>
        </div>
      </div>
    `,
    onMount(el, close) {
      const pLabel = el.querySelector('#batch-progress-label');
      const pPct = el.querySelector('#batch-progress-pct');
      const pBar = el.querySelector('#batch-progress-bar');
      const logBox = el.querySelector('#batch-console-log');
      const btnStop = el.querySelector('#modal-btn-stop-batch');
      const btnDone = el.querySelector('#modal-btn-done-batch');
      const btnSkipWait = el.querySelector('#modal-btn-skip-wait');
      const btnSkipCooldown = el.querySelector('#modal-btn-skip-cooldown');

      let skipWaitTriggered = false;
      let skipCooldownTriggered = false;

      function appendLog(msg, color = '#E2E8F0') {
        const time = new Date().toLocaleTimeString();
        const row = document.createElement('div');
        row.style.color = color;
        row.textContent = `[${time}] ${msg}`;
        logBox.appendChild(row);
        logBox.scrollTop = logBox.scrollHeight;
      }

      btnSkipWait.onclick = () => {
        skipWaitTriggered = true;
        btnSkipWait.style.display = 'none';
        appendLog('⚡ Operator skipped countdown. Starting immediate dispatch...', '#3B82F6');
      };

      btnSkipCooldown.onclick = () => {
        skipCooldownTriggered = true;
        appendLog('⏩ Operator skipped cooldown delay.', '#3B82F6');
      };

      btnStop.onclick = () => {
        stopRequested = true;
        btnStop.disabled = true;
        btnStop.textContent = 'Stopping...';
        appendLog('⏹️ Stopping requested by user. Waiting for current dispatch to finish...', '#F59E0B');
      };

      btnDone.onclick = () => {
        close();
        render(rootEl);
      };

      // Launch Async Dispatch Loop
      (async () => {
        let sentCount = 0;
        let failCount = 0;

        // Phase 1: Pre-dispatch Scheduled Countdown (if planned time is in future)
        if (isScheduled) {
          appendLog(`🕒 Scheduled countdown armed for ${formatTimeSlot(plannedDate, 0, delayMs)}...`, '#60A5FA');
          while (Date.now() < plannedDate.getTime() && !skipWaitTriggered && !stopRequested) {
            const remainSec = Math.ceil((plannedDate.getTime() - Date.now()) / 1000);
            const h = Math.floor(remainSec / 3600);
            const m = Math.floor((remainSec % 3600) / 60);
            const s = remainSec % 60;
            const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            pLabel.textContent = `⏳ Scheduled start at ${plannedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (starts in ${timeStr})...`;
            await new Promise((r) => setTimeout(r, 1000));
          }
          btnSkipWait.style.display = 'none';
          if (!stopRequested) {
            appendLog(`🚀 Planned start time reached (${new Date().toLocaleTimeString()}). Commencing staggered dispatch!`, '#10B981');
          }
        }

        // Phase 2: Dispatch Loop
        for (let i = 0; i < targets.length; i++) {
          if (stopRequested) {
            appendLog('Batch stopped by operator.', '#F59E0B');
            break;
          }

          const partner = targets[i];
          const draft = renderEventTemplate(template, partner);
          const currentNum = i + 1;
          const totalNum = targets.length;

          pLabel.textContent = `Sending ${currentNum} of ${totalNum}: ${partner.name}...`;
          pPct.textContent = `${Math.round(((currentNum - 1) / totalNum) * 100)}%`;
          pBar.style.width = `${((currentNum - 1) / totalNum) * 100}%`;

          appendLog(`🛫 [${currentNum}/${totalNum}] Dispatching to ${partner.contact_person} (${partner.name}) <${partner.email}>...`);

          try {
            const senderEmail = partner.sender_email || 'igor@b2b-dorogo.it';
            const senderName = senderEmail.includes('dmitri') ? 'Dmitri' : 'Igor';
            const j = await sendEventEmailViaApi({
              to: partner.email,
              toName: partner.contact_person,
              subject: partner.custom_subject || draft.subject,
              body: partner.custom_body || draft.body,
              hostingerPass: pass,
              fromEmail: senderEmail,
              fromName: senderName
            });

            if (j.ok) {
              sentCount++;
              appendLog(`✅ Delivered to ${partner.name}! Queue: ${j.queueId || 'OK'}`, '#10B981');
              await updateEventPartner(partner.id, {
                status: 'CONTACTED',
                sent_at: new Date().toISOString(),
                sender_email: senderEmail,
                queue_id: j.queueId || 'OK'
              });
              selectedPartnerIds.delete(partner.id);
            } else {
              failCount++;
              appendLog(`❌ Failed for ${partner.name}: ${j.error || 'Server error'}`, '#EF4444');
            }
          } catch (e) {
            failCount++;
            appendLog(`❌ Network error for ${partner.name}: ${e.message}`, '#EF4444');
          }

          // Anti-spam throttling cooldown between sends with live countdown
          if (i < targets.length - 1 && !stopRequested) {
            skipCooldownTriggered = false;
            btnSkipCooldown.style.display = 'inline-block';
            const cooldownSecs = Math.round(delayMs / 1000);
            const nextTarget = targets[i + 1];
            appendLog(`⏳ Anti-spam cooldown: waiting ${cooldownSecs}s before next send (Next: ${nextTarget.name})...`, '#94A3B8');

            for (let c = cooldownSecs; c > 0; c--) {
              if (stopRequested || skipCooldownTriggered) break;
              pLabel.textContent = `Cooling down (${c}s remaining before next send: ${nextTarget.name})...`;
              await new Promise((res) => setTimeout(res, 1000));
            }
            btnSkipCooldown.style.display = 'none';
          }
        }

        pLabel.textContent = `Batch Complete! (${sentCount} sent, ${failCount} failed)`;
        pPct.textContent = '100%';
        pBar.style.width = '100%';
        pBar.style.background = failCount > 0 ? '#F59E0B' : '#10B981';

        btnStop.style.display = 'none';
        btnSkipWait.style.display = 'none';
        btnSkipCooldown.style.display = 'none';
        btnDone.style.display = 'inline-block';
        appendLog(`🎉 Batch run finished: ${sentCount} successfully delivered, ${failCount} errors.`, '#10B981');
        toast(`Batch finished: ${sentCount} delivered!`);
        isDispatching = false;
      })();
    }
  });
}
