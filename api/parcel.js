// Vercel Node serverless function.
//
// Proxies POST /api/parcel → RES /res_api/parcel_data so the client never
// needs the RES API token. Mirrors the scoore /api/overpass pattern.

export const config = { maxDuration: 15 };

const RES_PARCEL_URL = 'https://res.zeroo.ch/res_api/parcel_data';
// Server-side RES API token. Prefer env var; falls back to the published
// suite token so the production deploy keeps working without manual
// configuration. Rotate via Vercel env vars when the suite token changes.
const RES_API_TOKEN_FALLBACK = 'DNfbHaqajFigz4jPX9B8vnatUduLKZXVwA83WKZG';
const RES_API_TOKEN = process.env.RES_API_TOKEN || RES_API_TOKEN_FALLBACK;
const UPSTREAM_TIMEOUT_MS = 12000;

if (!process.env.RES_API_TOKEN) {
    console.warn('[parcel] RES_API_TOKEN env var is not set — using hardcoded suite default. Set it in Vercel for the production deploy.');
}

// Swiss EGRID: "CH" followed by 12 digits. Validating upstream avoids
// passing malformed identifiers straight to the RES API.
const EGRID_RE = /^CH\d{12}$/i;

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

export default async function handler(req, res) {
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
            send(res, 400, { error: 'Invalid JSON body' });
            return;
        }
    } else {
        body = req.body;
    }

    const egrid = typeof body?.egrid === 'string' ? body.egrid.trim() : null;
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    if (!egrid && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
        send(res, 400, { error: "Provide either 'egrid' or 'lat'/'lng'" });
        return;
    }
    if (egrid && !EGRID_RE.test(egrid)) {
        send(res, 400, { error: "Invalid 'egrid' format — expected CH followed by 12 digits" });
        return;
    }

    const upstreamBody = {};
    if (egrid) upstreamBody.egrid = egrid;
    else {
        upstreamBody.lat = lat;
        upstreamBody.lng = lng;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
        const upstream = await fetch(RES_PARCEL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                token: RES_API_TOKEN,
            },
            body: JSON.stringify(upstreamBody),
            signal: controller.signal,
        });
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
            'public, s-maxage=3600, stale-while-revalidate=86400',
        );
        send(res, 200, parsed);
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        send(res, 502, { error: 'parcel service unreachable', details: msg });
    } finally {
        clearTimeout(timer);
    }
}
