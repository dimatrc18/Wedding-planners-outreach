// Turn a template + prospect into a ready-to-review draft.

import { SIGNATURE, SIGNATURE_IT, OPTOUT } from './constants.js';
import { DEFAULT_TEMPLATES, REPLY_FOR_INTENT } from './templates.js';
import { lintMessage } from './lint.js';

export function firstName(contact = '') {
  const n = String(contact || '').trim().split(/\s+/)[0] || '';
  return /^[\p{L}'’-]{2,}$/u.test(n) ? n : '';
}

export function greeting(prospect) {
  const f = firstName(prospect.contact_name);
  if (prospect.language === 'it') return f ? `Buongiorno ${f},` : 'Buongiorno,';
  if (prospect.language === 'de') return f ? `Hallo ${f},` : 'Guten Tag,';
  if (prospect.language === 'fr') return f ? `Bonjour ${f},` : 'Bonjour,';
  return f ? `Hi ${f},` : 'Hello,';
}

export function buildVars(prospect, extra = {}) {
  const lang = prospect.language === 'it' ? 'it' : 'en';
  return {
    greeting: greeting(prospect),
    first_name: firstName(prospect.contact_name),
    agency: prospect.agency_name || '',
    hook: (prospect.personalization_hook || '').trim(),
    venue: (prospect.key_venues || [])[0] || '',
    location: prospect.location || '',
    signature: lang === 'it' ? SIGNATURE_IT : SIGNATURE,
    optout: OPTOUT[lang],
    sender_name: 'Dmitri',
    ...extra,
  };
}

// Replace {{var}} with a non-empty value; leave the placeholder otherwise so the linter can flag it.
export function merge(text = '', vars = {}) {
  return String(text).replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => {
    const v = vars[k];
    return v === undefined || v === null || String(v).trim() === '' ? m : String(v);
  });
}

export function pickTemplate(templates, key, language = 'en') {
  const list = (templates && templates.length ? templates : DEFAULT_TEMPLATES).filter((t) => t.key === key && t.active !== false);
  return list.find((t) => t.language === language) || list.find((t) => t.language === 'en') || null;
}

// Stable A/B split per prospect, so a prospect never sees both subject variants.
export function assignVariant(seed, template) {
  if (!template || !template.subject_b) return 'A';
  let h = 2166136261;
  for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 2 === 0 ? 'A' : 'B';
}

const reSubject = (s) => (!s ? '' : /^re:/i.test(s) ? s : `Re: ${s}`);

/**
 * buildDraft({ prospect, key, templates, threadSubject, step, extraVars })
 * → { subject, body, variant, template_id, template_key, attach_rate_card, lint }
 */
export function buildDraft({ prospect, key, templates, threadSubject = '', step = null, extraVars = {} }) {
  const lang = prospect.language === 'it' ? 'it' : 'en';
  const t = pickTemplate(templates, key, lang);
  if (!t) return null;
  const variant = assignVariant(prospect.id, t);
  const vars = buildVars(prospect, extraVars);
  const threaded = (step && step.thread) || t.kind === 'reply' || t.kind === 'nudge';
  const rawSubject = variant === 'B' ? t.subject_b : t.subject_a;
  let subject = threaded && threadSubject ? reSubject(threadSubject) : merge(rawSubject || '', vars);
  if (!subject && threaded) subject = reSubject(threadSubject);
  const channel = key === 'T2_ig_dm' ? 'instagram_dm' : 'email';
  if (channel !== 'email') subject = '';
  const body = merge(t.body, vars);
  const lint = lintMessage({ subject, body, channel, step: key });
  return { subject, body, variant, template_id: t.id || null, template_key: t.key, attach_rate_card: !!t.attach_rate_card, channel, lint };
}

export const replyTemplateFor = (intent) => REPLY_FOR_INTENT[intent] || 'reply_generic';
