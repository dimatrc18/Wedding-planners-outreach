// Default message templates. Loaded into the `outreach_templates` table by the seed migration and used
// as-is in demo mode. Edit them in the app (Templates view); the database copy wins once it exists.
// Variables: {{greeting}} {{first_name}} {{agency}} {{hook}} {{venue}} {{location}} {{signature}} {{optout}}
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

{{signature}}

{{optout}}`,
  },
  {
    key: 'T3_followup', language: 'en', kind: 'sequence', name: 'Step 2 (Follow-up 1: Route & Vehicle Fit)', subject_a: '', subject_b: '',
    body: `{{greeting}}

One detail worth adding for your {{venue}} weddings: alongside our V-Classes and S-Classes from Malpensa, we also run 16 to 50-seat minibuses for larger groups and a Guest Transfer Portal where guests enter their own flight times.

If transport ever gets tight on an upcoming date, feel free to message me on WhatsApp or reply here.

{{signature}}

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'en', kind: 'sequence', name: 'Step 3 (Follow-up 2 · Final note)',
    subject_a: 'Lake Como & Milan private guest transport',
    subject_b: 'Guest transport on Lake Como',
    body: `{{greeting}}

Last note from me so I do not crowd your inbox. Whenever you need guest transport for a Lake Como or Milan date, feel free to message me on WhatsApp or reply here.

Wishing you a calm, successful season.

{{signature}}

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

{{signature}}

{{optout}}`,
  },
  {
    key: 'T3_followup', language: 'it', kind: 'sequence', name: 'Step 2 (Follow-up 1: Flotta e Portale)', subject_a: '', subject_b: '',
    body: `{{greeting}}

Un dettaglio utile per i vostri matrimoni a {{venue}}: oltre a Mercedes-Benz Classe V e Classe S da Malpensa, disponiamo di minibus da 16 a 50 posti per i gruppi più numerosi e di un Portale Ospiti dove gli invitati inseriscono i propri orari di volo.

Se dovesse servirvi supporto su una data intensa, scrivetemi pure su WhatsApp o rispondete a questa mail.

{{signature}}

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'it', kind: 'sequence', name: 'Step 3 (Follow-up 2 · Chiusura)',
    subject_a: 'Trasporti privati Lago di Como e Milano',
    subject_b: 'Transfer ospiti Lago di Como',
    body: `{{greeting}}

Chiudo qui per non affollare la vostra casella. Quando vi servirà supporto per i trasferimenti ospiti sul Lago di Como o a Milano, scrivetemi pure su WhatsApp o rispondete qui.

Buona stagione.

{{signature}}

{{optout}}`,
  },
  // ---------------- Replies (suggested after classification) ----------------
  {
    key: 'rate_card_delivery', language: 'en', kind: 'reply', name: 'Rate card delivery (attach PDF)', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

Attached is our 1-page partner rate card and vehicle list. We work either on confidential net rates that you can include in your client offer, or on a 5% partner commission.

If you have an upcoming date and venue, send the guest count and I will put together a quote.

{{signature}}`,
  },
  {
    key: 'rate_card_delivery', language: 'it', kind: 'reply', name: 'Invio tariffa (PDF allegato)', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

In allegato trovate il nostro listino partner di 1 pagina e la lista veicoli. Lavoriamo sia con tariffe nette riservate da includere nella vostra offerta, sia con una commissione partner del 5%.

Se avete una data e una location in programma, scrivetemi il numero di ospiti e preparo il preventivo.

{{signature}}`,
  },
  {
    key: 'reply_asks_pricing', language: 'en', kind: 'reply', name: 'Reply: asks for prices', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

Our 1-page partner rate card is attached: a Mercedes-Benz V-Class from Malpensa to Como is €230 net (Bellagio €320 net), and our late-night villa shuttle is €450 net per V-Class (or we can work on a 5% partner commission).

Share your date, venue and guest count whenever you want a fixed quote.

{{signature}}`,
  },
  {
    key: 'reply_meeting_request', language: 'en', kind: 'reply', name: 'Reply: wants a call', subject_a: '', subject_b: '',
    body: `{{greeting}}

Happy to speak. I am free {{slot_1}} or {{slot_2}}, or send a time that suits you on WhatsApp.

{{signature}}`,
  },
  {
    key: 'reply_has_supplier', language: 'en', kind: 'reply', name: 'Reply: already has a supplier', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

Understood, we are not looking to replace anyone you work with. I have attached our 1-page partner rate card and vehicle list (V-Classes, S-Classes and 16 to 50-seat minibuses) in case you ever need extra vehicles on a busy date.

{{signature}}`,
  },
  {
    key: 'reply_not_now', language: 'en', kind: 'reply', name: 'Reply: not now / next season', subject_a: '', subject_b: '',
    body: `{{greeting}}

Understood. I will check back before next season, and if a date comes up sooner, just reply here.

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

Quick check that our partner rate card reached you. If an upcoming wedding needs guest transfers or late-night returns, send me the date and venue for a quote.

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
