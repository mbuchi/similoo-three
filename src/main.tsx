import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

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
