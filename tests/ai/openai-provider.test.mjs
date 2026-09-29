import test from 'node:test';
import assert from 'node:assert/strict';

import {
  OpenAIModelProvider,
  ConfigurationError,
  ModelGatewayError,
} from '../../src/ai/model-call/index.ts';

function createDummyRequest(overrides = {}) {
  return {
    agentName: 'content_writer',
    promptVersion: 'v1.0.0',
    schemaVersion: 'v1.0.0',
    modelConfigId: 'gpt-4o-mini',
    inputHash: 'hash_test_req',
    snapshotRef: {
      id: 'prod_100',
      version: 1,
      hash: 'snap_100',
    },
    userPayload: {
      title: 'Tai nghe Bluetooth không dây chống ồn',
      description: 'Pin 40 giờ, chống nước IPX5',
    },
    validateOutput: (raw) => ({ valid: true, data: raw }),
    ...overrides,
  };
}

function createDummyContext(overrides = {}) {
  return {
    tenantId: 'tenant_synchro',
    mode: 'live',
    runId: 'run_openai_test',
    stepId: 'step_1',
    attemptId: 1,
    deadlineMs: Date.now() + 5000,
    ...overrides,
  };
}

test('OpenAI Provider: Thiếu API key ném ConfigurationError', async () => {
  const provider = new OpenAIModelProvider({ apiKey: '' });
  const oldEnv = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    await assert.rejects(
      async () => {
        await provider.call(createDummyRequest(), createDummyContext());
      },
      (err) => {
        assert.ok(err instanceof ConfigurationError);
        assert.ok(err.message.includes('OPENAI_API_KEY'));
        return true;
      }
    );
  } finally {
    if (oldEnv) process.env.OPENAI_API_KEY = oldEnv;
  }
});

test('OpenAI Provider: Gọi Chat Completions với JSON object format và tính token/cost chính xác', async () => {
  let capturedUrl = '';
  let capturedHeaders = {};
  let capturedBody = {};

  const mockFetch = async (url, options) => {
    capturedUrl = String(url);
    capturedHeaders = options.headers;
    capturedBody = JSON.parse(options.body);

    const mockResponsePayload = {
      id: 'chatcmpl_mock_12345',
      choices: [
        {
          message: {
            role: 'assistant',
            content: JSON.stringify({
              title: 'Tai nghe Bluetooth không dây chống ồn đỉnh cao',
              description: 'Thời lượng pin 40h liên tục, chuẩn chống nước IPX5 bền bỉ.',
              keywords: ['#tainghe', '#bluetooth', '#chongon'],
            }),
          },
        },
      ],
      usage: {
        prompt_tokens: 150,
        completion_tokens: 60,
      },
    };

    return new Response(JSON.stringify(mockResponsePayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const provider = new OpenAIModelProvider({
    apiKey: 'sk-mock-test-key-1234567890',
    fetchFn: mockFetch,
  });

  const response = await provider.call(createDummyRequest(), createDummyContext());

  // Assert URL & Headers
  assert.equal(capturedUrl, 'https://api.openai.com/v1/chat/completions');
  assert.equal(capturedHeaders['Authorization'], 'Bearer sk-mock-test-key-1234567890');
  assert.equal(capturedHeaders['Content-Type'], 'application/json');

  // Assert Body structure
  assert.equal(capturedBody.model, 'gpt-4o-mini');
  assert.deepEqual(capturedBody.response_format, { type: 'json_object' });
  assert.equal(capturedBody.messages.length, 2);
  assert.equal(capturedBody.messages[0].role, 'system');
  assert.equal(capturedBody.messages[1].role, 'user');

  // Assert Returned output
  assert.equal(response.providerRequestId, 'chatcmpl_mock_12345');
  assert.equal(response.rawJson.title, 'Tai nghe Bluetooth không dây chống ồn đỉnh cao');
  assert.equal(response.usage.inputTokens, 150);
  assert.equal(response.usage.outputTokens, 60);
  assert.ok(response.usage.estimatedCostUsd > 0);
});

test('OpenAI Provider: Báo lỗi ModelGatewayError khi API trả về mã lỗi 401/429', async () => {
  const mockFetch = async () => {
    const errorPayload = {
      error: {
        message: 'Incorrect API key provided: sk-invalid...',
        type: 'invalid_request_error',
        code: 'invalid_api_key',
      },
    };
    return new Response(JSON.stringify(errorPayload), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const provider = new OpenAIModelProvider({
    apiKey: 'sk-invalid-key',
    fetchFn: mockFetch,
  });

  await assert.rejects(
    async () => {
      await provider.call(createDummyRequest(), createDummyContext());
    },
    (err) => {
      assert.ok(err instanceof ModelGatewayError);
      assert.ok(err.message.includes('invalid_api_key'));
      return true;
    }
  );
});

test('OpenAI Provider: Báo lỗi khi model trả về chuỗi không phải JSON', async () => {
  const mockFetch = async () => {
    const mockPayload = {
      id: 'chatcmpl_invalid_json',
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Xin lỗi, tôi không thể định dạng phản hồi này dưới dạng JSON.',
          },
        },
      ],
      usage: { prompt_tokens: 50, completion_tokens: 20 },
    };
    return new Response(JSON.stringify(mockPayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const provider = new OpenAIModelProvider({
    apiKey: 'sk-test-valid-key',
    fetchFn: mockFetch,
  });

  await assert.rejects(
    async () => {
      await provider.call(createDummyRequest(), createDummyContext());
    },
    (err) => {
      assert.ok(err instanceof ModelGatewayError);
      assert.equal(err.code, 'OPENAI_JSON_PARSE_ERROR');
      return true;
    }
  );
});
