// Copy-linter for every outbound message (DOROGO brief, section 7).
// errors block approval; warnings are shown on the card and can be overridden by a human.

import { SIGNATURE, SIGNATURE_IT, OPTOUT } from './constants.js';

export const BANNED = [
  { re: /hope (this|my|the) (e-?mail|message|note) finds you( well)?/i, label: '"I hope this email finds you well"' },
  { re: /thank(s| you) for reaching out/i, label: '"Thank you for reaching out"' },
  { re: /\b(certainly|definitely|absolutely)\b/i, label: 'Certainly / Definitely / Absolutely' },
  { re: /\brest assured\b/i, label: '"Rest assured"' },
  { re: /\bstrive to\b/i, label: '"We strive to..."' },
  { re: /\btop[- ]notch\b/i, label: '"top-notch"' },
  { re: /\bseamless(ly)?\b/i, label: '"seamless"' },
  { re: /\bbespoke solutions?\b/i, label: '"bespoke solutions"' },
  { re: /\belevate your\b/i, label: '"Elevate your..."' },
  { re: /\b(please )?(do not|don'?t) hesitate\b/i, label: '"Please do not hesitate..."' },
  { re: /\b(delighted|pleased|happy) to assist\b/i, label: '"We would be delighted to assist"' },
  { re: /\bgreat question\b/i, label: '"Great question"' },
  { re: /\b(spero che (questa|la presente) (e-?mail|mail|lettera) (la|vi|ti) trovi bene)\b/i, label: '"Spero che questa email vi trovi bene"' },
  { re: /\bnon esit(i|ate|are) a contattar/i, label: '"Non esitate a contattarci"' },
  { re: /\bsoluzioni su misura\b/i, label: '"soluzioni su misura"' },
  { re: /\b(airport transfer is on us|pickup on us|transfer on us|for free|complimentary transfer|complimentary airport|free transfer|free pickup|offerto da noi|transfer gratuito)\b/i, label: 'Free/complimentary service offer (luxury brand rule)' },
  { re: /\b(test us|try us|give us a try|testarci|metterci alla prova)\b/i, label: '"test us / try us" (luxury authority rule)' },
];

const VEHICLE_BANNED = [
  { re: /\b4\s?matic\b/i, label: '4MATIC' },
  { re: /\bextra[- ]?long\b/i, label: 'Extra-Long' },
  { re: /\bLWB\b/, label: 'LWB' },
];

const OPTOUT_RE = /just let me know|basta farmelo sapere|won't follow up|reply "?no"?|rispondere "?no"?|unsubscribe|won't write again|non vi scriverò più/i;

// Body text without signature and opt-out line, for word counts and question counting.
export function coreText(body = '') {
  let t = String(body);
  for (const s of [SIGNATURE, SIGNATURE_IT, OPTOUT.en, OPTOUT.it]) t = t.split(s).join(' ');
  t = t.replace(/^(warm regards|kind regards|best regards|un cordiale saluto|cordiali saluti|dmitri\s*\n\s*dorogo\b),?[\s\S]*$/im, ' ');
  return t.trim();
}

export const wordCount = (t) => (String(t).match(/[\p{L}\p{N}€][\p{L}\p{N}'’.,€%-]*/gu) || []).length;

/**
 * lintMessage({ subject, body, channel, step }) → { errors: string[], warnings: string[], words }
 */
export function lintMessage({ subject = '', body = '', channel = 'email', step = '' } = {}) {
  const errors = [], warnings = [];
  const full = `${subject}\n${body}`;
  const core = coreText(body);
  const words = wordCount(core);

  for (const m of full.matchAll(/\{\{\s*([\w]+)\s*\}\}/g)) {
    const v = m[1];
    const msg = v === 'hook' ? 'Add a personalization hook first ({{hook}} is empty)' : `Fill in {{${v}}}`;
    if (!errors.includes(msg)) errors.push(msg);
  }
  for (const b of BANNED) if (b.re.test(full)) errors.push(`Banned phrase: ${b.label}`);
  for (const v of VEHICLE_BANNED) if (v.re.test(full)) warnings.push(`Avoid "${v.label}" unless the planner asked`);
  if (/\b[VES][- ]Class\b|\bClasse [VES]\b/.test(full) && !/Mercedes-Benz/.test(full)) warnings.push('Name the car in full: "Mercedes-Benz V-Class"');
  if (/\bMercedes(?!-Benz)\s+[VES][- ]Class/i.test(full) || /\bMercedes Benz\b/.test(full)) warnings.push('Write "Mercedes-Benz" with the hyphen');

  if (channel === 'whatsapp') {
    if (words > 60) errors.push(`Message is ${words} words; keep it under 40`);
    else if (words > 40) warnings.push(`Message is ${words} words; aim for under 40`);
  } else if (channel === 'email') {
    if (step === 'T1_intro') {
      if (words > 150) errors.push(`First email is ${words} words; keep it under 120`);
      else if (words > 120) warnings.push(`First email is ${words} words; aim for under 120`);
    } else if (words > 160) warnings.push(`${words} words; shorter reads better`);
    if (!subject.trim()) errors.push('Subject is empty');
    if (subject.length > 65) warnings.push('Subject is long; keep it under about 60 characters');
    if (/!/.test(subject) || (subject.length > 8 && subject === subject.toUpperCase() && /[A-Z]/.test(subject))) warnings.push('Subject looks salesy (capitals or "!")');
    if (!/Dmitri/.test(body)) warnings.push('Signature missing');
    if (['T1_intro', 'T3_followup', 'T4_breakup'].includes(step) && !OPTOUT_RE.test(body)) warnings.push('Add the opt-out line');
  }

  const questions = (core.match(/\?/g) || []).length;
  if (step === 'T1_intro') {
    if (questions === 0) warnings.push('No call to action; ask "May I send our 1-page rate card?"');
    if (/\b(jump on a call|hop on a call|quick call|schedule a call|book a call|phone call|zoom|video ?call|meeting|meet up|teams)\b/i.test(core) || /\bcall\b[^.?]*\?/i.test(core)) warnings.push('First touch asks only for the rate card, not a call');
  }
  if (questions > 1) warnings.push(`${questions} questions; keep one clear ask`);
  if (/!/.test(core)) warnings.push('Exclamation marks read as salesy');
  if (/—/.test(core)) warnings.push('Avoid em-dashes (—); use a comma, colon or period (Concierge style)');
  const links = (core.match(/https?:\/\/|www\./g) || []).length;
  if (links > 1) warnings.push('More than one link hurts deliverability');
  if (/dear (sir|madam)|to whom it may concern|gentile cliente/i.test(core)) warnings.push('Generic greeting; use their name');
  return { errors, warnings, words };
}
