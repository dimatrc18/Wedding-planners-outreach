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
  deleteCustomVehicle,
  formatEur,
  formatPriceWithUnit,
  SIZE_GROUPS,
  getVehicleSizeGroup,
  matchesSizeFilter,
  renderLedgerRow
} from '../app/views/fleet_showcase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Fleet Showcase UI: Column widths in fleet_showcase.js sum exactly to 100%', () => {
  const showcaseFile = fs.readFileSync(path.join(rootDir, 'app/views/fleet_showcase.js'), 'utf8');
  
  // Extract all <th style="width:XX%"> from the primary table
  const widthMatches = [...showcaseFile.matchAll(/<th style="width:(\d+)%"/g)];
  assert.equal(widthMatches.length, 7, 'Must have exactly 7 table header columns including row index #');
  
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

test('Fleet Showcase UI: Row index column (#) is rendered with sequence numbers', () => {
  const showcaseFile = fs.readFileSync(path.join(rootDir, 'app/views/fleet_showcase.js'), 'utf8');
  assert.ok(showcaseFile.includes('<div class="sail-th-title" style="text-align:center">#</div>'),
    'Header must contain # column');
  assert.ok(showcaseFile.includes('${idx + 1}'),
    'Row renderer must display row sequence index');
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
  assert.equal(topVip.standby.dispo_8h.net, 1200, 'Top VIP 8h must be €1,200 as quoted by driver');
  assert.ok(topVip.photos.some((p) => p.src.endsWith('.mp4')), 'Top VIP must include video walkthrough');
  assert.equal(topVip.photos.length, 1, 'Top VIP must only have the verified video walkthrough');

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
  assert.equal(quote.baseNet, 1200, 'Top VIP 8h standby must be €1,200');
  assert.equal(quote.totalPartnerCost, 1200);
  assert.equal(quote.clientQuote, 1500, '€1,200 + 25% markup = €1,500');
  assert.equal(quote.netMargin, 300, 'DOROGO gross profit = €300');
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

test('formatPriceWithUnit & formatEur: Renders "?" when price is 0, null, or undefined (never "€0" or "€0/h")', () => {
  assert.equal(formatEur(0), '?');
  assert.equal(formatEur(null), '?');
  assert.equal(formatEur(undefined), '?');
  assert.equal(formatEur(100), '€100');
  assert.equal(formatPriceWithUnit(0, '/h'), '?');
  assert.equal(formatPriceWithUnit(null, '/h'), '?');
  assert.equal(formatPriceWithUnit(140, '/h'), '€140/h');
  assert.equal(formatPriceWithUnit(140), '€140');
});

test('Fleet Showcase Size Filter: SIZE_GROUPS comprehensively and mutually exclusively groups all 18 vehicles', () => {
  assert.equal(FLEET_LEDGER_ROWS.length, 18);
  
  // Verify each vehicle belongs to exactly one group
  const groupCounts = {};
  FLEET_LEDGER_ROWS.forEach((r) => {
    const grp = getVehicleSizeGroup(r.pax);
    assert.ok(grp, `Vehicle ${r.vehicleModel} (${r.pax} pax) must match a size group`);
    groupCounts[grp.key] = (groupCounts[grp.key] || 0) + 1;
  });

  // Expected counts across the 18-vehicle fleet
  assert.equal(groupCounts['group:7_8'], 5, 'Must have 5 vehicles in 7–8 seats (V-Class & Sprinters)');
  assert.equal(groupCounts['group:12_16'], 2, 'Must have 2 vehicles in 12–16 seats (Sprinter 12 & Transit 16)');
  assert.equal(groupCounts['group:19_20'], 4, 'Must have 4 vehicles in 19–20 seats (Minibus GT, Indcar, Gran Capri, MB 20)');
  assert.equal(groupCounts['group:28_30'], 4, 'Must have 4 vehicles in 28–30 seats (Iveco Midibuses & Executive 30)');
  assert.equal(groupCounts['group:50_plus'], 3, 'Must have 3 vehicles in 50+ seats (Tourismo & Setra)');

  // Sum of all groups must be exactly 18
  const totalMapped = Object.values(groupCounts).reduce((a, b) => a + b, 0);
  assert.equal(totalMapped, 18);
});

test('Fleet Showcase Size Filter: matchesSizeFilter correctly filters groups, ranges, and exact seat counts', () => {
  // 'all' matches everything
  assert.equal(matchesSizeFilter(7, 'all'), true);
  assert.equal(matchesSizeFilter(50, 'all'), true);

  // Group 7-8 seats
  assert.equal(matchesSizeFilter(7, 'group:7_8'), true);
  assert.equal(matchesSizeFilter(8, 'group:7_8'), true);
  assert.equal(matchesSizeFilter(12, 'group:7_8'), false);

  // Group 12-16 seats
  assert.equal(matchesSizeFilter(12, 'group:12_16'), true);
  assert.equal(matchesSizeFilter(16, 'group:12_16'), true);
  assert.equal(matchesSizeFilter(8, 'group:12_16'), false);
  assert.equal(matchesSizeFilter(19, 'group:12_16'), false);

  // Group 19-20 seats
  assert.equal(matchesSizeFilter(19, 'group:19_20'), true);
  assert.equal(matchesSizeFilter(20, 'group:19_20'), true);
  assert.equal(matchesSizeFilter(16, 'group:19_20'), false);

  // Group 12-20 seats (all minibuses combined)
  assert.equal(matchesSizeFilter(12, 'group:12_20'), true);
  assert.equal(matchesSizeFilter(16, 'group:12_20'), true);
  assert.equal(matchesSizeFilter(19, 'group:12_20'), true);
  assert.equal(matchesSizeFilter(20, 'group:12_20'), true);
  assert.equal(matchesSizeFilter(8, 'group:12_20'), false);
  assert.equal(matchesSizeFilter(29, 'group:12_20'), false);

  // Group 28-30 seats
  assert.equal(matchesSizeFilter(29, 'group:28_30'), true);
  assert.equal(matchesSizeFilter(30, 'group:28_30'), true);
  assert.equal(matchesSizeFilter(20, 'group:28_30'), false);

  // Group 50+ seats
  assert.equal(matchesSizeFilter(50, 'group:50_plus'), true);
  assert.equal(matchesSizeFilter(52, 'group:50_plus'), true);
  assert.equal(matchesSizeFilter(30, 'group:50_plus'), false);

  // Exact seat counts
  assert.equal(matchesSizeFilter(7, 'exact:7'), true);
  assert.equal(matchesSizeFilter(8, 'exact:7'), false);
  assert.equal(matchesSizeFilter(16, 'exact:16'), true);
  assert.equal(matchesSizeFilter(12, 'exact:16'), false);
});

test('Fleet Showcase UI Template: Contains vehicle size filter controls and grouping markup', () => {
  const showcaseFile = fs.readFileSync(path.join(rootDir, 'app/views/fleet_showcase.js'), 'utf8');

  // Verify filter bar presence
  assert.ok(showcaseFile.includes('class="sail-filter-bar"'), 'Must render dedicated sail-filter-bar');
  assert.ok(showcaseFile.includes('Seat Size:'), 'Must render Seat Size label');
  assert.ok(showcaseFile.includes('data-size-filter="all"'), 'Must have All Sizes button');
  assert.ok(showcaseFile.includes('id="ledger-size-select"'), 'Must have detailed size dropdown');
  assert.ok(showcaseFile.includes('id="btn-toggle-group-size"'), 'Must have Group by Size toggle button');
  assert.ok(showcaseFile.includes('data-filter-exact-pax'), 'Must have clickable exact pax pill in table rows');
  assert.ok(showcaseFile.includes('sail-group-header-row'), 'Must render group header row for categorized brackets');
  assert.ok(showcaseFile.includes('id="th-sort-capacity"'), 'Must have sortable capacity column header');
});

test('Fleet Showcase Pending Rows: English explanations and grey muted styling for pending vehicles', () => {
  const pendingVehicles = FLEET_LEDGER_ROWS.filter((r) => r.status === 'pending');
  assert.equal(pendingVehicles.length, 2, 'Must have exactly 2 pending vehicles');

  // Verify Guizzetti Sprinter 8+1 notes are in English
  const guizzetti = pendingVehicles.find((r) => r.id === 'guizzetti_sprinter_8');
  assert.ok(guizzetti, 'Guizzetti Sprinter 8+1 must be present');
  assert.ok(guizzetti.transferNote.includes('New 8+1 luxury minivan arriving Jan/Feb 2027'));
  assert.ok(guizzetti.standbyNote.includes('Awaiting 4h & 8h standby rates'));

  // Verify Como Limo Lux V-Class notes are in English
  const comoLimo = pendingVehicles.find((r) => r.id === 'comolimolux_vclass');
  assert.ok(comoLimo, 'Como Limo Lux V-Class must be present');
  assert.ok(comoLimo.transferNote.includes('Mercedes V-Class'));
  assert.ok(comoLimo.standbyNote.includes('Awaiting 4h & 8h standby rates'));

  // Verify showcase file has pending muted styling
  const showcaseFile = fs.readFileSync(path.join(rootDir, 'app/views/fleet_showcase.js'), 'utf8');
  assert.ok(showcaseFile.includes('sail-row-pending'), 'Must apply sail-row-pending class to pending table rows');
  assert.ok(showcaseFile.includes('#94A3B8'), 'Must use muted grey color for pending explanation notes');
  assert.ok(showcaseFile.includes('⏳ Rates Pending'), 'Must show Rates Pending button state for pending rows');
});

test('Fleet Showcase Rates: Only existing routes with positive prices are displayed (zero question marks)', () => {
  // 1. All transfer entries across FLEET_LEDGER_ROWS must have positive numeric net amounts
  FLEET_LEDGER_ROWS.forEach((row) => {
    if (row.transfers && typeof row.transfers === 'object') {
      Object.entries(row.transfers).forEach(([routeKey, t]) => {
        assert.ok(t, `Route ${routeKey} on vehicle ${row.id} must be an object`);
        assert.ok(
          typeof t.net === 'number' && !isNaN(t.net) && t.net > 0,
          `Route ${routeKey} on vehicle ${row.id} must have a positive numeric net price, found: ${t.net}`
        );
      });
    }
  });

  // 2. Render each vehicle row and assert no '?' appears in rate amounts
  FLEET_LEDGER_ROWS.forEach((row, idx) => {
    const html = renderLedgerRow(row, idx);

    // Rate amount spans must NEVER contain '?'
    const rateAmtMatches = [...html.matchAll(/<span class="sail-rate-amt">([^<]+)<\/span>/g)];
    rateAmtMatches.forEach((match) => {
      const amtText = match[1].trim();
      assert.notEqual(amtText, '?', `Vehicle ${row.id} has unpriced route rendering '?' in row: ${amtText}`);
      assert.match(amtText, /^€\d+/, `Rate amount must begin with € and positive digits, found: ${amtText}`);
    });

    // If vehicle has confirmed transfers, ensure at least one rate is rendered
    if (row.status === 'confirmed' && row.transfers) {
      assert.ok(rateAmtMatches.length > 0, `Confirmed vehicle ${row.id} must render valid rate amounts`);
    }
  });
});

