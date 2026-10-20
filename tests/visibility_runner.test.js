import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  analyzeVisibility, 
  TRACKED_QUERIES, 
  COMPETITORS, 
  formatAiResponse, 
  saveVisibilityAction, 
  deleteVisibilityAction,
  cleanSnippetPreview,
  computeHistoricalComparison
} from '../app/services/live_audit.js';

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

test('saveVisibilityAction and deleteVisibilityAction persist actions cleanly', () => {
  // Mock localStorage
  const storage = {};
  global.localStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); }
  };

  const newAction = {
    id: 'test_act_1',
    date: '2026-10-20',
    niche: 'Lake Como Weddings',
    category: 'Web Content & Specs',
    title: 'Published Villa Balbianello logistics guide',
    verdict: 'effective'
  };

  const saved = saveVisibilityAction(newAction);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].title, 'Published Villa Balbianello logistics guide');

  const afterDelete = deleteVisibilityAction('test_act_1');
  assert.equal(afterDelete.length, 0);
});

test('cleanSnippetPreview strips markdown asterisks, bracket citations, and caps length', () => {
  const raw = 'For **heavy ski gear**, **DOROGO** and **ZoneTransfers** stand out explicitly.[1][2][3] They provide winter-equipped vehicles.';
  const preview = cleanSnippetPreview(raw, 70);
  assert.ok(!preview.includes('**'));
  assert.ok(!preview.includes('[1]'));
  assert.ok(preview.length <= 75); // with ellipsis
  assert.ok(preview.endsWith('…'));
});

test('computeHistoricalComparison calculates deltas vs past week and baseline', () => {
  const mockHistory = [
    {
      timestamp: '2026-10-01T10:00:00Z',
      top1_count: 1,
      top1_rate_pct: 10.0,
      top3_count: 2,
      top3_rate_pct: 20.0,
      cited_count: 3,
      citation_rate_pct: 30.0,
      details: [{ id: 'q1', dorogo_rank: 2 }, { id: 'q2', dorogo_rank: null }]
    },
    {
      timestamp: '2026-10-20T10:00:00Z',
      top1_count: 2,
      top1_rate_pct: 20.0,
      top3_count: 4,
      top3_rate_pct: 40.0,
      cited_count: 6,
      citation_rate_pct: 60.0,
      details: [{ id: 'q1', dorogo_rank: 1 }, { id: 'q2', dorogo_rank: 3 }]
    }
  ];

  const comp = computeHistoricalComparison(mockHistory, 1);
  assert.ok(comp);
  assert.equal(comp.deltaWeek.top1, 10.0);
  assert.equal(comp.deltaWeek.top3, 20.0);
  assert.equal(comp.deltaWeek.cite, 30.0);
  assert.equal(comp.routeTrends.get('q1').trend, 'up');
  assert.equal(comp.routeTrends.get('q1').deltaText, '▲ Rose to #1 (+1)');
  assert.equal(comp.routeTrends.get('q2').trend, 'up');
  assert.equal(comp.routeTrends.get('q2').deltaText, '★ Ranked (#3)');
});
