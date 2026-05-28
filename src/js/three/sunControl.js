// Bottom-centre sun control — date picker + hour slider.
//
// Driving Surface: a single Date (in the page's local timezone),
// emitted to `onChange` whenever the user moves the slider or picks a
// new date. The slider runs 0–24 in 15-minute steps; the date picker
// is a native <input type="date">.
//
// We keep state inside the control and call onChange with the
// composed Date; the viewer applies it to the DirectionalLight + sky
// shader. The control also surfaces the current solar elevation
// (computed by the caller) so the user sees "below horizon" or the
// current solar altitude in real time.

import { t, onLocaleChange } from '../i18n.js';
import { toLocalDateTimeString } from './sunCalc.js';

export function createSunControl({ container, initialDate, onChange }) {
    if (!container) throw new Error('createSunControl: container is required');

    const root = document.createElement('div');
    root.className = 'scene-sun';
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', t('scene.sun_aria') || 'Sun control');
    root.innerHTML = `
        <button type="button" class="scene-sun-now" title="Now"></button>
        <input type="date" class="scene-sun-date" />
        <div class="scene-sun-slider-wrap">
            <span class="scene-sun-readout"></span>
            <input type="range" class="scene-sun-slider" min="0" max="1440" step="15" />
        </div>
        <span class="scene-sun-altitude"></span>
    `;
    container.appendChild(root);

    const dateInput = root.querySelector('.scene-sun-date');
    const slider = root.querySelector('.scene-sun-slider');
    const readout = root.querySelector('.scene-sun-readout');
    const altitude = root.querySelector('.scene-sun-altitude');
    const nowBtn = root.querySelector('.scene-sun-now');

    let current = initialDate instanceof Date && !isNaN(initialDate)
        ? new Date(initialDate)
        : new Date();
    syncInputs();
    relabel();

    function relabel() {
        nowBtn.textContent = t('scene.sun_now') || 'Now';
        nowBtn.setAttribute('aria-label', t('scene.sun_now_aria') || 'Reset to current time');
        dateInput.setAttribute('aria-label', t('scene.sun_date_aria') || 'Date');
        slider.setAttribute('aria-label', t('scene.sun_time_aria') || 'Time of day');
    }
    const unlinkLocale = onLocaleChange(relabel);

    function syncInputs() {
        dateInput.value = toLocalDateTimeString(current).slice(0, 10);
        const minOfDay = current.getHours() * 60 + current.getMinutes();
        slider.value = String(minOfDay);
        readout.textContent = formatHHMM(current);
    }

    function emit() {
        if (typeof onChange === 'function') onChange(new Date(current));
    }

    dateInput.addEventListener('input', () => {
        const v = dateInput.value;
        if (!v) return;
        const [y, m, d] = v.split('-').map(Number);
        if (!y || !m || !d) return;
        current = new Date(y, m - 1, d, current.getHours(), current.getMinutes());
        readout.textContent = formatHHMM(current);
        emit();
    });

    slider.addEventListener('input', () => {
        const minOfDay = Number(slider.value);
        const h = Math.floor(minOfDay / 60);
        const m = minOfDay % 60;
        current = new Date(
            current.getFullYear(),
            current.getMonth(),
            current.getDate(),
            h,
            m,
        );
        readout.textContent = formatHHMM(current);
        emit();
    });

    nowBtn.addEventListener('click', () => {
        current = new Date();
        syncInputs();
        emit();
    });

    function setAltitude(elevationRad) {
        if (!Number.isFinite(elevationRad)) {
            altitude.textContent = '';
            altitude.removeAttribute('data-state');
            return;
        }
        const deg = elevationRad * 180 / Math.PI;
        if (deg <= 0) {
            altitude.textContent = t('scene.sun_below_horizon') || 'Below horizon';
            altitude.setAttribute('data-state', 'night');
        } else {
            altitude.textContent = `${Math.round(deg)}°`;
            altitude.setAttribute('data-state', deg < 10 ? 'low' : 'high');
        }
    }

    function destroy() {
        try { unlinkLocale?.(); } catch {}
        root.remove();
    }

    return {
        root,
        getDate: () => new Date(current),
        setAltitude,
        destroy,
    };
}

function formatHHMM(d) {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}
