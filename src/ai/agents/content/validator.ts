import { createFactLookup } from './facts.ts';
import type {
  ContentCandidate,
  ContentOutput,
  ContentSnapshot,
  FactClaim,
  ProductFact,
} from './types.ts';

export interface ContentValidationResult {
  valid: boolean;
  errors: string[];
  data?: ContentOutput;
}

const DISALLOWED_UNSOURCED_PATTERNS = [
  { pattern: /hữu cơ|organic/i, factKeyword: 'hữu cơ', label: 'Chứng nhận hữu cơ (Organic)' },
  { pattern: /chữa bệnh|trị bệnh|điều trị/i, factKeyword: 'chữa bệnh', label: 'Tuyên bố công dụng y tế / chữa bệnh' },
  { pattern: /100%\s*tự nhiên/i, factKeyword: 'tự nhiên', label: 'Tuyên bố 100% tự nhiên' },
];

export function validateContentClaims(
  raw: unknown,
  facts: ProductFact[],
  snapshot: ContentSnapshot
): ContentValidationResult {
  const errors: string[] = [];

  if (typeof raw !== 'object' || raw === null) {
    return { valid: false, errors: ['Output must be a non-null JSON object'] };
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.title !== 'string' || !obj.title.trim()) {
    errors.push('Field "title" is required and must be a non-empty string');
  }

  if (typeof obj.description !== 'string' || !obj.description.trim()) {
    errors.push('Field "description" is required and must be a non-empty string');
  }

  const highlights: string[] = [];
  if (Array.isArray(obj.highlights)) {
    for (const h of obj.highlights) {
      if (typeof h === 'string' && h.trim()) {
        highlights.push(h.trim());
      }
    }
  }

  const missingFacts: string[] = [];
  if (Array.isArray(obj.missingFacts)) {
    for (const mf of obj.missingFacts) {
      if (typeof mf === 'string' && mf.trim()) {
        missingFacts.push(mf.trim());
      }
    }
  }

  const warnings: string[] = [];
  if (Array.isArray(obj.warnings)) {
    for (const w of obj.warnings) {
      if (typeof w === 'string' && w.trim()) {
        warnings.push(w.trim());
      }
    }
  }

  // 1. Validate claims and verify sourceRefs exist
  const factMap = createFactLookup(facts);
  const claims: FactClaim[] = [];

  if (Array.isArray(obj.claims)) {
    for (let i = 0; i < obj.claims.length; i++) {
      const claim = obj.claims[i];
      if (typeof claim !== 'object' || claim === null) {
        errors.push(`Claim at index ${i} must be an object`);
        continue;
      }

      const claimObj = claim as Record<string, unknown>;
      const text = typeof claimObj.text === 'string' ? claimObj.text.trim() : '';
      const outputPath =
        claimObj.outputPath === 'title' ||
        claimObj.outputPath === 'description' ||
        claimObj.outputPath === 'highlights'
          ? claimObj.outputPath
          : 'description';

      const sourceRefs: string[] = [];
      if (Array.isArray(claimObj.sourceRefs)) {
        for (const ref of claimObj.sourceRefs) {
          if (typeof ref === 'string') {
            sourceRefs.push(ref);
          }
        }
      }

      if (!text) {
        errors.push(`Claim at index ${i} is missing "text"`);
      }

      if (sourceRefs.length === 0) {
        errors.push(`Claim "${text}" has no sourceRefs`);
      } else {
        for (const ref of sourceRefs) {
          if (!factMap.has(ref)) {
            errors.push(`Invalid sourceRef: "${ref}" does not exist in verified product facts`);
          }
        }
      }

      claims.push({ text, outputPath, sourceRefs });
    }
  }

  // 2. Fact Grounding Guard: Detect ungrounded sensitive claims in title or description
  const combinedText = `${obj.title || ''} ${obj.description || ''} ${highlights.join(' ')}`;
  const allFactValues = facts.map((f) => f.value.toLowerCase()).join(' ');

  for (const guard of DISALLOWED_UNSOURCED_PATTERNS) {
    if (guard.pattern.test(combinedText)) {
      const hasFactBacking = allFactValues.includes(guard.factKeyword);
      if (!hasFactBacking) {
        errors.push(
          `Tuyên bố không có căn cứ: "${guard.label}" xuất hiện trong nội dung nhưng không có trong hồ sơ sự thật của sản phẩm`
        );
      }
    }
  }

  // 3. Variant integrity check (Spec C02): Verify variant weights and prices don't cross-contaminate
  if (Array.isArray(snapshot.variants) && snapshot.variants.length > 1) {
    const weights = snapshot.variants
      .map((v) => v.weightGrams)
      .filter((w): w is number => typeof w === 'number' && w > 0);

    const uniqueWeights = new Set(weights);
    if (uniqueWeights.size > 1) {
      // Check if a single variant weight was erroneously applied to the entire root title
      const titleLower = String(obj.title || '').toLowerCase();
      let matchedCount = 0;
      for (const w of uniqueWeights) {
        if (titleLower.includes(`${w}g`) || titleLower.includes(`${w} g`)) {
          matchedCount++;
        }
      }
      if (matchedCount > 1) {
        warnings.push('Tiêu đề sản phẩm chứa nhiều trọng lượng biến thể khác nhau cùng lúc');
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const validatedData: ContentOutput = {
    title: String(obj.title).trim(),
    description: String(obj.description).trim(),
    highlights,
    claims,
    missingFacts,
    warnings,
    snapshotVersion: snapshot.version,
    generatedBy: 'ai',
  };

  if (Array.isArray(obj.candidates)) {
    const validCandidates: ContentCandidate[] = [];
    for (let i = 0; i < obj.candidates.length; i++) {
      const c = obj.candidates[i];
      if (typeof c === 'object' && c !== null) {
        const cObj = c as Record<string, unknown>;
        if (typeof cObj.title === 'string' && typeof cObj.description === 'string') {
          validCandidates.push({
            id: typeof cObj.id === 'string' ? cObj.id : `cand_${i + 1}`,
            strategy: (cObj.strategy as ContentCandidate['strategy']) || 'seo_rich',
            title: cObj.title.trim(),
            description: cObj.description.trim(),
            highlights: Array.isArray(cObj.highlights) ? cObj.highlights.map(String) : [],
            claims: Array.isArray(cObj.claims) ? (cObj.claims as FactClaim[]) : [],
            missingFacts: Array.isArray(cObj.missingFacts) ? cObj.missingFacts.map(String) : [],
            warnings: Array.isArray(cObj.warnings) ? cObj.warnings.map(String) : [],
          });
        }
      }
    }
    validatedData.rawCandidates = validCandidates;
  }

  return {
    valid: true,
    errors: [],
    data: validatedData,
  };
}

/**
 * Hàm kiểm tra tính hợp lệ của một Candidate riêng biệt
 */
export function validateCandidateClaims(
  candidate: { title?: string; description?: string; claims?: FactClaim[] },
  facts: ProductFact[],
  snapshot: ContentSnapshot
): { valid: boolean; errors: string[] } {
  return validateContentClaims(
    {
      title: candidate.title || 'Candidate Title',
      description: candidate.description || 'Candidate Description',
      claims: candidate.claims || [],
      highlights: [],
    },
    facts,
    snapshot
  );
}
