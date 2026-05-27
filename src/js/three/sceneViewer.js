// Three.js scene for a single Swiss address with its neighbourhood.
//
// Renders a ~100 m slice around the picked location:
//   * Terrain GLB (from /api/v1/pointcloud/glb). Origin (0,0,0) is the
//     request lat/lng, Z-up flipped to Three.js Y-up, vertices in
//     local meters.
//   * Every building GLB (from /api/v1/building-model) whose footprint
//     falls in the BBOX. The GLBs carry absolute LV95 vertices, so we
//     position each via a single shared Matrix4 that subtracts the
//     terrain origin and swaps axes (LV95 X/Y/Z → Three.js X/-Z/Y).
//   * The building containing the picked point is highlighted; its
//     neighbours render in a neutral tone.
//   * OrbitControls give the user free pan/zoom/orbit; the camera
//     starts pulled back so the full 100 m slice fits in frame.
//
// Imports are tree-shaken from the `three` package; addon paths use the
// /examples/jsm/ subpath that three's package.exports publishes
// (three v0.184+).

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { fetchTerrainGLB, fetchBuildingGLB, fetchFootprintsBBox } from './api3d.js';
import { wgs84ToLV95 } from './swissCoords.js';

const SCENE_RADIUS_M = 100;
// The upstream API serialises heavy Roofer jobs, so the proxy retries
// 503s with backoff. Keep client concurrency low to limit retry noise
// while still pipelining one cache-hit lookup behind the active job.
const BUILDING_FETCH_CONCURRENCY = 2;

export function createSceneViewer({ container, onStatus }) {
    if (!container) throw new Error('createSceneViewer: container is required');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(80, 120, 60);
    scene.add(sun);

    const camera = new THREE.PerspectiveCamera(
        50,
        container.clientWidth / Math.max(1, container.clientHeight),
        0.5,
        2000,
    );
    camera.position.set(120, 110, 120);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controls.minDistance = 25;
    controls.maxDistance = 600;
    controls.maxPolarAngle = Math.PI * 0.49;

    // Reference grid so the user has a sense of scale before assets
    // land (100 m × 100 m, 10 m cells).
    const grid = new THREE.GridHelper(SCENE_RADIUS_M * 2, 20, 0xb0b8c1, 0xd9dfe6);
    grid.material.transparent = true;
    grid.material.opacity = 0.55;
    grid.position.y = 0;
    scene.add(grid);

    const sceneGroup = new THREE.Group();
    sceneGroup.name = 'address-scene';
    scene.add(sceneGroup);

    const loader = new GLTFLoader();
    let disposed = false;
    let resizeRaf = 0;
    let loadToken = 0;

    function setStatus(msg) {
        if (typeof onStatus === 'function') onStatus(msg);
    }

    function disposeNode(child) {
        child.traverse?.((node) => {
            if (node.isMesh) {
                node.geometry?.dispose?.();
                if (Array.isArray(node.material)) {
                    node.material.forEach((m) => m.dispose?.());
                } else {
                    node.material?.dispose?.();
                }
            }
        });
    }

    function clearGroup(group) {
        while (group.children.length) {
            const child = group.children.pop();
            disposeNode(child);
        }
    }

    async function loadGLBBlob(blob) {
        const buf = await blob.arrayBuffer();
        return new Promise((resolve, reject) => {
            loader.parse(buf, '', resolve, reject);
        });
    }

    // Build the matrix that maps a GLB whose vertices are absolute LV95
    // (X=easting, Y=northing, Z=elevation) into the terrain's local
    // frame (X=east offset, Y=elevation offset, Z=-north offset).
    //
    // We default originZ to 0; the per-building "seatOnTerrain" pass
    // then raycasts onto the terrain mesh to drop each building onto
    // the surface, which removes the need for upstream metadata about
    // the terrain's minimum elevation.
    function makeLV95ToLocalMatrix(centerE, centerN, originZ) {
        const m = new THREE.Matrix4();
        // Row-major: swap LV95 (X,Y,Z) → Three.js (X, Z, -Y).
        m.set(
            1,  0, 0, -centerE,
            0,  0, 1, -originZ,
            0, -1, 0,  centerN,
            0,  0, 0,  1,
        );
        return m;
    }

    // Find the highest terrain Y near a given (x, z) point.
    //
    // The terrain GLB is exported as a Point Cloud (THREE.Points),
    // which makes triangle raycasting unreliable. Instead, we scan the
    // terrain's vertex buffer once (cached on the terrain object) and
    // for each query find the highest point inside a search radius
    // around the query (x, z). This is O(N) per call but N is fixed
    // (tens of thousands at most) and the work is trivially fast.
    function getTerrainHeightAt(terrainObject, x, z, radius = 3.0) {
        if (!terrainObject) return null;
        // Cache flattened vertex arrays on the terrain object so we
        // don't re-walk the scene graph for every building.
        if (!terrainObject.userData.__pointArrays) {
            const arrays = [];
            terrainObject.updateWorldMatrix(true, true);
            terrainObject.traverse((node) => {
                const geo = node.geometry;
                const posAttr = geo?.attributes?.position;
                if (!posAttr) return;
                // Bake world transform into a flat Float32Array so we
                // can scan without re-multiplying every call.
                const out = new Float32Array(posAttr.count * 3);
                const v = new THREE.Vector3();
                for (let i = 0; i < posAttr.count; i++) {
                    v.fromBufferAttribute(posAttr, i);
                    v.applyMatrix4(node.matrixWorld);
                    out[i * 3] = v.x;
                    out[i * 3 + 1] = v.y;
                    out[i * 3 + 2] = v.z;
                }
                arrays.push(out);
            });
            terrainObject.userData.__pointArrays = arrays;
        }
        const r2 = radius * radius;
        let bestY = -Infinity;
        for (const arr of terrainObject.userData.__pointArrays) {
            for (let i = 0; i < arr.length; i += 3) {
                const dx = arr[i] - x;
                const dz = arr[i + 2] - z;
                if (dx * dx + dz * dz <= r2) {
                    const yy = arr[i + 1];
                    if (yy > bestY) bestY = yy;
                }
            }
        }
        return isFinite(bestY) ? bestY : null;
    }

    // Drop a freshly-placed building onto the terrain.
    //
    // The building's matrix transform leaves it at absolute-elevation
    // height (the upstream's terrain min_z is not exposed). We sample
    // the terrain near the building's footprint centroid and translate
    // the building so its lowest vertex sits at the local ground.
    function seatOnTerrain(buildingNode, terrainObject) {
        if (!terrainObject) return false;
        const box = new THREE.Box3().setFromObject(buildingNode);
        if (!isFinite(box.min.x) || !isFinite(box.max.x)) return false;
        const center = box.getCenter(new THREE.Vector3());

        // Try progressively larger search radii until we hit terrain
        // points. Switzerland's LIDAR is dense (~0.5 m spacing for the
        // ground class), so r=2 m almost always succeeds.
        let terrainY = null;
        for (const r of [2.0, 4.0, 8.0, 16.0]) {
            terrainY = getTerrainHeightAt(terrainObject, center.x, center.z, r);
            if (terrainY != null) break;
        }
        if (terrainY == null) return false;

        const dy = terrainY - box.min.y;
        buildingNode.position.y += dy;
        return true;
    }

    function applyTargetMaterial(root) {
        root.traverse((node) => {
            if (node.isMesh) {
                node.material = new THREE.MeshStandardMaterial({
                    color: 0xdc2626,
                    roughness: 0.55,
                    metalness: 0.05,
                });
            }
        });
    }

    function applyNeighbourMaterial(root) {
        root.traverse((node) => {
            if (node.isMesh) {
                node.material = new THREE.MeshStandardMaterial({
                    color: 0xcfd4db,
                    roughness: 0.82,
                    metalness: 0.0,
                    flatShading: true,
                });
                // Subtle dark outline so adjacent buildings read as
                // separate volumes against a mostly-uniform palette.
                const edges = new THREE.EdgesGeometry(node.geometry, 25);
                const line = new THREE.LineSegments(
                    edges,
                    new THREE.LineBasicMaterial({
                        color: 0x6b727a,
                        transparent: true,
                        opacity: 0.35,
                    }),
                );
                node.add(line);
            }
        });
    }

    function applyTerrainMaterial(root) {
        root.traverse((node) => {
            if (node.isMesh) {
                node.material = new THREE.MeshStandardMaterial({
                    color: 0x9ba9a3,
                    roughness: 1.0,
                    flatShading: true,
                });
            }
        });
    }

    // Pool that pulls items from a list with a fixed concurrency. Each
    // worker calls `iterate` on the next item until the list is empty.
    async function processWithConcurrency(items, worker, concurrency) {
        const queue = items.slice();
        const workers = [];
        for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
            workers.push((async () => {
                while (queue.length) {
                    const next = queue.shift();
                    try {
                        await worker(next);
                    } catch (err) {
                        // Per-item failures are logged but don't abort.
                        console.warn('building worker failed', err);
                    }
                }
            })());
        }
        await Promise.all(workers);
    }

    async function loadAddress({ lat, lng }) {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            throw new Error('loadAddress: invalid lat/lng');
        }
        const token = ++loadToken;

        clearGroup(sceneGroup);
        // sceneGroup just got nuked — recreate the buildings sub-group.
        const localBuildingsGroup = new THREE.Group();
        localBuildingsGroup.name = 'buildings';
        sceneGroup.add(localBuildingsGroup);

        setStatus('Loading terrain…');

        // Compute the terrain origin's LV95 ourselves (the upstream
        // doesn't echo it in a header). The Swisstopo approximate
        // formula is accurate to ~1 m which is fine for this scene.
        const { easting: centerE, northing: centerN } = wgs84ToLV95(lng, lat);

        let terrainObject = null;
        let terrainMeta = null;

        try {
            const { blob, metadata } = await fetchTerrainGLB({
                lat,
                lng,
                radius_m: SCENE_RADIUS_M,
            });
            if (token !== loadToken) return { aborted: true };
            terrainMeta = metadata;
            const gltf = await loadGLBBlob(blob);
            const terrain = gltf.scene;
            terrain.name = 'terrain';
            applyTerrainMaterial(terrain);
            sceneGroup.add(terrain);
            terrainObject = terrain;
        } catch (err) {
            console.warn('terrain load failed', err);
            setStatus('Terrain unavailable — buildings only.');
        }

        // We can't get terrain min_z from the upstream (the metadata
        // endpoint is buggy for cache hits), so we leave originZ=0 in
        // the LV95→local matrix and seat each building on the terrain
        // mesh via raycasting after it lands.
        const raycaster = new THREE.Raycaster();

        // Pre-aim the camera while buildings stream in.
        controls.target.set(0, 10, 0);
        camera.position.set(140, 130, 140);
        controls.update();

        setStatus('Listing nearby buildings…');

        let footprints = null;
        try {
            footprints = await fetchFootprintsBBox({
                lat,
                lng,
                radius_m: SCENE_RADIUS_M,
            });
        } catch (err) {
            console.warn('footprints fetch failed', err);
            setStatus('Could not list nearby buildings — fetching central building only.');
        }
        if (token !== loadToken) return { aborted: true };

        const lv95ToLocal = makeLV95ToLocalMatrix(centerE, centerN, 0);

        // Identify the picked building: nearest centroid to the request
        // point, within a small distance gate.
        const buildings = (footprints?.buildings || []).map((b) => ({
            ...b,
            distM: Math.hypot(b.easting - centerE, b.northing - centerN),
        }));
        let targetId = null;
        if (buildings.length) {
            const nearest = buildings.reduce(
                (best, b) => (b.distM < best.distM ? b : best),
                buildings[0],
            );
            if (nearest.distM <= 60) targetId = nearest.id;
        }

        // Fallback when the WFS list is empty/unavailable: just fetch
        // the single building at the request point, the original
        // behaviour.
        if (!buildings.length) {
            setStatus('Loading building…');
            try {
                const { blob } = await fetchBuildingGLB({ lat, lng });
                if (token !== loadToken) return { aborted: true };
                const gltf = await loadGLBBlob(blob);
                const building = gltf.scene;
                building.name = 'target-building';
                building.applyMatrix4(lv95ToLocal);
                seatOnTerrain(building, terrainObject, raycaster);
                applyTargetMaterial(building);
                localBuildingsGroup.add(building);
                frameOnContent(localBuildingsGroup);
            } catch (err) {
                console.warn('central building load failed', err);
                setStatus('No building mesh available for this point.');
                return { terrainMeta, building: false };
            }
            setStatus('');
            return { terrainMeta, building: true, neighbours: 0 };
        }

        // Multi-building rendering. Stream each into the scene as soon
        // as it lands so the user sees progress.
        let done = 0;
        let frameDone = false;
        const total = buildings.length;
        setStatus(`Loading buildings (0/${total})…`);

        await processWithConcurrency(
            buildings,
            async (b) => {
                if (token !== loadToken) return;
                try {
                    const { blob } = await fetchBuildingGLB({
                        lat: b.lat,
                        lng: b.lng,
                    });
                    if (token !== loadToken) return;
                    const gltf = await loadGLBBlob(blob);
                    const node = gltf.scene;
                    node.name = `bldg-${b.id}`;
                    node.userData = {
                        id: b.id,
                        address: b.address,
                        gwr_bldg_id: b.gwr_bldg_id,
                        const_year: b.const_year,
                        floors: b.floors,
                    };
                    node.applyMatrix4(lv95ToLocal);
                    seatOnTerrain(node, terrainObject, raycaster);
                    if (b.id === targetId) {
                        applyTargetMaterial(node);
                    } else {
                        applyNeighbourMaterial(node);
                    }
                    localBuildingsGroup.add(node);

                    // Once the target has landed, reframe the camera
                    // onto it; otherwise frame the first building so
                    // the user has something to look at.
                    if (!frameDone && (b.id === targetId || done === 0)) {
                        frameOnObject(node);
                        if (b.id === targetId) frameDone = true;
                    }
                } finally {
                    done += 1;
                    setStatus(`Loading buildings (${done}/${total})…`);
                }
            },
            BUILDING_FETCH_CONCURRENCY,
        );

        if (token !== loadToken) return { aborted: true };

        // Final framing pass: if we never homed in on the target,
        // frame whatever ended up in the group.
        if (!frameDone) frameOnContent(localBuildingsGroup);

        setStatus('');
        return {
            terrainMeta,
            building: true,
            neighbours: localBuildingsGroup.children.length,
            target: targetId,
        };
    }

    function frameOnObject(obj) {
        const box = new THREE.Box3().setFromObject(obj);
        if (!isFinite(box.min.x) || !isFinite(box.max.x)) return;
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const reach = Math.max(40, size.x, size.z, size.y * 1.4);
        controls.target.set(center.x, center.y * 0.6, center.z);
        camera.position.set(
            center.x + reach * 1.4,
            center.y + reach * 1.1,
            center.z + reach * 1.4,
        );
        controls.update();
    }

    function frameOnContent(group) {
        const box = new THREE.Box3().setFromObject(group);
        if (!isFinite(box.min.x) || !isFinite(box.max.x)) return;
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const reach = Math.max(SCENE_RADIUS_M * 1.2, size.x, size.z, size.y * 1.4);
        controls.target.set(center.x, center.y * 0.6, center.z);
        camera.position.set(
            center.x + reach,
            center.y + reach,
            center.z + reach,
        );
        controls.update();
    }

    function onResize() {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w === 0 || h === 0) return;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });
    }
    window.addEventListener('resize', onResize);

    function tick() {
        if (disposed) return;
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
    }
    tick();

    return {
        loadAddress,
        dispose() {
            disposed = true;
            window.removeEventListener('resize', onResize);
            controls.dispose();
            clearGroup(sceneGroup);
            renderer.dispose();
            if (renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement);
            }
        },
    };
}
