// Client-side IndexedDB blob cache for the heavy streamed 3D assets.
//
// The scene viewer pulls megabytes of binary GLB per address: one terrain
// point-cloud mesh plus a building GLB for every footprint in the 100 m
// slice. Those bytes are deterministic per coordinate (terrain/building
// meshes are static LIDAR-derived geometry) yet they're re-fetched from
// the Contoor 3D API every time the user re-opens the same address.
//
// The app's other cache (../cache.js) is localStorage-backed and JSON-only
// — it can't hold binary blobs and would blow the ~5 MB origin quota. This
// module is a separate, dedicated store for *large binaries*:
//
//   * One IndexedDB database / object store keyed by the request
//     (method + url + JSON body), so the same coordinate hits the cache
//     regardless of which call-site issued it.
//   * Records store { body: ArrayBuffer, bytes, ts, last } so we can do
//     byte-accurate budgeting (localStorage can't measure blob bytes).
//   * A byte-budget LRU: when the store exceeds ~150 MB we evict the
//     least-recently-accessed entries until we're back under budget.
//   * A 14-day TTL — terrain/building meshes don't change per coordinate
//     on any human timescale, but we still want eventual refresh.
//
// EVERYTHING degrades silently to a plain network fetch. Incognito mode,
// disabled storage, quota errors, or a corrupt DB must never throw and
// must never block the 3D viewer — a cache is an optimisation, not a
// dependency.

const DB_NAME = 'similoo-three-blobcache';
const DB_VERSION = 1;
const STORE = 'blobs';

// ~150 MB soft byte budget. A single 100 m scene is typically 5–25 MB of
// GLB across terrain + a dozen buildings, so this comfortably holds a
// handful of recently-visited addresses before LRU eviction kicks in.
const MAX_BYTES = 150 * 1024 * 1024;

// 14 days. Static LIDAR geometry; long enough that re-opening an address
// days later is still instant, short enough that upstream re-meshing
// eventually propagates.
const TTL_MS = 14 * 24 * 60 * 60 * 1000;

// Single shared connection promise. null means "not yet attempted";
// a resolved null means "IndexedDB unavailable — stay on the network".
let dbPromise;

function openDB() {
    if (dbPromise !== undefined) return dbPromise;
    dbPromise = new Promise((resolve) => {
        try {
            if (typeof indexedDB === 'undefined') {
                resolve(null);
                return;
            }
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    const store = db.createObjectStore(STORE, { keyPath: 'key' });
                    // `last` (last-access epoch) drives LRU eviction; index
                    // it so we can walk ascending without loading everything.
                    store.createIndex('last', 'last', { unique: false });
                }
            };
            req.onsuccess = () => {
                const db = req.result;
                // If the connection is ever versionchange-closed (another
                // tab upgraded), drop our cached promise so the next call
                // re-opens cleanly.
                db.onversionchange = () => {
                    try { db.close(); } catch {}
                    dbPromise = undefined;
                };
                resolve(db);
            };
            req.onerror = () => resolve(null);
            req.onblocked = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
    return dbPromise;
}

function tx(db, mode) {
    return db.transaction(STORE, mode).objectStore(STORE);
}

function idbRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Build a stable cache key from the request. GLB endpoints are POSTed with
// a JSON body that carries the coordinate, so the body — not just the URL —
// is what makes two requests distinct.
function keyFor(url, init) {
    const method = (init?.method || 'GET').toUpperCase();
    let body = '';
    if (typeof init?.body === 'string') body = init.body;
    else if (init?.body != null) {
        try { body = JSON.stringify(init.body); } catch { body = ''; }
    }
    return `${method} ${url} ${body}`;
}

async function readEntry(db, key) {
    try {
        const entry = await idbRequest(tx(db, 'readonly').get(key));
        if (!entry) return null;
        if (typeof entry.ts !== 'number' || Date.now() - entry.ts > TTL_MS) {
            // Stale — drop it lazily and miss.
            try { tx(db, 'readwrite').delete(key); } catch {}
            return null;
        }
        return entry;
    } catch {
        return null;
    }
}

// Bump the last-access stamp so the LRU keeps hot entries. Best-effort and
// fire-and-forget: a failed touch only costs us slightly worse eviction
// ordering, never correctness.
function touch(db, key) {
    try {
        const store = tx(db, 'readwrite');
        const getReq = store.get(key);
        getReq.onsuccess = () => {
            const e = getReq.result;
            if (!e) return;
            e.last = Date.now();
            try { store.put(e); } catch {}
        };
    } catch {}
}

async function writeEntry(db, key, body) {
    const bytes = body.byteLength || 0;
    // A single asset larger than the whole budget would force eviction of
    // everything and still not fit — skip caching it rather than thrash.
    if (bytes <= 0 || bytes > MAX_BYTES) return;
    const now = Date.now();
    try {
        await idbRequest(tx(db, 'readwrite').put({ key, body, bytes, ts: now, last: now }));
    } catch {
        // Quota or serialisation failure — the network result is already
        // returned to the caller, so just bail.
        return;
    }
    // Enforce the byte budget after the write. Cheap when under budget.
    try { await enforceBudget(db); } catch {}
}

// Byte-budget LRU eviction. Sum all entry byte counts; if we're over the
// cap, walk the `last` index ascending (least-recently-accessed first)
// and delete until we're back under budget.
async function enforceBudget(db) {
    let total = 0;
    const entries = [];
    await new Promise((resolve) => {
        try {
            const req = tx(db, 'readonly').openCursor();
            req.onsuccess = () => {
                const cursor = req.result;
                if (!cursor) { resolve(); return; }
                const v = cursor.value;
                total += v.bytes || 0;
                entries.push({ key: v.key, last: v.last || 0, bytes: v.bytes || 0 });
                cursor.continue();
            };
            req.onerror = () => resolve();
        } catch {
            resolve();
        }
    });
    if (total <= MAX_BYTES) return;
    entries.sort((a, b) => a.last - b.last); // oldest access first
    let over = total - MAX_BYTES;
    const store = tx(db, 'readwrite');
    for (const e of entries) {
        if (over <= 0) break;
        try { store.delete(e.key); } catch {}
        over -= e.bytes;
    }
}

/**
 * Fetch `url` as an ArrayBuffer, fronted by the IndexedDB blob cache.
 *
 * Fresh hit → returns a copy of the stored ArrayBuffer (and bumps its
 * last-access stamp). Miss/stale → fetches, stores a clone, returns the
 * body. Any storage failure degrades silently to a plain network fetch,
 * so this is always safe to call in place of `fetch(...).arrayBuffer()`.
 *
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<ArrayBuffer>}
 */
export async function cachedArrayBuffer(url, init) {
    const key = keyFor(url, init);
    const db = await openDB().catch(() => null);

    if (db) {
        const hit = await readEntry(db, key);
        if (hit && hit.body) {
            touch(db, key);
            // Hand back a copy so callers (e.g. GLTFLoader.parse, which may
            // detach the buffer) can't mutate our cached record.
            return hit.body.slice(0);
        }
    }

    const res = await fetch(url, init);
    if (!res.ok) {
        // Let the caller observe the failure with the real status text,
        // matching the un-cached fetch path it replaced.
        const text = await res.text().catch(() => '');
        const err = new Error(`fetch ${res.status}: ${text.slice(0, 200)}`);
        err.status = res.status;
        throw err;
    }
    const buf = await res.arrayBuffer();

    if (db && buf.byteLength) {
        // Store a clone so a later caller mutating its returned buffer
        // can't corrupt the cached copy.
        writeEntry(db, key, buf.slice(0)).catch(() => {});
    }
    return buf;
}

/**
 * Convenience wrapper that returns a Blob (with optional MIME type) from
 * the cached ArrayBuffer. The current call-sites consume ArrayBuffers
 * directly, but the scene viewer's loadGLBBlob path historically took a
 * Blob, so this keeps both shapes available.
 *
 * @param {string} url
 * @param {RequestInit} [init]
 * @param {string} [type]
 * @returns {Promise<Blob>}
 */
export async function cachedBlob(url, init, type = 'model/gltf-binary') {
    const buf = await cachedArrayBuffer(url, init);
    return new Blob([buf], { type });
}
