import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initTheme, getStoredTheme, setTheme } from '@aireon/shared';
import App from './App.tsx';

// Cross-app + cross-device theme. The inline pre-paint script in index.html
// already applied the right `data-theme` (reading the suite-wide `aireon_theme`
// cookie) to avoid a flash. Here we let the shared store resolve/seed the
// cross-app cookie + localStorage mirror, then mirror the result onto
// `data-theme` (this app styles via the [data-theme] attribute, not the
// `.dark` class initTheme manages).
{
  // One-time migration: if no suite-wide choice exists yet but this user had
  // picked a theme under the legacy per-app key, adopt it into the shared
  // store so their choice survives and starts propagating across the suite.
  if (!getStoredTheme()) {
    try {
      const legacy = localStorage.getItem('similoo-three-theme');
      if (legacy === 'light' || legacy === 'dark') setTheme(legacy);
    } catch {
      /* private mode — nothing to migrate */
    }
  }
  const resolved = initTheme('light');
  document.documentElement.setAttribute('data-theme', resolved);
}

// App stylesheets — the same bespoke CSS the vanilla app shipped, plus the
// shared cesium-app auth styles + the bug-report styles main.js imported.
// map-ui.css carries the self-contained AppNavbar bar + brand styling.
import '@aireon/shared/map-ui.css';
import '@aireon/shared/cesium-app/css/auth.css';
import './css/styles.css';
import './css/comparison.css';
import './css/landing.css';
import './css/scene.css';
import './css/bugReport.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
