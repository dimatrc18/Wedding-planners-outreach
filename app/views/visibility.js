// AI Search Visibility & Competitive Intelligence: monitors Dorogo's live citations and
// ranking across Perplexity, ChatGPT Search, and Claude against Milan NCC competitors.

import { esc, attr, icon, toast, dialog } from '../ui.js';

let cachedHistory = null;
let activeNiche = 'all';
let selectedRunIdx = -1;

export async function loadVisibilityHistory() {
  if (cachedHistory && cachedHistory.length) return cachedHistory;
  const paths = [
    'data/visibility_history.json',
    'data/visibility/visibility_history.json',
  ];
  for (const p of paths) {
    try {
      const res = await fetch(p);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          cachedHistory = json;
          return json;
        }
      }
    } catch (_) {}
  }
  return cachedHistory || [];
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

  const niches = ['all', ...new Set(currentRun.details.map((d) => d.niche))];
  const items = currentRun.details.filter((d) => activeNiche === 'all' || d.niche === activeNiche);

  el.innerHTML = `
    <div class="page-head">
      <div>
        <div class="label eyebrow">
          ${auditDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · Model: ${esc(currentRun.model || 'perplexity/sonar')}
        </div>
        <h1>AI Search Visibility & Competitive Intelligence</h1>
      </div>
      <div class="row">
        <button class="btn" id="btn-live-audit">${icon('radar', 16)} Run Live Audit</button>
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

      <!-- Historical Trend (if multiple runs) -->
      ${history.length > 1 ? `
        <section class="card stack" style="gap:10px">
          <div class="section-head">
            <h2>Audit History <span class="count">${history.length} runs</span></h2>
            <div class="row">
              <span class="small muted">Select past run:</span>
              <select id="run-select" style="font-size:.85rem;padding:4px 8px;border-radius:var(--r-sm);border:1px solid var(--line)">
                ${history.map((h, i) => `<option value="${i}" ${i === runIdx ? 'selected' : ''}>Run #${i + 1}: ${new Date(h.timestamp).toLocaleDateString()} (${h.top1_rate_pct ?? 0}% #1)</option>`).join('')}
              </select>
            </div>
          </div>
        </section>
      ` : ''}

      <!-- Niche Filter Tabs -->
      <section class="section">
        <div class="section-head">
          <h2>Battleground Niche Breakdown</h2>
          <div class="seg" role="tablist">
            ${niches.map((n) => `<button class="${activeNiche === n ? 'on' : ''}" data-niche="${attr(n)}">${n === 'all' ? 'All Niches (10)' : esc(n)}</button>`).join('')}
          </div>
        </div>

        <!-- Table of probed queries -->
        <div class="card flush list">
          <div class="table-wrap">
            <table style="width:100%;border-collapse:collapse;font-size:.85rem">
              <thead>
                <tr style="border-bottom:1.5px solid var(--line);text-align:left;color:var(--ink-3);font-size:.75rem;text-transform:uppercase;letter-spacing:.05em">
                  <th style="padding:12px 14px">Niche</th>
                  <th style="padding:12px 14px;width:38%">Traveler Query Probed</th>
                  <th style="padding:12px 14px">Dorogo Position</th>
                  <th style="padding:12px 14px">Top Competitors Cited</th>
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

      <!-- Competitor Intelligence Summary Card -->
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
              🏆 <b>#1 Top Recommendation</b> in <span class="chip gold">Linate Prime & Malpensa Prime FBO</span> queries, with the AI specifically praising Dorogo's tarmac coordination and luxury fleet over legacy competitors.
            </div>
          </div>
        </div>
      </section>
    </div>
  `;

  // Attach event handlers
  el.querySelectorAll('[data-niche]').forEach((b) => {
    b.addEventListener('click', (e) => {
      activeNiche = e.currentTarget.dataset.niche;
      render(el);
    });
  });

  el.querySelector('#run-select')?.addEventListener('change', (e) => {
    selectedRunIdx = parseInt(e.target.value, 10);
    render(el);
  });

  el.querySelectorAll('[data-view-snippet]').forEach((b) => {
    b.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.viewSnippet, 10);
      const it = items[idx];
      if (!it) return;
      dialog({
        title: `${it.niche}: AI Audit Details`,
        wide: true,
        body: `
          <div class="stack" style="gap:14px">
            <div>
              <div class="label eyebrow">Query</div>
              <p style="font-weight:600;margin:4px 0 0 0">${esc(it.query)}</p>
            </div>
            <div class="row" style="gap:16px">
              <div>
                <span class="label tiny">Dorogo Rank:</span>
                <span style="font-weight:700">${it.dorogo_rank ? `#${it.dorogo_rank}` : 'Unranked'}</span>
              </div>
              <div>
                <span class="label tiny">Top Recommendation:</span>
                <span style="font-weight:700">${it.is_top_recommendation ? 'Yes 🏆' : 'No'}</span>
              </div>
              <div>
                <span class="label tiny">Competitors:</span>
                <span>${(it.competitors || []).join(', ') || 'None'}</span>
              </div>
            </div>
            <div>
              <div class="label eyebrow">AI Model Response (Perplexity Sonar)</div>
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
    dialog({
      title: 'Run Live AI Visibility Audit',
      body: `
        <div class="stack" style="gap:14px">
          <p class="small muted">
            The automated monitor queries the OpenRouter Perplexity Sonar API across 10 high-intent traveler search queries across Ski, FBO, Outlets, and Lake Como.
          </p>
          <div class="card" style="background:var(--bg);padding:12px;font-family:monospace;font-size:.82rem">
            python3 /Users/User/Desktop/Dorogo/tools/visibility/weekly_ai_tracker.py
          </div>
          <div class="small" style="color:var(--ink-2)">
            Execution time is ~20 seconds. Results are automatically recorded to <code>tools/visibility/visibility_history.json</code> and synced to this dashboard.
          </div>
          <div class="row end" style="margin-top:10px">
            <button class="btn ghost" data-close>Close</button>
            <button class="btn primary" id="btn-refresh-history">Reload Latest Data</button>
          </div>
        </div>
      `,
      onMount: (box, close) => {
        box.querySelector('#btn-refresh-history')?.addEventListener('click', async () => {
          cachedHistory = null;
          await render(el);
          toast('Data reloaded');
          close();
        });
      },
    });
  });
}
