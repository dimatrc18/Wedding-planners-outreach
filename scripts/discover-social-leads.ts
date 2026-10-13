#!/usr/bin/env -S node --experimental-strip-types
/**
 * DOROGO Multi-Market Social Discovery (Instagram / TikTok)
 * 
 * Usage:
 *   # Discover leads across default market queries:
 *   node --experimental-strip-types scripts/discover-social-leads.ts --market kz --limit 10
 *   node --experimental-strip-types scripts/discover-social-leads.ts --all --out discovered_social.csv
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as core from '../supabase/functions/_shared/core/index.js';
import { evaluateLeadCandidate, type CandidatePageInput } from './discover-leads.ts';

export interface SocialQueryConfig {
  market: 'kz' | 'ae' | 'uk' | 'us' | 'it';
  language: 'ru' | 'en' | 'it';
  label: string;
  query: string;
}

export const SOCIAL_SEARCH_QUERIES: SocialQueryConfig[] = [
  {
    market: 'kz',
    language: 'ru',
    label: 'Kazakhstan & CIS Luxury Planners (Russian)',
    query: 'site:instagram.com ("свадьба в италии" OR "организатор свадеб" OR "свадьба на комо") ("озеро комо" OR "италия" OR "милан") ("gmail.com" OR "whatsapp")',
  },
  {
    market: 'ae',
    language: 'en',
    label: 'UAE & Gulf (GCC) Luxury Planners',
    query: 'site:instagram.com ("destination wedding planner" OR "luxury weddings") ("lake como" OR "lake garda" OR "milan") ("dubai" OR "uae" OR "doha" OR "riyadh") ("email" OR "gmail.com" OR "whatsapp")',
  },
  {
    market: 'uk',
    language: 'en',
    label: 'UK Destination Planners',
    query: 'site:instagram.com "destination wedding planner" ("lake como" OR "lake garda" OR "milan") ("london" OR "uk") ("gmail.com" OR "email")',
  },
  {
    market: 'us',
    language: 'en',
    label: 'US Destination Planners',
    query: 'site:instagram.com ("wedding planner" OR "destination weddings") ("lake como" OR "italy") ("new york" OR "california" OR "miami" OR "los angeles") ("gmail.com" OR "contact")',
  },
  {
    market: 'it',
    language: 'it',
    label: 'Local Italian Planners',
    query: 'site:instagram.com ("wedding planner" OR "organizzatrice matrimoni") ("lago di como" OR "milano" OR "lago di garda") ("email" OR "contatti" OR "gmail.com")',
  },
];

export async function fetchViaJina(url: string, timeoutMs = 8000): Promise<string> {
  const target = url.startsWith('http') ? url : `https://${url}`;
  try {
    const res = await fetch(`https://r.jina.ai/${target}`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  }
}

export function parseSocialSnippet(title: string, snippet: string, link: string) {
  const text = `${title} ${snippet}`;
  const emails = [...text.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)].map((m) => m[0].toLowerCase());
  const phones = [...text.matchAll(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g)].map((m) => m[0].trim());
  const igMatch = link.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
  const handle = igMatch ? igMatch[1].replace(/\/.*$/, '') : '';

  return {
    handle: handle && !['p', 'explore', 'reels', 'stories'].includes(handle) ? handle : '',
    emails: [...new Set(emails)],
    phones: [...new Set(phones)],
    text,
    link,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const marketArg = args.indexOf('--market') >= 0 ? args[args.indexOf('--market') + 1] : null;
  const outArg = args.indexOf('--out') >= 0 ? args[args.indexOf('--out') + 1] : 'discovered_social.csv';
  
  const selectedQueries = marketArg
    ? SOCIAL_SEARCH_QUERIES.filter((q) => q.market === marketArg.toLowerCase())
    : SOCIAL_SEARCH_QUERIES;

  console.log(`\n🔍 DOROGO Social Discovery Engine (Instagram & TikTok Multi-Market)`);
  console.log(`Markets targeted: ${selectedQueries.map((q) => q.market.toUpperCase()).join(', ')}\n`);

  for (const q of selectedQueries) {
    console.log(`📡 [${q.market.toUpperCase()}] ${q.label}`);
    console.log(`   Query: ${q.query}`);
  }
  console.log(`\n💡 To execute search retrieval, feed search snippets or connect Serper/Google Search API.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
