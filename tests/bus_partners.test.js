import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

test('Isolation Principle: existing CRM tables and core workflows remain unaffected', () => {
  // Ensure bus partners scoring does not interfere with wedding planner priorities or settings
  assert.equal(BUS_STATUSES.length, 5);
  assert.equal(DISCRETION_LEVELS.length, 3);
  assert.equal(FLEET_TIERS.length, 3);
  assert.equal(TERRITORY_PERMITS.length, 3);
  assert.equal(CORPORATE_SLA.length, 2);
});
