// Data layer. Two backends with one interface:
//   live: Supabase (RLS-protected tables + the outreach-api edge function)
//   demo: in-memory sample data, nothing leaves the browser
import { DEFAULT_SETTINGS, DEFAULT_TEMPLATES, withDefaults, priorityScore } from '../supabase/functions/_shared/core/index.js';
import { buildDemoData } from './demo.js';

export const S = {
  mode: 'loading', // loading | signed_out | live | demo
  user: null,
  prospects: [], touches: [], opps: [], templates: [], events: [],
  settings: withDefaults(DEFAULT_SETTINGS),
  health: null,
};

let sb = null;
let backend = null;
const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
const emit = (why) => listeners.forEach((fn) => fn(why));

const nowIso = () => new Date().toISOString();
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16)));

// Rebuild the shared cache in place so views keep their references.
function setData(d) {
  S.prospects = (d.prospects || []).map((p) => (p.status === 't2_sent' ? { ...p, status: 't1_sent' } : p));
  S.touches = (d.touches || [])
    .filter((t) => t.step_name !== 'T2_ig_dm' && t.channel !== 'instagram_dm')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  S.opps = d.opps || [];
  const rawTemplates = d.templates && d.templates.length ? d.templates : DEFAULT_TEMPLATES.map((t) => ({ id: uuid(), active: true, ...t }));
  S.templates = rawTemplates.filter((t) => t.key !== 'T2_ig_dm');
  S.events = d.events || [];
  S.settings = withDefaults(d.settings || {});
}

const table = { prospects: 'prospects', touches: 'touches', opps: 'opportunities', templates: 'templates' };

// ---------------- Supabase backend ----------------
function liveBackend() {
  const T = (name) => sb.from(table[name] || name);
  const check = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  return {
    async load() {
      const [p, t, o, tpl, s, ev] = await Promise.all([
        T('prospects').select('*'), T('touches').select('*').order('created_at'), T('opps').select('*'),
        T('templates').select('*'), sb.from('outreach_settings').select('data').eq('id', 1).maybeSingle(),
        sb.from('events_log').select('*').order('at', { ascending: false }).limit(400),
      ]);
      return { prospects: check(p), touches: check(t), opps: check(o), templates: check(tpl), settings: check(s)?.data || {}, events: check(ev) };
    },
    async insert(name, rows) { return check(await T(name).insert(rows).select()); },
    async update(name, id, patch) { return check(await T(name).update(patch).eq('id', id).select().single()); },
    async updateMany(name, ids, patch) { if (ids.length) check(await T(name).update(patch).in('id', ids)); },
    async remove(name, id) { check(await T(name).delete().eq('id', id)); },
    async upsertTemplate(tpl) { return check(await T('templates').upsert(tpl, { onConflict: 'key,language' }).select().single()); },
    async saveSettings(data) { check(await sb.from('outreach_settings').upsert({ id: 1, data })); },
    async log(action, detail = {}, prospect_id = null) {
      const row = { action, detail, prospect_id, actor: S.user?.email || 'app' };
      const { data } = await sb.from('events_log').insert(row).select().single();
      if (data) S.events.unshift(data);
    },
    async api(action, body = {}) {
      const { data: { session } } = await sb.auth.getSession();
      const r = await fetch(`${window.APP_CONFIG.SUPABASE_URL}/functions/v1/outreach-api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}`, apikey: window.APP_CONFIG.SUPABASE_KEY },
        body: JSON.stringify({ action, ...body }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
      return j;
    },
    async upload(path, file) {
      check(await sb.storage.from('outreach').upload(path, file, { upsert: true, contentType: file.type || 'application/pdf' }));
      return path;
    },
    subscribe() {
      const apply = (name) => (payload) => {
        const list = S[name];
        const row = payload.new && payload.new.id ? payload.new : null;
        const id = row ? row.id : payload.old?.id;
        const i = list.findIndex((x) => x.id === id);
        if (payload.eventType === 'DELETE') { if (i >= 0) list.splice(i, 1); }
        else if (i >= 0) list[i] = row; else list.push(row);
        emit(`realtime:${name}:${payload.eventType}`);
      };
      sb.channel('outreach-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'touches' }, apply('touches'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'prospects' }, apply('prospects'))
        .subscribe();
    },
  };
}

// ---------------- Demo backend ----------------
function demoBackend() {
  return {
    async load() { return buildDemoData(); },
    async insert(name, rows) { const arr = Array.isArray(rows) ? rows : [rows]; return arr.map((r) => ({ id: uuid(), created_at: nowIso(), updated_at: nowIso(), ...r })); },
    async update(name, id, patch) { const row = S[name].find((x) => x.id === id); return { ...row, ...patch, updated_at: nowIso() }; },
    async updateMany() {},
    async remove() {},
    async upsertTemplate(tpl) { return { id: tpl.id || uuid(), ...tpl, updated_at: nowIso() }; },
    async saveSettings() {},
    async log(action, detail = {}, prospect_id = null) { S.events.unshift({ id: uuid(), at: nowIso(), action, detail, prospect_id, actor: 'demo' }); },
    async api(action) {
      if (action === 'health') return { integrations: { smtp: false, imap: false, gemini: false, telegram: false, cron_secret: false }, imap: {}, digest: {}, cron: {} };
      if (action === 'enrich') throw new Error('Website research runs on the live system. In demo mode, fill the fields by hand.');
      throw new Error('This runs on the live system only. You are in demo mode.');
    },
    async upload(path) { return path; },
    subscribe() {},
  };
}

// ---------------- Public API ----------------
export async function init() {
  const cfg = window.APP_CONFIG || {};
  const wantsDemo = cfg.MODE === 'demo' || /(^|[#&])demo\b/.test(location.hash) || sessionStorageGet('dorogo-demo') === '1';
  if (!wantsDemo && window.supabase && cfg.SUPABASE_URL) {
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
    const { data } = await sb.auth.getSession();
    sb.auth.onAuthStateChange((evt, session) => {
      if (evt === 'SIGNED_IN' && S.mode !== 'live') startLive(session.user);
      if (evt === 'SIGNED_OUT') { S.mode = 'signed_out'; S.user = null; emit('auth'); }
    });
    if (data.session) return startLive(data.session.user);
    S.mode = 'signed_out';
    return emit('auth');
  }
  return startDemo();
}

function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
function sessionStorageSet(k, v) { try { v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch { /* private mode */ } }

async function startLive(user) {
  S.user = user; S.mode = 'live'; backend = liveBackend();
  try {
    setData(await backend.load());
  } catch (e) {
    S.loadError = e.message;
  }
  backend.subscribe();
  emit('loaded');
  backend.api('health').then((h) => { S.health = h; emit('health'); }).catch((e) => { S.health = { error: e.message }; emit('health'); });
}

export async function startDemo() {
  sessionStorageSet('dorogo-demo', '1');
  S.mode = 'demo'; S.user = { email: 'demo@dorogo.eu' }; backend = demoBackend();
  setData(await backend.load());
  S.health = await backend.api('health');
  emit('loaded');
}

export function leaveDemo() { sessionStorageSet('dorogo-demo', null); location.hash = ''; location.reload(); }

export async function signIn(email) {
  const redirect = location.href.split('#')[0];
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
  if (error) throw error;
}
export const signOut = () => sb && sb.auth.signOut();

// --- generic mutations: update cache first, then persist ---
export async function insert(name, rows) {
  const arr = Array.isArray(rows) ? rows : [rows];
  const saved = await backend.insert(name, arr);
  S[name].push(...saved);
  emit(`insert:${name}`);
  return saved;
}

export async function update(name, id, patch) {
  const i = S[name].findIndex((x) => x.id === id);
  const before = i >= 0 ? S[name][i] : null;
  if (i >= 0) S[name][i] = { ...before, ...patch };
  try {
    const saved = await backend.update(name, id, patch);
    if (i >= 0 && saved) S[name][i] = saved;
  } catch (e) {
    if (i >= 0) S[name][i] = before;
    emit(`update:${name}`);
    throw e;
  }
  emit(`update:${name}`);
  return S[name][i];
}

export async function updateMany(name, ids, patch) {
  if (!ids.length) return;
  for (const id of ids) { const i = S[name].findIndex((x) => x.id === id); if (i >= 0) S[name][i] = { ...S[name][i], ...patch }; }
  await backend.updateMany(name, ids, patch);
  emit(`update:${name}`);
}

export async function remove(name, id) {
  await backend.remove(name, id);
  S[name] = S[name].filter((x) => x.id !== id);
  if (name === 'prospects') { S.touches = S.touches.filter((t) => t.prospect_id !== id); S.opps = S.opps.filter((o) => o.prospect_id !== id); }
  emit(`remove:${name}`);
}

export async function upsertTemplate(tpl) {
  const saved = await backend.upsertTemplate(tpl);
  const i = S.templates.findIndex((t) => t.key === saved.key && t.language === saved.language);
  if (i >= 0) S.templates[i] = saved; else S.templates.push(saved);
  emit('templates');
  return saved;
}

export async function saveSettings(patch) {
  S.settings = withDefaults({ ...S.settings, ...patch });
  await backend.saveSettings(S.settings);
  emit('settings');
}

export const log = (action, detail, prospect_id) => backend.log(action, detail, prospect_id).catch(() => {});
export const api = (action, body) => backend.api(action, body);
export const upload = (path, file) => backend.upload(path, file);

// Keep the stored priority score in line with the formula (cheap; runs after load and edits).
export async function syncScores() {
  if (S.mode !== 'live') { for (const p of S.prospects) p.priority_score = priorityScore(p).score; return; }
  for (const p of S.prospects) {
    const s = priorityScore(p).score;
    if (s !== p.priority_score) { p.priority_score = s; backend.update('prospects', p.id, { priority_score: s }).catch(() => {}); }
  }
}

export const isDemo = () => S.mode === 'demo';
export { uuid, nowIso };
