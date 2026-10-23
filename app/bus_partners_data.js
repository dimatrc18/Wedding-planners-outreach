// Default verified seed data for luxury bus & minibus partners in Northern Italy
import { calculateBusRelevanceScore } from '../supabase/functions/_shared/core/index.js';

export const INITIAL_BUS_PARTNERS = [
  {
    "id": "partner_moveolux",
    "name": "Moveolux",
    "base_city": "Milano",
    "website": "https://www.moveolux.com",
    "fleet_url": "https://www.moveolux.com/fleet/luxury-bus-hire/",
    "relevance_score": 98,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 25,
      "territory_permits": 20,
      "corporate_sla": 18
    },
    "status": "APPROVED_PARTNER",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Limobus Exclusive (18-28 seats)",
      "Mercedes Sprinter VIP (8-16 seats)",
      "Setra VIP Lounge"
    ],
    "phone": "+39 02 4004 7799",
    "email": "booking@moveolux.com",
    "notes": "Pioneer of Limobus in Italy. Lounge seating, bar, hostess, champagne service. Highest rates, gold standard for ultra-VIP delegations."
  },
  {
    "id": "partner_vip_limousine",
    "name": "VIP Limousine Milan",
    "base_city": "Milano",
    "website": "https://www.viplimousine.it",
    "fleet_url": "https://www.car-rental-with-driver.com/en/services/luxury-coach-and-minibus-rental-with-driver-milan.html",
    "relevance_score": 94,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 22,
      "territory_permits": 20,
      "corporate_sla": 17
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / NCC Black",
    "fleet_categories": [
      "Mercedes Sprinter Luxury (8-20 seats)",
      "Executive Coaches (21, 28, 30, 56, 64 seats)"
    ],
    "phone": "+39 02 546 5555",
    "email": "info@viplimousine.it",
    "notes": "Replaces vehicles every 2 years / 20k km. Strictly unbranded black/dark grey fleet. Suited chauffeurs, 24/7 central flight dispatch."
  },
  {
    "id": "partner_transervice",
    "name": "Transervice Limousine",
    "base_city": "Milano",
    "website": "https://www.transervicelimousine.com",
    "fleet_url": "https://www.transervicelimousine.com/",
    "relevance_score": 91,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 20,
      "territory_permits": 18,
      "corporate_sla": 18
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded",
    "fleet_categories": [
      "Mercedes Sprinter Executive (16-19 seats)",
      "Setra TopClass VIP Coaches (30-50 seats)"
    ],
    "phone": "+39 02 8951 6852",
    "email": "info@transervicelimousine.com",
    "notes": "Diplomatic and VIP FBO (Linate Prime) specialists. Dark monochromatic vehicles with zero company decals."
  },
  {
    "id": "partner_cima_luxury",
    "name": "Cima Luxury",
    "base_city": "Roma (Central Italy)",
    "website": "https://cimaluxury.com",
    "fleet_url": "https://cimaluxury.com/",
    "relevance_score": 0,
    "score_breakdown": {
      "discretion_unbranded": 32,
      "fleet_luxury": 22,
      "territory_permits": 0,
      "corporate_sla": 16
    },
    "status": "NOT_RELEVANT",
    "unbranded_status": "Unbranded Luxury Line",
    "fleet_categories": [
      "Mercedes Sprinter VIP Lounge",
      "Executive Minicoaches"
    ],
    "phone": "+39 06 35 34 83 45",
    "email": "info@cimaluxury.com",
    "notes": "Headquartered at Waldorf Astoria Rome Cavalieri (00136 Rome). Out-of-region depot (+39 06) located 570km from Milan/Lake Como with no local Lombardy depot. Disqualified from local Northern Italy dispatch."
  },
  {
    "id": "partner_perletti_topclass",
    "name": "Perletti Autoservizi (Top Class Line)",
    "base_city": "Bergamo / Milano",
    "website": "https://www.perlettibus.it",
    "fleet_url": "https://www.perlettibus.it/flotta/",
    "relevance_score": 81,
    "score_breakdown": {
      "discretion_unbranded": 25,
      "fleet_luxury": 22,
      "territory_permits": 18,
      "corporate_sla": 16
    },
    "status": "TO_REVIEW",
    "unbranded_status": "Unbranded on Request (Specify Top Class)",
    "fleet_categories": [
      "Setra TopClass 515/516 HD (30-54 seats)",
      "Mercedes Tourismo Black Series",
      "Mercedes Sprinter Minibus"
    ],
    "phone": "+39 035 830 148",
    "email": "info@perlettibus.it",
    "notes": "Large fleet. Must specify 'Top Class / Senza Livrea' in booking notes to guarantee unbranded dark vehicle."
  },
  {
    "id": "partner_lariobus",
    "name": "Lariobus",
    "base_city": "Lecco (Lake Como)",
    "website": "https://www.lariobus.com",
    "fleet_url": "https://www.lariobus.com/flotta/",
    "relevance_score": 79,
    "score_breakdown": {
      "discretion_unbranded": 20,
      "fleet_luxury": 20,
      "territory_permits": 20,
      "corporate_sla": 19
    },
    "status": "CONTACTED",
    "unbranded_status": "Unbranded on Request (Must Demand in Quote)",
    "fleet_categories": [
      "Midi-coaches 13-30 seats",
      "GT Coaches 36-56 seats"
    ],
    "phone": "+39 0341 581 600",
    "email": "info@lariobus.com",
    "notes": "Best local driver knowledge for Lake Como villas (Villa d'Este, Balbianello). Must request unbranded coach without decals."
  },
  {
    "id": "partner_linea_azzurra",
    "name": "Linea Azzurra Bus",
    "base_city": "Milano / Monza",
    "website": "https://www.lineaazzurrabus.com",
    "fleet_url": "https://www.lineaazzurrabus.com/la-nostra-flotta/",
    "relevance_score": 70,
    "score_breakdown": {
      "discretion_unbranded": 15,
      "fleet_luxury": 20,
      "territory_permits": 18,
      "corporate_sla": 17
    },
    "status": "TO_REVIEW",
    "unbranded_status": "Neutral White / Custom B2B Fleet",
    "fleet_categories": [
      "Setra & Mercedes Coaches 30-75 seats"
    ],
    "phone": "+39 02 905 5406",
    "email": "info@lineaazzurrabus.com",
    "notes": "Mass capacity operator for Fiera Milano Rho & corporate conventions. Modern Euro 6 fleet, good for large congress shuttles."
  },
  {
    "id": "partner_rosa_bus",
    "name": "Rosa Bus",
    "base_city": "Milano / Brianza",
    "website": "https://www.rosabus.it",
    "fleet_url": "https://www.rosabus.it/flotta/",
    "relevance_score": 68,
    "score_breakdown": {
      "discretion_unbranded": 15,
      "fleet_luxury": 18,
      "territory_permits": 18,
      "corporate_sla": 17
    },
    "status": "TO_REVIEW",
    "unbranded_status": "Standard Tour Livery (Needs Request for Plain)",
    "fleet_categories": [
      "Mercedes Tourismo 30-53 seats"
    ],
    "phone": "+39 039 601 2284",
    "email": "info@rosabus.it",
    "notes": "Reliable Mercedes fleet for regional transfers, Monza F1, and airport groups."
  }
];

const STORAGE_KEY = 'dorogo_bus_partners_v1';
export const STORAGE_EXCLUDED_KEY = 'dorogo_bus_partners_excluded_v1';

let _memoryExcluded = [];

export function normalizeDomain(url) {
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

export function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function loadExcludedBusPartners() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_EXCLUDED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (_) {}
  return _memoryExcluded;
}

export function saveExcludedBusPartners(list) {
  _memoryExcluded = Array.isArray(list) ? list : [];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_EXCLUDED_KEY, JSON.stringify(_memoryExcluded));
    }
  } catch (_) {}
}

export function isBusPartnerExcluded(partner, excludedList = null) {
  if (!partner) return false;
  const excluded = excludedList || loadExcludedBusPartners();
  if (!excluded || !excluded.length) return false;

  const pId = partner.id || '';
  const pNameNorm = normalizeName(partner.name);
  const pDomain = normalizeDomain(partner.website);
  const pPhoneNorm = normalizePhone(partner.phone);

  return excluded.some((ex) => {
    // 1. Direct ID match
    if (pId && ex.id && pId === ex.id) return true;

    // 2. Exact or substring domain match (e.g. cimaluxury.com)
    if (pDomain && ex.domain) {
      if (pDomain === ex.domain || pDomain.endsWith(`.${ex.domain}`) || ex.domain.endsWith(`.${pDomain}`)) {
        return true;
      }
    }

    // 3. Normalized name match (e.g. 'cimaluxury' or 'cimaluxurysrl')
    if (pNameNorm && ex.normalized_name) {
      if (pNameNorm === ex.normalized_name) return true;
      if (pNameNorm.length >= 6 && ex.normalized_name.length >= 6) {
        if (pNameNorm.includes(ex.normalized_name) || ex.normalized_name.includes(pNameNorm)) return true;
      }
    }

    // 4. Normalized phone match (matching last 7+ digits)
    if (pPhoneNorm && ex.normalized_phone && pPhoneNorm.length >= 7 && ex.normalized_phone.length >= 7) {
      const pTail = pPhoneNorm.slice(-7);
      const exTail = ex.normalized_phone.slice(-7);
      if (pTail === exTail) return true;
    }

    return false;
  });
}

export function addExcludedBusPartner(partner, reason = 'Dismissed by user') {
  if (!partner) return null;
  const list = [...loadExcludedBusPartners()];
  const domain = normalizeDomain(partner.website);
  const normalized_name = normalizeName(partner.name);
  const normalized_phone = normalizePhone(partner.phone);

  const existingIdx = list.findIndex((ex) => 
    (partner.id && ex.id === partner.id) ||
    (domain && ex.domain && domain === ex.domain) ||
    (normalized_name && ex.normalized_name && normalized_name === ex.normalized_name)
  );

  const entry = {
    id: partner.id || `excluded_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: partner.name || 'Unknown Operator',
    normalized_name,
    website: partner.website || '',
    domain,
    phone: partner.phone || '',
    normalized_phone,
    base_city: partner.base_city || '',
    fleet_categories: Array.isArray(partner.fleet_categories) ? partner.fleet_categories : [],
    relevance_score: partner.relevance_score || 0,
    reason: reason || 'Dismissed by user',
    excluded_at: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...entry };
  } else {
    list.unshift(entry);
  }

  saveExcludedBusPartners(list);
  return entry;
}

export function removeExcludedBusPartner(idOrDomain) {
  if (!idOrDomain) return null;
  const list = [...loadExcludedBusPartners()];
  const target = String(idOrDomain).toLowerCase().trim();
  const targetNorm = normalizeName(target);
  const targetDomain = normalizeDomain(target);

  const idx = list.findIndex((ex) => 
    ex.id === idOrDomain || 
    (ex.domain && (ex.domain === target || ex.domain === targetDomain)) || 
    (ex.normalized_name && ex.normalized_name === targetNorm)
  );

  if (idx >= 0) {
    const [removed] = list.splice(idx, 1);
    saveExcludedBusPartners(list);
    return removed;
  }
  return null;
}

// Verified real-world replacements for legacy prototype/mock entries that had non-existent domains
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
  bassitours: {
    name: 'Autoservizi Guizzetti',
    base_city: 'Brescia',
    website: 'https://www.autoserviziguizzetti.com',
    fleet_url: 'https://www.autoserviziguizzetti.com/',
    phone: '+39 035 901 118',
    email: 'info@autoserviziguizzetti.com',
    notes: 'Brescia, Lake Iseo & Bergamo corridor. Modern Gran Turismo coaches and executive minibuses.'
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
  'bassitours.com': 'bassitours',
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

export function loadStoredBusPartners() {
  const excluded = loadExcludedBusPartners();
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        let parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let changed = false;
          // Remove test/dummy entries like "Test Partner"
          const beforeLen = parsed.length;
          parsed = parsed.filter((p) => {
            const n = normalizeName(p.name);
            const d = normalizeDomain(p.website);
            if (n === 'testpartner' || d === 'test-partner-123.it') return false;
            return true;
          });
          if (parsed.length !== beforeLen) changed = true;

          parsed = parsed.map((p) => {
            // 1. Upgrade any legacy prototype entry with non-existent domain to its verified real operator
            const replacement = findLegacyReplacement(p);
            if (replacement) {
              changed = true;
              return {
                ...p,
                ...replacement,
                status: (p.status === 'WANT_TO_CONTACT' && p.id !== 'partner_vip_limousine' && p.id !== 'partner_transervice') ? 'TO_REVIEW' : (p.status || 'TO_REVIEW')
              };
            }

            // 2. Reconcile Cima Luxury if stored with old erroneous Milano city
            if (p.id === 'partner_cima_luxury' || (p.name === 'Cima Luxury' && (p.base_city === 'Milano' || !p.base_city.includes('Roma')))) {
              changed = true;
              return {
                ...p,
                base_city: 'Roma (Central Italy)',
                phone: '+39 06 35 34 83 45',
                relevance_score: 0,
                score_breakdown: { discretion_unbranded: 32, fleet_luxury: 22, territory_permits: 0, corporate_sla: 16 },
                status: 'NOT_RELEVANT',
                notes: 'Headquartered at Waldorf Astoria Rome Cavalieri (00136 Rome). Out-of-region depot (+39 06) located 570km from Milan/Lake Como with no local Lombardy depot. Disqualified from local Northern Italy dispatch.'
              };
            }
            // 3. Reconcile scouted operators that erroneously defaulted to WANT_TO_CONTACT
            if (
              p.status === 'WANT_TO_CONTACT' &&
              p.id !== 'partner_vip_limousine' &&
              p.id !== 'partner_transervice'
            ) {
              changed = true;
              return {
                ...p,
                status: 'TO_REVIEW'
              };
            }
            return p;
          });

          // Deduplicate by normalized name or domain after upgrades
          const seenNames = new Set();
          const seenDomains = new Set();
          const deduped = [];
          for (const p of parsed) {
            if (isBusPartnerExcluded(p, excluded)) {
              changed = true;
              continue;
            }
            const n = normalizeName(p.name);
            const d = normalizeDomain(p.website);
            if ((n && seenNames.has(n)) || (d && seenDomains.has(d))) {
              changed = true;
              continue;
            }
            if (n) seenNames.add(n);
            if (d) seenDomains.add(d);
            deduped.push(p);
          }

          if (changed || deduped.length !== parsed.length) {
            saveStoredBusPartners(deduped);
          }
          return deduped;
        }
      }
    }
  } catch (_) {}
  return INITIAL_BUS_PARTNERS.filter((p) => !isBusPartnerExcluded(p, excluded));
}

export function saveStoredBusPartners(list) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch (_) {}
}
