import { useEffect, useRef, useState } from 'react';
// The locale switcher and theme toggle drive the SAME imperative i18n / theme
// singletons the preserved engine uses, so there is one source of truth. We
// import the engine's i18n helpers directly (typed loosely via the .js module).
import {
  getLocale,
  setLocale as setEngineLocale,
  onLocaleChange,
  type Locale,
} from '../js/i18n.js';

const THEME_KEY = 'similoo-three-theme';

/**
 * similoo-three top bar — rebuilt as a React component.
 *
 * Visually and structurally identical to the original vanilla navbar (same
 * markup, same CSS classes from styles.css), but composed in JSX with React
 * state. The wordmark, hub badge, theme toggle, locale <select> and the auth
 * placeholder are all preserved.
 *
 * Note: this app ships its own bespoke navbar CSS (not Tailwind), so it keeps
 * its hand-tuned navbar rather than the Tailwind-based shared AppNavbar — that
 * would render unstyled here and break the "visually identical" requirement.
 * Auth stays the imperative shared cesium-app auth nav (mounted into #authNav)
 * so it shares one oidc-client userManager with the engine's Save-parcel
 * button; React only renders the placeholder div.
 */
export default function Navbar() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark',
  );
  const [locale, setLocaleState] = useState<Locale>(() => getLocale());
  const selectRef = useRef<HTMLSelectElement>(null);

  // Keep the React mirror of the locale in sync if anything else (the shared
  // auth nav, a deep link) changes it imperatively.
  useEffect(() => {
    const unsub = onLocaleChange((next: Locale) => setLocaleState(next));
    return unsub;
  }, []);

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode — choice is session-scoped */
    }
    setIsDark(next === 'dark');
  };

  const onLocaleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEngineLocale(e.target.value as Locale);
  };

  return (
    <div className="navbar">
      <div className="navbar-desktop">
        <div className="navbar-brand">
          <a
            href="https://hub.aireon.ch/"
            className="aireon-hub-link"
            aria-label="Aireon hub"
            title="Aireon hub"
          >
            <span className="aireon-hub-mark" aria-hidden="true" />
          </a>
          <span className="aireon-hub-divider" aria-hidden="true" />
          <a href="/" className="logo">
            <span className="logo-first">simil</span>
            <span className="logo-second">oo</span>
            <span className="logo-first">-three</span>
          </a>
          <span className="logo-subtitle" data-i18n="nav.logo_subtitle">
            Address-first 3D
          </span>
        </div>
        <div className="navbar-actions">
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
          {/* Filled imperatively by the shared cesium-app auth nav (setupAuth). */}
          <div id="authNav" className="auth-nav" aria-live="polite" />
        </div>
      </div>
    </div>
  );
}
