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

const TERRAIN_ENDPOINT = '/api/three3d/terrain';
const BUILDING_ENDPOINT = '/api/three3d/building';
const FOOTPRINTS_ENDPOINT = '/api/three3d/footprints';

async function fetchGLBWithMeta(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`three3d ${res.status}: ${text.slice(0, 200)}`);
    }
    const ct = res.headers.get('Content-Type') || '';
    if (ct.includes('application/json')) {
        // Upstream answered with the link JSON rather than the binary —
        // can happen if return_data is silently dropped. Surface it as
        // an explicit error rather than handing the loader a JSON blob.
        const text = await res.text().catch(() => '');
        throw new Error(`three3d expected GLB binary, got JSON: ${text.slice(0, 200)}`);
    }
    const blob = await res.blob();
    const metaHeader = res.headers.get('X-GLB-Metadata');
    let metadata = null;
    if (metaHeader) {
        try { metadata = JSON.parse(metaHeader); }
        catch (e) { console.warn('three3d: malformed X-GLB-Metadata header', e); }
    }
    return { blob, metadata };
}

export function fetchTerrainGLB({ lat, lng, radius_m = 100 }) {
    return fetchGLBWithMeta(TERRAIN_ENDPOINT, {
        lat,
        lng,
        bbox_radius_m: radius_m,
        return_data: true,
    });
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
    const res = await fetch(FOOTPRINTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, radius_m }),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`footprints ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
}
