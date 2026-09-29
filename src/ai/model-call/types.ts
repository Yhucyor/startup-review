export type ModelCallMode = 'live' | 'demo';

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface SnapshotReference {
  id: string;
  version: number;
  hash: string;
}

export interface ValidationSuccess<T> {
  valid: true;
  data: T;
}

export interface ValidationFailure {
  valid: false;
  errors: string[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export interface ModelCallRequest<TOutput = unknown> {
  agentName: string;
  promptVersion: string;
  schemaVersion: string;
  modelConfigId: string;
  systemInstruction?: string;
  userPayload: Record<string, unknown>;
  snapshotRef: SnapshotReference;
  inputHash: string;
  maxOutputTokens?: number;
  locale?: string;
  instructionHash?: string;
  validateOutput: (raw: unknown) => ValidationResult<TOutput>;
}

export interface RuntimeContext {
  tenantId: string;
  mode: ModelCallMode;
  runId: string;
  stepId: string;
  attemptId: number;
  deadlineMs: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ModelCallResult<TOutput = unknown> {
  artifact: TOutput;
  usage: ModelUsage;
  providerRequestId: string;
  elapsedMs: number;
  cacheHit: boolean;
  generatedBy: 'live_provider' | 'demo_fixture' | 'cache' | 'fake_provider';
}

export interface ProviderResponse {
  rawJson: unknown;
  usage: ModelUsage;
  providerRequestId: string;
}

export interface IModelProvider {
  call(request: ModelCallRequest, context: RuntimeContext): Promise<ProviderResponse>;
}

export class ModelGatewayError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'ModelGatewayError';
  }
}

export class SchemaValidationError extends ModelGatewayError {
  public readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[]) {
    super(message, 'SCHEMA_VALIDATION_ERROR');
    this.validationErrors = validationErrors;
    this.name = 'SchemaValidationError';
  }
}

export class TimeoutError extends ModelGatewayError {
  constructor(message: string) {
    super(message, 'DEADLINE_EXCEEDED');
    this.name = 'TimeoutError';
  }
}

export class BudgetExceededError extends ModelGatewayError {
  constructor(message: string) {
    super(message, 'BUDGET_EXCEEDED');
    this.name = 'BudgetExceededError';
  }
}

export class ConfigurationError extends ModelGatewayError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}
