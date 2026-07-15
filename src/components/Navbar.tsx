import { useEffect, useRef, useState } from 'react';
import { AboutModal, AppNavbar, NavIconButton, setTheme } from '@aireon/shared';
// The locale switcher and theme toggle drive the SAME imperative i18n / theme
// singletons the preserved engine uses, so there is one source of truth. We
// import the engine's i18n helpers directly (typed loosely via the .js module).
import {
  getLocale,
  setLocale as setEngineLocale,
  onLocaleChange,
  t,
  type Locale,
} from '../js/i18n.js';

/**
 * similoo-three top bar — the suite-shared {@link AppNavbar} shell.
 *
 * AppNavbar supplies ONLY the brand (Aireon hub badge + the simil**oo**-three
 * wordmark) and the fixed bar shell. The app's own imperatively-wired controls
 * are RELOCATED into AppNavbar's slots with their ids / classes / data-i18n
 * attributes left INTACT, so the preserved engine (the i18n DOM sweep, the
 * shared cesium-app auth nav) keeps finding them unchanged:
 *
 *   - theme toggle button + `#locale-select`  -> actionsExtra
 *   - the `#authNav` auth placeholder          -> userMenu
 *
 * The address search lives in the landing view (not the navbar), so it is not
 * moved here. The bar's self-contained CSS comes from `@aireon/shared/map-ui.css`
 * (imported in main.tsx); positioning is supplied by the fixed wrapper below.
 *
 * Auth stays the imperative shared cesium-app auth nav (mounted into #authNav)
 * so it shares one oidc-client userManager with the engine's Save-parcel button;
 * React only renders the placeholder div.
 */
export default function Navbar() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark',
  );
  const [locale, setLocaleState] = useState<Locale>(() => getLocale());
  const [showAbout, setShowAbout] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  // Keep the React mirror of the locale in sync if anything else (the shared
  // auth nav, a deep link) changes it imperatively.
  useEffect(() => {
    const unsub = onLocaleChange((next: Locale) => setLocaleState(next));
    return unsub;
  }, []);

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    // This app styles via the [data-theme] attribute, so drive it directly.
    document.documentElement.setAttribute('data-theme', next);
    // Persist suite-wide: the shared store writes the `.aireon.ch` cookie +
    // localStorage mirror (+ member profile when signed in), so the choice
    // carries across every Aireon app and across the user's devices. This
    // replaces the old per-app `localStorage.setItem('similoo-three-theme', …)`.
    setTheme(next);
    setIsDark(next === 'dark');
  };

  const onLocaleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEngineLocale(e.target.value as Locale);
  };

  return (
    <>
    {/* Fixed wrapper supplies the positioning; AppNavbar renders the bar shell
        and brand, while position="" keeps its header in-flow here. */}
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}
    >
      <AppNavbar
        appName="similoo-three"
        dark={isDark}
        position=""
        actionsExtra={
          <>
            <button
              type="button"
              className="theme-toggle-button"
              title="Toggle dark mode"
              aria-label="Toggle dark mode"
              aria-pressed={isDark}
              data-i18n-attr="aria-label:nav.theme_toggle,title:nav.theme_toggle"
              onClick={toggleTheme}
            >
              <svg
                className="theme-toggle-sun"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
              <svg
                className="theme-toggle-moon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </button>
            <NavIconButton
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              }
              label={t('about.menu')}
              onClick={() => setShowAbout(true)}
              dark={isDark}
            />
            <select
              ref={selectRef}
              id="locale-select"
              className="locale-select"
              aria-label="Select language"
              data-i18n-attr="aria-label:nav.select_language,title:nav.select_language"
              title="Select language"
              value={locale}
              onChange={onLocaleSelect}
            >
              <option value="en">EN</option>
              <option value="fr">FR</option>
              <option value="de">DE</option>
              <option value="it">IT</option>
            </select>
          </>
        }
        userMenu={
          /* Filled imperatively by the shared cesium-app auth nav (setupAuth). */
          <div id="authNav" className="auth-nav" aria-live="polite" />
        }
      />
    </div>
      {showAbout && (
        <AboutModal
          wordmark={<>simil<span style={{ color: '#dc2626' }}>oo</span>-three</>}
          description={t('about.description')}
          aboutLabel={t('about.label')}
          creditsLabel={t('about.credits')}
          hubLabel={t('about.hub')}
          credits={[
            { label: t('about.map_data'), name: '© swisstopo', href: 'https://www.swisstopo.admin.ch' },
            { label: t('about.building_data'), name: 'Swiss GWR · Aireon RES', href: 'https://www.housing-stat.ch' },
            { label: t('about.renderer'), name: 'Three.js', href: 'https://threejs.org' },
          ]}
          closeLabel={t('common.close')}
          dark={isDark}
          onClose={() => setShowAbout(false)}
        />
      )}
    </>
  );
}
