export type WorkflowStatus =
  | 'queued'
  | 'running'
  | 'waiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'superseded';

export type WorkflowIntent = 'prepare_listing' | 'rewrite_content' | 'retry_step';

export interface ProductSnapshot {
  id: string;
  version: number;
  hash: string;
  title: string;
  description: string;
  attributes: Record<string, string>;
  language: string;
}

export interface WorkflowInput {
  eventId: string;
  tenantId: string;
  mode: 'live' | 'demo';
  store: string;
  targetLocale: string;
  intent: WorkflowIntent;
  productSnapshot: ProductSnapshot;
}

export interface ContentArtifact {
  title: string;
  description: string;
}

export interface LocalizationArtifact {
  title: string;
  description: string;
  locale: string;
}

export interface AssembledArtifact {
  title: string;
  description: string;
  hashtags: string[];
}

export interface ReviewArtifact {
  approved: boolean;
  score: number;
  issues: string[];
}

export interface ProposalArtifact {
  proposalId: string;
  targetStore: string;
  locale: string;
  title: string;
  description: string;
  hashtags: string[];
  createdAt: string;
}

export interface WorkflowArtifacts {
  contentId?: string;
  contentData?: ContentArtifact;
  keywordsId?: string;
  keywordsData?: string[];
  localizationId?: string;
  localizationData?: LocalizationArtifact;
  assembledId?: string;
  assembledData?: AssembledArtifact;
  reviewId?: string;
  reviewData?: ReviewArtifact;
  proposalId?: string;
  proposalData?: ProposalArtifact;
}

export interface WorkflowState {
  runId: string;
  eventId: string;
  workflowVersion: string;
  tenantId: string;
  mode: 'live' | 'demo';
  intent: WorkflowIntent;
  store: string;
  targetLocale: string;
  status: WorkflowStatus;
  snapshotRef: {
    id: string;
    version: number;
    hash: string;
  };
  selectedNodes: string[];
  completedNodes: string[];
  artifacts: WorkflowArtifacts;
  warnings: string[];
  attemptCounters: Record<string, number>;
  checkpointVersion: number;
  cancelRequested: boolean;
  error?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface ApprovalEvent {
  proposalId: string;
  approvedBy: string;
  approvedAt: string;
}

export interface ICheckpointer {
  save(state: WorkflowState): Promise<void>;
  load(runId: string): Promise<WorkflowState | null>;
  listByTenant(tenantId: string): Promise<WorkflowState[]>;
}
