// Gemini calls with versioned prompts and strict runtime schema guardrails.
// Every call is written to ai_log.
// Guard rails:
// 1. Every JSON response is validated by validateAiOutput() before returning.
// 2. Every hook must quote verbatim evidence from the scraped page (checkHook).
// 3. Conversational partner replies (partner_reply) are strictly grounded in RATE_CARD facts
//    and automatically set needs_human=true when a planner asks something outside verified facts.
import { env } from './server.ts';
import { BANNED } from './core/lint.js';
import { SIGNATURE, SIGNATURE_IT } from './core/constants.js';
import { checkHook, validateAiOutput, formatRateCardFactsForAi } from './core/guardrails.js';

export { checkHook, validateAiOutput };

export const CONCIERGE_WRITING_RULES = `DOROGO CONCIERGE WRITING SKILLS (MANDATORY):
1. VOICE: You write as Dmitri, Executive Chauffeur Coordinator & Co-Founder of DOROGO Private Transportation (Milan, Lake Como, the Italian Lakes, Venice, Portofino, and the Alps). Your tone is that of an elite private operations partner for luxury wedding planners, 5-star hotel concierges, and historic villa buyout teams: calm, discreet, peer-to-peer, and human.
2. WHAT DOROGO ACTUALLY OFFERS (NEVER REDUCE US TO JUST "A CAR SERVICE"):
   - We take the ENTIRE guest transportation workload off the planner's or venue's shoulders across a full 3-day wedding weekend (24/7 operation).
   - We cover Lake Como, Lake Maggiore, Lake Garda, Lake Orta, Milan (Malpensa, Linate, Bergamo), Venice, Portofino, Tuscany, and the Italian & Swiss Alps (St. Moritz, Cortina).
   - Key differentiators: (a) One dedicated WhatsApp dispatcher on the planner's run-sheet; (b) Self-service Guest Transfer Portal link for the couple's wedding website where guests log their own flights and pay via SumUp (zero flight spreadsheets for the planner); (c) Water-taxi & private boat pier synchronization; (d) Dedicated standby blocks & continuous late-night villa return loops through the final departures; (e) Mercedes-Benz S-Class, V-Class, E-Class fleet plus 16 to 50-seat minibuses and coaches (compact minibuses for narrow lakeside villa gates and 50-seaters for main hotel transfers).
3. ZERO FLUFF & ZERO REPETITION: Never repeat the same phrase or route in two adjacent paragraphs. No corporate essays, no stacked adjectives, no marketing clichés.
4. ANSWER FIRST (for replies): If the planner asked a specific question (net rates, V-Class capacity, minibus/coach access, guest portal, late-night villa shuttle, child seats, luggage, flight tracking), answer it directly in the very first sentence.
5. STRICT "NO 4MATIC" & VEHICLE NAMING RULE: NEVER say "4MATIC" unless explicitly asked for "4MATIC", "4x4", or "AWD". Never say "Extra-Long" or "LWB". Strictly name: "Mercedes-Benz E-Class", "Mercedes-Benz V-Class", or "Mercedes-Benz S-Class" (and "16 to 50-seat minibuses and coaches" when discussing group shuttles).
6. BANNED CHATBOT FILLER (NEVER USE): ${BANNED.map((b) => b.label).join(', ')}.
7. NO EM-DASHES: Do not use em-dashes (—) as conversational punctuation. Use commas, colons, or periods.
8. 25% DEPOSIT & PAYMENT TERMS: ONLY mention our standard booking terms ("A 25% deposit reserves the fleet, with the remaining balance due 7 days before the wedding") when the partner explicitly asks about deposits, payment terms, or locking in a specific wedding date. Do NOT mention deposits when answering pure operational questions (such as gate access, GDPR, flight delays, or late-night shuttles).
9. MISSING WEDDING DETAILS (when a planner asks for a quote without full details): Ask using clean structured labels:
   a) Wedding date & venue / hotel locations
   b) Approximate guest count & schedule
   c) Preferred partner model (confidential net rates to include in their client offer, or 5% referral commission)`;

export const PROMPTS = {
  hook: {
    version: 'hook-v7-honest-backup',
    text: (o: { agency: string; language: string; page: string }) => `You help Dmitri (Co-Founder of DOROGO Private Transportation) write the opening sentence of a simple, honest, CEO-level email to a luxury wedding planner, venue, or hotel concierge.
Agency: ${o.agency}
Write the line in: ${o.language === 'it' ? 'Italian' : 'English'}

${CONCIERGE_WRITING_RULES}

Hook-Specific Rules:
- Use ONLY facts that appear in the PAGE TEXT below. Never invent venues, couples, dates, numbers or awards.
- HONEST EXISTING-PROVIDER OPENING: Acknowledge simply and honestly that they likely already have a go-to driver for the specific venues or weddings shown on their page. This immediately disarms their #1 objection ("we already have a supplier") and sets up Sentence 2 (where we offer to be their backup for peak Saturdays, guests split across 5 hotels, or late-night returns).
- Examples:
  - "You likely already have a go-to driver for your weddings at Villa del Balbianello and Villa Sola Cabiati."
  - "I saw Morgan and Tyler's wedding on your site, and I know you likely already have a regular driver for Villa Balbiano."
  - "You already have local drivers for [Venue], though on peak wedding nights local taxis vanish long before the party ends."
- One simple, true sentence, 12 to 22 words max. No exclamation marks, no questions, no em-dashes (—).
- If the page has nothing specific, return an empty hook and confidence "low".

Return JSON only:
{"hook": string, "hook_type": "venue"|"event"|"style"|"press"|"award"|"other", "confidence": "high"|"medium"|"low",
 "evidence": "exact phrase copied from the page text that supports the hook",
 "language_detected": "en"|"it"|"de"|"fr", "segment_guess": "boutique_local"|"high_volume_uk_us"|"international"|null,
 "weddings_per_year_guess": number|null, "key_venues": [venue names that appear in the page text], "contact_name": string|null}

PAGE TEXT:
${o.page}`,
  },
  classify: {
    version: 'classify-v3',
    text: (o: { body: string }) => `Classify this reply from a wedding planner, venue, or hotel concierge to an email from DOROGO (luxury wedding & event transport partner, Milan, Lake Como & Northern Italy) offering guest transport coordination and a 1-page partner rate card.
Return JSON only:
{"sentiment": "positive"|"neutral"|"negative"|"ooo"|"unsubscribe",
 "intent": "wants_rate_card"|"asks_pricing"|"has_supplier"|"not_now"|"referral_to_other"|"meeting_request"|"specific_question"|null,
 "wedding_date": "YYYY-MM-DD"|null,
 "summary": "one short line in English",
 "needs_human": boolean}
Rules:
- Positive = they want the rate card, prices, guest portal info, a call, or ask a constructive question about working together.
- If they challenge our reliability, raise an operational concern, or ask any question (even with a skeptical tone), set "intent" to "specific_question" (or "asks_pricing" / "has_supplier" if more specific) and only use "intent": null when they flatly decline with no question ("Not interested, thank you").
- "Please stop" or "remove me" = unsubscribe.
- Set "needs_human": true ONLY if they ask for something outside our standard rate card & verified facts that requires human confirmation (e.g., exact date availability check, custom quote for unlisted routes/minibuses/coaches, contract/deposit changes, or scheduling a phone/Zoom call).

REPLY:
${o.body}`,
  },
  draft: {
    version: 'draft-v7-honest-backup',
    text: (o: { step: string; prospect: string; draft: string; language: string }) => `Rewrite this outreach email from Dmitri (Co-Founder of DOROGO Private Transportation) to a luxury wedding planner, venue, or hotel concierge so it reads like a simple, honest, CEO-to-CEO note.
Step: ${o.step}. Language: ${o.language === 'it' ? 'Italian' : 'English'}.

${CONCIERGE_WRITING_RULES}

Draft-Specific Rules:
- SUBJECT LINE: Crisp executive subject line (under 48 characters) naming their studio/property or primary venue (e.g., "Backup fleet for peak Saturdays · [Agency]" or "[Venue] weddings · [Agency]").
- SIMPLE & HONEST (50 to 68 WORDS MAX BEFORE SIGNATURE): Keep the entire body to 3 short, connected sentences. Do NOT recycle website brochure lists.
- SENTENCE 1 (Honest Opening): Acknowledge they likely already have a go-to driver for their specific venues ("You likely already have a go-to driver for your weddings at [Venue A] and [Venue B].").
- SENTENCE 2 (Real Wedding-Day Pain Point): Connect to a real Saturday headache where their primary driver runs short: guests split across 5 hotels instead of one room block, peak-Saturday V-Class/minibus shortages, delayed Malpensa flights, 2:00 AM returns when local taxis vanish, or keeping lost guests/drivers from calling the planner's phone during the ceremony (mentioning our Mercedes-Benz V-Class, S-Class and 16 to 50-seat minibuses).
- SENTENCE 3 (Low-Friction Backup Ask): "Worth keeping our 1-page rate card on file (net rates or 5% commission) as backup for peak weekends?"
- Zero exclamation marks, zero em-dashes (—). Always write "Mercedes-Benz" in full when naming S-Class, V-Class, or E-Class. Keep the exact signature and opt-out line at the bottom.
Return JSON only: {"subject": string, "body": string}

RECIPIENT NOTES:
${o.prospect}

CURRENT DRAFT:
${o.draft}`,
  },
  partner_reply: {
    version: 'partner-reply-v6-ceo-short',
    text: (o: { agency: string; contact_name?: string; language: string; status?: string; thread_history: string; latest_reply: string }) => `You are writing a CEO-level concise reply on behalf of Dmitri, Co-Founder of DOROGO Private Transportation, to a wedding planner, venue, or hotel concierge.

Partner Agency / Property: ${o.agency}
Contact Name: ${o.contact_name || 'Unknown'}
Current Stage: ${o.status || 'replied'}
Default Language: ${o.language === 'it' ? 'Italian' : 'English'}

${CONCIERGE_WRITING_RULES}

${formatRateCardFactsForAi()}

Execution Rules:
1. CEO-LEVEL SHORT (25 TO 50 WORDS MAX BEFORE SIGNATURE): Start with a greeting ("Hi [Name]," or "Buongiorno [Name],"), then answer ONLY what they asked in 1 to 2 crisp sentences (25 to 50 words max before the signature). Zero filler, zero unrequested feature lists.
2. ONE QUESTION MAX: Ask at most ONE short question (?) at the end if needed. Zero exclamation marks, zero em-dashes (—).
3. LANGUAGE & SIGNATURE MATCH: Write in the same language as LATEST PLANNER REPLY and end with the matching signature:
   - English signature:
${SIGNATURE}
   - Italian signature:
${SIGNATURE_IT}
4. NEVER INVENT: Never invent Euro prices for unlisted routes (e.g., Bergamo BGY, Venice, St. Moritz, or 16–50 seat minibuses/coaches) and never guarantee fleet availability for a specific wedding date without human confirmation. Quote exact listed net rates when asked.
5. HUMAN ESCALATION GATE:
   - Set "can_answer_confidently": true and "needs_human": false when the partner's questions/objections can be fully answered from the Verified Partner Facts above.
   - Set "can_answer_confidently": false and "needs_human": true (with a clear "escalation_reason") ONLY when the partner asks for: (a) exact pricing on an unlisted route or 16–50 seat minibus/coach, (b) confirmed availability or a formal quote for a specific wedding date, (c) custom contract/deposit modifications, or (d) scheduling a phone/Zoom call.
6. RATE CARD ATTACHMENT: Set "attach_rate_card": true whenever they ask for rates, prices, the rate card, or how our partner pricing works.

Return JSON only:
{"sentiment": "positive"|"neutral"|"negative",
 "intent": "wants_rate_card"|"asks_pricing"|"has_supplier"|"not_now"|"referral_to_other"|"meeting_request"|"specific_question",
 "wedding_date": "YYYY-MM-DD"|null,
 "summary": "one short line in English summarizing their reply",
 "can_answer_confidently": boolean,
 "needs_human": boolean,
 "escalation_reason": string|null,
 "body": string,
 "attach_rate_card": boolean}

CONVERSATION HISTORY:
${o.thread_history || '(No prior messages)'}

LATEST PLANNER REPLY:
${o.latest_reply}`,
  },
};

export const geminiModel = () => env('OUTREACH_GEMINI_MODEL', 'gemini-2.5-flash');

const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function gemini(db: any, kind: keyof typeof PROMPTS, input: Record<string, any>, prospect_id: string | null = null) {
  const key = env('GEMINI_API_KEY');
  if (!key) return null;
  const p = PROMPTS[kind];
  const prompt = (p.text as (o: any) => string)(input);
  const primary = geminiModel();
  const candidates = [primary, ...FALLBACK_MODELS.filter((m, idx) => idx > 0 || m !== primary)];
  let usedModel = primary;
  let rawOutput: any = null, validated: any = null, error: string | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    usedModel = model;
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: kind === 'classify' ? 0 : 0.25, responseMimeType: 'application/json' },
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        const msg = j?.error?.message || `Gemini HTTP ${r.status}`;
        const isQuotaOrTransient = r.status === 429 || r.status === 503 || r.status === 404 || /quota|rate limit|overloaded|not found|no longer available/i.test(msg);
        if (isQuotaOrTransient && i < candidates.length - 1) {
          await sleep(1200 * (i + 1));
          continue;
        }
        throw new Error(msg);
      }
      const text = j?.candidates?.[0]?.content?.parts?.map((x: any) => x.text).join('') || '';
      rawOutput = JSON.parse(text.replace(/^```json\s*|```$/g, ''));
      validated = validateAiOutput(kind, rawOutput, input);
      error = null;
      break;
    } catch (e) {
      error = (e as Error).message;
      if (i < candidates.length - 1 && /quota|rate limit|429|503|not found|no longer available|overloaded/i.test(error)) {
        await sleep(1200 * (i + 1));
        continue;
      }
      break;
    }
  }

  await db.from('ai_log').insert({
    kind,
    prompt_version: p.version,
    model: usedModel,
    prospect_id,
    input: { ...input, page: input.page ? `${String(input.page).slice(0, 2000)}…` : undefined },
    output: validated || rawOutput,
    error,
  });
  if (error) throw new Error(`AI: ${error}`);
  return validated;
}
