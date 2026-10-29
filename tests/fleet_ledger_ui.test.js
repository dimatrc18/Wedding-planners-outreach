import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FLEET_LEDGER_ROWS,
  calculateAdjustedPrice,
  selectSpecificVehicle,
  calculateTripQuote,
  getMatchingVehicles,
  getTransportCategories,
  getAllTransferRoutes,
  addVehicleToFleet,
  deleteCustomVehicle
} from '../app/views/fleet_showcase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Fleet Showcase UI: Column widths in fleet_showcase.js sum exactly to 100%', () => {
  const showcaseFile = fs.readFileSync(path.join(rootDir, 'app/views/fleet_showcase.js'), 'utf8');
  
  // Extract all <th style="width:XX%"> from the primary table
  const widthMatches = [...showcaseFile.matchAll(/<th style="width:(\d+)%"/g)];
  assert.equal(widthMatches.length, 6, 'Must have exactly 6 table header columns');
  
  const totalWidth = widthMatches.reduce((sum, m) => sum + parseInt(m[1], 10), 0);
  assert.equal(totalWidth, 100, `Header column widths must sum exactly to 100%, got ${totalWidth}%`);
});

test('Fleet Showcase UI: Headers have separate title and sub elements to prevent collision', () => {
  const showcaseFile = fs.readFileSync(path.join(rootDir, 'app/views/fleet_showcase.js'), 'utf8');
  
  // Header should not interpolate long string directly in single-line title
  assert.ok(!showcaseFile.includes('Transfer Rates (${esc(modeBadgeText(pricingMode))})'),
    'Header must not have single-line modeBadgeText interpolation that creates text collisions');
  
  assert.ok(showcaseFile.includes('class="sail-th-title">Transfer Rates</div>'),
    'Header must have dedicated title element');
  assert.ok(showcaseFile.includes('class="sail-th-sub">'),
    'Header must have dedicated sub-title element for pricing mode');
});

test('Fleet Showcase CSS: Eliminates text overlays and horizontal scroll on desktop', () => {
  const cssFile = fs.readFileSync(path.join(rootDir, 'app/styles.css'), 'utf8');
  
  // 1. Check .sail-table-wrap has overflow-x: hidden on desktop
  const tableWrapSection = cssFile.match(/\.sail-table-wrap\s*\{([^}]+)\}/);
  assert.ok(tableWrapSection, '.sail-table-wrap CSS rule must exist');
  assert.ok(tableWrapSection[1].includes('overflow-x: hidden'),
    '.sail-table-wrap must have overflow-x: hidden to prevent horizontal swipe on desktop');
  
  // 2. Check .sail-table has table-layout: fixed and width: 100%
  const tableSection = cssFile.match(/\.sail-table\s*\{([^}]+)\}/);
  assert.ok(tableSection, '.sail-table CSS rule must exist');
  assert.ok(tableSection[1].includes('table-layout: fixed'),
    '.sail-table must enforce fixed layout');
  assert.ok(tableSection[1].includes('width: 100%'),
    '.sail-table must fit 100% width');
  
  // 3. Check .sail-table th allows normal wrapping (NEVER white-space: nowrap)
  const thSection = cssFile.match(/\.sail-table th\s*\{([^}]+)\}/);
  assert.ok(thSection, '.sail-table th CSS rule must exist');
  assert.ok(!thSection[1].includes('white-space: nowrap'),
    '.sail-table th must not have white-space: nowrap which causes collision/overlay');
  assert.ok(thSection[1].includes('white-space: normal'),
    '.sail-table th must have white-space: normal to wrap text cleanly');
  assert.ok(thSection[1].includes('word-break: break-word'),
    '.sail-table th must have word-break: break-word');
  
  // 4. Check .sail-rate-route has min-width: 0 to prevent grid column blowout
  const routeSection = cssFile.match(/\.sail-rate-route\s*\{([^}]+)\}/);
  assert.ok(routeSection, '.sail-rate-route CSS rule must exist');
  assert.ok(routeSection[1].includes('min-width: 0'),
    '.sail-rate-route must have min-width: 0 for proper CSS grid column text truncation');
});

test('Fleet Showcase Data: Separated Sprinter variants (Red, Black, Top VIP)', () => {
  // Red Interior Sprinter 7 Pax
  const redSprinter = FLEET_LEDGER_ROWS.find((r) => r.id === 'avantgarde_sprinter_7_red');
  assert.ok(redSprinter, 'Red interior Sprinter must exist as separate vehicle');
  assert.equal(redSprinter.pax, 7);
  assert.equal(redSprinter.standby.dispo_8h.net, 800);
  assert.equal(redSprinter.transfers.mxp_milano.net, 250);
  assert.equal(redSprinter.transfers.mxp_como.net, 380);
  assert.equal(redSprinter.photos.length, 4, 'Must have exactly 4 red photos');
  assert.ok(redSprinter.photos.every((p) => p.src.includes('sprinter_7p_red')));

  // Black Interior Sprinter 8 Pax
  const bwSprinter = FLEET_LEDGER_ROWS.find((r) => r.id === 'avantgarde_sprinter_8_bw');
  assert.ok(bwSprinter, 'Black interior Sprinter must exist as separate vehicle');
  assert.equal(bwSprinter.pax, 8);
  assert.equal(bwSprinter.standby.dispo_8h.net, 800);
  assert.equal(bwSprinter.transfers.mxp_milano.net, 250);
  assert.equal(bwSprinter.transfers.mxp_como.net, 380);
  assert.equal(bwSprinter.photos.length, 4, 'Must have exactly 4 black & white photos');
  assert.ok(bwSprinter.photos.every((p) => p.src.includes('sprinter_8p_bw')));

  // Top VIP Sprinter 8 Pax
  const topVip = FLEET_LEDGER_ROWS.find((r) => r.id === 'avantgarde_sprinter_8_top_vip');
  assert.ok(topVip, 'Top VIP Sprinter must exist as separate vehicle');
  assert.equal(topVip.pax, 8);
  assert.equal(topVip.standby.hourly.net, 140, 'Top VIP hourly must be €140/h as quoted by driver');
  assert.equal(topVip.standby.dispo_8h.net, 1120, 'Top VIP 8h must be 8 x 140 = €1,120 as quoted by driver');
  assert.ok(topVip.photos.some((p) => p.src.endsWith('.mp4')), 'Top VIP must include video walkthrough');

  // Verify video file exists on disk
  const videoPhoto = topVip.photos.find((p) => p.src.endsWith('.mp4'));
  assert.ok(fs.existsSync(path.join(rootDir, videoPhoto.src)), `Video file ${videoPhoto.src} must exist`);
});

test('Fleet Showcase Data: Rates and calculations are 100% authentic', () => {
  const avantgardeCoach = FLEET_LEDGER_ROWS.find((r) => r.id === 'avantgarde_coach_30');
  assert.ok(avantgardeCoach);
  assert.equal(avantgardeCoach.transfers.mxp_milano.net, 400);
  assert.equal(avantgardeCoach.transfers.mxp_como.net, 500);
  assert.equal(avantgardeCoach.standby.dispo_4h.net, 600);
  assert.equal(avantgardeCoach.standby.dispo_8h.net, 1200);

  // VAT calculations
  assert.equal(calculateAdjustedPrice(400, 'vat'), 440);
  assert.equal(calculateAdjustedPrice(500, 'vat'), 550);
  assert.equal(calculateAdjustedPrice(600, 'vat'), 660);
  assert.equal(calculateAdjustedPrice(1200, 'vat'), 1320);
});

test('Fleet Showcase Calculator: Flexible direct vehicle selection chooses any vehicle at any time', () => {
  // Test picking Top VIP Sprinter directly
  const topVeh = selectSpecificVehicle('avantgarde_sprinter_8_top_vip');
  assert.ok(topVeh, 'Should select Top VIP Sprinter');
  assert.equal(topVeh.id, 'avantgarde_sprinter_8_top_vip');

  const quote = calculateTripQuote({
    serviceType: 'standby',
    routeKey: 'dispo_8h',
    transportCategory: 'all',
    tierFilter: 'all',
    passengerCount: 8,
    vehicleId: 'avantgarde_sprinter_8_top_vip',
    clientMarkupPct: 25
  });

  assert.equal(quote.veh.id, 'avantgarde_sprinter_8_top_vip');
  assert.equal(quote.baseNet, 1120, 'Top VIP 8h standby must be €1,120');
  assert.equal(quote.totalPartnerCost, 1120);
  assert.equal(quote.clientQuote, 1400, '€1,120 + 25% markup = €1,400');
  assert.equal(quote.netMargin, 280, 'DOROGO gross profit = €280');
});

test('Fleet Showcase Calculator: Custom hourly standby calculates exact driver tariff', () => {
  // 5 hours standby @ €140/h for Top VIP Sprinter
  const hourlyQuote = calculateTripQuote({
    serviceType: 'standby',
    routeKey: 'hourly',
    standbyHours: 5,
    transportCategory: 'all',
    tierFilter: 'all',
    passengerCount: 6,
    vehicleId: 'avantgarde_sprinter_8_top_vip',
    clientMarkupPct: 20
  });

  assert.equal(hourlyQuote.veh.id, 'avantgarde_sprinter_8_top_vip');
  assert.equal(hourlyQuote.baseNet, 700, '5 hours x €140/h = €700');
  assert.equal(hourlyQuote.clientQuote, 840, '€700 + 20% markup = €840');
  assert.ok(hourlyQuote.serviceLabel.includes('5h @ €140/h'));
});

test('Fleet Showcase Calculator: Automatically updates when new vehicle is added to table', () => {
  const initialCategories = getTransportCategories();
  const testVehId = 'test_setra_54_pax_' + Date.now();

  const newCoach = {
    id: testVehId,
    vehicleModel: 'Setra S 515 HD Touring Coach',
    pax: 54,
    paxLabel: '54 pax',
    partnerName: 'Perletti Autoservizi',
    baseCity: 'Grumello del Monte BG',
    tier: 'standard',
    category: 'coach_50',
    categoryLabel: 'Full-Size GT Coach (50+ Pax)',
    status: 'confirmed',
    transfers: {
      mxp_como: { label: 'Malpensa (MXP) ⇄ Como', net: 650 },
      bgy_como: { label: 'Bergamo (BGY) ⇄ Como', net: 500 }
    },
    standby: {
      hourly: { label: 'Tariffa oraria', net: 120 },
      dispo_8h: { label: 'Disposizione 8h', net: 960 },
      extra_hour: 120
    }
  };

  // Add vehicle to table
  addVehicleToFleet(newCoach);

  // 1. Verify it exists in FLEET_LEDGER_ROWS table
  const foundInTable = FLEET_LEDGER_ROWS.find((r) => r.id === testVehId);
  assert.ok(foundInTable, 'New vehicle must immediately exist in table array');
  assert.equal(foundInTable.vehicleModel, 'Setra S 515 HD Touring Coach');

  // 2. Verify categories dynamic update
  const updatedCategories = getTransportCategories();
  assert.ok(updatedCategories.some((c) => c.key === 'coach_50'), 'New coach category must exist in categories');

  // 3. Verify it exists and can be quoted in the calculator
  selectSpecificVehicle(testVehId);
  const quote = calculateTripQuote({
    serviceType: 'transfer',
    routeKey: 'mxp_como',
    transportCategory: 'all',
    tierFilter: 'all',
    passengerCount: 50,
    vehicleId: testVehId,
    clientMarkupPct: 30
  });

  assert.equal(quote.veh.id, testVehId);
  assert.equal(quote.baseNet, 650, 'MXP-Como transfer net must be €650');
  assert.equal(quote.clientQuote, 845, '€650 + 30% = €845');
  assert.equal(quote.perGuestQuote, '16.90', '€845 / 50 guests = €16.90/guest');

  // Clean up test vehicle
  deleteCustomVehicle(testVehId);
});

test('Fleet Showcase Calculator: Dynamic route discovery pools routes across all vehicles', () => {
  const routes = getAllTransferRoutes();
  assert.ok(routes.length >= 7);
  assert.ok(routes.some((r) => r.key === 'mxp_como'));
  assert.ok(routes.some((r) => r.key === 'tremezzo'));
});

