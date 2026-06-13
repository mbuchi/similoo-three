// Client for the Contoor 3D API, fronted by /api/three3d (Vercel proxy).
//
// Three operations the scene viewer needs:
//
//   * fetchTerrainGLB({ lat, lng, radius_m }) — sync GLB of the local
//     terrain mesh, vertices in local meters with origin at the request
//     center. See project_res_3D_api/app/services/pointcloud.py — the
//     export uses (X=east, Y=up, -Z=north) order so Three.js can render
//     it directly.
//
//   * fetchBuildingGLB({ lat, lng }) — sync GLB of the building whose
//     footprint contains the point. Vertices are absolute LV95
//     (X=easting, Y=northing, Z=elevation); the scene viewer applies
//     a single LV95→Three.js transform to place it on the terrain.
//
//   * fetchFootprintsBBox({ lat, lng, radius_m }) — list every
//     building footprint inside the BBOX, with its WGS84 centroid and
//     LV95 reference point. Used to drive multi-building rendering.
//
// All endpoints are proxied to keep the optional X-API-Key server-side.

import { getCached, setCached, TTL } from '../cache.js';
import { cachedArrayBuffer } from './blobCache.js';

const TERRAIN_ENDPOINT = '/api/three3d/terrain';
const BUILDING_ENDPOINT = '/api/three3d/building';
const FOOTPRINTS_ENDPOINT = '/api/three3d/footprints';
const HEIGHT_VOLUME_ENDPOINT = '/api/three3d/height-volume';

// GLB files begin with the little-endian magic "glTF" (0x46546C67). We use
// this to detect the case where the upstream returned its JSON link
// response instead of the binary — both on a fresh fetch and on a cache
// read — without depending on the Content-Type header (which the
// IndexedDB blob cache doesn't preserve across hits).
const GLB_MAGIC = 0x46546c67;

function looksLikeGLB(buf) {
    if (!buf || buf.byteLength < 4) return false;
    return new DataView(buf).getUint32(0, true) === GLB_MAGIC;
}

async function fetchGLBWithMeta(url, body) {
    // Route the heavy GLB binary through the IndexedDB blob cache. The
    // body (which carries the coordinate) is part of the cache key, so the
    // same address re-opens from disk instead of re-hitting Contoor. On any
    // storage failure cachedArrayBuffer degrades to a plain network fetch.
    const init = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    };
    const buf = await cachedArrayBuffer(url, init);
    if (!looksLikeGLB(buf)) {
        // Upstream answered with the link JSON rather than the binary —
        // can happen if return_data is silently dropped. Surface it as an
        // explicit error rather than handing the loader a JSON blob. (A
        // non-GLB body is never written to the cache by a future fetch,
        // and an old JSON body fails this check too.)
        let text = '';
        try { text = new TextDecoder().decode(buf.slice(0, 200)); } catch {}
        throw new Error(`three3d expected GLB binary, got non-GLB: ${text.slice(0, 200)}`);
    }
    // Metadata rides on a response header which the blob cache can't store;
    // it's only populated on a network miss. Nothing downstream depends on
    // it today (the scene viewer raycasts the terrain for elevation), so a
    // null on a cache hit is harmless.
    return { arrayBuffer: buf, metadata: null };
}

export function fetchTerrainGLB({ lat, lng, radius_m = 100, classes = null }) {
    const body = {
        lat,
        lng,
        bbox_radius_m: radius_m,
        return_data: true,
    };
    // Filter the LAS point cloud by classification before generating
    // the GLB. Supported classes (per Contoor docs): 'ground',
    // 'vegetation', 'tree', 'trees', 'buildings'. Pass null/[] to get
    // the full unfiltered cloud (the default).
    if (Array.isArray(classes) && classes.length) {
        body.selected_pointcloud_class = classes;
    }
    return fetchGLBWithMeta(TERRAIN_ENDPOINT, body);
}

export function fetchBuildingGLB({ lat, lng }) {
    // return_data=true + a single format makes the upstream stream the
    // GLB binary back; without it the upstream returns a JSON link
    // response and our loader fails.
    return fetchGLBWithMeta(BUILDING_ENDPOINT, {
        lat,
        lng,
        formats: ['glb'],
        package: false,
        return_data: true,
    });
}

export async function fetchFootprintsBBox({ lat, lng, radius_m = 100 }) {
    // Footprints in a bbox are static cadastre — panning/zooming back to an
    // area should hit localStorage instead of re-querying Contoor. The radius
    // is part of the key because a larger bbox is a superset, not the same
    // response. Rounding to 5 decimals (~1 m) keeps coordinate round-trips
    // through the URL on the same cache entry. Degrades silently to a plain
    // fetch on any storage error (getCached/setCached swallow their own).
    const cacheKey = `footprints:${lat.toFixed(5)},${lng.toFixed(5)}:r${radius_m}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const res = await fetch(FOOTPRINTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, radius_m }),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`footprints ${res.status}: ${text.slice(0, 200)}`);
    }
    const payload = await res.json();
    // Cache only a non-empty footprint list. The proxy always answers 200
    // with a `buildings` array (empty when the WFS bbox hit nothing), and an
    // empty bbox can be transient (tile not yet ingested upstream), so don't
    // pin an empty answer for 7 days.
    if (Array.isArray(payload?.buildings) && payload.buildings.length) {
        setCached(cacheKey, payload, TTL.footprints);
    }
    return payload;
}

// Combined height + volume metrics for the building footprint at
// (lat, lng). Returns the Contoor BuildingHeightVolumeResponse shape:
//   { input, coordinate2056, status:{height,volume}, height:{...}, volume:{...}, errors, meta }
// Either or both of `height` / `volume` may be null if upstream failed
// to compute one component; the `status` flags indicate which worked.
export async function fetchBuildingHeightVolume({ lat, lng, radiusMeters = null }) {
    const body = { lat, lng };
    if (radiusMeters != null) body.radiusMeters = radiusMeters;
    // ~1 m precision is overkill for caching: two clicks near the same
    // footprint should hit the same cache entry. Rounding to 5 decimals
    // is fine because Contoor matches building footprints by spatial
    // intersection upstream.
    const cacheKey = `hv:${lat.toFixed(5)},${lng.toFixed(5)}${radiusMeters != null ? `:r${radiusMeters}` : ''}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const res = await fetch(HEIGHT_VOLUME_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`height-volume ${res.status}: ${text.slice(0, 200)}`);
    }
    const payload = await res.json();
    // Cache only when at least one component succeeded — partial
    // failures might be transient (e.g. tile not yet downloaded).
    if (payload?.status?.height || payload?.status?.volume) {
        setCached(cacheKey, payload, TTL.heightVolume);
    }
    return payload;
}
