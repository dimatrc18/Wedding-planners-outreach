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

export const PROMPTS = {
  hook: {
    version: 'hook-v2',
    text: (o: { agency: string; language: string; page: string }) => `You help DOROGO, a luxury chauffeur company in Milan, write the first line of a short email to a wedding planner.
Agency: ${o.agency}
Write the line in: ${o.language === 'it' ? 'Italian' : 'English'}

Rules:
- Use ONLY facts that appear in the PAGE TEXT below. Never invent venues, couples, dates, numbers or awards.
- Reference one specific thing: a named villa or venue they worked at, a real wedding or event, a press feature, or a distinctive style choice.
- One sentence, under 28 words, calm and direct. No flattery adjectives stacked together, no exclamation marks, no questions.
- Do not use: "I hope this email finds you well", "seamless", "bespoke", "elevate", "top-notch", "certainly", "absolutely".
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
    version: 'draft-v2',
    text: (o: { step: string; prospect: string; draft: string; language: string }) => `Rewrite this outreach message from Dmitri at DOROGO (luxury chauffeur, Milan) to a wedding planner so it reads as written by a person for this one recipient.
Step: ${o.step}. Language: ${o.language === 'it' ? 'Italian' : 'English'}.
Keep: the personal hook, the pain point (late-night villa returns or staggered airport arrivals), the offer (12% referral or confidential net rates), and exactly one ask: "May I send our 1-page rate card?" (or the step's own ask).
Rules: calm luxury voice, zero filler, active voice, first email under 110 words before the signature, no exclamation marks.
Vehicles: "Mercedes-Benz V-Class / E-Class / S-Class". Never say 4MATIC or Extra-Long.
Never use: ${BANNED.map((b) => b.label).join(', ')}.
Use only facts in the recipient notes; invent nothing. Keep the signature and the opt-out line exactly as they are.
Return JSON only: {"subject": string, "body": string}

RECIPIENT NOTES:
${o.prospect}

CURRENT DRAFT:
${o.draft}`,
  },
  partner_reply: {
    version: 'partner-reply-v1',
    text: (o: { agency: string; contact_name?: string; language: string; status?: string; thread_history: string; latest_reply: string }) => `You are writing a reply on behalf of Dmitri, Co-Founder of DOROGO (luxury chauffeur service in Milan & Lake Como), to a wedding planner who replied in an ongoing conversation.

Planner Agency: ${o.agency}
Contact Name: ${o.contact_name || 'Unknown'}
Current Stage: ${o.status || 'replied'}
Language: ${o.language === 'it' ? 'Italian' : 'English'}

${formatRateCardFactsForAi()}

Rules:
1. Answer the planner's question ONLY using the Verified Partner Facts above.
2. NEVER invent routes, prices, vehicle types (e.g., we do NOT operate 30-50 seat coaches/buses unless arranged separately by a human), or guarantee fleet availability for a specific date without human confirmation.
3. If the planner asks something NOT covered by the facts above (e.g., coaches/minibuses >7 pax, routes outside Milan/Malpensa/Linate/Lugano/Como, exact date availability, custom discounts, or complex multi-villa schedules), set "can_answer_confidently": false, "needs_human": true, explain why in "escalation_reason", and write a polite holding draft acknowledging their specific question so Dmitri can finalize the exact numbers before clicking send.
4. Keep the tone calm, concise, peer-to-peer, under 120 words before the signature, zero exclamation marks, zero banned phrases (${BANNED.map((b) => b.label).join(', ')}).
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
