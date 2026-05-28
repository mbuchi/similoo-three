// Procedural sky dome.
//
// A large inverted icosahedron centred on the camera with a vertical
// gradient painted by a tiny custom ShaderMaterial. The dome scales
// gently with camera zoom by riding the camera position each frame,
// so the horizon never visibly clips and the gradient stays put as
// the user orbits.
//
// Why not three.js's official Sky shader? That ships with a turbidity
// atmospheric model tuned for outdoor day/night scenes. It's gorgeous
// but adds shader complexity that PR 4 (sun & shadow analysis) will
// hook into more directly. Starting with a simple two-stop gradient
// keeps the surface stable today and PR 4 can swap in the Sky shader
// when it lands.

import * as THREE from 'three';

const VERTEX = `
varying vec3 vWorldPosition;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const FRAGMENT = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;
varying vec3 vWorldPosition;

void main() {
    float h = normalize(vWorldPosition + offset).y;
    float t = max(pow(max(h, 0.0), exponent), 0.0);
    gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
}
`;

export function createSkyDome({ radius = 1500 } = {}) {
    const uniforms = {
        topColor: { value: new THREE.Color(0x4a7bb7) },
        bottomColor: { value: new THREE.Color(0xdfe9f3) },
        offset: { value: 33 },
        exponent: { value: 0.7 },
    };

    const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        side: THREE.BackSide,
        depthWrite: false,
    });

    const geometry = new THREE.IcosahedronGeometry(radius, 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'sky-dome';
    // Skydome should render before everything else and never write depth.
    mesh.renderOrder = -1000;

    function setPalette({ top, bottom, exponent, offset } = {}) {
        if (top) uniforms.topColor.value.set(top);
        if (bottom) uniforms.bottomColor.value.set(bottom);
        if (typeof exponent === 'number') uniforms.exponent.value = exponent;
        if (typeof offset === 'number') uniforms.offset.value = offset;
    }

    function dispose() {
        geometry.dispose();
        material.dispose();
    }

    return { mesh, setPalette, dispose };
}

// Two palettes wired to the app's light/dark themes. Keep them readable
// at glance: the bottom horizon stripe needs to contrast both the grey
// terrain pointcloud and the red target building.
export const SKY_PALETTES = {
    light: {
        top: 0x6ea8d8,
        bottom: 0xf1f5f9,
        exponent: 0.65,
        offset: 33,
    },
    dark: {
        top: 0x0b1220,
        bottom: 0x1f2a40,
        exponent: 0.55,
        offset: 33,
    },
};
