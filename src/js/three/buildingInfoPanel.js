// Bottom-left building info panel.
//
// Reveals when the user clicks a building in the 3D scene. Reads what
// the WFS proxy gave us (gwr_bldg_id, address, const_year, floors) plus
// the computed bounding-box height in meters from the placed mesh.
// Stays out of the way of the right-edge comparison sidebar so both
// can coexist.

import { t, onLocaleChange } from '../i18n.js';

export function createBuildingInfoPanel({ container }) {
    if (!container) throw new Error('createBuildingInfoPanel: container is required');

    const root = document.createElement('aside');
    root.className = 'scene-info';
    root.setAttribute('data-state', 'hidden');
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('role', 'complementary');
    root.innerHTML = `
        <header class="scene-info-header">
            <div class="scene-info-title-wrap">
                <div class="scene-info-eyebrow"></div>
                <h3 class="scene-info-title"></h3>
            </div>
            <button class="scene-info-close" type="button" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </header>
        <div class="scene-info-body"></div>
        <footer class="scene-info-footer"></footer>
    `;
    container.appendChild(root);

    const closeBtn = root.querySelector('.scene-info-close');
    const eyebrow = root.querySelector('.scene-info-eyebrow');
    const titleEl = root.querySelector('.scene-info-title');
    const body = root.querySelector('.scene-info-body');

    let current = null;

    closeBtn.addEventListener('click', () => hide());

    function show(info) {
        if (!info) return;
        current = info;
        relabel();
        root.setAttribute('data-state', 'visible');
        root.setAttribute('aria-hidden', 'false');
    }

    function hide() {
        current = null;
        root.setAttribute('data-state', 'hidden');
        root.setAttribute('aria-hidden', 'true');
    }

    function relabel() {
        eyebrow.textContent = t('scene_info.eyebrow') || 'Building';
        closeBtn.setAttribute('aria-label', t('scene_info.close') || 'Close');
        if (!current) return;

        const title = current.address
            || current.gwr_bldg_id
            || current.id
            || (t('scene_info.unknown') || 'Unknown building');
        titleEl.textContent = title;

        const rows = [
            row('scene_info.address', current.address),
            row('scene_info.gwr_id', current.gwr_bldg_id),
            row('scene_info.res_id', current.res_building_id),
            row('scene_info.const_year', current.const_year),
            row('scene_info.floors', current.floors),
            row('scene_info.height', formatMetres(current.height_m)),
            row('scene_info.height_p95', formatMetres(current.height_p95_m)),
            row('scene_info.volume', formatCubicMetres(current.volume_m3)),
            row('scene_info.footprint', formatSquareMetres(current.footprint_m2)),
            row('scene_info.distance', current.distM != null ? formatMetres(current.distM) : null),
        ].filter(Boolean);
        body.innerHTML = rows.join('') || `<p class="scene-info-empty">${escapeHtml(t('scene_info.empty') || 'No metadata available')}</p>`;
    }

    function row(key, value) {
        if (value == null || value === '') return null;
        return `
            <div class="scene-info-row">
                <span class="scene-info-key">${escapeHtml(t(key) || key)}</span>
                <span class="scene-info-val">${escapeHtml(String(value))}</span>
            </div>
        `;
    }

    onLocaleChange(() => { if (current) relabel(); });

    function destroy() {
        root.remove();
    }

    // Slot for mounting action buttons (e.g. save-parcel) without
    // coupling the panel to any specific feature.
    function getFooter() {
        return root.querySelector('.scene-info-footer');
    }

    return { show, hide, destroy, getFooter };
}

function formatMetres(n) {
    if (!Number.isFinite(n)) return null;
    if (n < 10) return `${n.toFixed(1)} m`;
    return `${Math.round(n)} m`;
}

function formatCubicMetres(n) {
    if (!Number.isFinite(n)) return null;
    if (n < 1) return `${n.toFixed(2)} m³`;
    return `${Math.round(n).toLocaleString('en-CH').replace(/,/g, ' ')} m³`;
}

function formatSquareMetres(n) {
    if (!Number.isFinite(n)) return null;
    if (n < 1) return `${n.toFixed(2)} m²`;
    return `${Math.round(n).toLocaleString('en-CH').replace(/,/g, ' ')} m²`;
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
