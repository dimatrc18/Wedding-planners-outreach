// Default message templates. Loaded into the `outreach_templates` table by the seed migration and used
// as-is in demo mode. Edit them in the app (Templates view); the database copy wins once it exists.
// Variables: {{greeting}} {{first_name}} {{agency}} {{hook}} {{venue}} {{location}} {{optout}}
// Reply templates may contain {{slot_1}}-style blanks on purpose: the linter blocks approval until they are filled.

export const DEFAULT_TEMPLATES = [
  // ---------------- English sequence ----------------
  {
    key: 'T1_intro', language: 'en', kind: 'sequence', name: 'Step 1 (Intro email)',
    subject_a: '{{subject_line_a}}',
    subject_b: '{{subject_line_b}}',
    subject_c: '{{subject_line_c}}',
    body: `{{greeting}}

{{hook}}

{{service_pitch}}

{{cta_line}}

{{optout}}`,
  },
  {
    key: 'T3_followup', language: 'en', kind: 'sequence', name: 'Step 2 (Follow-up 1: Quick Helpful Bump)', subject_a: '', subject_b: '',
    body: `{{greeting}}

Quick follow-up on this note. Would it be helpful if I shared our 2026/2027 partner fleet sheet and direct WhatsApp contact so your team has it on file for northern Italy?

Best,
Dmitri

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'en', kind: 'sequence', name: 'Step 3 (Follow-up 2 · Final note)',
    subject_a: 'Lake Como, Tuscany & Venice private guest transport',
    subject_b: 'Executive guest transport in Italy',
    body: `{{greeting}}

Last note from me so I do not crowd your inbox. Whenever a couple brings you to northern Italy, our direct fleet WhatsApp is always open.

Wishing you a wonderful 2026/2027 season.

Best,
Dmitri

{{optout}}`,
  },
  // ---------------- Italian sequence ----------------
  {
    key: 'T1_intro', language: 'it', kind: 'sequence', name: 'Step 1 (Email di presentazione)',
    subject_a: '{{subject_line_a}}',
    subject_b: '{{subject_line_b}}',
    subject_c: '{{subject_line_c}}',
    body: `{{greeting}}

{{hook}}

{{service_pitch}}

{{cta_line}}

{{optout}}`,
  },
  {
    key: 'T3_followup', language: 'it', kind: 'sequence', name: 'Step 2 (Follow-up 1: Riscontro veloce)', subject_a: '', subject_b: '',
    body: `{{greeting}}

Un breve riscontro alla mia nota precedente. Le farebbe comodo ricevere il nostro listino partner 2026/2027 da tenere a portata di mano per le date di alta stagione sul lago e a Milano?

Un cordiale saluto,
Dmitri

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'it', kind: 'sequence', name: 'Step 3 (Follow-up 2 · Chiusura)',
    subject_a: 'Trasporti privati Lago di Como, Toscana e Venezia',
    subject_b: 'Transfer ospiti in Italia',
    body: `{{greeting}}

Chiudo qui per non disturbare la vostra casella. Se durante la stagione avrete bisogno di supporto con van Mercedes o bus sul lago e a Milano, il nostro contatto è sempre a disposizione.

Buona stagione 2026/2027.

Un cordiale saluto,
Dmitri

{{optout}}`,
  },
  // ---------------- Russian sequence (Kazakhstan & CIS) ----------------
  {
    key: 'T1_intro', language: 'ru', kind: 'sequence', name: 'Step 1 (Email знакомства)',
    subject_a: '{{subject_line_a}}',
    subject_b: '{{subject_line_b}}',
    subject_c: '{{subject_line_c}}',
    body: `{{greeting}}

{{hook}}

{{service_pitch}}

{{cta_line}}

{{optout}}`,
  },
  {
    key: 'T3_followup', language: 'ru', kind: 'sequence', name: 'Step 2 (Follow-up 1: Быстрое напоминание)', subject_a: '', subject_b: '',
    body: `{{greeting}}

Короткое напоминание к моему предыдущему письму. Будет ли полезно отправить наш партнерский тарифный план 2026/2027 и прямой контакт в WhatsApp для вашей команды?

С уважением,
Дмитрий

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'ru', kind: 'sequence', name: 'Step 3 (Follow-up 2 · Финальное письмо)',
    subject_a: 'Трансферы гостей: озеро Комо, Тоскана и Венеция',
    subject_b: 'Трансферы гостей в Италии',
    body: `{{greeting}}

Пишу в последний раз, чтобы не перегружать вашу почту. Если во время сезона вам понадобится надежный транспорт с Mercedes V-Class или автобусами на Комо и в Милане, наш контакт всегда открыт.

Отличного сезона 2026/2027.

С уважением,
Дмитрий

{{optout}}`,
  },
  // ---------------- Replies (suggested after classification) ----------------
  {
    key: 'rate_card_delivery', language: 'ru', kind: 'reply', name: 'Отправка тарифов (PDF)', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

Во вложении направляю два варианта тарифов:
1. Одностраничный партнерский лист тарифов — с конфиденциальными нетто-ставками и форматами комиссии для вашей внутренней сметы.
2. Клиентские тарифы — документ под ключ, который вы можете напрямую пересылать молодоженам без путаницы с наценками.

Если у вас запланирована дата и локация, пришлите ориентировочное число гостей, и я рассчитаю точный бюджет.`,
  },

  {
    key: 'rate_card_delivery', language: 'en', kind: 'reply', name: 'Rate card delivery (attach PDF)', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

Attached is our 1-page partner rate card alongside our direct client tariffs. I have attached two versions for your files:
1. Confidential B2B Partner Rate Card — with net agency rates and commission structures for your internal budgeting.
2. Direct Client Tariffs — which you can forward directly to the couple without markup confusion.

If you have an upcoming date and venue, send the guest count and I will put together a quote.`,
  },
  {
    key: 'rate_card_delivery', language: 'it', kind: 'reply', name: 'Invio tariffa (PDF allegato)', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

In allegato trovate due versioni del nostro listino:
1. Listino partner di 1 pagina — con tariffe nette riservate e modelli commissionali per il vostro budget interno.
2. Tariffe clienti finali — documento pronto da inoltrare direttamente agli sposi.

Se avete una data e una location in programma, scrivetemi il numero di ospiti e preparo il preventivo.`,
  },
  {
    key: 'reply_asks_pricing', language: 'en', kind: 'reply', name: 'Reply: asks for prices', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

Our 1-page partner rate card is attached: a Mercedes-Benz V-Class from Malpensa to Como is €230 net (Bellagio €320 net), and our late-night villa shuttle is €450 net per V-Class (or we can work on a 10% partner commission).

Share your date, venue and guest count whenever you want a fixed quote.`,
  },
  {
    key: 'reply_asks_pricing', language: 'it', kind: 'reply', name: 'Risposta: richiesta tariffe', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

In allegato trovate il nostro listino partner di 1 pagina: una Mercedes-Benz Classe V da Malpensa a Como parte da €230 netti (Bellagio €320 netti) e il servizio navetta notturno dalle ville da €450 netti per Classe V (oppure con commissione partner del 10%).

Condividete pure data, location e numero di ospiti quando desiderate una quotazione dedicata.`,
  },
  {
    key: 'reply_asks_pricing', language: 'ru', kind: 'reply', name: 'Ответ: запрос тарифов', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

Во вложении наш одностраничный партнерский лист тарифов: Mercedes-Benz V-Class из Мальпенсы на Комо — €230 нетто (Белладжио — €320 нетто), ночной шаттл с вилл — €450 нетто за V-Class (также работаем с 10% партнерской комиссией).

Пришлите дату, виллу и количество гостей, когда потребуется точный расчет под проект.`,
  },
  {
    key: 'reply_meeting_request', language: 'en', kind: 'reply', name: 'Reply: wants a call', subject_a: '', subject_b: '',
    body: `{{greeting}}

Happy to speak. I am free {{slot_1}} or {{slot_2}}, or send a time that suits you on WhatsApp.`,
  },
  {
    key: 'reply_has_supplier', language: 'en', kind: 'reply', name: 'Reply: already has a supplier', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

Understood, we are not looking to replace anyone you work with. I have attached our 1-page partner rate card and vehicle list (V-Classes, S-Classes and 16 to 50-seat minibuses) in case you ever need extra vehicles on a busy date.`,
  },
  {
    key: 'reply_not_now', language: 'en', kind: 'reply', name: 'Reply: not now / next season', subject_a: '', subject_b: '',
    body: `{{greeting}}

Understood. I will check back before next season, and if a date comes up sooner, just reply here.`,
  },
  {
    key: 'reply_referral_to_other', language: 'en', kind: 'reply', name: 'Reply: points to a colleague', subject_a: '', subject_b: '',
    body: `{{greeting}}

Thank you, I will write to {{referred_name}} directly and mention your note.`,
  },
  {
    key: 'ratecard_nudge', language: 'en', kind: 'nudge', name: 'Nudge: rate card sent, no answer', subject_a: '', subject_b: '',
    body: `{{greeting}}

Quick check that our partner rate card reached you. If an upcoming wedding needs guest transfers or late-night returns, send me the date and venue for a quote.`,
  },
  {
    key: 'fam_followup', language: 'en', kind: 'nudge', name: 'After a FAM transfer', subject_a: '', subject_b: '',
    body: `{{greeting}}

Thank you for riding with us. Let me know if there is anything you would tailor for your couples' guests.`,
  },
  {
    key: 'reply_generic', language: 'en', kind: 'reply', name: 'Reply: blank', subject_a: '', subject_b: '',
    body: `{{greeting}}

{{your_reply}}`,
  },
];

// Which reply template answers which classified intent.
export const REPLY_FOR_INTENT = {
  wants_rate_card: 'rate_card_delivery',
  asks_pricing: 'reply_asks_pricing',
  meeting_request: 'reply_meeting_request',
  has_supplier: 'reply_has_supplier',
  not_now: 'reply_not_now',
  referral_to_other: 'reply_referral_to_other',
};
