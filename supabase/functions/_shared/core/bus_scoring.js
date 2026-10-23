// 100-Point Relevance Scoring Engine for Luxury Bus & Minibus Partners in Northern Italy
// Pillars: Discretion (35) + Fleet Tier (25) + Territory (20) + SLA (20)

export const BUS_STATUSES = [
  { key: 'TO_REVIEW', label: '1. To Review', tone: 'warn', desc: 'Discovered; awaiting manual check' },
  { key: 'WANT_TO_CONTACT', label: '2. Want to Contact', tone: 'gold', desc: 'Priority prospect Dorogo intends to contact' },
  { key: 'CONTACTED', label: '3. Contacted', tone: 'series-1', desc: 'Dorogo B2B outreach inquiry sent' },
  { key: 'APPROVED_PARTNER', label: '4. Approved Partner', tone: 'ok', desc: 'Rates agreed, zero-decal rule confirmed' },
  { key: 'REJECTED', label: '5. Rejected', tone: 'bad', desc: 'Disqualified (decals, rude, no NCC)' },
  { key: 'NOT_RELEVANT', label: '6. Not Relevant', tone: 'bad', desc: 'Not relevant for Dorogo; score pulled to 0' },
];

export const DISCRETION_LEVELS = [
  {
    key: 'guaranteed_total_black',
    label: '100% Guaranteed Unbranded / Total Black',
    short: '🛡️ Total Black (Guaranteed)',
    points: 35,
    desc: 'Zero promotional decals, no company phone numbers, dark privacy glass (vetri oscurati).'
  },
  {
    key: 'unbranded_on_request',
    label: 'Unbranded on Request',
    short: '⚠️ On Request (Must specify)',
    points: 20,
    desc: 'Plain white or dark coaches; agrees in writing to dispatch without magnetic logos or stickers.'
  },
  {
    key: 'heavy_commercial_livery',
    label: 'Heavy Commercial Livery / Billboard',
    short: '❌ Commercial Billboard',
    points: 5,
    desc: 'Giant tour-operator decals. Requires manual debadging/wrapping; low priority.'
  }
];

export const FLEET_TIERS = [
  {
    key: 'vip_lounge_sprinter',
    label: 'Mercedes-Benz Sprinter VIP / Setra TopClass VIP Lounge',
    short: 'Sprinter VIP / Setra Lounge',
    points: 25,
    desc: '8-20 seats leather recliners, conference tables, Wi-Fi, or 18-30 seat VIP coach conversion.'
  },
  {
    key: 'modern_executive_gt',
    label: 'Modern Mercedes Tourismo / Setra ComfortClass GT (30-54 seats)',
    short: 'Executive GT (Tourismo / Setra)',
    points: 18,
    desc: 'Euro 6, clean dark/neutral interior, individual USB sockets.'
  },
  {
    key: 'standard_tourist',
    label: 'Standard Iveco / Scania / Commuter Coaches',
    short: 'Standard Tourist Coach',
    points: 8,
    desc: 'Standard high-capacity tourist charter.'
  }
];

export const TERRITORY_PERMITS = [
  {
    key: 'full_ztl_como_alpine',
    label: 'Milan Area C / ZTL + NCC Bus Lanes + Lake Como Historic Villas + Winter Alpine',
    short: 'Milan ZTL + Como Villas + Alps',
    points: 20,
    desc: 'Full urban permits, narrow villa access experience, winter Alpine chain certification.'
  },
  {
    key: 'airport_motorway_only',
    label: 'Milan Airports & Motorways Only',
    short: 'Airports / Motorway Only',
    points: 12,
    desc: 'No inner-city ZTL access or historic villa experience.'
  },
  {
    key: 'peripheral_provincial',
    label: 'Peripheral Provincial Base',
    short: 'Peripheral Base',
    points: 5,
    desc: 'Long deadhead / repositioning mileage to Milan or Lake Como.'
  }
];

export const CORPORATE_SLA = [
  {
    key: 'executive_chauffeur_247',
    label: 'Suited Chauffeurs + English-Speaking + 24/7 Dispatch + EU VAT / Fattura Elettronica',
    short: 'Suited Drivers + English + 24/7',
    points: 20,
    desc: 'Dark suits & ties, fluent English, real-time flight-tracking dispatch, B2B invoicing.'
  },
  {
    key: 'standard_commercial_driver',
    label: 'Italian-Speaking Only + Standard Commercial Drivers + Office Hours',
    short: 'Standard Drivers + Office Hours',
    points: 10,
    desc: 'Standard uniform or casual, Italian only, office-hours dispatch.'
  }
];

export function getPriorityTier(score = 0) {
  if (score >= 90) {
    return {
      tier: 'tier_1',
      badge: 'Tier 1: Ultra-Priority',
      label: 'Ultra-Priority / Direct Luxury Fit',
      color: 'var(--ok, #10B981)',
      tone: 'ok',
      action: 'Contact First'
    };
  }
  if (score >= 75) {
    return {
      tier: 'tier_2',
      badge: 'Tier 2: High Potential',
      label: 'High Potential / Executive Backup',
      color: 'var(--series-1, #3B82F6)',
      tone: 'info',
      action: 'Contact for Backup'
    };
  }
  if (score >= 50) {
    return {
      tier: 'tier_3',
      badge: 'Tier 3: Volume Reserve',
      label: 'Volume / Mass Event Reserve',
      color: 'var(--gold, #F59E0B)',
      tone: 'gold',
      action: 'Reserve for Conventions'
    };
  }
  return {
    tier: 'tier_4',
    badge: 'Tier 4: Incompatible',
    label: 'Incompatible (Branded / Non-Luxury)',
    color: 'var(--bad, #EF4444)',
    tone: 'bad',
    action: 'Auto-Archive'
  };
}

/**
 * Computes the 100-point score based on explicit criteria or existing breakdown.
 */
export function calculateBusRelevanceScore(partner = {}) {
  // If explicitly flagged as Not Relevant, score is immediately pulled to 0
  if (partner.status === 'NOT_RELEVANT') {
    const tierInfo = getPriorityTier(0);
    return {
      total_score: 0,
      tier: 'tier_4',
      tier_info: tierInfo,
      breakdown: {
        discretion_unbranded: 0,
        fleet_luxury: 0,
        territory_permits: 0,
        corporate_sla: 0
      }
    };
  }

  const bd = partner.score_breakdown || {};
  let discretion = typeof bd.discretion_unbranded === 'number' ? bd.discretion_unbranded : 20;
  let fleet = typeof bd.fleet_luxury === 'number' ? bd.fleet_luxury : 18;
  let territory = typeof bd.territory_permits === 'number' ? bd.territory_permits : 15;
  let sla = typeof bd.corporate_sla === 'number' ? bd.corporate_sla : 15;

  // Clamp each pillar to its MECE maximum
  discretion = Math.max(0, Math.min(35, discretion));
  fleet = Math.max(0, Math.min(25, fleet));
  territory = Math.max(0, Math.min(20, territory));
  sla = Math.max(0, Math.min(20, sla));

  const total = discretion + fleet + territory + sla;
  const tierInfo = getPriorityTier(total);

  return {
    total_score: total,
    tier: tierInfo.tier,
    tier_info: tierInfo,
    breakdown: {
      discretion_unbranded: discretion,
      fleet_luxury: fleet,
      territory_permits: territory,
      corporate_sla: sla
    }
  };
}

/**
 * Keyword-based heuristic evaluator for web scraper & crawler.
 * Extracts signals from scraped text and meta information.
 */
export function scoreFromWebSignals(text = '', meta = {}) {
  const lower = String(text || '').toLowerCase();
  const notes = [];

  // Pillar 1: Discretion (Max 35)
  let discretion = 15;
  if (/vetri\s+oscurat|total\s+black|senza\s+scritte|nessuna\s+scritta|unbranded|anonim[oa]|dark\s+grey|black\s+edition|livrea\s+scura/i.test(lower)) {
    discretion = 35;
    notes.push('Found unbranded/total black signals (vetri oscurati / senza scritte)');
  } else if (/senza\s+logo|su\s+richiesta|plain\s+white|bianco\s+senza|flotta\s+bianca/i.test(lower)) {
    discretion = 20;
    notes.push('Plain vehicle, unbranded on request');
  } else if (/tour\s+operator|pubblicit|grafica|scritte\s+aziendali/i.test(lower)) {
    discretion = 5;
    notes.push('Commercial decals indicated');
  }

  // Pillar 2: Fleet Category (Max 25)
  let fleet = 15;
  if (/sprinter\s+vip|limobus|vip\s+lounge|setra\s+topclass|pelle|poltrone\s+in\s+pelle|tavolini|wifi|exclusive\s+line/i.test(lower)) {
    fleet = 25;
    notes.push('VIP Sprinter or Lounge conversion confirmed');
  } else if (/iveco|scania|scolastic|scuolabus|linea/i.test(lower)) {
    fleet = 8;
    notes.push('Standard commercial/commuter coaches');
  } else if (/tourismo|comfortclass|gran\s+turismo|euro\s+6|prese\s+usb/i.test(lower)) {
    fleet = 18;
    notes.push('Modern Mercedes/Setra GT fleet');
  }

  // Pillar 3: Territory & Permits (Max 20)
  let territory = 12;
  const city = (meta.base_city || '').toLowerCase();
  if (/milan|milano|como|lecco|bellagio|cernobbio/i.test(city) || /area\s+c|ztl|corsie\s+preferenziali|ville\s+del\s+lago|lago\s+di\s+como|catene\s+da\s+neve/i.test(lower)) {
    territory = 20;
    notes.push('Prime Milan/Lake Como base with ZTL/NCC lane access');
  } else if (/bergamo|brescia|monza|varese|verona|torino|turin/i.test(city)) {
    territory = 15;
    notes.push('Lombardy/Piedmont regional base');
  }

  // Pillar 4: SLA & Standards (Max 20)
  let sla = 15;
  if (/english\s+speaking|abito\s+scuro|cravatta|chauffeur|24\/7|h24|fattura\s+elettronica|vip\s+service|fbo|linate\s+prime/i.test(lower)) {
    sla = 20;
    notes.push('Professional suited drivers, 24/7 dispatch, English proficiency');
  } else if (/italiano|orari\s+ufficio/i.test(lower)) {
    sla = 10;
  }

  const scoreRes = calculateBusRelevanceScore({
    score_breakdown: {
      discretion_unbranded: discretion,
      fleet_luxury: fleet,
      territory_permits: territory,
      corporate_sla: sla
    }
  });

  return {
    ...scoreRes,
    notes: notes.join(' · ')
  };
}
