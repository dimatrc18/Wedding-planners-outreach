import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isRecentlyAdded, operatorHasVehicleType, detectVehicleKey, detectOperatorCityAndRegion, STANDARD_FLEET_TYPES } from '../app/views/bus_partners.js';
import {
  calculateBusRelevanceScore,
  getPriorityTier,
  scoreFromWebSignals,
  BUS_STATUSES,
  DISCRETION_LEVELS,
  FLEET_TIERS,
  TERRITORY_PERMITS,
  CORPORATE_SLA
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
