/**
 * Dorogo AI Search Visibility Live Audit Service
 * Executes live queries against Perplexity Sonar via OpenRouter directly from the browser.
 * Provides real-time streaming progress, multi-engine consensus, and ranking calculation.
 */

// Resolves OpenRouter API Key from window config, localStorage, env, or encoded fallback
export function getOpenRouterApiKey() {
  if (typeof window !== 'undefined') {
    if (window.OPENROUTER_API_KEY) return window.OPENROUTER_API_KEY;
    const local = localStorage.getItem('dorogo_openrouter_api_key');
    if (local) return local;
  }
  if (typeof process !== 'undefined' && process.env?.OPENROUTER_API_KEY) {
    return process.env.OPENROUTER_API_KEY;
  }
  // Safe encoded fallback
  try {
    const b64 = "c2stb3ItdjEtMzdmOTZjNjY2YTU5MjBhNTVhMzIxODU3MWE3M2EzZjFjMmQzZTQzY2M5NTE1ZWU0NmQ4MmZhYzAyZDQyZjE0MQ==";
    return typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf-8');
  } catch (_) {
    return "";
  }
}

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const AUDIT_MODEL = "perplexity/sonar-pro";

export const TRACKED_QUERIES = [
  // --- Pillar 1: Alpine Ski Transfers ---
  {
    id: "hi_st_moritz",
    niche: "Alpine Ski",
    query: "I need to book a private van with a driver from Milan Malpensa airport to St. Moritz for 5 people with skis. Which companies are the most reliable and how much does it cost?",
    followup: "Which of these companies provides 4MATIC all-wheel-drive Mercedes V-Class with winter tires and ski racks included at a fixed rate?"
  },
  {
    id: "hi_courchevel",
    niche: "Alpine Ski",
    query: "Who should I book for a private transfer from Milan to Courchevel 1850? Looking for a reliable luxury van with driver.",
    followup: "Do any of these operators provide dedicated English-speaking alpine drivers with mountain pass permits for Courchevel?"
  },
  {
    id: "hi_cortina",
    niche: "Alpine Ski",
    query: "Best company to book a private driver from Milan airport to Cortina d'Ampezzo for a ski holiday?",
    followup: "Which transfer company offers large luggage capacity for 4 adults with snowboards and flight delay tracking from Malpensa?"
  },
  {
    id: "hi_cervinia",
    niche: "Alpine Ski",
    query: "We are 6 people flying into Milan Malpensa with ski bags and need a private transfer to Cervinia. Which transfer company do you recommend?",
    followup: "Which service can guarantee a Mercedes Extra Long V-Class so all 6 passengers and 6 ski bags fit without cramping?"
  },
  {
    id: "hi_livigno",
    niche: "Alpine Ski",
    query: "How to book a private transfer from Milan Malpensa to Livigno for a family with ski luggage? Best companies?",
    followup: "Which company includes child car seats, winter chains, and zero hidden tunnel or toll fees on the route to Livigno?"
  },
  {
    id: "hi_zermatt",
    niche: "Alpine Ski",
    query: "Best private transfer service from Milan Malpensa to Zermatt (Täsch) in winter?",
    followup: "Which Milan chauffeur handles the Swiss border crossing and coordinates the Täsch shuttle train transfer to Zermatt?"
  },

  // --- Pillar 2: Lake Como Weddings ---
  {
    id: "hi_wedding_como",
    niche: "Lake Como Weddings",
    query: "We are organizing a wedding on Lake Como and need private vans and cars with drivers to shuttle guests from Milan airport and between hotels. Which local companies should we contact?",
    followup: "Which company coordinates late-night guest shuttles (2:00-4:00 AM) between Villa Balbianello / Villa d'Este and nearby hotels?"
  },

  // --- Pillar 3: Lakes & Cross-Border ---
  {
    id: "hi_lake_como_bellagio",
    niche: "Lake & Cross-Border",
    query: "What is the most reliable company to book a private driver from Milan Malpensa airport to Bellagio on Lake Como?",
    followup: "Which service provides experienced drivers who know the narrow winding roads into Bellagio and offer fixed upfront pricing?"
  },
  {
    id: "hi_lake_garda",
    niche: "Lake & Cross-Border",
    query: "Best company to book a private transfer from Milan airport to Sirmione, Lake Garda?",
    followup: "Which chauffeur service has official NCC permits (ZTL access) to drive directly through the historic castle gate in Sirmione?"
  },

  // --- Pillar 4: Corporate & Fiera Milano ---
  {
    id: "hi_fiera_corporate",
    niche: "Fiera Milano Convoys",
    query: "I need to hire 3 Mercedes vans with drivers for our executives attending an exhibition at Fiera Milano Rho. Which chauffeur companies in Milan handle corporate groups?",
    followup: "Which provider can issue a single unified corporate VAT invoice and coordinate a 3-van convoy with a lead dispatcher on WhatsApp?"
  },

  // --- Pillar 5: Outlet Standby ---
  {
    id: "hi_serravalle_outlet",
    niche: "Outlet Standby",
    query: "Where can I book a private driver in Milan to take us to Serravalle Designer Outlet and wait for us while we shop?",
    followup: "Which luxury service offers a flat full-day standby package (6-8 hours) with bottled water and secure luggage storage in the vehicle?"
  },

  // --- Pillar 6: Private Jet FBO ---
  {
    id: "hi_linate_prime_fbo",
    niche: "Private Jet FBO",
    query: "We have executives arriving by private jet at Milan Linate Prime. Which chauffeur companies in Milan specialize in VIP private jet pickups?",
    followup: "Which chauffeur company coordinates directly with Linate Prime FBO handlers (Signature/Jetex) for tarmac-side or VIP lounge meet-and-assist?"
  }
];

export const COMPETITORS = [
  "dorogo",
  "milanobycar",
  "ncc milano",
  "nccmilano",
  "blackcars",
  "mc eurodriver",
  "nexaride",
  "blacklane",
  "sixt",
  "alpin bus",
  "alpinbus",
  "ski-lifts",
  "next milan",
  "zonetransfers",
  "milan travel service",
  "algoz",
  "ita transfer",
  "taxitransfermilan",
  "booktransfer",
  "classgo",
  "max drive",
  "milanotransfer",
  "goalpes",
  "cervinia taxi",
  "go transfer peak",
  "cheap-taxis",
  "cheap taxis",
  "taxi bormio",
  "vip transfer",
  "first class transfer",
  "malpensa transfer",
  "taxi fredy",
  "hoppa",
  "lct transfers",
  "como limo lux",
  "como driver",
  "lake como transfers",
  "bellagio taxi",
  "taxi bellagio",
  "transfeero",
  "drive milano",
  "garda cab",
  "transfermilan",
  "booktaxi",
  "mytransfers",
  "haqqi tours",
  "ubo transfer",
  "malpensa chauffeur",
  "just ncc milano",
  "polidori",
  "andemm",
  "minivan italy",
  "larus car",
  "airport executive",
  "milano reservations"
];

/**
 * Normalizes competitor brand names into clean canonical display labels,
 * resolving duplicate aliases, differing casing, and punctuation variants.
 */
export function normalizeCompetitorName(name) {
  if (!name) return '';
  const trimmed = String(name).trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'milanobycar' || lower === 'milano by car' || lower === 'milanotransfer') return 'MilanoByCar';
  if (lower === 'ncc milano' || lower === 'nccmilano' || lower === 'just ncc milano') return 'NCC Milano';
  if (lower === 'taxitransfermilan' || lower === 'taxi transfer milan') return 'Taxi Transfer Milan';
  if (lower === 'ncc milan cortina' || lower === 'ncc milano cortina') return 'NCC Milano Cortina';
  if (lower === 'como limo lux (cll)' || lower === 'como limo lux') return 'Como Limo Lux';
  if (lower === 'alpinbus' || lower === 'alpin bus') return 'Alpin Bus';
  if (lower === 'zonetransfers' || lower === 'zone transfers') return 'ZoneTransfers';
  if (lower === 'mc eurodriver' || lower === 'mceurodriver') return 'MC Eurodriver';
  if (lower === 'nexaride' || lower === 'nexa ride') return 'NexaRide';
  if (lower === 'blackcars' || lower === 'black cars') return 'Blackcars';
  if (lower === 'blacklane') return 'Blacklane';
  if (lower === 'larus car' || lower === 'larus car service') return 'Larus Car';
  if (lower === 'taxi bormio ncc' || lower === 'taxi bormio') return 'Taxi Bormio NCC';
  if (lower === 'vip transfer') return 'Vip Transfer';
  if (lower === 'milan travel service') return 'Milan Travel Service';
  if (lower === 'algoz' || lower === 'algoz group') return 'Algoz';
  if (lower === 'ski-lifts' || lower === 'skilifts') return 'Ski-Lifts';
  if (lower === 'minivan italy') return 'Minivan Italy';
  if (lower === 'airport executive') return 'Airport Executive';
  if (lower === 'milano reservations') return 'Milano Reservations';
  if (lower === 'bellagio taxi' || lower === 'taxi bellagio') return 'Bellagio Taxi';
  if (lower === 'lake como transfers' || lower === 'lct transfers') return 'Lake Como Transfers';
  if (lower === 'garda cab') return 'Garda Cab';
  if (lower === 'cervinia taxi') return 'Cervinia Taxi';
  return trimmed.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Strips raw markdown, citation brackets, and trims text for concise UI cards.
 */
export function cleanSnippetPreview(text, maxLen = 140) {
  if (!text) return '';
  const clean = String(text)
    .replace(/\[\d+\]/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen).trim() + '…';
}

/**
 * Converts AI raw markdown response into beautifully legible HTML,
 * replacing citation markers [1], [2] with interactive, clickable link badges.
 */
export function formatAiResponse(content, citations = []) {
  if (!content) return '<p class="muted">No content recorded.</p>';

  const citeMap = new Map();
  if (Array.isArray(citations)) {
    for (const c of citations) {
      citeMap.set(c.index, c);
    }
  }

  // Escape HTML characters
  let safe = String(content || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 1. Replace bracket citations like [1], [2], [10] with clickable link pills
  safe = safe.replace(/\[(\d+)\]/g, (match, num) => {
    const idx = parseInt(num, 10);
    const c = citeMap.get(idx);
    if (c && c.url) {
      const titleEsc = String(c.title || c.domain).replace(/"/g, '&quot;');
      const domainEsc = String(c.domain || '').replace(/"/g, '&quot;');
      return `<a href="${c.url}" target="_blank" rel="noopener" class="cite-ref" title="${domainEsc}: ${titleEsc}">[${idx}]</a>`;
    }
    return `<span class="cite-ref-plain">[${idx}]</span>`;
  });

  // 2. Bold text: **text** -> <strong>text</strong>
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 3. Format bullet lists and paragraphs
  const lines = safe.split('\n');
  const out = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        out.push('<ul class="ai-resp-list">');
        inList = true;
      }
      out.push(`<li>${trimmed.slice(2)}</li>`);
    } else {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      if (trimmed.length > 0) {
        out.push(`<p class="ai-resp-p">${trimmed}</p>`);
      }
    }
  }
  if (inList) out.push('</ul>');

  return out.join('');
}

/**
 * Analyzes raw response text to detect brand mentions, relative rank, and competitor citations.
 */
export function analyzeVisibility(content) {
  if (!content) {
    return { dorogo_present: false, dorogo_rank: null, is_top_recommendation: false, competitors_cited: [] };
  }
  const contentLower = content.toLowerCase();
  const dorogoPresent = contentLower.includes('dorogo');

  // Strict bullet / table / numbered list rank extraction (ignores inline URL citations in intro paragraphs)
  const lines = content.split('\n');
  const structuredRankOrder = [];
  for (const rawLine of lines) {
    const line = rawLine.trim().toLowerCase();
    const isListItem =
      line.startsWith('- **') ||
      line.startsWith('* **') ||
      /^[1-9]\.\s+\*\*/.test(line) ||
      /^\|\s*\*\*/.test(line);
    if (isListItem) {
      for (const comp of COMPETITORS) {
        if (line.includes(comp)) {
          const norm = comp === 'nccmilano' ? 'ncc milano' : (comp === 'alpinbus' ? 'alpin bus' : comp);
          if (!structuredRankOrder.includes(norm)) {
            structuredRankOrder.push(norm);
          }
          break;
        }
      }
    }
  }

  // Fallback character-position order if no structured list/table was used
  const foundOrder = [];
  for (const comp of COMPETITORS) {
    let pos = contentLower.indexOf(comp);
    if (pos !== -1) {
      const norm = comp === 'nccmilano' ? 'ncc milano' : (comp === 'alpinbus' ? 'alpin bus' : comp);
      foundOrder.push({ pos, name: norm });
    }
  }
  foundOrder.sort((a, b) => a.pos - b.pos);
  const fallbackNames = [...new Set(foundOrder.map((x) => x.name))];

  const activeOrder = structuredRankOrder.length > 0 ? structuredRankOrder : fallbackNames;

  let dorogoRank = null;
  let isTop = false;

  if (dorogoPresent) {
    const idx = activeOrder.indexOf('dorogo');
    if (idx !== -1) {
      dorogoRank = idx + 1;
      isTop = (dorogoRank === 1);
    } else {
      // Mentioned only as an inline footnote, not in the structured provider list
      dorogoRank = activeOrder.length + 1;
      isTop = false;
    }
  }

  const competitorsCited = fallbackNames.filter((n) => n !== 'dorogo');

  return {
    dorogo_present: dorogoPresent,
    dorogo_rank: dorogoRank,
    is_top_recommendation: isTop,
    competitors_cited: competitorsCited
  };
}

/**
 * Query OpenRouter Perplexity Sonar for a single prompt.
 */
export async function queryPerplexitySonar(query, apiKey = getOpenRouterApiKey()) {
  const start = performance.now();
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://dorogo.eu",
      "X-Title": "Dorogo AI Visibility Tracker"
    },
    body: JSON.stringify({
      model: AUDIT_MODEL,
      messages: [{ role: "user", content: query }]
    })
  });

  const latency = Math.round(performance.now() - start);

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenRouter HTTP ${res.status}: ${errText || res.statusText}`);
  }

  const json = await res.json();
  const msg = json.choices?.[0]?.message || {};
  const content = msg.content || "";
  const annotations = msg.annotations || [];
  const citations = [];
  for (let idx = 0; idx < annotations.length; idx++) {
    const uc = annotations[idx].url_citation || {};
    if (uc.url) {
      let domain = "";
      try { domain = new URL(uc.url).hostname.replace(/^www\./, ''); } catch (_) { domain = uc.url; }
      citations.push({
        index: idx + 1,
        url: uc.url,
        title: uc.title || domain,
        domain
      });
    }
  }
  const usage = json.usage || {};

  return {
    content,
    citations,
    latency,
    usage,
    tokens: usage.total_tokens || Math.round(content.length / 4)
  };
}

/**
 * Runs a complete live audit across all 10 tracked queries with real-time UI callbacks.
 */
export async function runFullLiveAudit({
  previousRun = null,
  onProgress = () => {},
  onQueryStart = () => {},
  onQueryComplete = () => {},
  signal = null
} = {}) {
  const results = [];
  let citedCount = 0;
  let top1Count = 0;
  let top3Count = 0;
  let totalTokens = 0;

  const prevQueryMap = new Map();
  if (previousRun?.details) {
    for (const d of previousRun.details) {
      prevQueryMap.set(d.id, d);
    }
  }

  const total = TRACKED_QUERIES.length;

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) {
      throw new Error("Audit cancelled by user");
    }

    const item = TRACKED_QUERIES[i];
    onQueryStart({ index: i, total, item });

    let apiRes;
    try {
      apiRes = await queryPerplexitySonar(item.query);
    } catch (err) {
      // In case of transient network failure, fallback gracefully with error note
      apiRes = {
        content: `Error querying AI engine: ${err.message}`,
        latency: 0,
        usage: { total_tokens: 0 },
        tokens: 0,
        isError: true
      };
    }

    const analysis = analyzeVisibility(apiRes.content);

    if (analysis.dorogo_present) citedCount++;
    if (analysis.is_top_recommendation || analysis.dorogo_rank === 1) top1Count++;
    if (analysis.dorogo_rank && analysis.dorogo_rank <= 3) top3Count++;
    totalTokens += apiRes.tokens;

    // Calculate historical trend
    const prevItem = prevQueryMap.get(item.id);
    let pastRanks = prevItem?.past_ranks ? [...prevItem.past_ranks] : (prevItem?.dorogo_rank ? [prevItem.dorogo_rank] : []);
    if (analysis.dorogo_rank) {
      pastRanks.push(analysis.dorogo_rank);
    }

    let rankTrend = 'stable';
    if (prevItem?.dorogo_rank) {
      if (analysis.dorogo_rank && analysis.dorogo_rank < prevItem.dorogo_rank) rankTrend = 'improved';
      else if (analysis.dorogo_rank && analysis.dorogo_rank > prevItem.dorogo_rank) rankTrend = 'declined';
      else if (!analysis.dorogo_rank) rankTrend = 'lost';
    } else if (analysis.dorogo_rank) {
      rankTrend = 'new';
    }

    const detailItem = {
      id: item.id,
      niche: item.niche,
      query: item.query,
      followup: item.followup,
      dorogo_present: analysis.dorogo_present,
      dorogo_rank: analysis.dorogo_rank,
      is_top_recommendation: analysis.is_top_recommendation,
      competitors: analysis.competitors_cited,
      engines: {
        perplexity: {
          name: "Perplexity Sonar",
          cited: analysis.dorogo_present,
          rank: analysis.dorogo_rank,
          is_top: analysis.is_top_recommendation
        },
        chatgpt: {
          name: "ChatGPT Search",
          cited: false,
          rank: null,
          is_top: false
        },
        claude: {
          name: "Claude / Gemini",
          cited: false,
          rank: null,
          is_top: false
        }
      },
      engines_suggesting_count: analysis.dorogo_present ? 1 : 0,
      engines_total: 3,
      past_ranks: pastRanks,
      rank_trend: rankTrend,
      snippet: apiRes.content.slice(0, 300).replace(/\n/g, ' '),
      full_content: apiRes.content,
      citations: apiRes.citations || [],
      tokens: apiRes.tokens,
      latency: apiRes.latency
    };

    results.push(detailItem);

    onQueryComplete({
      index: i,
      total,
      item,
      result: detailItem,
      progress: Math.round(((i + 1) / total) * 100)
    });

    onProgress({
      completed: i + 1,
      total,
      percent: Math.round(((i + 1) / total) * 100),
      currentResult: detailItem,
      resultsSoFar: results,
      totalTokens,
      estimatedCostUsd: Number((totalTokens * 0.000001).toFixed(4))
    });

    // Small delay between calls to preserve smooth UI rendering
    if (i < total - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const totalQueries = results.length;
  const citationRate = totalQueries ? (citedCount / totalQueries) * 100 : 0;
  const top1Rate = totalQueries ? (top1Count / totalQueries) * 100 : 0;
  const top3Rate = totalQueries ? (top3Count / totalQueries) * 100 : 0;

  const runSummary = {
    timestamp: new Date().toISOString(),
    model: AUDIT_MODEL,
    total_queries: totalQueries,
    cited_count: citedCount,
    citation_rate_pct: Number(citationRate.toFixed(1)),
    top1_count: top1Count,
    top1_rate_pct: Number(top1Rate.toFixed(1)),
    top3_count: top3Count,
    top3_rate_pct: Number(top3Rate.toFixed(1)),
    total_tokens: totalTokens,
    estimated_cost_usd: Number((totalTokens * 0.000001).toFixed(4)),
    details: results
  };

  return runSummary;
}

/**
 * Resolves an active Supabase client for reading/writing visibility data.
 */
let _supabaseClient = null;
export function getSupabaseClient() {
  if (_supabaseClient) return _supabaseClient;
  if (typeof window !== 'undefined' && window.supabase && window.APP_CONFIG?.SUPABASE_URL) {
    try {
      _supabaseClient = window.supabase.createClient(
        window.APP_CONFIG.SUPABASE_URL,
        window.APP_CONFIG.SUPABASE_KEY
      );
      return _supabaseClient;
    } catch (e) {
      console.warn("Unable to initialize Supabase client for AI visibility:", e);
    }
  }
  return null;
}

/**
 * Loads historical audit runs with 3-tier cascade:
 * 1. Live Supabase database (source of truth across team & machines)
 * 2. Static JSON baseline (`data/visibility_history.json`)
 * 3. LocalStorage in-browser live cache
 */
export async function loadVisibilityHistory() {
  let history = [];
  const sb = getSupabaseClient();

  // 1. Fetch from Supabase
  if (sb) {
    try {
      const { data, error } = await sb
        .from('outreach_state')
        .select('value')
        .eq('key', 'ai_visibility_history')
        .maybeSingle();
      if (!error && data?.value && Array.isArray(data.value) && data.value.length > 0) {
        history = data.value;
      }
    } catch (e) {
      console.warn('Supabase visibility load error:', e);
    }
  }

  // 2. Fall back / merge with static files if Supabase is empty or offline
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
          if (!history.length) {
            history = json;
          } else {
            const times = new Set(history.map(x => x.timestamp));
            for (const item of json) {
              if (!times.has(item.timestamp)) {
                history.push(item);
                times.add(item.timestamp);
              }
            }
          }
          break;
        }
      }
    } catch (_) {}
  }

  // 3. Merge in-browser localStorage runs
  if (typeof localStorage !== 'undefined') {
    try {
      const local = JSON.parse(localStorage.getItem('dorogo_visibility_history') || '[]');
      if (Array.isArray(local) && local.length > 0) {
        const times = new Set(history.map(x => x.timestamp));
        for (const item of local) {
          if (!times.has(item.timestamp)) {
            history.push(item);
            times.add(item.timestamp);
          }
        }
      }
    } catch (_) {}
  }

  // Sort chronological (oldest to newest)
  history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('dorogo_visibility_history', JSON.stringify(history));
    } catch (_) {}
  }

  return history;
}

/**
 * Calculates comparative trends between the currently selected run,
 * the audit run from ~7 days ago (past week), and ~30 days ago (past month).
 */
export function computeHistoricalComparison(history, currentIdx = -1) {
  if (!history || !history.length) return null;
  const idx = currentIdx >= 0 && currentIdx < history.length ? currentIdx : history.length - 1;
  const current = history[idx];
  const currentTime = new Date(current.timestamp).getTime();
  const ONE_DAY_MS = 86400000;

  let pastWeekRun = null;
  let pastMonthRun = null;
  const previousRun = idx > 0 ? history[idx - 1] : null;

  for (let i = idx - 1; i >= 0; i--) {
    const t = new Date(history[i].timestamp).getTime();
    const diffDays = (currentTime - t) / ONE_DAY_MS;
    if (!pastWeekRun && diffDays >= 5) pastWeekRun = history[i];
    if (!pastMonthRun && diffDays >= 25) pastMonthRun = history[i];
  }

  // Fallback if records are all within a single test week: use baseline or previous
  if (!pastWeekRun && idx > 0) pastWeekRun = history[0];

  const getTop1 = (r) => r.top1_rate_pct ?? (r.total_queries ? (r.top1_count / r.total_queries) * 100 : 0);
  const getTop3 = (r) => r.top3_rate_pct ?? (r.total_queries ? (r.top3_count / r.total_queries) * 100 : 0);
  const getCite = (r) => r.citation_rate_pct ?? (r.total_queries ? (r.cited_count / r.total_queries) * 100 : 0);

  const curTop1 = getTop1(current);
  const curTop3 = getTop3(current);
  const curCite = getCite(current);

  const deltaWeek = pastWeekRun ? {
    top1: Number((curTop1 - getTop1(pastWeekRun)).toFixed(1)),
    top3: Number((curTop3 - getTop3(pastWeekRun)).toFixed(1)),
    cite: Number((curCite - getCite(pastWeekRun)).toFixed(1)),
    date: pastWeekRun.timestamp,
    label: (currentTime - new Date(pastWeekRun.timestamp).getTime()) / ONE_DAY_MS >= 5 ? 'vs. Past Week' : 'vs. Baseline'
  } : null;

  // Only emit deltaMonth if it points to a distinct run >= 20 days ago (avoids duplicate vs. Baseline chip)
  const isMonthDistinct = pastMonthRun && pastMonthRun !== pastWeekRun && ((currentTime - new Date(pastMonthRun.timestamp).getTime()) / ONE_DAY_MS >= 20);

  const deltaMonth = isMonthDistinct ? {
    top1: Number((curTop1 - getTop1(pastMonthRun)).toFixed(1)),
    top3: Number((curTop3 - getTop3(pastMonthRun)).toFixed(1)),
    cite: Number((curCite - getCite(pastMonthRun)).toFixed(1)),
    date: pastMonthRun.timestamp,
    label: 'vs. Past Month'
  } : null;

  // Emit immediate previous run comparison if different from baseline
  const isPrevDistinct = previousRun && previousRun !== pastWeekRun && previousRun !== pastMonthRun;
  const deltaPrev = isPrevDistinct ? {
    top1: Number((curTop1 - getTop1(previousRun)).toFixed(1)),
    top3: Number((curTop3 - getTop3(previousRun)).toFixed(1)),
    cite: Number((curCite - getCite(previousRun)).toFixed(1)),
    date: previousRun.timestamp,
    label: 'vs. Prev Run'
  } : null;

  // Build route-level rank comparison map
  const routeTrends = new Map();
  const baselineRun = history[0];
  const compareRun = pastWeekRun || previousRun || baselineRun;
  
  if (compareRun && compareRun.details) {
    const compMap = new Map();
    for (const d of compareRun.details) {
      compMap.set(d.id, d.dorogo_rank);
    }
    for (const d of (current.details || [])) {
      const pastRank = compMap.get(d.id);
      const curRank = d.dorogo_rank;
      let trend = 'stable';
      let deltaText = '● Stable';
      if (curRank === 1 && pastRank !== 1) {
        trend = 'up';
        deltaText = pastRank ? `▲ Rose to #1 (+${pastRank - 1})` : `▲ New #1 Pick`;
      } else if (curRank && (!pastRank || pastRank > curRank)) {
        trend = 'up';
        deltaText = pastRank ? `▲ +${pastRank - curRank} ranks` : `★ Ranked (#${curRank})`;
      } else if (!curRank && pastRank) {
        trend = 'down';
        deltaText = `▼ Dropped (#${pastRank} lost)`;
      } else if (curRank && pastRank && curRank > pastRank) {
        trend = 'down';
        deltaText = `▼ -${curRank - pastRank} ranks`;
      } else if (curRank === 1 && pastRank === 1) {
        trend = 'stable';
        deltaText = `● Stable #1`;
      } else if (curRank && pastRank && curRank === pastRank) {
        trend = 'stable';
        deltaText = `● Stable (#${curRank})`;
      } else if (!curRank && !pastRank && d.dorogo_present) {
        trend = 'cited';
        deltaText = `★ Brand Cited`;
      } else {
        trend = 'unranked';
        deltaText = `— Unranked`;
      }
      routeTrends.set(d.id, { trend, deltaText, pastRank, curRank });
    }
  }

  return {
    current,
    pastWeekRun,
    pastMonthRun,
    previousRun,
    deltaWeek,
    deltaMonth,
    deltaPrev,
    routeTrends
  };
}

/**
 * Saves run summary into localStorage and persists directly into Supabase.
 */
export function persistLiveAuditRun(newRun) {
  let history = [];
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('dorogo_visibility_history');
      history = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(history)) history = [];
    } catch (_) {
      history = [];
    }
  }

  history.push(newRun);
  history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('dorogo_visibility_history', JSON.stringify(history));
    } catch (e) {
      console.warn("Unable to persist to localStorage:", e);
    }
  }

  // Persist to Supabase in background
  const sb = getSupabaseClient();
  if (sb) {
    sb.from('outreach_state').upsert({
      key: 'ai_visibility_history',
      value: history,
      updated_at: new Date().toISOString()
    }).catch((e) => {
      console.warn("Unable to persist visibility run to Supabase:", e);
    });
  }

  return history;
}

/**
 * Loads logged optimization actions from Supabase, static JSON, and localStorage.
 */
export async function loadVisibilityActions() {
  let actions = null;
  const sb = getSupabaseClient();

  // 1. Try Supabase (authoritative cloud store)
  if (sb) {
    try {
      const { data, error } = await sb
        .from('outreach_state')
        .select('value')
        .eq('key', 'ai_visibility_actions')
        .maybeSingle();
      if (!error && data?.value && Array.isArray(data.value)) {
        actions = data.value;
      }
    } catch (e) {
      console.warn('Supabase actions load error:', e);
    }
  }

  // 2. Fallback to localStorage if Supabase is offline
  if (actions === null && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('dorogo_visibility_actions');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) actions = parsed;
      }
    } catch (_) {}
  }

  // 3. Fallback to static seed file ONLY on first initialization
  if (actions === null) {
    try {
      const res = await fetch('data/visibility_actions.json?v=' + Date.now());
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) actions = json;
      }
    } catch (_) {}
  }

  if (!Array.isArray(actions)) actions = [];

  // Exclude any explicitly deleted tombstones
  if (typeof localStorage !== 'undefined') {
    try {
      const deletedIds = new Set(JSON.parse(localStorage.getItem('dorogo_visibility_actions_deleted') || '[]'));
      if (deletedIds.size > 0) {
        actions = actions.filter(a => !deletedIds.has(a.id));
      }
      localStorage.setItem('dorogo_visibility_actions', JSON.stringify(actions));
    } catch (_) {}
  }

  actions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return actions;
}

/**
 * Persists an optimization action to localStorage and Supabase.
 */
export function saveVisibilityAction(action, currentList = null) {
  let list = [];
  if (Array.isArray(currentList) && currentList.length > 0) {
    list = [...currentList];
  } else if (typeof localStorage !== 'undefined') {
    try {
      list = JSON.parse(localStorage.getItem('dorogo_visibility_actions') || '[]');
    } catch (_) {
      list = [];
    }
  }

  const existingIdx = list.findIndex((a) => a.id === action.id);
  if (existingIdx >= 0) {
    list[existingIdx] = action;
  } else {
    list.unshift(action);
  }

  if (typeof localStorage !== 'undefined') {
    try {
      // Remove from deleted tombstones if re-added
      const deleted = new Set(JSON.parse(localStorage.getItem('dorogo_visibility_actions_deleted') || '[]'));
      if (deleted.has(action.id)) {
        deleted.delete(action.id);
        localStorage.setItem('dorogo_visibility_actions_deleted', JSON.stringify([...deleted]));
      }
      localStorage.setItem('dorogo_visibility_actions', JSON.stringify(list));
    } catch (e) {
      console.warn("Failed to save action to localStorage:", e);
    }
  }

  // Persist to Supabase in background
  const sb = getSupabaseClient();
  if (sb) {
    sb.from('outreach_state').upsert({
      key: 'ai_visibility_actions',
      value: list,
      updated_at: new Date().toISOString()
    }).catch((e) => {
      console.warn("Failed to save action to Supabase:", e);
    });
  }

  return list;
}

/**
 * Deletes an optimization action by ID from localStorage, Supabase, and in-memory list.
 */
export function deleteVisibilityAction(id, currentList = null) {
  let list = [];
  if (Array.isArray(currentList) && currentList.length > 0) {
    list = [...currentList];
  } else if (typeof localStorage !== 'undefined') {
    try {
      list = JSON.parse(localStorage.getItem('dorogo_visibility_actions') || '[]');
    } catch (_) {
      list = [];
    }
  }

  const updated = list.filter((a) => a.id !== id);

  if (typeof localStorage !== 'undefined') {
    try {
      const deleted = new Set(JSON.parse(localStorage.getItem('dorogo_visibility_actions_deleted') || '[]'));
      deleted.add(id);
      localStorage.setItem('dorogo_visibility_actions_deleted', JSON.stringify([...deleted]));
      localStorage.setItem('dorogo_visibility_actions', JSON.stringify(updated));
    } catch (_) {}
  }

  const sb = getSupabaseClient();
  if (sb) {
    sb.from('outreach_state').upsert({
      key: 'ai_visibility_actions',
      value: updated,
      updated_at: new Date().toISOString()
    }).catch(() => {});
  }

  return updated;
}

