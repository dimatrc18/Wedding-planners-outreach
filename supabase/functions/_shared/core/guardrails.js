// Strict runtime schema & ground-truth guardrails for Gemini JSON outputs.
// Prevents malformed AI JSON, hallucinated venues/hooks, invalid enum values, or off-brand copy
// from ever corrupting a prospect record or creating an invalid outbound draft.

import { BANNED, lintMessage, wordCount } from './lint.js';
import { RATE_CARD } from './ratecard.js';
import { SIGNATURE, SIGNATURE_IT } from './constants.js';

const HOOK_TYPES = new Set(['venue', 'event', 'style', 'press', 'award', 'other']);
const CONFIDENCE_LEVELS = new Set(['high', 'medium', 'low']);
const LANGUAGES = new Set(['en', 'it', 'de', 'fr']);
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
  const body = typeof raw.body === 'string' ? raw.body.trim() : '';
  if (!body) throw new Error('Guardrail: AI draft body is empty');
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
    .replace(/\bseamlessly\b/gi, 'smoothly')
    .replace(/\bseamless\b/gi, 'smooth')
    .replace(/\btop[- ]notch\b/gi, 'first-class')
    .replace(/\bbespoke solutions?\b/gi, 'tailored logistics')
    .replace(/\bsoluzioni su misura\b/gi, 'logistica dedicata')
    .replace(/\bMercedes Benz\b/g, 'Mercedes-Benz');
  if (/\b[VES][- ]Class\b|\bClasse [VES]\b/.test(s) && !/Mercedes-Benz/.test(s)) {
    s = s.replace(/\b([VES][- ]Class|Classe [VES])\b/, 'Mercedes-Benz $1');
  }
  s = s.trim();
  if (s && !/DOROGO\s*\|\s*Private Transportation|dmitri@dorogo\.eu|wa\.me\/32456141497/i.test(s)) {
    const isIt = /\b(buongiorno|gentile|cordiali|saluti|tariffa|matrimoni|ospiti)\b/i.test(s);
    s = `${s}\n\n${isIt ? SIGNATURE_IT : SIGNATURE}`;
  }
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
    .map((r) => `- ${r.label}: E-Class €${r.E} net | V-Class €${r.V} net | S-Class €${r.S} net`)
    .join('\n');
  return [
    `DOROGO Verified Wedding & Event Partner Facts (dorogo.eu/weddings):`,
    `- Core Value Proposition: We take the entire guest transportation workload off the wedding planner's or venue's shoulders across a full 3-day wedding weekend (Friday arrival waves & welcome dinner, Saturday hotel clusters, water-taxi & private boat pier synchronization, 8-hour dedicated standby blocks, and continuous late-night villa return loops through the final departures, plus Sunday departures).`,
    `- Regions Covered: Lake Como, the Italian Lakes (Lake Maggiore, Lake Garda, Lake Orta, Lake Iseo), Milan (Malpensa MXP, Linate LIN, Bergamo BGY), Lugano, Zurich, Venice, Portofino, Tuscany, and the Italian & Swiss Alps (St. Moritz, Cortina, Bormio, Cervinia).`,
    `- Self-Service Guest Transfer Portal (dorogo.eu/weddings/guest-portal): We provide a custom registration link for the couple's wedding website. It supports two modes: (1) Planner/Couple-Hosted Mode where guests only enter their flight numbers and arrival times (no prices shown to guests, consolidated net invoice to planner/couple), or (2) Guest Direct-Pay Mode where guests book and pay via SumUp links. Guest data is strictly used for dispatch (never marketed to). For VIP guests who skip the portal, the planner can simply drop their flight screenshot to our WhatsApp dispatcher.`,
    `- Fleet & Historic Villa Gate Access: Mercedes-Benz S-Class (VIP/bridal couple, up to 3 guests), Mercedes-Benz V-Class (up to 7 guests + 7 suitcases), Mercedes-Benz E-Class (up to 3 guests), plus 16 to 50-seat minibuses and coaches. Because 50-seat coaches cannot pass narrow historic gates (such as Villa Balbiano, Villa del Balbianello, or steep Cernobbio/Moltrasio lanes), we pair 50-seat coaches for main lakeside hotel transfers with compact 16 to 25-seat executive minibuses and Mercedes-Benz V-Class shuttles for narrow villa gates and ZTL zones (all ZTL and municipal permits included).`,
    `- Single Dedicated Dispatcher & Water-Taxi Sync: One operations lead on the planner's WhatsApp run-sheet managing live flight radar tracking, boat-pier handoffs with private Riva/water-taxi captains (Cernobbio, Tremezzo, Bellagio, Lenno, Moltrasio, Varenna), and real-time schedule changes. If wind or rain cancels lake boats, our standby road fleet pivots immediately to door-to-door road transfers.`,
    `- Flight Delays & No Late-Night Cutoff: Because we track every flight live on radar, chauffeur dispatch adjusts automatically to the new landing time at no extra charge, and the 60 minutes of complimentary airport wait time starts from actual touchdown (even on a 3-hour flight delay). For late-night villa shuttles, we assign shift-rotated chauffeurs and stay through the final late-night departures (no 2:00 AM or 3:00 AM cap) until the last guest is back at their hotel.`,
    `- Fleet Standards (Direct Operations, Not a Broker): Black, unbranded vehicles, English- and Italian-speaking chauffeurs in dark suit and tie, full commercial NCC licensing and passenger insurance, briefed on the run-sheet 48 hours ahead, with a backup vehicle staged on the lake during peak Saturday wedding movements. We also work happily alongside a planner's existing local NCC as peak-weekend overflow or out-of-region fleet with zero exclusivity requirement.`,
    `- Fixed One-Way Net Routes (VAT 10% excluded, tolls & 60 min airport wait included):`,
    routes,
    `- Hourly disposal (minimum ${RATE_CARD.hourly.min_hours} hours): V-Class €${RATE_CARD.hourly.V}/h net, S-Class €${RATE_CARD.hourly.S}/h net.`,
    `- Late-Night Villa Return Shuttle (${RATE_CARD.late_night_shuttle.window}): €${RATE_CARD.late_night_shuttle.V} flat net per Mercedes-Benz V-Class on standby at the venue doing continuous loops to local hotels.`,
    `- Partner Models: Model A = 5% referral/concierge commission (DOROGO bills couple/guests directly and pays 5% commission on total transport value); Model B = Confidential net rates above that the planner/venue can include directly in their own client offer/proposal with their own markup (typically 15–25%+); net rates are strictly confidential and never shown to couples.`,
    `- Booking Terms: Standard terms are a 25% deposit to lock the fleet, with the balance due 7 days before the wedding (if a partner requests custom deposit or payment terms for a large wedding buyout, state our standard 25% / 7-day terms clearly and note that you will review their requested payment schedule alongside the bespoke quote).`,
  ].join('\n');
}
