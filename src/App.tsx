import { useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import { bootScene } from './js/bootScene.js';

/**
 * similoo-three — React shell around the preserved imperative Three.js engine.
 *
 * React owns only the static scaffold (the navbar + the landing/scene
 * markup, byte-identical to the old index.html, including the data-i18n
 * attributes and element IDs the engine binds to). After the scaffold is in
 * the DOM, a single useEffect runs the preserved bootScene() which wires up
 * the address search, the 3D scene viewer, the comparison sidebar, auth, the
 * bug-report widget and the deep-link bootstrap — all unchanged from the
 * vanilla app.
 */
export default function App() {
  const bootedRef = useRef(false);

  useEffect(() => {
    // Guard against React 18 StrictMode's double-invoke in dev: the engine
    // mounts a Three.js renderer + global DOM nodes and is meant to run once.
    if (bootedRef.current) return;
    bootedRef.current = true;
    const handle = bootScene();
    return () => {
      handle?.dispose?.();
      bootedRef.current = false;
    };
  }, []);

  return (
    <>
      <a className="skip-link" href="#main-content" data-i18n="nav.skip_to_content">
        Skip to content
      </a>

      <Navbar />

      <main id="main-content">
        {/* Landing: address search (shown first; hidden once an address is picked) */}
        <section id="landingView" className="landing-view">
          <div className="landing-card">
            <h1 className="landing-title" data-i18n="landing.title">
              Type a Swiss address.
            </h1>
            <p className="landing-subtitle" data-i18n="landing.subtitle">
              We render the building and a 100 m slice around it in live 3D, with
              comparable buildings from across Switzerland.
            </p>
            <form
              className="landing-search"
              id="landingSearchForm"
              role="search"
              autoComplete="off"
            >
              <input
                type="search"
                id="landingSearchInput"
                className="landing-search-input"
                placeholder="e.g. Bahnhofstrasse 10, Zürich"
                aria-label="Search address"
                role="combobox"
                aria-expanded="false"
                aria-controls="landingResults"
                aria-autocomplete="list"
                autoComplete="off"
                data-i18n-attr="placeholder:landing.search_placeholder,aria-label:landing.search_aria"
              />
              <ul className="landing-results" id="landingResults" role="listbox" hidden />
              <p className="landing-hint" data-i18n="landing.hint">
                Pick a result to load the 3D scene.
              </p>
            </form>
          </div>
        </section>

        {/* Scene: Three.js viewer (shown after address pick) */}
        <section id="sceneView" className="scene-view" hidden>
          <div id="sceneHeader" className="scene-header">
            <button id="backToSearch" className="scene-back" type="button" aria-label="Back to search">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span data-i18n="scene.back">Search again</span>
            </button>
            <div className="scene-address" id="sceneAddress" />
            <div
              className="scene-status"
              id="sceneStatus"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            />
          </div>
          <div
            id="sceneCanvas"
            className="scene-canvas"
            role="img"
            aria-label="3D viewer of the selected Swiss address: terrain, building, and nearby buildings rendered with shadows"
            data-i18n-attr="aria-label:scene.canvas_aria"
          />
        </section>
      </main>
    </>
  );
}
