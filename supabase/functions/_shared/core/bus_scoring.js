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
  const isRomeOrCentral = /roma|rome|lazio|napoli|firenze|florence|palermo|catania|central\s+italy/i.test(city) ||
    (/\b(001\d\d|rome cavalieri|via alberto cadlolo)\b/i.test(lower) && !/depot.*milan|filiale.*milano|sede.*como/i.test(lower));

  if (isRomeOrCentral) {
    territory = 0;
    notes.push('Disqualified / non-local: headquarters in Rome/Central Italy (500+ km from Milan/Como). No local Lombardy depot.');
  } else if (/milan|milano|como|lecco|bellagio|cernobbio|menaggio|laglio|bormio/i.test(city) || (/area\s+c|ztl|corsie\s+preferenziali|ville\s+del\s+lago|lago\s+di\s+como|catene\s+da\s+neve/i.test(lower) && !isRomeOrCentral)) {
    territory = 20;
    notes.push('Prime Milan/Lake Como base with ZTL/NCC lane access');
  } else if (/bergamo|brescia|monza|varese|verona|torino|turin|garda|sondrio|livigno/i.test(city)) {
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

// ============================================================================
// BUS PARTNER OUTREACH PIPELINE, CEO-LEVEL ITALIAN CADENCE & SANKEY FLOW
// ============================================================================

export const BUS_OUTREACH_STAGES = [
  { key: 'to_check', label: '1. To Check (Verify Email)', status: 'TO_REVIEW', tone: 'muted' },
  { key: 'ready', label: '2. Ready to Contact', status: 'WANT_TO_CONTACT', tone: 'gold' },
  { key: 't1_sent', label: '3a. Email 1 Sent (IT Intro)', status: 'CONTACTED', tone: 'info' },
  { key: 't2_sent', label: '3b. Email 2 Sent (Follow-up)', status: 'CONTACTED', tone: 'info' },
  { key: 'replied', label: '4. Replied (Rates / WA)', status: 'CONTACTED', tone: 'ok' },
  { key: 'partner_won', label: '5. Approved Partner 🤝', status: 'APPROVED_PARTNER', tone: 'ok' },
  { key: 'closed', label: 'Closed / Rejected', status: 'REJECTED', tone: 'bad' },
];

export const DEFAULT_BUS_OUTREACH_SETTINGS = {
  timezone: 'Europe/Rome',
  // Monday (1) through Saturday (6) allowed; Sunday (7) blocked for cold/follow-up sends
  send_days: [1, 2, 3, 4, 5, 6],
  window_start: '08:30',
  window_end: '18:00',
  daily_cap: 12,
  followup_days: 3,
  target_replies: 10,
};

/**
 * Classifies a single bus/vehicle string as 'luxury' (ONLY when explicitly marked VIP, Luxury, Lusso,
 * Limobus, VIP Lounge, V-Class / Classe V, Exclusive, or Top Class)
 * or 'standard' (Minivan NCC, Viano/Vito standard, Sprinter standard, Midibus 24–30 pax, Setra/Tourismo/Irizar GT Coach 50–56 pax).
 */
export function classifySingleBusAllocation(busStr = '') {
  const s = String(busStr || '').toLowerCase();
  if (!s.trim()) return null;

  // Strict Zero-Hallucination Luxury check: only classify as 'luxury' when explicitly stated
  if (/limobus|vip\s*lounge|v-?class|classe\s*v|\bvip\b|luxury|\blusso\b|\bgtl\b|exclusive|top\s*class|total\s*black|tomassini|\balis\b/i.test(s)) {
    return 'luxury';
  }
  // Standard GT / Group Charter vehicles: standard Minivan/Viano/Vito, Sprinter minibus, Midibus (20-36 pax), Tourismo/Setra/Irizar/Neoplan GT Coaches (40-80+ pax)
  return 'standard';
}

/**
 * Infers whether a bus operator offers Luxury VIP, Standard GT/Charter, or Both
 * directly from the allocation of buses selected for that partner (`fleet_categories` and `bus_models`).
 */
export function inferBusSegment(partner = {}) {
  const card = partner.score_breakdown?.partner_card || {};
  const explicit = partner.fleet_segment || card.fleet_segment;
  const userOverrode = Boolean(partner.user_set_segment || card.user_set_segment);

  if (userOverrode && explicit && ['luxury', 'standard', 'both'].includes(explicit)) {
    return explicit;
  }

  // Check allocated buses first (`fleet_categories` + `bus_models`)
  const categories = Array.isArray(partner.fleet_categories) ? partner.fleet_categories : [];
  const modelsStr = String(partner.bus_models || card.bus_models || '').trim();
  const allocatedBuses = [
    ...categories,
    ...(modelsStr ? modelsStr.split(/[,;/•\n]+/).map((x) => x.trim()).filter(Boolean) : []),
  ];

  if (allocatedBuses.length > 0) {
    let hasLux = false;
    let hasStd = false;
    for (const item of allocatedBuses) {
      const cls = classifySingleBusAllocation(item);
      if (cls === 'luxury') hasLux = true;
      else if (cls === 'standard') hasStd = true;
    }
    if (hasLux && hasStd) return 'both';
    if (hasLux) return 'luxury';
    if (hasStd) return 'standard';
  }

  if (explicit && ['luxury', 'standard', 'both'].includes(explicit)) return explicit;

  const text = `${partner.name || ''} ${partner.unbranded_status || ''} ${partner.notes || ''}`.toLowerCase();
  const hasLuxText = /vip|limobus|lounge|v-?class|total\s+black|exclusive|luxury/i.test(text);
  const hasStdText = /tourismo|setra|gt\b|gran\s+turismo|coach|pullman|iveco|scania|irizar/i.test(text);

  if (hasLuxText && hasStdText) return 'both';
  if (hasLuxText) return 'luxury';
  return 'standard';
}

export function formatBusSegmentLabel(seg) {
  if (seg === 'luxury') return '✨ Luxury VIP';
  if (seg === 'both') return '✨🚌 Luxury & Standard';
  return '🚌 Standard GT / Charter';
}

/**
 * Resolves the granular outreach stage for a bus partner.
 */
export function getBusOutreachStage(partner = {}) {
  const card = partner.score_breakdown?.partner_card || {};
  const explicit = partner.outreach_stage || card.outreach_stage;

  if (partner.status === 'APPROVED_PARTNER') return 'partner_won';
  if (partner.status === 'REJECTED' || partner.status === 'NOT_RELEVANT') return 'closed';

  if (explicit && ['to_check', 'ready', 't1_sent', 't2_sent', 'replied', 'partner_won', 'closed'].includes(explicit)) {
    if (partner.status === 'TO_REVIEW' && explicit === 'ready') return 'to_check';
    if (partner.status === 'WANT_TO_CONTACT' && explicit === 'to_check') return 'ready';
    return explicit;
  }

  // If they have replied_at or confirmed rates (hourly or standby), they are in 'replied'
  if (partner.replied_at || card.replied_at || partner.rate_hourly || card.rate_hourly || partner.rate_standby || card.rate_standby) {
    return partner.status === 'APPROVED_PARTNER' ? 'partner_won' : 'replied';
  }

  if (partner.status === 'CONTACTED') return 't1_sent';
  if (partner.status === 'WANT_TO_CONTACT') return 'ready';
  return 'to_check';
}

/**
 * Determines whether a Bus Partner outreach email can be sent at `now`.
 * Rules:
 * - Never sends if email is missing or invalid/no_mx/bounced.
 * - Requires verified email (`verified` or `mx_ok`) unless `allowUnverifiedOverride` is true.
 * - Sends Monday–Saturday (`dow` 1..6).
 * - Blocks Sunday (`dow === 7`) for cold/follow-up sends, UNLESS `isReplyToSundayInbound` is true.
 */
export function canSendBusOutreach(partner = {}, now = new Date(), opts = {}) {
  const email = String(partner.email || '').trim();
  if (!email || !email.includes('@')) {
    return { ok: false, reason: 'no_email', message: 'Missing email address' };
  }

  const emailStatus = partner.email_status || partner.score_breakdown?.partner_card?.email_status || 'unknown';
  if (['invalid', 'no_mx', 'bounced'].includes(emailStatus)) {
    return { ok: false, reason: 'invalid_email', message: 'Email domain/mailbox failed verification (blocked to prevent bounce/spam)' };
  }

  if (!opts.allowUnverifiedOverride && !['verified', 'mx_ok'].includes(emailStatus)) {
    return { ok: false, reason: 'unverified_email', message: 'Email not yet verified — click 🔍 Check first to protect sender reputation' };
  }

  // Compute day of week in Europe/Rome (1 = Mon ... 6 = Sat, 7 = Sun)
  const d = now instanceof Date ? now : new Date(now);
  const romeWeekdayStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', weekday: 'short' }).format(d);
  const dowMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const dow = dowMap[romeWeekdayStr] || (d.getUTCDay() === 0 ? 7 : d.getUTCDay());

  const inboundOnSunday = Boolean(opts.isReplyToSundayInbound || partner.last_inbound_on_sunday);
  if (dow === 7) {
    if (inboundOnSunday) {
      return { ok: true, reason: 'sunday_reply_exception', dow };
    }
    return {
      ok: false,
      reason: 'sunday_blocked',
      dow,
      message: 'Sunday sending is paused (Mon–Sat active). Sunday replies are only sent if the operator wrote to us on Sunday.',
    };
  }

  // Business hours window: 08:30 - 15:30 Europe/Rome (strictly avoid sending too late)
  if (!opts.allowOffHoursOverride) {
    const romeTimeStr = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    const [rHour, rMin] = romeTimeStr.split(':').map(Number);
    const currentMins = rHour * 60 + rMin;
    const startMins = 8 * 60 + 30; // 08:30
    const endMins = 15 * 60 + 30;   // 15:30
    if (currentMins < startMins || currentMins > endMins) {
      return {
        ok: false,
        reason: 'outside_business_hours',
        message: 'Outside business hours (08:30–15:30 Rome time). Scheduled for next morning dispatch window.',
        dow,
      };
    }
  }

  return { ok: true, reason: 'allowed_mon_sat', dow };
}

/**
 * Computes the next valid Mon–Sat send slot (skipping Sunday unless replying to a Sunday inbound).
 * Enforces business morning/early afternoon window (08:30–14:30 Europe/Rome), never late afternoon or night.
 * Pacing: max 12 per day to support aggressive 50-contact target by Friday.
 */
export function nextBusSendSlot(now = new Date(), indexOffset = 0, opts = {}) {
  const maxPerDay = 12; // Scaled for 50-by-Friday target (10–12 sends/day)
  const dayShift = Math.floor(indexOffset / maxPerDay);
  const slotInDay = indexOffset % maxPerDay;
  const minsFromStart = 30 + (slotInDay * 25); // 08:30, 08:55, 09:20... up to ~13:05 UTC
  const hourOffset = Math.floor(minsFromStart / 60);
  const remMins = minsFromStart % 60;

  const n = now instanceof Date ? now : new Date(now);
  let d = new Date(n.getTime());
  // Base at 07:00 UTC (~08:30 Rome time)
  d.setUTCHours(7 + hourOffset, remMins, 0, 0);

  const romeDow = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', weekday: 'short' }).format(n);
  if (d <= n || romeDow === 'Sun' || (romeDow === 'Sat' && n.getUTCHours() >= 13)) {
    // Advance to next valid Mon–Sat morning
    do {
      d = new Date(d.getTime() + 24 * 3600 * 1000);
      d.setUTCHours(7 + hourOffset, remMins, 0, 0);
    } while (
      new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', weekday: 'short' }).format(d) === 'Sun' ||
      d <= n
    );
  }

  // Shift by dayShift weekdays (skipping Sundays)
  let addedDays = 0;
  while (addedDays < dayShift) {
    d = new Date(d.getTime() + 24 * 3600 * 1000);
    d.setUTCHours(7 + hourOffset, remMins, 0, 0);
    const dow = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', weekday: 'short' }).format(d);
    if (dow !== 'Sun') {
      addedDays++;
    }
  }

  return d;
}

/**
 * Generates CEO-level, ultra-concise Italian outreach messages (Email 1, Email 2 Follow-up, and WhatsApp Pitch).
 * Designed for busy fleet owners: presents DOROGO's high customer volume on Lake Como & Milan and asks for:
 * 1. Bus models & exact passenger capacities (plus any unlisted fleet)
 * 2. Point-to-point transfer rates (Milan/Malpensa/Como) + minimum order/transfer minimum
 * 3. Hourly & standby rates (a disposizione 4h/8h)
 * 4. Cancellation policy & advance notice (when noted or inquired)
 * 5. Direct WhatsApp contact for rapid dispatch availability
 */
export function buildBusOutreachDraft(partner = {}, stepKey = 'T1_intro') {
  const rawName = String(partner.name || 'Partner').trim();
  const cleanName = rawName.replace(/\b(S\.?r\.?l\.?|S\.?p\.?A\.?|S\.?n\.?c\.?|Autonoleggio|Autoservizi)\b/gi, '').replace(/\s+/g, ' ').trim() || rawName;
  const city = String(partner.base_city || 'Lago di Como & Milano').split(/[\/,]/)[0].replace(/[\(\)].*$/, '').trim() || 'Lago di Como';
  const seg = inferBusSegment(partner);
  const segmentPhrase = seg === 'luxury'
    ? 'minibus e pullman Luxury VIP (senza scritte / total black)'
    : seg === 'standard'
      ? 'pullman Gran Turismo e minibus per gruppi ed eventi'
      : 'minibus VIP e pullman Gran Turismo (sia linea Luxury sia Standard)';

  const subjectBase = `Collaborazione B2B minibus/pullman · ${city} — DOROGO`;

  // Deep notes-aware personalization: AI inspects Dmitri's operator review comments
  const userNotes = String(partner.notes || '').trim();
  const lowerNotes = userNotes.toLowerCase();
  const isUserAuthored = /^-|\b(i |we |wonder|sure|interested|prices|cancel|sticker|stickers|fit|seats?|posti|tag|how many|\?)/i.test(userNotes);

  const asks50Focus = /focus mostly on 50|focus.*50/i.test(lowerNotes);
  const asksMinibuses = /interested in.*minibus|minibuses/i.test(lowerNotes);
  const asksExtraLong = /extra-?long/i.test(lowerNotes);
  const asks20_26 = /20\s*seat|26\s*seat|20\s*posti|26\s*posti/i.test(lowerNotes);
  const asks19 = /19\s*seat|19\s*posti/i.test(lowerNotes);
  const asksUnlisted = /other buses|not on the website|not add to the website|presented on the website or the 3|only.*or other|altri mezzi|oltre al sito/i.test(lowerNotes);
  const asksCapacity = /how many people|how many the fit|fit\?|quanti posti|capienza/i.test(lowerNotes);
  const asksLuxury = /luxury|consider as vip|lux or not|versione lux/i.test(lowerNotes);
  const asksStickers = /sticker|stickers|adesiv|senza scritte|tags|livrea/i.test(lowerNotes);
  const asksCancellation = /cancel|cancell|disdett|penal/i.test(lowerNotes);
  const asksAdvanceNotice = /in advance|anticipo|preavviso/i.test(lowerNotes);

  // Helper to filter out standalone V-Class/minivans (<8 pax): focus exclusively on Minibuses & larger coaches
  const isMinibusOrCoach = (catStr = '') => {
    const s = String(catStr || '').toLowerCase();
    if (/(classe\s*v|v-?class|viano|vito)/i.test(s) && !/(sprinter|minibus|1[0-9]|2[0-9]|posti|pax)/i.test(s)) {
      return false;
    }
    if (/minivan/i.test(s) && /(?:5|6|7|8)\s*(?:pax|posti|seats)/i.test(s) && !/sprinter|minibus/i.test(s)) {
      return false;
    }
    return true;
  };

  const rawCats = Array.isArray(partner.fleet_categories) ? partner.fleet_categories : [];
  const busCategories = rawCats.filter(isMinibusOrCoach);
  let fleetBullets = '';
  if (busCategories.length > 0) {
    fleetBullets = busCategories.slice(0, 3).map((c) => `• ${c.replace(/mercedes-benz/i, 'Mercedes')}`).join('\n');
  } else if (partner.bus_models && !/classe\s*v|v-?class/i.test(partner.bus_models)) {
    fleetBullets = `• ${partner.bus_models}`;
  }
  const fleetSection = fleetBullets ? `\n\nSul vostro sito abbiamo notato in particolare:\n${fleetBullets}` : '';

  let personalIntro = '';
  if (isUserAuthored) {
    if (asks50Focus) {
      personalIntro = `Ho notato che la vostra flotta si concentra principalmente sui pullman da 50 posti (a cui siamo molto interessati per grandi gruppi ed eventi).`;
    } else if (asksExtraLong && asks20_26) {
      personalIntro = `In particolare siamo molto interessati ai vostri minibus extra-long e ai bus da 20 e 26 posti.`;
    } else if (asks19) {
      personalIntro = `In particolare ho notato il vostro Sprinter 19 posti e vorremmo verificare disponibilità e capienze per questa tipologia di mezzi.`;
    } else if (asksMinibuses) {
      personalIntro = `In particolare siamo molto interessati alla vostra flotta di minibus per transfer e servizi a disposizione.`;
    } else if (asksStickers) {
      personalIntro = `Per i nostri clienti cerchiamo veicoli eleganti senza scritte commerciali o adesivi pubblicitari sulla carrozzeria.`;
    } else if (asksLuxury) {
      personalIntro = `Vorremmo capire meglio la composizione del vostro parco mezzi per verificare la disponibilità di allestimenti Luxury / VIP.`;
    }
  }

  if (stepKey === 'T2_followup') {
    const body = `Buongiorno Team ${cleanName},

Vi scrivo rapidamente in merito alla mia precedente email per verificare disponibilità B2B su Como e Milano per minibus e pullman.

Operiamo con flotta di proprietà V-Class ed S-Class e cerchiamo partner affidabili per gruppi più numerosi (sia linea Luxury sia Standard).

Se per voi è possibile, potete rispondermi direttamente a questa email (oppure su WhatsApp al +32 456 14 14 97) indicando:
- Tariffe B2B per transfer (es. Milano Centro – Malpensa MXP, Milano – Como, con relativo minimo d'ordine)
- Prezzi B2B indicativi per servizio orario e a disposizione (4h / 8h) e tempo minimo di servizio
- Modelli bus disponibili e quanti passeggeri portano per ciascun mezzo
- Politiche di cancellazione e conferma se disponete di veicoli privi di scritte commerciali

Grazie e buon lavoro,
Dmitri Traciuc`;

    return {
      step_name: 'T2_followup',
      language: 'it',
      subject: `Re: ${subjectBase}`,
      body,
      word_count: body.trim().split(/\s+/).length,
    };
  }

  if (stepKey === 'WA_pitch') {
    const extraPersonal = personalIntro ? ` ${personalIntro}` : '';
    const body = `Buongiorno ${cleanName}, sono Dmitri di DOROGO (trasferimenti eventi e matrimoni su Lago di Como e Milano con flotta V-Class ed S-Class). Cerchiamo partner affidabili esclusivamente per minibus (da 8–20 posti) e pullman di capienza maggiore.${extraPersonal} Potreste indicarmi qui su WhatsApp tariffe per transfer (es. Milano – Malpensa con minimo d'ordine) e prezzi per servizio orario e a disposizione (4h/8h)? Grazie mille!\n\nDmitri Traciuc`;
    return {
      step_name: 'WA_pitch',
      language: 'it',
      subject: '',
      body,
      word_count: body.trim().split(/\s+/).length,
    };
  }

  // Default: T1_intro (Tailored CEO-level Italian outreach)
  const questions = [];

  // Question 1: Transfer Pricing (Milan <-> Malpensa MXP / Como + Minimum Order)
  questions.push(`Prezzi B2B indicativi per transfer punto a punto (es. tratta Milano Centro – Aeroporto di Malpensa MXP, con relativo minimo d'ordine e preavviso richiesto)`);

  // Question 2: Hourly / Standby Pricing (4h / 8h + Minimum Service Time)
  questions.push(`Tariffe B2B per servizio orario e a disposizione (es. mezza giornata 4h / giornata intera 8h) e relativo tempo minimo di servizio`);

  // Question 3: Fleet Models, Seating Capacity & Unlisted Fleet
  if (asks50Focus) {
    questions.push(`Oltre ai pullman da 50 posti, avete a disposizione anche minibus o bus in versione Luxury/VIP (o contatti fidati di colleghi da consigliare)? Siamo comunque molto interessati anche ai pullman normali.`);
  } else if (asksUnlisted && (asksMinibuses || asksExtraLong || asks19 || asks20_26)) {
    if (asks19) {
      questions.push(`Disponete solo del modello da 19 posti o avete anche altri modelli/capienze a disposizione in flotta?`);
    } else if (asksExtraLong || asks20_26) {
      questions.push(`Oltre ai minibus extra-long e ai bus da 20 e 26 posti, avete altri modelli a disposizione in flotta? Quanti passeggeri portano per ciascun mezzo?`);
    } else if (asksMinibuses) {
      questions.push(`I minibus disponibili in flotta sono solo i modelli visibili sul sito o ne avete anche altri? Quanti passeggeri portano per ciascun mezzo?`);
    } else {
      questions.push(`Oltre ai modelli visibili sul sito, avete altri minibus/pullman disponibili in flotta e quanti passeggeri portano esattamente?`);
    }
  } else if (asksCapacity) {
    questions.push(`Modelli bus disponibili e quanti passeggeri portano (capienza esatta ed effettiva per ciascun mezzo)`);
  } else {
    questions.push(`Se oltre ai modelli indicati disponete di altri minibus o pullman in flotta (o contatti fidati di colleghi con cui collaborate per capienze maggiori)`);
  }

  // Question 4: Discretion / Zero Stickers / Luxury Line vs Standard
  if (asksStickers) {
    questions.push(`Potreste confermarmi se disponete di mezzi completamente privi di scritte o adesivi commerciali sulla carrozzeria?`);
  } else if (asksLuxury && !asks50Focus) {
    questions.push(`Oltre ai bus turistici standard, disponete anche di mezzi in allestimento Luxury/VIP (interni in pelle, vetri oscurati privacy, total black)?`);
  }

  // Question 5: Cancellation Policy & Advance Booking Notice
  if (asksCancellation && asksAdvanceNotice) {
    questions.push(`Con quanto preavviso richiedete solitamente la prenotazione e quali sono le vostre politiche e penali di cancellazione (cancellation policy)?`);
  } else if (asksCancellation) {
    questions.push(`Quali sono i vostri termini e penali di cancellazione (cancellation policy)?`);
  } else if (asksAdvanceNotice) {
    questions.push(`Con quanto preavviso è necessario prenotare per bloccare i mezzi?`);
  } else if (!asksStickers && !asksLuxury) {
    questions.push(`Termini e penali di cancellazione (cancellation policy)`);
  }

  // Final Question: Direct WhatsApp
  questions.push(`Un vostro contatto WhatsApp diretto per verificare disponibilità rapide`);

  const qLines = questions.map((q, idx) => `${idx + 1}. ${q}`).join('\n');
  const personalLine = personalIntro ? `\n\n${personalIntro}` : '';

  const body = `Buongiorno Team ${cleanName},

Sono Dmitri di DOROGO. Gestiamo trasferimenti per eventi privati e matrimoni sul Lago di Como e Milano con flotta di proprietà Mercedes V-Class, S-Class, E-Class e Maybach.

Per i gruppi più numerosi dei nostri clienti cerchiamo partner affidabili esclusivamente per minibus e pullman di capienza maggiore (sia allestimenti Luxury sia Standard).${fleetSection}${personalLine}

Per collaborare, potreste indicarmi brevemente:
${qLines}

Grazie e buon lavoro,
Dmitri Traciuc`;

  return {
    step_name: 'T1_intro',
    language: 'it',
    subject: subjectBase,
    body,
    word_count: body.trim().split(/\s+/).length,
  };
}

/**
 * Infers standard passenger capacity for a bus model when not explicitly attached.
 */
export function inferDefaultPaxForModel(modelStr = '') {
  const s = String(modelStr || '').toLowerCase();
  const explicitMatch = s.match(/(\d{1,2}\s*(?:[-–]\s*\d{1,2})?)\s*(?:\+1\s*)?(?:pax|posti|passeggeri|seats|s\b)/i);
  if (explicitMatch) return `${explicitMatch[1].replace(/\s+/g, '')} pax`;

  if (/v-?class|classe\s*v|vito|minivan/i.test(s)) return '7–8 pax';
  if (/limobus/i.test(s)) return '18–28 pax';
  if (/sprinter.*vip/i.test(s)) return '8–16 pax';
  if (/sprinter.*(exec|519|516)/i.test(s)) return '16–19 pax';
  if (/sprinter/i.test(s)) return '16–20 pax';
  if (/indcar|midibus|minicoach|daily|navigo|vectio|mago/i.test(s)) return '24–30 pax';
  if (/setra.*vip/i.test(s)) return '28–36 pax';
  if (/setra|tourismo|irizar|scania|lion|neoplan|magelys|evadys|coach|pullman|gt\b/i.test(s)) return '50–56 pax';
  return '';
}

/**
 * AI Verification Gate: Ensures every bus model listed for a partner has an explicit passenger count (how many passengers fit in EACH bus).
 * Accepts either a partner object or `{ bus_models, pax_capacity, fleet_categories }`.
 */
export function verifyPerBusPaxCapacity(input = {}, opts = {}) {
  const isString = typeof input === 'string';
  const rawModelsStr = isString
    ? input
    : String(input.bus_models || input.score_breakdown?.partner_card?.bus_models || '').trim();
  const categories = !isString && Array.isArray(input.fleet_categories) ? input.fleet_categories : [];
  const rawSource = rawModelsStr || categories.join(', ');

  const entries = rawSource
    .split(/[,;/•\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const modelsWithPax = [];
  const modelsMissingPax = [];
  const paxSummaryList = [];

  for (const entry of entries) {
    // Check if entry already contains an explicit passenger count e.g. "(16 pax)" or "16 posti" or "(8–16 seats)"
    const explicitMatch =
      entry.match(/\(?\b(\d{1,2}(?:\s*[-–]\s*\d{1,2})?)\s*(?:\+\s*1\s*)?(?:pax|posti|passeggeri|seats|persone|s)\b\)?/i) ||
      entry.match(/\((\d{1,2}\s*[-–]\s*\d{1,2})\)/);

    const cleanModelName = entry
      .replace(/\s*\(?\b\d{1,2}(?:\s*[-–]\s*\d{1,2})?\s*(?:\+\s*1\s*)?(?:pax|posti|passeggeri|seats|persone|s)\b\)?/gi, '')
      .replace(/\s*\(\d{1,2}\s*[-–]\s*\d{1,2}\)/g, '')
      .replace(/[()]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || entry;

    if (explicitMatch) {
      const paxVal = `${explicitMatch[1].replace(/\s+/g, '').replace(/-/g, '–')} pax`;
      modelsWithPax.push({
        model: cleanModelName,
        pax: paxVal,
        formatted: `${cleanModelName} (${paxVal})`,
        inferred: false,
      });
      paxSummaryList.push(paxVal.replace(/\s*pax$/i, ''));
    } else if (opts.autoInferKnownStandards) {
      const stdPax = inferDefaultPaxForModel(cleanModelName);
      if (stdPax) {
        modelsWithPax.push({
          model: cleanModelName,
          pax: stdPax,
          formatted: `${cleanModelName} (${stdPax})`,
          inferred: true,
        });
        paxSummaryList.push(stdPax.replace(/\s*pax$/i, ''));
      } else {
        modelsMissingPax.push(cleanModelName);
      }
    } else {
      modelsMissingPax.push(cleanModelName);
    }
  }

  const allModelsHavePax = entries.length > 0 && modelsMissingPax.length === 0;
  const formattedBusModels = [
    ...modelsWithPax.map((m) => m.formatted),
    ...modelsMissingPax,
  ].join(', ');

  const uniquePaxRanges = [...new Set(paxSummaryList)];
  const formattedPaxSummary = uniquePaxRanges.length ? `${uniquePaxRanges.join(', ')} pax` : '';

  const followUpQuestionIt = modelsMissingPax.length > 0
    ? `Grazie per la disponibilità! Per registrare correttamente i mezzi, potreste confermarmi quanti passeggeri portano esattamente ciascuno dei seguenti bus: ${modelsMissingPax.join(', ')}?`
    : entries.length === 0
      ? `Grazie! Potreste indicarmi i modelli dei vostri bus e quanti passeggeri porta esattamente ciascun mezzo?`
      : '';

  return {
    allModelsHavePax,
    modelsWithPax,
    modelsMissingPax,
    formattedBusModels,
    formattedPaxSummary,
    followUpQuestionIt,
  };
}

/**
 * Parses an inbound email or WhatsApp reply from a bus operator to extract:
 * - bus_models with per-bus passenger counts attached (e.g. "Mercedes V-Class (7 pax), Sprinter Vip (16 pax), Setra Gt Coach (54 pax)")
 * - pax_capacity (e.g. "7, 16, 54 pax")
 * - rate_hourly (e.g. "€85/h")
 * - rate_standby (e.g. "€420 (4h) · €800 (8h)")
 * - whatsapp (e.g. "+39 348 123 4567")
 * - fleet_segment ('luxury' | 'standard' | 'both')
 * - all_models_have_pax (boolean) & models_missing_pax (array) & follow_up_pax_question (string)
 */
export function parseBusPartnerReply(replyText = '', existingPartner = {}) {
  const text = String(replyText || '').trim();
  if (!text) return {};

  // 1. Extract Bus Models AND pair each model with the passenger count mentioned near it
  const modelPatterns = [
    { re: /sprinter\s*(?:vip|luxury|executive|519|516|416|316)?/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
    { re: /v-?class(?:\s*vip|\s*luxury|\s*executive)?|classe\s*v(?:\s*vip)?|mercedes\s*v\b/gi, label: () => 'Mercedes V-Class' },
    { re: /setra\s*(?:s\s*\d{3}\s*(?:hd|hdh|ul)?|topclass|comfortclass|vip|gt\s*coach)?/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
    { re: /tourismo\s*(?:rhd|m|l|gt)?/gi, label: () => 'Mercedes Tourismo GT' },
    { re: /indcar\s*(?:wing|next|mago\s*2?)?/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
    { re: /limobus(?:\s*vip|\s*lounge)?/gi, label: () => 'Limobus VIP Lounge' },
    { re: /irizar\s*(?:i6s?|i8|pb)?/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
    { re: /iveco\s*(?:daily|magelys|evadys)?/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
    { re: /scania\s*(?:touring|irizar)?/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
    { re: /man\s*lion'?s\s*coach/gi, label: () => "MAN Lion's Coach" },
    { re: /neoplan\s*(?:tourliner|cityliner)?/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
    { re: /otokar\s*(?:navigo|vectio|ulyso)?/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
    { re: /midibus|minibus\s*(?:vip|lusso|gran\s*turismo)?|pullman\s*gt/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
  ];

  const modelsFound = [];
  const modelsSeenBase = new Set();

  for (const pat of modelPatterns) {
    const matches = [...text.matchAll(pat.re)];
    for (const m of matches) {
      const baseName = pat.label(m).replace(/\b\w/g, (c) => c.toUpperCase());
      const normKey = baseName.toLowerCase();
      if (modelsSeenBase.has(normKey)) continue;
      modelsSeenBase.add(normKey);

      // Look immediately after (up to 38 chars) or immediately before (up to 18 chars) this model match for its specific passenger count
      const startIdx = m.index || 0;
      const endIdx = startIdx + m[0].length;
      const afterSlice = text.slice(endIdx, endIdx + 38);
      const beforeSlice = text.slice(Math.max(0, startIdx - 18), startIdx);

      const localPaxAfter = afterSlice.match(/^[^,\n;•]{0,20}?\b(\d{1,2}(?:\s*[-–/]\s*\d{1,2})?)\s*(?:\+\s*1\s*)?(?:posti|pax|passeggeri|seats|persone|p\.?\b)/i);
      const localPaxBefore = beforeSlice.match(/\b(\d{1,2}(?:\s*[-–/]\s*\d{1,2})?)\s*(?:posti|pax|passeggeri|seats)?\s*$/i);

      let pairedModel = baseName;
      if (localPaxAfter) {
        const pVal = localPaxAfter[1].replace(/\s+/g, '').replace(/[/-]/g, '–');
        pairedModel = `${baseName} (${pVal} pax)`;
      } else if (localPaxBefore && parseInt(localPaxBefore[1], 10) >= 6 && parseInt(localPaxBefore[1], 10) <= 85) {
        const pVal = localPaxBefore[1].replace(/\s+/g, '').replace(/[/-]/g, '–');
        pairedModel = `${baseName} (${pVal} pax)`;
      }

      modelsFound.push(pairedModel);
    }
  }

  // 2. Extract Passenger Capacities (how many people fit)
  const paxSet = new Set();
  const paxRegex = /\b(\d{1,2})\s*(?:\+\s*1\s*)?(?:posti|pax|passeggeri|seats|persone|p\.?\b)/gi;
  for (const m of text.matchAll(paxRegex)) {
    const num = parseInt(m[1], 10);
    if (num >= 6 && num <= 85) paxSet.add(num);
  }
  const rangeRegex = /\bda\s+(\d{1,2})\s+a\s+(\d{1,2})\s*(?:posti|pax|passeggeri|seats)?/gi;
  for (const m of text.matchAll(rangeRegex)) {
    const n1 = parseInt(m[1], 10);
    const n2 = parseInt(m[2], 10);
    if (n1 >= 6 && n1 <= 85) paxSet.add(n1);
    if (n2 >= 6 && n2 <= 85) paxSet.add(n2);
  }
  const sortedPax = [...paxSet].sort((a, b) => a - b);
  const pax_capacity = sortedPax.length ? `${sortedPax.join(', ')} pax` : '';

  // If exactly 1 model was found without local pax, and exactly 1 pax number was found in the reply, pair them automatically
  if (modelsFound.length === 1 && !/\(\d/.test(modelsFound[0]) && sortedPax.length === 1) {
    modelsFound[0] = `${modelsFound[0]} (${sortedPax[0]} pax)`;
  }

  // 3. Extract Hourly Rate (servizio orario)
  let rate_hourly = '';
  const hourlyMatch =
    text.match(/(?:€|eur|euro)\s*(\d{2,3})(?:[.,]\d{2})?\s*(?:\/\s*(?:h|ora|hr)|all['’]ora|l['’]ora|orari[oa])/i) ||
    text.match(/(\d{2,3})(?:[.,]\d{2})?\s*(?:€|eur|euro)\s*(?:\/\s*(?:h|ora|hr)|all['’]ora|l['’]ora|orari[oa])/i) ||
    text.match(/(?:tariffa\s+oraria|servizio\s+orario|orario)\s*[:=-]?\s*(?:€|eur|euro)?\s*(\d{2,3})\s*(?:€|eur|euro)?/i);
  if (hourlyMatch) {
    rate_hourly = `€${hourlyMatch[1]}/h`;
  }

  // 4. Extract Standby / A Disposizione Rates (4h / 8h / half-day / full-day)
  const standbyParts = [];
  const disp4h =
    text.match(/(?:4\s*(?:h|ore)|mezza\s+giornata|half\s+day)[^0-9€\n]{0,25}(?:€|eur|euro)?\s*(\d{3,4})\s*(?:€|eur|euro)?/i) ||
    text.match(/(?:€|eur|euro)?\s*(\d{3,4})\s*(?:€|eur|euro)?\s*(?:per\s+|x\s+|\()\s*(?:4\s*(?:h|ore)|mezza\s+giornata)/i);
  if (disp4h) standbyParts.push(`€${disp4h[1]} (4h disp.)`);

  const disp8h =
    text.match(/(?:8\s*(?:h|ore)|10\s*(?:h|ore)|giornata\s+intera|full\s+day)[^0-9€\n]{0,25}(?:€|eur|euro)?\s*(\d{3,4})\s*(?:€|eur|euro)?/i) ||
    text.match(/(?:€|eur|euro)?\s*(\d{3,4})\s*(?:€|eur|euro)?\s*(?:per\s+|x\s+|\()\s*(?:8\s*(?:h|ore)|giornata\s+intera)/i);
  if (disp8h) standbyParts.push(`€${disp8h[1]} (8h disp.)`);

  if (!standbyParts.length) {
    const genericStandby = text.match(/(?:disposizione|stand-?by|a\s+disp\.?)[^0-9€\n]{0,25}(?:€|eur|euro)?\s*(\d{3,4})\s*(?:€|eur|euro)?/i);
    if (genericStandby) standbyParts.push(`€${genericStandby[1]} disp.`);
  }
  const rate_standby = standbyParts.join(' · ');

  // 5. Extract Direct WhatsApp / Mobile Contact
  let whatsapp = '';
  const waMatch =
    text.match(/(?:whatsapp|wa|cell|mobile|diretto|urgenze)[^0-9+\n]{0,20}(\+?\d[\d\s.-]{8,15}\d)/i) ||
    text.match(/(\+39\s*3\d{2}[\s.-]*\d{3}[\s.-]*\d{3,4})/i) ||
    text.match(/\b(3\d{2}[\s.-]?\d{3}[\s.-]?\d{4})\b/);
  if (waMatch) {
    let rawPhone = waMatch[1].replace(/[^\d+]/g, '');
    if (/^3\d{9}$/.test(rawPhone)) rawPhone = `+39 ${rawPhone.slice(0, 3)} ${rawPhone.slice(3, 6)} ${rawPhone.slice(6)}`;
    else if (/^\+393\d{9}$/.test(rawPhone)) rawPhone = `+39 ${rawPhone.slice(3, 6)} ${rawPhone.slice(6, 9)} ${rawPhone.slice(9)}`;
    whatsapp = rawPhone;
  }

  const bus_models = modelsFound.join(', ') || existingPartner.bus_models || '';
  const paxAudit = verifyPerBusPaxCapacity({ bus_models });
  const combined = { ...existingPartner, notes: `${existingPartner.notes || ''} ${text}` };
  const fleet_segment = inferBusSegment(combined);

  return {
    bus_models: paxAudit.formattedBusModels || bus_models,
    pax_capacity: pax_capacity || paxAudit.formattedPaxSummary || existingPartner.pax_capacity || '',
    rate_hourly: rate_hourly || existingPartner.rate_hourly || '',
    rate_standby: rate_standby || existingPartner.rate_standby || '',
    whatsapp: whatsapp || existingPartner.whatsapp || existingPartner.phone || '',
    fleet_segment,
    all_models_have_pax: paxAudit.allModelsHavePax,
    models_with_pax: paxAudit.modelsWithPax,
    models_missing_pax: paxAudit.modelsMissingPax,
    follow_up_pax_question: paxAudit.followUpQuestionIt,
  };
}

/**
 * Decodes Cloudflare `data-cfemail="..."` hex-encoded email addresses.
 */
export function decodeCloudflareEmail(hex = '') {
  try {
    const clean = String(hex || '').trim();
    if (clean.length < 6 || clean.length % 2 !== 0) return '';
    const key = parseInt(clean.slice(0, 2), 16);
    if (Number.isNaN(key)) return '';
    let out = '';
    for (let i = 2; i < clean.length; i += 2) {
      const byte = parseInt(clean.slice(i, i + 2), 16) ^ key;
      out += String.fromCharCode(byte);
    }
    return out.toLowerCase().trim();
  } catch (_) {
    return '';
  }
}

/**
 * Extracts and ranks real business emails printed on an operator's website or Jina Reader output.
 * - Decodes Cloudflare `data-cfemail`, HTML entities (`&#64;`, `&#46;`), and `mailto:` links.
 * - Cleans trailing markdown/HTML link text (e.g. `berini@beriniautonoleggio.com)scrivici`).
 * - Filters out PEC/certified legal mail (`legalmail.it`, `pec.`), web agencies, and placeholders.
 * - Prioritizes emails matching the operator's website domain or official contact prefixes (`info@`, `booking@`, `noleggio@`, `preventivi@`).
 */
export function extractEmailsFromWebsiteHtml(htmlOrText = '', websiteDomain = '') {
  const raw = String(htmlOrText || '');
  if (!raw.trim()) return [];

  const candidates = [];

  // 1. Decode Cloudflare data-cfemail attributes
  const cfMatches = raw.matchAll(/data-cfemail=["']([0-9a-fA-F]+)["']/g);
  for (const m of cfMatches) {
    const decoded = decodeCloudflareEmail(m[1]);
    if (decoded) candidates.push(decoded);
  }

  // 2. Normalize HTML entities & common obfuscations
  const normalized = raw
    .replace(/&#64;|&#x40;|&commat;/gi, '@')
    .replace(/&#46;|&#x2e;|&period;/gi, '.')
    .replace(/\s*(?:\[at\]|\(at\))\s*/gi, '@')
    .replace(/\s*(?:\[dot\]|\(dot\))\s*/gi, '.');

  // 3. Extract explicit mailto: links first (highest confidence)
  const mailtoMatches = normalized.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12})/gi);
  for (const m of mailtoMatches) {
    candidates.push(m[1]);
  }

  // 4. Extract plain-text email patterns
  const textMatches = normalized.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}/g) || [];
  candidates.push(...textMatches);

  const blockedPatterns = /example\.|sentry|wixpress|cloudflare|googleapis|w3\.org|schema\.org|wordpress|jquery|bootstrap|fontawesome|doubleclick|facebook\.com|instagram\.com|2x\.|@2x|\.png$|\.jpg$|\.jpeg$|\.webp$|\.svg$|\.gif$|\.css$|\.js$|legalmail\.it|@pec\.|postacertificata|cert\.|sicurezzapostale|sitebysite\.it|madeinmagic\.it|solutiongroupcomunication\.com|pierobizzotto\.it|your@email|nome@|email@|user@|test@/i;

  const cleanDomain = String(websiteDomain || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .trim();
  const domainCore = cleanDomain.replace(/\.(it|com|eu|net|org|ch)$/i, '').replace(/[-_]/g, '');

  const cleanedSet = new Set();
  for (let c of candidates) {
    // Strip markdown/HTML suffixes that may glue onto TLD (e.g. `.com)scrivici` -> `.com`)
    c = String(c || '')
      .toLowerCase()
      .replace(/^mailto:/i, '')
      .split(/[?#)\s"'<>*,;]/)[0]
      .replace(/\.(it|com|eu|net|org|ch)[a-z]+$/i, (m, tld) => `.${tld}`)
      .replace(/^\.+|\.+$/g, '')
      .trim();

    if (!c || !c.includes('@')) continue;
    const [local, dom] = c.split('@');
    if (!local || !dom || !dom.includes('.')) continue;
    if (local.length < 2 || dom.length < 4) continue;
    if (blockedPatterns.test(c)) continue;
    cleanedSet.add(c);
  }

  const unique = [...cleanedSet];
  // Score and sort candidates so the official website email comes first
  unique.sort((a, b) => {
    const scoreEmail = (em) => {
      let s = 0;
      const [loc, dom] = em.split('@');
      const domCore = dom.replace(/\.(it|com|eu|net|org|ch)$/i, '').replace(/[-_]/g, '');
      if (cleanDomain && dom === cleanDomain) s += 50;
      else if (domainCore && domainCore.length >= 4 && (domCore.includes(domainCore) || domainCore.includes(domCore))) s += 35;
      if (/^(info|booking|prenotazioni|noleggio|preventivi|commerciale|contatti|limo|bus|office)$/i.test(loc)) s += 20;
      if (/^(amministrazione|fatture|privacy|dpo|hr|jobs|lavora)$/i.test(loc)) s -= 15;
      return s;
    };
    return scoreEmail(b) - scoreEmail(a);
  });

  return unique;
}

/**
 * Zero-Hallucination Fleet & Passenger Capacity Extractor from live website / fleet page text.
 * - Extracts ONLY vehicle categories & models explicitly mentioned on the website, along with their exact passenger capacities (`posti`, `pax`, `seats`, `passeggeri`).
 * - Marks a vehicle or operator as `'luxury'` ONLY when the website explicitly uses luxury/VIP terminology (`lusso`, `luxury`, `vip`, `limobus`, `top class`, `total black`, `poltrone in pelle`, `classe v`) for that vehicle.
 */
export function extractFleetFromWebsiteText(text = '') {
  const raw = String(text || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!raw) {
    return {
      fleet_categories: [],
      bus_models: '',
      pax_capacity: '',
      fleet_segment: 'standard',
      has_explicit_luxury: false,
    };
  }

  const lower = raw.toLowerCase();
  const hasExplicitLuxuryPage = /\b(vip|luxury|lusso|limobus|vip\s*lounge|top\s*class|allestimento\s*vip|total\s*black|poltrone\s*in\s*pelle)\b/i.test(lower);

  // Extract all explicit passenger seat numbers mentioned next to posti/pax/seats/passeggeri (between 5 and 94 pax for vans/buses)
  const paxSet = new Set();
  const rangeRegex = /\b(\d{1,2})\s*(?:[-/–a]|fino\s+a|or|to)\s*(\d{1,2})\s*(?:posti|pax|passeggeri|seats|persone)\b/gi;
  for (const m of raw.matchAll(rangeRegex)) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    if (a >= 5 && a <= 95 && b >= 5 && b <= 95 && a < b) {
      paxSet.add(`${a}–${b}`);
    }
  }

  const singleRegex = /\b(?:da\s+|fino\s+a\s+|up\s+to\s+)?(\d{1,2})\s*(?:\+\s*\d\s*(?:guida|autista|hostess)\s*)*\s*(?:posti|pax|passeggeri|seats)\b/gi;
  for (const m of raw.matchAll(singleRegex)) {
    const n = parseInt(m[1], 10);
    if (n >= 5 && n <= 95) {
      paxSet.add(String(n));
    }
  }

  const categories = [];
  const models = [];

  // 1. V-Class / Viano / Minivan (5–8 pax)
  if (/\b(classe\s*v|v-?class|viano|vito|minivan|monovolume)\b/i.test(raw)) {
    const isVClass = /\b(classe\s*v|v-?class)\b/i.test(raw);
    const isLuxVan = isVClass || /(?:viano|minivan|monovolume|van)[^.]{0,50}(?:lusso|luxury|vip|exclusive|pelle)/i.test(raw) || /(?:lusso|luxury|vip)[^.]{0,50}(?:viano|minivan|monovolume|classe\s*v|v-?class)/i.test(raw);
    const vanPax = [...paxSet].filter((p) => {
      const n = parseInt(p, 10);
      return n >= 5 && n <= 8;
    });
    const paxLabel = vanPax.length > 0 ? `${vanPax.join('/')} pax` : '7–8 pax';
    if (isLuxVan) {
      categories.push(`Mercedes-Benz V-Class Luxury (${paxLabel.replace('pax', 'seats')})`);
      models.push(`Mercedes-Benz V-Class Luxury (${paxLabel})`);
    } else {
      const vanName = /\bviano\b/i.test(raw) ? 'Mercedes Viano' : 'Minivan NCC';
      categories.push(`${vanName} (${paxLabel.replace('pax', 'seats')})`);
      models.push(`${vanName} (${paxLabel})`);
    }
  }

  // 2. Mercedes Sprinter / Daily / Transit Minibus (8–22 pax)
  if (/\b(sprinter|minibus|pulmino|pulmini|iveco\s*daily|ford\s*transit|gran\s*capri)\b/i.test(raw)) {
    const isLuxSprinter = /(?:sprinter|minibus|pulmin[oi])[^.]{0,65}(?:vip|luxury|lusso|total\s*black|tomassini|pelle|lounge)/i.test(raw) ||
      /(?:vip|luxury|lusso)[^.]{0,65}(?:sprinter|minibus|pulmin[oi])/i.test(raw);
    const miniPax = [...paxSet].filter((p) => {
      const n = parseInt(p.split(/[–-]/)[0], 10);
      return n >= 8 && n <= 22;
    });
    const paxLabel = miniPax.length > 0 ? `${miniPax.slice(0, 3).join(', ')} pax` : '8–20 pax';
    const brand = /\bsprinter\b/i.test(raw)
      ? 'Mercedes-Benz Sprinter'
      : /\biveco\s*daily\b/i.test(raw)
        ? 'Iveco Daily Minibus'
        : /\bford\s*transit\b/i.test(raw)
          ? 'Ford Transit Minibus'
          : 'Minibus';

    if (isLuxSprinter) {
      categories.push(`${brand} VIP / Luxury (${paxLabel.replace('pax', 'seats')})`);
      models.push(`${brand} VIP / Luxury (${paxLabel})`);
    } else {
      categories.push(`${brand} (${paxLabel.replace('pax', 'seats')})`);
      models.push(`${brand} (${paxLabel})`);
    }
  }

  // 3. Limobus / Custom VIP Lounge Bus (18–35 pax) — strictly only when explicitly mentioned!
  if (/\b(limobus|bus\s*lusso|bus\s*di\s*lusso|allestimento\s*vip\s*lounge)\b/i.test(raw)) {
    const limoPax = [...paxSet].filter((p) => {
      const n = parseInt(p.split(/[–-]/)[0], 10);
      return n >= 18 && n <= 35;
    });
    const paxLabel = limoPax.length > 0 ? `${limoPax.slice(0, 2).join(', ')} pax` : '19–30 pax';
    categories.push(`Limobus / Bus di Lusso VIP (${paxLabel.replace('pax', 'seats')})`);
    models.push(`Limobus VIP (${paxLabel})`);
  }

  // 4. Midibus (24–40 pax)
  const midiPax = [...paxSet].filter((p) => {
    const n = parseInt(p.split(/[–-]/)[0], 10);
    return n >= 24 && n <= 40;
  });
  if (/\b(midibus|midi-?coach|minicoach|tourengo|mago\s*2|iveco\s*wing|temsa|king\s*long|calipso|smile)\b/i.test(raw) || midiPax.length > 0) {
    const paxLabel = midiPax.length > 0 ? `${midiPax.slice(0, 3).join(', ')} pax` : '25–32 pax';
    const midiBrand = /\btourengo\b/i.test(raw)
      ? 'Mercedes Tourengo Midibus'
      : /\btemsa\b/i.test(raw)
        ? 'Temsa Midibus'
        : /\biveco\b/i.test(raw)
          ? 'Iveco Midibus'
          : 'Midibus';
    categories.push(`${midiBrand} (${paxLabel.replace('pax', 'seats')})`);
    models.push(`${midiBrand} (${paxLabel})`);
  }

  // 5. Large GT Coaches / Pullman (42–94 pax)
  const gtPax = [...paxSet].filter((p) => {
    const n = parseInt(p.split(/[–-]/)[0], 10);
    return n >= 42 && n <= 95;
  });
  if (/\b(tourismo|setra|irizar|neoplan|magelys|gran\s*turismo|pullman|autobus\s*gt|volvo\s*9700)\b/i.test(raw) || gtPax.length > 0) {
    const paxLabel = gtPax.length > 0 ? `${gtPax.slice(0, 4).join(', ')} pax` : '50–56 pax';
    const gtBrands = [];
    if (/\bsetra\b/i.test(raw)) gtBrands.push('Setra');
    if (/\btourismo\b/i.test(raw)) gtBrands.push('Mercedes Tourismo');
    if (/\birizar\b/i.test(raw)) gtBrands.push('Irizar');
    if (/\bneoplan\b/i.test(raw)) gtBrands.push('Neoplan');
    if (/\bmagelys\b/i.test(raw)) gtBrands.push('Iveco Magelys');
    const brandTitle = gtBrands.length > 0 ? `${gtBrands.join(' / ')} GT Coach` : 'Pullman Gran Turismo';
    const isLuxCoach = /\b(pullman\s*di\s*lusso|pullman\s*lusso|gran\s*turismo\s*lusso|\bgtl\b|top\s*class)\b/i.test(raw);
    const label = isLuxCoach ? `${brandTitle} Lusso` : brandTitle;
    categories.push(`${label} (${paxLabel.replace('pax', 'seats')})`);
    models.push(`${label} (${paxLabel})`);
  }

  const bus_models = models.join(', ');
  const pax_capacity = paxSet.size > 0 ? `${[...paxSet].join(', ')} pax` : '';
  const fleet_segment = inferBusSegment({ fleet_categories: categories, bus_models });

  const has_explicit_luxury = hasExplicitLuxuryPage && (fleet_segment === 'luxury' || fleet_segment === 'both');

  return {
    fleet_categories: categories,
    fleetCategories: categories,
    bus_models,
    busModels: bus_models,
    pax_capacity,
    paxCapacity: pax_capacity,
    fleet_segment,
    fleetSegment: fleet_segment,
    has_explicit_luxury,
    hasExplicitLuxury: has_explicit_luxury,
  };
}

/**
 * Builds the 4-Column Interactive Visual Pipeline Flow (Sankey Diagram) for Bus Partners,
 * focusing strictly on high-signal decision steps with semantic color coding:
 * Column 0 (1. BUS CLASS): Allocated Bus Segment (Luxury VIP vs Luxury & Standard vs Standard GT)
 * Column 1 (2. VEHICLES & PAX): Allocated Bus Size & Passenger Capacity (7–20 pax Vans/Sprinters, 18–30 pax Midibus/Limobus, 50–56 pax GT Coaches)
 * Column 2 (3. OUTREACH STAGE): Current Pipeline Status (Want to Contact, Contacted, To Check, Approved)
 * Column 3 (4. GOAL: RATES & WA): Deliverables Progress toward 10-Reply Target (Has Rates & WA, Waiting Reply, Ready to Pitch, Needs Email Check)
 */
export function buildBusSankeyFlow(partners = [], selectedNodes = {}) {
  const list = Array.isArray(partners) ? partners : [];
  const svgWidth = 960;
  const barWidth = 10;
  const colPositions = [18, 265, 515, 760];
  const minBarHeight = 14;
  const nodeGap = 14;

  const classifyCol = (p, colIdx) => {
    if (colIdx === 0) {
      const seg = inferBusSegment(p);
      if (seg === 'luxury') return { key: 'seg:luxury', label: '✨ Luxury VIP Fleet', tone: 'gold', order: 1 };
      if (seg === 'both') return { key: 'seg:both', label: '✨+🚌 Luxury & Standard', tone: 'purple', order: 2 };
      return { key: 'seg:standard', label: '🚌 Standard GT Charter', tone: 'info', order: 3 };
    }
    if (colIdx === 1) {
      const busText = `${(p.fleet_categories || []).join(' ')} ${p.bus_models || ''}`.toLowerCase();
      const hasSmall = /v-?class|vito|minivan|sprinter/i.test(busText);
      const hasMid = /midibus|midi-?coach|minicoach|indcar|limobus/i.test(busText);
      const hasLarge = /tourismo|setra|gt\b|gran\s*turismo|coach|pullman|50|52|54|56/i.test(busText);

      if (hasSmall && hasLarge) return { key: 'pax:mixed', label: '🚐+🚍 Vans & GT Coaches', tone: 'purple', order: 2 };
      if (hasSmall && hasMid) return { key: 'pax:small_mid', label: '🚐 Sprinters & Midibus (8–30p)', tone: 'gold', order: 1 };
      if (hasSmall) return { key: 'pax:minibus', label: '🚐 VIP Vans & Sprinters (7–20p)', tone: 'gold', order: 1 };
      if (hasMid && !hasLarge) return { key: 'pax:midibus', label: '🚌 Midibus & Limobus (18–30p)', tone: 'teal', order: 3 };
      if (hasLarge) return { key: 'pax:coach', label: '🚍 GT Coaches (30–56 pax)', tone: 'info', order: 4 };
      return { key: 'pax:minibus', label: '🚐 VIP Vans & Sprinters (7–20p)', tone: 'gold', order: 1 };
    }
    if (colIdx === 2) {
      const st = p.status || 'TO_REVIEW';
      if (st === 'APPROVED_PARTNER') return { key: 'status:APPROVED_PARTNER', label: '🤝 4. Approved Partner', tone: 'ok', order: 1 };
      if (st === 'CONTACTED') return { key: 'status:CONTACTED', label: '✉️ 3. Contacted', tone: 'info', order: 2 };
      if (st === 'WANT_TO_CONTACT') return { key: 'status:WANT_TO_CONTACT', label: '⏳ 2. In Queue (Spaced Mon–Sat)', tone: 'purple', order: 3 };
      if (st === 'REJECTED' || st === 'NOT_RELEVANT') return { key: 'status:CLOSED', label: '🚫 Closed / Disqualified', tone: 'bad', order: 5 };
      return { key: 'status:TO_REVIEW', label: '🔍 1. To Check', tone: 'warn', order: 4 };
    }
    // colIdx === 3: Deliverables & Weekly 10-Reply Goal
    const stage = getBusOutreachStage(p);
    const hasRates = Boolean(p.rate_hourly || p.rate_standby || p.replied_at || stage === 'replied' || stage === 'partner_won');
    if (hasRates) {
      return { key: 'goal:replied_rates', label: '💶 Replied · Rates & WA 🎯', tone: 'ok', order: 1 };
    }
    if (p.status === 'CONTACTED' || stage === 't1_sent' || stage === 't2_sent') {
      return { key: 'goal:waiting_reply', label: '📨 Sent · Waiting Reply', tone: 'info', order: 2 };
    }
    if (p.status === 'WANT_TO_CONTACT' || stage === 'ready') {
      return { key: 'goal:ready_pitch', label: '⏳ In Queue (Mon–Sat Spaced)', tone: 'purple', order: 3 };
    }
    if (p.status === 'REJECTED' || p.status === 'NOT_RELEVANT' || stage === 'closed') {
      return { key: 'goal:closed', label: '🚫 Skipped / Not Local', tone: 'bad', order: 5 };
    }
    return { key: 'goal:needs_check', label: '🔍 Check Email First', tone: 'warn', order: 4 };
  };

  // Determine which partners match the current node selection across columns
  const matchesSelection = (p) => {
    for (const [colStr, nodeKey] of Object.entries(selectedNodes || {})) {
      if (!nodeKey) continue;
      const cIdx = Number(colStr);
      const info = classifyCol(p, cIdx);
      if (info.key !== nodeKey) return false;
    }
    return true;
  };

  const matchedIds = new Set(list.filter(matchesSelection).map((p) => p.id));
  const hasSelection = Object.values(selectedNodes || {}).some(Boolean);

  // Build nodes per column
  const columns = [0, 1, 2, 3].map((colIdx) => {
    const map = new Map();
    for (const p of list) {
      const info = classifyCol(p, colIdx);
      if (!map.has(info.key)) {
        map.set(info.key, { ...info, count: 0, matchedCount: 0, totalScore: 0, ids: [] });
      }
      const g = map.get(info.key);
      g.count++;
      g.totalScore += (p.relevance_score || 0);
      g.ids.push(p.id);
      if (matchedIds.has(p.id)) g.matchedCount++;
    }
    const nodes = [...map.values()].sort((a, b) => a.order - b.order || b.count - a.count);
    return {
      index: colIdx,
      x: colPositions[colIdx],
      total: list.length,
      nodes,
    };
  });

  // Compute vertical geometry
  const maxNodes = Math.max(1, ...columns.map((c) => c.nodes.length));
  const usableHeight = Math.max(185, maxNodes * 44);
  let maxBottom = 210;

  for (const col of columns) {
    let curY = 10;
    const totalCount = Math.max(1, col.total);
    for (const n of col.nodes) {
      n.shareOfCol = n.count / totalCount;
      n.avgScore = n.count ? Math.round(n.totalScore / n.count) : 0;
      n.barHeight = Math.max(minBarHeight, Math.round(n.shareOfCol * usableHeight));
      n.slotHeight = Math.max(n.barHeight, 34);
      n.x = col.x;
      n.y = curY;
      n.selected = selectedNodes?.[col.index] === n.key;
      n.highlighted = !hasSelection || n.matchedCount > 0;
      curY += n.slotHeight + nodeGap;
    }
    if (curY > maxBottom) maxBottom = curY;
  }

  // Build links between adjacent columns
  const links = [];
  for (let colIdx = 0; colIdx < 3; colIdx++) {
    const srcCol = columns[colIdx];
    const dstCol = columns[colIdx + 1];
    const srcMap = new Map(srcCol.nodes.map((n) => [n.key, n]));
    const dstMap = new Map(dstCol.nodes.map((n) => [n.key, n]));

    const pairMap = new Map();
    for (const p of list) {
      const sInfo = classifyCol(p, colIdx);
      const dInfo = classifyCol(p, colIdx + 1);
      const pairKey = `${sInfo.key}__${dInfo.key}`;
      if (!pairMap.has(pairKey)) {
        pairMap.set(pairKey, {
          col: colIdx,
          sourceKey: sInfo.key,
          targetKey: dInfo.key,
          sourceLabel: sInfo.label,
          targetLabel: dInfo.label,
          tone: sInfo.tone,
          count: 0,
          matchedCount: 0,
        });
      }
      const link = pairMap.get(pairKey);
      link.count++;
      if (matchedIds.has(p.id)) link.matchedCount++;
    }

    const srcOffsets = new Map();
    const dstOffsets = new Map();

    for (const l of pairMap.values()) {
      const sNode = srcMap.get(l.sourceKey);
      const dNode = dstMap.get(l.targetKey);
      if (!sNode || !dNode) continue;

      const sUsed = srcOffsets.get(l.sourceKey) || 0;
      const dUsed = dstOffsets.get(l.targetKey) || 0;

      const sThickness = Math.max(3, Math.round((l.count / Math.max(1, sNode.count)) * sNode.barHeight));
      const dThickness = Math.max(3, Math.round((l.count / Math.max(1, dNode.count)) * dNode.barHeight));
      const thickness = Math.max(3, Math.round((sThickness + dThickness) / 2));

      const y0Top = sNode.y + sUsed;
      const y1Top = dNode.y + dUsed;
      srcOffsets.set(l.sourceKey, sUsed + sThickness);
      dstOffsets.set(l.targetKey, dUsed + dThickness);

      const x0 = sNode.x + barWidth;
      const x1 = dNode.x;
      const cx = Math.round((x0 + x1) / 2);

      const y0Bot = y0Top + thickness;
      const y1Bot = y1Top + thickness;

      l.d = `M ${x0} ${y0Top} C ${cx} ${y0Top}, ${cx} ${y1Top}, ${x1} ${y1Top} L ${x1} ${y1Bot} C ${cx} ${y1Bot}, ${cx} ${y0Bot}, ${x0} ${y0Bot} Z`;
      l.highlighted = !hasSelection || l.matchedCount > 0;
      links.push(l);
    }
  }

  return {
    svgWidth,
    svgHeight: maxBottom + 6,
    barWidth,
    columns,
    links,
    matchedIds,
    hasSelection,
  };
}

