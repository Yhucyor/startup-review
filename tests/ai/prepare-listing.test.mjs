import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PrepareListingOrchestrator,
  InMemoryCheckpointer,
} from '../../src/ai/workflows/prepare-listing/index.ts';

function createDummySnapshot(overrides = {}) {
  return {
    id: 'prod_999',
    version: 1,
    hash: 'hash_snapshot_v1',
    title: 'Cà phê Phin Đắk Lắk 500g',
    description: 'Hạt cà phê Robusta rang mộc chuẩn vị truyền thống',
    attributes: {
      brand: 'Tech Startup Coffee',
      weight: '500g',
      roast: 'Dark',
    },
    language: 'vi',
    ...overrides,
  };
}

function createDummyInput(overrides = {}) {
  return {
    eventId: 'evt_001',
    tenantId: 'tenant_synchro_vn',
    mode: 'demo',
    store: 'Shopee Official Store',
    targetLocale: 'th',
    intent: 'prepare_listing',
    productSnapshot: createDummySnapshot(),
    ...overrides,
  };
}

test('O01: Chỉ viết lại tiếng Việt: Content 1, Localization 0', async () => {
  const orchestrator = new PrepareListingOrchestrator();
  const input = createDummyInput({
    targetLocale: 'vi', // Same as snapshot.language ('vi')
    intent: 'rewrite_content',
    productSnapshot: createDummySnapshot({ language: 'vi' }),
  });

  const state = await orchestrator.start(input);

  assert.equal(orchestrator.nodeCallCounts.content, 1);
  assert.equal(orchestrator.nodeCallCounts.localization, 0);
  assert.ok(state.selectedNodes.includes('content'));
  assert.ok(!state.selectedNodes.includes('localization'));
  assert.equal(state.status, 'waiting_approval');
  assert.ok(state.artifacts.proposalData);
});

test('O02: Content 300ms và Keywords 300ms khởi động song song', async () => {
  let contentStarted = false;
  let keywordsStarted = false;
  let bothStartedConcurrently = false;

  const orchestrator = new PrepareListingOrchestrator({
    handlers: {
      content: async (snap) => {
        contentStarted = true;
        if (keywordsStarted) bothStartedConcurrently = true;
        await new Promise((resolve) => setTimeout(resolve, 80));
        return {
          title: `${snap.title} - Tối ưu SEO`,
          description: `${snap.description} - Chuẩn thương mại điện tử`,
        };
      },
      keywords: async () => {
        keywordsStarted = true;
        if (contentStarted) bothStartedConcurrently = true;
        await new Promise((resolve) => setTimeout(resolve, 80));
        return ['#caphe', '#robusta', '#daklak'];
      },
    },
  });

  const input = createDummyInput({
    targetLocale: 'vi',
    intent: 'rewrite_content',
  });

  const startTime = Date.now();
  const state = await orchestrator.start(input);
  const elapsed = Date.now() - startTime;

  assert.ok(bothStartedConcurrently, 'Content and keywords nodes must execute concurrently');
  assert.ok(elapsed < 150, `Expected elapsed < 150ms for parallel execution, got ${elapsed}ms`);
  assert.equal(orchestrator.nodeCallCounts.content, 1);
  assert.equal(orchestrator.nodeCallCounts.keywords, 1);
  assert.equal(state.status, 'waiting_approval');
});

test('O03: Localization lỗi, Content/Keywords được giữ, retry chỉ chạy lại Localization', async () => {
  let localizationAttempt = 0;

  const orchestrator = new PrepareListingOrchestrator({
    handlers: {
      localization: async (content, targetLocale) => {
        localizationAttempt++;
        if (localizationAttempt === 1) {
          throw new Error('Translation API temporarily unavailable');
        }
        return {
          title: `[TH] ${content.title}`,
          description: `[TH] ${content.description}`,
          locale: targetLocale,
        };
      },
    },
  });

  const input = createDummyInput({
    targetLocale: 'th',
    intent: 'prepare_listing',
  });

  // First run fails at localization
  await assert.rejects(
    async () => {
      await orchestrator.start(input);
    },
    (err) => {
      assert.ok(err.message.includes('Translation API temporarily unavailable'));
      return true;
    }
  );

  const checkpointer = orchestrator.getCheckpointer();
  const runs = await checkpointer.listByTenant(input.tenantId);
  const failedState = runs[0];

  assert.equal(failedState.status, 'failed');
  assert.ok(failedState.completedNodes.includes('content'));
  assert.ok(failedState.completedNodes.includes('keywords'));
  assert.ok(!failedState.completedNodes.includes('localization'));
  assert.ok(failedState.artifacts.contentData);
  assert.ok(failedState.artifacts.keywordsData);

  // Reset counts to test retry scope
  orchestrator.resetCounts();

  // Retry step 'localization'
  const recoveredState = await orchestrator.retryStep(
    failedState.runId,
    'localization',
    input.productSnapshot
  );

  // Content and Keywords were NOT re-called
  assert.equal(orchestrator.nodeCallCounts.content, 0);
  assert.equal(orchestrator.nodeCallCounts.keywords, 0);
  assert.equal(orchestrator.nodeCallCounts.localization, 1);
  assert.equal(recoveredState.status, 'waiting_approval');
  assert.ok(recoveredState.artifacts.localizationData);
  assert.ok(recoveredState.artifacts.proposalData);
});

test('O04: Restart tại waiting_approval giữ nguyên state, không có action trước duyệt', async () => {
  const checkpointer = new InMemoryCheckpointer();
  const orchestrator = new PrepareListingOrchestrator({ checkpointer });
  const input = createDummyInput();

  const state1 = await orchestrator.start(input);
  assert.equal(state1.status, 'waiting_approval');
  assert.ok(state1.artifacts.proposalId);

  // Simulate worker restart: reload state from checkpointer
  const loadedState = await checkpointer.load(state1.runId);
  assert.ok(loadedState);
  assert.equal(loadedState.status, 'waiting_approval');
  assert.equal(loadedState.artifacts.proposalId, state1.artifacts.proposalId);
  assert.equal(loadedState.completedNodes.includes('policy_approved'), false);
  assert.equal(loadedState.approvedBy, undefined);
});

test('O05: Hai approval event giống nhau: một resume có hiệu lực, một action duy nhất', async () => {
  const orchestrator = new PrepareListingOrchestrator();
  const input = createDummyInput();

  const state = await orchestrator.start(input);
  const proposalId = state.artifacts.proposalId;

  const approvalEvent = {
    proposalId,
    approvedBy: 'seller_admin_nam',
    approvedAt: new Date().toISOString(),
  };

  // First approval event resumes and completes workflow
  const resumed1 = await orchestrator.resume(state.runId, approvalEvent);
  assert.equal(resumed1.status, 'completed');
  assert.equal(resumed1.approvedBy, 'seller_admin_nam');
  assert.ok(resumed1.completedNodes.includes('policy_approved'));

  // Duplicate approval event arrives
  const resumed2 = await orchestrator.resume(state.runId, approvalEvent);
  assert.equal(resumed2.status, 'completed');
  assert.equal(resumed2.checkpointVersion, resumed1.checkpointVersion);
});

test('O06: Product đổi snapshot giữa hai nhánh: đánh dấu superseded', async () => {
  const orchestrator = new PrepareListingOrchestrator();
  const input = createDummyInput();

  const state = await orchestrator.start(input);
  assert.equal(state.status, 'waiting_approval');

  // Product updated to version 2 in background
  const result = await orchestrator.supersedeIfSnapshotChanged(state.runId, 2);
  assert.equal(result.superseded, true);
  assert.equal(result.state.status, 'superseded');
  assert.ok(result.state.error.includes('Snapshot changed from v1 to v2'));
});

test('O07: Cancel khi LLM đang chạy: kết quả về muộn không kích hoạt gửi sàn hoặc proposal active', async () => {
  const orchestrator = new PrepareListingOrchestrator({
    handlers: {
      content: async () => {
        // Slow content generation
        await new Promise((resolve) => setTimeout(resolve, 80));
        return {
          title: 'Late Title',
          description: 'Late Description',
        };
      },
    },
  });

  const input = createDummyInput();
  const startPromise = orchestrator.start(input);

  // Send cancel while execution is in-flight
  await new Promise((resolve) => setTimeout(resolve, 20));
  const runs = await orchestrator.getCheckpointer().listByTenant(input.tenantId);
  await orchestrator.cancel(runs[0].runId);

  const finalState = await startPromise;
  assert.equal(finalState.status, 'cancelled');
  assert.equal(finalState.completedNodes.includes('create_proposal'), false);
  assert.equal(finalState.completedNodes.includes('policy'), false);
  assert.equal(finalState.artifacts.proposalId, undefined);
});
