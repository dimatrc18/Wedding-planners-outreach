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
 * Infers whether a bus operator offers Luxury VIP, Standard GT/Charter, or Both.
 */
export function inferBusSegment(partner = {}) {
  const explicit = partner.fleet_segment || partner.score_breakdown?.partner_card?.fleet_segment;
  if (explicit && ['luxury', 'standard', 'both'].includes(explicit)) return explicit;

  const text = `${partner.name || ''} ${(partner.fleet_categories || []).join(' ')} ${partner.unbranded_status || ''} ${partner.notes || ''}`.toLowerCase();
  const hasLux = /vip|limobus|lounge|v-?class|total\s+black|exclusive|luxury/i.test(text) || (partner.relevance_score || 0) >= 85;
  const hasStd = /tourismo|setra|gt\b|gran\s+turismo|coach|pullman|iveco|scania|irizar|50|52|54|56|60|64/i.test(text);

  if (hasLux && hasStd) return 'both';
  if (hasLux) return 'luxury';
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

  return { ok: true, reason: 'allowed_mon_sat', dow };
}

/**
 * Computes the next valid Mon–Sat send slot (skipping Sunday unless replying to a Sunday inbound).
 */
export function nextBusSendSlot(now = new Date(), indexOffset = 0, opts = {}) {
  const base = new Date((now instanceof Date ? now : new Date(now)).getTime() + indexOffset * 8 * 60000);
  const check = canSendBusOutreach({ email: 'ok@ok.it', email_status: 'verified' }, base, opts);
  if (check.ok) return base;
  // If Sunday, advance to Monday 09:00 Europe/Rome
  const nextMon = new Date(base.getTime() + 24 * 3600 * 1000);
  nextMon.setUTCHours(8, 0 + (indexOffset * 7) % 50, 0, 0);
  return nextMon;
}

/**
 * Generates CEO-level, ultra-concise Italian outreach messages (Email 1, Email 2 Follow-up, and WhatsApp Pitch).
 * Designed for busy fleet owners: presents DOROGO's high customer volume on Lake Como & Milan and asks for:
 * 1. Bus models & passenger capacities
 * 2. Standby (a disposizione 4h/8h) & hourly rates
 * 3. Direct WhatsApp contact
 */
export function buildBusOutreachDraft(partner = {}, stepKey = 'T1_intro') {
  const rawName = String(partner.name || 'Partner').trim();
  const cleanName = rawName.replace(/\b(S\.?r\.?l\.?|S\.?p\.?A\.?|S\.?n\.?c\.?|Autonoleggio|Autoservizi)\b/gi, '').replace(/\s+/g, ' ').trim() || rawName;
  const city = String(partner.base_city || 'Lago di Como & Milano').split(/[\/,]/)[0].trim();
  const seg = inferBusSegment(partner);
  const segmentPhrase = seg === 'luxury'
    ? 'minibus e pullman Luxury VIP (senza scritte / total black)'
    : seg === 'standard'
      ? 'pullman Gran Turismo e minibus per gruppi ed eventi'
      : 'minibus VIP e pullman Gran Turismo (sia linea Luxury sia Standard)';

  const subjectBase = `Collaborazione B2B minibus/pullman · ${city} — DOROGO`;

  if (stepKey === 'T2_followup') {
    const body = `Buongiorno Team ${cleanName},

Vi scrivo rapidamente in merito alla mia precedente email per capire se avete disponibilità per collaborazioni B2B su Como e Milano in questa stagione.

Se per voi è più veloce, potete scrivermi direttamente su WhatsApp al +32 456 14 14 97 indicandomi:
- Modelli bus e capienza posti
- Tariffa indicativa oraria e a disposizione (4h / 8h)

Grazie e buon lavoro,
Dmitri Traciuc
DOROGO · Lago di Como & Milano | WhatsApp: +32 456 14 14 97`;

    return {
      step_name: 'T2_followup',
      language: 'it',
      subject: `Re: ${subjectBase}`,
      body,
      word_count: body.trim().split(/\s+/).length,
    };
  }

  if (stepKey === 'WA_pitch') {
    const body = `Buongiorno ${cleanName}, sono Dmitri di DOROGO (trasferimenti eventi e matrimoni sul Lago di Como e Milano). Abbiamo moltissime richieste dai nostri clienti per ${segmentPhrase} e vorremmo affidare i servizi a un partner di fiducia in zona ${city}. Potreste indicarmi brevemente qui su WhatsApp quali modelli avete (e quanti passeggeri portano) e i vostri prezzi B2B indicativi per servizio orario e a disposizione (4h/8h)? Grazie mille!`;
    return {
      step_name: 'WA_pitch',
      language: 'it',
      subject: '',
      body,
      word_count: body.trim().split(/\s+/).length,
    };
  }

  // Default: T1_intro (CEO-level Italian Intro, ~75 words)
  const body = `Buongiorno Team ${cleanName},

Sono Dmitri di DOROGO. Gestiamo i trasferimenti per eventi privati e matrimoni sul Lago di Como e Milano con la nostra flotta V-Class e S-Class, e abbiamo un forte volume di clienti che ci richiedono ${segmentPhrase} che vorremmo affidare a un partner di fiducia.

Per collaborare sulle prossime date, potreste indicarmi brevemente:
1. Modelli bus disponibili e quanti passeggeri portano
2. Prezzi B2B indicativi per servizio orario e a disposizione (4h / 8h)
3. Un vostro contatto WhatsApp diretto per le disponibilità rapide

Grazie e buon lavoro,
Dmitri Traciuc
DOROGO · Lago di Como & Milano
dmitri@dorogo.eu | WhatsApp: +32 456 14 14 97`;

  return {
    step_name: 'T1_intro',
    language: 'it',
    subject: subjectBase,
    body,
    word_count: body.trim().split(/\s+/).length,
  };
}

/**
 * Parses an inbound email or WhatsApp reply from a bus operator to extract:
 * - bus_models (e.g. "Mercedes Sprinter VIP, Setra S515 HD, Indcar Wing")
 * - pax_capacity (e.g. "16, 28, 52 pax")
 * - rate_hourly (e.g. "€85/h")
 * - rate_standby (e.g. "€420 (4h) · €800 (8h)")
 * - whatsapp (e.g. "+39 348 123 4567")
 * - fleet_segment ('luxury' | 'standard' | 'both')
 */
export function parseBusPartnerReply(replyText = '', existingPartner = {}) {
  const text = String(replyText || '').trim();
  if (!text) return {};

  // 1. Extract Bus Models
  const modelPatterns = [
    { re: /sprinter\s*(?:vip|luxury|executive|519|516|416|316)?/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
    { re: /v-?class|classe\s*v|mercedes\s*v\b/gi, label: () => 'Mercedes V-Class' },
    { re: /setra\s*(?:s\s*\d{3}\s*(?:hd|hdh|ul)?|topclass|comfortclass|vip)?/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
    { re: /tourismo\s*(?:rhd|m|l)?/gi, label: () => 'Mercedes Tourismo GT' },
    { re: /indcar\s*(?:wing|next|mago\s*2?)?/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
    { re: /limobus/gi, label: () => 'Limobus VIP Lounge' },
    { re: /irizar\s*(?:i6s?|i8|pb)?/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
    { re: /iveco\s*(?:daily|magelys|evadys)?/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
    { re: /scania\s*(?:touring|irizar)?/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
    { re: /man\s*lion'?s\s*coach/gi, label: () => "MAN Lion's Coach" },
    { re: /neoplan\s*(?:tourliner|cityliner)?/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
    { re: /otokar\s*(?:navigo|vectio|ulyso)?/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
    { re: /midibus|minibus\s*(?:vip|lusso|gran\s*turismo)?|pullman\s*gt/gi, label: (m) => m[0].replace(/\s+/g, ' ').trim() },
  ];
  const modelsFound = [];
  for (const pat of modelPatterns) {
    const matches = [...text.matchAll(pat.re)];
    for (const m of matches) {
      const formatted = pat.label(m).replace(/\b\w/g, (c) => c.toUpperCase());
      if (!modelsFound.some((x) => x.toLowerCase() === formatted.toLowerCase())) {
        modelsFound.push(formatted);
      }
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

  const bus_models = modelsFound.join(', ');
  const combined = { ...existingPartner, notes: `${existingPartner.notes || ''} ${text}` };
  const fleet_segment = inferBusSegment(combined);

  return {
    bus_models: bus_models || existingPartner.bus_models || '',
    pax_capacity: pax_capacity || existingPartner.pax_capacity || '',
    rate_hourly: rate_hourly || existingPartner.rate_hourly || '',
    rate_standby: rate_standby || existingPartner.rate_standby || '',
    whatsapp: whatsapp || existingPartner.whatsapp || existingPartner.phone || '',
    fleet_segment,
  };
}

/**
 * Builds the 4-Column Interactive Visual Pipeline Flow (Sankey Diagram) for Bus Partners:
 * Column 0 (CLASS): Bus Segment (Luxury VIP vs Standard GT vs Both)
 * Column 1 (TOWN): Base Depot Town (Milano, Como, Bergamo, Verona/Garda, etc.)
 * Column 2 (FIT): Relevance Score Tier (/100)
 * Column 3 (STAGE): Current Outreach & Rate Stage
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
      if (seg === 'luxury') return { key: 'seg:luxury', label: 'Luxury VIP Unbranded', tone: 'gold', order: 1 };
      if (seg === 'both') return { key: 'seg:both', label: 'Luxury & Standard Fleet', tone: 'ok', order: 2 };
      return { key: 'seg:standard', label: 'Standard GT / Charter', tone: 'info', order: 3 };
    }
    if (colIdx === 1) {
      const rawCity = String(p.base_city || 'Northern Italy').split(/[\/,]/)[0].trim();
      if (/milan|monza/i.test(rawCity)) return { key: 'city:milano', label: 'Milano & Monza', tone: 'info', order: 1 };
      if (/como|bellagio|cernobbio|lecco|lari/i.test(rawCity)) return { key: 'city:como', label: 'Lake Como & Lecco', tone: 'ok', order: 2 };
      if (/bergamo|brescia/i.test(rawCity)) return { key: 'city:bergamo', label: 'Bergamo & Brescia', tone: 'gold', order: 3 };
      if (/verona|garda|peschiera/i.test(rawCity)) return { key: 'city:garda', label: 'Verona & Lake Garda', tone: 'info', order: 4 };
      if (/bormio|sondrio|alps/i.test(rawCity)) return { key: 'city:alps', label: 'Alps & Valtellina', tone: 'muted', order: 5 };
      return { key: 'city:other', label: 'Other Northern Hubs', tone: 'muted', order: 6 };
    }
    if (colIdx === 2) {
      const sc = p.relevance_score || 0;
      if (sc >= 80) return { key: 'fit:high', label: 'Top Fit (80–100)', tone: 'ok', order: 1 };
      if (sc >= 65) return { key: 'fit:mid', label: 'Good Fit (65–79)', tone: 'gold', order: 2 };
      return { key: 'fit:std', label: 'Standard Reserve (<65)', tone: 'muted', order: 3 };
    }
    // colIdx === 3: Outreach & Rate Stage
    const st = getBusOutreachStage(p);
    const meta = BUS_OUTREACH_STAGES.find((s) => s.key === st) || BUS_OUTREACH_STAGES[0];
    const orderMap = { partner_won: 1, replied: 2, t2_sent: 3, t1_sent: 4, ready: 5, to_check: 6, closed: 7 };
    return { key: `stage:${meta.key}`, rawKey: meta.key, label: meta.label, tone: meta.tone, order: orderMap[meta.key] || 9 };
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

