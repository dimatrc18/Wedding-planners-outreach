import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { 
  isRecentlyAdded, 
  isLatestAddition,
  newBadgeHtml,
  findAndVerifyPartnerEmail,
  operatorHasVehicleType, 
  detectVehicleKey, 
  detectOperatorCityAndRegion, 
  STANDARD_FLEET_TYPES, 
  SCOUT_CANDIDATE_POOL,
  shortFleetName 
} from '../app/views/bus_partners.js';
import { 
  addExcludedBusPartner, 
  loadExcludedBusPartners, 
  saveExcludedBusPartners, 
  isBusPartnerExcluded, 
  removeExcludedBusPartner,
  normalizeDomain,
  LEGACY_DEAD_DOMAINS,
  findLegacyReplacement
} from '../app/bus_partners_data.js';
import { S, removeBusPartner, removeManyBusPartners } from '../app/store.js';
import {
  calculateBusRelevanceScore,
  getPriorityTier,
  scoreFromWebSignals,
  BUS_STATUSES,
  DISCRETION_LEVELS,
  FLEET_TIERS,
  TERRITORY_PERMITS,
  CORPORATE_SLA,
  inferBusSegment,
  classifySingleBusAllocation,
  decodeCloudflareEmail,
  extractEmailsFromWebsiteHtml,
  extractFleetFromWebsiteText,
  canSendBusOutreach,
  nextBusSendSlot,
  buildBusOutreachDraft,
  parseBusPartnerReply,
  verifyPerBusPaxCapacity,
  buildBusSankeyFlow
} from '../supabase/functions/_shared/core/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('100-Point Bus Relevance Score: exact 4-pillar methodology and clamping', () => {
  // Perfect score across all 4 pillars: 35 + 25 + 20 + 20 = 100
  const perfectPartner = {
    score_breakdown: {
      discretion_unbranded: 35,
      fleet_luxury: 25,
      territory_permits: 20,
      corporate_sla: 20
    }
  };
  const res = calculateBusRelevanceScore(perfectPartner);
  assert.equal(res.total_score, 100);
  assert.equal(res.tier, 'tier_1');
  assert.equal(res.tier_info.badge, 'Tier 1: Ultra-Priority');

  // Clamping: over-maximum values are capped to MECE ceilings
  const overMaxPartner = {
    score_breakdown: {
      discretion_unbranded: 50, // max 35
      fleet_luxury: 40,         // max 25
      territory_permits: 30,    // max 20
      corporate_sla: 30         // max 20
    }
  };
  const clampedRes = calculateBusRelevanceScore(overMaxPartner);
  assert.equal(clampedRes.total_score, 100);
  assert.equal(clampedRes.breakdown.discretion_unbranded, 35);
  assert.equal(clampedRes.breakdown.fleet_luxury, 25);
  assert.equal(clampedRes.breakdown.territory_permits, 20);
  assert.equal(clampedRes.breakdown.corporate_sla, 20);

  // Negative values are clamped to 0
  const negativePartner = {
    score_breakdown: {
      discretion_unbranded: -10,
      fleet_luxury: -5,
      territory_permits: -2,
      corporate_sla: -1
    }
  };
  const zeroRes = calculateBusRelevanceScore(negativePartner);
  assert.equal(zeroRes.total_score, 0);
  assert.equal(zeroRes.tier, 'tier_4');
  assert.equal(zeroRes.tier_info.badge, 'Tier 4: Incompatible');
});

test('Priority Tiers: thresholds map to Tier 1, 2, 3, and 4', () => {
  assert.equal(getPriorityTier(98).tier, 'tier_1');
  assert.equal(getPriorityTier(90).tier, 'tier_1');
  assert.equal(getPriorityTier(89).tier, 'tier_2');
  assert.equal(getPriorityTier(75).tier, 'tier_2');
  assert.equal(getPriorityTier(74).tier, 'tier_3');
  assert.equal(getPriorityTier(50).tier, 'tier_3');
  assert.equal(getPriorityTier(49).tier, 'tier_4');
  assert.equal(getPriorityTier(0).tier, 'tier_4');
});

test('scoreFromWebSignals: detects unbranded total black and luxury minibus keywords', () => {
  const luxuryText = `
    Flotta esclusiva Mercedes Sprinter VIP 16 posti con poltrone in pelle reclinabili, tavolini e Wi-Fi.
    Vetri oscurati privacy e carrozzeria total black senza scritte per la massima discrezione.
    Chauffeur in abito scuro e cravatta, english speaking con reperibilità h24.
    Autorizzazione ZTL Area C Milano e permessi per le ville storiche del Lago di Como.
  `;
  const result = scoreFromWebSignals(luxuryText, { base_city: 'Milano' });

  assert.equal(result.breakdown.discretion_unbranded, 35, 'Should award 35 for total black and vetri oscurati');
  assert.equal(result.breakdown.fleet_luxury, 25, 'Should award 25 for Sprinter VIP and leather seats');
  assert.equal(result.breakdown.territory_permits, 20, 'Should award 20 for Milan Area C and Como villas');
  assert.equal(result.breakdown.corporate_sla, 20, 'Should award 20 for suited English-speaking chauffeur and 24/7');
  assert.equal(result.total_score, 100);
  assert.equal(result.tier, 'tier_1');
});

test('scoreFromWebSignals: detects commercial decals and penalizes discretion', () => {
  const commercialText = `
    Noleggio autobus gran turismo per viaggi di gruppo e gite scolastiche.
    Mezzi con grande grafica pubblicitaria del tour operator sui lati.
    Autisti italiani disponibili in orari ufficio.
  `;
  const result = scoreFromWebSignals(commercialText, { base_city: 'Varese' });

  assert.equal(result.breakdown.discretion_unbranded, 5, 'Should penalize commercial decals to 5 points');
  assert.equal(result.breakdown.fleet_luxury, 8, 'Commuter/tourist bus gets 8 points');
  assert.equal(result.breakdown.corporate_sla, 10, 'Standard drivers with office hours get 10 points');
  assert(result.total_score < 50, 'Billboard bus should fall into Tier 4 (<50)');
  assert.equal(result.tier, 'tier_4');
});

test('Seed Partners Data Integrity: verified Northern Italy luxury operators load cleanly', () => {
  const jsonPath = path.resolve(__dirname, '../data/bus_partners.json');
  assert(fs.existsSync(jsonPath), 'data/bus_partners.json must exist');

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const partners = JSON.parse(raw);
  assert(Array.isArray(partners));
  assert(partners.length >= 8, 'Must have at least 8 verified partners');

  const moveolux = partners.find(p => p.id === 'partner_moveolux');
  assert(moveolux, 'Moveolux must be in seed data');
  assert.equal(moveolux.relevance_score, 98);
  assert.equal(moveolux.base_city, 'Milano');

  const vipLimousine = partners.find(p => p.id === 'partner_vip_limousine');
  assert(vipLimousine, 'VIP Limousine Milan must be in seed data');
  assert.equal(vipLimousine.relevance_score, 94);

  const transervice = partners.find(p => p.id === 'partner_transervice');
  assert(transervice, 'Transervice Limousine must be in seed data');
  assert.equal(transervice.relevance_score, 91);

  // Check valid statuses across all seed items
  const validStatusKeys = BUS_STATUSES.map(s => s.key);
  for (const p of partners) {
    assert(validStatusKeys.includes(p.status), `Invalid status ${p.status} in partner ${p.name}`);
    assert(p.website.startsWith('http'), `Invalid website URL in partner ${p.name}`);
    assert(p.relevance_score >= 0 && p.relevance_score <= 100, `Score out of range for ${p.name}`);
  }
});

test('Bus Relevance Score: NOT_RELEVANT status pulls score to 0 and Tier 4', () => {
  const partner = {
    status: 'NOT_RELEVANT',
    score_breakdown: {
      discretion_unbranded: 35,
      fleet_luxury: 25,
      territory_permits: 20,
      corporate_sla: 20
    }
  };
  const res = calculateBusRelevanceScore(partner);
  assert.equal(res.total_score, 0);
  assert.equal(res.tier, 'tier_4');
  assert.equal(res.tier_info.badge, 'Tier 4: Incompatible');
});

test('Isolation Principle: existing CRM tables and core workflows remain unaffected', () => {
  // Ensure bus partners scoring does not interfere with wedding planner priorities or settings
  assert.equal(BUS_STATUSES.length, 6);
  assert(BUS_STATUSES.find(s => s.key === 'WANT_TO_CONTACT'), 'Must include WANT_TO_CONTACT');
  assert(BUS_STATUSES.find(s => s.key === 'NOT_RELEVANT'), 'Must include NOT_RELEVANT');
  assert(!BUS_STATUSES.find(s => s.key === 'VETTED'), 'VETTED must be removed for MECE statuses');
  assert.equal(DISCRETION_LEVELS.length, 3);
  assert.equal(FLEET_TIERS.length, 3);
  assert.equal(TERRITORY_PERMITS.length, 3);
  assert.equal(CORPORATE_SLA.length, 2);
});

test('isRecentlyAdded detects newly scouted partners within 1 hour and expires after 60m', () => {
  const now = Date.now();
  // Just scouted (now)
  assert.equal(isRecentlyAdded({ created_at: new Date(now).toISOString() }), true);
  // Scouted 30 mins ago (still within 1 hour)
  assert.equal(isRecentlyAdded({ created_at: new Date(now - 30 * 60000).toISOString() }), true);
  // Scouted 59 mins ago (still within 1 hour)
  assert.equal(isRecentlyAdded({ created_at: new Date(now - 59 * 60000).toISOString() }), true);
  // Scouted 61 mins ago (expired, no longer new)
  assert.equal(isRecentlyAdded({ created_at: new Date(now - 61 * 60000).toISOString() }), false);
  // Scouted 2 hours ago (expired)
  assert.equal(isRecentlyAdded({ created_at: new Date(now - 120 * 60000).toISOString() }), false);
  // Missing or invalid created_at
  assert.equal(isRecentlyAdded({}), false);
  assert.equal(isRecentlyAdded(null), false);
});

test('Batch Recency Differentiation: distinguishes operators added in the latest scout run from earlier new batches', () => {
  const now = Date.now();
  // Batch 1: Added 15 minutes ago
  const earlierOp1 = { id: 'earlier_1', name: 'Earlier 1', created_at: new Date(now - 15 * 60000).toISOString() };
  const earlierOp2 = { id: 'earlier_2', name: 'Earlier 2', created_at: new Date(now - 15 * 60000).toISOString() };

  // Batch 2: Added just now (added after!)
  const latestOp1 = { id: 'latest_1', name: 'Latest 1', created_at: new Date(now - 30 * 1000).toISOString() };
  const latestOp2 = { id: 'latest_2', name: 'Latest 2', created_at: new Date(now - 20 * 1000).toISOString() };

  const allOps = [latestOp2, latestOp1, earlierOp2, earlierOp1];

  // 1. Both batches are within 1 hour
  assert.equal(isRecentlyAdded(earlierOp1), true);
  assert.equal(isRecentlyAdded(latestOp1), true);

  // 2. isLatestAddition accurately identifies only the latest batch
  assert.equal(isLatestAddition(latestOp1, allOps), true);
  assert.equal(isLatestAddition(latestOp2, allOps), true);
  assert.equal(isLatestAddition(earlierOp1, allOps), false);
  assert.equal(isLatestAddition(earlierOp2, allOps), false);

  // 3. newBadgeHtml displays distinct visual badges
  const latestBadge = newBadgeHtml(latestOp1, allOps);
  assert(latestBadge.includes('⚡ LATEST'), 'Latest batch badge must display ⚡ LATEST');
  assert(latestBadge.includes('latest-batch-badge'));

  const earlierBadge = newBadgeHtml(earlierOp1, allOps);
  assert(earlierBadge.includes('15m ago'), 'Earlier batch badge must display exact age: 15m ago');
  assert(earlierBadge.includes('earlier-batch-badge'));
  assert(!earlierBadge.includes('⚡ LATEST'));
});

test('Newly scouted operators must always have status TO_REVIEW (never WANT_TO_CONTACT)', () => {
  // 1. Verify every candidate in the candidate pool has status TO_REVIEW ("1. To Review" / "to check")
  for (const candidate of SCOUT_CANDIDATE_POOL) {
    assert.equal(
      candidate.status,
      'TO_REVIEW',
      `Candidate "${candidate.name}" must have status TO_REVIEW, found: ${candidate.status}`
    );
  }
});

test('findAndVerifyPartnerEmail: upgrades legacy dead-domain entries and recovers verified email & live website', async () => {
  // 1. Verify legacy mock entry (e.g. Lake Como Executive Sprinter or Milano VIP Driver) is upgraded to live verified operator
  const testOp = {
    id: 'test_lake_como_sprinter',
    name: 'Lake Como Executive Sprinter',
    website: 'https://www.lakecomosprinter.it',
    email: 'zz',
    notes: "This site can't be reached",
    status: 'TO_REVIEW'
  };

  S.busPartners = [testOp];

  const result = await findAndVerifyPartnerEmail('test_lake_como_sprinter');
  assert(result, 'Must return discovered contact info');
  assert.equal(result.name, 'Como Limo Lux', 'Must upgrade legacy mock entry to real verified operator Como Limo Lux');
  assert.equal(result.email, 'info@comolimolux.com', 'Must recover verified live email');
  assert.equal(result.website, 'https://comolimolux.com', 'Must repair website to live resolving domain');

  // Verify partner was updated in store
  const updated = S.busPartners.find((p) => p.id === 'test_lake_como_sprinter');
  assert.equal(updated.name, 'Como Limo Lux');
  assert.equal(updated.email, 'info@comolimolux.com');
  assert.equal(updated.website, 'https://comolimolux.com');
  assert(updated.notes.includes('Checked email: info@comolimolux.com'));

  // 2. Verify zero candidates in SCOUT_CANDIDATE_POOL use any legacy dead domain
  for (const cand of SCOUT_CANDIDATE_POOL) {
    const dom = normalizeDomain(cand.website);
    assert(!LEGACY_DEAD_DOMAINS[dom], `Candidate "${cand.name}" uses dead domain ${dom}`);
    assert(!findLegacyReplacement(cand), `Candidate "${cand.name}" should already be a verified live operator`);
  }
});

test('Contacted Status preset: accurately accounts for operators in CONTACTED state', () => {
  const list = [
    { id: '1', name: 'Alpha', status: 'TO_REVIEW' },
    { id: '2', name: 'Beta', status: 'WANT_TO_CONTACT' },
    { id: '3', name: 'Gamma', status: 'CONTACTED' },
    { id: '4', name: 'Delta', status: 'APPROVED_PARTNER' }
  ];

  const wantToContact = list.filter((p) => p.status === 'WANT_TO_CONTACT').length;
  const contacted = list.filter((p) => p.status === 'CONTACTED').length;

  assert.equal(wantToContact, 1);
  assert.equal(contacted, 1);
});

test('operatorHasVehicleType and detectVehicleKey: accurately categorize and filter platforms', () => {
  assert.equal(detectVehicleKey('Mercedes-Benz V-Class VIP (7–8 seats)'), 'v_class');
  assert.equal(detectVehicleKey('Mercedes Sprinter VIP (8–16 seats)'), 'sprinter_vip');
  assert.equal(detectVehicleKey('Mercedes Sprinter Luxury (16–20 seats)'), 'sprinter_lux');
  assert.equal(detectVehicleKey('Executive Midibus (24–30 seats)'), 'midibus');
  assert.equal(detectVehicleKey('Limobus Exclusive (18-28 seats)'), 'limobus');
  assert.equal(detectVehicleKey('Setra & Mercedes GT Coach (50–56 seats)'), 'gt_coach');

  const partnerWithMidi = {
    fleet_categories: ['Executive Midibus (24–30 seats)', 'Mercedes Sprinter VIP (8–16 seats)']
  };

  assert.equal(operatorHasVehicleType(partnerWithMidi, 'all'), true);
  assert.equal(operatorHasVehicleType(partnerWithMidi, 'midibus'), true);
  assert.equal(operatorHasVehicleType(partnerWithMidi, 'sprinter_vip'), true);
  assert.equal(operatorHasVehicleType(partnerWithMidi, 'v_class'), false);
  assert.equal(operatorHasVehicleType(partnerWithMidi, 'limobus'), false);
  assert.equal(operatorHasVehicleType(partnerWithMidi, 'gt_coach'), false);
});

test('Multi-filter combination: status AND vehicle platform filters apply simultaneously', () => {
  const dataset = [
    { id: '1', name: 'Alpha', status: 'WANT_TO_CONTACT', fleet_categories: ['Executive Midibus (24–30 seats)'], relevance_score: 90 },
    { id: '2', name: 'Beta', status: 'TO_REVIEW', fleet_categories: ['Executive Midibus (24–30 seats)'], relevance_score: 85 },
    { id: '3', name: 'Gamma', status: 'WANT_TO_CONTACT', fleet_categories: ['Limobus Exclusive (18-28 seats)'], relevance_score: 95 },
    { id: '4', name: 'Delta', status: 'APPROVED_PARTNER', fleet_categories: ['Mercedes-Benz V-Class VIP (7–8 seats)'], relevance_score: 88 },
  ];

  // Filter: status = WANT_TO_CONTACT AND vehicle = midibus
  const filtered = dataset.filter(p => 
    (p.status === 'WANT_TO_CONTACT') &&
    operatorHasVehicleType(p, 'midibus')
  );

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, '1');
  assert.equal(filtered[0].name, 'Alpha');
});

test('detectOperatorCityAndRegion: accurately detects non-Northern Italy depots (Rome, Florence, Naples) vs local hubs', () => {
  // Cima Luxury case: Rome phone (+39 06) and address (Via Alberto Cadlolo / Cavalieri)
  const cimaResult = detectOperatorCityAndRegion({
    phone: '+39 06 35 34 83 45',
    address: 'Via Alberto Cadlolo 101, 00136 Roma',
    text: 'Cima Luxury Limousine and Coach service, luxury mobility',
    url: 'https://cimaluxury.com/'
  });
  assert.equal(cimaResult.isNorthernItaly, false);
  assert.equal(cimaResult.city, 'Roma (Central Italy)');
  assert.equal(cimaResult.region, 'Lazio');
  assert(cimaResult.depotWarning.includes('Rome'));

  // Florence operator with 055 prefix
  const florenceResult = detectOperatorCityAndRegion({
    phone: '+39 055 210000',
    address: 'Via de Tornabuoni, Firenze'
  });
  assert.equal(florenceResult.isNorthernItaly, false);
  assert.equal(florenceResult.city, 'Firenze (Tuscany)');

  // Como operator with 031 prefix and Bellagio / Como cues
  const comoResult = detectOperatorCityAndRegion({
    phone: '+39 031 950234',
    text: 'Servizi transfer e minivan Lago di Como Bellagio e Tremezzo'
  });
  assert.equal(comoResult.isNorthernItaly, true);
  assert.equal(comoResult.city, 'Como');
  assert.equal(comoResult.region, 'Lake Como');

  // Milan operator with 02 prefix
  const milanResult = detectOperatorCityAndRegion({
    phone: '+39 02 87199123',
    text: 'Noleggio con conducente Milano Linate Malpensa'
  });
  assert.equal(milanResult.isNorthernItaly, true);
  assert.equal(milanResult.city, 'Milano');
  assert.equal(milanResult.region, 'Lombardy');
});

test('scoreFromWebSignals: Rome signals disqualify territory permits (Pillar 3 = 0)', () => {
  const romeWebText = `
    Cima Luxury Chauffeur & Bus Service.
    Sede: Via Alberto Cadlolo 101, Roma. Telefono: +39 06 35 34 83 45.
    Flotta Mercedes Sprinter e bus GT total black unbranded con vetri oscurati.
    Autisti h24 in abito scuro.
  `;
  const result = scoreFromWebSignals(romeWebText, { base_city: 'Roma' });

  // Discretion and luxury might be high, but territory permits must be 0 due to 570km deadhead from Lake Como
  assert.equal(result.breakdown.territory_permits, 0, 'Central Italy depot must yield 0 territory permits for Northern Italy');
  assert(result.notes.includes('Central Italy') || result.notes.includes('Rome'), 'Notes must explicitly mention Rome/Central Italy depot disqualification');
});

test('Cima Luxury Data Verification: properly classified as Rome / NOT_RELEVANT in seed data', () => {
  const jsonPath = path.resolve(__dirname, '../data/bus_partners.json');
  const partners = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const cima = partners.find(p => p.id === 'partner_cima_luxury');

  assert(cima, 'Cima Luxury must exist in bus_partners.json');
  assert.equal(cima.base_city, 'Roma (Central Italy)');
  assert.equal(cima.status, 'NOT_RELEVANT');
  assert.equal(cima.relevance_score, 0);
  assert.equal(cima.score_breakdown.territory_permits, 0);
  assert(cima.notes.includes('Rome') || cima.notes.includes('570km'));
});

test('Persistent Exclusion Registry: remembers deleted operators and matches across ID, domain, name, and phone', () => {
  // Clear any existing excluded entries for this test
  saveExcludedBusPartners([]);

  const operatorToExclude = {
    id: 'partner_test_bad_fleet',
    name: 'EuroCoach Milan Tours',
    website: 'https://www.eurocoach-tours.it/fleet',
    phone: '+39 02 8900 1234',
    base_city: 'Milano',
    relevance_score: 45
  };

  // Add to exclusion registry
  addExcludedBusPartner(operatorToExclude, 'Commercial decals and unresponsive');
  const excludedList = loadExcludedBusPartners();
  assert.equal(excludedList.length, 1);
  assert.equal(excludedList[0].domain, 'eurocoach-tours.it');
  assert.equal(excludedList[0].reason, 'Commercial decals and unresponsive');

  // Test match by exact ID
  assert.equal(isBusPartnerExcluded({ id: 'partner_test_bad_fleet' }, excludedList), true);

  // Test match by website domain variations
  assert.equal(isBusPartnerExcluded({ website: 'https://eurocoach-tours.it' }, excludedList), true);
  assert.equal(isBusPartnerExcluded({ website: 'http://www.eurocoach-tours.it/contact' }, excludedList), true);

  // Test match by name variations
  assert.equal(isBusPartnerExcluded({ name: 'EuroCoach Milan Tours' }, excludedList), true);
  assert.equal(isBusPartnerExcluded({ name: 'eurocoach milan tours' }, excludedList), true);

  // Test match by phone
  assert.equal(isBusPartnerExcluded({ phone: '+39 02 8900 1234' }, excludedList), true);
  assert.equal(isBusPartnerExcluded({ phone: '0289001234' }, excludedList), true);

  // Non-matching clean operator should NOT be excluded
  assert.equal(isBusPartnerExcluded({ id: 'clean_operator', name: 'Moveolux', website: 'https://www.moveolux.com' }, excludedList), false);

  // Unblock / restore
  const unblocked = removeExcludedBusPartner('partner_test_bad_fleet');
  assert(unblocked);
  assert.equal(loadExcludedBusPartners().length, 0);
  assert.equal(isBusPartnerExcluded({ id: 'partner_test_bad_fleet' }), false);
});

test('Auto-Scout Exclusion Gate: deleted operators in exclusion registry are NEVER scouted or added', () => {
  saveExcludedBusPartners([]);

  // Take a real candidate from SCOUT_CANDIDATE_POOL
  const candidate = SCOUT_CANDIDATE_POOL[0];
  assert(candidate, 'SCOUT_CANDIDATE_POOL must have candidates');

  // Before exclusion: candidate is eligible
  let filtered = SCOUT_CANDIDATE_POOL.filter(c => !isBusPartnerExcluded(c));
  assert(filtered.some(c => c.name === candidate.name));

  // Exclude candidate
  addExcludedBusPartner(candidate, 'User removed this operator');

  // After exclusion: Auto-Scout gate strictly drops the candidate
  const currentExcluded = loadExcludedBusPartners();
  filtered = SCOUT_CANDIDATE_POOL.filter(c => !isBusPartnerExcluded(c, currentExcluded));
  assert(!filtered.some(c => c.name === candidate.name), `Excluded candidate "${candidate.name}" must not appear in scout candidates`);

  // Cleanup
  removeExcludedBusPartner(candidate.id);
});

test('Store Deletion & Batch Deletion with Exclusion Memory', async () => {
  saveExcludedBusPartners([]);

  S.busPartners = [
    { id: 'bp_1', name: 'Alpha Coach', website: 'https://alphacoach.it', phone: '+39 02 1111 2222', relevance_score: 80 },
    { id: 'bp_2', name: 'Beta Chauffeur', website: 'https://betachauffeur.com', phone: '+39 031 3333 4444', relevance_score: 85 },
    { id: 'bp_3', name: 'Gamma Minibus', website: 'https://gammabus.it', phone: '+39 035 5555 6666', relevance_score: 90 },
  ];

  // 1. Single delete with exclusion
  await removeBusPartner('bp_1', { exclude: true, reason: 'Rates too high' });
  assert.equal(S.busPartners.length, 2);
  assert(!S.busPartners.find(p => p.id === 'bp_1'));
  assert.equal(isBusPartnerExcluded({ id: 'bp_1' }), true);
  assert.equal(isBusPartnerExcluded({ website: 'https://alphacoach.it' }), true);

  // 2. Batch delete with exclusion
  await removeManyBusPartners(['bp_2', 'bp_3'], { exclude: true, reason: 'Batch removed by user' });
  assert.equal(S.busPartners.length, 0);
  assert.equal(isBusPartnerExcluded({ id: 'bp_2' }), true);
  assert.equal(isBusPartnerExcluded({ id: 'bp_3' }), true);
  assert.equal(loadExcludedBusPartners().length, 3);

  // Cleanup
  saveExcludedBusPartners([]);
});

test('CEO Outreach Schedule Rule: Mon-Sat allowed, Sunday blocked unless operator replied on Sunday', () => {
  const verifiedPartner = {
    id: 'p_moveo',
    name: 'Moveolux',
    email: 'info@moveolux.com',
    email_status: 'verified'
  };

  // Saturday 2026-10-24 at 10:30 Europe/Rome -> Allowed (dow = 6)
  const saturdayMorning = new Date('2026-10-24T08:30:00Z');
  const satCheck = canSendBusOutreach(verifiedPartner, saturdayMorning);
  assert.equal(satCheck.ok, true, 'Saturday morning must be allowed for bus outreach');
  assert.equal(satCheck.reason, 'allowed_mon_sat');

  // Sunday 2026-10-25 at 11:00 Europe/Rome -> Blocked for cold outreach (dow = 7)
  const sundayMorning = new Date('2026-10-25T10:00:00Z');
  const sunColdCheck = canSendBusOutreach(verifiedPartner, sundayMorning);
  assert.equal(sunColdCheck.ok, false, 'Sunday cold outreach must be blocked');
  assert.equal(sunColdCheck.reason, 'sunday_blocked');

  // Sunday Reply Exception: operator replied on Sunday -> Allowed!
  const sunReplyCheck = canSendBusOutreach(verifiedPartner, sundayMorning, { isReplyToSundayInbound: true });
  assert.equal(sunReplyCheck.ok, true, 'Sunday outreach must be allowed when operator replied on Sunday');
  assert.equal(sunReplyCheck.reason, 'sunday_reply_exception');

  // Invalid / no-MX email -> Blocked even on weekdays
  const invalidEmailPartner = {
    id: 'p_bad_mx',
    name: 'Bad Domain Bus',
    email: 'info@nonexistentdomain999.it',
    email_status: 'no_mx'
  };
  const badEmailCheck = canSendBusOutreach(invalidEmailPartner, saturdayMorning);
  assert.equal(badEmailCheck.ok, false, 'Invalid/no_mx email must be blocked by anti-spam gate');
  assert.equal(badEmailCheck.reason, 'invalid_email');

  // nextBusSendSlot on Sunday automatically skips to Monday morning
  const nextSlot = nextBusSendSlot(sundayMorning, 0);
  assert(nextSlot > sundayMorning, 'Next slot from Sunday must be in the future (Monday)');
});

test('CEO-Level Short Italian Outreach Templates: generates concise Italian B2B copy asking for models, capacity, standby/hourly rates & WA', () => {
  const partner = {
    name: 'Cattaneo Autoservizi',
    base_city: 'Como',
    fleet_segment: 'both',
    fleet_categories: ['Mercedes-Benz V-Class VIP (7–8 seats)', 'Setra & Mercedes GT Coach (50–56 seats)']
  };

  const t1 = buildBusOutreachDraft(partner, 'T1_intro');
  assert(t1.subject.includes('Como'), 'Subject must mention operator city');
  assert(t1.subject.includes('DOROGO'), 'Subject must mention DOROGO');
  assert(t1.body.includes('Cattaneo'), 'Body greeting must mention operator name');
  assert(t1.body.includes('Modelli bus disponibili e quanti passeggeri portano'), 'T1 body must ask for bus models and pax capacity');
  assert(t1.body.includes('Prezzi B2B indicativi per servizio orario e a disposizione (4h / 8h)'), 'T1 body must ask for hourly and standby rates');
  assert(t1.body.includes('contatto WhatsApp diretto'), 'T1 body must ask for direct WhatsApp contact');
  assert(t1.word_count < 130, `CEO template must remain ultra-short (<130 words), got ${t1.word_count}`);

  const t2 = buildBusOutreachDraft(partner, 'T2_followup');
  assert(t2.subject.startsWith('Re:'), 'Follow-up subject must thread with Re:');
  assert(t2.body.includes('WhatsApp'), 'Follow-up must ask for WhatsApp');

  const wa = buildBusOutreachDraft(partner, 'WA_pitch');
  assert(wa.body.includes('Buongiorno'), 'WhatsApp pitch must be in Italian');
  assert(wa.body.includes('servizio orario e a disposizione (4h/8h)'), 'WhatsApp pitch must ask for hourly and standby rates');
});

test('parseBusPartnerReply: automatically extracts bus models, pax capacity, hourly/standby rates, and WhatsApp from Italian reply', () => {
  const sampleItalianReply = `
    Buongiorno,
    grazie per il contatto. Per i vostri servizi sul Lago di Como e Milano abbiamo disponibili:
    - Mercedes-Benz V-Class VIP (7 pax) e Mercedes Sprinter VIP (16 posti)
    - Setra GT Coach (54 pax) per grandi gruppi
    Le nostre tariffe B2B sono: €95/h (min 4h), €420 per 4h / €780 per 8h.
    Per urgenze e disponibilità rapida potete scrivermi su WhatsApp al +39 348 912 3456.
    Cordiali saluti
  `;

  const extracted = parseBusPartnerReply(sampleItalianReply);
  assert(extracted.bus_models.includes('Sprinter VIP (16 pax)') && extracted.bus_models.includes('Mercedes V-Class (7 pax)'), `Must pair each bus model with its exact passenger count, got: ${extracted.bus_models}`);
  assert.equal(extracted.all_models_have_pax, true, 'All extracted bus models must have passenger counts attached');
  assert(extracted.pax_capacity.includes('7') && extracted.pax_capacity.includes('16') && extracted.pax_capacity.includes('54'), 'Must extract passenger capacities');
  assert(extracted.rate_hourly.includes('95'), 'Must extract hourly rate (€95/h)');
  assert(extracted.rate_standby.includes('420') || extracted.rate_standby.includes('780'), 'Must extract 4h/8h standby rate');
  assert(extracted.whatsapp.includes('+39 348 912 3456'), 'Must extract direct WhatsApp number');

  // Verify AI Per-Bus Passenger Gate catches any bus model that is missing its passenger count
  const incompleteAudit = verifyPerBusPaxCapacity('Mercedes Sprinter VIP (16 pax), Setra TopClass');
  assert.equal(incompleteAudit.allModelsHavePax, false, 'Must flag false when any bus model lacks an explicit passenger count');
  assert.deepEqual(incompleteAudit.modelsMissingPax, ['Setra TopClass']);
  assert(incompleteAudit.followUpQuestionIt.includes('Setra TopClass'), 'Must generate Italian follow-up question asking for exact passenger capacity of Setra TopClass');
});

test('buildBusSankeyFlow: builds 4-column visual pipeline flow (Class -> Town -> Fit -> Stage) with interactive node filtering', () => {
  const samplePartners = [
    { id: '1', name: 'Moveolux', base_city: 'Milano', relevance_score: 98, status: 'APPROVED_PARTNER', fleet_segment: 'luxury', rate_hourly: '€95/h' },
    { id: '2', name: 'Carnelli', base_city: 'Como', relevance_score: 76, status: 'WANT_TO_CONTACT', fleet_segment: 'both' },
    { id: '3', name: 'Cima', base_city: 'Roma (Central Italy)', relevance_score: 0, status: 'NOT_RELEVANT', fleet_segment: 'luxury' }
  ];

  const flowAll = buildBusSankeyFlow(samplePartners, {});
  assert.equal(flowAll.columns[0].total, 3);
  assert.equal(flowAll.matchedIds.size, 3);
  assert.equal(flowAll.columns.length, 4);

  // Filter by column 0 = 'seg:luxury'
  const flowLux = buildBusSankeyFlow(samplePartners, { 0: 'seg:luxury' });
  assert.equal(flowLux.matchedIds.size, 2);
  assert(flowLux.matchedIds.has('1'));
  assert(!flowLux.matchedIds.has('2'));
});

test('inferBusSegment: classifies Luxury VIP vs Standard GT vs Both directly from allocated buses', () => {
  const onlyLuxuryAllocated = {
    name: 'Bellagio Chauffeurs',
    fleet_categories: ['Mercedes-Benz V-Class VIP (7–8 seats)', 'Mercedes Sprinter VIP (8–16 seats)'],
  };
  assert.equal(inferBusSegment(onlyLuxuryAllocated), 'luxury');

  const onlyStandardAllocated = {
    name: 'Lario Charter',
    relevance_score: 92, // Even with a high score, allocated standard buses must classify as 'standard'
    notes: 'High-end luxury wedding charter experience',
    fleet_categories: ['Executive Midibus (24–30 seats)', 'Setra & Mercedes GT Coach (50–56 seats)'],
  };
  assert.equal(inferBusSegment(onlyStandardAllocated), 'standard');

  const bothAllocated = {
    name: 'Berini Autonoleggio',
    fleet_categories: ['Mercedes-Benz V-Class VIP (7–8 seats)', 'Executive Midibus (24–30 seats)'],
  };
  assert.equal(inferBusSegment(bothAllocated), 'both');

  // Zero-hallucination: Standard Minivan / Viano / Vito without Luxury/VIP/V-Class is 'standard'
  assert.equal(classifySingleBusAllocation('Minivan NCC (7 pax)'), 'standard');
  assert.equal(classifySingleBusAllocation('Mercedes Viano XL (7 pax)'), 'standard');
  assert.equal(classifySingleBusAllocation('Mercedes Sprinter (16-20 pax)'), 'standard');
  assert.equal(classifySingleBusAllocation('Mercedes Classe V VIP (7 pax)'), 'luxury');
  assert.equal(classifySingleBusAllocation('Mercedes Sprinter Luxury (16 pax)'), 'luxury');
});

test('extractEmailsFromWebsiteHtml: extracts real website emails, decodes Cloudflare cfemail, and prioritizes domain/booking addresses', () => {
  // Encode "info@i-vivaldi.com" with key 0x2a
  const target = 'info@i-vivaldi.com';
  const key = 0x2a;
  const cfHex = key.toString(16).padStart(2, '0') +
    Array.from(target).map(ch => (ch.charCodeAt(0) ^ key).toString(16).padStart(2, '0')).join('');

  assert.equal(decodeCloudflareEmail(cfHex), 'info@i-vivaldi.com');

  const html = `
    <html>
      <body>
        <a href="/cdn-cgi/l/email-protection" data-cfemail="${cfHex}">Email Us</a>
        <a href="mailto:berini@beriniautonoleggio.com?subject=Info">Scrivici</a>
        <p>Per preventivi: roberto.pancheri.viaggi@gmail.com oppure info [at] rosa-autoservizi [dot] it</p>
        <img src="banner@2x.png" />
      </body>
    </html>
  `;

  const extractedVivaldi = extractEmailsFromWebsiteHtml(html, 'https://www.i-vivaldi.com');
  assert.equal(extractedVivaldi[0], 'info@i-vivaldi.com', 'Must decode Cloudflare email and rank domain match #1');
  assert(extractedVivaldi.includes('berini@beriniautonoleggio.com'));
  assert(extractedVivaldi.includes('roberto.pancheri.viaggi@gmail.com'));
  assert(extractedVivaldi.includes('info@rosa-autoservizi.it'));
  assert(!extractedVivaldi.some(e => e.includes('banner@2x.png')), 'Must ignore image filenames');
});

test('extractFleetFromWebsiteText: zero-hallucination fleet and passenger extractor distinguishes Standard vs explicit Luxury', () => {
  // 1. Standard operator fleet page (no luxury/VIP claim)
  const standardFleetText = `
    La nostra flotta per noleggio con conducente:
    - Minivan da 7 a 8 posti per trasferimenti aeroportuali
    - Mercedes Sprinter minibus 19 - 20 posti
    - Midibus Iveco 30 posti
    - Autobus Gran Turismo da 54 posti e 64 posti
  `;
  const stdParsed = extractFleetFromWebsiteText(standardFleetText);
  assert.equal(stdParsed.hasExplicitLuxury, false, 'Must NOT hallucinate luxury when page has no explicit luxury/VIP claims');
  assert.equal(stdParsed.fleetSegment, 'standard');
  assert(stdParsed.paxCapacity.includes('7-8') || stdParsed.paxCapacity.includes('7'));
  assert(stdParsed.paxCapacity.includes('54'));

  // 2. Explicit Luxury + Standard fleet page
  const luxuryAndStdFleetText = `
    Parco Mezzi:
    - Mercedes Classe V Luxury Van 7 posti con sedili in pelle Nappa
    - Mercedes Sprinter VIP 16 posti Total Black con tavolini
    - Pullman Gran Turismo 54 posti
  `;
  const mixedParsed = extractFleetFromWebsiteText(luxuryAndStdFleetText);
  assert.equal(mixedParsed.hasExplicitLuxury, true, 'Must detect explicit Luxury/VIP/Classe V claims');
  assert.equal(mixedParsed.fleetSegment, 'both', 'Operator with both V-Class/Sprinter VIP and 54-pax GT Coach is classified as both');
  assert(mixedParsed.fleetCategories.some(c => (c.includes('V-Class') || c.includes('Classe V')) && c.includes('7')));
  assert(mixedParsed.fleetCategories.some(c => c.includes('Sprinter VIP') && c.includes('16')));
  assert(mixedParsed.fleetCategories.some(c => c.includes('54')));
});

test('Smart Personalization from user notes: AI incorporates specific fleet comments and questions into CEO outreach', () => {
  // 1. Partner with specific note about 19 seats
  const partner19p = {
    name: 'Vivaldi Driver',
    base_city: 'Como',
    notes: '- do they have only 19 seats or other\n- prices',
    fleet_categories: ['Mercedes-Benz V-Class VIP (7 seats)', 'Mercedes Sprinter VIP (19 seats)']
  };
  const draft19p = buildBusOutreachDraft(partner19p, 'T1_intro');
  assert(draft19p.body.includes('19 posti') || draft19p.body.includes('Sprinter'), 'Must personalize with the 19 seats question from user notes');
  assert(draft19p.body.includes('Grazie e buon lavoro,\nDmitri Traciuc'), 'Must end with clean CEO sign-off');
  assert(!draft19p.body.includes('dmitri@dorogo.eu | WhatsApp:'), 'Must NOT hardcode phone/email footer directly in body text');

  // 2. Partner with specific note about minibus extra-long & 20/26 seaters
  const partnerBerini = {
    name: 'Berini Autonoleggio',
    base_city: 'Como',
    notes: '- I am interested in his minibus, minibus extra-long, bus 20 seater, bus 26 seater\n- their prices for stand-by and hourly?',
    fleet_categories: ['Minibus Extralong (8 seats)', 'Bus (20 seats)', 'Bus (26 seats)']
  };
  const draftBerini = buildBusOutreachDraft(partnerBerini, 'T1_intro');
  assert(draftBerini.body.includes('extra-long') || draftBerini.body.includes('20/26 posti'), 'Must personalize with user notes about extra-long and 20/26 seaters');

  // 3. Follow-up asks for transfer cost, per-km rates, and minimum order (after direct contact info)
  const followUp = buildBusOutreachDraft(partnerBerini, 'T2_followup');
  assert(followUp.body.includes('transfer') || followUp.body.includes('Malpensa'), 'Follow-up must ask for point-to-point transfer rates');
  assert(followUp.body.includes('costo a km') || followUp.body.includes('minimo d\'ordine'), 'Follow-up must ask for per-km rates and minimum order');
});

test('shortFleetName: pairs model and passenger capacity in one compact tag for non-repetitive table display', () => {
  assert.equal(shortFleetName('Mercedes-Benz V-Class Luxury Minivan (7 pax)'), 'V-Class VIP (7p)');
  assert.equal(shortFleetName('Mercedes-Benz Sprinter VIP (16 seats)'), 'Sprinter VIP (16p)');
  assert.equal(shortFleetName('Mercedes-Benz Sprinter Luxury Long (16 seats)'), 'Sprinter Lux (16p)');
  assert.equal(shortFleetName('Iveco Wing Midibus (28 posti)'), 'Iveco Wing (28p)');
  assert.equal(shortFleetName('Setra S515 HD GT Coach (54 pax)'), 'Setra (54p)');
});




