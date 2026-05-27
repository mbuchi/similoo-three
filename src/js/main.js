import './i18n.js';

import { applyTranslations, bindLocaleSelect, t } from './i18n.js';
import { bindLandingSearch } from './landing/addressSearch.js';
import { createSceneViewer } from './three/sceneViewer.js';
import { createComparisonSidebar } from './comparison/sidebar.js';
import { resolveEgridFromLngLat } from './comparison/parcelLookup.js';
import { sendSignalCollect } from './api/signalCollect.js';
import { locationState } from './locationState.js';

// Apply translations as soon as the static DOM is parsed — before window.onload
// fires — so users don't see a flash of English text while the bundle boots.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

function boot() {
    applyTranslations(document);
    bindLocaleSelect('locale-select');
    setupThemeToggle();

    const landingView = document.getElementById('landingView');
    const sceneView = document.getElementById('sceneView');
    const sceneAddress = document.getElementById('sceneAddress');
    const sceneStatus = document.getElementById('sceneStatus');
    const sceneCanvas = document.getElementById('sceneCanvas');
    const backBtn = document.getElementById('backToSearch');
    const input = document.getElementById('landingSearchInput');
    const list = document.getElementById('landingResults');

    let viewer = null;
    let sidebar = null;
    let pickSeq = 0;

    function setStatus(msg) {
        if (!sceneStatus) return;
        sceneStatus.textContent = msg || '';
    }

    function showScene(addressLabel) {
        landingView.hidden = true;
        sceneView.hidden = false;
        sceneAddress.textContent = addressLabel;
        if (!viewer) {
            viewer = createSceneViewer({
                container: sceneCanvas,
                onStatus: setStatus,
            });
        }
        if (!sidebar) {
            sidebar = createComparisonSidebar({
                map: null,
                onClose: () => document.body.classList.remove('cmp-shifted'),
                onFlyTo: null,
            });
        }
    }

    function showLanding() {
        sceneView.hidden = true;
        landingView.hidden = false;
        if (sidebar) {
            sidebar.hide?.();
            document.body.classList.remove('cmp-shifted');
        }
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 50);
        }
    }

    backBtn?.addEventListener('click', showLanding);

    async function handlePick(result) {
        if (!result || !Number.isFinite(result.lat) || !Number.isFinite(result.lng)) return;
        const seq = ++pickSeq;

        locationState.setLocation({
            longitude: result.lng,
            latitude: result.lat,
            displayName: result.label,
            searchText: result.label,
            status: 'found',
        });

        sendSignalCollect({
            latitude: result.lat,
            longitude: result.lng,
            displayName: result.label,
        }).catch(() => {});

        showScene(result.label);
        setStatus(t('scene.loading', {}) || 'Loading…');

        try {
            await viewer.loadAddress({ lat: result.lat, lng: result.lng });
        } catch (e) {
            console.error('viewer.loadAddress failed', e);
            setStatus('Could not load 3D scene.');
        }

        try {
            const { egrid } = await resolveEgridFromLngLat({
                lng: result.lng,
                lat: result.lat,
            });
            if (seq !== pickSeq) return;
            if (egrid && sidebar) {
                document.body.classList.add('cmp-shifted');
                sidebar.show(egrid);
            }
        } catch (err) {
            console.warn('comparable buildings sidebar unavailable:', err?.message);
        }
    }

    if (input && list) {
        bindLandingSearch({ input, list, onPick: handlePick });
        setTimeout(() => input.focus(), 80);
    }

    // Deep-link bootstrap: ?lat=&lng= (optional &label=) skips the
    // landing view and renders the scene immediately. Useful for
    // sharing a specific address and for headless tests.
    try {
        const params = new URLSearchParams(window.location.search);
        const lat = Number(params.get('lat'));
        const lng = Number(params.get('lng'));
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const label = params.get('label') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            handlePick({ lat, lng, label });
        }
    } catch (_) { /* no-op */ }

    if (window.lucide?.createIcons) window.lucide.createIcons();
}

function setupThemeToggle() {
    const btn = document.getElementById('themeToggleButton');
    if (!btn) return;
    const root = document.documentElement;
    const sync = () => {
        const isDark = root.getAttribute('data-theme') === 'dark';
        btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    };
    btn.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try {
            localStorage.setItem('similoo-three-theme', next);
        } catch {}
        sync();
    });
    sync();
}
