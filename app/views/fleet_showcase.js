// Partner Fleet & Rate Ledger — Stripe Sail Design System
// Displays verified partner vehicles, calculated transfer & standby rates from PDF rate cards,
// Luxury vs. Standard classification, and real vehicle inspection photos.

import { esc, attr, toast, dialog } from '../ui.js';
import * as core from '../../supabase/functions/_shared/core/index.js';

let pricingMode = 'net'; // 'net' | 'vat' (+10% Italian VAT)
let activeTab = 'all'; // 'all' | 'confirmed' | 'luxury' | 'standard' | 'pending'
let searchQuery = '';

// Service, Route & Vehicle Taxonomy for Multi-Tier Trip Calculator
export const ROUTE_CATALOG = {
  transfers: [
    { key: 'mxp_como', label: 'Malpensa (MXP) ⇄ Como', region: 'Lake Como ⇄ Airports' },
    { key: 'lin_como', label: 'Linate (LIN) ⇄ Como', region: 'Lake Como ⇄ Airports' },
    { key: 'bgy_como', label: 'Bergamo (BGY) ⇄ Como', region: 'Lake Como ⇄ Airports' },
    { key: 'mxp_milano', label: 'Malpensa (MXP) ⇄ Milano', region: 'Milan ⇄ Airports' },
    { key: 'milano_como', label: 'Milano Centro / FS ⇄ Como', region: 'Lake Como Excursions & City' },
    { key: 'tremezzo', label: 'Como ⇄ Tremezzo', region: 'Lake Como Excursions & City' },
    { key: 'bellagio', label: 'Como ⇄ Bellagio', region: 'Lake Como Excursions & City' }
  ],
  standby: [
    { key: 'dispo_4h', label: 'Disposizione 4h (Half Day)', desc: '75–100 km included · Standby & local touring' },
    { key: 'dispo_8h', label: 'Disposizione 8h (Full Day)', desc: '150–200 km included · Full-day disposal' },
    { key: 'dispo_8h_vip', label: 'Disposizione 8h Top VIP', desc: '150 km included · Club tables & mood lighting' },
    { key: 'hourly', label: 'Tariffa Oraria (Custom Hours)', desc: 'Hourly disposal at verified vehicle rate' }
  ]
};

// Dynamic Category Taxonomy (Auto-adapts to newly added vehicles in the table)
export function inferCategoryFromPax(pax) {
  const p = Number(pax) || 8;
  if (p <= 4) return 'sedan_3_4';
  if (p <= 8) return 'minivan_7_8';
  if (p <= 16) return 'minibus_12_16';
  if (p <= 22) return 'minibus_20';
  if (p <= 35) return 'coach_30';
  return 'coach_50';
}

export function inferCategoryLabel(cat, pax) {
  switch (cat) {
    case 'sedan_3_4': return `Luxury Sedan (${pax || '3–4'} Pax)`;
    case 'minivan_7_8': return `VIP Minivan (${pax || '7–8'} Pax)`;
    case 'minibus_12_16': return `Executive Minibus (${pax || '12–16'} Pax)`;
    case 'minibus_20': return `Touring Minibus (${pax || '18–22'} Pax)`;
    case 'coach_30': return `Executive Midibus / Coach (${pax || '30'} Pax)`;
    case 'coach_50': return `Full-Size GT Coach (${pax || '50+'} Pax)`;
    default: return `${cat} (${pax || ''} Pax)`;
  }
}

export function getTransportCategories(rows = FLEET_LEDGER_ROWS) {
  const allRows = Array.isArray(rows) && rows.length > 0 ? rows : FLEET_LEDGER_ROWS;
  const paxes = allRows.map((r) => r.pax || 8).filter(Boolean);
  const minPax = paxes.length > 0 ? Math.min(...paxes) : 7;
  const maxPax = paxes.length > 0 ? Math.max(...paxes) : 30;

  const standardLabels = {
    all: { label: `All Transport Types (${minPax}–${maxPax} pax)`, paxRange: `${minPax}–${maxPax} pax`, desc: 'All available vehicles' },
    sedan_3_4: { label: 'Luxury Sedan (3–4 Pax)', paxRange: '3–4 pax', desc: 'Mercedes S-Class & E-Class' },
    minivan_7_8: { label: 'VIP Minivan (7–8 Pax)', paxRange: '7–8 pax', desc: 'Mercedes Sprinter VIP & V-Class' },
    minibus_12_16: { label: 'Executive Minibus (12–16 Pax)', paxRange: '12–16 pax', desc: 'Mercedes Sprinter & Ford Transit' },
    minibus_20: { label: 'Touring Minibus (18–22 Pax)', paxRange: '18–22 pax', desc: 'Mercedes Minibus 20 Pax' },
    coach_30: { label: 'Executive Midibus / Coach (30 Pax)', paxRange: '30 pax', desc: 'Executive Midibus 30 Pax' },
    coach_50: { label: 'Full-Size GT Coach (50+ Pax)', paxRange: '50+ pax', desc: 'Grand Tourismo Coaches' }
  };

  const map = new Map();
  map.set('all', { key: 'all', ...standardLabels.all });

  allRows.forEach((r) => {
    const catKey = r.category || inferCategoryFromPax(r.pax);
    if (!map.has(catKey)) {
      const std = standardLabels[catKey];
      map.set(catKey, {
        key: catKey,
        label: std ? std.label : (r.categoryLabel || inferCategoryLabel(catKey, r.pax)),
        paxRange: std ? std.paxRange : `${r.pax} pax`,
        desc: std ? std.desc : `${r.vehicleModel} category`
      });
    }
  });

  return Array.from(map.values());
}

export const TRANSPORT_CATEGORIES = [
  { key: 'all', label: 'All Transport Types (7–30 pax)', paxRange: '7–30 pax' },
  { key: 'minivan_7_8', label: 'VIP Minivan (7–8 Pax)', paxRange: '7–8 pax', desc: 'Mercedes Sprinter VIP (Avantgarde)' },
  { key: 'minibus_12_16', label: 'Executive Minibus (12–16 Pax)', paxRange: '12–16 pax', desc: 'Mercedes Sprinter & Ford Transit (Como Driver)' },
  { key: 'minibus_20', label: 'Touring Minibus (20 Pax)', paxRange: '20 pax', desc: 'Mercedes Minibus 20 Pax (Avantgarde)' },
  { key: 'coach_30', label: 'Touring Midibus / Coach (30 Pax)', paxRange: '30 pax', desc: 'Executive Midibus 30 Pax (Avantgarde)' }
];

export function getAllTransferRoutes(rows = FLEET_LEDGER_ROWS) {
  const routes = [...ROUTE_CATALOG.transfers];
  const keys = new Set(routes.map((r) => r.key));

  (rows || []).forEach((v) => {
    if (v.transfers && typeof v.transfers === 'object') {
      Object.entries(v.transfers).forEach(([k, t]) => {
        if (!keys.has(k)) {
          keys.add(k);
          routes.push({
            key: k,
            label: t.label || k,
            region: 'Partner Specific Routes'
          });
        }
      });
    }
  });

  return routes;
}

// Expanded State for the Customizable Multi-Tier Trip Calculator
let calcState = {
  serviceType: 'transfer', // 'transfer' | 'standby'
  routeKey: 'mxp_como',
  transportCategory: 'all', // 'all' | any category
  tierFilter: 'all', // 'all' | 'luxury' | 'standard'
  passengerCount: 8,
  vehicleId: 'como_sprinter_12',
  standbyHours: 8, // custom hourly standby duration
  tripDirection: 'one_way', // 'one_way' | 'round_trip' (2x)
  extraHours: 0,
  extraWaitHours: 0,
  includeZtl: false,
  nightWindow: false,
  includeVat: false,
  clientMarkupPct: 25
};

export function selectSpecificVehicle(vehicleId, rows = FLEET_LEDGER_ROWS) {
  const allRows = Array.isArray(rows) && rows.length > 0 ? rows : FLEET_LEDGER_ROWS;
  const veh = allRows.find((r) => r.id === vehicleId);
  if (!veh) return null;
  calcState.vehicleId = veh.id;
  if (veh.category) calcState.transportCategory = veh.category;
  if (veh.tier) calcState.tierFilter = veh.tier;
  if (veh.pax) calcState.passengerCount = veh.pax;

  // Smart service & route adaptation
  if (calcState.serviceType === 'transfer') {
    const hasCurrentRoute = Boolean(veh.transfers && veh.transfers[calcState.routeKey]);
    if (!hasCurrentRoute) {
      if (veh.transfers && Object.keys(veh.transfers).length > 0) {
        calcState.routeKey = Object.keys(veh.transfers)[0];
      } else if (veh.standby) {
        calcState.serviceType = 'standby';
        calcState.routeKey = veh.standby.dispo_8h ? 'dispo_8h' : (veh.standby.hourly ? 'hourly' : 'dispo_4h');
      }
    }
  } else {
    // Standby mode
    const hasCurrentStandby = Boolean(veh.standby && (veh.standby[calcState.routeKey] || (calcState.routeKey === 'hourly' && (veh.standby.hourly || veh.standby.extra_hour))));
    if (!hasCurrentStandby) {
      if (veh.standby) {
        calcState.routeKey = veh.standby.dispo_8h ? 'dispo_8h' : (veh.standby.hourly ? 'hourly' : 'dispo_4h');
      }
    }
  }
  return veh;
}

const PDF_COMO_DRIVER = 'assets/partner_fleet/como_driver/como_driver_rates_2027.pdf';

export const FLEET_LEDGER_ROWS = [
  {
    id: 'como_sprinter_12',
    partnerId: 'partner_1792765279097_26hr',
    vehicleModel: 'Mercedes-Benz Sprinter',
    paxLabel: '12 pax',
    coachbuilder: 'Tomassini Style · Executive Conversion',
    pax: 12,
    category: 'minibus_12_16',
    categoryLabel: 'Executive Minibus (12–16 Pax)',
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
    category: 'minibus_12_16',
    categoryLabel: 'Executive Minibus (12–16 Pax)',
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
    id: 'avantgarde_sprinter_7_red',
    partnerId: 'partner_1792765279535_l9ei',
    vehicleModel: 'Mercedes-Benz Sprinter (Red Interior)',
    paxLabel: '7 pax',
    coachbuilder: 'VIP Diamond Carmine Red Leather Interior',
    pax: 7,
    category: 'minivan_7_8',
    categoryLabel: 'VIP Minivan (7 Pax)',
    tier: 'luxury',
    tierLabel: 'Luxury VIP',
    tierSpec: 'Carmine red leather · Wood-effect deck · Reclining armchairs & curtains',
    partnerName: 'Avantgarde Limousine Service (Milano Cab)',
    baseCity: 'Milano (Via Calatafimi 12)',
    contactPerson: 'Vincenzo Lombardi',
    phone: '+39 333 269 7376',
    email: 'info@milanocab.it',
    website: 'https://www.avantgardelimousineservice.it/mezzi/',
    secondaryWebsite: 'https://www.milanocab.it',
    status: 'confirmed',
    statusLabel: 'MXP–MI €250 · MXP–Como €380 · 8h €800 (+IVA)',
    repliedAt: '29 Oct 2026 · WA Confirmed',
    ratePdf: null,
    ratePdfName: null,
    transfers: {
      mxp_milano: { label: 'Malpensa (MXP) ⇄ Milano', net: 250 },
      mxp_como: { label: 'Malpensa (MXP) ⇄ Como', net: 380 }
    },
    standby: {
      dispo_8h: { label: 'Disposizione 8h (150 km)', net: 800 },
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
      }
    ]
  },
  {
    id: 'avantgarde_sprinter_8_bw',
    partnerId: 'partner_1792765279535_l9ei',
    vehicleModel: 'Mercedes-Benz Sprinter (Black Interior)',
    paxLabel: '8 pax',
    coachbuilder: 'Executive Black & White Leather with Multimedia Partition',
    pax: 8,
    category: 'minivan_7_8',
    categoryLabel: 'VIP Minivan (8 Pax)',
    tier: 'luxury',
    tierLabel: 'Luxury VIP',
    tierSpec: 'Conference club armchairs · TV bulkhead partition · Center console tables',
    partnerName: 'Avantgarde Limousine Service (Milano Cab)',
    baseCity: 'Milano (Via Calatafimi 12)',
    contactPerson: 'Vincenzo Lombardi',
    phone: '+39 333 269 7376',
    email: 'info@milanocab.it',
    website: 'https://www.avantgardelimousineservice.it/mezzi/',
    secondaryWebsite: 'https://www.milanocab.it',
    status: 'confirmed',
    statusLabel: 'MXP–MI €250 · MXP–Como €380 · 8h €800 (+IVA)',
    repliedAt: '29 Oct 2026 · WA Confirmed',
    ratePdf: null,
    ratePdfName: null,
    transfers: {
      mxp_milano: { label: 'Malpensa (MXP) ⇄ Milano', net: 250 },
      mxp_como: { label: 'Malpensa (MXP) ⇄ Como', net: 380 }
    },
    standby: {
      dispo_8h: { label: 'Disposizione 8h (150 km)', net: 800 },
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
      }
    ]
  },
  {
    id: 'avantgarde_sprinter_8_top_vip',
    partnerId: 'partner_1792765279535_l9ei',
    vehicleModel: 'Mercedes-Benz Sprinter Top VIP',
    paxLabel: '8 pax',
    coachbuilder: 'Top Luxury Custom VIP (Allestimento Speciale · Video Verified)',
    pax: 8,
    category: 'minivan_7_8',
    categoryLabel: 'VIP Minivan (8 Pax Top)',
    tier: 'luxury',
    tierLabel: 'Luxury VIP',
    tierSpec: 'Top VIP allestimento speciale · Video walkthrough · €140/h + IVA (8h €1,200 + IVA)',
    partnerName: 'Avantgarde Limousine Service (Milano Cab)',
    baseCity: 'Milano (Via Calatafimi 12)',
    contactPerson: 'Vincenzo Lombardi',
    phone: '+39 333 269 7376',
    email: 'info@milanocab.it',
    website: 'https://www.avantgardelimousineservice.it/mezzi/',
    secondaryWebsite: 'https://www.milanocab.it',
    status: 'confirmed',
    statusLabel: '€140/h + IVA (8h €1,200 + IVA) · Top VIP Allestimento Speciale',
    repliedAt: '29 Oct 2026 · WA Confirmed',
    ratePdf: null,
    ratePdfName: null,
    transfers: {
      mxp_milano: { label: 'Malpensa (MXP) ⇄ Milano', net: 250 },
      mxp_como: { label: 'Malpensa (MXP) ⇄ Como', net: 380 }
    },
    standby: {
      hourly: { label: 'Tariffa oraria a disposizione', net: 140 },
      dispo_4h: { label: 'Disposizione 4h', net: 560 },
      dispo_8h: { label: 'Disposizione 8h (150 km)', net: 1200 },
      extra_hour: { label: 'Ore Extra', net: 140 },
      extra_wait: { label: 'Attesa extra', net: 140 }
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
        id: 'avantgarde_8p_top_vip_video',
        src: 'assets/partner_fleet/avantgarde/top_8_pax.mp4',
        file: 'top 8 pax.mp4',
        title: 'Video Walkthrough — Sprinter Top 8 VIP (Allestimento Speciale)',
        caption: 'Full HD video walkthrough of the Mercedes-Benz Sprinter Top 8 VIP trim (€140/h + IVA · €1,200 / 8h + IVA).'
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
    category: 'minibus_20',
    categoryLabel: 'Touring Minibus (20 Pax)',
    tier: 'luxury',
    tierLabel: 'Luxury VIP',
    tierSpec: 'Leather reclining seats · Panoramic glass · Overhead luggage racks',
    partnerName: 'Avantgarde Limousine Service (Milano Cab)',
    baseCity: 'Milano (Via Calatafimi 12)',
    contactPerson: 'Vincenzo Lombardi',
    phone: '+39 333 269 7376',
    email: 'info@milanocab.it',
    website: 'https://www.avantgardelimousineservice.it/mezzi/',
    secondaryWebsite: 'https://www.milanocab.it',
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
    category: 'coach_30',
    categoryLabel: 'Touring Midibus / Coach (30 Pax)',
    tier: 'luxury',
    tierLabel: 'Luxury VIP',
    tierSpec: 'Panoramic touring glass · High-back reclining seats · Reversing camera & AC',
    partnerName: 'Avantgarde Limousine Service (Milano Cab)',
    baseCity: 'Milano (Via Calatafimi 12)',
    contactPerson: 'Vincenzo Lombardi',
    phone: '+39 333 269 7376',
    email: 'info@milanocab.it',
    website: 'https://www.avantgardelimousineservice.it/mezzi/',
    secondaryWebsite: 'https://www.milanocab.it',
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
      dispo_4h: { label: 'Disposizione 4h (75 km)', net: 600 },
      dispo_8h: { label: 'Disposizione 8h (150 km)', net: 1200 },
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

// Persistent Custom & Newly Added Fleet Storage (Keeps table & calculator in sync)
const STORAGE_KEY_CUSTOM_VEHICLES = 'dorogo_custom_fleet_vehicles';

export function loadCustomVehicles() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_VEHICLES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

export function saveCustomVehicle(veh) {
  if (typeof localStorage === 'undefined') return;
  try {
    const existing = loadCustomVehicles();
    const idx = existing.findIndex((v) => v.id === veh.id);
    if (idx >= 0) {
      existing[idx] = veh;
    } else {
      existing.unshift(veh);
    }
    localStorage.setItem(STORAGE_KEY_CUSTOM_VEHICLES, JSON.stringify(existing));
    syncFleetLedgerRows();
  } catch (_) {}
}

export function deleteCustomVehicle(vehId) {
  if (typeof localStorage === 'undefined') return;
  try {
    const existing = loadCustomVehicles();
    const filtered = existing.filter((v) => v.id !== vehId);
    localStorage.setItem(STORAGE_KEY_CUSTOM_VEHICLES, JSON.stringify(filtered));
    const idx = FLEET_LEDGER_ROWS.findIndex((r) => r.id === vehId);
    if (idx >= 0) {
      FLEET_LEDGER_ROWS.splice(idx, 1);
    }
    if (calcState.vehicleId === vehId) {
      calcState.vehicleId = FLEET_LEDGER_ROWS[0]?.id || null;
    }
  } catch (_) {}
}

export function syncFleetLedgerRows() {
  const custom = loadCustomVehicles();
  custom.forEach((cv) => {
    const existingIdx = FLEET_LEDGER_ROWS.findIndex((r) => r.id === cv.id);
    if (existingIdx >= 0) {
      FLEET_LEDGER_ROWS[existingIdx] = cv;
    } else {
      FLEET_LEDGER_ROWS.unshift(cv);
    }
  });
}

export function addVehicleToFleet(veh) {
  if (!veh.id) {
    veh.id = 'veh_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  }
  if (!veh.pax) veh.pax = 8;
  if (!veh.paxLabel) veh.paxLabel = `${veh.pax} pax`;
  if (!veh.category) veh.category = inferCategoryFromPax(veh.pax);
  if (!veh.categoryLabel) veh.categoryLabel = inferCategoryLabel(veh.category, veh.pax);
  if (!veh.tier) veh.tier = 'luxury';
  if (!veh.tierLabel) veh.tierLabel = veh.tier === 'standard' ? 'Standard Shuttle' : 'Luxury VIP';
  if (!veh.status) veh.status = 'confirmed';
  if (!veh.statusLabel) veh.statusLabel = veh.status === 'confirmed' ? 'Rates Verified in Table' : 'Pending Rate Sheet';
  if (!veh.photos) veh.photos = [];
  veh.isCustom = true;

  saveCustomVehicle(veh);
  const existingIdx = FLEET_LEDGER_ROWS.findIndex((r) => r.id === veh.id);
  if (existingIdx >= 0) {
    FLEET_LEDGER_ROWS[existingIdx] = veh;
  } else {
    FLEET_LEDGER_ROWS.unshift(veh);
  }
  return veh;
}

// Ensure custom vehicles are synced into FLEET_LEDGER_ROWS
syncFleetLedgerRows();

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

export function formatPriceWithUnit(amt, unit = '') {
  if (amt === null || amt === undefined || amt === 0 || amt === '0' || isNaN(Number(amt))) {
    return '?';
  }
  return `€${Number(amt).toLocaleString('en-IE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${unit}`;
}

export function formatEur(amount) {
  return formatPriceWithUnit(amount, '');
}

function modeBadgeText(mode) {
  if (mode === 'vat') return 'Gross (+10% VAT)';
  return 'Net B2B';
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

  const totalPhotos = FLEET_LEDGER_ROWS.reduce((acc, r) => acc + (r.photos ? r.photos.filter((p) => !p.src.endsWith('.mp4')).length : 0), 0);
  const totalVideos = FLEET_LEDGER_ROWS.reduce((acc, r) => acc + (r.photos ? r.photos.filter((p) => p.src.endsWith('.mp4')).length : 0), 0);
  const comoPhotos = FLEET_LEDGER_ROWS.filter(r => r.partnerId === 'partner_1792765279097_26hr').reduce((acc, r) => acc + (r.photos?.length || 0), 0);
  const avantgardePhotos = FLEET_LEDGER_ROWS.filter(r => r.partnerId === 'partner_1792765279535_l9ei').reduce((acc, r) => acc + (r.photos ? r.photos.filter(p => !p.src.endsWith('.mp4')).length : 0), 0);

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
          <button class="sail-btn primary" id="btn-open-add-vehicle" style="gap:5px;font-weight:600">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v12M2 8h12"/></svg>
            Add Vehicle to Table
          </button>
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
          <div class="sail-stat-meta">Como Driver (12 &amp; 16p) · Avantgarde (7, 8, 20 &amp; 30p)</div>
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
          <div class="sail-stat-val">${totalPhotos + totalVideos} files <span style="font-size:14px;font-weight:500;color:var(--sail-muted)">· ${totalPhotos} photos + ${totalVideos} video</span></div>
          <div class="sail-stat-meta">Como Driver (${comoPhotos} photos) · Avantgarde (${avantgardePhotos} photos + ${totalVideos} video)</div>
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

        <!-- Primary Stripe Data Table (Single-screen fit, zero horizontal swipe) -->
        <div class="sail-table-wrap">
          <table class="sail-table" style="table-layout:fixed;width:100%">
            <thead>
              <tr>
                <th style="width:15%">
                  <div class="sail-th-title">Vehicle &amp; Capacity</div>
                </th>
                <th style="width:11%">
                  <div class="sail-th-title">Class Tier</div>
                </th>
                <th style="width:17%">
                  <div class="sail-th-title">Partner &amp; Contact</div>
                </th>
                <th style="width:22%">
                  <div class="sail-th-title">Transfer Rates</div>
                  <div class="sail-th-sub">${esc(pricingMode === 'vat' ? 'Gross (+10% VAT)' : 'Net B2B')}</div>
                </th>
                <th style="width:19%">
                  <div class="sail-th-title">Standby / Disposizione</div>
                  <div class="sail-th-sub">Hourly &amp; Daily</div>
                </th>
                <th style="width:16%">
                  <div class="sail-th-title">Photos &amp; Rate Sheet</div>
                </th>
              </tr>
            </thead>
            <tbody>
              ${filteredRows.map((row) => renderLedgerRow(row)).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Bottom Section: Customizable Multi-Tier Trip Calculator -->
      <div style="margin-bottom:16px">
        ${renderPriceCalculatorCard()}
      </div>

      <!-- PDF Contract Terms -->
      <div>
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
            <span class="sail-rate-route" title="${attr(t.label)}">${esc(t.label)}</span>
            <span class="sail-rate-amt">${formatEur(adj)}</span>
          `;
        }).join('')}
      </div>
    `;
  } else {
    transferHtml = `
      <div style="display:flex;flex-direction:column;gap:3px">
        <span class="sail-pill missing" style="width:fit-content;font-size:10.5px">Not provided</span>
        <span style="font-size:11px;color:var(--sail-muted);line-height:1.3">${esc(row.transferNote || 'No transfer rate sheet submitted yet.')}</span>
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
        ${s4 !== null ? `<span class="sail-rate-route" title="${attr(row.standby.dispo_4h.label || '4h Standby')}">${esc(row.standby.dispo_4h.label || '4h Standby')}</span><span class="sail-rate-amt">${formatPriceWithUnit(s4)}</span>` : ''}
        ${s8 !== null ? `<span class="sail-rate-route" title="${attr(row.standby.dispo_8h.label || '8h Standby')}">${esc(row.standby.dispo_8h.label || '8h Standby')}</span><span class="sail-rate-amt">${formatPriceWithUnit(s8)}</span>` : ''}
        ${s8vip !== null ? `<span class="sail-rate-route" title="${attr(row.standby.dispo_8h_vip.label || '8h Top VIP')}">${esc(row.standby.dispo_8h_vip.label || '8h Top VIP')}</span><span class="sail-rate-amt">${formatPriceWithUnit(s8vip)}</span>` : ''}
        ${exH !== null ? `<span class="sail-rate-route" title="${attr(row.standby.extra_hour.label || 'Ore Extra')}">${esc(row.standby.extra_hour.label || 'Ore Extra')}</span><span class="sail-rate-amt">${formatPriceWithUnit(exH, '/h')}</span>` : ''}
        ${exW !== null ? `<span class="sail-rate-route" title="${attr(row.standby.extra_wait.label || 'Attesa extra')}">${esc(row.standby.extra_wait.label || 'Attesa extra')}</span><span class="sail-rate-amt">${formatPriceWithUnit(exW)}</span>` : ''}
      </div>
    `;
  } else {
    standbyHtml = `
      <div style="display:flex;flex-direction:column;gap:3px">
        <span class="sail-pill missing" style="width:fit-content;font-size:10.5px">Not provided</span>
        <span style="font-size:11px;color:var(--sail-muted);line-height:1.3">${esc(row.standbyNote || 'No standby rates submitted yet.')}</span>
      </div>
    `;
  }

  let mediaHtml = '';
  if (hasPhotos || row.ratePdf) {
    mediaHtml = `
      <div style="display:flex;flex-direction:column;gap:5px">
        ${hasPhotos ? `
          <div class="sail-thumb-strip">
            ${row.photos.slice(0, 3).map((ph, idx) => {
              const isVid = ph.src && ph.src.endsWith('.mp4');
              return isVid ? `
                <div class="sail-thumb" data-open-gallery="${attr(row.id)}" data-photo-idx="${idx}" style="display:flex;align-items:center;justify-content:center;background:#0A2540;color:#FFF;font-size:8.5px;font-weight:700;cursor:pointer" title="${attr(ph.title)}">
                  ▶ Vid
                </div>
              ` : `
                <img class="sail-thumb" src="${attr(ph.src)}" alt="${attr(ph.title)}" title="${attr(ph.title)} — Click to view" data-open-gallery="${attr(row.id)}" data-photo-idx="${idx}" />
              `;
            }).join('')}
            ${row.photos.length > 3 ? `
              <div class="sail-thumb sail-thumb-more" data-open-gallery="${attr(row.id)}" data-photo-idx="3" title="View all ${row.photos.length} photos">
                +${row.photos.length - 3}
              </div>
            ` : ''}
          </div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
            ${(() => {
              const videoCount = row.photos.filter((p) => p.src && p.src.endsWith('.mp4')).length;
              const photoCount = row.photos.length - videoCount;
              let viewBtnText = `View ${row.photos.length} photos`;
              if (photoCount === 0 && videoCount > 0) {
                viewBtnText = videoCount === 1 ? '▶ Watch video' : `▶ Watch ${videoCount} videos`;
              } else if (photoCount > 0 && videoCount > 0) {
                viewBtnText = `View ${photoCount} photos + ${videoCount} vid`;
              }
              return `
                <button class="sail-btn xs primary" data-open-gallery="${attr(row.id)}" data-photo-idx="0" style="padding:0 6px;height:23px;font-size:11px">
                  ${esc(viewBtnText)}
                </button>
              `;
            })()}
            ${row.ratePdf ? `
              <a class="sail-btn xs" href="${attr(row.ratePdf)}" target="_blank" rel="noopener" style="padding:0 6px;height:23px;font-size:11px" title="Open original PDF rate sheet">
                PDF ↗
              </a>
            ` : ''}
          </div>
        ` : `<span class="sail-pill missing" style="font-size:10px">No photos</span>`}
      </div>
    `;
  } else {
    mediaHtml = `
      <div style="display:flex;flex-direction:column;gap:3px">
        <span class="sail-pill missing" style="width:fit-content;font-size:10px">No photos provided</span>
        <span style="font-size:11px;color:var(--sail-muted)">Rate sheet PDF not provided</span>
      </div>
    `;
  }

  const isActiveInCalc = calcState.vehicleId === row.id;

  return `
    <tr class="${isActiveInCalc ? 'sail-table-row-active' : ''}">
      <td>
        <div style="font-weight:600;color:var(--sail-ink);font-size:12.5px;line-height:1.25">${esc(row.vehicleModel)}</div>
        <div style="margin-top:3px;display:flex;align-items:center;gap:4px;flex-wrap:wrap">
          <span class="sail-pill info" style="font-size:10.5px;padding:1px 6px;font-variant-numeric:tabular-nums"><strong>${esc(row.paxLabel || `${row.pax} pax`)}</strong></span>
          ${isActiveInCalc ? `<span class="sail-pill ok" style="font-size:10px;padding:1px 5px">Active in Calc</span>` : ''}
          <details style="font-size:11px;color:var(--sail-muted)">
            <summary style="cursor:pointer;user-select:none;font-weight:500;color:var(--sail-body)">Specs</summary>
            <div style="margin-top:4px;line-height:1.3;color:var(--sail-muted);font-size:10.5px">
              <div><strong>${esc(row.coachbuilder)}</strong></div>
              <div style="margin-top:2px">${esc(row.tierSpec)}</div>
            </div>
          </details>
        </div>
        <div style="margin-top:5px;display:flex;align-items:center;gap:4px;flex-wrap:wrap">
          <button class="sail-btn xs ${isActiveInCalc ? 'primary' : ''}" data-quote-veh="${attr(row.id)}" style="padding:0 7px;height:22px;font-size:11px;font-weight:600;white-space:nowrap" title="Calculate trip quote for this exact vehicle">
            ${isActiveInCalc ? '✓ In Calculator' : '⚡ Quote'}
          </button>
          ${row.isCustom ? `
            <button class="sail-btn xs" data-delete-custom-veh="${attr(row.id)}" style="padding:0 5px;height:22px;font-size:10px;color:#B91C1C;border-color:#FCA5A5" title="Remove custom vehicle from table">
              ✕
            </button>
          ` : ''}
        </div>
      </td>

      <td>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start">
          <select class="sail-tier-select ${row.tier === 'luxury' ? 'lux' : 'std'}" data-tier-select="${attr(row.id)}" title="Switch between Luxury VIP and Standard Shuttle">
            <option value="luxury" ${row.tier === 'luxury' ? 'selected' : ''}>Luxury VIP</option>
            <option value="standard" ${row.tier === 'standard' ? 'selected' : ''}>Standard Shuttle</option>
          </select>
          <span class="sail-pill ${row.status === 'confirmed' ? 'ok' : 'info'}" style="font-size:10px;padding:1px 5px">
            ${esc(row.status === 'confirmed' ? 'Verified' : 'Pending')}
          </span>
        </div>
      </td>

      <td>
        <div style="font-weight:600;color:var(--sail-ink);font-size:12.5px;line-height:1.25">
          ${row.website ? `<a href="${attr(row.website)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;border-bottom:1px dotted #94A3B8" title="Open partner fleet website">${esc(row.partnerName)} ↗</a>` : esc(row.partnerName)}
        </div>
        ${row.secondaryWebsite ? `
          <div style="font-size:10.5px;color:var(--sail-muted);margin-top:2px">
            Limo: <a href="${attr(row.secondaryWebsite)}" target="_blank" rel="noopener" style="color:var(--sail-muted);text-decoration:underline" title="Milano Cab website">milanocab.it ↗</a>
          </div>
        ` : ''}
        <div style="font-size:11px;color:var(--sail-body);margin-top:2px">${esc(row.baseCity)} · ${esc(row.contactPerson)}</div>
        <div class="row" style="gap:4px;margin-top:4px;font-size:11px;flex-wrap:wrap">
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

export function getMatchingVehicles(state, rows = FLEET_LEDGER_ROWS) {
  const allRows = Array.isArray(rows) && rows.length > 0 ? rows : FLEET_LEDGER_ROWS;
  return allRows.filter((v) => {
    // If a specific vehicle is explicitly chosen by the user, ALWAYS keep it matched
    if (state.vehicleId && v.id === state.vehicleId) return true;

    // Filter by transport category if not 'all'
    const cat = v.category || inferCategoryFromPax(v.pax);
    if (state.transportCategory !== 'all' && cat !== state.transportCategory) return false;

    // Filter by class tier if not 'all'
    if (state.tierFilter !== 'all' && v.tier !== state.tierFilter) return false;

    // Match service availability
    if (state.serviceType === 'transfer') {
      return Boolean(v.transfers && v.transfers[state.routeKey]);
    } else {
      if (state.routeKey === 'hourly') {
        return Boolean(v.standby?.hourly || v.standby?.extra_hour || v.standby?.dispo_8h);
      }
      return Boolean(v.standby && v.standby[state.routeKey]);
    }
  });
}

export function calculateTripQuote(state, rows = FLEET_LEDGER_ROWS) {
  const allRows = Array.isArray(rows) && rows.length > 0 ? rows : FLEET_LEDGER_ROWS;
  const matching = getMatchingVehicles(state, allRows);
  let veh = allRows.find((r) => r.id === state.vehicleId);
  if (!veh && matching.length > 0) {
    veh = matching[0];
    state.vehicleId = veh.id;
  }

  if (!veh) {
    return {
      veh: null,
      matching,
      baseNet: 0,
      serviceLabel: 'No matching vehicles for current filters',
      unitNet: 0,
      extraHoursCost: 0,
      extraWaitCost: 0,
      ztlCost: 0,
      nightSurcharge: 0,
      totalNetB2B: 0,
      vatAmount: 0,
      totalPartnerCost: 0,
      clientQuote: 0,
      netMargin: 0,
      perGuestQuote: '0.00',
      perGuestCost: '0.00',
      guests: state.passengerCount || 1,
      isComoDriver: false
    };
  }

  let unitNet = 0;
  let serviceLabel = '';
  if (state.serviceType === 'transfer') {
    const t = veh.transfers?.[state.routeKey];
    const allRoutes = getAllTransferRoutes(allRows);
    const routeObj = allRoutes.find((r) => r.key === state.routeKey);
    const routeName = routeObj ? routeObj.label : state.routeKey;

    if (t) {
      unitNet = t.net;
      serviceLabel = `${routeName} (${state.tripDirection === 'round_trip' ? 'Round Trip 2×' : 'One-Way 1×'})`;
    } else {
      const hourlyFallback = veh.standby?.hourly?.net || (typeof veh.standby?.extra_hour === 'number' ? veh.standby.extra_hour : 140);
      unitNet = 0;
      serviceLabel = `${routeName} (Quote on Request · Tariff: €${hourlyFallback}/h)`;
    }
  } else {
    // Standby mode
    if (state.routeKey === 'hourly') {
      const hourlyNet = veh.standby?.hourly?.net || (typeof veh.standby?.extra_hour === 'number' ? veh.standby.extra_hour : (veh.standby?.dispo_8h ? Math.round(veh.standby.dispo_8h.net / 8) : 140));
      const hours = Math.max(1, Number(state.standbyHours) || 8);
      unitNet = hourlyNet * hours;
      serviceLabel = `Disposizione Oraria (${hours}h @ €${hourlyNet}/h)`;
    } else {
      const s = veh.standby?.[state.routeKey] || (state.routeKey === 'dispo_8h_vip' ? veh.standby?.dispo_8h : null);
      unitNet = s ? s.net : 0;
      const standbyObj = ROUTE_CATALOG.standby.find((r) => r.key === state.routeKey);
      serviceLabel = standbyObj ? standbyObj.label : (s ? s.label : state.routeKey);
    }
  }

  const baseNet = (state.serviceType === 'transfer' && state.tripDirection === 'round_trip') ? unitNet * 2 : unitNet;

  const isComoDriver = veh.partnerId === 'partner_1792765279097_26hr';
  const extraHourRate = (veh.standby?.extra_hour && typeof veh.standby.extra_hour.net === 'number')
    ? veh.standby.extra_hour.net
    : (typeof veh.standby?.extra_hour === 'number' ? veh.standby.extra_hour : 100);
  const extraHoursCost = (Number(state.extraHours) || 0) * extraHourRate;

  const extraWaitRate = (veh.standby?.extra_wait && typeof veh.standby.extra_wait.net === 'number')
    ? veh.standby.extra_wait.net
    : (typeof veh.standby?.extra_wait === 'number' ? veh.standby.extra_wait : 80);
  const extraWaitCost = (Number(state.extraWaitHours) || 0) * extraWaitRate;

  const ztlCost = (state.includeZtl && (veh.id === 'avantgarde_coach_30' || state.routeKey === 'mxp_milano')) ? 97.50 : 0;

  const subtotalBeforeNight = baseNet + extraHoursCost + extraWaitCost + ztlCost;
  const nightSurcharge = state.nightWindow ? Math.round(subtotalBeforeNight * 0.20) : 0;
  const totalNetB2B = subtotalBeforeNight + nightSurcharge;
  const vatAmount = state.includeVat ? Math.round(totalNetB2B * 0.10) : 0;
  const totalPartnerCost = totalNetB2B + vatAmount;

  const guests = Math.max(1, Number(state.passengerCount) || veh.pax || 1);
  const clientQuote = Math.round(totalPartnerCost * (1 + (Number(state.clientMarkupPct) || 0) / 100));
  const netMargin = clientQuote - totalPartnerCost;
  const perGuestQuote = (clientQuote / guests).toFixed(2);
  const perGuestCost = (totalPartnerCost / guests).toFixed(2);

  return {
    veh,
    matching,
    unitNet,
    baseNet,
    serviceLabel,
    extraHoursCost,
    extraWaitCost,
    ztlCost,
    nightSurcharge,
    totalNetB2B,
    vatAmount,
    totalPartnerCost,
    clientQuote,
    netMargin,
    perGuestQuote,
    perGuestCost,
    guests,
    isComoDriver
  };
}

function generateProposalText(quote, state) {
  if (!quote.veh) return '';
  const v = quote.veh;
  const lines = [
    `DOROGO Private Transportation — Trip Quotation`,
    `──────────────────────────────────────────────`,
    `Service Type: ${state.serviceType === 'transfer' ? 'Airport & City Transfer' : 'Hourly Disposal (Standby)'}`,
    `Route / Tariff: ${quote.serviceLabel}`,
    `Vehicle: ${v.vehicleModel} (${v.pax} Seats · ${v.tierLabel})`,
    `Category: ${v.categoryLabel || 'Executive Transport'}`,
    `Specs: ${v.tierSpec || 'Total Black VIP'}`,
    `Fleet Partner: ${v.partnerName}`,
    `Party Size: ${state.passengerCount} Guests`,
    state.serviceType === 'transfer' ? `Direction: ${state.tripDirection === 'round_trip' ? 'Round Trip (2× transfers included)' : 'One-Way Transfer'}` : null,
    (state.serviceType === 'standby' && state.routeKey === 'hourly') ? `Standby Duration: ${state.standbyHours || 8} Hours` : null,
    state.extraHours > 0 ? `Additional Standby: +${state.extraHours} hour(s) (€100/h)` : null,
    state.extraWaitHours > 0 ? `Extra Airport Waiting: +${state.extraWaitHours} hour(s) (€80/h)` : null,
    state.includeZtl ? `Milan Area C ZTL Permit: Included (€97.50)` : null,
    state.nightWindow ? `Night Window Surcharge (22:00–06:00): +20% included` : null,
    `Standard Inclusions: Chauffeur, fuel, highway tolls, parking, 60m airport meet & greet`,
    `──────────────────────────────────────────────`,
    `Total Client Price: €${quote.clientQuote.toLocaleString('en-IE')} (approx. €${quote.perGuestQuote}/guest)`,
    state.includeVat ? `* Price includes 10% Italian passenger transport VAT` : `* Net B2B rate excluding 10% VAT`,
    `Terms: Advance payment upon invoice · Strict luxury discretion`,
    `──────────────────────────────────────────────`,
    `DOROGO Luxury Private Transportation · Lake Como & Milan · dorogo.eu`
  ].filter(Boolean);
  return lines.join('\n');
}

function renderPriceCalculatorCard() {
  const allRows = FLEET_LEDGER_ROWS;
  const categories = getTransportCategories(allRows);
  const transferRoutes = getAllTransferRoutes(allRows);
  const quote = calculateTripQuote(calcState, allRows);
  const v = quote.veh;
  const matching = quote.matching;
  const proposalRaw = generateProposalText(quote, calcState);

  return `
    <div class="sail-card" id="trip-calculator">
      <!-- Card Head with Service Mode Tabs -->
      <div class="sail-card-head">
        <div>
          <div class="row" style="gap:8px;align-items:center">
            <span class="sail-card-title">Customizable B2B Trip &amp; Client Quote Calculator</span>
            <span class="sail-pill ok" style="padding:1px 7px;font-size:11px"><span class="sail-pill-dot"></span>Real Partner Rates</span>
          </div>
          <div style="font-size:12px;color:var(--sail-muted);margin-top:2px">
            Select route/location, group vehicles by transport category (${categories.find(c => c.key === 'all')?.paxRange || '7–30 pax'}) &amp; class tier, and customize guest count, round trips, night surcharge, and DOROGO margin.
          </div>
        </div>

        <div class="sail-seg" role="tablist" aria-label="Service Type Switcher">
          <button class="${calcState.serviceType === 'transfer' ? 'on' : ''}" data-calc-type="transfer">✈️ Airport &amp; City Transfers</button>
          <button class="${calcState.serviceType === 'standby' ? 'on' : ''}" data-calc-type="standby">⏱️ Hourly Standby (Disposizione)</button>
        </div>
      </div>

      <!-- Main 2-Column Responsive Calculator Body -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:20px;padding:20px;background:#FFF">
        
        <!-- Left Column: Inputs, Category Grouping & Matched Vehicles -->
        <div style="display:flex;flex-direction:column;gap:16px">
          
          <!-- Direct Vehicle Selector: Choose any specific vehicle directly at any time -->
          <div style="background:#F8FAFC;border:1px solid var(--sail-line);border-radius:8px;padding:10px 12px">
            <div class="row between" style="align-items:center;margin-bottom:6px;gap:8px;flex-wrap:wrap">
              <label class="sail-calc-label" style="margin-bottom:0;display:flex;align-items:center;gap:6px">
                <span>🎯 Choose Specific Vehicle</span>
                <span class="sail-pill ok" style="padding:1px 6px;font-size:10.5px">Direct Selection</span>
              </label>
              <span style="font-size:11px;color:var(--sail-muted)">Pick any vehicle or auto-match from table</span>
            </div>

            <div style="display:flex;gap:8px;align-items:center">
              <select id="calc-specific-veh" class="sail-calc-input" style="font-weight:600;color:var(--sail-ink);flex:1">
                <option value="auto" ${!calcState.vehicleId ? 'selected' : ''}>⚡ Auto-match by filters below</option>
                <optgroup label="✨ Luxury VIP Vehicles">
                  ${allRows.filter((r) => r.tier === 'luxury').map((r) => `
                    <option value="${attr(r.id)}" ${calcState.vehicleId === r.id ? 'selected' : ''}>
                      ${esc(r.vehicleModel)} (${esc(r.paxLabel || `${r.pax} pax`)}) — ${esc(r.partnerName)} (${esc(r.baseCity)})
                    </option>
                  `).join('')}
                </optgroup>
                <optgroup label="🚌 Standard Fleet">
                  ${allRows.filter((r) => r.tier !== 'luxury').map((r) => `
                    <option value="${attr(r.id)}" ${calcState.vehicleId === r.id ? 'selected' : ''}>
                      ${esc(r.vehicleModel)} (${esc(r.paxLabel || `${r.pax} pax`)}) — ${esc(r.partnerName)} (${esc(r.baseCity)})
                    </option>
                  `).join('')}
                </optgroup>
              </select>
              ${calcState.vehicleId ? `
                <button class="sail-preset-btn" id="calc-clear-veh" title="Return to filter auto-match" style="height:34px;padding:0 10px;white-space:nowrap">
                  Auto-match
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Row 1: Location/Route & Transport Category -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label class="sail-calc-label">1. Choose Location / Route</label>
              <select id="calc-route" class="sail-calc-input">
                ${calcState.serviceType === 'transfer' ? `
                  <optgroup label="Lake Como ⇄ Airports">
                    ${transferRoutes.filter((r) => r.region === 'Lake Como ⇄ Airports').map((r) => `
                      <option value="${attr(r.key)}" ${calcState.routeKey === r.key ? 'selected' : ''}>${esc(r.label)}</option>
                    `).join('')}
                  </optgroup>
                  <optgroup label="Milan ⇄ Airports">
                    ${transferRoutes.filter((r) => r.region === 'Milan ⇄ Airports').map((r) => `
                      <option value="${attr(r.key)}" ${calcState.routeKey === r.key ? 'selected' : ''}>${esc(r.label)}</option>
                    `).join('')}
                  </optgroup>
                  <optgroup label="Lake Como Excursions & City">
                    ${transferRoutes.filter((r) => r.region === 'Lake Como Excursions & City').map((r) => `
                      <option value="${attr(r.key)}" ${calcState.routeKey === r.key ? 'selected' : ''}>${esc(r.label)}</option>
                    `).join('')}
                  </optgroup>
                  ${transferRoutes.some((r) => r.region === 'Partner Specific Routes') ? `
                    <optgroup label="Partner Specific Routes">
                      ${transferRoutes.filter((r) => r.region === 'Partner Specific Routes').map((r) => `
                        <option value="${attr(r.key)}" ${calcState.routeKey === r.key ? 'selected' : ''}>${esc(r.label)}</option>
                      `).join('')}
                    </optgroup>
                  ` : ''}
                ` : `
                  <option value="dispo_4h" ${calcState.routeKey === 'dispo_4h' ? 'selected' : ''}>Disposizione 4h (Half Day · 75–100 km)</option>
                  <option value="dispo_8h" ${calcState.routeKey === 'dispo_8h' ? 'selected' : ''}>Disposizione 8h (Full Day · 150–200 km)</option>
                  <option value="dispo_8h_vip" ${calcState.routeKey === 'dispo_8h_vip' ? 'selected' : ''}>Disposizione 8h Top VIP (Full Day VIP · 150 km)</option>
                  <option value="hourly" ${calcState.routeKey === 'hourly' ? 'selected' : ''}>Tariffa Oraria (Custom Hours · verified €/h)</option>
                `}
              </select>
              ${(calcState.serviceType === 'standby' && calcState.routeKey === 'hourly') ? `
                <div style="margin-top:6px">
                  <div class="row between" style="margin-bottom:2px">
                    <label class="sail-calc-label" style="margin-bottom:0">Standby Duration (Hours)</label>
                    <span style="font-size:11px;color:var(--sail-accent);font-weight:600">@ €${v?.standby?.hourly?.net || (typeof v?.standby?.extra_hour === 'number' ? v.standby.extra_hour : 140)}/h</span>
                  </div>
                  <input type="number" id="calc-standby-hours" min="1" max="24" value="${calcState.standbyHours || 8}" class="sail-calc-input" placeholder="e.g. 8">
                </div>
              ` : ''}
            </div>

            <div>
              <label class="sail-calc-label">2. Transport Type / Category</label>
              <select id="calc-category" class="sail-calc-input">
                ${categories.map((cat) => `
                  <option value="${attr(cat.key)}" ${calcState.transportCategory === cat.key ? 'selected' : ''}>${esc(cat.label)}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <!-- Row 2: Class Tier & Passenger Count -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label class="sail-calc-label">3. Class Tier</label>
              <select id="calc-tier" class="sail-calc-input">
                <option value="all" ${calcState.tierFilter === 'all' ? 'selected' : ''}>All Classes (Luxury &amp; Standard)</option>
                <option value="luxury" ${calcState.tierFilter === 'luxury' ? 'selected' : ''}>Luxury VIP Only</option>
                <option value="standard" ${calcState.tierFilter === 'standard' ? 'selected' : ''}>Standard Shuttle</option>
              </select>
            </div>

            <div>
              <div class="row between" style="margin-bottom:4px">
                <label class="sail-calc-label" style="margin-bottom:0">4. Guest / Passenger Count</label>
                <span style="font-size:11px;color:var(--sail-muted)">Party size</span>
              </div>
              <input type="number" id="calc-passengers" min="1" max="50" value="${calcState.passengerCount}" class="sail-calc-input" placeholder="e.g. 8">
            </div>
          </div>

          <!-- Step 3: Available Matching Vehicles in Selected Category & Route -->
          <div>
            <div class="row between" style="align-items:center;margin-bottom:4px">
              <span class="sail-calc-label" style="margin-bottom:0">5. Matching Vehicles (${matching.length} Available)</span>
              <span style="font-size:11px;color:var(--sail-muted)">Click card to select</span>
            </div>

            ${matching.length > 0 ? `
              <div class="sail-calc-veh-grid">
                ${matching.map((vehItem) => {
                  const isSelected = v && v.id === vehItem.id;
                  let itemPrice = 0;
                  if (calcState.serviceType === 'transfer') {
                    itemPrice = vehItem.transfers?.[calcState.routeKey]?.net || 0;
                    if (calcState.tripDirection === 'round_trip') itemPrice *= 2;
                  } else {
                    if (calcState.routeKey === 'hourly') {
                      const hRate = vehItem.standby?.hourly?.net || (typeof vehItem.standby?.extra_hour === 'number' ? vehItem.standby.extra_hour : (vehItem.standby?.dispo_8h ? Math.round(vehItem.standby.dispo_8h.net / 8) : 140));
                      itemPrice = hRate * (calcState.standbyHours || 8);
                    } else {
                      itemPrice = vehItem.standby?.[calcState.routeKey]?.net || (calcState.routeKey === 'dispo_8h_vip' ? vehItem.standby?.dispo_8h?.net : 0) || 0;
                    }
                  }
                  const exceedsPax = calcState.passengerCount > vehItem.pax;
                  return `
                    <div class="sail-veh-pick ${isSelected ? 'active' : ''}" data-calc-pick-veh="${attr(vehItem.id)}">
                      <div class="row between" style="align-items:flex-start">
                        <div class="row" style="gap:7px;align-items:center">
                          <span class="sail-veh-pick-radio"></span>
                          <span style="font-weight:600;font-size:12.5px;color:var(--sail-ink)">${esc(vehItem.vehicleModel)}</span>
                        </div>
                        <span class="sail-pill ${vehItem.tier === 'luxury' ? 'lux' : 'std'}" style="font-size:10px;padding:1px 5px">
                          ${esc(vehItem.tierLabel)}
                        </span>
                      </div>

                      <div style="font-size:11.5px;color:var(--sail-body)">
                        <strong>${vehItem.pax} seats</strong> · ${esc(vehItem.partnerName)}
                      </div>

                      <div class="row between" style="align-items:baseline;margin-top:4px">
                        <span style="font-size:11px;color:var(--sail-muted)">${esc(vehItem.baseCity)}</span>
                        <span style="font-size:13.5px;font-weight:700;color:var(--sail-ink);font-variant-numeric:tabular-nums">
                          ${itemPrice > 0 ? `€${itemPrice} <span style="font-size:10.5px;font-weight:500;color:var(--sail-muted)">net</span>` : `<span style="font-size:11px;font-weight:500;color:var(--sail-muted)">Quote on req</span>`}
                        </span>
                      </div>

                      ${exceedsPax ? `
                        <div style="font-size:10.5px;color:#B91C1C;font-weight:500;margin-top:2px">
                          ⚠️ ${calcState.passengerCount} guests exceeds ${vehItem.pax}-seat max
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:6px;padding:12px;font-size:12px;color:#92400E">
                No vehicles in the <strong>${esc(calcState.transportCategory !== 'all' ? TRANSPORT_CATEGORIES.find(c => c.key === calcState.transportCategory)?.label : 'selected')}</strong> category operate this exact service/route.
                <button class="sail-preset-btn" style="margin-left:8px" id="calc-clear-cat">Show All Categories</button>
              </div>
            `}
          </div>

          <!-- Step 4: Trip Options & Add-on Customizations -->
          <div style="border-top:1px solid var(--sail-line-soft);padding-top:14px;display:flex;flex-direction:column;gap:12px">
            <span class="sail-calc-label" style="margin-bottom:0">6. Trip Customization &amp; Add-ons</span>
            
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
              ${calcState.serviceType === 'transfer' ? `
                <div>
                  <label class="sail-calc-label">Trip Direction</label>
                  <select id="calc-direction" class="sail-calc-input">
                    <option value="one_way" ${calcState.tripDirection === 'one_way' ? 'selected' : ''}>One-Way (1×)</option>
                    <option value="round_trip" ${calcState.tripDirection === 'round_trip' ? 'selected' : ''}>Round Trip (2×)</option>
                  </select>
                </div>
              ` : `
                <div>
                  <label class="sail-calc-label">Disposal Mode</label>
                  <input type="text" class="sail-calc-input" value="Standard Disposal" disabled style="background:#F1F5F9;color:var(--sail-muted)">
                </div>
              `}

              <div>
                <label class="sail-calc-label">Extra Hours (€100/h)</label>
                <input type="number" id="calc-extra-hours" min="0" max="12" value="${calcState.extraHours}" class="sail-calc-input">
              </div>

              <div>
                <label class="sail-calc-label">Extra Wait (€80/h)</label>
                <input type="number" id="calc-extra-wait" min="0" max="6" value="${calcState.extraWaitHours}" class="sail-calc-input">
              </div>
            </div>

            <!-- Toggles for ZTL, Night & VAT -->
            <div class="row" style="gap:16px;flex-wrap:wrap;padding:4px 0">
              <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--sail-ink);cursor:pointer">
                <input type="checkbox" id="calc-ztl" ${calcState.includeZtl ? 'checked' : ''}>
                Milan Area C ZTL (€97.50 entry permit)
              </label>

              <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--sail-ink);cursor:pointer">
                <input type="checkbox" id="calc-night" ${calcState.nightWindow ? 'checked' : ''}>
                Night window 22:00–06:00 (+20% surcharge)
              </label>

              <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--sail-ink);cursor:pointer">
                <input type="checkbox" id="calc-vat" ${calcState.includeVat ? 'checked' : ''}>
                Include 10% Italian VAT
              </label>
            </div>

            <!-- Markup Customizer -->
            <div style="background:#F8FAFC;border:1px solid var(--sail-line);border-radius:6px;padding:10px 12px">
              <div class="row between" style="align-items:center">
                <label class="sail-calc-label" style="margin-bottom:0">DOROGO Commercial Markup</label>
                <div class="row" style="gap:4px">
                  <button class="sail-preset-btn ${calcState.clientMarkupPct === 15 ? 'active' : ''}" data-markup-preset="15">+15%</button>
                  <button class="sail-preset-btn ${calcState.clientMarkupPct === 25 ? 'active' : ''}" data-markup-preset="25">+25%</button>
                  <button class="sail-preset-btn ${calcState.clientMarkupPct === 35 ? 'active' : ''}" data-markup-preset="35">+35%</button>
                  <button class="sail-preset-btn ${calcState.clientMarkupPct === 50 ? 'active' : ''}" data-markup-preset="50">+50%</button>
                </div>
              </div>
              <div class="row" style="gap:8px;align-items:center;margin-top:6px">
                <input type="range" id="calc-markup-range" min="0" max="60" step="5" value="${calcState.clientMarkupPct}" style="flex:1">
                <div style="display:flex;align-items:center;gap:2px">
                  <input type="number" id="calc-markup-num" min="0" max="100" value="${calcState.clientMarkupPct}" class="sail-calc-input" style="width:65px;height:28px;text-align:right">
                  <span style="font-size:12px;color:var(--sail-body);font-weight:600">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Real-Time B2B Ledger, Margin, Client Quote & Copy Proposal -->
        <div style="display:flex;flex-direction:column;gap:14px">
          
          <div class="sail-calc-summary-card">
            <!-- Active Selection Overview -->
            <div>
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--sail-muted)">
                Trip Quotation Overview
              </div>
              <div style="font-size:15px;font-weight:700;color:var(--sail-ink);margin-top:2px">
                ${esc(quote.serviceLabel)}
              </div>
              ${v ? `
                <div style="font-size:12px;color:var(--sail-body);margin-top:2px">
                  ${esc(v.vehicleModel)} · <strong>${v.pax} pax</strong> · <span class="sail-pill ${v.tier === 'luxury' ? 'lux' : 'std'}" style="font-size:10px;padding:1px 5px">${esc(v.tierLabel)}</span>
                </div>
                <div style="font-size:11.5px;color:var(--sail-muted);margin-top:1px">
                  Operator: <strong>${esc(v.partnerName)}</strong> (${esc(v.baseCity)})
                </div>
              ` : `
                <div style="font-size:12px;color:#B91C1C;margin-top:2px">No matching vehicle available</div>
              `}
            </div>

            <!-- Itemized Financial Breakdown -->
            <div style="border-top:1px solid var(--sail-line);padding-top:10px;display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--sail-body);font-variant-numeric:tabular-nums">
              <div class="row between">
                <span>Base Partner Tariff</span>
                <span style="font-weight:600">€${quote.baseNet}</span>
              </div>

              ${quote.extraHoursCost > 0 ? `
                <div class="row between">
                  <span>Extra hours (${calcState.extraHours}h × €100)</span>
                  <span>+€${quote.extraHoursCost}</span>
                </div>
              ` : ''}

              ${quote.extraWaitCost > 0 ? `
                <div class="row between">
                  <span>Extra airport wait (${calcState.extraWaitHours}h × €80)</span>
                  <span>+€${quote.extraWaitCost}</span>
                </div>
              ` : ''}

              ${quote.ztlCost > 0 ? `
                <div class="row between">
                  <span>Milan Area C ZTL Entry</span>
                  <span>+€${quote.ztlCost.toFixed(2)}</span>
                </div>
              ` : ''}

              ${quote.nightSurcharge > 0 ? `
                <div class="row between">
                  <span>Night window surcharge (+20%)</span>
                  <span>+€${quote.nightSurcharge}</span>
                </div>
              ` : ''}

              <div class="row between" style="border-top:1px dashed var(--sail-line);padding-top:4px;color:var(--sail-ink)">
                <span>Net B2B Subtotal</span>
                <span style="font-weight:600">€${quote.totalNetB2B}</span>
              </div>

              ${quote.vatAmount > 0 ? `
                <div class="row between">
                  <span>Italian VAT (+10%)</span>
                  <span>+€${quote.vatAmount}</span>
                </div>
              ` : ''}

              <div class="row between" style="border-top:1px solid var(--sail-line);padding-top:6px;font-size:13px;font-weight:700;color:var(--sail-ink)">
                <span>Total Partner Cost</span>
                <span>€${quote.totalPartnerCost}</span>
              </div>
            </div>

            <!-- DOROGO Commercial Margin Strip -->
            <div style="background:#FFFFFF;border:1px solid var(--sail-line);border-radius:6px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between;font-variant-numeric:tabular-nums">
              <div>
                <div style="font-size:11px;font-weight:600;color:var(--sail-accent)">DOROGO Gross Margin</div>
                <div style="font-size:11px;color:var(--sail-muted)">+${calcState.clientMarkupPct}% client markup</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:13px;font-weight:700;color:var(--sail-accent)">+€${quote.netMargin}</div>
                <div style="font-size:10.5px;color:var(--sail-muted)">profit</div>
              </div>
            </div>

            <!-- Big Final Client Quote -->
            <div style="background:#0A2540;color:#FFFFFF;border-radius:6px;padding:14px;text-align:center">
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:#94A3B8">
                Recommended Client Quote
              </div>
              <div style="font-size:28px;font-weight:800;letter-spacing:-0.02em;margin:4px 0;font-variant-numeric:tabular-nums;color:#FFFFFF">
                €${quote.clientQuote.toLocaleString('en-IE')}
              </div>
              <div style="font-size:12px;color:#CBD5E1">
                approx. <strong>€${quote.perGuestQuote}</strong> per guest (${quote.guests} guests)
              </div>
            </div>

            <!-- Actions: Copy Proposal & Reset -->
            <div style="display:flex;flex-direction:column;gap:6px">
              <button class="sail-btn primary" id="calc-copy-proposal" data-proposal-text="${attr(proposalRaw)}" style="width:100%;justify-content:center;height:36px;font-weight:600">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11"/></svg>
                Copy Client Proposal
              </button>
              <div class="row between" style="align-items:center">
                <span style="font-size:11px;color:var(--sail-muted)">Ready for WhatsApp or Email</span>
                <button class="sail-btn xs" id="calc-reset" style="color:var(--sail-muted)">Reset Defaults</button>
              </div>
            </div>
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

  // Calculator Service Type Switcher (Transfers vs Standby)
  el.querySelectorAll('[data-calc-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const prevY = window.scrollY;
      const newType = btn.dataset.calcType;
      calcState.serviceType = newType;
      if (newType === 'transfer') {
        calcState.routeKey = 'mxp_como';
      } else {
        calcState.routeKey = 'dispo_8h';
      }
      render(el);
      window.scrollTo(0, prevY);
    });
  });

  // Calculator Route select
  const routeSelect = el.querySelector('#calc-route');
  if (routeSelect) {
    routeSelect.addEventListener('change', (e) => {
      const prevY = window.scrollY;
      calcState.routeKey = e.target.value;
      render(el);
      window.scrollTo(0, prevY);
    });
  }

  // Calculator Category select (VIP Minivan, Executive Minibus, etc.)
  const catSelect = el.querySelector('#calc-category');
  if (catSelect) {
    catSelect.addEventListener('change', (e) => {
      const prevY = window.scrollY;
      calcState.transportCategory = e.target.value;
      render(el);
      window.scrollTo(0, prevY);
    });
  }

  // Calculator Class Tier filter
  const calcTier = el.querySelector('#calc-tier');
  if (calcTier) {
    calcTier.addEventListener('change', (e) => {
      const prevY = window.scrollY;
      calcState.tierFilter = e.target.value;
      render(el);
      window.scrollTo(0, prevY);
    });
  }

  // Calculator Passenger Count
  const paxInput = el.querySelector('#calc-passengers');
  if (paxInput) {
    paxInput.addEventListener('input', (e) => {
      const prevY = window.scrollY;
      calcState.passengerCount = Math.max(1, Number(e.target.value) || 1);
      render(el);
      window.scrollTo(0, prevY);
    });
  }

  // Vehicle Pick Card selection
  el.querySelectorAll('[data-calc-pick-veh]').forEach((card) => {
    card.addEventListener('click', () => {
      const prevY = window.scrollY;
      calcState.vehicleId = card.dataset.calcPickVeh;
      render(el);
      window.scrollTo(0, prevY);
    });
  });

  // Clear Category Button fallback
  const clearCatBtn = el.querySelector('#calc-clear-cat');
  if (clearCatBtn) {
    clearCatBtn.addEventListener('click', () => {
      const prevY = window.scrollY;
      calcState.transportCategory = 'all';
      render(el);
      window.scrollTo(0, prevY);
    });
  }

  // Trip Direction select (One-Way vs Round Trip)
  const dirSelect = el.querySelector('#calc-direction');
  if (dirSelect) {
    dirSelect.addEventListener('change', (e) => {
      const prevY = window.scrollY;
      calcState.tripDirection = e.target.value;
      render(el);
      window.scrollTo(0, prevY);
    });
  }

  // Extra Hours
  const extraHoursInput = el.querySelector('#calc-extra-hours');
  if (extraHoursInput) {
    extraHoursInput.addEventListener('input', (e) => {
      const prevY = window.scrollY;
      calcState.extraHours = Math.max(0, Number(e.target.value) || 0);
      render(el);
      window.scrollTo(0, prevY);
    });
  }

  // Extra Airport Wait
  const extraWaitInput = el.querySelector('#calc-extra-wait');
  if (extraWaitInput) {
    extraWaitInput.addEventListener('input', (e) => {
      const prevY = window.scrollY;
      calcState.extraWaitHours = Math.max(0, Number(e.target.value) || 0);
      render(el);
      window.scrollTo(0, prevY);
    });
  }

  // Milan Area C ZTL Permit toggle
  const ztlToggle = el.querySelector('#calc-ztl');
  if (ztlToggle) {
    ztlToggle.addEventListener('change', (e) => {
      const prevY = window.scrollY;
      calcState.includeZtl = Boolean(e.target.checked);
      render(el);
      window.scrollTo(0, prevY);
    });
  }

  // Night window toggle
  const nightToggle = el.querySelector('#calc-night');
  if (nightToggle) {
    nightToggle.addEventListener('change', (e) => {
      const prevY = window.scrollY;
      calcState.nightWindow = Boolean(e.target.checked);
      render(el);
      window.scrollTo(0, prevY);
    });
  }

  // Italian VAT toggle
  const vatToggle = el.querySelector('#calc-vat');
  if (vatToggle) {
    vatToggle.addEventListener('change', (e) => {
      const prevY = window.scrollY;
      calcState.includeVat = Boolean(e.target.checked);
      render(el);
      window.scrollTo(0, prevY);
    });
  }

  // Markup slider & numeric inputs
  const markupRange = el.querySelector('#calc-markup-range');
  const markupNum = el.querySelector('#calc-markup-num');
  if (markupRange) {
    markupRange.addEventListener('input', (e) => {
      const prevY = window.scrollY;
      calcState.clientMarkupPct = Number(e.target.value) || 0;
      render(el);
      window.scrollTo(0, prevY);
    });
  }
  if (markupNum) {
    markupNum.addEventListener('input', (e) => {
      const prevY = window.scrollY;
      calcState.clientMarkupPct = Math.max(0, Number(e.target.value) || 0);
      render(el);
      window.scrollTo(0, prevY);
    });
  }

  // Markup presets (+15%, +25%, +35%, +50%)
  el.querySelectorAll('[data-markup-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const prevY = window.scrollY;
      calcState.clientMarkupPct = Number(btn.dataset.markupPreset) || 25;
      render(el);
      window.scrollTo(0, prevY);
    });
  });

  // Copy Client Proposal Button
  const copyProposalBtn = el.querySelector('#calc-copy-proposal');
  if (copyProposalBtn) {
    copyProposalBtn.addEventListener('click', async () => {
      const text = copyProposalBtn.dataset.proposalText || '';
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        toast('Client proposal copied to clipboard!');
      } catch (err) {
        toast('Failed to copy quote: ' + err.message);
      }
    });
  }

  // Reset Defaults Button
  const resetBtn = el.querySelector('#calc-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const prevY = window.scrollY;
      calcState = {
        serviceType: 'transfer',
        routeKey: 'mxp_como',
        transportCategory: 'all',
        tierFilter: 'all',
        passengerCount: 8,
        vehicleId: 'como_sprinter_12',
        standbyHours: 8,
        tripDirection: 'one_way',
        extraHours: 0,
        extraWaitHours: 0,
        includeZtl: false,
        nightWindow: false,
        includeVat: false,
        clientMarkupPct: 25
      };
      render(el);
      window.scrollTo(0, prevY);
      toast('Calculator reset to defaults');
    });
  }

  // Direct Quote from Table Row
  el.querySelectorAll('[data-quote-veh]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const vehId = btn.dataset.quoteVeh;
      selectSpecificVehicle(vehId);
      render(el);
      const calcEl = el.querySelector('#trip-calculator');
      if (calcEl) {
        calcEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        calcEl.classList.add('sail-calc-glow');
        setTimeout(() => calcEl.classList.remove('sail-calc-glow'), 1800);
      }
      const veh = FLEET_LEDGER_ROWS.find((r) => r.id === vehId);
      toast(`${veh?.vehicleModel || 'Vehicle'} selected in Trip Calculator`);
    });
  });

  // Delete Custom Vehicle from Table
  el.querySelectorAll('[data-delete-custom-veh]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const vehId = btn.dataset.deleteCustomVeh;
      const veh = FLEET_LEDGER_ROWS.find((r) => r.id === vehId);
      if (confirm(`Remove custom vehicle "${veh?.vehicleModel || vehId}" from table?`)) {
        deleteCustomVehicle(vehId);
        render(el);
        toast('Custom vehicle removed from table');
      }
    });
  });

  // Add Vehicle to Table Button
  const btnAddVeh = el.querySelector('#btn-open-add-vehicle');
  if (btnAddVeh) {
    btnAddVeh.addEventListener('click', () => {
      openAddVehicleModal(el);
    });
  }

  // Direct Specific Vehicle Selector in Calculator
  const specificVehSelect = el.querySelector('#calc-specific-veh');
  if (specificVehSelect) {
    specificVehSelect.addEventListener('change', (e) => {
      const prevY = window.scrollY;
      const selectedVal = e.target.value;
      if (selectedVal === 'auto') {
        calcState.vehicleId = null;
      } else {
        selectSpecificVehicle(selectedVal);
      }
      render(el);
      window.scrollTo(0, prevY);
    });
  }

  const clearVehBtn = el.querySelector('#calc-clear-veh');
  if (clearVehBtn) {
    clearVehBtn.addEventListener('click', () => {
      const prevY = window.scrollY;
      calcState.vehicleId = null;
      render(el);
      window.scrollTo(0, prevY);
      toast('Returned to automatic filter matching');
    });
  }

  // Standby custom hours input
  const standbyHoursInput = el.querySelector('#calc-standby-hours');
  if (standbyHoursInput) {
    standbyHoursInput.addEventListener('input', (e) => {
      const prevY = window.scrollY;
      calcState.standbyHours = Math.max(1, Number(e.target.value) || 1);
      render(el);
      window.scrollTo(0, prevY);
    });
  }

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

function openAddVehicleModal(el) {
  dialog({
    wide: true,
    title: 'Add Vehicle to Fleet Ledger Table & Calculator',
    body: `
      <form id="form-add-fleet-vehicle" style="display:flex;flex-direction:column;gap:14px;padding:4px 0">
        <div style="font-size:12.5px;color:var(--sail-muted);line-height:1.4">
          Add any custom vehicle or newly quoted partner coach to the table. It will immediately appear in the Ledger and become selectable in the Trip &amp; Quote Calculator.
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label class="sail-calc-label">Vehicle Model *</label>
            <input type="text" id="new-veh-model" class="sail-calc-input" placeholder="e.g. Mercedes-Benz Sprinter 19 Pax VIP" required>
          </div>
          <div>
            <label class="sail-calc-label">Passenger Capacity (Pax Seats) *</label>
            <input type="number" id="new-veh-pax" min="1" max="80" value="19" class="sail-calc-input" required>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label class="sail-calc-label">Transport Operator / Partner *</label>
            <input type="text" id="new-veh-partner" class="sail-calc-input" placeholder="e.g. Perletti Autoservizi / Avantgarde" required>
          </div>
          <div>
            <label class="sail-calc-label">Base Depot / City *</label>
            <input type="text" id="new-veh-city" class="sail-calc-input" placeholder="e.g. Bergamo / Milano / Como" required>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div>
            <label class="sail-calc-label">Class Tier *</label>
            <select id="new-veh-tier" class="sail-calc-input">
              <option value="luxury" selected>✨ Luxury VIP</option>
              <option value="standard">🚌 Standard Shuttle / GT</option>
            </select>
          </div>
          <div>
            <label class="sail-calc-label">Rate Status *</label>
            <select id="new-veh-status" class="sail-calc-input">
              <option value="confirmed" selected>✓ Rates Verified</option>
              <option value="pending">⏳ Pending Rate Sheet</option>
            </select>
          </div>
          <div>
            <label class="sail-calc-label">Contact Phone / WhatsApp</label>
            <input type="text" id="new-veh-phone" class="sail-calc-input" placeholder="+39 ...">
          </div>
        </div>

        <div>
          <label class="sail-calc-label">Vehicle Specifications / Coachbuilder Notes</label>
          <input type="text" id="new-veh-specs" class="sail-calc-input" placeholder="e.g. Total Black, two-tone leather seats, wood-look floor, AC">
        </div>

        <!-- Rate Inputs Section -->
        <div style="background:#F8FAFC;border:1px solid var(--sail-line);border-radius:6px;padding:12px;display:flex;flex-direction:column;gap:10px">
          <div style="font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--sail-ink)">
            Verified Net Tariffs (€ Net B2B, IVA 10% esclusa)
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            <div>
              <label class="sail-calc-label">Malpensa (MXP) ⇄ Como (€)</label>
              <input type="number" id="new-rate-mxp-como" class="sail-calc-input" placeholder="e.g. 450">
            </div>
            <div>
              <label class="sail-calc-label">Malpensa (MXP) ⇄ Milano (€)</label>
              <input type="number" id="new-rate-mxp-milano" class="sail-calc-input" placeholder="e.g. 350">
            </div>
            <div>
              <label class="sail-calc-label">Hourly Tariff (€/h)</label>
              <input type="number" id="new-rate-hourly" class="sail-calc-input" placeholder="e.g. 140">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <label class="sail-calc-label">Disposizione 4h (€)</label>
              <input type="number" id="new-rate-dispo-4h" class="sail-calc-input" placeholder="e.g. 550">
            </div>
            <div>
              <label class="sail-calc-label">Disposizione 8h (€)</label>
              <input type="number" id="new-rate-dispo-8h" class="sail-calc-input" placeholder="e.g. 950">
            </div>
          </div>
        </div>

        <div class="row between" style="align-items:center;padding-top:10px;border-top:1px solid var(--sail-line-soft);margin-top:4px">
          <button type="button" class="sail-btn" data-close>Cancel</button>
          <button type="submit" class="sail-btn primary" style="font-weight:600">✓ Save &amp; Add to Calculator</button>
        </div>
      </form>
    `,
    onMount: (box) => {
      const form = box.querySelector('#form-add-fleet-vehicle');
      if (!form) return;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const model = box.querySelector('#new-veh-model').value.trim();
        const pax = Number(box.querySelector('#new-veh-pax').value) || 8;
        const partner = box.querySelector('#new-veh-partner').value.trim() || 'Partner Operator';
        const city = box.querySelector('#new-veh-city').value.trim() || 'Lombardia';
        const tier = box.querySelector('#new-veh-tier').value;
        const status = box.querySelector('#new-veh-status').value;
        const phone = box.querySelector('#new-veh-phone').value.trim();
        const specs = box.querySelector('#new-veh-specs').value.trim() || 'Executive luxury conversion';

        const mxpComo = Number(box.querySelector('#new-rate-mxp-como').value);
        const mxpMilano = Number(box.querySelector('#new-rate-mxp-milano').value);
        const hourlyRate = Number(box.querySelector('#new-rate-hourly').value);
        const dispo4h = Number(box.querySelector('#new-rate-dispo-4h').value);
        const dispo8h = Number(box.querySelector('#new-rate-dispo-8h').value);

        const newId = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const transfers = {};
        if (mxpComo > 0) transfers.mxp_como = { label: 'Malpensa (MXP) ⇄ Como', net: mxpComo };
        if (mxpMilano > 0) transfers.mxp_milano = { label: 'Malpensa (MXP) ⇄ Milano', net: mxpMilano };

        const standby = {};
        if (hourlyRate > 0) standby.hourly = { label: 'Tariffa oraria a disposizione', net: hourlyRate };
        if (dispo4h > 0) standby.dispo_4h = { label: 'Disposizione 4h', net: dispo4h };
        if (dispo8h > 0) standby.dispo_8h = { label: 'Disposizione 8h', net: dispo8h };
        standby.extra_hour = hourlyRate > 0 ? hourlyRate : 100;
        standby.extra_wait = 80;

        const newVeh = {
          id: newId,
          partnerId: 'custom_' + Date.now(),
          vehicleModel: model,
          paxLabel: `${pax} pax`,
          coachbuilder: specs,
          pax: pax,
          category: inferCategoryFromPax(pax),
          categoryLabel: inferCategoryLabel(inferCategoryFromPax(pax), pax),
          tier: tier,
          tierLabel: tier === 'luxury' ? 'Luxury VIP' : 'Standard Shuttle',
          tierSpec: specs,
          partnerName: partner,
          baseCity: city,
          contactPerson: 'Operations Desk',
          phone: phone,
          email: '',
          website: '',
          status: status,
          statusLabel: status === 'confirmed' ? 'Rates Verified in Table' : 'Pending Rate Sheet',
          repliedAt: 'Just added',
          ratePdf: null,
          ratePdfName: null,
          transfers: Object.keys(transfers).length > 0 ? transfers : null,
          standby: Object.keys(standby).length > 2 ? standby : null,
          terms: {
            payment: 'Pagamento anticipato vista fattura',
            vat: 'Prezzi IVA 10% esclusa',
            included: 'Carburante, pedaggi autostradali, parcheggi, attesa volo'
          },
          photos: [],
          isCustom: true
        };

        addVehicleToFleet(newVeh);
        selectSpecificVehicle(newVeh.id);

        // Close dialog
        const closeBtn = box.querySelector('[data-close]');
        if (closeBtn) closeBtn.click();

        render(el);
        const calcEl = el.querySelector('#trip-calculator');
        if (calcEl) {
          calcEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          calcEl.classList.add('sail-calc-glow');
          setTimeout(() => calcEl.classList.remove('sail-calc-glow'), 1800);
        }
        toast(`Vehicle "${newVeh.vehicleModel}" added to table and loaded in calculator!`);
      });
    }
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
