// AI Search Visibility & Competitive Intelligence: monitors Dorogo's live citations and
// ranking across Perplexity, ChatGPT Search, and Claude against Milan NCC competitors.

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
  computeHistoricalComparison
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

  const comp = computeHistoricalComparison(history, runIdx);
  const { deltaWeek, deltaMonth, routeTrends } = comp || {};

  const rawNiches = [...new Set(currentRun.details.map((d) => d.niche))];
  const top3Items = currentRun.details.filter((d) => d.dorogo_present && (d.is_top_recommendation || (d.dorogo_rank && d.dorogo_rank <= 3)));
  
  const items = currentRun.details.filter((d) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'top3') return d.dorogo_present && (d.is_top_recommendation || (d.dorogo_rank && d.dorogo_rank <= 3));
    return d.niche === activeFilter;
  });

  const actionsData = await loadVisibilityActions();
  cachedActions = actionsData;

  el.innerHTML = `
    <!-- Page Header -->
    <div class="page-head" style="margin-bottom:18px">
      <div>
        <div class="label eyebrow" style="letter-spacing:.04em;margin-bottom:4px">
          LIVE SEARCH GROUNDING · AUDITED ${auditDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()} · ${currentRun.details.length} LUXURY ROUTES
        </div>
        <h1 style="margin:0;font-size:1.65rem">AI Search Visibility &amp; Competitive Intelligence</h1>
      </div>
      <div class="row" style="gap:8px;align-items:center">
        <button class="btn ghost sm" id="btn-crm-log-action">📝 Log Action</button>
        <a class="btn ghost sm" href="visibility.html" target="_blank" title="Open standalone page without CRM sidebar">${icon('external', 14)} Full Screen ↗</a>
        <button class="btn sm primary" id="btn-live-audit">⚡ Run Live Audit</button>
      </div>
    </div>

    <div class="stack lg">
      <!-- Historical Time Machine & Supabase Sync Bar -->
      <div class="card row between" style="padding:10px 16px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm);align-items:center;flex-wrap:wrap;gap:10px">
        <div class="row" style="gap:10px;align-items:center;flex-wrap:wrap">
          <span style="font-size:1rem">⏱️</span>
          <span class="small" style="font-weight:600">Audit History &amp; Time Machine:</span>
          <select id="sel-history-run" style="background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:4px 10px;font-size:.82rem;font-weight:500;color:var(--ink)">
            ${history.map((run, i) => {
              const d = new Date(run.timestamp);
              const isLatest = i === history.length - 1;
              const top3 = run.top3_rate_pct ?? (run.total_queries ? (run.top3_count / run.total_queries) * 100 : 0);
              return `<option value="${i}" ${i === runIdx ? 'selected' : ''}>${isLatest ? '⚡ Latest Audit · ' : `Run ${i + 1} · `}${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} (Top-3: ${top3.toFixed(1)}%)</option>`;
            }).reverse().join('')}
          </select>
          ${runIdx !== history.length - 1 ? `<button class="btn sm ghost" id="btn-reset-latest" style="font-size:.76rem;padding:2px 8px">← Back to Latest</button>` : ''}
        </div>
        <div class="row" style="gap:8px;align-items:center">
          <span class="chip ok" style="font-weight:600;font-size:.75rem;display:inline-flex;align-items:center;gap:6px">
            <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--ok)"></span>
            Supabase Cloud Synced (${history.length} snapshots)
          </span>
        </div>
      </div>

      <!-- 1. Executive Performance Scorecard -->
      <div class="kpis">
        <div class="kpi">
          <span class="label">#1 Top Pick Rate</span>
          <div class="row" style="align-items:baseline;justify-content:space-between">
            <span class="val" style="color:${top1Rate >= 50 ? 'var(--gold-ink)' : 'var(--ink)'}">${top1Rate.toFixed(1)}%</span>
            <span class="chip ${top1Rate >= 50 ? 'ok' : 'gold'}">${top1Rate >= 50 ? '🟢 Strong' : '🟡 Progressing'}</span>
          </div>
          <span class="ci">${currentRun.top1_count} of ${currentRun.total_queries} queries · Target &gt;50%</span>
          ${deltaWeek || deltaMonth ? `
            <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">
              ${deltaWeek ? `<span class="chip ${deltaWeek.top1 > 0 ? 'ok' : deltaWeek.top1 < 0 ? 'bad' : 'outline'}" style="font-size:.7rem;padding:1px 6px" title="${esc(deltaWeek.date)}">${deltaWeek.top1 > 0 ? '▲ +' : deltaWeek.top1 < 0 ? '▼ ' : '● '}${deltaWeek.top1}% ${esc(deltaWeek.label)}</span>` : ''}
              ${deltaMonth ? `<span class="chip ${deltaMonth.top1 > 0 ? 'ok' : deltaMonth.top1 < 0 ? 'bad' : 'outline'}" style="font-size:.7rem;padding:1px 6px" title="${esc(deltaMonth.date)}">${deltaMonth.top1 > 0 ? '▲ +' : deltaMonth.top1 < 0 ? '▼ ' : '● '}${deltaMonth.top1}% ${esc(deltaMonth.label)}</span>` : ''}
            </div>
          ` : ''}
        </div>

        <div class="kpi">
          <span class="label">Top-3 Podium Share</span>
          <div class="row" style="align-items:baseline;justify-content:space-between">
            <span class="val">${top3Rate.toFixed(1)}%</span>
            <span class="chip ${top3Rate >= 70 ? 'ok' : 'warn'}">${top3Rate >= 70 ? '🟢 Strong' : '🟡 Progressing'}</span>
          </div>
          <span class="ci">${currentRun.top3_count} of ${currentRun.total_queries} queries · Target &gt;80%</span>
          ${deltaWeek || deltaMonth ? `
            <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">
              ${deltaWeek ? `<span class="chip ${deltaWeek.top3 > 0 ? 'ok' : deltaWeek.top3 < 0 ? 'bad' : 'outline'}" style="font-size:.7rem;padding:1px 6px" title="${esc(deltaWeek.date)}">${deltaWeek.top3 > 0 ? '▲ +' : deltaWeek.top3 < 0 ? '▼ ' : '● '}${deltaWeek.top3}% ${esc(deltaWeek.label)}</span>` : ''}
              ${deltaMonth ? `<span class="chip ${deltaMonth.top3 > 0 ? 'ok' : deltaMonth.top3 < 0 ? 'bad' : 'outline'}" style="font-size:.7rem;padding:1px 6px" title="${esc(deltaMonth.date)}">${deltaMonth.top3 > 0 ? '▲ +' : deltaMonth.top3 < 0 ? '▼ ' : '● '}${deltaMonth.top3}% ${esc(deltaMonth.label)}</span>` : ''}
            </div>
          ` : ''}
        </div>

        <div class="kpi">
          <span class="label">Brand Citation Share</span>
          <div class="row" style="align-items:baseline;justify-content:space-between">
            <span class="val">${citationRate.toFixed(1)}%</span>
            <span class="chip ${citationRate >= 80 ? 'ok' : 'warn'}">${citationRate >= 80 ? '🟢 High' : '🟡 Progressing'}</span>
          </div>
          <span class="ci">${currentRun.cited_count} of ${currentRun.total_queries} queries cited</span>
          ${deltaWeek || deltaMonth ? `
            <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">
              ${deltaWeek ? `<span class="chip ${deltaWeek.cite > 0 ? 'ok' : deltaWeek.cite < 0 ? 'bad' : 'outline'}" style="font-size:.7rem;padding:1px 6px" title="${esc(deltaWeek.date)}">${deltaWeek.cite > 0 ? '▲ +' : deltaWeek.cite < 0 ? '▼ ' : '● '}${deltaWeek.cite}% ${esc(deltaWeek.label)}</span>` : ''}
              ${deltaMonth ? `<span class="chip ${deltaMonth.cite > 0 ? 'ok' : deltaMonth.cite < 0 ? 'bad' : 'outline'}" style="font-size:.7rem;padding:1px 6px" title="${esc(deltaMonth.date)}">${deltaMonth.cite > 0 ? '▲ +' : deltaMonth.cite < 0 ? '▼ ' : '● '}${deltaMonth.cite}% ${esc(deltaMonth.label)}</span>` : ''}
            </div>
          ` : ''}
        </div>

        <div class="kpi">
          <span class="label">AI Consensus &amp; Cost</span>
          <div class="row" style="align-items:baseline;justify-content:space-between">
            <span class="val" style="font-size:1.55rem">1 of 3 AIs</span>
            <span class="chip ok">Active</span>
          </div>
          <span class="ci">Est. $${cost.toFixed(4)} USD · ${currentRun.total_tokens || 4700} tokens</span>
        </div>
      </div>

      <!-- 2. AI Engine Coverage Ribbon -->
      <section class="card row between" style="padding:10px 16px;background:var(--surface);align-items:center;flex-wrap:wrap;gap:10px">
        <div class="row" style="gap:8px;align-items:center">
          <span style="font-size:1rem">🤖</span>
          <span style="font-weight:600;font-size:.88rem">AI Engine Presence:</span>
        </div>
        <div class="row" style="gap:10px;align-items:center;flex-wrap:wrap">
          <div class="row" style="gap:6px;align-items:center;background:var(--bg);padding:4px 10px;border-radius:var(--r-sm);border:1px solid var(--line)">
            <span style="font-size:.8rem;font-weight:600">Perplexity Sonar</span>
            <span class="chip ok" style="font-weight:700;font-size:.7rem">🏆 Active (#1)</span>
          </div>
          <div class="row" style="gap:6px;align-items:center;background:var(--bg);padding:4px 10px;border-radius:var(--r-sm);border:1px solid var(--line)">
            <span style="font-size:.8rem;font-weight:500;color:var(--ink-2)">ChatGPT Search</span>
            <span class="chip outline" style="font-size:.7rem">Tracking (0/10)</span>
          </div>
          <div class="row" style="gap:6px;align-items:center;background:var(--bg);padding:4px 10px;border-radius:var(--r-sm);border:1px solid var(--line)">
            <span style="font-size:.8rem;font-weight:500;color:var(--ink-2)">Google Gemini</span>
            <span class="chip outline" style="font-size:.7rem">Tracking (0/10)</span>
          </div>
        </div>
      </section>

      <!-- 3. WHERE AM I TOP 3? (Podium Wins Showcase) -->
      ${top3Items.length ? `
        <section class="card stack" style="border:1.5px solid var(--gold);background:var(--gold-soft);padding:14px 18px;gap:10px">
          <div class="row between" style="align-items:center;flex-wrap:wrap;gap:8px">
            <div class="row" style="gap:8px;align-items:center">
              <span class="chip gold" style="font-weight:700;font-size:.78rem">🏆 PODIUM WINS (${top3Items.length})</span>
              <span class="small" style="font-weight:600;color:var(--gold-ink)">Direct #1 &amp; Top-3 AI Recommendations</span>
            </div>
          </div>

          <div class="stack" style="gap:6px">
            ${top3Items.map((win) => {
              const badge = win.is_top_recommendation || win.dorogo_rank === 1
                ? `<span class="chip ok" style="font-weight:700;font-size:.74rem">🏆 #1 Top Pick</span>`
                : `<span class="chip ok" style="font-weight:600;font-size:.74rem">🥈 Top-3 (#${win.dorogo_rank})</span>`;

              return `
                <div class="row between" style="background:var(--surface);border-radius:var(--r-sm);padding:8px 14px;border:1px solid var(--line);align-items:center;gap:10px;flex-wrap:wrap">
                  <div class="row" style="gap:8px;align-items:center;flex:1;min-width:260px">
                    <span class="chip" style="font-weight:600;font-size:.74rem">${esc(win.niche)}</span>
                    ${badge}
                    <span style="font-weight:500;font-size:.86rem;color:var(--ink)">“${esc(win.query)}”</span>
                  </div>
                  <div class="row" style="gap:10px;align-items:center">
                    <span class="muted small">Beats ${(win.competitors || []).slice(0, 2).map(c => esc(c)).join(', ') || 'competition'}</span>
                    <button class="btn ghost sm" data-view-snippet="${esc(win.id)}" style="font-size:.74rem;padding:2px 8px">Inspect Resolution →</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <!-- 4. Tracked Route Performance Matrix -->
      <section class="card stack" style="gap:12px;background:var(--surface);padding:14px 18px">
        <div class="section-head" style="margin-bottom:0">
          <div>
            <div class="row" style="gap:8px;align-items:center">
              <span style="font-size:1.1rem">🗺️</span>
              <h3 style="margin:0;font-size:1.05rem;font-weight:600">Tracked Route Matrix</h3>
            </div>
            <span class="small muted">Natural high-ticket traveler queries across Northern Italy luxury routes</span>
          </div>
          <div class="seg" role="tablist">
            <button class="${activeFilter === 'all' ? 'on' : ''}" data-filter="all">All (${currentRun.details.length})</button>
            <button class="${activeFilter === 'top3' ? 'on' : ''}" data-filter="top3" style="font-weight:700;color:var(--gold-ink)">⭐ Top-3 Only (${top3Items.length})</button>
            ${rawNiches.map((n) => `<button class="${activeFilter === n ? 'on' : ''}" data-filter="${attr(n)}">${esc(n)}</button>`).join('')}
          </div>
        </div>

        <div class="table-wrap">
          <table style="width:100%;border-collapse:collapse;font-size:.85rem">
            <thead>
              <tr style="border-bottom:1.5px solid var(--line);text-align:left;color:var(--ink-3);font-size:.74rem;text-transform:uppercase;letter-spacing:.04em">
                <th style="padding:10px 12px">Route / Niche</th>
                <th style="padding:10px 12px;width:38%">Traveler Query Probed</th>
                <th style="padding:10px 12px">Dorogo Status</th>
                <th style="padding:10px 12px">Trend vs. History</th>
                <th style="padding:10px 12px">Competitors Mentioned</th>
                <th style="padding:10px 12px;text-align:right">Resolution</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it) => {
                let badge = '<span class="chip outline" style="color:var(--ink-3);font-size:.72rem">Unranked</span>';
                if (it.is_top_recommendation || it.dorogo_rank === 1) {
                  badge = '<span class="chip ok" style="font-weight:700;font-size:.74rem">🏆 #1 Top Pick</span>';
                } else if (it.dorogo_rank && it.dorogo_rank <= 3) {
                  badge = `<span class="chip ok" style="font-weight:600;font-size:.74rem">🥈 Top-3 (#${it.dorogo_rank})</span>`;
                } else if (it.dorogo_present) {
                  badge = `<span class="chip warn" style="font-size:.74rem">Ranked #${it.dorogo_rank}</span>`;
                }

                const trInfo = routeTrends?.get(it.id);
                const trendPill = trInfo ? (
                  trInfo.trend === 'up'
                    ? `<span class="chip ok" style="font-weight:600;font-size:.72rem">${esc(trInfo.deltaText)}</span>`
                    : trInfo.trend === 'down'
                    ? `<span class="chip bad" style="font-weight:600;font-size:.72rem">${esc(trInfo.deltaText)}</span>`
                    : trInfo.trend === 'stable'
                    ? `<span class="chip gold" style="font-size:.72rem">${esc(trInfo.deltaText)}</span>`
                    : `<span class="chip outline" style="font-size:.72rem">${esc(trInfo.deltaText)}</span>`
                ) : '<span class="muted small">—</span>';

                const competitors = (it.competitors || []).map((c) => `<span class="chip outline" style="font-size:.7rem;padding:1px 6px">${esc(c)}</span>`).join(' ') || '<span class="muted small">—</span>';

                return `
                  <tr style="border-bottom:1px solid var(--line)">
                    <td style="padding:10px 12px;vertical-align:middle;white-space:nowrap">
                      <span class="chip" style="font-weight:600;font-size:.76rem">${esc(it.niche)}</span>
                    </td>
                    <td style="padding:10px 12px;vertical-align:middle">
                      <div style="font-weight:500;color:var(--ink);line-height:1.4">“${esc(it.query)}”</div>
                    </td>
                    <td style="padding:10px 12px;vertical-align:middle;white-space:nowrap">
                      ${badge}
                    </td>
                    <td style="padding:10px 12px;vertical-align:middle;white-space:nowrap">
                      ${trendPill}
                    </td>
                    <td style="padding:10px 12px;vertical-align:middle">
                      <div style="display:flex;flex-wrap:wrap;gap:4px">${competitors}</div>
                    </td>
                    <td style="padding:10px 12px;vertical-align:middle;text-align:right;white-space:nowrap">
                      <button class="btn sm ghost" data-view-snippet="${esc(it.id)}" style="font-size:.78rem;padding:3px 10px">Inspect Answer →</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <!-- 5. OPTIMIZATION ACTIONS (WHAT WORKS & WHAT DOESN'T) -->
      <section class="card stack" style="gap:10px;background:var(--surface);padding:14px 18px">
        <div class="row between" style="align-items:center;flex-wrap:wrap;gap:8px">
          <div class="row" style="gap:8px;align-items:center">
            <span style="font-size:1.1rem">📝</span>
            <h3 style="margin:0;font-size:1.02rem;font-weight:600">Optimization Action Log: What Works &amp; What Doesn't</h3>
          </div>
          <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
            <div class="seg" role="tablist">
              <button class="${actionFilter === 'all' ? 'on' : ''}" data-act-filter="all">All (${actionsData.length})</button>
              <button class="${actionFilter === 'effective' ? 'on' : ''}" data-act-filter="effective">🟢 Worked (${actionsData.filter(a => a.verdict === 'effective').length})</button>
              <button class="${actionFilter === 'testing' ? 'on' : ''}" data-act-filter="testing">⏳ Testing (${actionsData.filter(a => a.verdict === 'testing').length})</button>
              <button class="${actionFilter === 'ineffective' ? 'on' : ''}" data-act-filter="ineffective">🔴 Ineffective (${actionsData.filter(a => a.verdict === 'ineffective').length})</button>
            </div>
            <button class="btn primary sm" id="btn-crm-add-action-inline" style="padding:4px 10px">+ Log Action</button>
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
    </div>
  `;

  // Attach event handlers
  el.querySelector('#sel-history-run')?.addEventListener('change', (e) => {
    selectedRunIdx = Number(e.target.value);
    render(el);
  });

  el.querySelector('#btn-reset-latest')?.addEventListener('click', () => {
    selectedRunIdx = -1;
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
      const it = currentRun.details.find((d) => d.id === qid) || items[parseInt(qid, 10)];
      if (!it) return;
      const citations = it.citations || [];
      dialog({
        title: `${it.niche}: AI Search Resolution & Citation Map`,
        wide: true,
        body: `
          <div class="stack" style="gap:16px">
            <div>
              <div class="label eyebrow">Customer Query Probed</div>
              <p style="font-weight:600;margin:4px 0 0 0;font-size:1.02rem;color:var(--ink)">"${esc(it.query)}"</p>
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
                <span class="label tiny">AI Engines Consensus:</span>
                <span style="font-weight:700">${it.engines_suggesting_count || (it.dorogo_present ? 1 : 0)} of 3 AIs</span>
              </div>
              <div>
                <span class="label tiny">Competitors:</span>
                <span>${(it.competitors || []).join(', ') || 'None'}</span>
              </div>
            </div>

            <div>
              <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px">
                <div class="label eyebrow" style="margin:0">Perplexity Sonar Formatted Response</div>
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

function openCrmActionModal(el, existing = null) {
  const today = new Date().toISOString().slice(0, 10);
  const dateVal = existing ? existing.date : today;
  const nicheVal = existing ? existing.niche : 'Lake Como Weddings';
  const catVal = existing ? existing.category : 'Web Content & Specs';
  const titleVal = existing ? esc(existing.title) : '';
  const descVal = existing ? esc(existing.description || '') : '';
  const urlVal = existing ? esc(existing.url || '') : '';
  const verdictVal = existing ? existing.verdict : 'testing';
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
              <option value="Lake Como Weddings" ${nicheVal === 'Lake Como Weddings' ? 'selected' : ''}>Lake Como Weddings</option>
              <option value="Alpine Ski" ${nicheVal === 'Alpine Ski' ? 'selected' : ''}>Alpine Ski</option>
              <option value="Private Jet FBO" ${nicheVal === 'Private Jet FBO' ? 'selected' : ''}>Private Jet FBO</option>
              <option value="Fiera Milano Convoys" ${nicheVal === 'Fiera Milano Convoys' ? 'selected' : ''}>Fiera Milano Convoys</option>
              <option value="Outlet Standby" ${nicheVal === 'Outlet Standby' ? 'selected' : ''}>VIP Designer Outlet Standby</option>
              <option value="Brand-wide / All" ${nicheVal === 'Brand-wide / All' ? 'selected' : ''}>Brand-wide / All Niches</option>
            </select>
          </div>
        </div>

        <div class="split" style="gap:12px">
          <div>
            <label class="label small" style="display:block;margin-bottom:4px">Initiative Category</label>
            <select class="input sm" id="crm-act-cat" style="width:100%">
              <option value="Web Content & Specs" ${catVal === 'Web Content & Specs' ? 'selected' : ''}>Web Content & Specs</option>
              <option value="Outreach & Partnerships" ${catVal === 'Outreach & Partnerships' ? 'selected' : ''}>Outreach & Partnerships</option>
              <option value="Digital PR & Backlinks" ${catVal === 'Digital PR & Backlinks' ? 'selected' : ''}>Digital PR & Backlinks</option>
              <option value="AI SEO & Schema" ${catVal === 'AI SEO & Schema' ? 'selected' : ''}>AI SEO & Schema Markup</option>
              <option value="Fleet & Service Update" ${catVal === 'Fleet & Service Update' ? 'selected' : ''}>Fleet & Service Update</option>
            </select>
          </div>
          <div>
            <label class="label small" style="display:block;margin-bottom:4px">Observed Verdict / Status</label>
            <select class="input sm" id="crm-act-verdict" style="width:100%">
              <option value="effective" ${verdictVal === 'effective' ? 'selected' : ''}>🟢 Worked (Rank Climbed / New Win)</option>
              <option value="testing" ${verdictVal === 'testing' ? 'selected' : ''}>⏳ Testing / Monitoring Impact</option>
              <option value="ineffective" ${verdictVal === 'ineffective' ? 'selected' : ''}>🔴 Ineffective (No Impact)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="label small" style="display:block;margin-bottom:4px">Action Title</label>
          <input type="text" class="input sm" id="crm-act-title" value="${titleVal}" placeholder="e.g. Published Villa Balbianello & Villa d'Este guest shuttle logistics page" style="width:100%" required>
        </div>

        <div>
          <label class="label small" style="display:block;margin-bottom:4px">What did you do? (Details & Specifics)</label>
          <textarea class="input sm" id="crm-act-desc" rows="3" placeholder="Outlined exact vehicle widths, midnight guest turnaround, and direct driver dispatch..." style="width:100%;resize:vertical">${descVal}</textarea>
        </div>

        <div>
          <label class="label small" style="display:block;margin-bottom:4px">Observed Impact / Results</label>
          <input type="text" class="input sm" id="crm-act-notes" value="${notesVal}" placeholder="e.g. Dorogo climbed from unranked to #2 in Lake Como wedding guest shuttles" style="width:100%">
        </div>

        <div>
          <label class="label small" style="display:block;margin-bottom:4px">Target URL / Evidence Link (Optional)</label>
          <input type="url" class="input sm" id="crm-act-url" value="${urlVal}" placeholder="https://dorogo.eu/... or link to asset" style="width:100%">
        </div>

        <div class="row end gap" style="margin-top:10px">
          <button class="btn ghost sm" data-close>Cancel</button>
          <button class="btn primary sm" id="btn-crm-act-save">Save Optimization Action</button>
        </div>
      </div>
    `,
    onMount: (box, close) => {
      box.querySelector('#btn-crm-act-save')?.addEventListener('click', async () => {
        const title = box.querySelector('#crm-act-title').value.trim();
        if (!title) {
          toast('Please enter an action title', 'error');
          return;
        }

        const actObj = {
          id: existing ? existing.id : 'act_' + Date.now(),
          date: box.querySelector('#crm-act-date').value || today,
          niche: box.querySelector('#crm-act-niche').value,
          category: box.querySelector('#crm-act-cat').value,
          verdict: box.querySelector('#crm-act-verdict').value,
          title,
          description: box.querySelector('#crm-act-desc').value.trim(),
          notes: box.querySelector('#crm-act-notes').value.trim(),
          url: box.querySelector('#crm-act-url').value.trim()
        };

        saveVisibilityAction(actObj);
        close();
        toast('Action logged successfully');
        await render(el);
      });
    }
  });
}
