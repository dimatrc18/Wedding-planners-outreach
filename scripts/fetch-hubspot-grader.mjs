#!/usr/bin/env node
/**
 * Automated bi-weekly runner for HubSpot AI Search Grader (https://www.hubspot.com/ai-search-grader).
 *
 * Automates:
 * 1. Opens HubSpot AI Search Grader
 * 2. Inputs:
 *    - Brand: DOROGO
 *    - Location: Milan, Italy
 *    - Services: NCC Private Chauffeur Service, Luxury Airport & Alps Transfers
 *    - Industry: Travel & Tourism
 * 3. Submits form, waits for diagnostic run to complete
 * 4. Downloads generated PDF report to data/visibility/reports/dorogo_hubspot_grader_YYYY-MM-DD.pdf
 * 5. Calls scripts/parse-hubspot-pdf.mjs to update history & dashboard podium
 *
 * To run:
 *   node scripts/fetch-hubspot-grader.mjs
 *   (or: npx -y playwright test scripts/fetch-hubspot-grader.mjs)
 */

import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPORTS_DIR = resolve(__dirname, '../data/visibility/reports');
if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });

const todayStr = new Date().toISOString().slice(0, 10);
const targetPdfPath = resolve(REPORTS_DIR, `dorogo_hubspot_grader_${todayStr}.pdf`);

console.log('🤖 DOROGO AI Search Grader Bi-Weekly Automation Runner');
console.log('=====================================================');
console.log(`Target: https://www.hubspot.com/ai-search-grader`);
console.log(`Parameters:`);
console.log(`  - Company / Brand: DOROGO`);
console.log(`  - Location: Milan, Italy`);
console.log(`  - Services: NCC Private Chauffeur Service, Luxury Airport & Alps Transfers`);
console.log(`  - Industry: Travel & Tourism`);
console.log(`  - Destination: ${targetPdfPath}`);
console.log('-----------------------------------------------------');

async function run() {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch (_) {
    console.log('ℹ️ Playwright is not locally installed. You can run automated headless fetch via:');
    console.log('   npx -y playwright test scripts/fetch-hubspot-grader.mjs');
    console.log('\nAlternatively, open https://www.hubspot.com/ai-search-grader in your browser,');
    console.log('download the report PDF, and import it with 1 click in the CRM dashboard or via:');
    console.log('   node scripts/parse-hubspot-pdf.mjs <downloaded_file.pdf>');
    return;
  }

  const { chromium } = playwright;
  console.log('🚀 Launching headless browser session...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.log('🌐 Navigating to https://www.hubspot.com/ai-search-grader ...');
    await page.goto('https://www.hubspot.com/ai-search-grader', { waitUntil: 'networkidle', timeout: 45000 });

    // Look for form inputs
    console.log('📝 Filling diagnostic parameters...');
    const brandInput = page.locator('input[name*="brand"], input[placeholder*="Brand"], input[name*="company"]').first();
    await brandInput.fill('DOROGO');

    const locInput = page.locator('input[name*="location"], input[placeholder*="Location"], input[name*="city"]').first();
    if (await locInput.isVisible()) await locInput.fill('Milan, Italy');

    const serviceInput = page.locator('input[name*="service"], textarea[name*="service"], input[placeholder*="Service"]').first();
    if (await serviceInput.isVisible()) await serviceInput.fill('NCC Private Chauffeur Service, Luxury Airport & Alps Transfers');

    console.log('⚡ Submitting diagnostic audit...');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Grade"), button:has-text("Analyze")').first();
    await submitBtn.click();

    console.log('⏳ Waiting for AI diagnostic audit to process across ChatGPT, Perplexity & Gemini (~30-60s)...');
    await page.waitForTimeout(40000);

    // Trigger PDF download
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
    const pdfBtn = page.locator('button:has-text("PDF"), a:has-text("PDF"), button:has-text("Download")').first();
    if (await pdfBtn.isVisible()) {
      await pdfBtn.click();
      const download = await downloadPromise;
      if (download) {
        await download.saveAs(targetPdfPath);
        console.log(`✅ PDF successfully downloaded to ${targetPdfPath}`);
      }
    }

    await browser.close();

    // Trigger parser
    if (existsSync(targetPdfPath)) {
      execFileSync('node', [resolve(__dirname, 'parse-hubspot-pdf.mjs'), targetPdfPath], { stdio: 'inherit' });
    }
  } catch (err) {
    console.error('Headless automation encountered an error:', err.message);
    await browser.close();
  }
}

run();
