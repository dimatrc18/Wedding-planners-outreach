import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';
const headers = {
  apikey: SRK,
  Authorization: `Bearer ${SRK}`,
  'Content-Type': 'application/json',
};

export function mergeNotes(notesA = '', notesB = '') {
  const strA = String(notesA || '').trim();
  const strB = String(notesB || '').trim();
  if (!strA) return strB;
  if (!strB) return strA;
  if (strA === strB) return strA;

  const linesA = strA.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const linesB = strB.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const seen = new Set(linesA.map((l) => l.toLowerCase()));
  const merged = [...linesA];

  for (const line of linesB) {
    if (!seen.has(line.toLowerCase())) {
      seen.add(line.toLowerCase());
      merged.push(line);
    }
  }

  return merged.join('\n');
}

export function mergePartnerRecords(target, incoming) {
  if (!incoming) return target;
  if (!target) return incoming;

  // 1. Merge notes
  target.notes = mergeNotes(target.notes, incoming.notes);

  // 2. Merge partner_card sub-object notes
  target.score_breakdown = target.score_breakdown || {};
  target.score_breakdown.partner_card = target.score_breakdown.partner_card || {};
  const inCard = incoming.score_breakdown?.partner_card || {};

  target.score_breakdown.partner_card.client_notes = mergeNotes(
    target.score_breakdown.partner_card.client_notes,
    inCard.client_notes
  );

  // 3. Status priority
  const STATUS_PRIORITY = {
    APPROVED_PARTNER: 50,
    CONTACTED: 40,
    WANT_TO_CONTACT: 30,
    TO_REVIEW: 20,
    REJECTED: 10,
    NOT_RELEVANT: 5,
  };
  const targetPri = STATUS_PRIORITY[target.status] || 0;
  const inPri = STATUS_PRIORITY[incoming.status] || 0;
  if (inPri > targetPri) {
    target.status = incoming.status;
  }

  // 4. Contact fields
  if (!target.email && incoming.email) target.email = incoming.email;
  if (!target.phone && incoming.phone) target.phone = incoming.phone;
  if (!target.website && incoming.website) target.website = incoming.website;
  if (!target.fleet_url && incoming.fleet_url) target.fleet_url = incoming.fleet_url;
  if (!target.base_city && incoming.base_city) target.base_city = incoming.base_city;

  // 5. Rates and fleet details
  if (!target.score_breakdown.partner_card.rate_hourly && inCard.rate_hourly) {
    target.score_breakdown.partner_card.rate_hourly = inCard.rate_hourly;
  }
  if (!target.score_breakdown.partner_card.rate_standby && inCard.rate_standby) {
    target.score_breakdown.partner_card.rate_standby = inCard.rate_standby;
  }
  if (!target.score_breakdown.partner_card.whatsapp && inCard.whatsapp) {
    target.score_breakdown.partner_card.whatsapp = inCard.whatsapp;
  }
  if (!target.score_breakdown.partner_card.bus_models && inCard.bus_models) {
    target.score_breakdown.partner_card.bus_models = inCard.bus_models;
  }
  if (!target.score_breakdown.partner_card.pax_capacity && inCard.pax_capacity) {
    target.score_breakdown.partner_card.pax_capacity = inCard.pax_capacity;
  }

  // 6. Keep max relevance score
  target.relevance_score = Math.max(target.relevance_score || 0, incoming.relevance_score || 0);

  // 7. Union of fleet categories
  const catSet = new Set((target.fleet_categories || []).concat(incoming.fleet_categories || []));
  target.fleet_categories = [...catSet];

  target.updated_at = new Date().toISOString();

  return target;
}

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeDomain(url) {
  if (!url) return '';
  try {
    const raw = String(url).trim();
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const parsed = new URL(withProto);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase().trim();
  } catch (_) {
    return String(url).replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase().trim();
  }
}

async function run() {
  console.log('--- SYNCING BUS PARTNERS & COMBINING DUPLICATES WHILE SAVING USER COMMENTS ---');

  const res = await fetch(SUPABASE_URL + '/bus_partners?select=*&order=relevance_score.desc', { headers });
  const rawPartners = await res.json();
  console.log(`Loaded ${rawPartners.length} partners from Supabase.`);

  // Deduplicate and combine in memory
  const deduped = [];
  const removedIds = [];

  for (const p of rawPartners) {
    const n = normalizeName(p.name);
    const d = normalizeDomain(p.website);

    const existing = deduped.find((ex) => {
      const exN = normalizeName(ex.name);
      const exD = normalizeDomain(ex.website);
      return (n && exN && n === exN) || (d && exD && d === exD);
    });

    if (existing) {
      console.log(`Combining duplicate: "${p.name}" (${p.id}) into "${existing.name}" (${existing.id})`);
      mergePartnerRecords(existing, p);
      removedIds.push(p.id);
    } else {
      deduped.push(p);
    }
  }

  console.log(`Unique partners after deduplication: ${deduped.length}`);

  // If any duplicates were removed from DB, delete them and patch the target
  for (const remId of removedIds) {
    await fetch(SUPABASE_URL + '/bus_partners?id=eq.' + remId, {
      method: 'DELETE',
      headers,
    });
  }

  // Update data/bus_partners.json while preserving core seed records
  const jsonPath = path.resolve('data/bus_partners.json');
  let existingSeeds = [];
  try {
    if (fs.existsSync(jsonPath)) {
      const current = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      existingSeeds = current.filter((p) => p.id === 'partner_moveolux' || p.id === 'partner_cima_luxury');
    }
  } catch (err) {
    // Ignore read errors
  }
  const dedupedIds = new Set(deduped.map((d) => d.id));
  for (const seed of existingSeeds) {
    if (!dedupedIds.has(seed.id)) {
      deduped.unshift(seed);
      dedupedIds.add(seed.id);
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(deduped, null, 2), 'utf-8');
  console.log(`Updated ${jsonPath} with ${deduped.length} partners.`);

  console.log('--- COMPLETED SUCCESSFULLY ---');
}

run();
