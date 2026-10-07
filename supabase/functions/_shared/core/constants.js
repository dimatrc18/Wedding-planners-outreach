// Shared constants for the DOROGO partner outreach engine.
// Plain ESM with no dependencies: imported by the browser app, the edge functions and the Node tests.

export const STAGES = [
  { key: 'researching', label: 'Researching' },
  { key: 'ready', label: 'Ready to Contact' },
  { key: 't1_sent', label: 'T1 Sent' },
  { key: 't2_sent', label: 'T2 IG DM Sent' },
  { key: 't3_sent', label: 'T3 Follow-up Sent' },
  { key: 't4_sent', label: 'T4 Breakup Sent' },
  { key: 'replied', label: 'Replied' },
  { key: 'rate_card_sent', label: 'Rate Card Sent' },
  { key: 'in_conversation', label: 'In Conversation' },
  { key: 'quote_requested', label: 'Quote Requested' },
  { key: 'fam_offered', label: 'Trial / FAM Offered' },
  { key: 'partner_won', label: 'Partner Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'nurture', label: 'Nurture (Next Season)' },
  { key: 'do_not_contact', label: 'Do Not Contact' },
];
export const STAGE_KEYS = STAGES.map((s) => s.key);
export const stageLabel = (k) => (STAGES.find((s) => s.key === k) || { label: k }).label;

// Stages in which the automated cadence may still produce the next step.
export const SEQUENCE_STAGES = ['ready', 't1_sent', 't2_sent', 't3_sent'];

// Funnel order, used to answer "did this prospect reach at least stage X?".
export const FUNNEL_RANK = {
  researching: 0, ready: 1, t1_sent: 2, t2_sent: 2, t3_sent: 2, t4_sent: 2,
  replied: 3, rate_card_sent: 4, in_conversation: 5, quote_requested: 6, fam_offered: 7, partner_won: 8,
  lost: -1, nurture: -1, do_not_contact: -1,
};

export const STEP_STATUS = {
  T1_intro: 't1_sent',
  T2_ig_dm: 't2_sent',
  T3_followup: 't3_sent',
  T4_breakup: 't4_sent',
  rate_card_delivery: 'rate_card_sent',
};

export const DEFAULT_STEPS = [
  { key: 'T1_intro', label: 'Intro email', day: 0, channel: 'email', thread: false, require_approval: true, enabled: true },
  { key: 'T2_ig_dm', label: 'Instagram DM', day: 3, channel: 'instagram_dm', thread: false, require_approval: true, enabled: false },
  { key: 'T3_followup', label: 'Follow-up email', day: 8, channel: 'email', thread: true, require_approval: true, enabled: true },
  { key: 'T4_breakup', label: 'Breakup email', day: 14, channel: 'email', thread: true, require_approval: true, enabled: true },
];

export const SIGNATURE = `Warm regards,

Dmitri
DOROGO | Private Transportation
Direct Dispatch: +32 456 14 14 97 • booking@dorogo.eu`;

export const SIGNATURE_IT = `Un cordiale saluto,

Dmitri
DOROGO | Private Transportation
Direct Dispatch: +32 456 14 14 97 • booking@dorogo.eu`;

export const OPTOUT = {
  en: "If this isn't relevant to you, reply \"no\" and I won't write again.",
  it: 'Se non è di vostro interesse, basta rispondere "no" e non vi scriverò più.',
};

export const DEFAULT_SETTINGS = {
  kill_switch: false,
  timezone: 'Europe/Rome',
  send_days: [2, 3, 4], // ISO weekday: 1 = Monday ... 7 = Sunday
  window_start: '09:00',
  window_end: '11:30',
  daily_cap: 12,
  warmup: { enabled: true, start: 6, weekly_increment: 3 },
  jitter_min: 4, // minutes between two sends, minimum
  jitter_max: 11,
  season_mode: 'auto', // auto | normal | slow | paused  (auto = half speed May to September)
  bounce_pause_rate: 0.03,
  bounce_min_sample: 15,
  steps: DEFAULT_STEPS,
  sender: { name: 'Dmitri', email: 'booking@dorogo.eu', reply_to: 'booking@dorogo.eu' },
  track_opens: false,
  stale_days: 10,
  ratecard_nudge_days: 5,
  nurture_month_day: '10-01',
  targets: { open_rate: 0.5, positive_reply_rate: 0.10, positive_reply_rate_high: 0.15, ratecard_to_quote: 0.25, partners_won: 5, partners_won_high: 10 },
  avg_wedding_transport_value: 10000,
  commission_rate: 0.12,
};

// Lake Como towns used for coverage and for spotting place names in planner websites.
export const LAKE_TOWNS = [
  'Como', 'Cernobbio', 'Moltrasio', 'Laglio', 'Torno', 'Blevio', 'Carate Urio', 'Brienno',
  'Tremezzina', 'Tremezzo', 'Lenno', 'Ossuccio', 'Mezzegra', 'Menaggio', 'Bellagio', 'Lezzeno',
  'Nesso', 'Varenna', 'Bellano', 'Lecco', 'Gravedona', 'Domaso',
];

// Well-known Lake Como wedding venues with the town they sit in.
export const LAKE_VENUES = [
  { name: 'Villa Balbiano', town: 'Ossuccio' },
  { name: 'Villa del Balbianello', town: 'Lenno' },
  { name: "Villa d'Este", town: 'Cernobbio' },
  { name: 'Villa Erba', town: 'Cernobbio' },
  { name: 'Villa Pizzo', town: 'Cernobbio' },
  { name: 'Villa Sola Cabiati', town: 'Tremezzo' },
  { name: 'Grand Hotel Tremezzo', town: 'Tremezzo' },
  { name: 'Villa Carlotta', town: 'Tremezzo' },
  { name: 'Passalacqua', town: 'Moltrasio' },
  { name: 'Grand Hotel Imperiale', town: 'Moltrasio' },
  { name: 'Villa Serbelloni', town: 'Bellagio' },
  { name: 'Villa Melzi', town: 'Bellagio' },
  { name: 'Villa Monastero', town: 'Varenna' },
  { name: 'Villa Cipressi', town: 'Varenna' },
  { name: 'Il Sereno', town: 'Torno' },
  { name: 'Villa Geno', town: 'Como' },
  { name: 'Villa Regina Teodolinda', town: 'Laglio' },
  { name: 'Relais Villa Vittoria', town: 'Laglio' },
  { name: 'Filario', town: 'Lezzeno' },
];

export const CHANNELS = ['email', 'instagram_dm', 'whatsapp', 'call', 'in_person', 'linkedin'];
export const SENTIMENTS = ['positive', 'neutral', 'negative', 'ooo', 'unsubscribe'];
export const INTENTS = ['wants_rate_card', 'asks_pricing', 'has_supplier', 'not_now', 'referral_to_other', 'meeting_request'];
export const LOST_REASONS = ['has_supplier', 'no_response', 'price', 'not_a_fit', 'not_now', 'other'];
