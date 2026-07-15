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

import {
    fetchTerrainGLB,
    fetchBuildingGLB,
    fetchFootprintsBBox,
    fetchBuildingHeightVolume,
} from './api3d.js';
import { wgs84ToLV95 } from './swissCoords.js';
import { createSkyDome, SKY_PALETTES } from './sky.js';
import { createCompass } from './compass.js';
import { createScaleLegend } from './scaleLegend.js';
import { createBuildingInfoPanel } from './buildingInfoPanel.js';
import { createLayersToggle } from './layersToggle.js';
import { sunDirection, sunTint } from './sunCalc.js';
import { createSunControl } from './sunControl.js';
import { createSaveParcelButton } from './saveParcelButton.js';
import { createMobileSceneControls } from './mobileSceneControls.js';

const SCENE_RADIUS_M = 100;
// The upstream API serialises heavy Roofer jobs, so the proxy retries
// 503s with backoff. Keep client concurrency low to limit retry noise
// while still pipelining one cache-hit lookup behind the active job.
const BUILDING_FETCH_CONCURRENCY = 2;

// Pointer drag threshold (CSS px) used to distinguish a click on a
// building from an orbit drag. Pointers that move less than this
// between pointerdown and pointerup are treated as clicks.
const CLICK_DRAG_THRESHOLD_PX = 5;

export function createSceneViewer({ container, onStatus, onBuildingPicked }) {
    if (!container) throw new Error('createSceneViewer: container is required');

    const scene = new THREE.Scene();

    // Procedural sky dome that follows the camera (a true skybox), so
    // the horizon stays visually consistent at any orbit position.
    const sky = createSkyDome({ radius: 1500 });
    scene.add(sky.mesh);
    // Initial palette is set further below via updateSunFromDate(),
    // once the sun control + currentSunDate are wired up. Until then
    // the dome carries createSkyDome's neutral default.

    const hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 0.7);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    // Position is recomputed by updateSunFromDate() once we know the
    // scene's lat/lng + the user-picked time. The initial direction
    // (mid-day SE) is just a sensible default while no scene is
    // loaded yet.
    sun.position.set(80, 120, 60);
    sun.castShadow = true;
    // Shadow camera covers the 100 m × 100 m scene with headroom for
    // tall buildings; map size is a power of two large enough that
    // building outlines stay sharp without burning fillrate.
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 400;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    scene.add(sun.target);

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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controls.minDistance = 25;
    controls.maxDistance = 600;
    controls.maxPolarAngle = Math.PI * 0.49;
    // Smooth keyboard panning via OrbitControls' built-in keys.
    controls.listenToKeyEvents(renderer.domElement);
    controls.keyPanSpeed = 12;

    // Overlays — compass + scale legend live on top of the canvas
    // (inside the container) and update once per frame.
    const compass = createCompass({
        container,
        controls,
        onResetNorth() {
            // Reset orbit to face north (azimuth = 0) while preserving
            // the current target/polar/distance — feels like "snap to
            // North" rather than a full reset.
            const spherical = new THREE.Spherical().setFromVector3(
                camera.position.clone().sub(controls.target),
            );
            spherical.theta = 0;
            const next = new THREE.Vector3().setFromSpherical(spherical);
            camera.position.copy(controls.target).add(next);
            controls.update();
        },
    });
    const scaleLegend = createScaleLegend({
        container,
        camera,
        controls,
        renderer,
    });
    const infoPanel = createBuildingInfoPanel({ container });

    // Save-parcel button mounts in the info panel's footer slot. Wired
    // to the SwissNovo PRM (Parcel Registry Management) backend via
    // shared helpers — picks up Zitadel auth automatically.
    const saveParcel = createSaveParcelButton({ container: infoPanel.getFooter() });

    // Sun control (bottom-centre): drives the DirectionalLight via
    // solar geometry so users can see real shadows at any time of day.
    let currentSunDate = new Date();
    // Center of Switzerland is a sensible default until loadAddress lands.
    const DEFAULT_LATLNG = { lat: 46.8, lng: 8.2 };
    // Distance along the sun direction at which we park the
    // DirectionalLight. Must be larger than the scene's bbox so the
    // shadow camera's frustum captures everything.
    const SUN_DISTANCE_M = 220;
    const sunControl = createSunControl({
        container,
        initialDate: currentSunDate,
        onChange: (date) => {
            currentSunDate = date;
            updateSunFromDate();
        },
    });

    function updateSunFromDate() {
        const where = currentLatLng || DEFAULT_LATLNG;
        const { x, y, z, elevation } = sunDirection(currentSunDate, where.lat, where.lng);
        sun.position.set(
            controls.target.x + x * SUN_DISTANCE_M,
            controls.target.y + Math.max(0.05, y) * SUN_DISTANCE_M,
            controls.target.z + z * SUN_DISTANCE_M,
        );
        // When the sun is below horizon we keep the light just above 0
        // for the shadow camera to still cover the scene, but we drop
        // its intensity (night mode).
        const tint = sunTint(elevation);
        sun.color.setHex(tint.color);
        sun.intensity = tint.intensity;
        // Update sky palette for golden hour / night.
        applyAtmosphere(elevation);
        sunControl.setAltitude(elevation);
    }

    // Sky palette refinement that accounts for solar elevation on top
    // of the page theme. Below horizon dims the dome to night; near
    // horizon warms the horizon stripe.
    // (The first-paint updateSunFromDate() call lives after currentLatLng is
    // declared below — calling it here would hit a `let` temporal-dead-zone
    // under strict ESM and throw "Cannot access 'currentLatLng' before
    // initialization".)

    function applyAtmosphere(elevation) {
        const themeAttr = document.documentElement.getAttribute('data-theme');
        const base = themeAttr === 'dark' ? SKY_PALETTES.dark : SKY_PALETTES.light;
        if (!Number.isFinite(elevation) || elevation <= 0) {
            // Night: deep blue top, very dark horizon.
            sky.setPalette({
                top: 0x0b1220,
                bottom: 0x18243d,
                exponent: 0.55,
                offset: 33,
            });
            hemi.color.setHex(0x6b8caf);
            hemi.groundColor.setHex(0x0f172a);
            hemi.intensity = 0.25;
            return;
        }
        if (elevation < 10 * Math.PI / 180) {
            // Golden hour: warm horizon, slightly muted top.
            sky.setPalette({
                top: themeAttr === 'dark' ? 0x1b2842 : 0x6b7faf,
                bottom: 0xf6c47a,
                exponent: 0.5,
                offset: 33,
            });
            hemi.color.setHex(0xffd9b0);
            hemi.groundColor.setHex(themeAttr === 'dark' ? 0x1a2238 : 0x44485f);
            hemi.intensity = themeAttr === 'dark' ? 0.4 : 0.6;
            return;
        }
        // Daytime: use the theme's base palette.
        sky.setPalette(base);
        if (themeAttr === 'dark') {
            hemi.color.setHex(0xb8d4ff);
            hemi.groundColor.setHex(0x1a2238);
            hemi.intensity = 0.45;
        } else {
            hemi.color.setHex(0xffffff);
            hemi.groundColor.setHex(0x445566);
            hemi.intensity = 0.7;
        }
    }

    // Layers dock (top-right under the compass). The vegetation toggle
    // is the only layer today; future toggles (zoning overlay etc.)
    // plug into the same dock.
    const layersDock = createLayersToggle({ container });
    let vegetationOverlay = null;       // { node: THREE.Object3D } once loaded
    let vegetationLoading = null;       // in-flight promise; reused on rapid toggling
    let vegetationActive = false;       // user intent — preserved across address changes
    let currentLatLng = null;           // last loaded address for vegetation re-fetch

    // First paint with the default location + 'now' so the scene doesn't open
    // with the boilerplate (80, 120, 60) sun direction. Must run after the
    // currentLatLng declaration above (see the TDZ note further up).
    updateSunFromDate();

    layersDock.addToggle({
        id: 'vegetation',
        labelKey: 'scene.layer_vegetation',
        fallbackLabel: 'Vegetation',
        icon: 'trees',
        onToggle: async (next) => {
            vegetationActive = next;
            if (next) {
                if (!vegetationOverlay) {
                    if (!currentLatLng) return; // wait for first address
                    if (!vegetationLoading) vegetationLoading = loadVegetationOverlay(currentLatLng);
                    vegetationOverlay = await vegetationLoading;
                    vegetationLoading = null;
                }
                if (vegetationOverlay?.node) vegetationOverlay.node.visible = true;
            } else if (vegetationOverlay?.node) {
                vegetationOverlay.node.visible = false;
            }
        },
    });

    // Keep the canvas clear by default on phones: the layer dock and wide sun
    // timeline share one bottom-right launcher and dismissible bottom sheet.
    const mobileSceneControls = createMobileSceneControls({
        container,
        controls: [layersDock.root, sunControl.root],
    });

    async function loadVegetationOverlay({ lat, lng }) {
        const { arrayBuffer } = await fetchTerrainGLB({
            lat,
            lng,
            radius_m: SCENE_RADIUS_M,
            classes: ['vegetation', 'trees'],
        });
        const gltf = await loadGLBBuffer(arrayBuffer);
        const node = gltf.scene;
        node.name = 'vegetation-overlay';
        // Tint the vegetation points a translucent canopy green so they
        // read as overlay, not as part of the base terrain.
        node.traverse((child) => {
            const mat = child.material;
            if (!mat) return;
            if (mat.color && mat.color.set) {
                mat.color.set(0x16a34a);
            }
            if (mat.size != null) {
                mat.size = Math.max(mat.size, 0.6);
            }
            mat.transparent = true;
            mat.opacity = 0.85;
        });
        sceneGroup.add(node);
        return { node };
    }

    function disposeVegetationOverlay() {
        if (vegetationOverlay?.node) {
            disposeNode(vegetationOverlay.node);
            sceneGroup.remove(vegetationOverlay.node);
        }
        vegetationOverlay = null;
        vegetationLoading = null;
    }

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

    // Parse a GLB ArrayBuffer (as delivered by the IndexedDB-cached 3D
    // API client) straight through GLTFLoader, with no intermediate Blob.
    function loadGLBBuffer(buf) {
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

    // Find the terrain GROUND Y near a given (x, z) point.
    //
    // The terrain GLB is a coloured point cloud (THREE.Points) where
    // each vertex carries the LAS classification colour. Picking the
    // highest Y indiscriminately puts buildings on top of vegetation
    // canopies and other building rooftops; instead we filter for the
    // LAS "ground" class (brown ≈ rgb(165,42,42)) and pick its
    // median-high Y in a small radius around the query.
    //
    // The filtered ground-only array is cached on the terrain object
    // so the linear scan only runs once across all buildings.
    function buildGroundIndex(terrainObject) {
        const grounds = [];
        terrainObject.updateWorldMatrix(true, true);
        const v = new THREE.Vector3();
        terrainObject.traverse((node) => {
            const geo = node.geometry;
            const posAttr = geo?.attributes?.position;
            const colAttr = geo?.attributes?.color;
            if (!posAttr) return;
            const out = [];
            for (let i = 0; i < posAttr.count; i++) {
                if (colAttr) {
                    // LAS Ground (class 2) is exported as (165,42,42).
                    // We accept a small tolerance because the colour
                    // is normalised through bufferGeometry's color
                    // attribute (Uint8 -> 0..1 floats).
                    const r = colAttr.getX(i) * 255;
                    const g = colAttr.getY(i) * 255;
                    const b = colAttr.getZ(i) * 255;
                    const isGround =
                        Math.abs(r - 165) <= 8 &&
                        Math.abs(g - 42) <= 8 &&
                        Math.abs(b - 42) <= 8;
                    if (!isGround) continue;
                }
                v.fromBufferAttribute(posAttr, i);
                v.applyMatrix4(node.matrixWorld);
                out.push(v.x, v.y, v.z);
            }
            if (out.length) grounds.push(new Float32Array(out));
        });
        return grounds;
    }

    function getGroundHeightAt(terrainObject, x, z, radius = 3.0) {
        if (!terrainObject) return null;
        if (!terrainObject.userData.__groundArrays) {
            terrainObject.userData.__groundArrays = buildGroundIndex(terrainObject);
        }
        const arrays = terrainObject.userData.__groundArrays;
        const r2 = radius * radius;
        const hits = [];
        for (const arr of arrays) {
            for (let i = 0; i < arr.length; i += 3) {
                const dx = arr[i] - x;
                const dz = arr[i + 2] - z;
                if (dx * dx + dz * dz <= r2) hits.push(arr[i + 1]);
            }
        }
        if (!hits.length) return null;
        // Use the 80th-percentile Y as the "ground level" — robust to
        // a few stray points below the surface (drainage cuts, building
        // basements that were mis-classified) while still tracking the
        // local terrain shape.
        hits.sort((a, b) => a - b);
        const idx = Math.min(hits.length - 1, Math.floor(hits.length * 0.8));
        return hits[idx];
    }

    // Drop a freshly-placed building onto the terrain.
    //
    // The building's matrix transform leaves it at absolute-elevation
    // height (the upstream's terrain min_z is not exposed). We sample
    // the terrain's ground-class points near the building footprint
    // and translate the building so its lowest vertex matches the
    // local ground level.
    function seatOnTerrain(buildingNode, terrainObject) {
        if (!terrainObject) return false;
        const box = new THREE.Box3().setFromObject(buildingNode);
        if (!isFinite(box.min.x) || !isFinite(box.max.x)) return false;
        const center = box.getCenter(new THREE.Vector3());

        // Sample at the centroid first. Around dense Swiss building
        // blocks the LIDAR can have ground gaps right under a footprint
        // (the LAS ground class excludes the building itself), so we
        // step outward until we hit ground.
        let groundY = null;
        for (const r of [2.0, 4.0, 8.0, 16.0]) {
            groundY = getGroundHeightAt(terrainObject, center.x, center.z, r);
            if (groundY != null) break;
        }
        if (groundY == null) return false;

        // Sink the building's lowest point ~10 cm below grade so its
        // base reads as planted, not levitating, on the colour-coded
        // point cloud.
        const dy = groundY - box.min.y - 0.1;
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
                node.castShadow = true;
                node.receiveShadow = true;
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
                node.castShadow = true;
                node.receiveShadow = true;
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
                // Terrain only RECEIVES shadows — point-cloud meshes
                // shouldn't cast shadows of their own (they're a
                // visualisation, not a real surface).
                node.receiveShadow = true;
            }
        });
    }

    // Theme observer: when the page theme flips, recompute the
    // atmosphere using the current sun position so day/night and
    // light/dark blend together (e.g., dark theme + golden hour
    // composes warm horizon + dark top rather than overwriting).
    const themeObserver = new MutationObserver(() => updateSunFromDate());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

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

        // clearGroup nukes vegetation overlay too — reset state and
        // we'll re-fetch below if the toggle was active for the user.
        clearGroup(sceneGroup);
        vegetationOverlay = null;
        vegetationLoading = null;
        currentLatLng = { lat, lng };
        // Recompute sun direction at the new location — same calendar
        // moment, different geographic point.
        updateSunFromDate();
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
            const { arrayBuffer, metadata } = await fetchTerrainGLB({
                lat,
                lng,
                radius_m: SCENE_RADIUS_M,
            });
            if (token !== loadToken) return { aborted: true };
            terrainMeta = metadata;
            const gltf = await loadGLBBuffer(arrayBuffer);
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
                const { arrayBuffer } = await fetchBuildingGLB({ lat, lng });
                if (token !== loadToken) return { aborted: true };
                const gltf = await loadGLBBuffer(arrayBuffer);
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
                    const { arrayBuffer } = await fetchBuildingGLB({
                        lat: b.lat,
                        lng: b.lng,
                    });
                    if (token !== loadToken) return;
                    const gltf = await loadGLBBuffer(arrayBuffer);
                    const node = gltf.scene;
                    node.name = `bldg-${b.id}`;
                    node.userData = {
                        id: b.id,
                        address: b.address,
                        gwr_bldg_id: b.gwr_bldg_id,
                        res_building_id: b.res_building_id,
                        const_year: b.const_year,
                        floors: b.floors,
                        lat: b.lat,
                        lng: b.lng,
                        distM: b.distM,
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

        // Vegetation overlay was nuked by clearGroup at the top — if the
        // user had it on, kick off a fresh fetch in the background so
        // the toggle's "on" state stays honest.
        if (vegetationActive && currentLatLng && !vegetationOverlay && !vegetationLoading) {
            vegetationLoading = loadVegetationOverlay(currentLatLng);
            vegetationLoading
                .then((overlay) => {
                    if (token !== loadToken) {
                        disposeNode(overlay.node);
                        return;
                    }
                    vegetationOverlay = overlay;
                    overlay.node.visible = true;
                    vegetationLoading = null;
                })
                .catch((err) => {
                    console.warn('vegetation overlay re-fetch failed', err);
                    vegetationLoading = null;
                });
        }

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

    // ---------- Click-to-pick raycasting ----------------------------------
    //
    // pointerdown stamps the start position; pointerup with negligible
    // drag fires the picker. The OrbitControls eat normal drag motion,
    // so we don't need to defuse them.
    const pickRay = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let pointerDownX = 0;
    let pointerDownY = 0;
    let pointerDownButton = -1;
    let activeHighlight = null;

    function onPointerDown(e) {
        pointerDownX = e.clientX;
        pointerDownY = e.clientY;
        pointerDownButton = e.button;
    }

    function onPointerUp(e) {
        if (e.button !== 0 || pointerDownButton !== 0) return;
        const dx = e.clientX - pointerDownX;
        const dy = e.clientY - pointerDownY;
        if (Math.hypot(dx, dy) > CLICK_DRAG_THRESHOLD_PX) return;

        const rect = renderer.domElement.getBoundingClientRect();
        ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        pickRay.setFromCamera(ndc, camera);

        const buildings = sceneGroup.getObjectByName('buildings');
        if (!buildings || !buildings.children.length) return;
        const hits = pickRay.intersectObjects(buildings.children, true);
        if (!hits.length) {
            clearActiveHighlight();
            infoPanel.hide();
            return;
        }
        const root = findBuildingRoot(hits[0].object);
        if (!root) return;
        focusBuilding(root);
    }

    function findBuildingRoot(node) {
        let cur = node;
        while (cur && cur.parent) {
            if (cur.userData && cur.userData.id) return cur;
            cur = cur.parent;
        }
        return null;
    }

    let pickedHvSeq = 0;

    function focusBuilding(root) {
        setActiveHighlight(root);
        const box = new THREE.Box3().setFromObject(root);
        const height_m = box.max.y - box.min.y;
        const info = {
            ...root.userData,
            height_m,
        };
        infoPanel.show(info);
        // The PRM parcel id is the GWR building id where available;
        // otherwise the synthesised footprint id from the WFS proxy.
        // Either way, it's stable across reloads of the same scene.
        const parcelId = info.gwr_bldg_id || info.res_building_id || info.id;
        saveParcel.setParcel({
            id: parcelId ? String(parcelId) : null,
            lat: info.lat ?? null,
            lng: info.lng ?? null,
            label: info.address || parcelId,
        });
        if (typeof onBuildingPicked === 'function') onBuildingPicked(info);

        // Kick off a background fetch for richer Contoor metrics
        // (LIDAR-derived peak height, computed volume m³, footprint
        // area m²) and patch them into the panel when they land. Use
        // the building's WGS84 lat/lng from the WFS proxy if we have
        // it; otherwise skip (the bbox height is still useful on its
        // own).
        const seq = ++pickedHvSeq;
        const lat = Number(root.userData.lat);
        const lng = Number(root.userData.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            fetchBuildingHeightVolume({ lat, lng })
                .then((payload) => {
                    if (seq !== pickedHvSeq) return;
                    if (!payload) return;
                    const heightPeak = payload.height?.buildingPeakMeters;
                    const heightP95 = payload.height?.buildingP95Meters;
                    const volumeM3 = payload.volume?.volumeM3;
                    const footprintM2 = payload.volume?.footprintAreaSqm;
                    infoPanel.show({
                        ...info,
                        // Prefer LIDAR-measured peak if Contoor returned it;
                        // fall back to the bbox height already shown.
                        height_m: Number.isFinite(heightPeak) ? heightPeak : height_m,
                        height_p95_m: Number.isFinite(heightP95) ? heightP95 : null,
                        volume_m3: Number.isFinite(volumeM3) ? volumeM3 : null,
                        footprint_m2: Number.isFinite(footprintM2) ? footprintM2 : null,
                    });
                })
                .catch((err) => {
                    console.warn('height-volume fetch failed', err);
                });
        }
    }

    function setActiveHighlight(root) {
        clearActiveHighlight();
        activeHighlight = root;
        root.traverse((node) => {
            if (node.isMesh && node.material) {
                if (!node.userData.__origColor) {
                    node.userData.__origColor = node.material.color?.getHex?.() ?? 0xffffff;
                }
                node.material.emissive?.setHex(0xfde68a);
                if (node.material.emissiveIntensity != null) {
                    node.material.emissiveIntensity = 0.35;
                }
            }
        });
    }

    function clearActiveHighlight() {
        if (!activeHighlight) return;
        activeHighlight.traverse((node) => {
            if (node.isMesh && node.material) {
                node.material.emissive?.setHex(0x000000);
                if (node.material.emissiveIntensity != null) {
                    node.material.emissiveIntensity = 0;
                }
            }
        });
        activeHighlight = null;
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Keyboard nav: OrbitControls already handles arrow-key panning via
    // controls.listenToKeyEvents above. Augment with Home (reset) and
    // R/F (zoom in/out around the target).
    function onKeyDown(e) {
        // Don't hijack typing in form fields.
        const tag = (e.target?.tagName || '').toUpperCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (e.key === 'Home') {
            e.preventDefault();
            const group = sceneGroup.getObjectByName('buildings');
            if (group && group.children.length) frameOnContent(group);
        } else if (e.key === 'r' || e.key === 'R') {
            dollyBy(0.8);
        } else if (e.key === 'f' || e.key === 'F') {
            dollyBy(1.25);
        }
    }

    function dollyBy(factor) {
        const dir = camera.position.clone().sub(controls.target);
        dir.multiplyScalar(factor);
        camera.position.copy(controls.target).add(dir);
        controls.update();
    }

    window.addEventListener('keydown', onKeyDown);

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
        // Sky follows the camera so the horizon never reveals the dome's
        // edge as the user pans across the 100 m slice.
        sky.mesh.position.copy(camera.position);
        // Sun target follows controls.target so the shadow camera stays
        // centred on the scene (without this, the shadow map's frustum
        // would drift off when the user panned).
        sun.target.position.copy(controls.target);
        compass.update();
        scaleLegend.update();
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
    }
    tick();

    return {
        loadAddress,
        dispose() {
            disposed = true;
            window.removeEventListener('resize', onResize);
            window.removeEventListener('keydown', onKeyDown);
            renderer.domElement.removeEventListener('pointerdown', onPointerDown);
            renderer.domElement.removeEventListener('pointerup', onPointerUp);
            themeObserver.disconnect();
            compass.destroy();
            scaleLegend.destroy();
            saveParcel.destroy();
            infoPanel.destroy();
            mobileSceneControls.destroy();
            layersDock.destroy();
            sunControl.destroy();
            sky.dispose();
            controls.dispose();
            clearGroup(sceneGroup);
            renderer.dispose();
            if (renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement);
            }
        },
    };
}
