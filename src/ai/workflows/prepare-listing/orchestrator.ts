import { randomUUID } from 'node:crypto';
import { InMemoryCheckpointer } from './checkpointer.ts';
import { localizeContent } from '../../agents/localization/index.ts';
import { ModelCallGateway } from '../../model-call/index.ts';
import type {
  ApprovalEvent,
  AssembledArtifact,
  ContentArtifact,
  ICheckpointer,
  LocalizationArtifact,
  ProductSnapshot,
  ProposalArtifact,
  ReviewArtifact,
  WorkflowInput,
  WorkflowState,
} from './types.ts';

export interface NodeHandlers {
  content?: (snapshot: ProductSnapshot, state: WorkflowState) => Promise<ContentArtifact>;
  keywords?: (snapshot: ProductSnapshot, state: WorkflowState) => Promise<string[]>;
  localization?: (
    content: ContentArtifact,
    targetLocale: string,
    state: WorkflowState
  ) => Promise<LocalizationArtifact>;
  review?: (assembled: AssembledArtifact, state: WorkflowState) => Promise<ReviewArtifact>;
}

export class PrepareListingOrchestrator {
  private checkpointer: ICheckpointer;
  private handlers: NodeHandlers;
  private gateway: ModelCallGateway;
  public nodeCallCounts: Record<string, number> = {
    content: 0,
    keywords: 0,
    localization: 0,
    review: 0,
  };

  constructor(options?: {
    checkpointer?: ICheckpointer;
    handlers?: NodeHandlers;
    gateway?: ModelCallGateway;
  }) {
    this.checkpointer = options?.checkpointer ?? new InMemoryCheckpointer();
    this.handlers = options?.handlers ?? {};
    this.gateway = options?.gateway ?? new ModelCallGateway();
  }

  public getCheckpointer(): ICheckpointer {
    return this.checkpointer;
  }

  public resetCounts(): void {
    this.nodeCallCounts = {
      content: 0,
      keywords: 0,
      localization: 0,
      review: 0,
    };
  }

  private computeSelectedNodes(input: WorkflowInput): string[] {
    const nodes: string[] = ['load_snapshot', 'content'];

    if (input.intent !== 'retry_step') {
      nodes.push('keywords');
    }

    // Localization only runs if target locale differs from snapshot language AND intent is not rewrite_content
    const isDifferentLanguage = input.targetLocale.toLowerCase() !== input.productSnapshot.language.toLowerCase();
    if (isDifferentLanguage && input.intent !== 'rewrite_content') {
      nodes.push('localization');
    }

    nodes.push('assemble', 'review', 'create_proposal', 'policy');
    return nodes;
  }

  public async start(input: WorkflowInput): Promise<WorkflowState> {
    const selectedNodes = this.computeSelectedNodes(input);
    const runId = `run_${randomUUID()}`;

    const initialState: WorkflowState = {
      runId,
      eventId: input.eventId,
      workflowVersion: '1.0.0',
      tenantId: input.tenantId,
      mode: input.mode,
      intent: input.intent,
      store: input.store,
      targetLocale: input.targetLocale,
      status: 'running',
      snapshotRef: {
        id: input.productSnapshot.id,
        version: input.productSnapshot.version,
        hash: input.productSnapshot.hash,
      },
      selectedNodes,
      completedNodes: ['load_snapshot'],
      artifacts: {},
      warnings: [],
      attemptCounters: {},
      checkpointVersion: 0,
      cancelRequested: false,
    };

    await this.checkpointer.save(initialState);
    return this.executeDag(initialState, input.productSnapshot);
  }

  public async resume(runId: string, approval: ApprovalEvent): Promise<WorkflowState> {
    const state = await this.checkpointer.load(runId);
    if (!state) {
      throw new Error(`Run ${runId} not found`);
    }

    // Idempotency check: if already completed, do nothing and return
    if (state.status === 'completed') {
      return state;
    }

    if (state.status !== 'waiting_approval') {
      throw new Error(`Cannot resume workflow in status ${state.status}`);
    }

    if (state.artifacts.proposalId !== approval.proposalId) {
      throw new Error(
        `Proposal ID mismatch: expected ${state.artifacts.proposalId}, got ${approval.proposalId}`
      );
    }

    state.approvedBy = approval.approvedBy;
    state.approvedAt = approval.approvedAt;
    state.status = 'completed';
    state.completedNodes.push('policy_approved');

    await this.checkpointer.save(state);
    return state;
  }

  public async cancel(runId: string): Promise<WorkflowState> {
    const state = await this.checkpointer.load(runId);
    if (!state) {
      throw new Error(`Run ${runId} not found`);
    }

    state.cancelRequested = true;
    if (state.status === 'running' || state.status === 'queued') {
      state.status = 'cancelled';
    }

    await this.checkpointer.save(state);
    return state;
  }

  public async supersedeIfSnapshotChanged(
    runId: string,
    currentSnapshotVersion: number
  ): Promise<{ superseded: boolean; state: WorkflowState }> {
    const state = await this.checkpointer.load(runId);
    if (!state) {
      throw new Error(`Run ${runId} not found`);
    }

    if (state.snapshotRef.version !== currentSnapshotVersion) {
      state.status = 'superseded';
      state.error = `Snapshot changed from v${state.snapshotRef.version} to v${currentSnapshotVersion}`;
      await this.checkpointer.save(state);
      return { superseded: true, state };
    }

    return { superseded: false, state };
  }

  public async retryStep(
    runId: string,
    stepName: string,
    snapshot: ProductSnapshot
  ): Promise<WorkflowState> {
    const state = await this.checkpointer.load(runId);
    if (!state) {
      throw new Error(`Run ${runId} not found`);
    }

    // Downstream order
    const pipelineOrder = ['content', 'keywords', 'localization', 'assemble', 'review', 'create_proposal', 'policy'];
    const stepIndex = pipelineOrder.indexOf(stepName);

    if (stepIndex === -1) {
      throw new Error(`Unknown step ${stepName}`);
    }

    // Retain outputs before stepIndex, clear step and downstream
    const nodesToClear = pipelineOrder.slice(stepIndex);
    state.completedNodes = state.completedNodes.filter((node) => !nodesToClear.includes(node));
    state.status = 'running';
    delete state.error;

    if (nodesToClear.includes('localization')) {
      delete state.artifacts.localizationId;
      delete state.artifacts.localizationData;
    }
    if (nodesToClear.includes('assemble')) {
      delete state.artifacts.assembledId;
      delete state.artifacts.assembledData;
    }
    if (nodesToClear.includes('review')) {
      delete state.artifacts.reviewId;
      delete state.artifacts.reviewData;
    }
    if (nodesToClear.includes('create_proposal') || nodesToClear.includes('policy')) {
      delete state.artifacts.proposalId;
      delete state.artifacts.proposalData;
      delete state.approvedBy;
      delete state.approvedAt;
    }

    await this.checkpointer.save(state);
    return this.executeDag(state, snapshot);
  }

  private async isCancelled(state: WorkflowState): Promise<boolean> {
    if (state.cancelRequested) return true;
    const persisted = await this.checkpointer.load(state.runId);
    if (persisted?.cancelRequested) {
      state.cancelRequested = true;
      state.status = 'cancelled';
      return true;
    }
    return false;
  }

  private async executeDag(
    state: WorkflowState,
    snapshot: ProductSnapshot
  ): Promise<WorkflowState> {
    if (await this.isCancelled(state)) {
      state.status = 'cancelled';
      await this.checkpointer.save(state);
      return state;
    }

    try {
      // 1. Parallel execution: content and keywords
      const parallelTasks: Promise<void>[] = [];

      if (
        state.selectedNodes.includes('content') &&
        !state.completedNodes.includes('content')
      ) {
        parallelTasks.push(
          (async () => {
            this.nodeCallCounts.content++;
            state.attemptCounters.content = (state.attemptCounters.content || 0) + 1;
            const content = this.handlers.content
              ? await this.handlers.content(snapshot, state)
              : {
                  title: `${snapshot.title} - Tối ưu Shopee`,
                  description: `${snapshot.description} - Chuẩn SEO`,
                };
            // Late check for cancellation
            if (await this.isCancelled(state)) return;
            state.artifacts.contentId = `art_content_${Date.now()}`;
            state.artifacts.contentData = content;
            state.completedNodes.push('content');
          })()
        );
      }

      if (
        state.selectedNodes.includes('keywords') &&
        !state.completedNodes.includes('keywords')
      ) {
        parallelTasks.push(
          (async () => {
            this.nodeCallCounts.keywords++;
            state.attemptCounters.keywords = (state.attemptCounters.keywords || 0) + 1;
            const keywords = this.handlers.keywords
              ? await this.handlers.keywords(snapshot, state)
              : ['#shopee', '#sale', '#chinhhang'];
            // Late check for cancellation
            if (await this.isCancelled(state)) return;
            state.artifacts.keywordsId = `art_keywords_${Date.now()}`;
            state.artifacts.keywordsData = keywords;
            state.completedNodes.push('keywords');
          })()
        );
      }

      await Promise.all(parallelTasks);

      if (await this.isCancelled(state)) {
        state.status = 'cancelled';
        await this.checkpointer.save(state);
        return state;
      }
      await this.checkpointer.save(state);

      // 2. Localization node (if selected and not completed)
      if (
        state.selectedNodes.includes('localization') &&
        !state.completedNodes.includes('localization')
      ) {
        this.nodeCallCounts.localization++;
        state.attemptCounters.localization = (state.attemptCounters.localization || 0) + 1;

        if (!state.artifacts.contentData) {
          throw new Error('Content artifact missing for localization');
        }

        let localized: LocalizationArtifact;
        if (this.handlers.localization) {
          localized = await this.handlers.localization(
            state.artifacts.contentData,
            state.targetLocale,
            state
          );
        } else {
          const facts = Object.entries(snapshot.attributes || {}).map(([k, v], idx) => ({
            id: `fact_${idx}`,
            fieldPath: k,
            value: v,
          }));

          const locOutput = await localizeContent(
            {
              sourceTitle: state.artifacts.contentData.title,
              sourceDescription: state.artifacts.contentData.description,
              sourceHighlights: state.artifacts.contentData.highlights,
              sourceClaims: state.artifacts.contentData.claims,
              sourceContentHash: state.artifacts.contentData.contentHash || state.snapshotRef.hash,
              sourceLocale: state.artifacts.contentData.sourceLocale || snapshot.language,
              targetLocale: state.targetLocale,
              tenantId: state.tenantId,
              productFacts: facts,
            },
            {
              tenantId: state.tenantId,
              mode: state.mode,
              runId: state.runId,
              stepId: 'localization',
              attemptId: state.attemptCounters.localization || 1,
              deadlineMs: Date.now() + 30000,
            },
            this.gateway
          );

          localized = {
            title: locOutput.title,
            description: locOutput.description,
            highlights: locOutput.highlights,
            locale: locOutput.locale,
            status: locOutput.status,
            claimMappings: locOutput.claimMappings,
            untranslatedTerms: locOutput.untranslatedTerms,
            warnings: locOutput.warnings,
            needsReview: locOutput.needsReview,
            experimental: locOutput.experimental,
            sourceContentHash: locOutput.sourceContentHash,
            glossaryVersion: locOutput.glossaryVersion,
          };
        }

        if (await this.isCancelled(state)) {
          state.status = 'cancelled';
          await this.checkpointer.save(state);
          return state;
        }

        state.artifacts.localizationId = `art_loc_${Date.now()}`;
        state.artifacts.localizationData = localized;
        state.completedNodes.push('localization');
        await this.checkpointer.save(state);
      }

      // 3. Assemble node
      if (
        state.selectedNodes.includes('assemble') &&
        !state.completedNodes.includes('assemble')
      ) {
        if (await this.isCancelled(state)) {
          state.status = 'cancelled';
          await this.checkpointer.save(state);
          return state;
        }

        const baseContent =
          state.artifacts.localizationData || state.artifacts.contentData;
        if (!baseContent) {
          throw new Error('No content available to assemble');
        }

        const assembled: AssembledArtifact = {
          title: baseContent.title,
          description: baseContent.description,
          hashtags: state.artifacts.keywordsData || [],
        };

        state.artifacts.assembledId = `art_assemble_${Date.now()}`;
        state.artifacts.assembledData = assembled;
        state.completedNodes.push('assemble');
        await this.checkpointer.save(state);
      }

      // 4. Review node
      if (
        state.selectedNodes.includes('review') &&
        !state.completedNodes.includes('review')
      ) {
        if (await this.isCancelled(state)) {
          state.status = 'cancelled';
          await this.checkpointer.save(state);
          return state;
        }

        this.nodeCallCounts.review++;
        state.attemptCounters.review = (state.attemptCounters.review || 0) + 1;

        const review = this.handlers.review
          ? await this.handlers.review(state.artifacts.assembledData!, state)
          : { approved: true, score: 95, issues: [] };

        state.artifacts.reviewId = `art_review_${Date.now()}`;
        state.artifacts.reviewData = review;
        state.completedNodes.push('review');
        await this.checkpointer.save(state);
      }

      // 5. Create proposal
      if (
        state.selectedNodes.includes('create_proposal') &&
        !state.completedNodes.includes('create_proposal')
      ) {
        if (await this.isCancelled(state)) {
          state.status = 'cancelled';
          await this.checkpointer.save(state);
          return state;
        }

        const assembled = state.artifacts.assembledData!;
        const proposalId = `prop_${state.runId}_${Date.now()}`;

        const requiresHumanReview = Boolean(
          state.artifacts.localizationData?.needsReview ||
          state.artifacts.localizationData?.experimental
        );
        const blockingReasons: string[] = [];
        if (state.artifacts.localizationData?.needsReview) {
          blockingReasons.push('Bản dịch chứa cảnh báo hoặc thông số cần người bán duyệt lại');
        }
        if (state.artifacts.localizationData?.experimental) {
          blockingReasons.push('Ngôn ngữ mục tiêu đang ở trạng thái thử nghiệm (experimental)');
        }

        const proposal: ProposalArtifact = {
          proposalId,
          targetStore: state.store,
          locale: state.targetLocale,
          title: assembled.title,
          description: assembled.description,
          hashtags: assembled.hashtags,
          createdAt: new Date().toISOString(),
          requiresHumanReview,
          blockingReasons: blockingReasons.length > 0 ? blockingReasons : undefined,
        };

        state.artifacts.proposalId = proposalId;
        state.artifacts.proposalData = proposal;
        state.completedNodes.push('create_proposal');
        await this.checkpointer.save(state);
      }

      // 6. Policy gate: sets status to waiting_approval
      if (
        state.selectedNodes.includes('policy') &&
        !state.completedNodes.includes('policy')
      ) {
        if (await this.isCancelled(state)) {
          state.status = 'cancelled';
          await this.checkpointer.save(state);
          return state;
        }

        if (state.artifacts.proposalData?.blockingReasons) {
          state.warnings.push(...state.artifacts.proposalData.blockingReasons);
        }

        state.status = 'waiting_approval';
        state.completedNodes.push('policy');
        await this.checkpointer.save(state);
      }

      return state;
    } catch (err: unknown) {
      state.status = 'failed';
      state.error = err instanceof Error ? err.message : String(err);
      await this.checkpointer.save(state);
      throw err;
    }
  }
}
