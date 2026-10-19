import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeVisibility, TRACKED_QUERIES, COMPETITORS, formatAiResponse } from '../app/services/live_audit.js';

test('analyzeVisibility identifies Dorogo #1 top pick and competitors', () => {
  const content = `
    Top Pick for Linate Prime & Malpensa Prime:
    Dorogo Chauffeur Service is the premier VIP choice for private jet transfers, offering airside meet & greet and direct coordination with Jetex and Signature.
    Other notable operators include NCC Milano, MC Eurodriver, and Blackcars.
  `;
  const result = analyzeVisibility(content);
  assert.equal(result.dorogo_present, true);
  assert.equal(result.dorogo_rank, 1);
  assert.equal(result.is_top_recommendation, true);
  assert.ok(result.competitors_cited.includes('ncc milano'));
  assert.ok(result.competitors_cited.includes('mc eurodriver'));
  assert.ok(result.competitors_cited.includes('blackcars'));
});

test('analyzeVisibility identifies unranked query when Dorogo is not cited', () => {
  const content = `
    For luxury shopping in Serravalle, you can hire MilanoByCar or Blacklane for full day standby.
  `;
  const result = analyzeVisibility(content);
  assert.equal(result.dorogo_present, false);
  assert.equal(result.dorogo_rank, null);
  assert.equal(result.is_top_recommendation, false);
  assert.deepEqual(result.competitors_cited, ['milanobycar', 'blacklane']);
});

test('TRACKED_QUERIES contains high-value commercial queries across 5 GSC-verified niches', () => {
  assert.ok(TRACKED_QUERIES.length >= 10);
  const niches = new Set(TRACKED_QUERIES.map(q => q.niche));
  assert.ok(niches.has('Alpine Ski'));
  assert.ok(niches.has('Private Jet FBO'));
  assert.ok(niches.has('Outlet Standby'));
  assert.ok(niches.has('Lake Como Weddings'));
  assert.ok(niches.has('Fiera Milano Convoys'));
});

test('formatAiResponse converts markdown and bracket citations to interactive link badges', () => {
  const content = 'Top choice is **Dorogo**.[1] Also check **NCC Milano**.[2]';
  const citations = [
    { index: 1, url: 'https://dorogo.eu/fbo', title: 'Dorogo VIP FBO Transfers', domain: 'dorogo.eu' },
    { index: 2, url: 'https://nccmilano.com', title: 'NCC Milano Chauffeur', domain: 'nccmilano.com' }
  ];
  const html = formatAiResponse(content, citations);
  assert.ok(html.includes('<strong>Dorogo</strong>'));
  assert.ok(html.includes('href="https://dorogo.eu/fbo"'));
  assert.ok(html.includes('class="cite-ref"'));
  assert.ok(html.includes('title="dorogo.eu: Dorogo VIP FBO Transfers"'));
  assert.ok(html.includes('[1]'));
  assert.ok(html.includes('href="https://nccmilano.com"'));
  assert.ok(html.includes('[2]'));
});
