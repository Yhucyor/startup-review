import test from 'node:test';
import assert from 'node:assert/strict';

import {
  localizeContent,
  InMemoryGlossaryStore,
} from '../../src/ai/agents/localization/index.ts';
import { ModelCallGateway } from '../../src/ai/model-call/index.ts';

class MockModelProvider {
  constructor(handler) {
    this.handler = handler;
    this.callCount = 0;
  }

  async call(req, ctx) {
    this.callCount++;
    return this.handler(req, ctx);
  }
}

test('LC01: Pure Skip khi cùng ngôn ngữ và tone mặc định (Không gọi LLM)', async () => {
  const provider = new MockModelProvider(() => {
    throw new Error('LLM should not be called');
  });
  const gateway = new ModelCallGateway({ provider });

  const input = {
    sourceTitle: 'Cà phê Đắk Lắk 500g',
    sourceDescription: 'Cà phê rang mộc chuẩn vị',
    sourceContentHash: 'hash_content_v1',
    sourceLocale: 'vi-VN',
    targetLocale: 'vi-VN',
    tone: 'standard',
    tenantId: 'tenant_test',
    productFacts: [{ id: 'f1', fieldPath: 'weight', value: '500g' }],
  };

  const output = await localizeContent(input, { tenantId: 'tenant_test' }, gateway, provider);

  assert.equal(output.status, 'skipped');
  assert.equal(output.title, 'Cà phê Đắk Lắk 500g');
  assert.equal(provider.callCount, 0);
  assert.ok(output.warnings.some((w) => w.includes('Bỏ qua')));
});

test('LC01b: Gọi LLM khi cùng ngôn ngữ nhưng thay đổi tone', async () => {
  let invoked = false;
  const provider = new MockModelProvider(async (_req) => {
    invoked = true;
    return {
      rawJson: {
        title: 'Cà phê Thượng Hạng Đắk Lắk 500g',
        description: 'Tuyệt phẩm cà phê rang mộc dành cho giới mộ điệu, khối lượng 500g.',
        highlights: ['Hương vị tinh tế', '500g'],
        claimMappings: [],
        warnings: [],
      },
      usage: { promptTokens: 80, completionTokens: 40, totalTokens: 120, estimatedCostUsd: 0.0001 },
      providerRequestId: 'req_01b',
    };
  });
  const gateway = new ModelCallGateway({ provider });

  const input = {
    sourceTitle: 'Cà phê Đắk Lắk 500g',
    sourceDescription: 'Cà phê rang mộc chuẩn vị',
    sourceContentHash: 'hash_content_v1',
    sourceLocale: 'vi-VN',
    targetLocale: 'vi-VN',
    tone: 'luxury',
    tenantId: 'tenant_test',
    productFacts: [{ id: 'f1', fieldPath: 'weight', value: '500g' }],
  };

  const output = await localizeContent(input, { tenantId: 'tenant_test' }, gateway, provider);

  assert.equal(invoked, true);
  assert.equal(output.status, 'translated');
  assert.equal(output.title, 'Cà phê Thượng Hạng Đắk Lắk 500g');
  assert.equal(provider.callCount, 1);
});

test('Generator: Dịch sang tiếng Thái với Glossary và bảo toàn facts', async () => {
  const glossaryStore = new InMemoryGlossaryStore();
  glossaryStore.setGlossary('tenant_coffee', 'vi', 'th', 'v1', [
    { sourceTerm: 'Đắk Lắk', targetTerm: 'ดั๊กลัก' },
  ]);

  const provider = new MockModelProvider(async (req) => {
    // Xác nhận payload có chứa glossaryHints và variantFacts
    const payload = req.userPayload;
    assert.ok(payload.glossaryHints.some((h) => h.targetTerm === 'ดั๊กลัก'));
    assert.ok(payload.variantFacts.some((vf) => vf.normalizedNumber === 500));

    return {
      rawJson: {
        title: 'กาแฟ ดั๊กลัก 500g - Tech Startup Coffee',
        description: 'กาแฟคั่วบดแท้ รสชาติเข้มข้น ขนาด 500g จาก Tech Startup Coffee',
        highlights: ['500g', 'Tech Startup Coffee'],
        claimMappings: [
          {
            translatedSegment: 'ขนาด 500g',
            sourceFactId: 'f_weight',
            confidence: 'verified_exact',
          },
        ],
        warnings: [],
      },
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150, estimatedCostUsd: 0.0002 },
      providerRequestId: 'req_th',
    };
  });
  const gateway = new ModelCallGateway({ provider });

  const input = {
    sourceTitle: 'Cà phê Đắk Lắk 500g',
    sourceDescription: 'Cà phê rang mộc Tech Startup Coffee 500g',
    sourceContentHash: 'hash_vietnamese_content',
    sourceLocale: 'vi',
    targetLocale: 'th',
    tenantId: 'tenant_coffee',
    glossaryVersion: 'v1',
    productFacts: [
      { id: 'f_weight', fieldPath: 'weight', value: '500g' },
      { id: 'f_brand', fieldPath: 'brand', value: 'Tech Startup Coffee' },
    ],
  };

  const output = await localizeContent(
    input,
    { tenantId: 'tenant_coffee' },
    gateway,
    provider,
    glossaryStore
  );

  assert.equal(output.status, 'translated');
  assert.equal(output.locale, 'th');
  assert.equal(output.title, 'กาแฟ ดั๊กลัก 500g - Tech Startup Coffee');
  assert.equal(output.claimMappings.length, 1);
  assert.equal(output.claimMappings[0].sourceFactId, 'f_weight');
});
