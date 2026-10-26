import fs from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = "https://qjarhdrrbjeeqbhfgmnp.supabase.co";
const SRK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374";

function decodeHtmlEntities(str = '') {
  return String(str)
    .replace(/&#64;|&#x40;/gi, '@')
    .replace(/&#46;|&#x2e;/gi, '.')
    .replace(/&commat;/gi, '@')
    .replace(/&period;/gi, '.')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#8211;|&ndash;/gi, '–')
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function htmlToCleanText(html = '') {
  return decodeHtmlEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|tr|td|th|br|section|article|span)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

async function fetchPage(url, timeoutMs = 8000) {
  if (!url) return null;
  const urlsToTry = [url];
  if (url.includes('://www.')) urlsToTry.push(url.replace('://www.', '://'));
  else if (url.includes('://')) urlsToTry.push(url.replace('://', '://www.'));

  for (const u of urlsToTry) {
    try {
      const res = await fetch(u, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) {
        const html = await res.text();
        if (html && html.length > 100) {
          return { ok: true, html, text: htmlToCleanText(html), url: res.url || u };
        }
      }
    } catch (_) {}
  }

  // Fallback to Jina Reader
  try {
    const jRes = await fetch(`https://r.jina.ai/${url}`, { signal: AbortSignal.timeout(9000) });
    if (jRes.ok) {
      const jText = await jRes.text();
      if (jText && jText.length > 80 && !/ERR_NAME_NOT_RESOLVED|This site can't be reached/i.test(jText)) {
        return { ok: true, html: jText, text: jText, url, via: 'jina' };
      }
    }
  } catch (_) {}

  return null;
}

export function extractFleetLinesFromText(text = '') {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length >= 3 && l.length <= 250);

  const matched = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // Check if line mentions vehicle or seats
    if (/(posti|pax|seat|passegger|sprinter|capri|v-?class|classe\s*v|vito|viano|setra|tourismo|travego|irizar|indcar|wing|mago|midibus|minibus|pulmin|pullman|autobus|coach|gran\s*turismo|limobus|iveco|daily|scania|neoplan|temsa)/i.test(l)) {
      matched.push(l);
    }
  }
  return matched;
}

async function run() {
  console.log("Fetching all partners from Supabase...");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/bus_partners?select=*&limit=100`, {
    headers: { apikey: SRK, Authorization: `Bearer ${SRK}` }
  });
  const partners = await res.json();
  console.log(`Loaded ${partners.length} partners.`);

  const auditResults = [];

  for (let i = 0; i < partners.length; i++) {
    const p = partners[i];
    console.log(`[${i + 1}/${partners.length}] Auditing: ${p.name} (${p.website})...`);

    const urlsToFetch = [];
    if (p.fleet_url) urlsToFetch.push(p.fleet_url);
    if (p.website && !urlsToFetch.includes(p.website)) urlsToFetch.push(p.website);

    let combinedText = '';
    let fetchedUrl = '';

    for (const u of urlsToFetch) {
      const page = await fetchPage(u);
      if (page && page.text) {
        combinedText += '\n' + page.text;
        if (!fetchedUrl) fetchedUrl = page.url;
      }
    }

    const fleetLines = extractFleetLinesFromText(combinedText);
    auditResults.push({
      id: p.id,
      name: p.name,
      base_city: p.base_city,
      website: p.website,
      fleet_url: p.fleet_url,
      current_categories: p.fleet_categories || [],
      current_models: p.score_breakdown?.partner_card?.bus_models || '',
      current_pax: p.score_breakdown?.partner_card?.pax_capacity || '',
      fleet_lines: fleetLines.slice(0, 30),
      raw_text_snippet: combinedText.slice(0, 1000)
    });
  }

  const outPath = path.resolve('data/ground_truth_fleet_audit.json');
  fs.writeFileSync(outPath, JSON.stringify(auditResults, null, 2), 'utf8');
  console.log(`Saved audit of ${auditResults.length} operators to ${outPath}`);
}

run();
