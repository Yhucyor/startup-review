export interface ProductVariant {
  sku: string;
  name: string;
  price: number;
  weightGrams?: number;
  attributes?: Record<string, string>;
}

export interface ContentSnapshot {
  id: string;
  version: number;
  hash: string;
  title: string;
  brand?: string;
  materials?: string[];
  specifications?: Record<string, string>;
  variants?: ProductVariant[];
  attributes?: Record<string, string>;
  language: string;
}

export interface ContentInput {
  snapshot: ContentSnapshot;
  targetLocale?: string;
  brandVoice?: string;
  sellerInstructions?: string;
  lockedFields?: string[];
  manualDraft?: {
    title?: string;
    description?: string;
  };
}

export interface ProductFact {
  id: string;
  fieldPath: string;
  value: string;
  variantSku?: string;
}

export interface FactClaim {
  text: string;
  outputPath: 'title' | 'description' | 'highlights';
  sourceRefs: string[];
}

export interface ContentCandidate {
  id: string;
  strategy: 'factual_precise' | 'benefit_oriented' | 'seo_rich' | 'seller_fused' | 'default';
  title: string;
  description: string;
  highlights: string[];
  claims: FactClaim[];
  missingFacts?: string[];
  warnings?: string[];
}

export interface RerankingSubScores {
  factGrounding: number;
  policySafety: number;
  seoReadiness: number;
  readability: number;
}

export interface ScoredCandidate extends ContentCandidate {
  score: number;
  rrfScore?: number;
  subScores: RerankingSubScores;
  rank: number;
  reasons: string[];
}

export interface ContentRerankingResult {
  candidates: ScoredCandidate[];
  topCandidate: ScoredCandidate;
}

export interface ContentOutput {
  title: string;
  description: string;
  highlights: string[];
  claims: FactClaim[];
  missingFacts: string[];
  warnings: string[];
  snapshotVersion: number;
  generatedBy: 'ai' | 'human';
  rawCandidates?: ContentCandidate[];
  candidates?: ScoredCandidate[];
  selectionMetadata?: {
    strategy: string;
    score: number;
    rrfScore?: number;
    fused: boolean;
    rank: number;
    candidateCount: number;
  };
}

