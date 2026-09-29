import type {
  IModelProvider,
  ModelCallRequest,
  ModelUsage,
  ProviderResponse,
  RuntimeContext,
} from '../types.ts';
import { ConfigurationError, ModelGatewayError } from '../types.ts';

export interface OpenAIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  fetchFn?: typeof fetch;
}

interface OpenAIChoice {
  message?: {
    content?: string;
  };
}

interface OpenAIUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

interface OpenAIChatResponse {
  id?: string;
  choices?: OpenAIChoice[];
  usage?: OpenAIUsage;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

export class OpenAIModelProvider implements IModelProvider {
  private apiKey?: string;
  private baseUrl: string;
  private defaultModel: string;
  private fetchFn: typeof fetch;

  constructor(config: OpenAIProviderConfig = {}) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.defaultModel = config.defaultModel || 'gpt-4o-mini';
    this.fetchFn = config.fetchFn || fetch;
  }

  public getApiKey(): string | undefined {
    return this.apiKey || process.env.OPENAI_API_KEY;
  }

  private calculateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
    const isMini = model.includes('mini');
    const inputRatePerMillion = isMini ? 0.15 : 2.50;
    const outputRatePerMillion = isMini ? 0.60 : 10.00;

    const inputCost = (inputTokens / 1_000_000) * inputRatePerMillion;
    const outputCost = (outputTokens / 1_000_000) * outputRatePerMillion;
    return Number((inputCost + outputCost).toFixed(6));
  }

  public async call(request: ModelCallRequest, context: RuntimeContext): Promise<ProviderResponse> {
    const key = this.getApiKey();
    if (!key) {
      throw new ConfigurationError(
        'AI_UNAVAILABLE: Khóa OPENAI_API_KEY chưa được thiết lập trong biến môi trường hoặc cấu hình.'
      );
    }

    const model = request.modelConfigId || this.defaultModel;
    const systemInstruction =
      request.systemInstruction ||
      'You are an expert multi-platform commerce AI assistant. Always output valid JSON strictly matching the requested structure.';

    const userMessageContent = JSON.stringify({
      userPayload: request.userPayload,
      snapshotRef: request.snapshotRef,
      targetLocale: request.locale || 'default',
    });

    const body = {
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userMessageContent },
      ],
      max_tokens: request.maxOutputTokens || 1200,
      temperature: 0.2,
    };

    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
        signal: context.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
      throw new ModelGatewayError(
        `OpenAI connection error: ${err instanceof Error ? err.message : String(err)}`,
        'OPENAI_NETWORK_ERROR'
      );
    }

    const responseText = await response.text();
    let data: OpenAIChatResponse;
    try {
      data = JSON.parse(responseText) as OpenAIChatResponse;
    } catch {
      throw new ModelGatewayError(
        `OpenAI returned non-JSON response HTTP ${response.status}: ${responseText.slice(0, 200)}`,
        'OPENAI_INVALID_RESPONSE'
      );
    }

    if (!response.ok) {
      const errorMessage = data.error?.message || `HTTP ${response.status}`;
      const errorCode = data.error?.code || `HTTP_${response.status}`;
      throw new ModelGatewayError(`OpenAI API error (${errorCode}): ${errorMessage}`, errorCode);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new ModelGatewayError('OpenAI returned an empty content payload', 'OPENAI_EMPTY_CHOICE');
    }

    let rawJson: unknown;
    try {
      rawJson = JSON.parse(content);
    } catch {
      throw new ModelGatewayError(
        `Failed to parse model output as JSON: ${content.slice(0, 200)}`,
        'OPENAI_JSON_PARSE_ERROR'
      );
    }

    const promptTokens = data.usage?.prompt_tokens ?? 0;
    const completionTokens = data.usage?.completion_tokens ?? 0;
    const estimatedCostUsd = this.calculateCostUsd(model, promptTokens, completionTokens);

    const usage: ModelUsage = {
      inputTokens: promptTokens,
      outputTokens: completionTokens,
      estimatedCostUsd,
    };

    return {
      rawJson,
      usage,
      providerRequestId: data.id || `openai_${Date.now()}`,
    };
  }
}
