// Save Parcel — wires the building info panel to the SwissNovo PRM
// (Parcel Registry Management) backend.
//
// When the user clicks "Save" on the info panel, we fetch (or create)
// a PRM record keyed by the picked building's identifier. PRM lives
// at https://res.zeroo.ch/api/v1/prm; both helpers below come from
// @swissnovo/shared and tree-shake cleanly because the package is
// `sideEffects: false`.
//
// Auth: PRM endpoints require a Zitadel token. We get it via
// `getAuthToken()` (also shared). When the user isn't signed in, the
// button still appears but click triggers `login()` from
// shared/cesium-app/auth instead.

import { fetchPrmByParcel, createPrmRecord, getAuthToken } from '@swissnovo/shared';
import {
    isAuthenticated,
    onAuthChange,
    login as authLogin,
} from '@swissnovo/shared/cesium-app/auth/index.js';
import { t, onLocaleChange } from '../i18n.js';

export function createSaveParcelButton({ container }) {
    if (!container) throw new Error('createSaveParcelButton: container is required');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'scene-info-save';
    btn.innerHTML = `
        <span class="scene-info-save-icon">${bookmarkIcon()}</span>
        <span class="scene-info-save-label"></span>
    `;
    container.appendChild(btn);

    const labelEl = btn.querySelector('.scene-info-save-label');
    let currentParcel = null;   // { id, lat, lng, label }
    let currentState = 'idle';  // 'idle' | 'saving' | 'saved' | 'auth' | 'error'

    relabel();
    btn.addEventListener('click', handleClick);

    const unlinkLocale = onLocaleChange(relabel);
    const unlinkAuth = onAuthChange(() => {
        // Re-resolve the saved state for the current parcel when the
        // user signs in or out.
        if (currentParcel) refreshState(currentParcel);
        else relabel();
    });

    function setState(next) {
        if (next === currentState) return;
        currentState = next;
        btn.dataset.state = next;
        relabel();
    }

    function relabel() {
        if (!labelEl) return;
        let key = 'save_parcel.idle';
        if (currentState === 'saving') key = 'save_parcel.saving';
        else if (currentState === 'saved') key = 'save_parcel.saved';
        else if (currentState === 'auth') key = 'save_parcel.sign_in';
        else if (currentState === 'error') key = 'save_parcel.error';
        labelEl.textContent = t(key) || defaultLabel(currentState);
    }

    function defaultLabel(state) {
        return state === 'saved' ? 'Saved'
            : state === 'saving' ? 'Saving…'
            : state === 'auth' ? 'Sign in to save'
            : state === 'error' ? 'Try again'
            : 'Save parcel';
    }

    async function refreshState(parcel) {
        if (!parcel?.id) {
            setState('idle');
            return;
        }
        if (!isAuthenticated()) {
            setState('auth');
            return;
        }
        try {
            const token = await getAuthToken();
            const existing = await fetchPrmByParcel(token, parcel.id);
            setState(existing ? 'saved' : 'idle');
        } catch (err) {
            // Anonymous users get AuthRequiredError; everything else is
            // either a transient PRM hiccup or the parcel really has no
            // record. Treat both as "idle" so the button is still useful.
            if (err?.name === 'AuthRequiredError') setState('auth');
            else setState('idle');
        }
    }

    async function handleClick() {
        if (!currentParcel?.id) return;
        if (currentState === 'saved' || currentState === 'saving') return;

        if (!isAuthenticated()) {
            // Stash the in-flight parcel so we re-evaluate after sign-in.
            authLogin();
            return;
        }

        setState('saving');
        try {
            const token = await getAuthToken();
            await createPrmRecord(token, {
                parcel_id: currentParcel.id,
                label: currentParcel.label || currentParcel.id,
                lat: currentParcel.lat ?? null,
                lng: currentParcel.lng ?? null,
            });
            setState('saved');
        } catch (err) {
            console.warn('PRM save failed', err);
            setState(err?.name === 'AuthRequiredError' ? 'auth' : 'error');
        }
    }

    function setParcel(parcel) {
        // parcel is { id, lat, lng, label } from the building click.
        if (!parcel?.id) {
            currentParcel = null;
            setState('idle');
            return;
        }
        currentParcel = parcel;
        setState('idle');
        refreshState(parcel);
    }

    function destroy() {
        try { unlinkLocale?.(); } catch {}
        try { unlinkAuth?.(); } catch {}
        btn.remove();
    }

    return { root: btn, setParcel, destroy };
}

function bookmarkIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`;
}
