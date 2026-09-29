import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateContent,
  buildProductFacts,
} from '../../src/ai/agents/content/index.ts';
import {
  ModelCallGateway,
  SchemaValidationError,
  TimeoutError,
} from '../../src/ai/model-call/index.ts';

class MockProvider {
  constructor(generator, delayMs = 0) {
    this.generator = generator;
    this.delayMs = delayMs;
  }

  async call(req, ctx) {
    if (this.delayMs > 0) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, this.delayMs);
        if (ctx.signal) {
          ctx.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('AbortError: Operation aborted'));
          });
        }
      });
    }

    if (ctx.signal?.aborted) {
      throw new Error('AbortError: Operation aborted');
    }

    const rawJson = this.generator(req, ctx);
    return {
      rawJson,
      usage: { inputTokens: 200, outputTokens: 100, estimatedCostUsd: 0.0001 },
      providerRequestId: `mock_content_${Date.now()}`,
    };
  }
}

function createDummySnapshot(overrides = {}) {
  return {
    id: 'prod_coffee_101',
    version: 2,
    hash: 'hash_coffee_v2',
    title: 'Cà phê Robusta Đắk Lắk An Nhiên 250 g',
    brand: 'An Nhiên Coffee',
    language: 'vi',
    variants: [
      { sku: 'CF-250G', name: 'Túi 250g', price: 95000, weightGrams: 250 },
      { sku: 'CF-500G', name: 'Túi 500g', price: 180000, weightGrams: 500 },
    ],
    specifications: {
      origin: 'Đắk Lắk, Việt Nam',
      roast_level: 'Đậm đà truyền thống',
    },
    ...overrides,
  };
}

function createDummyContext(overrides = {}) {
  return {
    tenantId: 'tenant_synchro_vn',
    mode: 'live',
    runId: 'run_content_test',
    stepId: 'step_generate_content',
    attemptId: 1,
    deadlineMs: Date.now() + 5000,
    ...overrides,
  };
}

test('C01: Có tên và 250g, không có chứng nhận: từ chối claim "hữu cơ được chứng nhận" không nguồn', async () => {
  const snapshot = createDummySnapshot();
  const gateway = new ModelCallGateway({ liveApiKeyConfigured: true });

  const mockProvider = new MockProvider(() => ({
    title: 'Cà phê Robusta hữu cơ được chứng nhận An Nhiên 250g',
    description: 'Cà phê hữu cơ nguyên chất không hóa chất.',
    highlights: ['100% hữu cơ organic'],
    claims: [
      { text: '250 g', outputPath: 'title', sourceRefs: ['fact-variant-cf-250g-weight'] },
    ],
    missingFacts: [],
    warnings: [],
  }));

  const input = { snapshot };
  const ctx = createDummyContext();

  await assert.rejects(
    async () => {
      await generateContent(input, ctx, gateway, mockProvider);
    },
    (err) => {
      assert.ok(err instanceof SchemaValidationError);
      assert.ok(
        err.validationErrors.some((e) => e.includes('Chứng nhận hữu cơ (Organic)'))
      );
      return true;
    }
  );
});

test('C02: Hai biến thể có khối lượng khác nhau: mỗi claim gắn đúng biến thể, phân biệt 250g và 500g', async () => {
  const snapshot = createDummySnapshot();
  const facts = buildProductFacts(snapshot);

  const fact250 = facts.find((f) => f.id === 'fact-variant-cf-250g-weight');
  const fact500 = facts.find((f) => f.id === 'fact-variant-cf-500g-weight');
  assert.ok(fact250 && fact250.value === '250g');
  assert.ok(fact500 && fact500.value === '500g');

  const gateway = new ModelCallGateway({ liveApiKeyConfigured: true });
  const mockProvider = new MockProvider(() => ({
    title: 'Cà phê Robusta Đắk Lắk An Nhiên - Lựa chọn 250g hoặc 500g',
    description: 'Hạt cà phê Robusta rang mộc thơm ngon từ vùng Đắk Lắk. Có 2 quy cách đóng gói: túi 250g và túi 500g.',
    highlights: ['Túi 250g giá 95.000đ', 'Túi 500g giá 180.000đ'],
    claims: [
      { text: '250g', outputPath: 'highlights', sourceRefs: ['fact-variant-cf-250g-weight'] },
      { text: '500g', outputPath: 'highlights', sourceRefs: ['fact-variant-cf-500g-weight'] },
      { text: '95000 VND', outputPath: 'highlights', sourceRefs: ['fact-variant-cf-250g-price'] },
      { text: '180000 VND', outputPath: 'highlights', sourceRefs: ['fact-variant-cf-500g-price'] },
    ],
    missingFacts: [],
    warnings: [],
  }));

  const input = { snapshot };
  const ctx = createDummyContext();

  const output = await generateContent(input, ctx, gateway, mockProvider);
  assert.equal(output.claims.length, 4);
  assert.equal(output.claims[0].sourceRefs[0], 'fact-variant-cf-250g-weight');
  assert.equal(output.claims[1].sourceRefs[0], 'fact-variant-cf-500g-weight');
  assert.equal(output.snapshotVersion, 2);
  assert.equal(output.generatedBy, 'ai');
});

test('C03: Seller yêu cầu thêm "chữa bệnh": phát hiện và thêm vào warnings/missingFacts', async () => {
  const snapshot = createDummySnapshot();
  const gateway = new ModelCallGateway({ liveApiKeyConfigured: true });

  const mockProvider = new MockProvider(() => ({
    title: 'Cà phê Robusta Đắk Lắk An Nhiên 250g',
    description: 'Cà phê đậm đà giúp bạn tỉnh táo mỗi buổi sáng.',
    highlights: ['Cà phê nguyên chất Đắk Lắk'],
    claims: [
      { text: 'An Nhiên Coffee', outputPath: 'title', sourceRefs: ['fact-brand'] },
    ],
    missingFacts: [],
    warnings: [],
  }));

  const input = {
    snapshot,
    sellerInstructions: 'Hãy viết rằng cà phê này chữa bệnh đau dạ dày và giảm béo cấp tốc',
  };
  const ctx = createDummyContext();

  const output = await generateContent(input, ctx, gateway, mockProvider);
  assert.ok(output.warnings.some((w) => w.includes('chữa bệnh')));
  assert.ok(output.missingFacts.some((mf) => mf.includes('Chứng nhận hoặc giấy phép y tế')));
});

test('C04: Model timeout: bản sửa tay của người dùng được giữ nguyên', async () => {
  const snapshot = createDummySnapshot();
  const gateway = new ModelCallGateway({
    liveApiKeyConfigured: true,
    defaultTimeoutMs: 50,
  });

  const hangingProvider = new MockProvider(() => ({}), 200);

  const manualDraft = {
    title: 'Bản thảo tiêu đề do người bán tự đặt',
    description: 'Mô tả viết tay sẵn có',
  };

  const input = {
    snapshot,
    manualDraft,
  };
  const ctx = createDummyContext({ timeoutMs: 50 });

  // When model times out, it throws TimeoutError
  await assert.rejects(
    async () => {
      await generateContent(input, ctx, gateway, hangingProvider);
    },
    (err) => {
      assert.ok(err instanceof TimeoutError);
      return true;
    }
  );

  // Manual draft remains completely untouched
  assert.equal(manualDraft.title, 'Bản thảo tiêu đề do người bán tự đặt');
  assert.equal(manualDraft.description, 'Mô tả viết tay sẵn có');
});

test('C05: AI bịa source ID: validator từ chối và báo lỗi', async () => {
  const snapshot = createDummySnapshot();
  const gateway = new ModelCallGateway({ liveApiKeyConfigured: true });

  const hallucinatingProvider = new MockProvider(() => ({
    title: 'Cà phê Robusta Đắk Lắk An Nhiên 250g',
    description: 'Mô tả sản phẩm',
    highlights: ['Đặc sản vùng cao'],
    claims: [
      { text: 'Chứng nhận FDA Hoa Kỳ', outputPath: 'description', sourceRefs: ['fact-hallucinated-fda-cert'] },
    ],
    missingFacts: [],
    warnings: [],
  }));

  const input = { snapshot };
  const ctx = createDummyContext();

  await assert.rejects(
    async () => {
      await generateContent(input, ctx, gateway, hallucinatingProvider);
    },
    (err) => {
      assert.ok(err instanceof SchemaValidationError);
      assert.ok(
        err.validationErrors.some((e) =>
          e.includes('fact-hallucinated-fda-cert') && e.includes('does not exist')
        )
      );
      return true;
    }
  );
});

test('C06: Snapshot version được gắn chặt chẽ vào output artifact', async () => {
  const snapshotV2 = createDummySnapshot({ version: 2 });
  const gateway = new ModelCallGateway({ liveApiKeyConfigured: true });

  const mockProvider = new MockProvider(() => ({
    title: 'Cà phê Robusta Đắk Lắk An Nhiên 250g',
    description: 'Hương vị đậm đà nguyên bản từ Đắk Lắk',
    highlights: ['Rang mộc thủ công'],
    claims: [
      { text: 'An Nhiên Coffee', outputPath: 'title', sourceRefs: ['fact-brand'] },
    ],
    missingFacts: [],
    warnings: [],
  }));

  const input = { snapshot: snapshotV2 };
  const ctx = createDummyContext();

  const output = await generateContent(input, ctx, gateway, mockProvider);
  assert.equal(output.snapshotVersion, 2);
  // It is bound to version 2, not version 3
  assert.notEqual(output.snapshotVersion, 3);
});
