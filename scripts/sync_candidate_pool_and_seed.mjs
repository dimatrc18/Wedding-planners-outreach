import fs from 'node:fs';

const busPartners = JSON.parse(fs.readFileSync('data/bus_partners.json', 'utf8'));

// Helper: match operator
function findMatch(name, website) {
  const normW = (website || '').toLowerCase().replace(/^https?:\/\/(?:www\.)?/, '').replace(/\/.*$/, '');
  const normN = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const bp of busPartners) {
    const bpW = (bp.website || '').toLowerCase().replace(/^https?:\/\/(?:www\.)?/, '').replace(/\/.*$/, '');
    const bpN = (bp.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (bpW && normW && bpW === normW) return bp;
    if (bpN && normN && (bpN.includes(normN) || normN.includes(bpN))) return bp;
  }
  return null;
}

// 1. Update app/bus_partners_data.js
const seedPath = 'app/bus_partners_data.js';
let seedContent = fs.readFileSync(seedPath, 'utf8');

const { INITIAL_BUS_PARTNERS } = await import('../app/bus_partners_data.js');
const updatedSeed = INITIAL_BUS_PARTNERS.map((partner) => {
  const match = findMatch(partner.name, partner.website);
  if (!match) return partner;
  return {
    ...partner,
    fleet_categories: match.fleet_categories || partner.fleet_categories,
    fleet_segment: match.fleet_segment || match.score_breakdown?.partner_card?.fleet_segment || partner.fleet_segment,
    bus_models: match.bus_models || match.score_breakdown?.partner_card?.bus_models || partner.bus_models,
    pax_capacity: match.pax_capacity || match.score_breakdown?.partner_card?.pax_capacity || partner.pax_capacity,
    score_breakdown: {
      ...partner.score_breakdown,
      partner_card: {
        ...(partner.score_breakdown?.partner_card || {}),
        bus_models: match.bus_models || match.score_breakdown?.partner_card?.bus_models || partner.bus_models,
        pax_capacity: match.pax_capacity || match.score_breakdown?.partner_card?.pax_capacity || partner.pax_capacity,
        fleet_segment: match.fleet_segment || match.score_breakdown?.partner_card?.fleet_segment || partner.fleet_segment,
      }
    }
  };
});

const seedPrefix = seedContent.slice(0, seedContent.indexOf('export const INITIAL_BUS_PARTNERS = ['));
const seedSuffix = seedContent.slice(seedContent.indexOf('export function mergeNotes('));
const newSeedCode = `${seedPrefix}export const INITIAL_BUS_PARTNERS = ${JSON.stringify(updatedSeed, null, 2)};\n\n${seedSuffix}`;
fs.writeFileSync(seedPath, newSeedCode, 'utf8');
console.log('✓ app/bus_partners_data.js updated with verified ground truth fleet');

// 2. Update SCOUT_CANDIDATE_POOL in app/views/bus_partners.js
const bpViewPath = 'app/views/bus_partners.js';
let bpViewContent = fs.readFileSync(bpViewPath, 'utf8');

const { SCOUT_CANDIDATE_POOL } = await import('../app/views/bus_partners.js');
const updatedPool = SCOUT_CANDIDATE_POOL.map((candidate) => {
  const match = findMatch(candidate.name, candidate.website);
  if (!match) return candidate;
  return {
    ...candidate,
    fleet_categories: match.fleet_categories || candidate.fleet_categories,
    fleet_segment: match.fleet_segment || match.score_breakdown?.partner_card?.fleet_segment || candidate.fleet_segment,
    bus_models: match.bus_models || match.score_breakdown?.partner_card?.bus_models || candidate.bus_models,
    pax_capacity: match.pax_capacity || match.score_breakdown?.partner_card?.pax_capacity || candidate.pax_capacity,
  };
});

const poolMarkerStart = 'export const SCOUT_CANDIDATE_POOL = [';
const poolStartIndex = bpViewContent.indexOf(poolMarkerStart);
const poolMarkerEnd = '  }];';
const poolEndIndex = bpViewContent.indexOf(poolMarkerEnd, poolStartIndex);

if (poolStartIndex !== -1 && poolEndIndex !== -1) {
  const beforePool = bpViewContent.slice(0, poolStartIndex);
  const afterPool = bpViewContent.slice(poolEndIndex + poolMarkerEnd.length);
  const newPoolCode = `${beforePool}export const SCOUT_CANDIDATE_POOL = ${JSON.stringify(updatedPool, null, 2)};${afterPool}`;
  fs.writeFileSync(bpViewPath, newPoolCode, 'utf8');
  console.log('✓ SCOUT_CANDIDATE_POOL in app/views/bus_partners.js updated with verified ground truth fleet');
} else {
  console.error('Could not locate pool markers in app/views/bus_partners.js');
}
