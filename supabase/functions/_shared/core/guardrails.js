// Strict runtime schema & ground-truth guardrails for Gemini JSON outputs.
// Prevents malformed AI JSON, hallucinated venues/hooks, invalid enum values, or off-brand copy
// from ever corrupting a prospect record or creating an invalid outbound draft.

import { BANNED, lintMessage, wordCount } from './lint.js';
import { RATE_CARD } from './ratecard.js';
import { stripSignOff } from './drafts.js';

const HOOK_TYPES = new Set(['venue', 'event', 'style', 'press', 'award', 'other']);
const CONFIDENCE_LEVELS = new Set(['high', 'medium', 'low']);
const LANGUAGES = new Set(['en', 'it', 'de', 'fr', 'ru']);
const SEGMENTS = new Set(['boutique_local', 'high_volume_uk_us', 'international']);
const SENTIMENTS = new Set(['positive', 'neutral', 'negative', 'ooo', 'unsubscribe']);
const INTENTS = new Set([
  'wants_rate_card', 'asks_pricing', 'has_supplier', 'not_now',
  'referral_to_other', 'meeting_request', 'specific_question',
]);
const GENERIC_CONTACT_NAMES = /^(info|contact|contatti|team|staff|admin|office|wedding|weddings|events|eventi|studio|hello|ciao|reception|press|inquiries|enquiries)$/i;

export const normText = (s = '') =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function cleanContactName(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed || trimmed.length < 2 || trimmed.length > 80) return null;
  const firstToken = trimmed.split(' ')[0];
  if (GENERIC_CONTACT_NAMES.test(trimmed) || GENERIC_CONTACT_NAMES.test(firstToken)) return null;
  if (!/^[\p{L}\s'’.-]+$/u.test(trimmed)) return null;
  return trimmed;
}

// Ground-truth check: a hook is only trusted when its evidence is verbatim on the scraped page
// and it respects DOROGO's calm luxury rules (<= 30 words, no !, no ?, no banned phrases).
export function checkHook(out, pageText = '') {
  if (!out || typeof out !== 'object' || !String(out.hook || '').trim()) {
    return {
      ...(out || {}),
      hook: '',
      confidence: 'low',
      needs_review: true,
      evidence_found: false,
    };
  }
  const hook = String(out.hook).trim();
  const evidence = String(out.evidence || '').trim();
  const normPage = normText(pageText);
  const normEv = normText(evidence);
  const found = Boolean(normEv && normEv.length >= 6 && normPage.includes(normEv));
  const banned = BANNED.some((b) => b.re.test(hook));
  const hasExclamationOrQuestion = /[!?]/.test(hook);
  const tooLong = wordCount(hook) > 32;
  const rawConf = CONFIDENCE_LEVELS.has(out.confidence) ? out.confidence : 'medium';
  const confidence = (!found || banned || hasExclamationOrQuestion || tooLong) ? 'low' : rawConf;
  return {
    ...out,
    hook,
    evidence,
    confidence,
    evidence_found: found,
    needs_review: confidence !== 'high' || banned || hasExclamationOrQuestion || tooLong,
  };
}

export function validateHookOutput(raw, pageText = '') {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Guardrail: hook output must be a JSON object');
  }
  const normPage = normText(pageText);
  const hook = typeof raw.hook === 'string' ? raw.hook.trim().slice(0, 260) : '';
  const hook_type = HOOK_TYPES.has(raw.hook_type) ? raw.hook_type : 'other';
  const confidence = CONFIDENCE_LEVELS.has(raw.confidence) ? raw.confidence : 'low';
  const evidence = typeof raw.evidence === 'string' ? raw.evidence.trim().slice(0, 400) : '';
  const language_detected = LANGUAGES.has(raw.language_detected) ? raw.language_detected : 'en';
  const segment_guess = SEGMENTS.has(raw.segment_guess) ? raw.segment_guess : null;

  let weddings_per_year_guess = null;
  if (typeof raw.weddings_per_year_guess === 'number' && Number.isFinite(raw.weddings_per_year_guess)) {
    const n = Math.round(raw.weddings_per_year_guess);
    if (n >= 1 && n <= 300) weddings_per_year_guess = n;
  }

  const key_venues = Array.isArray(raw.key_venues)
    ? raw.key_venues
        .filter((v) => typeof v === 'string' && v.trim().length >= 3 && v.trim().length <= 80)
        .map((v) => v.trim())
        // If pageText was provided, only keep venues that actually appear in the page text
        .filter((v) => !normPage || normPage.includes(normText(v)))
        .slice(0, 8)
    : [];

  const contact_name = cleanContactName(raw.contact_name);

  return checkHook(
    {
      hook,
      hook_type,
      confidence,
      evidence,
      language_detected,
      segment_guess,
      weddings_per_year_guess,
      key_venues,
      contact_name,
    },
    pageText,
  );
}

export function validateClassifyOutput(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Guardrail: classify output must be a JSON object');
  }
  if (!SENTIMENTS.has(raw.sentiment)) {
    throw new Error(`Guardrail: invalid sentiment "${raw.sentiment}"`);
  }
  const intent = INTENTS.has(raw.intent) ? raw.intent : null;
  const wedding_date =
    typeof raw.wedding_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.wedding_date.trim())
      ? raw.wedding_date.trim()
      : null;
  const summary =
    typeof raw.summary === 'string' && raw.summary.trim()
      ? raw.summary.trim().slice(0, 240)
      : 'Planner replied.';
  const needs_human = Boolean(raw.needs_human);

  return {
    sentiment: raw.sentiment,
    intent,
    wedding_date,
    summary,
    needs_human,
  };
}

export function validateDraftOutput(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Guardrail: draft output must be a JSON object');
  }
  const subject = typeof raw.subject === 'string' ? raw.subject.trim() : '';
  const rawBody = typeof raw.body === 'string' ? raw.body.trim() : '';
  if (!rawBody) throw new Error('Guardrail: AI draft body is empty');
  const body = stripSignOff(rawBody);
  const banned = BANNED.find((b) => b.re.test(`${subject}\n${body}`));
  if (banned) throw new Error(`Guardrail: AI draft used banned phrase (${banned.label})`);
  return { subject, body };
}

function cleanPartnerReplyBody(raw = '') {
  let s = String(raw || '').trim();
  if (!s) return '';
  // Normalize em-dashes and exclamation marks in body text before signature
  s = s.replace(/\s*—\s*/g, ', ');
  s = s.replace(/!+/g, '.');
  // Strip accidental banned filler phrases
  s = s
    .replace(/\b(certainly|definitely|absolutely),?\s*/gi, '')
    .replace(/\brest assured(\s+that)?,?\s*/gi, '')
    .replace(/\bgreat question[.,]?\s*/gi, '')
    .replace(/\bthank(s| you) for reaching out[.,]?\s*/gi, '')
    .replace(/\bhope (this|my|the) (e-?mail|message|note) finds you( well)?[.,]?\s*/gi, '')
    .replace(/\bthank you for the update[.,]?\s*/gi, '')
    .replace(/\bseamlessly\b/gi, 'smoothly')
    .replace(/\bseamless\b/gi, 'smooth')
    .replace(/\btop[- ]notch\b/gi, 'first-class')
    .replace(/\bbespoke solutions?\b/gi, 'tailored logistics')
    .replace(/\bsoluzioni su misura\b/gi, 'logistica dedicata')
    .replace(/\bMercedes Benz\b/g, 'Mercedes-Benz');
  if (/\b[VES][- ]Class\b|\bClasse [VES]\b/.test(s) && !/Mercedes-Benz/.test(s)) {
    s = s.replace(/\b([VES][- ]Class|Classe [VES])\b/, 'Mercedes-Benz $1');
  }
  // Strip any accidental plain-text sign-offs or signature blocks so the body remains pure message text
  s = stripSignOff(s);
  return s;
}

export function validatePartnerReplyOutput(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Guardrail: partner_reply output must be a JSON object');
  }
  const can_answer_confidently = Boolean(raw.can_answer_confidently);
  const body = cleanPartnerReplyBody(typeof raw.body === 'string' ? raw.body : '');
  const attach_rate_card = Boolean(raw.attach_rate_card);
  const escalation_reason =
    typeof raw.escalation_reason === 'string' && raw.escalation_reason.trim()
      ? raw.escalation_reason.trim().slice(0, 240)
      : null;

  const sentiment = SENTIMENTS.has(raw.sentiment) ? raw.sentiment : null;
  const intent = INTENTS.has(raw.intent) ? raw.intent : null;
  const wedding_date =
    typeof raw.wedding_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.wedding_date.trim())
      ? raw.wedding_date.trim()
      : null;
  const summary =
    typeof raw.summary === 'string' && raw.summary.trim()
      ? raw.summary.trim().slice(0, 240)
      : null;

  const lint = body ? lintMessage({ subject: 'Re: DOROGO', body, channel: 'email', step: 'reply' }) : { errors: ['Empty body'], warnings: [] };
  const hasLintError = lint.errors.length > 0;
  const needs_human = Boolean(raw.needs_human) || !can_answer_confidently || !body || hasLintError;

  return {
    can_answer_confidently: can_answer_confidently && !hasLintError && Boolean(body),
    needs_human,
    escalation_reason: needs_human
      ? escalation_reason || (hasLintError ? `Copy-lint check: ${lint.errors[0]}` : 'Requires human confirmation or custom quote')
      : null,
    body,
    attach_rate_card,
    lint,
    ...(sentiment ? { sentiment } : {}),
    ...(intent ? { intent } : {}),
    ...(wedding_date ? { wedding_date } : {}),
    ...(summary ? { summary } : {}),
  };
}

export function validateAiOutput(kind, raw, context = {}) {
  switch (kind) {
    case 'hook':
      return validateHookOutput(raw, context.page || '');
    case 'classify':
      return validateClassifyOutput(raw);
    case 'draft':
      return validateDraftOutput(raw);
    case 'partner_reply':
      return validatePartnerReplyOutput(raw);
    default:
      throw new Error(`Guardrail: unknown AI prompt kind "${kind}"`);
  }
}

export function formatRateCardFactsForAi() {
  const routes = RATE_CARD.routes
    .map((r) => `- ${r.label} (Guest Portal fixed car route): E-Class €${r.E} net | V-Class €${r.V} net | S-Class €${r.S} net (Excl. 10% VAT)`)
    .join('\n');
  return [
    `DOROGO Verified Wedding & Event Partner Facts (dorogo.eu/weddings — All B2B Net Rates Excl. 10% Italian VAT / IVA):`,
    `- Core Value Proposition: We take the entire guest transportation workload off the wedding planner's or venue's shoulders across a full 3-day wedding weekend (Friday arrival waves & welcome dinner, Saturday hotel clusters, water-taxi & private boat pier synchronization, 10h / 200 km dedicated Full Day blocks for cars & vans and 8h / 150 km dedicated blocks for minibuses & buses, plus continuous late-night villa return loops through the final departures and Sunday departures).`,
    `- Regions Covered: Lake Como, the Italian Lakes (Lake Maggiore, Lake Garda, Lake Orta, Lake Iseo), Milan (Malpensa MXP, Linate LIN, Bergamo BGY), Lugano, Zurich, Venice, Portofino, Tuscany, and the Italian & Swiss Alps (St. Moritz, Cortina, Bormio, Cervinia).`,
    `- Self-Service Guest Transfer Portal (dorogo.eu/weddings/guest-portal): We provide a custom registration link for the couple's wedding website. It supports two modes: (1) Planner/Couple-Hosted Mode where guests only enter their flight numbers and arrival times (no prices shown to guests, consolidated net invoice to planner/couple), or (2) Guest Direct-Pay Mode where guests book and pay via SumUp links. Guest data is strictly used for dispatch (never marketed to). For VIP guests who skip the portal, the planner can simply drop their flight screenshot to our WhatsApp dispatcher.`,
    `- Fleet, Livery Honesty & Villa Access: Sedans & V-Class vans are black, unbranded NCC vehicles with free Milan Area C & Como ZTL entry. For group mobility we disclose exact chassis & livery (zero misleading "all-black / all-Mercedes" claims): 7–8p MB Sprinter VIP Black & Top Luxury, 20p Minibus Black VIP, and 30p Coach Black VIP are total-black unbranded; 16–20p Touring Minibus Std (MB Sprinter / Indcar Wing), 28–30p Touring Midibus Std (Iveco GT / Wing), and 50–55p Grand Turismo Coach (Setra / MB Tourismo / Irizar) are multi-brand touring vehicles (subtle operator logo possible on 50–55p GT). Because 50-seat coaches cannot pass narrow historic gates (such as Villa Balbiano, Villa Pizzo, or steep Cernobbio/Moltrasio lanes), we pair 50-seat coaches for main lakeside hotel transfers with compact minibuses and Mercedes-Benz V-Class shuttles for narrow gates. Note: Villa del Balbianello is reached by boat or footpath from Lenno (no direct road coach/car gate).`,
    `- Permits, Tolls & Airport Coach Bays (Disclosed Exclusions for Buses): Motorway tolls are 100% included in point-to-point transfers. Sedans & V-Class (<=7p) enter Milan Area C & Como ZTL free. 7–8p VIP Sprinters and all Buses (>7p) EXCLUDE weekday Mon–Fri Milan Area C passes (<=8m €60/day, 7–8p Sprinters & 8–10.5m buses €97.50–€100/day, >10.5m coaches €150/day; Sat–Sun/holidays free) and airport coach holding bays (+€30 MXP, +€15 BGY, +€20 LIN).`,
    `- Single Dedicated Dispatcher & Water-Taxi Sync: One operations lead on the planner's WhatsApp run-sheet managing live flight radar tracking, boat-pier handoffs with private Riva/water-taxi captains (Cernobbio, Tremezzo, Bellagio, Lenno, Moltrasio, Varenna), and real-time schedule changes. If wind or rain cancels lake boats, our standby road fleet pivots immediately to door-to-door road transfers.`,
    `- Flight Delays & No Late-Night Cutoff: Because we track every flight live on radar, chauffeur dispatch adjusts automatically to the new landing time at no extra charge, and the 60 minutes of complimentary airport wait time starts from actual touchdown (even on a 3-hour flight delay). For late-night villa shuttles, we assign shift-rotated chauffeurs and stay through the final late-night departures (night shift 22:00–06:00 is +20% on hourly disposal rate).`,
    `- Direct Operations, Not a Generic Broker: English- and Italian-speaking chauffeurs in dark suit and tie, full commercial NCC licensing and passenger insurance, briefed on the run-sheet 48 hours ahead. We work happily alongside a planner's existing local NCC as peak-weekend overflow or group fleet with zero exclusivity requirement.`,
    `- Partner Rate Card — Cars & Vans (Confidential Net, Excl. 10% VAT; 10h / 200 km Full Day; 4h min hourly; extra km €2.50):`,
    `  * Mercedes-Benz E-Class (1–3p, 2 bags): €3.00/km (Min €100) | MXP↔Como €150 | €100/h (4h min €400) | Full Day 10h/200km €900`,
    `  * Mercedes-Benz V-Class (6–7p, 7 bags): €3.60/km (Min €120) | MXP↔Como €180 | €105/h (4h min €420) | Full Day 10h/200km €950`,
    `  * Mercedes-Benz S-Class (1–3p, 2 bags): €5.00/km (Min €180) | MXP↔Como €250 | €200/h (4h min €800) | Full Day 10h/200km €1,800`,
    `- Partner Rate Card — VIP Sprinters, Minibuses & Coaches (Confidential Net, Excl. 10% VAT; 8h / 150 km Full Day on ALL buses; 4h min hourly; extra km €3.00–€3.50):`,
    `  * MB Sprinter VIP Black (7–8p, 8 bags, unbranded): €10.40/km (Min €350) | MXP↔Como €520 (+€30 MXP bay) | €135/h (4h min €540) | Full Day 8h/150km €1,000`,
    `  * MB Sprinter Top Luxury (7–8p, 8 bags, bespoke VIP lounge): €11.00/km (Min €480) | MXP↔Como €550 (+€30 MXP bay) | €200/h (4h min €800) | Full Day 8h/150km €1,500`,
    `  * Touring Minibus Std (16–20p: MB Sprinter / Indcar Wing, 12 hold + 19 cabin): €13.00/km (Min €570) | MXP↔Como €650 (+€30 MXP bay) | €155/h (4h min €620) | Full Day 8h/150km €880`,
    `  * Minibus Black VIP (20p MB Exec, Total Black unbranded, 14 hold): €13.80/km (Min €630) | MXP↔Como €690 (+€30 MXP bay) | €220/h (4h min €880) | Full Day 8h/150km €1,190`,
    `  * Touring Midibus Std (28–30p: Iveco GT / Wing multi-brand, 13 hold + 27 cabin): €15.00/km (Min €690) | MXP↔Como €750 (+€30 MXP bay) | €220/h (4h min €880) | Full Day 8h/150km €1,130`,
    `  * Coach Black VIP (30p Total Black unbranded, 25+ hold bags): €15.60/km (Min €690) | MXP↔Como €780 (+€30 MXP bay) | €235/h (4h min €940) | Full Day 8h/150km €1,500`,
    `  * Grand Turismo Coach (50–55p Setra / MB Tourismo / Irizar, 50 hold bags): €17.60/km (Min €750) | MXP↔Como €880 (+€30 MXP bay) | €225/h (4h min €900) | Full Day 8h/150km €1,150`,
    `- Fixed One-Way Net Portal Routes (VAT 10% excluded, tolls & 60 min airport wait included):`,
    routes,
    `- Late-Night Villa Return Shuttle (${RATE_CARD.late_night_shuttle.window}): €${RATE_CARD.late_night_shuttle.V} flat net per Mercedes-Benz V-Class on standby at the venue doing continuous loops to local hotels (Excl. 10% VAT).`,
    `- Partner Models (aligned with B2B Partner Rate Card): Option A (White-Label Studio Markup) = Confidential net partner rates above that the agency includes in its own client proposal with its own markup and strict client protection; Option B (5% Referral Commission) = DOROGO bills the couple/guests directly and pays a 5% commission to the partner agency upon settlement.`,
    `- Booking Terms: Standard Partner Rate Card terms are a 40% deposit to lock fleet allocation, with the remaining 60% balance due 14 days prior to the event (free date reschedule >14 days; inside 14 days 100% cancellation fee). Peak-event dates (MFW, F1, Salone) +10%–20%. Official electronic EU VAT invoice from licensed Italian NCC carrier; 100% replacement guarantee.`,
  ].join('\n');
}
