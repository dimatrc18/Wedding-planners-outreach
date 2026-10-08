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
   c) Preferred partner model (confidential net rates to include in their client offer, or 5% referral commission)
10. LUXURY AUTHORITY (NO FREEBIES & NO BEGGING):
   - NEVER offer free or complimentary transfers, free trials, or "airport pickup on us". We are a luxury chauffeur & event transport house.
   - NEVER ask a planner to "test us" or "try us". Instead, position DOROGO peer-to-peer: local solo drivers are fine for 1 or 2 individual cars, whereas DOROGO runs coordinated multi-day wedding fleets (10+ Mercedes-Benz V-Classes, S-Classes, and 16 to 50-seat minibuses) with a Guest Transfer Portal and one dedicated WhatsApp coordinator for 50 to 150+ guests spread across multiple hotels.`;

export const PROMPTS = {
  hook: {
    version: 'hook-v9-mece-intro',
    text: (o: { agency: string; language: string; page: string }) => `You help Dmitri (Co-Founder of DOROGO Private Transportation) write the opening sentence of a concise, natural email to a luxury wedding planner or venue.
Agency: ${o.agency}
Write the line in: ${o.language === 'it' ? 'Italian' : 'English'}

${CONCIERGE_WRITING_RULES}

Hook-Specific Rules:
- Use ONLY facts that appear in the PAGE TEXT below. Never invent venues, couples, dates, numbers or awards.
- VENUE ACCURACY: Villa del Balbianello is reached by boat or footpath from Lenno — never pair Villa del Balbianello with narrow gates, road access, or coach staging.
- CLEAR IDENTITY & OBSERVATION: Introduce Dmitri from DOROGO (a private transport company covering Lake Como and Milan) and reference a real venue or wedding from their page.
- Examples:
  - "I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan. I came across your weddings at Villa Balbiano and wanted to introduce ourselves."
  - "I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan. I saw Morgan and Tyler's wedding on your site and wanted to introduce ourselves."
- Keep it natural and conversational (18 to 32 words max). No exclamation marks, no questions, no em-dashes (—).
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
    version: 'draft-v9-mece-ab',
    text: (o: { step: string; prospect: string; draft: string; language: string }) => `Rewrite this outreach email from Dmitri (Co-Founder of DOROGO Private Transportation) to a luxury wedding planner, hotel concierge, or venue so it reads like a natural, calm, peer-to-peer note.
Step: ${o.step}. Language: ${o.language === 'it' ? 'Italian' : 'English'}.

${CONCIERGE_WRITING_RULES}

Draft-Specific Rules:
- SUBJECT LINE: Short, natural subject line (under 48 characters) with NO "·" separator and NO recipient company name tag (e.g., "Lake Como guest transport", "Transfers for your Villa Balbiano weddings", "Late returns after the reception", or "Guest transfers for your events team").
- VENUE ACCURACY: Never pair Villa del Balbianello with narrow gates or coach access (it is reached by boat or footpath from Lenno).
- CONCISE & NATURAL (55 to 90 WORDS MAX BEFORE SIGNATURE):
  - State clearly who Dmitri and DOROGO are ("I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan").
  - Explain simply what we do ("We do guest shuttles, airport pickups and late-night returns, with V-Classes, S-Classes and minibuses for larger groups. I'm not looking to replace anyone you work with, just to be an extra option when a date gets busy.").
  - End with a simple, low-friction CTA: "Would it be useful if I sent our rates?" (or "Would it be useful if I sent our vehicle list and partner rates for your team to keep on file?" for hotels/venues). Do NOT put "net rates or 5% commission" in Email 1.
- Zero exclamation marks, zero em-dashes (—). Keep the exact signature and opt-out line at the bottom.
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
6. RATE CARD ATTACHMENT: Set "attach_rate_card": true whenever they ask for rates, prices, the rate card, or how our partner pricing works (unless CONVERSATION HISTORY shows we already sent the rate card in an earlier message). Whenever attach_rate_card is true, explicitly state in the body that our 1-page partner rate card is attached (e.g., "I have attached our 1-page partner rate card with net rates for Lake Como and Milan." / Italian: "In allegato trova la nostra scheda partner di 1 pagina con le tariffe nette per il Lago di Como e Milano.").
7. THREAD MEMORY & CONTINUITY: Read CONVERSATION HISTORY carefully. Remember any wedding date, venue, guest count, vehicle choice, or partner model the planner mentioned in earlier messages, and never repeat the same pitch or re-ask a question they already answered in the thread.

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
