import assert from 'node:assert/strict';
import test from 'node:test';

import { bindLandingSearch } from '../src/js/landing/addressSearch.js';

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.dataset = {};
    this.hidden = true;
    this.listeners = new Map();
    this.value = '';
    this._textContent = '';
  }

  get innerHTML() {
    return this.children.map((child) => child.textContent).join('');
  }

  set innerHTML(_value) {
    this.children = [];
    this._textContent = '';
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  appendChild(child) {
    this.children.push(child);
    return child;
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

  dispatch(type) {
    const event = {
      type,
      preventDefault() {},
      stopPropagation() {},
    };
    for (const listener of this.listeners.get(type) || []) listener(event);
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

test('empty focus shows at most six valid shared recents through the normal pick path', (t) => {
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement: (tagName) => new FakeElement(tagName),
  };
  t.after(() => {
    globalThis.document = originalDocument;
  });

  let listener = null;
  let initialized = 0;
  let unsubscribed = 0;
  const removed = [];
  const entries = [
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
      listener?.();
    },
  };
  const input = new FakeElement('input');
  const list = new FakeElement('ul');
  const picked = [];

  const dispose = bindLandingSearch({
    input,
    list,
    onPick: (result) => picked.push(result),
    historyStore,
  });
  input.dispatch('focus');

  assert.equal(initialized, 1);
  assert.equal(list.hidden, false);
  assert.equal(list.children.length, 6);
  assert.deepEqual(
    list.children.map((row) => row.textContent),
    [
      '◷ Aarestrasse 1, Bern×',
      '◷ Bahnweg 2, Thun×',
      '◷ Centralstrasse 3, Luzern×',
      '◷ Dorfplatz 4, Zug×',
      '◷ Erlenweg 5, Aarau×',
      '◷ Feldweg 6, Basel×',
    ],
  );
  assert.equal(
    list.children[0].children[0].getAttribute('aria-label'),
    'Delete: Aarestrasse 1, Bern',
  );

  list.children[0].dispatch('mousedown');
  assert.deepEqual(picked, [{
    id: 'valid-a',
    label: 'Aarestrasse 1, Bern',
    lat: 46.948,
    lng: 7.4474,
  }]);

  input.value = '';
  input.dispatch('focus');
  list.children[0].children[0].dispatch('click');
  assert.deepEqual(removed, ['valid-a']);

  dispose();
  assert.equal(unsubscribed, 1);
});
