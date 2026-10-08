// Actions the app calls with the signed-in user's session: enrichment, send now, AI redraft, manual job runs, health.
// GET ?open=<touch id> is the optional open-tracking pixel (only used when settings.track_opens is on).
import * as core from '../_shared/core/index.js';
import { handle, json, requireAllowedUser, loadSettings, integrations, getState, admin, HttpError, logEvent } from '../_shared/server.ts';
import { verifySmtp } from '../_shared/mail.ts';
import { tgSend } from '../_shared/telegram.ts';
import { gemini, checkHook } from '../_shared/ai.ts';
import { draftDueSteps, sendDue, syncInbox, sendDigest, approveTouch, fetchJinaSignals, autoResearchPending, loadAll, classifyInboundMessage, applyInbound, formatThreadHistory } from '../_shared/jobs.ts';

const GIF = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='), (c) => c.charCodeAt(0));
const UA = 'Mozilla/5.0 (compatible; DOROGO-partner-research/1.0; +https://dorogo.eu)';

async function fetchPage(url: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const type = r.headers.get('content-type') || '';
    if (!/html/i.test(type)) throw new Error('Not an HTML page');
    return { html: (await r.text()).slice(0, 1_500_000), finalUrl: r.url };
  } finally { clearTimeout(timer); }
}

async function mxCheck(domain: string) {
  try {
    const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`);
    const j = await r.json();
    return (j.Answer || []).some((a: any) => a.type === 15) ? 'mx_ok' : 'no_mx';
  } catch { return 'unknown'; }
}

const DIRECTORY_HOST_RE = /(?:^|\.)(matrimonio\.com|weddingwire\.\w+|zankyou\.\w+|hitched\.\w+|theknot\.com|caratsandcake\.com|stylemepretty\.com|overthemoon\.com|lalista\.com|facebook\.com|instagram\.com|pinterest\.\w+|linkedin\.com|tiktok\.com|youtube\.com|tripadvisor\.\w+|yelp\.\w+|google\.\w+|duckduckgo\.com)$/i;
const REJECT_EMAIL_LOCAL_RE = /^(noreply|no-reply|donotreply|do-not-reply|privacy|gdpr|dpo|pec|fatturazione|billing|abuse|postmaster|webmaster|jobs|careers|hr)@/i;
const REJECT_EMAIL_DOM_RE = /(?:^|\.)(pec\.it|legalmail\.it|arubapec\.it|registerpec\.it|matrimonio\.com|weddingwire\.\w+|zankyou\.\w+|sentry\.io|wixpress\.com|example\.com)$/i;

async function findWebsiteByAgencyName(agencyName: string, location = ''): Promise<string> {
  const q = `${agencyName} ${location || 'Lake Como'} wedding official site`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
        headers: { 'User-Agent': UA, Accept: 'text/html' },
        signal: ctrl.signal,
      });
      if (!r.ok) return '';
      const html = await r.text();
      const urls: string[] = [];
      for (const m of html.matchAll(/uddg=([^"&]+)/gi)) {
        try { urls.push(decodeURIComponent(m[1])); } catch { /* ignore */ }
      }
      for (const m of html.matchAll(/href=["'](https?:\/\/[^"'<>]+)["']/gi)) {
        urls.push(m[1]);
      }
      for (const u of urls) {
        const dom = core.domainOf(u);
        if (!dom || DIRECTORY_HOST_RE.test(dom)) continue;
        try {
          const parsed = new URL(u);
          return `${parsed.protocol}//${parsed.hostname}`;
        } catch { /* ignore */ }
      }
    } finally {
      clearTimeout(timer);
    }
  } catch { /* ignore search failure */ }
  return '';
}

async function enrich(db: any, body: any) {
  let raw = String(body.url || '').trim();
  if (!raw && body.agency_name) {
    raw = await findWebsiteByAgencyName(String(body.agency_name), String(body.location || ''));
  }
  if (!raw) throw new HttpError(400, 'Could not find a website URL automatically — please paste the website URL.');
  const fromUrl: any = core.parseProfileUrl(raw);
  if (!fromUrl.website) throw new HttpError(400, 'Paste the planner\'s own website URL');
  if (DIRECTORY_HOST_RE.test(core.domainOf(fromUrl.website))) {
    return { suggestions: {}, note: 'Listing sites are not fetched (their terms forbid it). Open the listing, copy the planner\'s own website, and paste that.', sources: [] };
  }
  const [main, jina] = await Promise.all([
    fetchPage(fromUrl.website).catch(() => ({ html: '', finalUrl: fromUrl.website })),
    fetchJinaSignals(fromUrl.website),
  ]);
  const first: any = core.extractFromHtml(main.html, main.finalUrl);
  const sources = [main.finalUrl];
  const merged: any = {
    ...first,
    emails: [...new Set([...first.emails, ...(jina?.emails || [])])],
    phones: [...first.phones],
    venues: [...new Set([...first.venues, ...(jina?.venues || [])])],
    towns: [...new Set([...first.towns, ...(jina?.towns || [])])],
    text: `${first.text || ''}\n${jina?.text || ''}`,
  };
  const sameSite = first.links.map((h: string) => { try { return new URL(h, main.finalUrl).toString(); } catch { return null; } })
    .filter((u: string | null) => u && core.domainOf(u) === core.domainOf(main.finalUrl));
  const pick = [...new Set(sameSite)].sort((a: any, b: any) => (/contact|contatti|about|chi-siamo/i.test(b) ? 1 : 0) - (/contact|contatti|about|chi-siamo/i.test(a) ? 1 : 0)).slice(0, 3);
  for (const u of pick as string[]) {
    try {
      const pg = await fetchPage(u);
      const x: any = core.extractFromHtml(pg.html, pg.finalUrl);
      sources.push(pg.finalUrl);
      for (const k of ['emails', 'phones', 'venues', 'towns']) merged[k] = [...new Set([...merged[k], ...x[k]])];
      if (!merged.whatsapp && x.whatsapp) merged.whatsapp = x.whatsapp;
      merged.text += `\n${x.text}`;
    } catch { /* a missing contact page is fine */ }
  }
  const dom = core.domainOf(main.finalUrl);
  const emails = (merged.emails || [])
    .filter((e: string) => !REJECT_EMAIL_LOCAL_RE.test(e) && !REJECT_EMAIL_DOM_RE.test(core.domainOf(e)))
    .sort((a: string, b: string) => Number(core.domainOf(b) === dom) - Number(core.domainOf(a) === dom));
  const email = emails[0] || '';
  const email_status = email ? await mxCheck(core.domainOf(email)) : 'unknown';
  let ai: any = null, aiError = null;
  if (integrations().gemini) {
    try {
      const lang = ['it', 'de', 'fr'].includes(merged.lang) ? merged.lang : 'en';
      ai = checkHook(await gemini(db, 'hook', { agency: body.agency_name || merged.site_name || merged.title, language: lang === 'it' ? 'it' : 'en', page: merged.text.slice(0, 14000) }, body.prospect_id || null), merged.text);
    } catch (e) { aiError = (e as Error).message; }
  }
  const lang = ai?.language_detected || (['en', 'it', 'de', 'fr'].includes(merged.lang) ? merged.lang : 'en');
  const key_venues = [...new Set([...(merged.venues || []), ...((ai?.key_venues || []).filter((v: string) => merged.text.toLowerCase().includes(String(v).toLowerCase())))])];
  const location = merged.towns[0] || body.location || '';
  const suggestions: any = {
    website: main.finalUrl, email, email_status,
    phone: merged.phones[0] || '', whatsapp: merged.whatsapp || '', language: lang,
    key_venues,
    location,
  };
  if (ai?.hook) {
    Object.assign(suggestions, { personalization_hook: ai.hook, hook_type: ai.hook_type, hook_confidence: ai.confidence, hook_needs_review: ai.needs_review, hook_source_url: main.finalUrl });
  } else if (key_venues.length > 0) {
    const v = key_venues[0];
    suggestions.personalization_hook = lang === 'it'
      ? `I vostri matrimoni a ${v} sul Lago di Como hanno attirato la nostra attenzione.`
      : `Your weddings at ${v} on Lake Como caught our eye.`;
    suggestions.hook_type = 'venue';
    suggestions.hook_confidence = 'high';
    suggestions.hook_needs_review = false;
    suggestions.hook_source_url = main.finalUrl;
  } else if (location) {
    suggestions.personalization_hook = lang === 'it'
      ? `Il vostro lavoro nell'organizzazione di matrimoni a ${location} ha attirato la nostra attenzione.`
      : `Your destination wedding work in ${location} caught our eye.`;
    suggestions.hook_type = 'event';
    suggestions.hook_confidence = 'medium';
    suggestions.hook_needs_review = false;
    suggestions.hook_source_url = main.finalUrl;
  }
  if (ai?.segment_guess) suggestions.segment = ai.segment_guess;
  else if (!body.segment) suggestions.segment = lang === 'it' ? 'boutique_local' : 'international';
  if (ai?.weddings_per_year_guess) suggestions.avg_weddings_per_year_estimate = ai.weddings_per_year_guess;
  if (ai?.contact_name && merged.text.includes(ai.contact_name)) suggestions.contact_name = ai.contact_name;

  const scored = core.priorityScore({ ...body, ...suggestions });
  suggestions.priority_score = scored.score;

  return {
    suggestions, alternatives: { emails, phones: merged.phones, towns: merged.towns },
    evidence: ai ? { quote: ai.evidence, found_on_page: ai.evidence_found } : null,
    score: scored.score,
    qualified_65: scored.score >= 65,
    title: merged.title, description: merged.description, sources,
    note: !integrations().gemini ? 'Contact details found. Add GEMINI_API_KEY to also draft an AI hook.' : aiError ? `Hook fallback used (${aiError})` : '',
  };
}

async function aiRedraft(db: any, body: any) {
  if (!integrations().gemini) throw new HttpError(400, 'Add GEMINI_API_KEY to use AI drafting');
  const { data: t } = await db.from('touches').select('*').eq('id', body.touch_id).single();
  const { data: p } = await db.from('prospects').select('*').eq('id', t.prospect_id).single();
  if (['reply', 'rate_card_delivery'].includes(t.step_name)) {
    const { data: allTouches } = await db.from('touches').select('*').eq('prospect_id', p.id).order('created_at');
    const list = (allTouches || []).filter((x: any) => x.id !== t.id);
    const lastIn = [...list].reverse().find((x: any) => x.direction === 'in');
    const out: any = await gemini(
      db,
      'partner_reply',
      {
        agency: p.agency_name,
        contact_name: p.contact_name || '',
        language: p.language || 'en',
        status: p.status,
        thread_history: formatThreadHistory(list, lastIn?.id || null),
        latest_reply: core.stripQuoted(lastIn?.body || t.body || '').slice(0, 3000),
      },
      p.id,
    );
    const lint = core.lintMessage({ subject: t.subject, body: String(out.body || ''), channel: t.channel, step: t.step_name });
    const { data } = await db
      .from('touches')
      .update({ body: out.body, attach_rate_card: Boolean(out.attach_rate_card || t.attach_rate_card), lint, ai_generated: true })
      .eq('id', t.id)
      .select()
      .single();
    return { touch: data, ai_reply: out };
  }
  const notes = [`Agency: ${p.agency_name}`, p.contact_name && `Contact: ${p.contact_name}`, p.location && `Location: ${p.location}`,
    p.personalization_hook && `Hook (keep): ${p.personalization_hook}`, p.key_venues?.length && `Venues: ${p.key_venues.join(', ')}`, p.notes && `Notes: ${p.notes}`].filter(Boolean).join('\n');
  const out: any = await gemini(db, 'draft', { step: t.step_name, prospect: notes, draft: `Subject: ${t.subject || ''}\n\n${t.body}`, language: p.language }, p.id);
  const subject = ['T1_intro', 'T4_breakup'].includes(t.step_name) ? String(out.subject || t.subject) : t.subject;
  const lint = core.lintMessage({ subject, body: String(out.body || ''), channel: t.channel, step: t.step_name });
  const { data } = await db.from('touches').update({ subject, body: out.body, lint, ai_generated: true }).eq('id', t.id).select().single();
  return { touch: data };
}

async function simulateInbound(db: any, settings: any, body: any, now = new Date()) {
  const { prospects, touches, templates } = await loadAll(db);
  let p = body.prospect_id
    ? prospects.find((x: any) => x.id === body.prospect_id)
    : body.agency_name
      ? prospects.find((x: any) => x.agency_name.toLowerCase().includes(String(body.agency_name).toLowerCase()))
      : null;
  if (!p && body.prospect) {
    p = { id: null, status: 't1_sent', language: 'en', type: 'planner', ...body.prospect };
  }
  if (!p) throw new HttpError(404, 'Prospect not found');

  const pTouches = p.id ? touches.filter((t: any) => t.prospect_id === p.id) : [];
  let outbound = [...pTouches].reverse().find((t: any) => t.direction === 'out' && ['sent', 'approved', 'draft'].includes(t.state));
  if (!outbound) {
    const built: any = core.buildDraft({ prospect: p, key: body.step || 'T1_intro', templates });
    outbound = {
      id: 'sim-out-1',
      prospect_id: p.id,
      direction: 'out',
      state: 'sent',
      channel: 'email',
      step_name: body.step || 'T1_intro',
      subject: built?.subject || `Guest transport partner · ${p.agency_name}`,
      body: built?.body || '',
      sent_at: new Date(now.getTime() - 3600000).toISOString(),
    };
  }
  const threadList = pTouches.length ? pTouches : [outbound];
  const simThread = threadList.map((t: any) =>
    t.id === outbound.id ? { ...t, state: 'sent', sent_at: t.sent_at || new Date(now.getTime() - 3600000).toISOString() } : t,
  );
  if (Array.isArray(body.extra_history)) {
    for (const h of body.extra_history) simThread.push(h);
  }

  const inboundSubject = body.subject || `Re: ${outbound.subject}`;
  const inboundBody = String(body.reply_body || body.text || '').trim();
  if (!inboundBody) throw new HttpError(400, 'reply_body is required');

  const cls = await classifyInboundMessage(
    db,
    { from: p.email || 'planner@example.com', subject: inboundSubject, body: inboundBody },
    p.id || null,
    now,
  );

  const inboundRow = {
    id: null,
    prospect_id: p.id,
    channel: 'email',
    direction: 'in',
    state: 'received',
    step_name: 'reply',
    subject: inboundSubject,
    body: inboundBody,
    replied_at: now.toISOString(),
    from_address: p.email || 'planner@example.com',
    reply_sentiment: cls.sentiment,
    reply_intent: cls.intent,
    classification: cls,
  };

  const simProspect = ['researching', 'ready'].includes(p.status) ? { ...p, status: 't1_sent' } : p;
  const fx = await applyInbound(db, simProspect, simThread, inboundRow, cls, settings, templates, now, { dryRun: !body.persist });

  return {
    prospect: {
      id: p.id,
      agency_name: p.agency_name,
      contact_name: p.contact_name,
      type: p.type,
      location: p.location,
      language: p.language,
      key_venues: p.key_venues,
      status_before: simProspect.status,
      status_after: fx.patch?.status || simProspect.status,
    },
    outbound_email: {
      step: outbound.step_name,
      subject: outbound.subject,
      body: outbound.body,
    },
    planner_reply: {
      subject: inboundSubject,
      body: inboundBody,
    },
    classification: cls,
    ai_reply: fx.draft
      ? {
          subject: fx.draft.subject,
          body: fx.draft.body,
          attach_rate_card: fx.draft.attach_rate_card,
          ai_generated: fx.draft.ai_generated || false,
          can_answer_confidently: fx.ai_reply?.can_answer_confidently ?? !fx.needs_human,
          needs_human: fx.needs_human,
          escalation_reason: fx.escalation_reason,
          lint: fx.draft.lint,
        }
      : null,
    opportunity_created: fx.opportunity || null,
    summary: fx.summary,
  };
}

Deno.serve((req) => handle(req, async () => {
  const url = new URL(req.url);
  if (req.method === 'GET' && url.searchParams.get('open')) {
    const id = url.searchParams.get('open')!;
    if (/^[0-9a-f-]{36}$/i.test(id)) await admin().from('touches').update({ opened_at: new Date().toISOString() }).eq('id', id).is('opened_at', null);
    return new Response(GIF, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' } });
  }
  const { user, db } = await requireAllowedUser(req);
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const settings = await loadSettings(db);
  const now = new Date();
  switch (body.action) {
    case 'health':
      return json({ integrations: integrations(), imap: await getState(db, 'imap'), digest: await getState(db, 'digest'), cron: await getState(db, 'cron') });
    case 'test_smtp':
      await verifySmtp();
      return json({ ok: true });
    case 'test_telegram': {
      const res = await tgSend('🔔 <b>DOROGO Partner System</b>: Test ping from Outreach API. Bot is connected and online.');
      return json({ ok: Boolean(res?.ok), result: res });
    }
    case 'enrich':
      return json(await enrich(db, body));
    case 'approve':
      return json(await approveTouch(db, body.touch_id, settings, user.email, now));
    case 'send_now': {
      const r = await sendDue(db, settings, now, { onlyTouchId: body.touch_id, actor: user.email });
      return json(r);
    }
    case 'ai_redraft':
      return json(await aiRedraft(db, body));
    case 'simulate_inbound':
      return json(await simulateInbound(db, settings, body, now));
    case 'run_tick':
      return json(await draftDueSteps(db, settings, now));
    case 'run_send':
      return json(await sendDue(db, settings, now, { actor: user.email }));
    case 'sync_inbox':
      return json(await syncInbox(db, settings, now));
    case 'digest_now':
      return json(await sendDigest(db, settings, now, true));
    case 'classify':
      return json(await classifyInboundMessage(db, { body: body.text || '', subject: body.subject || '' }, body.prospect_id || null, now));
    case 'log':
      await logEvent(db, body.event || 'note', body.detail || {}, body.prospect_id || null, user.email);
      return json({ ok: true });
    default:
      throw new HttpError(400, `Unknown action ${body.action}`);
  }
}));
