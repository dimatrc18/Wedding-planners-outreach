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
  const channel = 'email';
  const body = merge(t.body, vars);
  const lint = lintMessage({ subject, body, channel, step: key });
  return { subject, body, variant, template_id: t.id || null, template_key: t.key, attach_rate_card: !!t.attach_rate_card, channel, lint };
}

export const replyTemplateFor = (intent) => REPLY_FOR_INTENT[intent] || 'reply_generic';

const htmlEsc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Ported from dorogo-ai-concierge/email.js (generateLuxuryHtmlEmail - Design 1):
 * Wraps plain-text outreach/concierge copy in DOROGO's natural executive HTML email layout
 * with clean 15px typography, automatic bullet formatting, personal sign-off, and the
 * DOROGO Executive Dispatch Footer (Milan • Lake Como • Italian Alps).
 */
export function renderDorogoLuxuryHtmlEmail(textContent = '', { fromEmail = 'dmitri@dorogo.eu', pixelUrl = null } = {}) {
  const raw = String(textContent || '').trim();
  const isIt = /Un cordiale saluto|Buongiorno|rispondere "no"/i.test(raw);

  // Separate opt-out line if present at the bottom
  let optoutText = '';
  let bodyWithoutOptout = raw;
  for (const opt of [OPTOUT.en, OPTOUT.it]) {
    if (bodyWithoutOptout.includes(opt)) {
      optoutText = opt;
      bodyWithoutOptout = bodyWithoutOptout.split(opt).join('').trim();
    }
  }

  // Strip trailing signature block from body paragraphs since we render the styled Design 1 footer
  let cleanText = bodyWithoutOptout
    .replace(/(?:Warm regards|Kind regards|Best regards|Un cordiale saluto|Cordiali saluti),?[\s\S]*$/i, '')
    .trim();

  if (!cleanText && bodyWithoutOptout) cleanText = bodyWithoutOptout;

  const paragraphs = cleanText.split(/\n\s*\n/);
  const bodyHtml = paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.includes('• ') || trimmed.includes('- ') || /^\s*[a-c]\)\s+/m.test(trimmed)) {
        const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
        const preLines = [];
        const bulletLines = [];
        for (const line of lines) {
          if (/^(?:[•\-]|\w\))\s+/.test(line)) {
            bulletLines.push(htmlEsc(line.replace(/^[•\-]\s*/, '')));
          } else {
            preLines.push(htmlEsc(line));
          }
        }
        const preHtml = preLines.length
          ? `<p style="color: #18181b; font-size: 15px; line-height: 1.65; margin: 0 0 12px 0;">${preLines.join('<br/>')}</p>`
          : '';
        const listHtml = bulletLines.length
          ? `<ul style="color: #18181b; font-size: 15px; line-height: 1.65; margin: 0 0 16px 0; padding-left: 20px;">${bulletLines.map((b) => `<li style="margin-bottom: 6px;">${b}</li>`).join('')}</ul>`
          : '';
        return preHtml + listHtml;
      }
      return `<p style="color: #18181b; font-size: 15px; line-height: 1.65; margin: 0 0 16px 0;">${htmlEsc(trimmed).replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');

  const signOff = isIt ? 'Un cordiale saluto,' : 'Warm regards,';
  const regionLine = isIt ? 'Milano &bull; Lago di Como &bull; Alpi' : 'Milan &bull; Lake Como &bull; Italian Alps';
  const displayEmail = fromEmail ? fromEmail.replace(/^booking@/i, 'Booking@') : 'dmitri@dorogo.eu';
  const safeFrom = htmlEsc(displayEmail);

  return `<!DOCTYPE html>
<html lang="${isIt ? 'it' : 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DOROGO | Private Transportation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #18181b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; margin: 0; padding: 24px 16px;">
    <tr>
      <td align="left" style="padding: 0;">
        <table class="email-container" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 620px;">
          <tr>
            <td style="padding: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #18181b;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 0 14px 0; font-size: 15px; color: #18181b; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${signOff}<br>
              <strong style="font-weight: 600;">Dmitri</strong>
            </td>
          </tr>
          <tr>
            <td style="padding: 0;">
              <table border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e4e4e7; width: 100%; max-width: 480px; padding-top: 14px; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <tbody>
                  <!-- Official Drawn Black Line Logo -->
                  <tr>
                    <td style="padding-bottom: 8px;">
                      <img src="https://dorogo.eu/logo-black.png" alt="DOROGO" width="120" style="display: block; border: 0; max-width: 120px; height: auto;" />
                    </td>
                  </tr>
                  <!-- Self-Hosted Icons & Contact Links (WhatsApp Link Only, No Digits) -->
                  <tr>
                    <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      <div style="font-size: 11.5px; color: #52525b; line-height: 1.8;">
                        <a href="https://wa.me/32456141497" target="_blank" style="color: #334155; font-weight: 400; text-decoration: none; margin-right: 16px; display: inline-block;">
                          <img src="https://dorogo.eu/wa-black.png" width="12" height="12" alt="WA" style="vertical-align: -1.5px; margin-right: 4px; border: 0;" />WhatsApp
                        </a>
                        <span style="color: #cbd5e1; margin-right: 12px;">•</span>
                        <a href="mailto:${safeFrom}" style="color: #334155; font-weight: 400; text-decoration: none; display: inline-block;">
                          <img src="https://dorogo.eu/mail-black.png" width="12" height="12" alt="Mail" style="vertical-align: -1.5px; margin-right: 4px; border: 0;" />${safeFrom}
                        </a>
                      </div>
                      <div style="color: #94a3b8; font-size: 10.5px; margin-top: 3px; font-weight: 400;">
                        ${regionLine}
                      </div>
                      ${optoutText ? `<div style="color: #94a3b8; font-size: 11px; margin-top: 12px;">${htmlEsc(optoutText)}</div>` : ''}
                      ${pixelUrl ? `<img src="${htmlEsc(pixelUrl)}" width="1" height="1" alt="" style="display:none">` : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

