// Imperative engine boot for similoo-three.
//
// This is the PRESERVED engine wiring lifted near-verbatim from the original
// vanilla-JS main.js. The React shell (src/App.tsx) renders the static DOM
// scaffold (same element IDs the engine expects) and the top bar, then calls
// bootScene() once from a useEffect. Everything below — the landing search,
// the Three.js scene viewer, the comparison sidebar, the deep-link bootstrap,
// the status/progress UI — is identical to the old app; only the navbar-owned
// concerns (theme toggle, locale <select>, auth nav) have moved into React,
// which calls into the same shared i18n / auth singletons so there is still a
// single source of truth.

import './i18n.js';

import { applyTranslations, t } from './i18n.js';
import { bindLandingSearch } from './landing/addressSearch.js';
import { createSceneViewer } from './three/sceneViewer.js';
import { createComparisonSidebar } from './comparison/sidebar.js';
import { resolveEgridFromLngLat } from './comparison/parcelLookup.js';
import { sendSignalCollect } from './api/signalCollect.js';
import { locationState } from './locationState.js';
import { searchHistoryStore } from '@aireon/shared';
import { setupApp } from '@aireon/shared/cesium-app/app.js';
import { setupAuth } from '@aireon/shared/cesium-app/auth/index.js';
import { setupBugReport } from './bugReport.js';

// Tag the suite-shared modules with this app's name so signal_collect
// payloads, screenshot filename prefixes, and PRM records carry the
// right `app_name`. Must run before any shared module that reads it.
setupApp({ appName: 'similoo-three', appLabel: 'similoo-three' });

// Re-export so the React shell can run the static-DOM i18n sweep after it
// renders the scaffold (mirrors the old DOMContentLoaded → applyTranslations).
export function applyEngineTranslations() {
    applyTranslations(document);
}

/**
 * Wire up the whole scene experience against the React-rendered scaffold.
 * Returns a handle with dispose() so the React effect can tear everything
 * down on unmount (idempotent — the engine is mounted once in practice).
 */
export function bootScene() {
    applyTranslations(document);
    setupBugReport({ appName: 'similoo-three' });

    // Wire suite-shared Zitadel auth into the existing <div id="authNav">.
    // setupAuth() injects the login button + profile dropdown into that
    // placeholder and handles the OIDC callback automatically. Fire-and-
    // forget: the auth state propagates via shared's onAuthChange. Kept
    // imperative (not the React MapUserMenu) so the engine's Save-parcel
    // button shares ONE oidc-client userManager + onAuthChange bus.
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
    let searchDispose = null;

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

        // Cross-app address-search history (shared v1.21.0). Records the
        // picked address so it shows up in "My search history" across the
        // suite; persists to the backend when signed in, localStorage otherwise.
        searchHistoryStore.record({
            label: result.label,
            lat: result.lat,
            lng: result.lng,
            appName: 'similoo-three',
        });

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
        searchDispose = bindLandingSearch({ input, list, onPick: handlePick });
        setTimeout(() => input.focus(), 80);
    }

    // Deep-link bootstrap: ?lat=&lng= (optional &label=) skips the
    // landing view and renders the scene immediately. Useful for
    // sharing a specific address and for headless tests.
    try {
        const params = new URLSearchParams(window.location.search);
        // Guard with has(): Number(null) === 0 (not NaN), so a plain `/` with
        // no params would otherwise pass Number.isFinite and load a phantom
        // 0,0 scene. Only deep-link when both params are actually present.
        if (params.has('lat') && params.has('lng')) {
            const lat = Number(params.get('lat'));
            const lng = Number(params.get('lng'));
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
                const label = params.get('label') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                handlePick({ lat, lng, label });
            }
        }
    } catch (_) { /* no-op */ }

    if (window.lucide?.createIcons) window.lucide.createIcons();

    return {
        dispose() {
            try { searchDispose?.(); } catch {}
            try { backBtn?.removeEventListener('click', showLanding); } catch {}
            try { viewer?.destroy?.(); } catch {}
            try { sidebar?.destroy?.(); } catch {}
            viewer = null;
            sidebar = null;
        },
    };
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
