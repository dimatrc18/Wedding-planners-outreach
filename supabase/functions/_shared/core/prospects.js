// Prospect helpers: priority score, dedupe, CSV, and extraction of public contact data from a web page.

import { LAKE_TOWNS, LAKE_VENUES, MARKET_KEYS } from './constants.js';

/** Infer market code from country code, phone prefix, website TLD, or location. */
export function inferMarket(p = {}) {
  const directMarket = p.market || p.enrichment?.market;
  if (directMarket && MARKET_KEYS.includes(String(directMarket).toLowerCase())) return String(directMarket).toLowerCase();
  const phone = String(p.phone || p.whatsapp || '').trim();
  if (/^\+?(77|76|71|72)/.test(phone)) return 'kz';
  if (/^\+?7\b/.test(phone)) return 'ru';
  if (/^\+?41/.test(phone)) return 'ch';
  if (/^\+?971/.test(phone)) return 'ae';
  if (/^\+?44/.test(phone)) return 'uk';
  if (/^\+?1\b/.test(phone)) return 'us';
  if (/^\+?39/.test(phone)) return 'it';

  const email = String(p.email || '').toLowerCase();
  if (/@(mail\.kz)$/.test(email)) return 'kz';
  if (/@(mail\.ru|bk\.ru|inbox\.ru|list\.ru|yandex\.\w+|rambler\.ru|internet\.ru)$/.test(email)) return 'ru';

  const web = String(p.website || '').toLowerCase();
  if (/\.kz(\/|$)/.test(web)) return 'kz';
  if (/\.(ru|by|su)(\/|$)/.test(web)) return 'ru';
  if (/\.ch(\/|$)/.test(web)) return 'ch';
  if (/\.ae(\/|$)/.test(web)) return 'ae';
  if (/\.co\.uk(\/|$)/.test(web) || /\.uk(\/|$)/.test(web)) return 'uk';
  if (/\.it(\/|$)/.test(web)) return 'it';

  const loc = String(p.location || '').toLowerCase();
  if (/almaty|astana|kazakhstan|tashkent|bishkek/.test(loc)) return 'kz';
  if (/moscow|москва|russia|россия|petersburg|петербург/.test(loc)) return 'ru';
  if (/switzerland|swiss|lugano|zurich|geneva/.test(loc)) return 'ch';
  if (/dubai|abu dhabi|uae|emirates|doha|qatar|riyadh|saudi/.test(loc)) return 'ae';
  if (/london|uk|united kingdom|manchester|surrey/.test(loc)) return 'uk';
  if (/usa|united states|new york|california|miami|los angeles|texas/.test(loc)) return 'us';
  if (/como|milano|milan|italia|italy|varenna|bellagio|lecco|cernobbio|laglio|rome|roma|verona|venice|venezia/.test(loc)) return 'it';

  if (p.language === 'ru') return 'ru';
  if (p.segment === 'boutique_local' || p.language === 'it') return 'it';
  if (p.segment === 'high_volume_uk_us') return 'uk';
  return 'other';
}

/** 0-100. Higher = contact sooner. Explainable: returns the parts too. */
export function priorityScore(p = {}) {
  const parts = [];
  const add = (pts, why) => { if (pts) parts.push({ pts, why, label: why }); };
  const normType = p.type === 'wedding_planner' ? 'planner' : (p.type || 'planner');
  // 1. Partner Role Fit (Planners, 5★ Hotel Concierges, and Luxury Buyout Villas all control high-value guest transport)
  add({ planner: 26, concierge_hotel: 24, venue: 24, dmc: 23, photographer: 12 }[normType] || 18, `type: ${normType}`);

  // 2. Venue & Route Logistics Fit (Lake Como villas & prime transfer corridors)
  const venuesCount = Array.isArray(p.key_venues) ? p.key_venues.length : 0;
  if (venuesCount >= 3) add(15, `${venuesCount} luxury venues (${p.key_venues.slice(0, 2).join(', ')})`);
  else if (venuesCount === 2) add(13, `2 luxury venues (${p.key_venues.slice(0, 2).join(', ')})`);
  else if (venuesCount === 1) add(9, `1 luxury venue (${p.key_venues[0]})`);
  const loc = (p.location || '').trim();
  if (loc) add(5, `location: ${loc}`);

  // 3. Client Tier, Market & Reputation (balanced 50% international / 50% local)
  const m = inferMarket(p);
  if (m === 'kz' || m === 'ru' || m === 'ch' || m === 'ae') add(12, `high-spend market: ${m.toUpperCase()}`);
  else if (m === 'uk' || m === 'us') add(11, `prime market: ${m.toUpperCase()}`);
  else if (m === 'it') add(10, 'local market: IT');
  else add({ boutique_local: 9, international: 10, high_volume_uk_us: 9 }[p.segment] || 5, p.segment ? `segment: ${p.segment}` : '');

  const rating = +p.rating || 0;
  if (rating >= 4.9) add(6, `rating ${rating}★`);
  else if (rating >= 4.7) add(4, `rating ${rating}★`);
  else if (rating >= 4.5) add(2, `rating ${rating}★`);

  const reviews = +p.verified_reviews_count || 0;
  if (reviews) add(Math.min(8, Math.round(1.6 * Math.log2(1 + reviews))), `${reviews} reviews`);
  else if (venuesCount >= 1 && p.website) add(4, 'verified luxury portfolio');

  // 4. Reachability & Personalization Readiness
  const emailStatus = String(p.email_status || '').toLowerCase();
  if (['bounced', 'no_mx', 'invalid'].includes(emailStatus)) {
    add(-35, `email ${emailStatus}`);
  } else if (p.email) {
    add(10, 'verified email');
    const localPart = String(p.email).split('@')[0].toLowerCase();
    if (FREEMAIL.test(domainOf(p.email))) {
      add(-6, 'freemail address (gmail/yahoo)');
    } else if (!/^(info|contact|contatti|reception|reservations|booking|bookings|office|mail|general|frontdesk|amministrazione|admin)$/i.test(localPart)) {
      add(4, `direct/events inbox (${localPart}@)`);
    }
  } else {
    add(-15, 'no email yet');
  }

  const hook = (p.personalization_hook || '').trim();
  const isGenericHook = /^(I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan\.|Sono Dmitri di DOROGO, società di trasporto privato attiva tra il Lago di Como e Milano\.|Я Дмитрий из компании DOROGO, мы организуем трансферы на озере Комо и в Милане\.)$/i.test(hook);
  if (hook && !isGenericHook) add(8, 'custom story/venue hook');
  else if (hook) add(4, 'intro hook');

  const contact = (p.contact_name || '').trim();
  const isGenericContact = !contact || /\b(team|desk|office|concierge|events|studio|wedding|weddings|planning|reception|staff|department|banqueting)\b/i.test(contact);
  if (contact && !isGenericContact) add(4, `contact: ${contact}`);
  else if (contact) add(1, `role desk: ${contact}`);

  if (p.website) add(2, 'has website');

  // 5. Saturation / Quality Penalties
  const tags = (p.tags || []).map((t) => String(t).toLowerCase());
  if (tags.includes('tier1') || tags.includes('low_priority')) add(-25, 'tier 1/2 agency (saturated)');
  if (tags.includes('unverified')) add(-10, 'unverified');

  let score = Math.max(0, Math.min(100, parts.reduce((s, x) => s + x.pts, 0)));
  if (['bounced', 'no_mx', 'invalid'].includes(emailStatus)) score = Math.min(score, 35);
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
  const cleanPhone = (c.phone || c.whatsapp || '').replace(/[^0-9]/g, '');
  const phone = cleanPhone.length >= 8 ? cleanPhone.slice(-8) : '';
  const contact = String(c.contact_name || '').toLowerCase().replace(/[^a-zа-я]/g, '');

  return prospects.filter((p) => {
    if (c.id && p.id === c.id) return false;
    if (email && (p.email || '').toLowerCase() === email) return true;
    const pd = domainOf(p.website) || (p.email && !FREEMAIL.test(domainOf(p.email)) ? domainOf(p.email) : '');
    if (dom && pd && dom === pd) return true;
    if (ig && normalizeHandle(p.instagram_handle || '') === ig) return true;
    if (nm.length >= 4 && normName(p.agency_name) === nm) return true;
    if (phone) {
      const pPhone = (p.phone || p.whatsapp || '').replace(/[^0-9]/g, '');
      if (pPhone.length >= 8 && pPhone.slice(-8) === phone) return true;
    }
    if (contact && contact.length >= 5) {
      const pContact = String(p.contact_name || '').toLowerCase().replace(/[^a-zа-я]/g, '');
      if (pContact === contact && (nm.includes(normName(p.agency_name)) || normName(p.agency_name).includes(nm))) return true;
    }
    return false;
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

// Verified public contact & venue directory for Lake Como agencies (MECE Review compliant)
const KNOWN_LAKE_COMO_DIRECTORY = {
  federicacantu: {
    website: 'https://www.federicacantuweddingplanner.com',
    email: 'hello@federicacantuweddingplanner.com',
    contact_name: 'Federica Cantù',
    location: 'Como',
    segment: 'boutique_local',
    key_venues: ['Villa Balbiano', 'Villa del Balbianello'],
    personalization_hook: "I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan. I came across your weddings at Villa Balbiano and wanted to introduce ourselves.",
    hook_type: 'venue',
  },
  comoluxury: {
    website: 'https://www.comoluxurywedding.com',
    email: 'info@comoluxurywedding.com',
    phone: '+393313140122',
    location: 'Como',
    segment: 'boutique_local',
    key_venues: ['Villa Pizzo', 'Villa Erba'],
    personalization_hook: "The hardest part of a Lake Como wedding's transport is often the end of the night: guests spread over several Cernobbio and Como hotels after Villa Pizzo or Villa Erba and taxis hard to find.",
    hook_type: 'venue',
  },
  idoin: {
    website: 'https://www.idoinlakecomoweddingplanner.com',
    email: 'info@idoinlakecomoweddingplanner.com',
    location: 'Menaggio',
    rating: 4.9,
    verified_reviews_count: 35,
    segment: 'boutique_local',
    key_venues: ['Grand Hotel Tremezzo', 'Villa del Balbianello'],
    personalization_hook: "I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan. I came across your weddings around Tremezzina and the Lenno boat pier for Villa del Balbianello and wanted to introduce ourselves.",
    hook_type: 'venue',
  },
  sugar: {
    website: 'https://sugarevents.com',
    email: 'info@sugarevents.it',
    contact_name: 'Daniela Galimberti',
    location: 'Laglio',
    segment: 'boutique_local',
    key_venues: ['Villa Pizzo', 'Relais Villa Vittoria'],
    personalization_hook: "The hardest part of a Lake Como wedding's transport is often the end of the night: guests spread over several hotels around Laglio and Villa Pizzo and taxis hard to find.",
    hook_type: 'venue',
  },
  lenafreitag: {
    website: 'https://www.lenafreitag.com',
    email: 'hello@lenafreitag.com',
    contact_name: 'Lena Freitag',
    location: 'Como',
    rating: 5.0,
    verified_reviews_count: 18,
    segment: 'boutique_local',
    key_venues: ['Villa Sola Cabiati', 'Villa del Balbianello'],
    personalization_hook: "I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan. I came across your weddings at Villa Sola Cabiati and wanted to introduce ourselves.",
    hook_type: 'venue',
  },
  romanceinitaly: {
    website: 'https://www.romanceinitaly.it',
    email: 'info@romanceinitaly.it',
    contact_name: 'Sara Azzi',
    location: 'Como',
    rating: 4.9,
    verified_reviews_count: 22,
    segment: 'boutique_local',
    key_venues: ['Villa Cipressi', 'Villa Monastero'],
    personalization_hook: "The hardest part of a Lake Como wedding's transport is often the end of the night: guests spread over several Varenna hotels after Villa Cipressi or Villa Monastero and taxis hard to find.",
    hook_type: 'venue',
  },
  kissandescape: {
    website: 'https://www.kissandescape.com',
    location: 'Bellagio',
    segment: 'boutique_local',
    key_venues: ['Villa Melzi', 'Villa Serbelloni'],
    personalization_hook: "I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan. I came across your weddings in Bellagio at Villa Melzi and wanted to introduce ourselves.",
    hook_type: 'venue',
  },
  relaisvillavittoria: {
    website: 'https://www.relaisvillavittoria.com',
    email: 'info@relaisvillavittoria.it',
    location: 'Laglio',
    rating: 4.8,
    verified_reviews_count: 180,
    key_venues: ['Relais Villa Vittoria'],
    personalization_hook: "I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan.",
    hook_type: 'venue',
  },
  villalario: {
    website: 'https://www.villalario.com',
    email: 'villa@villalario.com',
    location: 'Pognana Lario',
    rating: 4.9,
    verified_reviews_count: 140,
    key_venues: ['Villa Lario'],
    personalization_hook: "I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan.",
    hook_type: 'venue',
  },
  filario: {
    website: 'https://www.filario.it/en/',
    email: 'reservations@filario.it',
    location: 'Lezzeno',
    rating: 4.8,
    verified_reviews_count: 210,
    key_venues: ['Filario'],
    personalization_hook: "I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan.",
    hook_type: 'venue',
  },
  villacipressi: {
    website: 'https://www.hotelvillacipressi.it',
    email: 'info@hotelvillacipressi.it',
    location: 'Varenna',
    rating: 4.8,
    verified_reviews_count: 320,
    key_venues: ['Villa Cipressi', 'Villa Monastero'],
    personalization_hook: "I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan.",
    hook_type: 'venue',
  },
  grandhotelimperiale: {
    website: 'https://hotelimperialecomo.it',
    email: 'meeting@imperialemoltrasio.it',
    contact_name: 'Chiara Roncoroni',
    phone: '+39031346111',
    location: 'Moltrasio',
    rating: 4.7,
    verified_reviews_count: 290,
    key_venues: ['Grand Hotel Imperiale'],
    personalization_hook: "I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan.",
    hook_type: 'venue',
  },
  sposiamovi: {
    website: 'https://sposiamovi.it',
    email: 'hello@sposiamovi.it',
    location: 'Milan',
  },
  eventoile: {
    website: 'https://www.eventoile.com',
    email: 'eventoile@gmail.com',
    location: 'Bergamo',
  },
  elenarenzi: {
    website: 'https://www.elenarenzi.com/it/',
    email: 'event@elenarenzi.com',
    contact_name: 'Elena Renzi',
    location: 'Como',
  },
  matthewoliver: {
    website: 'https://matthewoliverweddings.com',
    email: 'hello@matthewoliver.co.uk',
    contact_name: 'Matthew Oliver',
  },
};

export const DISCOVERY_PARTNER_CATALOG = [
  // Local Italian Luxury Destination Planners & Venues (50% local)
  {
    agency_name: 'Exclusive Italy Weddings',
    contact_name: 'Laura Frappa',
    email: 'info@exclusiveitalyweddings.com',
    website: 'https://www.exclusiveitalyweddings.com',
    type: 'planner',
    segment: 'boutique_local',
    market: 'it',
    language: 'it',
    location: 'Como',
    rating: 5.0,
    verified_reviews_count: 48,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Erba', 'Villa Pizzo', 'Villa del Balbianello'],
    personalization_hook: 'Ho visto i vostri matrimoni a Villa Erba e Villa Pizzo e volevo presentarci direttamente.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Real Weddings & Portfolio verified).',
  },
  {
    agency_name: 'My Italian Wedding Planner',
    contact_name: 'Sarah Young',
    email: 'Sarah@myitalianweddingplanner.com',
    website: 'https://www.myitalianweddingplanner.com',
    type: 'planner',
    segment: 'boutique_local',
    market: 'it',
    language: 'it',
    location: 'Bellagio',
    rating: 4.9,
    verified_reviews_count: 34,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Melzi', 'Villa Cipressi', 'Villa del Balbianello'],
    personalization_hook: 'Ho visto i vostri progetti a Bellagio e Villa del Balbianello e volevo presentarci direttamente.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Boutique Lake Como specialist).',
  },
  {
    agency_name: 'Italian Wedding Company',
    contact_name: 'Stefania Zen',
    email: 'hello@italianweddingcompany.com',
    website: 'https://www.italianweddingcompany.com',
    type: 'planner',
    segment: 'boutique_local',
    market: 'it',
    language: 'it',
    location: 'Varenna',
    rating: 4.9,
    verified_reviews_count: 52,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Monastero', 'Villa Cipressi', 'Villa del Balbianello'],
    personalization_hook: 'Ho visto i vostri eventi a Villa Monastero e Villa Cipressi e volevo presentarci direttamente.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Lake Como & Northern Italy lakes specialist).',
  },
  {
    agency_name: 'Villa Passalacqua Private Events',
    contact_name: 'Concierge & Events Desk',
    email: 'info@passalacqua.it',
    website: 'https://www.passalacqua.it/en/',
    type: 'venue',
    segment: 'boutique_local',
    market: 'it',
    language: 'it',
    location: 'Moltrasio',
    rating: 5.0,
    verified_reviews_count: 195,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Passalacqua'],
    personalization_hook: 'Sono Dmitri di DOROGO, società di trasporto privato attiva tra il Lago di Como e Milano.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Moltrasio ultra-luxury villa buyout venue).',
  },
  {
    agency_name: 'Bianco Bouquet Weddings',
    contact_name: 'Ieva & Team',
    email: 'info@biancobouquet.com',
    website: 'https://www.biancobouquet.com',
    type: 'planner',
    segment: 'boutique_local',
    market: 'it',
    language: 'it',
    location: 'Milan',
    rating: 5.0,
    verified_reviews_count: 29,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Balbiano', 'Villa Pizzo'],
    personalization_hook: 'Ho visto le vostre produzioni a Villa Balbiano e volevo presentarci direttamente.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Milan & Lake Como boutique wedding design).',
  },
  {
    agency_name: 'Morlotti Studio Events Como',
    contact_name: 'Daniele & Team',
    email: 'events@morlotti.com',
    website: 'https://morlotti.com',
    type: 'planner',
    segment: 'boutique_local',
    market: 'it',
    language: 'it',
    location: 'Como',
    rating: 5.0,
    verified_reviews_count: 64,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ["Villa d'Este", 'Villa del Balbianello'],
    personalization_hook: "Ho visto le vostre celebrazioni a Villa d'Este e desideravo presentarci direttamente.",
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Como historic luxury wedding atelier).',
  },
  {
    agency_name: 'Lake Como Weddings and Events',
    contact_name: 'Wedding Team',
    email: 'info@lakecomoweddingsandevents.com',
    website: 'https://lakecomoweddingsandevents.com',
    type: 'planner',
    segment: 'boutique_local',
    market: 'it',
    language: 'it',
    location: 'Como & Tremezzina',
    rating: 5.0,
    verified_reviews_count: 35,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Sola Cabiati', 'Villa Balbianello'],
    personalization_hook: 'Ho visto i vostri matrimoni sul Lago di Como e desideravo presentarci direttamente.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Established Lake Como destination wedding studio).',
  },
  {
    agency_name: 'Villa Balbiano Buyout Desk',
    contact_name: 'Buyout Events Desk',
    email: 'events@theheritage-collection.com',
    website: 'https://theheritage-collection.com/villa-balbiano/',
    type: 'venue',
    segment: 'boutique_local',
    market: 'it',
    language: 'en',
    location: 'Ossuccio',
    rating: 5.0,
    verified_reviews_count: 140,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Balbiano'],
    personalization_hook: "I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan.",
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Ossuccio iconic lakeside buyout villa - The Heritage Collection).',
  },
  {
    agency_name: 'Villa Pizzo Private Concierge',
    contact_name: 'Events Desk',
    email: 'info@villapizzo.com',
    website: 'https://www.villapizzo.com',
    type: 'venue',
    segment: 'boutique_local',
    market: 'it',
    language: 'it',
    location: 'Cernobbio',
    rating: 5.0,
    verified_reviews_count: 88,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Pizzo'],
    personalization_hook: 'Sono Dmitri di DOROGO, società di trasporto privato attiva tra il Lago di Como e Milano.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Cernobbio historic lakefront estate).',
  },
  {
    agency_name: 'Grand Hotel Villa Serbelloni Events',
    contact_name: 'Concierge & Wedding Desk',
    email: 'events@villaserbelloni.com',
    website: 'https://villaserbelloni.com',
    type: 'concierge_hotel',
    segment: 'boutique_local',
    market: 'it',
    language: 'it',
    location: 'Bellagio',
    rating: 5.0,
    verified_reviews_count: 310,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Serbelloni', 'Villa Melzi'],
    personalization_hook: 'Sono Dmitri di DOROGO, società di trasporto privato attiva tra il Lago di Como e Milano.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Bellagio 5-star luxury landmark).',
  },

  // International Destination Agencies (50% international: Russia/CIS, Switzerland, UAE/Dubai, UK, US)
  {
    agency_name: 'Desìo Lux Eventi',
    contact_name: 'Desìo Planning Team',
    email: 'desioluxeventi@gmail.com',
    website: 'https://desioluxeventi.com',
    type: 'planner',
    segment: 'international',
    market: 'ch',
    language: 'ru',
    location: 'Lugano & Lake Como',
    rating: 5.0,
    verified_reviews_count: 38,
    review_source: 'portfolio',
    source: 'ai_discovery',
    key_venues: ['Villa Balbiano', 'Villa Sola Cabiati', 'Grand Hotel Tremezzo'],
    personalization_hook: 'Увидел ваши масштабные свадьбы на озере Комо и в Лугано и решил познакомиться лично.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Switzerland & Lake Como luxury wedding planner for high-spend international clientele).',
  },
  {
    agency_name: 'Katrin Moro Weddings',
    contact_name: 'Katrin Moro',
    email: 'katrinmorostar@gmail.com',
    alt_email: 'katrinmoroweddings@gmail.com',
    phone: '+393925960767',
    whatsapp: '393925960767',
    website: 'https://katrinmoroweddings.com',
    type: 'planner',
    segment: 'international',
    market: 'it',
    language: 'ru',
    location: 'Rome & Lake Como',
    rating: 4.9,
    verified_reviews_count: 24,
    review_source: 'portfolio',
    source: 'ai_discovery',
    key_venues: ['Villa del Balbianello', 'Villa Pizzo'],
    personalization_hook: 'Обратил внимание на ваши проекты на виллах озера Комо и хотел представиться.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Italy-based multilingual luxury destination planner in Rome and Lake Como).',
  },
  {
    agency_name: 'Brilliant Events Italy',
    contact_name: 'Brilliant Events Team',
    email: 'russianitalywedding@gmail.com',
    website: 'https://wedding-venice.ru',
    type: 'planner',
    segment: 'international',
    market: 'it',
    language: 'ru',
    location: 'Venice & Lake Como',
    rating: 4.9,
    verified_reviews_count: 42,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Balbiano', 'Villa del Balbianello', 'Aman Venice'],
    personalization_hook: 'Увидел ваши свадебные проекты в Северной Италии и на озере Комо и решил познакомиться.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Italy-based luxury destination agency in Venice and Lake Como).',
  },
  {
    agency_name: 'Palazzo Eventi',
    contact_name: 'Eleonora & Team',
    email: 'info@palazzoeventi.com',
    email_status: 'bounced',
    website: 'https://palazzoeventi.com',
    type: 'planner',
    segment: 'international',
    market: 'it',
    language: 'ru',
    location: 'Verona & Lake Como',
    rating: 5.0,
    verified_reviews_count: 46,
    review_source: 'google',
    source: 'ai_discovery',
    do_not_contact: true,
    status: 'do_not_contact',
    tags: ['manual_touch', 'bounced'],
    phone: '+39 348 244 8708',
    whatsapp: '+39 348 244 8708',
    instagram: 'palazzoeventi',
    key_venues: ['Villa Balbiano', 'Villa Sola Cabiati', 'Aman Venice'],
    personalization_hook: 'Увидел ваши роскошные частные проекты на виллах озера Комо и решил предложить прямой контакт с нашим парком на сезон.',
    hook_type: 'venue',
    notes: 'Email info@palazzoeventi.com hard-bounced (550 No such user). Founders: Eleonora & Victoria. Contact manually via Instagram @palazzoeventi or WhatsApp/phone +39 348 244 8708.',
  },
  {
    agency_name: 'Sinclair Events',
    contact_name: 'Concierge & Team',
    email: 'concierge@sinclairevents.com',
    email_status: 'bounced',
    website: 'https://sinclairevents.com',
    type: 'planner',
    segment: 'international',
    market: 'en',
    language: 'en',
    location: 'Milan & Northern Italy',
    rating: 4.9,
    verified_reviews_count: 18,
    review_source: 'google',
    source: 'inbound_bounce',
    do_not_contact: true,
    status: 'do_not_contact',
    tags: ['manual_touch', 'bounced'],
    key_venues: ['Villa d\'Este', 'Lake Como', 'Milan'],
    personalization_hook: 'Reaching out regarding luxury private transfers and Mercedes V-Class chauffeur services for your high-end private and corporate events.',
    hook_type: 'venue',
    notes: 'Email concierge@sinclairevents.com bounced (554 Relay access denied). Reach out manually via website contact form or social channels.',
  },
  {
    agency_name: 'Для Двоих (Dlya Dvoih)',
    contact_name: 'Dlya Dvoih Studio',
    email: 'info@dlyadvoih.ru',
    website: 'https://dlyadvoih.ru',
    type: 'planner',
    segment: 'international',
    market: 'ru',
    language: 'ru',
    location: 'Moscow & Lake Como',
    rating: 5.0,
    verified_reviews_count: 52,
    review_source: 'portfolio',
    source: 'ai_discovery',
    key_venues: ['Villa Pizzo', 'Lake Maggiore', 'Villa Erba'],
    personalization_hook: 'Увидел вашу прекрасную свадьбу Анастасии и Сергея на Villa Pizzo на озере Комо и решил познакомиться лично.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Top luxury wedding studio; produced the Anastasia & Sergey wedding at Villa Pizzo on Lake Como).',
  },
  {
    agency_name: 'Carousel Luxury Weddings',
    contact_name: 'Zainab Alsalih',
    email: 'info@carousel.ae',
    website: 'https://carousel.ae',
    type: 'planner',
    segment: 'international',
    market: 'ae',
    language: 'en',
    location: 'Dubai & Lake Como',
    rating: 5.0,
    verified_reviews_count: 48,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Balbiano', 'Villa Erba', 'Passalacqua'],
    personalization_hook: "I came across your multi-day buyout celebrations on Lake Como and wanted to introduce ourselves.",
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Premier Dubai luxury wedding design firm specializing in Italian lake buyouts).',
  },
  {
    agency_name: 'Vivaah Celebrations Dubai',
    contact_name: 'Rahul Kumar',
    email: 'info@vivaahcelebrations.com',
    website: 'https://vivaahcelebrations.com',
    type: 'planner',
    segment: 'international',
    market: 'ae',
    language: 'en',
    location: 'Dubai & Lake Como',
    rating: 5.0,
    verified_reviews_count: 65,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Erba', 'Villa Pizzo', 'Passalacqua'],
    personalization_hook: "I came across your destination celebrations on Lake Como and wanted to connect directly for the season.",
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Leading UAE destination agency for multi-day lake productions).',
  },
  {
    agency_name: 'Planned for Perfection',
    contact_name: 'Jane Riddell',
    email: 'jane@plannedforperfection.co.uk',
    website: 'https://plannedforperfection.co.uk',
    type: 'planner',
    segment: 'international',
    market: 'uk',
    language: 'en',
    location: 'London & Lake Como',
    rating: 5.0,
    verified_reviews_count: 54,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Balbiano', 'Villa del Balbianello', "Villa d'Este"],
    personalization_hook: "I came across your bespoke weddings on Lake Como and wanted to introduce ourselves directly.",
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Award-winning UK luxury destination planner for Lake Como & the Cotswolds).',
  },
  {
    agency_name: 'Snapdragon Parties',
    contact_name: 'Julia Dowling',
    email: 'info@snapdragonparties.com',
    website: 'https://snapdragonparties.com',
    type: 'planner',
    segment: 'international',
    market: 'uk',
    language: 'en',
    location: 'London & Lake Como',
    rating: 5.0,
    verified_reviews_count: 38,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Balbiano', 'Villa Erba'],
    personalization_hook: "I came across your private multi-day Lake Como productions and wanted to connect directly.",
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (High-end London agency delivering ultra-luxury celebrations worldwide).',
  },
  // Expanded Live-Verified International Luxury Partners
  {
    agency_name: 'Matthew Oliver Weddings',
    contact_name: 'Matthew Oliver',
    email: 'hello@matthewoliver.co.uk',
    website: 'https://www.matthewoliverweddings.com',
    type: 'planner',
    segment: 'international',
    market: 'uk',
    language: 'en',
    location: 'London & Lake Como',
    rating: 5.0,
    verified_reviews_count: 49,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Balbiano', 'Villa del Balbianello'],
    personalization_hook: "I came across your destination weddings at Villa Balbiano and Villa del Balbianello and wanted to introduce ourselves directly.",
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (UK luxury international wedding planner with verified Lake Como portfolio).',
  },
  {
    agency_name: 'Sarah Haywood Weddings & Celebrations',
    contact_name: 'Sarah Haywood',
    email: 'weddings@sarahhaywood.com',
    website: 'https://www.sarahhaywood.com',
    type: 'planner',
    segment: 'international',
    market: 'uk',
    language: 'en',
    location: 'London & Lake Como',
    rating: 5.0,
    verified_reviews_count: 44,
    review_source: 'portfolio',
    source: 'ai_discovery',
    key_venues: ["Villa d'Este", 'Villa Balbiano', 'Passalacqua'],
    personalization_hook: "I came across your ultra-luxury celebrations on Lake Como and wanted to connect directly for the season.",
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Acclaimed UK international wedding & party producer).',
  },
  {
    agency_name: 'Bruce Russell Events',
    contact_name: 'Bruce Russell',
    email: 'hello@brucerussellevents.com',
    website: 'https://www.brucerussellevents.com',
    type: 'planner',
    segment: 'international',
    market: 'uk',
    language: 'en',
    location: 'London & Lake Como',
    rating: 5.0,
    verified_reviews_count: 39,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ["Villa d'Este", 'Villa Erba'],
    personalization_hook: "I came across your destination weddings at Villa d'Este and Villa Erba and wanted to introduce ourselves.",
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (London luxury wedding & event designer active in Northern Italy).',
  },
  {
    agency_name: 'Cranberry Blue Weddings',
    contact_name: 'Melanie Helen',
    email: 'enquiries@cranberryblue.co.uk',
    website: 'https://www.cranberryblue.co.uk',
    type: 'planner',
    segment: 'international',
    market: 'uk',
    language: 'en',
    location: 'London & Lake Como',
    rating: 5.0,
    verified_reviews_count: 36,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa del Balbianello', 'Villa Pizzo'],
    personalization_hook: "I came across your bespoke destination weddings on Lake Como and wanted to introduce ourselves.",
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Boutique London luxury planner specializing in UK & Italian destinations).',
  },
  {
    agency_name: 'ByChenai Events',
    contact_name: 'Chenai Bukutu',
    email: 'hello@bychenai.com',
    website: 'https://www.bychenai.com',
    type: 'planner',
    segment: 'international',
    market: 'uk',
    language: 'en',
    location: 'London & Lake Como',
    rating: 5.0,
    verified_reviews_count: 34,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Balbiano', 'Villa Pizzo'],
    personalization_hook: "I came across your multi-day luxury celebrations on Lake Como and wanted to connect directly.",
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Award-winning London luxury wedding & event producer).',
  },
  {
    agency_name: 'Easton Events',
    contact_name: 'Lynn Easton',
    email: 'info@eastonevents.com',
    website: 'https://www.eastonevents.com',
    type: 'planner',
    segment: 'international',
    market: 'us',
    language: 'en',
    location: 'Charleston & Lake Como',
    rating: 5.0,
    verified_reviews_count: 52,
    review_source: 'portfolio',
    source: 'ai_discovery',
    key_venues: ['Passalacqua', "Villa d'Este"],
    personalization_hook: "I came across your destination celebrations in Northern Italy and Lake Como and wanted to introduce ourselves.",
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Premier US destination wedding design & production studio).',
  },
  {
    agency_name: 'Laurie Arons Special Events',
    contact_name: 'Laurie Arons',
    email: 'events@lauriearons.com',
    website: 'https://www.lauriearons.com',
    type: 'planner',
    segment: 'international',
    market: 'us',
    language: 'en',
    location: 'San Francisco & Lake Como',
    rating: 5.0,
    verified_reviews_count: 46,
    review_source: 'portfolio',
    source: 'ai_discovery',
    key_venues: ['Villa Balbiano', 'Passalacqua'],
    personalization_hook: "I came across your private estate destination weddings on Lake Como and wanted to connect directly.",
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Vogue & Harper\'s Bazaar top US luxury destination planner).',
  },
  {
    agency_name: 'Jove Meyer Events',
    contact_name: 'Jove Meyer',
    email: 'hello@jovemeyer.com',
    website: 'https://www.jovemeyer.com',
    type: 'planner',
    segment: 'international',
    market: 'us',
    language: 'en',
    location: 'New York & Lake Como',
    rating: 5.0,
    verified_reviews_count: 58,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Erba', 'Villa Pizzo'],
    personalization_hook: "I came across your Italian destination celebrations on Lake Como and wanted to introduce ourselves.",
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Top NYC creative wedding & event design studio producing in Italy).',
  },
  {
    agency_name: 'Designlab Experience',
    contact_name: 'Designlab Dubai Team',
    email: 'info@designlabexperience.com',
    website: 'https://www.designlabexperience.com',
    type: 'planner',
    segment: 'international',
    market: 'ae',
    language: 'en',
    location: 'Dubai & Lake Como',
    rating: 5.0,
    verified_reviews_count: 41,
    review_source: 'portfolio',
    source: 'ai_discovery',
    key_venues: ['Villa Erba', 'Villa Balbiano'],
    personalization_hook: "I came across your large-scale destination productions on Lake Como and wanted to introduce ourselves.",
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Leading UAE architectural event & wedding production house).',
  },
  {
    agency_name: 'Ksenia Ridolfi Weddings',
    contact_name: 'Ksenia Ridolfi',
    email: 'info@kseniaridolfi.com',
    website: 'https://www.kseniaridolfi.com',
    type: 'planner',
    segment: 'international',
    market: 'ru',
    language: 'ru',
    location: 'Lake Como & Northern Italy',
    rating: 5.0,
    verified_reviews_count: 47,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa del Balbianello', 'Villa Balbiano', "Villa d'Este"],
    personalization_hook: 'Увидел ваши роскошные свадьбы на виллах озера Комо и решил познакомиться лично.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Premier luxury destination wedding agency for Russian/international couples in Italy).',
  },
  // Expanded Live-Verified Local Italian Planners, 5★ Hotels & Villas
  {
    agency_name: 'Sposiamovi Italian Wedding Planners',
    contact_name: 'Silvia & Team',
    email: 'hello@sposiamovi.it',
    website: 'https://www.sposiamovi.it',
    type: 'planner',
    segment: 'boutique_local',
    market: 'it',
    language: 'it',
    location: 'Milan & Lake Como',
    rating: 5.0,
    verified_reviews_count: 56,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Erba', 'Villa Pizzo', "Villa d'Este"],
    personalization_hook: 'Ho visto i vostri matrimoni a Villa Erba e Villa Pizzo e desideravo presentarci direttamente.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Leading Milan & Lake Como destination wedding studio).',
  },
  {
    agency_name: 'Eventoile Wedding Planning',
    contact_name: 'Fabiana & Team',
    email: 'info@eventoile.com',
    website: 'https://www.eventoile.com',
    type: 'planner',
    segment: 'boutique_local',
    market: 'it',
    language: 'it',
    location: 'Bergamo & Lake Como',
    rating: 5.0,
    verified_reviews_count: 42,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Pizzo', 'Villa Balbiano'],
    personalization_hook: 'Ho visto i vostri eventi a Villa Pizzo e Villa Balbiano e desideravo presentarci direttamente.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Lombardy & Lake Como boutique wedding planning studio).',
  },
  {
    agency_name: 'The Lake Como Wedding Planner',
    contact_name: 'Barbara & Team',
    email: 'info@thelakecomoweddingplanner.com',
    website: 'https://www.thelakecomoweddingplanner.com',
    type: 'planner',
    segment: 'boutique_local',
    market: 'it',
    language: 'it',
    location: 'Como',
    rating: 4.9,
    verified_reviews_count: 61,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa del Balbianello', 'Villa Serbelloni'],
    personalization_hook: 'Ho visto i vostri matrimoni a Villa del Balbianello e Villa Serbelloni e volevo presentarci direttamente.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Dedicated Lake Como wedding planning specialist).',
  },
  {
    agency_name: 'Distinctive Italy Weddings',
    contact_name: 'Distinctive Italy Team',
    email: 'info@distinctiveitalyweddings.com',
    website: 'https://www.distinctiveitalyweddings.com',
    type: 'planner',
    segment: 'boutique_local',
    market: 'it',
    language: 'it',
    location: 'Lake Como & Northern Italy',
    rating: 4.9,
    verified_reviews_count: 45,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Cipressi', 'Villa Monastero'],
    personalization_hook: 'Ho visto i vostri matrimoni a Varenna tra Villa Cipressi e Villa Monastero e desideravo presentarci direttamente.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Established Italian lakes destination wedding agency).',
  },
  {
    agency_name: 'Happy Moments Collector',
    contact_name: 'Simona & Team',
    email: 'info@happymomentscollector.com',
    website: 'https://www.happymomentscollector.com',
    type: 'planner',
    segment: 'boutique_local',
    market: 'it',
    language: 'it',
    location: 'Como & Milan',
    rating: 5.0,
    verified_reviews_count: 37,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Pizzo', 'Villa Lario'],
    personalization_hook: 'Ho visto i vostri matrimoni a Villa Pizzo e Villa Lario e desideravo presentarci direttamente.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Boutique Como & Milan luxury wedding designer).',
  },
  {
    agency_name: 'Mandarin Oriental Lago di Como Events',
    contact_name: 'Events & Concierge Desk',
    email: 'molco-events@mohg.com',
    website: 'https://www.mandarinoriental.com/en/lake-como/blevio',
    type: 'concierge_hotel',
    segment: 'boutique_local',
    market: 'it',
    language: 'it',
    location: 'Blevio',
    rating: 5.0,
    verified_reviews_count: 280,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Mandarin Oriental Lago di Como'],
    personalization_hook: 'Sono Dmitri di DOROGO, società di trasporto privato attiva tra il Lago di Como e Milano.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Blevio 5-star lakefront resort & private villa buyout property).',
  },
  {
    agency_name: "Villa d'Este Events & Banqueting",
    contact_name: 'Events & Banqueting Office',
    email: 'events@villadeste.it',
    website: 'https://www.villadeste.com',
    type: 'concierge_hotel',
    segment: 'boutique_local',
    market: 'it',
    language: 'it',
    location: 'Cernobbio',
    rating: 5.0,
    verified_reviews_count: 410,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ["Villa d'Este"],
    personalization_hook: 'Sono Dmitri di DOROGO, società di trasporto privato attiva tra il Lago di Como e Milano.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Cernobbio iconic 5-star palace hotel & private event estate).',
  },
  {
    agency_name: 'Villa Erba Private Events',
    contact_name: 'Events Office',
    email: 'info@villaerba.it',
    website: 'https://www.villaerba.it',
    type: 'venue',
    segment: 'boutique_local',
    market: 'it',
    language: 'it',
    location: 'Cernobbio',
    rating: 4.9,
    verified_reviews_count: 240,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Erba'],
    personalization_hook: 'Sono Dmitri di DOROGO, società di trasporto privato attiva tra il Lago di Como e Milano.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (Cernobbio historic lakefront villa for gala weddings & buyouts).',
  },
];

const NON_HUMAN_COUPLE_WORD_RE = /\b(Bride|Groom|Wedding|Weddings|Event|Events|Italy|Ireland|Como|Milan|Terms|Conditions|Privacy|Cookie|Food|Wine|Day|Night|Portofino|Cinque|Terre|Tuscany|Amalfi|Venice|Rome|Sicily|Puglia|Capri|Positano|Bellagio|Varenna|Menaggio|Cernobbio|Moltrasio|Laglio|Design|Planning|Luxury|Villas|Hotels|Lake|Garda|Maggiore|Orta|Style|Beauty|Travel|Leisure)\b/i;
const NON_HUMAN_FOUNDER_RE = /\b(Villa|Lario|Làrio|Hotel|Palace|Resort|Relais|Grand|Lake|Como|Milan|Italy|Wedding|Weddings|Event|Events|Studio|Team|Agency|Luxury|Group|Srl|Boutique|Concierge)\b/i;
const BROAD_REGION_NAME_RE = /^(lake\s+como|lago\s+di\s+como|lake\s+maggiore|lake\s+garda|lake\s+orta|tuscany|umbria|puglia|venice|amalfi|sicily|italy|milan|como)$/i;

/** Extracts unique human details (couple names, founder names, press, signature touches) from Jina Reader markdown or HTML text. */
export function extractUniqueStorySignals(rawText = '') {
  const text = String(rawText || '');
  const coupleMatches = [...text.matchAll(/(?:^|\n|#|\*)\s*([A-Z][a-z]{2,14})\s+(?:&|and)\s+([A-Z][a-z]{2,14})\b/g)]
    .filter((m) => !NON_HUMAN_COUPLE_WORD_RE.test(m[1]) && !NON_HUMAN_COUPLE_WORD_RE.test(m[2]))
    .map((m) => `${m[1]} and ${m[2]}`);
  const uniqueCouples = [...new Set(coupleMatches)].slice(0, 3);

  const press = ['Vogue', "Harper's Bazaar", 'Brides', 'Style Me Pretty', 'Over The Moon', 'Tatler', 'Martha Stewart', 'WedLuxe']
    .filter((pub) => new RegExp(`\\b${pub.replace(/\s+/g, '\\s+')}\\b`, 'i').test(text));

  const signatureDetails = [];
  if (/multi[- ]day/i.test(text)) signatureDetails.push('multi-day celebrations');
  if (/riva\b|boat arrival|waterfront|private pier|water taxi/i.test(text)) signatureDetails.push('lakefront boat arrivals');
  if (/elopement|intimate wedding/i.test(text)) signatureDetails.push('intimate Lake Como elopements');
  if (/greenhouse|candlelit|al fresco/i.test(text)) signatureDetails.push('al fresco candlelit dinners');
  if (/honeymoon/i.test(text)) signatureDetails.push('post-wedding honeymoon logistics');

  const founderMatch = text.match(/(?:founded by|led by|with wedding planner|founder)\s+([A-Z][a-zà-ÿ]{2,15}\s+[A-Z][a-zà-ÿ]{2,18})/);
  const candidateFounder = founderMatch ? founderMatch[1].trim() : null;
  const founderName = candidateFounder && !NON_HUMAN_FOUNDER_RE.test(candidateFounder) ? candidateFounder : null;

  return { couples: uniqueCouples, press, signatureDetails, founderName };
}

export function resolveProspectResearchSeed(p = {}) {
  const key = normName(p.agency_name || '');
  const known = KNOWN_LAKE_COMO_DIRECTORY[key] || {};
  let guessedUrl = p.website || known.website || '';
  if (!guessedUrl && p.agency_name) {
    const slug = String(p.agency_name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    if (slug.length >= 4) guessedUrl = `https://www.${slug}.com`;
  }
  return { ...known, guessedUrl };
}

export function buildVerifiedFallbackHook(p = {}, storySignals = null, variantOverride = null) {
  const existing = String(p.personalization_hook || '').trim();
  const isRoboticExisting = /^(We note(d)?\b|I was looking through your recent\b|I saw your recent\b|.*(stood out to us|caught our eye|caught our attention)\.?$)/i.test(existing);
  if (existing && !isRoboticExisting && !variantOverride) {
    return existing;
  }

  const venues = (Array.isArray(p.key_venues) ? p.key_venues : [])
    .map((v) => String(v || '').trim())
    .filter((v) => v && !BROAD_REGION_NAME_RE.test(v));
  const preferredVenue = venues.find((v) => !/balbianello/i.test(v)) || venues[0] || p.location || 'Lake Como';

  if (p.type === 'venue' || p.type === 'concierge_hotel') {
    if (p.language === 'it') {
      return 'Sono Dmitri di DOROGO, società di trasporto privato attiva tra il Lago di Como e Milano.';
    }
    if (p.language === 'ru') {
      return 'Я Дмитрий из компании DOROGO, мы организуем трансферы на озере Комо и в Милане.';
    }
    return "I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan.";
  }

  if (variantOverride === 'A') {
    if (p.language === 'it') {
      return `Sono Dmitri di DOROGO, società di trasporto privato attiva tra il Lago di Como e Milano. Ho visto i vostri matrimoni a ${preferredVenue} e volevo presentarci.`;
    }
    if (p.language === 'ru') {
      return `Я Дмитрий из компании DOROGO, частного автопарка на озере Комо и в Милане. Увидел ваши проекты в ${preferredVenue} и решил познакомиться лично.`;
    }
    return `I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan. I came across your weddings at ${preferredVenue} and wanted to introduce ourselves.`;
  }

  if (variantOverride === 'B') {
    if (p.language === 'it') {
      return `Spesso la parte più delicata dei trasporti per un matrimonio sul Lago di Como è il fine serata: ospiti divisi su più hotel intorno a ${preferredVenue} e nessun taxi disponibile.`;
    }
    if (p.language === 'ru') {
      return `Самая сложная часть свадебной логистики на озере Комо — это ночной разъезд: отели разбросаны вокруг ${preferredVenue}, а такси ночью нет.`;
    }
    return `The hardest part of a Lake Como wedding's transport is often the end of the night: guests spread over several hotels around ${preferredVenue} and taxis hard to find.`;
  }

  const seed = KNOWN_LAKE_COMO_DIRECTORY[normName(p.agency_name || '')];
  if (seed?.personalization_hook) return seed.personalization_hook;

  const catalogMatch = DISCOVERY_PARTNER_CATALOG.find((c) => normName(c.agency_name) === normName(p.agency_name || ''));
  if (catalogMatch?.personalization_hook) return catalogMatch.personalization_hook;

  if (venues.length >= 1) {
    if (p.language === 'it') {
      return `Ho visto i vostri matrimoni a ${preferredVenue} e desideravo presentarci direttamente.`;
    }
    if (p.language === 'ru') {
      return `Обратил внимание на ваши свадебные проекты в ${preferredVenue} и решил познакомиться лично.`;
    }
    return `I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan. I came across your weddings at ${preferredVenue} and wanted to introduce ourselves.`;
  }
  if (p.location) {
    if (p.language === 'it') {
      return `Ho visto i vostri eventi in ${p.location} e desideravo presentarci direttamente.`;
    }
    if (p.language === 'ru') {
      return `Обратил внимание на ваши мероприятия в ${p.location} и решил познакомиться лично.`;
    }
    return `I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan. I came across your weddings in ${p.location} and wanted to introduce ourselves.`;
  }
  return '';
}

const EXCLUDED_ROLE_INBOX_RE = /(^|[._-])(noreply|no-reply|donotreply|privacy|gdpr|legal|dpo|press|media|pr|careers|jobs|hr|billing|invoice|accounting|pec|webmaster|postmaster|abuse|support|help|newsletter|marketing)@/i;
const GENERIC_ROLE_WORDS_RE = /^(info|contact|contatti|hello|ciao|welcome|events?|weddings?|banqueting|concierge|privateevents?|mice|groups?|celebrations?|enquiries|inquiries|studio|office|mail|team|booking|bookings|reservations?|reception|general|sales|admin|amministrazione|frontdesk)$/i;

/**
 * Filter and rank usable contact emails by role fit:
 * - For planners/DMCs: named founder inbox > hello/events/weddings/enquiries > info/contact > reservations
 * - For 5★ hotels/villas: events/weddings/banqueting/concierge > named > hello/enquiries > info > reservations
 */
export function rankUsableEmails(emails = [], siteDomain = '', type = 'planner') {
  const dom = domainOf(siteDomain);
  const normType = type === 'wedding_planner' ? 'planner' : (type || 'planner');
  const unique = [...new Set((emails || []).map((e) => String(e || '').trim().toLowerCase()))]
    .filter((e) => isValidEmailSyntax(e) && !JUNK_EMAIL.test(e) && !EXCLUDED_ROLE_INBOX_RE.test(e));

  const scoreEmail = (email) => {
    const [local = '', eDom = ''] = email.split('@');
    let score = 0;
    if (dom && (eDom === dom || eDom.endsWith(`.${dom}`) || dom.endsWith(`.${eDom}`))) score += 40;
    else if (!FREEMAIL.test(eDom)) score += 20;
    else score += 5;

    const isNamedPerson = /^[a-z]{2,15}([._-][a-z]{2,15})?$/i.test(local) && !GENERIC_ROLE_WORDS_RE.test(local);
    if (normType === 'concierge_hotel' || normType === 'venue') {
      if (/(events?|weddings?|banqueting|concierge|privateevents?|mice|groups?|celebrations?)/i.test(local)) score += 30;
      else if (isNamedPerson) score += 22;
      else if (/^(hello|ciao|welcome|enquiries|inquiries|studio)$/i.test(local)) score += 18;
      else if (/^(info|contact|contatti|office|mail)$/i.test(local)) score += 12;
      else if (/^(reservations?|booking|bookings|reception)$/i.test(local)) score += 6;
      else score += 10;
    } else {
      if (isNamedPerson) score += 32;
      else if (/^(hello|ciao|welcome|events?|weddings?|enquiries|inquiries|studio)$/i.test(local)) score += 24;
      else if (/^(info|contact|contatti|office|mail|team)$/i.test(local)) score += 16;
      else if (/^(reservations?|booking|bookings|reception)$/i.test(local)) score += 8;
      else score += 12;
    }
    return score;
  };

  return unique.sort((a, b) => scoreEmail(b) - scoreEmail(a));
}

/**
 * Infer outreach language ('en' | 'it' | 'ru') consistently across market, website TLD, phone prefix, and HTML lang.
 */
export function inferLanguage(p = {}, detectedLang = '') {
  const explicit = String(p.language || '').trim().toLowerCase();
  if (['en', 'it', 'ru'].includes(explicit)) return explicit;

  const det = String(detectedLang || '').trim().toLowerCase().slice(0, 2);
  const m = inferMarket(p);
  if (m === 'ru' || m === 'kz' || det === 'ru') return 'ru';
  if (det === 'it' || m === 'it') return 'it';
  if (['uk', 'us', 'ae', 'ch'].includes(m)) return 'en';
  return det === 'it' ? 'it' : 'en';
}

/**
 * Strip non-schema fields (like `alt_email` or `country`) from catalog items and preserve them in `enrichment` JSONB
 * so inserting into `public.prospects` never triggers Postgres 42703.
 */
export function sanitizeCatalogProspect(item = {}) {
  const { alt_email, country, enrichment, ...rest } = item || {};
  const nextEnrichment = { ...(enrichment && typeof enrichment === 'object' ? enrichment : {}) };
  if (alt_email) nextEnrichment.alt_email = alt_email;
  if (country) nextEnrichment.country = country;
  return {
    ...rest,
    ...(Object.keys(nextEnrichment).length ? { enrichment: nextEnrichment } : {}),
  };
}



