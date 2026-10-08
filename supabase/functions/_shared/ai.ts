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
1. VOICE: You write as Dmitri, Executive Chauffeur Coordinator & Co-Founder of DOROGO Private Transportation (Milan, Lake Como, and the Alps). Your tone is that of an elite private concierge for CEOs, UHNW travelers, and luxury wedding planners: calm, discreet, effortlessly competent, and ultra-concise.
2. ZERO FLUFF & WATER: No corporate essays, no stacked adjectives, no marketing clichés.
3. ANSWER FIRST (for replies): If the planner asked a specific question (net rates, V-Class capacity, late-night villa shuttle, child seats, luggage, flight tracking), answer it directly in the very first sentence.
4. STRICT "NO 4MATIC" & VEHICLE NAMING RULE: NEVER say "4MATIC" unless explicitly asked for "4MATIC", "4x4", or "AWD". Never say "Extra-Long" or "LWB". Strictly name: "Mercedes-Benz E-Class", "Mercedes-Benz V-Class", or "Mercedes-Benz S-Class".
5. BANNED CHATBOT FILLER (NEVER USE): ${BANNED.map((b) => b.label).join(', ')}.
6. NO EM-DASHES: Do not use em-dashes (—) as conversational punctuation. Use commas, colons, or periods.
7. 25% DEPOSIT TRANSPARENCY (when quoting a specific wedding or transfer): State clearly: "A 25% deposit reserves the fleet, with the remaining balance due 7 days before the wedding." (Do NOT state this if you are only asking for missing route details or offering the rate card).
8. MISSING WEDDING DETAILS (when a planner asks for a quote without full details): Ask using clean structured labels:
   a) Wedding date & venue / hotel locations
   b) Approximate guest count & schedule
   c) Preferred partner model (12% referral commission or confidential net rates)`;

export const PROMPTS = {
  hook: {
    version: 'hook-v3-concierge',
    text: (o: { agency: string; language: string; page: string }) => `You help DOROGO Private Transportation (Milan & Lake Como) write the opening personalization line of a short email to a wedding planner.
Agency: ${o.agency}
Write the line in: ${o.language === 'it' ? 'Italian' : 'English'}

${CONCIERGE_WRITING_RULES}

Hook-Specific Rules:
- Use ONLY facts that appear in the PAGE TEXT below. Never invent venues, couples, dates, numbers or awards.
- Write in first person ("I was looking through...", "I saw your recent weddings at...") as Dmitri, a local Lake Como & Milan peer.
- NEVER use fake AI flattery clichés like "stood out to us", "caught our eye", "caught our attention", "we noted", or "felt warm and personal".
- Reference one specific factual detail: a named couple's wedding story, a named Lake Como villa they worked at, or a press feature.
- One short sentence, under 20 words, calm and direct. No exclamation marks, no questions, no em-dashes (—).
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
    text: (o: { body: string }) => `Classify this reply from a wedding planner to an email from DOROGO (luxury chauffeur, Milan) offering guest transport and a 1-page partner rate card.
Return JSON only:
{"sentiment": "positive"|"neutral"|"negative"|"ooo"|"unsubscribe",
 "intent": "wants_rate_card"|"asks_pricing"|"has_supplier"|"not_now"|"referral_to_other"|"meeting_request"|"specific_question"|null,
 "wedding_date": "YYYY-MM-DD"|null,
 "summary": "one short line in English",
 "needs_human": boolean}
Rules:
- Positive = they want the rate card, prices, a call, or ask a constructive question about working together.
- "Please stop" or "remove me" = unsubscribe.
- Set "needs_human": true if they ask a custom question (e.g., 50-seat buses, custom routes not in Milan/Como, specific date availability, contract edits, or phone call scheduling).

REPLY:
${o.body}`,
  },
  draft: {
    version: 'draft-v3-concierge',
    text: (o: { step: string; prospect: string; draft: string; language: string }) => `Rewrite this outreach message from Dmitri at DOROGO Private Transportation (Milan & Lake Como) to a wedding planner so it reads as written by an elite private concierge for this one recipient.
Step: ${o.step}. Language: ${o.language === 'it' ? 'Italian' : 'English'}.

${CONCIERGE_WRITING_RULES}

Draft-Specific Rules:
- Keep: the personal hook, the pain point (late-night villa returns or staggered airport arrivals), the offer (12% referral or confidential net rates), and one low-friction ask: "May I send our 1-page rate card?" (or the step's own ask).
- Keep the first email under 100 words before the signature, zero exclamation marks, zero em-dashes (—).
- Use only facts in the recipient notes; invent nothing. Keep the signature and the opt-out line exactly as they are.
Return JSON only: {"subject": string, "body": string}

RECIPIENT NOTES:
${o.prospect}

CURRENT DRAFT:
${o.draft}`,
  },
  partner_reply: {
    version: 'partner-reply-v2-concierge',
    text: (o: { agency: string; contact_name?: string; language: string; status?: string; thread_history: string; latest_reply: string }) => `You are writing a reply on behalf of Dmitri, Executive Chauffeur Coordinator & Co-Founder of DOROGO Private Transportation (Milan, Lake Como, and the Alps), to a wedding planner who replied in an ongoing conversation.

Planner Agency: ${o.agency}
Contact Name: ${o.contact_name || 'Unknown'}
Current Stage: ${o.status || 'replied'}
Language: ${o.language === 'it' ? 'Italian' : 'English'}

${CONCIERGE_WRITING_RULES}

${formatRateCardFactsForAi()}

Execution Rules:
1. ANSWER FIRST: Answer the planner's specific question in the opening sentence using ONLY the Verified Partner Facts above.
2. ULTRA-CONCISE: Keep the reply under 80 words before the signature. No fluff, no em-dashes (—), no exclamation marks.
3. NEVER INVENT: Never invent routes, prices, vehicle types (we do NOT operate 30-50 seat coaches unless arranged separately by a human), or guarantee fleet availability for a specific date without human confirmation.
4. HUMAN ESCALATION GATE: If the planner asks something NOT covered by the Verified Partner Facts above (e.g., coaches/minibuses >7 pax, routes outside Milan/Malpensa/Linate/Lugano/Como, exact date availability, custom discounts, or complex multi-villa schedules), set "can_answer_confidently": false, "needs_human": true, explain why in "escalation_reason", and write a calm, concise holding draft acknowledging their specific question so Dmitri can finalize the exact numbers before sending.
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
