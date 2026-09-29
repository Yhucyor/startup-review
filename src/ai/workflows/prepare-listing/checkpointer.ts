import type { ICheckpointer, WorkflowState } from './types.ts';

export class InMemoryCheckpointer implements ICheckpointer {
  private checkpoints = new Map<string, WorkflowState>();

  public async save(state: WorkflowState): Promise<void> {
    const clone = structuredClone(state);
    clone.checkpointVersion = (state.checkpointVersion || 0) + 1;
    this.checkpoints.set(state.runId, clone);
    state.checkpointVersion = clone.checkpointVersion;
  }

  public async load(runId: string): Promise<WorkflowState | null> {
    const record = this.checkpoints.get(runId);
    if (!record) return null;
    return structuredClone(record);
  }

  public async listByTenant(tenantId: string): Promise<WorkflowState[]> {
    const list: WorkflowState[] = [];
    for (const record of this.checkpoints.values()) {
      if (record.tenantId === tenantId) {
        list.push(structuredClone(record));
      }
    }
    return list;
  }

  public clear(): void {
    this.checkpoints.clear();
  }
}
