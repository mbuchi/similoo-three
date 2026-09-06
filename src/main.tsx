import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initTheme, getStoredTheme, setTheme, applyTheme } from '@aireon/shared/theme';
import { getThemeOverride } from '@aireon/shared/url-params';
import { initThemeColorSync } from '@aireon/shared/pwa';
import { createIcons, ShieldAlert, X, Send } from 'lucide';
import { TurnstileGate } from '@aireon/shared/turnstile';
import { AppBootFallback } from './components/AppBootFallback';
import App from './App.tsx';

// Bundled Lucide icons for vanilla modules without external unpkg script
if (typeof window !== 'undefined') {
  (window as unknown as { lucide: unknown }).lucide = {
    createIcons: () => createIcons({ icons: { ShieldAlert, X, Send } }),
  };
}

// Cross-app + cross-device theme. The inline pre-paint script in index.html
// already stamped the root (`?theme=` deep link, the suite-wide `aireon_theme`
// cookie, then the `theme` localStorage mirror) to avoid a flash. Here we let
// the shared store resolve/seed the cross-app cookie + localStorage mirror,
// then mirror the result onto `data-theme` (this app's own CSS styles via the
// [data-theme] attribute, though every root signal is kept in step).
{
  // `?theme=` is ephemeral (URL_PARAMS_STANDARD.md): it wins for this page load
  // and must never be persisted. It also has to short-circuit the legacy
  // migration below, because setTheme() applies as well as stores, which would
  // re-stamp the root and silently overwrite the deep link.
  const override = getThemeOverride();

  // One-time migration: if no suite-wide choice exists yet but this user had
  // picked a theme under the legacy per-app key, adopt it into the shared
  // store so their choice survives and starts propagating across the suite.
  if (!override && !getStoredTheme()) {
    try {
      const legacy = localStorage.getItem('similoo-three-theme');
      if (legacy === 'light' || legacy === 'dark') setTheme(legacy);
    } catch {
      /* private mode, nothing to migrate */
    }
  }

  let resolved: 'light' | 'dark';
  if (override) {
    applyTheme(override); // apply, never persist
    resolved = override;
  } else {
    resolved = initTheme('light');
  }
  document.documentElement.setAttribute('data-theme', resolved);

  // Keep the browser-chrome theme-color in step with the in-app toggle. The
  // static meta in index.html is only the pre-paint value; this replaces it and
  // re-applies from a MutationObserver on the root's class + data-theme, so the
  // navbar toggle (which writes data-theme directly) is covered too.
  initThemeColorSync();
}

// App stylesheets — the same bespoke CSS the vanilla app shipped, plus the
// shared cesium-app auth styles + the bug-report styles main.js imported.
// map-ui.css carries the self-contained AppNavbar bar + brand styling.
import '@aireon/shared/fonts.css';
import '@aireon/shared/map-ui.css';
import '@aireon/shared/cesium-app/css/auth.css';
import './css/styles.css';
import './css/comparison.css';
import './css/landing.css';
import './css/scene.css';
import './css/bugReport.css';

// The bot gate sits directly around <App />, which is the whole app tree here:
// similoo-three has no AccessGate component and no React AuthProvider (auth is
// wired up inside the preserved imperative engine that App boots), so this is
// the outermost point at which the app content can be withheld. Keeping it
// above <App /> also means the Three.js engine only boots once the visitor is
// cleared, rather than mounting a scene behind the challenge card.
//
// Inert until keys are set: with no VITE_TURNSTILE_SITE_KEY the gate renders
// its children immediately and issues no request at all.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TurnstileGate
      appId="similoo-three"
      siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
      fallback={<AppBootFallback />}
    >
      <App />
    </TurnstileGate>
  </StrictMode>,
);
