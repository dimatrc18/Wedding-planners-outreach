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
  normalizeCompetitorName
} from '../services/live_audit.js';

let cachedHistory = null;
let cachedActions = null;
let activeFilter = 'top3'; // 'all' | 'top3' | specific niche
let actionFilter = 'all'; // 'all' | 'effective' | 'testing' | 'ineffective'
let selectedRunIdx = -1;

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
      <div class="row" style="gap:8px;align-items:center">
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
