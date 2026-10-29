import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FLEET_LEDGER_ROWS, calculateAdjustedPrice } from '../app/views/fleet_showcase.js';

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
