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
  const distinctVenue = venues.find((v) => v.toLowerCase() !== normAgency && !normAgency.includes(v.toLowerCase()));
  if (distinctVenue) return distinctVenue;
  if (loc && loc.toLowerCase() !== normAgency) return loc;
  if (venues[0] && venues[0].toLowerCase() !== normAgency) return venues[0];
  return lang === 'it' ? 'Lago di Como' : 'Lake Como';
}

function buildTailoredCopy(prospect = {}, agencyShort = '', venueOrLoc = '', lang = 'en') {
  const type = prospect.type === 'wedding_planner' ? 'planner' : (prospect.type || 'planner');
  const idx = stableHashIndex(`${prospect.id || ''}:${prospect.agency_name || ''}`, 4);

  if (lang === 'it') {
    if (type === 'venue') {
      return {
        subject_line_a: `Logistica ospiti per gli eventi a ${agencyShort}`,
        subject_line_b: `Transfer matrimoni a ${venueOrLoc} · ${agencyShort}`,
        service_pitch:
          'Attiviamo un Portale Ospiti dove gli invitati inseriscono i propri voli, con un unico dispatcher su WhatsApp e flotta Mercedes-Benz Classe S, Classe V, Classe E e minibus/pullman da 16 a 50 posti fino ai rientri notturni.',
        cta_line:
          'Lavoriamo con tariffe nette da includere nella vostra offerta o commissione del 5%. Posso inviarvi la scheda partner di 1 pagina?',
      };
    }
    if (type === 'concierge_hotel') {
      return {
        subject_line_a: `Flotta privata di supporto per ${agencyShort}`,
        subject_line_b: `Transfer ospiti ed eventi a ${venueOrLoc} · ${agencyShort}`,
        service_pitch:
          'Supportiamo il vostro concierge con un unico dispatcher su WhatsApp e flotta Mercedes-Benz Classe S, Classe V, Classe E e minibus/pullman fino a 50 posti per aeroporti, Venezia, St. Moritz e navette eventi.',
        cta_line:
          'Offriamo tariffe nette da inserire nella vostra offerta o commissione del 5%. Posso inviarvi il listino partner di 1 pagina?',
      };
    }
    const itPlannerSubjectsA = [
      `Logistica trasporti ospiti per ${agencyShort}`,
      `Matrimoni a ${venueOrLoc} · logistica ospiti`,
      `${agencyShort} · trasporti matrimoni Lago di Como`,
      `Gestione transfer ospiti · ${agencyShort}`,
    ];
    const itPlannerSubjectsB = [
      `Matrimoni a ${venueOrLoc} · ${agencyShort}`,
      `Partner trasporti matrimoni · ${agencyShort}`,
      `Flotta privata e Portale Ospiti · ${agencyShort}`,
      `Transfer e navette a ${venueOrLoc} · ${agencyShort}`,
    ];
    const itPlannerPitches = [
      'Attiviamo sul sito degli sposi un Portale Ospiti dove gli invitati registrano i propri voli, con un unico dispatcher su WhatsApp e flotta Mercedes-Benz Classe S, Classe V, Classe E e minibus/pullman da 16 a 50 posti fino ai rientri notturni.',
      'Con un unico referente su WhatsApp e un Portale Ospiti dedicato, gestiamo arrivi aeroportuali, moli motoscafi e navette notturne con Mercedes-Benz Classe S, Classe V, Classe E e minibus/pullman da 16 a 50 posti.',
    ];
    const itPlannerCtas = [
      'Potete includere le nostre tariffe nette nella vostra offerta o lavorare con commissione del 5%. Posso inviarvi la scheda partner di 1 pagina?',
      'Offriamo tariffe nette da inserire nel vostro preventivo o commissione del 5%. Vi mando il listino partner di 1 pagina e il link demo del portale?',
    ];
    return {
      subject_line_a: itPlannerSubjectsA[idx],
      subject_line_b: itPlannerSubjectsB[idx],
      service_pitch: itPlannerPitches[idx % itPlannerPitches.length],
      cta_line: itPlannerCtas[idx % itPlannerCtas.length],
    };
  }

  // English tailored angles — ultra-concise, zero water
  if (type === 'venue') {
    const venuePitches = [
      'We set up a private Guest Transfer Portal where guests log their own flights, backed by one WhatsApp dispatcher and our Mercedes-Benz S-Class, V-Class and E-Class fleet plus 16 to 50-seat minibuses and coaches through the final late-night departures.',
      'Instead of your team juggling flight spreadsheets and late-night taxis, one WhatsApp dispatcher coordinates our Guest Transfer Portal, Mercedes-Benz S-Class, V-Class and E-Class fleet, and 16 to 50-seat minibuses and coaches.',
    ];
    const venueCtas = [
      'You can include our confidential net rates in your venue offer or work on a 5% commission. May I send our 1-page partner rate card?',
      'Properties either include our net rates in their client offer or take a 5% commission. May I send our 1-page partner rate card?',
    ];
    return {
      subject_line_a: `Wedding guest logistics at ${agencyShort}`,
      subject_line_b: `${venueOrLoc} guest transfers · ${agencyShort}`,
      service_pitch: venuePitches[idx % venuePitches.length],
      cta_line: venueCtas[idx % venueCtas.length],
    };
  }

  if (type === 'concierge_hotel') {
    const hotelPitches = [
      'We support your desk with one WhatsApp dispatcher and a private fleet of Mercedes-Benz S-Class, V-Class and E-Class vehicles plus 16 to 50-seat minibuses and coaches for airport arrivals, long-distance transfers and late-night event shuttles.',
      'From VIP airport arrivals in a Mercedes-Benz S-Class, V-Class or E-Class to wedding shuttle loops with 16 to 50-seat minibuses and coaches, our fleet and single WhatsApp dispatcher are ready on demand.',
    ];
    return {
      subject_line_a: `Private fleet support for ${agencyShort}`,
      subject_line_b: `${venueOrLoc} guest & event transfers · ${agencyShort}`,
      service_pitch: hotelPitches[idx % hotelPitches.length],
      cta_line:
        'You can include our confidential net rates in your event offer or work on a 5% concierge commission. May I send our 1-page partner rate card?',
    };
  }

  const plannerSubjectsA = [
    `Guest transport partner · ${agencyShort}`,
    `Taking guest transport off your plate · ${agencyShort}`,
    `${agencyShort} · Lake Como & Northern Italy logistics`,
    `Wedding guest coordination for ${agencyShort}`,
  ];
  const plannerSubjectsB = [
    `${venueOrLoc} weddings · ${agencyShort}`,
    `Guest transfers for your ${venueOrLoc} weddings`,
    `Private fleet & guest portal · ${agencyShort}`,
    `${venueOrLoc} guest logistics · ${agencyShort}`,
  ];
  const plannerPitches = [
    'We provide a private Guest Transfer Portal where guests log their own flights, one WhatsApp dispatcher on your run-sheet, and a Mercedes-Benz S-Class, V-Class and E-Class fleet plus 16 to 50-seat minibuses and coaches through the final late-night departures.',
    'Instead of chasing flight spreadsheets, we set up a Guest Transfer Portal on the couple\'s website and assign one WhatsApp dispatcher to run our Mercedes-Benz S-Class, V-Class and E-Class fleet plus 16 to 50-seat minibuses and coaches.',
    'From airport arrivals and boat-pier handoffs to late-night villa shuttles, one WhatsApp dispatcher manages our Guest Transfer Portal, Mercedes-Benz V-Class, E-Class and S-Class fleet, and 16 to 50-seat minibuses and coaches.',
    'We handle the full wedding transport run-sheet: a Guest Transfer Portal where guests enter their own flights, one WhatsApp dispatcher, and our Mercedes-Benz S-Class, V-Class and E-Class fleet plus 16 to 50-seat minibuses and coaches.',
  ];
  const plannerCtas = [
    'You can include our confidential net rates in your client offer or work on a 5% commission. May I send our 1-page rate card and guest portal demo?',
    'Planners either include our net rates in their client offer or work on a 5% commission. May I send over our 1-page partner rate card?',
    'You can bundle our net rates directly into your client offer or work on a 5% commission. May I send our 1-page partner rate card?',
    'We offer confidential net rates you can include in your offer, or a 5% commission. May I send our 1-page rate card and guest portal link?',
  ];

  return {
    subject_line_a: plannerSubjectsA[idx],
    subject_line_b: plannerSubjectsB[idx],
    service_pitch: plannerPitches[idx],
    cta_line: plannerCtas[idx],
  };
}

export function buildVars(prospect, extra = {}) {
  const lang = prospect.language === 'it' ? 'it' : 'en';
  const agency_short = shortAgencyName(prospect.agency_name, lang);
  const venue_or_location = resolveVenueOrLocation(prospect, agency_short, lang);
  const tailored = buildTailoredCopy(prospect, agency_short, venue_or_location, lang);
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

