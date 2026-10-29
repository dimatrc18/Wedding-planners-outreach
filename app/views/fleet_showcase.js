// Partner Fleet & Rate Ledger — Stripe Sail Design System
// Displays verified partner vehicles, calculated transfer & standby rates from PDF rate cards,
// Luxury vs. Standard classification, and real vehicle inspection photos.

import { esc, attr, toast, dialog } from '../ui.js';
import * as core from '../../supabase/functions/_shared/core/index.js';

let pricingMode = 'net'; // 'net' | 'vat' (+10% Italian VAT)
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
    vehicleModel: 'Mercedes-Benz Sprinter',
    paxLabel: '12 pax',
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
      mxp_como: { label: 'Aeroporto di Malpensa', net: 350 },
      milano_como: { label: 'Milano Centro / Milano FS', net: 400 },
      lin_como: { label: 'Aeroporto di Linate', net: 400 },
      bgy_como: { label: 'Aeroporto di Bergamo', net: 450 },
      tremezzo: { label: 'Tremezzo', net: 300 },
      bellagio: { label: 'Bellagio', net: 300 }
    },
    standby: {
      dispo_4h: { label: 'Disposizione 4h (100 km inclusi)', net: 500 },
      dispo_8h: { label: 'Disposizione 8h (200 km inclusi)', net: 900 },
      extra_hour: { label: 'Ore Extra', net: 100 },
      extra_wait: { label: 'Attesa extra (>1h aeroporto / >20m hotel)', net: 80 }
    },
    terms: {
      payment: 'Pagamento anticipato vista fattura',
      vat: 'Prezzi IVA 10% esclusa',
      included: 'Carburante, pedaggi autostradali, parcheggi, attesa 1h volo / 20m hotel',
      nightSurcharge: '+20% tra le 22:00 e le 06:00',
      cancellation: '14–28 giorni: 50% rimborso · <14 giorni: nessun rimborso (100% penale)'
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
    vehicleModel: 'Ford Transit Minibus',
    paxLabel: '16 pax',
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
      mxp_como: { label: 'Aeroporto di Malpensa', net: 400 },
      milano_como: { label: 'Milano Centro / Milano FS', net: 450 },
      lin_como: { label: 'Aeroporto di Linate', net: 450 },
      bgy_como: { label: 'Aeroporto di Bergamo', net: 500 },
      tremezzo: { label: 'Tremezzo', net: 350 },
      bellagio: { label: 'Bellagio', net: 350 }
    },
    standby: {
      dispo_4h: { label: 'Disposizione 4h (100 km inclusi)', net: 500 },
      dispo_8h: { label: 'Disposizione 8h (200 km inclusi)', net: 900 },
      extra_hour: { label: 'Ore Extra', net: 100 },
      extra_wait: { label: 'Attesa extra (>1h aeroporto / >20m hotel)', net: 80 }
    },
    terms: {
      payment: 'Pagamento anticipato vista fattura',
      vat: 'Prezzi IVA 10% esclusa',
      included: 'Carburante, pedaggi autostradali, parcheggi, attesa 1h volo / 20m hotel',
      nightSurcharge: '+20% tra le 22:00 e le 06:00',
      cancellation: '14–28 giorni: 50% rimborso · <14 giorni: nessun rimborso (100% penale)'
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
    vehicleModel: 'Mercedes-Benz Sprinter',
    paxLabel: '7–8 pax',
    coachbuilder: '3 Variants: Red (7p) · Standard (8p) · Top VIP (8p)',
    pax: 8,
    tier: 'luxury',
    tierLabel: 'Luxury VIP',
    tierSpec: 'Club tables & ambient lighting ("allestimento speciale")',
    partnerName: 'Avantgarde Limousine Service',
    baseCity: 'Milano (Via Calatafimi 12)',
    contactPerson: 'Vincenzo Lombardi',
    phone: '+39 333 269 7376',
    email: 'info@milanocab.it',
    website: 'https://www.avantgardelimousineservice.it/mezzi/',
    status: 'confirmed',
    statusLabel: 'MXP–MI €250 · MXP–Como €380 · 8h €800 / Top €1,200 (+IVA)',
    repliedAt: '29 Oct 2026 · WA Confirmed',
    ratePdf: null,
    ratePdfName: null,
    transfers: {
      mxp_milano: { label: 'Malpensa (MXP) ⇄ Milano', net: 250 },
      mxp_como: { label: 'Malpensa (MXP) ⇄ Como', net: 380 }
    },
    standby: {
      dispo_8h: { label: 'Disposizione 8h Standard 7–8 Pax (150 km inclusi)', net: 800 },
      dispo_8h_vip: { label: 'Disposizione 8h Top 8 VIP (150 km inclusi)', net: 1200 },
      extra_hour: null,
      extra_wait: null
    },
    terms: {
      payment: 'POS a bordo / Bonifico su fattura',
      vat: 'Prezzi IVA 10% esclusa ("più IVA")',
      included: '150 km inclusi su disposizione 8h · Deposito Milano',
      extra: 'Eventuale ZTL Area C Milano (€97.50)',
      nightSurcharge: null,
      cancellation: null
    },
    photos: [
      {
        id: 'avantgarde_7p_red_ext',
        src: 'assets/partner_fleet/avantgarde/sprinter_7p_red_ext.jpg',
        file: 'sprinter_7p_red_ext.jpg',
        title: 'Exterior — Mercedes Sprinter 7 Pax (Red Interior)',
        caption: 'Total black Mercedes Sprinter configured with VIP Carmine Red leather interior.'
      },
      {
        id: 'avantgarde_7p_red_int_1',
        src: 'assets/partner_fleet/avantgarde/sprinter_7p_red_int_1.jpg',
        file: 'sprinter_7p_red_int_1.jpg',
        title: 'Interior — Carmine Red Diamond-Quilted Leather (7 Pax)',
        caption: 'Luxury diamond-stitched red leather armchairs with individual headrests.'
      },
      {
        id: 'avantgarde_7p_red_int_2',
        src: 'assets/partner_fleet/avantgarde/sprinter_7p_red_int_2.jpg',
        file: 'sprinter_7p_red_int_2.jpg',
        title: 'Interior Cabin — Red Seats & Wood-Tone Deck (7 Pax)',
        caption: 'Spacious passenger cabin with wide aisle and ambient mood lighting.'
      },
      {
        id: 'avantgarde_7p_red_int_3',
        src: 'assets/partner_fleet/avantgarde/sprinter_7p_red_int_3.jpg',
        file: 'sprinter_7p_red_int_3.jpg',
        title: 'Interior — Rear Reclining Seats & Privacy Curtains (7 Pax)',
        caption: 'Rear cabin view with pleated privacy curtains and deep luggage boot behind.'
      },
      {
        id: 'avantgarde_8p_bw_ext_1',
        src: 'assets/partner_fleet/avantgarde/sprinter_8p_bw_ext_1.jpg',
        file: 'sprinter_8p_bw_ext_1.jpg',
        title: 'Exterior — Mercedes Sprinter 8 Pax Executive (Side View)',
        caption: 'High-roof total black Sprinter (8 passenger seats + driver).'
      },
      {
        id: 'avantgarde_8p_bw_ext_2',
        src: 'assets/partner_fleet/avantgarde/sprinter_8p_bw_ext_2.jpg',
        file: 'sprinter_8p_bw_ext_2.jpg',
        title: 'Exterior — Mercedes Sprinter 8 Pax (Front Quarter)',
        caption: 'Discreet unbranded black exterior suitable for VIP weddings and diplomatic delegations.'
      },
      {
        id: 'avantgarde_8p_bw_int_tv',
        src: 'assets/partner_fleet/avantgarde/sprinter_8p_bw_int_tv.jpg',
        file: 'sprinter_8p_bw_int_tv.jpg',
        title: 'Interior — Black & White Two-Tone Leather with TV Partition',
        caption: 'Forward cabin bulkhead with multimedia flat screen TV and soundbar.'
      },
      {
        id: 'avantgarde_8p_bw_int_2',
        src: 'assets/partner_fleet/avantgarde/sprinter_8p_bw_int_2.jpg',
        file: 'sprinter_8p_bw_int_2.jpg',
        title: 'Interior — Conference Armchairs with Executive Tables',
        caption: 'Conference club seating facing center console table with cup holders.'
      },
      {
        id: 'avantgarde_8p_top_vip_video',
        src: 'assets/partner_fleet/avantgarde/sprinter_8p_top_vip_video.mp4',
        file: 'sprinter_8p_top_vip_video.mp4',
        title: 'Video Walkthrough — Sprinter Top 8 VIP (Allestimento Speciale)',
        caption: 'Video walkthrough of the Top 8 Pax VIP trim (€1,200 / 8h + IVA).'
      }
    ]
  },
  {
    id: 'avantgarde_minibus_18',
    partnerId: 'partner_1792765279535_l9ei',
    vehicleModel: 'Mercedes-Benz Minibus',
    paxLabel: '20 pax',
    coachbuilder: 'Executive Coach Conversion (2x Units · WA Verified)',
    pax: 20,
    tier: 'luxury',
    tierLabel: 'Luxury VIP',
    tierSpec: 'Leather reclining seats · Panoramic glass · Overhead luggage racks',
    partnerName: 'Avantgarde Limousine Service',
    baseCity: 'Milano (Via Calatafimi 12)',
    contactPerson: 'Vincenzo Lombardi',
    phone: '+39 333 269 7376',
    email: 'info@milanocab.it',
    website: 'https://www.milanocab.it/cars/',
    status: 'confirmed',
    statusLabel: 'MXP €330 · 4h €550 · 8h €950 (+IVA)',
    repliedAt: '28–29 Oct 2026 · WA Confirmed',
    ratePdf: null,
    ratePdfName: null,
    transfers: {
      mxp_milano: { label: 'Malpensa (MXP) ⇄ Milano', net: 330 }
    },
    standby: {
      dispo_4h: { label: 'Disposizione 4h', net: 550 },
      dispo_8h: { label: 'Disposizione 8h', net: 950 },
      extra_hour: null,
      extra_wait: null
    },
    terms: {
      payment: 'POS a bordo / Bonifico su fattura',
      vat: 'Prezzi IVA 10% esclusa ("più IVA")',
      included: '2 unità disponibili · Deposito Milano',
      extra: 'Eventuale ZTL Area C Milano (€97.50)',
      nightSurcharge: null,
      cancellation: null
    },
    photos: [
      {
        id: 'avantgarde_20_ext',
        src: 'assets/partner_fleet/avantgarde/minibus_20p_ext.jpg',
        file: 'minibus_20p_ext.jpg',
        title: 'Exterior — Mercedes Minibus 20 Pax (Total Black)',
        caption: 'Total black Mercedes touring minibus with tinted privacy windows and touring coach door.'
      },
      {
        id: 'avantgarde_20_int_1',
        src: 'assets/partner_fleet/avantgarde/minibus_20p_int_1.jpg',
        file: 'minibus_20p_int_1.jpg',
        title: 'Interior — 20 Passenger High-Back Leather Seats',
        caption: 'Spacious high-back leather seats with 3-point belts, center aisle, and overhead parcel racks.'
      },
      {
        id: 'avantgarde_20_int_ambient',
        src: 'assets/partner_fleet/avantgarde/minibus_20p_int_ambient.jpg',
        file: 'minibus_20p_int_ambient.jpg',
        title: 'Interior — Nighttime Blue LED Mood Lighting',
        caption: 'Interior illuminated with blue ambient ceiling LEDs for evening and late-night guest returns.'
      }
    ]
  },
  {
    id: 'avantgarde_coach_30',
    partnerId: 'partner_1792765279535_l9ei',
    vehicleModel: 'Executive Midibus',
    paxLabel: '30 pax',
    coachbuilder: 'Touring Coach (WA Ext + Int Verified)',
    pax: 30,
    tier: 'luxury',
    tierLabel: 'Luxury VIP',
    tierSpec: 'Panoramic touring glass · High-back reclining seats · Reversing camera & AC',
    partnerName: 'Avantgarde Limousine Service',
    baseCity: 'Milano (Via Calatafimi 12)',
    contactPerson: 'Vincenzo Lombardi',
    phone: '+39 333 269 7376',
    email: 'info@milanocab.it',
    website: 'https://www.avantgardelimousineservice.it/mezzi/',
    status: 'confirmed',
    statusLabel: 'MXP–MI €400 · MXP–Como €500 · 4h €600 · 8h €1,200 (+IVA)',
    repliedAt: '29 Oct 2026 · WA Confirmed',
    ratePdf: null,
    ratePdfName: null,
    transfers: {
      mxp_milano: { label: 'Malpensa (MXP) ⇄ Milano', net: 400 },
      mxp_como: { label: 'Malpensa (MXP) ⇄ Como', net: 500 }
    },
    standby: {
      dispo_4h: { label: 'Disposizione 4h (75 km inclusi)', net: 600 },
      dispo_8h: { label: 'Disposizione 8h (150 km inclusi)', net: 1200 },
      extra_hour: null,
      extra_wait: null
    },
    terms: {
      payment: 'POS a bordo / Bonifico su fattura',
      vat: 'Prezzi IVA 10% esclusa ("più IVA")',
      included: '75 km inclusi su 4h · 150 km inclusi su 8h',
      extra: 'Eventuale ZTL Area C Milano (€97.50)',
      nightSurcharge: null,
      cancellation: null
    },
    photos: [
      {
        id: 'avantgarde_30_ext_side',
        src: 'assets/partner_fleet/avantgarde/coach_30p_ext_side.jpg',
        file: 'coach_30p_ext_side.jpg',
        title: 'Exterior — Executive Touring Midibus 30 Pax (Side Profile)',
        caption: 'Total black executive midibus with deep tinted panoramic side windows.'
      },
      {
        id: 'avantgarde_30_ext_back',
        src: 'assets/partner_fleet/avantgarde/coach_30p_ext_back.jpg',
        file: 'coach_30p_ext_back.jpg',
        title: 'Exterior — 30 Pax Coach (Rear Luggage Boot)',
        caption: 'Large rear luggage compartment for heavy guest suitcases and wedding equipment.'
      },
      {
        id: 'avantgarde_30_int_1',
        src: 'assets/partner_fleet/avantgarde/coach_30p_int_1.jpg',
        file: 'coach_30p_int_1.jpg',
        title: 'Interior — 30 Passenger Reclining Seats & Center Aisle',
        caption: 'High-back touring seats with armrests, cup holders, and durable commercial fabric/leatherette.'
      },
      {
        id: 'avantgarde_30_int_2',
        src: 'assets/partner_fleet/avantgarde/coach_30p_int_2.jpg',
        file: 'coach_30p_int_2.jpg',
        title: 'Interior — Cockpit & Forward Panoramic Windshield',
        caption: 'Clean driver cockpit with microphone for tour leader/guide and panoramic front visibility.'
      },
      {
        id: 'avantgarde_30_int_3',
        src: 'assets/partner_fleet/avantgarde/coach_30p_int_3.jpg',
        file: 'coach_30p_int_3.jpg',
        title: 'Interior — Overhead AC Vents & Reading Lights',
        caption: 'Individual passenger climate control vents and individual reading spots.'
      },
      {
        id: 'avantgarde_30_int_4',
        src: 'assets/partner_fleet/avantgarde/coach_30p_int_4.jpg',
        file: 'coach_30p_int_4.jpg',
        title: 'Interior — Wide Aisle & Rear Cabin Seating',
        caption: 'View toward rear cabin showing deep legroom and overhead parcel storage.'
      }
    ]
  },
  {
    id: 'landway_fleet',
    partnerId: 'partner_1792761170109_96nx',
    vehicleModel: 'Sprinter & GT Coach Fleet',
    paxLabel: '16–54 pax',
    coachbuilder: 'Executive Minibus & GT Coaches',
    pax: 50,
    tier: 'luxury',
    tierLabel: 'Luxury VIP',
    tierSpec: 'Como & Milan depot (Via Gattamelata 34) · Royal Garden Group',
    partnerName: 'Landway Tourism',
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
    transferNote: 'Forwarded to pricing dept (28 Oct).',
    standby: null,
    standbyNote: 'Awaiting B2B rate sheet.',
    terms: null,
    photos: []
  },
  {
    id: 'comolimolux_vclass',
    partnerId: 'partner_1792765279410_2zml',
    vehicleModel: 'Mercedes-Benz V-Class',
    paxLabel: '7 pax',
    coachbuilder: 'Executive Minivan (Overflow Only)',
    pax: 7,
    tier: 'luxury',
    tierLabel: 'Luxury VIP',
    tierSpec: 'Single V-Class operator · Lake Como overflow & referrals',
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
    transferNote: 'Operates 1× V-Class only (asked for bus partner referral).',
    standby: null,
    standbyNote: 'Not applicable.',
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
  return n;
}

function formatEur(amount) {
  return `€${Number(amount).toLocaleString('en-IE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function modeBadgeText(mode) {
  if (mode === 'vat') return 'Gross (+10% VAT)';
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
          <div class="sail-stat-meta">Como Driver (12 &amp; 16p) · Avantgarde (8, 20 &amp; 30p)</div>
        </div>

        <div class="sail-stat-cell">
          <div class="sail-stat-label">
            <span>Malpensa (MXP) ⇄ Como</span>
            <span style="font-size:11px;color:var(--sail-accent);font-weight:600">${esc(modeBadgeText(pricingMode))}</span>
          </div>
          <div class="sail-stat-val">${formatEur(sprinterMxp)} <span style="font-size:14px;font-weight:500;color:var(--sail-muted)">– ${formatEur(transitMxp)}</span></div>
          <div class="sail-stat-meta">Como Driver: €350–€400 · Avantgarde: €380–€500</div>
        </div>

        <div class="sail-stat-cell">
          <div class="sail-stat-label">
            <span>Standby (4h / 8h Disposizione)</span>
            <span style="font-size:11px;color:var(--sail-muted)">Como &amp; Milan Depots</span>
          </div>
          <div class="sail-stat-val">${formatEur(dispo4h)} <span style="font-size:14px;font-weight:500;color:var(--sail-muted)">/ ${formatEur(dispo8h)}</span></div>
          <div class="sail-stat-meta">Como Driver: €500 / €900 · Avantgarde: €550–€600 / €800–€1,200</div>
        </div>

        <div class="sail-stat-cell">
          <div class="sail-stat-label">
            <span>Verified Fleet Media</span>
            <span class="sail-pill info" style="padding:1px 6px;font-size:10.5px">OEM &amp; WhatsApp</span>
          </div>
          <div class="sail-stat-val">25 files <span style="font-size:14px;font-weight:500;color:var(--sail-muted)">· 24 photos + 1 video</span></div>
          <div class="sail-stat-meta">Como Driver (7 photos) · Avantgarde (17 photos + 1 video)</div>
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
              ${veh.photos.map((ph, idx) => {
                const isVid = ph.src && ph.src.endsWith('.mp4');
                return `
                <div class="sail-photo-card" data-open-gallery="${attr(veh.id)}" data-photo-idx="${idx}" title="${isVid ? 'Click to play walkthrough video' : 'Click to enlarge photo'}">
                  ${isVid ? `
                    <div style="height:190px;background:#0A2540;color:#FFF;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
                      <div style="width:48px;height:48px;border-radius:50%;background:#635BFF;display:flex;align-items:center;justify-content:center;font-size:20px;padding-left:3px">▶</div>
                      <span style="font-size:12px;font-weight:600">VIP Walkthrough Video</span>
                    </div>
                  ` : `
                    <img src="${attr(ph.src)}" alt="${attr(ph.title)}" loading="lazy" />
                  `}
                  <div class="sail-photo-meta">
                    <div class="sail-photo-title">${esc(ph.title)}</div>
                    <div class="sail-photo-sub">${esc(ph.caption)}</div>
                    <div style="margin-top:4px;font-size:11px;font-weight:600;color:var(--sail-accent);display:flex;align-items:center;justify-content:space-between">
                      <span>${isVid ? 'Play video' : 'Click to enlarge'}</span>
                      <a href="${attr(ph.src)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:var(--sail-muted);font-weight:500">Raw file ↗</a>
                    </div>
                  </div>
                </div>
              `;
              }).join('')}
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

function renderLedgerRow(row) {
  const hasTransfers = Boolean(row.transfers);
  const hasStandby = Boolean(row.standby);
  const hasPhotos = Array.isArray(row.photos) && row.photos.length > 0;
  const rawWa = (row.phone || '').replace(/[^\d+]/g, '');

  let transferHtml = '';
  if (hasTransfers) {
    const entries = Object.values(row.transfers);
    transferHtml = `
      <div class="sail-rate-grid">
        ${entries.map((t) => {
          const adj = calculateAdjustedPrice(t.net, pricingMode);
          return `
            <span class="sail-rate-route">${esc(t.label)}</span>
            <span class="sail-rate-amt">${formatEur(adj)}</span>
          `;
        }).join('')}
      </div>
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
    const s4 = row.standby.dispo_4h ? calculateAdjustedPrice(row.standby.dispo_4h.net, pricingMode) : null;
    const s8 = row.standby.dispo_8h ? calculateAdjustedPrice(row.standby.dispo_8h.net, pricingMode) : null;
    const s8vip = row.standby.dispo_8h_vip ? calculateAdjustedPrice(row.standby.dispo_8h_vip.net, pricingMode) : null;
    const exH = row.standby.extra_hour ? calculateAdjustedPrice(row.standby.extra_hour.net, pricingMode) : null;
    const exW = row.standby.extra_wait ? calculateAdjustedPrice(row.standby.extra_wait.net, pricingMode) : null;
    standbyHtml = `
      <div class="sail-rate-grid">
        ${s4 !== null ? `<span class="sail-rate-route">${esc(row.standby.dispo_4h.label || '4h Standby')}</span><span class="sail-rate-amt">${formatEur(s4)}</span>` : ''}
        ${s8 !== null ? `<span class="sail-rate-route">${esc(row.standby.dispo_8h.label || '8h Standby')}</span><span class="sail-rate-amt">${formatEur(s8)}</span>` : ''}
        ${s8vip !== null ? `<span class="sail-rate-route">${esc(row.standby.dispo_8h_vip.label || '8h Top VIP')}</span><span class="sail-rate-amt">${formatEur(s8vip)}</span>` : ''}
        ${exH !== null ? `<span class="sail-rate-route">${esc(row.standby.extra_hour.label || 'Ore Extra')}</span><span class="sail-rate-amt">${formatEur(exH)}/h</span>` : ''}
        ${exW !== null ? `<span class="sail-rate-route">${esc(row.standby.extra_wait.label || 'Attesa extra')}</span><span class="sail-rate-amt">${formatEur(exW)}</span>` : ''}
      </div>
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
            ${row.photos.map((ph, idx) => {
              const isVid = ph.src && ph.src.endsWith('.mp4');
              return isVid ? `
                <div class="sail-thumb" data-open-gallery="${attr(row.id)}" data-photo-idx="${idx}" style="display:flex;align-items:center;justify-content:center;background:#0A2540;color:#FFF;font-size:9.5px;font-weight:700;cursor:pointer" title="${attr(ph.title)}">
                  ▶ Video
                </div>
              ` : `
                <img class="sail-thumb" src="${attr(ph.src)}" alt="${attr(ph.title)}" title="${attr(ph.title)} — Click to view" data-open-gallery="${attr(row.id)}" data-photo-idx="${idx}" />
              `;
            }).join('')}
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
          <span class="sail-pill info" style="font-size:11px;padding:1px 7px;font-variant-numeric:tabular-nums"><strong>${esc(row.paxLabel || `${row.pax} pax`)}</strong></span>
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
  if (veh.standby?.dispo_8h_vip) standbyOptions.push({ key: 'dispo_8h_vip', label: `Standby: ${veh.standby.dispo_8h_vip.label}`, net: veh.standby.dispo_8h_vip.net });
  const allServices = [...transferOptions, ...standbyOptions];
  const selService = allServices.find((s) => s.key === calcState.serviceKey) || allServices[allServices.length - 1] || { key: 'dispo_8h', label: '8h Standby', net: 900 };

  const baseNet = selService.net;
  const extraHoursCost = (Number(calcState.extraHours) || 0) * 100;
  const extraWaitCost = (Number(calcState.extraWaitHours) || 0) * 80;
  const subtotalBeforeNight = baseNet + extraHoursCost + extraWaitCost;
  const isComoDriver = veh.partnerId === 'partner_1792765279097_26hr';
  const nightSurcharge = (calcState.nightWindow && isComoDriver) ? Math.round(subtotalBeforeNight * 0.20) : 0;
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
              <option value="avantgarde_coach_30" ${calcState.vehicleId === 'avantgarde_coach_30' ? 'selected' : ''}>Avantgarde · Executive Midibus (30 pax · Milano)</option>
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
          ${isComoDriver ? `
            <label style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--sail-ink);cursor:pointer">
              <input type="checkbox" id="calc-night" ${calcState.nightWindow ? 'checked' : ''}>
              Night service 22:00–06:00 (+20% Como Driver rate sheet)
            </label>
          ` : ''}
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
        const isVid = ph.src && ph.src.endsWith('.mp4');
        root.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:12px">
            <div style="background:#0A2540;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;min-height:380px;max-height:540px;position:relative">
              ${isVid ? `
                <video controls autoplay muted src="${attr(ph.src)}" style="max-width:100%;max-height:520px;display:block"></video>
              ` : `
                <img src="${attr(ph.src)}" alt="${attr(ph.title)}" style="max-width:100%;max-height:520px;object-fit:contain;display:block" />
              `}
              <div style="position:absolute;top:12px;left:12px;background:rgba(10,37,64,0.82);color:#FFF;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:600">
                ${isVid ? 'Video' : 'Photo'} ${idx + 1} of ${veh.photos.length} · ${esc(ph.file)}
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
                <a class="sail-btn xs primary" href="${attr(ph.src)}" target="_blank" rel="noopener">Open ${isVid ? 'Video' : 'Full Resolution'} ↗</a>
              </div>
            </div>

            <div class="row" style="gap:8px;padding-top:8px;border-top:1px solid #E3E8EE;overflow-x:auto">
              ${veh.photos.map((thumb, tIdx) => {
                const isThumbVid = thumb.src && thumb.src.endsWith('.mp4');
                return isThumbVid ? `
                  <div data-lb-idx="${tIdx}" style="width:76px;height:52px;background:#0A2540;color:#FFF;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;cursor:pointer;border:2px solid ${tIdx === idx ? '#635BFF' : 'transparent'};opacity:${tIdx === idx ? '1' : '0.6'}">
                    ▶ Video
                  </div>
                ` : `
                  <img src="${attr(thumb.src)}" alt="${attr(thumb.title)}" data-lb-idx="${tIdx}" style="width:76px;height:52px;object-fit:cover;border-radius:5px;cursor:pointer;border:2px solid ${tIdx === idx ? '#635BFF' : 'transparent'};opacity:${tIdx === idx ? '1' : '0.6'}" />
                `;
              }).join('')}
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
