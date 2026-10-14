// Turn a template + prospect into a ready-to-review draft.

import { SIGNATURE, SIGNATURE_IT, SIGNATURE_RU, OPTOUT } from './constants.js';
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
  if (prospect.language === 'ru') return f ? `Здравствуйте, ${f},` : 'Здравствуйте,';
  if (prospect.language === 'de') return f ? `Hallo ${f},` : 'Guten Tag,';
  if (prospect.language === 'fr') return f ? `Bonjour ${f},` : 'Bonjour,';
  return f ? `Hi ${f},` : 'Hello,';
}

export function shortAgencyName(raw = '', lang = 'en') {
  const clean = String(raw || '').trim().replace(/\s*\(Test\)\s*$/i, '').trim();
  const s = clean
    .replace(/\s+(Events?\s*&\s*Concierge|Private\s+Events?|Wedding\s+Planners?|Wedding\s+Planning|Weddings?\s*&\s*Events?|Weddings?|Events?|S\.?r\.?l\.?)$/i, '')
    .trim();
  if (!s) return lang === 'it' ? 'il vostro studio' : lang === 'ru' ? 'ваша команда' : 'your team';
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
  return lang === 'it' ? 'Lago di Como e Nord Italia' : lang === 'ru' ? 'озеро Комо и Северная Италия' : 'Lake Como & Northern Italy';
}

function buildTailoredCopy(prospect = {}, agencyShort = '', venueOrLoc = '', lang = 'en', variant = 'A') {
  const type = prospect.type === 'wedding_planner' ? 'planner' : (prospect.type || 'planner');
  const idx = stableHashIndex(`${prospect.id || ''}:${prospect.agency_name || ''}`, 2);
  const hookText = String(prospect.personalization_hook || '');
  const isHookVariantB = /^(The hardest part of a Lake Como wedding's transport|La parte più complessa dei trasporti|Самая сложная часть логистики)/i.test(hookText);
  const effectiveVariant = isHookVariantB ? 'B' : (variant === 'B' ? 'B' : 'A');

  if (lang === 'ru') {
    if (type === 'venue' || type === 'concierge_hotel') {
      const targetVenue = agencyShort || venueOrLoc;
      return {
        subject_line_a: `Трансферы гостей для ${targetVenue}`,
        subject_line_b: 'Аэропортовые трансферы и шаттлы для отелей',
        service_pitch:
          `Мы организуем трансферы из аэропорта Мальпенса и шаттлы для гостей отелей и вилл в ${targetVenue}. Работаем на собственном представительском парке Mercedes-Benz V-Class и S-Class, а также проверенных минибусах до 50 мест с прямым координатором в WhatsApp.`,
        cta_line:
          'Если вашему консьерж-сервису полезно иметь прямой контакт с парком на сезон, напишите мне здесь или в WhatsApp, и я отправлю наш партнерский тариф.',
      };
    }

    const hasSpecificVenueRu = venueOrLoc && !/^(lake como|lago di como|озеро комо|северная италия|milan|милан)$/i.test(venueOrLoc);
    const ruSubjectsA = hasSpecificVenueRu
      ? [`Трансферы ${venueOrLoc} / 2027`, 'Трансферы на озере Комо 2027']
      : ['Трансферы на озере Комо 2027', 'Автопарк Mercedes на Комо 2027'];

    if (effectiveVariant === 'B') {
      return {
        subject_line_a: ruSubjectsA[idx],
        subject_line_b: 'Ночной разъезд гостей после свадебного ужина',
        service_pitch:
          'Ночной разъезд гостей — самый сложный момент свадебной логистики на озере Комо: узкие подъезды к виллам, гости живут в разных городках по побережью, а такси после полуночи отсутствует. Мы работаем на собственном автопарке Mercedes-Benz V-Class и S-Class прямо на озере, привлекаем минибусы до 50 мест и выделяем персонального координатора в WhatsApp на каждое мероприятие.',
        cta_line:
          'Если на предстоящих датах требуется надежный ночной разъезд или трансферы гостей, отправить вам схему шаттлов и наш партнерский лист тарифов, или логистика уже закрыта?',
      };
    }

    return {
      subject_line_a: ruSubjectsA[idx],
      subject_line_b: 'Ночной разъезд гостей после свадебного ужина',
      service_pitch:
        'Мы базируем собственный парк Mercedes-Benz V-Class и S-Class на озере Комо, плюс привлекаем проверенные минибусы до 50 мест. Мы специализируемся на встрече в Мальпенсе и ночном разъезде с вилл, когда такси вызвать невозможно. На сезон 2027 года у нас забронировано 2–3 партнерских места.',
      cta_line:
        'Отправить вам наш партнерский лист тарифов на 2027 год и схему ночных шаттлов, или у вас уже закрыты трансферы на озере?',
    };
  }

  if (lang === 'it') {
    if (type === 'venue' || type === 'concierge_hotel') {
      const targetVenue = agencyShort || venueOrLoc;
      return {
        subject_line_a: 'Transfer ospiti per il vostro team eventi',
        subject_line_b: 'Transfer aeroportuali e navette di gruppo',
        service_pitch:
          `Gestiamo transfer aeroportuali e navette per gli ospiti degli hotel e delle ville a ${targetVenue}. Operiamo con Mercedes-Benz Classe V e Classe S di nostra proprietà sul Lago di Como, Milano e nel Nord Italia, affiancate da partner selezionati per minibus e bus fino a 50 posti, con coordinamento diretto via WhatsApp.`,
        cta_line:
          'Se vi è utile avere una flotta di riferimento per la stagione, rispondetemi qui o su WhatsApp e vi condivido il listino riservato.',
      };
    }

    const hasSpecificVenueIt = venueOrLoc && !/^(lago di como|lake como|milano|italia)$/i.test(venueOrLoc);
    const itSubjectsA = hasSpecificVenueIt
      ? [`Transfer ${venueOrLoc} / 2027`, 'Transfer ospiti Lago di Como 2027']
      : ['Transfer ospiti Lago di Como 2027', 'Flotta Mercedes Lago di Como 2027'];

    if (effectiveVariant === 'B') {
      return {
        subject_line_a: itSubjectsA[idx],
        subject_line_b: 'Rientri notturni dopo il ricevimento',
        service_pitch:
          'Il rientro notturno è il momento più critico per i matrimoni sul Lago di Como: accessi stretti alle ville, ospiti distribuiti su diversi paesi del lago e nessun taxi disponibile a notte fonda. Operiamo con una flotta Mercedes-Benz Classe V e Classe S di proprietà basata sul lago, più minibus fino a 50 posti e un referente operativo dedicato su WhatsApp per ogni evento.',
        cta_line:
          'Se avete un matrimonio con transfer complessi o rientri notturni dalle ville, può esservi utile ricevere il piano navette e il nostro listino riservato, o avete già fornitori fissi sul lago?',
      };
    }

    return {
      subject_line_a: itSubjectsA[idx],
      subject_line_b: 'Rientri notturni dopo il ricevimento',
      service_pitch:
        'Operiamo con una flotta Mercedes-Benz Classe V e Classe S basata sul Lago di Como, più minibus fino a 50 posti. Gestiamo transfer da Malpensa e rientri notturni dalle ville dove i taxi non operano. Per garantire veicoli dedicati e referente WhatsApp, riserviamo 2 o 3 posti partner per la stagione 2027.',
      cta_line:
        'Può esservi utile ricevere il nostro listino partner 2027 e lo schema dei circuiti villa, o avete già fornitori fissi sul lago?',
    };
  }

  // English MECE Variant C: Hotels, Concierges & Venues
  if (type === 'venue' || type === 'concierge_hotel') {
    const targetVenue = agencyShort || venueOrLoc;
    return {
      subject_line_a: 'Guest transfers for your events team',
      subject_line_b: 'Airport transfers and group shuttles',
      service_pitch:
        `How does your team handle airport runs and group shuttles around ${targetVenue}? We operate executive Mercedes-Benz V-Class and S-Class vehicles directly across Lake Como, Milan, and Northern Italy, plus vetted partner minibuses up to 50 seats for large wedding parties, with one dedicated lead on WhatsApp.`,
      cta_line:
        'Reply here or text me on WhatsApp and I will send our rate card and vehicle guide.',
    };
  }

  // English MECE Variant A (Introduction) vs Variant B (Late Returns After the Reception)
  const hasSpecificVenue = venueOrLoc && !/^(lake como|lago di como|milan|italy)$/i.test(venueOrLoc);
  const plannerSubjectsA = hasSpecificVenue
    ? [`${venueOrLoc} transfers / 2027`, 'Lake Como transfers 2027']
    : ['Lake Como transfers 2027', 'v-class transfers / Lake Como'];

  if (effectiveVariant === 'B') {
    return {
      subject_line_a: plannerSubjectsA[idx],
      subject_line_b: 'Late returns after the reception',
      service_pitch:
        'Late-night villa returns are where Lake Como weddings face the biggest friction: narrow access, guests in scattered hotels, and zero taxis past midnight. We operate an executive Mercedes-Benz V-Class and S-Class fleet on the lake, plus vetted minibuses up to 50 seats, with one dedicated fleet lead on WhatsApp.',
      cta_line:
        'If an upcoming date has tight guest logistics or late-night returns, would having our 2027 partner rate card and shuttle circuits be useful for your file, or do you already have fixed transfer partners on the lake?',
    };
  }

  return {
    subject_line_a: plannerSubjectsA[idx],
    subject_line_b: 'Late returns after the reception',
    service_pitch:
      'We operate an executive Mercedes-Benz V-Class and S-Class fleet based on Lake Como, plus vetted minibuses up to 50 seats. Because villa roads are narrow and taxis are unavailable past midnight, we reserve capacity for 2 or 3 partner studios for the 2027 season to guarantee vehicle availability.',
    cta_line:
      'Would having our 2027 partner rate card and villa shuttle circuits be useful for your file, or do you already have fixed transfer partners on the lake?',
  };
}

export function buildVars(prospect, extra = {}) {
  const lang = ['it', 'ru'].includes(prospect.language) ? prospect.language : 'en';
  const agency_short = shortAgencyName(prospect.agency_name, lang);
  const venue_or_location = resolveVenueOrLocation(prospect, agency_short, lang);
  const variant = extra.variant === 'B' ? 'B' : 'A';
  const tailored = buildTailoredCopy(prospect, agency_short, venue_or_location, lang, variant);
  const sig = lang === 'it' ? SIGNATURE_IT : lang === 'ru' ? SIGNATURE_RU : SIGNATURE;
  let cleanHook = (prospect.personalization_hook || '').trim();
  cleanHook = cleanHook
    .replace(/^(Здравствуйте[,\s]+([А-Яа-яA-Za-z]+[,\s]+)?|Buongiorno[,\s]+([A-Za-z]+[,\s]+)?|Hi\s+[A-Za-z]+[,\s]+|Hello[,\s]+)/i, '')
    .trim();
  if (cleanHook) {
    cleanHook = cleanHook.charAt(0).toUpperCase() + cleanHook.slice(1);
  }
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
    hook: cleanHook,
    venue: (prospect.key_venues || [])[0] || venue_or_location,
    location: prospect.location || venue_or_location,
    signature: sig,
    optout: OPTOUT[lang] || OPTOUT.en,
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
      .email-body, .dm-bg { background-color: #18181b !important; color: #f4f4f5 !important; }
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
<body class="email-body dm-bg" style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #18181b;">
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
                          WhatsApp
                        </a>
                        <span class="dm-muted" style="color: #a1a1aa; margin-right: 12px;">&bull;</span>
                        <a class="dm-link" href="mailto:${safeFrom}" style="color: #18181b; font-weight: 500; text-decoration: none; display: inline-block;">
                          ${safeFrom}
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

