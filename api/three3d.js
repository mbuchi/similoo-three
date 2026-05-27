// Vercel Node serverless function.
//
// Proxies POST /api/three3d/terrain  → CONTOOR /api/v1/pointcloud/glb
//         POST /api/three3d/building → CONTOOR /api/v1/building-model
//
// We forward the request body, set the optional X-API-Key server-side
// (CONTOOR_3D_API_KEY env var), and stream the GLB binary back to the
// client. The metadata header (X-GLB-Metadata) is mirrored verbatim
// so the Three.js client can recover the request origin.
//
// One single handler routes both endpoints via the trailing path; this
// keeps Vercel function count low (only one function file).

export const config = { maxDuration: 60 };

const CONTOOR_BASE =
    process.env.CONTOOR_3D_API_BASE ||
    'https://contoor-api-contabo.gisjoe.com';
const UPSTREAM_TIMEOUT_MS = 45_000;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function setCors(res) {
    for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
}

function sendJson(res, status, body) {
    setCors(res);
    res.setHeader('Content-Type', 'application/json');
    res.status(status).end(JSON.stringify(body));
}

// Vercel passes the rest of the path under `req.query.path` (a string[]
// from the rewrite, or a "/"-joined string when called as
// /api/three3d?path=terrain). We normalise both shapes.
function readPath(req) {
    const raw = req.query?.path;
    if (Array.isArray(raw)) return raw.join('/');
    if (typeof raw === 'string') return raw;
    const u = req.url || '';
    const after = u.split('/api/three3d/')[1] || '';
    return after.split('?')[0];
}

const ROUTES = {
    terrain: '/api/v1/pointcloud/glb',
    building: '/api/v1/building-model',
};

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        setCors(res);
        res.status(204).end();
        return;
    }
    if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
    }

    const op = readPath(req);
    const upstreamPath = ROUTES[op];
    if (!upstreamPath) {
        sendJson(res, 404, { error: `Unknown 3D op '${op}'`, allowed: Object.keys(ROUTES) });
        return;
    }

    let body;
    if (typeof req.body === 'string') {
        try { body = JSON.parse(req.body); } catch {
            sendJson(res, 400, { error: 'Invalid JSON body' });
            return;
        }
    } else {
        body = req.body || {};
    }

    const headers = { 'Content-Type': 'application/json' };
    if (process.env.CONTOOR_3D_API_KEY) {
        headers['X-API-Key'] = process.env.CONTOOR_3D_API_KEY;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
        const upstream = await fetch(`${CONTOOR_BASE}${upstreamPath}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        if (!upstream.ok) {
            const text = await upstream.text().catch(() => '');
            sendJson(res, upstream.status >= 500 ? 502 : upstream.status, {
                error: `Upstream ${upstream.status}`,
                detail: text.slice(0, 400),
            });
            return;
        }

        setCors(res);
        const ct = upstream.headers.get('Content-Type') || 'model/gltf-binary';
        res.setHeader('Content-Type', ct);
        const meta = upstream.headers.get('X-GLB-Metadata');
        if (meta) res.setHeader('X-GLB-Metadata', meta);
        // Caching: GLBs are derived from static raw data, safe to cache
        // hard at the CDN. Same key = same answer (the lat/lng+radius are
        // in the request body, so we rely on body-aware client caching).
        res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');

        const buf = Buffer.from(await upstream.arrayBuffer());
        res.status(200).end(buf);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        sendJson(res, 502, { error: 'three3d upstream unreachable', detail: msg });
    } finally {
        clearTimeout(timer);
    }
}
