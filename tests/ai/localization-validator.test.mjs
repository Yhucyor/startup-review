import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractVariantFacts,
  validateLocalizedOutput,
} from '../../src/ai/agents/localization/index.ts';

test('LC02: Bắt lỗi ảo giác số lượng (250g -> 500g)', () => {
  const snapshot = {
    id: 'prod_coffee_01',
    title: 'Cà phê Robusta 250g',
    attributes: {
      weight: '250g',
    },
  };
  const bundle = extractVariantFacts(snapshot);

  const output = {
    title: 'Dak Lak Robusta Coffee 500g',
    description: 'Fresh roasted coffee beans with rich flavor, package size 500g.',
  };

  const res = validateLocalizedOutput(output, bundle);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes('250')));
  assert.equal(res.discrepancies[0].type, 'numeric_mismatch');
});

test('LC02b: Bắt lỗi hoán đổi số liệu giữa các biến thể (Variant Swap)', () => {
  const snapshot = {
    id: 'prod_coffee_variants',
    title: 'Cà phê Robusta Rang Mộc',
    brand: 'Tech Startup Coffee',
    variants: [
      { sku: 'CF-250', name: 'Gói nhỏ', weightGrams: 250 },
      { sku: 'CF-500', name: 'Gói lớn', weightGrams: 500 },
    ],
  };
  const bundle = extractVariantFacts(snapshot);

  // Bản dịch bị tráo thông số: CF-250 bị ghi 500g
  const output = {
    title: 'Tech Startup Coffee - Robusta Whole Beans',
    description: 'Variant CF-250 comes in 500g pack, while variant CF-500 comes in 250g pack.',
  };

  const res = validateLocalizedOutput(output, bundle);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes('Hoán đổi số liệu')));
  assert.ok(res.discrepancies.some((d) => d.type === 'variant_swap'));
});

test('LC03: Chặn tự đổi tiền tệ (VND -> THB)', () => {
  const snapshot = {
    id: 'prod_tea',
    title: 'Trà Oolong Cầu Đất',
    attributes: {
      price: '150000 VND',
    },
  };
  const bundle = extractVariantFacts(snapshot);

  const output = {
    title: 'Cau Dat Oolong Tea',
    description: 'High mountain oolong tea, price 220 ฿ (approx 150000 VND).',
  };

  const res = validateLocalizedOutput(output, bundle);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes('tiền tệ hoặc tỷ giá trái phép')));
  assert.ok(res.discrepancies.some((d) => d.type === 'unauthorized_currency'));
});

test('LC05: Gắn cờ claim không nguồn xác thực (Unverified Claim Flagging)', () => {
  const snapshot = {
    id: 'prod_honey',
    title: 'Mật ong hoa cà phê 500ml',
    brand: 'Highland Pure',
    attributes: {
      volume: '500ml',
    },
  };
  const bundle = extractVariantFacts(snapshot);

  const output = {
    title: 'Highland Pure Coffee Flower Honey 500ml',
    description: 'Pure raw honey from highlands, sản phẩm đạt chuẩn quốc tế và chữa bệnh hiệu quả.',
    claimMappings: [],
  };

  const res = validateLocalizedOutput(output, bundle);
  assert.equal(res.valid, true); // Không làm gãy workflow, chỉ chuyển review
  assert.equal(res.needsReview, true);
  assert.ok(res.warnings.some((w) => w.includes('chưa có nguồn xác thực')));
  assert.ok(res.discrepancies.some((d) => d.type === 'unmapped_claim'));
});

test('Validator: Bản dịch hợp lệ đạt chuẩn', () => {
  const snapshot = {
    id: 'prod_clean',
    title: 'Cà phê Robusta 500g',
    brand: 'Tech Startup Coffee',
    variants: [{ sku: 'CF-500', weightGrams: 500 }],
  };
  const bundle = extractVariantFacts(snapshot);

  const output = {
    title: 'Tech Startup Coffee - Robusta Roasted Beans 500g',
    description: 'Rich and authentic Vietnamese coffee, sku CF-500 weight 500g.',
  };

  const res = validateLocalizedOutput(output, bundle);
  assert.equal(res.valid, true);
  assert.equal(res.errors.length, 0);
  assert.equal(res.needsReview, false);
});
