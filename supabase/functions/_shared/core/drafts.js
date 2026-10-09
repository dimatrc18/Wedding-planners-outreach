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
          'Come gestite attualmente i rientri notturni e le navette ospiti sul Lago di Como? Operiamo con una flotta executive Mercedes-Benz (Classe V, Classe S e minibus da 16 a 50 posti) con base tra il lago e Milano, e stiamo selezionando 2 o 3 agenzie con cui collaborare per questa stagione.',
        cta_line:
          'Se siete aperti a valutare un partner di trasporto dedicato da tenere a disposizione per le date più intense, vi farebbe comodo dare un\'occhiata alla nostra presentazione e alle tariffe riservate?',
      };
    }

    return {
      subject_line_a: itSubjectsA[idx],
      subject_line_b: 'Rientri notturni dopo il ricevimento',
      service_pitch:
        'Come gestite attualmente i trasferimenti degli ospiti e i rientri notturni dalle ville sul Lago di Como? Operiamo con una flotta executive Mercedes-Benz (Classe V, Classe S e minibus da 16 a 50 posti) con base sul lago, e stiamo selezionando 2 o 3 agenzie con cui collaborare per questa stagione.',
      cta_line:
        'Se siete aperti a valutare un partner di trasporto dedicato per il vostro team, vi farebbe comodo dare un\'occhiata alla nostra presentazione e alle tariffe riservate?',
    };
  }

  // English MECE Variant C: Hotels, Concierges & Venues
  if (type === 'venue' || type === 'concierge_hotel') {
    const targetVenue = agencyShort || venueOrLoc;
    return {
      subject_line_a: 'Guest transfers for your events team',
      subject_line_b: 'Airport transfers and group shuttles',
      service_pitch:
        `How does your concierge and events team currently handle guest airport transfers and group shuttles around ${targetVenue}? We operate an executive Mercedes-Benz fleet (V-Class, S-Class and 16 to 50-seat minibuses) and partner directly with local venues to support their guest transport.`,
      cta_line:
        'If you are open to having an additional executive fleet partner on file, would it be useful if I sent our 1-page overview and confidential partner rates?',
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
        'How does your team currently manage late-night villa returns and guest shuttles across Lake Como? We operate an executive Mercedes-Benz fleet (V-Class, S-Class, and 16 to 50-seat minibuses) based on the lake, and we are looking to partner with 2 or 3 additional studios for this season.',
      cta_line:
        'If you are open to having an additional partner fleet on call for busy dates, would it be useful if I sent our 1-page overview and confidential rates?',
    };
  }

  return {
    subject_line_a: plannerSubjectsA[idx],
    subject_line_b: 'Late returns after the reception',
    service_pitch:
      'How does your team currently manage guest transfers and late-night villa returns across Lake Como? We operate an executive Mercedes-Benz fleet (V-Class, S-Class, and 16 to 50-seat minibuses) based on the lake, and we are looking to partner with 2 or 3 additional studios for this season.',
    cta_line:
      'If you are open to having an additional partner fleet on call, would it be useful if I sent our 1-page overview and confidential rates?',
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

export const EMAIL_ASSETS_BASE = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/storage/v1/object/public/email-assets';

/**
 * Ported from dorogo-ai-concierge/email.js (generateLuxuryHtmlEmail):
 * Wraps plain-text outreach/concierge copy in DOROGO's executive HTML email layout
 * with dual-mode (Light Mode + Dark Mode) optimization and two selectable footer versions:
 * - 'wordmark' (Version 1, default): Pure HTML luxury serif wordmark + hairline rule that natively inverts to crisp white in Gmail iOS / Apple Mail / Outlook Dark Mode with zero background box.
 * - 'badge' (Version 2): Official drawn graphic logo with @media (prefers-color-scheme: dark) white logo swap + warm-ivory rounded badge fallback so Gmail iOS Dark Mode never renders black-on-black.
 */
export function renderDorogoLuxuryHtmlEmail(
  textContent = '',
  { fromEmail = 'dmitri@dorogo.eu', pixelUrl = null, footerStyle = 'wordmark' } = {}
) {
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

  // Strip trailing signature block from body paragraphs since we render the styled footer
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
          ? `<p class="dm-text" style="color: #18181b; font-size: 15px; line-height: 1.65; margin: 0 0 12px 0;">${preLines.join('<br/>')}</p>`
          : '';
        const listHtml = bulletLines.length
          ? `<ul class="dm-text" style="color: #18181b; font-size: 15px; line-height: 1.65; margin: 0 0 16px 0; padding-left: 20px;">${bulletLines.map((b) => `<li style="margin-bottom: 6px;">${b}</li>`).join('')}</ul>`
          : '';
        return preHtml + listHtml;
      }
      return `<p class="dm-text" style="color: #18181b; font-size: 15px; line-height: 1.65; margin: 0 0 16px 0;">${htmlEsc(trimmed).replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');

  const signOff = isIt ? 'Un cordiale saluto,' : 'Warm regards,';
  const regionLine = isIt ? 'Milano &bull; Lago di Como &bull; Alpi' : 'Milan &bull; Lake Como &bull; Italian Alps';
  const displayEmail = fromEmail ? fromEmail.replace(/^booking@/i, 'Booking@') : 'dmitri@dorogo.eu';
  const safeFrom = htmlEsc(displayEmail);

  // Version 1 ('wordmark'): Pure HTML Serif Lockup (auto-inverts to crisp white in Gmail iOS Dark Mode & Apple Mail Dark Mode)
  const wordmarkBrandHtml = `
    <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 10px;">
      <tr>
        <td align="left" style="padding: 0;">
          <div class="dm-brand" style="font-family: 'Cormorant Garamond', 'Didot', 'Bodoni MT', Georgia, 'Times New Roman', serif; font-size: 23px; font-weight: 400; letter-spacing: 0.08em; color: #18181b; line-height: 1.05;">
            DOROGO
          </div>
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 3px;">
            <tr>
              <td width="46" style="width: 46px; padding-right: 7px; vertical-align: middle;">
                <div class="dm-rule" style="border-top: 1px solid #52525b; width: 46px; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</div>
              </td>
              <td align="right" style="white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 6.5px; font-weight: 600; letter-spacing: 0.14em; color: #52525b; text-transform: uppercase;" class="dm-sub">
                PRIVATE TRANSFERS
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;

  // Version 2 ('badge'): Official Drawn Graphic Logo with Dark-Mode Swap + Warm-Ivory Badge for Gmail iOS Dark Mode
  const badgeBrandHtml = `
    <div style="padding-bottom: 10px;">
      <img class="logo-light" src="${EMAIL_ASSETS_BASE}/logo-badge.png" alt="DOROGO Private Transfers" width="136" style="display: block; border: 0; max-width: 136px; height: auto;" />
      <!--[if !mso]><!-->
      <img class="logo-dark" src="${EMAIL_ASSETS_BASE}/logo-white.png" alt="DOROGO Private Transfers" width="120" style="display: none; border: 0; max-width: 120px; height: auto;" />
      <!--<![endif]-->
    </div>`;

  const brandBlock = footerStyle === 'badge' ? badgeBrandHtml : wordmarkBrandHtml;

  return `<!DOCTYPE html>
<html lang="${isIt ? 'it' : 'en'}" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>DOROGO | Private Transportation</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    @media (prefers-color-scheme: dark) {
      body, .dm-bg { background-color: #18181b !important; color: #f4f4f5 !important; }
      .dm-text, .dm-brand, .dm-link { color: #f4f4f5 !important; }
      .dm-sub { color: #d4d4d8 !important; }
      .dm-muted { color: #a1a1aa !important; }
      .dm-border { border-top-color: #3f3f46 !important; }
      .dm-rule { border-top-color: #a1a1aa !important; }
      .logo-light { display: none !important; }
      .logo-dark { display: block !important; }
    }
  </style>
</head>
<body class="dm-bg" style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #18181b;">
  <table class="dm-bg" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; margin: 0; padding: 24px 16px;">
    <tr>
      <td align="left" style="padding: 0;">
        <table class="email-container" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 620px;">
          <tr>
            <td class="dm-text" style="padding: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #18181b;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td class="dm-text" style="padding: 0 0 14px 0; font-size: 15px; color: #18181b; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${signOff}<br>
              <strong style="font-weight: 600;">Dmitri</strong>
            </td>
          </tr>
          <tr>
            <td style="padding: 0;">
              <table class="dm-bg dm-border" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e4e4e7; width: 100%; max-width: 480px; padding-top: 14px; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <tbody>
                  <tr>
                    <td style="padding-bottom: 2px;">
                      ${brandBlock}
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      <div style="font-size: 12px; color: #18181b; line-height: 1.8;">
                        <a class="dm-link" href="https://wa.me/32456141497" target="_blank" style="color: #18181b; font-weight: 500; text-decoration: none; margin-right: 12px; display: inline-block;">
                          <img src="${EMAIL_ASSETS_BASE}/wa-dual.png" width="12" height="12" alt="WA" style="vertical-align: -1.5px; margin-right: 5px; border: 0;" />WhatsApp
                        </a>
                        <span class="dm-muted" style="color: #a1a1aa; margin-right: 12px;">&bull;</span>
                        <a class="dm-link" href="mailto:${safeFrom}" style="color: #18181b; font-weight: 500; text-decoration: none; display: inline-block;">
                          <img src="${EMAIL_ASSETS_BASE}/mail-dual.png" width="12" height="12" alt="Mail" style="vertical-align: -1.5px; margin-right: 5px; border: 0;" />${safeFrom}
                        </a>
                      </div>
                      <div class="dm-muted" style="color: #71717a; font-size: 11px; margin-top: 3px; font-weight: 400;">
                        ${regionLine}
                      </div>
                      ${optoutText ? `<div class="dm-muted" style="color: #71717a; font-size: 11px; margin-top: 12px;">${htmlEsc(optoutText)}</div>` : ''}
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

