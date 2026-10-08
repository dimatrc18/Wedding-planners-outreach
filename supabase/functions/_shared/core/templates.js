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
    key: 'T3_followup', language: 'en', kind: 'sequence', name: 'T3 Follow-up (Guest Transfer Portal)', subject_a: '', subject_b: '',
    body: `{{greeting}}

Quick follow-up: even if you already have a regular driver on the lake, you can test us on a single late-night villa shuttle or peak-Saturday overflow.

Worth sending our 1-page rate card and Guest Portal link (net rates or 5% commission)?

{{signature}}

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'en', kind: 'sequence', name: 'T4 Breakup email (new thread)',
    subject_a: '{{agency}} · private transport on Lake Como & Northern Italy',
    subject_b: 'Airport transfer on your next Milan site visit · {{agency}}',
    body: `{{greeting}}

Last note from me. Next time you fly into Malpensa or Linate for site visits, message me on WhatsApp and your airport transfer is on us.

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
    key: 'T3_followup', language: 'it', kind: 'sequence', name: 'T3 Follow-up (Portale Ospiti)', subject_a: '', subject_b: '',
    body: `{{greeting}}

Un rapido follow-up: anche se avete già un fornitore abituale, potete testarci su una singola navetta notturna o nei weekend di punta.

Vi mando il listino di 1 pagina e il link del Portale Ospiti (tariffe nette o commissione 5%)?

{{signature}}

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'it', kind: 'sequence', name: 'T4 Email di chiusura (nuovo thread)',
    subject_a: '{{agency}} · logistica trasporti Lago di Como e Nord Italia',
    subject_b: 'Transfer per i vostri prossimi sopralluoghi · {{agency}}',
    body: `{{greeting}}

Chiudo qui per non affollare la vostra casella. Al vostro prossimo sopralluogo su Milano o Como, scrivetemi su WhatsApp e il transfer aeroportuale sarà offerto da noi.

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
    key: 'reply_has_supplier', language: 'en', kind: 'reply', name: 'Reply: already has a supplier', subject_a: '', subject_b: '',
    body: `{{greeting}}

Understood. Keep our 1-page rate card on file for peak Saturdays when your main driver is full, or if you ever want to test us on a single late-night villa shuttle.

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
