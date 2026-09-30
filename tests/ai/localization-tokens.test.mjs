import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractVariantFacts,
  normalizeNumber,
  normalizeUnit,
  normalizeDimensions,
  parseNumberWithUnit,
} from '../../src/ai/agents/localization/index.ts';

test('Tokens: Chuẩn hóa số, đơn vị và kích thước (Normalization)', () => {
  assert.equal(normalizeNumber('1,5'), 1.5);
  assert.equal(normalizeNumber('1,000.5'), 1000.5);
  assert.equal(normalizeNumber('500'), 500);

  assert.equal(normalizeUnit('gam'), 'g');
  assert.equal(normalizeUnit('grams'), 'g');
  assert.equal(normalizeUnit('KILOGRAM'), 'kg');
  assert.equal(normalizeUnit('mililit'), 'ml');

  assert.equal(normalizeDimensions('10 x 15 cm'), '10x15 cm');
  assert.equal(normalizeDimensions('10*15*20cm'), '10x15x20 cm');
  assert.equal(normalizeDimensions('10×15cm'), '10x15 cm');

  const parsed = parseNumberWithUnit('250 gam');
  assert.deepEqual(parsed, { num: 250, unit: 'g' });
});

test('Tokens: Trích xuất thông số biến thể (Variant-aware Extraction)', () => {
  const snapshot = {
    id: 'prod_coffee_01',
    title: 'Cà phê Robusta Rang Xay',
    brand: 'Tech Startup Coffee',
    variants: [
      {
        sku: 'CF-250',
        name: 'Gói 250g',
        weightGrams: 250,
      },
      {
        sku: 'CF-500',
        name: 'Gói 500g',
        weightGrams: 500,
      },
    ],
    attributes: {
      origin: 'Dak Lak',
      shelf_life: '12 months',
    },
  };

  const bundle = extractVariantFacts(snapshot);

  assert.equal(bundle.brand, 'Tech Startup Coffee');
  assert.deepEqual(bundle.skus.sort(), ['CF-250', 'CF-500'].sort());

  const fact250 = bundle.variantFacts.find((f) => f.variantSku === 'CF-250');
  const fact500 = bundle.variantFacts.find((f) => f.variantSku === 'CF-500');

  assert.ok(fact250);
  assert.ok(fact500);
  assert.equal(fact250.normalizedNumber, 250);
  assert.equal(fact250.normalizedUnit, 'g');
  assert.equal(fact500.normalizedNumber, 500);
  assert.equal(fact500.normalizedUnit, 'g');
});
