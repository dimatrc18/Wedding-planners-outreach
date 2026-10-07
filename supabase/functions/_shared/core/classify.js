// Rule-based reply classifier (English and Italian, some German and French).
// Runs on every inbound email. When GEMINI_API_KEY is set the edge function asks Gemini as well and
// keeps the rule result whenever the rules are confident (unsubscribe, OOO, bounce are never left to the model).

const MONTHS = {
  january: 1, jan: 1, gennaio: 1, januar: 1, janvier: 1,
  february: 2, feb: 2, febbraio: 2, februar: 2, février: 2, fevrier: 2,
  march: 3, mar: 3, marzo: 3, märz: 3, maerz: 3, mars: 3,
  april: 4, apr: 4, aprile: 4, avril: 4,
  may: 5, maggio: 5, mai: 5,
  june: 6, jun: 6, giugno: 6, juni: 6, juin: 6,
  july: 7, jul: 7, luglio: 7, juli: 7, juillet: 7,
  august: 8, aug: 8, agosto: 8, août: 8, aout: 8,
  september: 9, sep: 9, sept: 9, settembre: 9, septembre: 9,
  october: 10, oct: 10, ottobre: 10, oktober: 10, octobre: 10,
  november: 11, nov: 11, novembre: 11,
  december: 12, dec: 12, dicembre: 12, dezember: 12, décembre: 12, decembre: 12,
};
const MONTH_RE = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');

// Drop quoted history and signatures-of-the-thread so our own words don't get classified.
export function stripQuoted(body = '') {
  const lines = String(body).replace(/\r/g, '').split('\n');
  const out = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) continue;
    if (/^\s*(On .{4,120}wrote:|Il giorno .{4,120}ha scritto:|Am .{4,120}schrieb.*:|Le .{4,120}a écrit ?:|-{2,}\s*Original Message\s*-{2,}|-{2,}\s*Messaggio originale\s*-{2,}|From:\s.+|Da:\s.+|De :\s.+|Von:\s.+)\s*$/i.test(line)) break;
    out.push(line);
  }
  return out.join('\n').trim();
}

const any = (res, text) => res.find((r) => r.test(text));

const OOO = [
  /out of (the )?office/i, /\bauto(matic)?[- ]?(reply|response)\b/i, /\bautoreply\b/i, /risposta automatica/i,
  /fuori (ufficio|sede)/i, /\bin ferie\b/i, /sar[oò] (assente|in ferie|fuori)/i, /\babwesen/i, /absent(e)? du bureau/i,
  /\b(i am|i'm|i will be) (currently )?(away|travell?ing|on (annual )?leave|on holiday|on vacation|out of office)/i,
  /limited access to (my )?e-?mail/i, /will (respond|reply|get back) (to you )?(up)?on my return/i,
];
const UNSUB = [
  /\bunsubscribe\b/i, /\bremove (me|us|my (e-?mail|address))\b/i, /\btake (me|us) off\b/i,
  /\b(please )?stop (e-?mailing|emailing|writing|contacting|sending)/i, /^\s*stop[.!]?\s*$/im,
  /\bdo not (contact|e-?mail|write to) (me|us)\b/i, /\bdon'?t (contact|e-?mail|write to) (me|us)\b/i,
  /cancellatemi|cancellami|non (mi |ci )?(contattate|contatti|scrivete|scriva|mandate|inviate)(ci|mi)? pi[uù]/i, /rimuove(te|re) (il mio|la mia|i nostri|dalla)/i,
  /\bnicht mehr (kontaktieren|schreiben)\b/i, /\bdésinscri/i,
];
const PLAIN_NO = /^\s*(no|nope|no grazie|no,? thanks?( you)?|nein( danke)?|non merci)\s*[.!]*\s*$/i;
const NEGATIVE = [
  /\bnot interested\b/i, /\bno,? thank(s| you)\b/i, /non (siamo|sono) interessat/i, /\bno grazie\b/i,
  /\bwe('re| are) (all )?set\b/i, /\bnot (a )?(good )?fit\b/i, /\bnot relevant\b/i, /kein interesse/i, /pas intéressé/i,
];

const INTENT_RULES = {
  meeting_request: [
    /\b(schedule|book|set up|arrange|have) (a )?(quick )?(call|meeting|zoom|chat)\b/i,
    /\b(call|zoom|teams|meet|speak|talk)\b[^.?\n]{0,40}\b(next week|tomorrow|monday|tuesday|wednesday|thursday|friday|this week|available)\b/i,
    /\bgive (me|us) a (call|ring)\b/i, /\bcall me\b/i, /\bwhen (are|would) you (be )?(free|available)\b/i,
    /\b(chiamata|videochiamata|incontrarci|appuntamento|telefonata)\b/i, /\bsentirci (al telefono|telefonicamente|per una chiamata)\b/i,
  ],
  wants_rate_card: [
    /\b(yes|sure|ok(ay)?|absolutely|of course|please|go ahead)\b[^.?\n]{0,40}\b(send|share|forward)/i,
    /\b(please )?(send|share|forward)\b[^.?\n]{0,30}\b(it|over|across|rate card|rates|pdf|card|details|info(rmation)?)\b/i,
    /\byes,? please\b/i, /\bplease do\b/i, /\bhappy to (see|receive|have a look|take a look)\b/i, /\bwould (love|like) to (see|receive|have)\b/i,
    /\bfeel free to send\b/i, /(?:^|[\s,(])(s[iì]|certo|volentieri|certamente)(?![a-zà-ù])[^.?\n]{0,40}\b(invia|mand|inoltr)/im,
    /\b(inviatemi|inviami|inviateci|mandami|mandatemi|mandateci|mandi pure|invii pure|inviate pure)\b/i,
    /\bgerne\b/i, /\bavec plaisir\b/i, /^\s*(yes|sure|s[iì]|ja|oui)[.!]*\s*$/im,
  ],
  asks_pricing: [
    /\b(price|prices|pricing|cost|costs|how much|quote|quotation|tariff)\b/i, /\byour rates\b[^\n]{0,40}\?/i,
    /\b(prezz[oi]|tariff[ae]|costi|quanto cost(a|ano|erebbe|erebbero)|preventiv[oi])\b/i, /\b(preise|kosten|tarifs?|prix)\b/i,
  ],
  referral_to_other: [
    /\b(contact|write to|reach out to|e-?mail|speak (to|with)|get in touch with)\b[^.\n]{0,20}\b(my|our) (colleague|partner|assistant|logistics|team|co-?founder|business partner|coordinator)\b/i,
    /\b(i'?ve|i have) (cc'?d|copied|looped in)\b/i, /\b(handles|takes care of|is in charge of) (our |the )?(transport|logistics|transfers|suppliers|vendors)\b/i,
    /\b(scrivere|contattare|scriva|contatti|scrivete|contattate) (a |al |alla )?(mia|il mio|la mia|la nostra|il nostro) (collega|socio|socia|assistente|responsabile)\b/i,
    /\bin copia\b/i,
  ],
  not_now: [
    /\b(next|following) (season|year|spring|winter)\b/i, /\b(not|n't) (right )?now\b/i, /\bnot at (the|this) (moment|time)\b/i,
    /\b(busy|full|hectic|peak) (season|period|time)\b/i, /\bafter (the )?(season|summer|wedding season)\b/i,
    /\b(get|be|come) back (to you )?(in|after|later|next)\b/i, /\bmaybe later\b/i, /\b(in|next) (january|february|march|april|october|november|december)\b/i,
    /\b(reach out|contact (me|us)|write|try) (again )?(in|next|after) (the )?(\w+ )?(season|year|month|january|february|march|autumn|winter|spring)\b/i,
    /\bprossim[ao] (stagione|anno)\b/i, /\bal momento no\b/i, /\bnon (ora|adesso|in questo momento)\b/i, /\bdopo l'estate\b/i, /\ba fine stagione\b/i,
  ],
  has_supplier: [
    /\b(already|currently) (work|working|have|use|using|partner)\b[^.\n]{0,50}\b(supplier|provider|partner|company|driver|transport|chauffeur|ncc|transfer)/i,
    /\bwe (have|use) our own\b/i, /\bin-?house (transport|drivers?|fleet)\b/i, /\b(trusted|regular|existing) (supplier|provider|partner|driver)s?\b/i,
    /\b(abbiamo|lavoriamo|collaboriamo|ci appoggiamo) gi[aà](?![a-z])/i,
  ],
};
const INTENT_ORDER = ['meeting_request', 'wants_rate_card', 'asks_pricing', 'referral_to_other', 'not_now', 'has_supplier'];

export function detectBounce({ from = '', subject = '', body = '' } = {}) {
  const isBounce = /mailer-daemon|postmaster|mail delivery (subsystem|system)/i.test(from) ||
    /(undeliver|delivery status notification|failure notice|returned mail|mail delivery failed|delivery has failed|unzustellbar|non recapitabil|address not found|message blocked)/i.test(subject);
  if (!isBounce) return null;
  const soft = /(mailbox (is )?full|over quota|quota exceeded|temporar|try again later|deferred|greylist)/i.test(body + ' ' + subject);
  return { bounced: true, hard: !soft };
}

// Loose date in text such as "12 October", "October 12th", "12/10", "12.10.2026", "12 ottobre". Day-first for numeric dates.
export function parseLooseDate(text = '', now = new Date()) {
  const t = String(text).toLowerCase();
  let d, m, y;
  let r = t.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th|°)?\\s+(?:of\\s+)?(${MONTH_RE})\\.?(?:\\s+(\\d{4}))?\\b`, 'i'));
  if (r) { d = +r[1]; m = MONTHS[r[2]]; y = r[3] ? +r[3] : null; }
  if (!m) {
    r = t.match(new RegExp(`\\b(${MONTH_RE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'i'));
    if (r) { m = MONTHS[r[1]]; d = +r[2]; y = r[3] ? +r[3] : null; }
  }
  if (!m) {
    r = t.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/);
    if (r && +r[2] >= 1 && +r[2] <= 12 && +r[1] >= 1 && +r[1] <= 31) { d = +r[1]; m = +r[2]; y = r[3] ? (r[3].length === 2 ? 2000 + +r[3] : +r[3]) : null; }
  }
  if (!m || !d) return null;
  const year = y || now.getUTCFullYear();
  let date = new Date(Date.UTC(year, m - 1, d, 9));
  if (!y && date < new Date(now.getTime() - 86400000)) date = new Date(Date.UTC(year + 1, m - 1, d, 9));
  return date;
}

// First month named in a "not now" reply ("write again in January") → first day of that month, next occurrence.
function monthMention(text, now) {
  const r = String(text).toLowerCase().match(new RegExp(`\\b(?:in|from|after|a|da|dopo|im|en)\\s+(${MONTH_RE})\\b`, 'i'));
  if (!r) return null;
  const m = MONTHS[r[1]];
  let date = new Date(Date.UTC(now.getUTCFullYear(), m - 1, 1, 9));
  if (date <= now) date = new Date(Date.UTC(now.getUTCFullYear() + 1, m - 1, 1, 9));
  return date;
}

/**
 * classifyReply({ from, subject, body }, now)
 * → { sentiment, intent, confidence: 'high'|'medium'|'low', bounce?, hard_bounce?, ooo_until?, nurture_until?, matched: [] }
 */
export function classifyReply(msg = {}, now = new Date()) {
  const bounce = detectBounce(msg);
  if (bounce) return { sentiment: 'negative', intent: null, confidence: 'high', bounce: true, hard_bounce: bounce.hard, matched: ['bounce'] };

  const text = stripQuoted(msg.body || '');
  const subj = msg.subject || '';
  const all = `${subj}\n${text}`;
  const matched = [];

  if (any(OOO, all)) {
    const m = all.match(/(?:until|till|back on|back in the office on|returning(?: on)?|return on|rientro(?: il)?|fino al|fino a|dal|bis zum|jusqu'au)\s+([^\n]{3,40})/i);
    const back = m ? parseLooseDate(m[1], now) : null;
    const resume = back ? new Date(back.getTime() + 86400000) : new Date(now.getTime() + 7 * 86400000);
    return { sentiment: 'ooo', intent: null, confidence: 'high', ooo_until: resume.toISOString(), matched: ['ooo'] };
  }
  const firstLine = text.split('\n').find((l) => l.trim()) || '';
  if (any(UNSUB, text) || PLAIN_NO.test(firstLine)) {
    return { sentiment: 'unsubscribe', intent: null, confidence: 'high', matched: ['unsubscribe'] };
  }

  const hits = {};
  for (const [intent, rules] of Object.entries(INTENT_RULES)) {
    const r = any(rules, text);
    if (r) { hits[intent] = true; matched.push(intent); }
  }
  const negative = !!any(NEGATIVE, text);
  if (negative) matched.push('negative');

  // "We already have a supplier" outranks a stray "send" unless they still ask for the card explicitly.
  let intent = INTENT_ORDER.find((k) => hits[k]) || null;
  if (hits.has_supplier && !hits.meeting_request && !/rate card|rates|tariff|send (it|over)|happy to (see|have a look)|keep (you|it) on file/i.test(text)) intent = 'has_supplier';
  if (hits.not_now && intent === 'asks_pricing' && !/\?/.test(text)) intent = 'not_now';
  if (negative && (intent === 'wants_rate_card') && !/\byes\b|\bplease\b/i.test(text)) intent = hits.not_now ? 'not_now' : null;

  let sentiment = 'neutral';
  if (['meeting_request', 'wants_rate_card', 'asks_pricing'].includes(intent)) sentiment = 'positive';
  else if (intent === 'has_supplier' || (negative && !intent)) sentiment = 'negative';

  const out = { sentiment, intent, confidence: intent ? (matched.length > 2 ? 'medium' : 'high') : (negative ? 'medium' : 'low'), matched };
  if (intent === 'not_now') {
    const named = monthMention(text, now);
    if (named) out.nurture_until = named.toISOString();
  }
  return out;
}
