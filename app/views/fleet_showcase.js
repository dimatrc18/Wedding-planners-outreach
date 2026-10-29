// Partner Fleet & Rate Ledger — Stripe Sail Design System
// Displays verified partner vehicles, calculated transfer & standby rates from PDF rate cards,
// Luxury vs. Standard classification, and real vehicle inspection photos.

import { esc, attr, toast, dialog } from '../ui.js';
import * as core from '../../supabase/functions/_shared/core/index.js';

let pricingMode = 'net'; // 'net' | 'vat' (+10%) | 'night' (+20% net) | 'night_vat' (+20% + 10% VAT)
let activeTab = 'all'; // 'all' | 'confirmed' | 'luxury' | 'standard' | 'pending'
let searchQuery = '';

// Calc state for the interactive Stripe Quote Calculator
let calcState = {
  vehicleId: 'como_sprinter_12',
  serviceKey: 'dispo_8h',
  extraHours: 0,
  extraWaitHours: 0,
  nightWindow: false,
  includeVat: false,
  clientMarkupPct: 25
};

const PDF_COMO_DRIVER = 'assets/partner_fleet/como_driver/como_driver_rates_2027.pdf';

export const FLEET_LEDGER_ROWS = [
  {
    id: 'como_sprinter_12',
    partnerId: 'partner_1792765279097_26hr',
    vehicleModel: 'Mercedes-Benz Sprinter 12',
    coachbuilder: 'Tomassini Style · Executive Conversion',
    pax: 12,
    tier: 'luxury',
    tierLabel: 'Luxury VIP',
    tierSpec: 'Total Black · Unbranded · Two-tone leather · Privacy curtains',
    partnerName: 'Como Driver Services',
    baseCity: 'Lurate Caccivio (Como)',
    contactPerson: 'Salvatore Calzolaio',
    phone: '+39 320 727 0552',
    email: 'info@comodriver.com',
    website: 'https://www.comodriver.com',
    status: 'confirmed',
    statusLabel: 'Rates & 4 photos verified',
    repliedAt: '28 Oct 2026 · 09:22',
    ratePdf: PDF_COMO_DRIVER,
    ratePdfName: 'DORONGO 2027.pdf (2 pages)',
    transfers: {
      mxp_como: { label: 'MXP ⇄ Como', net: 350, km: 48, garageKm: 78 },
      milano_como: { label: 'Milano Centro ⇄ Como', net: 400, km: 52, garageKm: 95 },
      lin_como: { label: 'LIN ⇄ Como', net: 400, km: 62, garageKm: 115 },
      bgy_como: { label: 'BGY ⇄ Como', net: 450, km: 92, garageKm: 175 },
      tremezzo: { label: 'Como ⇄ Tremezzo', net: 300, km: 30, garageKm: 68 },
      bellagio: { label: 'Como ⇄ Bellagio', net: 300, km: 32, garageKm: 72 }
    },
    kmFormulaNote: 'Formula: €210 base + ~€2.80/km (Standby: €4.50–€5.00/km)',
    standby: {
      dispo_4h: { label: '4h (incl. 100 km)', net: 500, hourlyEq: 125 },
      dispo_8h: { label: '8h (incl. 200 km)', net: 900, hourlyEq: 112.5 },
      extra_hour: { label: 'Extra Hour', net: 100 },
      extra_wait: { label: 'Wait >60m Airport', net: 80 }
    },
    terms: {
      payment: 'Prepayment upon invoice (vista fattura)',
      vat: '10% VAT excluded',
      included: 'Fuel, highway tolls, parking, 60m airport wait, 20m hotel/station wait',
      nightSurcharge: '+20% between 22:00 and 06:00',
      cancellation: '14–28 days: 50% refund · <14 days: no refund (100% penalty)'
    },
    photos: [
      {
        id: 'sprinter_ext_1',
        src: 'assets/partner_fleet/como_driver/sprinter_12_ext_1.jpg',
        file: 'Esterno Sprinter .jpeg',
        title: 'Exterior — Total Black Tomassini Style',
        caption: 'Unbranded total-black Mercedes-Benz Sprinter 12-seater with tinted privacy glass.'
      },
      {
        id: 'sprinter_int_1',
        src: 'assets/partner_fleet/como_driver/sprinter_12_int_1.jpg',
        file: 'Interno Sprinter 01.jpeg',
        title: 'Interior Cabin — Entry & Leather Seating',
        caption: 'Two-tone black & grey leather seats, wood-effect floor, and sliding door entry step.'
      },
      {
        id: 'sprinter_int_2',
        src: 'assets/partner_fleet/como_driver/sprinter_12_int_2.jpg',
        file: 'Interno Sprinter 02.jpeg',
        title: 'Interior Cabin — Passenger Rows & Curtains',
        caption: 'Individual contoured leather seats with 3-point belts and pleated window curtains.'
      },
      {
        id: 'sprinter_int_3',
        src: 'assets/partner_fleet/como_driver/sprinter_12_int_3.jpg',
        file: 'Interno Sprinter 03.jpeg',
        title: 'Interior Cabin — Rear 4-Seat Row',
        caption: 'Back row 4-passenger bench in matching black/grey leather trim.'
      }
    ]
  },
  {
    id: 'como_transit_16',
    partnerId: 'partner_1792765279097_26hr',
    vehicleModel: 'Ford Transit Minibus 16',
    coachbuilder: 'Carind · High-Roof Shuttle',
    pax: 16,
    tier: 'standard',
    tierLabel: 'Standard Shuttle',
    tierSpec: 'White exterior · High-back cloth/leatherette seats · Wood floor',
    partnerName: 'Como Driver Services',
    baseCity: 'Lurate Caccivio (Como)',
    contactPerson: 'Salvatore Calzolaio',
    phone: '+39 320 727 0552',
    email: 'info@comodriver.com',
    website: 'https://www.comodriver.com',
    status: 'confirmed',
    statusLabel: 'Rates & 3 photos verified',
    repliedAt: '28 Oct 2026 · 09:22',
    ratePdf: PDF_COMO_DRIVER,
    ratePdfName: 'DORONGO 2027.pdf (2 pages)',
    transfers: {
      mxp_como: { label: 'MXP ⇄ Como', net: 400, km: 48, garageKm: 78 },
      milano_como: { label: 'Milano Centro ⇄ Como', net: 450, km: 52, garageKm: 95 },
      lin_como: { label: 'LIN ⇄ Como', net: 450, km: 62, garageKm: 115 },
      bgy_como: { label: 'BGY ⇄ Como', net: 500, km: 92, garageKm: 175 },
      tremezzo: { label: 'Como ⇄ Tremezzo', net: 350, km: 30, garageKm: 68 },
      bellagio: { label: 'Como ⇄ Bellagio', net: 350, km: 32, garageKm: 72 }
    },
    kmFormulaNote: 'Formula: €260 base + ~€2.80/km (Standby: €4.50–€5.00/km)',
    standby: {
      dispo_4h: { label: '4h (incl. 100 km)', net: 500, hourlyEq: 125 },
      dispo_8h: { label: '8h (incl. 200 km)', net: 900, hourlyEq: 112.5 },
      extra_hour: { label: 'Extra Hour', net: 100 },
      extra_wait: { label: 'Wait >60m Airport', net: 80 }
    },
    terms: {
      payment: 'Prepayment upon invoice (vista fattura)',
      vat: '10% VAT excluded',
      included: 'Fuel, highway tolls, parking, 60m airport wait, 20m hotel/station wait',
      nightSurcharge: '+20% between 22:00 and 06:00',
      cancellation: '14–28 days: 50% refund · <14 days: no refund (100% penalty)'
    },
    photos: [
      {
        id: 'transit_ext_1',
        src: 'assets/partner_fleet/como_driver/transit_16_ext_villa_erba.jpg',
        file: 'Immagine WhatsApp 2024-11-14 ore 10.38.37_00b2dee4.jpg',
        title: 'Exterior — Villa Erba (Cernobbio)',
        caption: 'White Ford Transit 16-seat minibus staged at Villa Erba on Lake Como.'
      },
      {
        id: 'transit_ext_2',
        src: 'assets/partner_fleet/como_driver/transit_16_ext_2.jpg',
        file: 'Minibus Ford Esterno 2.jpg',
        title: 'Exterior — Front Quarter & Boarding Step',
        caption: 'Carind conversion with power sliding door and automatic boarding step.'
      },
      {
        id: 'transit_int_1',
        src: 'assets/partner_fleet/como_driver/transit_16_int_1.jpg',
        file: 'Minibus Ford Interno - Copia.jpg',
        title: 'Interior Cabin — 16 Passenger Seats',
        caption: 'Center aisle layout with 16 high-back cloth/leatherette seats and dark wood-look floor.'
      }
    ]
  },
  {
    id: 'avantgarde_sprinter_8',
    partnerId: 'partner_1792765279535_l9ei',
    vehicleModel: 'Mercedes Sprinter 7 & 8 Pax (+ Driver)',
    coachbuilder: 'Red 7 Pax · Standard 8 Pax · Top 8 Pax VIP',
    pax: 8,
    tier: 'luxury',
    tierLabel: 'Luxury VIP',
    tierSpec: 'WA-verified fleet: Red 7-pax + driver, Standard 8-pax + driver, and Top 8-pax ("allestimento speciale")',
    partnerName: 'Avantgarde Limousine Service (Milanocab)',
    baseCity: 'Milano (Via Calatafimi 12)',
    contactPerson: 'Vincenzo (Vincent) Lombardi',
    phone: '+39 333 269 7376',
    email: 'info@milanocab.it',
    website: 'https://www.avantgardelimousineservice.it/mezzi/',
    status: 'confirmed',
    statusLabel: 'MXP €250 · Standby €90–140/h (+IVA)',
    repliedAt: '29 Oct 2026 · 08:39 & 11:19 WA',
    ratePdf: null,
    ratePdfName: null,
    transfers: {
      mxp_milano: { label: 'MXP ⇄ Milano', net: 250, km: 50, garageKm: 100 }
    },
    kmFormulaNote: 'Round-trip from Milan depot (100 km): €2.50/km net',
    transferNote: 'Quoted €250 net (+10% IVA = €275 gross). Confirming if Red 7-pax / Standard 8-pax / Top 8-pax share €250 MXP rate.',
    standby: {
      dispo_4h: { label: '4h Std (€90/h)', net: 360, hourlyEq: 90 },
      dispo_8h: { label: '8h Std (€90/h)', net: 720, hourlyEq: 90 },
      extra_hour: { label: 'Hourly (Std–VIP)', net: 90 },
      extra_wait: null
    },
    standbyNote: 'Quoted "da €90 a €140/ora + IVA" by configuration (Red 7p, Std 8p, Top 8p). Outside-Milan (Como) standby not confirmed yet.',
    terms: {
      payment: 'POS on board / Invoice',
      vat: '10% VAT excluded ("più IVA") + eventual Area C ZTL',
      included: 'Milan depot — outside-Milan (Lake Como) standby still unconfirmed',
      nightSurcharge: 'Confirming with partner',
      cancellation: 'Requested'
    },
    photos: [
      {
        id: 'avantgarde_sprinter_ext',
        src: 'assets/partner_fleet/avantgarde/sprinter_8_ext_website.webp',
        file: 'sprinter_8_ext_website.webp',
        title: 'Exterior — Mercedes Sprinter 8 Pax VIP',
        caption: 'Executive 8-passenger Sprinter (+ driver). Photos for Red 7-pax, Standard 8-pax, and Top 8-pax sent via WhatsApp.'
      },
      {
        id: 'avantgarde_sprinter_int',
        src: 'assets/partner_fleet/avantgarde/sprinter_8_int_website.jpg',
        file: 'sprinter_8_int_website.jpg',
        title: 'Interior Cabin — VIP Allestimento Speciale (8 Pax)',
        caption: 'Club seating with tables & ambient lighting ("allestimento speciale" €90–€140/h + IVA).'
      }
    ]
  },
  {
    id: 'avantgarde_minibus_18',
    partnerId: 'partner_1792765279535_l9ei',
    vehicleModel: 'Mercedes Minibus 20 Pax',
    coachbuilder: '20-Passenger Minibus (WA Ext + Int Confirmed)',
    pax: 20,
    tier: 'luxury',
    tierLabel: 'Luxury VIP',
    tierSpec: 'WA-verified: 20-pax minibus exterior (08:36) + interior (11:19)',
    partnerName: 'Avantgarde Limousine Service (Milanocab)',
    baseCity: 'Milano (Via Calatafimi 12)',
    contactPerson: 'Vincenzo (Vincent) Lombardi',
    phone: '+39 333 269 7376',
    email: 'info@milanocab.it',
    website: 'https://www.milanocab.it/cars/',
    status: 'confirmed',
    statusLabel: 'MXP €330 · 4h €550 · 8h €950 (+IVA)',
    repliedAt: '28 Oct 16:36 & 29 Oct 11:19 WA',
    ratePdf: null,
    ratePdfName: null,
    transfers: {
      mxp_milano: { label: 'MXP ⇄ Milano (+ZTL)', net: 330, km: 50, garageKm: 100 }
    },
    kmFormulaNote: 'Round-trip from Milan depot (100 km): €3.30/km net',
    transferNote: 'Quoted €330 net (+10% VAT = €363 + eventual Area C ZTL).',
    standby: {
      dispo_4h: { label: '4h (+Area C ZTL)', net: 550, hourlyEq: 137.5 },
      dispo_8h: { label: '8h (+Area C ZTL)', net: 950, hourlyEq: 118.75 },
      extra_hour: null,
      extra_wait: null
    },
    standbyNote: 'VAT (10%) & ZTL Area C excluded ("più IVA ed eventuale ZTL"). Outside-Milan (Lake Como) standby not confirmed yet.',
    terms: {
      payment: 'POS on board / Invoice',
      vat: '10% VAT excluded ("più IVA") + eventual Area C ZTL',
      included: 'Milan base — confirming if standby covers outside Milan (Lake Como)',
      nightSurcharge: 'Confirming with partner',
      cancellation: 'Requested'
    },
    photos: [
      {
        id: 'avantgarde_18_ext',
        src: 'assets/partner_fleet/avantgarde/minibus_18_ext_website.jpg',
        file: 'IMG_2307-270.jpg (milanocab.it/cars)',
        title: 'Exterior — Mercedes Minibus 20 Pax',
        caption: 'Vincenzo also sent exterior & interior photos of the 20-pax minibus on WhatsApp (29 Oct 08:36 & 11:19).'
      }
    ]
  },
  {
    id: 'avantgarde_coach_30',
    partnerId: 'partner_1792765279535_l9ei',
    vehicleModel: 'Executive Midibus / Coach 30 Pax',
    coachbuilder: '30-Passenger Coach (WA Ext + Int Confirmed)',
    pax: 30,
    tier: 'standard',
    tierLabel: 'Executive Midibus',
    tierSpec: 'WA-verified: "30 Pax" (08:34) + "Interni 30 posti" (11:18) — awaiting price list',
    partnerName: 'Avantgarde Limousine Service (Milanocab)',
    baseCity: 'Milano (Via Calatafimi 12)',
    contactPerson: 'Vincenzo (Vincent) Lombardi',
    phone: '+39 333 269 7376',
    email: 'info@milanocab.it',
    website: 'https://www.avantgardelimousineservice.it/mezzi/',
    status: 'pending',
    statusLabel: 'Photos on WA · Awaiting 30-pax prices',
    repliedAt: '29 Oct 2026 · 08:34 & 11:18 WA',
    ratePdf: null,
    ratePdfName: null,
    transfers: null,
    transferNote: 'Not provided yet for the 30-seater (only 8-pax €250 and 20-pax €330 MXP–Milano quoted so far).',
    standby: null,
    standbyNote: 'Not provided yet for the 30-seater — need 4h/8h standby & outside-Milan (Como) availability.',
    terms: null,
    photos: []
  },
  {
    id: 'landway_fleet',
    partnerId: 'partner_1792761170109_96nx',
    vehicleModel: 'Mercedes Sprinter & GT Coach Fleet',
    coachbuilder: '16–54 Seats · Executive & GT',
    pax: 50,
    tier: 'luxury',
    tierLabel: 'Luxury + Standard',
    tierSpec: 'Como & Milan depot (Via Gattamelata 34) · Royal Garden Group',
    partnerName: 'Landway Tourism (Land Way S.r.l.)',
    baseCity: 'Como / Milano',
    contactPerson: 'Melissa',
    phone: '+39 02 3929 7050',
    email: 'info@landwaytourism.com',
    website: 'https://www.landwaytourism.com',
    status: 'pending',
    statusLabel: 'Replied · In pricing dept',
    repliedAt: '28 Oct 2026 · 10:14',
    ratePdf: null,
    ratePdfName: null,
    transfers: null,
    transferNote: 'Not provided yet — Melissa forwarded request to fleet pricing department on 28 Oct.',
    standby: null,
    standbyNote: 'Not provided yet — awaiting B2B rate sheet',
    terms: null,
    photos: []
  },
  {
    id: 'comolimolux_vclass',
    partnerId: 'partner_1792765279410_2zml',
    vehicleModel: 'Mercedes-Benz V-Class (Overflow Only)',
    coachbuilder: '7 Seats · No Minibus / Coach',
    pax: 7,
    tier: 'luxury',
    tierLabel: 'Luxury Minivan',
    tierSpec: 'Single V-Class operator · Saved for Lake Como V-Class overflow',
    partnerName: 'Como Limo Lux',
    baseCity: 'Como',
    contactPerson: 'Stefano Carnevale',
    phone: '+39 346 703 9569',
    email: 'info@comolimolux.com',
    website: 'https://comolimolux.com',
    status: 'pending',
    statusLabel: 'Replied · V-Class only',
    repliedAt: '27 Oct 2026 · 16:17',
    ratePdf: null,
    ratePdfName: null,
    transfers: null,
    transferNote: 'Not provided — operates only 1x V-Class (no 8–50 seat buses). Asked for Lake Como network referral.',
    standby: null,
    standbyNote: 'Not provided',
    terms: null,
    photos: []
  }
];

const TIER_OVERRIDES_STORAGE_KEY = 'dorogo_fleet_tier_overrides_v1';

function loadTierOverrides() {
  try {
    return JSON.parse(localStorage.getItem(TIER_OVERRIDES_STORAGE_KEY) || '{}') || {};
  } catch (_) {
    return {};
  }
}

function saveTierOverride(vehicleId, tier) {
  try {
    const map = loadTierOverrides();
    map[vehicleId] = tier;
    localStorage.setItem(TIER_OVERRIDES_STORAGE_KEY, JSON.stringify(map));
  } catch (_) {}
}

function applySavedTierOverrides() {
  const map = loadTierOverrides();
  FLEET_LEDGER_ROWS.forEach((r) => {
    if (map[r.id] === 'luxury' || map[r.id] === 'standard') {
      r.tier = map[r.id];
      r.tierLabel = map[r.id] === 'luxury' ? 'Luxury VIP' : 'Standard Shuttle';
    }
  });
}

export function calculateAdjustedPrice(netAmount, mode = 'net') {
  const n = Number(netAmount) || 0;
  if (mode === 'vat') return Math.round(n * 1.10);
  if (mode === 'night') return Math.round(n * 1.20);
  if (mode === 'night_vat') return Math.round(n * 1.20 * 1.10);
  return n;
}

function formatEur(amount) {
  return `€${Number(amount).toLocaleString('en-IE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function modeBadgeText(mode) {
  if (mode === 'vat') return 'Gross (+10% VAT)';
  if (mode === 'night') return 'Night (+20% net)';
  if (mode === 'night_vat') return 'Night Gross (+20% + 10% VAT)';
  return 'Net B2B (Excl. 10% VAT)';
}

export async function render(el) {
  applySavedTierOverrides();
  const filteredRows = FLEET_LEDGER_ROWS.filter((r) => {
    if (activeTab === 'confirmed' && r.status !== 'confirmed') return false;
    if (activeTab === 'luxury' && r.tier !== 'luxury') return false;
    if (activeTab === 'standard' && r.tier !== 'standard') return false;
    if (activeTab === 'pending' && r.status !== 'pending') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const hay = `${r.vehicleModel} ${r.coachbuilder} ${r.partnerName} ${r.baseCity} ${r.contactPerson} ${r.tierLabel} ${r.tierSpec}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const confirmedCount = FLEET_LEDGER_ROWS.filter((r) => r.status === 'confirmed').length;
  const luxCount = FLEET_LEDGER_ROWS.filter((r) => r.tier === 'luxury').length;
  const stdCount = FLEET_LEDGER_ROWS.filter((r) => r.tier === 'standard').length;
  const pendingCount = FLEET_LEDGER_ROWS.filter((r) => r.status === 'pending').length;

  const sprinterMxp = calculateAdjustedPrice(350, pricingMode);
  const transitMxp = calculateAdjustedPrice(400, pricingMode);
  const dispo4h = calculateAdjustedPrice(500, pricingMode);
  const dispo8h = calculateAdjustedPrice(900, pricingMode);

  el.innerHTML = `
    <div class="sail-page">
      <!-- Stripe Top Header -->
      <div class="sail-header">
        <div>
          <div class="sail-breadcrumb">
            <a href="#bus_partners" style="color:inherit;text-decoration:none">Partner Network</a>
            <span style="color:#CBD5E1">/</span>
            <span>Fleet &amp; Rate Ledger</span>
          </div>
          <h1 class="sail-title">Partner Fleet &amp; Rate Ledger</h1>
          <div class="sail-subtitle">
            Reconciled vehicle specifications, calculated transfer &amp; standby tariffs, class tiering (Luxury vs. Standard), and inspection photos.
          </div>
        </div>

        <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
          <div class="sail-seg" role="tablist" aria-label="Pricing calculation mode">
            <button class="${pricingMode === 'net' ? 'on' : ''}" data-price-mode="net">Net B2B</button>
            <button class="${pricingMode === 'vat' ? 'on' : ''}" data-price-mode="vat">+10% VAT</button>
            <button class="${pricingMode === 'night' ? 'on' : ''}" data-price-mode="night">Night (+20%)</button>
            <button class="${pricingMode === 'night_vat' ? 'on' : ''}" data-price-mode="night_vat">Night + VAT</button>
          </div>
          <a class="sail-btn" href="${attr(PDF_COMO_DRIVER)}" target="_blank" rel="noopener">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 1.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V6L9 1.5Z"/><path d="M9 1.5V6h4.5"/></svg>
            Original Rate PDF
          </a>
          <a class="sail-btn" href="#bus_partners">
            All 56 Bus Operators →
          </a>
        </div>
      </div>

      <!-- Stripe 4-Column Telemetry Strip -->
      <div class="sail-stat-strip">
        <div class="sail-stat-cell">
          <div class="sail-stat-label">
            <span>Priced Vehicles</span>
            <span class="sail-pill ok" style="padding:1px 6px;font-size:10.5px"><span class="sail-pill-dot"></span>Active</span>
          </div>
          <div class="sail-stat-val">${confirmedCount} <span style="font-size:13px;font-weight:500;color:var(--sail-muted)">/ ${FLEET_LEDGER_ROWS.length} replied</span></div>
          <div class="sail-stat-meta">Como Driver (12 &amp; 16p) · Avantgarde (8 &amp; 16p)</div>
        </div>

        <div class="sail-stat-cell">
          <div class="sail-stat-label">
            <span>Malpensa (MXP) ⇄ Como</span>
            <span style="font-size:11px;color:var(--sail-accent);font-weight:600">${esc(modeBadgeText(pricingMode))}</span>
          </div>
          <div class="sail-stat-val">${formatEur(sprinterMxp)} <span style="font-size:14px;font-weight:500;color:var(--sail-muted)">– ${formatEur(transitMxp)}</span></div>
          <div class="sail-stat-meta">${formatEur(Math.round(sprinterMxp / 12))}–${formatEur(Math.round(transitMxp / 16))}/seat · 60m airport wait incl.</div>
        </div>

        <div class="sail-stat-cell">
          <div class="sail-stat-label">
            <span>Standby (4h / 8h Disposizione)</span>
            <span style="font-size:11px;color:var(--sail-muted)">100km / 200km</span>
          </div>
          <div class="sail-stat-val">${formatEur(dispo4h)} <span style="font-size:14px;font-weight:500;color:var(--sail-muted)">/ ${formatEur(dispo8h)}</span></div>
          <div class="sail-stat-meta">Extra hour: ${formatEur(calculateAdjustedPrice(100, pricingMode))}/h · Extra wait: ${formatEur(calculateAdjustedPrice(80, pricingMode))}/h</div>
        </div>

        <div class="sail-stat-cell">
          <div class="sail-stat-label">
            <span>Verified Inspection Media</span>
            <span class="sail-pill info" style="padding:1px 6px;font-size:10.5px">100% Real Files</span>
          </div>
          <div class="sail-stat-val">7 photos <span style="font-size:14px;font-weight:500;color:var(--sail-muted)">· 1 PDF</span></div>
          <div class="sail-stat-meta">4 Mercedes Sprinter · 3 Ford Transit</div>
        </div>
      </div>

      <!-- Stripe Ledger Card -->
      <div class="sail-card">
        <!-- View Filter Tabs + Search -->
        <div class="sail-card-head" style="padding-bottom:0;border-bottom:1px solid var(--sail-line)">
          <div class="sail-tabs" role="tablist">
            <button class="sail-tab ${activeTab === 'all' ? 'active' : ''}" data-ledger-tab="all">
              All Replied Fleet <span class="sail-tab-count">${FLEET_LEDGER_ROWS.length}</span>
            </button>
            <button class="sail-tab ${activeTab === 'confirmed' ? 'active' : ''}" data-ledger-tab="confirmed">
              Confirmed Rates &amp; Photos <span class="sail-tab-count">${confirmedCount}</span>
            </button>
            <button class="sail-tab ${activeTab === 'luxury' ? 'active' : ''}" data-ledger-tab="luxury">
              Luxury VIP <span class="sail-tab-count">${luxCount}</span>
            </button>
            <button class="sail-tab ${activeTab === 'standard' ? 'active' : ''}" data-ledger-tab="standard">
              Standard Shuttle <span class="sail-tab-count">${stdCount}</span>
            </button>
            <button class="sail-tab ${activeTab === 'pending' ? 'active' : ''}" data-ledger-tab="pending">
              Awaiting Rate Sheet <span class="sail-tab-count">${pendingCount}</span>
            </button>
          </div>

          <div class="row" style="gap:8px;padding-bottom:8px;align-items:center">
            <input type="text" id="ledger-search" placeholder="Filter by model, partner, city..." value="${attr(searchQuery)}" style="height:30px;padding:0 10px;border:1px solid var(--sail-line);border-radius:6px;font-size:12.5px;width:220px;background:#F8FAFC;color:var(--sail-ink)">
          </div>
        </div>

        <!-- Primary Stripe Data Table -->
        <div class="sail-table-wrap">
          <table class="sail-table" style="table-layout:fixed;width:100%">
            <thead>
              <tr>
                <th style="width:15%">Vehicle &amp; Capacity</th>
                <th style="width:11%">Class Tier</th>
                <th style="width:16%">Partner &amp; Direct Contact</th>
                <th style="width:23%">Transfer Rates (${esc(modeBadgeText(pricingMode))})</th>
                <th style="width:20%">Standby / Disposizione</th>
                <th style="width:15%">Inspection Photos &amp; Rate Sheet</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRows.map((row) => renderLedgerRow(row)).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Direct Visual Inspection Section: All 7 Real Photos Side-by-Side (Sprinter vs Ford Transit) -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(440px, 1fr));gap:16px">
        ${FLEET_LEDGER_ROWS.filter((r) => r.photos && r.photos.length > 0).map((veh) => `
          <div class="sail-card">
            <div class="sail-card-head">
              <div>
                <div class="row" style="gap:8px;align-items:center">
                  <span class="sail-card-title">${esc(veh.vehicleModel)} (${veh.pax} Seats)</span>
                  <span class="sail-pill ${veh.tier === 'luxury' ? 'lux' : 'std'}">
                    <span class="sail-pill-dot"></span>${esc(veh.tierLabel)}
                  </span>
                </div>
                <div style="font-size:12px;color:var(--sail-muted);margin-top:2px">
                  ${esc(veh.tierSpec)}
                </div>
              </div>
              <button class="sail-btn xs" data-open-gallery="${attr(veh.id)}" data-photo-idx="0">
                Inspect All ${veh.photos.length} Photos
              </button>
            </div>

            <div class="sail-gallery-grid">
              ${veh.photos.map((ph, idx) => `
                <div class="sail-photo-card" data-open-gallery="${attr(veh.id)}" data-photo-idx="${idx}" title="Click to enlarge photo">
                  <img src="${attr(ph.src)}" alt="${attr(ph.title)}" loading="lazy" />
                  <div class="sail-photo-meta">
                    <div class="sail-photo-title">${esc(ph.title)}</div>
                    <div class="sail-photo-sub">${esc(ph.caption)}</div>
                    <div style="margin-top:4px;font-size:11px;font-weight:600;color:var(--sail-accent);display:flex;align-items:center;justify-content:space-between">
                      <span>Click to enlarge</span>
                      <a href="${attr(ph.src)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:var(--sail-muted);font-weight:500">Raw file ↗</a>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Bottom Split: Interactive Stripe Price & Margin Calculator + PDF Contract Terms -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(420px, 1fr));gap:16px">
        ${renderPriceCalculatorCard()}
        ${renderTermsAndSlaCard()}
      </div>
    </div>
  `;

  attachLedgerListeners(el);
}

function estimateVehiclePerKm(row, mode) {
  if (!row.transfers) return null;
  const entries = Object.values(row.transfers).filter((t) => t.km > 0);
  if (!entries.length) return null;
  const totalPrice = entries.reduce((sum, t) => sum + calculateAdjustedPrice(t.net, mode), 0);
  const totalClientKm = entries.reduce((sum, t) => sum + t.km, 0);
  const totalGarageKm = entries.reduce((sum, t) => sum + (t.garageKm || t.km * 1.8), 0);
  return {
    clientPerKm: (totalPrice / totalClientKm).toFixed(2),
    garagePerKm: (totalPrice / totalGarageKm).toFixed(2),
    formulaNote: row.kmFormulaNote || ''
  };
}

function renderLedgerRow(row) {
  const hasTransfers = Boolean(row.transfers);
  const hasStandby = Boolean(row.standby);
  const hasPhotos = Array.isArray(row.photos) && row.photos.length > 0;
  const rawWa = (row.phone || '').replace(/[^\d+]/g, '');
  const kmEst = estimateVehiclePerKm(row, pricingMode);

  let transferHtml = '';
  if (hasTransfers) {
    const entries = Object.values(row.transfers);
    transferHtml = `
      <div class="sail-rate-grid">
        ${entries.map((t) => {
          const adj = calculateAdjustedPrice(t.net, pricingMode);
          const perPax = Math.round(adj / row.pax);
          return `
            <span class="sail-rate-route">${esc(t.label)}</span>
            <span class="sail-rate-amt">${formatEur(adj)} <span class="sail-rate-sub">(${formatEur(perPax)}/p)</span></span>
          `;
        }).join('')}
      </div>
      ${kmEst ? `
        <div style="margin-top:7px;padding-top:6px;border-top:1px dashed var(--sail-line);display:flex;flex-wrap:wrap;gap:6px;align-items:center">
          <span class="sail-pill info" style="font-size:10.5px;padding:1px 7px">Est. €${kmEst.clientPerKm}/km (client route) · €${kmEst.garagePerKm}/km (incl. depot return)</span>
          ${kmEst.formulaNote ? `<span style="font-size:10.5px;color:var(--sail-muted)">${esc(kmEst.formulaNote)}</span>` : ''}
        </div>
      ` : ''}
      ${row.transferNote ? `<div style="margin-top:5px;font-size:11px;color:var(--sail-muted);line-height:1.35">${esc(row.transferNote)}</div>` : ''}
    `;
  } else {
    transferHtml = `
      <div style="display:flex;flex-direction:column;gap:4px">
        <span class="sail-pill missing" style="width:fit-content">Not provided</span>
        <span style="font-size:11.5px;color:var(--sail-muted);line-height:1.35">${esc(row.transferNote || 'No transfer rate sheet submitted yet.')}</span>
      </div>
    `;
  }

  let standbyHtml = '';
  if (hasStandby) {
    const s4 = calculateAdjustedPrice(row.standby.dispo_4h.net, pricingMode);
    const s8 = calculateAdjustedPrice(row.standby.dispo_8h.net, pricingMode);
    const exH = row.standby.extra_hour ? calculateAdjustedPrice(row.standby.extra_hour.net, pricingMode) : null;
    const exW = row.standby.extra_wait ? calculateAdjustedPrice(row.standby.extra_wait.net, pricingMode) : null;
    standbyHtml = `
      <div class="sail-rate-grid">
        <span class="sail-rate-route">${esc(row.standby.dispo_4h.label || '4h Standby')}</span>
        <span class="sail-rate-amt">${formatEur(s4)} <span class="sail-rate-sub">(${formatEur(Math.round(s4 / 4))}/h)</span></span>
        <span class="sail-rate-route">${esc(row.standby.dispo_8h.label || '8h Standby')}</span>
        <span class="sail-rate-amt">${formatEur(s8)} <span class="sail-rate-sub">(${formatEur(Math.round(s8 / 8))}/h)</span></span>
        ${exH !== null ? `<span class="sail-rate-route">Extra Hour</span><span class="sail-rate-amt">${formatEur(exH)}/h</span>` : ''}
        ${exW !== null ? `<span class="sail-rate-route">Wait &gt;60m Airport</span><span class="sail-rate-amt">${formatEur(exW)}/h</span>` : ''}
      </div>
      ${row.standbyNote ? `<div style="margin-top:6px;font-size:11px;color:var(--sail-muted);line-height:1.35">${esc(row.standbyNote)}</div>` : ''}
    `;
  } else {
    standbyHtml = `
      <div style="display:flex;flex-direction:column;gap:4px">
        <span class="sail-pill missing" style="width:fit-content">Not provided</span>
        <span style="font-size:11.5px;color:var(--sail-muted);line-height:1.35">${esc(row.standbyNote || 'No standby rates submitted yet.')}</span>
      </div>
    `;
  }

  let mediaHtml = '';
  if (hasPhotos || row.ratePdf) {
    mediaHtml = `
      <div style="display:flex;flex-direction:column;gap:8px">
        ${hasPhotos ? `
          <div class="sail-thumb-strip">
            ${row.photos.map((ph, idx) => `
              <img class="sail-thumb" src="${attr(ph.src)}" alt="${attr(ph.title)}" title="${attr(ph.title)} — Click to view" data-open-gallery="${attr(row.id)}" data-photo-idx="${idx}" />
            `).join('')}
          </div>
          <div class="row" style="gap:6px">
            <button class="sail-btn xs primary" data-open-gallery="${attr(row.id)}" data-photo-idx="0">
              View ${row.photos.length} photos
            </button>
            ${row.ratePdf ? `
              <a class="sail-btn xs" href="${attr(row.ratePdf)}" target="_blank" rel="noopener" title="Open original PDF rate sheet">
                Rate PDF ↗
              </a>
            ` : ''}
          </div>
        ` : `<span class="sail-pill missing">No photos provided</span>`}
      </div>
    `;
  } else {
    mediaHtml = `
      <div style="display:flex;flex-direction:column;gap:4px">
        <span class="sail-pill missing" style="width:fit-content">No photos provided</span>
        <span style="font-size:11.5px;color:var(--sail-muted)">Rate sheet PDF not provided</span>
      </div>
    `;
  }

  return `
    <tr>
      <td>
        <div style="font-weight:600;color:var(--sail-ink);font-size:13px;line-height:1.3">${esc(row.vehicleModel)}</div>
        <div style="margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span class="sail-pill info" style="font-size:11px;padding:1px 7px;font-variant-numeric:tabular-nums"><strong>${row.pax} pax</strong></span>
          <details style="font-size:11px;color:var(--sail-muted)">
            <summary style="cursor:pointer;user-select:none;font-weight:500;color:var(--sail-body)">Specs</summary>
            <div style="margin-top:4px;line-height:1.35;color:var(--sail-muted)">
              <div><strong>${esc(row.coachbuilder)}</strong></div>
              <div style="margin-top:2px">${esc(row.tierSpec)}</div>
            </div>
          </details>
        </div>
      </td>

      <td>
        <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-start">
          <select class="sail-tier-select ${row.tier === 'luxury' ? 'lux' : 'std'}" data-tier-select="${attr(row.id)}" title="Switch between Luxury VIP and Standard Shuttle">
            <option value="luxury" ${row.tier === 'luxury' ? 'selected' : ''}>Luxury VIP</option>
            <option value="standard" ${row.tier === 'standard' ? 'selected' : ''}>Standard Shuttle</option>
          </select>
          <span class="sail-pill ${row.status === 'confirmed' ? 'ok' : 'info'}" style="font-size:10.5px;padding:1px 6px">
            ${esc(row.status === 'confirmed' ? 'Verified' : 'Pending')}
          </span>
        </div>
      </td>

      <td>
        <div style="font-weight:600;color:var(--sail-ink);font-size:13px;line-height:1.3">
          ${row.website ? `<a href="${attr(row.website)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;border-bottom:1px dotted #94A3B8" title="Open partner website">${esc(row.partnerName)} ↗</a>` : esc(row.partnerName)}
        </div>
        <div style="font-size:11.5px;color:var(--sail-body);margin-top:2px">${esc(row.baseCity)} · ${esc(row.contactPerson)}</div>
        <div class="row" style="gap:6px;margin-top:6px;font-size:11.5px;flex-wrap:wrap">
          <a href="https://wa.me/${rawWa.replace(/^\+/, '')}" target="_blank" rel="noopener" style="color:var(--sail-accent);font-weight:600">WhatsApp</a>
          <span style="color:#CBD5E1">·</span>
          <a href="mailto:${attr(row.email)}" style="color:var(--sail-body)" title="${attr(row.email)}">Email</a>
          ${row.website ? `
            <span style="color:#CBD5E1">·</span>
            <a href="${attr(row.website)}" target="_blank" rel="noopener" style="color:var(--sail-accent);font-weight:600" title="${attr(row.website)}">Website ↗</a>
          ` : ''}
        </div>
      </td>

      <td>${transferHtml}</td>
      <td>${standbyHtml}</td>
      <td>${mediaHtml}</td>
    </tr>
  `;
}

function renderPriceCalculatorCard() {
  const veh = FLEET_LEDGER_ROWS.find((r) => r.id === calcState.vehicleId) || FLEET_LEDGER_ROWS[0];
  const transferOptions = Object.entries(veh.transfers || {}).map(([key, val]) => ({
    key,
    label: `Transfer: ${val.label}`,
    net: val.net
  }));
  const standbyOptions = [];
  if (veh.standby?.dispo_4h) standbyOptions.push({ key: 'dispo_4h', label: `Standby: ${veh.standby.dispo_4h.label}`, net: veh.standby.dispo_4h.net });
  if (veh.standby?.dispo_8h) standbyOptions.push({ key: 'dispo_8h', label: `Standby: ${veh.standby.dispo_8h.label}`, net: veh.standby.dispo_8h.net });
  const allServices = [...transferOptions, ...standbyOptions];
  const selService = allServices.find((s) => s.key === calcState.serviceKey) || allServices[allServices.length - 1] || { key: 'dispo_8h', label: '8h Standby', net: 900 };

  const baseNet = selService.net;
  const extraHoursCost = (Number(calcState.extraHours) || 0) * 100;
  const extraWaitCost = (Number(calcState.extraWaitHours) || 0) * 80;
  const subtotalBeforeNight = baseNet + extraHoursCost + extraWaitCost;
  const nightSurcharge = calcState.nightWindow ? Math.round(subtotalBeforeNight * 0.20) : 0;
  const totalNetB2B = subtotalBeforeNight + nightSurcharge;
  const vatAmount = calcState.includeVat ? Math.round(totalNetB2B * 0.10) : 0;
  const totalPartnerCost = totalNetB2B + vatAmount;
  const perPaxCost = (totalPartnerCost / veh.pax).toFixed(2);
  const clientQuote = Math.round(totalPartnerCost * (1 + (Number(calcState.clientMarkupPct) || 0) / 100));
  const netMargin = clientQuote - totalPartnerCost;

  return `
    <div class="sail-card">
      <div class="sail-card-head">
        <div>
          <div class="sail-card-title">B2B Trip &amp; Client Quote Calculator</div>
          <div style="font-size:12px;color:var(--sail-muted);margin-top:2px">
            Calculates net B2B tariff, +10% VAT, night surcharge, and client markup
          </div>
        </div>
        <span class="sail-pill info">Instant Calculation</span>
      </div>

      <div style="padding:16px 18px;display:flex;flex-direction:column;gap:14px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="display:block;font-size:11.5px;font-weight:600;color:var(--sail-body);margin-bottom:4px">Vehicle</label>
            <select id="calc-vehicle" style="width:100%;height:34px;padding:0 10px;border:1px solid var(--sail-line);border-radius:6px;font-size:13px;background:#FFF">
              <option value="como_sprinter_12" ${calcState.vehicleId === 'como_sprinter_12' ? 'selected' : ''}>Como Driver · Mercedes Sprinter (12 pax · Luxury VIP)</option>
              <option value="como_transit_16" ${calcState.vehicleId === 'como_transit_16' ? 'selected' : ''}>Como Driver · Ford Transit (16 pax · Standard Shuttle)</option>
              <option value="avantgarde_sprinter_8" ${calcState.vehicleId === 'avantgarde_sprinter_8' ? 'selected' : ''}>Avantgarde · Mercedes Sprinter (7 &amp; 8 pax · Milano)</option>
              <option value="avantgarde_minibus_18" ${calcState.vehicleId === 'avantgarde_minibus_18' ? 'selected' : ''}>Avantgarde · Mercedes Minibus (20 pax · Milano)</option>
            </select>
          </div>

          <div>
            <label style="display:block;font-size:11.5px;font-weight:600;color:var(--sail-body);margin-bottom:4px">Route or Standby Package</label>
            <select id="calc-service" style="width:100%;height:34px;padding:0 10px;border:1px solid var(--sail-line);border-radius:6px;font-size:13px;background:#FFF">
              ${allServices.map((s) => `
                <option value="${attr(s.key)}" ${calcState.serviceKey === s.key ? 'selected' : ''}>${esc(s.label)} — €${s.net}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div>
            <label style="display:block;font-size:11.5px;font-weight:600;color:var(--sail-body);margin-bottom:4px">Extra Hours (€100/h)</label>
            <input type="number" id="calc-extra-hours" min="0" max="12" value="${calcState.extraHours}" style="width:100%;height:32px;padding:0 10px;border:1px solid var(--sail-line);border-radius:6px;font-size:13px">
          </div>
          <div>
            <label style="display:block;font-size:11.5px;font-weight:600;color:var(--sail-body);margin-bottom:4px">Extra Wait (€80/h)</label>
            <input type="number" id="calc-extra-wait" min="0" max="6" value="${calcState.extraWaitHours}" style="width:100%;height:32px;padding:0 10px;border:1px solid var(--sail-line);border-radius:6px;font-size:13px">
          </div>
          <div>
            <label style="display:block;font-size:11.5px;font-weight:600;color:var(--sail-body);margin-bottom:4px">DOROGO Markup (%)</label>
            <input type="number" id="calc-markup" min="0" max="100" step="5" value="${calcState.clientMarkupPct}" style="width:100%;height:32px;padding:0 10px;border:1px solid var(--sail-line);border-radius:6px;font-size:13px">
          </div>
        </div>

        <div class="row" style="gap:18px;padding:4px 0">
          <label style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--sail-ink);cursor:pointer">
            <input type="checkbox" id="calc-night" ${calcState.nightWindow ? 'checked' : ''}>
            Night service 22:00–06:00 (+20%)
          </label>
          <label style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--sail-ink);cursor:pointer">
            <input type="checkbox" id="calc-vat" ${calcState.includeVat ? 'checked' : ''}>
            Include 10% Italian VAT
          </label>
        </div>

        <!-- Ledger Breakdown Output -->
        <div style="background:#F8FAFC;border:1px solid var(--sail-line);border-radius:6px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;font-variant-numeric:tabular-nums">
          <div class="row between" style="font-size:12.5px;color:var(--sail-body)">
            <span>Base rate (${esc(selService.label)})</span>
            <span>€${baseNet}</span>
          </div>
          ${extraHoursCost > 0 ? `<div class="row between" style="font-size:12.5px;color:var(--sail-body)"><span>Extra hours (${calcState.extraHours}h × €100)</span><span>+€${extraHoursCost}</span></div>` : ''}
          ${extraWaitCost > 0 ? `<div class="row between" style="font-size:12.5px;color:var(--sail-body)"><span>Extra waiting (${calcState.extraWaitHours}h × €80)</span><span>+€${extraWaitCost}</span></div>` : ''}
          ${nightSurcharge > 0 ? `<div class="row between" style="font-size:12.5px;color:var(--sail-body)"><span>Night surcharge (+20%)</span><span>+€${nightSurcharge}</span></div>` : ''}
          ${vatAmount > 0 ? `<div class="row between" style="font-size:12.5px;color:var(--sail-body)"><span>Italian passenger transport VAT (10%)</span><span>+€${vatAmount}</span></div>` : ''}
          <div class="row between" style="border-top:1px solid var(--sail-line);padding-top:8px;margin-top:2px;font-size:14px;font-weight:700;color:var(--sail-ink)">
            <span>Partner B2B Cost (${veh.pax} seats · €${perPaxCost}/pax)</span>
            <span>€${totalPartnerCost}</span>
          </div>
          <div class="row between" style="font-size:13.5px;font-weight:600;color:var(--sail-accent)">
            <span>Suggested Client Price (+${calcState.clientMarkupPct}% · €${netMargin} margin)</span>
            <span>€${clientQuote}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTermsAndSlaCard() {
  return `
    <div class="sail-card">
      <div class="sail-card-head">
        <div>
          <div class="sail-card-title">Contract Terms &amp; Cancellation Policy</div>
          <div style="font-size:12px;color:var(--sail-muted);margin-top:2px">
            Extracted from <code>DORONGO 2027.pdf</code> (Page 2 · Signed by Salvatore Calzolaio)
          </div>
        </div>
        <a class="sail-btn xs" href="${attr(PDF_COMO_DRIVER)}" target="_blank" rel="noopener">Open PDF ↗</a>
      </div>

      <div style="padding:16px 18px;display:flex;flex-direction:column;gap:10px;font-size:12.5px;color:var(--sail-body);line-height:1.5">
        <div style="display:grid;grid-template-columns:145px 1fr;gap:8px;padding-bottom:8px;border-bottom:1px solid var(--sail-line-soft)">
          <strong style="color:var(--sail-ink)">Payment Terms</strong>
          <span>Advance payment upon invoice receipt (<em>Pagamento anticipato vista fattura</em>). All listed rates exclude 10% VAT.</span>
        </div>
        <div style="display:grid;grid-template-columns:145px 1fr;gap:8px;padding-bottom:8px;border-bottom:1px solid var(--sail-line-soft)">
          <strong style="color:var(--sail-ink)">Included in Quote</strong>
          <span>Fuel, highway tolls (<em>pedaggi autostradali</em>), parking, <strong>60 min</strong> airport waiting after landing, <strong>20 min</strong> station/hotel waiting.</span>
        </div>
        <div style="display:grid;grid-template-columns:145px 1fr;gap:8px;padding-bottom:8px;border-bottom:1px solid var(--sail-line-soft)">
          <strong style="color:var(--sail-ink)">Supplements</strong>
          <span>Extra waiting beyond grace period: <strong>€80/hour</strong>. Night window (22:00 – 06:00): <strong>+20% surcharge</strong>.</span>
        </div>
        <div style="display:grid;grid-template-columns:145px 1fr;gap:8px;padding-bottom:8px;border-bottom:1px solid var(--sail-line-soft)">
          <strong style="color:var(--sail-ink)">Cancellation 14–28d</strong>
          <span><strong>50% refund</strong> (50% penalty) for cancellations or unfeasible schedule changes between 28 and 14 days prior.</span>
        </div>
        <div style="display:grid;grid-template-columns:145px 1fr;gap:8px;padding-bottom:8px;border-bottom:1px solid var(--sail-line-soft)">
          <strong style="color:var(--sail-ink)">Cancellation &lt;14d</strong>
          <span><strong>No refund (100% penalty)</strong> for cancellations or unfeasible modifications less than 14 days before service.</span>
        </div>
        <div style="display:grid;grid-template-columns:145px 1fr;gap:8px">
          <strong style="color:var(--sail-ink)">Force Majeure</strong>
          <span>100% refund if service cannot be performed due to force majeure. Operator reserves right to cancel during Protezione Civile yellow/orange/red weather alerts.</span>
        </div>
      </div>
    </div>
  `;
}

function attachLedgerListeners(el) {
  // Pricing mode switcher
  el.querySelectorAll('[data-price-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pricingMode = btn.dataset.priceMode || 'net';
      render(el);
    });
  });

  // View filter tabs
  el.querySelectorAll('[data-ledger-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.ledgerTab || 'all';
      render(el);
    });
  });

  // Class Tier dropdown switcher (Luxury VIP vs Standard Shuttle)
  el.querySelectorAll('[data-tier-select]').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const vehId = sel.dataset.tierSelect;
      const newTier = e.target.value === 'standard' ? 'standard' : 'luxury';
      const veh = FLEET_LEDGER_ROWS.find((r) => r.id === vehId);
      if (veh) {
        veh.tier = newTier;
        veh.tierLabel = newTier === 'luxury' ? 'Luxury VIP' : 'Standard Shuttle';
        saveTierOverride(vehId, newTier);
        toast(`${veh.vehicleModel} set to ${veh.tierLabel}`);
        render(el);
      }
    });
  });

  // Search input
  const searchInput = el.querySelector('#ledger-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      render(el);
      const next = el.querySelector('#ledger-search');
      if (next) {
        next.focus();
        next.setSelectionRange(searchQuery.length, searchQuery.length);
      }
    });
  }

  // Calculator inputs
  const bindCalc = (sel, fn) => {
    const node = el.querySelector(sel);
    if (node) {
      node.addEventListener('change', (e) => {
        fn(e.target);
        render(el);
      });
    }
  };
  bindCalc('#calc-vehicle', (t) => { calcState.vehicleId = t.value; });
  bindCalc('#calc-service', (t) => { calcState.serviceKey = t.value; });
  bindCalc('#calc-extra-hours', (t) => { calcState.extraHours = Math.max(0, Number(t.value) || 0); });
  bindCalc('#calc-extra-wait', (t) => { calcState.extraWaitHours = Math.max(0, Number(t.value) || 0); });
  bindCalc('#calc-markup', (t) => { calcState.clientMarkupPct = Math.max(0, Number(t.value) || 0); });
  bindCalc('#calc-night', (t) => { calcState.nightWindow = Boolean(t.checked); });
  bindCalc('#calc-vat', (t) => { calcState.includeVat = Boolean(t.checked); });

  // Photo Gallery Lightbox Modal
  el.querySelectorAll('[data-open-gallery]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const vehId = trigger.dataset.openGallery;
      const startIdx = Number(trigger.dataset.photoIdx) || 0;
      const veh = FLEET_LEDGER_ROWS.find((r) => r.id === vehId);
      if (!veh || !veh.photos?.length) return;
      openPhotoLightbox(veh, startIdx);
    });
  });
}

function openPhotoLightbox(veh, initialIndex = 0) {
  let idx = initialIndex;

  dialog({
    wide: true,
    title: `${veh.vehicleModel} (${veh.pax} Seats · ${veh.tierLabel})`,
    body: `<div id="sail-lightbox-root"></div>`,
    onMount: (box) => {
      const root = box.querySelector('#sail-lightbox-root');
      const paintSlide = () => {
        const ph = veh.photos[idx];
        root.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:12px">
            <div style="background:#0A2540;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;min-height:380px;max-height:540px;position:relative">
              <img src="${attr(ph.src)}" alt="${attr(ph.title)}" style="max-width:100%;max-height:520px;object-fit:contain;display:block" />
              <div style="position:absolute;top:12px;left:12px;background:rgba(10,37,64,0.82);color:#FFF;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:600">
                Photo ${idx + 1} of ${veh.photos.length} · ${esc(ph.file)}
              </div>
            </div>

            <div class="row between" style="align-items:center;gap:12px;flex-wrap:wrap">
              <div>
                <div style="font-size:14px;font-weight:600;color:#0A2540">${esc(ph.title)}</div>
                <div style="font-size:12.5px;color:#425466;margin-top:2px">${esc(ph.caption)}</div>
              </div>

              <div class="row" style="gap:8px">
                <button class="sail-btn xs" id="lb-prev" ${veh.photos.length <= 1 ? 'disabled' : ''}>← Previous</button>
                <button class="sail-btn xs" id="lb-next" ${veh.photos.length <= 1 ? 'disabled' : ''}>Next →</button>
                <a class="sail-btn xs primary" href="${attr(ph.src)}" target="_blank" rel="noopener">Open Full Resolution ↗</a>
              </div>
            </div>

            <div class="row" style="gap:8px;padding-top:8px;border-top:1px solid #E3E8EE;overflow-x:auto">
              ${veh.photos.map((thumb, tIdx) => `
                <img src="${attr(thumb.src)}" alt="${attr(thumb.title)}" data-lb-idx="${tIdx}" style="width:76px;height:52px;object-fit:cover;border-radius:5px;cursor:pointer;border:2px solid ${tIdx === idx ? '#635BFF' : 'transparent'};opacity:${tIdx === idx ? '1' : '0.6'}" />
              `).join('')}
            </div>
          </div>
        `;

        root.querySelector('#lb-prev')?.addEventListener('click', () => {
          idx = (idx - 1 + veh.photos.length) % veh.photos.length;
          paintSlide();
        });
        root.querySelector('#lb-next')?.addEventListener('click', () => {
          idx = (idx + 1) % veh.photos.length;
          paintSlide();
        });
        root.querySelectorAll('[data-lb-idx]').forEach((tEl) => {
          tEl.addEventListener('click', () => {
            idx = Number(tEl.dataset.lbIdx) || 0;
            paintSlide();
          });
        });
      };

      paintSlide();
    }
  });
}
