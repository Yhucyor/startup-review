export type LocalizationStatus = 'translated' | 'skipped' | 'needs_review' | 'failed';

export interface ClaimMapping {
  translatedSegment: string;
  sourceFactId?: string;
  sourceClaimText?: string;
  confidence: 'verified_exact' | 'inferred' | 'unmapped';
}

export interface ProductFactRef {
  id: string;
  fieldPath: string;
  value: string;
  variantSku?: string;
}

export interface LocalizationInput {
  sourceTitle: string;
  sourceDescription: string;
  sourceHighlights?: string[];
  sourceClaims?: Array<{ id?: string; text: string; sourceRefs: string[] }>;
  sourceContentHash: string;
  sourceLocale: string;
  targetLocale: string;
  tone?: string;
  tenantId: string;
  glossaryVersion?: string;
  productFacts: ProductFactRef[];
  isExperimentalLocale?: boolean;
}

export interface LocalizationOutput {
  title: string;
  description: string;
  highlights: string[];
  locale: string;
  status: LocalizationStatus;
  claimMappings: ClaimMapping[];
  untranslatedTerms: string[];
  warnings: string[];
  needsReview: boolean;
  experimental: boolean;
  sourceContentHash: string;
  glossaryVersion?: string;
}

export interface GlossaryEntry {
  sourceTerm: string;
  targetTerm: string;
  domain?: string;
  caseSensitive?: boolean;
}
