import './i18n.js';
import '@aireon/shared/cesium-app/css/auth.css';

import { applyTranslations, bindLocaleSelect, t } from './i18n.js';
import { bindLandingSearch } from './landing/addressSearch.js';
import { createSceneViewer } from './three/sceneViewer.js';
import { createComparisonSidebar } from './comparison/sidebar.js';
import { resolveEgridFromLngLat } from './comparison/parcelLookup.js';
import { sendSignalCollect } from './api/signalCollect.js';
import { locationState } from './locationState.js';
import { setupApp } from '@aireon/shared/cesium-app/app.js';
import { setupAuth } from '@aireon/shared/cesium-app/auth/index.js';

// Tag the suite-shared modules with this app's name so signal_collect
// payloads, screenshot filename prefixes, and PRM records carry the
// right `app_name`. Must run before any shared module that reads it.
setupApp({ appName: 'similoo-three', appLabel: 'similoo-three' });

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

    // Wire suite-shared Zitadel auth into the existing <div id="authNav">.
    // setupAuth() injects the login button + profile dropdown into that
    // placeholder and handles the OIDC callback automatically. Fire-and-
    // forget: the auth state propagates via shared's onAuthChange.
    setupAuth().catch((err) => {
        console.warn('auth bootstrap failed', err);
    });

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

    // setStatus accepts either a plain string (the legacy shape) or an
    // options bag with progress + optional retry handler. The status
    // element renders a slim progress bar, a tinted error pill with a
    // retry button, or nothing depending on what's passed.
    function setStatus(arg) {
        if (!sceneStatus) return;
        let msg = '';
        let progress = null;
        let error = false;
        let onRetry = null;
        if (typeof arg === 'string' || arg == null) {
            msg = arg || '';
        } else {
            msg = arg.message || '';
            if (Number.isFinite(arg.progress)) progress = Math.max(0, Math.min(1, arg.progress));
            error = !!arg.error;
            onRetry = typeof arg.onRetry === 'function' ? arg.onRetry : null;
        }
        sceneStatus.classList.toggle('is-error', error);
        sceneStatus.classList.toggle('is-progress', progress != null);

        // Try to extract "(done/total)" from legacy progress messages
        // so the bar fills smoothly even when the upstream caller
        // hasn't been migrated to setStatus({ progress }).
        if (progress == null && msg) {
            const m = /\((\d+)\s*\/\s*(\d+)\)/.exec(msg);
            if (m) {
                const done = Number(m[1]);
                const total = Number(m[2]);
                if (total > 0) progress = Math.min(1, done / total);
            }
        }
        if (msg && progress == null && !error) {
            // Indeterminate "still working" state — show a slow pulse.
            sceneStatus.classList.add('is-progress', 'is-indeterminate');
        } else {
            sceneStatus.classList.remove('is-indeterminate');
        }

        const bar = progress != null
            ? `<span class="scene-status-bar" style="--p:${(progress * 100).toFixed(1)}%"></span>`
            : '';
        const retry = onRetry
            ? `<button type="button" class="scene-status-retry">${t('scene.retry') || 'Retry'}</button>`
            : '';
        sceneStatus.innerHTML = msg
            ? `<span class="scene-status-msg">${escapeHtml(msg)}</span>${bar}${retry}`
            : '';
        if (onRetry) {
            sceneStatus.querySelector('.scene-status-retry')
                ?.addEventListener('click', onRetry, { once: true });
        }
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
                onFlyTo: (comparable) => flyToComparable(comparable),
            });
        }
    }

    // Clicking a comparable in the sidebar re-renders the 3D scene around
    // that building's lat/lng. Each scene is a self-contained 100 m slice,
    // so reloading is the cheapest way to "fly" to a remote comparable —
    // panning the existing scene would just leave a void outside the
    // original 100 m radius.
    async function flyToComparable(comparable) {
        if (!comparable || !Number.isFinite(comparable.lat) || !Number.isFinite(comparable.lng)) return;
        const label = comparable.address
            || comparable.egrid
            || `${comparable.lat.toFixed(5)}, ${comparable.lng.toFixed(5)}`;
        await handlePick({ lat: comparable.lat, lng: comparable.lng, label });
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
        // Strip the deep-link params so the back button to landing
        // doesn't carry over an address the user just left.
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('lat');
            url.searchParams.delete('lng');
            url.searchParams.delete('label');
            window.history.replaceState({}, '', url.toString());
        } catch {}
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
        syncDeepLink(result);
        setStatus({
            message: t('scene.loading') || 'Loading…',
            progress: 0,
        });

        try {
            await viewer.loadAddress({ lat: result.lat, lng: result.lng });
            if (seq !== pickSeq) return;
            setStatus(null);
        } catch (e) {
            if (seq !== pickSeq) return;
            console.error('viewer.loadAddress failed', e);
            setStatus({
                message: t('scene.error_load') || 'Could not load 3D scene.',
                error: true,
                onRetry: () => handlePick(result),
            });
            return;
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

    // Push the picked address into the URL so reloads and shares
    // resume the same scene. We use replaceState so the browser's
    // history isn't spammed with one entry per comparable-card click;
    // pushState would defeat the back button. The landing-view reset
    // strips the deep-link params separately (see showLanding).
    function syncDeepLink(result) {
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('lat', String(result.lat));
            url.searchParams.set('lng', String(result.lng));
            if (result.label) url.searchParams.set('label', result.label);
            else url.searchParams.delete('label');
            window.history.replaceState({}, '', url.toString());
        } catch {
            /* URL API unavailable — skip silently */
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

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
