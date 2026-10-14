import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectImageBuffer, applyPixelMicroDither } from '../supabase/functions/_shared/core/index.js';

test('inspectImageBuffer returns empty array on clean image buffer', () => {
  // Pure random bytes with no metadata tags
  const cleanBuffer = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00]);
  const signals = inspectImageBuffer(cleanBuffer);
  assert.equal(signals.length, 0, 'Clean image should produce zero detected signals');
});

test('inspectImageBuffer detects C2PA Content Credentials ("Made with AI")', () => {
  const encoder = new TextEncoder();
  const raw = encoder.encode('header_data_c2pa_manifest_jumbf_content-credentials_urn:c2pa:test');
  const signals = inspectImageBuffer(raw);
  assert.equal(signals.length, 1);
  assert.equal(signals[0].id, 'c2pa');
  assert.match(signals[0].title, /C2PA Content Credentials/);
  assert.match(signals[0].howPresent, /JUMBF manifest/);
});

test('inspectImageBuffer detects EXIF and GPS tags when present', () => {
  const encoder = new TextEncoder();
  const raw = encoder.encode('header_Exif_00_Make_Apple_Model_iPhone15_GPSLatitude_GPSLongitude_GPSInfo');
  const signals = inspectImageBuffer(raw);
  assert.equal(signals.length, 2, 'Should detect exactly EXIF and GPS');
  const ids = signals.map(s => s.id);
  assert.ok(ids.includes('exif'));
  assert.ok(ids.includes('gps'));
  assert.ok(!ids.includes('c2pa'), 'Should not detect C2PA when absent');
});

test('inspectImageBuffer detects embedded AI prompts and parameters', () => {
  const encoder = new TextEncoder();
  const raw = encoder.encode('tEXtparameters: luxury villa on lake como at dusk, hyperrealistic, 8k, negative_prompt: cartoon');
  const signals = inspectImageBuffer(raw);
  assert.equal(signals.length, 1);
  assert.equal(signals[0].id, 'prompt');
  assert.match(signals[0].title, /Embedded Generation Prompts/);
});

test('applyPixelMicroDither applies bounded imperceptible perturbation and preserves alpha', () => {
  // Create 4 pixels (16 RGBA bytes)
  const rgba = new Uint8ClampedArray([
    128, 128, 128, 255, // Pixel 1
    0,   0,   0,   255, // Pixel 2 (boundary zero)
    255, 255, 255, 255, // Pixel 3 (boundary 255)
    100, 150, 200, 200  // Pixel 4 (custom alpha)
  ]);

  const count = applyPixelMicroDither(rgba);
  assert.ok(count > 0, 'Dither should modify pixels');

  // Verify bounded to 0-255
  for (let i = 0; i < rgba.length; i += 4) {
    assert.ok(rgba[i] >= 0 && rgba[i] <= 255);
    assert.ok(rgba[i + 1] >= 0 && rgba[i + 1] <= 255);
    assert.ok(rgba[i + 2] >= 0 && rgba[i + 2] <= 255);
  }

  // Verify Alpha is completely untouched
  assert.equal(rgba[3], 255);
  assert.equal(rgba[7], 255);
  assert.equal(rgba[11], 255);
  assert.equal(rgba[15], 200);

  // Boundary check: pixel 2 red cannot be negative
  assert.ok(rgba[4] >= 0);
  // Boundary check: pixel 3 red cannot exceed 255
  assert.ok(rgba[8] <= 255);
});
