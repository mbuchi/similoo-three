// Layers toggle dock — top-right slot, just below the compass.
//
// Lets users layer additional data on top of the base scene. Today
// just the vegetation point cloud; future toggles (zoning overlay,
// contours, etc.) plug into the same slot via `addToggle()`.
//
// Each toggle is an HTML button driven by a small piece of state held
// inside the viewer. Toggling fires an async loader; the button shows
// a tiny spinner while the work is in flight.

import { t, onLocaleChange } from '../i18n.js';

export function createLayersToggle({ container }) {
    if (!container) throw new Error('createLayersToggle: container is required');

    const root = document.createElement('div');
    root.className = 'scene-layers';
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', t('scene.layers_aria') || 'Scene layers');
    container.appendChild(root);

    const toggles = [];

    function addToggle({ id, labelKey, fallbackLabel, icon, onToggle }) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'scene-layers-btn';
        btn.dataset.id = id;
        btn.setAttribute('aria-pressed', 'false');
        btn.innerHTML = `
            <span class="scene-layers-btn-icon">${iconSvg(icon)}</span>
            <span class="scene-layers-btn-label"></span>
            <span class="scene-layers-btn-spinner" hidden></span>
        `;
        const labelEl = btn.querySelector('.scene-layers-btn-label');
        const spinner = btn.querySelector('.scene-layers-btn-spinner');
        const updateLabel = () => {
            labelEl.textContent = t(labelKey) || fallbackLabel;
        };
        updateLabel();

        let active = false;
        let busy = false;

        async function handle() {
            if (busy) return;
            busy = true;
            btn.disabled = true;
            spinner.hidden = false;
            try {
                const next = !active;
                await onToggle(next);
                active = next;
                btn.setAttribute('aria-pressed', active ? 'true' : 'false');
                btn.classList.toggle('is-active', active);
            } catch (err) {
                console.warn(`layer toggle [${id}] failed`, err);
            } finally {
                busy = false;
                btn.disabled = false;
                spinner.hidden = true;
            }
        }

        btn.addEventListener('click', handle);
        const unlink = onLocaleChange(updateLabel);
        root.appendChild(btn);
        toggles.push({ btn, unlink });
        return btn;
    }

    function destroy() {
        toggles.forEach(({ unlink }) => { try { unlink?.(); } catch {} });
        root.remove();
    }

    return { root, addToggle, destroy };
}

function iconSvg(name) {
    // Inline SVG keeps the toggle render-ready before lucide boots.
    if (name === 'trees') {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 10v.2A3 3 0 0 1 8.9 16v0H5v0h0a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/><path d="M7 16v6"/><path d="M13 19v3"/><path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"/></svg>`;
    }
    return '';
}
