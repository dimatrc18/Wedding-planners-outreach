// Path exploration engine for the Pipeline view (GA4-style multi-step flow diagram).
// Pure ESM with no external dependencies: shared by the browser app and Node tests.

import { STAGES, STAGE_KEYS, FUNNEL_RANK, stageLabel } from './constants.js';
import { COLD_STEPS, isRealReply, isBlocked } from './sequence.js';
import { groupTouches, prospectFacts } from './stats.js';
import { priorityScore } from './prospects.js';

export const PATH_DIMENSIONS = [
  { key: 'entry', label: 'Outreach entry', group: 'Journey' },
  { key: 'cadence_step', label: 'Cadence step', group: 'Journey' },
  { key: 'response', label: 'Planner response', group: 'Journey' },
  { key: 'stage', label: 'Pipeline stage', group: 'Journey' },
  { key: 'stage_group', label: 'Stage group', group: 'Journey' },
  { key: 'touch_1', label: 'Event 1 (First touch)', group: 'Event sequence' },
  { key: 'touch_2', label: 'Event 2 (Step +1)', group: 'Event sequence' },
  { key: 'touch_3', label: 'Event 3 (Step +2)', group: 'Event sequence' },
  { key: 'touch_4', label: 'Event 4 (Outcome)', group: 'Event sequence' },
  { key: 'segment', label: 'Segment', group: 'Attributes' },
  { key: 'type', label: 'Prospect type', group: 'Attributes' },
  { key: 'location', label: 'Location / town', group: 'Attributes' },
  { key: 'language', label: 'Language', group: 'Attributes' },
  { key: 'hook_type', label: 'Hook type', group: 'Attributes' },
  { key: 'variant', label: 'Subject variant (T1)', group: 'Attributes' },
  { key: 'priority_tier', label: 'Priority tier', group: 'Attributes' },
];

export const PATH_PRESETS = [
  { key: 'outreach', label: 'Outreach flow', steps: ['entry', 'cadence_step', 'response', 'stage'] },
  { key: 'events', label: 'Event sequence', steps: ['touch_1', 'touch_2', 'touch_3', 'touch_4'] },
  { key: 'segment', label: 'Segment path', steps: ['segment', 'cadence_step', 'response', 'stage_group'] },
  { key: 'territory', label: 'Territory & priority', steps: ['type', 'location', 'priority_tier', 'stage'] },
];

const SEG_LABEL = {
  boutique_local: 'Boutique local',
  high_volume_uk_us: 'High volume UK/US',
  international: 'International',
};

const TYPE_LABEL = {
  planner: 'Wedding planner',
  venue: 'Venue',
  concierge_hotel: 'Hotel concierge',
  photographer: 'Photographer',
};

const STAGE_TONE = {
  partner_won: 'ok',
  quote_requested: 'ok',
  fam_offered: 'gold',
  in_conversation: 'gold',
  rate_card_sent: 'gold',
  replied: 'gold',
  t1_sent: 'info',
  t2_sent: 'info',
  t3_sent: 'info',
  t4_sent: 'info',
  ready: 'gold',
  researching: 'muted',
  nurture: 'warn',
  lost: 'bad',
  do_not_contact: 'bad',
};

const t0 = (x) => (x ? new Date(x).getTime() : 0);

const DRAFT_STEP_LABEL = {
  T1_intro: 'T1',
  T2_ig_dm: 'T2',
  T3_followup: 'T3',
  T4_breakup: 'T4',
  rate_card_delivery: 'Rate Card',
  fam_followup: 'FAM Follow-up',
  reply: 'Reply',
};

const STAGE_EVENT_FALLBACK = {
  t1_sent: { key: 'ev:t1', label: 'T1 Intro Sent', tone: 'info', band: 1, dropStage: 't1_sent', order: 10 },
  t2_sent: { key: 'ev:t2', label: 'T2 IG DM Sent', tone: 'info', band: 1, dropStage: 't2_sent', order: 20 },
  t3_sent: { key: 'ev:t3', label: 'T3 Follow-up Sent', tone: 'info', band: 1, dropStage: 't3_sent', order: 30 },
  t4_sent: { key: 'ev:t4', label: 'T4 Breakup Sent', tone: 'info', band: 1, dropStage: 't4_sent', order: 40 },
  replied: { key: 'ev:rep_pos', label: 'Reply: Positive', tone: 'ok', band: 1, dropStage: 'replied', order: 50 },
  rate_card_sent: { key: 'ev:rc', label: 'Rate Card Sent', tone: 'gold', band: 1, dropStage: 'rate_card_sent', order: 60 },
  in_conversation: { key: 'ev:conv', label: 'In Conversation', tone: 'gold', band: 1, dropStage: 'in_conversation', order: 8 },
  fam_offered: { key: 'ev:fam', label: 'FAM Offered', tone: 'gold', band: 1, dropStage: 'fam_offered', order: 7 },
  quote_requested: { key: 'ev:quote', label: 'Quote Requested', tone: 'ok', band: 1, dropStage: 'quote_requested', order: 6 },
  partner_won: { key: 'ev:won', label: 'Partner Won', tone: 'ok', band: 1, dropStage: 'partner_won', order: 5 },
  nurture: { key: 'ev:rep_nurture', label: 'Reply: Next Season', tone: 'warn', band: 1, dropStage: 'nurture', order: 52 },
  lost: { key: 'ev:lost', label: 'Lost', tone: 'bad', band: 1, dropStage: 'lost', order: 62 },
  do_not_contact: { key: 'ev:rep_unsub', label: 'Do Not Contact', tone: 'bad', band: 1, dropStage: 'do_not_contact', order: 55 },
  ready: { key: 'ev:ready', label: 'Ready to Contact', tone: 'gold', band: 2, dropStage: 'ready', order: 70 },
  researching: { key: 'ev:researching', label: 'Researching', tone: 'muted', band: 3, dropStage: 'researching', order: 80 },
};

/** Build the ordered chronological event trail for a single prospect. */
export function prospectEventTrail(p, list = [], opps = []) {
  if (p.status === 'researching') {
    return [{ ...STAGE_EVENT_FALLBACK.researching }];
  }
  if (p.status === 'ready') {
    const pending = list.find((t) => t.direction === 'out' && (t.state === 'draft' || t.state === 'approved'));
    if (pending) {
      const prefix = DRAFT_STEP_LABEL[pending.step_name] || 'T1';
      return [{
        key: `ev:draft_${pending.step_name}`,
        label: pending.state === 'approved' ? `${prefix} Scheduled` : `${prefix} Drafted`,
        tone: 'gold',
        band: 2,
        dropStage: 'ready',
        order: 15,
      }];
    }
    return [{ ...STAGE_EVENT_FALLBACK.ready }];
  }

  const events = [];
  const sorted = [...list].sort((a, b) => (t0(a.sent_at || a.replied_at || a.created_at) - t0(b.sent_at || b.replied_at || b.created_at)));
  for (const t of sorted) {
    if (t.direction === 'out' && t.state === 'sent') {
      if (t.step_name === 'T1_intro') events.push({ key: 'ev:t1', label: 'T1 Intro Sent', tone: 'info', band: 1, dropStage: 't1_sent', order: 10 });
      else if (t.step_name === 'T2_ig_dm') events.push({ key: 'ev:t2', label: 'T2 IG DM Sent', tone: 'info', band: 1, dropStage: 't2_sent', order: 20 });
      else if (t.step_name === 'T3_followup') events.push({ key: 'ev:t3', label: 'T3 Follow-up Sent', tone: 'info', band: 1, dropStage: 't3_sent', order: 30 });
      else if (t.step_name === 'T4_breakup') events.push({ key: 'ev:t4', label: 'T4 Breakup Sent', tone: 'info', band: 1, dropStage: 't4_sent', order: 40 });
      else if (t.step_name === 'rate_card_delivery') events.push({ key: 'ev:rc', label: 'Rate Card Sent', tone: 'gold', band: 1, dropStage: 'rate_card_sent', order: 60 });
      else events.push({ key: 'ev:out', label: 'Follow-up Reply Sent', tone: 'gold', band: 1, order: 65 });
    } else if (isRealReply(t)) {
      if (t.reply_sentiment === 'positive') events.push({ key: 'ev:rep_pos', label: 'Reply: Positive', tone: 'ok', band: 1, dropStage: 'replied', order: 50 });
      else if (t.reply_sentiment === 'unsubscribe') events.push({ key: 'ev:rep_unsub', label: 'Reply: Unsubscribe', tone: 'bad', band: 1, dropStage: 'do_not_contact', order: 55 });
      else if (t.reply_sentiment === 'negative') events.push({ key: 'ev:rep_neg', label: 'Reply: Declined', tone: 'bad', band: 1, dropStage: 'lost', order: 54 });
      else if (t.reply_intent === 'not_now') events.push({ key: 'ev:rep_nurture', label: 'Reply: Next Season', tone: 'warn', band: 1, dropStage: 'nurture', order: 52 });
      else events.push({ key: 'ev:rep_neu', label: 'Reply: Question', tone: 'gold', band: 1, dropStage: 'replied', order: 51 });
    } else if (t.direction === 'out' && (t.state === 'draft' || t.state === 'approved')) {
      const prefix = DRAFT_STEP_LABEL[t.step_name] || t.step_name.replace(/_.*/, '');
      events.push({
        key: `ev:draft_${t.step_name}`,
        label: t.state === 'approved' ? `${prefix} Scheduled` : `${prefix} Drafted`,
        tone: 'gold',
        band: 1,
        dropStage: p.status,
        order: 15,
      });
    }
  }

  // Append terminal / high-funnel stage milestone if not already the last event
  const myOpps = opps.filter((o) => o.prospect_id === p.id);
  const lastKey = events[events.length - 1]?.key;
  if ((p.status === 'partner_won' || myOpps.some((o) => o.stage === 'won' || o.won)) && lastKey !== 'ev:won') {
    events.push({ ...STAGE_EVENT_FALLBACK.partner_won });
  } else if ((p.status === 'quote_requested' || myOpps.some((o) => o.stage === 'quote_sent' || o.quote_sent_at)) && lastKey !== 'ev:quote') {
    events.push({ ...STAGE_EVENT_FALLBACK.quote_requested });
  } else if (p.status === 'fam_offered' && lastKey !== 'ev:fam') {
    events.push({ ...STAGE_EVENT_FALLBACK.fam_offered });
  } else if (p.status === 'in_conversation' && lastKey !== 'ev:conv') {
    events.push({ ...STAGE_EVENT_FALLBACK.in_conversation });
  }

  if (!events.length) {
    const fb = STAGE_EVENT_FALLBACK[p.status];
    if (fb) events.push({ ...fb });
    else {
      events.push({
        key: `ev:st_${p.status}`,
        label: stageLabel(p.status),
        tone: STAGE_TONE[p.status] || 'info',
        band: 1,
        dropStage: p.status,
        order: 75,
      });
    }
  }
  return events;
}

/**
 * Classify a single prospect into a node descriptor `{ key, label, tone, band, order, dropStage? }`
 * for a given dimension key. `band` keeps contacted (1), ready (2), and researching (3) flows aligned horizontally.
 */
export function classifyProspectStep(p, dimKey, ctx = {}) {
  const list = ctx.touches || [];
  const opps = ctx.opps || [];
  const f = ctx.facts || prospectFacts(p, list, opps);
  const sc = typeof p.priority_score === 'number' && p.priority_score > 0 ? p.priority_score : priorityScore(p).score;

  switch (dimKey) {
    case 'entry': {
      if (p.status === 'researching') return { key: 'entry:researching', label: 'Researching', tone: 'muted', band: 3, order: 6, dropStage: 'researching' };
      if (p.status === 'ready') return { key: 'entry:ready', label: 'Ready to Contact', tone: 'gold', band: 2, order: 2, dropStage: 'ready' };
      if (f.contacted) return { key: 'entry:contacted', label: 'Contacted', tone: 'info', band: 1, order: 1, dropStage: 't1_sent' };
      if (isBlocked(p)) return { key: 'entry:dnc', label: 'Do Not Contact', tone: 'bad', band: 1, order: 5, dropStage: 'do_not_contact' };
      if (p.status === 'lost') return { key: 'entry:lost', label: 'Lost', tone: 'bad', band: 1, order: 4, dropStage: 'lost' };
      if (p.status === 'nurture') return { key: 'entry:nurture', label: 'Nurture', tone: 'warn', band: 1, order: 3, dropStage: 'nurture' };
      return { key: 'entry:researching', label: 'Researching', tone: 'muted', band: 3, order: 6, dropStage: 'researching' };
    }

    case 'cadence_step': {
      if (p.status === 'researching') {
        const hasEmail = !!(p.email && String(p.email).trim());
        const hasHook = !!(p.personalization_hook && String(p.personalization_hook).trim());
        if (hasEmail && hasHook) return { key: 'step:ready_check', label: 'Ready to Mark', tone: 'gold', band: 3, order: 7, dropStage: 'ready' };
        if (hasHook && !hasEmail) return { key: 'step:needs_email', label: 'Needs Email', tone: 'warn', band: 3, order: 8, dropStage: 'researching' };
        if (hasEmail && !hasHook) return { key: 'step:needs_hook', label: 'Needs Hook', tone: 'warn', band: 3, order: 9, dropStage: 'researching' };
        return { key: 'step:needs_both', label: 'Needs Email & Hook', tone: 'muted', band: 3, order: 10, dropStage: 'researching' };
      }
      if (p.status === 'ready') {
        const pending = list.find((t) => t.direction === 'out' && (t.state === 'draft' || t.state === 'approved'));
        return pending
          ? { key: 'step:t1_draft', label: 'T1 Drafted', tone: 'gold', band: 2, order: 5, dropStage: 'ready' }
          : { key: 'step:ready', label: 'Ready for T1', tone: 'gold', band: 2, order: 6, dropStage: 'ready' };
      }
      if (p.status === 't1_sent') return { key: 'step:t1', label: 'T1 Intro Sent', tone: 'info', band: 1, order: 1, dropStage: 't1_sent' };
      if (p.status === 't2_sent') return { key: 'step:t2', label: 'T2 IG DM Sent', tone: 'info', band: 1, order: 2, dropStage: 't2_sent' };
      if (p.status === 't3_sent') return { key: 'step:t3', label: 'T3 Follow-up Sent', tone: 'info', band: 1, order: 3, dropStage: 't3_sent' };
      if (p.status === 't4_sent') return { key: 'step:t4', label: 'T4 Breakup Sent', tone: 'info', band: 1, order: 4, dropStage: 't4_sent' };

      const sentCold = list.filter((t) => t.direction === 'out' && t.state === 'sent' && COLD_STEPS.includes(t.step_name));
      const sentNames = new Set(sentCold.map((t) => t.step_name));
      if (sentNames.has('T4_breakup')) return { key: 'step:t4', label: 'T4 Breakup Sent', tone: 'info', band: 1, order: 4, dropStage: 't4_sent' };
      if (sentNames.has('T3_followup')) return { key: 'step:t3', label: 'T3 Follow-up Sent', tone: 'info', band: 1, order: 3, dropStage: 't3_sent' };
      if (sentNames.has('T2_ig_dm')) return { key: 'step:t2', label: 'T2 IG DM Sent', tone: 'info', band: 1, order: 2, dropStage: 't2_sent' };
      return { key: 'step:t1', label: 'T1 Intro Sent', tone: 'info', band: 1, order: 1, dropStage: 't1_sent' };
    }

    case 'response': {
      if (p.status === 'researching') {
        return { key: 'resp:pre_outreach', label: 'Pre-Outreach (Research)', tone: 'muted', band: 3, order: 9, dropStage: 'researching' };
      }
      if (p.status === 'ready') {
        return { key: 'resp:queued', label: 'Queued for Approval', tone: 'gold', band: 2, order: 8, dropStage: 'ready' };
      }
      if (['t1_sent', 't2_sent', 't3_sent'].includes(p.status)) {
        return { key: 'resp:waiting', label: 'In Sequence (Waiting)', tone: 'info', band: 1, order: 4, dropStage: 't1_sent' };
      }
      if (p.status === 't4_sent') {
        return { key: 'resp:no_reply', label: 'No Reply (After T4)', tone: 'info', band: 1, order: 7, dropStage: 't4_sent' };
      }
      if (p.status === 'do_not_contact' || isBlocked(p)) {
        return { key: 'resp:unsub', label: 'Unsubscribed', tone: 'bad', band: 1, order: 6, dropStage: 'do_not_contact' };
      }
      if (p.status === 'nurture') {
        return { key: 'resp:nurture', label: 'Not Now (Next Season)', tone: 'warn', band: 1, order: 3, dropStage: 'nurture' };
      }
      if (p.status === 'lost') {
        if (f.replied || ['has_supplier', 'price', 'not_a_fit'].includes(p.lost_reason)) {
          return { key: 'resp:declined', label: 'Declined / Has Supplier', tone: 'bad', band: 1, order: 5, dropStage: 'lost' };
        }
        return { key: 'resp:no_reply', label: 'No Reply (After T4)', tone: 'info', band: 1, order: 7, dropStage: 't4_sent' };
      }
      const highStage = ['rate_card_sent', 'in_conversation', 'quote_requested', 'fam_offered', 'partner_won'].includes(p.status);
      if (f.positive || highStage) {
        return { key: 'resp:positive', label: 'Positive Reply', tone: 'ok', band: 1, order: 1, dropStage: 'replied' };
      }
      if (f.replied && f.firstReply?.reply_sentiment && f.firstReply.reply_sentiment !== 'positive') {
        return { key: 'resp:question', label: 'Replied · Pricing / Info', tone: 'gold', band: 1, order: 2, dropStage: 'replied' };
      }
      return { key: 'resp:positive', label: 'Positive Reply', tone: 'ok', band: 1, order: 1, dropStage: 'replied' };
    }

    case 'stage': {
      const idx = STAGE_KEYS.indexOf(p.status);
      const rankOrder = {
        partner_won: 1, quote_requested: 2, fam_offered: 3, in_conversation: 4, rate_card_sent: 5, replied: 6,
        t1_sent: 7, t2_sent: 8, t3_sent: 9, t4_sent: 10, nurture: 11, lost: 12, do_not_contact: 13, ready: 14, researching: 15,
      };
      const band = p.status === 'ready' ? 2 : p.status === 'researching' ? 3 : 1;
      return {
        key: `stage:${p.status}`,
        label: stageLabel(p.status),
        tone: STAGE_TONE[p.status] || 'info',
        band,
        order: rankOrder[p.status] ?? (idx >= 0 ? idx + 1 : 99),
        dropStage: p.status,
      };
    }

    case 'stage_group': {
      if (p.status === 'partner_won') return { key: 'sg:won', label: 'Partner Won', tone: 'ok', band: 1, order: 1, dropStage: 'partner_won' };
      if (['quote_requested', 'fam_offered', 'in_conversation'].includes(p.status)) {
        return { key: 'sg:deal', label: 'Active Deal / Quote', tone: 'ok', band: 1, order: 2, dropStage: 'in_conversation' };
      }
      if (['rate_card_sent', 'replied'].includes(p.status)) {
        return { key: 'sg:engaged', label: 'Replied / Rate Card', tone: 'gold', band: 1, order: 3, dropStage: 'rate_card_sent' };
      }
      if (['t1_sent', 't2_sent', 't3_sent'].includes(p.status)) {
        return { key: 'sg:cadence', label: 'Active Cadence (T1–T3)', tone: 'info', band: 1, order: 4, dropStage: 't1_sent' };
      }
      if (p.status === 't4_sent') return { key: 'sg:t4', label: 'Cadence Done (T4)', tone: 'info', band: 1, order: 5, dropStage: 't4_sent' };
      if (p.status === 'nurture') return { key: 'sg:nurture', label: 'Nurture (Next Season)', tone: 'warn', band: 1, order: 6, dropStage: 'nurture' };
      if (['lost', 'do_not_contact'].includes(p.status)) return { key: 'sg:closed', label: 'Lost / DNC', tone: 'bad', band: 1, order: 7, dropStage: 'lost' };
      if (p.status === 'ready') return { key: 'sg:ready', label: 'Ready to Contact', tone: 'gold', band: 2, order: 8, dropStage: 'ready' };
      return { key: 'sg:researching', label: 'Researching', tone: 'muted', band: 3, order: 9, dropStage: 'researching' };
    }

    case 'touch_1':
    case 'touch_2':
    case 'touch_3':
    case 'touch_4': {
      const stepIdx = Number(dimKey.slice(-1)) - 1;
      const trail = ctx.trail || prospectEventTrail(p, list, opps);
      if (stepIdx === 3 && trail.length > 4) {
        const lastEv = trail[trail.length - 1];
        return { ...lastEv, key: `${dimKey}:${lastEv.key}` };
      }
      if (trail[stepIdx]) {
        const ev = trail[stepIdx];
        return { ...ev, key: `${dimKey}:${ev.key}` };
      }
      if (stepIdx < 3) {
        if (['t1_sent', 't2_sent', 't3_sent'].includes(p.status)) {
          return { key: `${dimKey}:awaiting`, label: 'Awaiting Reply', tone: 'info', band: 1, order: 70 };
        }
        if (p.status === 'ready') {
          return { key: `${dimKey}:ready_queue`, label: 'Queued for T1', tone: 'gold', band: 2, dropStage: 'ready', order: 80 };
        }
        if (p.status === 'researching') {
          return { key: `${dimKey}:needs_research`, label: 'Needs Email & Hook', tone: 'muted', band: 3, dropStage: 'researching', order: 85 };
        }
      }
      const fb = STAGE_EVENT_FALLBACK[p.status];
      if (fb) {
        return { ...fb, key: `${dimKey}:${fb.key}` };
      }
      const band = p.status === 'ready' ? 2 : p.status === 'researching' ? 3 : 1;
      return {
        key: `${dimKey}:st_${p.status}`,
        label: stageLabel(p.status),
        tone: STAGE_TONE[p.status] || 'info',
        band,
        dropStage: p.status,
        order: 90,
      };
    }

    case 'segment': {
      const k = p.segment || 'unassigned';
      const order = { boutique_local: 1, international: 2, high_volume_uk_us: 3, unassigned: 4 };
      const tone = { boutique_local: 'gold', international: 'info', high_volume_uk_us: 'ok', unassigned: 'muted' };
      return { key: `seg:${k}`, label: SEG_LABEL[k] || 'Unassigned segment', tone: tone[k] || 'muted', band: 1, order: order[k] || 9 };
    }

    case 'type': {
      const k = p.type || 'planner';
      const order = { planner: 1, venue: 2, concierge_hotel: 3, photographer: 4 };
      const tone = { planner: 'gold', venue: 'info', concierge_hotel: 'ok', photographer: 'muted' };
      return { key: `type:${k}`, label: TYPE_LABEL[k] || k, tone: tone[k] || 'muted', band: 1, order: order[k] || 9 };
    }

    case 'location': {
      const loc = (p.location || '').trim() || 'Unspecified town';
      return { key: `loc:${loc.toLowerCase()}`, label: loc, tone: loc === 'Unspecified town' ? 'muted' : 'info', band: 1, order: loc === 'Unspecified town' ? 99 : 10 };
    }

    case 'language': {
      const lang = (p.language || 'en').toLowerCase();
      const labels = { it: 'Italian (IT)', en: 'English (EN)', de: 'German (DE)', fr: 'French (FR)' };
      return { key: `lang:${lang}`, label: labels[lang] || lang.toUpperCase(), tone: lang === 'it' ? 'gold' : 'info', band: 1, order: lang === 'it' ? 1 : 2 };
    }

    case 'hook_type': {
      const ht = p.hook_type || ((p.personalization_hook || '').trim() ? 'other' : 'none');
      const labels = { venue: 'Venue hook', event: 'Event hook', style: 'Style hook', press: 'Press hook', award: 'Award hook', other: 'Custom hook', none: 'No hook yet' };
      return { key: `hook:${ht}`, label: labels[ht] || ht, tone: ht === 'none' ? 'warn' : 'gold', band: 1, order: ht === 'none' ? 99 : 10 };
    }

    case 'variant': {
      if (f.t1) {
        const v = f.t1.variant || 'A';
        return { key: `var:${v}`, label: `Subject ${v}`, tone: v === 'A' ? 'gold' : 'info', band: 1, order: v === 'A' ? 1 : 2 };
      }
      const draftT1 = list.find((t) => t.step_name === 'T1_intro' && t.variant);
      if (draftT1) {
        return { key: `var:draft_${draftT1.variant}`, label: `Subject ${draftT1.variant} (draft)`, tone: 'gold', band: 2, order: 3 };
      }
      return { key: 'var:none', label: 'No T1 sent yet', tone: 'muted', band: 3, order: 9 };
    }

    case 'priority_tier': {
      if (sc >= 60) return { key: 'prio:high', label: 'High Priority (60+)', tone: 'ok', band: 1, order: 1 };
      if (sc >= 40) return { key: 'prio:med', label: 'Medium Priority (40–59)', tone: 'gold', band: 1, order: 2 };
      return { key: 'prio:low', label: 'Low Priority (<40)', tone: 'muted', band: 1, order: 3 };
    }

    default:
      return { key: `stage:${p.status}`, label: stageLabel(p.status), tone: STAGE_TONE[p.status] || 'info', band: 1, order: 50, dropStage: p.status };
  }
}

/**
 * Build the complete multi-step Path Exploration model + SVG Sankey layout.
 *
 * Options:
 * - steps: array of dimension keys (default: ['entry', 'cadence_step', 'response', 'stage'])
 * - selectedPath: object mapping column index -> selected node key (e.g. `{ 0: 'entry:contacted' }`)
 * - expandedCols: array or Set of column indices where "+N More" is expanded
 * - maxNodesPerCol: maximum individual nodes before grouping the tail into "+N More" (default 6)
 * - colStride: horizontal pixel distance between column bars (default 248)
 * - barWidth: pixel width of each vertical node bar (default 10)
 */
export function buildPathExploration(prospects = [], touches = [], opps = [], options = {}) {
  const steps = Array.isArray(options.steps) && options.steps.length >= 2
    ? options.steps
    : PATH_PRESETS[0].steps;
  const maxNodesPerCol = options.maxNodesPerCol ?? 6;
  const expandedSet = new Set(options.expandedCols || []);
  const rawSelection = options.selectedPath || {};
  const colStride = options.colStride ?? 248;
  const barWidth = options.barWidth ?? 10;
  const padLeft = options.padLeft ?? 16;
  const padTop = options.padTop ?? 14;
  const padBottom = options.padBottom ?? 20;

  const byTouches = groupTouches(touches);

  // 1. Classify every prospect across all requested step columns.
  const records = prospects.map((p) => {
    const pTouches = byTouches.get(p.id) || [];
    const facts = prospectFacts(p, pTouches, opps);
    const trail = prospectEventTrail(p, pTouches, opps);
    const ctx = { touches: pTouches, opps, facts, trail };
    const rawCells = steps.map((dim) => classifyProspectStep(p, dim, ctx));
    return { p, facts, rawCells, cells: [...rawCells] };
  });

  // 2. Build columns and fold "+N More" per column when node count exceeds maxNodesPerCol.
  const activeSelection = {};
  const columns = [];
  let cohortUpToPrev = records;

  for (let c = 0; c < steps.length; c++) {
    const dimKey = steps[c];
    const dimMeta = PATH_DIMENSIONS.find((d) => d.key === dimKey) || { key: dimKey, label: dimKey };

    const groups = new Map();
    for (const r of cohortUpToPrev) {
      const cell = r.rawCells[c];
      let g = groups.get(cell.key);
      if (!g) {
        g = {
          key: cell.key,
          label: cell.label,
          tone: cell.tone || 'info',
          band: cell.band ?? 1,
          order: cell.order ?? 50,
          dropStage: cell.dropStage || null,
          isMore: false,
          hiddenCount: 0,
          records: [],
        };
        groups.set(cell.key, g);
      }
      g.records.push(r);
    }

    // Compute dominant upstream source position in column c - 1 to minimize ribbon crossings within a band
    const prevCol = c > 0 ? columns[c - 1] : null;
    const prevNodeIdx = prevCol ? new Map(prevCol.nodes.map((n, idx) => [n.key, idx])) : null;
    for (const g of groups.values()) {
      if (!prevNodeIdx || !g.records.length) {
        g.dominantSrcIdx = 0;
        continue;
      }
      const countsBySrc = new Map();
      for (const r of g.records) {
        const sIdx = prevNodeIdx.get(r.cells[c - 1].key) ?? 0;
        countsBySrc.set(sIdx, (countsBySrc.get(sIdx) || 0) + 1);
      }
      let bestIdx = 0;
      let bestCnt = -1;
      for (const [sIdx, cnt] of countsBySrc.entries()) {
        if (cnt > bestCnt || (cnt === bestCnt && sIdx < bestIdx)) {
          bestCnt = cnt;
          bestIdx = sIdx;
        }
      }
      g.dominantSrcIdx = bestIdx;
      g.singleParent = countsBySrc.size <= 1;
    }

    const wantedKey = rawSelection[c];
    const isExpanded = expandedSet.has(c);
    const allGroups = [...groups.values()];
    const mostlyPartitioned = c > 0 && allGroups.length > 0 && (allGroups.filter((g) => g.singleParent).length / allGroups.length) >= 0.7;

    const nodeSort = (a, b) =>
      (a.band - b.band) ||
      (a.isMore ? 1 : b.isMore ? -1 : 0) ||
      (isExpanded && mostlyPartitioned ? (a.dominantSrcIdx - b.dominantSrcIdx) : 0) ||
      (b.records.length - a.records.length) ||
      (a.dominantSrcIdx - b.dominantSrcIdx) ||
      (a.order - b.order) ||
      a.label.localeCompare(b.label);

    let nodeList = allGroups.sort(nodeSort);

    let hiddenNodesCount = 0;
    if (!isExpanded && nodeList.length > maxNodesPerCol) {
      const keepCount = maxNodesPerCol - 1;
      // Preserve single-node lower bands (band 2 Ready, band 3 Researching) so +N More never merges across bands
      const band1Nodes = nodeList.filter((n) => n.band === 1);
      const lowerBandNodes = nodeList.filter((n) => n.band > 1);
      const canIsolateBand1 = lowerBandNodes.length < keepCount && band1Nodes.length > (keepCount - lowerBandNodes.length);

      let keptSet;
      if (canIsolateBand1) {
        const band1KeepCount = keepCount - lowerBandNodes.length;
        const band1BySize = [...band1Nodes].sort((a, b) => (b.records.length - a.records.length) || (a.order - b.order));
        keptSet = new Set([
          ...lowerBandNodes.map((n) => n.key),
          ...band1BySize.slice(0, band1KeepCount).map((n) => n.key),
        ]);
        if (wantedKey && wantedKey !== `__more__:${c}` && groups.has(wantedKey) && !keptSet.has(wantedKey)) {
          const dropCandidate = band1BySize.slice(0, band1KeepCount).pop();
          if (dropCandidate) keptSet.delete(dropCandidate.key);
          keptSet.add(wantedKey);
        }
      } else {
        const bySize = [...nodeList].sort((a, b) => (b.records.length - a.records.length) || (a.order - b.order));
        keptSet = new Set(bySize.slice(0, keepCount).map((n) => n.key));
        if (wantedKey && wantedKey !== `__more__:${c}` && groups.has(wantedKey) && !keptSet.has(wantedKey)) {
          const dropCandidate = bySize.slice(0, keepCount).pop();
          if (dropCandidate) keptSet.delete(dropCandidate.key);
          keptSet.add(wantedKey);
        }
      }

      const head = nodeList.filter((n) => keptSet.has(n.key));
      const tail = nodeList.filter((n) => !keptSet.has(n.key));
      hiddenNodesCount = tail.length;
      const moreRecords = tail.flatMap((n) => n.records);
      const moreKey = `__more__:${c}`;
      const dominantBand = tail[0]?.band ?? 1;
      const moreNode = {
        key: moreKey,
        label: `+${tail.length} More`,
        tone: 'more',
        band: dominantBand,
        dominantSrcIdx: 999,
        order: 999,
        dropStage: null,
        isMore: true,
        hiddenCount: tail.length,
        hiddenLabels: tail.map((n) => `${n.label} (${n.records.length})`),
        records: moreRecords,
      };
      const tailKeys = new Set(tail.map((n) => n.key));
      for (const r of cohortUpToPrev) {
        if (tailKeys.has(r.rawCells[c].key)) {
          r.cells[c] = { key: moreKey, label: moreNode.label, tone: 'more', band: dominantBand, isMore: true };
        }
      }
      // Insert +N More at the end of its dominant band so ribbons don't cross lower bands
      nodeList = [...head, moreNode].sort(nodeSort);
    }

    const validSelected = wantedKey && nodeList.some((n) => n.key === wantedKey) ? wantedKey : null;
    if (validSelected) activeSelection[c] = validSelected;

    columns.push({
      index: c,
      dimKey,
      label: dimMeta.label,
      headerTitle: c === 0 ? 'STARTING POINT' : `STEP +${c}`,
      total: cohortUpToPrev.length,
      selectedKey: validSelected,
      isExpanded,
      canCollapse: isExpanded && groups.size > maxNodesPerCol,
      hiddenNodesCount,
      nodes: nodeList,
    });

    if (validSelected) {
      const selNode = nodeList.find((n) => n.key === validSelected);
      cohortUpToPrev = selNode ? selNode.records : [];
    }
  }

  // 3. Identify the final matched cohort across ALL active selections.
  const matchedSet = new Set(cohortUpToPrev);
  const hasAnySelection = Object.keys(activeSelection).length > 0;

  const rootTotal = Math.max(1, records.length);
  for (const col of columns) {
    const colTotal = Math.max(1, col.total);
    for (const node of col.nodes) {
      node.count = node.records.length;
      node.prospects = node.records.map((r) => r.p);
      node.matchedCount = node.records.filter((r) => matchedSet.has(r)).length;
      node.shareOfCol = col.total ? node.count / colTotal : 0;
      node.shareOfTotal = records.length ? node.count / rootTotal : 0;
      const sumScore = node.prospects.reduce((s, p) => s + (p.priority_score || priorityScore(p).score || 0), 0);
      node.avgScore = node.count ? Math.round(sumScore / node.count) : 0;
      node.selected = col.selectedKey === node.key;
      node.highlighted = !hasAnySelection || node.matchedCount > 0;
    }
  }

  // 4. Compute Sankey vertical layout for each column.
  const baseFlowHeight = 270;
  const minBarHeight = 6;
  const minSlotHeight = 40;
  const nodeGap = 14;

  for (const col of columns) {
    const x = padLeft + col.index * colStride;
    col.x = x;
    const colScale = col.total > 0 && col.total < rootTotal
      ? Math.max(col.total, Math.sqrt(col.total * rootTotal))
      : rootTotal;
    let cursorY = padTop;
    for (const node of col.nodes) {
      const rawH = records.length ? (node.count / colScale) * baseFlowHeight : minBarHeight;
      node.barHeight = Math.max(minBarHeight, Math.round(rawH));
      node.slotHeight = Math.max(node.barHeight, minSlotHeight);
      node.x = x;
      node.y = cursorY;
      cursorY += node.slotHeight + nodeGap;
    }
    col.contentHeight = Math.max(200, cursorY - nodeGap + padBottom);
  }

  const svgHeight = Math.max(250, ...columns.map((c) => c.contentHeight || 0));
  const svgWidth = padLeft + (steps.length - 1) * colStride + 210;

  // 5. Build links between Column `c` and Column `c + 1` with exact non-overlapping vertical slices.
  const links = [];
  for (let c = 0; c < columns.length - 1; c++) {
    const colA = columns[c];
    const colB = columns[c + 1];
    const nodeMapB = new Map(colB.nodes.map((n) => [n.key, n]));

    const sourceNodes = colA.selectedKey
      ? colA.nodes.filter((n) => n.key === colA.selectedKey)
      : colA.nodes;

    const colLinks = [];
    for (const src of sourceNodes) {
      const byTarget = new Map();
      for (const r of src.records) {
        const tKey = r.cells[c + 1].key;
        if (!nodeMapB.has(tKey)) continue;
        if (!byTarget.has(tKey)) byTarget.set(tKey, []);
        byTarget.get(tKey).push(r);
      }
      const sortedTargets = [...byTarget.entries()]
        .map(([tKey, recs]) => ({ dst: nodeMapB.get(tKey), recs }))
        .sort((a, b) => a.dst.y - b.dst.y);

      for (const { dst, recs } of sortedTargets) {
        const matchedInLink = recs.filter((r) => matchedSet.has(r)).length;
        colLinks.push({
          id: `link-${c}-${src.key}-${dst.key}`,
          col: c,
          sourceKey: src.key,
          targetKey: dst.key,
          sourceLabel: src.label,
          targetLabel: dst.label,
          tone: dst.tone === 'ok' ? 'ok' : dst.tone === 'gold' && src.tone === 'info' ? 'gold' : src.tone,
          count: recs.length,
          matchedCount: matchedInLink,
          highlighted: !hasAnySelection || matchedInLink > 0,
          src,
          dst,
        });
      }
    }

    for (const src of sourceNodes) {
      const outgoing = colLinks.filter((l) => l.src === src);
      let sy = src.y;
      const totalOut = Math.max(1, src.count);
      for (const l of outgoing) {
        const h = (l.count / totalOut) * src.barHeight;
        l.sy0 = sy;
        sy += h;
        l.sy1 = Math.min(src.y + src.barHeight, sy);
      }
    }

    for (const dst of colB.nodes) {
      const incoming = colLinks.filter((l) => l.dst === dst).sort((a, b) => a.src.y - b.src.y);
      let ty = dst.y;
      const totalIn = Math.max(1, dst.count);
      for (const l of incoming) {
        const h = (l.count / totalIn) * dst.barHeight;
        l.ty0 = ty;
        ty += h;
        l.ty1 = Math.min(dst.y + dst.barHeight, ty);
      }
    }

    for (const l of colLinks) {
      const sx = l.src.x + barWidth;
      const tx = l.dst.x;
      const mx = Math.round((sx + tx) / 2);
      const sMax = l.src.y + l.src.barHeight;
      const tMax = l.dst.y + l.dst.barHeight;
      const sy0 = Number(Math.min(sMax - 1.2, l.sy0).toFixed(1));
      const sy1 = Number(Math.min(sMax, Math.max(sy0 + 1.2, l.sy1)).toFixed(1));
      const ty0 = Number(Math.min(tMax - 1.2, l.ty0).toFixed(1));
      const ty1 = Number(Math.min(tMax, Math.max(ty0 + 1.2, l.ty1)).toFixed(1));
      l.d = `M${sx},${sy0} C${mx},${sy0} ${mx},${ty0} ${tx},${ty0} L${tx},${ty1} C${mx},${ty1} ${mx},${sy1} ${sx},${sy1} Z`;
      delete l.src;
      delete l.dst;
      links.push(l);
    }
  }

  for (const col of columns) {
    for (const node of col.nodes) delete node.records;
  }

  const breadcrumbs = Object.keys(activeSelection)
    .map(Number)
    .sort((a, b) => a - b)
    .map((colIdx) => {
      const col = columns[colIdx];
      const node = col?.nodes.find((n) => n.key === activeSelection[colIdx]);
      return node ? { col: colIdx, stepLabel: col.label, key: node.key, label: node.label, count: node.count, tone: node.tone } : null;
    })
    .filter(Boolean);

  return {
    total: prospects.length,
    activeCount: cohortUpToPrev.length,
    steps,
    selectedPath: activeSelection,
    breadcrumbs,
    columns,
    links,
    matchedProspects: cohortUpToPrev.map((r) => r.p),
    svgWidth,
    svgHeight,
    colStride,
    barWidth,
    padLeft,
  };
}
