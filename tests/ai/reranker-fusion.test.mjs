import test from 'node:test';
import assert from 'node:assert/strict';

import {
  scoreCandidate,
  rerankCandidates,
  rerankAndFuseContent,
  buildProductFacts,
} from '../../src/ai/agents/content/index.ts';

function createDummySnapshot(overrides = {}) {
  return {
    id: 'prod_coffee_fusion_101',
    version: 1,
    hash: 'hash_fusion_v1',
    title: 'Cà phê Robusta Đắk Lắk An Nhiên 250g',
    brand: 'An Nhiên Coffee',
    language: 'vi',
    variants: [
      { sku: 'CF-250G', name: 'Túi 250g', price: 95000, weightGrams: 250 },
    ],
    specifications: {
      origin: 'Đắk Lắk, Việt Nam',
      roast_level: 'Rang mộc đậm đà',
    },
    ...overrides,
  };
}

test('RF01: Reranker chấm điểm và ưu tiên candidate có Fact Grounding cao hơn candidate thiếu nguồn', () => {
  const snapshot = createDummySnapshot();
  const facts = buildProductFacts(snapshot);

  const candidateGrounded = {
    id: 'cand_grounded',
    strategy: 'factual_precise',
    title: 'Cà phê Robusta Đắk Lắk An Nhiên 250g - Chuẩn Vị Tây Nguyên',
    description: 'Hương vị cà phê nguyên chất Đắk Lắk được rang mộc tỉ mỉ.\n\n### Thông tin sản phẩm\n- Xuất xứ: Đắk Lắk\n- Trọng lượng: 250g',
    highlights: ['Rang mộc nguyên chất', 'Túi 250g tiện lợi'],
    claims: [
      { text: 'An Nhiên Coffee', outputPath: 'title', sourceRefs: ['fact-brand'] },
      { text: '250g', outputPath: 'description', sourceRefs: ['fact-variant-cf-250g-weight'] },
    ],
  };

  const candidateUngrounded = {
    id: 'cand_ungrounded',
    strategy: 'seo_rich',
    title: 'Cà phê Robusta siêu thơm ngon giá rẻ nhất thị trường',
    description: 'Cà phê thơm ngon mua ngay hôm nay.',
    highlights: ['Siêu rẻ'],
    claims: [
      { text: 'Giá rẻ nhất thị trường', outputPath: 'description', sourceRefs: [] }, // Không có sourceRefs
    ],
  };

  const evalGrounded = scoreCandidate(candidateGrounded, facts, snapshot);
  const evalUngrounded = scoreCandidate(candidateUngrounded, facts, snapshot);

  assert.ok(evalGrounded.subScores.factGrounding > evalUngrounded.subScores.factGrounding);
  assert.ok(evalGrounded.score > evalUngrounded.score);

  const { candidates, topCandidate } = rerankCandidates(
    [candidateUngrounded, candidateGrounded],
    facts,
    snapshot
  );

  assert.equal(topCandidate.id, 'cand_grounded');
  assert.equal(candidates[0].rank, 1);
  assert.equal(candidates[1].rank, 2);
});

test('RF02: Policy Safety: Phạt nặng ứng viên chứa claim nhạy cảm chưa kiểm chứng, đẩy xuống rank dưới', () => {
  const snapshot = createDummySnapshot();
  const facts = buildProductFacts(snapshot);

  const candidateSafe = {
    id: 'cand_safe',
    strategy: 'factual_precise',
    title: 'Cà phê Robusta Đắk Lắk An Nhiên 250g Thơm Ngon Hảo Hạng',
    description: 'Cà phê mộc nguyên chất giúp tỉnh táo bắt đầu ngày mới năng động.\n\n### Chi tiết\n- Đóng gói 250g',
    highlights: ['Nguyên chất Đắk Lắk', 'Tỉnh táo sảng khoái'],
    claims: [
      { text: 'An Nhiên Coffee', outputPath: 'title', sourceRefs: ['fact-brand'] },
    ],
  };

  const candidateViolating = {
    id: 'cand_violating',
    strategy: 'benefit_oriented',
    title: 'Cà phê Robusta Đắk Lắk An Nhiên 250g Chữa Bệnh Đau Đầu',
    description: 'Cà phê thần dược đặc trị bệnh đau dạ dày và mất ngủ kinh niên.',
    highlights: ['Chữa bệnh hiệu quả'],
    claims: [
      { text: 'An Nhiên Coffee', outputPath: 'title', sourceRefs: ['fact-brand'] },
    ],
  };

  const evalSafe = scoreCandidate(candidateSafe, facts, snapshot);
  const evalViolating = scoreCandidate(candidateViolating, facts, snapshot);

  assert.equal(evalSafe.subScores.policySafety, 100);
  assert.equal(evalViolating.subScores.policySafety, 50);
  assert.ok(evalViolating.reasons.some((r) => r.includes('chữa bệnh y tế')));

  const { topCandidate } = rerankCandidates([candidateViolating, candidateSafe], facts, snapshot);
  assert.equal(topCandidate.id, 'cand_safe');
});

test('RF03: Reciprocal Rank Fusion (RRF): Tính toán rrfScore kết hợp đa bảng xếp hạng', () => {
  const snapshot = createDummySnapshot();
  const facts = buildProductFacts(snapshot);

  const candidates = [
    {
      id: 'cand_1',
      strategy: 'factual_precise',
      title: 'Cà phê Robusta Đắk Lắk An Nhiên 250g - Lựa Chọn Hàng Đầu',
      description: 'Cà phê rang mộc chuẩn gu Việt Nam.\n\n### Đặc điểm\n- Trọng lượng 250g',
      highlights: ['Chuẩn gu Việt', 'Túi 250g'],
      claims: [{ text: '250g', outputPath: 'description', sourceRefs: ['fact-variant-cf-250g-weight'] }],
    },
    {
      id: 'cand_2',
      strategy: 'benefit_oriented',
      title: 'Cà phê Robusta An Nhiên 250g - Khởi Đầu Năng Lượng Tỉnh Táo',
      description: 'Đem lại năng lượng làm việc hứng khởi mỗi buổi sáng.\n\n### Điểm nổi bật\n- Hương vị đậm đà',
      highlights: ['Tỉnh táo', 'Năng lượng'],
      claims: [{ text: 'An Nhiên Coffee', outputPath: 'title', sourceRefs: ['fact-brand'] }],
    },
  ];

  const { candidates: ranked, topCandidate } = rerankCandidates(candidates, facts, snapshot);
  assert.ok(ranked.length === 2);
  assert.ok(typeof topCandidate.rrfScore === 'number' && topCandidate.rrfScore > 0);
  assert.ok(ranked[0].rank === 1 && ranked[1].rank === 2);
});

test('RF04: Attribute Fusion: Áp dụng lockedFields từ manualDraft (không bị AI ghi đè)', () => {
  const snapshot = createDummySnapshot();
  const facts = buildProductFacts(snapshot);

  const rawOutput = {
    title: 'Tiêu đề do AI đề xuất ban đầu',
    description: 'Mô tả chi tiết do AI sinh ra rất hay.\n\n### Thông tin\n- Đậm đà thơm ngon',
    highlights: ['Điểm nổi bật 1', 'Điểm nổi bật 2'],
    claims: [
      { text: 'An Nhiên Coffee', outputPath: 'title', sourceRefs: ['fact-brand'] },
    ],
  };

  const input = {
    snapshot,
    lockedFields: ['title'],
    manualDraft: {
      title: 'Tiêu đề Người Bán Tự Đặt Bắt Buộc Giữ Nguyên',
      description: 'Mô tả viết tay sơ sài',
    },
  };

  const fusedResult = rerankAndFuseContent(rawOutput, input, facts);

  // Tiêu đề bị khóa phải được giữ nguyên từ manualDraft
  assert.equal(fusedResult.title, 'Tiêu đề Người Bán Tự Đặt Bắt Buộc Giữ Nguyên');
  // Mô tả không bị khóa nên lấy mô tả chất lượng của AI
  assert.ok(fusedResult.description.includes('Mô tả chi tiết do AI sinh ra'));
  assert.equal(fusedResult.selectionMetadata?.fused, true);
  assert.equal(fusedResult.selectionMetadata?.rank, 1);
});

test('RF05: Fact Fusion: Hợp nhất claims có kiểm chứng từ nhiều candidates chất lượng', () => {
  const snapshot = createDummySnapshot();
  const facts = buildProductFacts(snapshot);

  const rawOutput = {
    title: 'Cà phê Robusta Đắk Lắk An Nhiên 250g - Hảo Hạng',
    description: 'Mô tả sản phẩm chuẩn chỉnh.\n\n### Xuất xứ\n- Vùng Đắk Lắk',
    highlights: ['Rang mộc 100%'],
    claims: [
      { text: '250g', outputPath: 'title', sourceRefs: ['fact-variant-cf-250g-weight'] },
    ],
    candidates: [
      {
        id: 'cand_extra_origin',
        strategy: 'factual_precise',
        title: 'Cà phê Đắk Lắk An Nhiên 250g',
        description: 'Mô tả biến thể 2',
        highlights: ['Thơm nồng nàn'],
        claims: [
          { text: 'Đắk Lắk, Việt Nam', outputPath: 'description', sourceRefs: ['fact-spec-origin'] },
        ],
      },
    ],
  };

  const input = { snapshot };
  const fusedResult = rerankAndFuseContent(rawOutput, input, facts);

  assert.equal(fusedResult.claims.length, 2, 'Phải hợp nhất cả 2 claims đã kiểm chứng');
  const claimRefs = fusedResult.claims.flatMap((c) => c.sourceRefs);
  assert.ok(claimRefs.includes('fact-variant-cf-250g-weight'));
  assert.ok(claimRefs.includes('fact-spec-origin'));
  assert.ok(fusedResult.selectionMetadata && fusedResult.selectionMetadata.candidateCount >= 2);
});
