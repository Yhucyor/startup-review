import { createFactLookup } from './facts.ts';
import type {
  ContentCandidate,
  ContentSnapshot,
  ProductFact,
  RerankingSubScores,
  ScoredCandidate,
} from './types.ts';

const SENSITIVE_PATTERNS = [
  { pattern: /hữu cơ|organic/i, factKeyword: 'hữu cơ', label: 'Chứng nhận hữu cơ' },
  { pattern: /chữa bệnh|trị bệnh|điều trị/i, factKeyword: 'chữa bệnh', label: 'Tuyên bố chữa bệnh y tế' },
  { pattern: /100%\s*tự nhiên/i, factKeyword: 'tự nhiên', label: 'Tuyên bố 100% tự nhiên' },
];

export function scoreCandidate(
  candidate: ContentCandidate,
  facts: ProductFact[],
  snapshot: ContentSnapshot
): { score: number; subScores: RerankingSubScores; reasons: string[] } {
  const reasons: string[] = [];
  const factMap = createFactLookup(facts);
  const allFactValues = facts.map((f) => f.value.toLowerCase()).join(' ');

  // 1. FACT GROUNDING (Trọng số 40%)
  let factScore = 100;
  if (!candidate.claims || candidate.claims.length === 0) {
    factScore -= 40;
    reasons.push('Thiếu danh sách đối chiếu claims có kiểm chứng (-40đ fact)');
  } else {
    let validClaimsCount = 0;
    for (const claim of candidate.claims) {
      if (!claim.sourceRefs || claim.sourceRefs.length === 0) {
        factScore -= 15;
        reasons.push(`Claim "${claim.text.slice(0, 30)}..." không có sourceRefs (-15đ fact)`);
      } else {
        const allRefsValid = claim.sourceRefs.every((ref) => factMap.has(ref));
        if (allRefsValid) {
          validClaimsCount++;
        } else {
          factScore -= 20;
          reasons.push(`Claim "${claim.text.slice(0, 30)}..." có sourceRef không tồn tại trong snapshot (-20đ fact)`);
        }
      }
    }
    const claimRatio = validClaimsCount / candidate.claims.length;
    factScore = Math.max(0, Math.min(100, Math.round(factScore * claimRatio)));
  }

  // 2. POLICY & COMPLIANCE SAFETY (Trọng số 30%)
  let policyScore = 100;
  const fullText = `${candidate.title} ${candidate.description} ${(candidate.highlights || []).join(' ')}`;

  for (const item of SENSITIVE_PATTERNS) {
    if (item.pattern.test(fullText)) {
      const hasBacking = allFactValues.includes(item.factKeyword);
      if (!hasBacking) {
        policyScore -= 50;
        reasons.push(`Tuyên bố chưa kiểm chứng: "${item.label}" (-50đ policy)`);
      }
    }
  }
  policyScore = Math.max(0, policyScore);

  // 3. SEO READINESS (Trọng số 15%)
  let seoScore = 0;
  const titleLen = candidate.title ? candidate.title.trim().length : 0;
  // Độ dài tiêu đề chuẩn e-commerce Shopee/TikTok (40 - 120 ký tự)
  if (titleLen >= 40 && titleLen <= 120) {
    seoScore += 40;
  } else if (titleLen >= 20 && titleLen <= 150) {
    seoScore += 25;
  } else {
    seoScore += 10;
    reasons.push('Độ dài tiêu đề chưa tối ưu chuẩn SEO sàn (-15đ seo)');
  }

  // Thương hiệu nằm trong tiêu đề
  if (snapshot.brand && candidate.title.toLowerCase().includes(snapshot.brand.toLowerCase())) {
    seoScore += 30;
  } else if (!snapshot.brand) {
    seoScore += 30;
  } else {
    reasons.push('Tiêu đề thiếu tên thương hiệu chính thức (-30đ seo)');
  }

  // Có định dạng tiêu mục Markdown
  if (/#{2,3}\s/m.test(candidate.description)) {
    seoScore += 15;
  }
  // Có highlights
  if (Array.isArray(candidate.highlights) && candidate.highlights.length >= 2) {
    seoScore += 15;
  }
  seoScore = Math.min(100, seoScore);

  // 4. READABILITY & STRUCTURE (Trọng số 15%)
  let readabilityScore = 0;
  const descLen = candidate.description ? candidate.description.trim().length : 0;
  if (descLen >= 200 && descLen <= 2500) {
    readabilityScore += 40;
  } else if (descLen > 50) {
    readabilityScore += 20;
  }

  // Bố cục gạch đầu dòng bullet points
  if (/^[-*•]\s+/m.test(candidate.description)) {
    readabilityScore += 30;
  }

  // Tránh nhồi nhét từ khóa lặp lại bất thường
  const words = candidate.title.toLowerCase().split(/\s+/);
  const wordFrequency = new Map<string, number>();
  let hasKeywordStuffing = false;
  for (const w of words) {
    if (w.length > 3) {
      const count = (wordFrequency.get(w) || 0) + 1;
      wordFrequency.set(w, count);
      if (count > 3) hasKeywordStuffing = true;
    }
  }
  if (!hasKeywordStuffing) {
    readabilityScore += 30;
  } else {
    reasons.push('Phát hiện dấu hiệu lặp từ/nhồi nhét từ khóa trong tiêu đề (-30đ readability)');
  }
  readabilityScore = Math.min(100, readabilityScore);

  // Điểm tổng hợp trọng số: Fact (40%) + Policy (30%) + SEO (15%) + Readability (15%)
  const totalScore = Number(
    (
      factScore * 0.4 +
      policyScore * 0.3 +
      seoScore * 0.15 +
      readabilityScore * 0.15
    ).toFixed(2)
  );

  return {
    score: totalScore,
    subScores: {
      factGrounding: factScore,
      policySafety: policyScore,
      seoReadiness: seoScore,
      readability: readabilityScore,
    },
    reasons,
  };
}

/**
 * Tính điểm Reciprocal Rank Fusion (RRF) kết hợp đa bảng xếp hạng
 */
function calculateRrfScores(
  scored: Array<{ candidate: ContentCandidate; score: number; subScores: RerankingSubScores; reasons: string[] }>
): Map<string, number> {
  const k = 60; // Hằng số làm mượt RRF tiêu chuẩn
  const rrfMap = new Map<string, number>();

  const subCriteria: Array<{ key: keyof RerankingSubScores; weight: number }> = [
    { key: 'factGrounding', weight: 1.5 },
    { key: 'policySafety', weight: 1.2 },
    { key: 'seoReadiness', weight: 1.0 },
    { key: 'readability', weight: 1.0 },
  ];

  for (const criterion of subCriteria) {
    const sortedBySub = [...scored].sort(
      (a, b) => b.subScores[criterion.key] - a.subScores[criterion.key]
    );

    sortedBySub.forEach((item, index) => {
      const rank = index + 1;
      const currentRrf = rrfMap.get(item.candidate.id) || 0;
      const rrfIncrement = criterion.weight / (k + rank);
      rrfMap.set(item.candidate.id, currentRrf + rrfIncrement);
    });
  }

  return rrfMap;
}

/**
 * Rerank danh sách các candidates của Agent
 */
export function rerankCandidates(
  candidates: ContentCandidate[],
  facts: ProductFact[],
  snapshot: ContentSnapshot
): { candidates: ScoredCandidate[]; topCandidate: ScoredCandidate } {
  if (candidates.length === 0) {
    throw new Error('Không có candidate nào để rerank');
  }

  // 1. Chấm điểm từng candidate
  const initialScored = candidates.map((candidate) => {
    const evaluation = scoreCandidate(candidate, facts, snapshot);
    return {
      candidate,
      ...evaluation,
    };
  });

  // 2. Tính điểm RRF để kết hợp các xếp hạng con
  const rrfScores = calculateRrfScores(initialScored);

  // 3. Sắp xếp candidates theo tổng điểm kết hợp (Weighted Score + RRF booster)
  const ranked = initialScored
    .map((item) => {
      const rrf = Number((rrfScores.get(item.candidate.id) || 0).toFixed(6));
      return {
        ...item.candidate,
        score: item.score,
        rrfScore: rrf,
        subScores: item.subScores,
        rank: 0,
        reasons: item.reasons,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (b.rrfScore || 0) - (a.rrfScore || 0);
    });

  // 4. Gán số thứ tự xếp hạng (1-indexed)
  const finalCandidates: ScoredCandidate[] = ranked.map((c, idx) => ({
    ...c,
    rank: idx + 1,
  }));

  return {
    candidates: finalCandidates,
    topCandidate: finalCandidates[0],
  };
}
