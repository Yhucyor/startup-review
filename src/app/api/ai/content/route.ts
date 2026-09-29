import { NextResponse } from 'next/server';
import { generateContent } from '@/ai/agents/content/index.ts';
import { ModelCallGateway } from '@/ai/model-call/index.ts';
import type { ContentInput } from '@/ai/agents/content/types.ts';
import type { RuntimeContext } from '@/ai/model-call/types.ts';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { snapshot, sellerInstructions, brandVoice, targetLocale, mode = 'demo' } = body;

    if (!snapshot || !snapshot.title) {
      return NextResponse.json(
        { success: false, error: 'Thiếu snapshot sản phẩm hoặc tên sản phẩm.' },
        { status: 400 }
      );
    }

    const gateway = new ModelCallGateway({
      liveApiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
    });

    const isLive = mode === 'live' && Boolean(process.env.OPENAI_API_KEY);
    const resolvedMode = isLive ? 'live' : 'demo';

    const input: ContentInput = {
      snapshot,
      sellerInstructions,
      brandVoice,
      targetLocale,
    };

    const context: RuntimeContext = {
      tenantId: 'tenant_synchro_vn',
      mode: resolvedMode,
      runId: `run_api_${Date.now()}`,
      stepId: 'step_content_generation',
      attemptId: 1,
      deadlineMs: Date.now() + 30000,
      timeoutMs: 30000,
    };

    const output = await generateContent(input, context, gateway);

    return NextResponse.json({
      success: true,
      mode: resolvedMode,
      data: output,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
