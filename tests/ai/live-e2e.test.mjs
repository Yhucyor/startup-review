import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateContent,
  buildProductFacts,
} from '../../src/ai/agents/content/index.ts';
import {
  ModelCallGateway,
  OpenAIModelProvider,
} from '../../src/ai/model-call/index.ts';
import {
  PrepareListingOrchestrator,
  InMemoryCheckpointer,
} from '../../src/ai/workflows/prepare-listing/index.ts';

const OPENAI_KEY = process.env.OPENAI_API_KEY;

test('LIVE E2E: Kiểm tra kết nối OpenAI trực tiếp với API key thực tế', async (t) => {
  if (!OPENAI_KEY) {
    t.skip('Bỏ qua vì không có OPENAI_API_KEY trong môi trường');
    return;
  }

  const provider = new OpenAIModelProvider();
  assert.ok(provider.getApiKey(), 'API key phải được tải thành công');

  const req = {
    agentName: 'connectivity_probe',
    promptVersion: '1.0.0',
    schemaVersion: '1.0.0',
    modelConfigId: 'gpt-4o-mini',
    inputHash: 'hash_probe',
    snapshotRef: { id: 'probe_01', version: 1, hash: 'h_probe' },
    userPayload: { prompt: 'Trả về JSON ngắn gọn: {"status": "ok", "provider": "openai"}' },
    validateOutput: (raw) => ({ valid: true, data: raw }),
  };

  const ctx = {
    tenantId: 'tenant_live_probe',
    mode: 'live',
    runId: `run_probe_${Date.now()}`,
    stepId: 'step_probe',
    attemptId: 1,
    deadlineMs: Date.now() + 15000,
    timeoutMs: 15000,
  };

  const response = await provider.call(req, ctx);

  assert.ok(response.rawJson, 'Phải nhận được payload JSON từ OpenAI');
  assert.ok(response.providerRequestId.startsWith('chatcmpl-'), 'ID phản hồi phải từ OpenAI');
  assert.ok(response.usage.inputTokens > 0, 'Số input tokens phải lớn hơn 0');
  assert.ok(response.usage.outputTokens > 0, 'Số output tokens phải lớn hơn 0');
  assert.ok(response.usage.estimatedCostUsd >= 0, 'Ước tính chi phí USD phải hợp lệ');
});

test('LIVE E2E: Content Agent - Chạy trọn vẹn 5 bước với dữ liệu thật từ OpenAI gpt-4o-mini', async (t) => {
  if (!OPENAI_KEY) {
    t.skip('Bỏ qua vì không có OPENAI_API_KEY');
    return;
  }

  // Bước 1: Chuẩn bị Product Snapshot thực tế của sản phẩm thương mại điện tử
  const productSnapshot = {
    id: 'prod_cafe_daklak_real',
    version: 1,
    hash: 'hash_daklak_v1_real',
    title: 'Cà phê Robusta Đắk Lắk Nguyên Chất An Nhiên 500g',
    brand: 'An Nhiên Coffee',
    language: 'vi',
    variants: [
      { sku: 'CF-ROB-500', name: 'Gói 500g rang mộc', price: 125000, weightGrams: 500 },
    ],
    specifications: {
      origin: 'Đắk Lắk, Việt Nam',
      roast_level: 'Rang mộc vừa (Medium Roast)',
      processing: 'Chế biến khô truyền thống phơi giàn',
      caffeine: 'Khoảng 2.0% - 2.5%',
    },
  };

  // Xác minh trích xuất facts chuẩn xác trước khi gọi model
  const facts = buildProductFacts(productSnapshot);
  assert.ok(facts.length >= 4, `Số facts trích xuất phải >= 4 (thực tế: ${facts.length})`);
  const brandFact = facts.find((f) => f.id === 'fact-brand');
  assert.equal(brandFact?.value, 'An Nhiên Coffee');

  // Bước 2, 3, 4, 5: Khởi tạo Gateway ở chế độ live
  const gateway = new ModelCallGateway({ liveApiKeyConfigured: true });

  const runtimeCtx = {
    tenantId: 'tenant_synchro_live',
    mode: 'live',
    runId: `run_live_agent_${Date.now()}`,
    stepId: 'step_content_generation',
    attemptId: 1,
    deadlineMs: Date.now() + 30000,
    timeoutMs: 30000,
  };

  const agentInput = {
    snapshot: productSnapshot,
    sellerInstructions: 'Tập trung vào hương vị cà phê mộc đậm đà Tây Nguyên, thích hợp pha phin truyền thống.',
    brandVoice: 'Chân thật, gần gũi, chuyên nghiệp chuẩn e-commerce',
    targetLocale: 'vi',
  };

  // Thực thi Agent trực tiếp
  const startTime = Date.now();
  const output = await generateContent(agentInput, runtimeCtx, gateway);
  const durationMs = Date.now() - startTime;
  assert.ok(durationMs > 0, 'Thời gian thực thi phải > 0');

  // Kiểm tra kết quả thực tế từ OpenAI
  assert.ok(output, 'Agent phải trả về kết quả');
  assert.equal(output.generatedBy, 'ai', 'Được sinh bởi AI thật');
  assert.equal(output.snapshotVersion, 1, 'Snapshot version phải khớp version 1');
  assert.ok(output.title.length > 10, 'Tiêu đề sinh ra phải có độ dài hợp lý');
  assert.ok(output.description.length > 50, 'Mô tả sinh ra phải đầy đủ');
  assert.ok(Array.isArray(output.highlights) && output.highlights.length > 0, 'Có highlights');
  assert.ok(Array.isArray(output.claims) && output.claims.length > 0, 'Phải có danh sách claims đối chiếu facts');

  // Đảm bảo từng claim đều có sourceRef hợp lệ trỏ về facts có thật
  const factIdSet = new Set(facts.map((f) => f.id));
  for (const claim of output.claims) {
    assert.ok(claim.text.length > 0, 'Nội dung claim không được rỗng');
    assert.ok(claim.sourceRefs.length > 0, `Claim "${claim.text}" phải có sourceRefs`);
    for (const ref of claim.sourceRefs) {
      assert.ok(
        factIdSet.has(ref),
        `SourceRef "${ref}" của AI phải nằm trong tập facts gốc: ${[...factIdSet].join(', ')}`
      );
    }
  }

  // Đảm bảo không bị hallucinate claim nhạy cảm
  assert.equal(
    output.warnings.some((w) => w.includes('chữa bệnh')),
    false,
    'Không được có cảnh báo chữa bệnh vì người bán không yêu cầu trái phép'
  );

  // Đảm bảo Gateway đã commit chi phí thực vào ledger
  const budget = gateway.getBudgetLedger().getBalance('tenant_synchro_live');
  assert.ok(budget.spentUsd > 0, 'Chi phí USD thực tế phải được ghi nhận vào Ledger');
  assert.equal(budget.reservedUsd, 0, 'Khoản reserve ban đầu phải được giải phóng sau khi commit');
});

test('LIVE E2E: Guardrail & Policy Check - Phát hiện yêu cầu nhạy cảm của người bán qua LLM thật', async (t) => {
  if (!OPENAI_KEY) {
    t.skip('Bỏ qua vì không có OPENAI_API_KEY');
    return;
  }

  const productSnapshot = {
    id: 'prod_tra_thao_moc',
    version: 1,
    hash: 'hash_tra_v1',
    title: 'Trà Thảo Mộc Hoa Cúc Tự Nhiên 100g',
    brand: 'Mộc Trà Quán',
    language: 'vi',
    variants: [
      { sku: 'TRA-CUC-100G', name: 'Túi zip 100g', price: 65000, weightGrams: 100 },
    ],
    specifications: {
      origin: 'Hà Giang, Việt Nam',
      ingredients: '100% hoa cúc sấy lạnh nguyên bông',
    },
  };

  const gateway = new ModelCallGateway({ liveApiKeyConfigured: true });

  const runtimeCtx = {
    tenantId: 'tenant_policy_test',
    mode: 'live',
    runId: `run_policy_${Date.now()}`,
    stepId: 'step_policy_check',
    attemptId: 1,
    deadlineMs: Date.now() + 30000,
    timeoutMs: 30000,
  };

  // Người bán cố tình đưa ra yêu cầu vi phạm y tế
  const agentInput = {
    snapshot: productSnapshot,
    sellerInstructions: 'Quảng cáo là trà này điều trị dứt điểm mất ngủ kinh niên và chữa bệnh đau đầu mãn tính',
    brandVoice: 'Thuyết phục mạnh mẽ',
    targetLocale: 'vi',
  };

  const output = await generateContent(agentInput, runtimeCtx, gateway);

  // Phải bắt được cảnh báo pháp lý và ghi nhận vào warnings / missingFacts
  assert.ok(
    output.warnings.some((w) => /chữa bệnh|trị bệnh|điều trị/i.test(w)),
    'Phải phát hiện và gắn cảnh báo về tuyên bố chữa bệnh không căn cứ'
  );
  assert.ok(
    output.missingFacts.some((mf) => /chứng nhận|giấy phép y tế/i.test(mf)),
    'Phải yêu cầu giấy phép y tế trong missingFacts'
  );
});

test('LIVE E2E: Workflow Orchestrator - Tích hợp Content Agent chạy OpenAI thật qua toàn bộ DAG', async (t) => {
  if (!OPENAI_KEY) {
    t.skip('Bỏ qua vì không có OPENAI_API_KEY');
    return;
  }

  const checkpointer = new InMemoryCheckpointer();
  const gateway = new ModelCallGateway({ liveApiKeyConfigured: true });

  const productSnapshot = {
    id: 'prod_honey_forest',
    version: 2,
    hash: 'hash_honey_v2',
    title: 'Mật Ong Rừng U Minh Nguyên Chất Chai 500ml',
    brand: 'U Minh Forest Food',
    language: 'vi',
    variants: [
      { sku: 'HONEY-500ML', name: 'Chai thủy tinh 500ml', price: 250000, weightGrams: 700 },
    ],
    specifications: {
      origin: 'Cà Mau, Việt Nam',
      volume: '500ml',
      moisture: 'Dưới 19%',
    },
  };

  // Tích hợp trực tiếp hàm generateContent thật của Content Agent vào Orchestrator DAG
  const orchestrator = new PrepareListingOrchestrator({
    checkpointer,
    handlers: {
      content: async (snap, state) => {
        const ctx = {
          tenantId: state.tenantId,
          mode: 'live',
          runId: state.runId,
          stepId: 'step_orchestrator_content',
          attemptId: 1,
          deadlineMs: Date.now() + 30000,
          timeoutMs: 30000,
        };

        const res = await generateContent(
          {
            snapshot: {
              id: snap.id,
              version: snap.version,
              hash: snap.hash,
              title: snap.title,
              brand: snap.attributes?.brand || 'U Minh Forest Food',
              language: snap.language,
              variants: snap.variants || [
                { sku: 'HONEY-500ML', name: 'Chai 500ml', price: 250000, weightGrams: 700 },
              ],
              specifications: snap.attributes || {},
            },
            sellerInstructions: 'Nhấn mạnh mật ong tự nhiên, khai thác bền vững từ hoa tràm.',
            brandVoice: 'Tin cậy, thuần tự nhiên',
            targetLocale: state.targetLocale,
          },
          ctx,
          gateway
        );

        return {
          title: res.title,
          description: res.description,
          highlights: res.highlights,
          claims: res.claims,
        };
      },
      keywords: async () => {
        // Node keywords chạy song song
        return ['#matongrung', '#matongnguyenchat', '#uminh', '#dacsancamau'];
      },
    },
  });

  const workflowInput = {
    eventId: 'evt_live_orchestration_001',
    tenantId: 'tenant_live_company',
    mode: 'live',
    store: 'Shopee Mall U Minh Official',
    targetLocale: 'vi',
    intent: 'prepare_listing',
    productSnapshot: {
      id: productSnapshot.id,
      version: productSnapshot.version,
      hash: productSnapshot.hash,
      title: productSnapshot.title,
      description: 'Mật ong rừng thu hoạch tự nhiên tại rừng U Minh Hạ.',
      attributes: {
        brand: productSnapshot.brand,
        origin: 'Cà Mau, Việt Nam',
        volume: '500ml',
      },
      language: 'vi',
      variants: productSnapshot.variants,
    },
  };

  // 1. Bắt đầu chạy workflow
  const runningState = await orchestrator.start(workflowInput);

  // Đảm bảo workflow đã hoàn thành các bước tự động và dừng lại ở waiting_approval (Human-in-the-loop)
  assert.equal(runningState.status, 'waiting_approval');
  assert.ok(runningState.artifacts.contentData, 'Content sinh từ OpenAI thật phải có trong artifact');
  assert.ok(runningState.artifacts.contentData.title.length > 10);
  assert.ok(runningState.artifacts.assembledData, 'Dữ liệu tổng hợp (Assembled) phải hoàn tất');
  assert.ok(runningState.artifacts.reviewData?.approved, 'Review nội bộ phải đạt chuẩn');
  assert.ok(runningState.artifacts.proposalId, 'Đã tạo bản đề xuất (Proposal) chờ duyệt');

  // 2. Tiếp tục bước Human-in-the-loop: Phê duyệt đề xuất
  const resumeState = await orchestrator.resume(runningState.runId, {
    proposalId: runningState.artifacts.proposalId,
    approvedBy: 'admin_seller_vn',
    approvedAt: new Date().toISOString(),
  });

  assert.equal(resumeState.status, 'completed', 'Workflow phải đạt trạng thái completed sau phê duyệt');
  assert.ok(resumeState.completedNodes.includes('policy_approved'), 'Đã thông qua chặng duyệt chính sách');
});
