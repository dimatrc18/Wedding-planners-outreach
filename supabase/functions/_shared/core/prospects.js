// Prospect helpers: priority score, dedupe, CSV, and extraction of public contact data from a web page.

import { LAKE_TOWNS, LAKE_VENUES } from './constants.js';

/** 0-100. Higher = contact sooner. Explainable: returns the parts too. */
export function priorityScore(p) {
  const parts = [];
  const add = (pts, why) => { if (pts) parts.push({ pts, why }); };
  add({ planner: 40, venue: 30, concierge_hotel: 30, photographer: 20 }[p.type || 'planner'] || 25, `type: ${p.type || 'planner'}`);
  const rating = +p.rating || 0;
  if (rating >= 4.8) add(10, `rating ${rating}`); else if (rating >= 4.5) add(5, `rating ${rating}`);
  const reviews = +p.verified_reviews_count || 0;
  if (reviews) add(Math.min(20, Math.round(6 * Math.log2(1 + reviews))), `${reviews} reviews`);
  add({ boutique_local: 15, international: 8, high_volume_uk_us: 5 }[p.segment] || 0, p.segment ? `segment: ${p.segment}` : '');
  const tags = (p.tags || []).map((t) => String(t).toLowerCase());
  if (tags.includes('tier1') || tags.includes('low_priority')) add(-25, 'tier 1/2 agency (saturated)');
  if (tags.includes('unverified')) add(-10, 'unverified');
  if (p.email) add(5, 'has email'); else add(-5, 'no email yet');
  if ((p.personalization_hook || '').trim()) add(5, 'has hook');
  if (p.website) add(3, 'has website');
  const score = Math.max(0, Math.min(100, parts.reduce((s, x) => s + x.pts, 0)));
  return { score, parts };
}

const FREEMAIL = /^(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|libero|virgilio|tiscali|alice|tin|fastwebnet|gmx|web|aol|proton|protonmail)\./i;

export function domainOf(s = '') {
  const str = String(s).trim().toLowerCase();
  if (!str) return '';
  if (str.includes('@') && !str.includes('/')) return str.split('@')[1] || '';
  try { return new URL(str.startsWith('http') ? str : `https://${str}`).hostname.replace(/^www\./, ''); } catch { return ''; }
}

export function normalizeHandle(s = '') {
  let h = String(s).trim();
  const m = h.match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
  if (m) h = m[1];
  h = h.replace(/^@/, '').replace(/\/$/, '');
  if (['p', 'reel', 'reels', 'explore', 'accounts', 'stories', 'tv'].includes(h.toLowerCase())) return '';
  return /^[A-Za-z0-9_.]{1,30}$/.test(h) ? h.toLowerCase() : '';
}

const normName = (s = '') => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(wedding|weddings|planner|planners|events?|srl|s\.r\.l\.|studio|the|di|by|lake|como)\b/g, '').replace(/[^a-z0-9]/g, '');

/** Existing prospects that look like the same business. */
export function findDuplicates(c, prospects) {
  const email = (c.email || '').toLowerCase().trim();
  const dom = domainOf(c.website) || (email && !FREEMAIL.test(domainOf(email)) ? domainOf(email) : '');
  const ig = normalizeHandle(c.instagram_handle || '');
  const nm = normName(c.agency_name);
  return prospects.filter((p) => {
    if (c.id && p.id === c.id) return false;
    if (email && (p.email || '').toLowerCase() === email) return true;
    const pd = domainOf(p.website) || (p.email && !FREEMAIL.test(domainOf(p.email)) ? domainOf(p.email) : '');
    if (dom && pd && dom === pd) return true;
    if (ig && normalizeHandle(p.instagram_handle || '') === ig) return true;
    return nm.length >= 4 && normName(p.agency_name) === nm;
  });
}

export function isValidEmailSyntax(e = '') {
  return /^[^\s@"(),:;<>[\]\\]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(String(e).trim());
}

// ---------------- CSV ----------------
export function parseCSV(text = '') {
  const src = String(text).replace(/^﻿/, '');
  const delim = (src.split('\n')[0].match(/;/g) || []).length > (src.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = []; let field = ''; let q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') q = false; else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && src[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => String(x).trim() !== ''));
}

const ALIASES = {
  agency_name: ['agency', 'agency name', 'agency_name', 'company', 'name', 'business', 'studio', 'planner', 'business name'],
  contact_name: ['contact', 'contact name', 'contact_name', 'person', 'owner', 'full name'],
  role: ['role', 'title', 'position'],
  email: ['email', 'e-mail', 'mail', 'email address'],
  phone: ['phone', 'telephone', 'tel', 'mobile'],
  whatsapp: ['whatsapp', 'wa'],
  website: ['website', 'site', 'url', 'web', 'homepage'],
  instagram_handle: ['instagram', 'ig', 'instagram handle', 'instagram_handle', 'insta'],
  linkedin: ['linkedin'],
  location: ['location', 'city', 'town', 'area'],
  type: ['type', 'category'],
  segment: ['segment'],
  source: ['source'],
  rating: ['rating', 'stars'],
  verified_reviews_count: ['reviews', 'review count', 'reviews count', 'verified_reviews_count', 'number of reviews'],
  review_source: ['review source', 'review_source'],
  language: ['language', 'lang'],
  personalization_hook: ['hook', 'personalization hook', 'personalization_hook', 'opener'],
  notes: ['notes', 'note', 'comments'],
  tags: ['tags', 'labels'],
};

export function mapHeaders(headers) {
  return headers.map((h) => {
    const k = String(h).trim().toLowerCase();
    return Object.keys(ALIASES).find((f) => ALIASES[f].includes(k)) || null;
  });
}

/** CSV text → array of prospect-shaped objects (unknown columns go to notes). */
export function csvToProspects(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const map = mapHeaders(rows[0]);
  return rows.slice(1).map((r) => {
    const o = {}; const extra = [];
    r.forEach((v, i) => {
      const val = String(v).trim(); if (!val) return;
      if (map[i]) o[map[i]] = val; else extra.push(`${rows[0][i]}: ${val}`);
    });
    if (o.instagram_handle) o.instagram_handle = normalizeHandle(o.instagram_handle);
    if (o.rating) o.rating = parseFloat(String(o.rating).replace(',', '.')) || null;
    if (o.verified_reviews_count) o.verified_reviews_count = parseInt(o.verified_reviews_count, 10) || null;
    if (o.tags) o.tags = String(o.tags).split(/[|,;]/).map((t) => t.trim()).filter(Boolean);
    if (o.email && !isValidEmailSyntax(o.email)) { extra.push(`invalid email: ${o.email}`); delete o.email; }
    if (extra.length) o.notes = [o.notes, ...extra].filter(Boolean).join('\n');
    if (!o.source) o.source = 'manual';
    return o;
  }).filter((o) => o.agency_name || o.email || o.instagram_handle || o.website);
}

export function toCSV(rows, columns) {
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = Array.isArray(v) ? v.join('|') : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(','), ...rows.map((r) => columns.map((c) => esc(r[c])).join(','))].join('\n');
}

// ---------------- Public page extraction ----------------
const decodeEntities = (s) => s.replace(/&#64;|&#x40;/gi, '@').replace(/&#46;|&#x2e;/gi, '.').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));

const JUNK_EMAIL = /\.(png|jpe?g|gif|webp|svg|css|js)$|sentry|wixpress|example\.|domain\.com|email\.com|yourname|@2x|u00/i;

export function extractEmails(html = '') {
  const t = decodeEntities(html).replace(/\s*(\[at\]|\(at\)|\{at\})\s*/gi, '@').replace(/\s*(\[dot\]|\(dot\))\s*/gi, '.');
  const found = new Set();
  for (const m of t.matchAll(/mailto:([^"'?>\s]+)/gi)) found.add(decodeURIComponent(m[1]).toLowerCase());
  for (const m of t.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) found.add(m[0].toLowerCase());
  return [...found].filter((e) => isValidEmailSyntax(e) && !JUNK_EMAIL.test(e));
}

export function htmlToText(html = '') {
  return decodeEntities(String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h\d)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

/** Contact facts from one public web page. Never invents: everything returned appears on the page. */
export function extractFromHtml(html = '', pageUrl = '') {
  const meta = (name) => {
    const r = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i')) ||
      html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i'));
    return r ? decodeEntities(r[1]).trim() : '';
  };
  const title = decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]).replace(/\s+/g, ' ').trim();
  const text = htmlToText(html);
  const igs = new Set();
  for (const m of html.matchAll(/instagram\.com\/([A-Za-z0-9_.]+)/gi)) { const h = normalizeHandle(m[1]); if (h) igs.add(h); }
  const phones = new Set();
  for (const m of html.matchAll(/href=["']tel:([^"']+)["']/gi)) phones.add(decodeURIComponent(m[1]).replace(/[^\d+]/g, ''));
  const wa = (html.match(/wa\.me\/(\d{6,15})/i) || [])[1] || '';
  const lang = ((html.match(/<html[^>]*\slang=["']?([a-zA-Z-]+)/i) || [])[1] || '').slice(0, 2).toLowerCase();
  const lower = text.toLowerCase();
  const venues = LAKE_VENUES.filter((v) => lower.includes(v.name.toLowerCase())).map((v) => v.name);
  const towns = LAKE_TOWNS.filter((t) => new RegExp(`\\b${t.toLowerCase()}\\b`).test(lower));
  const dom = domainOf(pageUrl);
  const emails = extractEmails(html).sort((a, b) => (domainOf(b) === dom) - (domainOf(a) === dom));
  const links = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => m[1])
    .filter((h) => /contact|contatti|about|chi-siamo|team|portfolio|weddings|matrimoni|real-weddings|blog/i.test(h)).slice(0, 12);
  return {
    url: pageUrl, title, description: meta('description') || meta('og:description'), site_name: meta('og:site_name'),
    emails, instagram: [...igs], phones: [...phones], whatsapp: wa, lang, venues, towns, links,
    text: text.slice(0, 8000),
  };
}

/** Paste-a-URL: what can be read from the URL alone (no request). */
export function parseProfileUrl(url = '') {
  const u = String(url).trim();
  const ig = normalizeHandle(u);
  if (/instagram\.com/i.test(u) && ig) return { instagram_handle: ig, source: 'instagram' };
  const dom = domainOf(u);
  if (dom) return { website: u.startsWith('http') ? u : `https://${u}`, source: /matrimonio\.com/.test(dom) ? 'matrimonio.com' : /weddingwire/.test(dom) ? 'wedding_wire' : 'manual' };
  return {};
}
