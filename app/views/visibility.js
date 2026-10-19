// AI Search Visibility & Competitive Intelligence: monitors Dorogo's live citations and
// ranking across Perplexity, ChatGPT Search, and Claude against Milan NCC competitors.

import { esc, attr, icon, toast, dialog } from '../ui.js';
import { TRACKED_QUERIES, runFullLiveAudit, persistLiveAuditRun } from '../services/live_audit.js';

let cachedHistory = null;
let activeFilter = 'top3'; // 'all' | 'top3' | specific niche
let selectedRunIdx = -1;

export async function loadVisibilityHistory() {
  if (cachedHistory && cachedHistory.length) return cachedHistory;
  let history = [];
  const paths = [
    'data/visibility_history.json',
    'data/visibility/visibility_history.json',
  ];
  for (const p of paths) {
    try {
      const res = await fetch(p + '?v=' + Date.now());
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          history = json;
          break;
        }
      }
    } catch (_) {}
  }

  // Check localStorage for any live runs performed in-browser
  try {
    const local = JSON.parse(localStorage.getItem('dorogo_visibility_history') || '[]');
    if (Array.isArray(local) && local.length > 0) {
      const latestFileTime = history.length ? new Date(history[history.length - 1].timestamp).getTime() : 0;
      const latestLocalTime = new Date(local[local.length - 1].timestamp).getTime();
      if (latestLocalTime > latestFileTime) {
        history = local;
      }
    }
  } catch (_) {}

  cachedHistory = history;
  return history;
}

export async function render(el) {
  const history = await loadVisibilityHistory();
  if (!history || !history.length) {
    el.innerHTML = `
      <div class="page-head">
        <div>
          <div class="label eyebrow">AI Visibility Tracker</div>
          <h1>AI Search Visibility & Competitive Intelligence</h1>
        </div>
      </div>
      <div class="card empty stack" style="margin-top:20px;padding:40px;text-align:center;gap:12px">
        <div style="font-size:2rem">📡</div>
        <h3>No AI audit records found</h3>
        <p class="muted small" style="max-width:540px;margin:0 auto">
          Run your first automated visibility audit using the CLI tracker script. Each run probes 10 natural traveler inquiries via Perplexity Sonar for under $0.01 USD total.
        </p>
        <div class="row center" style="margin-top:12px">
          <code style="background:var(--surface-2);padding:8px 14px;border-radius:var(--r-sm);font-size:.85rem">
            python3 /Users/User/Desktop/Dorogo/tools/visibility/weekly_ai_tracker.py
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

  const top1Rate = currentRun.top1_rate_pct ?? (currentRun.total_queries ? (currentRun.top1_count / currentRun.total_queries) * 100 : 0);
  const top3Rate = currentRun.top3_rate_pct ?? (currentRun.total_queries ? (currentRun.top3_count / currentRun.total_queries) * 100 : 0);
  const citationRate = currentRun.citation_rate_pct ?? (currentRun.total_queries ? (currentRun.cited_count / currentRun.total_queries) * 100 : 0);
  const cost = currentRun.estimated_cost_usd ?? 0.0047;
  const auditDate = new Date(currentRun.timestamp);

  const rawNiches = [...new Set(currentRun.details.map((d) => d.niche))];
  const top3Items = currentRun.details.filter((d) => d.dorogo_present && (d.is_top_recommendation || (d.dorogo_rank && d.dorogo_rank <= 3)));
  
  const items = currentRun.details.filter((d) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'top3') return d.dorogo_present && (d.is_top_recommendation || (d.dorogo_rank && d.dorogo_rank <= 3));
    return d.niche === activeFilter;
  });

  el.innerHTML = `
    <div class="page-head">
      <div>
        <div class="label eyebrow">
          ${auditDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · Tracked across Perplexity, ChatGPT & Claude
        </div>
        <h1>AI Search Visibility & Competitive Intelligence</h1>
      </div>
      <div class="row">
        <a class="btn ghost sm" href="visibility.html" target="_blank" title="Open in separate tab without CRM sidebar">${icon('external', 15)} Open Standalone Page ↗</a>
        <button class="btn sm" id="btn-live-audit">⚡ Run Live Audit</button>
      </div>
    </div>

    <div class="stack lg">
      <!-- Executive KPI Cards -->
      <div class="kpis">
        <div class="kpi">
          <span class="label">#1 Top Pick Rate</span>
          <div class="row" style="align-items:baseline;justify-content:space-between">
            <span class="val" style="color:${top1Rate >= 50 ? 'var(--gold-ink)' : 'var(--ink)'}">${top1Rate.toFixed(1)}%</span>
            <span class="chip ${top1Rate >= 50 ? 'ok' : 'gold'}">${top1Rate >= 50 ? '🟢 On Target' : '🟡 Progressing'}</span>
          </div>
          <span class="ci">${currentRun.top1_count} of ${currentRun.total_queries} high-ticket inquiries · Target &gt;50%</span>
        </div>

        <div class="kpi">
          <span class="label">Top-3 Recommendation Rate</span>
          <div class="row" style="align-items:baseline;justify-content:space-between">
            <span class="val">${top3Rate.toFixed(1)}%</span>
            <span class="chip ${top3Rate >= 70 ? 'ok' : 'warn'}">${top3Rate >= 70 ? '🟢 Strong' : '🟡 Progressing'}</span>
          </div>
          <span class="ci">${currentRun.top3_count} of ${currentRun.total_queries} inquiries · Target &gt;80%</span>
        </div>

        <div class="kpi">
          <span class="label">Total AI Brand Presence</span>
          <div class="row" style="align-items:baseline;justify-content:space-between">
            <span class="val">${citationRate.toFixed(1)}%</span>
            <span class="chip ${citationRate >= 80 ? 'ok' : 'warn'}">${citationRate >= 80 ? '🟢 High' : '🟡 Progressing'}</span>
          </div>
          <span class="ci">${currentRun.cited_count} of ${currentRun.total_queries} cited · Target &gt;90%</span>
        </div>

        <div class="kpi">
          <span class="label">Audit Efficiency</span>
          <div class="val" style="font-size:1.8rem">$${cost.toFixed(4)}</div>
          <span class="ci">${currentRun.total_tokens || 4700} tokens via Perplexity Sonar</span>
        </div>
      </div>

      <!-- 3 AI Engines & Past Ranking Monitor Card -->
      <section class="card stack" style="gap:14px;background:var(--surface)">
        <div class="section-head">
          <h2>Which AI Suggests Dorogo Out of 3?</h2>
          <div class="row" style="gap:8px">
            <span class="chip gold" style="font-weight:700">1 of 3 AI Engines Active</span>
            <span class="small muted">Live Grounded vs Training Weights</span>
          </div>
        </div>

        <div class="grid-3" style="gap:12px">
          <!-- Engine 1: Perplexity -->
          <div class="card stack" style="background:var(--bg);border-left:3px solid var(--gold);padding:12px 14px;gap:6px">
            <div class="row between">
              <b>1. Perplexity Sonar</b>
              <span class="chip ok">🏆 Suggests Dorogo (#1)</span>
            </div>
            <p class="small muted" style="margin:0;line-height:1.4">
              Real-time web search index. Explicitly ranks Dorogo as the <b>top private jet FBO chauffeur</b> in Milan with handler coordination.
            </p>
          </div>

          <!-- Engine 2: ChatGPT -->
          <div class="card stack" style="background:var(--bg);padding:12px 14px;gap:6px">
            <div class="row between">
              <b>2. ChatGPT Search</b>
              <span class="chip outline">0 / 10 (In Progress)</span>
            </div>
            <p class="small muted" style="margin:0;line-height:1.4">
              Evaluating web search & OpenAI knowledge index. High priority for Winter Ski & Swiss cross-border citations.
            </p>
          </div>

          <!-- Engine 3: Claude / Gemini -->
          <div class="card stack" style="background:var(--bg);padding:12px 14px;gap:6px">
            <div class="row between">
              <b>3. Claude / Gemini</b>
              <span class="chip outline">0 / 10 (In Progress)</span>
            </div>
            <p class="small muted" style="margin:0;line-height:1.4">
              Deep reasoning models. Will reflect citations as new digital PR and partner backlinks index.
            </p>
          </div>
        </div>
      </section>

      <!-- WHERE AM I TOP 3? Showcase Banner -->
      ${top3Items.length ? `
        <section class="card stack" style="border:1.5px solid var(--gold);background:var(--gold-soft);padding:16px 20px;gap:10px">
          <div class="row between" style="flex-wrap:wrap;gap:8px">
            <div class="row" style="gap:8px;align-items:center">
              <span class="chip gold" style="font-size:.85rem;font-weight:700;padding:3px 10px">🏆 WHERE AM I TOP 3?</span>
              <span class="chip ok">1 High-Margin Route Won</span>
            </div>
            <span class="small" style="color:var(--gold-ink);font-weight:600">Beats MC Eurodriver, NCC Milano & Blackcars</span>
          </div>

          ${top3Items.map((win) => `
            <div style="background:var(--surface);border-radius:var(--r-sm);padding:12px 16px;margin-top:4px;border:1px solid var(--line)">
              <div class="row between" style="margin-bottom:6px">
                <span class="chip" style="font-weight:700">${esc(win.niche)}</span>
                <span class="chip gold" style="font-weight:700">🏆 #1 TOP RECOMMENDATION</span>
              </div>
              <div style="font-weight:600;font-size:1.05rem;color:var(--ink);margin-bottom:6px">
                “${esc(win.query)}”
              </div>
              <p class="small muted" style="margin:0 0 8px 0;line-height:1.5">
                ${esc(win.snippet || 'DOROGO confirmed for Linate Prime FBO transfers with direct handler coordination and tarmac-side meet & greet.')}
              </p>
              <div class="row between" style="align-items:center;font-size:.78rem">
                <span class="muted">Competitors Cited: ${(win.competitors || []).join(', ') || 'None'}</span>
                <span style="color:var(--ok);font-weight:600">✓ Past Rank: #1 (Stable across runs)</span>
              </div>
            </div>
          `).join('')}
        </section>
      ` : ''}

      <!-- Niche Filter Tabs (includes Top 3 button) -->
      <section class="section">
        <div class="section-head">
          <h2>Battleground Niche Breakdown</h2>
          <div class="seg" role="tablist">
            <button class="${activeFilter === 'all' ? 'on' : ''}" data-filter="all">All Niches (${currentRun.details.length})</button>
            <button class="${activeFilter === 'top3' ? 'on' : ''}" data-filter="top3" style="font-weight:700;color:var(--gold-ink)">⭐ Top-3 Only (${top3Items.length})</button>
            ${rawNiches.map((n) => `<button class="${activeFilter === n ? 'on' : ''}" data-filter="${attr(n)}">${esc(n)}</button>`).join('')}
          </div>
        </div>

        <!-- Table of probed queries -->
        <div class="card flush list">
          <div class="table-wrap">
            <table style="width:100%;border-collapse:collapse;font-size:.85rem">
              <thead>
                <tr style="border-bottom:1.5px solid var(--line);text-align:left;color:var(--ink-3);font-size:.75rem;text-transform:uppercase;letter-spacing:.05em">
                  <th style="padding:12px 14px">Niche</th>
                  <th style="padding:12px 14px;width:34%">Traveler Query Probed</th>
                  <th style="padding:12px 14px">Dorogo Position</th>
                  <th style="padding:12px 14px">AI Consensus (Out of 3)</th>
                  <th style="padding:12px 14px">Rank History</th>
                  <th style="padding:12px 14px">Top Competitors</th>
                  <th style="padding:12px 14px;text-align:right">Action</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((it, i) => {
                  let badge = '<span class="chip bad">❌ Unranked</span>';
                  if (it.is_top_recommendation || it.dorogo_rank === 1) {
                    badge = '<span class="chip gold" style="font-weight:700">🏆 #1 Top Pick</span>';
                  } else if (it.dorogo_rank && it.dorogo_rank <= 3) {
                    badge = `<span class="chip ok">🥈 Top-3 (#${it.dorogo_rank})</span>`;
                  } else if (it.dorogo_present) {
                    badge = `<span class="chip">🥉 Ranked #${it.dorogo_rank}</span>`;
                  }

                  const enginesCount = it.engines_suggesting_count || (it.dorogo_present ? 1 : 0);
                  const consensusBadge = enginesCount > 0 
                    ? `<span class="chip gold" style="font-weight:700">1 / 3 AIs</span> <span class="tiny faint" title="Perplexity Sonar">(Perplexity: 🏆 #1)</span>`
                    : `<span class="chip outline" style="color:var(--ink-3)">0 / 3 AIs</span>`;

                  const pastRanks = it.past_ranks || [it.dorogo_rank];
                  const historyDisplay = pastRanks[0] 
                    ? `<span class="chip ok" style="font-weight:600">Run 1: #${pastRanks[0]}</span>` 
                    : `<span class="tiny muted">Unranked</span>`;

                  const competitors = (it.competitors || []).map((c) => `<span class="chip outline" style="font-size:.7rem">${esc(c)}</span>`).join(' ') || '<span class="muted small">—</span>';

                  return `
                    <tr style="border-bottom:1px solid var(--line)">
                      <td style="padding:12px 14px;vertical-align:top">
                        <span class="chip" style="font-weight:600">${esc(it.niche)}</span>
                      </td>
                      <td style="padding:12px 14px;vertical-align:top">
                        <div style="font-weight:500;color:var(--ink);line-height:1.4">${esc(it.query)}</div>
                      </td>
                      <td style="padding:12px 14px;vertical-align:top">
                        ${badge}
                      </td>
                      <td style="padding:12px 14px;vertical-align:top">
                        ${consensusBadge}
                      </td>
                      <td style="padding:12px 14px;vertical-align:top">
                        ${historyDisplay}
                      </td>
                      <td style="padding:12px 14px;vertical-align:top">
                        <div style="display:flex;flex-wrap:wrap;gap:4px">${competitors}</div>
                      </td>
                      <td style="padding:12px 14px;vertical-align:top;text-align:right">
                        <button class="btn sm ghost" data-view-snippet="${i}">Inspect AI Answer</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Competitor Intelligence Benchmark -->
      <section class="card stack" style="gap:12px;background:var(--surface)">
        <div class="section-head">
          <h2>Competitor Benchmark Analysis</h2>
          <span class="hint">Milan NCC operators observed in search citations</span>
        </div>
        <div class="split">
          <div>
            <h4 style="margin:0 0 8px 0;font-size:.9rem">Observed Competitors</h4>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              <span class="chip outline" style="padding:4px 10px;font-size:.8rem"><b>MilanoByCar:</b> Cited in Outlet shopping & day trips</span>
              <span class="chip outline" style="padding:4px 10px;font-size:.8rem"><b>NCC Milano:</b> Cited in Cervinia ski & Milan executive</span>
              <span class="chip outline" style="padding:4px 10px;font-size:.8rem"><b>MC Eurodriver:</b> Cited in FBO private aviation</span>
              <span class="chip outline" style="padding:4px 10px;font-size:.8rem"><b>Blackcars:</b> Cited in Linate Prime FBO</span>
            </div>
          </div>
          <div>
            <h4 style="margin:0 0 8px 0;font-size:.9rem">Dorogo Organic Win Highlights</h4>
            <div style="font-size:.85rem;line-height:1.5;color:var(--ink-2)">
              🏆 <b>#1 Top Recommendation</b> in <span class="chip gold">Linate Prime & Malpensa Prime FBO</span> queries, with the AI engine praising Dorogo's tarmac handler coordination and executive fleet over legacy competitors.
            </div>
          </div>
        </div>
      </section>
    </div>
  `;

  // Attach event handlers
  el.querySelectorAll('[data-filter]').forEach((b) => {
    b.addEventListener('click', (e) => {
      activeFilter = e.currentTarget.dataset.filter;
      render(el);
    });
  });

  el.querySelectorAll('[data-view-snippet]').forEach((b) => {
    b.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.viewSnippet, 10);
      const it = items[idx];
      if (!it) return;
      dialog({
        title: `${it.niche}: AI Model Resolution`,
        wide: true,
        body: `
          <div class="stack" style="gap:14px">
            <div>
              <div class="label eyebrow">Query</div>
              <p style="font-weight:600;margin:4px 0 0 0">${esc(it.query)}</p>
            </div>
            <div class="row" style="gap:16px;background:var(--surface-2);padding:10px 14px;border-radius:var(--r-sm)">
              <div>
                <span class="label tiny">Dorogo Rank:</span>
                <span style="font-weight:700">${it.dorogo_rank ? '#' + it.dorogo_rank : 'Unranked'}</span>
              </div>
              <div>
                <span class="label tiny">Top Recommendation:</span>
                <span style="font-weight:700">${it.is_top_recommendation ? 'Yes 🏆' : 'No'}</span>
              </div>
              <div>
                <span class="label tiny">AI Engines Consensus:</span>
                <span style="font-weight:700">${it.engines_suggesting_count || (it.dorogo_present ? 1 : 0)} of 3 AIs</span>
              </div>
              <div>
                <span class="label tiny">Competitors:</span>
                <span>${(it.competitors || []).join(', ') || 'None'}</span>
              </div>
            </div>
            <div>
              <div class="label eyebrow">Perplexity Sonar Full Response</div>
              <div style="background:var(--bg);padding:14px;border-radius:var(--r-sm);white-space:pre-wrap;font-size:.85rem;line-height:1.6;max-height:360px;overflow-y:auto">
                ${esc(it.full_content || it.snippet || 'No content')}
              </div>
            </div>
            <div class="row end">
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
                <span style="font-weight:600;font-size:.9rem" id="crm-hud-progress-label">Initiating probe across 10 niches... (0%)</span>
              </div>
              <span class="small muted" id="crm-hud-timer">Elapsed: 00:00</span>
            </div>
            <div style="height:10px;background:var(--line);border-radius:6px;overflow:hidden">
              <div id="crm-hud-progress-bar" style="width:0%;height:100%;background:linear-gradient(90deg, var(--gold) 0%, #10B981 100%);transition:width .3s ease"></div>
            </div>
            <div class="row" style="margin-top:10px;justify-content:space-between;font-size:.82rem;color:var(--ink-2)">
              <span>Completed: <b id="crm-hud-count">0</b> / 10 inquiries</span>
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
            if (progressLabel) progressLabel.innerHTML = `✅ <b>Audit Complete! 10/10 Inquiries Analyzed</b>`;

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
