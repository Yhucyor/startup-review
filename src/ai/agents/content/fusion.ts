import type {
  ContentCandidate,
  ContentInput,
  ContentOutput,
  FactClaim,
  ProductFact,
  ScoredCandidate,
} from './types.ts';
import { rerankCandidates } from './reranker.ts';

export interface FusionOptions {
  enableAttributeFusion?: boolean;
  minAcceptableScore?: number;
}

/**
 * Trích xuất danh sách candidate từ raw model output
 */
export function extractCandidatePool(
  rawOutput: ContentOutput | Record<string, unknown>,
  input: ContentInput
): ContentCandidate[] {
  const pool: ContentCandidate[] = [];

  // 1. Root candidate từ đầu ra chính của Model
  const rootCandidate: ContentCandidate = {
    id: 'cand_root_model',
    strategy: 'default',
    title: String(rawOutput.title || '').trim(),
    description: String(rawOutput.description || '').trim(),
    highlights: Array.isArray(rawOutput.highlights)
      ? rawOutput.highlights.map(String).map((h) => h.trim())
      : [],
    claims: Array.isArray(rawOutput.claims)
      ? (rawOutput.claims as FactClaim[])
      : [],
    missingFacts: Array.isArray(rawOutput.missingFacts)
      ? rawOutput.missingFacts.map(String)
      : [],
    warnings: Array.isArray(rawOutput.warnings)
      ? rawOutput.warnings.map(String)
      : [],
  };
  pool.push(rootCandidate);

  // 2. Candidates bổ sung
  if ('rawCandidates' in rawOutput && Array.isArray(rawOutput.rawCandidates)) {
    for (const c of rawOutput.rawCandidates) {
      pool.push(c);
    }
  } else if ('candidates' in rawOutput && Array.isArray(rawOutput.candidates)) {
    for (let i = 0; i < rawOutput.candidates.length; i++) {
      const c = rawOutput.candidates[i];
      if (typeof c === 'object' && c !== null) {
        const cObj = c as Record<string, unknown>;
        pool.push({
          id: String(cObj.id || `cand_extra_${i + 1}`),
          strategy: (cObj.strategy as ContentCandidate['strategy']) || 'seo_rich',
          title: String(cObj.title || rootCandidate.title).trim(),
          description: String(cObj.description || rootCandidate.description).trim(),
          highlights: Array.isArray(cObj.highlights)
            ? cObj.highlights.map(String).map((h) => h.trim())
            : rootCandidate.highlights,
          claims: Array.isArray(cObj.claims)
            ? (cObj.claims as FactClaim[])
            : rootCandidate.claims,
          missingFacts: Array.isArray(cObj.missingFacts)
            ? cObj.missingFacts.map(String)
            : [],
          warnings: Array.isArray(cObj.warnings)
            ? cObj.warnings.map(String)
            : [],
        });
      }
    }
  }

  // 3. Nếu người dùng có bản thảo sửa tay (manualDraft), tạo candidate "seller_fused" vào pool
  if (input.manualDraft && (input.manualDraft.title || input.manualDraft.description)) {
    pool.push({
      id: 'cand_seller_draft',
      strategy: 'seller_fused',
      title: input.manualDraft.title || rootCandidate.title,
      description: input.manualDraft.description || rootCandidate.description,
      highlights: rootCandidate.highlights,
      claims: rootCandidate.claims,
      missingFacts: rootCandidate.missingFacts,
      warnings: rootCandidate.warnings,
    });
  }

  return pool;
}

/**
 * Hợp nhất (Fusion) các thuộc tính và claims tốt nhất từ nhiều candidates
 */
export function fuseAttributes(
  topCandidate: ScoredCandidate,
  allCandidates: ScoredCandidate[],
  input: ContentInput
): {
  finalTitle: string;
  finalDescription: string;
  finalHighlights: string[];
  finalClaims: FactClaim[];
  fused: boolean;
} {
  let finalTitle = topCandidate.title;
  let finalDescription = topCandidate.description;
  const finalHighlights = [...topCandidate.highlights];
  let fused = false;

  // 1. Áp dụng lockedFields từ người bán (ưu tiên tuyệt đối lựa chọn thủ công của seller)
  if (input.lockedFields && input.manualDraft) {
    if (input.lockedFields.includes('title') && input.manualDraft.title) {
      finalTitle = input.manualDraft.title;
      fused = true;
    }
    if (input.lockedFields.includes('description') && input.manualDraft.description) {
      finalDescription = input.manualDraft.description;
      fused = true;
    }
  }

  // 2. Fact Fusion: Hợp nhất các claims có sourceRefs hợp lệ từ các candidates điểm cao
  const claimMap = new Map<string, FactClaim>();
  // Nạp claims của top candidate trước
  for (const c of topCandidate.claims) {
    if (c.text && c.sourceRefs && c.sourceRefs.length > 0) {
      claimMap.set(c.text.trim().toLowerCase(), c);
    }
  }

  // Bổ sung các claim từ các candidate khác có điểm factGrounding >= 80
  for (const cand of allCandidates) {
    if (cand.id !== topCandidate.id && cand.subScores.factGrounding >= 80) {
      for (const c of cand.claims) {
        const key = c.text.trim().toLowerCase();
        if (!claimMap.has(key) && c.sourceRefs && c.sourceRefs.length > 0) {
          claimMap.set(key, c);
          fused = true;
        }
      }
    }
  }

  // 3. Highlight Fusion: Bổ sung các điểm nổi bật độc đáo không trùng lặp
  const highlightSet = new Set(finalHighlights.map((h) => h.toLowerCase()));
  for (const cand of allCandidates) {
    if (cand.id !== topCandidate.id && cand.score >= 70) {
      for (const h of cand.highlights) {
        const hKey = h.trim().toLowerCase();
        if (!highlightSet.has(hKey) && finalHighlights.length < 5) {
          highlightSet.add(hKey);
          finalHighlights.push(h.trim());
          fused = true;
        }
      }
    }
  }

  return {
    finalTitle,
    finalDescription,
    finalHighlights,
    finalClaims: Array.from(claimMap.values()),
    fused,
  };
}

/**
 * Thực hiện toàn bộ quy trình Reranking và Fusion cho Agent
 */
export function rerankAndFuseContent(
  rawModelOutput: ContentOutput | Record<string, unknown>,
  input: ContentInput,
  facts: ProductFact[],
  options: FusionOptions = {}
): ContentOutput {
  // 1. Tạo tập pool candidates
  const candidatePool = extractCandidatePool(rawModelOutput, input);

  // 2. Chạy lớp Reranking (Multi-criteria + RRF)
  const { candidates: rankedCandidates, topCandidate } = rerankCandidates(
    candidatePool,
    facts,
    input.snapshot
  );

  // 3. Chạy lớp Attribute & Fact Fusion
  const shouldFuse = options.enableAttributeFusion ?? true;
  const {
    finalTitle,
    finalDescription,
    finalHighlights,
    finalClaims,
    fused,
  } = shouldFuse
    ? fuseAttributes(topCandidate, rankedCandidates, input)
    : {
        finalTitle: topCandidate.title,
        finalDescription: topCandidate.description,
        finalHighlights: topCandidate.highlights,
        finalClaims: topCandidate.claims,
        fused: false,
      };

  // 4. Tổng hợp cảnh báo và missingFacts từ các candidates
  const mergedWarnings = new Set<string>();
  const mergedMissing = new Set<string>();

  for (const c of rankedCandidates) {
    (c.warnings || []).forEach((w) => mergedWarnings.add(w));
    (c.missingFacts || []).forEach((m) => mergedMissing.add(m));
  }

  return {
    title: finalTitle,
    description: finalDescription,
    highlights: finalHighlights,
    claims: finalClaims,
    missingFacts: Array.from(mergedMissing),
    warnings: Array.from(mergedWarnings),
    snapshotVersion: input.snapshot.version,
    generatedBy: 'ai',
    candidates: rankedCandidates,
    selectionMetadata: {
      strategy: topCandidate.strategy,
      score: topCandidate.score,
      rrfScore: topCandidate.rrfScore,
      fused,
      rank: 1,
      candidateCount: rankedCandidates.length,
    },
  };
}
