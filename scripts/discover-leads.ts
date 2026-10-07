#!/usr/bin/env -S node --experimental-strip-types
/**
 * DOROGO Batch Lead Discovery & Qualification Pipeline (TypeScript)
 *
 * Usage:
 *   # 1. Filter & enrich a list of candidate URLs (or a .txt/.csv file of URLs) into a CRM-ready CSV:
 *   GEMINI_API_KEY=... node --experimental-strip-types scripts/discover-leads.ts --input urls.txt --out leads_ready.csv
 *
 *   # 2. Run a self-test / dry-run on sample candidate fixtures:
 *   node --experimental-strip-types scripts/discover-leads.ts --self-test
 *
 *   # 3. Optional: also insert qualified leads directly into Supabase:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... GEMINI_API_KEY=... \
 *     node --experimental-strip-types scripts/discover-leads.ts --input urls.txt --push-supabase
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as core from '../supabase/functions/_shared/core/index.js';

export interface CandidatePageInput {
  url: string;
  html: string;
  finalUrl?: string;
  agencyHint?: string;
}

export interface LeadFilterResult {
  qualified: boolean;
  rejectReason: string | null;
  stage: 'passed' | 'directory_blocked' | 'not_wedding_planner' | 'budget_or_non_luxury' | 'outside_region' | 'no_valid_email' | 'no_mx' | 'duplicate';
  prospect: Record<string, any> | null;
  signals: {
    venues: string[];
    towns: string[];
    luxurySignals: string[];
    emails: string[];
    mxStatus: 'mx_ok' | 'no_mx' | 'unknown';
  };
}

const DIRECTORY_DOMAINS = /(?:^|\.)(matrimonio\.com|weddingwire\.\w+|zankyou\.\w+|hitched\.\w+|theknot\.com|caratsandcake\.com|stylemepretty\.com|overthemoon\.com|lalista\.com|facebook\.com|instagram\.com|pinterest\.\w+|linkedin\.com|tiktok\.com|youtube\.com)$/i;

const WEDDING_RELEVANCE_RE = /\b(wedding|weddings|matrimoni|matrimonio|bridal|bride|sposi|nozze|destination\s+events?|luxury\s+events?|wedding\s+planner)\b/i;

const BUDGET_OR_UNRELATED_RE = /\b(low[- ]cost|economici|economico|budget\s+wedding|cheap\s+wedding|diy\s+wedding|fai\s+da\s+te|gonfiabili|animazione\s+bambini|feste\s+per\s+bambini|addio\s+al\s+celibato|noleggio\s+auto\s+epoca\s+soltanto)\b/i;

const LUXURY_SIGNALS = [
  'luxury', 'bespoke', 'destination wedding', 'multi-day', 'exclusive', 'private villa',
  'lake como', 'lago di como', 'vogue', 'harper', 'tatler', 'brides', 'style me pretty',
  'over the moon', 'matrimonio di lusso', 'ville esclusive', 'concierge', 'atelier', 'boutique',
];

const REGION_KEYWORDS_RE = /\b(lake\s+como|lago\s+di\s+como|como|bellagio|tremezzina|cernobbio|menaggio|varenna|moltrasio|laglio|blevio|lenno|milan|milano|lake\s+maggiore|lago\s+maggiore|stresa|lake\s+garda|lago\s+di\s+garda|orta|franciacorta|bergamo|monza|brianza|lombardy|lombardia|northern\s+italy|italian\s+lakes)\b/i;

const REJECT_EMAIL_LOCAL_RE = /^(noreply|no-reply|donotreply|do-not-reply|privacy|gdpr|dpo|pec|fatturazione|billing|abuse|postmaster|webmaster|jobs|careers|hr|stagisti|stage)@/i;
const REJECT_EMAIL_DOMAIN_RE = /(?:^|\.)(pec\.it|legalmail\.it|arubapec\.it|registerpec\.it|matrimonio\.com|weddingwire\.\w+|zankyou\.\w+|sentry\.io|wixpress\.com|example\.com)$/i;

export function filterUsableEmails(emails: string[], siteDomain: string): string[] {
  const clean = (emails || [])
    .map((e) => String(e || '').trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e))
    .filter((e) => !REJECT_EMAIL_LOCAL_RE.test(e))
    .filter((e) => !REJECT_EMAIL_DOMAIN_RE.test(core.domainOf(e)));

  // Prefer emails on the agency's own domain first, then personal/general inbox names
  return [...new Set(clean)].sort((a, b) => {
    const aSame = Number(core.domainOf(a) === siteDomain);
    const bSame = Number(core.domainOf(b) === siteDomain);
    if (bSame !== aSame) return bSame - aSame;
    const aInfo = Number(/^(info|hello|contact|contatti|wedding|weddings|events|studio)@/i.test(a));
    const bInfo = Number(/^(info|hello|contact|contatti|wedding|weddings|events|studio)@/i.test(b));
    return bInfo - aInfo;
  });
}

export async function checkDnsMx(domain: string, fetchImpl: typeof fetch = fetch): Promise<'mx_ok' | 'no_mx' | 'unknown'> {
  if (!domain) return 'unknown';
  try {
    const r = await fetchImpl(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`);
    if (!r.ok) return 'unknown';
    const j: any = await r.json();
    return (j.Answer || []).some((a: any) => a.type === 15) ? 'mx_ok' : 'no_mx';
  } catch {
    return 'unknown';
  }
}

/**
 * Pure 6-stage lead evaluation function (testable offline with HTML fixtures or live with fetched pages).
 */
export async function evaluateLeadCandidate(
  candidate: CandidatePageInput,
  options: {
    existingProspects?: any[];
    mxResolver?: (domain: string) => Promise<'mx_ok' | 'no_mx' | 'unknown'>;
    aiHookExtractor?: (input: { agency: string; language: string; page: string }) => Promise<any>;
  } = {},
): Promise<LeadFilterResult> {
  const finalUrl = candidate.finalUrl || candidate.url;
  const parsed = core.parseProfileUrl(finalUrl);
  const siteDomain = core.domainOf(parsed.website || finalUrl);

  // Stage 1: Directory & Social Aggregator Blocklist
  if (!siteDomain || DIRECTORY_DOMAINS.test(siteDomain)) {
    return {
      qualified: false,
      stage: 'directory_blocked',
      rejectReason: `Blocked directory/social domain (${siteDomain || finalUrl}); require planner's own website`,
      prospect: null,
      signals: { venues: [], towns: [], luxurySignals: [], emails: [], mxStatus: 'unknown' },
    };
  }

  const extracted: any = core.extractFromHtml(candidate.html || '', finalUrl);
  const fullText = `${extracted.title || ''} ${extracted.description || ''} ${extracted.text || ''}`;
  const lowerText = fullText.toLowerCase();

  // Stage 2: Wedding Planner Relevance & Non-Luxury/Budget Rejection
  if (!WEDDING_RELEVANCE_RE.test(fullText)) {
    return {
      qualified: false,
      stage: 'not_wedding_planner',
      rejectReason: 'Page does not mention weddings, bridal events, or wedding planning',
      prospect: null,
      signals: { venues: extracted.venues, towns: extracted.towns, luxurySignals: [], emails: extracted.emails, mxStatus: 'unknown' },
    };
  }

  const luxurySignals = LUXURY_SIGNALS.filter((kw) => lowerText.includes(kw));
  if (BUDGET_OR_UNRELATED_RE.test(fullText) && luxurySignals.length === 0 && extracted.venues.length === 0) {
    return {
      qualified: false,
      stage: 'budget_or_non_luxury',
      rejectReason: 'Matched budget/DIY/non-luxury keywords without luxury venue or positioning signals',
      prospect: null,
      signals: { venues: extracted.venues, towns: extracted.towns, luxurySignals, emails: extracted.emails, mxStatus: 'unknown' },
    };
  }

  // Stage 3: Destination Market Filter (Lake Como / Milan / Northern Italy Lakes)
  const hasRegionSignal =
    extracted.venues.length > 0 ||
    extracted.towns.length > 0 ||
    REGION_KEYWORDS_RE.test(fullText);

  if (!hasRegionSignal) {
    return {
      qualified: false,
      stage: 'outside_region',
      rejectReason: 'No Lake Como, Milan, or Northern Italy destination wedding venues/locations detected',
      prospect: null,
      signals: { venues: extracted.venues, towns: extracted.towns, luxurySignals, emails: extracted.emails, mxStatus: 'unknown' },
    };
  }

  // Stage 4: Contact Email Hygiene & DNS MX Verification
  const usableEmails = filterUsableEmails(extracted.emails, siteDomain);
  const primaryEmail = usableEmails[0] || '';
  if (!primaryEmail) {
    return {
      qualified: false,
      stage: 'no_valid_email',
      rejectReason: 'No usable business email found on page (or only noreply/PEC/directory addresses)',
      prospect: null,
      signals: { venues: extracted.venues, towns: extracted.towns, luxurySignals, emails: [], mxStatus: 'unknown' },
    };
  }

  const mxResolver = options.mxResolver || checkDnsMx;
  const mxStatus = await mxResolver(core.domainOf(primaryEmail));
  if (mxStatus === 'no_mx') {
    return {
      qualified: false,
      stage: 'no_mx',
      rejectReason: `Email domain "${core.domainOf(primaryEmail)}" has no valid DNS MX records`,
      prospect: null,
      signals: { venues: extracted.venues, towns: extracted.towns, luxurySignals, emails: usableEmails, mxStatus },
    };
  }

  const agencyName =
    candidate.agencyHint ||
    extracted.site_name ||
    (extracted.title ? String(extracted.title).split(/\s*[|–—-]\s*/)[0].trim() : '') ||
    siteDomain;

  const lang = ['it', 'de', 'fr'].includes(extracted.lang) ? extracted.lang : 'en';
  const baseProspect: Record<string, any> = {
    agency_name: agencyName.slice(0, 120),
    contact_name: '',
    role: 'Wedding Planner',
    email: primaryEmail,
    email_status: mxStatus,
    phone: extracted.phones[0] || '',
    whatsapp: extracted.whatsapp || '',
    website: finalUrl,
    instagram_handle: extracted.instagram[0] || '',
    location: extracted.towns[0] || 'Lake Como / Northern Italy',
    type: 'wedding_planner',
    segment: lang === 'it' ? 'boutique_local' : 'international',
    language: lang === 'it' ? 'it' : 'en',
    source: 'batch_discovery',
    source_detail: finalUrl,
    key_venues: extracted.venues,
    personalization_hook: '',
    hook_type: null,
    hook_confidence: null,
    hook_needs_review: true,
    hook_source_url: finalUrl,
    status: 'new',
  };

  // Stage 5: Deduplication against existing CRM prospects
  const existing = options.existingProspects || [];
  const dupes = core.findDuplicates(baseProspect, existing);
  if (dupes.length > 0) {
    return {
      qualified: false,
      stage: 'duplicate',
      rejectReason: `Duplicate of existing CRM prospect "${dupes[0].prospect.agency_name}" (${dupes[0].reasons.join(', ')})`,
      prospect: null,
      signals: { venues: extracted.venues, towns: extracted.towns, luxurySignals, emails: usableEmails, mxStatus },
    };
  }

  // Stage 6: Optional AI Hook Extraction + Strict Guardrail Validation
  if (options.aiHookExtractor) {
    try {
      const rawAi = await options.aiHookExtractor({
        agency: baseProspect.agency_name,
        language: baseProspect.language,
        page: extracted.text.slice(0, 14000),
      });
      if (rawAi) {
        const validated = core.validateHookOutput(rawAi, extracted.text);
        if (validated.hook) {
          baseProspect.personalization_hook = validated.hook;
          baseProspect.hook_type = validated.hook_type;
          baseProspect.hook_confidence = validated.confidence;
          baseProspect.hook_needs_review = validated.needs_review;
        }
        if (validated.segment_guess) baseProspect.segment = validated.segment_guess;
        if (validated.weddings_per_year_guess) baseProspect.avg_weddings_per_year_estimate = validated.weddings_per_year_guess;
        if (validated.contact_name) baseProspect.contact_name = validated.contact_name;
        if (validated.key_venues?.length) {
          baseProspect.key_venues = [...new Set([...baseProspect.key_venues, ...validated.key_venues])];
        }
        if (validated.language_detected && ['en', 'it'].includes(validated.language_detected)) {
          baseProspect.language = validated.language_detected;
        }
        if (validated.hook && validated.confidence === 'high' && !validated.needs_review && mxStatus === 'mx_ok') {
          baseProspect.status = 'ready';
        }
      }
    } catch (err) {
      // Guardrail rejected malformed AI response; keep lead in 'new' status for manual hook review
      baseProspect.notes = `AI hook skipped by guardrail: ${(err as Error).message}`;
    }
  }

  baseProspect.priority_score = core.priorityScore(baseProspect).score;

  return {
    qualified: true,
    stage: 'passed',
    rejectReason: null,
    prospect: baseProspect,
    signals: { venues: baseProspect.key_venues, towns: extracted.towns, luxurySignals, emails: usableEmails, mxStatus },
  };
}

async function callGeminiHook(input: { agency: string; language: string; page: string }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.OUTREACH_GEMINI_MODEL || 'gemini-2.5-flash';
  const prompt = `You help DOROGO, a luxury chauffeur company in Milan, write the first line of a short email to a wedding planner.
Agency: ${input.agency}
Write the line in: ${input.language === 'it' ? 'Italian' : 'English'}

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
${input.page}`;

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
    }),
  });
  const j: any = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `Gemini HTTP ${r.status}`);
  const text = j?.candidates?.[0]?.content?.parts?.map((x: any) => x.text).join('') || '';
  return JSON.parse(text.replace(/^```json\s*|```$/g, ''));
}

async function fetchCandidateWithContactPages(url: string): Promise<CandidatePageInput> {
  const ua = 'Mozilla/5.0 (compatible; DOROGO-partner-research/1.0; +https://dorogo.eu)';
  const fetchOne = async (target: string) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const r = await fetch(target, { headers: { 'User-Agent': ua, Accept: 'text/html' }, redirect: 'follow', signal: ctrl.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return { html: (await r.text()).slice(0, 1_000_000), finalUrl: r.url };
    } finally {
      clearTimeout(timer);
    }
  };

  const main = await fetchOne(url);
  const first: any = core.extractFromHtml(main.html, main.finalUrl);
  const sameSite = (first.links || [])
    .map((h: string) => {
      try {
        return new URL(h, main.finalUrl).toString();
      } catch {
        return null;
      }
    })
    .filter((u: string | null): u is string => Boolean(u && core.domainOf(u) === core.domainOf(main.finalUrl)));

  const subpages = [...new Set(sameSite)]
    .sort((a, b) => Number(/contact|contatti|about|chi-siamo|portfolio/i.test(b)) - Number(/contact|contatti|about|chi-siamo|portfolio/i.test(a)))
    .slice(0, 2);

  let combinedHtml = main.html;
  for (const sub of subpages) {
    try {
      const pg = await fetchOne(sub);
      combinedHtml += `\n${pg.html}`;
    } catch {
      // Ignore unreachable subpage
    }
  }
  return { url, finalUrl: main.finalUrl, html: combinedHtml };
}

async function runSelfTest() {
  console.log('Running DOROGO Lead Discovery 6-Stage Filter Self-Test...\n');
  const fixtures: { label: string; input: CandidatePageInput }[] = [
    {
      label: '1. Luxury Lake Como Planner (Should PASS)',
      input: {
        url: 'https://atelierlarioweddings.it',
        html: `<!doctype html><html lang="it"><head><title>Atelier Lario | Destination Wedding Planner Lake Como</title></head>
          <body>
            <h1>Bespoke Destination Weddings on Lake Como & Milan</h1>
            <p>We design multi-day luxury weddings at Villa Balbiano, Villa d'Este in Cernobbio, and Villa del Balbianello in Tremezzina.</p>
            <p>Featured in Vogue Italia. Contact founder Sofia Conti at <a href="mailto:sofia@atelierlarioweddings.it">sofia@atelierlarioweddings.it</a> or +39 031 555 0192.</p>
            <a href="https://instagram.com/atelierlarioweddings">Instagram</a>
          </body></html>`,
      },
    },
    {
      label: '2. Directory Listing URL (Should REJECT: directory_blocked)',
      input: {
        url: 'https://www.matrimonio.com/wedding-planner/como-lake-events--e12345',
        html: `<html><body>Wedding Planner on Matrimonio.com</body></html>`,
      },
    },
    {
      label: '3. Budget / Party Decorator (Should REJECT: budget_or_non_luxury)',
      input: {
        url: 'https://festeeconomiche.it',
        html: `<html><head><title>Matrimoni Low Cost e Feste per Bambini</title></head>
          <body>Organizziamo matrimoni economici fai da te, gonfiabili e animazione bambini. Email: info@festeeconomiche.it</body></html>`,
      },
    },
    {
      label: '4. Outside Target Market — Puglia Only (Should REJECT: outside_region)',
      input: {
        url: 'https://apuliaweddingsonly.com',
        html: `<html><head><title>Luxury Weddings in Puglia & Salento</title></head>
          <body>We exclusively plan weddings at masserie in Ostuni, Lecce and Bari. Contact: hello@apuliaweddingsonly.com</body></html>`,
      },
    },
  ];

  const accepted: any[] = [];
  for (const f of fixtures) {
    const res = await evaluateLeadCandidate(f.input, {
      existingProspects: accepted,
      mxResolver: async () => 'mx_ok',
      aiHookExtractor: async () => ({
        hook: "Your multi-day celebrations at Villa Balbiano and Villa d'Este caught our eye.",
        hook_type: 'venue',
        confidence: 'high',
        evidence: "multi-day luxury weddings at Villa Balbiano, Villa d'Este in Cernobbio",
        language_detected: 'en',
        segment_guess: 'international',
        weddings_per_year_guess: 15,
        key_venues: ['Villa Balbiano', "Villa d'Este", 'Villa del Balbianello'],
        contact_name: 'Sofia Conti',
      }),
    });
    if (res.qualified && res.prospect) accepted.push(res.prospect);
    console.log(`${res.qualified ? '✅ PASS' : '⛔ REJECT'} · ${f.label}`);
    if (res.qualified && res.prospect) {
      console.log(`   → Agency: ${res.prospect.agency_name} | Email: ${res.prospect.email} | Score: ${res.prospect.priority_score} | Status: ${res.prospect.status}`);
      console.log(`   → Venues: ${res.prospect.key_venues.join(', ')}`);
      console.log(`   → Verified Hook (${res.prospect.hook_confidence}): "${res.prospect.personalization_hook}"\n`);
    } else {
      console.log(`   → Stage: ${res.stage} | Reason: ${res.rejectReason}\n`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test') || args.length === 0) {
    await runSelfTest();
    return;
  }

  const inputIdx = args.indexOf('--input');
  const outIdx = args.indexOf('--out');
  const inputFile = inputIdx >= 0 ? args[inputIdx + 1] : null;
  const outFile = outIdx >= 0 ? args[outIdx + 1] : 'discovered_leads.csv';

  if (!inputFile || !fs.existsSync(inputFile)) {
    console.error('Usage: node --experimental-strip-types scripts/discover-leads.ts --input <urls.txt> [--out discovered_leads.csv]');
    process.exit(1);
  }

  const rawLines = fs
    .readFileSync(inputFile, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  const accepted: any[] = [];
  const rejected: { url: string; stage: string; reason: string | null }[] = [];

  for (const line of rawLines) {
    const url = line.split(',')[0].trim();
    try {
      const page = await fetchCandidateWithContactPages(url);
      const res = await evaluateLeadCandidate(page, {
        existingProspects: accepted,
        aiHookExtractor: process.env.GEMINI_API_KEY ? callGeminiHook : undefined,
      });
      if (res.qualified && res.prospect) {
        accepted.push(res.prospect);
        console.log(`✅ [PASS] ${res.prospect.agency_name} (${res.prospect.email}) · score ${res.prospect.priority_score}`);
      } else {
        rejected.push({ url, stage: res.stage, reason: res.rejectReason });
        console.log(`⛔ [SKIP:${res.stage}] ${url} — ${res.rejectReason}`);
      }
    } catch (e) {
      rejected.push({ url, stage: 'dead_domain', reason: (e as Error).message });
      console.log(`⛔ [DEAD] ${url} — ${(e as Error).message}`);
    }
  }

  const cols = [
    'agency_name', 'contact_name', 'role', 'email', 'email_status', 'phone', 'whatsapp',
    'website', 'instagram_handle', 'location', 'type', 'segment', 'language', 'source',
    'source_detail', 'priority_score', 'status', 'personalization_hook', 'hook_type',
  ];
  const csv = core.toCSV(accepted, cols);
  fs.writeFileSync(path.resolve(outFile), csv, 'utf8');
  console.log(`\nDone: ${accepted.length} qualified leads written to ${outFile} (${rejected.length} rejected).`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
