import type {
  IModelProvider,
  ModelCallRequest,
  ModelUsage,
  ProviderResponse,
  RuntimeContext,
} from '../types.ts';

export class FixtureModelProvider implements IModelProvider {
  public async call(request: ModelCallRequest, _context: RuntimeContext): Promise<ProviderResponse> {
    const rawJson = {
      title: `[Demo] ${request.userPayload.title || 'Sản phẩm mẫu'} - Tối ưu Shopee chuẩn SEO`,
      description: `[Demo] Mô tả tối ưu hóa tự động cho ${request.userPayload.title || 'sản phẩm'}. Đầy đủ công dụng, thành phần, và hướng dẫn sử dụng.`,
      hashtags: ['#shopee', '#banchay', '#chinhhang', '#sale'],
    };

    const usage: ModelUsage = {
      inputTokens: 100,
      outputTokens: 75,
      estimatedCostUsd: 0.0,
    };

    return {
      rawJson,
      usage,
      providerRequestId: `fixture_demo_${Date.now()}`,
    };
  }
}
