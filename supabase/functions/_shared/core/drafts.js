// Turn a template + prospect into a ready-to-review draft.

import { SIGNATURE, SIGNATURE_IT, OPTOUT } from './constants.js';
import { DEFAULT_TEMPLATES, REPLY_FOR_INTENT } from './templates.js';
import { lintMessage } from './lint.js';

export function firstName(contact = '') {
  const n = String(contact || '').trim().split(/\s+/)[0] || '';
  if (/^(villa|hotel|grand|relais|palace|resort|team|events?|concierge|info|hello|office|studio|agency|wedding|weddings)$/i.test(n)) return '';
  if (!/^[\p{L}'’-]{2,}$/u.test(n)) return '';
  return n.charAt(0).toUpperCase() + n.slice(1);
}

export function greeting(prospect) {
  const f = firstName(prospect.contact_name);
  if (prospect.language === 'it') return f ? `Buongiorno ${f},` : 'Buongiorno,';
  if (prospect.language === 'de') return f ? `Hallo ${f},` : 'Guten Tag,';
  if (prospect.language === 'fr') return f ? `Bonjour ${f},` : 'Bonjour,';
  return f ? `Hi ${f},` : 'Hello,';
}

export function shortAgencyName(raw = '', lang = 'en') {
  const clean = String(raw || '').trim().replace(/\s*\(Test\)\s*$/i, '').trim();
  const s = clean
    .replace(/\s+(Events?\s*&\s*Concierge|Private\s+Events?|Wedding\s+Planners?|Wedding\s+Planning|Weddings?\s*&\s*Events?|Weddings?|Events?|S\.?r\.?l\.?)$/i, '')
    .trim();
  if (!s) return lang === 'it' ? 'il vostro studio' : 'your team';
  const chosen = /^(my\s+italian|exclusive\s+italy|italian\s+wedding|the\s+lake\s+como|lake\s+como)$/i.test(s) ? clean : s;
  return chosen.length > 34 ? chosen.slice(0, 34).trim() : chosen;
}

function stableHashIndex(seed = '', modulo = 4) {
  let h = 2166136261;
  for (const c of String(seed || 'dorogo')) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % modulo;
}

function resolveVenueOrLocation(prospect = {}, agencyShort = '', lang = 'en') {
  const type = prospect.type === 'wedding_planner' ? 'planner' : (prospect.type || 'planner');
  const loc = String(prospect.location || '').trim();
  const normAgency = agencyShort.toLowerCase();
  if ((type === 'venue' || type === 'concierge_hotel') && loc && loc.toLowerCase() !== normAgency) {
    return loc;
  }
  const venues = (Array.isArray(prospect.key_venues) ? prospect.key_venues : [])
    .map((v) => String(v || '').trim())
    .filter((v) => v && !/^(lake\s+como|lago\s+di\s+como|italy|milan)$/i.test(v));
  const distinctVenues = venues.filter((v) => v.toLowerCase() !== normAgency && !normAgency.includes(v.toLowerCase()));
  const nonBalbianello = distinctVenues.find((v) => !/balbianello/i.test(v));
  if (nonBalbianello) return nonBalbianello;
  if (distinctVenues[0]) return distinctVenues[0];
  if (loc && loc.toLowerCase() !== normAgency) return loc;
  if (venues[0] && venues[0].toLowerCase() !== normAgency) return venues[0];
  return lang === 'it' ? 'Lago di Como' : 'Lake Como';
}

function buildTailoredCopy(prospect = {}, agencyShort = '', venueOrLoc = '', lang = 'en', variant = 'A') {
  const type = prospect.type === 'wedding_planner' ? 'planner' : (prospect.type || 'planner');
  const idx = stableHashIndex(`${prospect.id || ''}:${prospect.agency_name || ''}`, 2);
  const hookText = String(prospect.personalization_hook || '');
  const isHookVariantB = /^(The hardest part of a Lake Como wedding's transport|La parte più complessa dei trasporti)/i.test(hookText);
  const effectiveVariant = isHookVariantB ? 'B' : (variant === 'B' ? 'B' : 'A');

  if (lang === 'it') {
    if (type === 'venue' || type === 'concierge_hotel') {
      const targetVenue = agencyShort || venueOrLoc;
      return {
        subject_line_a: 'Transfer ospiti per il vostro team eventi',
        subject_line_b: 'Transfer aeroportuali e navette di gruppo',
        service_pitch:
          `Forniamo transfer aeroportuali e trasporti di gruppo per gli ospiti dell'hotel e i matrimoni a ${targetVenue}, con Mercedes-Benz Classe V, Classe S e minibus. Possiamo coordinare le prenotazioni rapidamente via WhatsApp o email.`,
        cta_line:
          'Vi sarebbe utile se vi inviassi l\'elenco veicoli e le tariffe partner da tenere in archivio per il vostro team?',
      };
    }

    const hasSpecificVenueIt = venueOrLoc && !/^(lago di como|lake como|milano|italia)$/i.test(venueOrLoc);
    const itSubjectsA = hasSpecificVenueIt
      ? [`Transfer per i vostri matrimoni a ${venueOrLoc}`, 'Trasporti ospiti sul Lago di Como']
      : ['Trasporti ospiti sul Lago di Como', 'Transfer ospiti per la stagione matrimoni'];

    if (effectiveVariant === 'B') {
      return {
        subject_line_a: itSubjectsA[idx],
        subject_line_b: 'Rientri notturni dopo il ricevimento',
        service_pitch:
          'Sono Dmitri di DOROGO e ci occupiamo proprio di questa parte tra il Lago di Como e Milano, con Mercedes-Benz Classe V, Classe S e minibus.',
        cta_line:
          'Se mai aveste bisogno di un supporto extra in una data intensa, vi sarebbe utile ricevere le nostre tariffe?',
      };
    }

    return {
      subject_line_a: itSubjectsA[idx],
      subject_line_b: 'Rientri notturni dopo il ricevimento',
      service_pitch:
        'Gestiamo navette ospiti, transfer aeroportuali e rientri notturni con Mercedes-Benz Classe V, Classe S e minibus per i gruppi più numerosi. Non cerchiamo di sostituire i vostri fornitori attuali, ma solo di essere un\'opzione in più quando una data si fa intensa.',
      cta_line: 'Vi sarebbe utile se vi inviassi le nostre tariffe?',
    };
  }

  // English MECE Variant C: Hotels, Concierges & Venues
  if (type === 'venue' || type === 'concierge_hotel') {
    const targetVenue = agencyShort || venueOrLoc;
    return {
      subject_line_a: 'Guest transfers for your events team',
      subject_line_b: 'Airport transfers and group shuttles',
      service_pitch:
        `We provide airport transfers and group transport for hotel guests and wedding parties at ${targetVenue}, with V-Classes, S-Classes and minibuses. We can coordinate bookings quickly by WhatsApp or email.`,
      cta_line:
        'Would it be useful if I sent our vehicle list and partner rates for your team to keep on file?',
    };
  }

  // English MECE Variant A (Introduction) vs Variant B (Late Returns After the Reception)
  const hasSpecificVenue = venueOrLoc && !/^(lake como|lago di como|milan|italy)$/i.test(venueOrLoc);
  const plannerSubjectsA = hasSpecificVenue
    ? [`Transfers for your ${venueOrLoc} weddings`, 'Lake Como guest transport']
    : ['Lake Como guest transport', 'Guest transport for the season'];

  if (effectiveVariant === 'B') {
    return {
      subject_line_a: plannerSubjectsA[idx],
      subject_line_b: 'Late returns after the reception',
      service_pitch:
        'I\'m Dmitri from DOROGO, and that\'s the part we cover across Lake Como and Milan, with V-Classes, S-Classes and minibuses.',
      cta_line:
        'If you ever need an extra hand on a busy date, would it be useful if I sent our rates?',
    };
  }

  return {
    subject_line_a: plannerSubjectsA[idx],
    subject_line_b: 'Late returns after the reception',
    service_pitch:
      'We do guest shuttles, airport pickups and late-night returns, with V-Classes, S-Classes and minibuses for larger groups. I\'m not looking to replace anyone you work with, just to be an extra option when a date gets busy.',
    cta_line: 'Would it be useful if I sent our rates?',
  };
}

export function buildVars(prospect, extra = {}) {
  const lang = prospect.language === 'it' ? 'it' : 'en';
  const agency_short = shortAgencyName(prospect.agency_name, lang);
  const venue_or_location = resolveVenueOrLocation(prospect, agency_short, lang);
  const variant = extra.variant === 'B' ? 'B' : 'A';
  const tailored = buildTailoredCopy(prospect, agency_short, venue_or_location, lang, variant);
  return {
    greeting: greeting(prospect),
    first_name: firstName(prospect.contact_name),
    agency: prospect.agency_name || agency_short,
    agency_short,
    venue_or_location,
    subject_line_a: tailored.subject_line_a,
    subject_line_b: tailored.subject_line_b,
    service_pitch: tailored.service_pitch,
    cta_line: tailored.cta_line,
    hook: (prospect.personalization_hook || '').trim(),
    venue: (prospect.key_venues || [])[0] || venue_or_location,
    location: prospect.location || venue_or_location,
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
  const hookText = String((extraVars && extraVars.hook) || prospect.personalization_hook || '');
  const inferredHookVariant = /^(The hardest part of a Lake Como wedding's transport|La parte più complessa dei trasporti)/i.test(hookText)
    ? 'B'
    : /^(I'm Dmitri from DOROGO|Sono Dmitri di DOROGO)/i.test(hookText)
      ? 'A'
      : null;
  const variant = extraVars.variant === 'A' || extraVars.variant === 'B'
    ? extraVars.variant
    : (inferredHookVariant || assignVariant(prospect.id, t));
  const vars = buildVars(prospect, { variant, ...extraVars });
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
  const isIt = /Un cordiale saluto|Buongiorno|rispondere "no"|nessun problema, basta farmelo sapere/i.test(raw);

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
    .replace(/\n*Dmitri\s*\n+DOROGO\s*\|\s*dmitri@dorogo\.eu[\s\S]*$/i, '')
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

