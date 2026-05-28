// HTML compass overlay.
//
// A small disc with N/E/S/W tick labels and a red north needle. The
// needle rotates in lock-step with the OrbitControls azimuth so the
// user always knows which way north is.
//
// Pure DOM: cheaper than a 3D HUD and avoids competing with the WebGL
// canvas for fragment work. Clicking the disc resets the orbit to face
// north (azimuth = 0).

import { t } from '../i18n.js';

export function createCompass({ container, controls, onResetNorth }) {
    if (!container) throw new Error('createCompass: container is required');

    const root = document.createElement('div');
    root.className = 'scene-compass';
    root.setAttribute('role', 'button');
    root.setAttribute('tabindex', '0');
    root.setAttribute('aria-label', t('scene.compass_aria') || 'Reset view to north');
    root.innerHTML = `
        <div class="scene-compass-disc">
            <span class="scene-compass-tick scene-compass-tick-n">${tNorth()}</span>
            <span class="scene-compass-tick scene-compass-tick-e">${tEast()}</span>
            <span class="scene-compass-tick scene-compass-tick-s">${tSouth()}</span>
            <span class="scene-compass-tick scene-compass-tick-w">${tWest()}</span>
            <div class="scene-compass-needle"></div>
        </div>
    `;
    container.appendChild(root);

    const needle = root.querySelector('.scene-compass-needle');
    const disc = root.querySelector('.scene-compass-disc');

    function trigger() {
        if (typeof onResetNorth === 'function') {
            onResetNorth();
        } else if (controls) {
            // Fallback: reset azimuth directly.
            controls.reset?.();
        }
    }

    root.addEventListener('click', trigger);
    root.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            trigger();
        }
    });

    function update() {
        if (!controls) return;
        // OrbitControls.getAzimuthalAngle() returns the angle from the
        // +Z axis (counter-clockwise looking down at +Y). In our scene
        // -Z is north (LV95 +Y maps to -Z), so the needle's "north" is
        // a -Z direction. Rotate the needle to point at world-north
        // given the current camera azimuth: needle css rotation is the
        // *negative* of the azimuth so the world-north tick stays at
        // screen-top.
        const az = controls.getAzimuthalAngle?.() ?? 0;
        disc.style.setProperty('--scene-compass-rot', `${-az}rad`);
    }

    function destroy() {
        root.removeEventListener('click', trigger);
        root.remove();
    }

    return { root, update, destroy };
}

function tNorth() { return safeT('scene.compass_n', 'N'); }
function tEast()  { return safeT('scene.compass_e', 'E'); }
function tSouth() { return safeT('scene.compass_s', 'S'); }
function tWest()  { return safeT('scene.compass_w', 'W'); }

function safeT(key, fallback) {
    try { return t(key) || fallback; } catch { return fallback; }
}
