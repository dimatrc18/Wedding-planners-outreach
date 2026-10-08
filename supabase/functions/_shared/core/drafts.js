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
  const s = String(raw || '')
    .trim()
    .replace(/\s+(Events?\s*&\s*Concierge|Private\s+Events?|Wedding\s+Planners?|Wedding\s+Planning|Weddings?\s*&\s*Events?|Weddings?|Events?|S\.?r\.?l\.?)$/i, '')
    .trim();
  if (!s) return lang === 'it' ? 'il vostro studio' : 'your team';
  return s.length > 32 ? s.slice(0, 32).trim() : s;
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
          'Con DOROGO gestiamo l’intero piano trasporti tra gli aeroporti di Milano, il Lago di Como e le Alpi: un Portale Ospiti dedicato dove gli invitati registrano i propri voli, un unico referente su WhatsApp e la nostra flotta Mercedes-Benz Classe S, Classe V, Classe E con minibus executive da 16 a 30 posti per i viali stretti, i moli motoscafi e i rientri notturni fino alle 03:00.',
        cta_line:
          'Lavoriamo con le dimore sia con tariffe nette riservate sia con commissione del 12%. Posso inviarvi il nostro listino partner di una pagina?',
      };
    }
    if (type === 'concierge_hotel') {
      return {
        subject_line_a: `Flotta privata di supporto per ${agencyShort}`,
        subject_line_b: `Transfer ospiti ed eventi a ${venueOrLoc} · ${agencyShort}`,
        service_pitch:
          'Supportiamo i team concierge ed eventi sul Lago di Como, a Milano e nelle Alpi con un unico dispatcher su WhatsApp e una flotta privata di Mercedes-Benz Classe S, Classe V, Classe E e minibus executive da 16 a 30 posti: dai transfer aeroportuali VIP ai viaggi verso Venezia o St. Moritz, fino alle navette notturne per gli eventi fino alle 03:00.',
        cta_line:
          'Operiamo con tariffe nette riservate o commissione concierge del 12%. Posso inviarvi il nostro listino partner 2026 di una pagina?',
      };
    }
    const itPlannerSubjectsA = [
      `Logistica trasporti ospiti per ${agencyShort}`,
      `Matrimoni a ${venueOrLoc} · logistica ospiti`,
      `${agencyShort} · trasporti matrimoni Lago di Como e Nord Italia`,
      `Gestione completa transfer ospiti · ${agencyShort}`,
    ];
    const itPlannerSubjectsB = [
      `Matrimoni a ${venueOrLoc} · ${agencyShort}`,
      `Partner trasporti matrimoni · ${agencyShort}`,
      `Flotta privata e Portale Ospiti per ${agencyShort}`,
      `Transfer e navette notturne a ${venueOrLoc} · ${agencyShort}`,
    ];
    const itPlannerPitches = [
      'Con DOROGO gestiamo l’intero weekend tra Lago di Como, Maggiore, Garda, Milano e le Alpi: un unico dispatcher su WhatsApp sul vostro run-sheet, un Portale Ospiti dedicato dove gli invitati inseriscono i propri voli, coordinamento ai moli privati e la flotta Mercedes-Benz Classe S, Classe V, Classe E con minibus executive fino alle 03:00.',
      'Invece di rincorrere fogli Excel con i voli o autisti locali, attiviamo sul sito degli sposi un Portale Ospiti dedicato e coordiniamo con un unico referente su WhatsApp la nostra flotta Mercedes-Benz Classe S, Classe V, Classe E e i minibus da 16 a 30 posti (adatti ai viali stretti delle ville) dagli arrivi in aeroporto fino alle navette delle 03:00.',
    ];
    const itPlannerCtas = [
      'I wedding planner lavorano con noi con commissione del 12% o tariffe nette riservate. Posso inviarvi il listino partner di una pagina e un esempio del portale ospiti?',
      'Operiamo sia con tariffe nette riservate sia con commissione del 12%. Vi fa comodo ricevere la nostra scheda partner 2026 di una pagina?',
    ];
    return {
      subject_line_a: itPlannerSubjectsA[idx],
      subject_line_b: itPlannerSubjectsB[idx],
      service_pitch: itPlannerPitches[idx % itPlannerPitches.length],
      cta_line: itPlannerCtas[idx % itPlannerCtas.length],
    };
  }

  // English tailored angles
  if (type === 'venue') {
    const venuePitches = [
      'At DOROGO, we handle the full wedding-weekend run-sheet across Milan, the airports, Lake Como and the Alps: one dedicated WhatsApp dispatcher, a custom Guest Transfer Portal where guests log their own flights, and our Mercedes-Benz S-Class, V-Class and E-Class fleet plus compact 16 to 30-seat minibuses for narrow lakeside roads, boat-pier handoffs and hotel shuttles until 3:00 AM.',
      'Instead of your events team juggling flight spreadsheets and late-night taxis, we provide a custom Guest Transfer Portal for the couple\'s website and one dedicated WhatsApp dispatcher managing our Mercedes-Benz S-Class, V-Class and E-Class fleet and 16 to 30-seat minibuses from Milan airport arrivals through 3:00 AM hotel return loops.',
    ];
    const venueCtas = [
      'We work with properties on either confidential net rates or a 12% referral commission. May I send over our 1-page partner rate card for your events team?',
      'Properties partner with us on confidential net rates or a 12% commission. Would it be useful if I sent our 1-page 2026 partner rate card for your files?',
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
      'At DOROGO, we support five-star concierge and event teams across Lake Como, Milan and the Alps with one dedicated WhatsApp dispatcher and a private fleet of Mercedes-Benz S-Class, V-Class and E-Class vehicles plus 16 to 30-seat executive minibuses, covering VIP airport arrivals, cross-region drives to Venice or St. Moritz, and late-night event shuttles until 3:00 AM.',
      'Whether your desk needs VIP airport arrivals in a Mercedes-Benz S-Class, V-Class or E-Class, long-distance transfers to Venice or the Alps, or a dedicated wedding shuttle loop until 3:00 AM with compact executive minibuses and a single WhatsApp dispatcher, our fleet is ready on demand.',
    ];
    return {
      subject_line_a: `Private fleet support for ${agencyShort}`,
      subject_line_b: `${venueOrLoc} guest & event transfers · ${agencyShort}`,
      service_pitch: hotelPitches[idx % hotelPitches.length],
      cta_line:
        'We work on either confidential net rates or a 12% concierge commission. May I send over our 1-page 2026 partner rate card for your desk?',
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
    'At DOROGO, we run full wedding-weekend logistics across Lake Como, the Italian Lakes, Milan and the Alps: one dedicated WhatsApp dispatcher on your run-sheet, a private Guest Transfer Portal where guests log their own flights, water-taxi pier handoffs, and our Mercedes-Benz S-Class, V-Class and E-Class fleet plus 16 to 30-seat minibuses on standby until 3:00 AM.',
    'Instead of your team chasing flight spreadsheets or local drivers, we set up a private Guest Transfer Portal on the couple\'s website so guests enter their own flight numbers, and one WhatsApp dispatcher coordinates our Mercedes-Benz S-Class, V-Class and E-Class fleet and compact 16 to 30-seat minibuses (sized for narrow villa gates) across Lake Como, Maggiore, Garda, Milan and Venice.',
    'From Friday airport arrival waves to Sunday departures across Lake Como, Milan, Venice and the Alps, we assign one dedicated WhatsApp dispatcher to your run-sheet to manage our Mercedes-Benz V-Class, E-Class and S-Class fleet, 16 to 30-seat executive minibuses, private boat-pier sync, and continuous standby return shuttles until 3:00 AM.',
    'Our operations team covers Lake Como, the Italian Lakes, Milan and the Alps end to end: a custom Guest Transfer Portal for the couple\'s website, live flight tracking, one WhatsApp dispatcher on your run-sheet, and a private fleet of Mercedes-Benz S-Class, V-Class and E-Class vehicles plus 16 to 30-seat minibuses on standby through the final 3:00 AM departures.',
  ];
  const plannerCtas = [
    'Planners work with us on either confidential net rates or a 12% referral commission. May I send over our 1-page partner rate card and a sample guest portal link?',
    'We work on either a 12% referral commission or confidential net rates you can mark up. Would it be useful if I sent over our 1-page 2026 partner rate card?',
    'Planners partner with us on confidential net rates or a 12% commission. May I send our 1-page partner rate card for your files?',
    'We offer both confidential net rates and a 12% referral commission. May I send over our 1-page partner rate card and a quick look at the guest portal?',
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

