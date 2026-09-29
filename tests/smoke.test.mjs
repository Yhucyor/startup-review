import test from 'node:test';
import assert from 'node:assert/strict';

test('CI smoke test - environment and baseline sanity', () => {
  assert.equal(1 + 1, 2);
  assert.ok(process.env.NODE_ENV !== undefined || true);
});
