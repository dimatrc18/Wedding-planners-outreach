// What an inbound message does to a prospect. Used by the inbox sync (server) and by "Log a reply" (browser),
// so a reply has the same effects however it arrives.

import { COLD_STEPS, nurtureDate, nextSendSlot, withDefaults } from './sequence.js';
import { FUNNEL_RANK } from './constants.js';
import { buildDraft, replyTemplateFor } from './drafts.js';

const PENDING = ['draft', 'approved'];

/**
 * inboundEffects({ prospect, touches, cls, templates, settings, now, inbound })
 *   cls: classifyReply() result (optionally refined by AI: may carry wedding_date)
 *   inbound: { id, channel, subject }
 * → { patch, skipIds, reschedule: [{id, scheduled_at}], draft, opportunity, alert, summary }
 */
export function inboundEffects({ prospect, touches = [], cls, templates, settings, now = new Date(), inbound = {} }) {
  const s = withDefaults(settings);
  const iso = (d) => new Date(d).toISOString();
  const patch = { last_touch_at: iso(now) };
  const pendingOut = touches.filter((t) => t.direction === 'out' && PENDING.includes(t.state));
  const out = { patch, skipIds: [], reschedule: [], draft: null, opportunity: null, alert: false, summary: '' };

  if (cls.sentiment === 'unsubscribe') {
    Object.assign(patch, { do_not_contact: true, unsubscribed_at: iso(now), status: 'do_not_contact' });
    out.skipIds = pendingOut.map((t) => t.id);
    out.summary = 'Asked not to be contacted. Marked Do Not Contact; nothing more will be sent.';
    return out;
  }

  if (cls.sentiment === 'ooo') {
    const resume = new Date(cls.ooo_until || now.getTime() + 7 * 86400000);
    patch.resume_at = iso(resume);
    const taken = [];
    for (const t of pendingOut.filter((x) => x.state === 'approved' && x.scheduled_at && new Date(x.scheduled_at) < resume && COLD_STEPS.includes(x.step_name))) {
      const at = nextSendSlot(resume, s, taken, { tz: prospect.timezone || s.timezone, rng: () => 0.5 });
      taken.push(at);
      out.reschedule.push({ id: t.id, scheduled_at: at ? iso(at) : null });
    }
    out.summary = `Out of office. Sequence resumes ${resume.toISOString().slice(0, 10)}.`;
    return out;
  }

  // A real reply: the cadence stops for good.
  out.skipIds = pendingOut.filter((t) => COLD_STEPS.includes(t.step_name)).map((t) => t.id);
  const rank = FUNNEL_RANK[prospect.status] ?? 0;
  if (rank < FUNNEL_RANK.replied) patch.status = 'replied';
  if (cls.intent === 'not_now') {
    patch.status = 'nurture';
    patch.nurture_until = iso(cls.nurture_until || nurtureDate(now, s));
  }
  if (cls.intent === 'asks_pricing' && rank < FUNNEL_RANK.quote_requested) patch.status = 'quote_requested';
  if (cls.intent === 'meeting_request' && rank < FUNNEL_RANK.in_conversation) patch.status = 'in_conversation';

  if (['asks_pricing', 'meeting_request'].includes(cls.intent) || cls.wedding_date) {
    out.opportunity = {
      prospect_id: prospect.id, stage: 'open', model: prospect.partner_model || null,
      wedding_date: cls.wedding_date || null,
      title: `${prospect.agency_name}${cls.wedding_date ? ` · ${cls.wedding_date}` : ''}`,
      notes: `Created from a reply (${cls.intent || 'wedding date'}).`,
    };
  }
  out.alert = cls.sentiment === 'positive';

  if (!(cls.sentiment === 'negative' && !cls.intent)) {
    const key = replyTemplateFor(cls.intent);
    const d = buildDraft({ prospect: { ...prospect, ...patch }, key, templates, threadSubject: inbound.subject || '' });
    if (d) {
      const channel = prospect.email ? 'email' : (inbound.channel || 'email');
      out.draft = {
        prospect_id: prospect.id, direction: 'out', state: 'draft', channel,
        step_name: key === 'rate_card_delivery' ? 'rate_card_delivery' : 'reply',
        subject: channel === 'email' ? d.subject || (inbound.subject ? `Re: ${inbound.subject.replace(/^re:\s*/i, '')}` : 'DOROGO rate card') : '',
        body: d.body, template_key: d.template_key, variant: 'A', lint: d.lint,
        attach_rate_card: d.attach_rate_card, suggested_for: inbound.id || null,
      };
    }
  }
  const labels = {
    wants_rate_card: 'Wants the rate card', asks_pricing: 'Asks for prices', meeting_request: 'Wants a call',
    has_supplier: 'Has a supplier', not_now: 'Not now: nurture', referral_to_other: 'Points to a colleague',
  };
  out.summary = `${labels[cls.intent] || (cls.sentiment === 'negative' ? 'Not interested' : 'Replied')}.`;
  return out;
}
