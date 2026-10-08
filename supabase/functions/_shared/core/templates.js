// Default message templates. Loaded into the `outreach_templates` table by the seed migration and used
// as-is in demo mode. Edit them in the app (Templates view); the database copy wins once it exists.
// Variables: {{greeting}} {{first_name}} {{agency}} {{hook}} {{venue}} {{location}} {{signature}} {{optout}}
// Reply templates may contain {{slot_1}}-style blanks on purpose: the linter blocks approval until they are filled.

export const DEFAULT_TEMPLATES = [
  // ---------------- English sequence ----------------
  {
    key: 'T1_intro', language: 'en', kind: 'sequence', name: 'T1 Intro email',
    subject_a: '{{subject_line_a}}',
    subject_b: '{{subject_line_b}}',
    body: `{{greeting}}

{{hook}}

{{service_pitch}}

{{cta_line}}

{{signature}}

{{optout}}`,
  },
  {
    key: 'T3_followup', language: 'en', kind: 'sequence', name: 'T3 Follow-up (Recent 70-Guest Wedding & Portal)', subject_a: '', subject_b: '',
    body: `{{greeting}}

Following up briefly: last week on Lake Como we coordinated 12 Mercedes-Benz V-Class vans across a 70-guest wedding, handling every airport arrival, flight change and late-night villa shuttle through our Guest Transfer Portal with zero guest calls to the planner.

May I send our 1-page partner rate card (net rates for your offer, or 5% commission)?

{{signature}}

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'en', kind: 'sequence', name: 'T4 Final note (disabled)',
    subject_a: '{{agency}} · private transport on Lake Como & Northern Italy',
    subject_b: 'Wedding fleet & guest dispatch · {{agency}}',
    body: `{{greeting}}

Last note from me so I do not crowd your inbox. Whenever you are planning guest transport for an upcoming Lake Como or Milan wedding, send the venue and guest count on WhatsApp (+32 456 14 14 97) for a tailored fleet plan and net quote.

Wishing you a calm, successful season.

{{signature}}

{{optout}}`,
  },
  // ---------------- Italian sequence ----------------
  {
    key: 'T1_intro', language: 'it', kind: 'sequence', name: 'T1 Email di presentazione',
    subject_a: '{{subject_line_a}}',
    subject_b: '{{subject_line_b}}',
    body: `{{greeting}}

{{hook}}

{{service_pitch}}

{{cta_line}}

{{signature}}

{{optout}}`,
  },
  {
    key: 'T3_followup', language: 'it', kind: 'sequence', name: 'T3 Follow-up (Matrimonio 70 Ospiti & Portale)', subject_a: '', subject_b: '',
    body: `{{greeting}}

Un rapido aggiornamento: la scorsa settimana sul Lago di Como abbiamo coordinato 12 Mercedes-Benz Classe V per un matrimonio di 70 ospiti, gestendo arrivi aeroportuali, cambi volo e navette notturne tramite il nostro Portale Ospiti senza una sola chiamata agli organizzatori.

Posso inviarvi il nostro listino partner di 1 pagina (tariffe nette o commissione 5%)?

{{signature}}

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'it', kind: 'sequence', name: 'T4 Email di chiusura (disattivata)',
    subject_a: '{{agency}} · logistica trasporti Lago di Como e Nord Italia',
    subject_b: 'Flotta eventi e coordinamento ospiti · {{agency}}',
    body: `{{greeting}}

Chiudo qui per non affollare la vostra casella. Quando pianificherete i trasferimenti ospiti per un prossimo matrimonio sul Lago di Como o a Milano, scrivetemi data e location su WhatsApp (+32 456 14 14 97) per ricevere il piano flotta e le tariffe nette.

Buona stagione.

{{signature}}

{{optout}}`,
  },
  // ---------------- Replies (suggested after classification) ----------------
  {
    key: 'rate_card_delivery', language: 'en', kind: 'reply', name: 'Rate card delivery (attach PDF)', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

Attached is our 1-page partner rate card (confidential net rates for your offer, or 5% commission) along with our Guest Portal preview.

If you have an upcoming date and venue, send the guest count and I will draft the run-sheet quote.

{{signature}}`,
  },
  {
    key: 'rate_card_delivery', language: 'it', kind: 'reply', name: 'Invio tariffa (PDF allegato)', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

In allegato trovate il nostro listino partner di 1 pagina (tariffe nette riservate per la vostra offerta o commissione 5%).

Se avete una data e una location in programma, scrivetemi il numero di ospiti e preparo il piano transfer.

{{signature}}`,
  },
  {
    key: 'reply_asks_pricing', language: 'en', kind: 'reply', name: 'Reply: asks for prices', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

Our 1-page rate card is attached: a Mercedes-Benz V-Class from Malpensa to Como is €230 net (Bellagio €320 net), and the late-night villa shuttle is €450 net per V-Class.

Share your date, venue and guest count whenever you want a fixed run-sheet quote.

{{signature}}`,
  },
  {
    key: 'reply_meeting_request', language: 'en', kind: 'reply', name: 'Reply: wants a call', subject_a: '', subject_b: '',
    body: `{{greeting}}

Happy to speak. I am free {{slot_1}} or {{slot_2}}, or send a time that suits you on WhatsApp (+32 456 14 14 97).

{{signature}}`,
  },
  {
    key: 'reply_has_supplier', language: 'en', kind: 'reply', name: 'Reply: already has a supplier', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

Understood, local drivers are great for individual cars. Where studios bring us in is for multi-hotel weddings of 50 to 150+ guests that require 10+ coordinated Mercedes-Benz V-Classes, 16 to 50-seat minibuses and our Guest Transfer Portal under one dispatcher.

I have attached our 1-page partner rate card for your files whenever a full-fleet production comes up.

{{signature}}`,
  },
  {
    key: 'reply_not_now', language: 'en', kind: 'reply', name: 'Reply: not now / next season', subject_a: '', subject_b: '',
    body: `{{greeting}}

Understood. I will check back before next season, and if a wedding comes up sooner, just reply here.

{{signature}}`,
  },
  {
    key: 'reply_referral_to_other', language: 'en', kind: 'reply', name: 'Reply: points to a colleague', subject_a: '', subject_b: '',
    body: `{{greeting}}

Thank you, I will write to {{referred_name}} directly and mention your note.

{{signature}}`,
  },
  {
    key: 'ratecard_nudge', language: 'en', kind: 'nudge', name: 'Nudge: rate card sent, no answer', subject_a: '', subject_b: '',
    body: `{{greeting}}

Quick check that our 1-page rate card reached you. If an upcoming wedding needs guest transfers or a late-night shuttle, send me the date and venue for a fast quote.

{{signature}}`,
  },
  {
    key: 'fam_followup', language: 'en', kind: 'nudge', name: 'After a FAM transfer', subject_a: '', subject_b: '',
    body: `{{greeting}}

Thank you for riding with us. Let me know if there is anything you would tailor for your couples' guests.

{{signature}}`,
  },
  {
    key: 'reply_generic', language: 'en', kind: 'reply', name: 'Reply: blank', subject_a: '', subject_b: '',
    body: `{{greeting}}

{{your_reply}}

{{signature}}`,
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
