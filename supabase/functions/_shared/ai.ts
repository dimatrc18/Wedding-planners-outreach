// Gemini calls with versioned prompts. Every call is written to ai_log.
// Guard rails: the model only sees public page text we fetched, and every hook must quote its evidence
// from that text; a hook whose evidence is not found on the page is downgraded to low confidence.
import { env } from './server.ts';
import { BANNED } from './core/lint.js';

export const PROMPTS = {
  hook: {
    version: 'hook-v1',
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
    version: 'classify-v1',
    text: (o: { body: string }) => `Classify this reply from a wedding planner to a cold email from DOROGO (luxury chauffeur, Milan) offering guest transport and a 1-page partner rate card.
Return JSON only: {"sentiment": "positive"|"neutral"|"negative"|"ooo"|"unsubscribe",
 "intent": "wants_rate_card"|"asks_pricing"|"has_supplier"|"not_now"|"referral_to_other"|"meeting_request"|null,
 "wedding_date": "YYYY-MM-DD"|null, "summary": "one short line in English"}
Positive = they want the rate card, prices or a call. "Please stop" or "remove me" = unsubscribe.

REPLY:
${o.body}`,
  },
  draft: {
    version: 'draft-v1',
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
};

export const geminiModel = () => env('OUTREACH_GEMINI_MODEL', 'gemini-2.5-flash');

export async function gemini(db: any, kind: keyof typeof PROMPTS, input: Record<string, any>, prospect_id: string | null = null) {
  const key = env('GEMINI_API_KEY');
  if (!key) return null;
  const p = PROMPTS[kind];
  const prompt = (p.text as (o: any) => string)(input);
  const model = geminiModel();
  let output: any = null, error: string | null = null;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: kind === 'classify' ? 0 : 0.4, responseMimeType: 'application/json' },
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message || `Gemini HTTP ${r.status}`);
    const text = j?.candidates?.[0]?.content?.parts?.map((x: any) => x.text).join('') || '';
    output = JSON.parse(text.replace(/^```json\s*|```$/g, ''));
  } catch (e) {
    error = (e as Error).message;
  }
  await db.from('ai_log').insert({ kind, prompt_version: p.version, model, prospect_id, input: { ...input, page: input.page ? `${String(input.page).slice(0, 2000)}…` : undefined }, output, error });
  if (error) throw new Error(`AI: ${error}`);
  return output;
}

const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// The hook is only trusted when its evidence is really on the page.
export function checkHook(out: any, pageText: string) {
  if (!out || !out.hook) return { ...out, hook: '', confidence: 'low', needs_review: true, evidence_found: false };
  const found = !!out.evidence && norm(pageText).includes(norm(out.evidence));
  const banned = BANNED.some((b) => b.re.test(out.hook));
  const confidence = !found || banned ? 'low' : out.confidence || 'medium';
  return { ...out, confidence, evidence_found: found, needs_review: confidence !== 'high' || banned };
}
