// Default message templates. Loaded into the `outreach_templates` table by the seed migration and used
// as-is in demo mode. Edit them in the app (Templates view); the database copy wins once it exists.
// Variables: {{greeting}} {{first_name}} {{agency}} {{hook}} {{venue}} {{location}} {{signature}} {{optout}}
// Reply templates may contain {{slot_1}}-style blanks on purpose: the linter blocks approval until they are filled.

export const DEFAULT_TEMPLATES = [
  // ---------------- English sequence ----------------
  {
    key: 'T1_intro', language: 'en', kind: 'sequence', name: 'T1 Intro email',
    subject_a: 'Guest transport on Lake Como',
    subject_b: 'Late-night villa returns on Lake Como',
    body: `{{greeting}}

{{hook}}

We run a private fleet of Mercedes-Benz V-Class, E-Class and S-Class vehicles between Milan, Malpensa and Lake Como, mostly looking after staggered airport arrivals and the late-night returns from the villas after midnight.

If you're open to a dedicated transport partner on the lake this season, may I send over our 1-page partner rate card?

{{signature}}

{{optout}}`,
  },
  {
    key: 'T3_followup', language: 'en', kind: 'sequence', name: 'T3 Follow-up (late-night shuttle)', subject_a: '', subject_b: '',
    body: `{{greeting}}

Quick follow-up on the part of the night that usually causes the most stress on the lake: getting guests back to their hotels after midnight when local taxis stop running.

We keep a dedicated Mercedes-Benz V-Class on standby outside the villa from midnight until 4 am so guests can leave whenever they are ready.

Would it be useful to have our 2026 partner rate sheet on file for your upcoming weddings?

{{signature}}

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'en', kind: 'sequence', name: 'T4 Breakup email (new thread)',
    subject_a: 'Transport contact for {{agency}}',
    subject_b: 'Lake Como chauffeur contact · {{agency}}',
    body: `{{greeting}}

I will leave this here so I do not crowd your inbox while you are busy planning. If you ever need a private airport transfer or a late-night villa shuttle on Lake Como, my WhatsApp and our 1-page partner rate card are one reply away.

Wishing you a calm season ahead.

{{signature}}

{{optout}}`,
  },
  // ---------------- Italian sequence ----------------
  {
    key: 'T1_intro', language: 'it', kind: 'sequence', name: 'T1 Email di presentazione',
    subject_a: 'Transfer ospiti sul Lago di Como',
    subject_b: 'Rientri notturni dalle ville sul lago',
    body: `{{greeting}}

{{hook}}

Operiamo tra Milano, Malpensa e il Lago di Como con una flotta privata di Mercedes-Benz Classe V, Classe E e Classe S, seguendo soprattutto gli arrivi scaglionati in aeroporto e i rientri notturni dalle ville dopo mezzanotte.

Se valutate un partner dedicato per i transfer sul lago in questa stagione, posso inviarvi la nostra tariffa partner di una pagina?

{{signature}}

{{optout}}`,
  },
  {
    key: 'T3_followup', language: 'it', kind: 'sequence', name: 'T3 Follow-up (navetta notturna)', subject_a: '', subject_b: '',
    body: `{{greeting}}

Un breve messaggio sulla parte della serata più delicata da gestire sul lago: riportare gli ospiti in hotel dopo mezzanotte, quando i taxi non si trovano più.

Teniamo una Mercedes-Benz Classe V dedicata in attesa fuori dalla villa da mezzanotte alle 4 del mattino, così gli ospiti rientrano quando preferiscono.

Vi fa comodo ricevere il foglio con le tariffe partner 2026 per i vostri prossimi matrimoni?

{{signature}}

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'it', kind: 'sequence', name: 'T4 Email di chiusura (nuovo thread)',
    subject_a: 'Contatto transfer per {{agency}}',
    subject_b: 'Transfer Lago di Como · {{agency}}',
    body: `{{greeting}}

Chiudo qui per non affollare la vostra casella durante i preparativi. Se durante la stagione dovesse servirvi un transfer dell'ultimo minuto da Malpensa o una navetta notturna da una villa sul lago, basta una risposta a questa mail o un messaggio su WhatsApp.

Buon lavoro e buona stagione.

{{signature}}

{{optout}}`,
  },
  // ---------------- Replies (suggested after classification) ----------------
  {
    key: 'rate_card_delivery', language: 'en', kind: 'reply', name: 'Rate card delivery (attach PDF)', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

Here is our 1-page partner rate card for 2026, attached.

It covers fixed net rates from Malpensa, Linate and Lugano to the lake, hourly service, and the late-night villa shuttle. You can work with us on a 12% referral commission, where we bill the couple, or on net rates that you mark up under your own name.

If you have a date and venue in mind, send them with the guest count and I'll draft the transport plan.

{{signature}}`,
  },
  {
    key: 'rate_card_delivery', language: 'it', kind: 'reply', name: 'Invio tariffa (PDF allegato)', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

In allegato la nostra tariffa partner 2026, in una pagina.

Contiene le tariffe nette fisse da Malpensa, Linate e Lugano verso il lago, il servizio orario e la navetta notturna dalle ville. Potete lavorare con noi con una commissione del 12% sulle prenotazioni segnalate, dove fatturiamo direttamente agli sposi, oppure con tariffe nette da rivendere con il vostro marchio.

Se avete già una data e una location, mandatemi anche il numero di ospiti e preparo il piano dei transfer.

{{signature}}`,
  },
  {
    key: 'reply_asks_pricing', language: 'en', kind: 'reply', name: 'Reply: asks for prices', subject_a: '', subject_b: '', attach_rate_card: true,
    body: `{{greeting}}

The rate card is attached. As a guide, a Mercedes-Benz V-Class from Malpensa to Como is €230 net, and to Bellagio €320. The late-night villa shuttle is €450 per V-Class, from midnight to 4 am.

If you share the date, venue and guest count, I'll put together a full transport plan with a fixed price.

{{signature}}`,
  },
  {
    key: 'reply_meeting_request', language: 'en', kind: 'reply', name: 'Reply: wants a call', subject_a: '', subject_b: '',
    body: `{{greeting}}

Happy to talk. I'm free {{slot_1}} or {{slot_2}}, or send me a time that suits you better. My direct line is +32 456 14 14 97.

{{signature}}`,
  },
  {
    key: 'reply_has_supplier', language: 'en', kind: 'reply', name: 'Reply: already has a supplier', subject_a: '', subject_b: '',
    body: `{{greeting}}

Thank you for letting me know. A second supplier can help on peak weekends, when your main one is fully booked. If that ever happens, we can cover a single late-night shuttle or a full airport day, and the rate card is here for your files.

{{signature}}`,
  },
  {
    key: 'reply_not_now', language: 'en', kind: 'reply', name: 'Reply: not now / next season', subject_a: '', subject_b: '',
    body: `{{greeting}}

Understood, and thank you. I'll write again before next season. If a date comes up sooner, a reply here is all it takes.

{{signature}}`,
  },
  {
    key: 'reply_referral_to_other', language: 'en', kind: 'reply', name: 'Reply: points to a colleague', subject_a: '', subject_b: '',
    body: `{{greeting}}

Thank you for pointing me in the right direction. I'll write to {{referred_name}} directly and mention that you suggested it.

{{signature}}`,
  },
  {
    key: 'ratecard_nudge', language: 'en', kind: 'nudge', name: 'Nudge: rate card sent, no answer', subject_a: '', subject_b: '',
    body: `{{greeting}}

A quick check that the rate card reached you. If one of next season's weddings needs guests moved between Milan and the lake, send me the date and venue and I'll sketch the transport plan.

{{signature}}`,
  },
  {
    key: 'fam_followup', language: 'en', kind: 'nudge', name: 'After a FAM transfer', subject_a: '', subject_b: '',
    body: `{{greeting}}

Thank you for riding with us. I'd value one line on how it went, and on anything you would want different for your couples' guests.

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
