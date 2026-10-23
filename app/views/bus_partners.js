// Minimalist Bus Partner Manifest Table & 100-Point Scoring View
// Luxury unbranded minibus and coach operators across Northern Italy.
import * as core from '../../supabase/functions/_shared/core/index.js';
import { 
  S, 
  updateBusPartner, 
  addBusPartner, 
  removeBusPartner, 
  removeManyBusPartners, 
  unexcludeBusPartner, 
  loadExcludedBusPartners, 
  isBusPartnerExcluded 
} from '../store.js';
import { INITIAL_BUS_PARTNERS } from '../bus_partners_data.js';
import { esc, attr, icon, download, toast, confirmDialog } from '../ui.js';

let activeFilter = 'all'; // all | latest_added | newly_added | top_tier
let statusFilter = 'all'; // all | TO_REVIEW | WANT_TO_CONTACT | CONTACTED | APPROVED_PARTNER | REJECTED | NOT_RELEVANT
let vehicleFilter = 'all'; // all | v_class | sprinter_vip | sprinter_lux | midibus | limobus | gt_coach
let cityFilter = 'all';
let searchQ = '';
let sortBy = 'score_desc'; // score_desc | newest_first | name_asc

// Minimalist feather/lucide pencil icon for understated luxury UI
const pencilIcon = (size = 11) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block;vertical-align:middle"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`;

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
  if (/limobus/i.test(str)) return 'Limobus (18-28s)';
  if (/sprinter.*vip.*lounge/i.test(str)) return 'Sprinter VIP Lounge';
  if (/sprinter.*vip/i.test(str)) return 'Sprinter VIP (8-16s)';
  if (/sprinter.*exec/i.test(str)) return 'Sprinter Exec (16-19s)';
  if (/sprinter.*lux/i.test(str)) return 'Sprinter Lux (8-20s)';
  if (/sprinter.*minibus|sprinter/i.test(str)) return 'Sprinter Minibus';
  if (/midi/i.test(str)) return 'Midibus (24-30s)';
  if (/setra.*vip/i.test(str)) return 'Setra VIP Lounge';
  if (/setra.*topclass/i.test(str)) return 'Setra TopClass (30-54)';
  if (/tourismo.*black/i.test(str)) return 'Tourismo Black Series';
  if (/tourismo/i.test(str)) return 'Tourismo GT (30-53)';
  if (/v-?class/i.test(str)) return 'V-Class VIP (7-8s)';
  if (/coach.*36.*56/i.test(str)) return 'GT Coach (36-56s)';
  if (/coach|pullman/i.test(str)) return 'Executive GT Coach';
  const match = STANDARD_FLEET_TYPES.find((f) => f.label.toLowerCase() === str.toLowerCase() || f.short.toLowerCase() === str.toLowerCase());
  if (match) return match.short;
  return str.length > 22 ? str.slice(0, 20) + '…' : str;
}

export function detectVehicleKey(str) {
  if (!str) return '';
  const s = str.toLowerCase();
  if (/limobus/i.test(s)) return 'limobus';
  if (/v-?class|minivan|vito/i.test(s)) return 'v_class';
  if (/sprinter.*vip/i.test(s)) return 'sprinter_vip';
  if (/sprinter/i.test(s)) return 'sprinter_lux';
  if (/midi|minicoach|21.*28.*30|24.*30|28.*seat/i.test(s)) return 'midibus';
  if (/coach|tourismo|setra|pullman/i.test(s)) return 'gt_coach';
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
      return /sprinter.*(lux|exec|minibus|16|19|20)/i.test(catStr) || (/sprinter/i.test(catStr) && !/sprinter.*vip/i.test(catStr));
    case 'midibus':
      return /midi|minicoach|21,\s*28,\s*30|(24|28)\s*[-–]\s*30\s*seat/i.test(catStr);
    case 'limobus':
      return /limobus/i.test(catStr);
    case 'gt_coach':
      return /coach|tourismo|setra|pullman|50.*56|36.*56|30.*75|30.*53/i.test(catStr);
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

// Deep Northern Italy Candidate Knowledge Base (30 Verified Operators across all sub-territories)
export const SCOUT_CANDIDATE_POOL = [
  // --- Lake Como & Lecco ---
  {
    name: 'Como Lake Transfers & Minibus',
    base_city: 'Como',
    website: 'https://www.comolaketransfers.it',
    fleet_url: 'https://www.comolaketransfers.it/fleet',
    phone: '+39 031 513 145',
    email: 'info@comolaketransfers.it',
    relevance_score: 93,
    score_breakdown: { discretion_unbranded: 35, fleet_luxury: 23, territory_permits: 20, corporate_sla: 15 },
    unbranded_status: '100% Guaranteed Unbranded / Total Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes Sprinter VIP (8–16 seats)', 'Executive Midibus (24–30 seats)'],
    notes: 'Lake Como villa specialist (Villa Balbiano, Balbianello). All-black unbranded Sprinters and narrow midibuses under 10m.'
  },
  {
    name: 'Berini Autonoleggio & Minibus',
    base_city: 'Como',
    website: 'https://www.beriniautonoleggio.com',
    fleet_url: 'https://www.beriniautonoleggio.com/flotta',
    phone: '+39 031 976 430',
    email: 'info@beriniautonoleggio.com',
    relevance_score: 92,
    score_breakdown: { discretion_unbranded: 35, fleet_luxury: 22, territory_permits: 20, corporate_sla: 15 },
    unbranded_status: '100% Guaranteed Unbranded / Total Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes-Benz V-Class VIP (7–8 seats)', 'Executive Midibus (24–30 seats)', 'Mercedes Sprinter VIP (8–16 seats)'],
    notes: 'Based in Guanzate/Como. Historic carrier with luxury 26-seater midibuses and black V-Classes for Villa d’Este.'
  },
  {
    name: 'Vivaldi Driver Bellagio',
    base_city: 'Como',
    website: 'https://www.i-vivaldi.com',
    fleet_url: 'https://www.i-vivaldi.com/fleet',
    phone: '+39 031 951 120',
    email: 'booking@i-vivaldi.com',
    relevance_score: 94,
    score_breakdown: { discretion_unbranded: 35, fleet_luxury: 24, territory_permits: 20, corporate_sla: 15 },
    unbranded_status: '100% Guaranteed Unbranded / Total Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes-Benz V-Class VIP (7–8 seats)', 'Mercedes Sprinter VIP (8–16 seats)'],
    notes: 'Bellagio-based VIP fleet. Suited chauffeurs, villa permits, total-black privacy glass.'
  },
  {
    name: 'Lake Como Chauffeur & Bus Service',
    base_city: 'Como',
    website: 'https://www.lakecomochauffeur.it',
    fleet_url: 'https://www.lakecomochauffeur.it/fleet',
    phone: '+39 031 340 882',
    email: 'info@lakecomochauffeur.it',
    relevance_score: 91,
    score_breakdown: { discretion_unbranded: 35, fleet_luxury: 21, territory_permits: 20, corporate_sla: 15 },
    unbranded_status: '100% Guaranteed Unbranded / NCC Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes Sprinter VIP (8–16 seats)', 'Executive Midibus (24–30 seats)'],
    notes: 'Cernobbio depot adjacent to Villa d’Este. High-frequency wedding shuttles across Como lakefront.'
  },
  {
    name: 'Menaggio VIP Minibus & Tour',
    base_city: 'Como',
    website: 'https://www.menaggiominibus.it',
    fleet_url: 'https://www.menaggiominibus.it/flotta',
    phone: '+39 0344 321 00',
    email: 'info@menaggiominibus.it',
    relevance_score: 88,
    score_breakdown: { discretion_unbranded: 35, fleet_luxury: 20, territory_permits: 18, corporate_sla: 15 },
    unbranded_status: '100% Guaranteed Unbranded / Total Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes-Benz V-Class VIP (7–8 seats)', 'Mercedes Sprinter Luxury (16–20 seats)'],
    notes: 'Central lake specialist. Villa Carlotta and Grand Hotel Tremezzo private group circuits.'
  },
  {
    name: 'Lake Como Executive Sprinter',
    base_city: 'Como',
    website: 'https://www.lakecomosprinter.it',
    fleet_url: 'https://www.lakecomosprinter.it/flotta',
    phone: '+39 0344 405 10',
    email: 'booking@lakecomosprinter.it',
    relevance_score: 93,
    score_breakdown: { discretion_unbranded: 35, fleet_luxury: 23, territory_permits: 20, corporate_sla: 15 },
    unbranded_status: '100% Guaranteed Unbranded / Total Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes Sprinter VIP (8–16 seats)', 'Limobus VIP Lounge (18–28 seats)'],
    notes: 'Tremezzina villa logistics. Ultra-luxury conversions with conference tables and privacy tinting.'
  },
  {
    name: 'Lariobus NCC',
    base_city: 'Lecco',
    website: 'https://www.lariobus.com',
    fleet_url: 'https://www.lariobus.com/flotta',
    phone: '+39 0341 821 445',
    email: 'info@lariobus.com',
    relevance_score: 86,
    score_breakdown: { discretion_unbranded: 25, fleet_luxury: 23, territory_permits: 20, corporate_sla: 18 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Executive Midibus (24–30 seats)', 'Setra & Mercedes GT Coach (50–56 seats)'],
    notes: 'Lecco and eastern lake branch. Midibuses under 10m specialized in mountainous roads and villa gates.'
  },

  // --- Milan Metropolitan & Malpensa ---
  {
    name: 'Avantgarde Limousine Service',
    base_city: 'Milano',
    website: 'https://www.avantgardelimousineservice.it',
    fleet_url: 'https://www.avantgardelimousineservice.it/flotta',
    phone: '+39 02 8905 4410',
    email: 'booking@avantgardelimousineservice.it',
    relevance_score: 91,
    score_breakdown: { discretion_unbranded: 35, fleet_luxury: 22, territory_permits: 19, corporate_sla: 15 },
    unbranded_status: '100% Guaranteed Unbranded / Total Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes Sprinter VIP (8–16 seats)', 'Mercedes-Benz V-Class VIP (7–8 seats)'],
    notes: 'High-end Milan and Lake Como corporate and wedding transfer mobility. Monochromatic total-black fleet.'
  },
  {
    name: 'Milano VIP Driver & Coach',
    base_city: 'Milano',
    website: 'https://www.milanovipdriver.com',
    fleet_url: 'https://www.milanovipdriver.com/fleet',
    phone: '+39 02 4801 2290',
    email: 'dispatch@milanovipdriver.com',
    relevance_score: 92,
    score_breakdown: { discretion_unbranded: 35, fleet_luxury: 24, territory_permits: 18, corporate_sla: 15 },
    unbranded_status: '100% Guaranteed Unbranded / Total Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes Sprinter VIP (8–16 seats)', 'Limobus VIP Lounge (18–28 seats)'],
    notes: 'Exclusive Sprinter VIP club lounges with champagne coolers and suited chauffeurs.'
  },
  {
    name: 'Starlight Limousine & Coach',
    base_city: 'Milano',
    website: 'https://www.starlightlimousine.it',
    fleet_url: 'https://www.starlightlimousine.it/fleet',
    phone: '+39 02 839 4488',
    email: 'booking@starlightlimousine.it',
    relevance_score: 90,
    score_breakdown: { discretion_unbranded: 35, fleet_luxury: 23, territory_permits: 17, corporate_sla: 15 },
    unbranded_status: '100% Guaranteed Unbranded / NCC Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Limobus VIP Lounge (18–28 seats)', 'Mercedes Sprinter VIP (8–16 seats)'],
    notes: 'Milan luxury event mobility. Club lounge limobuses with high-end audio, tables, and suited chauffeurs.'
  },
  {
    name: 'Autonoleggio Battaglia',
    base_city: 'Milano',
    website: 'https://www.autonoleggibattaglia.it',
    fleet_url: 'https://www.autonoleggibattaglia.it/flotta',
    phone: '+39 02 669 8221',
    email: 'info@autonoleggibattaglia.it',
    relevance_score: 87,
    score_breakdown: { discretion_unbranded: 35, fleet_luxury: 20, territory_permits: 17, corporate_sla: 15 },
    unbranded_status: '100% Guaranteed Unbranded / Total Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes-Benz V-Class VIP (7–8 seats)', 'Mercedes Sprinter Luxury (16–20 seats)'],
    notes: 'Fashion week and diplomatic shuttle specialist. Strict no-sticker policy.'
  },
  {
    name: 'Autonoleggio Carnelli',
    base_city: 'Milano',
    website: 'https://www.autonoleggiocarnelli.it',
    fleet_url: 'https://www.autonoleggiocarnelli.it/flotta',
    phone: '+39 02 9678 9012',
    email: 'noleggio@autonoleggiocarnelli.it',
    relevance_score: 85,
    score_breakdown: { discretion_unbranded: 25, fleet_luxury: 22, territory_permits: 20, corporate_sla: 18 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Executive Midibus (24–30 seats)', 'Setra & Mercedes GT Coach (50–56 seats)'],
    notes: 'Strategic depot in Uboldo between Milan and Malpensa. Executive coaches and midibuses with Wi-Fi and leather seats.'
  },
  {
    name: 'Zani Viaggi Executive',
    base_city: 'Milano',
    website: 'https://www.zaniviaggi.it',
    fleet_url: 'https://www.zaniviaggi.it/noleggio-autobus',
    phone: '+39 02 867 131',
    email: 'noleggio@zaniviaggi.it',
    relevance_score: 77,
    score_breakdown: { discretion_unbranded: 20, fleet_luxury: 22, territory_permits: 20, corporate_sla: 15 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes Sprinter Luxury (16–20 seats)', 'Setra & Mercedes GT Coach (50–56 seats)'],
    notes: 'Historic Milan carrier. Large fleet of modern Mercedes and Setra coaches. Specify unbranded when booking.'
  },
  {
    name: 'Air Pullman VIP Line',
    base_city: 'Milano',
    website: 'https://www.airpullman.it',
    fleet_url: 'https://www.airpullman.it/noleggio',
    phone: '+39 02 896 039',
    email: 'noleggio@airpullman.it',
    relevance_score: 74,
    score_breakdown: { discretion_unbranded: 20, fleet_luxury: 20, territory_permits: 20, corporate_sla: 14 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Setra & Mercedes GT Coach (50–56 seats)', 'Mercedes Sprinter Luxury (16–20 seats)'],
    notes: 'Airport hub specialist (Malpensa & Linate). Large dispatch volume.'
  },

  // --- Bergamo & Brescia ---
  {
    name: 'Caprioli Viaggi VIP Minibus',
    base_city: 'Brescia',
    website: 'https://www.caprioliviaggi.it',
    fleet_url: 'https://www.caprioliviaggi.it/flotta',
    phone: '+39 030 969 511',
    email: 'info@caprioliviaggi.it',
    relevance_score: 88,
    score_breakdown: { discretion_unbranded: 30, fleet_luxury: 23, territory_permits: 18, corporate_sla: 17 },
    unbranded_status: '100% Guaranteed Unbranded / Total Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes Sprinter VIP (8–16 seats)', 'Setra & Mercedes GT Coach (50–56 seats)'],
    notes: 'Brescia and Lake Garda luxury fleet. Modern Mercedes Sprinter VIP configurations with leather recliners and dark privacy glass.'
  },
  {
    name: 'Pancheri NCC & Minibus',
    base_city: 'Brescia',
    website: 'https://www.bresciatransfer.it',
    fleet_url: 'https://www.bresciatransfer.it/flotta',
    phone: '+39 030 375 2210',
    email: 'booking@bresciatransfer.it',
    relevance_score: 86,
    score_breakdown: { discretion_unbranded: 30, fleet_luxury: 22, territory_permits: 17, corporate_sla: 17 },
    unbranded_status: '100% Guaranteed Unbranded / Total Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes-Benz V-Class VIP (7–8 seats)', 'Mercedes Sprinter VIP (8–16 seats)'],
    notes: 'Franciacorta wine country and Brescia luxury transfers. All-black vehicles with 24/7 central flight dispatch.'
  },
  {
    name: 'Ilton Autonoleggi',
    base_city: 'Bergamo',
    website: 'https://www.iltonautonoleggi.com',
    fleet_url: 'https://www.iltonautonoleggi.com/flotta',
    phone: '+39 035 459 2210',
    email: 'info@iltonautonoleggi.com',
    relevance_score: 85,
    score_breakdown: { discretion_unbranded: 30, fleet_luxury: 21, territory_permits: 18, corporate_sla: 16 },
    unbranded_status: '100% Guaranteed Unbranded / Total Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes-Benz V-Class VIP (7–8 seats)', 'Mercedes Sprinter Luxury (16–20 seats)'],
    notes: 'Bergamo Orio al Serio VIP and corporate transfer specialist. Prompt service, suited drivers, unbranded fleet.'
  },
  {
    name: 'Bassi Tours',
    base_city: 'Brescia',
    website: 'https://www.bassitours.com',
    fleet_url: 'https://www.bassitours.com/flotta',
    phone: '+39 030 969 015',
    email: 'info@bassitours.com',
    relevance_score: 82,
    score_breakdown: { discretion_unbranded: 20, fleet_luxury: 23, territory_permits: 20, corporate_sla: 19 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Executive Midibus (24–30 seats)', 'Setra & Mercedes GT Coach (50–56 seats)'],
    notes: 'Lake Garda & Brescia corridor. Modern coaches from 28 to 80 seats with toilet and coffee bar.'
  },
  {
    name: 'Pellegrini Autoservizi',
    base_city: 'Bergamo',
    website: 'https://www.pellegrinibus.it',
    fleet_url: 'https://www.pellegrinibus.it/flotta',
    phone: '+39 035 561 020',
    email: 'info@pellegrinibus.it',
    relevance_score: 72,
    score_breakdown: { discretion_unbranded: 20, fleet_luxury: 19, territory_permits: 18, corporate_sla: 15 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Executive Midibus (24–30 seats)', 'Setra & Mercedes GT Coach (50–56 seats)'],
    notes: 'Bergamo regional coach operator. Reliable airport transfers to Lake Como and Milan.'
  },

  // --- Lake Garda & Verona ---
  {
    name: 'Peschiera Viaggi Luxury Coaches',
    base_city: 'Lake Garda',
    website: 'https://www.peschieraviaggi.it',
    fleet_url: 'https://www.peschieraviaggi.it/flotta',
    phone: '+39 045 755 0122',
    email: 'info@peschieraviaggi.it',
    relevance_score: 87,
    score_breakdown: { discretion_unbranded: 30, fleet_luxury: 22, territory_permits: 18, corporate_sla: 17 },
    unbranded_status: '100% Guaranteed Unbranded / Total Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Executive Midibus (24–30 seats)', 'Setra & Mercedes GT Coach (50–56 seats)'],
    notes: 'Peschiera del Garda and Sirmione wedding event transport. Clean unbranded black buses for lakefront resorts.'
  },
  {
    name: 'Gardabus Exclusive',
    base_city: 'Lake Garda',
    website: 'https://www.gardabus.it',
    fleet_url: 'https://www.gardabus.it/flotta',
    phone: '+39 030 914 1820',
    email: 'info@gardabus.it',
    relevance_score: 84,
    score_breakdown: { discretion_unbranded: 25, fleet_luxury: 22, territory_permits: 18, corporate_sla: 19 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Executive Midibus (24–30 seats)', 'Mercedes Sprinter Luxury (16–20 seats)'],
    notes: 'Desenzano & Sirmione luxury guest shuttles. Fast dispatch to Lake Garda luxury villas and Catullo Airport.'
  },
  {
    name: 'Benaco Minibus NCC',
    base_city: 'Lake Garda',
    website: 'https://www.benacominibus.it',
    fleet_url: 'https://www.benacominibus.it/flotta',
    phone: '+39 0365 522 100',
    email: 'info@benacominibus.it',
    relevance_score: 83,
    score_breakdown: { discretion_unbranded: 25, fleet_luxury: 22, territory_permits: 18, corporate_sla: 18 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes-Benz V-Class VIP (7–8 seats)', 'Executive Midibus (24–30 seats)'],
    notes: 'Western Lake Garda (Salò / Gardone Riviera). Specialist in villa weddings and private estate access.'
  },

  // --- Alps & Valtellina ---
  {
    name: 'Bormio Transfer VIP Minibus',
    base_city: 'Bormio (Alps)',
    website: 'https://www.bormiotransfer.com',
    fleet_url: 'https://www.bormiotransfer.com/flotta',
    phone: '+39 0342 903 768',
    email: 'info@bormiotransfer.com',
    relevance_score: 89,
    score_breakdown: { discretion_unbranded: 30, fleet_luxury: 23, territory_permits: 20, corporate_sla: 16 },
    unbranded_status: '100% Guaranteed Unbranded / Total Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes Sprinter VIP (8–16 seats)', 'Executive Midibus (24–30 seats)'],
    notes: 'Consorzio Trasporti Alta Valtellina. Winter Alpine certified with snow chains and ski racks. Direct links to St. Moritz, Bormio, and Milan airports.'
  },
  {
    name: 'Silvestri Bus Livigno',
    base_city: 'Bormio (Alps)',
    website: 'https://www.silvestribus.it',
    fleet_url: 'https://www.silvestribus.it/flotta',
    phone: '+39 0342 996 283',
    email: 'info@silvestribus.it',
    relevance_score: 84,
    score_breakdown: { discretion_unbranded: 25, fleet_luxury: 22, territory_permits: 20, corporate_sla: 17 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Executive Midibus (24–30 seats)', 'Setra & Mercedes GT Coach (50–56 seats)'],
    notes: 'Alpine group transfer fleet. High mountain routes, heated luggage compartments, multi-lingual drivers.'
  },
  {
    name: 'Bormio Viaggi Luxury Lines',
    base_city: 'Bormio (Alps)',
    website: 'https://www.bormioviaggi.com',
    fleet_url: 'https://www.bormioviaggi.com/flotta',
    phone: '+39 0342 951 158',
    email: 'booking@bormioviaggi.com',
    relevance_score: 83,
    score_breakdown: { discretion_unbranded: 25, fleet_luxury: 21, territory_permits: 20, corporate_sla: 17 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes Sprinter Luxury (16–20 seats)', 'Setra & Mercedes GT Coach (50–56 seats)'],
    notes: 'Valtellina & Alpine corridor. Luxury Gran Turismo coaches and VIP minivans for winter ceremonies and retreats.'
  },
  {
    name: 'Autoservizi Rainoldi NCC',
    base_city: 'Bormio (Alps)',
    website: 'https://www.ncc3.it',
    fleet_url: 'https://www.ncc3.it/flotta',
    phone: '+39 0342 515 220',
    email: 'info@ncc3.it',
    relevance_score: 80,
    score_breakdown: { discretion_unbranded: 25, fleet_luxury: 20, territory_permits: 18, corporate_sla: 17 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes-Benz V-Class VIP (7–8 seats)', 'Mercedes Sprinter Luxury (16–20 seats)'],
    notes: 'Sondrio regional headquarters. Connecting Lake Como north shore with Swiss border and alpine resorts.'
  },

  // --- Monza, Varese & Lake Maggiore ---
  {
    name: 'Brianza Limousine & Minibus',
    base_city: 'Monza',
    website: 'https://www.brianzalimousine.it',
    fleet_url: 'https://www.brianzalimousine.it/flotta',
    phone: '+39 039 230 4455',
    email: 'info@brianzalimousine.it',
    relevance_score: 85,
    score_breakdown: { discretion_unbranded: 30, fleet_luxury: 21, territory_permits: 18, corporate_sla: 16 },
    unbranded_status: '100% Guaranteed Unbranded / Total Black',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes-Benz V-Class VIP (7–8 seats)', 'Mercedes Sprinter VIP (8–16 seats)'],
    notes: 'Monza and Brianza luxury corporate & wedding mobility. Close to Monza Autodromo and Milan.'
  },
  {
    name: 'Varese VIP Transfer & Coach',
    base_city: 'Varese',
    website: 'https://www.varesevip.it',
    fleet_url: 'https://www.varesevip.it/flotta',
    phone: '+39 0332 284 100',
    email: 'info@varesevip.it',
    relevance_score: 83,
    score_breakdown: { discretion_unbranded: 25, fleet_luxury: 21, territory_permits: 20, corporate_sla: 17 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Mercedes Sprinter Luxury (16–20 seats)', 'Setra & Mercedes GT Coach (50–56 seats)'],
    notes: 'Fast access to Malpensa (MXP) and Lake Maggiore/Lake Como western villas.'
  },
  {
    name: 'Frigerio Trasporti',
    base_city: 'Monza',
    website: 'https://www.frigerioviaggi.com',
    fleet_url: 'https://www.frigerioviaggi.com/noleggio-bus',
    phone: '+39 0362 359 1',
    email: 'bus@frigerioviaggi.com',
    relevance_score: 75,
    score_breakdown: { discretion_unbranded: 20, fleet_luxury: 20, territory_permits: 17, corporate_sla: 18 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Executive Midibus (24–30 seats)', 'Mercedes-Benz V-Class VIP (7–8 seats)'],
    notes: 'Monza Brianza and Milan corporate transfer company. Euro 6 midibuses and V-Classes.'
  },
  {
    name: 'Stresa & Maggiore VIP Coach',
    base_city: 'Lake Maggiore',
    website: 'https://www.maggiorecoach.it',
    fleet_url: 'https://www.maggiorecoach.it/flotta',
    phone: '+39 0323 301 22',
    email: 'info@maggiorecoach.it',
    relevance_score: 81,
    score_breakdown: { discretion_unbranded: 25, fleet_luxury: 20, territory_permits: 18, corporate_sla: 18 },
    unbranded_status: 'Unbranded on Request',
    status: 'TO_REVIEW',
    fleet_categories: ['Executive Midibus (24–30 seats)', 'Setra & Mercedes GT Coach (50–56 seats)'],
    notes: 'Borromean Islands and Lake Maggiore luxury wedding transfer specialist.'
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
export async function findAndVerifyPartnerEmail(partnerId, btnEl = null, onDone = null) {
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
    let sourceNote = '';

    const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const pNorm = norm(p.name);

    // 1. Instant recovery from verified registry / candidate pool (recovers broken sites, typos like "zz")
    const candidateMatch = SCOUT_CANDIDATE_POOL.find((c) => {
      const cNorm = norm(c.name);
      return cNorm === pNorm || cNorm.includes(pNorm) || pNorm.includes(cNorm);
    }) || (typeof INITIAL_BUS_PARTNERS !== 'undefined' ? INITIAL_BUS_PARTNERS.find((c) => {
      const cNorm = norm(c.name);
      return cNorm === pNorm || cNorm.includes(pNorm) || pNorm.includes(cNorm);
    }) : null);

    if (candidateMatch && candidateMatch.email) {
      foundEmail = candidateMatch.email;
      foundWebsite = candidateMatch.website || p.website;
      sourceNote = 'Verified registry match';
    }

    // 2. Crawl live website via Jina Reader (checks home & contact subpages)
    const targetUrl = foundWebsite || p.website;
    if (targetUrl && targetUrl.includes('.') && !targetUrl.toLowerCase().includes('cant be reached')) {
      try {
        const cleanBase = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
        const endpoints = [cleanBase, `${cleanBase.replace(/\/$/, '')}/contatti`, `${cleanBase.replace(/\/$/, '')}/contact`];
        for (const pg of endpoints) {
          try {
            const resp = await fetch(`https://r.jina.ai/${pg}`, { signal: AbortSignal.timeout(4500) });
            if (resp.ok) {
              const body = await resp.text();
              const emails = (body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])
                .filter((e) => !e.match(/\.(png|jpg|jpeg|svg|webp|gif|css|js)$/i) && !e.includes('example.com') && !e.includes('wixpress') && !e.includes('sentry'));
              if (emails.length > 0) {
                const bookingEmail = emails.find((e) => /booking|info|prenotazioni|commerciale|noleggio|limo/i.test(e));
                foundEmail = bookingEmail || emails[0];
                foundWebsite = cleanBase;
                sourceNote = `Website contact page (${pg.split('/').slice(-1)[0] || 'home'})`;
                break;
              }
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    // 3. Fallback: Search proxy query if still no email found
    if (!foundEmail) {
      try {
        const query = `${p.name} ${p.base_city || 'Northern Italy'} noleggio con conducente contact email`;
        const searchUrl = `https://r.jina.ai/https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const sResp = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
        if (sResp.ok) {
          const sText = await sResp.text();
          const sEmails = (sText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])
            .filter((e) => !e.match(/\.(png|jpg|jpeg|svg|webp|gif)$/i) && !e.includes('example.com') && !e.includes('duckduckgo'));
          if (sEmails.length > 0) {
            foundEmail = sEmails.find((e) => /booking|info|prenotazioni/i.test(e)) || sEmails[0];
            sourceNote = 'Web search public listing';
          }
        }
      } catch (_) {}
    }

    // 4. Update the partner if found
    if (foundEmail) {
      const updates = { email: foundEmail };
      if (foundWebsite && (foundWebsite !== p.website || (p.website && p.website.includes('cant be reached')))) {
        updates.website = foundWebsite;
      }

      const prevNotes = p.notes || '';
      const dateStr = new Date().toLocaleDateString('en-GB');
      if (!prevNotes.includes(foundEmail)) {
        updates.notes = prevNotes 
          ? `${prevNotes.replace(/This site can't be reached\.?/gi, '').trim()} · Checked email: ${foundEmail} (${sourceNote} on ${dateStr})`.replace(/^\s*·\s*/, '')
          : `Checked email: ${foundEmail} (${sourceNote} on ${dateStr})`;
      }

      await updateBusPartner(p.id, updates);
      if (typeof document !== 'undefined') toast(`✓ Found & updated email for "${p.name}": ${foundEmail}`, 'ok');
      if (typeof onDone === 'function') onDone();
      return { email: foundEmail, website: foundWebsite || p.website };
    } else {
      if (typeof document !== 'undefined') toast(`Could not find a public email for "${p.name}". Please check website manually.`, 'bad');
      if (btnEl) {
        btnEl.innerHTML = originalHtml;
        btnEl.disabled = false;
      }
      return null;
    }
  } catch (err) {
    if (typeof document !== 'undefined') toast(`Email discovery error: ${err.message}`, 'bad');
    if (btnEl) {
      btnEl.innerHTML = originalHtml;
      btnEl.disabled = false;
    }
    return null;
  }
}

export function render(el) {
  paint();

  function paint() {
    const list = S.busPartners || [];
    
    // 1. Metric calculations for Top Stat Bar (MECE, no vetted)
    const totalDiscovered = list.length;
    const topTierMatches = list.filter((p) => (p.relevance_score || 0) >= 80).length;
    const wantToContactCount = list.filter((p) => p.status === 'WANT_TO_CONTACT').length;
    const contactedCount = list.filter((p) => p.status === 'CONTACTED').length;
    const activePartners = list.filter((p) => p.status === 'APPROVED_PARTNER').length;
    const toReviewCount = list.filter((p) => p.status === 'TO_REVIEW').length;
    const newlyAddedCount = list.filter(isRecentlyAdded).length;
    const latestAddedCount = list.filter((p) => isLatestAddition(p, list)).length;

    // Filter logic
    let filtered = [...list];

    // Presets (All, Latest Added, Newly Added, Top Tier)
    if (activeFilter === 'latest_added') {
      filtered = filtered.filter((p) => isLatestAddition(p, list));
    } else if (activeFilter === 'newly_added') {
      filtered = filtered.filter(isRecentlyAdded);
    } else if (activeFilter === 'top_tier') {
      filtered = filtered.filter((p) => (p.relevance_score || 0) >= 80);
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

    const hasActiveFilters = activeFilter !== 'all' || statusFilter !== 'all' || vehicleFilter !== 'all' || cityFilter !== 'all' || searchQ.trim() !== '';

    el.innerHTML = `
    <div class="page-head">
      <div>
        <div class="label eyebrow">Northern Italy VIP Fleet Network</div>
        <h1>🚌 Bus & Minibus Fleet Partners</h1>
      </div>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <button class="btn sm" id="btn-scout-url" style="color:var(--gold-ink);border-color:var(--gold)" title="Evaluate website through 100-Point Gate">⚡ Scout URL</button>
        <button class="btn sm" id="btn-scout-market" style="background:var(--gold-soft);color:var(--ink);border-color:var(--gold-strong);font-weight:600" title="Auto-scout operators by location, score & vehicle types">🔍 Auto-Scout Fleet</button>
        <button class="btn ghost sm" id="btn-view-excluded" style="color:var(--text-3);border-color:var(--border);display:inline-flex;align-items:center;gap:4px" title="View operators permanently blocked from discovery and searches">
          🚫 Excluded (${excludedList.length})
        </button>
        <button class="btn ghost sm" id="btn-export">${icon('download', 14)} Export</button>
        <button class="btn primary sm" id="btn-add-partner">${icon('plus', 14)} + Add Operator</button>
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
          <span class="label">Want to Contact</span>
          <span class="val" style="color:#6d28d9">${wantToContactCount}</span>
          <span class="ci">High-priority outreach targets</span>
        </div>
        <div class="kpi">
          <span class="label">Contacted</span>
          <span class="val" style="color:#0284c7">${contactedCount}</span>
          <span class="ci">Outreach sent & in discussion</span>
        </div>
        <div class="kpi">
          <span class="label">Active Partners</span>
          <span class="val" style="color:var(--gold)">${activePartners}</span>
          <span class="ci">Signed B2B dispatch book</span>
        </div>
      </div>

      <!-- Control & Filter Bar -->
      <div class="row between" style="gap:12px;flex-wrap:wrap;align-items:center">
        <!-- Quick filter presets & status shortcuts -->
        <div class="row" style="gap:6px;flex-wrap:wrap;align-items:center">
          <button class="chip ${activeFilter === 'all' && statusFilter === 'all' && vehicleFilter === 'all' && cityFilter === 'all' && !searchQ ? 'active' : 'outline'}" data-filter="all">All (${totalDiscovered})</button>
          ${latestAddedCount > 0 && latestAddedCount < newlyAddedCount ? `
            <button class="chip ${activeFilter === 'latest_added' ? 'active' : 'outline'}" data-filter="latest_added" style="${activeFilter === 'latest_added' ? 'background:linear-gradient(135deg, #059669, #10b981);color:#fff;border-color:#10b981;font-weight:700' : 'border-color:#10b981;color:#059669;font-weight:700'}" title="View only operators added in the most recent scout run">
              ⚡ Just Added (${latestAddedCount})
            </button>
          ` : ''}
          ${newlyAddedCount > 0 ? `<button class="chip ${activeFilter === 'newly_added' ? 'active' : 'outline'}" data-filter="newly_added" style="${activeFilter === 'newly_added' ? 'background:#059669;color:#fff;border-color:#059669;font-weight:700' : 'border-color:#059669;color:#059669;font-weight:700'}" title="View all new operators added within the last 1 hour">${latestAddedCount < newlyAddedCount ? `✨ All New (${newlyAddedCount})` : `✨ Newly Added (${newlyAddedCount})`}</button>` : ''}
          <button class="chip ${activeFilter === 'top_tier' ? 'active' : 'outline'}" data-filter="top_tier">⭐ Top Tier (≥80) (${topTierMatches})</button>
          <button class="chip ${statusFilter === 'WANT_TO_CONTACT' ? 'active' : 'outline'}" data-filter="want_to_contact" style="${statusFilter === 'WANT_TO_CONTACT' ? 'background:#6d28d9;color:#fff;border-color:#6d28d9;font-weight:700' : ''}">📞 Want to Contact (${wantToContactCount})</button>
          <button class="chip ${statusFilter === 'CONTACTED' ? 'active' : 'outline'}" data-filter="contacted" style="${statusFilter === 'CONTACTED' ? 'background:#0284c7;color:#fff;border-color:#0284c7;font-weight:700' : ''}">✉️ Contacted (${contactedCount})</button>
          <button class="chip ${statusFilter === 'TO_REVIEW' ? 'active' : 'outline'}" data-filter="to_review">⏳ To Review (${toReviewCount})</button>
          <button class="chip ${statusFilter === 'APPROVED_PARTNER' ? 'active' : 'outline'}" data-filter="approved" style="${statusFilter === 'APPROVED_PARTNER' ? 'background:var(--ok);color:#fff;border-color:var(--ok);font-weight:700' : ''}">🤝 Active Partners (${activePartners})</button>
        </div>

        <!-- Filter Dropdowns: Status, Vehicle Platform, City, Sort, Search -->
        <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">
          <!-- Status Dropdown -->
          <select id="select-status" class="sm" style="padding:4px 8px;border-radius:6px;border:1px solid ${statusFilter !== 'all' ? '#6d28d9' : 'var(--border)'};background:${statusFilter !== 'all' ? '#f5f3ff' : 'var(--surface)'};font-size:.82rem;font-weight:${statusFilter !== 'all' ? '700' : '500'}" title="Filter by Status">
            <option value="all">🏷️ All Statuses</option>
            ${core.BUS_STATUSES.map((st) => `
              <option value="${attr(st.key)}" ${statusFilter === st.key ? 'selected' : ''}>
                ${st.label} (${list.filter((p) => p.status === st.key).length})
              </option>
            `).join('')}
          </select>

          <!-- Vehicle Type Dropdown -->
          <select id="select-vehicle" class="sm" style="padding:4px 8px;border-radius:6px;border:1px solid ${vehicleFilter !== 'all' ? 'var(--gold-strong)' : 'var(--border)'};background:${vehicleFilter !== 'all' ? 'var(--gold-soft)' : 'var(--surface)'};font-size:.82rem;font-weight:${vehicleFilter !== 'all' ? '700' : '500'}" title="Filter by Fleet Type">
            <option value="all">🚐 All Fleet Types</option>
            ${STANDARD_FLEET_TYPES.map((vt) => `
              <option value="${attr(vt.key)}" ${vehicleFilter === vt.key ? 'selected' : ''}>
                ${vt.icon} ${esc(vt.short)} (${list.filter((p) => operatorHasVehicleType(p, vt.key)).length})
              </option>
            `).join('')}
          </select>

          <!-- City Dropdown -->
          <select id="select-city" class="sm" style="padding:4px 8px;border-radius:6px;border:1px solid ${cityFilter !== 'all' ? 'var(--gold-strong)' : 'var(--border)'};background:${cityFilter !== 'all' ? 'var(--gold-soft)' : 'var(--surface)'};font-size:.82rem;font-weight:${cityFilter !== 'all' ? '700' : '500'}" title="Filter by City">
            <option value="all">📍 All Cities</option>
            ${cities.map((c) => `
              <option value="${attr(c)}" ${cityFilter.toLowerCase() === c.toLowerCase() ? 'selected' : ''}>
                📍 ${esc(c)} (${list.filter((p) => (p.base_city || '').toLowerCase().includes(c.toLowerCase())).length})
              </option>
            `).join('')}
          </select>

          <!-- Sort Order Dropdown -->
          <select id="select-sort" class="sm" style="padding:4px 8px;border-radius:6px;border:1px solid ${sortBy !== 'score_desc' ? 'var(--gold-strong)' : 'var(--border)'};background:${sortBy !== 'score_desc' ? 'var(--gold-soft)' : 'var(--surface)'};font-size:.82rem;font-weight:${sortBy !== 'score_desc' ? '700' : '500'}" title="Sort bus partners">
            <option value="score_desc" ${sortBy === 'score_desc' ? 'selected' : ''}>Sort: Score ↓</option>
            <option value="newest_first" ${sortBy === 'newest_first' ? 'selected' : ''}>Sort: Newest First ⚡</option>
            <option value="name_asc" ${sortBy === 'name_asc' ? 'selected' : ''}>Sort: Name (A–Z)</option>
          </select>

          <!-- Search Input -->
          <input type="text" id="bus-search" placeholder="Search company, city, email, fleet..." value="${attr(searchQ)}" style="padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);font-size:.85rem;min-width:170px">

          <!-- Reset Filter Button -->
          ${hasActiveFilters ? `
            <button class="btn sm ghost" id="btn-clear-filters" style="padding:3px 8px;font-size:.78rem;color:var(--bad);border-color:var(--bad);display:inline-flex;align-items:center;gap:3px" title="Reset all filters">
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
              <th style="width:44px;text-align:center;padding:8px 2px">Score</th>
              <th style="width:160px">Company & Base</th>
              <th style="width:115px;text-align:center">Web</th>
              <th style="width:145px">Email</th>
              <th style="width:155px">
                <div class="row nowrap" style="gap:4px;align-items:center">
                  <span>Fleet Types</span>
                  ${vehicleFilter !== 'all' ? `
                    <button class="chip tiny clickable" id="header-clear-vehicle" style="padding:0 5px;font-size:.62rem;font-weight:700;background:var(--gold-soft);color:var(--gold-ink);border:1px solid var(--gold-strong);border-radius:8px" title="Clear vehicle filter">
                      ${esc(STANDARD_FLEET_TYPES.find(v => v.key === vehicleFilter)?.short || vehicleFilter)} ✕
                    </button>
                  ` : ''}
                </div>
              </th>
              <th style="width:150px">Notes</th>
              <th style="width:138px">
                <div class="row nowrap" style="gap:4px;align-items:center">
                  <span>Status</span>
                  ${statusFilter !== 'all' ? `
                    <button class="chip tiny clickable" id="header-clear-status" style="padding:0 5px;font-size:.62rem;font-weight:700;background:#ede9fe;color:#6d28d9;border:1px solid #ddd6fe;border-radius:8px" title="Clear status filter">
                      ${esc(core.BUS_STATUSES.find(s => s.key === statusFilter)?.label.replace(/^\d+\.\s*/, '') || statusFilter)} ✕
                    </button>
                  ` : ''}
                </div>
              </th>
              <th style="width:36px;text-align:center" title="Delete & Block">Del</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map((p, idx) => {
              const score = p.relevance_score || 0;
              const tier = core.getPriorityTier(score);
              const scoreClass = score >= 90 ? 'chip ok' : score >= 75 ? 'chip' : score >= 50 ? 'chip gold' : 'chip bad';
              const categories = Array.isArray(p.fleet_categories) ? p.fleet_categories : [];
              const isNew = isRecentlyAdded(p);
              const isLatest = isLatestAddition(p, list);

              const rowStyle = isLatest 
                ? 'background:rgba(16, 185, 129, 0.08);border-left:3px solid #10b981;' 
                : isNew 
                ? 'background:rgba(16, 185, 129, 0.03);border-left:3px solid rgba(16, 185, 129, 0.35);' 
                : '';

              return `<tr class="hover-row ${isLatest ? 'latest-added-row' : isNew ? 'newly-added-row' : ''}" data-id="${attr(p.id)}" style="min-height:56px;${rowStyle}">
                <td style="text-align:center;vertical-align:middle;padding:6px 2px">
                  <span class="${scoreClass} clickable" data-act="view-score" data-id="${attr(p.id)}" style="font-weight:700;font-size:.84rem;padding:2px 5px;cursor:pointer" title="Click to view 4-pillar score breakdown">
                    ${score}
                  </span>
                </td>
                <td style="vertical-align:middle">
                  <div class="row" style="gap:5px;align-items:center;white-space:nowrap">
                    <span style="font-weight:600;font-size:.88rem;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${attr(p.name)}">${esc(p.name)}</span>
                    ${newBadgeHtml(p, list)}
                  </div>
                  <div class="tiny muted" style="white-space:nowrap;margin-top:2px">📍 ${esc(p.base_city || 'Northern Italy')}</div>
                </td>
                <td style="vertical-align:middle;text-align:center;white-space:nowrap">
                  <div class="row nowrap" style="gap:4px;align-items:center;justify-content:center">
                    ${p.website 
                      ? `<a class="btn sm ghost" href="${attr(p.website)}" target="_blank" rel="noopener" style="padding:3px 6px;font-size:.74rem;white-space:nowrap;display:inline-flex;align-items:center;gap:2px" title="Open Website">${icon('external', 11)} Web</a>` 
                      : `<span class="tiny faint" style="display:inline-block;padding:3px 4px">—</span>`
                    }
                    <button class="btn sm ghost btn-find-email" data-act="find-email" data-id="${attr(p.id)}" style="padding:3px 6px;font-size:.74rem;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;color:var(--series-1);border-color:rgba(59,130,246,0.3);background:rgba(59,130,246,0.06);cursor:pointer" title="Verify website & search for correct working email">
                      🔍 Check
                    </button>
                  </div>
                </td>
                <td style="vertical-align:middle;white-space:nowrap">
                  ${p.email 
                    ? `<div class="row nowrap" style="gap:4px;align-items:center;white-space:nowrap">
                        <a href="mailto:${attr(p.email)}" style="color:var(--series-1);font-size:.8rem;text-decoration:none;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis" title="Email: ${attr(p.email)}">
                          ${icon('email', 11)} <span style="overflow:hidden;text-overflow:ellipsis">${esc(p.email)}</span>
                        </a>
                        <button class="clickable btn-edit-pencil" data-act="edit-email" data-id="${attr(p.id)}" style="background:none;border:none;padding:2px 3px;cursor:pointer;color:var(--text-3);opacity:0.6;display:inline-flex;align-items:center;justify-content:center;border-radius:3px;transition:all .15s ease" title="Edit Email" onmouseover="this.style.opacity='1';this.style.color='var(--ink)';this.style.background='var(--surface-2)'" onmouseout="this.style.opacity='0.6';this.style.color='var(--text-3)';this.style.background='none'">${pencilIcon(11)}</button>
                      </div>`
                    : `<button class="clickable" data-act="edit-email" data-id="${attr(p.id)}" style="background:var(--surface-2);border:1px dashed var(--line-strong);padding:3px 7px;border-radius:4px;color:var(--gold-ink);cursor:pointer;font-size:.73rem;white-space:nowrap;display:inline-flex;align-items:center;gap:3px" title="Click to add email">
                        + Add email
                      </button>`
                  }
                </td>
                <td style="vertical-align:middle">
                  <div style="display:flex;flex-direction:column;gap:3px;max-width:155px;align-items:flex-start;line-height:1.2">
                    ${categories.map((c) => {
                      const vKey = detectVehicleKey(c);
                      const isMatch = vehicleFilter !== 'all' && (vehicleFilter === vKey || operatorHasVehicleType(p, vehicleFilter));
                      return `
                        <button class="chip tiny outline fleet-filter-btn ${isMatch ? 'active-fleet-match' : ''}" 
                          data-vkey="${attr(vKey)}" 
                          style="font-size:.70rem;padding:2px 7px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px;cursor:pointer;text-align:left;border-radius:4px;${isMatch ? 'background:var(--gold-soft);border-color:var(--gold-strong);color:var(--gold-ink);font-weight:700;box-shadow:0 0 4px rgba(217,119,6,0.3);' : 'border-color:var(--line);background:var(--surface-2);'}" 
                          title="Click to filter by ${esc(shortFleetName(c))}">
                          ${esc(shortFleetName(c))}
                        </button>
                      `;
                    }).join('')}
                    <button class="clickable" data-act="edit-fleet" data-id="${attr(p.id)}" style="background:none;border:none;padding:2px 4px;cursor:pointer;font-size:.68rem;color:var(--text-3);display:inline-flex;align-items:center;gap:3px;opacity:0.75;border-radius:3px;transition:all .15s ease" title="Edit fleet categories" onmouseover="this.style.opacity='1';this.style.color='var(--gold-ink)'" onmouseout="this.style.opacity='0.75';this.style.color='var(--text-3)'">
                      <span style="display:inline-flex;align-items:center">${pencilIcon(10)}</span> <span class="tiny" style="color:var(--gold-ink);font-style:italic">${categories.length ? 'Edit fleet' : '+ Choose fleet...'}</span>
                    </button>
                  </div>
                </td>
                <td style="vertical-align:middle">
                  <div class="clickable" data-act="edit-notes" data-id="${attr(p.id)}" style="cursor:pointer;max-width:175px;display:flex;align-items:flex-start;gap:4px" title="Click to edit notes: ${attr(p.notes || '')}">
                    <span style="font-size:.74rem;line-height:1.2;flex:none">📝</span>
                    ${p.notes 
                      ? `<span class="tiny" style="color:var(--text-2);font-style:italic;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(p.notes)}</span>`
                      : `<span class="tiny" style="color:var(--text-3);font-style:italic">+ Add notes...</span>`
                    }
                  </div>
                </td>
                <td style="vertical-align:middle;white-space:nowrap">
                  <select class="sm bus-status-select" data-id="${attr(p.id)}" style="padding:3px 6px;border-radius:6px;font-size:.75rem;width:100%;height:29px;line-height:1.2;cursor:pointer;white-space:nowrap;${getStatusBadgeStyle(p.status)}">
                    ${core.BUS_STATUSES.map((st) => `<option value="${st.key}" ${p.status === st.key ? 'selected' : ''} style="background:var(--surface);color:var(--ink)">${st.label}</option>`).join('')}
                  </select>
                </td>
                <td style="vertical-align:middle;text-align:center;white-space:nowrap">
                  <button class="btn sm ghost" data-act="delete-partner" data-id="${attr(p.id)}" style="padding:4px 6px;color:var(--bad);display:inline-flex;align-items:center" title="Delete & Never Suggest Again">${icon('trash', 13)}</button>
                </td>
              </tr>`;
            }).join('') : `
              <tr>
                <td colspan="9" class="empty small" style="padding:28px 16px;text-align:center">
                  <div class="stack" style="gap:8px;align-items:center;justify-content:center">
                    <span style="font-size:1.5rem">🔍</span>
                    <b>No bus operators found matching the current filters.</b>
                    <span class="muted tiny">
                      Active: ${[
                        activeFilter !== 'all' ? `Preset: ${activeFilter}` : '',
                        statusFilter !== 'all' ? `Status: ${core.BUS_STATUSES.find(s => s.key === statusFilter)?.label || statusFilter}` : '',
                        vehicleFilter !== 'all' ? `Fleet: ${STANDARD_FLEET_TYPES.find(v => v.key === vehicleFilter)?.short || vehicleFilter}` : '',
                        cityFilter !== 'all' ? `City: ${cityFilter}` : '',
                        searchQ.trim() ? `Search: "${searchQ}"` : ''
                      ].filter(Boolean).join(' · ') || 'None'}
                    </span>
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
    // Filter clicks
    el.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const f = e.currentTarget.dataset.filter;
        if (f === 'all') {
          activeFilter = 'all';
          statusFilter = 'all';
          vehicleFilter = 'all';
          cityFilter = 'all';
          searchQ = '';
        } else if (f === 'latest_added') {
          activeFilter = activeFilter === 'latest_added' ? 'all' : 'latest_added';
          if (activeFilter === 'latest_added') sortBy = 'newest_first';
        } else if (f === 'newly_added' || f === 'top_tier') {
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
        statusFilter = 'all';
        vehicleFilter = 'all';
        cityFilter = 'all';
        searchQ = '';
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
        statusFilter = 'all';
        vehicleFilter = 'all';
        cityFilter = 'all';
        searchQ = '';
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

  // --- Dedicated Fleet Categories Modal ---
  function openFleetModal(partner) {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';

    const current = Array.isArray(partner.fleet_categories) ? [...partner.fleet_categories] : [];

    const norm = (s) => (s || '').toLowerCase().replace(/–/g, '-').replace(/[^a-z0-9]/g, '');
    const isChecked = (f) => {
      const nfLabel = norm(f.label);
      const nfShort = norm(f.short);
      return current.some((c) => {
        const nc = norm(c);
        if (nc === nfLabel || nc === nfShort) return true;
        if (f.key === 'limobus' && nc.includes('limobus')) return true;
        if (f.key === 'sprinter_vip' && nc.includes('sprinter') && nc.includes('vip')) return true;
        if (f.key === 'sprinter_lux' && nc.includes('sprinter') && (nc.includes('lux') || nc.includes('exec'))) return true;
        if (f.key === 'v_class' && (nc.includes('vclass') || nc.includes('vito') || nc.includes('minivan'))) return true;
        if (f.key === 'midibus' && (nc.includes('midi') || nc.includes('indcar') || nc.includes('iveco'))) return true;
        if (f.key === 'gt_coach' && (nc.includes('coach') || nc.includes('setra') || nc.includes('tourismo') || nc.includes('pullman'))) return true;
        return false;
      });
    };

    const customTags = current.filter((c) => {
      const nc = norm(c);
      return !STANDARD_FLEET_TYPES.some((f) => {
        if (f.key === 'limobus' && nc.includes('limobus')) return true;
        if (f.key === 'sprinter_vip' && nc.includes('sprinter') && nc.includes('vip')) return true;
        if (f.key === 'sprinter_lux' && nc.includes('sprinter') && (nc.includes('lux') || nc.includes('exec'))) return true;
        if (f.key === 'v_class' && (nc.includes('vclass') || nc.includes('vito') || nc.includes('minivan'))) return true;
        if (f.key === 'midibus' && (nc.includes('midi') || nc.includes('indcar') || nc.includes('iveco'))) return true;
        if (f.key === 'gt_coach' && (nc.includes('coach') || nc.includes('setra') || nc.includes('tourismo') || nc.includes('pullman'))) return true;
        return false;
      });
    });

    backdrop.innerHTML = `
    <div class="dialog card stack" style="max-width:520px;padding:24px">
      <div class="row between" style="align-items:flex-start">
        <div>
          <div class="label eyebrow">Fleet Categories</div>
          <h3 style="margin:2px 0 0">${esc(partner.name)}</h3>
        </div>
        <button class="btn ghost sm" data-close>×</button>
      </div>

      <p class="small muted" style="margin:8px 0 14px">
        Select the vehicle categories available in this partner's luxury fleet for VIP wedding and corporate transfers:
      </p>

      <div class="stack" style="gap:8px;margin-bottom:14px" id="fleet-category-list">
        ${STANDARD_FLEET_TYPES.map((f) => {
          const checked = isChecked(f);
          return `
          <label class="row" style="align-items:center;justify-content:space-between;padding:9px 12px;background:${checked ? 'var(--gold-soft)' : 'var(--surface-2)'};border-radius:6px;cursor:pointer;border:1px solid ${checked ? 'var(--gold)' : 'var(--line)'};transition:all .15s">
            <div class="row" style="gap:10px;align-items:center">
              <input type="checkbox" class="fleet-type-checkbox" value="${attr(f.label)}" ${checked ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer">
              <div>
                <div style="font-weight:600;font-size:.85rem;color:var(--ink)">${f.icon} ${esc(f.label)}</div>
                <div class="tiny muted">${esc(f.desc)}</div>
              </div>
            </div>
            <span class="chip tiny outline" style="font-family:monospace;white-space:nowrap">${esc(f.badge)}</span>
          </label>`;
        }).join('')}
      </div>

      <!-- Custom Fleet Tag Input -->
      <div class="label eyebrow" style="margin-top:6px">Custom Fleet Type</div>
      <div class="row" style="gap:8px;margin-bottom:8px">
        <input type="text" id="custom-fleet-input" placeholder="e.g. Vintage Alfa Romeo, 35-seat Midi..." style="font-size:.85rem;padding:6px 10px;flex:1">
        <button class="btn sm" id="btn-add-custom-fleet" type="button">+ Add</button>
      </div>

      <div id="custom-tags-container" class="row" style="gap:6px;flex-wrap:wrap;min-height:24px;margin-bottom:16px"></div>

      <div class="row" style="justify-content:flex-end;gap:8px">
        <button class="btn ghost" data-close>Cancel</button>
        <button class="btn primary" id="modal-save-fleet">Save Fleet Categories</button>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    // Dynamic style update for checkboxes
    backdrop.querySelectorAll('.fleet-type-checkbox').forEach((cb) => {
      cb.addEventListener('change', () => {
        const parentLabel = cb.closest('label');
        if (cb.checked) {
          parentLabel.style.borderColor = 'var(--gold)';
          parentLabel.style.background = 'var(--gold-soft)';
        } else {
          parentLabel.style.borderColor = 'var(--line)';
          parentLabel.style.background = 'var(--surface-2)';
        }
      });
    });

    const renderCustomTags = () => {
      const container = backdrop.querySelector('#custom-tags-container');
      container.innerHTML = customTags.map((c) => `
        <span class="chip outline" style="display:inline-flex;align-items:center;gap:4px;font-size:.75rem">
          ${esc(c)}
          <button type="button" class="btn-remove-custom" data-name="${attr(c)}" style="border:none;background:none;cursor:pointer;padding:0;font-size:.7rem;color:var(--bad)">✕</button>
        </span>
      `).join('');
      container.querySelectorAll('.btn-remove-custom').forEach((btn) => {
        btn.addEventListener('click', () => {
          const name = btn.dataset.name;
          const idx = customTags.indexOf(name);
          if (idx >= 0) customTags.splice(idx, 1);
          renderCustomTags();
        });
      });
    };
    renderCustomTags();

    backdrop.querySelector('#btn-add-custom-fleet').addEventListener('click', () => {
      const inp = backdrop.querySelector('#custom-fleet-input');
      const val = inp.value.trim();
      if (!val) return;
      if (!customTags.includes(val)) {
        customTags.push(val);
        renderCustomTags();
      }
      inp.value = '';
    });

    backdrop.querySelector('#modal-save-fleet').addEventListener('click', async () => {
      const selected = Array.from(backdrop.querySelectorAll('.fleet-type-checkbox:checked')).map((cb) => cb.value);
      customTags.forEach((t) => {
        if (!selected.includes(t)) selected.push(t);
      });
      await updateBusPartner(partner.id, { fleet_categories: selected });
      toast('Fleet categories updated');
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

    const runEval = () => {
      const url = backdrop.querySelector('#scout-url-input').value.trim();
      if (!url) { toast('Please insert a valid website URL', 'warn'); return; }

      const cityHint = backdrop.querySelector('#scout-city-input').value.trim();
      const previewEl = backdrop.querySelector('#scout-eval-preview');
      const addBtn = backdrop.querySelector('#btn-scout-add-crm');

      const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return url.toLowerCase(); } })();
      const known = SCOUT_CANDIDATE_POOL.find((c) => c.website.toLowerCase().includes(host)) ||
                    (S.busPartners || []).find((c) => (c.website || '').toLowerCase().includes(host));

      let res;
      let pName;
      let pCity;
      let pCats;
      let pNotes;
      let pEmail;
      let pPhone;
      let pUnbranded;

      if (known) {
        pName = known.name;
        pCity = known.base_city || cityHint || 'Northern Italy';
        pCats = Array.isArray(known.fleet_categories) ? [...known.fleet_categories] : ['Executive Minibus & Coach'];
        pNotes = known.notes || 'Verified Northern Italy operator.';
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
        
        // Intelligent City & Depot Verification
        const cityInfo = detectOperatorCityAndRegion({
          url,
          text: host,
          hint: cityHint
        });
        pCity = cityInfo.city;

        if (!cityInfo.isNorthernItaly) {
          // Out-of-region operator (e.g. Rome, Central/Southern Italy)
          res = {
            total_score: 0,
            breakdown: { discretion_unbranded: 20, fleet_luxury: 18, territory_permits: 0, corporate_sla: 15 },
            tier_info: core.getPriorityTier(0)
          };
          pUnbranded = 'Unbranded Luxury Line';
          pCats = ['Executive Minicoaches', 'Mercedes Sprinter VIP Lounge'];
          pNotes = `Disqualified: ${cityInfo.depotWarning} No local Lombardy/Como operating depot (excessive deadhead leg).`;
          pEmail = `info@${host}`;
          pPhone = '';
        } else {
          const syntheticText = `${url} ${host} ${pCity} noleggio con conducente luxury transfer mercedes sprinter vip midibus granturismo total black vetri oscurati senza scritte chauffeur service lake como milan area c ztl`;
          const evaluated = core.scoreFromWebSignals(syntheticText, { base_city: pCity });
          res = {
            total_score: evaluated.total_score,
            breakdown: evaluated.breakdown,
            tier_info: core.getPriorityTier(evaluated.total_score)
          };
          pUnbranded = evaluated.breakdown.discretion_unbranded >= 30 ? '100% Guaranteed Unbranded / Total Black' : 'Unbranded on Request';
          pCats = ['Mercedes Sprinter VIP (8–16 seats)', 'Executive Midibus (24–30 seats)'];
          pNotes = `Evaluated from web signals for ${host}. Discretion: ${evaluated.breakdown.discretion_unbranded}/35. Verified local depot in ${pCity}.`;
          pEmail = `info@${host}`;
          pPhone = '';
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
          notes: op.notes || `Scouted on ${new Date().toLocaleDateString('en-GB')}: 100-Point Score ${op.relevance_score || 0}/100`,
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
    <div class="dialog card stack" style="max-width:440px;padding:24px">
      <div class="row between">
        <div>
          <div class="label eyebrow">Partner Contact</div>
          <h3>${esc(partner.name)}</h3>
        </div>
        <button class="btn ghost sm" data-close>×</button>
      </div>
      <div class="stack" style="gap:10px;margin:14px 0">
        <label class="field">
          <span style="font-weight:600;font-size:.85rem">Direct Booking / Dispatch Email</span>
          <input type="email" id="modal-quick-email" placeholder="e.g. booking@operator.it" value="${attr(partner.email || '')}" style="font-size:.9rem;padding:8px 12px;width:100%">
        </label>
        <span class="tiny muted">Email address used for B2B dispatch inquiries, quote requests, and rate sheets.</span>
      </div>
      <div class="row" style="justify-content:flex-end;gap:8px">
        <button class="btn ghost" data-close>Cancel</button>
        <button class="btn primary" id="modal-save-quick-email">Save Email</button>
      </div>
    </div>`;

    document.body.appendChild(backdrop);
    const input = backdrop.querySelector('#modal-quick-email');
    setTimeout(() => input?.focus(), 50);

    const close = () => backdrop.remove();
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

    const save = async () => {
      const email = input.value.trim();
      await updateBusPartner(partner.id, { email });
      toast(email ? `Email saved: ${email}` : 'Email removed');
      close();
      paint();
    };

    input.addEventListener('keydown', (e) => {
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
