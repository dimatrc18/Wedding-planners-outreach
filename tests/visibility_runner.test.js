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

test('normalizeCompetitorName deduplicates case variations and aliases', async () => {
  const { normalizeCompetitorName } = await import('../app/services/live_audit.js');
  assert.equal(normalizeCompetitorName('milanobycar'), 'MilanoByCar');
  assert.equal(normalizeCompetitorName('MilanobyCar'), 'MilanoByCar');
  assert.equal(normalizeCompetitorName('nccmilano'), 'NCC Milano');
  assert.equal(normalizeCompetitorName('NCC Milano'), 'NCC Milano');
  assert.equal(normalizeCompetitorName('taxitransfermilan'), 'Taxi Transfer Milan');
  assert.equal(normalizeCompetitorName('como limo lux (cll)'), 'Como Limo Lux');
});

test('parseHubSpotGraderText extracts exact engine scores, category breakdowns, and competitor SOVs', async () => {
  const { parseHubSpotGraderText } = await import('../app/services/live_audit.js');

  const sampleHubSpotText = `
AI Search Grader
DOROGO
across 3 LLM providers in Milan, Italy for NCC Private Chauffeur Service, Luxury Airport & Alps
Transfers services in the Travel & Tourism industry.
Details
LLM Provider
AI Search Score (Overall)
Brand Recognition
Market Score
Presence Quality
Brand Sentiment
Share of Voice
Powers ChatGPT
29
This score has room for growth
/20 See details 2
/10 See details 3
/20 See details 3
/40 See details 20
/10 See details 1
Real-Time AI-Powered Answers
49
You’re on the right track
/20 See details 4
/10 See details 3
/20 See details 7
/40 See details 31
/10 See details 4
Supports Google Results
49
You’re on the right track
/20 See details 6
/10 See details 3
/20 See details 7
/40 See details 33
/10 See details 0

Market Position Breakdown
DOROGO 8 %
Blacklane 24 %
SIXT ride 19 %
Welcome Pi... 14 %
Other 35 %

DOROGO 18 %
Blacklane 22 %
Welcome Pi... 14 %
Wheely 10 %
Sixt ride 9 %
Viator 12 %
Local Mila... 8 %
Other 7 %

DOROGO 3.5 %
Blacklane 32 %
Wheely 18.5 %
Sixt Limou... 14 %
Siptea Lim... 8 %
Uber Black 12 %
Other 12 %
`;

  const parsed = parseHubSpotGraderText(sampleHubSpotText);
  assert.ok(parsed, 'Parser must return structured object');
  assert.equal(parsed.brand, 'DOROGO');
  assert.equal(parsed.location, 'Milan, Italy');

  // Engines overall scores
  assert.equal(parsed.engines.chatgpt.score, 29);
  assert.equal(parsed.engines.perplexity.score, 49);
  assert.equal(parsed.engines.gemini.score, 49);

  // Perplexity Share of Voice and Podium
  assert.equal(parsed.engines.perplexity.dorogo_sov_pct, 18.0);
  assert.equal(parsed.engines.perplexity.dorogo_rank, 2, 'DOROGO must rank #2 on Perplexity right behind Blacklane');

  // ChatGPT Share of Voice
  assert.equal(parsed.engines.chatgpt.dorogo_sov_pct, 8.0);
  assert.equal(parsed.engines.chatgpt.dorogo_rank, 4);

  // Gemini Share of Voice
  assert.equal(parsed.engines.gemini.dorogo_sov_pct, 3.5);

  // Competitor Podium
  assert.equal(parsed.podium.first.name, 'Blacklane');
  assert.ok(parsed.podium.first.avg_sov_pct >= 20.0);
  assert.equal(parsed.podium.dorogo.overall_rank, 4);
});

test('computeGraderHistoricalComparison calculates bi-weekly 14-day deltas', async () => {
  const { computeGraderHistoricalComparison } = await import('../app/services/live_audit.js');

  const history = [
    {
      timestamp: '2026-10-14T10:00:00.000Z',
      overall_composite_score: 36.0,
      podium: {
        dorogo: { overall_rank: 5, avg_sov_pct: 6.2, perplexity_rank: 3, perplexity_sov: 12.0 }
      }
    },
    {
      timestamp: '2026-10-28T09:42:00.000Z',
      overall_composite_score: 42.3,
      podium: {
        dorogo: { overall_rank: 4, avg_sov_pct: 9.8, perplexity_rank: 2, perplexity_sov: 18.0 }
      }
    }
  ];

  const delta = computeGraderHistoricalComparison(history);
  assert.ok(delta);
  assert.equal(delta.sov_delta, 3.6, 'SOV lift must be +3.6%');
  assert.equal(delta.rank_delta, 1, 'Rank improvement must be +1 position');
  assert.equal(delta.perp_rank_delta, 1, 'Perplexity moved from #3 to #2 (+1)');
});

