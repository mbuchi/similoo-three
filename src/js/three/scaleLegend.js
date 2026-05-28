// HTML scale bar overlay.
//
// A 100-pixel-wide bar that re-labels itself with the real-world metres
// it represents at the current camera distance. Keeps a sense of scale
// alive as the user zooms in and out — without a legend, "is this
// building 30 m or 80 m tall?" is genuinely hard to answer in a
// purely-3D scene.
//
// We approximate "metres per pixel at the orbit target" by intersecting
// the camera's vertical FOV with the controls.target distance. This is
// an underestimate for points above the target (perspective foreshortens
// upward) but accurate enough for the bar to feel honest at the typical
// 100 m city block scale.

import * as THREE from 'three';

const BAR_PX = 110;

// Snap the displayed value to a "nice" round number so the bar reads
// 10/20/50/100 m rather than 17.3 m. Falls back to fractional values
// below 5 m.
const NICE_STEPS_M = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];

export function createScaleLegend({ container, camera, controls, renderer }) {
    if (!container) throw new Error('createScaleLegend: container is required');

    const root = document.createElement('div');
    root.className = 'scene-scale';
    root.innerHTML = `
        <div class="scene-scale-bar" style="width: ${BAR_PX}px"></div>
        <div class="scene-scale-label">— m</div>
    `;
    container.appendChild(root);
    const label = root.querySelector('.scene-scale-label');
    const bar = root.querySelector('.scene-scale-bar');

    function metresPerPixelAtTarget() {
        const dist = camera.position.distanceTo(controls.target);
        const vFovRad = (camera.fov * Math.PI) / 180;
        const heightAtTarget = 2 * dist * Math.tan(vFovRad / 2);
        const px = renderer.domElement.clientHeight || 1;
        return heightAtTarget / px;
    }

    function update() {
        const mpp = metresPerPixelAtTarget();
        const targetMeters = mpp * BAR_PX;
        const snapped = snapNice(targetMeters);
        if (snapped == null) return;
        // Re-derive the actual rendered bar width so the snapped value
        // and the rendered length stay honest.
        const renderedPx = Math.max(20, Math.min(220, snapped / mpp));
        bar.style.width = `${renderedPx}px`;
        label.textContent = formatMetres(snapped);
    }

    function destroy() {
        root.remove();
    }

    return { root, update, destroy };
}

function snapNice(meters) {
    if (!Number.isFinite(meters) || meters <= 0) return null;
    // Pick the largest nice step that's <= the candidate, falling back
    // to the smallest step when we're inside it.
    let pick = NICE_STEPS_M[0];
    for (const step of NICE_STEPS_M) {
        if (step <= meters) pick = step;
    }
    return pick;
}

function formatMetres(m) {
    if (m < 1) return `${m.toFixed(2)} m`;
    if (m < 10) return `${m.toFixed(1)} m`;
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}
