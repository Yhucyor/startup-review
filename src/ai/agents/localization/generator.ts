import { createHash } from 'node:crypto';
import type {
  IModelProvider,
  ModelCallRequest,
  ModelCallResult,
  RuntimeContext,
} from '../../model-call/types.ts';
import { ModelCallGateway } from '../../model-call/gateway.ts';
import { defaultGlossaryStore, InMemoryGlossaryStore } from './glossary.ts';
import { extractVariantFacts } from './protected-tokens.ts';
import { validateLocalizedOutput } from './validator.ts';
import { LOCALIZATION_PROMPT_VERSION, SYSTEM_PROMPT_LOCALIZATION } from './prompt.ts';
import type { LocalizationInput, LocalizationOutput } from './types.ts';

export async function localizeContent(
  input: LocalizationInput,
  context: RuntimeContext,
  gateway: ModelCallGateway,
  providerOverride?: IModelProvider,
  glossaryStore: InMemoryGlossaryStore = defaultGlossaryStore
): Promise<LocalizationOutput> {
  const {
    sourceTitle,
    sourceDescription,
    sourceHighlights = [],
    sourceClaims = [],
    sourceContentHash,
    sourceLocale,
    targetLocale,
    tone,
    tenantId,
    glossaryVersion,
    productFacts = [],
    isExperimentalLocale = false,
  } = input;

  // 1. Pure Skip có điều kiện (LC01): Cùng locale VÀ tone không thay đổi
  const isSameLocale = sourceLocale.toLowerCase() === targetLocale.toLowerCase();
  const isToneUnchanged = !tone || tone === 'standard' || tone === 'default';

  if (isSameLocale && isToneUnchanged) {
    return {
      title: sourceTitle,
      description: sourceDescription,
      highlights: sourceHighlights,
      locale: targetLocale,
      status: 'skipped',
      claimMappings: [],
      untranslatedTerms: [],
      warnings: ['Bỏ qua bước gọi LLM do cùng ngôn ngữ và không yêu cầu đổi giọng văn'],
      needsReview: false,
      experimental: false,
      sourceContentHash,
      glossaryVersion,
    };
  }

  // 2. Trích xuất thông số bảo vệ và biến thể
  const bundle = extractVariantFacts(
    {
      id: sourceContentHash,
      title: sourceTitle,
    },
    productFacts
  );

  // 3. Tra cứu thuật ngữ từ glossary của tenant
  const glossaryEntries = glossaryStore.getGlossary(
    tenantId,
    sourceLocale,
    targetLocale,
    glossaryVersion
  );
  const fullSourceText = `${sourceTitle} ${sourceDescription} ${sourceHighlights.join(' ')}`;
  const glossaryHints = glossaryStore.findMatchingEntries(fullSourceText, glossaryEntries);

  // 4. Tính toán mã băm đầu vào chống va chạm cache (Deterministic Cache Key)
  const rawInput = JSON.stringify({
    sourceContentHash,
    sourceLocale: sourceLocale.toLowerCase(),
    targetLocale: targetLocale.toLowerCase(),
    tone: tone || 'standard',
    glossaryVersion: glossaryVersion || 'default_v1',
    factsCount: productFacts.length,
    hintsCount: glossaryHints.length,
  });
  const inputHash = createHash('sha256').update(rawInput).digest('hex');

  // 5. Chuẩn bị payload gửi tới ModelCallGateway
  const userPayload: Record<string, unknown> = {
    sourceTitle,
    sourceDescription,
    sourceHighlights,
    sourceClaims: sourceClaims.map((c) => ({
      id: c.id,
      text: c.text,
      sourceRefs: c.sourceRefs,
    })),
    sourceLocale,
    targetLocale,
    tone: tone || 'Natural e-commerce seller voice',
    brand: bundle.brand || 'None',
    skus: bundle.skus,
    variantFacts: bundle.variantFacts.map((vf) => ({
      id: vf.id,
      variantSku: vf.variantSku,
      attributeKey: vf.attributeKey,
      rawValue: vf.rawValue,
      normalizedNumber: vf.normalizedNumber,
      normalizedUnit: vf.normalizedUnit,
    })),
    lockedTokens: bundle.rawLockedTokens,
    glossaryHints: glossaryHints.map((gh) => ({
      sourceTerm: gh.sourceTerm,
      targetTerm: gh.targetTerm,
    })),
  };

  const request: ModelCallRequest<LocalizationOutput> = {
    agentName: 'localization_agent',
    promptVersion: LOCALIZATION_PROMPT_VERSION,
    schemaVersion: '1.0.0',
    modelConfigId: 'gpt-4o-mini',
    systemInstruction: SYSTEM_PROMPT_LOCALIZATION,
    userPayload,
    snapshotRef: {
      id: sourceContentHash,
      version: 1,
      hash: inputHash,
    },
    inputHash,
    locale: targetLocale,
    maxOutputTokens: 2000,
    validateOutput: (raw: unknown) => {
      const candidate = raw as Partial<LocalizationOutput>;
      if (!candidate || typeof candidate.title !== 'string' || typeof candidate.description !== 'string') {
        return {
          valid: false,
          errors: ['Bản dịch thiếu tiêu đề (title) hoặc mô tả (description) hợp lệ'],
        };
      }

      const formattedOutput = {
        title: candidate.title,
        description: candidate.description,
        highlights: Array.isArray(candidate.highlights) ? candidate.highlights : [],
        claimMappings: Array.isArray(candidate.claimMappings) ? candidate.claimMappings : [],
      };

      const valRes = validateLocalizedOutput(formattedOutput, bundle, productFacts);
      if (!valRes.valid) {
        return { valid: false, errors: valRes.errors };
      }

      const finalOutput: LocalizationOutput = {
        title: formattedOutput.title,
        description: formattedOutput.description,
        highlights: formattedOutput.highlights,
        locale: targetLocale,
        status: valRes.needsReview ? 'needs_review' : 'translated',
        claimMappings: formattedOutput.claimMappings,
        untranslatedTerms: Array.isArray(candidate.untranslatedTerms) ? candidate.untranslatedTerms : [],
        warnings: [...(candidate.warnings || []), ...valRes.warnings],
        needsReview: valRes.needsReview,
        experimental: isExperimentalLocale,
        sourceContentHash,
        glossaryVersion,
      };

      return { valid: true, data: finalOutput };
    },
  };

  const result: ModelCallResult<LocalizationOutput> = await gateway.callStructuredModel(
    request,
    context,
    providerOverride
  );

  return result.artifact;
}
