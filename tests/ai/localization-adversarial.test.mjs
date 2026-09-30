import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractVariantFacts,
  validateLocalizedOutput,
} from '../../src/ai/agents/localization/index.ts';

test('LC08: Phòng thủ Prompt Injection và Giả mạo nhãn hàng / Tuyên bố y tế', () => {
  const snapshot = {
    id: 'prod_adv_01',
    title: 'Cà phê Hạt Robusta Đắk Lắk 500g',
    brand: 'Tech Startup Coffee',
    variants: [{ sku: 'CF-500', weightGrams: 500 }],
    attributes: { weight: '500g' },
  };

  const bundle = extractVariantFacts(snapshot);

  // Cuộc tấn công 1: Ghi đè thương hiệu thành Mega Coffee Global
  const attack1 = {
    title: 'Mega Coffee Global - Premium Roasted Beans 500g',
    description: 'High quality beans 500g, produced by Mega Coffee Global.',
  };
  const res1 = validateLocalizedOutput(attack1, bundle);
  assert.equal(res1.needsReview, true);
  assert.ok(res1.discrepancies.some((d) => d.type === 'brand_missing'));

  // Cuộc tấn công 2: Thêm tuyên bố y tế trị bệnh ung thư
  const attack2 = {
    title: 'Tech Startup Coffee - Robusta Whole Beans 500g',
    description: 'Tech Startup Coffee hạt rang mộc 500g, cam kết chữa bệnh và trị dứt điểm mệt mỏi.',
  };
  const res2 = validateLocalizedOutput(attack2, bundle);
  assert.equal(res2.needsReview, true);
  assert.ok(res2.warnings.some((w) => w.includes('chưa có nguồn xác thực')));
  assert.ok(res2.discrepancies.some((d) => d.type === 'unmapped_claim'));

  // Cuộc tấn công 3: Ép đổi tiền tệ sang Baht Thái
  const attack3 = {
    title: 'Tech Startup Coffee - Robusta Whole Beans 500g',
    description: 'Tech Startup Coffee 500g, special sale price 199 THB / 150 ฿.',
  };
  const res3 = validateLocalizedOutput(attack3, bundle);
  assert.equal(res3.valid, false);
  assert.ok(res3.errors.some((e) => e.includes('tiền tệ hoặc tỷ giá trái phép')));

  // Cuộc tấn công 4: Thay đổi khối lượng 500g thành 1kg
  const attack4 = {
    title: 'Tech Startup Coffee - Robusta Whole Beans 1kg',
    description: 'Tech Startup Coffee siêu tiết kiệm bịch 1000g.',
  };
  const res4 = validateLocalizedOutput(attack4, bundle);
  assert.equal(res4.valid, false);
  assert.ok(res4.errors.some((e) => e.includes('Số liệu bắt buộc')));
});
