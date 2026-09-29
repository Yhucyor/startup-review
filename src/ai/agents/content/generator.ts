import { createHash } from 'node:crypto';
import type {
  IModelProvider,
  ModelCallRequest,
  ModelCallResult,
  RuntimeContext,
} from '../../model-call/types.ts';
import { ModelCallGateway } from '../../model-call/gateway.ts';
import { buildProductFacts } from './facts.ts';
import { CONTENT_PROMPT_VERSION, SYSTEM_PROMPT_PEOPLE_FIRST_SEO } from './prompt.ts';
import type { ContentInput, ContentOutput } from './types.ts';
import { validateContentClaims } from './validator.ts';
import { rerankAndFuseContent } from './fusion.ts';

export async function generateContent(
  input: ContentInput,
  context: RuntimeContext,
  gateway: ModelCallGateway,
  providerOverride?: IModelProvider
): Promise<ContentOutput> {
  const {
    snapshot,
    manualDraft,
    sellerInstructions,
    brandVoice,
    targetLocale,
    lockedFields,
  } = input;

  // 1. Build verified facts from the snapshot
  const facts = buildProductFacts(snapshot);

  // 2. Check seller instructions for sensitive/unsupported claims (Spec C03)
  const initialWarnings: string[] = [];
  const initialMissingFacts: string[] = [];

  if (sellerInstructions) {
    if (/chữa bệnh|trị bệnh|điều trị/i.test(sellerInstructions)) {
      initialWarnings.push(
        'Yêu cầu của người bán chứa nội dung tuyên bố chữa bệnh không có căn cứ pháp lý hoặc chứng nhận y tế'
      );
      initialMissingFacts.push('Chứng nhận hoặc giấy phép y tế đối với công dụng chữa bệnh');
    }
  }

  // 3. Compute deterministic input hash (bao gồm lockedFields và manualDraft để chống cache collision)
  const rawInput = JSON.stringify({
    snapshotId: snapshot.id,
    snapshotVersion: snapshot.version,
    snapshotHash: snapshot.hash,
    targetLocale: targetLocale || snapshot.language,
    brandVoice: brandVoice || 'friendly-professional',
    sellerInstructions: sellerInstructions || '',
    lockedFields: lockedFields || [],
    manualDraft: manualDraft || null,
    factsCount: facts.length,
  });
  const inputHash = createHash('sha256').update(rawInput).digest('hex');

  // 4. Construct request for ModelCallGateway (Block 03)
  const userPayload: Record<string, unknown> = {
    productTitle: snapshot.title,
    brand: snapshot.brand || 'None',
    language: snapshot.language,
    targetLocale: targetLocale || snapshot.language,
    brandVoice: brandVoice || 'Helpful, reliable, authentic e-commerce voice',
    sellerInstructions: sellerInstructions || 'None',
    manualDraft: manualDraft ? { title: manualDraft.title, description: manualDraft.description } : undefined,
    lockedFields: lockedFields && lockedFields.length > 0 ? lockedFields : undefined,
    verifiedFacts: facts.map((f) => ({
      id: f.id,
      field: f.fieldPath,
      value: f.value,
      variantSku: f.variantSku,
    })),
  };

  const request: ModelCallRequest<ContentOutput> = {
    agentName: 'content_writer',
    promptVersion: CONTENT_PROMPT_VERSION,
    schemaVersion: '1.0.0',
    modelConfigId: 'gpt-4o-mini',
    systemInstruction: SYSTEM_PROMPT_PEOPLE_FIRST_SEO,
    userPayload,
    snapshotRef: {
      id: snapshot.id,
      version: snapshot.version,
      hash: snapshot.hash,
    },
    inputHash,
    locale: targetLocale || snapshot.language,
    maxOutputTokens: 1500,
    validateOutput: (raw: unknown) => {
      const res = validateContentClaims(raw, facts, snapshot);
      if (!res.valid || !res.data) {
        return { valid: false, errors: res.errors };
      }
      return { valid: true, data: res.data };
    },
  };

  try {
    const result: ModelCallResult<ContentOutput> = await gateway.callStructuredModel(
      request,
      context,
      providerOverride
    );

    // 5. Fusion & Reranking Pipeline
    const fusedOutput = rerankAndFuseContent(
      result.artifact,
      input,
      facts
    );

    // Merge any initial warnings/missingFacts from pre-checks
    if (initialWarnings.length > 0) {
      fusedOutput.warnings = [...new Set([...fusedOutput.warnings, ...initialWarnings])];
    }
    if (initialMissingFacts.length > 0) {
      fusedOutput.missingFacts = [...new Set([...fusedOutput.missingFacts, ...initialMissingFacts])];
    }

    return fusedOutput;
  } catch (err) {
    // If model call fails and manual draft is available, caller can fall back to manual draft
    throw err;
  }
}
