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
   - We take the ENTIRE guest transportation workload off the planner's or venue's shoulders across a full 3-day wedding weekend.
   - We cover Lake Como, Lake Maggiore, Lake Garda, Lake Orta, Milan (Malpensa, Linate, Bergamo), Venice, Portofino, Tuscany, and the Italian & Swiss Alps (St. Moritz, Cortina).
   - Key differentiators: (a) One dedicated WhatsApp dispatcher on the planner's run-sheet; (b) Self-service Guest Transfer Portal link for the couple's wedding website where guests log their own flights and pay via SumUp (zero flight spreadsheets for the planner); (c) Water-taxi & private boat pier synchronization; (d) 8-hour standby blocks & continuous 00:00–04:00 late-night villa return loops; (e) Mercedes-Benz S-Class, V-Class, E-Class fleet plus 16 to 30-seat executive minibuses sized for narrow lakeside roads and stone villa arches where 50-seat coaches cannot pass.
3. ZERO FLUFF & ZERO REPETITION: Never repeat the same phrase or route in two adjacent paragraphs. No corporate essays, no stacked adjectives, no marketing clichés.
4. ANSWER FIRST (for replies): If the planner asked a specific question (net rates, V-Class capacity, minibus access, guest portal, late-night villa shuttle, child seats, luggage, flight tracking), answer it directly in the very first sentence.
5. STRICT "NO 4MATIC" & VEHICLE NAMING RULE: NEVER say "4MATIC" unless explicitly asked for "4MATIC", "4x4", or "AWD". Never say "Extra-Long" or "LWB". Strictly name: "Mercedes-Benz E-Class", "Mercedes-Benz V-Class", or "Mercedes-Benz S-Class" (and "16 to 30-seat executive minibuses" when discussing group shuttles).
6. BANNED CHATBOT FILLER (NEVER USE): ${BANNED.map((b) => b.label).join(', ')}.
7. NO EM-DASHES: Do not use em-dashes (—) as conversational punctuation. Use commas, colons, or periods.
8. 25% DEPOSIT TRANSPARENCY (when quoting a specific wedding or transfer): State clearly: "A 25% deposit reserves the fleet, with the remaining balance due 7 days before the wedding." (Do NOT state this if you are only asking for missing route details or offering the rate card).
9. MISSING WEDDING DETAILS (when a planner asks for a quote without full details): Ask using clean structured labels:
   a) Wedding date & venue / hotel locations
   b) Approximate guest count & schedule
   c) Preferred partner model (12% referral commission or confidential net rates)`;

export const PROMPTS = {
  hook: {
    version: 'hook-v4-human-concierge',
    text: (o: { agency: string; language: string; page: string }) => `You help Dmitri at DOROGO Private Transportation write the opening sentence of a personal 1-to-1 email to a luxury wedding planner, venue, or hotel concierge.
Agency: ${o.agency}
Write the line in: ${o.language === 'it' ? 'Italian' : 'English'}

${CONCIERGE_WRITING_RULES}

Hook-Specific Rules:
- Use ONLY facts that appear in the PAGE TEXT below. Never invent venues, couples, dates, numbers or awards.
- Sound like a real local operations peer who genuinely understands the behind-the-scenes logistics of their specific weddings or venue (e.g., boat-access villas, narrow lakeside roads, multi-day buyouts, guests flying in from abroad, or coordinating transfers across multiple hotels).
- DO NOT start every hook with the cliché formula "I was looking through your recent..." or "I saw your recent...". Vary your sentence structure naturally (e.g., start with the couple's celebration, the specific villa or town logistics, or the multi-day coordination involved).
- NEVER use fake AI flattery clichés like "stood out to us", "caught our eye", "caught our attention", "we noted", "beautifully paced", or "felt warm and personal".
- Reference one specific factual detail from the page: a named couple's wedding story, a named villa/venue they worked at, or a press feature.
- One natural sentence, 14 to 26 words, calm and conversational. No exclamation marks, no questions, no em-dashes (—).
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
    version: 'classify-v2',
    text: (o: { body: string }) => `Classify this reply from a wedding planner to an email from DOROGO (luxury wedding & event transport partner, Milan & Northern Italy) offering guest transport coordination and a 1-page partner rate card.
Return JSON only:
{"sentiment": "positive"|"neutral"|"negative"|"ooo"|"unsubscribe",
 "intent": "wants_rate_card"|"asks_pricing"|"has_supplier"|"not_now"|"referral_to_other"|"meeting_request"|"specific_question"|null,
 "wedding_date": "YYYY-MM-DD"|null,
 "summary": "one short line in English",
 "needs_human": boolean}
Rules:
- Positive = they want the rate card, prices, guest portal info, a call, or ask a constructive question about working together.
- "Please stop" or "remove me" = unsubscribe.
- Set "needs_human": true if they ask a custom question requiring a bespoke quote or human confirmation (e.g., specific date availability, custom multi-villa schedules, contract edits, or phone call scheduling).

REPLY:
${o.body}`,
  },
  draft: {
    version: 'draft-v4-human-concierge',
    text: (o: { step: string; prospect: string; draft: string; language: string }) => `Rewrite this outreach email from Dmitri at DOROGO Private Transportation to a luxury wedding planner, venue, or hotel concierge so it reads like a genuine, unscripted 1-to-1 note written specifically for this recipient.
Step: ${o.step}. Language: ${o.language === 'it' ? 'Italian' : 'English'}.

${CONCIERGE_WRITING_RULES}

Draft-Specific Rules:
- SUBJECT LINE: Write a natural, specific peer-to-peer subject line (under 58 characters) that includes the recipient's studio/property name or primary venue/town (e.g., "Guest logistics for [Agency]" or "[Venue] weddings · [Agency]"). Never use generic blast subjects.
- CORE MESSAGE: Make clear that DOROGO takes the entire guest transportation workload off their shoulders across Lake Como, the Italian Lakes, Milan and the Alps (not just airport-to-hotel rides). Naturally weave in 2 or 3 operational details that fit this specific recipient (such as one dedicated WhatsApp dispatcher on their run-sheet, our private Guest Transfer Portal link for the couple's website so they don't have to chase flight spreadsheets, water-taxi pier handoffs, 16 to 30-seat executive minibuses for narrow villa gates, or standby return loops until 3:00 AM).
- ZERO REPETITION: Ensure Paragraph 1 (the hook) and Paragraph 2 (how we help) do not repeat the same phrases or words.
- Keep the partner models (12% referral commission or confidential net rates) and one low-friction ask (e.g., offering to send our 1-page partner rate card and sample guest portal link).
- Keep the body under 115 words before the signature, zero exclamation marks, zero em-dashes (—). Always write "Mercedes-Benz" in full when naming S-Class, V-Class, or E-Class.
- Use only facts in the recipient notes; invent nothing. Keep the exact signature and opt-out line at the bottom.
Return JSON only: {"subject": string, "body": string}

RECIPIENT NOTES:
${o.prospect}

CURRENT DRAFT:
${o.draft}`,
  },
  partner_reply: {
    version: 'partner-reply-v3-concierge',
    text: (o: { agency: string; contact_name?: string; language: string; status?: string; thread_history: string; latest_reply: string }) => `You are writing a reply on behalf of Dmitri, Executive Chauffeur Coordinator & Co-Founder of DOROGO Private Transportation (Milan, Lake Como, Northern Italy & the Alps), to a wedding planner, venue, or hotel concierge who replied in an ongoing conversation.

Partner Agency / Property: ${o.agency}
Contact Name: ${o.contact_name || 'Unknown'}
Current Stage: ${o.status || 'replied'}
Language: ${o.language === 'it' ? 'Italian' : 'English'}

${CONCIERGE_WRITING_RULES}

${formatRateCardFactsForAi()}

Execution Rules:
1. ANSWER FIRST: Answer the partner's specific question in the opening sentence using ONLY the Verified Partner Facts above.
2. ULTRA-CONCISE: Keep the reply under 85 words before the signature. No fluff, no em-dashes (—), no exclamation marks.
3. NEVER INVENT: Never invent exact prices for unlisted routes or guarantee fleet availability for a specific date without human confirmation.
4. HUMAN ESCALATION GATE: If the partner asks for custom route pricing not listed in the table, exact date availability, bespoke multi-day minibus quotes, or a phone call, set "can_answer_confidently": false, "needs_human": true, explain why in "escalation_reason", and write a calm, helpful holding draft acknowledging their specific request so Dmitri can confirm the exact numbers before sending.
5. End with the exact signature below:
${o.language === 'it' ? SIGNATURE_IT : SIGNATURE}

Return JSON only:
{"can_answer_confidently": boolean,
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

export async function gemini(db: any, kind: keyof typeof PROMPTS, input: Record<string, any>, prospect_id: string | null = null) {
  const key = env('GEMINI_API_KEY');
  if (!key) return null;
  const p = PROMPTS[kind];
  const prompt = (p.text as (o: any) => string)(input);
  const model = geminiModel();
  let rawOutput: any = null, validated: any = null, error: string | null = null;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: kind === 'classify' ? 0 : 0.3, responseMimeType: 'application/json' },
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message || `Gemini HTTP ${r.status}`);
    const text = j?.candidates?.[0]?.content?.parts?.map((x: any) => x.text).join('') || '';
    rawOutput = JSON.parse(text.replace(/^```json\s*|```$/g, ''));
    validated = validateAiOutput(kind, rawOutput, input);
  } catch (e) {
    error = (e as Error).message;
  }
  await db.from('ai_log').insert({
    kind,
    prompt_version: p.version,
    model,
    prospect_id,
    input: { ...input, page: input.page ? `${String(input.page).slice(0, 2000)}…` : undefined },
    output: validated || rawOutput,
    error,
  });
  if (error) throw new Error(`AI: ${error}`);
  return validated;
}
