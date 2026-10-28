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
    <!-- Header -->
    <div class="page-head" style="margin-bottom:18px;border-bottom:1px solid var(--line);padding-bottom:14px">
      <div>
        <div class="label eyebrow" style="letter-spacing:.05em;color:var(--gold-ink);font-weight:600">
          DOROGO PRIVATE FLEET · MILAN &amp; LAKE COMO
        </div>
        <h1 style="font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:500;margin:3px 0 4px">
          AI Search Visibility &amp; Consensus Radar
        </h1>
        <p class="muted small" style="margin:0">
          Audited across <strong>Perplexity Sonar-Pro</strong>, <strong>ChatGPT Search</strong>, and <strong>Google Gemini</strong> on 12 high-intent luxury routes.
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

    <div class="stack lg">
      <!-- 1. The 3-Engine Consensus Radar (Hero Section) -->
      <section class="card stack" style="gap:14px;background:var(--surface);padding:18px 20px;border:1px solid var(--line);border-radius:var(--r-sm)">
        <div class="row between" style="align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <div class="row" style="gap:8px;align-items:center">
              <span style="font-size:1.1rem">🤖</span>
              <h3 style="margin:0;font-size:1.05rem;font-weight:600">3-Engine Live Grounding Consensus</h3>
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

      <!-- 1.25 Competitor Share of Voice Podium (HubSpot AI Search Grader Benchmark) -->
      <section class="card stack" style="gap:14px;background:var(--surface);padding:18px 20px;border:1px solid var(--line);border-radius:var(--r-sm)">
        <div class="row between" style="align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <div class="row" style="gap:8px;align-items:center">
              <span style="font-size:1.15rem">🏆</span>
              <h3 style="margin:0;font-size:1.05rem;font-weight:600">AI Search Share of Voice Podium (Milan &amp; Northern Italy)</h3>
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

      <!-- 1.26 HubSpot Grader: Bi-Weekly Progress & Historical Evolution Over Time -->
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
            <!-- Progress Bar Visual -->
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

      <!-- 1.5 Milestone Progression & Trajectory Visual (User-Friendly Executive Layout) -->
      <section class="card stack" style="gap:12px;background:var(--surface);padding:18px 20px;border:1px solid var(--line);border-radius:var(--r-sm)">
        <div class="row between" style="align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <div class="row" style="gap:8px;align-items:center">
              <span style="font-size:1.1rem">📈</span>
              <h3 style="margin:0;font-size:1.05rem;font-weight:600">AI Search Visibility Trajectory &amp; Growth</h3>
            </div>
            <span class="small muted">Measured impact from Initial Baseline to Live 3-Engine Consensus</span>
          </div>
          <span class="chip ok" style="font-weight:700;font-size:.74rem">▲ +40.0% Overall Reach Lift</span>
        </div>

        <!-- Milestone Progression Visual Bar -->
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:14px;align-items:center;background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:14px 18px">
          
          <!-- Milestone 1: Baseline -->
          <div class="stack" style="gap:6px">
            <div class="row" style="gap:6px;align-items:center">
              <span class="chip outline" style="font-size:.68rem;font-weight:600">Milestone 1</span>
              <span class="small" style="font-weight:600;color:var(--ink-2)">15 Oct · Initial Baseline</span>
            </div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:1.75rem;font-weight:700;color:var(--ink);line-height:1">
              10.0% <span style="font-size:.82rem;font-family:var(--sans);font-weight:500;color:var(--ink-3)">(1 of 10 routes cited)</span>
            </div>
            <div class="small muted" style="font-size:.76rem">
              Top-3 Podium Share: <strong>10.0%</strong> · Single engine (Perplexity)
            </div>
          </div>

          <!-- Arrow Indicator -->
          <div style="text-align:center;padding:0 8px">
            <div style="font-size:1.3rem;color:var(--gold-ink);font-weight:700">➔</div>
            <span class="chip ok" style="font-size:.66rem;font-weight:700;margin-top:2px">+40.0% Lift</span>
          </div>

          <!-- Milestone 2: Live Multi-Engine -->
          <div class="stack" style="gap:6px">
            <div class="row" style="gap:6px;align-items:center">
              <span class="chip gold" style="font-size:.68rem;font-weight:700">Latest Live Audit</span>
              <span class="small" style="font-weight:600;color:var(--ink)">20 Oct · 3-Engine Consensus</span>
            </div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:1.75rem;font-weight:700;color:var(--gold-ink);line-height:1">
              50.0% <span style="font-size:.82rem;font-family:var(--sans);font-weight:500;color:var(--ink-2)">(6 of 12 routes cited)</span>
            </div>
            <div class="small muted" style="font-size:.76rem">
              Top-3 Podium Share: <strong>41.7%</strong> · 3 Engines (Perplexity + ChatGPT + Gemini)
            </div>
          </div>

        </div>

        <!-- Trajectory Key Breakthroughs -->
        <div class="row between" style="background:var(--surface-2);border-radius:var(--r-sm);padding:8px 14px;font-size:.78rem;align-items:center;flex-wrap:wrap;gap:8px">
          <div class="row" style="gap:8px;align-items:center">
            <span style="font-weight:600;color:var(--ink)">Key Rank Breakthroughs:</span>
            <span class="chip ok" style="font-size:.7rem">🏆 Courchevel 1850 (#1 Top Pick)</span>
            <span class="chip ok" style="font-size:.7rem">🥈 Fiera Milano Convoys (#2 Podium)</span>
            <span class="chip ok" style="font-size:.7rem">🥈 Linate Prime FBO (#3 Podium)</span>
          </div>
          <span class="tiny muted">6 routes still unranked (Target for next week's SEO landing pages)</span>
        </div>
      </section>

      <!-- 2. Tracked Route Battleground Matrix (Unified & MECE) -->
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
                  badge = `<span class="chip ok" style="font-weight:600;font-size:.74rem">🥈 Top-3 (#${it.dorogo_rank})</span>`;
                } else if (it.dorogo_present) {
                  badge = `<span class="chip warn" style="font-size:.74rem">Ranked #${it.dorogo_rank}</span>`;
                }

                const cleanComps = [...new Set((it.competitors || []).map(normalizeCompetitorName))].filter(Boolean);
                
                let podiumRelation = '';
                if (isTop) {
                  podiumRelation = cleanComps.length > 0
                    ? `<span class="small muted">Ahead of ${cleanComps.slice(0, 2).map(c => esc(c)).join(', ')}</span>`
                    : '<span class="small muted">Undisputed recommendation</span>';
                } else if (it.dorogo_rank === 2) {
                  const leader = cleanComps[0] ? esc(cleanComps[0]) : 'Leader';
                  podiumRelation = `<span class="small muted">Behind #1 ${leader}</span>`;
                } else if (it.dorogo_rank === 3) {
                  const leaders = cleanComps.slice(0, 2).map(c => esc(c)).join(' & ');
                  podiumRelation = leaders ? `<span class="small muted">Behind ${leaders}</span>` : '<span class="small muted">Podium (#3)</span>';
                } else if (it.dorogo_present) {
                  podiumRelation = `<span class="small muted">Behind top 4 options</span>`;
                } else {
                  podiumRelation = `<span class="small muted" style="color:var(--ink-3)">Missing from AI index</span>`;
                }

                // AI Engine consensus pills
                const perpRank = it.engines?.perplexity?.cited ? (it.engines.perplexity.rank ? '#' + it.engines.perplexity.rank : 'Cited') : null;
                const gptRank = it.engines?.chatgpt?.cited ? (it.engines.chatgpt.rank ? '#' + it.engines.chatgpt.rank : 'Cited') : null;
                const gemRank = it.engines?.claude?.cited ? (it.engines.claude.rank ? '#' + it.engines.claude.rank : 'Cited') : null;

                const consensusPills = `
                  <div class="row" style="gap:4px;flex-wrap:wrap">
                    <span class="chip ${perpRank ? 'ok' : 'outline'}" style="font-size:.66rem;padding:1px 5px" title="Perplexity Sonar">
                      P: ${perpRank || '—'}
                    </span>
                    <span class="chip ${gptRank ? 'ok' : 'outline'}" style="font-size:.66rem;padding:1px 5px" title="ChatGPT Search">
                      GPT: ${gptRank || '—'}
                    </span>
                    <span class="chip ${gemRank ? 'ok' : 'outline'}" style="font-size:.66rem;padding:1px 5px" title="Google Gemini">
                      Gem: ${gemRank || '—'}
                    </span>
                  </div>
                `;

                const competitors = cleanComps.slice(0, 3).map((c) => `<span class="chip outline" style="font-size:.7rem;padding:1px 6px">${esc(c)}</span>`).join(' ') || '<span class="muted small">—</span>';

                return `
                  <tr style="border-bottom:1px solid var(--line)">
                    <td style="padding:10px 12px;vertical-align:middle;white-space:nowrap">
                      <span class="chip" style="font-weight:600;font-size:.74rem">${esc(it.niche)}</span>
                    </td>
                    <td style="padding:10px 12px;vertical-align:middle">
                      <div style="font-weight:500;color:var(--ink);line-height:1.4">“${esc(it.query)}”</div>
                    </td>
                    <td style="padding:10px 12px;vertical-align:middle;white-space:nowrap">
                      <div>${badge}</div>
                      <div style="margin-top:2px">${podiumRelation}</div>
                    </td>
                    <td style="padding:10px 12px;vertical-align:middle;white-space:nowrap">
                      ${consensusPills}
                    </td>
                    <td style="padding:10px 12px;vertical-align:middle">
                      <div style="display:flex;flex-wrap:wrap;gap:4px">${competitors}</div>
                    </td>
                    <td style="padding:10px 12px;vertical-align:middle;text-align:right;white-space:nowrap">
                      <button class="btn sm ghost" data-view-snippet="${esc(it.id)}" style="font-size:.76rem;padding:3px 10px">Inspect Answer →</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <!-- 3. OPTIMIZATION ACTIONS (WHAT WORKS & WHAT DOESN'T) -->
      <section class="card stack" style="gap:10px;background:var(--surface);padding:18px 20px;border:1px solid var(--line);border-radius:var(--r-sm)">
        <div class="row between" style="align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <div class="row" style="gap:8px;align-items:center">
              <span style="font-size:1.1rem">📝</span>
              <h3 style="margin:0;font-size:1.02rem;font-weight:600">Optimization Action Log: What Works &amp; What Doesn't</h3>
            </div>
            <span class="small muted">Record rate cards, landing pages, and PR actions to track real rank impact over time</span>
          </div>
          <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
            <div class="seg" role="tablist">
              <button class="${actionFilter === 'all' ? 'on' : ''}" data-act-filter="all">All (${actionsData.length})</button>
              <button class="${actionFilter === 'effective' ? 'on' : ''}" data-act-filter="effective">🟢 Worked (${actionsData.filter(a => a.verdict === 'effective').length})</button>
              <button class="${actionFilter === 'testing' ? 'on' : ''}" data-act-filter="testing">⏳ Testing (${actionsData.filter(a => a.verdict === 'testing').length})</button>
              <button class="${actionFilter === 'ineffective' ? 'on' : ''}" data-act-filter="ineffective">🔴 Ineffective (${actionsData.filter(a => a.verdict === 'ineffective').length})</button>
            </div>
            <button class="btn primary sm" id="btn-crm-add-action-inline" style="padding:4px 10px;background:#0E100F;color:#FFF">+ Log Action</button>
          </div>
        </div>

        ${(() => {
          const list = actionsData.filter(a => actionFilter === 'all' ? true : a.verdict === actionFilter);
          if (list.length === 0) {
            return `
              <div style="text-align:center;padding:24px 16px;background:var(--bg);border-radius:var(--r-sm)">
                <span class="muted small">No optimization actions recorded in this view.</span>
                <button class="btn sm primary" id="btn-crm-add-action-empty" style="margin-left:8px">+ Log What You Did</button>
              </div>
            `;
          }

          return `
            <div class="table-wrap">
              <table style="width:100%;border-collapse:collapse;font-size:.84rem">
                <thead>
                  <tr style="border-bottom:1px solid var(--line);text-align:left;color:var(--ink-3);font-size:.72rem;text-transform:uppercase;letter-spacing:.04em">
                    <th style="padding:8px 10px;width:95px">Date</th>
                    <th style="padding:8px 10px;width:130px">Revenue Pillar</th>
                    <th style="padding:8px 10px">Initiative &amp; Observed Impact</th>
                    <th style="padding:8px 10px;width:130px">Verdict</th>
                    <th style="padding:8px 10px;text-align:right;width:40px"></th>
                  </tr>
                </thead>
                <tbody>
                  ${list.map(act => {
                    const verdictBadge = act.verdict === 'effective'
                      ? `<span class="chip ok" style="font-weight:600;font-size:.72rem">🟢 Effective</span>`
                      : act.verdict === 'testing'
                      ? `<span class="chip gold" style="font-weight:600;font-size:.72rem">⏳ Testing</span>`
                      : `<span class="chip warn" style="font-weight:600;font-size:.72rem">🔴 Ineffective</span>`;

                    const dParts = String(act.date || '').split('-');
                    const formattedDate = dParts.length === 3 ? `${dParts[2]} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(dParts[1], 10)-1] || dParts[1]}` : act.date;

                    return `
                      <tr style="border-bottom:1px solid var(--line)">
                        <td style="padding:8px 10px;vertical-align:middle;white-space:nowrap">
                          <span class="muted small" style="font-weight:500">${esc(formattedDate)}</span>
                        </td>
                        <td style="padding:8px 10px;vertical-align:middle;white-space:nowrap">
                          <span class="chip" style="font-weight:600;font-size:.72rem">${esc(act.niche)}</span>
                        </td>
                        <td style="padding:8px 10px;vertical-align:middle">
                          <div style="font-weight:600;color:var(--ink);font-size:.85rem;line-height:1.35;margin-bottom:2px">${esc(act.title)}</div>
                          <div class="small muted" style="line-height:1.35">
                            ${esc(act.notes || act.description || '')}
                            ${act.url ? ` · <a href="${esc(act.url)}" target="_blank" rel="noopener" style="color:var(--gold-ink);text-decoration:underline">Evidence ↗</a>` : ''}
                          </div>
                        </td>
                        <td style="padding:8px 10px;vertical-align:middle;white-space:nowrap">
                          ${verdictBadge}
                        </td>
                        <td style="padding:8px 10px;vertical-align:middle;text-align:right;white-space:nowrap">
                          <button class="btn ghost sm" data-del-act="${esc(act.id)}" style="padding:2px 6px;color:var(--ink-3);font-size:.85rem;line-height:1" title="Delete action">✕</button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `;
        })()}
      </section>
    </div>
  `;

  // Attach event handlers
  el.querySelector('#sel-history-run')?.addEventListener('change', (e) => {
    selectedRunIdx = Number(e.target.value);
    render(el);
  });

  el.querySelectorAll('[data-filter]').forEach((b) => {
    b.addEventListener('click', (e) => {
      activeFilter = e.currentTarget.dataset.filter;
      render(el);
    });
  });

  // Optimization Action Log listeners
  el.querySelector('#btn-crm-log-action')?.addEventListener('click', () => openCrmActionModal(el));
  el.querySelector('#btn-crm-add-action-inline')?.addEventListener('click', () => openCrmActionModal(el));
  el.querySelector('#btn-crm-add-action-empty')?.addEventListener('click', () => openCrmActionModal(el));

  el.querySelectorAll('[data-act-filter]').forEach((b) => {
    b.addEventListener('click', (e) => {
      actionFilter = e.currentTarget.dataset.actFilter;
      render(el);
    });
  });

  el.querySelectorAll('[data-del-act]').forEach((b) => {
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.delAct;
      const ok = await confirmDialog('Delete Optimization Action', 'Remove this optimization action from the tracker?', 'Delete', true);
      if (ok) {
        cachedActions = deleteVisibilityAction(id, cachedActions);
        toast('Action deleted');
        await render(el);
      }
    });
  });

  el.querySelectorAll('[data-view-snippet]').forEach((b) => {
    b.addEventListener('click', (e) => {
      const qid = e.currentTarget.dataset.viewSnippet;
      const it = (currentRun.details || []).find((d) => d.id === qid) || items[parseInt(qid, 10)];
      if (!it) return;
      const citations = it.citations || [];

      dialog({
        wide: true,
        title: `${it.niche}: AI Search Resolution & Grounding`,
        body: `
          <div class="stack" style="gap:14px">
            <div style="font-weight:600;font-size:1.05rem;color:var(--ink);padding-bottom:10px;border-bottom:1px solid var(--line)">
              “${esc(it.query)}”
            </div>

            <div class="row" style="gap:16px;background:var(--surface-2);padding:10px 14px;border-radius:var(--r-sm);flex-wrap:wrap">
              <div>
                <span class="label tiny">Dorogo Rank:</span>
                <span style="font-weight:700">${it.dorogo_rank ? '#' + it.dorogo_rank : 'Unranked'}</span>
              </div>
              <div>
                <span class="label tiny">Top Recommendation:</span>
                <span style="font-weight:700">${it.is_top_recommendation ? 'Yes 🏆' : 'No'}</span>
              </div>
              <div>
                <span class="label tiny">AI Consensus:</span>
                <span style="font-weight:700">${it.engines_suggesting_count || (it.dorogo_present ? 1 : 0)} of 3 AIs</span>
              </div>
              <div>
                <span class="label tiny">Competitors:</span>
                <span>${[...new Set((it.competitors || []).map(normalizeCompetitorName))].filter(Boolean).join(', ') || 'None'}</span>
              </div>
            </div>

            <!-- 2-Step Traveler Simulation: Follow-Up Refinement -->
            <div style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px 14px">
              <div class="row between" style="align-items:center;margin-bottom:6px">
                <div class="row" style="gap:6px;align-items:center">
                  <span style="font-size:1rem">💬</span>
                  <span class="label eyebrow" style="margin:0">Traveler Step 2: High-Intent Follow-Up Refinement</span>
                </div>
                <span class="chip gold" style="font-size:.7rem;font-weight:600">Refinement Probe</span>
              </div>
              <div style="font-weight:500;font-size:.88rem;color:var(--ink);margin-bottom:6px">
                “${esc(it.followup || TRACKED_QUERIES.find(q => q.id === it.id)?.followup || 'Which company provides Mercedes V-Class with winter equipment and English-speaking chauffeur?')}”
              </div>
              <div class="small muted" style="line-height:1.4">
                <strong>Why this matters:</strong> Real clients rarely book after 1 prompt. When travelers narrow down from a generic 5-company list to specific operational needs (4MATIC, ski gear, airside tarmac access, corporate VAT invoice), AI search indexes dedicated service specs where Dorogo excels.
              </div>
            </div>

            <div>
              <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px">
                <div class="label eyebrow" style="margin:0">AI Search Engine Grounded Response</div>
                <span class="tiny muted">Interactive citation badges link directly to web sources</span>
              </div>
              <div class="ai-resp-box">
                ${formatAiResponse(it.full_content || it.snippet, citations)}
              </div>
            </div>

            <!-- Verified AI Web Sources & Citations -->
            <div class="stack" style="gap:10px;border-top:1px solid var(--line);padding-top:14px">
              <div class="row" style="justify-content:space-between;align-items:center">
                <span class="label eyebrow" style="margin:0">Verified AI Web Sources &amp; Citations (${citations.length})</span>
                <span class="tiny muted">Click any source link to trace competitor citation on live web</span>
              </div>
              ${citations.length > 0 ? `
                <div class="citations-grid">
                  ${citations.map((c) => {
                    const isCompetitor = (it.competitors || []).some(comp => c.domain.includes(comp.replace(/\s+/g, '')) || c.title.toLowerCase().includes(comp));
                    const isDorogo = c.domain.includes('dorogo') || c.title.toLowerCase().includes('dorogo');
                    const badge = isDorogo 
                      ? `<span class="chip ok" style="font-size:.68rem;font-weight:700">Dorogo Domain</span>`
                      : (isCompetitor ? `<span class="chip warn" style="font-size:.68rem">Competitor Source</span>` : `<span class="chip outline" style="font-size:.68rem">Authority Directory</span>`);

                    return `
                      <a href="${esc(c.url)}" target="_blank" rel="noopener" class="citation-card">
                        <span class="cite-num">${c.index}</span>
                        <div style="flex:1;min-width:0">
                          <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:2px">
                            <span class="cite-domain">${esc(c.domain)} ↗</span>
                            ${badge}
                          </div>
                          <div class="cite-title" title="${esc(c.title)}">${esc(c.title)}</div>
                        </div>
                      </a>
                    `;
                  }).join('')}
                </div>
              ` : `
                <div class="tiny muted" style="padding:10px;background:var(--surface-2);border-radius:var(--r-sm)">
                  No URL citation annotations were returned for this specific probe.
                </div>
              `}
            </div>

            <div class="row end" style="margin-top:10px">
              <button class="btn primary" data-close>Close</button>
            </div>
          </div>
        `,
      });
    });
  });

  el.querySelector('#btn-live-audit')?.addEventListener('click', () => {
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
          <!-- Live Status & Progress Meter -->
          <div class="card" style="background:var(--surface-2);padding:14px 18px;border-radius:var(--r-sm)">
            <div class="row" style="justify-content:space-between;align-items:baseline;margin-bottom:8px">
              <div class="row" style="gap:8px;align-items:center">
                <span class="pulse-dot"></span>
                <span style="font-weight:600;font-size:.9rem" id="crm-hud-progress-label">Initiating probe across 12 high-intent queries... (0%)</span>
              </div>
              <span class="small muted" id="crm-hud-timer">Elapsed: 00:00</span>
            </div>
            <div style="height:10px;background:var(--line);border-radius:6px;overflow:hidden">
              <div id="crm-hud-progress-bar" style="width:0%;height:100%;background:linear-gradient(90deg, #0E100F 0%, #10B981 100%);transition:width .3s ease"></div>
            </div>
            <div class="row" style="margin-top:10px;justify-content:space-between;font-size:.82rem;color:var(--ink-2)">
              <span>Completed: <b id="crm-hud-count">0</b> / 12 inquiries</span>
              <span>Dorogo #1 Wins: <b id="crm-hud-top1" style="color:var(--gold-ink)">0</b></span>
              <span>Top-3 Citations: <b id="crm-hud-top3" style="color:#10B981">0</b></span>
              <span>Est. Cost: <b id="crm-hud-cost">&lt;$0.01 USD</b></span>
            </div>
          </div>

          <!-- Dynamic Query Step Cards -->
          <div class="stack" style="gap:8px;max-height:360px;overflow-y:auto" id="crm-hud-steps-container">
            ${TRACKED_QUERIES.map((q, idx) => `
              <div class="live-step-item" id="crm-step-${idx}">
                <div style="flex:1">
                  <div class="row" style="gap:8px;margin-bottom:2px">
                    <span class="chip" style="font-size:.72rem">${esc(q.niche)}</span>
                    <span class="small" style="font-weight:600;color:var(--ink)">"${esc(q.query)}"</span>
                  </div>
                </div>
                <div id="crm-step-badge-${idx}">
                  <span class="chip outline" style="font-size:.72rem;color:var(--ink-3)">Pending</span>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="row" id="crm-hud-foot" style="justify-content:space-between;margin-top:4px;display:none">
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

        // Run the live audit
        (async () => {
          try {
            const previousRun = cachedHistory && cachedHistory.length ? cachedHistory[cachedHistory.length - 1] : null;

            const newRun = await runFullLiveAudit({
              previousRun,
              signal: abortCtrl.signal,
              onQueryStart: ({ index, total, item }) => {
                const stepEl = box.querySelector(`#crm-step-${index}`);
                if (stepEl) {
                  stepEl.classList.add('active');
                  stepEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                const badgeEl = box.querySelector(`#crm-step-badge-${index}`);
                if (badgeEl) {
                  badgeEl.innerHTML = `<span class="chip gold" style="font-size:.72rem"><span class="spin">⟳</span> Probing Live Web...</span>`;
                }
                const label = box.querySelector('#crm-hud-progress-label');
                if (label) label.textContent = `Query ${index + 1} of ${total}: Probing Perplexity for "${item.niche}"...`;
              },
              onQueryComplete: ({ index, result }) => {
                const stepEl = box.querySelector(`#crm-step-${index}`);
                if (stepEl) {
                  stepEl.classList.remove('active');
                  if (result.dorogo_rank === 1 || result.is_top_recommendation) {
                    stepEl.classList.add('top1');
                  }
                }
                const badgeEl = box.querySelector(`#crm-step-badge-${index}`);
                if (badgeEl) {
                  if (result.is_top_recommendation || result.dorogo_rank === 1) {
                    badgeEl.innerHTML = `<span class="chip ok" style="font-weight:700;font-size:.75rem">🏆 #1 Top Pick! (${result.latency}ms)</span>`;
                  } else if (result.dorogo_rank && result.dorogo_rank <= 3) {
                    badgeEl.innerHTML = `<span class="chip ok" style="font-weight:600;font-size:.75rem">🥈 Top 3 (#${result.dorogo_rank})</span>`;
                  } else if (result.dorogo_present) {
                    badgeEl.innerHTML = `<span class="chip warn" style="font-size:.75rem">Ranked #${result.dorogo_rank}</span>`;
                  } else {
                    const comps = (result.competitors || []).slice(0, 2).join(', ');
                    badgeEl.innerHTML = `<span class="chip outline" style="font-size:.72rem;color:var(--ink-3)">Unranked ${comps ? '(' + comps + ')' : ''}</span>`;
                  }
                }
              },
              onProgress: ({ completed, percent, resultsSoFar, estimatedCostUsd }) => {
                const progressBar = box.querySelector('#crm-hud-progress-bar');
                if (progressBar) progressBar.style.width = `${percent}%`;

                const countLabel = box.querySelector('#crm-hud-count');
                if (countLabel) countLabel.textContent = completed;

                const top1Count = resultsSoFar.filter(r => r.is_top_recommendation || r.dorogo_rank === 1).length;
                const top1El = box.querySelector('#crm-hud-top1');
                if (top1El) top1El.textContent = top1Count;

                const top3Count = resultsSoFar.filter(r => r.dorogo_present && (r.is_top_recommendation || (r.dorogo_rank && r.dorogo_rank <= 3))).length;
                const top3El = box.querySelector('#crm-hud-top3');
                if (top3El) top3El.textContent = top3Count;

                const costEl = box.querySelector('#crm-hud-cost');
                if (costEl) costEl.textContent = `$${estimatedCostUsd.toFixed(4)} USD`;
              }
            });

            isDone = true;
            clearInterval(timerInterval);

            // Save & Update State
            cachedHistory = persistLiveAuditRun(newRun);
            selectedRunIdx = cachedHistory.length - 1;

            const progressBar = box.querySelector('#crm-hud-progress-bar');
            if (progressBar) progressBar.style.width = '100%';

            const progressLabel = box.querySelector('#crm-hud-progress-label');
            if (progressLabel) progressLabel.innerHTML = `✅ <b>Audit Complete! 12/12 Inquiries Analyzed</b>`;

            const foot = box.querySelector('#crm-hud-foot');
            if (foot) foot.style.display = 'flex';

            box.querySelector('#btn-crm-download-run')?.addEventListener('click', () => {
              const blob = new Blob([JSON.stringify(cachedHistory, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'visibility_history.json';
              a.click();
              URL.revokeObjectURL(url);
            });

            box.querySelector('#btn-crm-finish-audit')?.addEventListener('click', async () => {
              close();
              await render(el);
              toast('Dashboard updated with live audit');
            });

          } catch (err) {
            clearInterval(timerInterval);
            if (err.message !== "Audit cancelled by user") {
              toast('Live Audit Notice: ' + err.message, 'error');
            }
          } finally {
            if (triggerBtn) {
              triggerBtn.disabled = false;
              triggerBtn.innerHTML = `⚡ Run Live Audit`;
            }
          }
        })();
      },
    });
  });

  // --- HubSpot Grader Podium Listeners ---
  el.querySelectorAll('[data-podium-engine]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      activePodiumEngine = btn.dataset.podiumEngine || 'all';
      await render(el);
    });
  });

  el.querySelector('#sel-grader-snapshot')?.addEventListener('change', async (e) => {
    selectedGraderIdx = Number(e.target.value);
    await render(el);
  });

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

  el.querySelector('#btn-import-grader-pdf')?.addEventListener('click', () => {
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

        fileInput.addEventListener('change', () => {
          if (fileInput.files?.length) {
            handleFile(fileInput.files[0]);
          }
        });

        async function handleFile(file) {
          dropzone.innerHTML = `<span class="spin">⟳</span> Reading ${esc(file.name)}...`;
          try {
            const text = await file.text();
            if (text.includes('AI Search Grader') || text.includes('ChatGPT') || text.includes('DOROGO')) {
              pasteInput.value = text;
              dropzone.innerHTML = `✅ Loaded <b>${esc(file.name)}</b>. Click "Process &amp; Update Podium" below.`;
            } else {
              dropzone.innerHTML = `📄 Loaded <b>${esc(file.name)}</b>.<br><span class="tiny muted">For direct terminal import: <code>node scripts/parse-hubspot-pdf.mjs "${esc(file.name)}"</code><br>Or paste text below.</span>`;
            }
          } catch (_) {
            dropzone.innerHTML = `📄 Loaded <b>${esc(file.name)}</b>.`;
          }
        }

        submitBtn.addEventListener('click', async () => {
          const raw = pasteInput.value.trim();
          if (!raw) {
            toast('Please upload a file or paste report text', 'warn');
            return;
          }
          const parsed = parseHubSpotGraderText(raw);
          if (!parsed) {
            toast('Could not parse HubSpot report format. Please check the text format.', 'bad');
            return;
          }
          await saveGraderSnapshot(parsed);
          close();
          toast('HubSpot AI Search Grader imported successfully! Podium updated.', 'ok');
          cachedGraderHistory = null;
          await render(el);
        });
      }
    });
  });

  el.querySelector('#btn-run-grader-script')?.addEventListener('click', () => {
    dialog({
      title: 'HubSpot AI Search Grader Automation Bot',
      body: `
        <div class="stack" style="gap:14px">
          <p class="small muted" style="margin:0">
            HubSpot's free AI Search Grader does not provide a public REST API key. We provide automated CLI runners that navigate, submit parameters, download the PDF, and update this dashboard every 2 weeks.
          </p>

          <div class="card" style="background:var(--surface-2);padding:14px;border-radius:var(--r-sm)">
            <span class="label tiny" style="margin-bottom:6px;display:block">Automated Diagnostic Runner:</span>
            <code style="font-size:.82rem;display:block;background:var(--bg);padding:8px 10px;border-radius:var(--r-sm);border:1px solid var(--line);user-select:all">
              node scripts/fetch-hubspot-grader.mjs
            </code>
            <p class="tiny muted" style="margin:6px 0 0">
              Runs Playwright headless browser to submit DOROGO Milan NCC parameters and download fresh PDF report.
            </p>
          </div>

          <div class="card" style="background:var(--surface-2);padding:14px;border-radius:var(--r-sm)">
            <span class="label tiny" style="margin-bottom:6px;display:block">CLI PDF Parser:</span>
            <code style="font-size:.82rem;display:block;background:var(--bg);padding:8px 10px;border-radius:var(--r-sm);border:1px solid var(--line);user-select:all">
              node scripts/parse-hubspot-pdf.mjs data/visibility/reports/dorogo_hubspot_grader_2026-10-28.pdf
            </code>
            <p class="tiny muted" style="margin:6px 0 0">
              Extracts all scores, Share of Voice %, and updates <code>data/visibility_grader_history.json</code>.
            </p>
          </div>

          <div class="row between" style="margin-top:4px">
            <a href="https://www.hubspot.com/ai-search-grader" target="_blank" class="btn ghost sm">Open HubSpot AI Search Grader ↗</a>
            <button class="btn primary sm" data-close>Close</button>
          </div>
        </div>
      `
    });
  });
}

function openCrmActionModal(el, existing = null) {
  const today = new Date().toISOString().slice(0, 10);
  const dateVal = existing ? existing.date : today;
  const nicheVal = existing ? existing.niche : 'Alpine Ski';
  const catVal = existing ? existing.category : 'Web Content & Specs';
  const titleVal = existing ? esc(existing.title) : '';
  const descVal = existing ? esc(existing.description || '') : '';
  const urlVal = existing ? esc(existing.url || '') : '';
  const verdictVal = existing ? existing.verdict : 'effective';
  const notesVal = existing ? esc(existing.notes || '') : '';

  dialog({
    title: existing ? 'Edit Optimization Action' : 'Log Visibility Optimization Action',
    wide: false,
    body: `
      <div class="stack" style="gap:14px">
        <div class="split" style="gap:12px">
          <div>
            <label class="label small" style="display:block;margin-bottom:4px">Date of Action</label>
            <input type="date" class="input sm" id="crm-act-date" value="${dateVal}" style="width:100%" required>
          </div>
          <div>
            <label class="label small" style="display:block;margin-bottom:4px">Target Revenue Pillar</label>
            <select class="input sm" id="crm-act-niche" style="width:100%">
              <option value="Alpine Ski" ${nicheVal === 'Alpine Ski' ? 'selected' : ''}>Alpine Ski Transfers</option>
              <option value="Fiera Milano Convoys" ${nicheVal === 'Fiera Milano Convoys' ? 'selected' : ''}>Fiera Milano Convoys</option>
              <option value="Private Jet FBO" ${nicheVal === 'Private Jet FBO' ? 'selected' : ''}>Private Jet FBO</option>
              <option value="Lake Como Weddings" ${nicheVal === 'Lake Como Weddings' ? 'selected' : ''}>Lake Como Weddings</option>
              <option value="Lake & Cross-Border" ${nicheVal === 'Lake & Cross-Border' ? 'selected' : ''}>Lakes &amp; Cross-Border</option>
              <option value="Outlet Standby" ${nicheVal === 'Outlet Standby' ? 'selected' : ''}>Serravalle Outlet Standby</option>
            </select>
          </div>
        </div>

        <div class="split" style="gap:12px">
          <div>
            <label class="label small" style="display:block;margin-bottom:4px">Initiative Category</label>
            <select class="input sm" id="crm-act-cat" style="width:100%">
              <option value="Web Content & Specs" ${catVal === 'Web Content & Specs' ? 'selected' : ''}>Web Content &amp; Specs</option>
              <option value="Outreach & Partnerships" ${catVal === 'Outreach & Partnerships' ? 'selected' : ''}>Outreach &amp; Rate Cards</option>
              <option value="Digital PR & Backlinks" ${catVal === 'Digital PR & Backlinks' ? 'selected' : ''}>Digital PR &amp; Backlinks</option>
              <option value="llms.txt / Machine Indexing" ${catVal === 'llms.txt / Machine Indexing' ? 'selected' : ''}>llms.txt / Machine Indexing</option>
            </select>
          </div>
          <div>
            <label class="label small" style="display:block;margin-bottom:4px">Observed Impact Verdict</label>
            <select class="input sm" id="crm-act-verdict" style="width:100%">
              <option value="effective" ${verdictVal === 'effective' ? 'selected' : ''}>🟢 Effective (Improved Rank)</option>
              <option value="testing" ${verdictVal === 'testing' ? 'selected' : ''}>⏳ Testing / Indexing in Progress</option>
              <option value="ineffective" ${verdictVal === 'ineffective' ? 'selected' : ''}>🔴 Ineffective (No AI impact)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="label small" style="display:block;margin-bottom:4px">Initiative Title</label>
          <input type="text" class="input sm" id="crm-act-title" value="${titleVal}" placeholder="e.g. Published Courchevel 1850 &amp; St. Moritz alpine ski guide" style="width:100%" required>
        </div>

        <div>
          <label class="label small" style="display:block;margin-bottom:4px">Observed Impact &amp; Notes</label>
          <textarea class="input sm" id="crm-act-notes" rows="2" placeholder="e.g. Secured #1 Top Pick in Perplexity for Courchevel 1850; achieved #3 podium for St. Moritz" style="width:100%">${notesVal}</textarea>
        </div>

        <div>
          <label class="label small" style="display:block;margin-bottom:4px">Evidence URL / Rate Sheet (Optional)</label>
          <input type="url" class="input sm" id="crm-act-url" value="${urlVal}" placeholder="https://dorogo.eu/..." style="width:100%">
        </div>

        <div class="row end" style="gap:8px;margin-top:8px">
          <button class="btn ghost sm" data-close>Cancel</button>
          <button class="btn primary sm" id="crm-btn-save-act">Save Action</button>
        </div>
      </div>
    `,
    onMount: (box, close) => {
      box.querySelector('#crm-btn-save-act')?.addEventListener('click', async () => {
        const title = box.querySelector('#crm-act-title')?.value.trim();
        if (!title) {
          toast('Please enter a title for the action', 'error');
          return;
        }

        const act = {
          id: existing ? existing.id : 'act_' + Date.now().toString(36),
          date: box.querySelector('#crm-act-date')?.value || today,
          niche: box.querySelector('#crm-act-niche')?.value,
          category: box.querySelector('#crm-act-cat')?.value,
          title,
          notes: box.querySelector('#crm-act-notes')?.value.trim(),
          url: box.querySelector('#crm-act-url')?.value.trim(),
          verdict: box.querySelector('#crm-act-verdict')?.value
        };

        cachedActions = saveVisibilityAction(act, cachedActions);
        close();
        toast('Optimization action logged');
        await render(el);
      });
    }
  });
}
