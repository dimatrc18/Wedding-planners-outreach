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

One thing our partner planners tell us saves them the most hours before a wedding is our private Guest Transfer Portal.

You drop a custom link onto the couple's wedding website, guests enter their own flight details, and our team groups arrivals into shared or private Mercedes-Benz V-Class and E-Class transfers, tracks every flight on radar, and bills guests directly via SumUp. Your team never has to chase flight spreadsheets or guest payments.

We also run 16 to 30-seat executive minibuses alongside our Mercedes-Benz fleet for narrow lakeside roads and stone villa gates where full-size coaches cannot pass.

Would it be helpful to see our 1-page partner rate card and how the portal works?

{{signature}}

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'en', kind: 'sequence', name: 'T4 Breakup email (new thread)',
    subject_a: '{{agency}} · private transport on Lake Como & Northern Italy',
    subject_b: 'Airport transfer on your next Milan site visit · {{agency}}',
    body: `{{greeting}}

I will leave this here so I do not crowd your inbox while you are deep in planning.

Next time you fly into Malpensa or Linate for a client venue visit, message me on WhatsApp and we will gladly host your airport transfer on us so you can experience our chauffeurs firsthand. Whenever you need a team to take over the guest transport logistics for a wedding weekend, we are one reply away.

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

Uno strumento che fa risparmiare decine di ore ai wedding planner con cui lavoriamo è il nostro Portale Ospiti dedicato.

Inserite un link riservato sul sito degli sposi, gli ospiti registrano i propri voli in autonomia e il nostro team organizza i transfer in Mercedes-Benz Classe V e Classe E, monitora i voli sul radar e gestisce i singoli pagamenti tramite SumUp. Il vostro studio non deve più rincorrere fogli Excel con i voli o pagamenti degli invitati.

Disponiamo inoltre di minibus executive da 16 a 30 posti per i viali storici e le strade strette del lago dove i pullman da 50 posti non passano.

Vi fa comodo ricevere la nostra tariffa partner di una pagina per vedere come funziona?

{{signature}}

{{optout}}`,
  },
  {
    key: 'T4_breakup', language: 'it', kind: 'sequence', name: 'T4 Email di chiusura (nuovo thread)',
    subject_a: '{{agency}} · logistica trasporti Lago di Como e Nord Italia',
    subject_b: 'Transfer per i vostri prossimi sopralluoghi · {{agency}}',
    body: `{{greeting}}

Chiudo qui per non affollare la vostra casella durante i preparativi.

La prossima volta che avete un sopralluogo con una coppia tra Milano, i laghi o le Alpi, scrivetemi su WhatsApp: saremo felici di offrirvi un transfer di prova per farvi conoscere di persona i nostri autisti. Quando vorrete delegare l'intera logistica trasporti di un matrimonio, siamo a un messaggio di distanza.

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
