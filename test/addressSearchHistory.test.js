import assert from 'node:assert/strict';
import test from 'node:test';

import { bindLandingSearch } from '../src/js/landing/addressSearch.js';

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.dataset = {};
    this.hidden = false;
    this.listeners = new Map();
    this.parentElement = null;
    this.value = '';
    this._textContent = '';
  }

  get innerHTML() {
    return this.children.map((child) => child.textContent).join('');
  }

  set innerHTML(_value) {
    for (const child of this.children) child.parentElement = null;
    this.children = [];
    this._textContent = '';
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    for (const child of this.children) child.parentElement = null;
    this._textContent = String(value);
    this.children = [];
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  contains(candidate) {
    return candidate === this || this.children.some((child) => child.contains(candidate));
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    this.listeners.set(type, listeners.filter((candidate) => candidate !== listener));
  }

  dispatch(type, init = {}) {
    const event = {
      type,
      target: this,
      currentTarget: this,
      defaultPrevented: false,
      propagationStopped: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      stopPropagation() {
        this.propagationStopped = true;
      },
      ...init,
    };
    for (const listener of this.listeners.get(type) || []) listener(event);
    return event;
  }

  focus() {
    const doc = globalThis.document;
    const previous = doc.activeElement;
    if (previous === this) return;
    if (previous) previous.dispatch('blur', { relatedTarget: this });
    doc.activeElement = this;
    this.dispatch('focus', { relatedTarget: previous });
  }
}

function historyEntry(id, label, lat, lng) {
  return {
    id,
    label,
    lat,
    lng,
    featureId: null,
    appName: 'another-aireon-app',
    searchCount: 1,
    createdAt: '2026-08-16T00:00:00.000Z',
    lastSearchedAt: '2026-08-16T00:00:00.000Z',
  };
}

const HISTORY_FIXTURE = [
  historyEntry('valid-a', 'Aarestrasse 1, Bern', 46.948, 7.4474),
  historyEntry('missing-lat', 'Missing latitude', null, 7.4),
  historyEntry('infinite-lng', 'Infinite longitude', 46.9, Infinity),
  historyEntry('valid-b', 'Bahnweg 2, Thun', 46.758, 7.628),
  historyEntry('valid-c', 'Centralstrasse 3, Luzern', 47.05, 8.31),
  historyEntry('valid-d', 'Dorfplatz 4, Zug', 47.17, 8.51),
  historyEntry('valid-e', 'Erlenweg 5, Aarau', 47.39, 8.04),
  historyEntry('valid-f', 'Feldweg 6, Basel', 47.56, 7.59),
  historyEntry('valid-g', 'Gartenweg 7, Zürich', 47.37, 8.54),
];

function installFakeDocument(t) {
  const originalDocument = globalThis.document;
  globalThis.document = {
    activeElement: null,
    createElement: (tagName) => new FakeElement(tagName),
  };
  t.after(() => {
    globalThis.document = originalDocument;
  });
}

function createHarness(t, initialEntries = HISTORY_FIXTURE) {
  installFakeDocument(t);

  let entries = [...initialEntries];
  let listener = null;
  let initialized = 0;
  let unsubscribed = 0;
  const removed = [];
  const picked = [];
  const historyStore = {
    ensureInitialized() {
      initialized += 1;
    },
    getSnapshot() {
      return { entries, status: 'ready', authed: false };
    },
    subscribe(nextListener) {
      listener = nextListener;
      return () => {
        listener = null;
        unsubscribed += 1;
      };
    },
    remove(id) {
      removed.push(id);
      entries = entries.filter((entry) => entry.id !== id);
      listener?.();
      return Promise.resolve();
    },
  };
  const input = new FakeElement('input');
  const popup = new FakeElement('div');
  const list = new FakeElement('ul');
  const actions = new FakeElement('div');
  popup.hidden = true;
  list.hidden = true;
  actions.hidden = true;
  popup.appendChild(list);
  popup.appendChild(actions);

  const dispose = bindLandingSearch({
    input,
    list,
    popup,
    actions,
    onPick: (result) => picked.push(result),
    historyStore,
  });

  return {
    actions,
    dispose,
    get initialized() { return initialized; },
    get unsubscribed() { return unsubscribed; },
    input,
    list,
    picked,
    popup,
    removed,
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, message, timeoutMs = 750) {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error(message);
    await wait(5);
  }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
}

function geoAdminResponse(label, lat = 47.3769, lng = 8.5417) {
  return new Response(JSON.stringify({
    results: [{
      id: 'late-result',
      attrs: {
        featureId: 'late-result',
        label,
        lat,
        lon: lng,
        origin: 'address',
      },
    }],
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

test('empty focus exposes six valid pure options and ArrowDown plus Enter picks one', (t) => {
  const harness = createHarness(t);
  harness.input.focus();

  assert.equal(harness.initialized, 1);
  assert.equal(harness.popup.hidden, false);
  assert.equal(harness.list.hidden, false);
  assert.equal(harness.list.children.length, 6);
  assert.equal(harness.actions.children.length, 6);
  assert.deepEqual(
    harness.list.children.map((option) => option.textContent),
    [
      '◷ Aarestrasse 1, Bern',
      '◷ Bahnweg 2, Thun',
      '◷ Centralstrasse 3, Luzern',
      '◷ Dorfplatz 4, Zug',
      '◷ Erlenweg 5, Aarau',
      '◷ Feldweg 6, Basel',
    ],
  );
  assert.equal(harness.list.children.every((option) => option.children.length === 0), true);
  assert.equal(harness.actions.children[0].textContent, 'Delete');
  assert.equal(
    harness.actions.children[0].getAttribute('aria-label'),
    'Delete: Aarestrasse 1, Bern',
  );

  harness.input.dispatch('keydown', { key: 'ArrowDown' });
  harness.input.dispatch('keydown', { key: 'Enter' });

  assert.deepEqual(harness.picked, [{
    id: 'valid-a',
    label: 'Aarestrasse 1, Bern',
    lat: 46.948,
    lng: 7.4474,
  }]);
  harness.dispose();
  assert.equal(harness.unsubscribed, 1);
});

test('Delete removes the active recent snapshot entry without selecting it', (t) => {
  const harness = createHarness(t, HISTORY_FIXTURE.slice(0, 4));
  harness.input.focus();
  harness.input.dispatch('keydown', { key: 'ArrowDown' });
  harness.input.dispatch('keydown', { key: 'Delete' });

  assert.deepEqual(harness.removed, ['valid-a']);
  assert.deepEqual(harness.picked, []);
  assert.deepEqual(
    harness.list.children.map((option) => option.textContent),
    ['◷ Bahnweg 2, Thun'],
  );
  harness.dispose();
});

test('Backspace removes the active recent snapshot entry without selecting it', (t) => {
  const harness = createHarness(t, HISTORY_FIXTURE.slice(0, 4));
  harness.input.focus();
  harness.input.dispatch('keydown', { key: 'ArrowDown' });
  harness.input.dispatch('keydown', { key: 'Backspace' });

  assert.deepEqual(harness.removed, ['valid-a']);
  assert.deepEqual(harness.picked, []);
  assert.deepEqual(
    harness.list.children.map((option) => option.textContent),
    ['◷ Bahnweg 2, Thun'],
  );
  harness.dispose();
});

test('focus can move to the 44px touch removal surface and removal keeps selection idle', async (t) => {
  const harness = createHarness(t, HISTORY_FIXTURE.slice(0, 4));
  harness.input.focus();
  const remove = harness.actions.children[0];

  harness.input.dispatch('blur', { relatedTarget: remove });
  globalThis.document.activeElement = remove;
  remove.dispatch('focus', { relatedTarget: harness.input });
  await wait(140);

  assert.equal(harness.popup.hidden, false);
  assert.equal(harness.list.children.length, 2);

  remove.dispatch('pointerdown');
  remove.dispatch('click');
  assert.deepEqual(harness.removed, ['valid-a']);
  assert.deepEqual(harness.picked, []);
  assert.deepEqual(
    harness.list.children.map((option) => option.textContent),
    ['◷ Bahnweg 2, Thun'],
  );
  harness.dispose();
  assert.equal(harness.unsubscribed, 1);
});

test('clearing to recents prevents a late provider success from replacing them', async (t) => {
  const originalFetch = globalThis.fetch;
  const request = deferred();
  let fetchCalls = 0;
  globalThis.fetch = () => {
    fetchCalls += 1;
    return request.promise;
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const harness = createHarness(t, [HISTORY_FIXTURE[0]]);
  harness.input.focus();
  harness.input.value = 'Late success address';
  harness.input.dispatch('input');
  await waitFor(() => fetchCalls === 1, 'provider request did not start');

  harness.input.value = '';
  harness.input.dispatch('input');
  assert.equal(harness.list.children[0].textContent.startsWith('◷ Aarestrasse 1, Bern'), true);

  request.resolve(geoAdminResponse('Stale provider result'));
  await wait(20);

  assert.equal(harness.list.children[0].textContent, '◷ Aarestrasse 1, Bern');
  harness.dispose();
});

test('clearing to recents prevents a late provider failure from rendering an error', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const request = deferred();
  let fetchCalls = 0;
  const warnings = [];
  globalThis.fetch = () => {
    fetchCalls += 1;
    return request.promise;
  };
  console.warn = (...args) => warnings.push(args);
  t.after(() => {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  });
  const harness = createHarness(t, [HISTORY_FIXTURE[0]]);
  harness.input.focus();
  harness.input.value = 'Late failure address';
  harness.input.dispatch('input');
  await waitFor(() => fetchCalls === 1, 'provider request did not start');

  harness.input.value = '';
  harness.input.dispatch('input');
  request.reject(new Error('late provider failure'));
  await wait(20);

  assert.equal(harness.list.children[0].textContent, '◷ Aarestrasse 1, Bern');
  assert.deepEqual(warnings, []);
  harness.dispose();
});

test('the current debounced provider request still renders normal live results', async (t) => {
  const originalFetch = globalThis.fetch;
  const request = deferred();
  let fetchCalls = 0;
  globalThis.fetch = () => {
    fetchCalls += 1;
    return request.promise;
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const harness = createHarness(t, [HISTORY_FIXTURE[0]]);
  harness.input.focus();
  harness.input.value = 'Current provider address';
  harness.input.dispatch('input');
  await waitFor(() => fetchCalls === 1, 'provider request did not start');

  request.resolve(geoAdminResponse('Current provider result'));
  await wait(20);

  assert.deepEqual(
    harness.list.children.map((option) => option.textContent),
    ['Current provider result'],
  );
  assert.equal(harness.actions.hidden, true);
  harness.dispose();
});
