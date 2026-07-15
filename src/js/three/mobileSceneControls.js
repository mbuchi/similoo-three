import { t, onLocaleChange } from '../i18n.js';

const MOBILE_QUERY = '(max-width: 767px)';

/**
 * Footprint-style mobile home for the scene's layer and sun controls.
 * Desktop keeps the original controls in their original container. On a
 * narrow viewport the same DOM nodes move into one closed-by-default sheet.
 */
export function createMobileSceneControls({ container, controls = [] }) {
    if (!container) throw new Error('createMobileSceneControls: container is required');

    const roots = controls.filter(Boolean);
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'scene-controls-fab';
    fab.setAttribute('aria-haspopup', 'dialog');
    fab.setAttribute('aria-expanded', 'false');
    fab.innerHTML = slidersIcon();

    const overlay = document.createElement('div');
    overlay.className = 'scene-controls-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
        <button type="button" class="scene-controls-scrim" tabindex="-1"></button>
        <section class="scene-controls-sheet" role="dialog" aria-modal="true">
            <header class="scene-controls-header">
                <h2 class="scene-controls-title"></h2>
                <button type="button" class="scene-controls-close" aria-label="Close">×</button>
            </header>
            <div class="scene-controls-body"></div>
        </section>
    `;

    const scrim = overlay.querySelector('.scene-controls-scrim');
    const sheet = overlay.querySelector('.scene-controls-sheet');
    const title = overlay.querySelector('.scene-controls-title');
    const closeBtn = overlay.querySelector('.scene-controls-close');
    const body = overlay.querySelector('.scene-controls-body');

    container.append(fab, overlay);
    const media = window.matchMedia(MOBILE_QUERY);
    let open = false;

    function relabel() {
        const openLabel = t('scene.controls_open') || 'Open scene controls';
        const titleLabel = t('scene.controls_title') || 'Scene controls';
        const closeLabel = t('scene.controls_close') || 'Close scene controls';
        fab.setAttribute('aria-label', openLabel);
        fab.title = openLabel;
        overlay.setAttribute('aria-label', titleLabel);
        sheet.setAttribute('aria-label', titleLabel);
        title.textContent = titleLabel;
        closeBtn.setAttribute('aria-label', closeLabel);
        scrim.setAttribute('aria-label', closeLabel);
    }

    function setOpen(next, { restoreFocus = true } = {}) {
        if (!media.matches) next = false;
        open = Boolean(next);
        document.body.classList.toggle('scene-controls-open', open);
        overlay.hidden = !open;
        overlay.dataset.state = open ? 'open' : 'closed';
        fab.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
            requestAnimationFrame(() => closeBtn.focus());
        } else if (restoreFocus && document.activeElement && overlay.contains(document.activeElement)) {
            fab.focus();
        }
    }

    function applyMode() {
        setOpen(false, { restoreFocus: false });
        fab.hidden = !media.matches;
        if (media.matches) {
            roots.forEach((root) => body.appendChild(root));
        } else {
            roots.forEach((root) => container.insertBefore(root, fab));
        }
    }

    function onKeyDown(event) {
        if (event.key === 'Escape' && open) setOpen(false);
    }

    const openSheet = () => setOpen(true);
    const closeSheet = () => setOpen(false);
    fab.addEventListener('click', openSheet);
    closeBtn.addEventListener('click', closeSheet);
    scrim.addEventListener('click', closeSheet);
    window.addEventListener('keydown', onKeyDown);
    if (media.addEventListener) media.addEventListener('change', applyMode);
    else media.addListener(applyMode);
    const unlinkLocale = onLocaleChange(relabel);
    relabel();
    applyMode();

    return {
        close: closeSheet,
        destroy() {
            setOpen(false, { restoreFocus: false });
            document.body.classList.remove('scene-controls-open');
            roots.forEach((root) => {
                if (root.isConnected) container.insertBefore(root, fab);
            });
            fab.removeEventListener('click', openSheet);
            closeBtn.removeEventListener('click', closeSheet);
            scrim.removeEventListener('click', closeSheet);
            window.removeEventListener('keydown', onKeyDown);
            if (media.removeEventListener) media.removeEventListener('change', applyMode);
            else media.removeListener(applyMode);
            try { unlinkLocale?.(); } catch {}
            overlay.remove();
            fab.remove();
        },
    };
}

function slidersIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/></svg>`;
}
