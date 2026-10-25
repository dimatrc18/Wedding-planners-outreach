// Turn a template + prospect into a ready-to-review draft.

import { SIGNATURE, SIGNATURE_IT, SIGNATURE_RU, OPTOUT } from './constants.js';
import { DEFAULT_TEMPLATES, REPLY_FOR_INTENT } from './templates.js';
import { lintMessage } from './lint.js';

export function firstName(contact = '') {
  const str = String(contact || '').trim();
  if (/\b(team|studio|agency|office|concierge|planners?|planning|events?|management|group|boutique|service|desk|hotel|villa|relais|palace|resort)\b/i.test(str)) {
    return '';
  }
  const n = str.split(/\s+/)[0] || '';
  if (/^(villa|hotel|grand|relais|palace|resort|team|events?|concierge|info|hello|office|studio|agency|wedding|weddings|planning|planner)$/i.test(n)) return '';
  if (!/^[\p{L}'’-]{2,}$/u.test(n)) return '';
  return n.charAt(0).toUpperCase() + n.slice(1);
}

function stableHash(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function generateBulletproofHook(prospect = {}) {
  const lang = prospect.language === 'it' ? 'it' : (prospect.language === 'ru' ? 'ru' : 'en');
  const venues = (Array.isArray(prospect.key_venues) ? prospect.key_venues : [])
    .map((v) => String(v || '').trim())
    .filter((v) => v && !/^(lake\s+como|lago\s+di\s+como|italy|milan)$/i.test(v));
  const loc = String(prospect.location || '').toLowerCase();
  const v = venues[0];
  const name = prospect.agency_name || prospect.id || 'p';
  const pick = (arr) => arr[stableHash(name) % arr.length];

  const isTuscany = /tuscany|toscana|florence|firenze|chianti|siena/.test(loc) || (v && /tuscany|florence|firenze/i.test(v));
  const isComo = /como|bellagio|cernobbio|tremezzo|passalacqua|balbiano|balbianello|erba|pizzo|d'este/.test(loc) || (v && /passalacqua|balbiano|balbianello|erba|pizzo|d'este|cipressi|monastero/i.test(v));

  if (lang === 'it') {
    if (v && /balbianello/i.test(v)) return pick([
      "Ho visto le vostre nozze a Villa del Balbianello, l'arrivo in barca al tramonto era davvero spettacolare.",
      "Ho visto la vostra celebrazione a Villa del Balbianello, l'allestimento a lago era magnifico.",
      "Ho visto i vostri allestimenti a Villa del Balbianello, la cerimonia sulla loggia era splendida."
    ]);
    if (v && /balbiano/i.test(v)) return pick([
      "Ho visto la vostra celebrazione a Villa Balbiano, la cena nei giardini a lago era meravigliosa.",
      "Ho visto i vostri allestimenti a Villa Balbiano, giochi di luce e cena all'aperto splendidi.",
      "Ho visto le vostre nozze a Villa Balbiano, styling ed eleganza a lago davvero unici."
    ]);
    if (v && /passalacqua/i.test(v)) return pick([
      "Ho visto i vostri eventi a Passalacqua, atmosfera e cura dei dettagli nei giardini davvero splendide.",
      "Ho visto le vostre nozze a Passalacqua, allestimento a bordo piscina e a lago impeccabile."
    ]);
    if (v && /erba/i.test(v)) return pick([
      "Ho visto la vostra celebrazione a Villa Erba, allestimento nel padiglione davvero magnifico.",
      "Ho visto il vostro evento a Villa Erba, scala e giochi di luce sulla terrazza a lago splendidi."
    ]);
    if (v && /d'este/i.test(v)) return pick([
      "Ho visto le vostre nozze a Villa d'Este, eleganza senza tempo sulla terrazza a lago.",
      "Ho visto i vostri allestimenti a Villa d'Este, la cena nella corte interna era magnifica."
    ]);
    if (v) return pick([
      `Ho visto i vostri allestimenti a ${v}, complimenti per lo styling e la cura dei dettagli.`,
      `Ho visto la vostra recente celebrazione a ${v}, allestimento a lago davvero splendido.`
    ]);
    if (isTuscany) return pick([
      "Ho visto i vostri matrimoni in Toscana, allestimento nella corte del borgo davvero splendido.",
      "Ho visto le vostre celebrazioni in Toscana, atmosfera tra le colline e cena a lume di candela meravigliose."
    ]);
    if (isComo) return pick([
      "Ho visto le vostre nozze sul Lago di Como, styling e atmosfera a lago davvero impeccabili.",
      "Ho visto le vostre celebrazioni sul Lago di Como, allestimenti sul lungolago davvero splendidi."
    ]);
    return pick([
      "Ho visto i vostri destination wedding in Italia, davvero complimenti per lo stile e la cura dei dettagli.",
      "Ho visto le vostre recenti celebrazioni in Italia, eleganza e allestimenti impeccabili."
    ]);
  }

  if (lang === 'ru') {
    if (v && /balbianello/i.test(v)) return pick([
      'Увидел вашу свадьбу на Villa del Balbianello, потрясающая церемония у воды и выход на катерах.',
      'Обратил внимание на ваши проекты на Villa del Balbianello, великолепная локация и оформление.'
    ]);
    if (v && /balbiano/i.test(v)) return pick([
      'Обратил внимание на ваши проекты на Villa Balbiano, невероятно красивый ужин в саду у озера.',
      'Увидел вашу свадьбу на Villa Balbiano, оформление и атмосфера у воды выглядели потрясающе.'
    ]);
    if (v && /passalacqua/i.test(v)) return pick([
      'Увидел ваши свадебные проекты в Passalacqua, потрясающая атмосфера и внимание к деталям.',
      'Обратил внимание на ваше торжество в Passalacqua, красивейший ужин в оливковом саду.'
    ]);
    if (v && /erba/i.test(v)) return pick([
      'Обратил внимание на ваше торжество на Villa Erba, великолепный масштаб и оформление.',
      'Увидел ваше мероприятие на Villa Erba, вечерний прием и подсветка выглядели впечатляюще.'
    ]);
    if (v && /d'este/i.test(v)) return pick([
      'Обратил внимание на вашу свадьбу на Villa d\'Este, классическая элегантность на террасе у воды.',
      'Увидел ваши проекты на Villa d\'Este, великолепный ужин во внутреннем дворе.'
    ]);
    if (v) return pick([
      `Обратил внимание на ваши недавние свадебные проекты в ${v}, очень красивое оформление и детали.`,
      `Увидел вашу недавнюю свадьбу в ${v}, великолепный уровень и эстетика.`
    ]);
    if (isTuscany) return pick([
      'Увидел вашу недавнюю свадьбу в Тоскане, потрясающий ужин при свечах в усадьбе.',
      'Обратил внимание на ваши проекты в Тоскане, очень красивая атмосфера среди холмов.'
    ]);
    if (isComo) return pick([
      'Обратил внимание на ваши свадьбы на озере Комо, очень красивое оформление церемоний у воды.',
      'Увидел ваши проекты на озере Комо, потрясающий стиль и атмосфера.'
    ]);
    return pick([
      'Обратил внимание на ваши выездные свадьбы в Италии, очень сильное и красивое портфолио.',
      'Увидел ваши итальянские свадебные проекты, великолепный вкус и внимание к деталям.'
    ]);
  }

  // English
  if (v && /balbianello/i.test(v)) return pick([
    'Saw your celebration at Villa del Balbianello, the arrival by wooden boat at dusk was stunning.',
    'Saw your wedding at Villa del Balbianello, beautiful ceremony setup by the water.',
    'Came across your celebration at Villa del Balbianello, stunning lakeside setting and styling.'
  ]);
  if (v && /balbiano/i.test(v)) return pick([
    'Saw your celebration at Villa Balbiano, stunning garden dinner setup and lighting.',
    'Saw your wedding at Villa Balbiano, loved the styling and lakeside atmosphere.',
    'Came across your celebration at Villa Balbiano, beautiful ceremony setup by the water.'
  ]);
  if (v && /passalacqua/i.test(v)) return pick([
    'Saw your celebration at Passalacqua, the garden setting and olive grove dinner looked incredible.',
    'Saw your wedding at Passalacqua, beautiful styling and lakeside atmosphere.',
    'Came across your celebration at Passalacqua, timeless setting by the water.'
  ]);
  if (v && /erba/i.test(v)) return pick([
    'Saw your celebration at Villa Erba, magnificent glasshouse pavilion setup and lighting.',
    'Saw your event at Villa Erba, incredible scale and lakeside setting.',
    'Came across your celebration at Villa Erba, loved the evening reception setup.'
  ]);
  if (v && /d'este/i.test(v)) return pick([
    'Saw your wedding at Villa d\'Este, timeless setting on the lake terrace.',
    'Saw your celebration at Villa d\'Este, stunning courtyard dinner and floral styling.',
    'Came across your celebration at Villa d\'Este, beautiful lakeside setting.'
  ]);
  if (v && /pizzo/i.test(v)) return pick([
    'Saw your celebration at Villa Pizzo, the lakeside terrace and cypress avenue looked stunning.',
    'Saw your wedding at Villa Pizzo, loved the dinner setup along the water.'
  ]);
  if (v) return pick([
    `Saw your celebration at ${v}, stunning setup and styling.`,
    `Saw your wedding at ${v}, loved how the dinner setup and lighting turned out.`,
    `Came across your celebration at ${v}, beautiful lakeside atmosphere.`
  ]);
  if (isTuscany) return pick([
    'Saw your recent wedding in Tuscany, stunning courtyard dinner and lighting.',
    'Saw your celebration in Tuscany, beautiful vineyard setting and styling.',
    'Came across your event in Florence, stunning terrace setup overlooking the city.'
  ]);
  if (isComo) return pick([
    'Saw your destination celebrations on Lake Como, stunning lakeside styling and atmosphere.',
    'Came across your Lake Como celebrations, loved the dinner setups by the water.'
  ]);
  return pick([
    'Came across your destination weddings in Italy, really impressive portfolio and curation.',
    'Saw your recent Italian destination celebrations, beautiful styling across every detail.'
  ]);
}

export function cleanPersonalizationHook(hook = '', prospect = {}) {
  let s = String(hook || '').trim();
  if (!s) return '';
  // Strip greeting with name followed by punctuation: e.g. "Здравствуйте, Анна," or "Hi Hannah," or "Buongiorno Chiara,"
  s = s.replace(/^(?:здравствуйте|добрый\s+день|приветствую|buongiorno|buonasera|ciao|hello|hi|dear)[,\s]+[\p{L}'’-]+[,!:\n]\s*/iu, '');
  // Strip standalone greeting: e.g. "Здравствуйте," or "Здравствуйте!" or "Buongiorno," or "Hello,"
  s = s.replace(/^(?:здравствуйте|добрый\s+день|приветствую|buongiorno|buonasera|ciao|hello|hi|dear)[,\s!:]+\s*/iu, '');
  s = s.trim();

  // If hook has banned words ("seamless", "seamlessly") or robotic formula, replace with bulletproof hook
  const hasSeamless = /\bseamless(ly)?\b/i.test(s);
  const isGenericAiFormula = /^(?:your\s+(?:understated|calm|bespoke|milestone|grand|turnkey|royal|boutique|institutional|international|experiential|high-energy|design-driven|personalized|focus|pan-european|celebrity|legendary|cross-border|editorial|meticulous|ambitious|poetic|signature|two\s+decades|group\s+travel))\b/i.test(s);

  if ((hasSeamless || isGenericAiFormula) && prospect && (prospect.key_venues || prospect.location || prospect.agency_name)) {
    return generateBulletproofHook(prospect);
  }

  // Sanitize any remaining banned words
  s = s.replace(/\bseamlessly\b/gi, 'smoothly')
       .replace(/\bseamless\b/gi, 'smooth')
       .replace(/\bbespoke solutions?\b/gi, 'tailored logistics')
       .replace(/\btop[- ]notch\b/gi, 'first-class')
       .replace(/\belevate your\b/gi, 'support your')
       .trim();

  if (s) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s;
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
  return lang === 'it' ? 'Lago di Como, Toscana, Venezia e Nord Italia' : lang === 'ru' ? 'озеро Комо, Тоскана, Венеция и Северная Италия' : 'Lake Como, Tuscany, Venice & Northern Italy';
}

function buildTailoredCopy(prospect = {}, agencyShort = '', venueOrLoc = '', lang = 'en', variant = 'A') {
  const type = prospect.type === 'wedding_planner' ? 'planner' : (prospect.type || 'planner');
  const hookText = String(prospect.personalization_hook || '');
  const isHookVariantB = /^(The hardest part of a Lake Como wedding's transport|La parte più complessa dei trasporti|Самая сложная часть логистики)/i.test(hookText);
  const effectiveVariant = isHookVariantB ? 'B' : (variant === 'B' ? 'B' : (variant === 'C' ? 'C' : 'A'));

  if (lang === 'ru') {
    if (type === 'venue' || type === 'concierge_hotel') {
      const targetVenue = agencyShort || venueOrLoc;
      return {
        subject_line_a: `Трансферы гостей для ${targetVenue}`,
        subject_line_b: 'Аэропортовые трансферы и шаттлы для отелей',
        subject_line_c: 'Прямой контакт с автопарком: трансферы гостей',
        service_pitch:
          `Мы организуем трансферы из аэропортов (Мальпенса, Линате, Венеция, Флоренция, Ницца) и шаттлы для гостей отелей и вилл в ${targetVenue}. Работаем на собственном представительском парке Mercedes-Benz V-Class и S-Class, а также комфортабельных минибусах до 50 мест с прямым координатором в WhatsApp на озере Комо, в Милане, Тоскане, Венеции и Ницце (Лазурный берег).`,
        cta_line:
          'Если вашему консьерж-сервису полезно иметь прямой контакт с парком на сезон, напишите мне здесь или в WhatsApp, и я отправлю наш партнерский тариф.',
      };
    }

    const ruAgency = agencyShort || prospect.agency_name || 'Партнер';
    const ruSubjects = {
      a: `DOROGO x ${ruAgency}`,
      b: 'резервный парк Mercedes V-Class / 2027',
      c: 'вопрос по трансферам гостей',
    };

    return {
      subject_line_a: ruSubjects.a,
      subject_line_b: ruSubjects.b,
      subject_line_c: ruSubjects.c,
      service_pitch:
        'Мы организуем трансферы гостей на собственном автопарке представительских Mercedes-Benz V-Class и S-Class, а также комфортабельных минибусах до 50 мест на озере Комо, в Милане, Тоскане, Венеции и Ницце (Лазурный берег). Мы не стремимся заменить ваших основных перевозчиков, но на пиковые даты, когда парк перегружен, мы держим резервные слоты для партнерских студий.',
      cta_line:
        'Отправить вам наш партнерский лист тарифов на 2027 год и схему шаттлов, или у вас уже закрыты трансферы на сезон?',
    };
  }

  if (lang === 'it') {
    if (type === 'venue' || type === 'concierge_hotel') {
      const targetVenue = agencyShort || venueOrLoc;
      return {
        subject_line_a: 'Transfer ospiti per il vostro team eventi',
        subject_line_b: 'Transfer aeroportuali e navette di gruppo',
        subject_line_c: 'Contatto diretto flotta: transfer per ospiti',
        service_pitch:
          `Gestiamo transfer aeroportuali e navette per gli ospiti degli hotel e delle ville a ${targetVenue}. Operiamo con Mercedes-Benz Classe V e Classe S di nostra proprietà tra Milano, Lago di Como, Toscana, Venezia e Nizza (Costa Azzurra), affiancate da partner selezionati per minibus e bus fino a 50 posti, con coordinamento diretto via WhatsApp.`,
        cta_line:
          'Se vi è utile avere una flotta di riferimento per la stagione, rispondetemi qui o su WhatsApp e vi condivido il listino riservato.',
      };
    }

    const itAgency = agencyShort || prospect.agency_name || 'Partner';
    const itSubjects = {
      a: `DOROGO x ${itAgency}`,
      b: 'flotta Mercedes di supporto per il 2027',
      c: 'breve domanda sulla gestione transfer',
    };

    return {
      subject_line_a: itSubjects.a,
      subject_line_b: itSubjects.b,
      subject_line_c: itSubjects.c,
      service_pitch:
        'Operiamo con una flotta Mercedes-Benz Classe V e Classe S basata sul Lago di Como e attiva a Milano, in Toscana, a Venezia e a Nizza (Costa Azzurra), più minibus fino a 50 posti. Non cerchiamo di sostituire i vostri autisti di fiducia, ma nelle date di punta in cui le disponibilità scarseggiano, riserviamo disponibilità di flotta per le agenzie partner.',
      cta_line:
        'Può esservi utile ricevere il nostro listino riservato 2027 e lo schema dei circuiti villa, o avete già fornitori fissi?',
    };
  }

  // English MECE Variant C: Hotels, Concierges & Venues
  if (type === 'venue' || type === 'concierge_hotel') {
    const targetVenue = agencyShort || venueOrLoc;
    return {
      subject_line_a: 'Guest transfers for your events team',
      subject_line_b: 'Airport transfers and group shuttles',
      subject_line_c: 'Direct fleet contact: event guest transfers',
      service_pitch:
        `How does your team handle airport runs and group shuttles around ${targetVenue}? We operate executive Mercedes-Benz V-Class and S-Class vehicles directly across Lake Como, Milan, Tuscany, Venice, Nice (French Riviera), and Northern Italy, plus vetted partner minibuses up to 50 seats for large wedding parties, with one dedicated lead on WhatsApp.`,
      cta_line:
        'Reply here or text me on WhatsApp and I will send our rate card and vehicle guide.',
    };
  }

  const enAgency = agencyShort || prospect.agency_name || 'Partner';
  const enSubjects = {
    a: `DOROGO x ${enAgency}`,
    b: 'backup V-Class fleet for 2027',
    c: 'quick question re: guest transport',
  };

  return {
    subject_line_a: enSubjects.a,
    subject_line_b: enSubjects.b,
    subject_line_c: enSubjects.c,
    service_pitch:
      'We operate an executive Mercedes-Benz V-Class and S-Class fleet based on Lake Como and active across Milan, Tuscany, Venice, and Nice (French Riviera), plus vetted minibuses up to 50 seats. We are not looking to replace your usual drivers, but on peak summer dates when villa schedules exceed capacity, we hold dedicated backup fleet slots on reserve for partner studios.',
    cta_line:
      'Would having our 2027 partner rate card and villa shuttle circuits be useful for your file, or do you already have fixed transfer partners in Italy?',
  };
}

export function buildVars(prospect, extra = {}) {
  const lang = ['it', 'ru'].includes(prospect.language) ? prospect.language : 'en';
  const agency_short = shortAgencyName(prospect.agency_name, lang);
  const venue_or_location = resolveVenueOrLocation(prospect, agency_short, lang);
  const variant = ['A', 'B', 'C'].includes(extra.variant) ? extra.variant : 'A';
  const tailored = buildTailoredCopy(prospect, agency_short, venue_or_location, lang, variant);
  const sig = lang === 'it' ? SIGNATURE_IT : lang === 'ru' ? SIGNATURE_RU : SIGNATURE;
  const cleanHook = cleanPersonalizationHook(prospect.personalization_hook, prospect);
  return {
    greeting: greeting(prospect),
    first_name: firstName(prospect.contact_name),
    agency: prospect.agency_name || agency_short,
    agency_short,
    venue_or_location,
    subject_line_a: tailored.subject_line_a,
    subject_line_b: tailored.subject_line_b,
    subject_line_c: tailored.subject_line_c,
    service_pitch: tailored.service_pitch,
    cta_line: tailored.cta_line,
    hook: cleanHook,
    venue: (prospect.key_venues || [])[0] || venue_or_location,
    location: prospect.location || venue_or_location,
    signature: '',
    signature_raw: sig,
    optout: OPTOUT[lang] || OPTOUT.en,
    sender_name: lang === 'ru' ? 'Дмитрий' : 'Dmitri',
    ...extra,
  };
}

// Replace {{var}} with a non-empty value; leave the placeholder otherwise so the linter can flag it.
export function merge(text = '', vars = {}) {
  return String(text).replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => {
    const v = vars[k];
    if (k === 'signature') return v !== undefined && v !== null ? String(v) : '';
    return v === undefined || v === null || String(v).trim() === '' ? m : String(v);
  });
}

export function pickTemplate(templates, key, language = 'en') {
  const dbList = (templates && templates.length ? templates : []).filter((t) => t.key === key && t.active !== false);
  const exactDb = dbList.find((t) => t.language === language);
  if (exactDb) return exactDb;
  const defList = DEFAULT_TEMPLATES.filter((t) => t.key === key && t.active !== false);
  const exactDef = defList.find((t) => t.language === language);
  if (exactDef) return exactDef;
  return dbList.find((t) => t.language === 'en') || defList.find((t) => t.language === 'en') || null;
}

// Stable A/B/C split per prospect, so a prospect never sees both subject variants.
export function assignVariant(seed, template) {
  let h = 2166136261;
  for (const c of String(seed || 'dorogo')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  if (template && template.subject_c) {
    const rem = (h >>> 0) % 3;
    return rem === 0 ? 'A' : (rem === 1 ? 'B' : 'C');
  }
  if (!template || !template.subject_b) return 'A';
  return (h >>> 0) % 2 === 0 ? 'A' : 'B';
}

const reSubject = (s) => (!s ? '' : /^re:/i.test(s) ? s : `Re: ${s}`);

/**
 * buildDraft({ prospect, key, templates, threadSubject, step, extraVars })
 * → { subject, body, variant, template_id, template_key, attach_rate_card, lint }
 */
export function buildDraft({ prospect, key, templates, threadSubject = '', step = null, extraVars = {} }) {
  const lang = ['it', 'ru'].includes(prospect.language) ? prospect.language : 'en';
  const t = pickTemplate(templates, key, lang);
  if (!t) return null;
  const hookText = String((extraVars && extraVars.hook) || prospect.personalization_hook || '');
  const inferredHookVariant = /^(The hardest part of a Lake Como wedding's transport|La parte più complessa dei trasporti|Самая сложная часть свадебной логистики)/i.test(hookText)
    ? 'B'
    : /^(I'm Dmitri from DOROGO|Sono Dmitri di DOROGO|Я Дмитрий из компании DOROGO)/i.test(hookText)
      ? 'A'
      : null;
  const variant = ['A', 'B', 'C'].includes(extraVars.variant)
    ? extraVars.variant
    : (inferredHookVariant || assignVariant(prospect.id, t));
  const vars = buildVars(prospect, { variant, ...extraVars });
  const threaded = (step && step.thread) || t.kind === 'reply' || t.kind === 'nudge';
  const rawSubject = variant === 'C'
    ? (t.subject_c || vars.subject_line_c || t.subject_a || vars.subject_line_a)
    : (variant === 'B' ? (t.subject_b || vars.subject_line_b) : (t.subject_a || vars.subject_line_a));
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

// Strip trailing or embedded plain-text signature blocks or sign-offs
export function stripSignOff(raw = '') {
  if (!raw) return '';
  const SIG_BLOCK_RE = /\n*(?:Dmitri(?:\s+Traciuc)?|Дмитрий(?:\s+Трачук)?)\s*\n+(?:Senior Dispatcher|Старший диспетчер|Founder|DOROGO)[^\n]*\n+(?:(?:Lake Como|Lago di Como|Озеро Комо|Tuscany|Venice|Toscana|Venezia|Milano|Milan)[^\n]*\n*|(?:dmitri@dorogo\.eu|wa\.me)[^\n]*\n*)*/gi;

  return String(raw).trim()
    .replace(SIG_BLOCK_RE, '')
    .replace(/(?:Warm regards|Kind regards|Best regards|With warm regards|Regards|Sincerely|Un cordiale saluto|Cordiali saluti|Distinti saluti|A presto|С уважением|Всего доброго),?[\s\S]*$/i, '')
    .replace(/\n*(?:Dmitri(?:\s+Traciuc)?|Дмитрий(?:\s+Трачук)?)\s*\n+(?:Senior Dispatcher|Старший диспетчер|Founder|DOROGO)[\s\S]*$/i, '')
    .replace(/\n*(?:Dmitri|Дмитрий)\s*\n+(?:DOROGO|WhatsApp|wa\.me|dmitri@dorogo\.eu)[^\n]*[\s\S]*$/i, '')
    .replace(/\n+(?:Dmitri(?:\s+Traciuc)?|Дмитрий(?:\s+Трачук)?)\s*$/i, '')
    .replace(/\n*(?:dmitri@dorogo\.eu|wa\.me\/32456141497|WhatsApp:\s*wa\.me)[^\n]*$/i, '')
    .trim();
}

/**
 * Ported from dorogo-ai-concierge/email.js (generateLuxuryHtmlEmail):
 * Wraps plain-text outreach/concierge copy in DOROGO's executive HTML email layout
 * with dual-mode (Light Mode + Dark Mode) optimization and two selectable footer versions:
 * - 'wordmark' (Version 1, default): Pure HTML luxury serif wordmark + hairline rule that natively inverts to crisp white in Gmail iOS / Apple Mail / Outlook Dark Mode with zero background box.
 * - 'badge' (Version 2): Official drawn graphic logo with @media (prefers-color-scheme: dark) white logo swap + warm-ivory rounded badge fallback so Gmail iOS Dark Mode never renders black-on-black.
 */
export function renderDorogoLuxuryHtmlEmail(
  textContent = '',
  { fromEmail = 'dmitri@dorogo.eu', pixelUrl = null, footerStyle = 'wordmark', lang = null } = {}
) {
  const raw = String(textContent || '').trim();
  const detectedRu = /Здравствуйте|Добрый день|С уважением|дайте знать|никаких вопросов|Трачук|Комо|Милан|разъезд/i.test(raw);
  const detectedIt = /Un cordiale saluto|Buongiorno|rispondere "no"|nessun problema, basta farmelo sapere|Lago di Como/i.test(raw);
  const effectiveLang = (lang === 'ru' || lang === 'it' || lang === 'en') ? lang : (detectedRu ? 'ru' : detectedIt ? 'it' : 'en');
  const isIt = effectiveLang === 'it';
  const isRu = effectiveLang === 'ru';

  // Separate opt-out line if present at the bottom
  let optoutText = '';
  let bodyWithoutOptout = raw;
  for (const opt of [OPTOUT.en, OPTOUT.it, OPTOUT.ru]) {
    if (bodyWithoutOptout.includes(opt)) {
      optoutText = opt;
      bodyWithoutOptout = bodyWithoutOptout.split(opt).join('').trim();
    }
  }

  // Also check for case-insensitive optout line in case formatting varied
  if (!optoutText) {
    const optMatch = bodyWithoutOptout.match(/if transport isn't something you handle[^\n.]*\.?/i)
      || bodyWithoutOptout.match(/se i trasporti non sono un servizio[^\n.]*\.?/i)
      || bodyWithoutOptout.match(/если вы не занимаетесь трансферами[^\n.]*\.?/i);
    if (optMatch) {
      optoutText = optMatch[0];
      bodyWithoutOptout = bodyWithoutOptout.replace(optMatch[0], '').trim();
    }
  }

  // Strip trailing or embedded plain-text signature blocks from body paragraphs since we render the styled footer
  let cleanText = stripSignOff(bodyWithoutOptout);

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

  const signOff = isIt ? 'Un cordiale saluto,' : isRu ? 'С уважением,' : 'Warm regards,';
  const regionLine = isIt ? 'Milano &bull; Lago di Como &bull; Alpi' : isRu ? 'Милан &bull; Озеро Комо &bull; Альпы' : 'Milan &bull; Lake Como &bull; Italian Alps';
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
<html lang="${effectiveLang}" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
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
              <strong style="font-weight: 600;">${isRu ? 'Дмитрий' : 'Dmitri'}</strong><br>
              <span style="font-size: 13px; color: #52525b;">${isRu ? 'Старший диспетчер' : 'Senior Dispatcher'}</span>
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

/**
 * Builds high-converting, concise social openers for Instagram DM or WhatsApp.
 * Designed for multi-channel touches when planners are active on social media.
 */
export function buildSocialOpener(prospect = {}, channel = 'instagram') {
  const lang = ['it', 'ru'].includes(prospect.language) ? prospect.language : 'en';
  const name = firstName(prospect.contact_name);
  const agency = prospect.agency_name || '';

  if (channel === 'whatsapp') {
    if (lang === 'it') {
      return `Ciao ${name || ''}${name ? ', ' : ''}qui Dmitri di DOROGO (NCC lago di Como & Milano). Volevo solo lasciarti il contatto diretto per le date estive in cui la tua flotta abituale è satura e serve un supporto d'emergenza con van Mercedes o minibus. Ti lascio la scheda tariffe o un contatto per quando serve?`.trim();
    }
    if (lang === 'ru') {
      return `Привет, ${name || ''}${name ? '! ' : ''}Дмитрий из DOROGO (трансферы и мерседесы на озере Комо). Сохрани наш контакт на случай пиковых свадебных дат, когда основные водители заняты и нужен срочный резерв (V-Class, S-Class, минибусы). Скинуть тебе наш партнерский прайс-лист в WhatsApp?`.trim();
    }
    return `Hi ${name || ''}${name ? ', ' : ''}Dmitri from DOROGO (Lake Como & Milan NCC). Just wanted to leave our direct contact for peak wedding weekends when your usual drivers are fully booked and you need vetted backup fleet (Mercedes V-Class, S-Class, minibuses). Should I send our 2027 partner rate sheet here?`.trim();
  }

  // Instagram DM (punchy, casual luxury, direct)
  if (lang === 'it') {
    return `Ciao ${name || agency || ''}${name || agency ? ' — ' : ''}complimenti sinceri per le produzioni sul Lago. Sono Dmitri di DOROGO (flotta Mercedes & minibus su Como/Milano). Se per la stagione ti capita un weekend con flotta abituale già al completo, teniamo sempre van di backup dedicati ai planner. Ti giro la scheda partner in DM o via email?`.trim();
  }
  if (lang === 'ru') {
    return `Привет, ${name || agency || ''}${name || agency ? ' — ' : ''}очень красивое портфолио на Комо! Я Дмитрий из DOROGO (собственный парк Mercedes V/S-Class и минибусов на Комо и в Милане). Если в сезон твои основные подрядчики будут на 100% заняты, мы держим резервные слоты для координаторов. Прислать партнерские тарифы сюда или на почту?`.trim();
  }
  return `Hi ${name || agency || ''}${name || agency ? ' — ' : ''}stunning work across Lake Como! I'm Dmitri from DOROGO (Mercedes V-Class & minibus fleet on Lake Como/Milan). If you ever hit peak wedding Saturdays where your regular fleet is fully maxed out, we hold dedicated backup slots for planners. Would our 2027 partner rate card be helpful here or over email?`.trim();
}

