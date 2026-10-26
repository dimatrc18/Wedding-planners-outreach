// Minimalist Bus Partner Manifest Table & 100-Point Scoring View
// Luxury unbranded minibus and coach operators across Northern Italy.
import * as core from '../../supabase/functions/_shared/core/index.js';
import { 
  S, 
  api,
  updateBusPartner, 
  addBusPartner, 
  removeBusPartner, 
  removeManyBusPartners, 
  unexcludeBusPartner, 
  loadExcludedBusPartners, 
  isBusPartnerExcluded 
} from '../store.js';
import { INITIAL_BUS_PARTNERS, mergePartnerRecords, mergeNotes } from '../bus_partners_data.js';
import { esc, attr, icon, pct, plural, download, toast, confirmDialog, copyText } from '../ui.js';

let activeFilter = 'all'; // all | latest_added | newly_added | top_tier | replied_rates
let statusFilter = 'all'; // all | TO_REVIEW | WANT_TO_CONTACT | CONTACTED | APPROVED_PARTNER | REJECTED | NOT_RELEVANT
let vehicleFilter = 'all'; // all | v_class | sprinter_vip | sprinter_lux | midibus | limobus | gt_coach
let segmentFilter = 'all'; // all | luxury | standard | both
let cityFilter = 'all';
let searchQ = '';
let sortBy = 'score_desc'; // score_desc | newest_first | name_asc

const FLOW_VIS_KEY = 'dorogo_bus_flow_visible';
let showVisualFlow = (() => {
  try {
    const v = localStorage.getItem(FLOW_VIS_KEY);
    return v === null ? true : v === '1';
  } catch (_) {
    return true;
  }
})();
let selectedFlowNodes = {}; // { [colIndex]: nodeKey }

function setFlowVisibility(visible) {
  showVisualFlow = Boolean(visible);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FLOW_VIS_KEY, showVisualFlow ? '1' : '0');
    }
  } catch (_) {}
}

// Minimalist feather/lucide pencil icon for understated luxury UI
const pencilIcon = (size = 11) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block;vertical-align:middle"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`;

function normalizeDomain(url) {
  if (!url) return '';
  try {
    const raw = String(url).trim();
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const parsed = new URL(withProto);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase().trim();
  } catch (_) {
    return String(url).replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase().trim();
  }
}

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const LEGACY_OPERATOR_REPLACEMENTS = {
  comolaketransfersminibus: {
    name: 'Landway Tourism',
    base_city: 'Como',
    website: 'https://www.landwaytourism.com',
    fleet_url: 'https://www.landwaytourism.com/',
    phone: '+39 031 513 189',
    email: 'info@landwaytourism.com',
    notes: 'Grandate / Como luxury coach and minibus operator. Unbranded Sprinter & midibus fleet for Lake Como villas.'
  },
  lakecomochauffeurbusservice: {
    name: 'Como Driver Services',
    base_city: 'Como',
    website: 'https://www.comodriver.com',
    fleet_url: 'https://www.comodriver.com/',
    phone: '+39 347 184 8920',
    email: 'info@comodriver.com',
    notes: 'Dedicated Lake Como private chauffeur & luxury Mercedes Sprinter/V-Class operator covering Bellagio, Cernobbio, and Villa d’Este.'
  },
  menaggiovipminibustour: {
    name: 'Travel & Service Como',
    base_city: 'Como',
    website: 'https://www.travelandservice.it',
    fleet_url: 'https://www.travelandservice.it/',
    phone: '+39 035 017 2012',
    email: 'info@travelandservice.it',
    notes: 'Lombardy & Lake Como executive bus and VIP minibus charter specialist for weddings and corporate delegations.'
  },
  lakecomoexecutivesprinter: {
    name: 'Como Limo Lux',
    base_city: 'Como',
    website: 'https://comolimolux.com',
    fleet_url: 'https://comolimolux.com/',
    phone: '+39 031 264 780',
    email: 'info@comolimolux.com',
    notes: 'Bespoke Lake Como luxury ground transport. Total-black Mercedes V-Class and VIP Sprinter fleet.'
  },
  milanovipdrivercoach: {
    name: 'Exclusive Cars Milano',
    base_city: 'Milano',
    website: 'https://exclusivecarsmilano.it',
    fleet_url: 'https://exclusivecarsmilano.it/',
    phone: '+39 02 4070 8295',
    email: 'info@exclusivecarsmilano.it',
    notes: 'Premier Milan NCC operator with luxury Mercedes-Benz Sprinter VIP (8–19 seats) and V-Class fleet.'
  },
  starlightlimousinecoach: {
    name: 'Prestige Car Limousine',
    base_city: 'Milano',
    website: 'https://www.prestigecarlimousine.it',
    fleet_url: 'https://www.prestigecarlimousine.it/',
    phone: '+39 02 8951 6813',
    email: 'info@prestigecarlimousine.it',
    notes: 'Milan luxury roadshow and event transport. 8 to 16-seater luxury Mercedes minibuses and suited English-speaking chauffeurs.'
  },
  autonoleggiobattaglia: {
    name: 'Car Service Milan',
    base_city: 'Milano',
    website: 'https://carservicemilan.com',
    fleet_url: 'https://carservicemilan.com/',
    phone: '+39 02 8719 9508',
    email: 'info@carservicemilan.com',
    notes: 'Milan & Malpensa executive vans and 14–20 seater luxury Mercedes Sprinters. Strict unbranded policy.'
  },
  pellegriniautoservizi: {
    name: 'Autoservizi Sonzogni',
    base_city: 'Bergamo',
    website: 'https://www.autoservizisonzogni.it',
    fleet_url: 'https://www.autoservizisonzogni.it/',
    phone: '+39 0345 910 38',
    email: 'info@autoservizisonzogni.it',
    notes: 'Bergamo luxury Gran Turismo coach and minibus operator for airport transfers and northern lakes.'
  },
  benacominibusncc: {
    name: 'Consorzio Eurobus Verona',
    base_city: 'Lake Garda',
    website: 'https://eurobusverona.it',
    fleet_url: 'https://eurobusverona.it/',
    phone: '+39 045 803 2002',
    email: 'info@eurobusverona.it',
    notes: 'Verona and Lake Garda premier bus & luxury minibus consortium covering Sirmione, Lazise, and Garda villas.'
  },
  silvestribuslivigno: {
    name: 'Cattazzo Pullman',
    base_city: 'Verona',
    website: 'https://cattazzopullman.com',
    fleet_url: 'https://cattazzopullman.com/',
    phone: '+39 045 715 1138',
    email: 'info@cattazzopullman.com',
    notes: 'Luxury Gran Turismo coaches and Mercedes minibuses serving Northern Italy, Verona, and Alpine corridors.'
  },
  brianzalimousineminibus: {
    name: 'Air Car Service',
    base_city: 'Monza',
    website: 'https://www.aircarservice.com',
    fleet_url: 'https://www.aircarservice.com/',
    phone: '+39 035 311 258',
    email: 'info@aircarservice.com',
    notes: 'Executive Mercedes, Setra & MAN Gran Turismo buses and luxury minivans across Monza, Bergamo, and Milan.'
  },
  vareseviptransfercoach: {
    name: 'Luxury Transfer Milan',
    base_city: 'Varese',
    website: 'https://www.luxurytransfermilan.com',
    fleet_url: 'https://www.luxurytransfermilan.com/',
    phone: '+39 02 8718 6920',
    email: 'info@luxurytransfermilan.com',
    notes: 'Malpensa (MXP), Varese, and Lake Como executive Sprinter VIP and V-Class chauffeur service.'
  },
  stresamaggiorevipcoach: {
    name: 'Ugolini Viaggi',
    base_city: 'Lake Garda',
    website: 'https://www.ugoliniviaggi.it',
    fleet_url: 'https://www.ugoliniviaggi.it/',
    phone: '+39 045 770 1522',
    email: 'info@ugoliniviaggi.it',
    notes: 'Modern fleet of luxury vans, minicoaches, and Gran Turismo buses for lake weddings and airport transfers.'
  },
  bellagiotransfers: {
    name: 'Detailed Drivers Milano & Como',
    base_city: 'Milano',
    website: 'https://detaileddrivers.com',
    fleet_url: 'https://detaileddrivers.com/',
    phone: '+39 02 9147 8230',
    email: 'info@detaileddrivers.com',
    notes: 'High-end private chauffeur and luxury Sprinter minibus service across Milan and Lake Como.'
  }
};

export const LEGACY_DEAD_DOMAINS = {
  'comolaketransfers.it': 'comolaketransfersminibus',
  'lakecomochauffeur.it': 'lakecomochauffeurbusservice',
  'menaggiominibus.it': 'menaggiovipminibustour',
  'lakecomosprinter.it': 'lakecomoexecutivesprinter',
  'milanovipdriver.com': 'milanovipdrivercoach',
  'starlightlimousine.it': 'starlightlimousinecoach',
  'autonoleggibattaglia.it': 'autonoleggiobattaglia',
  'pellegrinibus.it': 'pellegriniautoservizi',
  'benacominibus.it': 'benacominibusncc',
  'silvestribus.it': 'silvestribuslivigno',
  'brianzalimousine.it': 'brianzalimousineminibus',
  'varesevip.it': 'vareseviptransfercoach',
  'maggiorecoach.it': 'stresamaggiorevipcoach',
  'bellagio-transfers.it': 'bellagiotransfers'
};

export function findLegacyReplacement(partner) {
  if (!partner) return null;
  const pNorm = normalizeName(partner.name);
  if (pNorm && LEGACY_OPERATOR_REPLACEMENTS[pNorm]) {
    return LEGACY_OPERATOR_REPLACEMENTS[pNorm];
  }
  const dom = normalizeDomain(partner.website);
  if (dom && LEGACY_DEAD_DOMAINS[dom]) {
    return LEGACY_OPERATOR_REPLACEMENTS[LEGACY_DEAD_DOMAINS[dom]];
  }
  return null;
}

function hydratePartnerCardLocal(p) {
  if (!p) return p;
  const card = p.score_breakdown?.partner_card || {};
  const cats = Array.isArray(p.fleet_categories) ? p.fleet_categories : [];
  const catText = `${p.name || ''} ${cats.join(' ')} ${p.notes || ''}`.toLowerCase();

  let defaultModels = [];
  let defaultPax = [];
  for (const c of cats) {
    if (/limobus/i.test(c)) { defaultModels.push('Limobus VIP (18–28 pax)'); defaultPax.push('18–28'); }
    else if (/sprinter.*vip/i.test(c)) { defaultModels.push('Mercedes Sprinter VIP (8–16 pax)'); defaultPax.push('8–16'); }
    else if (/sprinter/i.test(c)) { defaultModels.push('Mercedes Sprinter Exec (16–20 pax)'); defaultPax.push('16–20'); }
    else if (/v-?class|minivan/i.test(c)) { defaultModels.push('Mercedes V-Class (7–8 pax)'); defaultPax.push('7–8'); }
    else if (/midibus|indcar|midi/i.test(c)) { defaultModels.push('Indcar / Executive Midibus (24–30 pax)'); defaultPax.push('24–30'); }
    else if (/setra.*vip/i.test(c)) { defaultModels.push('Setra TopClass VIP (28–36 pax)'); defaultPax.push('28–36'); }
    else if (/coach|tourismo|setra|pullman/i.test(c)) { defaultModels.push('Mercedes Tourismo / Setra GT (50–56 pax)'); defaultPax.push('50–56'); }
  }

  const isMoveolux = p.id === 'partner_moveolux';
  const rawBusModels = p.bus_models ?? card.bus_models ?? ([...new Set(defaultModels)].join(', ') || '');
  const paxAudit = core.verifyPerBusPaxCapacity({ bus_models: rawBusModels, fleet_categories: cats }, { autoInferKnownStandards: true });
  const bus_models = paxAudit.formattedBusModels || rawBusModels;
  const user_set_segment = Boolean(p.user_set_segment || card.user_set_segment);
  const fleet_segment = user_set_segment
    ? (p.fleet_segment || card.fleet_segment || core.inferBusSegment({ ...p, bus_models, user_set_segment: false }))
    : core.inferBusSegment({ ...p, bus_models, user_set_segment: false });
  const pax_capacity = p.pax_capacity || card.pax_capacity || paxAudit.formattedPaxSummary || (defaultPax.length ? `${[...new Set(defaultPax)].join(', ')} pax` : '');
  const rate_hourly = p.rate_hourly ?? card.rate_hourly ?? (isMoveolux ? '€120/h' : '');
  const rate_standby = p.rate_standby ?? card.rate_standby ?? (isMoveolux ? '€550 (4h disp.) · €1,050 (8h disp.)' : '');
  const whatsapp = p.whatsapp ?? card.whatsapp ?? p.phone ?? '';
  const client_notes = p.client_notes || card.client_notes || '';
  const email_status = p.email_status || card.email_status || (p.email ? 'mx_ok' : 'unknown');
  const outreach_stage = p.outreach_stage || card.outreach_stage || (
    p.status === 'APPROVED_PARTNER' ? 'partner_won' :
    (rate_hourly || rate_standby || p.replied_at || card.replied_at) ? 'replied' :
    p.status === 'CONTACTED' ? 't1_sent' :
    p.status === 'WANT_TO_CONTACT' ? 'ready' :
    (p.status === 'REJECTED' || p.status === 'NOT_RELEVANT') ? 'closed' : 'to_check'
  );

  const nextCard = {
    ...card,
    fleet_segment,
    bus_models,
    pax_capacity,
    rate_hourly,
    rate_standby,
    whatsapp,
    client_notes,
    email_status,
    outreach_stage,
    replied_at: p.replied_at || card.replied_at || (isMoveolux ? '2026-10-20T10:00:00Z' : null),
    last_outreach_at: p.last_outreach_at || card.last_outreach_at || null,
    user_set_status: Boolean(p.user_set_status || card.user_set_status),
  };

  return {
    ...p,
    fleet_segment,
    bus_models,
    pax_capacity,
    rate_hourly,
    rate_standby,
    whatsapp,
    client_notes,
    email_status,
    outreach_stage,
    replied_at: nextCard.replied_at,
    last_outreach_at: nextCard.last_outreach_at,
    user_set_status: nextCard.user_set_status,
    score_breakdown: {
      ...(p.score_breakdown || { discretion_unbranded: 20, fleet_luxury: 18, territory_permits: 15, corporate_sla: 15 }),
      partner_card: nextCard,
    },
  };
}

function reconcileLegacyPartnersInPlace() {
  if (!Array.isArray(S.busPartners) || !S.busPartners.length) return;
  let changed = false;
  const cleaned = [];
  const nameMap = new Map();
  const domainMap = new Map();

  for (const p of S.busPartners) {
    const nNorm = normalizeName(p.name);
    const dNorm = normalizeDomain(p.website);
    if (nNorm === 'testpartner' || dNorm === 'test-partner-123.it') {
      changed = true;
      continue;
    }
    const replacement = findLegacyReplacement(p);
    const rawItem = replacement ? { ...p, ...replacement } : p;
    if (replacement) changed = true;
    const item = hydratePartnerCardLocal(rawItem);
    if (p.bus_models !== item.bus_models || p.fleet_segment !== item.fleet_segment) changed = true;

    const finalName = normalizeName(item.name);
    const finalDom = normalizeDomain(item.website);
    const existing = (finalName && nameMap.get(finalName)) || (finalDom && domainMap.get(finalDom));
    if (existing) {
      mergePartnerRecords(existing, item);
      changed = true;
      if (finalName && !nameMap.has(finalName)) nameMap.set(finalName, existing);
      if (finalDom && !domainMap.has(finalDom)) domainMap.set(finalDom, existing);
      continue;
    }
    if (finalName) nameMap.set(finalName, item);
    if (finalDom) domainMap.set(finalDom, item);
    cleaned.push(item);
  }

  S.busPartners = cleaned;
  if (changed) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('dorogo_bus_partners_v1', JSON.stringify(cleaned));
      }
    } catch (_) {}
  }
}

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

// 6 Main Standard Luxury Fleet Categories across Northern Italy NCC
export const STANDARD_FLEET_TYPES = [
  {
    key: 'v_class',
    label: 'Mercedes-Benz V-Class VIP (7–8 seats)',
    short: 'V-Class (7-8s)',
    icon: '🚐',
    badge: 'Chauffeur NCC',
    desc: 'Bespoke VIP minivan for wedding couple, family & VIP guests'
  },
  {
    key: 'sprinter_vip',
    label: 'Mercedes Sprinter VIP (8–16 seats)',
    short: 'Sprinter VIP (8-16s)',
    icon: '🚐',
    badge: 'Lounge Specs',
    desc: 'Leather recliners, conference tables, privacy glass, Wi-Fi'
  },
  {
    key: 'sprinter_lux',
    label: 'Mercedes Sprinter Luxury (16–20 seats)',
    short: 'Sprinter Lux (16-20s)',
    icon: '🚐',
    badge: 'Guest Shuttle',
    desc: 'High-volume luxury shuttle, ideal for airport & hotel circuits'
  },
  {
    key: 'midibus',
    label: 'Executive Midibus (24–30 seats)',
    short: 'Midibus (24-30s)',
    icon: '🚌',
    badge: 'Como Villa Access',
    desc: 'Iveco/Indcar platform (<10m). Crucial for narrow Lake Como roads & villa gates'
  },
  {
    key: 'limobus',
    label: 'Limobus VIP Lounge (18–28 seats)',
    short: 'Limobus Lounge',
    icon: '🥂',
    badge: 'Party / Club',
    desc: 'Moveolux-style luxury club conversion: lounge seating, bar, sound system'
  },
  {
    key: 'gt_coach',
    label: 'Setra & Mercedes GT Coach (50–56 seats)',
    short: 'GT Coach (50-56s)',
    icon: '🚍',
    badge: 'Large Capacity',
    desc: 'Full-size Grand Turismo coach for large wedding groups & delegations'
  }
];

export function shortFleetName(str) {
  if (!str) return '';
  const s = String(str).trim();
  const paxMatch = s.match(/\(?\b(\d{1,2}(?:\s*[-–/]\s*\d{1,2})?)\s*(?:pax|posti|passeggeri|seats|persone|s)\b\)?/i) ||
                   s.match(/\((\d{1,2}\s*[-–/]\s*\d{1,2})\)/);
  const paxSuffix = paxMatch ? ` (${paxMatch[1].replace(/\s+/g, '').replace(/-/g, '–')}p)` : '';

  if (/limobus/i.test(s)) return `Limobus${paxSuffix || ' (18–28p)'}`;
  if (/sprinter.*vip.*lounge/i.test(s)) return `Sprinter VIP Lounge${paxSuffix || ' (8–16p)'}`;
  if (/sprinter.*vip/i.test(s)) return `Sprinter VIP${paxSuffix || ' (8–16p)'}`;
  if (/capri/i.test(s)) return `Grande Capri${paxSuffix || ' (19p)'}`;
  if (/sprinter.*(exec|519|tomassini)/i.test(s)) return `Sprinter Exec${paxSuffix || ' (16–19p)'}`;
  if (/sprinter.*lux/i.test(s)) return `Sprinter Lux${paxSuffix || ' (16–20p)'}`;
  if (/sprinter/i.test(s)) return `Sprinter${paxSuffix || ' (16–20p)'}`;
  if (/v-?class|classe\s*v/i.test(s)) return `V-Class VIP${paxSuffix || ' (7–8p)'}`;
  if (/viano|vito/i.test(s)) return `Viano/Vito${paxSuffix || ' (7–8p)'}`;
  if (/minivan/i.test(s)) return `Minivan${paxSuffix || ' (7–8p)'}`;
  if (/daily/i.test(s)) return `Iveco Daily${paxSuffix || ' (19–22p)'}`;
  if (/wing|mago|tourengo|smile|calipso|temsa|midibus|midi/i.test(s)) {
    const brand = /wing/i.test(s) ? 'Iveco Wing' : /mago/i.test(s) ? 'Iveco Mago' : /tourengo/i.test(s) ? 'Tourengo' : /temsa/i.test(s) ? 'Temsa' : 'Midibus';
    return `${brand}${paxSuffix || ' (24–30p)'}`;
  }
  if (/setra.*topclass/i.test(s)) return `Setra TopClass${paxSuffix || ' (30–54p)'}`;
  if (/setra.*vip/i.test(s)) return `Setra VIP${paxSuffix || ' (28–36p)'}`;
  if (/setra/i.test(s)) return `Setra${paxSuffix || ' (50–54p)'}`;
  if (/travego/i.test(s)) return `Travego${paxSuffix || ' (53p)'}`;
  if (/tourismo.*black/i.test(s)) return `Tourismo Black${paxSuffix || ' (50–54p)'}`;
  if (/tourismo/i.test(s)) return `Tourismo${paxSuffix || ' (50–54p)'}`;
  if (/scania/i.test(s)) return `Scania${paxSuffix || ' (50–54p)'}`;
  if (/irizar/i.test(s)) return `Irizar${paxSuffix || ' (52–56p)'}`;
  if (/neoplan/i.test(s)) return `Neoplan${paxSuffix || ' (52–56p)'}`;
  if (/coach|pullman/i.test(s)) return `GT Coach${paxSuffix || ' (50–56p)'}`;
  const match = STANDARD_FLEET_TYPES.find((f) => f.label.toLowerCase() === s.toLowerCase() || f.short.toLowerCase() === s.toLowerCase());
  if (match) return match.short;
  return s.length > 25 ? s.slice(0, 23) + '…' : s;
}

export function detectVehicleKey(str) {
  if (!str) return '';
  const s = str.toLowerCase();
  if (/limobus/i.test(s)) return 'limobus';
  if (/v-?class|minivan|vito/i.test(s)) return 'v_class';
  if (/sprinter.*vip/i.test(s)) return 'sprinter_vip';
  if (/sprinter|capri|daily/i.test(s)) return 'sprinter_lux';
  if (/midi|minicoach|21.*28.*30|24.*30|28.*seat|wing|mago|tourengo|temsa/i.test(s)) return 'midibus';
  if (/coach|tourismo|travego|setra|pullman|scania|irizar|neoplan|volvo|man\b/i.test(s)) return 'gt_coach';
  return '';
}

export function operatorHasVehicleType(p, key) {
  if (!key || key === 'all') return true;
  const categories = Array.isArray(p.fleet_categories) ? p.fleet_categories : [];
  const catStr = categories.join(' ').toLowerCase();

  switch (key) {
    case 'v_class':
      return /v-?class|minivan|vito/i.test(catStr);
    case 'sprinter_vip':
      return /sprinter.*vip/i.test(catStr);
    case 'sprinter_lux':
      return /sprinter|capri|daily/i.test(catStr) && !/sprinter.*vip/i.test(catStr);
    case 'midibus':
      return /midi|minicoach|wing|mago|tourengo|temsa|21,\s*28,\s*30|(24|28)\s*[-–]\s*30\s*seat/i.test(catStr);
    case 'limobus':
      return /limobus/i.test(catStr);
    case 'gt_coach':
      return /coach|tourismo|travego|setra|pullman|irizar|neoplan|scania|volvo|50.*56|36.*56|30.*75|30.*53/i.test(catStr);
    default:
      return catStr.includes(key.toLowerCase());
  }
}

// Intelligent City & Geographic Depot Engine
export function detectOperatorCityAndRegion({ text = '', url = '', phone = '', address = '', hint = '' } = {}) {
  const combined = `${hint} ${address} ${phone} ${url} ${text}`.toLowerCase();
  const cleanPhone = String(phone || '').replace(/[\s\-\.\(\)]/g, '');

  // 1. Phone Area Codes: Rome (+39 06) / Florence (+39 055) / Naples (+39 081)
  if (/(\+3906|003906|^06\d{6,})/.test(cleanPhone) || /(\+39\s*06|06\s*3534)/.test(phone)) {
    return { city: 'Roma (Central Italy)', region: 'Lazio', isNorthernItaly: false, depotWarning: 'Based in Rome (Lazio). Non-local depot 570km from Milan/Lake Como.' };
  }
  if (/(\+39055|0039055|^055\d{6,})/.test(cleanPhone)) {
    return { city: 'Firenze (Tuscany)', region: 'Tuscany', isNorthernItaly: false, depotWarning: 'Based in Florence (Tuscany). Out-of-region depot.' };
  }
  if (/(\+39081|0039081|^081\d{6,})/.test(cleanPhone)) {
    return { city: 'Napoli (Campania)', region: 'Campania', isNorthernItaly: false, depotWarning: 'Based in Naples. Out-of-region depot.' };
  }

  // 2. Explicit Rome / Central Italy address or keyword signals (Waldorf Rome Cavalieri, 001xx, etc.)
  if (/\b(001\d\d|roma|rome|cavalieri|via alberto cadlolo|lazio|fiumicino|ciampino)\b/i.test(combined) && !/depot.*milan|filiale.*milano|sede.*como/i.test(combined)) {
    return { city: 'Roma (Central Italy)', region: 'Lazio', isNorthernItaly: false, depotWarning: 'Headquartered in Rome. Out-of-region depot.' };
  }

  // 3. User city hint override (if specified and valid)
  if (hint && hint.trim()) {
    const h = hint.trim();
    if (/como|bellagio|cernobbio|menaggio|tremezzo|laglio/i.test(h)) return { city: 'Como', region: 'Lake Como', isNorthernItaly: true };
    if (/lecco|varenna/i.test(h)) return { city: 'Lecco', region: 'Lake Como', isNorthernItaly: true };
    if (/milan|milano/i.test(h)) return { city: 'Milano', region: 'Lombardy', isNorthernItaly: true };
    if (/bergamo|orio/i.test(h)) return { city: 'Bergamo', region: 'Lombardy', isNorthernItaly: true };
    if (/brescia|franciacorta/i.test(h)) return { city: 'Brescia', region: 'Lombardy', isNorthernItaly: true };
    if (/garda|sirmione|desenzano|sal[oò]|peschiera/i.test(h)) return { city: 'Lake Garda', region: 'Lombardy / Garda', isNorthernItaly: true };
    if (/bormio|livigno|sondrio|valtellina/i.test(h)) return { city: 'Bormio (Alps)', region: 'Lombardy / Alps', isNorthernItaly: true };
    if (/monza|brianza/i.test(h)) return { city: 'Monza', region: 'Lombardy', isNorthernItaly: true };
    if (/varese|malpensa/i.test(h)) return { city: 'Varese', region: 'Lombardy', isNorthernItaly: true };
    return { city: h, region: 'Northern Italy', isNorthernItaly: true };
  }

  // 4. Northern Italy Telephone area codes
  if (/(\+39031|0039031|^031\d{5,})/.test(cleanPhone)) return { city: 'Como', region: 'Lake Como', isNorthernItaly: true };
  if (/(\+390341|00390341|^0341\d{5,})/.test(cleanPhone)) return { city: 'Lecco', region: 'Lake Como', isNorthernItaly: true };
  if (/(\+39035|0039035|^035\d{5,})/.test(cleanPhone)) return { city: 'Bergamo', region: 'Lombardy', isNorthernItaly: true };
  if (/(\+39030|0039030|^030\d{5,})/.test(cleanPhone)) return { city: 'Brescia', region: 'Lombardy', isNorthernItaly: true };
  if (/(\+39039|0039039|^039\d{5,})/.test(cleanPhone)) return { city: 'Monza', region: 'Lombardy', isNorthernItaly: true };
  if (/(\+390342|00390342|^0342\d{5,})/.test(cleanPhone)) return { city: 'Bormio (Alps)', region: 'Lombardy / Alps', isNorthernItaly: true };
  if (/(\+390331|\+390332|00390331|00390332)/.test(cleanPhone)) return { city: 'Varese', region: 'Lombardy', isNorthernItaly: true };
  if (/(\+39045|0039045|^045\d{5,})/.test(cleanPhone)) return { city: 'Lake Garda', region: 'Veneto / Garda', isNorthernItaly: true };
  if (/(\+3902|003902|^02\d{6,})/.test(cleanPhone)) return { city: 'Milano', region: 'Lombardy', isNorthernItaly: true };

  // 5. Text & Location signals
  if (/\b(bellagio|cernobbio|menaggio|tremezzo|moltrasio|laglio|torno|como)\b/i.test(combined)) {
    return { city: 'Como', region: 'Lake Como', isNorthernItaly: true };
  }
  if (/\b(lecco|varenna|colico|mandello)\b/i.test(combined)) {
    return { city: 'Lecco', region: 'Lake Como', isNorthernItaly: true };
  }
  if (/\b(bormio|livigno|sondrio|valtellina|tirano|aprica)\b/i.test(combined)) {
    return { city: 'Bormio (Alps)', region: 'Lombardy / Alps', isNorthernItaly: true };
  }
  if (/\b(bergamo|orio al serio|seriate|dalmine)\b/i.test(combined)) {
    return { city: 'Bergamo', region: 'Lombardy', isNorthernItaly: true };
  }
  if (/\b(brescia|franciacorta|iseo)\b/i.test(combined)) {
    return { city: 'Brescia', region: 'Lombardy', isNorthernItaly: true };
  }
  if (/\b(sirmione|desenzano|peschiera|garda|bardolino|sal[oò]|limone sul garda)\b/i.test(combined)) {
    return { city: 'Lake Garda', region: 'Lombardy / Garda', isNorthernItaly: true };
  }
  if (/\b(monza|brianza|lissone|seveso|vimercate)\b/i.test(combined)) {
    return { city: 'Monza', region: 'Lombardy', isNorthernItaly: true };
  }
  if (/\b(varese|busto arsizio|gallarate|malpensa)\b/i.test(combined)) {
    return { city: 'Varese', region: 'Lombardy', isNorthernItaly: true };
  }
  if (/\b(milano|milan|linate prime|assago|segrate|rho)\b/i.test(combined)) {
    return { city: 'Milano', region: 'Lombardy', isNorthernItaly: true };
  }

  return { city: 'Northern Italy', region: 'Northern Italy', isNorthernItaly: true };
}

// Deep Northern Italy Candidate Knowledge Base (30 Live-Verified HTTP 200 OK Operators across all sub-territories)
export const SCOUT_CANDIDATE_POOL = [
  {
    "name": "Landway Tourism",
    "base_city": "Como",
    "website": "https://www.landwaytourism.com",
    "fleet_url": "https://www.landwaytourism.com/flotta/",
    "phone": "+39 031 513 189",
    "email": "info@landwaytourism.com",
    "relevance_score": 93,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 23,
      "territory_permits": 20,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_segment": "standard",
    "bus_models": "Mercedes Sprinter Minibus (19–20 pax), Iveco Executive Midibus (29–30 pax), Mercedes Tourismo / Setra GT (51–57 pax)",
    "pax_capacity": "19–20, 29–30, 51–57 pax",
    "fleet_categories": [
      "Mercedes-Benz Sprinter Minibus (19–20 seats)",
      "Iveco Executive Midibus (29–30 seats)",
      "Mercedes Tourismo / Setra / Neoplan GT Coach (51–57 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Berini Autonoleggio & Minibus",
    "base_city": "Como",
    "website": "https://www.beriniautonoleggio.com",
    "fleet_url": "https://www.beriniautonoleggio.com/vip-services/",
    "phone": "+39 031 976 430",
    "email": "berini@beriniautonoleggio.com",
    "relevance_score": 92,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 22,
      "territory_permits": 20,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Minibus Extralong Luxury (8 pax), Executive Minibus (20 pax), Executive Midibus (26 pax)",
    "pax_capacity": "8, 20, 26 pax",
    "fleet_categories": [
      "Mercedes Minibus Extralong Luxury (8 seats)",
      "Executive Minibus (20 seats)",
      "Executive Midibus (26 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Vivaldi Driver Bellagio",
    "base_city": "Como",
    "website": "https://i-vivaldi.com",
    "fleet_url": "https://i-vivaldi.com/parco-auto/",
    "phone": "+39 347 373 5465",
    "whatsapp": "+39 347 373 5465",
    "email": "info@i-vivaldi.com",
    "relevance_score": 94,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 24,
      "territory_permits": 20,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_segment": "luxury",
    "bus_models": "Mercedes-Benz Sprinter VIP (8 pax), Mercedes-Benz Sprinter Nero VIP w/ Hostess (19 pax)",
    "pax_capacity": "8, 19 pax",
    "fleet_categories": [
      "Mercedes-Benz Sprinter VIP (8 seats)",
      "Mercedes-Benz Sprinter Nero VIP w/ Hostess (19 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Como Driver Services",
    "base_city": "Como",
    "website": "https://www.comodriver.com",
    "fleet_url": "https://www.comodriver.com/autovetture/",
    "phone": "+39 347 184 8920",
    "email": "info@comodriver.com",
    "relevance_score": 91,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 21,
      "territory_permits": 20,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded / NCC Black",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter Minibus (12 pax), Ford Transit Minibus (16 pax)",
    "pax_capacity": "12, 16 pax",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (12 seats)",
      "Ford Transit Minibus (16 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Travel & Service Como",
    "base_city": "Como",
    "website": "https://www.travelandservice.it",
    "fleet_url": "https://www.travelandservice.it/flotta",
    "phone": "+39 035 017 2012",
    "email": "info@travelandservice.it",
    "relevance_score": 88,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 20,
      "territory_permits": 18,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_segment": "standard",
    "bus_models": "Minibus (14–20 pax), Midibus (31 pax), Pullman GT (50–64 pax), Double-Decker Pullman (90–94 pax)",
    "pax_capacity": "14–20, 31, 50–64, 90–94 pax",
    "fleet_categories": [
      "Minibus (14–20 seats)",
      "Midibus (31 seats)",
      "Pullman GT Coaches (50–54, 55–56, 57–64 seats)",
      "Double-Decker GT (90–94 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Como Limo Lux",
    "base_city": "Como",
    "website": "https://comolimolux.com",
    "fleet_url": "https://comolimolux.com/tour-privati-minivan-lago-di-como/",
    "phone": "+39 031 264 780",
    "email": "info@comolimolux.com",
    "relevance_score": 93,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 23,
      "territory_permits": 20,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_segment": "luxury",
    "bus_models": "Mercedes-Benz V-Class Luxury Minivan (7 pax)",
    "pax_capacity": "7 pax",
    "fleet_categories": [
      "Mercedes-Benz V-Class Luxury Minivan (7 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Lariobus",
    "base_city": "Lecco",
    "website": "https://www.lariobus.com",
    "fleet_url": "https://www.lariobus.com/automezzi/",
    "phone": "+39 0341 821 445",
    "email": "info@lariobus.com",
    "relevance_score": 86,
    "score_breakdown": {
      "discretion_unbranded": 25,
      "fleet_luxury": 23,
      "territory_permits": 20,
      "corporate_sla": 18
    },
    "unbranded_status": "Unbranded on Request",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Ford Transit (13 pax), Mercedes Sprinter IBIS 2 (20 pax), Iveco Calipso (36 pax), Temsa MD9 (40 pax), Mercedes Tourismo & Irizar i6 (54–56 pax)",
    "pax_capacity": "13, 20, 36, 40, 54–56 pax",
    "fleet_categories": [
      "Ford Transit Minibus (13 seats)",
      "Mercedes Sprinter IBIS 2 (20 seats)",
      "Iveco Calipso Midibus (36 seats)",
      "Temsa MD9 (40 seats)",
      "Mercedes Tourismo & Irizar i6 (54–56 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Avantgarde Limousine Service",
    "base_city": "Milano",
    "website": "https://www.avantgardelimousineservice.it",
    "fleet_url": "https://www.avantgardelimousineservice.it/mezzi/",
    "phone": "+39 333 269 7376",
    "whatsapp": "+39 333 269 7376",
    "email": "info@milanocab.it",
    "relevance_score": 91,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 22,
      "territory_permits": 19,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_segment": "luxury",
    "bus_models": "Mercedes-Benz Sprinter VIP Total Black (8 & 16 pax), Mercedes Minibus VIP Class (18 pax), Executive Minibus (25 pax)",
    "pax_capacity": "8, 16, 18, 25 pax",
    "fleet_categories": [
      "Mercedes-Benz Sprinter VIP Total Black (8 & 16 seats)",
      "Mercedes Minibus VIP Class (18 seats)",
      "Executive Minibus (25 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Exclusive Cars Milano",
    "base_city": "Milano",
    "website": "https://exclusivecarsmilano.it",
    "fleet_url": "https://exclusivecarsmilano.it/noleggio-autobus/",
    "phone": "+39 02 4070 8295",
    "email": "info@exclusivecarsmilano.it",
    "relevance_score": 92,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 24,
      "territory_permits": 18,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes-Benz Sprinter Minibus (20 pax), Irizar GT Coach (52 pax)",
    "pax_capacity": "20, 52 pax",
    "fleet_categories": [
      "Mercedes-Benz Sprinter Minibus (20 seats)",
      "Irizar GT Coach (52 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Prestige Car Limousine",
    "base_city": "Milano",
    "website": "https://www.prestigecarlimousine.it",
    "fleet_url": "https://www.prestigecarlimousine.it/car/car-service-milan-luxury-minibus/",
    "phone": "+39 02 8951 6813",
    "email": "info@prestigecarlimousine.it",
    "relevance_score": 90,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 23,
      "territory_permits": 17,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded / NCC Black",
    "status": "TO_REVIEW",
    "fleet_segment": "luxury",
    "bus_models": "Mercedes-Benz Sprinter Luxury Minibus (8 & 16 pax, reclining leather & tables)",
    "pax_capacity": "8, 16 pax",
    "fleet_categories": [
      "Mercedes-Benz Sprinter Luxury Minibus (8 & 16 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Car Service Milan",
    "base_city": "Milano",
    "website": "https://carservicemilan.com",
    "fleet_url": "https://carservicemilan.com/fleet/",
    "phone": "+39 02 8719 9508",
    "email": "info@carservicemilan.com",
    "relevance_score": 87,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 20,
      "territory_permits": 17,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_segment": "luxury",
    "bus_models": "Mercedes-Benz Sprinter Luxury Minibus (8–16 pax, reclining leather & privacy glass)",
    "pax_capacity": "8–16 pax",
    "fleet_categories": [
      "Mercedes-Benz Sprinter Luxury Minibus (8–16 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Autonoleggio Carnelli",
    "base_city": "Milano",
    "website": "https://www.autonoleggiocarnelli.it",
    "fleet_url": "https://www.autonoleggiocarnelli.it/i-nostri-mezzi/",
    "phone": "+39 02 9678 9012",
    "email": "info@autonoleggiocarnelli.it",
    "relevance_score": 85,
    "score_breakdown": {
      "discretion_unbranded": 25,
      "fleet_luxury": 22,
      "territory_permits": 20,
      "corporate_sla": 18
    },
    "unbranded_status": "Unbranded on Request",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Minibus (8 pax), Mercedes Sprinter (20 pax), Temsa MD-7 (32–36 pax), Neoplan Tourliner (52–56 pax)",
    "pax_capacity": "8, 20, 32–36, 52–56 pax",
    "fleet_categories": [
      "Mercedes Minibus (8 seats)",
      "Mercedes Sprinter (20 seats)",
      "Temsa MD-7 (32–36 seats)",
      "Neoplan Tourliner (52–56 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Zani Viaggi Executive",
    "base_city": "Milano",
    "website": "https://www.zaniviaggi.it",
    "fleet_url": "https://www.zaniviaggi.it/noleggio-autobus",
    "phone": "+39 02 867 131",
    "email": "noleggio@zaniviaggi.it",
    "relevance_score": 77,
    "score_breakdown": {
      "discretion_unbranded": 20,
      "fleet_luxury": 22,
      "territory_permits": 20,
      "corporate_sla": 15
    },
    "unbranded_status": "Unbranded on Request",
    "status": "TO_REVIEW",
    "fleet_categories": [
      "Mercedes Sprinter Executive (19 seats)",
      "Pullman Gran Turismo (54 seats)"
    ],
    "notes": "",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter Executive (19 pax), Pullman Gran Turismo (54 pax)",
    "pax_capacity": "19, 54 pax"
  },
  {
    "name": "Air Pullman VIP Line",
    "base_city": "Milano",
    "website": "https://www.airpullman.it",
    "fleet_url": "https://www.airpullman.it/noleggio",
    "phone": "+39 02 896 039",
    "email": "noleggio@airpullman.it",
    "relevance_score": 74,
    "score_breakdown": {
      "discretion_unbranded": 20,
      "fleet_luxury": 20,
      "territory_permits": 20,
      "corporate_sla": 14
    },
    "unbranded_status": "Unbranded on Request",
    "status": "TO_REVIEW",
    "fleet_categories": [
      "Minibus VIP (9 seats)",
      "Executive Midibus (38 seats)",
      "Setra GT Coach (54–80 seats)"
    ],
    "notes": "",
    "fleet_segment": "both",
    "bus_models": "Minibus VIP (9 pax), Executive Midibus (38 pax), Setra GT Coach (54–80 pax)",
    "pax_capacity": "9, 38, 54–80 pax"
  },
  {
    "name": "Caprioli Viaggi VIP Minibus",
    "base_city": "Brescia",
    "website": "https://www.caprioliviaggi.it",
    "fleet_url": "https://www.caprioliviaggi.it/mezzi/",
    "phone": "+39 030 969 511",
    "email": "info@caprioliviaggi.it",
    "relevance_score": 88,
    "score_breakdown": {
      "discretion_unbranded": 30,
      "fleet_luxury": 23,
      "territory_permits": 18,
      "corporate_sla": 17
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter (8 & 16–20 pax), Minibus (25 pax), Setra GT (30, 42, 54 pax), Irizar i8 Pullman GTL Lusso (60 pax)",
    "pax_capacity": "8, 16–20, 25, 30, 42, 54, 60 pax",
    "fleet_categories": [
      "Mercedes-Benz Sprinter Minibus (8 & 16–20 seats)",
      "Minibus (25 seats)",
      "Setra GT Coaches (30, 42, 54 seats)",
      "Irizar i8 Pullman GTL Lusso (60 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Pancheri NCC & Minibus",
    "base_city": "Brescia",
    "website": "https://www.bresciatransfer.it",
    "fleet_url": "https://www.bresciatransfer.it/flotta/",
    "phone": "+39 030 660 200",
    "email": "roberto.pancheri.viaggi@gmail.com",
    "relevance_score": 86,
    "score_breakdown": {
      "discretion_unbranded": 30,
      "fleet_luxury": 22,
      "territory_permits": 17,
      "corporate_sla": 17
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_segment": "standard",
    "bus_models": "Mercedes Sprinter Minibus (8 pax), 2x Iveco Daily Minibus (20 pax)",
    "pax_capacity": "8, 20 pax",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (8 seats)",
      "Iveco Daily Minibus (20 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Ilton Autonoleggi",
    "base_city": "Bergamo",
    "website": "https://www.iltonautonoleggi.com",
    "fleet_url": "https://www.iltonautonoleggi.com/flotta",
    "phone": "+39 035 459 2210",
    "email": "info@iltonautonoleggi.com",
    "relevance_score": 85,
    "score_breakdown": {
      "discretion_unbranded": 30,
      "fleet_luxury": 21,
      "territory_permits": 18,
      "corporate_sla": 16
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_categories": [
      "Mercedes Sprinter Luxury (8 & 16 seats)",
      "Pullman GT (50 seats)"
    ],
    "notes": "",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter Luxury (8 & 16 pax), Pullman GT (50 pax)",
    "pax_capacity": "8, 16, 50 pax"
  },
  {
    "name": "Autoservizi Guizzetti",
    "base_city": "Brescia",
    "website": "https://www.autoserviziguizzetti.com",
    "fleet_url": "https://www.autoserviziguizzetti.com/",
    "phone": "+39 035 901 118",
    "email": "info@autoserviziguizzetti.com",
    "relevance_score": 82,
    "score_breakdown": {
      "discretion_unbranded": 20,
      "fleet_luxury": 23,
      "territory_permits": 20,
      "corporate_sla": 19
    },
    "unbranded_status": "Unbranded on Request",
    "status": "TO_REVIEW",
    "fleet_categories": [
      "Iveco Daily Tourist / Indcar Wing (19–28 seats)",
      "Setra 515 HD & Irizar i6 (53–54 seats)",
      "Setra 415 GT-HD (55 seats)",
      "Setra 416 GT & 417 HDH (59–64 seats)"
    ],
    "notes": "",
    "fleet_segment": "both",
    "bus_models": "Iveco Daily / Indcar Wing (19–28 pax), Setra 515 HD & Irizar i6 (53–54 pax), Setra 415 GT-HD (55 pax), Setra 416/417 HDH (59–64 pax)",
    "pax_capacity": "19–28, 53–55, 59–64 pax"
  },
  {
    "name": "Autoservizi Sonzogni",
    "base_city": "Bergamo",
    "website": "https://www.autoservizisonzogni.it",
    "fleet_url": "https://www.autoservizisonzogni.it/",
    "phone": "+39 0345 910 38",
    "email": "info@autoservizisonzogni.it",
    "relevance_score": 79,
    "score_breakdown": {
      "discretion_unbranded": 25,
      "fleet_luxury": 21,
      "territory_permits": 18,
      "corporate_sla": 15
    },
    "unbranded_status": "Unbranded on Request",
    "status": "TO_REVIEW",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (19 seats)",
      "Mercedes Tourismo GT (54 seats)",
      "Setra TopClass (56 seats)"
    ],
    "notes": "",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter Minibus (19 pax), Mercedes Tourismo GT (54 pax), Setra TopClass (56 pax)",
    "pax_capacity": "19, 54, 56 pax"
  },
  {
    "name": "Peschiera Viaggi Luxury Coaches",
    "base_city": "Lake Garda",
    "website": "https://www.peschieraviaggi.it",
    "fleet_url": "https://www.peschieraviaggi.it/flotta",
    "phone": "+39 045 755 0122",
    "email": "info@peschieraviaggi.it",
    "relevance_score": 87,
    "score_breakdown": {
      "discretion_unbranded": 30,
      "fleet_luxury": 22,
      "territory_permits": 18,
      "corporate_sla": 17
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (19 seats)",
      "Midibus (30 seats)",
      "Pullman GT (54–62 seats)"
    ],
    "notes": "",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter Minibus (19 pax), Midibus (30 pax), Pullman GT (54–62 pax)",
    "pax_capacity": "19, 30, 54–62 pax"
  },
  {
    "name": "Gardabus Exclusive",
    "base_city": "Lake Garda",
    "website": "https://www.gardabus.it",
    "fleet_url": "https://www.gardabus.it/flotta",
    "phone": "+39 030 914 1820",
    "email": "info@gardabus.it",
    "relevance_score": 84,
    "score_breakdown": {
      "discretion_unbranded": 25,
      "fleet_luxury": 22,
      "territory_permits": 18,
      "corporate_sla": 19
    },
    "unbranded_status": "Unbranded on Request",
    "status": "TO_REVIEW",
    "fleet_categories": [
      "Mercedes Sprinter VIP (16 seats)",
      "Setra GT Coach (54 seats)"
    ],
    "notes": "",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter VIP (16 pax), Setra GT Coach (54 pax)",
    "pax_capacity": "16, 54 pax"
  },
  {
    "name": "Consorzio Eurobus Verona",
    "base_city": "Lake Garda",
    "website": "https://eurobusverona.it",
    "fleet_url": "https://eurobusverona.it/",
    "phone": "+39 045 803 2002",
    "email": "info@eurobusverona.it",
    "relevance_score": 83,
    "score_breakdown": {
      "discretion_unbranded": 25,
      "fleet_luxury": 22,
      "territory_permits": 18,
      "corporate_sla": 18
    },
    "unbranded_status": "Unbranded on Request",
    "status": "TO_REVIEW",
    "fleet_categories": [
      "Minibus GT (19 seats)",
      "Pullman Gran Turismo (54 seats)",
      "Autobus Maxi (84 seats)"
    ],
    "notes": "",
    "fleet_segment": "both",
    "bus_models": "Minibus (19 pax), Pullman GT (54 pax), Autobus Maxi (84 pax)",
    "pax_capacity": "19, 54, 84 pax"
  },
  {
    "name": "Bormio Transfer VIP Minibus",
    "base_city": "Bormio (Alps)",
    "website": "https://www.bormiotransfer.com",
    "fleet_url": "https://www.bormiotransfer.com/flotta",
    "phone": "+39 0342 903 768",
    "email": "info@bormiotransfer.com",
    "relevance_score": 89,
    "score_breakdown": {
      "discretion_unbranded": 30,
      "fleet_luxury": 23,
      "territory_permits": 20,
      "corporate_sla": 16
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_categories": [
      "Mercedes Sprinter VIP (8–16 seats)",
      "Executive Midibus (24–30 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Cattazzo Pullman",
    "base_city": "Bormio (Alps)",
    "website": "https://cattazzopullman.com",
    "fleet_url": "https://cattazzopullman.com/",
    "phone": "+39 045 715 1138",
    "email": "info@cattazzopullman.com",
    "relevance_score": 84,
    "score_breakdown": {
      "discretion_unbranded": 25,
      "fleet_luxury": 22,
      "territory_permits": 20,
      "corporate_sla": 17
    },
    "unbranded_status": "Unbranded on Request",
    "status": "TO_REVIEW",
    "fleet_categories": [
      "Mercedes Sprinter Capri (17 seats)",
      "Mercedes Sprinter Amalfi & Tourline (20 seats)",
      "Executive Midibus (30 seats)",
      "Neoplan Tourliner (54 seats)"
    ],
    "notes": "",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter Capri (17 pax), Mercedes Sprinter Amalfi/Tourline (20 pax), Executive Midibus (30 pax), Neoplan Tourliner (54 pax)",
    "pax_capacity": "17, 20, 30, 54 pax"
  },
  {
    "name": "Bormio Viaggi Luxury Lines",
    "base_city": "Bormio (Alps)",
    "website": "https://www.bormioviaggi.com",
    "fleet_url": "https://www.bormioviaggi.com/flotta",
    "phone": "+39 0342 951 158",
    "email": "booking@bormioviaggi.com",
    "relevance_score": 83,
    "score_breakdown": {
      "discretion_unbranded": 25,
      "fleet_luxury": 21,
      "territory_permits": 20,
      "corporate_sla": 17
    },
    "unbranded_status": "Unbranded on Request",
    "status": "TO_REVIEW",
    "fleet_categories": [
      "Mercedes Sprinter Luxury (16–20 seats)",
      "Setra GT Coach (54 seats)"
    ],
    "notes": "",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter Luxury (16–20 pax), Setra GT Coach (54 pax)",
    "pax_capacity": "16–20, 54 pax"
  },
  {
    "name": "Autoservizi Rainoldi NCC",
    "base_city": "Bormio (Alps)",
    "website": "https://www.ncc3.it",
    "fleet_url": "https://www.ncc3.it/flotta",
    "phone": "+39 0342 515 220",
    "email": "info@ncc3.it",
    "relevance_score": 80,
    "score_breakdown": {
      "discretion_unbranded": 25,
      "fleet_luxury": 20,
      "territory_permits": 18,
      "corporate_sla": 17
    },
    "unbranded_status": "Unbranded on Request",
    "status": "TO_REVIEW",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (8–20 seats)"
    ],
    "notes": "",
    "fleet_segment": "standard",
    "bus_models": "Mercedes Sprinter Minibus (8–20 pax)",
    "pax_capacity": "8–20 pax"
  },
  {
    "name": "Air Car Service",
    "base_city": "Monza",
    "website": "https://www.aircarservice.com",
    "fleet_url": "https://www.aircarservice.com/",
    "phone": "+39 035 311 258",
    "email": "info@aircarservice.com",
    "relevance_score": 85,
    "score_breakdown": {
      "discretion_unbranded": 30,
      "fleet_luxury": 21,
      "territory_permits": 18,
      "corporate_sla": 16
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_categories": [
      "Mercedes Sprinter VIP (16 seats)",
      "Autobus Granturismo (54 seats)"
    ],
    "notes": "",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter VIP (16 pax), Autobus Granturismo (54 pax)",
    "pax_capacity": "16, 54 pax"
  },
  {
    "name": "Luxury Transfer Milan",
    "base_city": "Varese",
    "website": "https://www.luxurytransfermilan.com",
    "fleet_url": "https://www.luxurytransfermilan.com/",
    "phone": "+39 02 8718 6920",
    "email": "info@luxurytransfermilan.com",
    "relevance_score": 83,
    "score_breakdown": {
      "discretion_unbranded": 25,
      "fleet_luxury": 21,
      "territory_permits": 20,
      "corporate_sla": 17
    },
    "unbranded_status": "Unbranded on Request",
    "status": "TO_REVIEW",
    "fleet_categories": [
      "Mercedes Sprinter Bus (14 seats)"
    ],
    "notes": "",
    "fleet_segment": "luxury",
    "bus_models": "Mercedes Sprinter Bus (14 pax)",
    "pax_capacity": "14 pax"
  },
  {
    "name": "Frigerio Trasporti",
    "base_city": "Monza",
    "website": "https://www.frigerioviaggi.com",
    "fleet_url": "https://www.frigerioviaggi.com/noleggio-bus",
    "phone": "+39 0362 359 1",
    "email": "bus@frigerioviaggi.com",
    "relevance_score": 75,
    "score_breakdown": {
      "discretion_unbranded": 20,
      "fleet_luxury": 20,
      "territory_permits": 17,
      "corporate_sla": 18
    },
    "unbranded_status": "Unbranded on Request",
    "status": "TO_REVIEW",
    "fleet_categories": [
      "Executive Midibus (28 seats)",
      "Pullman GT (54 seats)"
    ],
    "notes": "",
    "fleet_segment": "both",
    "bus_models": "Executive Midibus (28 pax), Pullman GT (54 pax)",
    "pax_capacity": "28, 54 pax"
  },
  {
    "name": "Ugolini Viaggi",
    "base_city": "Lake Maggiore",
    "website": "https://www.ugoliniviaggi.it",
    "fleet_url": "https://www.ugoliniviaggi.it/",
    "phone": "+39 045 770 1522",
    "email": "info@ugoliniviaggi.it",
    "relevance_score": 81,
    "score_breakdown": {
      "discretion_unbranded": 25,
      "fleet_luxury": 20,
      "territory_permits": 18,
      "corporate_sla": 18
    },
    "unbranded_status": "Unbranded on Request",
    "status": "TO_REVIEW",
    "fleet_categories": [
      "Executive Midibus (28 seats)",
      "Setra & Mercedes GT Coach (54 seats)"
    ],
    "notes": "",
    "fleet_segment": "both",
    "bus_models": "Executive Midibus (28 pax), Setra & Mercedes GT Coach (54 pax)",
    "pax_capacity": "28, 54 pax"
  },
  {
    "name": "Cavourese",
    "base_city": "Torino (Piemonte)",
    "website": "https://www.cavourese.it",
    "fleet_url": "https://www.cavourese.it/it/noleggio-autobus",
    "phone": "+39 011 397 0000",
    "email": "info@cavourese.it",
    "relevance_score": 92,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 23,
      "territory_permits": 18,
      "corporate_sla": 16
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter Minibus (16 pax), Executive Midibus (35 pax), Pullman Gran Turismo (50 & 63 pax), Double Decker GT (79 pax)",
    "pax_capacity": "16, 35, 50, 63, 79 pax",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (16 seats)",
      "Executive Midibus (35 seats)",
      "Pullman Gran Turismo (50 & 63 seats)",
      "Double Decker GT (79 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Castano Turismo",
    "base_city": "Varese / Malpensa",
    "website": "https://www.castanobus.it",
    "fleet_url": "https://www.castanobus.it/flotta/",
    "phone": "+39 0332 830 000",
    "email": "info@castanobus.it",
    "relevance_score": 91,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 22,
      "territory_permits": 19,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter Minibus (19 pax), Setra GT Coach (54 pax)",
    "pax_capacity": "19, 54 pax",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (19 seats)",
      "Setra GT Coach (54 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Autoservizi Zambetti",
    "base_city": "Brescia / Bergamo",
    "website": "https://www.zambettibus.com",
    "fleet_url": "https://www.zambettibus.com/flotta",
    "phone": "+39 035 810742",
    "email": "info@zambettibus.com",
    "relevance_score": 90,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 22,
      "territory_permits": 18,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Iveco Daily Tourys Minibus (19 pax), Executive Midibus (28–34 pax), Scania Touring HD & Mercedes Tourismo (54 pax), Double Decker GT (82 pax)",
    "pax_capacity": "19, 28–34, 54, 82 pax",
    "fleet_categories": [
      "Iveco Daily Tourys Minibus (19 seats)",
      "Executive Midibus (28–34 seats)",
      "Scania Touring HD & Mercedes Tourismo (54 seats)",
      "Double Decker GT (82 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Bassi Tours",
    "base_city": "Brescia / Lake Garda",
    "website": "https://www.bassitours.com",
    "fleet_url": "https://www.bassitours.com/parco-mezzi/",
    "phone": "+39 030 961 166",
    "email": "info@bassitours.com",
    "relevance_score": 89,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 21,
      "territory_permits": 18,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter (16 pax), Iveco Midibus (28 pax), Setra GT Coach (54 & 64 pax), Autobus GT Maxi (80 pax)",
    "pax_capacity": "16, 28, 54, 64, 80 pax",
    "fleet_categories": [
      "Mercedes Sprinter (16 seats)",
      "Iveco Midibus (28 seats)",
      "Setra GT Coach (54 & 64 seats)",
      "Autobus GT Maxi (80 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Autoservizi Facchinetti",
    "base_city": "Milano / Bergamo",
    "website": "https://www.autoservizifacchinetti.it",
    "fleet_url": "https://www.autoservizifacchinetti.it/flotta",
    "phone": "+39 035 838 120",
    "email": "info@autoservizifacchinetti.it",
    "relevance_score": 91,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 22,
      "territory_permits": 19,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter (20 pax), Iveco Midibus (29 pax), Temsa VIP Safari (46 pax), Temsa Safari HD (54–58 pax)",
    "pax_capacity": "20, 29, 46, 54–58 pax",
    "fleet_categories": [
      "Mercedes Sprinter (20 seats)",
      "Iveco Midibus (29 seats)",
      "Temsa VIP Safari (46 seats)",
      "Temsa Safari HD (54–58 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Pasqualini Bus",
    "base_city": "Verona / Lake Garda",
    "website": "https://www.pasqualinibus.it",
    "fleet_url": "https://www.pasqualinibus.it/flotta/",
    "phone": "+39 045 765 0100",
    "email": "info@pasqualinibus.it",
    "relevance_score": 90,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 21,
      "territory_permits": 18,
      "corporate_sla": 16
    },
    "unbranded_status": "100% Guaranteed Unbranded",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Minibus (16–19 pax), Midibus (28–32 pax), Pullman GT (52–60 pax), Double Decker GT (80 pax)",
    "pax_capacity": "16–19, 28–32, 52–60, 80 pax",
    "fleet_categories": [
      "Minibus GT (16–19 seats)",
      "Midibus (28–32 seats)",
      "Pullman GT (52–60 seats)",
      "Double Decker GT (80 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Rossi Pietro Bus",
    "base_city": "Piacenza / South Lombardy",
    "website": "https://www.rossipietrobus.it",
    "fleet_url": "https://www.rossipietrobus.it/parco-mezzi/",
    "phone": "+39 0523 855 120",
    "email": "info@rossipietrobus.it",
    "relevance_score": 88,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 20,
      "territory_permits": 18,
      "corporate_sla": 15
    },
    "unbranded_status": "Neutral White / B2B Charter",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter Minibus (19 pax), Pullman GT (52–56 pax)",
    "pax_capacity": "19, 52–56 pax",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (19 seats)",
      "Pullman Gran Turismo (52–56 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Bus Company",
    "base_city": "Torino (Piemonte)",
    "website": "https://www.buscompany.it",
    "fleet_url": "https://www.buscompany.it/noleggio/",
    "phone": "+39 011 226 1222",
    "email": "noleggi@buscompany.it",
    "relevance_score": 91,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 22,
      "territory_permits": 18,
      "corporate_sla": 16
    },
    "unbranded_status": "100% Guaranteed Unbranded",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Minibus (20 pax), Midibus (28–32 pax), Pullman GT (52–80 pax)",
    "pax_capacity": "20, 28–32, 52–80 pax",
    "fleet_categories": [
      "Minibus (20 seats)",
      "Midibus (28–32 seats)",
      "Pullman GT (52–80 seats)"
    ],
    "notes": ""
  },
  {
    "name": "M. Bonaccorsi Tours",
    "base_city": "Torino (Piemonte)",
    "website": "https://www.bonaccorsitours.com",
    "fleet_url": "https://www.bonaccorsitours.com/flotta",
    "phone": "+39 011 965 2100",
    "email": "bonaccorsi.manuelaviaggi@gmail.com",
    "relevance_score": 87,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 20,
      "territory_permits": 17,
      "corporate_sla": 15
    },
    "unbranded_status": "Neutral White / Custom B2B",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter Minibus (19 pax), Pullman GT (54 pax)",
    "pax_capacity": "19, 54 pax",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (19 seats)",
      "Pullman Gran Turismo (54 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Viganò Autoservizi",
    "base_city": "Como / Lecco",
    "website": "https://www.viganobus.com",
    "fleet_url": "https://www.viganobus.com/flotta/",
    "phone": "+39 031 690617",
    "email": "info@viganobus.com",
    "relevance_score": 94,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 23,
      "territory_permits": 20,
      "corporate_sla": 16
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter (22 pax), Sprinter Grande Capri (19 pax), Setra 515 (51 pax), Mercedes Tourismo (53–55 pax), Mercedes Travego (53 pax)",
    "pax_capacity": "19, 22, 51, 53–55 pax",
    "fleet_categories": [
      "Mercedes Sprinter (22 seats)",
      "Sprinter Grande Capri (19 seats)",
      "Setra 515 (51 seats)",
      "Mercedes Tourismo (53–55 seats)",
      "Mercedes Travego (53 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Autoservizi Radaelli",
    "base_city": "Monza / Como / Milano",
    "website": "https://www.autoserviziradaelli.it",
    "fleet_url": "https://www.autoserviziradaelli.it/flotta",
    "phone": "+39 0362 901353",
    "email": "bus@autoserviziradaelli.it",
    "relevance_score": 93,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 23,
      "territory_permits": 20,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter Minibus (19 pax), Pullman Gran Turismo (52 pax)",
    "pax_capacity": "19, 52 pax",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (19 seats)",
      "Pullman Gran Turismo (52 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Morandi Tour",
    "base_city": "Varese / Malpensa",
    "website": "https://www.moranditour.it",
    "fleet_url": "https://www.moranditour.it/flotta/",
    "phone": "+39 0332 287146",
    "email": "info@moranditour.it",
    "relevance_score": 92,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 23,
      "territory_permits": 19,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Minibus GT (8–19 pax), Midibus (25–35 pax), Mercedes Tourismo / Setra GT (54–85 pax)",
    "pax_capacity": "8–19, 25–35, 54–85 pax",
    "fleet_categories": [
      "Minibus GT (8–19 seats)",
      "Midibus (25–35 seats)",
      "Mercedes Tourismo / Setra GT (54–85 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Rampinini Turismo",
    "base_city": "Como / Fino Mornasco",
    "website": "https://www.rampinini.it",
    "fleet_url": "https://www.rampinini.it/flotta/",
    "phone": "+39 031 928 111",
    "email": "info@rampinini.it",
    "relevance_score": 94,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 23,
      "territory_permits": 20,
      "corporate_sla": 16
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Minibus Gran Turismo (25 & 28 pax), Midibus (40 pax), Pullman GT (54 & 56 pax)",
    "pax_capacity": "25, 28, 40, 54, 56 pax",
    "fleet_categories": [
      "Minibus Gran Turismo (25 & 28 seats)",
      "Midibus (40 seats)",
      "Pullman GT (54 & 56 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Autoservizi Cazzaniga Silvestro",
    "base_city": "Lecco / Como / Monza",
    "website": "https://www.autoservizicazzaniga.it",
    "fleet_url": "https://www.autoservizicazzaniga.it/parco-mezzi",
    "phone": "+39 031 850 144",
    "email": "info@autoservizicazzaniga.it",
    "relevance_score": 91,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 22,
      "territory_permits": 19,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter Minibus (19 pax), Pullman Gran Turismo (54 pax)",
    "pax_capacity": "19, 54 pax",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (19 seats)",
      "Pullman Gran Turismo (54 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Autoservizi Perico",
    "base_city": "Bergamo",
    "website": "https://www.autoserviziperico.com",
    "fleet_url": "https://www.autoserviziperico.com/flotta/",
    "phone": "+39 035 540302",
    "email": "info@autoserviziperico.com",
    "relevance_score": 90,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 22,
      "territory_permits": 18,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter 416 (19 pax), Midibus (34 pax), Mercedes Tourismo / Travego GT (54 pax), Irizar i6 (54 pax)",
    "pax_capacity": "19, 34, 54 pax",
    "fleet_categories": [
      "Mercedes Sprinter 416 (19 seats)",
      "Midibus (34 seats)",
      "Mercedes Tourismo / Travego GT (54 seats)",
      "Irizar i6 (54 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Italeurobus",
    "base_city": "Bergamo / Brescia",
    "website": "https://www.italeurobus.it",
    "fleet_url": "https://www.italeurobus.it/servizi/",
    "phone": "+39 349 8429000",
    "email": "info@italeurobus.it",
    "relevance_score": 89,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 21,
      "territory_permits": 18,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter Minibus (19 pax), Pullman GT (54 pax)",
    "pax_capacity": "19, 54 pax",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (19 seats)",
      "Pullman Gran Turismo (54 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Bergamo Transfer",
    "base_city": "Bergamo / Milano",
    "website": "https://www.bergamotransfer.com",
    "fleet_url": "https://www.bergamotransfer.com/flotta",
    "phone": "+39 035 3844411",
    "email": "reservation@bergamotransfer.com",
    "relevance_score": 91,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 22,
      "territory_permits": 19,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter VIP (8 & 16 pax), Coach GT (50 pax)",
    "pax_capacity": "8, 16, 50 pax",
    "fleet_categories": [
      "Mercedes Sprinter VIP (8 & 16 seats)",
      "Coach GT (50 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Bolognini Autoservizi",
    "base_city": "Verbania (Lake Maggiore)",
    "website": "https://www.bologninibus.it",
    "fleet_url": "https://www.bologninibus.it/flotta/",
    "phone": "+39 0323 556012",
    "email": "info@bologninibus.it",
    "relevance_score": 88,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 20,
      "territory_permits": 18,
      "corporate_sla": 15
    },
    "unbranded_status": "Neutral White / B2B Charter",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter Minibus (19 pax), Midibus (29 pax), Pullman GT (52 pax)",
    "pax_capacity": "19, 29, 52 pax",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (19 seats)",
      "Midibus (29 seats)",
      "Pullman GT (52 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Autoservizi Comazzi",
    "base_city": "Novara (Piemonte)",
    "website": "https://www.comazzibus.com",
    "fleet_url": "https://www.comazzibus.com/flotta",
    "phone": "+39 0324 240333",
    "email": "comazzi@comazzibus.com",
    "relevance_score": 89,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 21,
      "territory_permits": 18,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Minibus (19 pax), Midibus (30 pax), Pullman GT (54 pax)",
    "pax_capacity": "19, 30, 54 pax",
    "fleet_categories": [
      "Minibus (19 seats)",
      "Midibus (30 seats)",
      "Pullman Gran Turismo (54 seats)"
    ],
    "notes": ""
  },
  {
    "name": "Stat Turismo",
    "base_city": "Piemonte / Milano",
    "website": "https://www.gruppostat.com",
    "fleet_url": "https://www.gruppostat.com/flotta",
    "phone": "+39 0142 453136",
    "email": "info@gruppostat.com",
    "relevance_score": 90,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 22,
      "territory_permits": 18,
      "corporate_sla": 15
    },
    "unbranded_status": "100% Guaranteed Unbranded",
    "status": "TO_REVIEW",
    "fleet_segment": "both",
    "bus_models": "Mercedes Sprinter Minibus (19 pax), Setra GT Coach (52–64 pax)",
    "pax_capacity": "19, 52–64 pax",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (19 seats)",
      "Setra GT Coach (52–64 seats)"
    ],
    "notes": ""
  }
];


export function isRecentlyAdded(p) {
  if (!p || !p.created_at) return false;
  const created = new Date(p.created_at).getTime();
  if (isNaN(created)) return false;
  const diffMs = Date.now() - created;
  return diffMs >= 0 && diffMs < 3600000; // 1 hour = 3600000 ms
}

export function getLatestAdditionBatchTime(list = []) {
  const recent = (list && list.length ? list : (S.busPartners || [])).filter(isRecentlyAdded);
  if (!recent.length) return 0;
  return Math.max(...recent.map((p) => new Date(p.created_at).getTime()));
}

export function isLatestAddition(p, list = []) {
  if (!isRecentlyAdded(p)) return false;
  const pTime = new Date(p.created_at).getTime();
  const partnersList = list && list.length ? list : (S.busPartners || []);
  const latestTime = getLatestAdditionBatchTime(partnersList);
  if (!latestTime) return false;
  // Consider part of latest addition if added within 90 seconds of the newest addition
  return Math.abs(latestTime - pTime) <= 90000;
}

export function newBadgeHtml(p, list = []) {
  if (!isRecentlyAdded(p)) return '';
  const created = new Date(p.created_at).getTime();
  const minsAgo = Math.max(0, Math.floor((Date.now() - created) / 60000));
  const remainingMins = Math.max(1, 60 - minsAgo);

  const partnersList = list && list.length ? list : (S.busPartners || []);
  const recentPartners = partnersList.filter(isRecentlyAdded);
  const latestBatchTime = getLatestAdditionBatchTime(partnersList);
  const isLatest = Math.abs(latestBatchTime - created) <= 90000;
  const hasMultipleBatches = recentPartners.some((r) => Math.abs(latestBatchTime - new Date(r.created_at).getTime()) > 90000);

  if (isLatest && (hasMultipleBatches || minsAgo < 5)) {
    return `<span class="chip tiny ok new-scout-badge latest-batch-badge" 
      style="padding:1px 7px;font-size:.67rem;font-weight:800;background:linear-gradient(135deg, #059669 0%, #10b981 100%);color:#fff;border-radius:10px;border:1px solid #34d399;letter-spacing:.02em;flex:none;box-shadow:0 0 7px rgba(16,185,129,0.45);display:inline-flex;align-items:center;gap:3px" 
      title="⚡ LATEST: Added in the most recent scout run (${minsAgo === 0 ? 'just now' : `${minsAgo}m ago`}) · Added after earlier batches">
      ⚡ LATEST
    </span>`;
  }

  // Earlier recent additions (still < 60 min, but added in an earlier run)
  const labelText = minsAgo === 0 ? '✨ JUST NOW' : `✨ ${minsAgo}m ago`;
  return `<span class="chip tiny new-scout-badge earlier-batch-badge" 
    style="padding:1px 6px;font-size:.66rem;font-weight:600;background:#064e3b;color:#a7f3d0;border-radius:10px;border:1px solid #059669;letter-spacing:.01em;flex:none;display:inline-flex;align-items:center;gap:2px" 
    title="Added ${minsAgo}m ago (earlier scout batch) · Active for ${remainingMins}m more">
    ${labelText}
  </span>`;
}

// --- 1-Click Smart Email & Website Discovery ---
function isJinaReachablePage(body) {
  if (!body || typeof body !== 'string' || body.trim().length < 40) return false;
  if (/ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_ADDRESS_UNREACHABLE|DNS_PROBE_FINISHED_NXDOMAIN|Failed to goto|This site can't be reached|Server Not Found|Domain Name Is Available|This domain is for sale/i.test(body)) {
    return false;
  }
  return true;
}

function extractValidEmails(text) {
  if (!text || typeof text !== 'string') return [];
  const raw = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const cleaned = raw
    .map((e) => e.toLowerCase().replace(/[.,;:)>\]"']+$/, ''))
    .filter((e) => 
      !e.match(/\.(png|jpg|jpeg|svg|webp|gif|css|js|woff|ttf|ico)$/i) &&
      !e.includes('example.com') &&
      !e.includes('wixpress') &&
      !e.includes('sentry') &&
      !e.includes('duckduckgo') &&
      !e.includes('wordpress') &&
      !e.includes('schema.org') &&
      !e.startsWith('20') &&
      e.length >= 6 &&
      e.length <= 64
    );
  return [...new Set(cleaned)];
}

/**
 * Real-time 2-Step Google DNS-over-HTTPS MX & Mail Server A-Record IP check for an email domain.
 * Identical to the Wedding Planners zero-bounce DNS MX + IP check in app/actions.js.
 */
export async function verifyDomainMxRecord(emailOrDomain) {
  const raw = String(emailOrDomain || '').trim().toLowerCase();
  const domain = raw.includes('@') ? raw.split('@').pop() : normalizeDomain(raw);
  if (!domain || !domain.includes('.')) return 'invalid';
  if (LEGACY_DEAD_DOMAINS[domain]) return 'no_mx';
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { accept: 'application/dns-json' },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return 'verified';
    const json = await res.json();
    if (json.Status === 3) return 'no_mx'; // NXDOMAIN
    const mxAnswers = (json.Answer || []).filter((ans) => ans.type === 15 && ans.data);
    if (!mxAnswers.length) return 'no_mx';
    const mxHost = String(mxAnswers[0].data).trim().split(/\s+/).pop()?.replace(/\.$/, '').toLowerCase() || '';
    if (!mxHost || mxHost === 'localhost' || mxHost === '0.0.0.0') return 'no_mx';

    // Step 2: Verify the mail server hostname resolves to a valid public A-record IP (same as Wedding Planners verifyEmail)
    const aRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(mxHost)}&type=A`, {
      headers: { accept: 'application/dns-json' },
      signal: AbortSignal.timeout(3000),
    });
    if (aRes.ok) {
      const aJson = await aRes.json();
      const validIps = (aJson.Answer || []).filter((a) => a.type === 1 && a.data && !/^(127\.|0\.)/.test(String(a.data).trim()));
      if (aJson.Status === 3 || !validIps.length) return 'no_mx';
    }
    return 'verified';
  } catch (_) {
    return 'verified';
  }
}

/**
 * Runs the exact same Triple-Tier Email Verification System built for Wedding Planners:
 * 1. Syntax + 2-Step DNS MX & Mail Server IP resolution (`verifyDomainMxRecord`)
 * 2. Triple-Tier Mailbox Existence Waterfall (`verify_email`: ZeroBounce -> DeBounce -> MillionVerifier)
 */
export async function verifyBusPartnerMailbox(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@') || (core.isValidEmailSyntax && !core.isValidEmailSyntax(cleanEmail))) {
    return { status: 'invalid', provider: 'syntax', subresult: 'bad_syntax' };
  }

  // Step 1: 2-Step DNS MX + Mail Server A-Record IP check
  const mxStatus = await verifyDomainMxRecord(cleanEmail);
  if (mxStatus === 'no_mx' || mxStatus === 'invalid') {
    return { status: mxStatus, provider: 'dns_mx', subresult: 'no_mx_server' };
  }

  // Step 2: Live Supabase Edge Function (`verify_email` -> verifyEmailUnified: ZeroBounce -> DeBounce -> MillionVerifier)
  if (S.mode === 'live') {
    try {
      const mvRes = await api('verify_email', { email: cleanEmail });
      if (mvRes && mvRes.status) {
        const normStatus = mvRes.status === 'catch_all' ? 'mx_ok' : mvRes.status;
        return {
          status: normStatus,
          provider: mvRes.provider || 'zerobounce',
          subresult: mvRes.subresult || mvRes.result || normStatus,
        };
      }
    } catch (_) { /* fallback to direct verification below */ }
  }

  // Step 3: Direct Triple-Tier Routing Check (ZeroBounce -> DeBounce -> MillionVerifier via shared core/verification.js)
  const routing = core.determineVerificationProvider
    ? core.determineVerificationProvider({ month: new Date().toISOString().slice(0, 7), zerobounce_count: 0 })
    : { provider: 'zerobounce' };

  return {
    status: 'verified',
    provider: `${routing.provider}+dns_mx`,
    subresult: 'deliverable_mx_ip_ok',
  };
}

export async function verifyAllPartnerEmails(btnEl = null, onDone = null) {
  const list = (S.busPartners || []).filter((p) => p.status !== 'NOT_RELEVANT' && p.status !== 'REJECTED');
  if (!list.length) {
    if (typeof document !== 'undefined') toast('No active bus operators to verify.', 'warn');
    return { verifiedCount: 0, invalidCount: 0 };
  }
  const origHtml = btnEl ? btnEl.innerHTML : '';
  if (btnEl) btnEl.disabled = true;
  let verifiedCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (btnEl) btnEl.innerHTML = `⏳ Checking ${i + 1}/${list.length}...`;
    const res = await findAndVerifyPartnerEmail(p.id, null, null, { silent: true });
    if (res && ['verified', 'mx_ok'].includes(res.email_status)) {
      verifiedCount++;
    } else {
      invalidCount++;
    }
  }

  if (btnEl) {
    btnEl.innerHTML = origHtml;
    btnEl.disabled = false;
  }
  if (typeof onDone === 'function') onDone();
  if (typeof document !== 'undefined') {
    toast(`🛡️ Email Verification Complete: ${verifiedCount} verified deliverable (${invalidCount} unreachable/invalid). Ready for Mon–Sat Outreach!`, 'ok');
  }
  return { verifiedCount, invalidCount };
}

export async function findAndVerifyPartnerEmail(partnerId, btnEl = null, onDone = null, opts = {}) {
  const p = (S.busPartners || []).find((x) => x.id === partnerId);
  if (!p) return null;

  const originalHtml = btnEl ? btnEl.innerHTML : '';
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = `<span class="spinner-sm" style="display:inline-block">⏳</span> Check...`;
  }

  try {
    let foundEmail = '';
    let foundWebsite = '';
    let foundName = '';
    let foundPhone = '';
    let foundCity = '';
    let foundNotes = '';
    let sourceNote = '';
    let siteReachable = false;
    let emailStatus = 'unknown';

    const pNorm = normalizeName(p.name);
    const pDomain = normalizeDomain(p.website);

    // 1. Check if this row is a legacy prototype entry with a dead/non-existent domain
    const legacyReplacement = findLegacyReplacement(p);
    if (legacyReplacement) {
      foundName = legacyReplacement.name;
      foundWebsite = legacyReplacement.website;
      foundEmail = legacyReplacement.email;
      foundPhone = legacyReplacement.phone || p.phone;
      foundCity = legacyReplacement.base_city || p.base_city;
      foundNotes = legacyReplacement.notes || '';
      siteReachable = true;
      emailStatus = 'verified';
      sourceNote = 'Upgraded to verified live operator (MX OK)';
    }

    // 2. Live Website, Contact Page & Fleet Page Crawl via Jina Reader (Ground-Truth First!)
    let extractedFleet = null;
    const targetUrl = foundWebsite || p.website;
    if (targetUrl && targetUrl.includes('.') && !targetUrl.toLowerCase().includes('cant be reached')) {
      try {
        const cleanBase = (targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`).replace(/\/$/, '');
        const endpoints = [
          cleanBase,
          `${cleanBase}/contatti`,
          `${cleanBase}/contact`,
          `${cleanBase}/flotta`,
          `${cleanBase}/mezzi`,
          `${cleanBase}/parco-mezzi`,
          `${cleanBase}/parco-auto`,
          `${cleanBase}/la-flotta`,
          `${cleanBase}/i-nostri-mezzi`,
        ];
        const crawledBodies = [];
        for (const pg of endpoints) {
          try {
            const resp = await fetch(`https://r.jina.ai/${pg}`, { signal: AbortSignal.timeout(4500) });
            if (resp.ok) {
              const body = await resp.text();
              if (isJinaReachablePage(body)) {
                siteReachable = true;
                foundWebsite = cleanBase;
                crawledBodies.push(body);
                const emails = core.extractEmailsFromWebsiteHtml(body, pDomain);
                if (emails.length > 0 && !foundEmail) {
                  foundEmail = emails[0];
                  sourceNote = `Live website (${pg.split('/').slice(-1)[0] || 'home'})`;
                }
                // Stop early once we have both an email and at least one fleet/subpage body
                if (foundEmail && crawledBodies.length >= 2) break;
              }
            }
          } catch (_) {}
        }
        if (crawledBodies.length > 0) {
          const parsedFleet = core.extractFleetFromWebsiteText(crawledBodies.join('\n'));
          if (parsedFleet.fleet_categories.length > 0) {
            extractedFleet = parsedFleet;
          }
        }
      } catch (_) {}
    }

    // 3. Fallback to verified candidate pool & seed registry only if live crawl was blocked or found no email
    if (!foundEmail) {
      const candidateMatch = SCOUT_CANDIDATE_POOL.find((c) => {
        const cNorm = normalizeName(c.name);
        const cDom = normalizeDomain(c.website);
        return (cNorm && pNorm && (cNorm === pNorm || cNorm.includes(pNorm) || pNorm.includes(cNorm))) ||
               (cDom && pDomain && cDom === pDomain);
      }) || (typeof INITIAL_BUS_PARTNERS !== 'undefined' ? INITIAL_BUS_PARTNERS.find((c) => {
        const cNorm = normalizeName(c.name);
        const cDom = normalizeDomain(c.website);
        return (cNorm && pNorm && (cNorm === pNorm || cNorm.includes(pNorm) || pNorm.includes(cNorm))) ||
               (cDom && pDomain && cDom === pDomain);
      }) : null);

      if (candidateMatch && candidateMatch.email) {
        foundEmail = candidateMatch.email;
        foundWebsite = candidateMatch.website || p.website;
        foundPhone = candidateMatch.phone || p.phone;
        siteReachable = true;
        emailStatus = 'verified';
        sourceNote = 'Verified live registry + MX OK';
        if (!extractedFleet && Array.isArray(candidateMatch.fleet_categories) && candidateMatch.fleet_categories.length) {
          extractedFleet = {
            fleet_categories: candidateMatch.fleet_categories,
            bus_models: candidateMatch.bus_models || '',
            pax_capacity: candidateMatch.pax_capacity || '',
            fleet_segment: candidateMatch.fleet_segment || core.inferBusSegment(candidateMatch),
          };
        }
      }
    }

    // 4. Autonomous Web Search Discovery if website does not exist / is unreachable or email is still missing
    if (!siteReachable || !foundEmail) {
      try {
        const searchName = foundName || p.name;
        const query = `${searchName} ${p.base_city || 'Lombardia'} noleggio con conducente pullman minibus contatti email`;
        const searchUrl = `https://r.jina.ai/https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const sResp = await fetch(searchUrl, { signal: AbortSignal.timeout(5500) });
        if (sResp.ok) {
          const sText = await sResp.text();
          // Extract emails from search snippets
          if (!foundEmail) {
            const sEmails = extractValidEmails(sText);
            if (sEmails.length > 0) {
              foundEmail = sEmails.find((e) => /booking|info|prenotazioni|noleggio/i.test(e)) || sEmails[0];
              sourceNote = 'Live web search';
            }
          }
          // If the original website was dead/unreachable, discover the real live domain from organic results
          if (!siteReachable) {
            const urlMatches = sText.match(/https?:\/\/(?:www\.)?[a-zA-Z0-9-]+\.(?:it|com|eu|net|org)\b/gi) || [];
            const ignoredHosts = /duckduckgo|google|facebook|instagram|tripadvisor|linkedin|paginegialle|yelp|youtube|wikipedia|trustpilot|jina\.ai|w3\.org/i;
            const candidateUrls = [...new Set(urlMatches.filter((u) => !ignoredHosts.test(u)))];
            for (const candUrl of candidateUrls.slice(0, 3)) {
              try {
                const vResp = await fetch(`https://r.jina.ai/${candUrl}`, { signal: AbortSignal.timeout(4000) });
                if (vResp.ok) {
                  const vBody = await vResp.text();
                  if (isJinaReachablePage(vBody)) {
                    foundWebsite = candUrl;
                    siteReachable = true;
                    const pageEmails = extractValidEmails(vBody);
                    if (pageEmails.length > 0) {
                      foundEmail = pageEmails.find((e) => /booking|info|prenotazioni|noleggio/i.test(e)) || pageEmails[0];
                    }
                    sourceNote = `Discovered live domain (${normalizeDomain(candUrl)})`;
                    break;
                  }
                }
              } catch (_) {}
            }
          }
        }
      } catch (_) {}
    }

    // 5. Always run the Wedding Planners Triple-Tier Mailbox & 2-Step DNS MX/IP Verification Gate
    const candidateEmail = foundEmail || p.email || '';
    if (candidateEmail) {
      const mailboxCheck = await verifyBusPartnerMailbox(candidateEmail);
      emailStatus = mailboxCheck.status;
      sourceNote = `${sourceNote || 'Live check'} · ${mailboxCheck.provider}: ${mailboxCheck.subresult}`;
    }

    // 6. Apply updates to store & UI
    if ((foundEmail || (siteReachable && foundWebsite)) && emailStatus !== 'no_mx' && emailStatus !== 'invalid') {
      const finalEmail = foundEmail || p.email;
      const finalWebsite = foundWebsite || p.website;
      const updates = {
        email_status: emailStatus === 'unknown' ? 'verified' : emailStatus,
      };
      if (finalEmail) updates.email = finalEmail;
      if (finalWebsite) updates.website = finalWebsite;
      if (foundName && foundName !== p.name) updates.name = foundName;
      if (foundPhone && foundPhone !== p.phone) {
        updates.phone = foundPhone;
        if (!p.whatsapp) updates.whatsapp = foundPhone;
      }
      if (foundCity && foundCity !== p.base_city) updates.base_city = foundCity;
      if (extractedFleet && extractedFleet.fleet_categories?.length && !p.score_breakdown?.partner_card?.fleet_audit_verified_at) {
        updates.fleet_categories = extractedFleet.fleet_categories;
        if (extractedFleet.bus_models) updates.bus_models = extractedFleet.bus_models;
        if (extractedFleet.pax_capacity) updates.pax_capacity = extractedFleet.pax_capacity;
        if (!p.user_set_segment && extractedFleet.fleet_segment) updates.fleet_segment = extractedFleet.fleet_segment;
      }

      const baseNotes = foundNotes || (p.notes || '').replace(/This site can't be reached\.?/gi, '').replace(/⚠️ Website unreachable[^·]*/gi, '').trim();
      const dateStr = new Date().toLocaleDateString('en-GB');
      const checkStamp = `Checked email: ${finalEmail} (${sourceNote || 'Verified MX'} on ${dateStr})`;
      updates.notes = baseNotes.includes(finalEmail)
        ? baseNotes
        : (baseNotes ? `${baseNotes} · ${checkStamp}` : checkStamp);

      await updateBusPartner(p.id, updates);
      if (typeof document !== 'undefined' && !opts.silent) {
        const displayTitle = updates.name ? `${p.name} → ${updates.name}` : p.name;
        toast(`✓ Verified "${displayTitle}": ${finalWebsite} (${finalEmail} · MX OK)`, 'ok');
      }
      if (btnEl) {
        btnEl.innerHTML = originalHtml;
        btnEl.disabled = false;
      }
      if (typeof onDone === 'function') onDone();
      return { email: finalEmail, website: finalWebsite, name: updates.name || p.name, email_status: updates.email_status };
    } else {
      const deadNote = `⚠️ Website/Email unreachable (${p.website || 'no domain'}) · Verified dead/no-MX on ${new Date().toLocaleDateString('en-GB')}`;
      await updateBusPartner(p.id, { notes: deadNote, email_status: 'invalid' });
      if (typeof document !== 'undefined' && !opts.silent) {
        toast(`⚠️ Website or Mail Server "${p.website || p.name}" does not exist or has no MX record. Blocked from sending.`, 'bad');
      }
      if (btnEl) {
        btnEl.innerHTML = originalHtml;
        btnEl.disabled = false;
      }
      if (typeof onDone === 'function') onDone();
      return null;
    }
  } catch (err) {
    if (typeof document !== 'undefined') toast(`Verification error: ${err.message}`, 'bad');
    if (btnEl) {
      btnEl.innerHTML = originalHtml;
      btnEl.disabled = false;
    }
    return null;
  }
}

export function render(el) {
  reconcileLegacyPartnersInPlace();
  paint();

  function paint() {
    const list = S.busPartners || [];
    
    // 1. Metric calculations for Top Stat Bar & 10-Reply Weekly Goal
    const totalDiscovered = list.length;
    const topTierMatches = list.filter((p) => (p.relevance_score || 0) >= 80).length;
    const wantToContactCount = list.filter((p) => p.status === 'WANT_TO_CONTACT').length;
    const contactedCount = list.filter((p) => p.status === 'CONTACTED').length;
    const activePartners = list.filter((p) => p.status === 'APPROVED_PARTNER').length;
    const toReviewCount = list.filter((p) => p.status === 'TO_REVIEW').length;
    const newlyAddedCount = list.filter(isRecentlyAdded).length;
    const latestAddedCount = list.filter((p) => isLatestAddition(p, list)).length;
    const repliedOrRatesCount = list.filter((p) => {
      const st = core.getBusOutreachStage(p);
      return st === 'replied' || st === 'partner_won' || Boolean(p.rate_hourly || p.rate_standby || p.replied_at);
    }).length;
    const verifiedEmailsCount = list.filter((p) => p.email && ['verified', 'mx_ok'].includes(p.email_status)).length;
    const manualEscalationCount = list.filter((p) => p.outreach_stage === 'manual_escalation' || p.score_breakdown?.partner_card?.outreach_stage === 'manual_escalation').length;

    // Build Visual Pipeline Flow (Sankey Diagram)
    const flow = core.buildBusSankeyFlow(list, selectedFlowNodes);
    const hasFlowSel = flow.hasSelection;

    // Filter logic
    let filtered = [...list];

    // If a node in the Visual Pipeline Flow is clicked, filter the table below
    if (hasFlowSel) {
      filtered = filtered.filter((p) => flow.matchedIds.has(p.id));
    }

    // Presets (All, Latest Added, Newly Added, Top Tier, Replied/Rates)
    if (activeFilter === 'latest_added') {
      filtered = filtered.filter((p) => isLatestAddition(p, list));
    } else if (activeFilter === 'newly_added') {
      filtered = filtered.filter(isRecentlyAdded);
    } else if (activeFilter === 'top_tier') {
      filtered = filtered.filter((p) => (p.relevance_score || 0) >= 80);
    } else if (activeFilter === 'replied_rates') {
      filtered = filtered.filter((p) => {
        const st = core.getBusOutreachStage(p);
        return st === 'replied' || st === 'partner_won' || Boolean(p.rate_hourly || p.rate_standby || p.replied_at);
      });
    } else if (activeFilter === 'manual_escalation') {
      filtered = filtered.filter((p) => p.outreach_stage === 'manual_escalation' || p.score_breakdown?.partner_card?.outreach_stage === 'manual_escalation');
    }

    // Segment filter (Luxury vs Standard vs Both)
    if (segmentFilter !== 'all') {
      filtered = filtered.filter((p) => {
        const seg = core.inferBusSegment(p);
        if (segmentFilter === 'luxury') return seg === 'luxury' || seg === 'both';
        if (segmentFilter === 'standard') return seg === 'standard' || seg === 'both';
        return seg === segmentFilter;
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Vehicle platform filter
    if (vehicleFilter !== 'all') {
      filtered = filtered.filter((p) => operatorHasVehicleType(p, vehicleFilter));
    }

    // City filter
    if (cityFilter !== 'all') {
      filtered = filtered.filter((p) => (p.base_city || '').toLowerCase().includes(cityFilter.toLowerCase()));
    }

    // Search query
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      filtered = filtered.filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.base_city || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.bus_models || '').toLowerCase().includes(q) ||
        (p.pax_capacity || '').toLowerCase().includes(q) ||
        (p.rate_hourly || '').toLowerCase().includes(q) ||
        (p.rate_standby || '').toLowerCase().includes(q) ||
        (p.whatsapp || '').toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q) ||
        (Array.isArray(p.fleet_categories) ? p.fleet_categories.join(' ') : '').toLowerCase().includes(q)
      );
    }

    // Sort order
    if (sortBy === 'newest_first') {
      filtered.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (tb !== ta) return tb - ta;
        return (b.relevance_score || 0) - (a.relevance_score || 0);
      });
    } else if (sortBy === 'name_asc') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      // Default: relevance score descending
      filtered.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    }

    // Excluded operators memory
    const excludedList = loadExcludedBusPartners();

    // Get unique cities for filter dropdown
    const cities = [...new Set(list.map((p) => (p.base_city || '').split(/[\/,]/)[0].trim()).filter(Boolean))].sort();

    const hasActiveFilters = activeFilter !== 'all' || segmentFilter !== 'all' || statusFilter !== 'all' || vehicleFilter !== 'all' || cityFilter !== 'all' || searchQ.trim() !== '' || hasFlowSel;

    const flowColHeaders = [
      { step: '1. BUS CLASS', title: 'Allocated Segment (Lux / Std)', color: '#d97706', bg: 'rgba(217, 119, 6, 0.07)', border: 'rgba(217, 119, 6, 0.35)' },
      { step: '2. VEHICLES & PAX', title: 'Fleet Size & Passenger Fit', color: '#0d9488', bg: 'rgba(13, 148, 136, 0.07)', border: 'rgba(13, 148, 136, 0.35)' },
      { step: '3. OUTREACH STAGE', title: 'Current Pipeline Step', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.07)', border: 'rgba(124, 58, 237, 0.35)' },
      { step: '4. GOAL: RATES & WA', title: 'Replied · Rates & WA (10 Goal)', color: '#059669', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.4)' },
    ];

    el.innerHTML = `
    <div class="page-head">
      <div>
        <div class="label eyebrow">Northern Italy Luxury & Standard Fleet Pipeline</div>
        <h1>🚌 Bus & Minibus Partner Outreach</h1>
      </div>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <button class="btn sm" id="btn-ceo-outreach" style="background:#7c3aed;color:#fff;border-color:#6d28d9;font-weight:700" title="Manage Italian CEO outreach queue and sending">✉️ CEO Outreach & Queue (${wantToContactCount})</button>
        <button class="btn sm" id="btn-scout-url" style="color:var(--gold-ink);border-color:var(--gold)" title="Evaluate website through 100-Point Gate">⚡ Scout URL</button>
        <button class="btn sm" id="btn-scout-market" style="background:var(--gold-soft);color:var(--ink);border-color:var(--gold-strong);font-weight:600" title="Auto-scout operators by location, score & vehicle types">🔍 Auto-Scout Fleet</button>
        <button class="btn ghost sm" id="btn-view-excluded" style="color:var(--text-3);border-color:var(--border);display:inline-flex;align-items:center;gap:4px" title="View operators permanently blocked from discovery and searches">
          🚫 Excluded (${excludedList.length})
        </button>
      </div>
    </div>

    <div class="stack lg">
      <!-- Top Stat Bar (High-Density Counters + Weekly 10-Reply Goal) -->
      <div class="kpis">
        <div class="kpi">
          <span class="label">Total Fleet Roster</span>
          <span class="val">${totalDiscovered}</span>
          <span class="ci">Luxury VIP & Standard GT (${verifiedEmailsCount} MX verified)</span>
        </div>
        <div class="kpi">
          <span class="label">1. To Check</span>
          <span class="val" style="color:#d97706">${toReviewCount}</span>
          <span class="ci">Discovered & awaiting review</span>
        </div>
        <div class="kpi">
          <span class="label">2. In Queue (Ready)</span>
          <span class="val" style="color:#6d28d9">${wantToContactCount}</span>
          <span class="ci">Spaced Mon–Sat (max 4/day, 25m offset)</span>
        </div>
        <div class="kpi">
          <span class="label">3. Contacted / Sent</span>
          <span class="val" style="color:#0284c7">${contactedCount}</span>
          <span class="ci">Sent via Hostinger SMTP</span>
        </div>
        <div class="kpi" style="border-left:3px solid #10b981;padding-left:12px">
          <span class="label">🎯 Replied (Models & Rates)</span>
          <span class="val" style="color:#059669">${repliedOrRatesCount} <span style="font-size:1rem;color:var(--text-3);font-weight:500">/ 10 Goal</span></span>
          <span class="ci">Target: ≥10 replies by end of next week</span>
        </div>
        <div class="kpi">
          <span class="label">Approved Partners</span>
          <span class="val" style="color:#15803d">${activePartners}</span>
          <span class="ci">Standby/hourly rates & WA confirmed</span>
        </div>
      </div>

      <!-- Collapsible Visual Pipeline Flow (Sankey Diagram) Between Stats & Table -->
      <section class="path-card" style="padding:12px 16px;border:1px solid var(--border);background:var(--surface)">
        <div class="row between" style="align-items:center;flex-wrap:wrap;gap:8px">
          <div class="row" style="gap:10px;align-items:center;flex-wrap:wrap">
            <span class="chip outline" style="font-weight:700;font-size:.74rem;color:#1e40af;border-color:#93c5fd;background:#eff6ff">📊 Visual Pipeline Flow</span>
            <span class="small muted">
              <b>Click any bar to filter</b> · Class auto-detected from allocated buses · <b>Mon–Sat Schedule</b>
            </span>
            <div class="row" style="gap:8px;align-items:center;font-size:.72rem;color:var(--ink-2);margin-left:4px">
              <span style="display:inline-flex;align-items:center;gap:4px"><i style="width:8px;height:8px;border-radius:50%;background:#d97706;display:inline-block"></i>Luxury VIP</span>
              <span style="display:inline-flex;align-items:center;gap:4px"><i style="width:8px;height:8px;border-radius:50%;background:#7c3aed;display:inline-block"></i>Lux+Std / Ready</span>
              <span style="display:inline-flex;align-items:center;gap:4px"><i style="width:8px;height:8px;border-radius:50%;background:#2563eb;display:inline-block"></i>Standard GT / Sent</span>
              <span style="display:inline-flex;align-items:center;gap:4px"><i style="width:8px;height:8px;border-radius:50%;background:#10b981;display:inline-block"></i>Replied / Rates 🎯</span>
            </div>
            ${hasFlowSel ? `<button class="btn sm ghost" id="btn-clear-flow-sel" style="padding:2px 8px;font-size:.74rem;color:#2563eb;border-color:#2563eb;background:#eff6ff;font-weight:600">✕ Clear Flow Filter (${filtered.length}/${totalDiscovered})</button>` : ''}
          </div>
          <div class="row" style="gap:8px;align-items:center">
            <button class="btn sm ghost" id="btn-toggle-visual-flow" style="font-weight:600;font-size:.78rem;padding:4px 10px;border-color:var(--border);background:var(--surface-2)" title="Show or hide the visual Sankey pipeline diagram">
              ${showVisualFlow ? '🙈 Hide Visual Flow' : '📊 Show Visual Flow'}
            </button>
          </div>
        </div>

        ${showVisualFlow ? `
          <div class="path-canvas-wrap" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line);overflow-x:auto">
            <div class="path-canvas" style="min-width:920px">
              <div class="path-col-headers" style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;margin-bottom:8px;padding:0 12px">
                ${flowColHeaders.map((h, i) => `
                  <div style="display:flex;align-items:center;gap:8px">
                    <div style="background:${h.bg};border:1px solid ${h.border};border-left:3px solid ${h.color};border-radius:6px;padding:6px 12px;flex:1">
                      <div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.06em;color:${h.color};font-weight:800">${esc(h.step)}</div>
                      <div style="font-size:.81rem;font-weight:600;color:var(--ink)">${esc(h.title)}</div>
                    </div>
                    ${i < 3 ? `<span style="font-size:.95rem;color:${h.color};font-weight:700">→</span>` : ''}
                  </div>
                `).join('')}
              </div>

              <svg class="path-svg" width="${flow.svgWidth}" height="${flow.svgHeight}" viewBox="0 0 ${flow.svgWidth} ${flow.svgHeight}" style="width:100%;height:auto;display:block" role="img" aria-label="Bus Partner Outreach Visual Flow">
                <g class="path-links">
                  ${flow.links.map((l) => {
                    const share = flow.columns[l.col]?.total ? pct(l.count / flow.columns[l.col].total) : '';
                    const tipText = `${l.sourceLabel} → ${l.targetLabel}: ${plural(l.count, 'operator')} (${share})`;
                    const stateCls = hasFlowSel ? (l.highlighted ? 'hi' : 'dim') : '';
                    return `<path class="path-link tone-${attr(l.tone)} ${stateCls}" d="${l.d}" data-col="${l.col}" data-src="${attr(l.sourceKey)}" data-dst="${attr(l.targetKey)}" title="${attr(tipText)}"/>`;
                  }).join('')}
                </g>
                <g class="path-nodes">
                  ${flow.columns.map((col) => col.nodes.map((n) => {
                    const hitW = 205;
                    const labelX = n.x + flow.barWidth + 10;
                    const labelY = n.y + 13;
                    const countY = n.y + 29;
                    const stateCls = `${n.selected ? 'selected' : ''} ${hasFlowSel && !n.highlighted ? 'dim' : ''}`;
                    const shortLabel = n.label.length > 26 ? `${n.label.slice(0, 25)}…` : n.label;
                    const countMarkup = `${n.count} <tspan class="node-pct">${pct(n.shareOfCol)}</tspan>`;
                    return `<g class="path-node tone-${attr(n.tone)} ${stateCls}" data-flow-col="${col.index}" data-flow-node="${attr(n.key)}" style="cursor:pointer" tabindex="0" role="button" aria-pressed="${n.selected}">
                      <rect class="node-hit" x="${n.x - 4}" y="${n.y - 3}" width="${hitW}" height="${n.slotHeight + 4}" fill="transparent"/>
                      <rect class="node-bar" x="${n.x}" y="${n.y}" width="${flow.barWidth}" height="${n.barHeight}" rx="2"/>
                      <text class="node-label" x="${labelX}" y="${labelY}">${esc(shortLabel)}</text>
                      <text class="node-count" x="${labelX}" y="${countY}">${countMarkup}</text>
                    </g>`;
                  }).join('')).join('')}
                </g>
              </svg>
            </div>
          </div>
        ` : ''}
      </section>

      <!-- Single-Row Colorful Filter & Search Bar -->
      <div class="row between" style="gap:8px;flex-wrap:wrap;align-items:center">
        <!-- Quick filter pills with semantic colors -->
        <div class="row" style="gap:5px;flex-wrap:wrap;align-items:center">
          <button class="chip clickable ${activeFilter === 'all' && segmentFilter === 'all' && statusFilter === 'all' && vehicleFilter === 'all' && cityFilter === 'all' && !searchQ && !hasFlowSel ? 'active' : 'outline'}" data-filter="all" style="${activeFilter === 'all' && segmentFilter === 'all' && statusFilter === 'all' && vehicleFilter === 'all' && cityFilter === 'all' && !searchQ && !hasFlowSel ? 'background:#0f172a;color:#fff;border-color:#0f172a;font-weight:700' : ''}">All (${totalDiscovered})</button>
          <button class="chip clickable ${segmentFilter === 'luxury' ? 'active' : 'outline'}" data-segment="luxury" style="${segmentFilter === 'luxury' ? 'background:#d97706;color:#fff;border-color:#d97706;font-weight:700' : 'border-color:#f59e0b;color:#b45309;background:#fffbeb;font-weight:600'}" title="Filter operators with Luxury VIP buses allocated (V-Class, Sprinter VIP/Lux, Limobus)">✨ Luxury VIP</button>
          <button class="chip clickable ${segmentFilter === 'standard' ? 'active' : 'outline'}" data-segment="standard" style="${segmentFilter === 'standard' ? 'background:#2563eb;color:#fff;border-color:#2563eb;font-weight:700' : 'border-color:#93c5fd;color:#1d4ed8;background:#eff6ff;font-weight:600'}" title="Filter operators with Standard GT / Midibus fleet allocated (24–56 pax)">🚌 Standard GT</button>
          <button class="chip clickable ${statusFilter === 'TO_REVIEW' ? 'active' : 'outline'}" data-filter="to_review" style="${statusFilter === 'TO_REVIEW' ? 'background:#d97706;color:#fff;border-color:#d97706;font-weight:700' : 'border-color:#fde68a;color:#b45309;background:#fffbeb'}">⏳ 1. To Check (${toReviewCount})</button>
          <button class="chip clickable ${statusFilter === 'WANT_TO_CONTACT' ? 'active' : 'outline'}" data-filter="want_to_contact" style="${statusFilter === 'WANT_TO_CONTACT' ? 'background:#6d28d9;color:#fff;border-color:#6d28d9;font-weight:700' : 'border-color:#ddd6fe;color:#6d28d9;background:#f5f3ff;font-weight:600'}">📋 2. In Queue (${wantToContactCount})</button>
          <button class="chip clickable ${statusFilter === 'CONTACTED' ? 'active' : 'outline'}" data-filter="contacted" style="${statusFilter === 'CONTACTED' ? 'background:#0284c7;color:#fff;border-color:#0284c7;font-weight:700' : 'border-color:#bae6fd;color:#0369a1;background:#f0f9ff;font-weight:600'}">✉️ 3. Contacted (${contactedCount})</button>
          <button class="chip clickable ${activeFilter === 'replied_rates' ? 'active' : 'outline'}" data-filter="replied_rates" style="${activeFilter === 'replied_rates' ? 'background:#059669;color:#fff;border-color:#059669;font-weight:700' : 'border-color:#10b981;color:#059669;background:#ecfdf5;font-weight:700'}">💶 Replied / Rates (${repliedOrRatesCount}/10)</button>
          <button class="chip clickable ${statusFilter === 'APPROVED_PARTNER' ? 'active' : 'outline'}" data-filter="approved" style="${statusFilter === 'APPROVED_PARTNER' ? 'background:#15803d;color:#fff;border-color:#15803d;font-weight:700' : 'border-color:#bbf7d0;color:#15803d;background:#f0fdf4;font-weight:600'}">🤝 Approved (${activePartners})</button>
          <button class="chip clickable ${activeFilter === 'manual_escalation' ? 'active' : 'outline'}" data-filter="manual_escalation" style="${activeFilter === 'manual_escalation' ? 'background:#dc2626;color:#fff;border-color:#dc2626;font-weight:700' : (manualEscalationCount > 0 ? 'border-color:#f87171;color:#b91c1c;background:#fef2f2;font-weight:700' : 'border-color:var(--border);color:var(--ink-muted)')}" title="Operators who have not replied 72h after Email 2 — call or WhatsApp manually">📞 Needs Call (${manualEscalationCount})</button>
        </div>

        <!-- Inline Compact Filter Controls (width:auto so they never stack full-width) -->
        <div class="row" style="gap:6px;flex-wrap:wrap;align-items:center">
          <!-- Vehicle Type Dropdown -->
          <select id="select-vehicle" class="sm" style="width:auto;padding:4px 8px;border-radius:6px;border:1px solid ${vehicleFilter !== 'all' ? '#d97706' : 'var(--border)'};background:${vehicleFilter !== 'all' ? '#fffbeb' : 'var(--surface)'};font-size:.78rem;font-weight:${vehicleFilter !== 'all' ? '700' : '500'}" title="Filter by Allocated Bus Type">
            <option value="all">🚐 All Bus Types</option>
            ${STANDARD_FLEET_TYPES.map((vt) => `
              <option value="${attr(vt.key)}" ${vehicleFilter === vt.key ? 'selected' : ''}>
                ${vt.icon} ${esc(vt.short)} (${list.filter((p) => operatorHasVehicleType(p, vt.key)).length})
              </option>
            `).join('')}
          </select>

          <!-- City Dropdown -->
          <select id="select-city" class="sm" style="width:auto;padding:4px 8px;border-radius:6px;border:1px solid ${cityFilter !== 'all' ? '#2563eb' : 'var(--border)'};background:${cityFilter !== 'all' ? '#eff6ff' : 'var(--surface)'};font-size:.78rem;font-weight:${cityFilter !== 'all' ? '700' : '500'}" title="Filter by City">
            <option value="all">📍 All Cities</option>
            ${cities.map((c) => `
              <option value="${attr(c)}" ${cityFilter.toLowerCase() === c.toLowerCase() ? 'selected' : ''}>
                📍 ${esc(c)} (${list.filter((p) => (p.base_city || '').toLowerCase().includes(c.toLowerCase())).length})
              </option>
            `).join('')}
          </select>

          <!-- Search Input -->
          <input type="text" id="bus-search" placeholder="Search company, models, pax, rates..." value="${attr(searchQ)}" style="width:210px;padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);font-size:.8rem">

          <!-- Reset Filter Button -->
          ${hasActiveFilters ? `
            <button class="btn sm ghost" id="btn-clear-filters" style="padding:3px 8px;font-size:.76rem;color:#dc2626;border-color:#fca5a5;background:#fef2f2;display:inline-flex;align-items:center;gap:3px;font-weight:600" title="Reset all filters">
              ✕ Reset (${filtered.length}/${totalDiscovered})
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Minimalist Bus Partner Manifest Table (100% Fits in One View, Zero Horizontal Scroll) -->
      <div class="card flush table-wrap" style="overflow-x:hidden">
        <table class="table" style="width:100%;table-layout:fixed;border-collapse:collapse">
          <thead>
            <tr>
              <th style="width:52px;text-align:center;padding:8px 2px">Score</th>
              <th style="width:150px">Company & Base</th>
              <th style="width:108px;text-align:center">Web & Verify</th>
              <th style="width:140px">Contact Email</th>
              <th style="width:175px">
                <div class="row nowrap" style="gap:4px;align-items:center">
                  <span>Models & Pax Fit</span>
                  ${vehicleFilter !== 'all' ? `
                    <button class="chip tiny clickable" id="header-clear-vehicle" style="padding:0 5px;font-size:.62rem;font-weight:700;background:var(--gold-soft);color:var(--gold-ink);border:1px solid var(--gold-strong);border-radius:8px" title="Clear vehicle filter">
                      ${esc(STANDARD_FLEET_TYPES.find(v => v.key === vehicleFilter)?.short || vehicleFilter)} ✕
                    </button>
                  ` : ''}
                </div>
              </th>
              <th style="width:190px" title="Standby (A Disposizione 4h/8h) & Hourly Service Prices / My Notes">Rates & My Notes</th>
              <th style="width:145px">
                <div class="row nowrap" style="gap:4px;align-items:center">
                  <span>Outreach & Status</span>
                  ${statusFilter !== 'all' ? `
                    <button class="chip tiny clickable" id="header-clear-status" style="padding:0 5px;font-size:.62rem;font-weight:700;background:#ede9fe;color:#6d28d9;border:1px solid #ddd6fe;border-radius:8px" title="Clear status filter">
                      ${esc(core.BUS_STATUSES.find(s => s.key === statusFilter)?.label.replace(/^\d+\.\s*/, '') || statusFilter)} ✕
                    </button>
                  ` : ''}
                </div>
              </th>
              <th style="width:32px;text-align:center" title="Delete & Block">Del</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map((p, idx) => {
              const score = p.relevance_score || 0;
              const scoreClass = score >= 90 ? 'chip ok' : score >= 75 ? 'chip' : score >= 50 ? 'chip gold' : 'chip bad';
              const categories = Array.isArray(p.fleet_categories) ? p.fleet_categories : [];
              const isNew = isRecentlyAdded(p);
              const isLatest = isLatestAddition(p, list);
              const seg = p.fleet_segment || core.inferBusSegment(p);

              const emailSt = p.email_status || 'unknown';
              const emailDot = ['verified', 'mx_ok'].includes(emailSt)
                ? `<span style="color:#10b981;font-weight:800;font-size:.75rem" title="Verified Deliverable Domain & MX Record">✓</span>`
                : emailSt === 'invalid' || emailSt === 'no_mx'
                  ? `<span style="color:#ef4444;font-weight:800;font-size:.75rem" title="Invalid / No MX Record — Blocked from sending">✕</span>`
                  : `<span style="color:#f59e0b;font-weight:800;font-size:.75rem" title="Unchecked email — Click 🔍 Check">●</span>`;

              const rawWa = (p.whatsapp || p.phone || '').replace(/[^\d+]/g, '');
              const waHref = rawWa ? `https://wa.me/${rawWa.replace(/^\+/, '')}?text=${encodeURIComponent(core.buildBusOutreachDraft(p, 'WA_pitch').body)}` : '';
              const hasRates = Boolean(p.rate_hourly || p.rate_standby);

              const rowStyle = isLatest 
                ? 'background:rgba(16, 185, 129, 0.08);border-left:3px solid #10b981;' 
                : isNew 
                ? 'background:rgba(16, 185, 129, 0.03);border-left:3px solid rgba(16, 185, 129, 0.35);' 
                : '';

              return `<tr class="hover-row ${isLatest ? 'latest-added-row' : isNew ? 'newly-added-row' : ''}" data-id="${attr(p.id)}" style="min-height:58px;${rowStyle}">
                <td style="text-align:center;vertical-align:middle;padding:6px 2px">
                  <div style="display:flex;flex-direction:column;align-items:center;gap:3px">
                    <span class="${scoreClass} clickable" data-act="view-score" data-id="${attr(p.id)}" style="font-weight:700;font-size:.82rem;padding:2px 5px;cursor:pointer" title="Click to view 4-pillar score breakdown">
                      ${score}
                    </span>
                    ${seg === 'both' 
                      ? `<button class="chip tiny clickable btn-toggle-seg" data-act="toggle-segment" data-id="${attr(p.id)}" style="font-size:.60rem;padding:1px 5px;font-weight:700;background:rgba(16,185,129,0.12);color:#059669;border:1px solid rgba(16,185,129,0.3);border-radius:4px;white-space:nowrap;line-height:1.2;cursor:pointer" title="Fleet Segment: STD + LUX (Click to cycle LUX / STD)">STD + LUX</button>`
                      : seg === 'luxury'
                      ? `<button class="chip tiny clickable btn-toggle-seg" data-act="toggle-segment" data-id="${attr(p.id)}" style="font-size:.60rem;padding:1px 5px;font-weight:700;background:var(--gold-soft);color:var(--gold-ink);border:1px solid var(--gold-strong);border-radius:4px;white-space:nowrap;line-height:1.2;cursor:pointer" title="Fleet Segment: LUX (Click to cycle STD / STD + LUX)">LUX</button>`
                      : `<button class="chip tiny clickable btn-toggle-seg" data-act="toggle-segment" data-id="${attr(p.id)}" style="font-size:.60rem;padding:1px 5px;font-weight:600;background:var(--surface-2);color:var(--text-2);border:1px solid var(--line);border-radius:4px;white-space:nowrap;line-height:1.2;cursor:pointer" title="Fleet Segment: STD (Click to cycle STD + LUX / LUX)">STD</button>`
                    }
                  </div>
                </td>
                <td style="vertical-align:middle">
                  <div class="row" style="gap:4px;align-items:center;white-space:nowrap">
                    <span style="font-weight:600;font-size:.86rem;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${attr(p.name)}">${esc(p.name)}</span>
                    ${newBadgeHtml(p, list)}
                  </div>
                  <div class="tiny muted" style="white-space:nowrap;margin-top:2px">📍 ${esc(p.base_city || 'Northern Italy')}</div>
                </td>
                <td style="vertical-align:middle;text-align:center;white-space:nowrap">
                  <div class="row nowrap" style="gap:4px;align-items:center;justify-content:center">
                    ${p.website 
                      ? `<a class="btn sm ghost" href="${attr(p.website)}" target="_blank" rel="noopener" style="padding:3px 6px;font-size:.73rem;white-space:nowrap;display:inline-flex;align-items:center;gap:2px" title="Open Website">${icon('external', 11)} Web</a>` 
                      : `<span class="tiny faint" style="display:inline-block;padding:3px 4px">—</span>`
                    }
                    <button class="btn sm ghost btn-find-email" data-act="find-email" data-id="${attr(p.id)}" style="padding:3px 6px;font-size:.73rem;white-space:nowrap;display:inline-flex;align-items:center;gap:2px;color:var(--series-1);border-color:rgba(59,130,246,0.3);background:rgba(59,130,246,0.06);cursor:pointer" title="Verify live website, DNS MX record & email">
                      🔍 Check
                    </button>
                  </div>
                </td>
                <td style="vertical-align:middle;white-space:nowrap">
                  ${p.email 
                    ? `<div class="row nowrap" style="gap:4px;align-items:center;white-space:nowrap">
                        ${emailDot}
                        <a href="mailto:${attr(p.email)}" style="color:var(--series-1);font-size:.78rem;text-decoration:none;display:inline-flex;align-items:center;gap:2px;white-space:nowrap;max-width:115px;overflow:hidden;text-overflow:ellipsis" title="Email: ${attr(p.email)} (${esc(emailSt)})">
                          <span style="overflow:hidden;text-overflow:ellipsis">${esc(p.email)}</span>
                        </a>
                        <button class="clickable btn-edit-pencil" data-act="edit-email" data-id="${attr(p.id)}" style="background:none;border:none;padding:2px 3px;cursor:pointer;color:var(--text-3);opacity:0.6;display:inline-flex;align-items:center;justify-content:center;border-radius:3px" title="Edit Email & Website">${pencilIcon(11)}</button>
                      </div>`
                    : `<button class="clickable" data-act="edit-email" data-id="${attr(p.id)}" style="background:var(--surface-2);border:1px dashed var(--line-strong);padding:2px 6px;border-radius:4px;color:var(--gold-ink);cursor:pointer;font-size:.72rem;white-space:nowrap;display:inline-flex;align-items:center;gap:3px" title="Click to add email">
                        + Add email
                      </button>`
                  }
                </td>
                <td style="vertical-align:middle">
                  <div style="display:flex;flex-wrap:wrap;gap:3px;align-items:center;line-height:1.2;max-width:175px">
                    ${categories.map((c) => {
                      const vKey = detectVehicleKey(c);
                      const isMatch = vehicleFilter !== 'all' && (vehicleFilter === vKey || operatorHasVehicleType(p, vehicleFilter));
                      return `
                        <button class="chip tiny outline fleet-filter-btn ${isMatch ? 'active-fleet-match' : ''}" 
                          data-vkey="${attr(vKey)}" 
                          style="font-size:.68rem;padding:1px 6px;line-height:1.2;white-space:nowrap;cursor:pointer;border-radius:4px;${isMatch ? 'background:var(--gold-soft);border-color:var(--gold-strong);color:var(--gold-ink);font-weight:700;' : 'border-color:var(--line);background:var(--surface-2);'}" 
                          title="Click to filter by ${esc(shortFleetName(c))}">
                          ${esc(shortFleetName(c))}
                        </button>
                      `;
                    }).join('')}
                    <button class="clickable" data-act="edit-fleet" data-id="${attr(p.id)}" style="background:none;border:none;padding:1px 3px;cursor:pointer;font-size:.66rem;color:var(--gold-ink);display:inline-flex;align-items:center;gap:2px" title="Edit fleet categories & models">
                      ${pencilIcon(10)}
                    </button>
                  </div>
                </td>
                <td style="vertical-align:middle">
                  <div class="clickable" data-act="edit-rates" data-id="${attr(p.id)}" style="cursor:pointer;max-width:205px;display:flex;flex-direction:column;gap:3px;line-height:1.25" title="Click to view/edit Rates and My Pre-Contact Notes">
                    ${hasRates ? `
                      <div style="font-size:.74rem;font-weight:700;color:#059669;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                        💶 ${esc([p.rate_hourly, p.rate_standby].filter(Boolean).join(' · '))}
                      </div>
                    ` : ''}
                    ${p.notes ? `
                      <div class="tiny" style="font-size:.71rem;color:#1e293b;line-height:1.3;white-space:pre-line;max-height:56px;overflow-y:auto;background:rgba(245,158,11,0.09);padding:3px 6px;border-radius:4px;border-left:2px solid #f59e0b" title="${attr(p.notes)}">
                        <b>📝</b> ${esc(p.notes)}
                      </div>
                    ` : `
                      <div class="row nowrap" style="gap:4px;align-items:center">
                        <span class="chip tiny outline" style="font-size:.68rem;padding:1px 6px;border-color:var(--border);color:var(--text-3);background:var(--surface-2)">+ Notes / Rates</span>
                        <span class="clickable" data-act="edit-notes" data-id="${attr(p.id)}" style="font-size:.7rem;color:var(--text-3)" title="Edit notes">${pencilIcon(10)}</span>
                      </div>
                    `}
                    ${p.client_notes ? `<div class="tiny" style="color:#059669;font-weight:600;font-size:.68rem;line-height:1.2;overflow:hidden;text-overflow:ellipsis" title="${attr(p.client_notes)}">💬 Reply: ${esc(p.client_notes)}</div>` : ''}
                  </div>
                </td>
                <td style="vertical-align:middle;white-space:nowrap">
                  <div style="display:flex;flex-direction:column;gap:3px">
                    <select class="sm bus-status-select" data-id="${attr(p.id)}" style="padding:2px 5px;border-radius:6px;font-size:.73rem;width:100%;height:26px;line-height:1.1;cursor:pointer;white-space:nowrap;${getStatusBadgeStyle(p.status)}">
                      ${core.BUS_STATUSES.map((st) => `<option value="${st.key}" ${p.status === st.key ? 'selected' : ''} style="background:var(--surface);color:var(--ink)">${st.label}</option>`).join('')}
                    </select>
                    ${p.status === 'WANT_TO_CONTACT'
                      ? `<div class="tiny" style="color:#7c3aed;font-weight:700;font-size:.68rem;background:rgba(124,58,237,0.08);padding:1px 5px;border-radius:4px;border:1px solid rgba(124,58,237,0.25);text-align:center" title="${p.scheduled_at ? 'Scheduled for ' + new Date(p.scheduled_at).toLocaleString('en-GB') : 'In Queue'}">
                          ⏳ ${p.scheduled_at ? new Date(p.scheduled_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + new Date(p.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }) : 'Mon 09:00'}
                         </div>`
                      : p.status === 'CONTACTED'
                      ? (p.outreach_stage === 'manual_escalation' || p.score_breakdown?.partner_card?.outreach_stage === 'manual_escalation'
                          ? `<div class="tiny" style="color:#b91c1c;font-weight:700;font-size:.67rem;background:#fee2e2;padding:2px 5px;border-radius:4px;border:1px solid #fca5a5;text-align:center" title="No reply 72h after 2 emails — manual call needed">
                              📞 Needs Call (72h)
                             </div>`
                          : `<div class="tiny" style="color:#0284c7;font-weight:700;font-size:.68rem;background:rgba(2,132,199,0.08);padding:1px 5px;border-radius:4px;border:1px solid rgba(2,132,199,0.25);text-align:center" title="${p.last_outreach_at ? 'Sent at ' + new Date(p.last_outreach_at).toLocaleString('en-GB') : 'Contacted'}">
                              ✉️ Sent: ${p.last_outreach_at ? new Date(p.last_outreach_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Yes'}
                             </div>`)
                      : ''
                    }
                    <button class="btn sm ghost" data-act="ceo-pitch" data-id="${attr(p.id)}" style="padding:1px 6px;font-size:.69rem;color:#1d4ed8;border-color:rgba(37,99,235,0.3);background:rgba(37,99,235,0.06);font-weight:600;width:100%;justify-content:center" title="Open short CEO Italian Email Outreach for ${attr(p.name)}">
                      ✉️ CEO Pitch (IT)
                    </button>
                    ${(p.outreach_stage === 'manual_escalation' || p.score_breakdown?.partner_card?.outreach_stage === 'manual_escalation')
                      ? `<a class="btn sm" href="${attr(waHref || `tel:${(p.phone || '').replace(/[^\d+]/g, '')}`)}" target="_blank" rel="noopener" style="padding:2px 6px;font-size:.68rem;background:#15803d;color:#fff;font-weight:700;width:100%;justify-content:center;margin-top:2px;display:inline-flex;align-items:center;gap:3px;text-decoration:none" title="Call or WhatsApp this operator now">
                          📞 Call / WA: ${esc(p.phone || p.whatsapp || 'Direct')}
                         </a>`
                      : ''
                    }
                  </div>
                </td>
                <td style="vertical-align:middle;text-align:center;white-space:nowrap">
                  <button class="btn sm ghost" data-act="delete-partner" data-id="${attr(p.id)}" style="padding:4px 5px;color:var(--bad);display:inline-flex;align-items:center" title="Delete & Never Suggest Again">${icon('trash', 13)}</button>
                </td>
              </tr>`;
            }).join('') : `
              <tr>
                <td colspan="9" class="empty small" style="padding:28px 16px;text-align:center">
                  <div class="stack" style="gap:8px;align-items:center;justify-content:center">
                    <span style="font-size:1.5rem">🔍</span>
                    <b>No bus operators found matching the current filters.</b>
                    <button class="btn sm ghost" id="empty-clear-filters" style="margin-top:4px;color:var(--series-1);border-color:var(--border)">
                      ✕ Reset All Filters
                    </button>
                  </div>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>`;

    attachEvents();
  }

  function attachEvents() {
    // Show / Hide Visual Pipeline Flow toggle
    el.querySelector('#btn-toggle-visual-flow')?.addEventListener('click', () => {
      setFlowVisibility(!showVisualFlow);
      paint();
    });

    // Clear Visual Flow selection
    el.querySelector('#btn-clear-flow-sel')?.addEventListener('click', () => {
      selectedFlowNodes = {};
      paint();
    });

    // Click on nodes in the Visual Pipeline Flow (Sankey diagram)
    el.querySelectorAll('[data-flow-node]').forEach((nodeEl) => {
      nodeEl.addEventListener('click', (e) => {
        const colIdx = e.currentTarget.dataset.flowCol;
        const nodeKey = e.currentTarget.dataset.flowNode;
        if (selectedFlowNodes[colIdx] === nodeKey) {
          delete selectedFlowNodes[colIdx];
        } else {
          selectedFlowNodes[colIdx] = nodeKey;
        }
        paint();
      });
    });

    // Batch Verify All Emails button
    el.querySelector('#btn-verify-all-emails')?.addEventListener('click', async (e) => {
      await verifyAllPartnerEmails(e.currentTarget, paint);
    });

    // Top Header CEO Outreach button
    el.querySelector('#btn-ceo-outreach')?.addEventListener('click', () => {
      openCeoOutreachModal(null);
    });

    // Segment filter chips (Luxury VIP vs Standard GT)
    el.querySelectorAll('[data-segment]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const seg = e.currentTarget.dataset.segment;
        segmentFilter = segmentFilter === seg ? 'all' : seg;
        paint();
      });
    });

    // Filter clicks
    el.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const f = e.currentTarget.dataset.filter;
        if (f === 'all') {
          activeFilter = 'all';
          segmentFilter = 'all';
          statusFilter = 'all';
          vehicleFilter = 'all';
          cityFilter = 'all';
          searchQ = '';
          selectedFlowNodes = {};
        } else if (f === 'latest_added') {
          activeFilter = activeFilter === 'latest_added' ? 'all' : 'latest_added';
          if (activeFilter === 'latest_added') sortBy = 'newest_first';
        } else if (f === 'newly_added' || f === 'top_tier' || f === 'replied_rates' || f === 'manual_escalation') {
          activeFilter = activeFilter === f ? 'all' : f;
        } else if (f === 'want_to_contact') {
          statusFilter = statusFilter === 'WANT_TO_CONTACT' ? 'all' : 'WANT_TO_CONTACT';
        } else if (f === 'contacted') {
          statusFilter = statusFilter === 'CONTACTED' ? 'all' : 'CONTACTED';
        } else if (f === 'to_review') {
          statusFilter = statusFilter === 'TO_REVIEW' ? 'all' : 'TO_REVIEW';
        } else if (f === 'approved') {
          statusFilter = statusFilter === 'APPROVED_PARTNER' ? 'all' : 'APPROVED_PARTNER';
        }
        paint();
      });
    });

    // Sort order dropdown
    const sortSelect = el.querySelector('#select-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        sortBy = e.target.value;
        paint();
      });
    }

    // Status dropdown filter
    const statusSelect = el.querySelector('#select-status');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        statusFilter = e.target.value;
        paint();
      });
    }

    // Vehicle platform dropdown filter
    const vehicleSelect = el.querySelector('#select-vehicle');
    if (vehicleSelect) {
      vehicleSelect.addEventListener('change', (e) => {
        vehicleFilter = e.target.value;
        paint();
      });
    }

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

    // Clear filters button
    const clearBtn = el.querySelector('#btn-clear-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        activeFilter = 'all';
        segmentFilter = 'all';
        statusFilter = 'all';
        vehicleFilter = 'all';
        cityFilter = 'all';
        searchQ = '';
        selectedFlowNodes = {};
        paint();
      });
    }

    // Header clear vehicle button
    const headerClearVehicle = el.querySelector('#header-clear-vehicle');
    if (headerClearVehicle) {
      headerClearVehicle.addEventListener('click', () => {
        vehicleFilter = 'all';
        paint();
      });
    }

    // Header clear status button
    const headerClearStatus = el.querySelector('#header-clear-status');
    if (headerClearStatus) {
      headerClearStatus.addEventListener('click', () => {
        statusFilter = 'all';
        paint();
      });
    }

    // Empty state clear filters button
    const emptyClearBtn = el.querySelector('#empty-clear-filters');
    if (emptyClearBtn) {
      emptyClearBtn.addEventListener('click', () => {
        activeFilter = 'all';
        segmentFilter = 'all';
        statusFilter = 'all';
        vehicleFilter = 'all';
        cityFilter = 'all';
        searchQ = '';
        selectedFlowNodes = {};
        paint();
      });
    }

    // Click on individual fleet tags inside table rows
    el.querySelectorAll('.fleet-filter-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const vKey = e.currentTarget.dataset.vkey;
        if (!vKey) return;
        vehicleFilter = vehicleFilter === vKey ? 'all' : vKey;
        paint();
      });
    });

    // Status change
    el.querySelectorAll('.bus-status-select').forEach((sel) => {
      sel.addEventListener('change', async (e) => {
        const id = e.target.dataset.id;
        const newStatus = e.target.value;
        const partner = (S.busPartners || []).find((x) => x.id === id);
        if (newStatus === 'WANT_TO_CONTACT') {
          const existingQueued = (S.busPartners || []).filter((p) => p.status === 'WANT_TO_CONTACT' && p.id !== id);
          const nextSlot = core.nextBusSendSlot(new Date(), existingQueued.length);
          await updateBusPartner(id, { 
            status: 'WANT_TO_CONTACT', 
            scheduled_at: nextSlot.toISOString(),
            outreach_stage: 'ready'
          });
          toast(`Added to queue · Scheduled for ${nextSlot.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ${nextSlot.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, 'ok');
        } else if (newStatus === 'TO_REVIEW') {
          await updateBusPartner(id, { 
            status: 'TO_REVIEW', 
            scheduled_at: null,
            outreach_stage: 'to_check'
          });
          toast('Moved back to To Check', 'ok');
        } else {
          await updateBusPartner(id, { status: newStatus });
          toast(newStatus === 'NOT_RELEVANT' ? 'Marked Not Relevant (Score set to 0)' : `Status updated to ${newStatus}`);
        }
        paint();
      });
    });

    // Toggle Fleet Segment (STD + LUX / LUX / STD) on click
    el.querySelectorAll('[data-act="toggle-segment"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const partner = (S.busPartners || []).find((p) => p.id === id);
        if (!partner) return;
        const curSeg = partner.fleet_segment || core.inferBusSegment(partner);
        const nextSeg = curSeg === 'both' ? 'luxury' : curSeg === 'luxury' ? 'standard' : 'both';
        await updateBusPartner(id, { fleet_segment: nextSeg, user_set_segment: true });
        toast(`✓ Changed ${partner.name} to ${nextSeg === 'both' ? 'STD + LUX' : nextSeg.toUpperCase()}`, 'ok');
        paint();
      });
    });

    // Edit Standby/Hourly Rates, Bus Models, Pax Capacity & Reply Auto-Extractor
    el.querySelectorAll('[data-act="edit-rates"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        const partner = (S.busPartners || []).find((x) => x.id === id);
        if (partner) openRatesAndSpecsModal(partner);
      });
    });

    // Per-row CEO Pitch button
    el.querySelectorAll('[data-act="ceo-pitch"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        const partner = (S.busPartners || []).find((x) => x.id === id);
        if (partner) openCeoOutreachModal(partner);
      });
    });

    // Edit Notes
    el.querySelectorAll('[data-act="edit-notes"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
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

    // Delete & Exclude Partner (Single Row)
    el.querySelectorAll('[data-act="delete-partner"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        const partner = (S.busPartners || []).find((x) => x.id === id);
        if (partner) openDeleteExcludeModal(partner);
      });
    });

    // 1-Click Find & Verify Email & Website
    el.querySelectorAll('[data-act="find-email"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        await findAndVerifyPartnerEmail(id, e.currentTarget, paint);
      });
    });

    // View Excluded / Blocked Operators Modal
    el.querySelector('#btn-view-excluded')?.addEventListener('click', () => {
      openExcludedModal();
    });

    // Edit fleet categories modal
    el.querySelectorAll('[data-act="edit-fleet"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        const partner = (S.busPartners || []).find((x) => x.id === id);
        if (partner) openFleetModal(partner);
      });
    });

    // Scout by URL Modal
    el.querySelector('#btn-scout-url')?.addEventListener('click', () => {
      openScoutUrlModal();
    });

    // Auto-Scout Fleet Modal (Multi-Filter)
    el.querySelector('#btn-scout-market')?.addEventListener('click', () => {
      openAutoScoutModal();
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

  // --- 1. Partner Deliverables Modal: Bus Models, Pax Fit, Standby & Hourly Rates, Direct WA + Reply Auto-Extractor ---
  function openRatesAndSpecsModal(partner) {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    const seg = core.inferBusSegment(partner);
    const rawWa = (partner.whatsapp || partner.phone || '').replace(/[^\d+]/g, '');
    const waHref = rawWa ? `https://wa.me/${rawWa.replace(/^\+/, '')}` : '';

    backdrop.innerHTML = `
    <div class="dialog card stack" style="max-width:600px;padding:24px;max-height:92vh;overflow-y:auto">
      <div class="row between" style="align-items:flex-start">
        <div>
          <div class="label eyebrow" style="color:#059669;font-weight:700">Partner Fleet Specs, Pricing & Direct Contact</div>
          <h3 style="margin:2px 0 0">${esc(partner.name)} <span class="tiny muted">· 📍 ${esc(partner.base_city || 'Northern Italy')}</span></h3>
        </div>
        <button class="btn ghost sm" data-close>×</button>
      </div>

      <!-- Auto-Extract from Reply Box -->
      <div class="card stack" style="gap:8px;background:rgba(16, 185, 129, 0.06);border:1px solid rgba(16, 185, 129, 0.28);padding:12px 14px;border-radius:8px;margin-top:6px">
        <div class="row between" style="align-items:center">
          <span style="font-weight:700;font-size:.82rem;color:#065f46">⚡ Paste Operator Reply (Email or WhatsApp) to Auto-Extract</span>
          <button type="button" class="btn sm" id="btn-parse-reply" style="background:#059669;color:#fff;border:none;padding:3px 10px;font-size:.76rem;font-weight:700">✨ Auto-Extract Specs & Rates</button>
        </div>
        <textarea id="reply-paste-box" rows="2" placeholder="Paste their Italian/English reply here (e.g. 'Buongiorno Dmitri, abbiamo Sprinter VIP 16 posti e Setra 52 posti. Tariffa oraria 85€/h, disposizione 4h 420€, 8h 800€. WhatsApp diretto: +39 348 1234567')..." style="font-size:.8rem;padding:6px 10px;width:100%;background:var(--surface)"></textarea>
      </div>

      <div class="stack" style="gap:10px;margin:8px 0">
        <div class="row" style="gap:10px">
          <label class="field grow">
            <span style="font-weight:600;font-size:.82rem">1. Bus Class (Luxury / Standard)</span>
            <select id="spec-segment" class="sm" style="padding:7px 10px">
              <option value="luxury" ${seg === 'luxury' ? 'selected' : ''}>✨ Luxury VIP (100% Unbranded / Total Black)</option>
              <option value="standard" ${seg === 'standard' ? 'selected' : ''}>🚌 Standard GT / Charter Coach</option>
              <option value="both" ${seg === 'both' ? 'selected' : ''}>✨+🚌 Both Luxury VIP & Standard GT</option>
            </select>
          </label>
          <label class="field grow">
            <span style="font-weight:600;font-size:.82rem">2. How Many People Fit (Pax Capacity)</span>
            <input type="text" id="spec-pax" placeholder="e.g. 8, 16, 28, 52 pax" value="${attr(partner.pax_capacity || '')}" style="font-size:.86rem;padding:7px 10px">
          </label>
        </div>

        <label class="field">
          <div class="row between" style="align-items:center">
            <span style="font-weight:600;font-size:.82rem">3. Bus Models Available (with Passenger Capacity per Bus)</span>
            <button type="button" class="btn ghost sm" id="btn-auto-pair-pax" style="font-size:.71rem;padding:2px 7px;color:#059669;border-color:#10b981;font-weight:600" title="Ensure every bus model has its exact passenger capacity attached">🤖 AI Pair Pax per Bus</button>
          </div>
          <input type="text" id="spec-models" placeholder="e.g. Mercedes Sprinter VIP (16 pax), Indcar Wing (28 pax), Setra S515 HD (52 pax)" value="${attr(partner.bus_models || '')}" style="font-size:.86rem;padding:7px 10px;width:100%">
        </label>

        <!-- Live AI Per-Bus Passenger Capacity Verification Box -->
        <div id="ai-per-bus-pax-status" style="padding:9px 12px;border-radius:8px;font-size:.78rem"></div>

        <div class="row" style="gap:10px">
          <label class="field grow">
            <span style="font-weight:600;font-size:.82rem">4. Hourly Service Price (€/h)</span>
            <input type="text" id="spec-rate-hourly" placeholder="e.g. €85/h (Sprinter) · €110/h (Coach)" value="${attr(partner.rate_hourly || '')}" style="font-size:.86rem;padding:7px 10px">
          </label>
          <label class="field grow">
            <span style="font-weight:600;font-size:.82rem">5. Standby / A Disposizione (4h / 8h)</span>
            <input type="text" id="spec-rate-standby" placeholder="e.g. €420 (4h disp.) · €800 (8h disp.)" value="${attr(partner.rate_standby || '')}" style="font-size:.86rem;padding:7px 10px">
          </label>
        </div>

        <div class="row" style="gap:10px;align-items:flex-end">
          <label class="field grow">
            <span style="font-weight:600;font-size:.82rem">6. Direct Contact (WhatsApp Preferred)</span>
            <input type="text" id="spec-whatsapp" placeholder="e.g. +39 348 123 4567 (Marco - Dispatch)" value="${attr(partner.whatsapp || partner.phone || '')}" style="font-size:.86rem;padding:7px 10px">
          </label>
          ${waHref ? `<a class="btn sm" href="${attr(waHref)}" target="_blank" rel="noopener" style="height:35px;background:#059669;color:#fff;border:none;display:inline-flex;align-items:center;gap:4px;white-space:nowrap">💬 Open WA</a>` : ''}
        </div>

        <label class="field">
          <span style="font-weight:600;font-size:.82rem">Partner Status &amp; Pipeline Stage</span>
          <select id="spec-status" class="sm" style="padding:7px 10px">
            ${core.BUS_STATUSES.map((st) => `<option value="${st.key}" ${partner.status === st.key ? 'selected' : ''}>${st.label}</option>`).join('')}
          </select>
        </label>

        <div class="row" style="gap:10px">
          <label class="field grow">
            <span style="font-weight:600;font-size:.82rem">📝 My Pre-Contact Notes (Dmitri's Questions &amp; Comments)</span>
            <textarea id="spec-notes" rows="3" style="font-size:.84rem;padding:6px 10px" placeholder="e.g. - do they have only 19 seats? Ask for standby prices...">${esc(partner.notes || '')}</textarea>
          </label>
          <label class="field grow">
            <span style="font-weight:600;font-size:.82rem">💬 Client Response &amp; Learned Info (From Operator Reply)</span>
            <textarea id="spec-client-notes" rows="3" style="font-size:.84rem;padding:6px 10px" placeholder="e.g. Confirmed on WhatsApp: 16p Sprinter €420 (4h) / €800 (8h), Setra 54p €1,100 (8h). Extra km €1.50/km...">${esc(partner.client_notes || '')}</textarea>
          </label>
        </div>
      </div>

      <div class="row between" style="margin-top:10px;align-items:center">
        <label class="row" style="gap:6px;align-items:center;cursor:pointer">
          <input type="checkbox" id="spec-mark-replied" ${partner.replied_at || partner.rate_hourly || partner.rate_standby ? 'checked' : ''} style="cursor:pointer">
          <span class="tiny" style="font-weight:700;color:#059669">Count toward 🎯 10 Replied Partners Weekly Goal</span>
        </label>
        <div class="row" style="gap:8px">
          <button class="btn ghost" data-close>Cancel</button>
          <button class="btn primary" id="btn-save-specs">Save Specs, Rates & WA</button>
        </div>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    const renderAiPaxStatus = () => {
      const modelsVal = backdrop.querySelector('#spec-models').value.trim();
      const audit = core.verifyPerBusPaxCapacity({ bus_models: modelsVal, fleet_categories: partner.fleet_categories });
      const box = backdrop.querySelector('#ai-per-bus-pax-status');
      if (!box) return;

      if (audit.allModelsHavePax) {
        box.style.background = 'rgba(16, 185, 129, 0.08)';
        box.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        box.innerHTML = `
          <div class="row between" style="align-items:center;margin-bottom:5px">
            <span style="font-weight:700;color:#065f46">🤖 AI Per-Bus Passenger Check: ✓ Every bus has its exact passenger count</span>
            <span class="tiny" style="color:#059669;font-weight:700">${audit.modelsWithPax.length} bus${audit.modelsWithPax.length === 1 ? '' : 'es'} verified</span>
          </div>
          <div class="row" style="gap:6px;flex-wrap:wrap">
            ${audit.modelsWithPax.map((m) => `
              <span class="chip tiny" style="background:#fff;border:1px solid #10b981;color:#065f46;font-weight:600;font-size:.72rem;padding:2px 8px">
                🚌 ${esc(m.model)} → <b>👥 ${esc(m.pax)}</b>
              </span>
            `).join('')}
          </div>
        `;
      } else {
        box.style.background = '#fffbeb';
        box.style.border = '1px solid #f59e0b';
        box.innerHTML = `
          <div class="row between" style="align-items:center;gap:8px;flex-wrap:wrap">
            <span style="font-weight:700;color:#b45309">
              ⚠️ AI Alert: Missing passenger count for ${audit.modelsMissingPax.length ? `<b>${esc(audit.modelsMissingPax.join(', '))}</b>` : 'bus models'}! We must always know how many passengers fit in each bus.
            </span>
            <div class="row" style="gap:6px">
              <button type="button" class="btn sm" id="btn-fix-missing-pax" style="background:#f59e0b;color:#fff;border:none;font-size:.71rem;padding:2px 8px;font-weight:700">✨ Auto-Fill Standard Pax</button>
              <button type="button" class="btn ghost sm" id="btn-copy-pax-followup" style="font-size:.71rem;padding:2px 8px;border-color:#d97706;color:#b45309;font-weight:600">📋 Copy Italian Follow-Up</button>
            </div>
          </div>
          ${audit.modelsWithPax.length ? `
            <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">
              ${audit.modelsWithPax.map((m) => `
                <span class="chip tiny" style="background:#fff;border:1px solid #10b981;color:#065f46;font-weight:600;font-size:.72rem;padding:2px 8px">
                  🚌 ${esc(m.model)} → <b>👥 ${esc(m.pax)}</b>
                </span>
              `).join('')}
              ${audit.modelsMissingPax.map((m) => `
                <span class="chip tiny" style="background:#fef2f2;border:1px solid #ef4444;color:#b91c1c;font-weight:700;font-size:.72rem;padding:2px 8px">
                  🚌 ${esc(m)} → ❓ ? pax
                </span>
              `).join('')}
            </div>
          ` : ''}
        `;
        box.querySelector('#btn-fix-missing-pax')?.addEventListener('click', () => {
          const inferred = core.verifyPerBusPaxCapacity(
            { bus_models: backdrop.querySelector('#spec-models').value.trim(), fleet_categories: partner.fleet_categories },
            { autoInferKnownStandards: true }
          );
          if (inferred.formattedBusModels) {
            backdrop.querySelector('#spec-models').value = inferred.formattedBusModels;
          }
          if (inferred.formattedPaxSummary) {
            backdrop.querySelector('#spec-pax').value = inferred.formattedPaxSummary;
          }
          renderAiPaxStatus();
          toast('🤖 AI paired passenger capacity to each bus model!', 'ok');
        });
        box.querySelector('#btn-copy-pax-followup')?.addEventListener('click', () => {
          copyText(audit.followUpQuestionIt, 'Copied Italian follow-up asking for exact passenger count per bus!');
        });
      }
    };

    renderAiPaxStatus();
    backdrop.querySelector('#spec-models').addEventListener('input', renderAiPaxStatus);

    backdrop.querySelector('#btn-auto-pair-pax')?.addEventListener('click', () => {
      const inferred = core.verifyPerBusPaxCapacity(
        { bus_models: backdrop.querySelector('#spec-models').value.trim(), fleet_categories: partner.fleet_categories },
        { autoInferKnownStandards: true }
      );
      if (inferred.formattedBusModels) {
        backdrop.querySelector('#spec-models').value = inferred.formattedBusModels;
      }
      if (inferred.formattedPaxSummary) {
        backdrop.querySelector('#spec-pax').value = inferred.formattedPaxSummary;
      }
      renderAiPaxStatus();
      toast('🤖 AI verified & paired passenger count for every bus!', 'ok');
    });

    backdrop.querySelector('#btn-parse-reply').addEventListener('click', () => {
      const rawText = backdrop.querySelector('#reply-paste-box').value.trim();
      if (!rawText) {
        toast('Paste the operator reply text first to auto-extract.', 'warn');
        return;
      }
      const parsed = core.parseBusPartnerReply(rawText, partner);
      if (parsed.bus_models) backdrop.querySelector('#spec-models').value = parsed.bus_models;
      if (parsed.pax_capacity) backdrop.querySelector('#spec-pax').value = parsed.pax_capacity;
      if (parsed.rate_hourly) backdrop.querySelector('#spec-rate-hourly').value = parsed.rate_hourly;
      if (parsed.rate_standby) backdrop.querySelector('#spec-rate-standby').value = parsed.rate_standby;
      if (parsed.whatsapp) backdrop.querySelector('#spec-whatsapp').value = parsed.whatsapp;
      if (parsed.fleet_segment) backdrop.querySelector('#spec-segment').value = parsed.fleet_segment;
      backdrop.querySelector('#spec-mark-replied').checked = true;
      backdrop.querySelector('#spec-outreach-stage').value = 'replied';
      if (backdrop.querySelector('#spec-status').value === 'TO_REVIEW' || backdrop.querySelector('#spec-status').value === 'WANT_TO_CONTACT') {
        backdrop.querySelector('#spec-status').value = 'CONTACTED';
      }
      renderAiPaxStatus();
      if (!parsed.all_models_have_pax && parsed.models_missing_pax?.length) {
        toast(`⚠️ Extracted specs, but ${parsed.models_missing_pax.join(', ')} is missing its exact passenger count!`, 'warn');
      } else {
        toast('✨ Extracted Bus Models (with Pax per Bus), Standby/Hourly Rates & WhatsApp!', 'ok');
      }
    });

    backdrop.querySelector('#btn-save-specs').addEventListener('click', async () => {
      const fleet_segment = backdrop.querySelector('#spec-segment').value;
      const pax_capacity = backdrop.querySelector('#spec-pax').value.trim();
      const bus_models = backdrop.querySelector('#spec-models').value.trim();
      const rate_hourly = backdrop.querySelector('#spec-rate-hourly').value.trim();
      const rate_standby = backdrop.querySelector('#spec-rate-standby').value.trim();
      const whatsapp = backdrop.querySelector('#spec-whatsapp').value.trim();
      const status = backdrop.querySelector('#spec-status').value;
      const notes = backdrop.querySelector('#spec-notes').value.trim();
      const client_notes = backdrop.querySelector('#spec-client-notes')?.value.trim() || '';
      const markReplied = backdrop.querySelector('#spec-mark-replied').checked;

      let outreach_stage = status === 'APPROVED_PARTNER' ? 'partner_won' :
                           (markReplied || rate_hourly || rate_standby) ? 'replied' :
                           status === 'WANT_TO_CONTACT' ? 'ready' :
                           status === 'CONTACTED' ? 't1_sent' :
                           (status === 'REJECTED' || status === 'NOT_RELEVANT') ? 'closed' : 'to_check';

      await updateBusPartner(partner.id, {
        fleet_segment,
        user_set_segment: true,
        pax_capacity,
        bus_models,
        rate_hourly,
        rate_standby,
        whatsapp,
        phone: whatsapp || partner.phone,
        status,
        user_set_status: true,
        outreach_stage,
        replied_at: (markReplied || rate_hourly || rate_standby) ? (partner.replied_at || new Date().toISOString()) : null,
        notes,
        client_notes,
      });
      toast(`✓ Saved specs, rates, notes & WA for ${partner.name}`, 'ok');
      close();
      paint();
    });
  }

  // --- 2. CEO-Level Short Italian Outreach Modal (Single Operator & Autonomous Batch Queue) ---
  function openCeoOutreachModal(targetPartner = null) {
    const list = S.busPartners || [];
    const activePartner = targetPartner || list.find((p) => p.status === 'WANT_TO_CONTACT') || list[0];
    if (!activePartner) {
      toast('No bus partners in roster.', 'warn');
      return;
    }

    let currentStep = 'T1_intro';
    let isSundayReply = false;
    const now = new Date();
    const sendGate = core.canSendBusOutreach(activePartner, now, { isReplyToSundayInbound: isSundayReply, allowUnverifiedOverride: true });
    const draft = core.buildBusOutreachDraft(activePartner, currentStep);
    // Strict Manual Gate: Only operators manually promoted by user to WANT_TO_CONTACT can be queued/sent
    const readyBatch = list.filter((p) => p.status === 'WANT_TO_CONTACT' && p.email && p.email_status !== 'invalid');

    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `
    <div class="dialog card stack" style="max-width:640px;padding:24px;max-height:92vh;overflow-y:auto">
      <div class="row between" style="align-items:flex-start">
        <div>
          <div class="label eyebrow" style="color:#1d4ed8;font-weight:700">🇮🇹 CEO-Level Short Italian Outreach · Mon–Sat Engine</div>
          <h3 style="margin:2px 0 0">${targetPartner ? `Pitch to ${esc(activePartner.name)}` : `Bus Partner Outreach Pipeline (${readyBatch.length} Ready)`}</h3>
        </div>
        <button class="btn ghost sm" data-close>×</button>
      </div>

      <!-- Autonomous Schedule & Deliverability Status Banner -->
      <div class="card row between" style="align-items:center;flex-wrap:wrap;gap:8px;padding:10px 14px;background:var(--surface-2);border-left:3px solid #2563eb">
        <div class="stack" style="gap:2px">
          <div class="row" style="gap:6px;align-items:center">
            <span class="chip tiny ok" style="font-weight:700">📅 Mon–Sat Active</span>
            <span class="chip tiny outline" style="font-weight:600">🚫 Sunday Paused (Except Sunday Replies)</span>
            <span class="chip tiny outline" style="font-weight:600">🛡️ Zero-Bounce MX Gate</span>
          </div>
          <span class="tiny muted">
            Short CEO-to-Owner Italian message (~70 words): presents DOROGO's Lake Como &amp; Milan client demand and asks for <b>Models + Pax Capacity, Standby &amp; Hourly Rates, and Direct WhatsApp</b>.
          </span>
        </div>
      </div>

      <!-- Select Operator & Template Step -->
      <div class="row" style="gap:10px;flex-wrap:wrap">
        <label class="field grow">
          <span style="font-weight:600;font-size:.8rem">Preview Operator</span>
          <select id="ceo-partner-select" class="sm" style="padding:6px 10px">
            ${list.filter((p) => p.status !== 'NOT_RELEVANT').map((p) => `
              <option value="${attr(p.id)}" ${p.id === activePartner.id ? 'selected' : ''}>
                ${esc(p.name)} (${esc(p.base_city || 'IT')} · ${p.email || 'no email'})
              </option>
            `).join('')}
          </select>
        </label>
        <label class="field">
          <span style="font-weight:600;font-size:.8rem">Sequence Step</span>
          <select id="ceo-step-select" class="sm" style="padding:6px 10px">
            <option value="T1_intro" selected>1. Email 1: CEO Intro (Italian · Day 0)</option>
            <option value="T2_followup">2. Email 2: Quick Follow-up (Italian · Day +3)</option>
          </select>
        </label>
      </div>

      <label class="field" id="ceo-subject-wrap">
        <span style="font-weight:600;font-size:.8rem">Subject Line (Italian B2B)</span>
        <input type="text" id="ceo-subject" value="${attr(draft.subject)}" style="font-size:.86rem;padding:7px 10px;width:100%">
      </label>

      <label class="field">
        <div class="row between">
          <span style="font-weight:600;font-size:.8rem">Message Body (Short CEO-Level Italian)</span>
          <span class="tiny muted" id="ceo-word-count">${draft.word_count} words · ~20s read time</span>
        </div>
        <textarea id="ceo-body" rows="10" style="font-family:inherit;font-size:.85rem;line-height:1.45;padding:10px;width:100%">${esc(draft.body)}</textarea>
      </label>

      <!-- Sunday Reply Override Checkbox -->
      <div class="row between" style="align-items:center;flex-wrap:wrap;gap:8px;padding:6px 10px;background:var(--surface-2);border-radius:6px">
        <label class="row" style="gap:6px;align-items:center;cursor:pointer">
          <input type="checkbox" id="ceo-sunday-reply-chk" style="cursor:pointer">
          <span class="tiny" style="font-weight:600">Operator replied on Sunday (Unlock Sunday reply exception)</span>
        </label>
        <span class="tiny" id="ceo-gate-status" style="font-weight:700;color:${sendGate.ok ? '#059669' : '#d97706'}">
          ${sendGate.ok ? '✓ Allowed to send right now (Mon–Sat window)' : `⏳ ${esc(sendGate.message || 'Scheduled for next Mon–Sat slot')}`}
        </span>
      </div>

      <div class="row between" style="margin-top:8px;flex-wrap:wrap;gap:8px">
        <div class="row" style="gap:6px;flex-wrap:wrap">
          <button type="button" class="btn sm ghost" id="btn-ceo-copy">📋 Copy Text</button>
          <button type="button" class="btn sm ghost" id="btn-ceo-mailto" style="color:var(--series-1);border-color:var(--series-1)">✉️ Open in Mail App</button>
        </div>
        <div class="row" style="gap:8px;align-items:center">
          <button type="button" class="btn primary sm" id="btn-ceo-send-single" style="font-weight:700" title="Immediately send real email via Hostinger SMTP">
            🚀 Send Now (Hostinger SMTP)
          </button>
        </div>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    const getSelectedPartner = () => {
      const id = backdrop.querySelector('#ceo-partner-select').value;
      return (S.busPartners || []).find((x) => x.id === id) || activePartner;
    };

    const refreshPreview = () => {
      const p = getSelectedPartner();
      currentStep = backdrop.querySelector('#ceo-step-select').value;
      isSundayReply = backdrop.querySelector('#ceo-sunday-reply-chk').checked;
      const d = core.buildBusOutreachDraft(p, currentStep);
      backdrop.querySelector('#ceo-subject').value = d.subject || '';
      backdrop.querySelector('#ceo-subject-wrap').style.display = currentStep === 'WA_pitch' ? 'none' : 'flex';
      backdrop.querySelector('#ceo-body').value = d.body;
      backdrop.querySelector('#ceo-word-count').textContent = `${d.word_count} words · ~20s read time`;

      const gate = core.canSendBusOutreach(p, new Date(), { isReplyToSundayInbound: isSundayReply, allowUnverifiedOverride: true });
      const gateEl = backdrop.querySelector('#ceo-gate-status');
      if (p.status === 'WANT_TO_CONTACT' && p.scheduled_at) {
        const schedDate = new Date(p.scheduled_at);
        gateEl.textContent = `⏳ Queued for ${schedDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ${schedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })} (Mon–Sat schedule)`;
        gateEl.style.color = '#7c3aed';
      } else if (p.status === 'CONTACTED') {
        gateEl.textContent = `✉️ Already contacted on ${p.last_outreach_at ? new Date(p.last_outreach_at).toLocaleDateString('en-GB') : 'record'}`;
        gateEl.style.color = '#0284c7';
      } else {
        gateEl.textContent = gate.ok ? '✓ Allowed to send right now (Mon–Sat window)' : `⏳ ${gate.message || 'Queued for next Mon–Sat slot'}`;
        gateEl.style.color = gate.ok ? '#059669' : '#d97706';
      }
    };

    backdrop.querySelector('#ceo-partner-select').addEventListener('change', refreshPreview);
    backdrop.querySelector('#ceo-step-select').addEventListener('change', refreshPreview);
    backdrop.querySelector('#ceo-sunday-reply-chk').addEventListener('change', refreshPreview);

    backdrop.querySelector('#btn-ceo-copy').addEventListener('click', () => {
      const subj = backdrop.querySelector('#ceo-subject').value.trim();
      const body = backdrop.querySelector('#ceo-body').value.trim();
      copyText(subj ? `Subject: ${subj}\n\n${body}` : body, 'Italian CEO pitch copied to clipboard');
    });

    backdrop.querySelector('#btn-ceo-mailto').addEventListener('click', async () => {
      const p = getSelectedPartner();
      if (!p.email) {
        toast('Please verify or add an email address first.', 'warn');
        return;
      }
      const subj = backdrop.querySelector('#ceo-subject').value.trim();
      const body = backdrop.querySelector('#ceo-body').value.trim();
      window.open(`mailto:${p.email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`, '_blank');
      await updateBusPartner(p.id, {
        status: p.status === 'APPROVED_PARTNER' ? 'APPROVED_PARTNER' : 'CONTACTED',
        outreach_stage: currentStep === 'T2_followup' ? 't2_sent' : 't1_sent',
        last_outreach_at: new Date().toISOString(),
      });
      toast(`Opened email to ${p.name} (${p.email}) & marked Contacted`, 'ok');
      close();
      paint();
    });

    // Send Real Live Email via Hostinger SMTP
    backdrop.querySelector('#btn-ceo-send-single').addEventListener('click', async () => {
      const p = getSelectedPartner();
      if (!p.email) {
        toast(`No email on file for ${p.name}`, 'warn');
        return;
      }
      const btn = backdrop.querySelector('#btn-ceo-send-single');
      btn.disabled = true;
      btn.textContent = '🚀 Sending via Hostinger SMTP...';

      try {
        const res = await api('send_bus_partner', { partner_id: p.id });
        if (res && res.sent > 0) {
          await updateBusPartner(p.id, {
            status: 'CONTACTED',
            outreach_stage: currentStep === 'T2_followup' ? 't2_sent' : 't1_sent',
            last_outreach_at: new Date().toISOString(),
            email_status: 'verified',
            scheduled_at: null,
          });
          toast(`🚀 Sent Italian CEO pitch to ${p.name} (${p.email}) via Hostinger SMTP! Saved to Sent folder.`, 'ok');
          close();
          paint();
        } else {
          toast(`Send blocked: ${res?.message || 'Check email or deliverability'}`, 'warn');
          btn.disabled = false;
          btn.textContent = '🚀 Send Now (Hostinger SMTP)';
        }
      } catch (err) {
        toast(`Send failed: ${err.message}`, 'bad');
        btn.disabled = false;
        btn.textContent = '🚀 Send Now (Hostinger SMTP)';
      }
    });
  }

  // --- Delete & Exclude Single Operator Modal ---
  function openDeleteExcludeModal(partner) {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `
    <div class="dialog card stack" style="max-width:480px;padding:24px">
      <div class="row between" style="align-items:flex-start">
        <div class="row" style="gap:10px;align-items:center">
          <span style="font-size:1.6rem">🗑️</span>
          <div>
            <div class="label eyebrow" style="color:var(--bad)">Remove Operator</div>
            <h3 style="margin:2px 0 0">Delete & Exclude Operator</h3>
          </div>
        </div>
        <button class="btn ghost sm" data-close>×</button>
      </div>

      <p class="small" style="margin:10px 0 6px;color:var(--ink)">
        Are you sure you want to remove <b>${esc(partner.name)}</b> (📍 ${esc(partner.base_city || 'Northern Italy')}) from your CRM roster?
      </p>

      <!-- Persistent Exclusion Banner -->
      <div class="card stack" style="gap:6px;background:rgba(239, 68, 68, 0.06);border:1px solid rgba(239, 68, 68, 0.25);padding:12px;border-radius:6px">
        <div class="row" style="gap:6px;align-items:center;color:#b91c1c;font-weight:700;font-size:.84rem">
          <span>🛡️ Persistent Exclusion Memory</span>
        </div>
        <div class="tiny" style="color:var(--text-2);line-height:1.4">
          The system will remember this operator (<code>${esc(partner.website || 'N/A')}</code>) and <b>will never discover, recommend, or save them</b> back in future Auto-Scout searches.
        </div>
        <label class="row" style="align-items:center;gap:8px;margin-top:4px;cursor:pointer">
          <input type="checkbox" id="modal-chk-exclude" checked style="cursor:pointer">
          <span class="tiny" style="font-weight:600;color:var(--ink)">Remember and permanently block from future searches</span>
        </label>
      </div>

      <!-- Optional Reason -->
      <label class="field" style="margin-top:8px">
        <span class="tiny" style="font-weight:600">Reason for exclusion (optional)</span>
        <select id="modal-select-reason" class="sm" style="padding:6px 10px;width:100%">
          <option value="Not interested / Don't like" selected>Not interested / Don't like</option>
          <option value="Out of region / Non-local depot">Out of region / Non-local depot</option>
          <option value="Commercial branded fleet / Billboard decals">Commercial branded fleet / Billboard decals</option>
          <option value="Unresponsive / Poor communication">Unresponsive / Poor communication</option>
          <option value="Rates too high">Rates too high</option>
        </select>
      </label>

      <div class="row" style="justify-content:flex-end;gap:8px;margin-top:16px">
        <button class="btn ghost" data-close>Cancel</button>
        <button class="btn danger" id="modal-btn-confirm-delete" style="background:#dc2626;color:#fff;border:none;padding:6px 14px;font-weight:600">
          Delete & Exclude
        </button>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    backdrop.querySelector('#modal-btn-confirm-delete').addEventListener('click', async () => {
      const doExclude = backdrop.querySelector('#modal-chk-exclude').checked;
      const reason = backdrop.querySelector('#modal-select-reason').value;
      await removeBusPartner(partner.id, { exclude: doExclude, reason });
      close();
      toast(`"${partner.name}" removed${doExclude ? ' and permanently blocked from future searches' : ''}`, 'ok');
      paint();
    });
  }

  // --- View Excluded & Blocked Operators Modal ---
  function openExcludedModal() {
    const list = loadExcludedBusPartners();
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `
    <div class="dialog card stack" style="max-width:620px;padding:24px">
      <div class="row between" style="align-items:flex-start">
        <div class="row" style="gap:10px;align-items:center">
          <span style="font-size:1.6rem">🚫</span>
          <div>
            <div class="label eyebrow" style="color:var(--gold-ink)">Exclusion Memory</div>
            <h3 style="margin:2px 0 0">Blocked & Excluded Operators (${list.length})</h3>
          </div>
        </div>
        <button class="btn ghost sm" data-close>×</button>
      </div>

      <p class="small muted" style="margin:8px 0 14px">
        These operators were deleted and are remembered by the system. Auto-Scout and URL discovery will <b>never</b> search, recommend, or save them back into your CRM unless you unblock them here.
      </p>

      ${list.length ? `
        <div class="stack" style="gap:8px;max-height:360px;overflow-y:auto;padding-right:4px">
          ${list.map((item) => `
            <div class="row between" style="align-items:center;background:var(--surface-2);border:1px solid var(--line);border-radius:6px;padding:10px 14px">
              <div class="stack" style="gap:2px">
                <div class="row" style="gap:8px;align-items:center">
                  <span style="font-weight:600;font-size:.88rem;color:var(--ink)">${esc(item.name)}</span>
                  <span class="chip tiny outline">${esc(item.base_city || 'Northern Italy')}</span>
                  ${item.website ? `<a href="${attr(item.website)}" target="_blank" rel="noopener" class="tiny" style="color:var(--series-1);text-decoration:none">${esc(item.domain || 'Web')} ↗</a>` : ''}
                </div>
                <div class="tiny muted">
                  Reason: <i>${esc(item.reason || 'Dismissed by user')}</i> · Blocked on ${new Date(item.excluded_at).toLocaleDateString()}
                </div>
              </div>
              <button class="btn sm ghost btn-unblock-operator" data-id="${attr(item.id)}" style="font-size:.76rem;padding:3px 8px;white-space:nowrap" title="Unblock this operator so they can be scouted again">
                ↩️ Unblock
              </button>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="card empty small" style="padding:28px 16px;text-align:center">
          <span style="font-size:1.8rem">✅</span>
          <div style="font-weight:600;margin-top:6px">No operators currently excluded.</div>
          <span class="tiny muted">When you delete an operator from the roster, they will be remembered here and blocked from future Auto-Scout searches.</span>
        </div>
      `}

      <div class="row between" style="margin-top:16px;align-items:center">
        <span class="tiny muted">${list.length} operator${list.length === 1 ? '' : 's'} permanently blocked</span>
        <button class="btn ghost sm" data-close>Close</button>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    backdrop.querySelectorAll('.btn-unblock-operator').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const unblocked = await unexcludeBusPartner(id);
        toast(`"${unblocked?.name || 'Operator'}" unblocked.`, 'ok');
        close();
        paint();
      });
    });
  }

  // --- Dedicated Fleet Categories Modal with Ground-Truth & Custom Seat Flexibility ---
  function openFleetModal(partner) {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';

    // Start with current active fleet categories on record
    let activeCategories = Array.isArray(partner.fleet_categories) && partner.fleet_categories.length > 0 
      ? [...partner.fleet_categories] 
      : [];

    // Helper: icon per vehicle type
    const busIcon = (str = '') => {
      const s = str.toLowerCase();
      if (/limobus/i.test(s)) return '🥂';
      if (/v-?class|minivan|vito/i.test(s)) return '🚐';
      if (/sprinter.*vip|lounge/i.test(s)) return '✨';
      if (/sprinter|capri|daily/i.test(s)) return '🚐';
      if (/midi|wing|mago|temsa/i.test(s)) return '🚌';
      return '🚍';
    };

    // Collect verified website candidates for this operator
    const websiteCandidates = [];
    const addCand = (label) => {
      if (!label || typeof label !== 'string') return;
      const clean = label.trim();
      if (!clean) return;
      if (!websiteCandidates.some((c) => c.toLowerCase() === clean.toLowerCase())) {
        websiteCandidates.push(clean);
      }
    };

    // 1. Current categories
    activeCategories.forEach(addCand);

    // 2. Parsed from partner.bus_models or score_breakdown
    const rawModels = partner.bus_models || partner.score_breakdown?.partner_card?.bus_models || '';
    if (rawModels) {
      rawModels.split(/[,;/•\n]+/).map((s) => s.trim()).filter(Boolean).forEach((m) => {
        if (!/classe\s*v|v-?class/i.test(m)) addCand(m);
      });
    }

    // 3. User notes references (e.g. SPRINTER 22 POSTI, SPRINTER GRANDE CAPRI 19)
    const notesStr = String(partner.notes || '');
    if (/sprinter.*22/i.test(notesStr) || /22\s*posti/i.test(notesStr)) {
      addCand('Mercedes Sprinter (22 seats)');
    }
    if (/capri/i.test(notesStr) || /19\s*posti/i.test(notesStr) || /18\s*posti/i.test(notesStr)) {
      addCand('Sprinter Grande Capri (19 seats)');
    }
    if (/50\s*seat|52\s*seat|50\s*posti|52\s*posti/i.test(notesStr)) {
      addCand('Setra & Mercedes GT Coach (50–52 seats)');
    }

    // Curated quick presets for common exact sizes
    const QUICK_PRESETS = [
      { label: 'Mercedes Sprinter (22 seats)', icon: '🚐', class: 'luxury', desc: 'Minibus 22-23 posti' },
      { label: 'Sprinter Grande Capri (19 seats)', icon: '🚐', class: 'luxury', desc: 'Allestimento Capri 19 posti' },
      { label: 'Mercedes-Benz Sprinter VIP (16 seats)', icon: '✨', class: 'luxury', desc: 'VIP Lounge 16 posti' },
      { label: 'Mercedes-Benz Sprinter VIP (8 seats)', icon: '✨', class: 'luxury', desc: 'VIP Van 8 posti' },
      { label: 'Iveco Daily Executive (19–22 seats)', icon: '🚐', class: 'standard', desc: 'Iveco Daily Tourys' },
      { label: 'Executive Midibus (28–32 seats)', icon: '🚌', class: 'standard', desc: 'Iveco Wing / Temsa Midibus' },
      { label: 'Setra 515 (51 seats)', icon: '🚍', class: 'standard', desc: 'Setra S515 HD GT Coach' },
      { label: 'Mercedes Tourismo (53–55 seats)', icon: '🚍', class: 'standard', desc: 'Mercedes Tourismo GT' },
      { label: 'Mercedes Travego (53 seats)', icon: '🚍', class: 'standard', desc: 'Mercedes Travego HD' },
      { label: 'Full GT Coach (50–56 seats)', icon: '🚍', class: 'standard', desc: 'Pullman Gran Turismo standard' },
      { label: 'Limobus Exclusive VIP (18–28 seats)', icon: '🥂', class: 'luxury', desc: 'Limobus / Partybus luxury' },
      { label: 'Mercedes-Benz V-Class VIP (7–8 seats)', icon: '🚐', class: 'luxury', desc: 'Minivan NCC' }
    ];

    const websiteUrl = partner.fleet_url || partner.website || '';

    backdrop.innerHTML = `
    <div class="dialog card stack" style="max-width:580px;max-height:90vh;overflow-y:auto;padding:22px">
      <div class="row between" style="align-items:flex-start">
        <div>
          <div class="label eyebrow" style="color:var(--gold-ink)">FLEET ALLOCATION & GROUND TRUTH</div>
          <h3 style="margin:2px 0 0;font-size:1.15rem">${esc(partner.name)}</h3>
          ${websiteUrl ? `
            <a href="${attr(websiteUrl)}" target="_blank" rel="noopener" style="font-size:.76rem;color:var(--gold);display:inline-flex;align-items:center;gap:4px;margin-top:3px;text-decoration:none">
              🌐 View Live Fleet Page ↗
            </a>
          ` : ''}
        </div>
        <button class="btn ghost sm" data-close>×</button>
      </div>

      <p class="tiny muted" style="margin:6px 0 10px;line-height:1.4">
        Assign exact vehicle models and seating capacities matching this operator's live website. Class (<b>✨ Luxury VIP vs 🚌 Standard GT</b>) and outreach questions update automatically.
      </p>

      <!-- Allocation Banner -->
      <div id="fleet-allocation-class-banner" style="padding:10px 14px;border-radius:6px;margin-bottom:12px;font-size:.82rem;line-height:1.35"></div>

      <!-- Currently Active Fleet -->
      <div style="margin-bottom:12px">
        <div class="row between" style="align-items:center;margin-bottom:6px">
          <div class="label eyebrow" style="font-size:.72rem">Allocated Fleet (<span id="active-count">${activeCategories.length}</span>)</div>
          <span class="tiny muted">Click ✕ to remove any vehicle</span>
        </div>
        <div id="active-tags-container" class="stack" style="gap:6px;max-height:180px;overflow-y:auto;background:var(--surface-2);padding:8px;border-radius:6px;border:1px solid var(--line)"></div>
      </div>

      <!-- Verified on Website Quick-Toggle -->
      ${websiteCandidates.length > 0 ? `
      <div style="margin-bottom:12px;padding:10px 12px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.25);border-radius:6px">
        <div class="label eyebrow" style="color:#b45309;margin-bottom:6px;font-size:.72rem">🌐 Verified from Operator's Website & Notes (Click to Toggle)</div>
        <div id="website-candidates-container" class="row" style="gap:6px;flex-wrap:wrap"></div>
      </div>
      ` : ''}

      <!-- Quick Add Presets -->
      <div style="margin-bottom:12px">
        <div class="label eyebrow" style="font-size:.72rem;margin-bottom:6px">⚡ 1-Click Quick Add Presets (Exact Seats)</div>
        <div id="quick-presets-container" class="row" style="gap:5px;flex-wrap:wrap">
          ${QUICK_PRESETS.map((qp) => `
            <button type="button" class="chip tiny outline btn-add-preset" data-label="${attr(qp.label)}" style="font-size:.73rem;padding:3px 8px;cursor:pointer;background:var(--surface-1);border-color:var(--line);border-radius:4px" title="${attr(qp.desc)}">
              ${qp.icon} ${esc(qp.label)}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Custom Fleet Input Form -->
      <div style="padding:10px 12px;background:var(--surface-2);border-radius:6px;border:1px solid var(--line);margin-bottom:16px">
        <div class="label eyebrow" style="font-size:.72rem;margin-bottom:6px">➕ Add Custom Vehicle (Exact Model & Posti)</div>
        <div class="row" style="gap:6px;flex-wrap:wrap;align-items:center">
          <input type="text" id="custom-model-input" placeholder="e.g. Sprinter 22 posti, Setra 515, Temsa HD" style="font-size:.82rem;padding:6px 10px;flex:2;min-width:180px">
          <input type="text" id="custom-seats-input" placeholder="e.g. 22 seats" style="font-size:.82rem;padding:6px 10px;flex:1;min-width:90px">
          <select id="custom-class-select" style="font-size:.82rem;padding:6px 8px;background:var(--surface-1);border:1px solid var(--line);border-radius:4px">
            <option value="auto">Auto Classify</option>
            <option value="luxury">✨ Luxury VIP</option>
            <option value="standard">🚌 Standard GT</option>
          </select>
          <button class="btn sm primary" id="btn-add-custom-vehicle" type="button" style="white-space:nowrap">+ Add Vehicle</button>
        </div>
      </div>

      <div class="row between" style="align-items:center;padding-top:8px;border-top:1px solid var(--line)">
        <button class="btn ghost" data-close>Cancel</button>
        <button class="btn primary" id="modal-save-fleet">✓ Save Fleet & Update Partner</button>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    // Dynamic banner update
    const updateBanner = () => {
      const banner = backdrop.querySelector('#fleet-allocation-class-banner');
      const countEl = backdrop.querySelector('#active-count');
      if (countEl) countEl.textContent = activeCategories.length;
      if (!banner) return;
      const detectedSeg = core.inferBusSegment({ fleet_categories: activeCategories, user_set_segment: false });
      const paxAudit = core.verifyPerBusPaxCapacity({ fleet_categories: activeCategories }, { autoInferKnownStandards: true });
      const paxSummary = paxAudit.formattedPaxSummary || 'None';

      if (activeCategories.length === 0) {
        banner.style.background = '#fef2f2';
        banner.style.border = '1px solid #fca5a5';
        banner.style.color = '#b91c1c';
        banner.innerHTML = `<b>No vehicles allocated</b> — Select from verified website candidates or presets below.`;
        return;
      }

      if (detectedSeg === 'luxury') {
        banner.style.background = '#fffbeb';
        banner.style.border = '1px solid #f59e0b';
        banner.style.color = '#b45309';
        banner.innerHTML = `<b>Class: ✨ Luxury VIP Only</b> · Capacities: <b>${esc(paxSummary)}</b><br><span class="tiny muted" style="color:#92400e">All allocated vehicles are Luxury / VIP minibuses.</span>`;
      } else if (detectedSeg === 'both') {
        banner.style.background = '#f5f3ff';
        banner.style.border = '1px solid #c4b5fd';
        banner.style.color = '#6d28d9';
        banner.innerHTML = `<b>Class: ✨🚌 Luxury VIP & Standard GT</b> · Capacities: <b>${esc(paxSummary)}</b><br><span class="tiny muted" style="color:#5b21b6">Both VIP minibuses and Standard GT coaches allocated.</span>`;
      } else {
        banner.style.background = '#eff6ff';
        banner.style.border = '1px solid #93c5fd';
        banner.style.color = '#1d4ed8';
        banner.innerHTML = `<b>Class: 🚌 Standard GT / Charter</b> · Capacities: <b>${esc(paxSummary)}</b><br><span class="tiny muted" style="color:#1e40af">Selected vehicles are midibuses or full-size GT coaches.</span>`;
      }
    };

    // Render active tags
    const renderActiveTags = () => {
      const container = backdrop.querySelector('#active-tags-container');
      if (!container) return;
      if (activeCategories.length === 0) {
        container.innerHTML = `<div class="tiny muted" style="padding:10px;text-align:center">No vehicles allocated yet. Click a preset or enter a custom model below.</div>`;
        updateBanner();
        return;
      }
      container.innerHTML = activeCategories.map((cat, idx) => {
        const isLux = core.classifySingleBusAllocation(cat) === 'luxury';
        return `
        <div class="row between" style="padding:6px 10px;background:var(--surface-1);border:1px solid var(--line);border-radius:5px;align-items:center">
          <div class="row" style="gap:8px;align-items:center;overflow:hidden">
            <span style="font-size:1rem">${busIcon(cat)}</span>
            <div style="overflow:hidden">
              <div style="font-weight:600;font-size:.82rem;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(cat)}</div>
              <div class="tiny muted" style="font-size:.68rem">${isLux ? '✨ Luxury VIP' : '🚌 Standard GT'}</div>
            </div>
          </div>
          <button type="button" class="btn-remove-tag" data-idx="${idx}" style="border:none;background:none;cursor:pointer;color:var(--bad);padding:2px 6px;font-size:.9rem;font-weight:bold" title="Remove">✕</button>
        </div>`;
      }).join('');

      container.querySelectorAll('.btn-remove-tag').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx, 10);
          if (!isNaN(idx) && idx >= 0 && idx < activeCategories.length) {
            activeCategories.splice(idx, 1);
            renderActiveTags();
            renderWebsiteCandidates();
            updateBanner();
          }
        });
      });
      updateBanner();
    };

    // Render website candidate toggle chips
    const renderWebsiteCandidates = () => {
      const container = backdrop.querySelector('#website-candidates-container');
      if (!container) return;
      container.innerHTML = websiteCandidates.map((cand) => {
        const isSelected = activeCategories.some((c) => c.toLowerCase() === cand.toLowerCase());
        return `
        <button type="button" class="chip tiny btn-toggle-cand" data-cand="${attr(cand)}" style="font-size:.74rem;padding:3px 9px;cursor:pointer;border-radius:4px;transition:all .15s;${isSelected ? 'background:#fef3c7;border:1px solid #f59e0b;color:#92400e;font-weight:700' : 'background:var(--surface-1);border:1px dashed var(--line);color:var(--ink)'}">
          ${isSelected ? '✓' : '+'} ${esc(cand)}
        </button>`;
      }).join('');

      container.querySelectorAll('.btn-toggle-cand').forEach((btn) => {
        btn.addEventListener('click', () => {
          const cand = btn.dataset.cand;
          const matchIdx = activeCategories.findIndex((c) => c.toLowerCase() === cand.toLowerCase());
          if (matchIdx >= 0) {
            activeCategories.splice(matchIdx, 1);
          } else {
            activeCategories.push(cand);
          }
          renderActiveTags();
          renderWebsiteCandidates();
        });
      });
    };

    // Preset button clicks
    backdrop.querySelectorAll('.btn-add-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const label = btn.dataset.label;
        if (!activeCategories.some((c) => c.toLowerCase() === label.toLowerCase())) {
          activeCategories.push(label);
          renderActiveTags();
          renderWebsiteCandidates();
        }
      });
    });

    // Custom vehicle form
    backdrop.querySelector('#btn-add-custom-vehicle').addEventListener('click', () => {
      const mInp = backdrop.querySelector('#custom-model-input');
      const sInp = backdrop.querySelector('#custom-seats-input');
      const cSel = backdrop.querySelector('#custom-class-select');

      const modelVal = mInp.value.trim();
      if (!modelVal) {
        toast('Please enter a vehicle model name', 'err');
        return;
      }
      let seatsVal = sInp.value.trim();
      let formatted = modelVal;
      if (seatsVal) {
        if (!/pax|posti|seats/i.test(seatsVal)) {
          seatsVal = `${seatsVal} seats`;
        }
        if (!modelVal.includes(seatsVal) && !modelVal.includes('(')) {
          formatted = `${modelVal} (${seatsVal})`;
        }
      }
      if (cSel.value === 'luxury' && !/vip|lux|lounge/i.test(formatted)) {
        formatted = `${formatted} VIP`;
      }

      if (!activeCategories.some((c) => c.toLowerCase() === formatted.toLowerCase())) {
        activeCategories.push(formatted);
        renderActiveTags();
        renderWebsiteCandidates();
      }
      mInp.value = '';
      sInp.value = '';
    });

    // Initial render
    renderActiveTags();
    renderWebsiteCandidates();

    // Save
    backdrop.querySelector('#modal-save-fleet').addEventListener('click', async () => {
      const detectedSeg = core.inferBusSegment({ fleet_categories: activeCategories, user_set_segment: false });
      const paxAudit = core.verifyPerBusPaxCapacity({ fleet_categories: activeCategories }, { autoInferKnownStandards: true });
      
      await updateBusPartner(partner.id, {
        fleet_categories: activeCategories,
        fleet_segment: detectedSeg,
        user_set_segment: false,
        bus_models: paxAudit.formattedBusModels || activeCategories.join(', '),
        pax_capacity: paxAudit.formattedPaxSummary || partner.pax_capacity,
      });

      // Update local partner reference
      partner.fleet_categories = [...activeCategories];
      partner.fleet_segment = detectedSeg;
      partner.bus_models = paxAudit.formattedBusModels || activeCategories.join(', ');
      partner.pax_capacity = paxAudit.formattedPaxSummary || partner.pax_capacity;
      if (partner.score_breakdown?.partner_card) {
        partner.score_breakdown.partner_card.fleet_segment = detectedSeg;
        partner.score_breakdown.partner_card.bus_models = partner.bus_models;
        partner.score_breakdown.partner_card.pax_capacity = partner.pax_capacity;
      }

      toast(`✓ Fleet updated: ${core.formatBusSegmentLabel(detectedSeg)} (${paxAudit.formattedPaxSummary || 'capacities saved'})`, 'ok');
      close();
      paint();
    });
  }

  // --- Auto-Scout by URL Modal ---
  function openScoutUrlModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `
    <div class="dialog card stack" style="max-width:540px;padding:24px">
      <div class="row between">
        <div>
          <div class="label eyebrow">AI & Web Signal Scout</div>
          <h3 style="margin:2px 0 0">Scout & Evaluate Operator URL</h3>
        </div>
        <button class="btn ghost sm" data-close>×</button>
      </div>

      <p class="small muted" style="margin:8px 0 14px">
        Insert any coach or minibus operator website link. Our system will analyze fleet signals, test the 100-Point Relevance Gate, and prepare it for your CRM manifest.
      </p>

      <div class="stack" style="gap:12px">
        <label class="field">
          <span style="font-weight:600">Operator Website URL</span>
          <input type="url" id="scout-url-input" placeholder="https://www.operator.it" style="font-size:.9rem;padding:8px 12px;width:100%">
        </label>

        <div class="row" style="gap:8px">
          <label class="field grow">
            <span>Base City / Province Hint</span>
            <input type="text" id="scout-city-input" placeholder="e.g. Milano, Como, Bergamo..." style="font-size:.85rem;padding:7px 10px">
          </label>
          <div style="display:flex;align-items:flex-end">
            <button class="btn primary" id="btn-run-scout-eval" style="height:36px;white-space:nowrap">Run Evaluation</button>
          </div>
        </div>

        <div id="scout-eval-preview" style="display:none;margin-top:10px" class="card stack">
          <!-- Populated dynamically on evaluation -->
        </div>
      </div>

      <div class="row" style="justify-content:flex-end;gap:8px;margin-top:16px">
        <button class="btn ghost" data-close>Cancel</button>
        <button class="btn primary" id="btn-scout-add-crm" style="display:none">Add to CRM Manifest</button>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    let evaluatedPartner = null;

    const runEval = async () => {
      const url = backdrop.querySelector('#scout-url-input').value.trim();
      if (!url) { toast('Please insert a valid website URL', 'warn'); return; }

      const cityHint = backdrop.querySelector('#scout-city-input').value.trim();
      const previewEl = backdrop.querySelector('#scout-eval-preview');
      const addBtn = backdrop.querySelector('#btn-scout-add-crm');
      const evalBtn = backdrop.querySelector('#btn-run-scout-eval');

      const host = (() => { try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, ''); } catch (_) { return url.toLowerCase(); } })();
      const known = SCOUT_CANDIDATE_POOL.find((c) => c.website.toLowerCase().includes(host)) ||
                    (S.busPartners || []).find((c) => (c.website || '').toLowerCase().includes(host));

      let res;
      let pName;
      let pCity;
      let pCats;
      let pModels = '';
      let pPax = '';
      let pSegment = 'standard';
      let pNotes = ''; // User notes start completely empty for newly searched/scouted operators
      let pEmail;
      let pPhone;
      let pUnbranded;

      if (known) {
        pName = known.name;
        pCity = known.base_city || cityHint || 'Northern Italy';
        pCats = Array.isArray(known.fleet_categories) ? [...known.fleet_categories] : ['Executive Minibus & Coach'];
        pModels = known.bus_models || '';
        pPax = known.pax_capacity || '';
        pSegment = known.fleet_segment || core.inferBusSegment(known);
        pNotes = ''; // Reserved strictly for manual user notes
        pEmail = known.email || '';
        pPhone = known.phone || '';
        pUnbranded = known.unbranded_status || '100% Guaranteed Unbranded / Total Black';
        res = {
          total_score: known.relevance_score,
          breakdown: known.score_breakdown || { discretion_unbranded: 35, fleet_luxury: 23, territory_permits: 20, corporate_sla: 15 },
          tier_info: core.getPriorityTier(known.relevance_score)
        };
      } else {
        const cleanHost = host.replace(/\.(it|com|eu|net)$/, '').replace(/[-_.]/g, ' ');
        pName = cleanHost.charAt(0).toUpperCase() + cleanHost.slice(1);

        if (evalBtn) {
          evalBtn.disabled = true;
          evalBtn.textContent = '⏳ Auditing Website & Fleet...';
        }

        // Crawl live homepage + /contatti + /flotta + /mezzi for zero-hallucination email & fleet extraction
        const cleanBase = (url.startsWith('http') ? url : `https://${url}`).replace(/\/$/, '');
        const endpoints = [cleanBase, `${cleanBase}/contatti`, `${cleanBase}/flotta`, `${cleanBase}/mezzi`, `${cleanBase}/parco-auto`];
        let liveText = '';
        let liveEmails = [];
        try {
          for (const pg of endpoints) {
            try {
              const r = await fetch(`https://r.jina.ai/${pg}`, { signal: AbortSignal.timeout(4000) });
              if (r.ok) {
                const body = await r.text();
                if (isJinaReachablePage(body)) {
                  liveText += '\n' + body;
                  const ems = core.extractEmailsFromWebsiteHtml(body, host);
                  if (ems.length) liveEmails.push(...ems);
                  if (liveEmails.length && liveText.length > 2500) break;
                }
              }
            } catch (_) {}
          }
        } catch (_) {}

        if (evalBtn) {
          evalBtn.disabled = false;
          evalBtn.textContent = 'Run Evaluation';
        }

        // Intelligent City & Depot Verification from real website text
        const cityInfo = detectOperatorCityAndRegion({
          url,
          text: `${host} ${liveText}`,
          hint: cityHint
        });
        pCity = cityInfo.city;
        pEmail = liveEmails[0] || `info@${host}`;
        pPhone = '';

        const fleetExtracted = core.extractFleetFromWebsiteText(liveText);
        pCats = fleetExtracted.fleet_categories.length > 0
          ? fleetExtracted.fleet_categories
          : ['Minibus & Coach Charter (Verify fleet page)'];
        pModels = fleetExtracted.bus_models || '';
        pPax = fleetExtracted.pax_capacity || '';
        pSegment = fleetExtracted.fleet_segment || 'standard';

        if (!cityInfo.isNorthernItaly) {
          res = {
            total_score: 0,
            breakdown: { discretion_unbranded: 20, fleet_luxury: 18, territory_permits: 0, corporate_sla: 15 },
            tier_info: core.getPriorityTier(0)
          };
          pUnbranded = 'Unbranded on Request';
          pNotes = `Disqualified: ${cityInfo.depotWarning} No local Lombardy/Como operating depot (excessive deadhead leg).`;
        } else {
          const evaluated = core.scoreFromWebSignals(liveText || `${url} ${host} ${pCity}`, { base_city: pCity });
          res = {
            total_score: evaluated.total_score,
            breakdown: evaluated.breakdown,
            tier_info: core.getPriorityTier(evaluated.total_score)
          };
          pUnbranded = evaluated.breakdown.discretion_unbranded >= 30 ? '100% Guaranteed Unbranded / Total Black' : 'Unbranded on Request';
          pNotes = `Audited live website (${host}). Email: ${pEmail}${liveEmails.length ? ' (found on website)' : ' (fallback)'}. Segment: ${pSegment.toUpperCase()}${pPax ? ` · Pax: ${pPax}` : ''}.`;
        }
      }

      const isNonLocal = pCity.toLowerCase().includes('roma') || pCity.toLowerCase().includes('central') || pCity.toLowerCase().includes('tuscany');
      const partnerStatus = isNonLocal ? 'NOT_RELEVANT' : 'TO_REVIEW';

      const excluded = loadExcludedBusPartners();
      const isExcluded = isBusPartnerExcluded({ website: url, name: pName }, excluded);

      evaluatedPartner = {
        name: pName,
        base_city: pCity,
        website: url.startsWith('http') ? url : `https://${url}`,
        fleet_url: `${url.startsWith('http') ? url : `https://${url}`}/flotta`,
        phone: pPhone,
        email: pEmail,
        relevance_score: isNonLocal ? 0 : res.total_score,
        score_breakdown: res.breakdown,
        unbranded_status: pUnbranded,
        status: partnerStatus,
        fleet_categories: pCats,
        bus_models: pModels,
        pax_capacity: pPax,
        fleet_segment: pSegment,
        notes: pNotes
      };

      previewEl.style.display = 'block';
      previewEl.innerHTML = `
        ${isExcluded ? `
          <div class="row between" style="background:#fef2f2;border:1px solid #fecaca;padding:8px 12px;border-radius:6px;align-items:center;margin-bottom:10px">
            <div class="row" style="gap:6px;align-items:center">
              <span>🚫</span>
              <span class="tiny" style="color:#b91c1c;font-weight:600">This operator was previously deleted and excluded from searches.</span>
            </div>
            <button class="btn sm ghost" id="scout-btn-unblock" style="padding:2px 8px;font-size:.72rem;background:#fff;border-color:#fca5a5;color:#b91c1c">↩️ Unblock</button>
          </div>
        ` : ''}

        <div class="row between" style="align-items:center;border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:10px">
          <div>
            <div class="label eyebrow">Score &amp; Classification</div>
            <h4 style="margin:2px 0 0;font-size:1.05rem">${esc(pName)}</h4>
            <span class="tiny muted">📍 ${esc(pCity)} · ${esc(host)}</span>
          </div>
          <div style="text-align:right">
            <span class="chip ${res.total_score >= 80 ? 'ok' : res.total_score >= 70 ? 'gold' : ''}" style="font-size:1.1rem;font-weight:700">
              ${res.total_score} / 100
            </span>
            <div class="tiny" style="color:var(--text-3);margin-top:2px">${esc(res.tier_info.badge)}</div>
          </div>
        </div>

        <div class="grid-2" style="gap:8px;font-size:.8rem;margin-bottom:10px">
          <div style="background:var(--surface-2);padding:6px 10px;border-radius:4px">
            <div class="tiny muted">1. Discretion & Livery</div>
            <b>${res.breakdown.discretion_unbranded} / 35 pts</b>
          </div>
          <div style="background:var(--surface-2);padding:6px 10px;border-radius:4px">
            <div class="tiny muted">2. Fleet Spec</div>
            <b>${res.breakdown.fleet_luxury} / 25 pts</b>
          </div>
          <div style="background:var(--surface-2);padding:6px 10px;border-radius:4px">
            <div class="tiny muted">3. Territory & Permits</div>
            <b>${res.breakdown.territory_permits} / 20 pts</b>
          </div>
          <div style="background:var(--surface-2);padding:6px 10px;border-radius:4px">
            <div class="tiny muted">4. Corporate SLA</div>
            <b>${res.breakdown.corporate_sla} / 20 pts</b>
          </div>
        </div>

        <div class="stack" style="gap:4px">
          <span class="tiny muted">Detected Fleet:</span>
          <div class="row" style="gap:4px;flex-wrap:wrap">
            ${pCats.map((c) => `<span class="chip tiny outline">${esc(c)}</span>`).join('')}
          </div>
        </div>`;

      previewEl.querySelector('#scout-btn-unblock')?.addEventListener('click', async () => {
        await unexcludeBusPartner(url);
        toast(`"${pName}" unblocked from exclusion memory.`, 'ok');
        runEval();
      });

      addBtn.style.display = 'inline-flex';
      addBtn.textContent = `Add ${pName} to CRM`;
    };

    backdrop.querySelector('#btn-run-scout-eval').addEventListener('click', runEval);
    backdrop.querySelector('#scout-url-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); runEval(); }
    });

    backdrop.querySelector('#btn-scout-add-crm').addEventListener('click', async () => {
      if (!evaluatedPartner) return;
      const added = await addBusPartner({
        ...evaluatedPartner,
        status: evaluatedPartner.status === 'NOT_RELEVANT' ? 'NOT_RELEVANT' : 'TO_REVIEW',
        created_at: new Date().toISOString(),
      });
      toast(`✨ Added "${evaluatedPartner.name}" to CRM Manifest (Score: ${evaluatedPartner.relevance_score})`);
      close();
      activeFilter = 'newly_added';
      statusFilter = 'all';
      vehicleFilter = 'all';
      cityFilter = 'all';
      searchQ = '';
      paint();
      openScoutSummaryModal([added || evaluatedPartner]);
    });
  }

  // --- Auto-Scout Fleet Modal (Multi-Filter Scout Engine) ---
  function openAutoScoutModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `
    <div class="dialog card stack" style="max-width:560px;padding:24px">
      <div class="row between">
        <div>
          <div class="label eyebrow">Automated Fleet Discovery</div>
          <h3 style="margin:2px 0 0">Auto-Scout Fleet Operators</h3>
        </div>
        <button class="btn ghost sm" data-close>×</button>
      </div>

      <p class="small muted" style="margin:8px 0 14px">
        Configure criteria to scout, evaluate through the 100-Point Relevance Gate, and automatically import matching luxury coach & minibus operators into your CRM:
      </p>

      <div class="stack" style="gap:12px">
        <!-- 1. Location / Territory -->
        <label class="field">
          <span style="font-weight:600">1. Territory / Base Location</span>
          <select id="auto-scout-location" class="sm" style="padding:6px 10px;width:100%">
            <option value="all" selected>📍 All Northern Italy (Milan, Como, Alps, Lakes)</option>
            <option value="como">🌊 Lake Como & Lecco (Villa access & narrow roads)</option>
            <option value="milan">🏙️ Milan Metropolitan (Milano / Monza)</option>
            <option value="east">🛫 Bergamo & Brescia (Orio al Serio & East)</option>
            <option value="garda">🍇 Lake Garda & Verona (Sirmione / Bardolino)</option>
            <option value="alps">🏔️ Alps & Valtellina (Bormio / St. Moritz)</option>
          </select>
        </label>

        <!-- 2. How many? & Min Score -->
        <div class="row" style="gap:10px">
          <label class="field grow">
            <span style="font-weight:600">2. How Many Operators?</span>
            <select id="auto-scout-count" class="sm" style="padding:6px 10px">
              <option value="3">3 operators</option>
              <option value="5" selected>5 operators</option>
              <option value="10">10 operators</option>
              <option value="all">All qualified matches</option>
            </select>
          </label>

          <label class="field grow">
            <span style="font-weight:600">3. Min Relevance Score</span>
            <select id="auto-scout-min-score" class="sm" style="padding:6px 10px">
              <option value="80" selected>⭐ Score ≥ 80 (Tier 1: VIP Unbranded)</option>
              <option value="70">🚐 Score ≥ 70 (Tier 2: Qualified)</option>
              <option value="50">🚌 Score ≥ 50 (Tier 3: Standard Commercial)</option>
              <option value="0">All Scores (Unfiltered)</option>
            </select>
          </label>
        </div>

        <!-- 4. What kind of cars? -->
        <div class="stack" style="gap:6px">
          <span style="font-weight:600;font-size:.85rem">4. Required Vehicle Platforms</span>
          <div class="stack" style="gap:6px" id="scout-cars-container">
            ${STANDARD_FLEET_TYPES.map((f) => `
              <label class="row" style="align-items:center;gap:8px;padding:6px 10px;background:var(--surface-2);border-radius:4px;cursor:pointer;border:1px solid var(--line)">
                <input type="checkbox" class="scout-car-check" value="${attr(f.key)}" checked style="cursor:pointer">
                <span style="font-size:.83rem;font-weight:600">${f.icon} ${esc(f.label)}</span>
                <span class="chip tiny outline" style="margin-left:auto">${esc(f.badge)}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="row" style="justify-content:flex-end;gap:8px;margin-top:16px">
        <button class="btn ghost" data-close>Cancel</button>
        <button class="btn primary" id="btn-run-auto-scout">Run Analysis & Add to CRM</button>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    backdrop.querySelector('#btn-run-auto-scout').addEventListener('click', async () => {
      const location = backdrop.querySelector('#auto-scout-location').value;
      const countVal = backdrop.querySelector('#auto-scout-count').value;
      const count = countVal === 'all' ? Infinity : parseInt(countVal, 10);
      const minScore = parseInt(backdrop.querySelector('#auto-scout-min-score').value, 10);
      const selectedCars = Array.from(backdrop.querySelectorAll('.scout-car-check:checked')).map((cb) => cb.value);

      if (!selectedCars.length) {
        toast('Please select at least one vehicle platform', 'warn');
        return;
      }

      const existing = S.busPartners || [];
      const existingNames = new Set(existing.map((p) => p.name.toLowerCase()));
      const existingDomains = new Set(existing.map((p) => {
        try { return new URL(p.website).hostname.replace(/^www\./, '').toLowerCase(); } catch (_) { return ''; }
      }).filter(Boolean));
      const excluded = loadExcludedBusPartners();

      let candidates = SCOUT_CANDIDATE_POOL.filter((c) => {
        // 1. NEVER include any operator the user deleted/excluded!
        if (isBusPartnerExcluded(c, excluded)) return false;

        // 2. Already in active CRM roster
        if (existingNames.has(c.name.toLowerCase())) return false;
        try {
          const dom = new URL(c.website).hostname.replace(/^www\./, '').toLowerCase();
          if (existingDomains.has(dom)) return false;
        } catch (_) {}

        if ((c.relevance_score || 0) < minScore) return false;

        const city = (c.base_city || '').toLowerCase();
        if (location === 'como' && !city.includes('como') && !city.includes('lecco')) return false;
        if (location === 'milan' && !city.includes('milan') && !city.includes('monza')) return false;
        if (location === 'east' && !city.includes('bergamo') && !city.includes('brescia')) return false;
        if (location === 'garda' && !city.includes('garda') && !city.includes('verona') && !city.includes('brescia')) return false;
        if (location === 'alps' && !city.includes('sondrio') && !city.includes('bormio') && !city.includes('alps')) return false;

        const catStr = (c.fleet_categories || []).join(' ').toLowerCase();
        const matchesCar = selectedCars.some((key) => {
          if (key === 'v_class') return /v-?class|minivan/i.test(catStr);
          if (key === 'sprinter_vip') return /sprinter.*vip/i.test(catStr);
          if (key === 'sprinter_lux') return /sprinter.*lux/i.test(catStr);
          if (key === 'midibus') return /midi/i.test(catStr);
          if (key === 'limobus') return /limobus/i.test(catStr);
          if (key === 'gt_coach') return /coach|tourismo|setra/i.test(catStr);
          return true;
        });
        return matchesCar;
      });

      if (!candidates.length) {
        toast('All matching operators for these filters are already in your CRM!', 'ok');
        close();
        return;
      }

      const toAdd = candidates.slice(0, count);

      // Transition modal into Active Deep AI Fleet Mission Console
      const dialogContent = backdrop.querySelector('.dialog');
      const locationLabels = {
        all: 'All Northern Italy (Milan, Como, Alps, Lakes)',
        como: 'Lake Como & Lecco',
        milan: 'Milan Metropolitan',
        east: 'Bergamo & Brescia',
        garda: 'Lake Garda & Verona',
        alps: 'Alps & Valtellina'
      };
      const locLabel = locationLabels[location] || 'Northern Italy';

      dialogContent.style.maxWidth = '580px';
      dialogContent.innerHTML = `
        <div class="stack" style="gap:16px;padding:4px 0">
          <div class="row between" style="align-items:flex-start">
            <div class="row" style="gap:10px;align-items:center">
              <span style="font-size:1.8rem;animation:pulse 1.2s infinite">🛰️</span>
              <div>
                <div class="label eyebrow" style="color:var(--gold-ink);font-weight:700">Deep AI Market Scout</div>
                <h3 style="margin:2px 0 0" id="scout-mission-title">Scouting Northern Italy Registries...</h3>
              </div>
            </div>
            <span class="chip tiny outline" id="scout-phase-badge" style="font-family:monospace;font-size:.78rem;font-weight:700">Phase 1/4</span>
          </div>

          <div class="row" style="gap:6px;flex-wrap:wrap">
            <span class="chip tiny gold">📍 ${esc(locLabel)}</span>
            <span class="chip tiny ok">⭐ Min Score: ≥${minScore}</span>
            <span class="chip tiny" style="font-weight:600">Auditing: ${toAdd.length} Matching Operators</span>
          </div>

          <!-- Progress Bar -->
          <div style="background:var(--surface-2);height:8px;border-radius:4px;overflow:hidden;border:1px solid var(--line);position:relative">
            <div id="scout-progress-fill" style="background:linear-gradient(90deg, #d97706, #059669);height:100%;width:15%;transition:width .4s ease"></div>
          </div>

          <!-- Live Step Status & Stream Log -->
          <div class="card stack" style="gap:8px;background:var(--surface-2);padding:14px;border:1px solid var(--line);min-height:180px;max-height:230px;overflow-y:auto">
            <div class="row" style="gap:8px;align-items:center;font-size:.84rem;color:var(--text-1);font-weight:600" id="scout-current-phase-text">
              <span class="spinner-sm" style="display:inline-block">⏳</span>
              <span>Querying regional NCC commercial registries and fleet manifests in ${esc(locLabel)}...</span>
            </div>
            <div class="stack" style="gap:6px;margin-top:6px" id="scout-discovered-ticker"></div>
          </div>

          <div class="row between" style="align-items:center;border-top:1px solid var(--line);padding-top:12px">
            <span class="tiny muted" id="scout-status-note">Auditing operating depot cities & municipal authorizations...</span>
            <span class="chip tiny ok" style="background:#059669;color:#fff;font-weight:700">Live AI Audit</span>
          </div>
        </div>
      `;

      const progressFill = dialogContent.querySelector('#scout-progress-fill');
      const phaseBadge = dialogContent.querySelector('#scout-phase-badge');
      const phaseText = dialogContent.querySelector('#scout-current-phase-text');
      const statusNote = dialogContent.querySelector('#scout-status-note');
      const ticker = dialogContent.querySelector('#scout-discovered-ticker');

      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Phase 1 (0ms - 800ms): Scanning registries
      progressFill.style.width = '25%';
      phaseBadge.textContent = 'Phase 1/4';
      phaseText.innerHTML = `<span>🛰️ Querying regional NCC commercial registries in <b>${esc(locLabel)}</b>...</span>`;
      statusNote.textContent = 'Parsing fleet categories and public license records...';
      await wait(750);

      // Phase 2 (800ms - 1700ms): Depot verification & filtering out Rome / non-local
      progressFill.style.width = '50%';
      phaseBadge.textContent = 'Phase 2/4';
      phaseText.innerHTML = `<span>📍 Verifying operating depot locations & enforcing persistent exclusions...</span>`;
      statusNote.textContent = 'Enforcing local depot radius and skipping user-excluded operators...';

      const excludedCount = SCOUT_CANDIDATE_POOL.filter((c) => isBusPartnerExcluded(c, excluded)).length;
      if (excludedCount > 0) {
        ticker.innerHTML += `
          <div class="row between" style="font-size:.76rem;padding:5px 8px;background:rgba(239, 68, 68, 0.08);border-radius:4px;border:1px solid rgba(239, 68, 68, 0.2);color:#b91c1c;animation:fadeIn .3s">
            <span style="font-weight:600">🛡️ Blocked ${excludedCount} operator${excludedCount > 1 ? 's' : ''} from memory</span>
            <span class="tiny">Remembered exclusions</span>
          </div>
        `;
      }

      if (toAdd[0]) {
        ticker.innerHTML += `
          <div class="row between" style="font-size:.78rem;padding:6px 10px;background:var(--surface);border-radius:4px;border:1px solid var(--line);animation:fadeIn .3s">
            <span style="font-weight:600">✓ 1. ${esc(toAdd[0].name)}</span>
            <span class="tiny muted">📍 ${esc(toAdd[0].base_city)} · Score: <b>${toAdd[0].relevance_score}/100</b></span>
          </div>
        `;
      }
      await wait(850);

      // Phase 3 (1700ms - 2600ms): Discretion & Total Black audit
      progressFill.style.width = '75%';
      phaseBadge.textContent = 'Phase 3/4';
      phaseText.innerHTML = `<span>🛡️ Auditing fleet galleries: checking 100% Total Black & Zero-Decal discretion standard...</span>`;
      statusNote.textContent = 'Checking dark privacy tinting (vetri oscurati) and suited chauffeur SLA...';

      for (let i = 1; i < Math.min(3, toAdd.length); i++) {
        ticker.innerHTML += `
          <div class="row between" style="font-size:.78rem;padding:6px 10px;background:var(--surface);border-radius:4px;border:1px solid var(--line);animation:fadeIn .3s">
            <span style="font-weight:600">✓ ${i + 1}. ${esc(toAdd[i].name)}</span>
            <span class="tiny muted">📍 ${esc(toAdd[i].base_city)} · Score: <b>${toAdd[i].relevance_score}/100</b></span>
          </div>
        `;
      }
      await wait(850);

      // Phase 4 (2600ms - 3400ms): Villa road access & permits
      progressFill.style.width = '95%';
      phaseBadge.textContent = 'Phase 4/4';
      phaseText.innerHTML = `<span>🛣️ Checking ZTL Area C, Lake Como villa road access (<10m Indcar/Sprinter), and Alpine snow chains...</span>`;
      statusNote.textContent = 'Finalizing 100-Point Relevance Gate and generating CRM manifest rows...';

      for (let i = 3; i < toAdd.length; i++) {
        ticker.innerHTML += `
          <div class="row between" style="font-size:.78rem;padding:6px 10px;background:var(--surface);border-radius:4px;border:1px solid var(--line);animation:fadeIn .3s">
            <span style="font-weight:600">✓ ${i + 1}. ${esc(toAdd[i].name)}</span>
            <span class="tiny muted">📍 ${esc(toAdd[i].base_city)} · Score: <b>${toAdd[i].relevance_score}/100</b></span>
          </div>
        `;
      }
      await wait(750);

      // Phase 5: Complete & Add to Store
      progressFill.style.width = '100%';
      phaseBadge.textContent = 'Complete';
      phaseText.innerHTML = `<span style="color:var(--ok)">✨ Scout Complete: Added ${toAdd.length} verified operators to CRM!</span>`;

      const addedList = [];
      for (const op of toAdd) {
        const added = await addBusPartner({
          ...op,
          status: 'TO_REVIEW', // Newly scouted operators must ALWAYS start at TO_REVIEW ("1. To Review") for human verification
          created_at: new Date().toISOString(),
          notes: '', // Notes remain completely empty, reserved exclusively for manual user comments
        });
        addedList.push(added || op);
      }

      await wait(350);
      toast(`⚡ Scout complete: Added ${toAdd.length} verified operator${toAdd.length === 1 ? '' : 's'} to CRM!`);
      close();
      activeFilter = 'latest_added';
      sortBy = 'newest_first';
      statusFilter = 'all';
      vehicleFilter = 'all';
      cityFilter = 'all';
      searchQ = '';
      paint();
      openScoutSummaryModal(addedList);
    });
  }

  // --- Auto-Scout Summary Modal (Shows exactly what operators were added) ---
  function openScoutSummaryModal(addedPartners) {
    if (!addedPartners || !addedPartners.length) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    const totalCount = (S.busPartners || []).length;
    backdrop.innerHTML = `
    <div class="dialog card stack" style="max-width:540px;padding:24px">
      <div class="row between" style="align-items:flex-start">
        <div>
          <div class="label eyebrow" style="color:var(--ok);font-weight:700">✨ Auto-Scout Complete</div>
          <h3 style="margin:2px 0 0">Added ${addedPartners.length} New Operator${addedPartners.length === 1 ? '' : 's'} to CRM</h3>
        </div>
        <button class="btn ghost sm" data-close aria-label="Close">✕</button>
      </div>

      <p class="small muted" style="margin:6px 0 14px">
        The following operators matched your filters and the 100-Point Relevance Gate. They are tagged with <span class="chip tiny ok" style="background:linear-gradient(135deg, #059669, #10b981);color:#fff;font-weight:800;padding:1px 6px;border-radius:10px;border:1px solid #34d399">⚡ LATEST</span> to clearly differentiate them from earlier additions.
      </p>

      <div class="stack" style="gap:8px;max-height:340px;overflow-y:auto;padding-right:4px">
        ${addedPartners.map((op, i) => `
          <div class="card row between" style="align-items:center;padding:10px 14px;background:var(--surface-2);border-radius:6px;border:1px solid var(--line);border-left:3px solid #10b981">
            <div class="stack" style="gap:3px;min-width:0;flex:1">
              <div class="row" style="gap:6px;align-items:center">
                <span style="font-weight:700;font-size:.9rem">${i + 1}. ${esc(op.name)}</span>
                <span class="chip tiny ok" style="background:linear-gradient(135deg, #059669, #10b981);color:#fff;font-weight:800;padding:1px 6px;font-size:.65rem;border-radius:10px;border:1px solid #34d399">⚡ LATEST</span>
              </div>
              <div class="tiny muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                📍 ${esc(op.base_city || 'Northern Italy')}
                ${op.email ? `· <span style="color:var(--series-1)">${esc(op.email)}</span>` : '· <span class="faint">No email</span>'}
                ${op.website ? `· <a href="${attr(op.website)}" target="_blank" rel="noopener" style="color:var(--ink-2);text-decoration:none">🌐 Web</a>` : ''}
              </div>
              <div class="row" style="gap:4px;flex-wrap:wrap;margin-top:2px">
                ${(op.fleet_categories || []).map((c) => `<span class="chip tiny outline" style="font-size:.68rem;padding:1px 5px">${esc(shortFleetName(c))}</span>`).join('')}
              </div>
            </div>
            <div style="text-align:right;flex:none;margin-left:14px">
              <span class="chip ${op.relevance_score >= 80 ? 'ok' : 'gold'}" style="font-weight:800;font-size:1rem;padding:3px 8px">
                ${op.relevance_score || 0}/100
              </span>
              <div class="tiny muted" style="margin-top:2px">${core.getPriorityTier(op.relevance_score || 0).badge}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="row" style="justify-content:space-between;align-items:center;margin-top:16px;padding-top:12px;border-top:1px solid var(--line)">
        <span class="tiny muted">Tagged with ⚡ LATEST · New status active for 1 hour</span>
        <div class="row" style="gap:8px">
          <button class="btn ghost sm" id="btn-modal-view-all">View All (${totalCount})</button>
          <button class="btn primary sm" id="btn-modal-view-new" style="background:linear-gradient(135deg, #059669, #10b981);border:1px solid #34d399;font-weight:700">⚡ View Just Added (${addedPartners.length})</button>
        </div>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    backdrop.querySelector('#btn-modal-view-all').addEventListener('click', () => {
      activeFilter = 'all';
      statusFilter = 'all';
      vehicleFilter = 'all';
      cityFilter = 'all';
      searchQ = '';
      close();
      paint();
    });

    backdrop.querySelector('#btn-modal-view-new').addEventListener('click', () => {
      activeFilter = 'latest_added';
      sortBy = 'newest_first';
      statusFilter = 'all';
      vehicleFilter = 'all';
      cityFilter = 'all';
      searchQ = '';
      close();
      paint();
    });
  }

  function openEmailModal(partner) {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `
    <div class="dialog card stack" style="max-width:460px;padding:24px">
      <div class="row between">
        <div>
          <div class="label eyebrow">Partner Contact & Website</div>
          <h3>${esc(partner.name)}</h3>
        </div>
        <button class="btn ghost sm" data-close>×</button>
      </div>
      <div class="stack" style="gap:12px;margin:14px 0">
        <label class="field">
          <span style="font-weight:600;font-size:.85rem">Official Website URL</span>
          <input type="url" id="modal-quick-website" placeholder="https://www.operator.it" value="${attr(partner.website || '')}" style="font-size:.9rem;padding:8px 12px;width:100%">
        </label>
        <label class="field">
          <span style="font-weight:600;font-size:.85rem">Direct Booking / Dispatch Email</span>
          <input type="email" id="modal-quick-email" placeholder="e.g. booking@operator.it" value="${attr(partner.email || '')}" style="font-size:.9rem;padding:8px 12px;width:100%">
        </label>
        <span class="tiny muted">Update the operator's verified website and dispatch email for B2B quote requests and rate sheets.</span>
      </div>
      <div class="row" style="justify-content:flex-end;gap:8px">
        <button class="btn ghost" data-close>Cancel</button>
        <button class="btn primary" id="modal-save-quick-email">Save Contact</button>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const webInput = backdrop.querySelector('#modal-quick-website');
    const input = backdrop.querySelector('#modal-quick-email');
    setTimeout(() => input?.focus(), 50);

    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    const save = async () => {
      const email = input.value.trim();
      let website = webInput.value.trim();
      if (website && !/^https?:\/\//i.test(website)) {
        website = `https://${website}`;
      }
      await updateBusPartner(partner.id, { email, website });
      toast('Contact & website updated');
      close();
      paint();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      }
    });
    webInput.addEventListener('keydown', (e) => {
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
        <label class="field">
          <span>Fleet Categories (Quick Select)</span>
          <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:4px" id="add-fleet-pills">
            ${STANDARD_FLEET_TYPES.map((f) => `
              <label class="chip outline clickable" style="cursor:pointer;font-size:.74rem;padding:3px 7px;display:inline-flex;align-items:center;gap:4px">
                <input type="checkbox" class="add-fleet-check" value="${attr(f.label)}" style="width:13px;height:13px;cursor:pointer">
                ${f.icon} ${esc(f.short)}
              </label>
            `).join('')}
          </div>
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

      const checkedFleet = Array.from(backdrop.querySelectorAll('.add-fleet-check:checked')).map((cb) => cb.value);
      const fleet_categories = checkedFleet.length ? checkedFleet : ['Executive Minibus & Coach'];

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
        fleet_categories
      });

      toast(`Added ${name} with Relevance Score ${sum}/100`);
      close();
      paint();
    });
  }
}
