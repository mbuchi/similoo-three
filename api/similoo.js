// Vercel Node serverless function.
//
// Proxies POST /api/similoo → RES /score/similoo so the client never needs
// the RES API token. Mirrors the scoore /api/overpass pattern.

import { withTurnstile } from '@aireon/shared/turnstile-guard';

export const config = { maxDuration: 15 };

const RES_SIMILOO_URL = 'https://res.zeroo.ch/score/similoo';
// Server-side RES API token. Prefer env var; falls back to the published
// suite token so the production deploy keeps working without manual
// configuration. Rotate via Vercel env vars when the suite token changes.
const RES_API_TOKEN_FALLBACK = 'DNfbHaqajFigz4jPX9B8vnatUduLKZXVwA83WKZG';
const RES_API_TOKEN = process.env.RES_API_TOKEN || RES_API_TOKEN_FALLBACK;
const UPSTREAM_TIMEOUT_MS = 12000;

if (!process.env.RES_API_TOKEN) {
    console.warn('[similoo] RES_API_TOKEN env var is not set — using hardcoded suite default. Set it in Vercel for the production deploy.');
}

// Bounds for client-controlled query params. The /score/similoo backend
// caps internally but rejecting absurd values here saves an upstream
// roundtrip and limits DoS surface.
const LIMIT_MIN = 1;
const LIMIT_MAX = 100;

// The construction-year window RES accepts: a bounded integer 1..100, or the
// UNRESTRICTED window spelled 'all' (0 is the accepted numeric synonym), which
// applies no construction-year floor at all. 100 is not "all" — Swiss parcels
// carry construction years well before 1926.
//
// This mirrors src/js/yearsWindow.js; the two cannot share a module because
// api/ ships as a Vercel serverless function with its own module graph.
//
// The years bound used to be enforced as a 400. It is now a coercion, for two
// reasons: `Number('all')` is NaN, so the old check turned a window RES
// supports into an opaque 4xx; and the DoS rationale is served just as well by
// never forwarding an out-of-contract value upstream. Garbage is not clamped
// into a neighbouring window — that would silently answer a different
// question — it falls back to the default.
const DEFAULT_YEARS = 10;
const MIN_YEARS = 1;
const MAX_YEARS = 100;
const ALL_YEARS = 'all';

function isAllYears(raw) {
    // Strictly `0`, never `Number(raw) === 0` — null, '' and false all coerce
    // to 0 and none of them means "every year".
    if (raw === 0) return true;
    if (typeof raw !== 'string') return false;
    const v = raw.trim().toLowerCase();
    return v === 'all' || v === '0';
}

function coerceYearsWindow(raw) {
    if (isAllYears(raw)) return ALL_YEARS;
    if (typeof raw === 'string') {
        if (raw.trim() === '') return DEFAULT_YEARS;
    } else if (typeof raw !== 'number') {
        return DEFAULT_YEARS;
    }
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n) || n < MIN_YEARS || n > MAX_YEARS) return DEFAULT_YEARS;
    return n;
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
        'Content-Type, Authorization, X-Client-Info, Apikey',
};

function send(res, status, body) {
    for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
    res.status(status).json(body);
}

async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
        res.status(204).end();
        return;
    }
    if (req.method !== 'POST') {
        send(res, 405, { error: 'Method not allowed' });
        return;
    }

    let body;
    if (typeof req.body === 'string') {
        try {
            body = JSON.parse(req.body);
        } catch {
            send(res, 400, { error: "Invalid JSON body" });
            return;
        }
    } else {
        body = req.body;
    }

    const egrid = typeof body?.egrid === 'string' ? body.egrid.trim() : '';
    if (!egrid) {
        send(res, 400, { error: "Missing 'egrid'" });
        return;
    }
    if (!/^CH\d{12}$/i.test(egrid)) {
        send(res, 400, { error: "Invalid 'egrid' format — expected CH followed by 12 digits" });
        return;
    }
    const limitRaw = Number(body?.limit);
    if (body?.limit != null && (!Number.isFinite(limitRaw) || limitRaw < LIMIT_MIN || limitRaw > LIMIT_MAX)) {
        send(res, 400, { error: `'limit' must be an integer between ${LIMIT_MIN} and ${LIMIT_MAX}` });
        return;
    }
    const years = coerceYearsWindow(body?.years);
    const limit = Number.isFinite(limitRaw) ? Math.round(limitRaw) : 12;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
        const upstream = await fetch(RES_SIMILOO_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                token: RES_API_TOKEN,
            },
            body: JSON.stringify({ egrid, years, limit }),
            signal: controller.signal,
        });
        // "No parcel found" is a normal no-match result for the comparison
        // service, not a missing route. Return a quiet 204 so browsers do not
        // log a failed network resource; the client will use its deterministic
        // demo data for this supported empty state.
        if (upstream.status === 404) {
            for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
            res.status(204).end();
            return;
        }
        const text = await upstream.text();
        let parsed = null;
        try {
            parsed = text ? JSON.parse(text) : null;
        } catch {
            parsed = { error: 'Non-JSON response from upstream', raw: text.slice(0, 200) };
        }
        if (!upstream.ok) {
            send(res, upstream.status >= 500 ? 502 : upstream.status, parsed);
            return;
        }
        res.setHeader(
            'Cache-Control',
            'public, s-maxage=86400, stale-while-revalidate=604800',
        );
        send(res, 200, parsed);
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        send(res, 502, { error: 'similoo service unreachable', details: msg });
    } finally {
        clearTimeout(timer);
    }
}

export default withTurnstile(handler);
