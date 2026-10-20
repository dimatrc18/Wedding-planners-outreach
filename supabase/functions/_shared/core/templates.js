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
    body: `{{greeting}}

{{hook}}

{{service_pitch}}

{{cta_line}}

{{optout}}`,
  },
  {
    key: 'T3_followup', language: 'en', kind: 'sequence', name: 'Step 2 (Follow-up 1: Route & Vehicle Fit)', subject_a: '', subject_b: '',
    body: `{{greeting}}

One logistical detail worth adding for your {{venue}} weddings: rather than your team spending unbillable hours building arrival spreadsheets for 80+ guests, you can forward us your guest flight list and our dispatch desk clusters them into shared Mercedes-Benz V-Classes, monitors live Malpensa delays, and shares a live master manifest.

We also run 16 to 50-seat minibuses for larger groups. If transport ever gets tight on an upcoming date, feel free to message me on WhatsApp or reply here.

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'en', kind: 'sequence', name: 'Step 3 (Follow-up 2 · Final note)',
    subject_a: 'Lake Como & Milan private guest transport',
    subject_b: 'Guest transport on Lake Como',
    body: `{{greeting}}

Last note from me so I do not crowd your inbox. Whenever you need guest transport for a Lake Como or Milan date, feel free to message me on WhatsApp or reply here.

Wishing you a calm, successful season.

{{optout}}`,
  },
  // ---------------- Italian sequence ----------------
  {
    key: 'T1_intro', language: 'it', kind: 'sequence', name: 'Step 1 (Email di presentazione)',
    subject_a: '{{subject_line_a}}',
    subject_b: '{{subject_line_b}}',
    body: `{{greeting}}

{{hook}}

{{service_pitch}}

{{cta_line}}

{{optout}}`,
  },
  {
    key: 'T3_followup', language: 'it', kind: 'sequence', name: 'Step 2 (Follow-up 1: Flotta e Portale)', subject_a: '', subject_b: '',
    body: `{{greeting}}

Un dettaglio operativo per i vostri matrimoni a {{venue}}: anziché farvi impiegare ore a incrociare fogli Excel per gli arrivi degli ospiti, potete semplicemente inoltrarci la lista dei voli e la nostra centrale organizza le navette Mercedes-Benz Classe V condivise, monitorando i ritardi a Malpensa in tempo reale.

Disponiamo inoltre di minibus da 16 a 50 posti per i gruppi più numerosi. Se dovesse servirvi supporto su una data intensa, scrivetemi pure su WhatsApp o rispondete a questa mail.

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'it', kind: 'sequence', name: 'Step 3 (Follow-up 2 · Chiusura)',
    subject_a: 'Trasporti privati Lago di Como e Milano',
    subject_b: 'Transfer ospiti Lago di Como',
    body: `{{greeting}}

Chiudo qui per non affollare la vostra casella. Quando vi servirà supporto per i trasferimenti ospiti sul Lago di Como o a Milano, scrivetemi pure su WhatsApp o rispondete qui.

Buona stagione.

{{optout}}`,
  },
  // ---------------- Russian sequence (Kazakhstan & CIS) ----------------
  {
    key: 'T1_intro', language: 'ru', kind: 'sequence', name: 'Step 1 (Email знакомства)',
    subject_a: '{{subject_line_a}}',
    subject_b: '{{subject_line_b}}',
    body: `{{greeting}}

{{hook}}

{{service_pitch}}

{{cta_line}}

{{optout}}`,
  },
  {
    key: 'T3_followup', language: 'ru', kind: 'sequence', name: 'Step 2 (Follow-up 1: Автопарк и логистика)', subject_a: '', subject_b: '',
    body: `{{greeting}}

Полезная деталь для ваших свадеб в {{venue}}: чтобы ваши координаторы не тратили часы на составление таблиц прилета гостей в Excel, вы можете просто переслать нам список рейсов. Наш диспетчерский центр сам группирует гостей по Mercedes-Benz V-Class, отслеживает задержки рейсов в Мальпенсе и ведет единую ведомость.

Для больших групп мы также предоставляем комфортабельные минибусы от 16 до 50 мест. Если на ближайших датах потребуется поддержка с транспортом, напишите мне в WhatsApp или ответьте на это письмо.

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'ru', kind: 'sequence', name: 'Step 3 (Follow-up 2 · Финальное письмо)',
    subject_a: 'Трансферы гостей: озеро Комо и Северная Италия',
    subject_b: 'Трансферы гостей в Италии',
    body: `{{greeting}}

Пишу в последний раз, чтобы не перегружать вашу почту. Если для свадеб на озере Комо, в Милане или Северной Италии понадобится надежный транспорт для гостей, напишите мне в WhatsApp или ответьте на это письмо.

Успешного и спокойного сезона.

{{optout}}`,
  },
  // ---------------- Replies (suggested after classification) ----------------
  {
    key: 'rate_card_delivery', language: 'ru', kind: 'reply', name: 'Отправка тарифов (PDF)', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

Во вложении направляю наш одностраничный партнерский лист тарифов и автопарк. Мы работаем как по конфиденциальным нетто-тарифам для вашей сметы, так и с 10% партнерской комиссией.

Если у вас запланирована дата и локация, пришлите ориентировочное число гостей, и я рассчитаю точный бюджет.`,
  },

  {
    key: 'rate_card_delivery', language: 'en', kind: 'reply', name: 'Rate card delivery (attach PDF)', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

Attached is our 1-page partner rate card and vehicle list. We work either on confidential net rates that you can include in your client offer, or on a 10% partner commission.

If you have an upcoming date and venue, send the guest count and I will put together a quote.`,
  },
  {
    key: 'rate_card_delivery', language: 'it', kind: 'reply', name: 'Invio tariffa (PDF allegato)', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

In allegato trovate il nostro listino partner di 1 pagina e la lista veicoli. Lavoriamo sia con tariffe nette riservate da includere nella vostra offerta, sia con una commissione partner del 10%.

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
