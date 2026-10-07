// Settings: kill switch, pace, sender, mailbox and integrations, rate card, deliverability, data export.
import * as core from '../../supabase/functions/_shared/core/index.js';
import { S, saveSettings, api, upload, isDemo, startDemo, leaveDemo } from '../store.js';
import { esc, attr, icon, toast, download, fmtDateTime, ago, pct, confirmDialog } from '../ui.js';

const DKIM_SELECTORS = ['google', 'default', 'selector1', 'selector2', 'k1', 'k2', 'mail', 'dkim', 's1', 's2', 'mx', 'zoho', 'ovh', 'aruba', 'register'];
let dnsResult = null;

async function doh(name, type) {
  const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`);
  const j = await r.json();
  return (j.Answer || []).map((a) => String(a.data).replace(/^"|"$/g, '').replace(/" "/g, ''));
}

async function checkDomain(domain) {
  const [mx, txt, dmarc] = await Promise.all([doh(domain, 'MX'), doh(domain, 'TXT'), doh(`_dmarc.${domain}`, 'TXT')]);
  const spf = txt.find((t) => t.startsWith('v=spf1')) || null;
  const dm = dmarc.find((t) => t.startsWith('v=DMARC1')) || null;
  const dkim = [];
  await Promise.all(DKIM_SELECTORS.map(async (s) => { const r = await doh(`${s}._domainkey.${domain}`, 'TXT').catch(() => []); if (r.some((x) => /p=/.test(x))) dkim.push(s); }));
  return { domain, mx, spf, dmarc: dm, dkim, at: new Date() };
}

function statusRow(ok, label, detail, warn = false) {
  return `<div class="list-item"><span class="dot ${ok ? 'ok' : warn ? 'warn' : 'bad'}"></span><div class="t"><b>${esc(label)}</b><span class="small muted" style="overflow-wrap:anywhere">${esc(detail)}</span></div></div>`;
}

export function render(el) {
  function paint() {
    const s = S.settings;
    const h = S.health || {};
    const ig = h.integrations || {};
    const capToday = core.effectiveCap(s, new Date(), core.firstColdSend(S.touches));
    const m = core.computeMetrics(S.prospects, S.touches, S.opps);
    const domain = (s.sender?.email || 'dmitri@dorogo.eu').split('@')[1];
    el.innerHTML = `
    <div class="page-head"><div><div class="label eyebrow">${esc(S.user?.email || '')}${isDemo() ? ' · demo' : ''}</div><h1>Settings</h1></div></div>
    <div class="stack lg">
      <section class="card row" style="justify-content:space-between">
        <div class="stack" style="gap:2px"><h2>${icon('power', 18)} Kill switch</h2><span class="small muted">Stops every send immediately: cron, “Send now” and Telegram approvals. Drafting continues.</span></div>
        <label class="switch" style="transform:scale(1.25)"><input type="checkbox" id="kill" ${s.kill_switch ? 'checked' : ''} aria-label="Kill switch"><span></span></label>
      </section>

      <section class="card stack">
        <div class="section-head"><h2>Pace</h2><span class="chip ${capToday ? 'gold' : 'bad'}">Today's cap: ${capToday} emails</span></div>
        <div class="fields">
          <label class="field"><span>Season mode</span><select id="season"><option value="auto" ${s.season_mode === 'auto' ? 'selected' : ''}>Auto (half speed May to Sept)</option><option value="normal" ${s.season_mode === 'normal' ? 'selected' : ''}>Normal all year</option><option value="slow" ${s.season_mode === 'slow' ? 'selected' : ''}>Slow (half speed)</option><option value="paused" ${s.season_mode === 'paused' ? 'selected' : ''}>Paused</option></select></label>
          <label class="field"><span>Daily cap (cold emails)</span><input type="number" id="cap" min="1" max="60" value="${s.daily_cap}"></label>
          <label class="field"><span>Warm-up start / day</span><input type="number" id="wu-start" min="1" value="${s.warmup.start}"></label>
          <label class="field"><span>Warm-up + per week</span><input type="number" id="wu-inc" min="0" value="${s.warmup.weekly_increment}"></label>
          <label class="field"><span>Auto-pause above bounce rate</span><input type="number" id="bounce" min="0.5" max="20" step="0.5" value="${(s.bounce_pause_rate * 100).toFixed(1)}"></label>
          <label class="field"><span>Stale after (days)</span><input type="number" id="stale" min="2" value="${s.stale_days}"></label>
          <label class="field"><span>Rate card nudge after (days)</span><input type="number" id="nudge" min="2" value="${s.ratecard_nudge_days}"></label>
          <label class="field"><span>Human check-up if reply unanswered (h)</span><input type="number" id="esc-hours" min="1" max="48" value="${s.human_escalation_hours || 2}"></label>
        </div>
        <label class="check small"><input type="checkbox" id="wu-on" ${s.warmup.enabled ? 'checked' : ''}> Warm-up on (start low, add a few sends each week)</label>
        <div class="row end"><button class="btn primary sm" data-act="save-pace">Save pace</button></div>
      </section>

      <section class="card stack">
        <div class="section-head"><h2>Sender</h2><span class="hint">The mailbox itself is set in the function secrets (see Mailbox)</span></div>
        <div class="fields">
          <label class="field"><span>From name</span><input type="text" id="from-name" value="${attr(s.sender?.display_name || 'Dmitri | DOROGO')}"></label>
          <label class="field"><span>From address</span><input type="email" id="from-email" value="${attr(s.sender?.email || 'dmitri@dorogo.eu')}"></label>
          <label class="field"><span>Reply-to</span><input type="email" id="reply-to" value="${attr(s.sender?.reply_to || s.sender?.email || '')}"></label>
        </div>
        <label class="check small"><input type="checkbox" id="opens" ${s.track_opens ? 'checked' : ''}> Track opens with a pixel (adds an HTML part; less reliable and slightly worse for deliverability)</label>
        <div class="row end"><button class="btn primary sm" data-act="save-sender">Save sender</button></div>
      </section>

      <section class="card stack">
        <div class="section-head"><h2>Rate card PDF</h2></div>
        <p class="small muted">${s.rate_card_path ? `Attached to rate card emails: <b>${esc(s.rate_card_filename || s.rate_card_path)}</b>` : 'Not uploaded yet. Rate card emails cannot send until it is.'}</p>
        <div class="row"><input type="file" id="pdf" accept="application/pdf" aria-label="Rate card PDF" style="max-width:320px"><button class="btn sm" data-act="upload">${icon('upload', 15)} Upload</button></div>
      </section>

      <section class="card flush">
        <div class="section-head" style="padding:16px 18px 6px"><h2>Mailbox & integrations</h2>${h.error ? `<span class="chip bad">${esc(h.error)}</span>` : ''}</div>
        <div class="list">
          ${statusRow(ig.smtp, 'Sending (SMTP)', ig.smtp ? 'Connected. Approved emails go out from the mailbox.' : 'Not connected: approved emails wait in Today for “Open in mail”.', true)}
          ${statusRow(ig.imap, 'Reply detection (IMAP)', ig.imap ? `Last sync ${h.imap?.last_sync_at ? ago(h.imap.last_sync_at) : 'never'}${h.imap?.last_error ? ` · error: ${h.imap.last_error}` : ''}` : 'Not connected: log replies by hand with “Log a reply”.', true)}
          ${statusRow(ig.gemini, 'AI (Gemini)', ig.gemini ? 'Hooks from websites, AI rewrites, unclear replies.' : 'Off: templates and rule-based reply classification still work.', true)}
          ${statusRow(ig.telegram, 'Telegram', ig.telegram ? `Digest ${h.digest?.last_date ? `last sent ${h.digest.last_date}` : 'not sent yet'}; positive replies alert instantly.` : 'Off: no phone alerts or approve buttons.', true)}
          ${statusRow(ig.cron_secret && h.cron?.last_run_at, 'Scheduler', h.cron?.last_run_at ? `Last run ${ago(h.cron.last_run_at)}` : 'Not running yet: run supabase/setup/cron.sql once.', true)}
        </div>
        <div class="actions" style="padding:12px 18px 16px">
          <button class="btn sm" data-act="job" data-job="test_smtp">Test SMTP</button>
          <button class="btn sm" data-act="job" data-job="sync_inbox">Sync inbox now</button>
          <button class="btn sm" data-act="job" data-job="run_tick">Draft due steps (server)</button>
          <button class="btn sm" data-act="job" data-job="run_send">Send due emails now</button>
          <button class="btn sm" data-act="job" data-job="digest_now">Send Telegram digest</button>
          <button class="btn sm ghost" data-act="health">Refresh status</button>
        </div>
        <details style="padding:0 18px 16px"><summary class="small muted">How to connect (one-time, by the project owner)</summary>
          <pre class="mono" style="white-space:pre-wrap;background:var(--bg);padding:12px;border-radius:8px;overflow-x:auto">supabase secrets set --project-ref qjarhdrrbjeeqbhfgmnp \\
  OUTREACH_SMTP_HOST=… OUTREACH_SMTP_PORT=465 OUTREACH_SMTP_USER=dmitri@dorogo.eu OUTREACH_SMTP_PASS=… \\
  OUTREACH_IMAP_HOST=… OUTREACH_IMAP_SENT_FOLDER=Sent \\
  GEMINI_API_KEY=… \\
  OUTREACH_TELEGRAM_BOT_TOKEN=… OUTREACH_TELEGRAM_CHAT_ID=… OUTREACH_TELEGRAM_SECRET=…
# then run supabase/setup/cron.sql in the SQL editor. Details in README.md</pre></details>
      </section>

      <section class="card stack">
        <div class="section-head"><h2>Deliverability · ${esc(domain)}</h2><button class="btn sm" data-act="dns">Check DNS</button></div>
        <div class="kpis">
          <div class="kpi"><span class="label">Bounce rate</span><span class="val">${pct(m.bounceRate.p, 1)}</span><span class="ci">${m.bounced} of ${m.emailsSent} emails · pause above ${pct(s.bounce_pause_rate, 1)}</span></div>
          <div class="kpi"><span class="label">Emails sent</span><span class="val">${m.emailsSent}</span><span class="ci">${S.prospects.filter((p) => p.email_status === 'bounced').length} addresses bounced</span></div>
        </div>
        ${dnsResult ? `<div class="card flush list">
          ${statusRow(dnsResult.mx.length, 'MX', dnsResult.mx.join(', ') || 'No mail server found')}
          ${statusRow(!!dnsResult.spf, 'SPF', dnsResult.spf || 'Missing: add a TXT record starting v=spf1 that includes your mail provider')}
          ${statusRow(dnsResult.dkim.length, 'DKIM', dnsResult.dkim.length ? `Found selector${dnsResult.dkim.length > 1 ? 's' : ''}: ${dnsResult.dkim.join(', ')}` : `None found on common selectors (${DKIM_SELECTORS.slice(0, 6).join(', ')}…). Check with your mail provider.`, true)}
          ${statusRow(!!dnsResult.dmarc, 'DMARC', dnsResult.dmarc || 'Missing: add _dmarc TXT “v=DMARC1; p=none; rua=mailto:…” to start')}
        </div><p class="tiny faint">Checked ${esc(fmtDateTime(dnsResult.at))} via public DNS.</p>` : '<p class="small muted">Checks MX, SPF, DKIM (common selectors) and DMARC for the sending domain.</p>'}
      </section>

      <section class="card stack">
        <div class="section-head"><h2>Data</h2><span class="hint">B2B outreach under GDPR legitimate interest: every contact keeps its source; erase a prospect from its page.</span></div>
        <div class="actions">
          <button class="btn sm" data-act="csv">${icon('download', 15)} Prospects (CSV)</button>
          <button class="btn sm" data-act="json">${icon('download', 15)} Everything (JSON)</button>
          <a class="btn sm" href="#add">${icon('upload', 15)} Import CSV</a>
        </div>
        <div class="divider"></div>
        <div class="row between"><span class="small muted">${isDemo() ? 'You are in demo mode: fictional data, nothing saved.' : 'Demo mode shows the app filled with fictional data without touching yours.'}</span>
          ${isDemo() ? '<button class="btn sm" data-act="leave-demo">Leave demo</button>' : '<button class="btn sm ghost" data-act="demo">Open demo mode</button>'}</div>
        <p class="tiny faint">Team access: emails in <code>public.allowed_users</code>. Add someone with <code>insert into public.allowed_users (email) values ('name@dorogo.eu');</code> in the SQL editor.</p>
      </section>
    </div>`;
  }
  paint();

  el.addEventListener('change', async (e) => {
    if (e.target.id !== 'kill') return;
    const on = e.target.checked;
    if (!on && !await confirmDialog('Turn the kill switch off?', 'Approved emails will start sending again in the next window.', 'Resume sending')) { e.target.checked = true; return; }
    await saveSettings({ kill_switch: on }); toast(on ? 'Kill switch ON: nothing will send' : 'Sending resumed');
  });

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const v = (id) => el.querySelector(`#${id}`);
    try {
      b.disabled = true;
      switch (b.dataset.act) {
        case 'save-pace':
          await saveSettings({
            season_mode: v('season').value, daily_cap: Math.max(1, +v('cap').value), bounce_pause_rate: Math.max(0.005, +v('bounce').value / 100),
            warmup: { enabled: v('wu-on').checked, start: Math.max(1, +v('wu-start').value), weekly_increment: Math.max(0, +v('wu-inc').value) },
            stale_days: Math.max(2, +v('stale').value), ratecard_nudge_days: Math.max(2, +v('nudge').value),
            human_escalation_hours: Math.max(1, +v('esc-hours').value || 2),
          });
          toast('Pace saved'); paint(); break;
        case 'save-sender':
          await saveSettings({ sender: { display_name: v('from-name').value.trim(), email: v('from-email').value.trim(), reply_to: v('reply-to').value.trim() }, track_opens: v('opens').checked });
          toast('Sender saved'); break;
        case 'upload': {
          const f = v('pdf').files[0]; if (!f) { toast('Choose the PDF first', 'error'); break; }
          if (f.type !== 'application/pdf') { toast('That is not a PDF', 'error'); break; }
          const path = await upload(`rate-card/${Date.now()}-${f.name.replace(/[^\w.-]+/g, '_')}`, f);
          await saveSettings({ rate_card_path: path, rate_card_filename: f.name });
          toast('Rate card uploaded'); paint(); break;
        }
        case 'job': {
          const r = await api(b.dataset.job);
          const msg = b.dataset.job === 'test_smtp' ? 'SMTP login works' : r.skipped ? `Skipped: ${r.skipped.replace(/_/g, ' ')}` : `Done: ${JSON.stringify(r).slice(0, 120)}`;
          toast(msg); S.health = await api('health').catch(() => S.health); paint(); break;
        }
        case 'health': S.health = await api('health'); paint(); toast('Status refreshed'); break;
        case 'dns': dnsResult = await checkDomain((S.settings.sender?.email || 'dmitri@dorogo.eu').split('@')[1]); paint(); break;
        case 'csv': {
          const cols = ['agency_name', 'contact_name', 'role', 'email', 'email_status', 'phone', 'whatsapp', 'website', 'linkedin', 'location', 'type', 'segment', 'language', 'source', 'source_detail', 'rating', 'verified_reviews_count', 'review_source', 'priority_score', 'status', 'personalization_hook', 'hook_type', 'tags', 'notes', 'do_not_contact', 'unsubscribed_at', 'nurture_until', 'created_at', 'last_touch_at'];
          download(`dorogo_prospects_${new Date().toISOString().slice(0, 10)}.csv`, core.toCSV(S.prospects, cols), 'text/csv'); break;
        }
        case 'json':
          download(`dorogo_outreach_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ exported_at: new Date().toISOString(), prospects: S.prospects, touches: S.touches, opportunities: S.opps, templates: S.templates, settings: S.settings, events: S.events }, null, 2), 'application/json'); break;
        case 'demo': location.hash = 'today'; await startDemo(); break;
        case 'leave-demo': leaveDemo(); break;
      }
    } catch (err) { toast(err.message, 'error'); } finally { if (b.isConnected) b.disabled = false; }
  });
}
