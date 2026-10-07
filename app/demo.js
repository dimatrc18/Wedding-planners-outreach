// Demo data: fictional agencies, ".test" addresses, generated activity. Nothing here is real or ever saved.
import { buildDraft, classifyReply, inboundEffects, DEFAULT_TEMPLATES, DEFAULT_SETTINGS, priorityScore, commissionFor } from '../supabase/functions/_shared/core/index.js';

let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const id = () => 'demo-' + Math.floor(rnd() * 1e12).toString(36) + Math.floor(rnd() * 1e6).toString(36);
const DAY = 86400000;
// Tue-Thu morning send time `daysAgo` days back (nudged to the nearest Tue-Thu).
function sendTime(daysAgo) {
  const d = new Date(Date.now() - daysAgo * DAY);
  while (![2, 3, 4].includes(d.getUTCDay())) d.setTime(d.getTime() - DAY);
  d.setUTCHours(7 + Math.floor(rnd() * 2), Math.floor(rnd() * 59), 0, 0);
  return d;
}
const iso = (d) => new Date(d).toISOString();

const AGENCIES = [
  ['Atelier Lario Weddings', 'Chiara Valli', 'Como', 'boutique_local', 'it', 'planner', 5.0, 34, 'Your autumn reception on the terrace of a Cernobbio villa, with the long candlelit table by the water, was beautifully judged.', 'venue'],
  ['Riva & Rose Events', 'Hannah Clarke', 'Cernobbio', 'international', 'en', 'planner', 4.9, 58, 'The three-day wedding you shared from Villa Pizzo, with guests arriving by boat for the welcome dinner, stood out.', 'venue'],
  ['Villa Notes Planning', 'Elena Sarti', 'Tremezzo', 'boutique_local', 'it', 'planner', 5.0, 22, 'Il matrimonio a Tremezzo con la cena sul pontile al tramonto era curato in ogni dettaglio.', 'event'],
  ['Lakeside Vows Studio', 'Sophie Laurent', 'Bellagio', 'international', 'en', 'planner', 4.8, 41, 'Your Bellagio elopement series, shot at first light on the lake promenade, has a calm, unhurried style.', 'style'],
  ['Olivia Marchetti Weddings', 'Olivia Marchetti', 'Menaggio', 'boutique_local', 'en', 'planner', 5.0, 19, 'The garden ceremony in Menaggio you featured last month, with the string quartet on the lawn, was lovely.', 'event'],
  ['Casa Blu Events', 'Marco Riva', 'Varenna', 'boutique_local', 'it', 'planner', 4.9, 27, 'La festa a Varenna con gli ospiti accompagnati in barca da Bellagio era un\'idea elegante.', 'event'],
  ['Sette Ponti Weddings', 'Giulia Ferri', 'Como', 'boutique_local', 'it', 'planner', 5.0, 15, 'Il vostro matrimonio a Villa Erba con 140 ospiti e la cena nel parco era impeccabile.', 'venue'],
  ['North Shore Celebrations', 'Emma Hughes', 'Como', 'high_volume_uk_us', 'en', 'planner', 4.7, 112, 'Your feature in a UK bridal magazine on planning Lake Como weddings from London was useful reading.', 'press'],
  ['Giardino Events', 'Paola Neri', 'Moltrasio', 'boutique_local', 'it', 'planner', 5.0, 30, 'Il ricevimento a Moltrasio con l\'allestimento di agrumi e lino bianco era molto riconoscibile.', 'style'],
  ['Linen & Lake', 'Isabel Moore', 'Laglio', 'international', 'en', 'planner', 4.9, 24, 'The Laglio wedding with the sunset aperitivo on the boat dock was a strong set of images.', 'event'],
  ['Studio Ventotto', 'Andrea Galli', 'Milano', 'boutique_local', 'it', 'planner', 4.8, 18, 'Il matrimonio diviso tra Milano e il lago, con il pranzo in centro e la sera a Torno, era ben pensato.', 'event'],
  ['Marea Wedding Design', 'Francesca Bassi', 'Lenno', 'boutique_local', 'it', 'planner', 5.0, 26, 'L\'allestimento a Lenno ispirato alle ville del Novecento era molto riuscito.', 'style'],
  ['Il Pontile Events', 'Luca Conti', 'Torno', 'boutique_local', 'it', 'planner', 4.9, 12, 'La cerimonia sul pontile di Torno con l\'arrivo della sposa in motoscafo era bellissima.', 'event'],
  ['Two Swans Weddings', 'Charlotte Reed', 'Bellagio', 'international', 'en', 'planner', 5.0, 48, 'Your Bellagio wedding with the after-party at a lakeside villa ran until 2 am, which is exactly where we help.', 'event'],
  ['Fioraia Planning', 'Sara Monti', 'Cernobbio', 'boutique_local', 'it', 'planner', 5.0, 21, 'Le composizioni floreali per il matrimonio a Cernobbio di settembre erano raffinate.', 'style'],
  ['Villa & Vine Weddings', 'Grace Turner', 'Tremezzo', 'international', 'en', 'planner', 4.8, 37, 'The Tremezzo wedding you posted, with the welcome drinks in the lemon garden, looked effortless.', 'venue'],
  ['Cielo Alto Events', 'Matteo Rossi', 'Lecco', 'boutique_local', 'it', 'planner', 4.7, 9, 'Il matrimonio a Lecco con la cena in montagna e il rientro al lago era una scelta originale.', 'event'],
  ['Bramble & Co Weddings', 'Lucy Bennett', 'Como', 'high_volume_uk_us', 'en', 'planner', 4.6, 87, 'Your guide to choosing a Lake Como venue for a hundred guests answered questions couples actually ask.', 'press'],
  ['Hotel Belvedere Lago (demo)', 'Front desk', 'Bellagio', null, 'en', 'concierge_hotel', 4.8, 0, 'Your concierge desk arranges evening boats for wedding guests staying in Bellagio, which is where late returns get tricky.', 'other'],
  ['Villa Serenella (demo venue)', 'Events office', 'Blevio', null, 'it', 'venue', null, 0, 'La vostra terrazza a Blevio ospita cene di nozze fino a tarda notte, quando i taxi sul lago finiscono.', 'venue'],
  ['Luca Ferri Photography', 'Luca Ferri', 'Como', null, 'it', 'photographer', 5.0, 33, 'Il reportage del matrimonio a Torno, con l\'arrivo degli ospiti in barca, era molto bello.', 'event'],
  ['Aurora Lake Weddings', '', 'Bellagio', 'boutique_local', 'en', 'planner', 4.9, 16, '', null],
  ['Nodo Wedding Studio', '', 'Como', 'boutique_local', 'it', 'planner', 5.0, 11, '', null],
  ['Blu Lario Planning', '', 'Menaggio', null, 'it', 'planner', null, 0, '', null],
  ['Ponte Vecchio Events', '', 'Cernobbio', 'international', 'en', 'planner', 4.8, 45, '', null],
];

// status by index, with the sequence position to simulate
const PLAN = [
  'partner_won', 'partner_won', 'quote_requested', 'in_conversation', 'rate_card_sent', 'rate_card_sent', 'fam_offered',
  'lost', 'nurture', 'replied_wait', 'replied_wait', 't4_sent', 't3_sent', 't3_sent', 't2_sent', 't1_sent', 't1_sent', 'do_not_contact',
  'ready', 'ready', 'ready', 'ready', 'researching', 'researching', 'researching',
];

export function buildDemoData() {
  seed = 7;
  const prospects = [], touches = [], opps = [], events = [];
  const settings = { ...DEFAULT_SETTINGS, season_mode: 'auto', rate_card_path: 'demo/rate-card.pdf' };
  const templates = DEFAULT_TEMPLATES.map((t) => ({ id: id(), active: true, ...t }));
  const out = (p, step, at, extra = {}) => {
    const t1 = touches.find((x) => x.prospect_id === p.id && x.step_name === 'T1_intro');
    const d = buildDraft({ prospect: p, key: step, templates, threadSubject: t1 ? t1.subject : '', step: { thread: ['T3_followup', 'T4_breakup'].includes(step) } });
    const row = {
      id: id(), prospect_id: p.id, direction: 'out', channel: d.channel, step_name: step, state: 'sent', subject: d.subject, body: d.body,
      template_key: d.template_key, variant: d.variant, lint: d.lint, sent_at: iso(at), created_at: iso(at - 3600000), approved_at: iso(at - 3600000),
      approved_by: 'dmitri', message_id: d.channel === 'email' ? `<${id()}@dorogo.eu>` : null, attach_rate_card: d.attach_rate_card, ...extra,
    };
    touches.push(row); return row;
  };
  const inbound = (p, body, at, extra = {}) => {
    const cls = classifyReply({ body }, new Date(at));
    const row = { id: id(), prospect_id: p.id, direction: 'in', channel: 'email', step_name: 'reply', state: 'received', subject: 'Re: ' + (touches.find((x) => x.prospect_id === p.id && x.subject)?.subject || ''), body, replied_at: iso(at), created_at: iso(at), reply_sentiment: cls.sentiment, reply_intent: cls.intent, classification: cls, from_address: p.email, ...extra };
    touches.push(row); return { row, cls };
  };

  AGENCIES.forEach((a, i) => {
    const [agency_name, contact_name, location, segment, language, type, rating, reviews, hook, hook_type] = a;
    const slug = agency_name.toLowerCase().replace(/[^a-z]+/g, '').slice(0, 14);
    const plan = PLAN[i];
    const p = {
      id: id(), type, agency_name, contact_name, location, segment, language, rating, verified_reviews_count: reviews || null,
      review_source: reviews ? 'matrimonio.com' : null, source: i % 3 ? 'matrimonio.com' : 'instagram',
      email: plan === 'researching' ? '' : `${(contact_name.split(' ')[0] || 'info').toLowerCase()}@${slug}.test`,
      email_status: plan === 'researching' ? 'unknown' : 'mx_ok',
      instagram_handle: i % 4 === 3 ? '' : slug, website: `https://${slug}.test`,
      personalization_hook: hook, hook_type, hook_confidence: hook ? (i % 5 === 0 ? 'medium' : 'high') : null, hook_needs_review: i === 20,
      key_venues: [], timezone: 'Europe/Rome', tags: ['demo'], notes: '', status: plan === 'replied_wait' ? 'replied' : plan,
      do_not_contact: plan === 'do_not_contact', created_at: iso(Date.now() - (40 - i) * DAY), updated_at: iso(Date.now()),
      timezoneLabel: '',
    };
    p.priority_score = priorityScore(p).score;
    prospects.push(p);

    const start = 6 + (i % 5) * 4 + (i < 8 ? 14 : 0); // days ago T1 went out
    const cadence = { t1_sent: 1, t2_sent: 2, t3_sent: 3, t4_sent: 4 };
    if (['ready', 'researching'].includes(plan)) return;
    const t1 = sendTime(start);
    out(p, 'T1_intro', t1);
    const steps = cadence[plan] || (['do_not_contact'].includes(plan) ? 1 : (i % 3) + 1);
    if (steps >= 2 && p.instagram_handle) out(p, 'T2_ig_dm', new Date(t1.getTime() + 3 * DAY + 3 * 3600000));
    if (steps >= 3) out(p, 'T3_followup', new Date(t1.getTime() + 8 * DAY));
    if (steps >= 4) out(p, 'T4_breakup', new Date(t1.getTime() + 14 * DAY));
    if (cadence[plan]) return; // still in the cadence, no reply yet
    const replyAt = new Date(t1.getTime() + (steps * 3 + 1) * DAY + 5 * 3600000);

    if (plan === 'do_not_contact') { inbound(p, 'Please remove me from your list.', replyAt); p.unsubscribed_at = iso(replyAt); return; }
    if (plan === 'lost') { inbound(p, 'Thanks, but we already work with a trusted transport company.', replyAt); p.lost_reason = 'has_supplier'; return; }
    if (plan === 'nurture') { inbound(p, "We're in the middle of the season, please write again in January.", replyAt); p.nurture_until = iso(new Date(new Date().getFullYear() + 1, 0, 1)); return; }
    if (plan === 'replied_wait') {
      const body = i === 9 ? 'Yes please, send it over. We have three weddings in Cernobbio next June.' : 'What are your prices from Malpensa to Bellagio for about 60 guests?';
      const at = Date.now() - (i === 9 ? 2 : 27) * 3600000;
      const { row, cls } = inbound(p, body, at);
      const fx = inboundEffects({ prospect: p, touches: touches.filter((t) => t.prospect_id === p.id), cls, templates, settings, inbound: row, now: new Date(at) });
      Object.assign(p, fx.patch);
      if (fx.draft) touches.push({ id: id(), created_at: iso(at + 60000), ...fx.draft });
      if (fx.opportunity) opps.push({ id: id(), created_at: iso(at), estimated_value: 9000, ...fx.opportunity });
      return;
    }
    // Positive path
    inbound(p, i % 2 ? 'Sure, feel free to send the rate card.' : 'Volentieri, inviatemi la tariffa.', replyAt);
    const rc = out(p, 'rate_card_delivery', new Date(replyAt.getTime() + 40 * 60000), { attach_rate_card: true });
    if (plan === 'rate_card_sent') return;
    inbound(p, 'Thank you. Could we schedule a call next week? We have a 120-guest wedding at Villa Erba in June.', new Date(rc.sent_at).getTime() + 2 * DAY);
    const wedding = new Date(new Date().getFullYear() + 1, 5, 6 + i);
    if (plan === 'partner_won') {
      const revenue = 7800 + i * 2100;
      const model = i === 0 ? 'referral_12' : 'net_whitelabel';
      p.partner_model = model;
      p.reengage_at = iso(new Date(new Date().getFullYear() + 1, 0, 15));
      const owed = commissionFor(revenue, model);
      opps.push({ id: id(), prospect_id: p.id, title: `${agency_name} · June wedding`, stage: 'won', won: true, model, wedding_date: iso(wedding).slice(0, 10), venue: 'Villa Erba', guest_count: 120, estimated_value: revenue, actual_revenue: revenue, commission_owed: owed, commission_paid: i === 0 ? 0 : 0, deposit_received: true, created_at: iso(Date.now() - 12 * DAY) });
      opps.push({ id: id(), prospect_id: p.id, title: `${agency_name} · September wedding`, stage: 'open', model, wedding_date: iso(new Date(wedding.getTime() + 95 * DAY)).slice(0, 10), venue: 'Bellagio', guest_count: 80, estimated_value: 6400, created_at: iso(Date.now() - 4 * DAY) });
    } else if (plan === 'quote_requested') {
      opps.push({ id: id(), prospect_id: p.id, title: `${agency_name} · ${iso(wedding).slice(0, 10)}`, stage: 'quote_sent', model: 'net_whitelabel', wedding_date: iso(wedding).slice(0, 10), venue: 'Villa Balbiano', guest_count: 90, estimated_value: 8600, quote_sent_at: iso(Date.now() - 4 * DAY), created_at: iso(Date.now() - 6 * DAY) });
    } else if (plan === 'fam_offered') {
      p.fam_status = 'offered';
    }
  });

  // The quiet majority: planners who got the full cadence and never answered (keeps the demo rates realistic).
  const A = ['Lario', 'Olmo', 'Cedro', 'Vela', 'Pietra', 'Ninfea', 'Riva', 'Glicine', 'Ulivo', 'Brezza', 'Sorgente', 'Oleandro', 'Faro', 'Mirto', 'Corte', 'Approdo', 'Darsena', 'Isola', 'Ginepro', 'Altana'];
  const B = ['Weddings', 'Events', 'Planning', 'Studio'];
  const TOWNS = ['Como', 'Cernobbio', 'Bellagio', 'Tremezzo', 'Menaggio', 'Varenna', 'Moltrasio', 'Lenno', 'Milano'];
  for (let k = 0; k < 40; k++) {
    const name = `${A[k % A.length]} ${B[(k + Math.floor(k / A.length)) % B.length]}`;
    const town = TOWNS[k % TOWNS.length];
    const lang = k % 3 === 0 ? 'en' : 'it';
    const slug = name.toLowerCase().replace(/[^a-z]+/g, '');
    const p = {
      id: id(), type: 'planner', agency_name: name, contact_name: '', location: town, segment: k % 4 ? 'boutique_local' : 'international', language: lang,
      rating: 4.6 + (k % 5) / 10, verified_reviews_count: 5 + (k * 7) % 40, review_source: 'matrimonio.com', source: 'matrimonio.com',
      email: `info@${slug}.test`, email_status: 'mx_ok', instagram_handle: k % 2 ? slug : '', website: `https://${slug}.test`,
      personalization_hook: k % 6 === 0 ? '' : (lang === 'it' ? `Il vostro matrimonio a ${town} della scorsa stagione era curato con gusto.` : `Your wedding in ${town} last season was beautifully put together.`),
      hook_type: k % 6 === 0 ? null : 'event', key_venues: [], timezone: 'Europe/Rome', tags: ['demo'], notes: '',
      status: k % 5 === 0 ? 'lost' : 't4_sent', lost_reason: k % 5 === 0 ? 'no_response' : null,
      created_at: iso(Date.now() - 60 * DAY), updated_at: iso(Date.now()),
    };
    p.priority_score = priorityScore(p).score;
    prospects.push(p);
    const t1 = sendTime(16 + (k % 6) * 6);
    out(p, 'T1_intro', t1);
    if (p.instagram_handle) out(p, 'T2_ig_dm', new Date(t1.getTime() + 3 * DAY + 3 * 3600000));
    out(p, 'T3_followup', new Date(t1.getTime() + 8 * DAY));
    out(p, 'T4_breakup', new Date(t1.getTime() + 14 * DAY));
  }

  // Ready prospects: T1 drafts waiting in the approval queue.
  for (const p of prospects.filter((x) => x.status === 'ready')) {
    const d = buildDraft({ prospect: p, key: 'T1_intro', templates });
    touches.push({ id: id(), prospect_id: p.id, direction: 'out', channel: 'email', step_name: 'T1_intro', state: 'draft', subject: d.subject, body: d.body, template_key: d.template_key, variant: d.variant, lint: d.lint, created_at: iso(Date.now() - 3600000) });
  }
  // One T3 follow-up due and drafted, one Instagram DM ready to send by hand.
  const t2 = prospects.find((x) => x.status === 't1_sent' && x.instagram_handle);
  if (t2) {
    const d = buildDraft({ prospect: t2, key: 'T2_ig_dm', templates });
    touches.push({ id: id(), prospect_id: t2.id, direction: 'out', channel: 'instagram_dm', step_name: 'T2_ig_dm', state: 'draft', subject: '', body: d.body, template_key: d.template_key, lint: d.lint, created_at: iso(Date.now() - 7200000) });
  }
  // Old conversations have moved on: only the two fresh replies are still waiting.
  const waiting = new Set(prospects.filter((x) => x.status === 'replied' || touches.some((t) => t.prospect_id === x.id && t.suggested_for)).map((x) => x.id));
  for (const t of touches) if (t.direction === 'in' && !waiting.has(t.prospect_id)) t.handled_at = t.replied_at;
  for (const p of prospects) {
    const last = touches.filter((t) => t.prospect_id === p.id).map((t) => t.sent_at || t.replied_at || t.created_at).sort().pop();
    p.last_touch_at = last || null;
  }
  events.push({ id: id(), at: iso(Date.now() - 3600000), action: 'demo_loaded', detail: { note: 'Demo data: fictional agencies' }, actor: 'demo' });
  return { prospects, touches, opps, templates, settings, events };
}
