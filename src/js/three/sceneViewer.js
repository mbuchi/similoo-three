// Three.js scene for a single Swiss address.
//
// Renders a ~100 m slice around the picked location:
//   * Terrain GLB (from project_res_3D_api /api/v1/pointcloud/glb) sits on
//     the ground plane. Origin at the request lat/lng, Z-up, vertices in
//     local meters.
//   * Building GLB (from /api/v1/building-model) for the building that
//     contains the picked point. We re-center it onto the terrain origin.
//   * OrbitControls give the user free pan/zoom/orbit; the camera starts
//     pulled back so the whole 100 m slice is in frame.
//
// Imports are tree-shaken from the `three` package; addon paths use the
// /examples/jsm/ subpath that three's package.exports already publishes
// (three v0.184+).

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { fetchTerrainGLB, fetchBuildingGLB } from './api3d.js';

const SCENE_RADIUS_M = 100;

export function createSceneViewer({ container, onStatus }) {
    if (!container) throw new Error('createSceneViewer: container is required');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);

    // Hemisphere + directional rig gives volume to the building shells
    // without baking shadows into the GLB (which we don't have control
    // over from the API).
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
    controls.maxPolarAngle = Math.PI * 0.49; // don't dip under the ground

    // Subtle reference grid so the user has a sense of scale before
    // assets load (100 m × 100 m, 10 m cells).
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

    function setStatus(msg) {
        if (typeof onStatus === 'function') onStatus(msg);
    }

    function clearGroup() {
        while (sceneGroup.children.length) {
            const child = sceneGroup.children.pop();
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
    }

    async function loadGLBBlob(blob) {
        const buf = await blob.arrayBuffer();
        return new Promise((resolve, reject) => {
            loader.parse(buf, '', resolve, reject);
        });
    }

    async function loadAddress({ lat, lng }) {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            throw new Error('loadAddress: invalid lat/lng');
        }
        clearGroup();
        setStatus('Loading terrain…');

        // Terrain first (sync, fast). The building call may 404 on parcels
        // with no LoD2 geometry; surface that as a soft warning rather
        // than failing the whole scene.
        let terrainMeta = null;
        try {
            const { blob, metadata } = await fetchTerrainGLB({
                lat,
                lng,
                radius_m: SCENE_RADIUS_M,
            });
            terrainMeta = metadata;
            const gltf = await loadGLBBlob(blob);
            const terrain = gltf.scene;
            terrain.name = 'terrain';
            terrain.traverse((node) => {
                if (node.isMesh) {
                    node.material = new THREE.MeshStandardMaterial({
                        color: 0x9ba9a3,
                        roughness: 1.0,
                        flatShading: true,
                    });
                }
            });
            sceneGroup.add(terrain);
        } catch (err) {
            console.warn('terrain load failed', err);
            setStatus('Terrain unavailable — building only.');
        }

        setStatus('Loading building…');
        try {
            const { blob } = await fetchBuildingGLB({ lat, lng });
            const gltf = await loadGLBBlob(blob);
            const building = gltf.scene;
            building.name = 'building';

            // Re-center the building onto the terrain origin. The API
            // returns the mesh in Swiss LV95 meters which is far from
            // (0, 0, 0); we just compute its bbox center and offset.
            const box = new THREE.Box3().setFromObject(building);
            const centre = box.getCenter(new THREE.Vector3());
            const minY = box.min.y;
            building.position.set(-centre.x, -minY, -centre.z);

            building.traverse((node) => {
                if (node.isMesh) {
                    node.material = new THREE.MeshStandardMaterial({
                        color: 0xdc2626,
                        roughness: 0.55,
                        metalness: 0.05,
                    });
                }
            });
            sceneGroup.add(building);

            // Frame the camera onto the target building once it lands.
            const size = box.getSize(new THREE.Vector3());
            const reach = Math.max(40, size.x, size.z, size.y * 1.4);
            controls.target.set(0, size.y * 0.4, 0);
            camera.position.set(reach * 1.4, reach * 1.1, reach * 1.4);
            controls.update();
        } catch (err) {
            console.warn('building load failed', err);
            setStatus('No building mesh available for this point.');
            return { terrainMeta, building: false };
        }

        setStatus('');
        return { terrainMeta, building: true };
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
            clearGroup();
            renderer.dispose();
            if (renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement);
            }
        },
    };
}
