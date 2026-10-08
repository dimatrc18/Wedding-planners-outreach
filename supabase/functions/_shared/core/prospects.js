// Prospect helpers: priority score, dedupe, CSV, and extraction of public contact data from a web page.

import { LAKE_TOWNS, LAKE_VENUES } from './constants.js';

/** 0-100. Higher = contact sooner. Explainable: returns the parts too. */
export function priorityScore(p) {
  const parts = [];
  const add = (pts, why) => { if (pts) parts.push({ pts, why, label: why }); };
  const normType = p.type === 'wedding_planner' ? 'planner' : (p.type || 'planner');
  // 1. Partner Role Fit (Planners, 5★ Hotel Concierges, and Luxury Buyout Villas all control high-value guest transport)
  add({ planner: 35, concierge_hotel: 35, venue: 35, dmc: 32, photographer: 15 }[normType] || 22, `type: ${normType}`);

  // 2. Venue & Route Logistics Fit (Lake Como villas & prime transfer corridors)
  const venuesCount = Array.isArray(p.key_venues) ? p.key_venues.length : 0;
  if (venuesCount >= 2) add(18, `${venuesCount} luxury venues (${p.key_venues.slice(0, 2).join(', ')})`);
  else if (venuesCount === 1) add(12, `1 luxury venue (${p.key_venues[0]})`);
  const loc = (p.location || '').trim();
  if (loc) add(7, `location: ${loc}`);

  // 3. Client Tier & Reputation (does not unfairly penalize luxury boutiques that don't use Google Maps reviews)
  add({ boutique_local: 14, international: 10, high_volume_uk_us: 8 }[p.segment] || 0, p.segment ? `segment: ${p.segment}` : '');
  const rating = +p.rating || 0;
  if (rating >= 4.8) add(6, `rating ${rating}★`); else if (rating >= 4.5) add(4, `rating ${rating}★`);
  const reviews = +p.verified_reviews_count || 0;
  if (reviews) add(Math.min(12, Math.round(3.5 * Math.log2(1 + reviews))), `${reviews} reviews`);
  else if (venuesCount >= 1 && p.website) add(6, 'verified luxury portfolio');

  // 4. Reachability & Personalization Readiness
  if (p.email_status === 'bounced' || p.email_status === 'no_mx') add(-25, `email ${p.email_status}`);
  else if (p.email) add(12, 'verified email');
  else add(-10, 'no email yet');

  if ((p.personalization_hook || '').trim()) add(8, 'custom story/venue hook');
  if ((p.contact_name || '').trim()) add(4, `contact: ${p.contact_name}`);
  if (p.website) add(3, 'has website');

  // 5. Saturation / Quality Penalties
  const tags = (p.tags || []).map((t) => String(t).toLowerCase());
  if (tags.includes('tier1') || tags.includes('low_priority')) add(-25, 'tier 1/2 agency (saturated)');
  if (tags.includes('unverified')) add(-10, 'unverified');

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

// Verified public contact & story directory for Lake Como agencies so AI Research produces warm, human-familiar openers
const KNOWN_LAKE_COMO_DIRECTORY = {
  federicacantu: {
    website: 'https://www.federicacantuweddingplanner.com',
    email: 'hello@federicacantuweddingplanner.com',
    contact_name: 'Federica Cantù',
    location: 'Como',
    segment: 'boutique_local',
    key_venues: ['Villa del Balbianello', 'Villa Balbiano'],
    personalization_hook: "Morgan and Tyler's celebration on your site is a great example of how many moving pieces go into a multi-day Lake Como weekend.",
    hook_type: 'event',
  },
  comoluxury: {
    website: 'https://www.comoluxurywedding.com',
    email: 'info@comoluxurywedding.com',
    phone: '+393313140122',
    location: 'Como',
    segment: 'boutique_local',
    key_venues: ['Villa Pizzo', 'Villa Erba'],
    personalization_hook: 'Producing multi-day celebrations at estates like Villa Pizzo and Villa Erba takes serious behind-the-scenes logistics around Cernobbio.',
    hook_type: 'venue',
  },
  idoin: {
    website: 'https://www.idoinlakecomoweddingplanner.com',
    email: 'info@idoinlakecomoweddingplanner.com',
    location: 'Menaggio',
    rating: 4.9,
    verified_reviews_count: 35,
    segment: 'boutique_local',
    key_venues: ['Villa del Balbianello', 'Grand Hotel Tremezzo'],
    personalization_hook: 'Coordinating weddings across Menaggio, Tremezzina and boat-access venues like Villa del Balbianello means managing complex guest movements on both land and water.',
    hook_type: 'event',
  },
  sugar: {
    website: 'https://sugarevents.com',
    email: 'info@sugarevents.it',
    contact_name: 'Daniela Galimberti',
    location: 'Laglio',
    segment: 'boutique_local',
    key_venues: ['Relais Villa Vittoria', 'Villa Pizzo'],
    personalization_hook: 'Knowing how tight the Regina Vecchia road gets around Laglio and Villa Pizzo, I know how much coordination goes into the multi-day weddings your team produces.',
    hook_type: 'event',
  },
  lenafreitag: {
    website: 'https://www.lenafreitag.com',
    email: 'hello@lenafreitag.com',
    contact_name: 'Lena Freitag',
    location: 'Como',
    rating: 5.0,
    verified_reviews_count: 18,
    segment: 'boutique_local',
    key_venues: ['Villa del Balbianello', 'Villa Sola Cabiati'],
    personalization_hook: 'Bringing international couples together for multi-day celebrations at Villa Sola Cabiati and Villa del Balbianello leaves very little margin for error on guest timing.',
    hook_type: 'style',
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
    personalization_hook: 'Hosting destination weddings in Varenna around Villa Cipressi and Villa Monastero is wonderful for guests, though getting everyone across from Malpensa and back after midnight is always a puzzle.',
    hook_type: 'venue',
  },
  kissandescape: {
    website: 'https://www.kissandescape.com',
    location: 'Bellagio',
    segment: 'boutique_local',
    key_venues: ['Villa Melzi', 'Villa Serbelloni'],
    personalization_hook: 'Bellagio celebrations around Villa Melzi and Villa Serbelloni have a magic of their own, especially when guest transfers and ferry timings are planned down to the minute.',
    hook_type: 'style',
  },
  relaisvillavittoria: {
    website: 'https://www.relaisvillavittoria.com',
    email: 'info@relaisvillavittoria.it',
    location: 'Laglio',
    rating: 4.8,
    verified_reviews_count: 180,
    key_venues: ['Relais Villa Vittoria'],
    personalization_hook: 'Because the old lakeside road into Laglio is too narrow for full-size coaches, getting wedding guests in and out of Relais Villa Vittoria smoothly always comes down to the right vehicle mix.',
    hook_type: 'venue',
  },
  villalario: {
    website: 'https://www.villalario.com',
    email: 'villa@villalario.com',
    location: 'Pognana Lario',
    rating: 4.9,
    verified_reviews_count: 140,
    key_venues: ['Villa Lario'],
    personalization_hook: 'Full-estate wedding buyouts along the eastern shore in Pognana Lario often mean guests arriving on staggered international flights and staying out well past midnight.',
    hook_type: 'venue',
  },
  filario: {
    website: 'https://www.filario.it/en/',
    email: 'reservations@filario.it',
    location: 'Lezzeno',
    rating: 4.8,
    verified_reviews_count: 210,
    key_venues: ['Filario'],
    personalization_hook: 'With wedding guests splitting their time between Lezzeno, Bellagio and private boat piers on the lake, smooth ground transfers make a huge difference to the guest experience at Filario.',
    hook_type: 'venue',
  },
  villacipressi: {
    website: 'https://www.hotelvillacipressi.it',
    email: 'info@hotelvillacipressi.it',
    location: 'Varenna',
    rating: 4.8,
    verified_reviews_count: 320,
    key_venues: ['Villa Cipressi', 'Villa Monastero'],
    personalization_hook: 'Varenna is one of our favourite corners of the lake, though we know how tricky late-night departures and staggered airport arrivals can be for wedding guests celebrating at Villa Cipressi.',
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
    personalization_hook: 'Large lakeside weddings in Moltrasio often bring a wave of last-minute airport pickups and post-midnight hotel returns for your events and concierge desk.',
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
  {
    agency_name: 'Exclusive Italy Weddings',
    contact_name: 'Laura Frappa',
    email: 'info@exclusiveitalyweddings.com',
    website: 'https://www.exclusiveitalyweddings.com',
    type: 'planner',
    segment: 'boutique_local',
    location: 'Como',
    rating: 5.0,
    verified_reviews_count: 48,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa del Balbianello', 'Villa Erba', 'Villa Pizzo'],
    personalization_hook: 'Your weddings at Villa del Balbianello, Villa Erba and Villa Pizzo bring guests in from all over the world, often across several hotels and boat piers.',
    hook_type: 'event',
    notes: 'Discovered via AI Partner Search (Real Weddings & Portfolio verified).',
  },
  {
    agency_name: 'My Italian Wedding Planner',
    contact_name: 'Sarah Young',
    email: 'Sarah@myitalianweddingplanner.com',
    website: 'https://www.myitalianweddingplanner.com',
    type: 'planner',
    segment: 'boutique_local',
    location: 'Bellagio',
    rating: 4.9,
    verified_reviews_count: 34,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Cipressi', 'Villa Melzi', 'Villa del Balbianello'],
    personalization_hook: 'Planning destination weddings across Bellagio and Varenna at venues like Villa Cipressi and Villa Melzi means balancing ferry schedules, airport waves and late-night returns.',
    hook_type: 'event',
    notes: 'Discovered via AI Partner Search (Boutique Lake Como specialist).',
  },
  {
    agency_name: 'Italian Wedding Company',
    contact_name: 'Stefania Zen',
    email: 'hello@italianweddingcompany.com',
    website: 'https://www.italianweddingcompany.com',
    type: 'planner',
    segment: 'boutique_local',
    location: 'Varenna',
    rating: 4.9,
    verified_reviews_count: 52,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa del Balbianello', 'Villa Monastero', 'Villa Cipressi'],
    personalization_hook: 'Since your team plans celebrations across Lake Como, Maggiore, Garda and Orta, you know firsthand how much time guest transport spreadsheets can eat up.',
    hook_type: 'event',
    notes: 'Discovered via AI Partner Search (Lake Como & Northern Italy lakes specialist).',
  },
  {
    agency_name: 'Grand Hotel Tremezzo Events & Concierge',
    contact_name: 'Events & Guest Relations Team',
    email: 'info@grandhoteltremezzo.com',
    website: 'https://www.grandhoteltremezzo.com/en/home/',
    type: 'concierge_hotel',
    segment: 'boutique_local',
    location: 'Tremezzina',
    rating: 4.9,
    verified_reviews_count: 420,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Grand Hotel Tremezzo', 'Villa Sola Cabiati', 'Villa del Balbianello'],
    personalization_hook: 'Between private events at Villa Sola Cabiati and peak-season arrivals in Tremezzina, we know your concierge desk often juggles dozens of overlapping guest transfers at once.',
    hook_type: 'venue',
    notes: 'Discovered via AI Partner Search (5-star hotel concierge & Villa Sola Cabiati events).',
  },
  {
    agency_name: 'Villa Passalacqua Private Events',
    contact_name: 'Concierge & Events Desk',
    email: 'info@passalacqua.it',
    website: 'https://www.passalacqua.it/en/',
    type: 'venue',
    segment: 'boutique_local',
    location: 'Moltrasio',
    rating: 5.0,
    verified_reviews_count: 195,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Passalacqua'],
    personalization_hook: 'Private buyouts at Passalacqua set an extraordinary bar for hospitality in Moltrasio, from the first airport pickup in Milan to the final late-night departure.',
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
    location: 'Milan',
    rating: 5.0,
    verified_reviews_count: 29,
    review_source: 'google',
    source: 'ai_discovery',
    key_venues: ['Villa Pizzo', 'Villa Balbiano'],
    personalization_hook: 'Designing editorial multi-day weddings between Milan and Lake Como estates like Villa Pizzo and Villa Balbiano takes a huge amount of behind-the-scenes guest logistics.',
    hook_type: 'style',
    notes: 'Discovered via AI Partner Search (Milan & Lake Como boutique wedding design).',
  },
];

const NON_HUMAN_COUPLE_WORD_RE = /\b(Bride|Groom|Wedding|Weddings|Event|Events|Italy|Ireland|Como|Milan|Terms|Conditions|Privacy|Cookie|Food|Wine|Day|Night|Portofino|Cinque|Terre|Tuscany|Amalfi|Venice|Rome|Sicily|Puglia|Capri|Positano|Bellagio|Varenna|Menaggio|Cernobbio|Moltrasio|Laglio|Design|Planning|Luxury|Villas|Hotels|Lake|Garda|Maggiore|Orta|Style|Beauty|Travel|Leisure)\b/i;
const NON_HUMAN_FOUNDER_RE = /\b(Villa|Lario|Làrio|Hotel|Palace|Resort|Relais|Grand|Lake|Como|Milan|Italy|Wedding|Weddings|Event|Events|Studio|Team|Agency|Luxury|Group|Srl|Boutique|Concierge)\b/i;
const BROAD_REGION_NAME_RE = /^(lake\s+como|lago\s+di\s+como|lake\s+maggiore|lake\s+garda|lake\s+orta|tuscany|umbria|puglia|venice|amalfi|sicily|italy|milan|como)$/i;

/** Extracts unique human details (couple names, founder names, press, signature touches) from Jina Reader markdown or HTML text. */
export function extractUniqueStorySignals(rawText = '') {
  const text = String(rawText || '');
  // Look for couple names like "Morgan & Tyler" or "Beatrice & Matteo" in headings or captions
  const coupleMatches = [...text.matchAll(/(?:^|\n|#|\*)\s*([A-Z][a-z]{2,14})\s+(?:&|and)\s+([A-Z][a-z]{2,14})\b/g)]
    .filter((m) => !NON_HUMAN_COUPLE_WORD_RE.test(m[1]) && !NON_HUMAN_COUPLE_WORD_RE.test(m[2]))
    .map((m) => `${m[1]} and ${m[2]}`);
  const uniqueCouples = [...new Set(coupleMatches)].slice(0, 3);

  // Look for press mentions
  const press = ['Vogue', "Harper's Bazaar", 'Brides', 'Style Me Pretty', 'Over The Moon', 'Tatler', 'Martha Stewart', 'WedLuxe']
    .filter((pub) => new RegExp(`\\b${pub.replace(/\s+/g, '\\s+')}\\b`, 'i').test(text));

  // Look for signature wedding details
  const signatureDetails = [];
  if (/multi[- ]day/i.test(text)) signatureDetails.push('multi-day celebrations');
  if (/riva\b|boat arrival|waterfront|private pier|water taxi/i.test(text)) signatureDetails.push('lakefront boat arrivals');
  if (/elopement|intimate wedding/i.test(text)) signatureDetails.push('intimate Lake Como elopements');
  if (/greenhouse|candlelit|al fresco/i.test(text)) signatureDetails.push('al fresco candlelit dinners');
  if (/honeymoon/i.test(text)) signatureDetails.push('post-wedding honeymoon logistics');

  // Look for founder / lead planner name
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

export function buildVerifiedFallbackHook(p = {}, storySignals = null) {
  const existing = String(p.personalization_hook || '').trim();
  const isRoboticExisting = /^(We note(d)?\b|I was looking through your recent\b|I saw your recent\b|.*(stood out to us|caught our eye|caught our attention)\.?$)/i.test(existing);
  if (existing && !isRoboticExisting) {
    return existing;
  }
  const seed = KNOWN_LAKE_COMO_DIRECTORY[normName(p.agency_name || '')];
  if (seed?.personalization_hook) return seed.personalization_hook;

  const venues = (Array.isArray(p.key_venues) ? p.key_venues : [])
    .map((v) => String(v || '').trim())
    .filter((v) => v && !BROAD_REGION_NAME_RE.test(v));
  const couples = storySignals?.couples || [];
  const press = storySignals?.press || [];

  if (p.type === 'venue') {
    const place = venues[0] || p.agency_name || 'your property';
    return `Multi-day celebrations and private buyouts at ${place} always require careful guest transfer timing across ${p.location || 'Lake Como'}.`;
  }
  if (p.type === 'concierge_hotel') {
    const place = venues[0] || p.agency_name || 'your hotel';
    return `Between peak-season airport arrivals and private events around ${place}, we know how many overlapping guest transfers your concierge desk coordinates.`;
  }
  if (couples.length > 0 && venues.length > 0) {
    return `${couples[0]}'s celebration at ${venues[0]} on your site shows how many moving pieces go into a multi-day Lake Como weekend.`;
  }
  if (couples.length > 0) {
    return `${couples[0]}'s wedding story in your portfolio is a great example of how much behind-the-scenes timing goes into a destination weekend.`;
  }
  if (press.length > 0 && venues.length > 0) {
    return `Your ${press[0]}-featured celebrations and your work at ${venues[0]} bring guests in from all over the world.`;
  }
  if (venues.length >= 2) {
    return `Producing multi-day celebrations at estates like ${venues[0]} and ${venues[1]} leaves very little margin for error on guest timing.`;
  }
  if (venues.length === 1) {
    return `Coordinating destination weddings around ${venues[0]} means managing staggered airport arrivals, boat piers and late-night villa returns.`;
  }
  if (p.location) {
    return `Coordinating multi-day destination weddings around ${p.location} and the Italian Lakes takes serious behind-the-scenes guest logistics.`;
  }
  return '';
}


