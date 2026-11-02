// Initial seed dataset and utility functions for Event & Corporate Agencies
// 100% isolated from wedding planners (prospects) and bus fleet partners (bus_partners).

export const EVENT_AGENCY_TYPES = [
  { key: 'all', label: 'All Partners' },
  { key: 'trade_fair', label: '🏛️ Milano Home 2027' },
  { key: 'corporate_mice', label: '🏢 Corporate & MICE' },
  { key: 'fashion_luxury', label: '👠 Fashion & Luxury' },
  { key: 'brand_activation', label: '🎯 Brand Activations' }
];

export const INITIAL_EVENT_PARTNERS = [
  {
    "id": "event_1793298001001_bw01",
    "name": "Balich Wonder Studio",
    "agency_type": "luxury_gala",
    "agency_type_label": "✨ Mega Shows & Luxury Brand Galas",
    "contact_person": "Production Logistics Desk",
    "email": "info@balichws.com",
    "phone": "+39 02 8343 8600",
    "website": "https://www.balichws.com",
    "base_city": "Milano",
    "relevance_score": 96,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 25,
      "vip_clientele": 25,
      "northern_italy_coverage": 24,
      "mobility_demand": 22
    },
    "notes": "Global high-end live entertainment and Olympic/gala ceremonies based in Milan. Heavy VIP transfer demand between Milan hotels, private venues, and Lake Como villas."
  },
  {
    "id": "event_1793298002002_fr02",
    "name": "Feel Rouge Worldwide Shows",
    "agency_type": "fashion_luxury",
    "agency_type_label": "👠 Fashion Shows & Brand Activations",
    "contact_person": "Operations Team",
    "email": "info@feelrouge.it",
    "phone": "+39 02 8907 8880",
    "website": "https://www.feelrouge.it",
    "base_city": "Milano",
    "relevance_score": 94,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 24,
      "vip_clientele": 25,
      "northern_italy_coverage": 24,
      "mobility_demand": 21
    },
    "notes": "Elite fashion week productions, luxury jewelry launches (Bulgari, Cartier tier), and high-profile private galas in Milan, Venice, and Como."
  },
  {
    "id": "event_1793298003003_tg03",
    "name": "Triumph Group International",
    "agency_type": "corporate_mice",
    "agency_type_label": "🏢 Corporate Summits & MICE",
    "contact_person": "Milano Congress Logistics",
    "email": "milano@triumphgroup.it",
    "phone": "+39 02 4801 3244",
    "website": "https://www.triumphgroupinternational.com",
    "base_city": "Milano",
    "relevance_score": 91,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 25,
      "vip_clientele": 22,
      "northern_italy_coverage": 23,
      "mobility_demand": 21
    },
    "notes": "Large-scale institutional summits, corporate conventions, and pharmaceutical congresses with multi-vehicle airport shuttle dispatch from MXP and LIN."
  },
  {
    "id": "event_1793298004004_se04",
    "name": "Studio Esse Event Production",
    "agency_type": "corporate_mice",
    "agency_type_label": "🏢 Corporate Conventions & Roadshows",
    "contact_person": "Daniela Esse",
    "email": "info@studioesse.net",
    "phone": "+39 02 3656 7770",
    "website": "https://www.studioesse.net",
    "base_city": "Milano",
    "relevance_score": 89,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 22,
      "vip_clientele": 23,
      "northern_italy_coverage": 24,
      "mobility_demand": 20
    },
    "notes": "Boutique corporate event management in Milan. Organizes executive retreats and corporate dinners with dedicated private Mercedes van transfers."
  },
  {
    "id": "event_1793298005005_ng05",
    "name": "Next Group Milano",
    "agency_type": "corporate_mice",
    "agency_type_label": "🏢 Corporate MICE & Brand Events",
    "contact_person": "Guest Logistics Division",
    "email": "info@nextgroup.eu",
    "phone": "+39 02 8708 7100",
    "website": "https://www.nextgroup.eu",
    "base_city": "Milano",
    "relevance_score": 88,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 23,
      "vip_clientele": 22,
      "northern_italy_coverage": 23,
      "mobility_demand": 20
    },
    "notes": "Major Italian communications and event group. Organizes corporate conventions, roadshows, and automotive brand launches across Lombardy."
  },
  {
    "id": "event_1793298006006_sw06",
    "name": "Say What? Communication & Events",
    "agency_type": "fashion_luxury",
    "agency_type_label": "✨ Brand Activations & PR Galas",
    "contact_person": "Events Desk",
    "email": "eventi@saywhat.it",
    "phone": "+39 02 3191 181",
    "website": "https://www.saywhat.it",
    "base_city": "Milano",
    "relevance_score": 87,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 21,
      "vip_clientele": 23,
      "northern_italy_coverage": 23,
      "mobility_demand": 20
    },
    "notes": "Lifestyle, design week, and luxury PR agency in Milan. Organizes VIP press tours and influencer activations requiring discreet total-black transfers."
  },
  {
    "id": "event_1793298007007_sg07",
    "name": "Sinergie Live Communication (SG Company)",
    "agency_type": "corporate_mice",
    "agency_type_label": "🏢 International Summits & Conventions",
    "contact_person": "Logistics & Hospitality Desk",
    "email": "info@sinergie.org",
    "phone": "+39 02 8345 5100",
    "website": "https://www.sinergie.org",
    "base_city": "Milano",
    "relevance_score": 90,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 24,
      "vip_clientele": 22,
      "northern_italy_coverage": 24,
      "mobility_demand": 20
    },
    "notes": "Listed live communication company. Handles full-scale corporate hospitality, incentive trips, and executive delegation transport in Northern Italy."
  },
  {
    "id": "event_mh_2027_001",
    "name": "Addison Ross Ltd",
    "agency_type": "trade_fair",
    "agency_type_label": "🏛️ Milano Home 2027 Exhibitor",
    "contact_person": "David Ross / Trade Sales Desk",
    "role": "Managing Director / Head of Trade Sales",
    "email": "sales@addisonross.com",
    "phone": "",
    "website": "https://www.addisonross.com",
    "base_city": "London",
    "country": "United Kingdom",
    "relevance_score": 95,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 24,
      "vip_clientele": 24,
      "northern_italy_coverage": 23,
      "mobility_demand": 24
    },
    "notes": "Iconic British luxury homeware & lacquered frames exhibiting at Milano Home 2027. UK executive arrivals into Linate/Malpensa needing punctual Mercedes-Benz commuter shuttles to Fiera Milano Rho.",
    "hook": "Noticed Addison Ross Ltd will be exhibiting at Milano Home 2027—we provide fixed-rate Mercedes-Benz airport transfers and executive shuttles directly to Fiera Milano Rho."
  },
  {
    "id": "event_mh_2027_002",
    "name": "Corston Ltd",
    "agency_type": "trade_fair",
    "agency_type_label": "🏛️ Milano Home 2027 Exhibitor",
    "contact_person": "Commercial Trade Desk",
    "role": "Head of European Partnerships",
    "email": "trade@corston.com",
    "phone": "",
    "website": "https://www.corston.com",
    "base_city": "Malmesbury",
    "country": "United Kingdom",
    "relevance_score": 93,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 24,
      "vip_clientele": 24,
      "northern_italy_coverage": 23,
      "mobility_demand": 24
    },
    "notes": "High-end architectural hardware, switches and lighting design from the UK exhibiting at Milano Home. Executive travel between central Milan hotels and Fiera Milano Rho.",
    "hook": "Ahead of Corston presentation at Milano Home 2027, DOROGO provides private executive chauffeur service connecting Milan hotels and Fiera Milano Rho."
  },
  {
    "id": "event_mh_2027_005",
    "name": "Serax NV",
    "agency_type": "trade_fair",
    "agency_type_label": "🏛️ Milano Home 2027 Exhibitor",
    "contact_person": "Hospitality & Trade Events Team",
    "role": "Head of International Exhibitions",
    "email": "hospitality@serax.com",
    "phone": "",
    "website": "https://www.serax.com",
    "base_city": "Kontich",
    "country": "Belgium",
    "relevance_score": 96,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 24,
      "vip_clientele": 24,
      "northern_italy_coverage": 23,
      "mobility_demand": 24
    },
    "notes": "Major Belgian luxury tableware and design studio with global designer collaborations. Large booth presence with multiple executive and booth staff arrivals into MXP/LIN.",
    "hook": "Given Serax major showcase at Milano Home 2027, our dedicated Mercedes-Benz V-Class fleet is available for your design team airport transfers and daily Rho shuttles."
  },
  {
    "id": "event_mh_2027_009",
    "name": "HORL 1993 GmbH",
    "agency_type": "trade_fair",
    "agency_type_label": "🏛️ Milano Home 2027 Exhibitor",
    "contact_person": "Timo & Otmar Horl",
    "role": "Managing Directors / Global Sales",
    "email": "info@horl.com",
    "phone": "",
    "website": "https://www.horl.com",
    "base_city": "Freiburg",
    "country": "Germany",
    "relevance_score": 94,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 24,
      "vip_clientele": 24,
      "northern_italy_coverage": 23,
      "mobility_demand": 24
    },
    "notes": "German precision rolling knife sharpeners and luxury culinary design. Direct flight arrivals from Frankfurt/Basel into Milan Malpensa.",
    "hook": "Ahead of HORL 1993 showcase at Milano Home in January, we provide seamless private chauffeur transfers from Malpensa and Linate directly to Fiera Milano Rho."
  },
  {
    "id": "event_mh_2027_013",
    "name": "Maileg GmbH",
    "agency_type": "trade_fair",
    "agency_type_label": "🏛️ Milano Home 2027 Exhibitor",
    "contact_person": "European Events Coordination",
    "role": "Trade Fair Operations Manager",
    "email": "service@maileg.de",
    "phone": "",
    "website": "https://www.maileg.com",
    "base_city": "Hamburg",
    "country": "Germany",
    "relevance_score": 92,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 24,
      "vip_clientele": 24,
      "northern_italy_coverage": 23,
      "mobility_demand": 24
    },
    "notes": "Danish-designed luxury heritage toy & home accessories brand exhibiting at Milano Home. Requires seamless team transport from Milan accommodations to the fairgrounds.",
    "hook": "For the Maileg team travelling to Milano Home 2027, we offer private Mercedes-Benz transfers and hourly disposal between Milan hotels and Fiera Rho."
  },
  {
    "id": "event_mh_2027_021",
    "name": "Ester & Erik A/S",
    "agency_type": "trade_fair",
    "agency_type_label": "🏛️ Milano Home 2027 Exhibitor",
    "contact_person": "Export & Fair Management",
    "role": "Head of International Export",
    "email": "mail@ester-erik.dk",
    "phone": "",
    "website": "https://www.ester-erik.dk",
    "base_city": "Silkeborg",
    "country": "Denmark",
    "relevance_score": 95,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 24,
      "vip_clientele": 24,
      "northern_italy_coverage": 23,
      "mobility_demand": 24
    },
    "notes": "Handcrafted Danish luxury candles and candleholders renowned worldwide. Scandinavian executive team flying in for Milano Home.",
    "hook": "As Ester & Erik prepares for Milano Home 2027, DOROGO provides private executive chauffeur transfers from Milan Malpensa and Linate to Fiera Milano Rho."
  },
  {
    "id": "event_mh_2027_022",
    "name": "Rice A/S",
    "agency_type": "trade_fair",
    "agency_type_label": "🏛️ Milano Home 2027 Exhibitor",
    "contact_person": "Charlotte Gueniau",
    "role": "Creative Director & Operations Desk",
    "email": "rice@ricebyrice.com",
    "phone": "",
    "website": "https://www.ricebyrice.com",
    "base_city": "Odense",
    "country": "Denmark",
    "relevance_score": 91,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 24,
      "vip_clientele": 24,
      "northern_italy_coverage": 23,
      "mobility_demand": 24
    },
    "notes": "Vibrant Danish home decor and ethical lifestyle brand exhibiting at Milano Home.",
    "hook": "Ahead of the RICE team arrival for Milano Home 2027, we coordinate punctual Mercedes-Benz V-Class team transfers to and from Fiera Milano Rho."
  },
  {
    "id": "event_mh_2027_025",
    "name": "Klippan Yllefabrik AB",
    "agency_type": "trade_fair",
    "agency_type_label": "🏛️ Milano Home 2027 Exhibitor",
    "contact_person": "Gosta Magnusson",
    "role": "Managing Director / Export Lead",
    "email": "info@klippanyllefabrik.se",
    "phone": "",
    "website": "https://www.klippanyllefabrik.se",
    "base_city": "Klippan",
    "country": "Sweden",
    "relevance_score": 93,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 24,
      "vip_clientele": 24,
      "northern_italy_coverage": 23,
      "mobility_demand": 24
    },
    "notes": "Historic Swedish wool textile manufacturer since 1879 exhibiting at Milano Home 2027.",
    "hook": "For Klippan Yllefabrik delegation attending Milano Home 2027, DOROGO ensures reliable private chauffeur transfers from Milan airports to Fiera Rho."
  },
  {
    "id": "event_mh_2027_026",
    "name": "Water & Wines",
    "agency_type": "trade_fair",
    "agency_type_label": "🏛️ Milano Home 2027 Exhibitor",
    "contact_person": "Brand Partnerships Desk",
    "role": "Founders / Trade Sales",
    "email": "cheers@waterandwines.com",
    "phone": "",
    "website": "https://www.waterandwines.com",
    "base_city": "Stockholm",
    "country": "Sweden",
    "relevance_score": 91,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 24,
      "vip_clientele": 24,
      "northern_italy_coverage": 23,
      "mobility_demand": 24
    },
    "notes": "High-end Scandinavian wine & spirit illustrated design gifts. Attending Milano Home with team arrivals.",
    "hook": "Ahead of Water & Wines presentation at Milano Home 2027, we offer executive private transfers connecting Milan city center and Fiera Milano Rho."
  },
  {
    "id": "event_mh_2027_030",
    "name": "Collegien",
    "agency_type": "trade_fair",
    "agency_type_label": "🏛️ Milano Home 2027 Exhibitor",
    "contact_person": "Olivier Guille",
    "role": "CEO / Trade Fair Director",
    "email": "contact@collegien-shop.com",
    "phone": "",
    "website": "https://www.collegien-shop.com",
    "base_city": "Briatexte",
    "country": "France",
    "relevance_score": 93,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 24,
      "vip_clientele": 24,
      "northern_italy_coverage": 23,
      "mobility_demand": 24
    },
    "notes": "French luxury lifestyle and heritage hosiery brand exhibiting at Milano Home.",
    "hook": "Pour equipe Collegien a occasion de Milano Home 2027, DOROGO assure vos transferts prives Mercedes-Benz entre Milan et Fiera Milano Rho."
  },
  {
    "id": "event_mh_2027_039",
    "name": "Clayre & Eef B.V.",
    "agency_type": "trade_fair",
    "agency_type_label": "🏛️ Milano Home 2027 Exhibitor",
    "contact_person": "Fair Logistics & Export Team",
    "role": "Exhibition Logistics Manager",
    "email": "info@clayre-eef.com",
    "phone": "",
    "website": "https://www.clayre-eef.com",
    "base_city": "Haelen",
    "country": "Netherlands",
    "relevance_score": 96,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 24,
      "vip_clientele": 24,
      "northern_italy_coverage": 23,
      "mobility_demand": 24
    },
    "notes": "Major Dutch homeware & textile company with 3 stalls booked at Milano Home. Large staff contingent requiring multi-vehicle or V-Class team shuttles.",
    "hook": "Noticed Clayre & Eef has booked multiple stalls at Milano Home 2027—we provide dedicated multi-vehicle Mercedes-Benz team commuter shuttles to Fiera Rho."
  },
  {
    "id": "event_mh_2027_047",
    "name": "Cereria Molla 1899",
    "agency_type": "trade_fair",
    "agency_type_label": "🏛️ Milano Home 2027 Exhibitor",
    "contact_person": "Molla Family",
    "role": "Head of Export",
    "email": "info@cereriamolla.com",
    "phone": "",
    "website": "https://www.cereriamolla.com",
    "base_city": "Albaida",
    "country": "Spain",
    "relevance_score": 94,
    "status": "TO_REVIEW",
    "score_breakdown": {
      "scale_score": 24,
      "vip_clientele": 24,
      "northern_italy_coverage": 23,
      "mobility_demand": 24
    },
    "notes": "Heritage Spanish luxury home fragrances and handmade scented candles since 1899 exhibiting at Milano Home.",
    "hook": "Ahead of Cereria Molla participation at Milano Home 2027, we offer private Mercedes-Benz chauffeur transfers connecting Milan airports and Fiera Milano Rho."
  }
];

export function mergeEventRecords(existing, incoming) {
  if (!existing) return incoming;
  return {
    ...existing,
    ...incoming,
    notes: existing.notes && incoming.notes && existing.notes !== incoming.notes 
      ? `${existing.notes}\n---\n${incoming.notes}`
      : (incoming.notes || existing.notes || '')
  };
}

const EVENT_STORAGE_KEY = 'dorogo_event_partners_cache_v3';

export function loadStoredEventPartners() {
  const map = new Map();
  // Foundation: all INITIAL_EVENT_PARTNERS
  for (const p of INITIAL_EVENT_PARTNERS) {
    map.set(p.id, p);
  }
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(EVENT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const p of parsed) {
            map.set(p.id, { ...(map.get(p.id) || {}), ...p });
          }
        }
      }
    } catch (_) {}
  }
  return Array.from(map.values()).sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
}

export function saveStoredEventPartners(records) {
  if (typeof localStorage === 'undefined' || !Array.isArray(records)) return;
  try {
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(records));
  } catch (_) {}
}
