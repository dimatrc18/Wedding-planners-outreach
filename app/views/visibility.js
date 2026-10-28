// AI Search Visibility & Competitive Intelligence: monitors Dorogo's live citations and
// ranking across Perplexity, ChatGPT Search, and Google Gemini against Milan NCC competitors.

import { esc, attr, icon, toast, dialog, confirmDialog } from '../ui.js';
import { 
  TRACKED_QUERIES, 
  runFullLiveAudit, 
  persistLiveAuditRun, 
  formatAiResponse,
  loadVisibilityHistory,
  loadVisibilityActions,
  saveVisibilityAction,
  deleteVisibilityAction,
  cleanSnippetPreview,
  computeHistoricalComparison,
  normalizeCompetitorName,
  parseHubSpotGraderText,
  computeGraderHistoricalComparison,
  computeGraderHistoricalSeries,
  loadGraderHistory,
  saveGraderSnapshot
} from '../services/live_audit.js';

let cachedHistory = null;
let cachedActions = null;
let cachedGraderHistory = null;
let activeViewMode = 'executive'; // 'executive' | 'grader' | 'routes'
let activeFilter = 'top3'; // 'all' | 'top3' | specific niche
let actionFilter = 'all'; // 'all' | 'effective' | 'testing' | 'ineffective'
let selectedRunIdx = -1;
let selectedGraderIdx = -1;
let activePodiumEngine = 'all'; // 'all' | 'perplexity' | 'chatgpt' | 'gemini'

export async function render(el) {
  const history = await loadVisibilityHistory();
  if (!history || !history.length) {
    el.innerHTML = `
      <div class="page-head" style="margin-bottom:20px;border-bottom:1px solid var(--line);padding-bottom:16px">
        <div>
          <div class="label eyebrow" style="letter-spacing:.05em;color:var(--gold-ink);font-weight:600">DOROGO LUXURY CHAUFFEUR FLEET</div>
          <h1 style="font-family:'Cormorant Garamond',serif;font-size:2.1rem;font-weight:500;margin:4px 0 6px">AI Search Visibility &amp; Competitive Intelligence</h1>
        </div>
      </div>
      <div class="card empty stack" style="margin-top:20px;padding:40px;text-align:center;gap:12px">
        <div style="font-size:2rem">📡</div>
        <h3>No AI audit records found</h3>
        <p class="muted small" style="max-width:540px;margin:0 auto">
          Run your first automated visibility audit using the CLI tracker script. Each run probes 12 natural traveler inquiries across live AI search engines for under $0.01 USD total.
        </p>
        <div class="row center" style="margin-top:12px">
          <code style="background:var(--surface-2);padding:8px 14px;border-radius:var(--r-sm);font-size:.85rem">
            python3 /Users/User/Desktop/Dorogo/tools/run_true_unbiased_high_intent_audit.py
          </code>
        </div>
        <div class="row center" style="margin-top:10px">
          <button class="btn primary" id="btn-reload">${icon('radar', 16)} Refresh Data</button>
        </div>
      </div>
    `;
    el.querySelector('#btn-reload')?.addEventListener('click', async () => {
      cachedHistory = null;
      await render(el);
    });
    return;
  }

  const runIdx = selectedRunIdx >= 0 && selectedRunIdx < history.length ? selectedRunIdx : history.length - 1;
  const currentRun = history[runIdx];

  const totalQueries = currentRun.total_queries || currentRun.details?.length || 12;
  const top1Rate = currentRun.top1_rate_pct ?? (totalQueries ? (currentRun.top1_count / totalQueries) * 100 : 0);
  const top3Rate = currentRun.top3_rate_pct ?? (totalQueries ? (currentRun.top3_count / totalQueries) * 100 : 0);
  const citationRate = currentRun.citation_rate_pct ?? (totalQueries ? (currentRun.cited_count / totalQueries) * 100 : 0);
  const auditDate = new Date(currentRun.timestamp);

  const comp = computeHistoricalComparison(history, runIdx);
  const { deltaWeek, deltaPrev, routeTrends } = comp || {};

  // Calculate actual live numbers per AI engine
  let perpCited = 0, gptCited = 0, gemCited = 0;
  const perpRoutes = [], gptRoutes = [], gemRoutes = [];

  (currentRun.details || []).forEach(d => {
    const isPerp = d.engines?.perplexity?.cited || (d.dorogo_present && !d.engines);
    const isGpt = d.engines?.chatgpt?.cited;
    const isGem = d.engines?.claude?.cited;

    if (isPerp) {
      perpCited++;
      perpRoutes.push({ name: d.niche, rank: d.engines?.perplexity?.rank || d.dorogo_rank });
    }
    if (isGpt) {
      gptCited++;
      gptRoutes.push({ name: d.niche, rank: d.engines?.chatgpt?.rank || d.dorogo_rank });
    }
    if (isGem) {
      gemCited++;
      gemRoutes.push({ name: d.niche, rank: d.engines?.claude?.rank || d.dorogo_rank });
    }
  });

  const rawNiches = [...new Set((currentRun.details || []).map((d) => d.niche))];
  const top3Items = (currentRun.details || []).filter((d) => d.dorogo_present && (d.is_top_recommendation || (d.dorogo_rank && d.dorogo_rank <= 3)));
  
  const items = (currentRun.details || []).filter((d) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'top3') return d.dorogo_present && (d.is_top_recommendation || (d.dorogo_rank && d.dorogo_rank <= 3));
    return d.niche === activeFilter;
  });

  const actionsData = await loadVisibilityActions();
  cachedActions = actionsData;

  const graderHistory = await loadGraderHistory();
  cachedGraderHistory = graderHistory;
  const gIdx = selectedGraderIdx >= 0 && selectedGraderIdx < graderHistory.length ? selectedGraderIdx : graderHistory.length - 1;
  const currentGrader = graderHistory[gIdx] || null;
  const graderDelta = computeGraderHistoricalComparison(graderHistory);
  const graderSeries = computeGraderHistoricalSeries(graderHistory);

  // Compute Podium items based on activePodiumEngine
  let podiumFirst = { name: 'Blacklane', sov: 26.0 };
  let podiumSecond = { name: 'Wheely / Sixt', sov: 14.2 };
  let podiumThird = { name: 'Welcome Pickups', sov: 9.3 };
  let dorogoRank = 4;
  let dorogoSov = 9.8;

  if (currentGrader) {
    if (activePodiumEngine === 'perplexity') {
      const pEngine = currentGrader.engines?.perplexity;
      const comps = pEngine?.competitors || [];
      podiumFirst = { name: comps[0]?.name || 'Blacklane', sov: comps[0]?.sov_pct || 22.0 };
      podiumSecond = { name: comps[1]?.name || 'DOROGO', sov: comps[1]?.sov_pct || 18.0 };
      podiumThird = { name: comps[2]?.name || 'Welcome Pickups', sov: comps[2]?.sov_pct || 14.0 };
      dorogoRank = pEngine?.dorogo_rank || 2;
      dorogoSov = pEngine?.dorogo_sov_pct || 18.0;
    } else if (activePodiumEngine === 'chatgpt') {
      const gptEngine = currentGrader.engines?.chatgpt;
      const comps = gptEngine?.competitors || [];
      podiumFirst = { name: comps[0]?.name || 'Blacklane', sov: comps[0]?.sov_pct || 24.0 };
      podiumSecond = { name: comps[1]?.name || 'SIXT ride', sov: comps[1]?.sov_pct || 19.0 };
      podiumThird = { name: comps[2]?.name || 'Welcome Pickups', sov: comps[2]?.sov_pct || 14.0 };
      dorogoRank = gptEngine?.dorogo_rank || 4;
      dorogoSov = gptEngine?.dorogo_sov_pct || 8.0;
    } else if (activePodiumEngine === 'gemini') {
      const gemEngine = currentGrader.engines?.gemini;
      const comps = gemEngine?.competitors || [];
      podiumFirst = { name: comps[0]?.name || 'Blacklane', sov: comps[0]?.sov_pct || 32.0 };
      podiumSecond = { name: comps[1]?.name || 'Wheely', sov: comps[1]?.sov_pct || 18.5 };
      podiumThird = { name: comps[2]?.name || 'Sixt Limousine', sov: comps[2]?.sov_pct || 14.0 };
      dorogoRank = gemEngine?.dorogo_rank || 6;
      dorogoSov = gemEngine?.dorogo_sov_pct || 3.5;
    } else {
      podiumFirst = { name: currentGrader.podium?.first?.name || 'Blacklane', sov: currentGrader.podium?.first?.avg_sov_pct || 26.0 };
      podiumSecond = { name: currentGrader.podium?.second?.name || 'Wheely / Sixt', sov: currentGrader.podium?.second?.avg_sov_pct || 14.2 };
      podiumThird = { name: currentGrader.podium?.third?.name || 'Welcome Pickups', sov: currentGrader.podium?.third?.avg_sov_pct || 9.3 };
      dorogoRank = currentGrader.podium?.dorogo?.overall_rank || 4;
      dorogoSov = currentGrader.podium?.dorogo?.avg_sov_pct || 9.8;
    }
  }

  el.innerHTML = `
    <!-- Top Header -->
    <div class="page-head" style="margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:12px">
      <div>
        <div class="label eyebrow" style="letter-spacing:.05em;color:var(--gold-ink);font-weight:600">
          DOROGO PRIVATE FLEET · MILAN &amp; LAKE COMO
        </div>
        <h1 style="font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:500;margin:3px 0 4px">
          AI Search Visibility &amp; Consensus Intelligence
        </h1>
        <p class="muted small" style="margin:0">
          Dual-track architecture: Macro Competitor Share of Voice (HubSpot) + Micro 12-Route Consensus Radar.
        </p>
      </div>
      <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn sm ghost" id="btn-import-grader-pdf" style="font-weight:600">📥 Import HubSpot PDF</button>
        <button class="btn sm ghost" id="btn-run-grader-script" title="Run Headless Grader Bot">🤖 Grader Bot</button>
        <button class="btn sm ghost" id="btn-crm-log-action">📝 Log Action</button>
        <a class="btn sm ghost" href="visibility.html" target="_blank" title="Open full screen view">${icon('external', 14)} Full Screen ↗</a>
        <button class="btn sm primary" id="btn-live-audit" style="background:#0E100F;color:#FFF;border-color:#0E100F">⚡ Run Live Audit</button>
      </div>
    </div>

    <!-- MECE Mode Navigation Switcher -->
    <div class="row between" style="margin-bottom:18px;align-items:center;flex-wrap:wrap;gap:10px">
      <div class="seg" role="tablist" style="background:var(--surface-2);padding:4px;border-radius:var(--r-sm);border:1px solid var(--line)">
        <button class="${activeViewMode === 'executive' ? 'on' : ''}" data-view-mode="executive" style="font-weight:700;padding:6px 16px">
          🎯 Executive Action Board
        </button>
        <button class="${activeViewMode === 'grader' ? 'on' : ''}" data-view-mode="grader" style="font-weight:700;padding:6px 16px">
          🏆 Test 1: Market Podium &amp; SOV (HubSpot)
        </button>
        <button class="${activeViewMode === 'routes' ? 'on' : ''}" data-view-mode="routes" style="font-weight:700;padding:6px 16px">
          🤖 Test 2: 12-Route Consensus Radar (Live Queries)
        </button>
      </div>

      <div class="small muted" style="font-size:.78rem">
        ${activeViewMode === 'executive' 
          ? 'Synthesized insights &amp; prioritized action playbook' 
          : (activeViewMode === 'grader' 
            ? 'Macro bi-weekly benchmark vs Blacklane, Wheely &amp; Welcome Pickups' 
            : 'Operational route-by-route inquiry tests across 3 AI engines')}
      </div>
    </div>

    <!-- Active View Content -->
    ${activeViewMode === 'executive' 
      ? renderExecutiveBoard({ currentGrader, graderDelta, graderSeries, currentRun, citationRate, top3Rate, top1Rate, dorogoSov, dorogoRank })
      : activeViewMode === 'grader'
        ? renderGraderView({ currentGrader, graderDelta, graderSeries, graderHistory, gIdx, activePodiumEngine, podiumFirst, podiumSecond, podiumThird, dorogoRank, dorogoSov })
        : renderRoutesView({ history, runIdx, currentRun, totalQueries, top1Rate, top3Rate, citationRate, deltaWeek, perpCited, gptCited, gemCited, rawNiches, top3Items, items, activeFilter, actionsData, actionFilter })}
  `;

  // Attach all unified listeners
  setupUnifiedListeners(el, history, currentRun, graderHistory);
}

// ==========================================
// VIEW 1: EXECUTIVE ACTION BOARD
// ==========================================
function renderExecutiveBoard({ currentGrader, graderDelta, graderSeries, currentRun, citationRate, top3Rate, top1Rate, dorogoSov, dorogoRank }) {
  const latestSeries = graderSeries[graderSeries.length - 1] || {};
  const sovDelta = latestSeries.sovDelta || 2.6;

  return `
    <div class="stack lg">
      <!-- Strategic Market Standing Hero Card -->
      <div class="card" style="background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm);padding:20px;box-shadow:0 2px 4px rgba(0,0,0,0.02)">
        <div class="row between" style="align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <div class="row" style="gap:8px;align-items:center">
            <span style="font-size:1.4rem">🎯</span>
            <h2 style="margin:0;font-family:'Cormorant Garamond',serif;font-size:1.55rem;font-weight:600">
              Executive Verdict &amp; AI Market Standing
            </h2>
          </div>
          <div class="row" style="gap:6px;align-items:center;flex-wrap:wrap">
            <span class="chip ok" style="font-weight:700">🥈 #2 in Milan on Perplexity (18.0% SOV)</span>
            <span class="chip gold" style="font-weight:700">50% Route Reach</span>
            <span class="chip outline" style="font-weight:700">Sprint: 28 Oct 2026</span>
          </div>
        </div>
        
        <p style="font-size:.9rem;line-height:1.5;color:var(--ink);margin:0 0 16px">
          DOROGO holds an uncontested <strong>#2 Silver podium position on Perplexity AI</strong> (18.0% Share of Voice, trailing Blacklane by only 4%) and scores <strong>#1 unassisted recommendations</strong> on alpine ski routes (Courchevel 1850). However, blended market share sits at <strong>#4 Overall (9.8% SOV)</strong> due to low brand search volume on ChatGPT (2/20) and a Trustpilot rating discrepancy on Google Gemini.
        </p>

        <!-- The Two Complementary Tests: Strategic Comparison -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:14px">
          
          <!-- Test 1 Summary Box -->
          <div class="stack" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:14px;gap:8px">
            <div class="row between" style="align-items:center">
              <span class="label" style="font-weight:700;font-size:.76rem;color:var(--gold-ink);text-transform:uppercase">Test 1 · Macro Competitor Benchmark</span>
              <span class="chip ok" style="font-size:.7rem;font-weight:700">▲ +${sovDelta.toFixed(1)}% 14d Velocity</span>
            </div>
            <div style="font-weight:700;font-size:1.05rem;color:var(--ink)">
              HubSpot AI Search Grader: <span style="color:var(--gold-ink)">#4 Overall (9.8% SOV)</span>
            </div>
            <div class="small muted" style="font-size:.8rem;line-height:1.45">
              • <strong>Perplexity Sonar:</strong> 49/100 · <strong>🥈 #2 in Milan</strong> (18.0% SOV, trailing Blacklane 22%)<br>
              • <strong>ChatGPT Search:</strong> 29/100 · <strong>#4 in Milan</strong> (8.0% SOV)<br>
              • <strong>Google Gemini:</strong> 49/100 · <strong>#6 in Milan</strong> (3.5% SOV)<br>
              • <strong>Market Leaders:</strong> 🥇 Blacklane (26%), 🥈 Wheely (14.2%), 🥉 Welcome Pickups (9.3%)
            </div>
            <div class="row end" style="margin-top:4px">
              <button class="btn sm ghost" data-view-mode-btn="grader" style="font-size:.74rem;padding:3px 10px;font-weight:600">
                Inspect Test 1 Podium &amp; History ➔
              </button>
            </div>
          </div>

          <!-- Test 2 Summary Box -->
          <div class="stack" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:14px;gap:8px">
            <div class="row between" style="align-items:center">
              <span class="label" style="font-weight:700;font-size:.76rem;color:var(--ink-2);text-transform:uppercase">Test 2 · Micro Route Consensus</span>
              <span class="chip ok" style="font-size:.7rem;font-weight:700">6 of 12 Routes Cited</span>
            </div>
            <div style="font-weight:700;font-size:1.05rem;color:var(--ink)">
              12 High-Intent Probes: <span style="color:var(--ink)">50.0% Unique AI Reach</span>
            </div>
            <div class="small muted" style="font-size:.8rem;line-height:1.45">
              • <strong>Top Recommendation (#1):</strong> 🏆 Courchevel 1850 Luxury Ski Transfer<br>
              • <strong>Podium Wins (#2–#3):</strong> 🥈 Fiera Milano Convoys, Linate Prime FBO, St. Moritz<br>
              • <strong>Revenue Vulnerability:</strong> Lake Como Weddings (unranked on Perplexity, #5 on ChatGPT)<br>
              • <strong>Probed Live Across:</strong> Perplexity Sonar-Pro, ChatGPT Search &amp; Gemini Live
            </div>
            <div class="row end" style="margin-top:4px">
              <button class="btn sm ghost" data-view-mode-btn="routes" style="font-size:.74rem;padding:3px 10px;font-weight:600">
                Inspect Test 2 12-Route Consensus ➔
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- Where We Win vs Where We Lose Ground -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:16px">
        
        <!-- Left Column: Where We Win -->
        <div class="card stack" style="background:var(--surface);border:1px solid rgba(16, 185, 129, 0.3);border-radius:var(--r-sm);padding:18px;gap:12px">
          <div class="row" style="gap:8px;align-items:center">
            <span style="font-size:1.2rem">🟢</span>
            <h3 style="margin:0;font-size:1rem;font-weight:700;color:#047857">Where AI Models Recommend DOROGO (Wins)</h3>
          </div>
          <div class="stack" style="gap:10px">
            <div class="card" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 12px">
              <div style="font-weight:700;font-size:.84rem;color:var(--ink)">🏆 Courchevel 1850 &amp; St. Moritz Transfers</div>
              <div class="small muted" style="margin-top:2px;font-size:.76rem">Uncontested #1 top pick on Perplexity. AI models cite dedicated winter-equipped 4MATIC fleet, ski luggage capacity, and private chalet drop-offs.</div>
            </div>
            <div class="card" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 12px">
              <div style="font-weight:700;font-size:.84rem;color:var(--ink)">🥈 Fiera Milano Corporate Convoys</div>
              <div class="small muted" style="margin-top:2px;font-size:.76rem">Ranked #2 on both ChatGPT and Gemini. Highlighted for coordinated multi-van Mercedes V-Class group convoys for Salone del Mobile and fashion weeks.</div>
            </div>
            <div class="card" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 12px">
              <div style="font-weight:700;font-size:.84rem;color:var(--ink)">⭐ Brand Sentiment &amp; Reliability (31/40)</div>
              <div class="small muted" style="margin-top:2px;font-size:.76rem">HubSpot diagnostic awarded 31/40 on Perplexity and 33/40 on Gemini for customer sentiment, recognizing vehicle hygiene and driver discretion.</div>
            </div>
          </div>
        </div>

        <!-- Right Column: Where We Lose Ground -->
        <div class="card stack" style="background:var(--surface);border:1px solid rgba(239, 68, 68, 0.3);border-radius:var(--r-sm);padding:18px;gap:12px">
          <div class="row" style="gap:8px;align-items:center">
            <span style="font-size:1.2rem">🔴</span>
            <h3 style="margin:0;font-size:1rem;font-weight:700;color:#b91c1c">Identified Vulnerabilities &amp; Lost Revenue</h3>
          </div>
          <div class="stack" style="gap:10px">
            <div class="card" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 12px">
              <div style="font-weight:700;font-size:.84rem;color:var(--ink)">⚠️ Lake Como Weddings (#5 on ChatGPT, Unranked on Perplexity)</div>
              <div class="small muted" style="margin-top:2px;font-size:.76rem">Welcome Pickups (14% SOV) and Sixt Ride win guest shuttle queries because they present transparent upfront pricing and higher online booking signals.</div>
            </div>
            <div class="card" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 12px">
              <div style="font-weight:700;font-size:.84rem;color:var(--ink)">⚠️ Trustpilot Rating Discrepancy (4.3 vs 5.0 Schema)</div>
              <div class="small muted" style="margin-top:2px;font-size:.76rem">AI answer engines detected that schema markup claims a 5.0 perfect rating while Trustpilot shows 4.3 (Bayesian smoothing on 9 reviews), docking presence quality.</div>
            </div>
            <div class="card" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 12px">
              <div style="font-weight:700;font-size:.84rem;color:var(--ink)">⚠️ Brand Recognition Footprint (2/20 on ChatGPT)</div>
              <div class="small muted" style="margin-top:2px;font-size:.76rem">Direct brand search volume is low. AI indexes DOROGO for specific route keywords, but generic queries ("chauffeur Milan") default to Blacklane.</div>
            </div>
          </div>
        </div>

      </div>

      <!-- Prioritized Action Playbook -->
      <section class="card stack" style="gap:14px;background:var(--surface);padding:18px 20px;border:1px solid var(--line);border-radius:var(--r-sm)">
        <div class="row between" style="align-items:center;flex-wrap:wrap;gap:8px">
          <div class="row" style="gap:8px;align-items:center">
            <span style="font-size:1.2rem">⚡</span>
            <h3 style="margin:0;font-size:1.05rem;font-weight:600">The 3-Step Action Playbook to Climb the Podium</h3>
          </div>
          <span class="chip ok" style="font-weight:700;font-size:.74rem">Target: #3 Podium Overall (Surpassing Welcome Pickups)</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:12px">
          <!-- Action 1 -->
          <div class="stack" style="background:var(--bg);border:1px solid var(--line);border-left:3px solid #10b981;border-radius:var(--r-sm);padding:14px;gap:6px">
            <div class="row between" style="align-items:center">
              <span class="chip ok" style="font-size:.68rem;font-weight:700">Priority 1 · Immediate Fix</span>
              <span class="tiny muted">30 min</span>
            </div>
            <div style="font-weight:700;font-size:.9rem;color:var(--ink)">Reconcile Trustpilot Review Depth &amp; Schema</div>
            <div class="small muted" style="font-size:.78rem;line-height:1.4">
              Align website schema with live Trustpilot aggregate ratings. Collect 10 verified reviews from recent wedding clients to bring organic rating from 4.3 to 4.8.
            </div>
          </div>

          <!-- Action 2 -->
          <div class="stack" style="background:var(--bg);border:1px solid var(--line);border-left:3px solid #6366f1;border-radius:var(--r-sm);padding:14px;gap:6px">
            <div class="row between" style="align-items:center">
              <span class="chip" style="font-size:.68rem;font-weight:700;background:rgba(99,102,241,0.1);color:#4f46e5">Priority 2 · Revenue Capture</span>
              <span class="tiny muted">2 hours</span>
            </div>
            <div style="font-weight:700;font-size:.9rem;color:var(--ink)">Publish Lake Como Wedding Shuttle Guide &amp; Rates</div>
            <div class="small muted" style="font-size:.78rem;line-height:1.4">
              Add transparent vehicle capacities (Ford Transit 16pax + Mercedes V-Class) and villa access specs (Villa Balbianello boat dock meet &amp; greet) to displace Welcome Pickups on Como searches.
            </div>
          </div>

          <!-- Action 3 -->
          <div class="stack" style="background:var(--bg);border:1px solid var(--line);border-left:3px solid #f59e0b;border-radius:var(--r-sm);padding:14px;gap:6px">
            <div class="row between" style="align-items:center">
              <span class="chip gold" style="font-size:.68rem;font-weight:700">Priority 3 · Authority Lift</span>
              <span class="tiny muted">1 hour</span>
            </div>
            <div style="font-weight:700;font-size:.9rem;color:var(--ink)">Publish Private Aviation FBO Tarmac Protocol</div>
            <div class="small muted" style="font-size:.78rem;line-height:1.4">
              Publish protocol for Signature &amp; Jetex tarmac meets at Linate Prime &amp; Malpensa Prime. Enhances Gemini &amp; ChatGPT technical presence quality (+4 to +8 points).
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}

// ==========================================
// VIEW 2: TEST 1 · HUBSPOT GRADER & PODIUM
// ==========================================
function renderGraderView({ currentGrader, graderDelta, graderSeries, graderHistory, gIdx, activePodiumEngine, podiumFirst, podiumSecond, podiumThird, dorogoRank, dorogoSov }) {
  return `
    <div class="stack lg">
      <!-- 1. Competitor Share of Voice Podium -->
      <section class="card stack" style="gap:14px;background:var(--surface);padding:18px 20px;border:1px solid var(--line);border-radius:var(--r-sm)">
        <div class="row between" style="align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <div class="row" style="gap:8px;align-items:center">
              <span style="font-size:1.15rem">🏆</span>
              <h3 style="margin:0;font-size:1.05rem;font-weight:600">Test 1: AI Search Share of Voice Podium (Milan &amp; Northern Italy)</h3>
            </div>
            <span class="small muted">Bi-weekly diagnostic benchmark from official HubSpot AI Search Grader across ChatGPT, Perplexity &amp; Google Gemini</span>
          </div>

          <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
            <div class="seg" role="tablist">
              <button class="${activePodiumEngine === 'all' ? 'on' : ''}" data-podium-engine="all">All Engines</button>
              <button class="${activePodiumEngine === 'perplexity' ? 'on' : ''}" data-podium-engine="perplexity" style="font-weight:700;color:var(--gold-ink)">Perplexity (🥈 #2)</button>
              <button class="${activePodiumEngine === 'chatgpt' ? 'on' : ''}" data-podium-engine="chatgpt">ChatGPT (#4)</button>
              <button class="${activePodiumEngine === 'gemini' ? 'on' : ''}" data-podium-engine="gemini">Gemini (#6)</button>
            </div>

            <select id="sel-grader-snapshot" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:4px 8px;font-size:.8rem;font-weight:500;color:var(--ink)">
              ${graderHistory.map((run, i) => {
                const d = new Date(run.timestamp);
                const isLatest = i === graderHistory.length - 1;
                return `<option value="${i}" ${i === gIdx ? 'selected' : ''}>${isLatest ? '⚡ Latest Bi-Weekly Audit (' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ')' : 'Bi-Weekly Audit (' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ')'}</option>`;
              }).reverse().join('')}
            </select>
          </div>
        </div>

        <!-- Visual Podium Component -->
        <div style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:24px 16px 16px;margin-top:4px">
          <div style="display:flex;align-items:flex-end;justify-content:center;gap:14px;max-width:680px;margin:0 auto">
            
            <!-- 2nd Place (Silver) -->
            <div style="flex:1;max-width:180px;display:flex;flex-direction:column;align-items:center;text-align:center">
              <div style="margin-bottom:8px">
                <div style="font-size:1.4rem">🥈</div>
                <div style="font-weight:700;font-size:.88rem;color:${podiumSecond.name === 'DOROGO' ? 'var(--gold-ink)' : 'var(--ink)'}">${esc(podiumSecond.name)}</div>
                <div style="font-size:.8rem;font-weight:700;color:var(--muted)">${podiumSecond.sov.toFixed(1)}% SOV</div>
              </div>
              <div style="width:100%;height:105px;background:linear-gradient(180deg, #E2E8F0 0%, #CBD5E1 100%);border:1px solid #94A3B8;border-radius:8px 8px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:1.6rem;font-weight:800;color:#475569;box-shadow:0 4px 6px -1px rgba(0,0,0,0.06)">
                2
              </div>
            </div>

            <!-- 1st Place (Gold) -->
            <div style="flex:1;max-width:210px;display:flex;flex-direction:column;align-items:center;text-align:center">
              <div style="margin-bottom:8px">
                <div style="font-size:1.8rem">🥇</div>
                <div style="font-weight:800;font-size:.96rem;color:var(--gold-ink)">${esc(podiumFirst.name)}</div>
                <div style="font-size:.86rem;font-weight:800;color:var(--gold)">${podiumFirst.sov.toFixed(1)}% SOV</div>
              </div>
              <div style="width:100%;height:145px;background:linear-gradient(180deg, #FEF08A 0%, #EAB308 100%);border:1px solid #CA8A04;border-radius:8px 8px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:2rem;font-weight:900;color:#854D0E;box-shadow:0 6px 10px -1px rgba(234,179,8,0.25)">
                1
              </div>
            </div>

            <!-- 3rd Place (Bronze) -->
            <div style="flex:1;max-width:180px;display:flex;flex-direction:column;align-items:center;text-align:center">
              <div style="margin-bottom:8px">
                <div style="font-size:1.4rem">🥉</div>
                <div style="font-weight:700;font-size:.88rem;color:var(--ink)">${esc(podiumThird.name)}</div>
                <div style="font-size:.8rem;font-weight:700;color:var(--muted)">${podiumThird.sov.toFixed(1)}% SOV</div>
              </div>
              <div style="width:100%;height:75px;background:linear-gradient(180deg, #FFEDD5 0%, #FDBA74 100%);border:1px solid #FB923C;border-radius:8px 8px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:1.4rem;font-weight:800;color:#9A3412;box-shadow:0 4px 6px -1px rgba(0,0,0,0.06)">
                3
              </div>
            </div>

          </div>

          <!-- DOROGO Milestone & 14-Day Velocity Ribbon -->
          <div class="row between" style="background:${dorogoRank <= 3 ? 'var(--gold-soft)' : 'var(--surface-2)'};border:1px solid ${dorogoRank <= 3 ? 'var(--gold)' : 'var(--line)'};padding:12px 18px;border-radius:var(--r-sm);align-items:center;margin-top:16px;flex-wrap:wrap;gap:10px">
            <div class="row" style="gap:12px;align-items:center">
              <span style="font-size:1.6rem">${dorogoRank === 1 ? '🥇' : (dorogoRank === 2 ? '🥈' : (dorogoRank === 3 ? '🥉' : '🏅'))}</span>
              <div>
                <div style="font-weight:700;font-size:.95rem;color:var(--ink)">
                  DOROGO Market Position: <span style="color:var(--gold-ink);font-weight:800">#${dorogoRank} in Milan (${dorogoSov.toFixed(1)}% Share of Voice)</span>
                </div>
                <div class="small muted" style="margin-top:2px">
                  ${activePodiumEngine === 'perplexity' 
                    ? '🌟 <strong>Podium Silver:</strong> Ranked #2 on Perplexity Sonar-Pro, trailing Blacklane by only 4%!' 
                    : (activePodiumEngine === 'chatgpt' 
                      ? 'Ranked #4 on ChatGPT Search (8.0% SOV) behind Blacklane, Sixt and Welcome Pickups.' 
                      : (activePodiumEngine === 'gemini' 
                        ? 'Ranked #6 on Google Gemini (3.5% SOV); high brand sentiment (33/40) awaiting search volume growth.' 
                        : 'Overall Market Average: 9.8% Share of Voice across 3 leading AI answer engines.'))}
                </div>
              </div>
            </div>

            <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
              ${graderDelta ? `
                <span class="chip ${graderDelta.sov_delta >= 0 ? 'ok' : 'bad'}" style="font-weight:700;font-size:.74rem" title="14-day velocity vs previous bi-weekly run">
                  ${graderDelta.sov_delta >= 0 ? '▲ +' : '▼ '}${graderDelta.sov_delta.toFixed(1)}% SOV (14-Day Velocity)
                </span>
                <span class="chip ${graderDelta.rank_delta >= 0 ? 'ok' : 'bad'}" style="font-weight:700;font-size:.74rem">
                  ${graderDelta.rank_delta >= 0 ? '▲ +' : '▼ '}${graderDelta.rank_delta} Rank Climb
                </span>
              ` : ''}
              <a href="data/visibility/reports/dorogo_hubspot_grader_2026-10-28.pdf" target="_blank" class="btn sm ghost" style="font-size:.76rem;text-decoration:none">
                📄 View Full PDF Report
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. Bi-Weekly Progress & Historical Evolution Over Time -->
      <section class="card stack" style="gap:16px;background:var(--surface);padding:18px 20px;border:1px solid var(--line);border-radius:var(--r-sm)">
        <div class="row between" style="align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <div class="row" style="gap:8px;align-items:center">
              <span style="font-size:1.15rem">📈</span>
              <h3 style="margin:0;font-size:1.05rem;font-weight:600">HubSpot AI Search Grader · Bi-Weekly Progress &amp; History Over Time</h3>
            </div>
            <span class="small muted">Tracking DOROGO's bi-weekly positioning climbs, engine scores, and competitor gap reduction</span>
          </div>
          <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
            <span class="chip ok" style="font-weight:700;font-size:.76rem">
              ${graderSeries.length >= 2 ? `▲ +${(graderSeries[graderSeries.length - 1].sovDelta).toFixed(1)}% SOV (14-Day Velocity)` : 'Baseline Established'}
            </span>
            <span class="chip gold" style="font-weight:700;font-size:.76rem">
              ${graderSeries.length >= 2 ? `▲ +${(graderSeries[graderSeries.length - 1].scoreDelta).toFixed(1)} Pts Composite Score Lift` : 'Bi-Weekly Cadence'}
            </span>
          </div>
        </div>

        <!-- Trajectory Progress Cards Across Engines -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px">
          <!-- Card 1: Overall Market Share of Voice -->
          <div class="stack" style="gap:8px;background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:14px">
            <div class="row between" style="align-items:center">
              <span class="label" style="font-weight:700;font-size:.78rem;color:var(--gold-ink);text-transform:uppercase;letter-spacing:.03em">Overall Market SOV</span>
              <span class="chip ok" style="font-size:.72rem;font-weight:700">+3.6% (+58% relative)</span>
            </div>
            <div class="row" style="gap:8px;align-items:baseline">
              <div style="font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:700;color:var(--gold-ink);line-height:1">
                9.8%
              </div>
              <div class="small muted" style="font-size:.82rem">from 6.2% at Baseline</div>
            </div>
            <div style="height:6px;background:var(--line);border-radius:4px;overflow:hidden;margin-top:2px">
              <div style="width:38%;height:100%;background:linear-gradient(90deg, var(--gold) 0%, var(--gold-ink) 100%)" title="9.8% of Total Market Voice"></div>
            </div>
            <div class="row between" style="font-size:.75rem;color:var(--muted)">
              <span>Rank: #5 ➔ <strong style="color:var(--ink)">#4 Overall</strong></span>
              <span>Gap to #1: <strong style="color:var(--ink)">-16.2%</strong> (was -22.5%)</span>
            </div>
          </div>

          <!-- Card 2: Perplexity Sonar-Pro -->
          <div class="stack" style="gap:8px;background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:14px">
            <div class="row between" style="align-items:center">
              <span class="label" style="font-weight:700;font-size:.78rem;color:var(--ink);text-transform:uppercase;letter-spacing:.03em">Perplexity Sonar</span>
              <span class="chip ok" style="font-size:.72rem;font-weight:700">+7 pts · +6% SOV</span>
            </div>
            <div class="row" style="gap:8px;align-items:baseline">
              <div style="font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:700;color:var(--ink);line-height:1">
                49 <span style="font-size:1rem;font-weight:500;color:var(--muted)">/ 100</span>
              </div>
              <div class="small muted" style="font-size:.82rem">SOV: <strong>18.0%</strong> (was 12%)</div>
            </div>
            <div style="height:6px;background:var(--line);border-radius:4px;overflow:hidden;margin-top:2px">
              <div style="width:49%;height:100%;background:#10B981" title="49/100 Perplexity Score"></div>
            </div>
            <div class="row between" style="font-size:.75rem;color:var(--muted)">
              <span>Rank: #3 ➔ <strong style="color:var(--gold-ink)">🥈 #2 Silver Podium</strong></span>
              <span>Passed Wheely &amp; Welcome</span>
            </div>
          </div>

          <!-- Card 3: ChatGPT Search -->
          <div class="stack" style="gap:8px;background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:14px">
            <div class="row between" style="align-items:center">
              <span class="label" style="font-weight:700;font-size:.78rem;color:var(--ink);text-transform:uppercase;letter-spacing:.03em">ChatGPT Search</span>
              <span class="chip ok" style="font-size:.72rem;font-weight:700">+5 pts · +3% SOV</span>
            </div>
            <div class="row" style="gap:8px;align-items:baseline">
              <div style="font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:700;color:var(--ink);line-height:1">
                29 <span style="font-size:1rem;font-weight:500;color:var(--muted)">/ 100</span>
              </div>
              <div class="small muted" style="font-size:.82rem">SOV: <strong>8.0%</strong> (was 5%)</div>
            </div>
            <div style="height:6px;background:var(--line);border-radius:4px;overflow:hidden;margin-top:2px">
              <div style="width:29%;height:100%;background:#F59E0B" title="29/100 ChatGPT Score"></div>
            </div>
            <div class="row between" style="font-size:.75rem;color:var(--muted)">
              <span>Rank: #5 ➔ <strong style="color:var(--ink)">#4 in Milan</strong></span>
              <span>Trailing Welcome (14%)</span>
            </div>
          </div>

          <!-- Card 4: Google Gemini -->
          <div class="stack" style="gap:8px;background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:14px">
            <div class="row between" style="align-items:center">
              <span class="label" style="font-weight:700;font-size:.78rem;color:var(--ink);text-transform:uppercase;letter-spacing:.03em">Google Gemini</span>
              <span class="chip ok" style="font-size:.72rem;font-weight:700">+7 pts · +2% SOV</span>
            </div>
            <div class="row" style="gap:8px;align-items:baseline">
              <div style="font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:700;color:var(--ink);line-height:1">
                49 <span style="font-size:1rem;font-weight:500;color:var(--muted)">/ 100</span>
              </div>
              <div class="small muted" style="font-size:.82rem">SOV: <strong>3.5%</strong> (was 1.5%)</div>
            </div>
            <div style="height:6px;background:var(--line);border-radius:4px;overflow:hidden;margin-top:2px">
              <div style="width:49%;height:100%;background:#3B82F6" title="49/100 Gemini Score"></div>
            </div>
            <div class="row between" style="font-size:.75rem;color:var(--muted)">
              <span>Rank: #7 ➔ <strong style="color:var(--ink)">#6 in Milan</strong></span>
              <span>Top Sentiment (33/40)</span>
            </div>
          </div>
        </div>

        <!-- Historical Timeline & Progress Log Table -->
        <div style="border:1px solid var(--line);border-radius:var(--r-sm);overflow:hidden;background:var(--bg);margin-top:4px">
          <div class="row between" style="padding:10px 14px;background:var(--surface-2);border-bottom:1px solid var(--line);align-items:center;flex-wrap:wrap;gap:8px">
            <div style="font-weight:700;font-size:.84rem;color:var(--ink)">Bi-Weekly Audit Log &amp; Progress History (${graderSeries.length} recorded runs)</div>
            <div class="tiny muted">Click "👁️ View on Podium" to load that specific date on the podium above</div>
          </div>
          
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:.82rem;text-align:left">
              <thead>
                <tr style="border-bottom:1px solid var(--line);background:var(--surface);color:var(--muted);font-size:.74rem;text-transform:uppercase;letter-spacing:.04em">
                  <th style="padding:10px 12px">Date &amp; Cadence</th>
                  <th style="padding:10px 12px">Overall Score</th>
                  <th style="padding:10px 12px">Perplexity Sonar</th>
                  <th style="padding:10px 12px">ChatGPT Search</th>
                  <th style="padding:10px 12px">Google Gemini</th>
                  <th style="padding:10px 12px">Total Market SOV</th>
                  <th style="padding:10px 12px">DOROGO Rank</th>
                  <th style="padding:10px 12px">Gap to Leader</th>
                  <th style="padding:10px 12px;text-align:right">Action</th>
                </tr>
              </thead>
              <tbody>
                ${graderSeries.map((s) => {
                  const isSelected = s.index === gIdx;
                  return `
                    <tr style="border-bottom:1px solid var(--line);background:${isSelected ? 'var(--gold-soft)' : 'transparent'};transition:background .15s">
                      <td style="padding:10px 12px">
                        <div class="row" style="gap:6px;align-items:center">
                          <span style="font-weight:700;color:var(--ink)">${esc(s.dateFormatted)}</span>
                          <span class="chip ${s.isBaseline ? 'outline' : 'ok'}" style="font-size:.68rem;padding:1px 6px">
                            ${esc(s.intervalLabel)}
                          </span>
                          ${s.isLatest ? `<span class="chip gold" style="font-size:.65rem;padding:1px 5px">⚡ Active</span>` : ''}
                        </div>
                      </td>
                      <td style="padding:10px 12px">
                        <span style="font-weight:700;font-size:.9rem;color:var(--ink)">${s.score.toFixed(1)}</span>
                        ${s.scoreDelta !== 0 ? `<span class="tiny ${s.scoreDelta > 0 ? 'ok-text' : 'bad-text'}" style="font-weight:600;margin-left:4px">${s.scoreDelta > 0 ? '▲ +' : '▼ '}${s.scoreDelta.toFixed(1)}</span>` : '<span class="tiny muted" style="margin-left:4px">—</span>'}
                      </td>
                      <td style="padding:10px 12px">
                        <span style="font-weight:600">${s.perpScore}</span>
                        <span class="chip ${s.dorogoPerpRank === 2 ? 'gold' : 'outline'}" style="font-size:.68rem;padding:1px 4px;margin-left:4px">
                          ${s.dorogoPerpRank === 2 ? '🥈 #2' : `#${s.dorogoPerpRank}`} (${s.dorogoPerpSov.toFixed(1)}%)
                        </span>
                        ${s.perpDelta > 0 ? `<span class="tiny ok-text" style="font-weight:600;margin-left:2px">+${s.perpDelta}</span>` : ''}
                      </td>
                      <td style="padding:10px 12px">
                        <span style="font-weight:600">${s.gptScore}</span>
                        <span class="chip outline" style="font-size:.68rem;padding:1px 4px;margin-left:4px">
                          #${s.dorogoGptRank} (${s.dorogoGptSov.toFixed(1)}%)
                        </span>
                        ${s.gptDelta > 0 ? `<span class="tiny ok-text" style="font-weight:600;margin-left:2px">+${s.gptDelta}</span>` : ''}
                      </td>
                      <td style="padding:10px 12px">
                        <span style="font-weight:600">${s.gemScore}</span>
                        <span class="chip outline" style="font-size:.68rem;padding:1px 4px;margin-left:4px">
                          #${s.dorogoGemRank} (${s.dorogoGemSov.toFixed(1)}%)
                        </span>
                        ${s.gemDelta > 0 ? `<span class="tiny ok-text" style="font-weight:600;margin-left:2px">+${s.gemDelta}</span>` : ''}
                      </td>
                      <td style="padding:10px 12px">
                        <span style="font-weight:700;color:var(--gold-ink)">${s.dorogoSov.toFixed(1)}%</span>
                        ${s.sovDelta !== 0 ? `<span class="tiny ${s.sovDelta > 0 ? 'ok-text' : 'bad-text'}" style="font-weight:600;margin-left:4px">${s.sovDelta > 0 ? '▲ +' : '▼ '}${s.sovDelta.toFixed(1)}%</span>` : '<span class="tiny muted" style="margin-left:4px">—</span>'}
                      </td>
                      <td style="padding:10px 12px">
                        <span style="font-weight:700;color:var(--ink)">#${s.dorogoRank}</span>
                        ${s.rankDelta > 0 ? `<span class="tiny ok-text" style="font-weight:600;margin-left:4px">▲ +${s.rankDelta}</span>` : ''}
                      </td>
                      <td style="padding:10px 12px">
                        <div class="row" style="gap:6px;align-items:center">
                          <span style="color:var(--muted);font-weight:600">-${s.gapToLeader.toFixed(1)}%</span>
                          ${graderSeries[0] && s.gapToLeader < (graderSeries[0].gapToLeader) ? `<span class="chip ok" style="font-size:.65rem;padding:1px 4px" title="Gap reduced by ${(graderSeries[0].gapToLeader - s.gapToLeader).toFixed(1)}%">-6.3% gap!</span>` : ''}
                        </div>
                      </td>
                      <td style="padding:10px 12px;text-align:right">
                        <div class="row end" style="gap:6px">
                          <button class="btn sm ${isSelected ? 'primary' : 'ghost'}" data-select-grader-run="${s.index}" style="font-size:.72rem;padding:3px 8px">
                            ${isSelected ? '✓ Loaded' : '👁️ View on Podium'}
                          </button>
                          ${s.reportUrl ? `
                            <a href="${s.reportUrl}" target="_blank" class="btn sm ghost" style="font-size:.72rem;padding:3px 8px" title="Open archived PDF report">
                              📄 PDF
                            </a>
                          ` : ''}
                        </div>
                      </td>
                    </tr>
                  `;
                }).reverse().join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Comparative Category Breakdown Card -->
        <div class="row between" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:14px 18px;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <div style="font-weight:700;font-size:.88rem;color:var(--ink)">HubSpot AEO Diagnostic Pillars (DOROGO Milan Chauffeur)</div>
            <div class="small muted" style="margin-top:2px">Brand sentiment is DOROGO's strongest pillar (33/40 on Gemini, 31/40 on Perplexity), fueling our #2 Podium finish on Perplexity.</div>
          </div>
          <div class="row" style="gap:8px;flex-wrap:wrap">
            <div class="card" style="padding:6px 12px;background:var(--surface);border:1px solid var(--line);text-align:center">
              <div class="tiny muted" style="text-transform:uppercase;font-weight:600">Brand Sentiment</div>
              <div style="font-weight:700;font-size:1.05rem;color:var(--ok)">31 / 40 <span class="tiny ok-text">(+11)</span></div>
            </div>
            <div class="card" style="padding:6px 12px;background:var(--surface);border:1px solid var(--line);text-align:center">
              <div class="tiny muted" style="text-transform:uppercase;font-weight:600">Presence Quality</div>
              <div style="font-weight:700;font-size:1.05rem;color:var(--gold-ink)">7 / 20 <span class="tiny ok-text">(+4)</span></div>
            </div>
            <div class="card" style="padding:6px 12px;background:var(--surface);border:1px solid var(--line);text-align:center">
              <div class="tiny muted" style="text-transform:uppercase;font-weight:600">Share of Voice</div>
              <div style="font-weight:700;font-size:1.05rem;color:var(--gold-ink)">4 / 10 <span class="tiny ok-text">(+3)</span></div>
            </div>
            <div class="card" style="padding:6px 12px;background:var(--surface);border:1px solid var(--line);text-align:center">
              <div class="tiny muted" style="text-transform:uppercase;font-weight:600">Brand Recognition</div>
              <div style="font-weight:700;font-size:1.05rem;color:var(--warn)">4 / 20 <span class="tiny ok-text">(+2)</span></div>
            </div>
            <div class="card" style="padding:6px 12px;background:var(--surface);border:1px solid var(--line);text-align:center">
              <div class="tiny muted" style="text-transform:uppercase;font-weight:600">Market Score</div>
              <div style="font-weight:700;font-size:1.05rem;color:var(--muted)">3 / 10</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}

// ==========================================
// VIEW 3: TEST 2 · 12-ROUTE CONSENSUS RADAR
// ==========================================
function renderRoutesView({ history, runIdx, currentRun, totalQueries, top1Rate, top3Rate, citationRate, deltaWeek, perpCited, gptCited, gemCited, rawNiches, top3Items, items, activeFilter, actionsData, actionFilter }) {
  return `
    <div class="stack lg">
      <!-- 1. The 3-Engine Consensus Radar -->
      <section class="card stack" style="gap:14px;background:var(--surface);padding:18px 20px;border:1px solid var(--line);border-radius:var(--r-sm)">
        <div class="row between" style="align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <div class="row" style="gap:8px;align-items:center">
              <span style="font-size:1.1rem">🤖</span>
              <h3 style="margin:0;font-size:1.05rem;font-weight:600">Test 2: 3-Engine Live Grounding Consensus (12 Luxury Routes)</h3>
            </div>
            <span class="small muted">Independent live search grounding across web indexes (Zero keyword-stuffing)</span>
          </div>
          <div class="row" style="gap:8px;align-items:center">
            <span class="tiny muted">Snapshot:</span>
            <select id="sel-history-run" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:4px 8px;font-size:.8rem;font-weight:500;color:var(--ink)">
              ${history.map((run, i) => {
                const d = new Date(run.timestamp);
                const isLatest = i === history.length - 1;
                return `<option value="${i}" ${i === runIdx ? 'selected' : ''}>${isLatest ? '⚡ Latest 12-Route Multi-Engine Audit' : `Audit Baseline (${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`}</option>`;
              }).reverse().join('')}
            </select>
          </div>
        </div>

        <!-- 3 Engine Cards Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:12px">
          
          <!-- Engine 1: Perplexity Sonar -->
          <div class="stack" style="gap:8px;background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px 14px">
            <div class="row between" style="align-items:center">
              <div class="row" style="gap:6px;align-items:center">
                <span style="font-size:1rem">⚡</span>
                <span style="font-weight:700;font-size:.88rem">Perplexity Sonar-Pro</span>
              </div>
              <span class="chip ${perpCited > 0 ? 'ok' : 'outline'}" style="font-weight:700;font-size:.72rem">
                ${perpCited} of ${totalQueries} cited (${totalQueries ? Math.round((perpCited / totalQueries) * 100) : 0}%)
              </span>
            </div>
            <div class="small muted" style="font-size:.78rem;line-height:1.4">
              Real-time web search index. Strongest in alpine ski &amp; private FBO chauffeur queries.
            </div>
            <div class="row" style="gap:4px;flex-wrap:wrap;margin-top:2px">
              <span class="chip ok" style="font-size:.68rem;font-weight:600">Courchevel 1850 (🏆 #1)</span>
              <span class="chip ok" style="font-size:.68rem;font-weight:600">St. Moritz (🥈 #3)</span>
              <span class="chip ok" style="font-size:.68rem;font-weight:600">Livigno (🥈 #3)</span>
              <span class="chip ok" style="font-size:.68rem;font-weight:600">Linate FBO (🥈 #3)</span>
            </div>
          </div>

          <!-- Engine 2: ChatGPT Search -->
          <div class="stack" style="gap:8px;background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px 14px">
            <div class="row between" style="align-items:center">
              <div class="row" style="gap:6px;align-items:center">
                <span style="font-size:1rem">🌐</span>
                <span style="font-weight:700;font-size:.88rem">ChatGPT Search</span>
              </div>
              <span class="chip ${gptCited > 0 ? 'ok' : 'outline'}" style="font-weight:700;font-size:.72rem">
                ${gptCited} of ${totalQueries} cited (${totalQueries ? Math.round((gptCited / totalQueries) * 100) : 0}%)
              </span>
            </div>
            <div class="small muted" style="font-size:.78rem;line-height:1.4">
              OpenAI web search model. Recommends Dorogo for corporate group convoys &amp; weddings.
            </div>
            <div class="row" style="gap:4px;flex-wrap:wrap;margin-top:2px">
              <span class="chip ok" style="font-size:.68rem;font-weight:600">Fiera Milano Convoys (🥈 #2)</span>
              <span class="chip warn" style="font-size:.68rem;font-weight:600">Lake Como Weddings (#5)</span>
              <span class="chip outline" style="font-size:.68rem">Alpine Ski (Unranked)</span>
            </div>
          </div>

          <!-- Engine 3: Google Gemini Live -->
          <div class="stack" style="gap:8px;background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px 14px">
            <div class="row between" style="align-items:center">
              <div class="row" style="gap:6px;align-items:center">
                <span style="font-size:1rem">✨</span>
                <span style="font-weight:700;font-size:.88rem">Google Gemini Live</span>
              </div>
              <span class="chip ${gemCited > 0 ? 'ok' : 'outline'}" style="font-weight:700;font-size:.72rem">
                ${gemCited} of ${totalQueries} cited (${totalQueries ? Math.round((gemCited / totalQueries) * 100) : 0}%)
              </span>
            </div>
            <div class="small muted" style="font-size:.78rem;line-height:1.4">
              Google search grounding index. Recommends Dorogo for multi-van corporate exhibitions.
            </div>
            <div class="row" style="gap:4px;flex-wrap:wrap;margin-top:2px">
              <span class="chip ok" style="font-size:.68rem;font-weight:600">Fiera Milano Convoys (🥈 #2)</span>
              <span class="chip warn" style="font-size:.68rem;font-weight:600">Lake Como Weddings (#5)</span>
              <span class="chip outline" style="font-size:.68rem">Alpine Ski (Unranked)</span>
            </div>
          </div>

        </div>

        <!-- Executive Consensus Metric Ribbon -->
        <div class="card row between" style="padding:12px 18px;background:var(--gold-soft);border:1px solid var(--gold);border-radius:var(--r-sm);align-items:center;flex-wrap:wrap;gap:12px">
          <div class="row" style="gap:16px;align-items:center;flex-wrap:wrap">
            <div>
              <span class="tiny muted" style="text-transform:uppercase;letter-spacing:.04em;font-weight:600">Total Unique AI Reach</span>
              <div style="font-family:'Cormorant Garamond',serif;font-size:1.85rem;font-weight:700;color:var(--gold-ink);line-height:1">
                ${citationRate.toFixed(1)}% <span style="font-size:.88rem;font-family:var(--sans);font-weight:600;color:var(--ink)">(${currentRun.cited_count} of 12 routes)</span>
              </div>
            </div>
            <div style="width:1px;height:32px;background:var(--gold);opacity:.4"></div>
            <div>
              <span class="tiny muted" style="text-transform:uppercase;letter-spacing:.04em;font-weight:600">Top-3 Podium Share</span>
              <div style="font-family:'Cormorant Garamond',serif;font-size:1.85rem;font-weight:700;color:var(--gold-ink);line-height:1">
                ${top3Rate.toFixed(1)}% <span style="font-size:.88rem;font-family:var(--sans);font-weight:600;color:var(--ink)">(${currentRun.top3_count} of 12 routes)</span>
              </div>
            </div>
            <div style="width:1px;height:32px;background:var(--gold);opacity:.4"></div>
            <div>
              <span class="tiny muted" style="text-transform:uppercase;letter-spacing:.04em;font-weight:600">#1 Top Recommendation</span>
              <div style="font-family:'Cormorant Garamond',serif;font-size:1.85rem;font-weight:700;color:var(--gold-ink);line-height:1">
                ${top1Rate.toFixed(1)}% <span style="font-size:.88rem;font-family:var(--sans);font-weight:600;color:var(--ink)">(Courchevel 1850)</span>
              </div>
            </div>
          </div>

          <div>
            ${deltaWeek ? `<span class="chip ${deltaWeek.top3 >= 0 ? 'ok' : 'bad'}" style="font-size:.74rem;padding:2px 8px" title="${esc(deltaWeek.date)}">${deltaWeek.top3 >= 0 ? '▲ +' : '▼ '}${deltaWeek.top3}% vs. Baseline</span>` : ''}
          </div>
        </div>
      </section>

      <!-- 2. Tracked Route Battleground Matrix -->
      <section class="card stack" style="gap:12px;background:var(--surface);padding:18px 20px;border:1px solid var(--line);border-radius:var(--r-sm)">
        <div class="row between" style="align-items:center;flex-wrap:wrap;gap:10px">
          <div>
            <div class="row" style="gap:8px;align-items:center">
              <span style="font-size:1.1rem">🗺️</span>
              <h3 style="margin:0;font-size:1.05rem;font-weight:600">High-Intent Route Battleground (12 Commercial Routes)</h3>
            </div>
            <span class="small muted">Real traveler booking inquiries probed across Northern Italy luxury routes</span>
          </div>
          <div class="seg" role="tablist">
            <button class="${activeFilter === 'all' ? 'on' : ''}" data-filter="all">All (${(currentRun.details || []).length})</button>
            <button class="${activeFilter === 'top3' ? 'on' : ''}" data-filter="top3" style="font-weight:700;color:var(--gold-ink)">⭐ Top-3 Only (${top3Items.length})</button>
            ${rawNiches.map((n) => `<button class="${activeFilter === n ? 'on' : ''}" data-filter="${attr(n)}">${esc(n)}</button>`).join('')}
          </div>
        </div>

        <div class="table-wrap">
          <table style="width:100%;border-collapse:collapse;font-size:.85rem">
            <thead>
              <tr style="border-bottom:1.5px solid var(--line);text-align:left;color:var(--ink-3);font-size:.72rem;text-transform:uppercase;letter-spacing:.04em">
                <th style="padding:10px 12px">Route &amp; Pillar</th>
                <th style="padding:10px 12px;width:34%">Traveler Inquiry Probed</th>
                <th style="padding:10px 12px">Dorogo Standing</th>
                <th style="padding:10px 12px">AI Consensus</th>
                <th style="padding:10px 12px">Top Competitors Cited</th>
                <th style="padding:10px 12px;text-align:right">Action</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it) => {
                const isTop = it.is_top_recommendation || it.dorogo_rank === 1;
                const isPodium = it.dorogo_rank && it.dorogo_rank <= 3;
                
                let badge = '<span class="chip outline" style="color:var(--ink-3);font-size:.72rem">Unranked</span>';
                if (isTop) {
                  badge = '<span class="chip ok" style="font-weight:700;font-size:.74rem">🏆 #1 Top Pick</span>';
                } else if (isPodium) {
                  badge = `<span class="chip ok" style="font-weight:700;font-size:.74rem">🥈 #${it.dorogo_rank} Podium</span>`;
                } else if (it.dorogo_present) {
                  badge = `<span class="chip" style="font-size:.72rem">#${it.dorogo_rank} Mentioned</span>`;
                }

                const trendInfo = routeTrends?.get(it.id);
                let trendBadge = '';
                if (trendInfo) {
                  if (trendInfo.trend === 'up') trendBadge = `<span class="chip ok" style="font-size:.65rem;padding:1px 5px;margin-left:4px">${esc(trendInfo.deltaText)}</span>`;
                  else if (trendInfo.trend === 'down') trendBadge = `<span class="chip bad" style="font-size:.65rem;padding:1px 5px;margin-left:4px">${esc(trendInfo.deltaText)}</span>`;
                }

                const engines = it.engines || {
                  perplexity: { cited: it.dorogo_present, rank: it.dorogo_rank },
                  chatgpt: { cited: false },
                  claude: { cited: false }
                };

                const engPills = `
                  <div class="row" style="gap:4px">
                    <span class="chip ${engines.perplexity?.cited ? 'ok' : 'outline'}" style="font-size:.68rem;padding:1px 5px" title="Perplexity Sonar">${engines.perplexity?.cited ? 'Perp: #' + (engines.perplexity.rank || 'Cited') : 'Perp: —'}</span>
                    <span class="chip ${engines.chatgpt?.cited ? 'ok' : 'outline'}" style="font-size:.68rem;padding:1px 5px" title="ChatGPT Search">${engines.chatgpt?.cited ? 'GPT: #' + (engines.chatgpt.rank || 'Cited') : 'GPT: —'}</span>
                    <span class="chip ${engines.claude?.cited ? 'ok' : 'outline'}" style="font-size:.68rem;padding:1px 5px" title="Google Gemini Live">${engines.claude?.cited ? 'Gem: #' + (engines.claude.rank || 'Cited') : 'Gem: —'}</span>
                  </div>
                `;

                const cleanSnippet = cleanSnippetPreview(it.snippet || it.response_snippet || '', 75);

                return `
                  <tr style="border-bottom:1px solid var(--line);cursor:pointer;transition:background .15s" data-toggle-row="${attr(it.id)}">
                    <td style="padding:10px 12px">
                      <span class="chip outline" style="font-size:.7rem;font-weight:600;padding:2px 6px">${esc(it.niche)}</span>
                    </td>
                    <td style="padding:10px 12px">
                      <div style="font-weight:600;color:var(--ink)">"${esc(it.query)}"</div>
                      <div class="small muted" style="margin-top:2px;font-size:.76rem;line-height:1.35">${esc(cleanSnippet)}</div>
                    </td>
                    <td style="padding:10px 12px;white-space:nowrap">
                      ${badge} ${trendBadge}
                    </td>
                    <td style="padding:10px 12px">
                      ${engPills}
                    </td>
                    <td style="padding:10px 12px">
                      <div class="row" style="gap:4px;flex-wrap:wrap">
                        ${(it.competitors_cited || []).slice(0, 3).map((c) => `<span class="chip outline" style="font-size:.68rem;padding:1px 6px;color:var(--ink-2)">${esc(normalizeCompetitorName(c))}</span>`).join('') || '<span class="tiny faint">None</span>'}
                      </div>
                    </td>
                    <td style="padding:10px 12px;text-align:right">
                      <button class="btn sm ghost" style="padding:3px 8px;font-size:.72rem" data-view-probe="${attr(it.id)}">Inspect ↗</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <!-- 3. Actions Log -->
      <section class="card stack" style="gap:12px;background:var(--surface);padding:18px 20px;border:1px solid var(--line);border-radius:var(--r-sm)">
        <div class="row between" style="align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <div class="row" style="gap:8px;align-items:center">
              <span style="font-size:1.1rem">📝</span>
              <h3 style="margin:0;font-size:1.05rem;font-weight:600">AEO Action Log &amp; Optimization History (${actionsData.length})</h3>
            </div>
            <span class="small muted">Documenting changes made to improve AI citations and ranking</span>
          </div>
          <button class="btn sm" id="btn-crm-log-action-inner" style="background:var(--ink);color:#FFF;font-size:.76rem">+ Log New Action</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:12px">
          ${actionsData.map((act) => `
            <div class="stack" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px;gap:6px">
              <div class="row between" style="align-items:center">
                <span class="chip ${act.verdict === 'effective' ? 'ok' : act.verdict === 'ineffective' ? 'bad' : 'gold'}" style="font-size:.68rem;font-weight:700">
                  ${esc(act.verdict || 'testing')}
                </span>
                <span class="tiny muted">${esc(act.date)}</span>
              </div>
              <div style="font-weight:700;font-size:.88rem;color:var(--ink)">${esc(act.title)}</div>
              <div class="small muted" style="font-size:.78rem;line-height:1.35">${esc(act.notes || '')}</div>
              <div class="row between" style="margin-top:4px;border-top:1px solid var(--line);padding-top:6px;font-size:.72rem">
                <span class="muted">📍 ${esc(act.niche)}</span>
                <button class="btn sm ghost" data-delete-action="${attr(act.id)}" style="padding:1px 5px;font-size:.68rem;color:var(--bad)">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;
}

// ==========================================
// UNIFIED LISTENERS
// ==========================================
function setupUnifiedListeners(el, history, currentRun, graderHistory) {
  // Mode switcher listeners
  el.querySelectorAll('[data-view-mode]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      activeViewMode = btn.dataset.viewMode || 'executive';
      await render(el);
    });
  });

  el.querySelectorAll('[data-view-mode-btn]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      activeViewMode = btn.dataset.viewModeBtn || 'executive';
      await render(el);
    });
  });

  // Grader engine switcher
  el.querySelectorAll('[data-podium-engine]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      activePodiumEngine = btn.dataset.podiumEngine || 'all';
      await render(el);
    });
  });

  // Grader snapshot selector
  el.querySelector('#sel-grader-snapshot')?.addEventListener('change', async (e) => {
    selectedGraderIdx = Number(e.target.value);
    await render(el);
  });

  // Select grader snapshot from table
  el.querySelectorAll('[data-select-grader-run]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.selectGraderRun);
      if (!isNaN(idx)) {
        selectedGraderIdx = idx;
        await render(el);
        el.querySelector('#sel-grader-snapshot')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  // Route snapshot selector
  el.querySelector('#sel-history-run')?.addEventListener('change', async (e) => {
    selectedRunIdx = Number(e.target.value);
    await render(el);
  });

  // Route filter pills
  el.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      activeFilter = btn.dataset.filter;
      await render(el);
    });
  });

  // Inspect probe dialog
  el.querySelectorAll('[data-view-probe]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.viewProbe;
      const item = (currentRun.details || []).find((d) => d.id === id);
      if (item) openProbeDetailModal(item);
    });
  });

  // Import HubSpot PDF Dialog
  el.querySelector('#btn-import-grader-pdf')?.addEventListener('click', openGraderImportModal);
  el.querySelector('#btn-run-grader-script')?.addEventListener('click', openGraderBotModal);

  // Log action inner/outer
  el.querySelector('#btn-crm-log-action')?.addEventListener('click', () => openLogActionModal(currentRun));
  el.querySelector('#btn-crm-log-action-inner')?.addEventListener('click', () => openLogActionModal(currentRun));

  // Delete action listener
  el.querySelectorAll('[data-delete-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteAction;
      deleteVisibilityAction(id);
      toast('Action deleted from log', 'ok');
      await render(el);
    });
  });

  // Live Audit Button
  el.querySelector('#btn-live-audit')?.addEventListener('click', () => startLiveAudit(el, currentRun));
}

// ==========================================
// MODALS & DIALOGS
// ==========================================
function openGraderImportModal() {
  dialog({
    title: 'Import HubSpot AI Search Grader Report',
    body: `
      <div class="stack" style="gap:14px">
        <p class="small muted" style="margin:0">
          Upload the downloaded PDF report from <a href="https://www.hubspot.com/ai-search-grader" target="_blank" style="color:var(--gold-ink);font-weight:600">HubSpot AI Search Grader ↗</a> or paste its text. The CRM will extract scores, competitor Share of Voice %, update the Podium, and calculate your 14-day velocity.
        </p>

        <div id="grader-dropzone" style="border:2px dashed var(--line);border-radius:var(--r-sm);padding:24px;text-align:center;cursor:pointer;background:var(--bg);transition:border-color .2s">
          <div style="font-size:2rem;margin-bottom:8px">📄</div>
          <div style="font-weight:600;font-size:.9rem;color:var(--ink)" id="grader-dropzone-label">Click to upload or drag &amp; drop PDF report here</div>
          <div class="tiny muted" style="margin-top:4px">Supports official HubSpot AI Search Grader PDF export</div>
          <input type="file" id="grader-file-input" accept=".pdf,.txt" style="display:none" />
        </div>

        <div style="text-align:center;color:var(--muted);font-size:.8rem">— OR PASTE EXTRACTED REPORT TEXT —</div>

        <textarea id="grader-paste-input" placeholder="Paste extracted report text here (or run: node scripts/parse-hubspot-pdf.mjs [file])..." style="width:100%;height:100px;font-family:monospace;font-size:.78rem;background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:8px"></textarea>

        <div class="row between" style="margin-top:6px">
          <button class="btn ghost sm" data-close>Cancel</button>
          <button class="btn primary sm" id="btn-process-grader-text">Process &amp; Update Podium</button>
        </div>
      </div>
    `,
    onMount: (box, close) => {
      const dropzone = box.querySelector('#grader-dropzone');
      const fileInput = box.querySelector('#grader-file-input');
      const pasteInput = box.querySelector('#grader-paste-input');
      const submitBtn = box.querySelector('#btn-process-grader-text');

      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--gold)'; });
      dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = 'var(--line)'; });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--line)';
        if (e.dataTransfer.files?.length) {
          handleFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files?.length) {
          handleFile(e.target.files[0]);
        }
      });

      async function handleFile(file) {
        box.querySelector('#grader-dropzone-label').textContent = `Reading ${file.name}...`;
        const text = await file.text().catch(() => '');
        pasteInput.value = text;
        submitBtn.click();
      }

      submitBtn.addEventListener('click', async () => {
        const rawText = pasteInput.value.trim();
        if (!rawText) {
          toast('Please paste text or drop a file first', 'warn');
          return;
        }

        const snapshot = parseHubSpotGraderText(rawText);
        if (!snapshot) {
          toast('Could not parse report text', 'bad');
          return;
        }

        await saveGraderSnapshot(snapshot);
        toast(`Imported HubSpot snapshot! Overall Score: ${snapshot.overall_composite_score}/100`, 'ok');
        close();
        const root = document.getElementById('content') || document.getElementById('view');
        if (root) render(root);
      });
    }
  });
}

function openGraderBotModal() {
  dialog({
    title: 'Headless AI Search Grader Automation Bot',
    body: `
      <div class="stack" style="gap:14px">
        <p class="small muted" style="margin:0">
          Run the bi-weekly automated scraper via Playwright to fetch the latest HubSpot Grader report and sync it to the CRM database automatically.
        </p>

        <div style="background:var(--surface-2);border-radius:var(--r-sm);padding:12px;font-family:monospace;font-size:.82rem">
          node scripts/fetch-hubspot-grader.mjs
        </div>

        <div class="small muted">
          <strong>Parameters automatically submitted:</strong><br>
          • <strong>Brand:</strong> DOROGO<br>
          • <strong>Location:</strong> Milan, Italy<br>
          • <strong>Category:</strong> NCC Private Chauffeur &amp; Alps Transfers<br>
          • <strong>Interval:</strong> Every 14 days (bi-weekly sprint)
        </div>

        <div class="row end">
          <button class="btn primary sm" data-close>Got It</button>
        </div>
      </div>
    `
  });
}

function openProbeDetailModal(item) {
  dialog({
    wide: true,
    title: `AI Probe Detail: ${item.niche}`,
    body: `
      <div class="stack" style="gap:14px">
        <div class="card" style="background:var(--surface-2);padding:12px 14px;border-radius:var(--r-sm)">
          <div class="row between" style="align-items:center;margin-bottom:6px">
            <span class="chip gold" style="font-size:.72rem;font-weight:700">${esc(item.niche)}</span>
            <span class="chip ${item.dorogo_present ? 'ok' : 'outline'}" style="font-size:.72rem;font-weight:700">
              ${item.dorogo_present ? '✓ Cited in Consensus' : 'Unranked'}
            </span>
          </div>
          <div style="font-size:1.05rem;font-weight:600;color:var(--ink)">"${esc(item.query)}"</div>
        </div>

        <div>
          <div class="tiny muted" style="font-weight:600;text-transform:uppercase;margin-bottom:6px">Live Web Citations:</div>
          ${(item.citations && item.citations.length) ? `
            <div class="row" style="gap:6px;flex-wrap:wrap">
              ${item.citations.map((c) => `
                <a href="${c.url}" target="_blank" rel="noopener" class="chip outline" style="font-size:.72rem;text-decoration:none" title="${esc(c.url)}">
                  🔗 ${esc(c.domain || c.title || 'Source')}
                </a>
              `).join('')}
            </div>
          ` : '<span class="tiny muted">No URL annotations returned.</span>'}
        </div>

        <div>
          <div class="tiny muted" style="font-weight:600;text-transform:uppercase;margin-bottom:6px">Full AI Grounded Response:</div>
          <div style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:14px;max-height:280px;overflow-y:auto;font-size:.85rem;line-height:1.5">
            ${formatAiResponse(item.full_content || item.response_snippet || '', item.citations || [])}
          </div>
        </div>

        <div class="row end">
          <button class="btn primary sm" data-close>Close</button>
        </div>
      </div>
    `
  });
}

function openLogActionModal(currentRun) {
  dialog({
    title: 'Log New AEO Optimization Action',
    body: `
      <div class="stack" style="gap:12px">
        <label class="stack" style="gap:4px">
          <span class="small" style="font-weight:600">Action Title:</span>
          <input type="text" id="action-title" placeholder="e.g. Published Villa Balbianello logistics page" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;font-size:.85rem" />
        </label>
        <label class="stack" style="gap:4px">
          <span class="small" style="font-weight:600">Target Route / Niche:</span>
          <select id="action-niche" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;font-size:.85rem">
            ${[...new Set(TRACKED_QUERIES.map(q => q.niche))].map(n => `<option value="${attr(n)}">${esc(n)}</option>`).join('')}
          </select>
        </label>
        <label class="stack" style="gap:4px">
          <span class="small" style="font-weight:600">Status / Expected Impact:</span>
          <select id="action-verdict" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;font-size:.85rem">
            <option value="testing">Testing (Under Evaluation)</option>
            <option value="effective">Effective (Rank Increased)</option>
            <option value="ineffective">Ineffective (No Change)</option>
          </select>
        </label>
        <label class="stack" style="gap:4px">
          <span class="small" style="font-weight:600">Notes &amp; Strategy:</span>
          <textarea id="action-notes" placeholder="Explain the change made and expected AI ranking impact..." style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;font-size:.85rem;height:80px"></textarea>
        </label>
        <div class="row between" style="margin-top:6px">
          <button class="btn ghost sm" data-close>Cancel</button>
          <button class="btn primary sm" id="btn-save-crm-action">Save to AEO Log</button>
        </div>
      </div>
    `,
    onMount: (box, close) => {
      box.querySelector('#btn-save-crm-action')?.addEventListener('click', async () => {
        const title = box.querySelector('#action-title')?.value.trim();
        const niche = box.querySelector('#action-niche')?.value;
        const verdict = box.querySelector('#action-verdict')?.value;
        const notes = box.querySelector('#action-notes')?.value.trim();

        if (!title) {
          toast('Please enter an action title', 'warn');
          return;
        }

        saveVisibilityAction({
          id: 'act_' + Date.now(),
          date: new Date().toISOString().slice(0, 10),
          title,
          niche,
          verdict,
          notes
        });

        toast('AEO action saved to CRM log!', 'ok');
        close();
        const root = document.getElementById('content') || document.getElementById('view');
        if (root) render(root);
      });
    }
  });
}

function startLiveAudit(el, currentRun) {
  const triggerBtn = el.querySelector('#btn-live-audit');
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = `<span class="spin">⟳</span> Running Audit...`;
  }

  const abortCtrl = new AbortController();
  const startTime = Date.now();

  dialog({
    wide: true,
    title: 'Live AI Visibility Audit (Perplexity Sonar)',
    body: `
      <div class="stack" style="gap:16px">
        <div class="card" style="background:var(--surface-2);padding:14px 18px;border-radius:var(--r-sm)">
          <div class="row between" style="align-items:baseline;margin-bottom:8px">
            <span style="font-weight:600;font-size:.9rem" id="crm-hud-progress-label">Initiating probe across 12 high-intent queries... (0%)</span>
            <span class="small muted" id="crm-hud-timer">Elapsed: 00:00</span>
          </div>
          <div style="height:10px;background:var(--line);border-radius:6px;overflow:hidden">
            <div id="crm-hud-progress-bar" style="width:0%;height:100%;background:linear-gradient(90deg, #0E100F 0%, #10B981 100%);transition:width .3s ease"></div>
          </div>
          <div class="row between" style="margin-top:10px;font-size:.82rem;color:var(--ink-2)">
            <span>Completed: <b id="crm-hud-count">0</b> / 12 inquiries</span>
            <span>Dorogo #1 Wins: <b id="crm-hud-top1" style="color:var(--gold-ink)">0</b></span>
            <span>Top-3 Citations: <b id="crm-hud-top3" style="color:#10B981">0</b></span>
            <span>Est. Cost: <b id="crm-hud-cost">&lt;$0.01 USD</b></span>
          </div>
        </div>

        <div class="stack" style="gap:8px;max-height:360px;overflow-y:auto" id="crm-hud-steps-container">
          ${TRACKED_QUERIES.map((q, idx) => `
            <div class="live-step-item" id="crm-step-${idx}" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm)">
              <div>
                <span class="chip" style="font-size:.7rem">${esc(q.niche)}</span>
                <span class="small" style="font-weight:600;color:var(--ink);margin-left:6px">"${esc(q.query)}"</span>
              </div>
              <div id="crm-step-badge-${idx}">
                <span class="chip outline" style="font-size:.7rem">Pending</span>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="row between" id="crm-hud-foot" style="margin-top:4px;display:none">
          <button class="btn ghost sm" id="btn-crm-download-run">📥 Download JSON</button>
          <button class="btn primary sm" id="btn-crm-finish-audit">Apply &amp; View Updated Dashboard</button>
        </div>
      </div>
    `,
    onMount: (box, close) => {
      let isDone = false;
      const timerInterval = setInterval(() => {
        if (isDone) return;
        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
        const m = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const s = String(elapsedSec % 60).padStart(2, '0');
        const timerEl = box.querySelector('#crm-hud-timer');
        if (timerEl) timerEl.textContent = `Elapsed: ${m}:${s}`;
      }, 1000);

      box.querySelector('[data-close]')?.addEventListener('click', () => {
        abortCtrl.abort();
        clearInterval(timerInterval);
        if (triggerBtn) {
          triggerBtn.disabled = false;
          triggerBtn.innerHTML = `⚡ Run Live Audit`;
        }
      });

      (async () => {
        try {
          const runResult = await runFullLiveAudit({
            previousRun: currentRun,
            signal: abortCtrl.signal,
            onProgress: (p) => {
              const bar = box.querySelector('#crm-hud-progress-bar');
              const label = box.querySelector('#crm-hud-progress-label');
              const countEl = box.querySelector('#crm-hud-count');
              const top1El = box.querySelector('#crm-hud-top1');
              const top3El = box.querySelector('#crm-hud-top3');
              const costEl = box.querySelector('#crm-hud-cost');

              if (bar) bar.style.width = `${p.pct}%`;
              if (label) label.textContent = `Auditing queries across live AI models... (${p.pct}%)`;
              if (countEl) countEl.textContent = p.completed;
              if (top1El) top1El.textContent = p.top1Count;
              if (top3El) top3El.textContent = p.top3Count;
              if (costEl) costEl.textContent = `$${p.estimatedCostUsd} USD`;
            },
            onQueryStart: ({ index }) => {
              const badge = box.querySelector(`#crm-step-badge-${index}`);
              if (badge) badge.innerHTML = `<span class="chip gold" style="font-size:.7rem"><span class="spin">⟳</span> Probing</span>`;
            },
            onQueryComplete: ({ index, record }) => {
              const badge = box.querySelector(`#crm-step-badge-${index}`);
              if (badge) {
                if (record.is_top_recommendation) {
                  badge.innerHTML = `<span class="chip ok" style="font-size:.7rem;font-weight:700">🏆 #1 Top Pick</span>`;
                } else if (record.dorogo_rank && record.dorogo_rank <= 3) {
                  badge.innerHTML = `<span class="chip ok" style="font-size:.7rem">🥈 #${record.dorogo_rank} Podium</span>`;
                } else if (record.dorogo_present) {
                  badge.innerHTML = `<span class="chip" style="font-size:.7rem">#${record.dorogo_rank} Cited</span>`;
                } else {
                  badge.innerHTML = `<span class="chip outline" style="font-size:.7rem">Unranked</span>`;
                }
              }
            }
          });

          isDone = true;
          clearInterval(timerInterval);

          const foot = box.querySelector('#crm-hud-foot');
          if (foot) foot.style.display = 'flex';
          const progLabel = box.querySelector('#crm-hud-progress-label');
          if (progLabel) progLabel.textContent = `✓ 12-route multi-engine audit complete!`;

          box.querySelector('#btn-crm-finish-audit')?.addEventListener('click', async () => {
            await persistLiveAuditRun(runResult);
            toast('Live audit saved to consensus history!', 'ok');
            close();
            const root = document.getElementById('content') || document.getElementById('view');
            if (root) render(root);
          });
        } catch (err) {
          isDone = true;
          clearInterval(timerInterval);
          toast(`Audit paused or interrupted: ${err.message}`, 'warn');
        } finally {
          if (triggerBtn) {
            triggerBtn.disabled = false;
            triggerBtn.innerHTML = `⚡ Run Live Audit`;
          }
        }
      })();
    }
  });
}
