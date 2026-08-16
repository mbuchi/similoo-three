// Forward-geocoding for the landing search via the shared geo.admin.ch
// SearchServer client. Tokenless, CORS-open, Swiss-only, and IndexedDB-cached.
// Returns up to 5 ranked matches as { id, label, lat, lng } (lat/lng WGS84).

import { searchGeoAdminAddresses } from '@aireon/shared/geoadmin';
import { t, getLocale } from '../i18n.js';

const DEBOUNCE_MS = 200;

export async function geocodeAddress(query, signal) {
    const trimmed = (query || '').trim();
    if (trimmed.length < 3) return [];

    // geo.admin returns { id, label, lat, lng } with lat/lng as numbers —
    // the same contract bindLandingSearch/onPick already expects, so no
    // remapping is needed.
    return searchGeoAdminAddresses(trimmed, {
        signal,
        limit: 5,
        lang: getLocale(),
    });
}

// Wires a <input> + <ul> pair into a debounced live geocoder. Calls
// `onPick(result)` when the user clicks/keyboard-selects a result.
//
//   input    — HTMLInputElement (the search box)
//   list     — HTMLUListElement (the results dropdown)
//   onPick   — function({ id, label, lat, lng }) => void
//
// Returns a disposer that detaches listeners and the shared-history subscription.
export function bindLandingSearch({ input, list, popup = list, actions = null, onPick, historyStore }) {
    let abortCtrl = null;
    let timer = null;
    let blurTimer = null;
    let activeIndex = -1;
    let currentResults = [];
    let currentMode = 'closed';
    let hasFocus = false;
    let queryGeneration = 0;

    function cancelPendingQuery() {
        queryGeneration += 1;
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (abortCtrl) {
            const controller = abortCtrl;
            abortCtrl = null;
            controller.abort();
        }
    }

    function setExpanded(open) {
        list.hidden = !open;
        popup.hidden = !open;
        input.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function clearResults() {
        list.innerHTML = '';
        if (actions) {
            actions.innerHTML = '';
            actions.hidden = true;
        }
        setExpanded(false);
        input.removeAttribute('aria-activedescendant');
        activeIndex = -1;
        currentResults = [];
        currentMode = 'closed';
    }

    function renderResults(results, { recent = false } = {}) {
        currentResults = results;
        currentMode = recent ? 'recent' : 'live';
        list.innerHTML = '';
        if (actions) actions.innerHTML = '';
        for (let i = 0; i < results.length; i++) {
            const r = results[i];
            const li = document.createElement('li');
            li.className = recent ? 'landing-result landing-result-recent' : 'landing-result';
            li.setAttribute('role', 'option');
            li.id = `landing-result-${i}`;
            li.dataset.index = String(i);
            li.textContent = recent ? `◷ ${r.label}` : r.label;
            li.addEventListener('mousedown', (e) => {
                e.preventDefault(); // keep focus on input
                pick(i);
            });
            list.appendChild(li);
            if (recent && actions) {
                const remove = document.createElement('button');
                remove.type = 'button';
                remove.className = 'landing-result-remove';
                remove.textContent = t('common.delete');
                remove.setAttribute('aria-label', `${t('common.delete')}: ${r.label}`);
                remove.setAttribute('title', t('common.delete'));
                remove.dataset.index = String(i);
                remove.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeRecent(i);
                });
                actions.appendChild(remove);
            }
        }
        if (actions) actions.hidden = !recent || results.length === 0;
        setExpanded(results.length > 0);
        activeIndex = -1;
        updateActive();
    }

    function renderRecentResults() {
        const entries = historyStore?.getSnapshot?.()?.entries;
        const recent = Array.isArray(entries)
            ? entries
                .filter((entry) => Number.isFinite(entry?.lat) && Number.isFinite(entry?.lng))
                .slice(0, 6)
                .map((entry) => ({
                    id: entry.id,
                    label: entry.label,
                    lat: entry.lat,
                    lng: entry.lng,
                }))
            : [];
        renderResults(recent, { recent: true });
    }

    // Surfaces a localized, non-interactive error row in the results list so
    // geocode failures (geo.admin upstream errors or a network blip) aren't
    // silent. The row is cleared on the next keystroke like any result.
    function renderError() {
        currentResults = [];
        currentMode = 'error';
        list.innerHTML = '';
        if (actions) {
            actions.innerHTML = '';
            actions.hidden = true;
        }
        const li = document.createElement('li');
        li.className = 'landing-result landing-result-error';
        li.setAttribute('role', 'alert');
        li.textContent = t('landing.search_error');
        list.appendChild(li);
        setExpanded(true);
        input.removeAttribute('aria-activedescendant');
        activeIndex = -1;
    }

    function updateActive() {
        const children = Array.from(list.children);
        children.forEach((c, i) => {
            c.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false');
        });
        if (activeIndex >= 0 && children[activeIndex]) {
            input.setAttribute('aria-activedescendant', children[activeIndex].id);
        } else {
            input.removeAttribute('aria-activedescendant');
        }
    }

    function pick(index) {
        const r = currentResults[index];
        if (!r) return;
        cancelPendingQuery();
        input.value = r.label;
        clearResults();
        if (typeof onPick === 'function') onPick(r);
    }

    function removeRecent(index) {
        if (currentMode !== 'recent') return;
        const result = currentResults[index];
        if (!result) return;
        void historyStore?.remove?.(result.id);
        input.focus();
    }

    function isCurrentRequest(controller, generation, query, allowSettled = false) {
        const modeMatches = allowSettled
            ? currentMode === 'live-pending' || currentMode === 'live' || currentMode === 'error'
            : currentMode === 'live-pending';
        return abortCtrl === controller
            && queryGeneration === generation
            && input.value.trim() === query
            && modeMatches;
    }

    async function runQuery(query, generation) {
        timer = null;
        if (queryGeneration !== generation
            || input.value.trim() !== query
            || currentMode !== 'live-pending') return;
        const controller = new AbortController();
        abortCtrl = controller;
        try {
            const results = await geocodeAddress(query, controller.signal);
            if (!isCurrentRequest(controller, generation, query)) return;
            renderResults(results);
        } catch (err) {
            if (err?.name === 'AbortError' || !isCurrentRequest(controller, generation, query)) return;
            console.warn('addressSearch: geocode failed', err?.message);
            renderError();
        } finally {
            if (isCurrentRequest(controller, generation, query, true)) abortCtrl = null;
        }
    }

    function onInput() {
        cancelPendingQuery();
        const query = input.value.trim();
        if (query.length === 0) {
            renderRecentResults();
            return;
        }
        if (query.length < 3) {
            clearResults();
            return;
        }
        clearResults();
        currentMode = 'live-pending';
        const generation = queryGeneration;
        timer = setTimeout(() => runQuery(query, generation), DEBOUNCE_MS);
    }

    function onFocus() {
        hasFocus = true;
        if (blurTimer) {
            clearTimeout(blurTimer);
            blurTimer = null;
        }
        if (input.value.trim().length === 0) {
            cancelPendingQuery();
            renderRecentResults();
        }
    }

    function onKey(e) {
        if (list.hidden) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = Math.min(currentResults.length - 1, activeIndex + 1);
            updateActive();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = Math.max(0, activeIndex - 1);
            updateActive();
        } else if (e.key === 'Enter') {
            if (activeIndex >= 0) {
                e.preventDefault();
                pick(activeIndex);
            } else if (currentResults.length > 0) {
                e.preventDefault();
                pick(0);
            }
        } else if ((e.key === 'Delete' || e.key === 'Backspace')
            && currentMode === 'recent'
            && activeIndex >= 0) {
            e.preventDefault();
            removeRecent(activeIndex);
        } else if (e.key === 'Escape') {
            cancelPendingQuery();
            clearResults();
        }
    }

    function scheduleBlurCleanup() {
        if (blurTimer) clearTimeout(blurTimer);
        blurTimer = setTimeout(() => {
            blurTimer = null;
            if (!hasFocus) clearResults();
        }, 120);
    }

    function onBlur(e) {
        if (popup?.contains?.(e.relatedTarget)) {
            hasFocus = true;
            if (blurTimer) {
                clearTimeout(blurTimer);
                blurTimer = null;
            }
            return;
        }
        hasFocus = false;
        cancelPendingQuery();
        scheduleBlurCleanup();
    }

    function onPopupFocusIn() {
        hasFocus = true;
        if (blurTimer) {
            clearTimeout(blurTimer);
            blurTimer = null;
        }
    }

    function onPopupFocusOut(e) {
        if (e.relatedTarget === input || popup?.contains?.(e.relatedTarget)) return;
        hasFocus = false;
        cancelPendingQuery();
        scheduleBlurCleanup();
    }

    const unsubscribeHistory = historyStore?.subscribe?.(() => {
        if (hasFocus && input.value.trim().length === 0) renderRecentResults();
    });
    historyStore?.ensureInitialized?.();

    input.addEventListener('input', onInput);
    input.addEventListener('focus', onFocus);
    input.addEventListener('keydown', onKey);
    input.addEventListener('blur', onBlur);
    popup?.addEventListener?.('focusin', onPopupFocusIn);
    popup?.addEventListener?.('focusout', onPopupFocusOut);

    return function dispose() {
        cancelPendingQuery();
        if (blurTimer) clearTimeout(blurTimer);
        input.removeEventListener('input', onInput);
        input.removeEventListener('focus', onFocus);
        input.removeEventListener('keydown', onKey);
        input.removeEventListener('blur', onBlur);
        popup?.removeEventListener?.('focusin', onPopupFocusIn);
        popup?.removeEventListener?.('focusout', onPopupFocusOut);
        if (typeof unsubscribeHistory === 'function') unsubscribeHistory();
        clearResults();
    };
}
