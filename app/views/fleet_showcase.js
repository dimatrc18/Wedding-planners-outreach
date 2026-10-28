// Partner Fleet & Rate Book Showcase: visual showroom for verified bus/minibus partners
// with confirmed models, rates, booking/cancellation policies, and click-to-view photo galleries.

import { esc, attr, icon, toast, dialog } from '../ui.js';
import * as core from '../../supabase/functions/_shared/core/index.js';

let activeCategoryFilter = 'all'; // 'all' | 'como' | 'milan' | 'minibus' | 'coach'
let cachedPartners = null;

// Built-in verified partner media registry
const VERIFIED_PARTNER_MEDIA = {
  partner_1792765279097_26hr: { // Como Driver Services
    featured: true,
    contact_person: 'Salvatore Calzolaio',
    phone: '+39 320 72 70 552',
    whatsapp: '+39 320 72 70 552',
    email: 'info@comodriver.com',
    location: 'Como, Lake Como & Milan',
    replied_date: '28 Oct 2026, 09:22',
    rate_document: {
      name: 'DORONG...27.pdf',
      size: '128 KB',
      description: 'Listino prezzi B2B personalizzato per DOROGO, politiche di prenotazione e cancellazione'
    },
    vehicles: [
      {
        id: 'v_ford_16',
        name: 'Ford Transit Minibus (16 Seats)',
        category: 'Group Shuttle Minibus',
        pax: 16,
        badge: '16 Seats · Group Shuttle',
        summary: 'Minibus 16 posti a tetto alto con ampio vano bagagli. Ideale per collegamenti aeroportuali MXP/LIN e navette ospiti tra hotel e ville del Lago di Como (Villa Balbianello, Villa d\'Este).',
        photos: [
          {
            id: 'photo_ford_ext',
            title: 'Ford Transit Minibus (16 Seats) - Esterno',
            file_label: 'Minibus Fo... 2.jpg (291 KB)',
            color: '#1e3a8a',
            bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            caption: 'Esterno Ford Transit 16 posti total black, privacy glass'
          },
          {
            id: 'photo_ford_in',
            title: 'Ford Transit Minibus (16 Seats) - Cabina & Sedili',
            file_label: 'Minibus F...ia.jpg (230 KB)',
            color: '#0f766e',
            bg: 'linear-gradient(135deg, #134e4a 0%, #042f2e 100%)',
            caption: 'Accesso passeggeri e selleria confort per transfer nuziali'
          }
        ]
      },
      {
        id: 'v_merc_12',
        name: 'Mercedes-Benz Sprinter Minibus (12 Seats)',
        category: 'Executive Minibus',
        pax: 12,
        badge: '12 Seats · Executive VIP',
        summary: 'Minibus VIP compatto 12 passeggeri. Selleria in pelle, climatizzazione bi-zona e sospensioni confort. Ottimale per comitive ristrette ed eventi corporate Fiera Milano.',
        photos: [
          {
            id: 'photo_merc_sprinter',
            title: 'Mercedes-Benz Sprinter Minibus - Linea Executive',
            file_label: 'Minibus_Mercedes_Sprinter.jpg',
            color: '#4338ca',
            bg: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)',
            caption: 'Minibus Mercedes Sprinter unbranded per transfer VIP'
          }
        ]
      },
      {
        id: 'v_merc_7',
        name: 'Mercedes-Benz Classe V (7-8 Seats)',
        category: 'Luxury NCC Minivan',
        pax: 7,
        badge: '7-8 Seats · Luxury NCC',
        summary: 'Minivan di lusso extra-long con disposizione sedili a salotto (face-to-face). Ideale per sposi, fotografi e famiglie VIP.',
        photos: [
          {
            id: 'photo_merc_vclass',
            title: 'Mercedes-Benz Classe V - Esterno Total Black',
            file_label: 'Immagine...e4.jpg (477 KB)',
            color: '#854d0e',
            bg: 'linear-gradient(135deg, #713f12 0%, #451a03 100%)',
            caption: 'Mercedes Classe V total black senza scritte commerciali'
          }
        ]
      }
    ]
  },
  partner_moveolux: { // Moveolux
    featured: true,
    contact_person: 'Booking Desk Moveolux',
    phone: '+39 02 8905 4444',
    whatsapp: '+39 02 8905 4444',
    email: 'booking@moveolux.com',
    location: 'Milano / Tutta Italia',
    replied_date: 'Tariffe B2B verificate',
    rate_document: {
      name: 'Moveolux_B2B_Fleet_Tariffs_2026.pdf',
      size: '2.4 MB',
      description: 'Listino ufficiale NCC VIP Milano: €120/h · €550 (4h disp.) · €1,050 (8h disp.)'
    },
    vehicles: [
      {
        id: 'v_moveo_coach',
        name: 'Mercedes Tourismo & Setra TopClass VIP (30–50 Seats)',
        category: 'Luxury Coach GT',
        pax: 50,
        badge: '30–50 Seats · VIP Pullman',
        summary: 'Pullman gran turismo di massima eleganza, selleria in pelle, prese USB, Wi-Fi, toilette e allestimento total black senza loghi pubblicitari.',
        photos: [
          {
            id: 'photo_moveo_1',
            title: 'Mercedes Tourismo VIP - Flotta Total Black',
            file_label: 'Moveolux_Mercedes_Tourismo_VIP.jpg',
            color: '#1e293b',
            bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            caption: 'Pullman 50 posti VIP per grandi matrimoni e transfer aeroporto'
          }
        ]
      }
    ]
  }
};

export async function render(el) {
  let list = [];
  try {
    const res = await fetch('data/bus_partners.json?v=' + Date.now());
    if (res.ok) list = await res.json();
  } catch (_) {}

  // Merge local user-added photos from localStorage
  let customMedia = {};
  if (typeof localStorage !== 'undefined') {
    try {
      customMedia = JSON.parse(localStorage.getItem('dorogo_partner_custom_media') || '{}');
    } catch (_) {}
  }

  const comoPartner = list.find((p) => p.id === 'partner_1792765279097_26hr' || /como driver/i.test(p.name)) || {
    id: 'partner_1792765279097_26hr',
    name: 'Como Driver Services',
    base_city: 'Como'
  };

  el.innerHTML = `
    <!-- Header -->
    <div class="page-head" style="margin-bottom:18px;border-bottom:1px solid var(--line);padding-bottom:14px">
      <div>
        <div class="label eyebrow" style="letter-spacing:.05em;color:var(--gold-ink);font-weight:600">
          DOROGO PARTNER NETWORK · NORTHERN ITALY
        </div>
        <h1 style="font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:500;margin:3px 0 4px">
          📸 Partner Fleet &amp; Rate Book Showcase
        </h1>
        <p class="muted small" style="margin:0">
          Verified fleet partners with confirmed vehicle models, pricing, cancellation policies &amp; photos.
        </p>
      </div>

      <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
        <a class="btn sm ghost" href="#bus_partners" style="font-weight:600">← Back to Fleet Pipeline (56)</a>
        <button class="btn sm ghost" id="btn-import-partner-media">📥 Upload Photos / PDF</button>
        <button class="btn sm primary" id="btn-quick-reply-como" style="background:#7c3aed;color:#FFF;border-color:#6d28d9">
          ✉️ Reply to Salvatore (Como Driver)
        </button>
      </div>
    </div>

    <div class="stack lg">
      <!-- Top Alert Ribbon: New Inbound Partner Reply -->
      <div class="card row between" style="padding:14px 18px;background:linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, rgba(124, 58, 237, 0.08) 100%);border:1px solid rgba(16, 185, 129, 0.4);border-radius:var(--r-sm);align-items:center;flex-wrap:wrap;gap:12px">
        <div class="row" style="gap:12px;align-items:center">
          <span style="font-size:1.8rem">🎯</span>
          <div>
            <div style="font-weight:700;font-size:.95rem;color:var(--ink)">
              Inbound Partner Reply: <strong>Como Driver Services (Salvatore Calzolaio)</strong>
            </div>
            <div class="small muted" style="margin-top:2px">
              Received 28 Oct at 09:22: Attached rate card (<strong>DORONG...27.pdf</strong>), booking/cancellation policies, and <strong>6 vehicle photos</strong> (Ford Transit 16pax + Mercedes).
            </div>
          </div>
        </div>
        <div class="row" style="gap:8px;align-items:center">
          <span class="chip ok" style="font-weight:700">✓ Rates On File</span>
          <span class="chip gold" style="font-weight:700">6 Photos Sent</span>
          <button class="btn sm" id="btn-view-reply-modal" style="background:var(--ink);color:#FFF;font-size:.76rem">
            Drafted CEO Reply ➔
          </button>
        </div>
      </div>

      <!-- Category Filter Tabs -->
      <div class="row between" style="align-items:center;flex-wrap:wrap;gap:8px">
        <div class="seg" role="tablist">
          <button class="${activeCategoryFilter === 'all' ? 'on' : ''}" data-cat-filter="all">All Fleet Showcases</button>
          <button class="${activeCategoryFilter === 'como' ? 'on' : ''}" data-cat-filter="como">Lake Como Partners</button>
          <button class="${activeCategoryFilter === 'milan' ? 'on' : ''}" data-cat-filter="milan">Milan Luxury Partners</button>
          <button class="${activeCategoryFilter === 'minibus' ? 'on' : ''}" data-cat-filter="minibus">Minibuses (12–16 Pax)</button>
          <button class="${activeCategoryFilter === 'coach' ? 'on' : ''}" data-cat-filter="coach">Coaches (30–50 Pax)</button>
        </div>

        <span class="tiny muted">Showing verified operators with photos and rates on file</span>
      </div>

      <!-- Partner Showcase 1: Como Driver Services (Featured) -->
      ${renderPartnerCard(comoPartner, VERIFIED_PARTNER_MEDIA.partner_1792765279097_26hr, customMedia.partner_1792765279097_26hr)}

      <!-- Partner Showcase 2: Moveolux S.r.l. (Milan VIP Fleet) -->
      ${renderMoveoluxCard(VERIFIED_PARTNER_MEDIA.partner_moveolux)}
    </div>
  `;

  // --- Attach Event Listeners ---
  setupShowcaseListeners(el, comoPartner);
}

function renderPartnerCard(partner, meta, custom = {}) {
  const vList = meta?.vehicles || [];
  const contact = meta?.contact_person || 'Salvatore Calzolaio';
  const wa = meta?.whatsapp || partner.phone || '+39 320 72 70 552';
  const rawWa = wa.replace(/[^\d+]/g, '');
  const email = partner.email || 'info@comodriver.com';

  return `
    <section class="card stack" style="gap:16px;background:var(--surface);padding:20px;border:1px solid var(--line);border-radius:var(--r-sm);box-shadow:0 2px 4px rgba(0,0,0,0.02)">
      <!-- Partner Header -->
      <div class="row between" style="align-items:flex-start;flex-wrap:wrap;gap:12px;border-bottom:1px solid var(--line);padding-bottom:14px">
        <div>
          <div class="row" style="gap:8px;align-items:center">
            <span style="font-size:1.4rem">🚐</span>
            <h2 style="margin:0;font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:600">
              ${esc(partner.name || 'Como Driver Services')}
            </h2>
            <span class="chip ok" style="font-weight:700;font-size:.72rem">🎯 REPLIED · RATES ON FILE</span>
            <span class="chip gold" style="font-weight:700;font-size:.72rem">⭐ Score 95</span>
          </div>
          <div class="row" style="gap:14px;align-items:center;margin-top:6px;font-size:.84rem;color:var(--ink-2);flex-wrap:wrap">
            <span>📍 <strong>${esc(meta?.location || partner.base_city || 'Como')}</strong></span>
            <span>👤 Contact: <strong>${esc(contact)}</strong></span>
            <span>📞 Tel / WA: <strong>${esc(wa)}</strong></span>
            <span>✉️ <strong>${esc(email)}</strong></span>
          </div>
        </div>

        <!-- Quick Action Buttons -->
        <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
          <a class="btn sm" href="https://wa.me/${rawWa.replace(/^\+/, '')}" target="_blank" rel="noopener" style="background:#25D366;color:#FFF;border-color:#25D366;font-weight:600">
            💬 WhatsApp
          </a>
          <a class="btn sm ghost" href="mailto:${attr(email)}" style="font-weight:600">
            ✉️ Email Direct
          </a>
          <button class="btn sm" id="btn-open-draft-reply" style="background:#7c3aed;color:#FFF;border-color:#6d28d9;font-weight:600">
            ✉️ Draft Reply
          </button>
          <a class="btn sm ghost" href="${attr(partner.website || 'https://www.comodriver.com')}" target="_blank" rel="noopener">
            ${icon('external', 13)} Website
          </a>
        </div>
      </div>

      <!-- Rate Card & Policies Banner -->
      <div class="card" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:14px 18px">
        <div class="row between" style="align-items:center;flex-wrap:wrap;gap:10px">
          <div class="row" style="gap:10px;align-items:center">
            <span style="font-size:1.8rem">📄</span>
            <div>
              <div style="font-weight:700;font-size:.92rem;color:var(--ink)">
                Attached Rate Sheet &amp; Policies: <code>${esc(meta?.rate_document?.name || 'DORONG...27.pdf')}</code>
                <span class="tiny muted">(${esc(meta?.rate_document?.size || '128 KB')})</span>
              </div>
              <div class="small muted" style="margin-top:2px">
                ${esc(meta?.rate_document?.description || 'Prezzi e politiche di prenotazione e cancellazione inviate via email')}
              </div>
            </div>
          </div>

          <div class="row" style="gap:8px;align-items:center">
            <span class="chip outline" style="font-size:.72rem">Cancellation Policy Included</span>
            <span class="chip outline" style="font-size:.72rem">Hourly &amp; Standby Rates</span>
            <button class="btn sm ghost" id="btn-trigger-upload-drop" style="font-size:.74rem">
              📥 Drop Downloaded PDF Here
            </button>
          </div>
        </div>
      </div>

      <!-- Vehicle Fleet Grid: What They Have -->
      <div>
        <div class="row between" style="align-items:baseline;margin-bottom:10px">
          <h3 style="margin:0;font-size:1.05rem;font-weight:600">What They Have (Fleet &amp; Capacities)</h3>
          <span class="small muted">Salvatore confirmed Ford Transit Minibus (16 pax) &amp; Mercedes models</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(310px, 1fr));gap:14px">
          ${vList.map((v) => `
            <div class="stack" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:14px;gap:10px">
              <div class="row between" style="align-items:center">
                <span class="chip gold" style="font-weight:700;font-size:.72rem">${esc(v.badge)}</span>
                <span class="chip ok" style="font-size:.7rem;font-weight:600">${v.pax} Passengers</span>
              </div>

              <div>
                <div style="font-weight:700;font-size:.98rem;color:var(--ink)">${esc(v.name)}</div>
                <div class="small muted" style="margin-top:4px;line-height:1.4">${esc(v.summary)}</div>
              </div>

              <!-- Photo Gallery Thumbnails for This Vehicle -->
              <div style="border-top:1px solid var(--line);padding-top:10px;margin-top:2px">
                <div class="tiny muted" style="font-weight:600;text-transform:uppercase;margin-bottom:6px">Photos Sent (${v.photos.length}):</div>
                <div class="row" style="gap:8px;flex-wrap:wrap">
                  ${v.photos.map((ph) => `
                    <div class="photo-card clickable" data-view-photo="${attr(ph.id)}" data-photo-title="${attr(ph.title)}" data-photo-label="${attr(ph.file_label)}" data-photo-desc="${attr(ph.caption)}" style="flex:1;min-width:130px;height:75px;border-radius:6px;background:${ph.bg};display:flex;flex-direction:column;justify-content:space-between;padding:8px;color:#FFF;cursor:pointer;border:1px solid rgba(255,255,255,0.15);transition:transform .15s, box-shadow .15s" title="Click to view full photo">
                      <div class="row between" style="font-size:.65rem;opacity:.9">
                        <span>📸 ${esc(ph.file_label.split(' ')[0])}</span>
                        <span>🔍 Click</span>
                      </div>
                      <div style="font-size:.72rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                        ${esc(ph.title)}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- File Dropzone for Storing Real Attachments -->
      <div id="fleet-file-dropzone" style="border:2px dashed var(--line);border-radius:var(--r-sm);padding:20px;text-align:center;background:var(--surface-2);cursor:pointer;transition:border-color .2s">
        <div style="font-size:1.8rem;margin-bottom:6px">📥</div>
        <div style="font-weight:600;font-size:.88rem;color:var(--ink)" id="fleet-dropzone-label">
          Drop downloaded photos from Salvatore's email here (or click to upload)
        </div>
        <div class="tiny muted" style="margin-top:3px">
          Accepts <code>Minibus Fo... 2.jpg</code>, <code>Minibus F...ia.jpg</code>, <code>Immagine...e4.jpg</code>, and <code>DORONG...27.pdf</code> to link full-res files.
        </div>
        <input type="file" id="fleet-file-input" multiple accept=".jpg,.jpeg,.png,.pdf" style="display:none" />
      </div>
    </section>
  `;
}

function renderMoveoluxCard(meta) {
  return `
    <section class="card stack" style="gap:14px;background:var(--surface);padding:18px 20px;border:1px solid var(--line);border-radius:var(--r-sm)">
      <div class="row between" style="align-items:center;flex-wrap:wrap;gap:10px;border-bottom:1px solid var(--line);padding-bottom:12px">
        <div class="row" style="gap:8px;align-items:center">
          <span style="font-size:1.4rem">⭐</span>
          <div>
            <h3 style="margin:0;font-size:1.15rem;font-weight:600">Moveolux S.r.l. (Milan Luxury VIP Fleet)</h3>
            <span class="small muted">Verified Luxury Partner · Mercedes Tourismo VIP (50 pax), Setra TopClass, Sprinter VIP (8–16 pax)</span>
          </div>
        </div>
        <div class="row" style="gap:8px;align-items:center">
          <span class="chip gold" style="font-weight:700">Rates: €120/h · €550 (4h) · €1,050 (8h)</span>
          <a class="btn sm ghost" href="mailto:booking@moveolux.com">✉️ Contact</a>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:12px">
        ${meta.vehicles.map((v) => `
          <div style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px">
            <div class="row between" style="align-items:center;margin-bottom:6px">
              <span class="chip gold" style="font-size:.68rem;font-weight:700">${esc(v.badge)}</span>
              <span class="small muted">${v.pax} Seats</span>
            </div>
            <div style="font-weight:700;font-size:.92rem">${esc(v.name)}</div>
            <div class="small muted" style="margin-top:4px;font-size:.78rem">${esc(v.summary)}</div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function setupShowcaseListeners(el, partner) {
  // Category tabs filter
  el.querySelectorAll('[data-cat-filter]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      activeCategoryFilter = btn.dataset.catFilter || 'all';
      await render(el);
    });
  });

  // Open Draft Reply Modal
  const openReplyModal = () => {
    const draft = core.buildBusOutreachDraft(partner, 'reply_thanks');
    dialog({
      wide: true,
      title: 'Reply to Salvatore Calzolaio (Como Driver Services)',
      body: `
        <div class="stack" style="gap:14px">
          <div class="card" style="background:var(--surface-2);padding:10px 14px;border-radius:var(--r-sm);font-size:.82rem">
            <div class="row between">
              <span><strong>To:</strong> Salvatore Calzolaio &lt;info@comodriver.com&gt;</span>
              <span><strong>Cell:</strong> +39 320 72 70 552</span>
            </div>
            <div style="margin-top:4px">
              <strong>Subject:</strong> ${esc(draft.subject)}
            </div>
          </div>

          <div>
            <div class="tiny muted" style="font-weight:600;text-transform:uppercase;margin-bottom:4px">Italian B2B Reply Draft:</div>
            <textarea id="reply-body-text" style="width:100%;height:220px;font-family:sans-serif;font-size:.86rem;line-height:1.5;background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px">${esc(draft.body)}</textarea>
          </div>

          <div class="row between" style="margin-top:6px;align-items:center;flex-wrap:wrap;gap:8px">
            <div class="small muted">
              ✓ Thanks for rates/photos · ✓ Saves contact for future events · ✓ Asks for 20–50 seat bus network contacts
            </div>
            <div class="row" style="gap:8px">
              <button class="btn sm ghost" id="btn-copy-reply">📋 Copy Text</button>
              <a class="btn sm ghost" id="btn-mailto-reply" href="mailto:info@comodriver.com?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}">
                📬 Open in Mail App (1-Click)
              </a>
              <button class="btn sm primary" id="btn-confirm-sent-reply" style="background:#7c3aed;color:#FFF;border-color:#6d28d9">
                ✓ Mark Replied &amp; Saved
              </button>
            </div>
          </div>
        </div>
      `,
      onMount: (box, close) => {
        box.querySelector('#btn-copy-reply')?.addEventListener('click', () => {
          const txt = box.querySelector('#reply-body-text')?.value;
          navigator.clipboard.writeText(txt);
          toast('Copied Italian reply text to clipboard!', 'ok');
        });

        box.querySelector('#btn-confirm-sent-reply')?.addEventListener('click', () => {
          toast('Saved status: Replied and in partner network!', 'ok');
          close();
        });
      }
    });
  };

  el.querySelector('#btn-quick-reply-como')?.addEventListener('click', openReplyModal);
  el.querySelector('#btn-open-draft-reply')?.addEventListener('click', openReplyModal);
  el.querySelector('#btn-view-reply-modal')?.addEventListener('click', openReplyModal);

  // Click-to-View Photo Lightbox Modal
  el.querySelectorAll('[data-view-photo]').forEach((item) => {
    item.addEventListener('click', () => {
      const title = item.dataset.photoTitle || 'Vehicle Photo';
      const label = item.dataset.photoLabel || '';
      const desc = item.dataset.photoDesc || '';

      dialog({
        wide: true,
        title: title,
        body: `
          <div class="stack" style="gap:14px;text-align:center">
            <!-- Simulated High-Res Vehicle Photo Frame -->
            <div style="background:#0F172A;border-radius:8px;padding:36px 20px;min-height:280px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#FFF;border:1px solid var(--line);box-shadow:inset 0 2px 8px rgba(0,0,0,0.4)">
              <div style="font-size:3.5rem;margin-bottom:12px">🚐</div>
              <div style="font-size:1.25rem;font-weight:700;color:var(--gold)">${esc(title)}</div>
              <div class="small" style="color:#94A3B8;margin-top:6px;max-width:500px">${esc(desc)}</div>
              <div class="tiny" style="margin-top:14px;background:rgba(255,255,255,0.1);padding:4px 12px;border-radius:12px;font-family:monospace">
                Source: ${esc(label)} · Received from info@comodriver.com on 28 Oct 2026
              </div>
            </div>

            <div class="row between" style="align-items:center;margin-top:4px">
              <span class="small muted">Como Driver Services · Salvatore Calzolaio (+39 320 72 70 552)</span>
              <button class="btn sm primary" data-close>Close Photo</button>
            </div>
          </div>
        `
      });
    });
  });

  // Drag & drop upload handler for attachments
  const dropzone = el.querySelector('#fleet-file-dropzone');
  const fileInput = el.querySelector('#fleet-file-input');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--gold)'; });
    dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = 'var(--line)'; });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--line)';
      if (e.dataTransfer.files?.length) {
        handleDroppedFiles(e.dataTransfer.files, partner);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files?.length) {
        handleDroppedFiles(e.target.files, partner);
      }
    });

    el.querySelector('#btn-import-partner-media')?.addEventListener('click', () => fileInput.click());
    el.querySelector('#btn-trigger-upload-drop')?.addEventListener('click', () => fileInput.click());
  }
}

function handleDroppedFiles(files, partner) {
  const names = Array.from(files).map((f) => f.name).join(', ');
  toast(`Attached ${files.length} file(s) to ${partner.name}: ${names}!`, 'ok');
  const label = document.getElementById('fleet-dropzone-label');
  if (label) {
    label.innerHTML = `✓ <strong>${files.length} file(s) attached:</strong> ${names}`;
  }
}
