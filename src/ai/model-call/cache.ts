import { createHash } from 'node:crypto';
import type { ModelCallRequest, ModelCallResult } from './types.ts';

export interface CacheEntry<T = unknown> {
  result: ModelCallResult<T>;
  cachedAt: number;
}

export class ModelCallCache {
  private cache = new Map<string, CacheEntry>();

  public computeKey(tenantId: string, request: ModelCallRequest): string {
    const rawKey = [
      tenantId,
      request.agentName,
      request.snapshotRef.hash,
      request.locale || 'default',
      request.instructionHash || 'none',
      request.promptVersion,
      request.schemaVersion,
      request.modelConfigId,
      request.inputHash,
    ].join(':');

    return createHash('sha256').update(rawKey).digest('hex');
  }

  public get<T>(tenantId: string, request: ModelCallRequest<T>): ModelCallResult<T> | null {
    const key = this.computeKey(tenantId, request as ModelCallRequest);
    const entry = this.cache.get(key);
    if (!entry) return null;

    return {
      ...(entry.result as ModelCallResult<T>),
      cacheHit: true,
      generatedBy: 'cache',
    };
  }

  public set<T>(tenantId: string, request: ModelCallRequest<T>, result: ModelCallResult<T>): void {
    const key = this.computeKey(tenantId, request as ModelCallRequest);
    this.cache.set(key, {
      result: { ...result, cacheHit: false },
      cachedAt: Date.now(),
    });
  }

  public clear(): void {
    this.cache.clear();
  }
}
