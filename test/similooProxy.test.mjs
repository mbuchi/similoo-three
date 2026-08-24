import assert from 'node:assert/strict';
import test, { describe, it } from 'node:test';

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

// The years window is no longer "a number or 10". RES also takes an
// unrestricted window, and similoo-three spells it 'all' on the wire; the old
// `Number.isFinite(Number(years))` guard rejected that supported request with
// an opaque 400 (`Number('all')` is NaN), and forwarded 3.7 rounded to 4.
describe('api/similoo years window', () => {
  const EGRID = 'CH000000000000';

  async function forwardedBody(years) {
    const originalFetch = globalThis.fetch;
    let captured = null;
    globalThis.fetch = async (_url, init) => {
      captured = init;
      return new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    try {
      const res = createResponse();
      await handler({ method: 'POST', body: { egrid: EGRID, years } }, res);
      assert.equal(res.statusCode, 200, `expected the request to reach RES, got ${res.statusCode}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
    assert.ok(captured, 'the proxy never called upstream');
    return JSON.parse(captured.body);
  }

  it("forwards 'all' to RES unchanged", async () => {
    assert.deepEqual(await forwardedBody('all'), {
      egrid: EGRID,
      years: 'all',
      limit: 12,
    });
  });

  it("accepts the other spellings of the unrestricted window as 'all'", async () => {
    // RES takes the number 0 as a synonym; a padded/upper-case string is the
    // same request typed by a human.
    for (const spelling of [0, '0', ' ALL ', 'All']) {
      assert.equal((await forwardedBody(spelling)).years, 'all', `spelling: ${JSON.stringify(spelling)}`);
    }
  });

  it('forwards an in-contract number, string or not', async () => {
    assert.equal((await forwardedBody(5)).years, 5);
    assert.equal((await forwardedBody(60)).years, 60);
    assert.equal((await forwardedBody('7')).years, 7);
    assert.equal((await forwardedBody(100)).years, 100);
  });

  it('defaults a missing or garbage years to 10 rather than forwarding it', async () => {
    // Missing, unparseable, wrong type, and — the honest part — numbers
    // outside the 1..100 the endpoint actually accepts. None of these is a
    // window, so none of them reaches RES as one.
    for (const garbage of [undefined, null, '', '   ', 'banana', NaN, true, {}, [], -5, 0.4, 101, 1e9]) {
      assert.equal((await forwardedBody(garbage)).years, 10, `garbage: ${JSON.stringify(garbage)}`);
    }
  });
});
