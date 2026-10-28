#!/usr/bin/env node
/**
 * CLI parser for HubSpot AI Search Grader PDF reports.
 * Usage:
 *   node scripts/parse-hubspot-pdf.mjs [path/to/report.pdf]
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHubSpotGraderText, computeGraderHistoricalComparison } from '../app/services/live_audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const targetPdf = process.argv[2] || resolve(__dirname, '../data/visibility/reports/dorogo_hubspot_grader_2026-10-28.pdf');

if (!existsSync(targetPdf)) {
  console.error(`Error: File not found at ${targetPdf}`);
  process.exit(1);
}

console.log(`📄 Extracting text from ${targetPdf}...`);

// Use PyMuPDF via python3 to reliably dump full document text
const pyScript = `
import sys, pymupdf as fitz
doc = fitz.open(sys.argv[1])
full = []
for page in doc:
    full.append(page.get_text('text'))
print('\\n===PAGE_BREAK===\\n'.join(full))
`;

let extractedText = '';
try {
  extractedText = execFileSync('python3', ['-c', pyScript, targetPdf], { encoding: 'utf-8' });
} catch (e) {
  console.error('Failed to extract PDF text via PyMuPDF:', e.message);
  process.exit(1);
}

const parsed = parseHubSpotGraderText(extractedText);
if (!parsed) {
  console.error('Failed to parse HubSpot AI Search Grader structure from extracted text.');
  process.exit(1);
}

parsed.report_file = targetPdf.replace(/.*\/data\/visibility\//, 'data/visibility/');

console.log('✅ Successfully parsed HubSpot AI Search Grader:');
console.log(`   Brand: ${parsed.brand} (${parsed.location})`);
console.log(`   Composite Score: ${parsed.overall_composite_score}/100`);
console.log(`   * Perplexity Sonar:  ${parsed.engines.perplexity.score}/100 (SOV: ${parsed.engines.perplexity.dorogo_sov_pct}% · Rank: #${parsed.engines.perplexity.dorogo_rank})`);
console.log(`   * ChatGPT (Luna):    ${parsed.engines.chatgpt.score}/100 (SOV: ${parsed.engines.chatgpt.dorogo_sov_pct}% · Rank: #${parsed.engines.chatgpt.dorogo_rank})`);
console.log(`   * Google Gemini:     ${parsed.engines.gemini.score}/100 (SOV: ${parsed.engines.gemini.dorogo_sov_pct}% · Rank: #${parsed.engines.gemini.dorogo_rank})`);
console.log(`   Podium: 🥇 1st ${parsed.podium.first.name} (${parsed.podium.first.avg_sov_pct}%) | 🥈 2nd ${parsed.podium.second.name} (${parsed.podium.second.avg_sov_pct}%) | 🥉 3rd ${parsed.podium.third.name} (${parsed.podium.third.avg_sov_pct}%)`);
console.log(`   DOROGO Market Rank: #${parsed.podium.dorogo.overall_rank} (${parsed.podium.dorogo.avg_sov_pct}% SOV)`);

// Append or update data/visibility_grader_history.json
const historyFile = resolve(__dirname, '../data/visibility_grader_history.json');
let history = [];
if (existsSync(historyFile)) {
  try {
    history = JSON.parse(readFileSync(historyFile, 'utf-8'));
  } catch (_) {}
}

const dateKey = parsed.timestamp.slice(0, 10);
const existingIdx = history.findIndex(h => h.timestamp.slice(0, 10) === dateKey);
if (existingIdx >= 0) {
  history[existingIdx] = parsed;
} else {
  history.push(parsed);
}

history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf-8');
console.log(`💾 Saved snapshot to ${historyFile} (${history.length} snapshots total)`);

const delta = computeGraderHistoricalComparison(history);
if (delta) {
  console.log(`📈 14-Day Velocity: SOV ${delta.sov_delta >= 0 ? '+' : ''}${delta.sov_delta}% | Overall Rank ${delta.rank_delta >= 0 ? '+' : ''}${delta.rank_delta} | Perplexity Rank ${delta.perp_rank_delta >= 0 ? '+' : ''}${delta.perp_rank_delta}`);
}
