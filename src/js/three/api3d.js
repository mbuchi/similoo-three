// Client for the Contoor 3D API, fronted by /api/three3d (Vercel proxy).
//
// We expose two operations the scene viewer needs for similoo-three:
//
//   * fetchTerrainGLB({ lat, lng, radius_m }) — sync GLB of the local
//     terrain mesh, vertices in local meters with origin at the request
//     center. See project_res_3D_api/app/services/pointcloud.py — the
//     export uses (X=east, Y=up, -Z=north) order so Three.js can render
//     it directly.
//
//   * fetchBuildingGLB({ lat, lng }) — sync GLB of the building footprint
//     that contains the point. Returned in WGS84-derived local meters;
//     the response's X-GLB-Metadata header carries the origin so we can
//     align it with the terrain.
//
// Both endpoints are proxied to keep the optional X-API-Key server-side.

const TERRAIN_ENDPOINT = '/api/three3d/terrain';
const BUILDING_ENDPOINT = '/api/three3d/building';

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
    return fetchGLBWithMeta(BUILDING_ENDPOINT, {
        lat,
        lng,
        formats: ['glb'],
    });
}
