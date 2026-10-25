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
    key: 'T3_followup', language: 'en', kind: 'sequence', name: 'Step 2 (Follow-up 1: Genuine Partner Fit)', subject_a: '', subject_b: '',
    body: `{{greeting}}

I wanted to make sure you saw my previous note regarding guest transport for your {{venue}} weddings. We see your team as a genuine potential partner for our fleet, and we do not reach out like this to everyone.

Would it be helpful if I shared our confidential partner rate card and vehicle overview?

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'en', kind: 'sequence', name: 'Step 3 (Follow-up 2 · Final note)',
    subject_a: 'Lake Como, Tuscany & Venice private guest transport',
    subject_b: 'Executive guest transport in Italy',
    body: `{{greeting}}

Last note from me so I do not crowd your inbox. Whenever you need guest transport for Lake Como, Milan, Tuscany, Venice, or Nice (French Riviera), feel free to message me on WhatsApp or reply here.

Wishing you a calm, successful season.

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
    key: 'T3_followup', language: 'it', kind: 'sequence', name: 'Step 2 (Follow-up 1: Partner Speciale)', subject_a: '', subject_b: '',
    body: `{{greeting}}

Volevo solo assicurarmi che vi sia arrivata la nostra mail precedente sui trasferimenti per i vostri matrimoni {{venue}}. Vediamo la vostra agenzia come un partner davvero speciale per la nostra flotta, e non scriviamo questo a tutti.

Vi farebbe piacere ricevere la nostra scheda tariffe partner riservata e la panoramica della flotta?

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'it', kind: 'sequence', name: 'Step 3 (Follow-up 2 · Chiusura)',
    subject_a: 'Trasporti privati Lago di Como, Toscana e Venezia',
    subject_b: 'Transfer ospiti in Italia',
    body: `{{greeting}}

Chiudo qui per non affollare la vostra casella. Quando vi servirà supporto per i trasferimenti ospiti tra Lago di Como, Milano, Toscana, Venezia o Nizza (Costa Azzurra), scrivetemi pure su WhatsApp o rispondete qui.

Buona stagione.

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
    key: 'T3_followup', language: 'ru', kind: 'sequence', name: 'Step 2 (Follow-up 1: Партнерский интерес)', subject_a: '', subject_b: '',
    body: `{{greeting}}

Хотел убедиться, что вы получили мое предыдущее письмо по трансферам для ваших свадеб {{venue}}. Мы видим в вашем агентстве действительно сильного потенциального партнера для нашего автопарка, и мы точно не пишем такие слова всем подряд.

Будет ли вам удобно взглянуть на наш партнерский прайс-лист и презентацию автопарка?

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'ru', kind: 'sequence', name: 'Step 3 (Follow-up 2 · Финальное письмо)',
    subject_a: 'Трансферы гостей: озеро Комо, Тоскана и Венеция',
    subject_b: 'Трансферы гостей в Италии',
    body: `{{greeting}}

Пишу в последний раз, чтобы не перегружать вашу почту. Если для свадеб на озере Комо, в Милане, Тоскане, Венеции или в Ницце (Лазурный берег) понадобится надежный транспорт для гостей, напишите мне в WhatsApp или ответьте на это письмо.

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
