import assert from 'node:assert/strict';
import test from 'node:test';

import handler from '../api/similoo.js';

function createResponse() {
  return {
    body: undefined,
    ended: false,
    headers: new Map(),
    statusCode: 200,
    setHeader(name, value) {
      this.headers.set(name, value);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

test('an upstream no-match response becomes a quiet 204', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'No parcel found for egrid' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });

  const req = {
    method: 'POST',
    body: { egrid: 'CH000000000000', years: 10, limit: 12 },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
  assert.equal(res.body, undefined);
});
