// Initial seed dataset and utility functions for Event & Corporate Agencies
// 100% isolated from wedding planners (prospects) and bus fleet partners (bus_partners).

export const EVENT_AGENCY_TYPES = [
  { key: 'all', label: 'All Specializations' },
  { key: 'corporate_mice', label: '🏢 Corporate & MICE' },
  { key: 'fashion_luxury', label: '👠 Fashion & Luxury Galas' },
  { key: 'brand_activation', label: '🎯 Brand Activations & PR' }
];

export const INITIAL_EVENT_PARTNERS = [
  {
    id: "event_1793298001001_bw01",
    name: "Balich Wonder Studio",
    agency_type: "fashion_luxury",
    agency_type_label: "✨ Mega Shows & Luxury Brand Galas",
    contact_person: "Production Logistics Desk",
    email: "info@balichws.com",
    phone: "+39 02 8343 8600",
    website: "https://www.balichws.com",
    base_city: "Milano",
    relevance_score: 96,
    status: "TO_REVIEW",
    score_breakdown: {
      scale_score: 25,
      vip_clientele: 25,
      northern_italy_coverage: 24,
      mobility_demand: 22
    },
    notes: "Global high-end live entertainment and Olympic/gala ceremonies based in Milan. Heavy VIP transfer demand between Milan hotels, private venues, and Lake Como villas."
  },
  {
    id: "event_1793298002002_fr02",
    name: "Feel Rouge Worldwide Shows",
    agency_type: "fashion_luxury",
    agency_type_label: "👠 Fashion Shows & Brand Activations",
    contact_person: "Operations Team",
    email: "info@feelrouge.it",
    phone: "+39 02 8907 8880",
    website: "https://www.feelrouge.it",
    base_city: "Milano",
    relevance_score: 94,
    status: "TO_REVIEW",
    score_breakdown: {
      scale_score: 24,
      vip_clientele: 25,
      northern_italy_coverage: 24,
      mobility_demand: 21
    },
    notes: "Elite fashion week productions, luxury jewelry launches (Bulgari, Cartier tier), and high-profile private galas in Milan, Venice, and Como."
  },
  {
    id: "event_1793298003003_tg03",
    name: "Triumph Group International",
    agency_type: "corporate_mice",
    agency_type_label: "🏢 Corporate Summits & MICE",
    contact_person: "Milano Congress Logistics",
    email: "milano@triumphgroup.it",
    phone: "+39 02 4801 3244",
    website: "https://www.triumphgroupinternational.com",
    base_city: "Milano",
    relevance_score: 91,
    status: "TO_REVIEW",
    score_breakdown: {
      scale_score: 25,
      vip_clientele: 22,
      northern_italy_coverage: 23,
      mobility_demand: 21
    },
    notes: "Large-scale institutional summits, corporate conventions, and pharmaceutical congresses with multi-vehicle airport shuttle dispatch from MXP and LIN."
  },
  {
    id: "event_1793298004004_se04",
    name: "Studio Esse Event Production",
    agency_type: "corporate_mice",
    agency_type_label: "🏢 Corporate Conventions & Roadshows",
    contact_person: "Daniela Esse",
    email: "info@studioesse.net",
    phone: "+39 02 3656 7770",
    website: "https://www.studioesse.net",
    base_city: "Milano",
    relevance_score: 89,
    status: "TO_REVIEW",
    score_breakdown: {
      scale_score: 22,
      vip_clientele: 23,
      northern_italy_coverage: 24,
      mobility_demand: 20
    },
    notes: "Boutique corporate event management in Milan. Organizes executive retreats and corporate dinners with dedicated private Mercedes van transfers."
  },
  {
    id: "event_1793298005005_ng05",
    name: "Next Group Milano",
    agency_type: "corporate_mice",
    agency_type_label: "🏢 Corporate MICE & Brand Events",
    contact_person: "Guest Logistics Division",
    email: "info@nextgroup.eu",
    phone: "+39 02 8708 7100",
    website: "https://www.nextgroup.eu",
    base_city: "Milano",
    relevance_score: 88,
    status: "TO_REVIEW",
    score_breakdown: {
      scale_score: 23,
      vip_clientele: 22,
      northern_italy_coverage: 23,
      mobility_demand: 20
    },
    notes: "Major Italian communications and event group. Organizes corporate conventions, roadshows, and automotive brand launches across Lombardy."
  },
  {
    id: "event_1793298006006_sw06",
    name: "Say What? Communication & Events",
    agency_type: "brand_activation",
    agency_type_label: "✨ Brand Activations & PR Galas",
    contact_person: "Events Desk",
    email: "eventi@saywhat.it",
    phone: "+39 02 3191 181",
    website: "https://www.saywhat.it",
    base_city: "Milano",
    relevance_score: 87,
    status: "TO_REVIEW",
    score_breakdown: {
      scale_score: 21,
      vip_clientele: 23,
      northern_italy_coverage: 23,
      mobility_demand: 20
    },
    notes: "Lifestyle, design week, and luxury PR agency in Milan. Organizes VIP press tours and influencer activations requiring discreet total-black transfers."
  },
  {
    id: "event_1793298007007_sg07",
    name: "Sinergie Live Communication (SG Company)",
    agency_type: "corporate_mice",
    agency_type_label: "🏢 International Summits & Conventions",
    contact_person: "Logistics & Hospitality Desk",
    email: "info@sinergie.org",
    phone: "+39 02 8345 5100",
    website: "https://www.sinergie.org",
    base_city: "Milano",
    relevance_score: 90,
    status: "TO_REVIEW",
    score_breakdown: {
      scale_score: 24,
      vip_clientele: 22,
      northern_italy_coverage: 24,
      mobility_demand: 20
    },
    notes: "Listed live communication company. Handles full-scale corporate hospitality, incentive trips, and executive delegation transport in Northern Italy."
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

const EVENT_STORAGE_KEY = 'dorogo_event_partners_cache_v1';

export function loadStoredEventPartners() {
  if (typeof localStorage === 'undefined') return [...INITIAL_EVENT_PARTNERS];
  try {
    const raw = localStorage.getItem(EVENT_STORAGE_KEY);
    if (!raw) return [...INITIAL_EVENT_PARTNERS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : [...INITIAL_EVENT_PARTNERS];
  } catch (_) {
    return [...INITIAL_EVENT_PARTNERS];
  }
}

export function saveStoredEventPartners(records) {
  if (typeof localStorage === 'undefined' || !Array.isArray(records)) return;
  try {
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(records));
  } catch (_) {}
}
