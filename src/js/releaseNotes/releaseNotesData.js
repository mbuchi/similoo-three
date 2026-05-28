// Release notes data for similoo-three.
//
// Newest first. Versioning follows SemVer. The app is pre-1.0 while the
// 3D viewer surface is still being built out. Add new releases at the top.

export const REPO_URL = 'https://github.com/mbuchi/similoo-three';

export const KIND_META = {
    new: {
        label: 'New',
        textColor: '#DC2626',
        bgColor: 'rgba(220, 38, 38, 0.08)',
        borderColor: 'rgba(220, 38, 38, 0.3)',
        dotColor: '#DC2626',
    },
    improved: {
        label: 'Improved',
        textColor: '#B45309',
        bgColor: 'rgba(245, 158, 11, 0.08)',
        borderColor: 'rgba(245, 158, 11, 0.3)',
        dotColor: '#F59E0B',
    },
    fixed: {
        label: 'Fixed',
        textColor: '#047857',
        bgColor: 'rgba(16, 185, 129, 0.08)',
        borderColor: 'rgba(16, 185, 129, 0.3)',
        dotColor: '#10B981',
    },
    docs: {
        label: 'Docs',
        textColor: '#0369A1',
        bgColor: 'rgba(14, 165, 233, 0.08)',
        borderColor: 'rgba(14, 165, 233, 0.3)',
        dotColor: '#0EA5E9',
    },
};

export const RELEASES = [
    {
        version: '0.7.1',
        date: 'May 28, 2026',
        codename: 'Mobile',
        summary:
            'Mobile and tablet polish: viewport meta no longer blocks pinch-zoom (a11y fix), the 3D canvas uses `touch-action: none` so pinch on the scene doesn\'t accidentally page-zoom the document, and every scene overlay (compass, layers dock, info panel, scale legend, sun pill, status bar) repositions and tightens at ≤560 px so the canvas stays usable on phones. The dead Cesium hooks in the `body.cmp-shifted` rule are replaced with the actual Three.js overlay selectors (.scene-compass + .scene-layers), so opening the comparison sidebar now correctly shifts those out of its way.',
        highlight: false,
        items: [
            {
                kind: 'fixed',
                icon: 'accessibility',
                text: 'Viewport meta no longer carries `maximum-scale=1.0, user-scalable=no` — that was an a11y antipattern (blocks pinch-zoom for low-vision users). Added `viewport-fit=cover` for notched devices.',
                prs: [],
            },
            {
                kind: 'fixed',
                icon: 'hand',
                text: 'Scene canvas has `touch-action: none` so mobile pinch/swipe on the 3D view drives OrbitControls only, not the page chrome.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'smartphone',
                text: 'Mobile breakpoint (≤560 px): compass shrinks to 44 px, layers dock + info panel tighten, scale bar moves to 8 px insets, sun pill becomes full-width with the slider on its own row.',
                prs: [],
            },
            {
                kind: 'fixed',
                icon: 'panel-right',
                text: 'Opening the comparison sidebar now actually shifts the right-edge scene overlays (.scene-compass, .scene-layers) out from under it. The old `body.cmp-shifted` rule still targeted Cesium selectors that don\'t exist in this app.',
                prs: [],
            },
        ],
    },
    {
        version: '0.7.0',
        date: 'May 28, 2026',
        codename: 'UX Polish',
        summary:
            'Loading, error, and share-link UX gets a polish pass. The scene status bar grew a slim progress strip that fills from 0 to 100% as buildings stream in; legacy "(5/12)…" messages still work but render as a real progress bar now. If the Contoor upstream fails, the status flips to a tinted error pill with a Retry button that re-runs the whole pick. Shareable deep links: every address pick writes ?lat=&lng=&label= into the URL via replaceState, so refreshing or sharing the URL resumes the same scene; "Search again" strips them on the way back. Accessibility: the 3D canvas gets role="img" and an i18n aria-label, the status div is a proper aria-live="polite" region.',
        highlight: true,
        items: [
            {
                kind: 'improved',
                icon: 'loader',
                text: 'Scene status bar grew a slim progress strip (3 px, gradient #dc2626 → #f59e0b) that fills as buildings stream in. Legacy "Loading buildings (5/12)…" messages parse the fraction automatically; explicit setStatus({progress: 0.42}) callers get the bar too.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'alert-triangle',
                text: 'Upstream failures now surface a tinted error pill with a Retry button instead of a generic toast — clicking Retry re-runs the full handlePick(), so the comparable sidebar also re-resolves.',
                prs: [],
            },
            {
                kind: 'new',
                icon: 'link',
                text: 'Deep links: every address pick writes ?lat=&lng=&label= via replaceState. Refresh or share the URL → same scene. Clicking Search again strips the params so the back button to landing doesn\'t carry over a stale address.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'accessibility',
                text: 'a11y: 3D canvas has role="img" + i18n aria-label; scene-status is a proper aria-live="polite" region with aria-atomic so screen readers announce each loading step.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'sparkles',
                text: 'Lowercase branding audit clean — every "similoo-three" occurrence in HTML, i18n, and CSS is lowercase per SwissNovo suite conventions.',
                prs: [],
            },
        ],
    },
    {
        version: '0.6.0',
        date: 'May 28, 2026',
        codename: 'Sun & Shadow',
        summary:
            'Pick any moment in the year and see exactly where the sun is and how the building shadows fall at that time. A new bottom-centre pill exposes a date picker, an hour slider (15-minute steps over the full 24 h day), and a live readout of the solar altitude in degrees (or "Below horizon" at night). The DirectionalLight is repositioned in real time using the NOAA solar geometry formulas for the loaded address — accurate to ~0.1°. The sky shader composes with the page theme: golden hour warms the horizon, night dims the dome to deep blue, and the sun colour shifts from amber at sunrise to neutral white at high noon.',
        highlight: true,
        items: [
            {
                kind: 'new',
                icon: 'sun',
                text: 'Solar geometry module (src/js/three/sunCalc.js): Spencer 1971 declination + equation-of-time + hour-angle math, ~50 lines, no external dependency. Computes the sun direction vector in scene coordinates given (date, lat, lng).',
                prs: [],
            },
            {
                kind: 'new',
                icon: 'clock',
                text: 'Sun control pill (bottom-centre): date picker + 24h slider (15-min steps) + Now button + live solar altitude readout. Dragging the slider repositions the DirectionalLight live and updates shadows in real time.',
                prs: [],
            },
            {
                kind: 'new',
                icon: 'sunset',
                text: 'Atmosphere-aware sky: night drops the dome to deep blue (#0b1220 top / #18243d horizon), dims hemi light to 0.25; golden hour warms the horizon stripe (#f6c47a) and tints hemi light amber; daytime returns the theme\'s base palette. Theme toggle still works on top of all that.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'building-2',
                text: 'Shadows now fall in the real direction: pick any address, drag the slider from 06:00 to 20:00, and watch each building\'s shadow sweep across its neighbours. Below-horizon hours keep the light just above 0° so the shadow camera still covers the scene at moonlight intensity (0.15).',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'globe',
                text: 'Sun direction recomputed when a new address loads — same moment in time, different geographic point, different shadow direction.',
                prs: [],
            },
        ],
    },
    {
        version: '0.5.0',
        date: 'May 28, 2026',
        codename: 'Data Layers',
        summary:
            'Two more data dimensions surface into the scene. A vegetation overlay button (top-right under the compass) fetches a second Contoor terrain GLB filtered to LAS classes `vegetation` + `trees`, tints the points canopy-green, and renders them as a translucent overlay on the base terrain — toggle as you orbit. The building info panel, when you click a building, now also fires a background call to Contoor `/building-height-volume` and patches in LIDAR-measured peak height, P95 height, computed volume (m³), and footprint area (m²). A new `/api/three3d/height-volume` Vercel proxy fronts the upstream so the X-API-Key stays server-side. Vegetation toggle state persists across address changes (and across comparable-card clicks): if you had it on, the next scene re-loads it automatically.',
        highlight: true,
        items: [
            {
                kind: 'new',
                icon: 'trees',
                text: 'Vegetation overlay toggle (uses Contoor\'s `selected_pointcloud_class: ["vegetation","trees"]` filter — previously unexposed even though the upstream supported it). Tinted #16a34a, 85% opacity, points scaled ≥0.6 px so they read on the base terrain.',
                prs: [],
            },
            {
                kind: 'new',
                icon: 'ruler',
                text: 'Click a building → background fetch of `/api/v1/building-height-volume` → info panel grows to show LIDAR peak height, P95 height, volume (m³), and footprint (m²). Falls back gracefully when upstream returns partial results.',
                prs: [],
            },
            {
                kind: 'new',
                icon: 'cable',
                text: 'New `/api/three3d/height-volume` Vercel proxy. JSON-mode response forwarding (vs binary GLB) added to the same handler — same caching headers, same X-API-Key handling.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'layers',
                text: 'New `scene-layers` dock pattern (top-right, under compass) is now the home for future toggles too — zoning overlay, contour lines, traffic — each plugs in via `layersDock.addToggle(...)`.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'refresh-cw',
                text: 'Vegetation toggle state survives address changes. If a user had it on and clicks a comparable card (which reloads the scene), the new scene re-fetches the overlay in the background without losing the toggle\'s "on" indicator.',
                prs: [],
            },
        ],
    },
    {
        version: '0.4.0',
        date: 'May 28, 2026',
        codename: 'Scene Quality',
        summary:
            'The 3D scene grows up: real shadow mapping, a procedural sky dome that follows the camera, a click-on-building info panel, plus a compass and a metric scale legend so users always know where they are and how big the things they see are. Keyboard nav (arrows pan, R/F zoom, Home reframe) makes the scene navigable without a mouse. Sky palette tracks the page theme; the compass needle locks to world-north as you orbit; the scale bar snaps to nice 1/2/5/10/20/50/100 m steps so the label always reads honestly. Builds on the comparable→scene wiring from v0.3.0 — clicking a comparable card now also raises the info panel on the new scene.',
        highlight: true,
        items: [
            {
                kind: 'new',
                icon: 'sun',
                text: 'Shadow mapping enabled (PCF soft, 2048² map). DirectionalLight casts shadows; buildings cast + receive; terrain receives. The sun target follows the orbit centre so the shadow camera stays in frame as you pan.',
                prs: [],
            },
            {
                kind: 'new',
                icon: 'cloud-sun',
                text: 'Procedural sky dome (custom GLSL gradient shader) replaces the flat background. Dome rides the camera so the horizon never reveals an edge. Light and dark palettes are wired to the page theme — flip the theme toggle and the dome repaints live.',
                prs: [],
            },
            {
                kind: 'new',
                icon: 'mouse-pointer-2',
                text: 'Click any building in the scene to raise an info panel (address, GWR ID, construction year, floors, computed height in metres, distance to centre). Hits are gated by a 5 px drag threshold so orbit drags don\'t trigger picks. Picked buildings get a warm emissive highlight.',
                prs: [],
            },
            {
                kind: 'new',
                icon: 'compass',
                text: 'Top-right compass with a red north needle that tracks the orbit azimuth in real time. Click (or Enter/Space) to snap the view back to north without losing your zoom or pitch.',
                prs: [],
            },
            {
                kind: 'new',
                icon: 'ruler',
                text: 'Bottom-left scale legend that adapts to camera distance and snaps to a nice 1/2/5/10/20/50/100 m step so the bar length and label always agree.',
                prs: [],
            },
            {
                kind: 'new',
                icon: 'keyboard',
                text: 'Keyboard nav: arrow keys pan around the orbit target (12 m/tap), R/F zoom in/out, Home reframes the full building group. Form fields are exempt so typing in the locale select or search bar still works.',
                prs: [],
            },
        ],
    },
    {
        version: '0.3.0',
        date: 'May 28, 2026',
        codename: 'Hygiene Pass',
        summary:
            'Foundational sweep: wire the comparable-buildings sidebar to the 3D scene (clicking a comparable now reloads the scene at its lat/lng), apply the Contoor cache-bug retry to both terrain and building endpoints, tighten input validation on /api/parcel and /api/similoo (EGRID format, years/limit bounds), warn when hardcoded API-key fallbacks are used so prod env vars are easy to spot, and purge ~2K lines of Cesium-era legacy code that no longer ships (viewer/, controls/, screenshots/, info/, mapUrlState, tour, cesiumConfig, sidebar.css, vite-scaffold leftovers).',
        highlight: true,
        items: [
            {
                kind: 'fixed',
                icon: 'mouse-pointer-click',
                text: 'Clicking a comparable building card now reloads the 3D scene around that building — previously `onFlyTo` was null and the cards did nothing.',
                prs: [],
            },
            {
                kind: 'fixed',
                icon: 'shield-check',
                text: 'The Contoor cache-hit bug retry (lat/lng perturbation) now also fires for /api/three3d/building, not just /terrain — both endpoints share the buggy upstream cache codepath.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'lock',
                text: 'Input validation: /api/parcel and /api/similoo reject malformed EGRIDs (must match /^CH\\d{12}$/); /api/similoo also bounds years (1–100) and limit (1–100) before forwarding upstream.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'key',
                text: 'API tokens (Contoor 3D + RES) prefer env vars; one-shot console.warn flags when the hardcoded fallback is in use so deploys without env vars set are visible in Vercel logs.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'sparkles',
                text: 'Removed ~2K lines of unused Cesium-era code: src/js/viewer (12 files), controls (12), screenshots (4), info (1), auth (6), utils, cesiumConfig.js, tour.js, controls.js, mapUrlState.js, releaseNotesPanel.js, plus sidebar/auth/buildingInfoPanel/map/releaseNotes/screenshots CSS and root Vite scaffold (counter.js, main.js, style.css, netlify/).',
                prs: [],
            },
        ],
    },
    {
        version: '0.2.0',
        date: 'May 27, 2026',
        codename: 'Inter Polish',
        summary:
            'Typography refresh for a more professional tech-product look. UI body, headings, and the address search now ride on Inter (variable, OpenType cv11 + ss01 + tabular figures) with `-webkit-font-smoothing: antialiased` for clean rendering on the dark theme. Varela Round is preserved only for the `similoo-three` wordmark in the navbar — the suite-wide brand identifier with the red `oo`. Code/ID surfaces (parcel IDs, EGRID, camera monitor) switch to JetBrains Mono via a new `--hood-mono` token. Three tokens now drive every font choice in the app: `--hood-font` (Inter, UI), `--hood-display` (Varela Round, wordmark), `--hood-mono` (JetBrains Mono, code).',
        highlight: true,
        items: [
            {
                kind: 'improved',
                icon: 'type',
                text: 'Inter is now the UI font everywhere except the brand wordmark — landing hero, address search input, autocomplete list, navbar caption, sidebar, comparison panel, building info panel. Hero "Type a Swiss address." renders at Inter 700 with -2.5% tracking for a modern tech-product feel.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'badge-check',
                text: 'Brand wordmark untouched: `similoo-three` stays in Varela Round with the red `oo`, matching SwissNovo suite branding.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'code-2',
                text: 'JetBrains Mono token (`--hood-mono`) replaces every hard-coded `ui-monospace, SFMono-Regular, Menlo, Monaco, monospace` stack in buildingInfoPanel/comparison/releaseNotes/styles.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'sparkles',
                text: 'Crisper rendering on dark mode: grayscale font-smoothing, `text-rendering: optimizeLegibility`, kerning + ligatures + Inter cv11 (single-storey g) + ss01 (open digits) enabled at the html root.',
                prs: [],
            },
        ],
    },
    {
        version: '0.1.0',
        date: 'May 27, 2026',
        codename: 'First Three',
        summary:
            'similoo-three forks similoo into an address-first, Three.js-based 3D testbed. Instead of opening on a Switzerland-wide MapLibre map, the app drops the user on a centered address search (doorway-style). On pick, the chosen lat/lng is fed to the Contoor 3D API (`/api/v1/pointcloud/glb` for terrain, `/api/v1/building-model` for the building) and rendered in a Three.js scene with OrbitControls, a HemisphereLight + DirectionalLight rig, and a 100 m × 100 m reference grid. A new same-origin `/api/three3d/*` Vercel proxy fronts the Contoor API and attaches the optional `X-API-Key` server-side. The existing comparable-buildings sidebar (similoo /score/similoo backend) still opens once the EGRID resolves from /api/parcel, so the comparison surface ships alongside the 3D scene. Bundle drops MapLibre (and its Cesium / map-state inheritance) — the 3D engine is the only spatial dependency.',
        highlight: true,
        items: [
            {
                kind: 'new',
                icon: 'search',
                text: 'Address-first landing: type a Swiss address, get up to 5 Mapbox-geocoded matches, pick one to load the 3D scene.',
                prs: [],
            },
            {
                kind: 'new',
                icon: 'box',
                text: 'Three.js scene viewer at /sceneCanvas — OrbitControls, hemisphere + directional lighting, 100 m × 100 m grid, automatic camera framing once the building GLB lands.',
                prs: [],
            },
            {
                kind: 'new',
                icon: 'plug-zap',
                text: '/api/three3d/{terrain,building} same-origin Vercel proxy to the Contoor 3D API (`contoor-api-contabo.gisjoe.com`). CONTOOR_3D_API_KEY is attached server-side; GLBs are streamed back with `X-GLB-Metadata` preserved.',
                prs: [],
            },
            {
                kind: 'new',
                icon: 'columns-3',
                text: 'Comparable-buildings sidebar still opens once /api/parcel resolves an EGRID from the picked lat/lng — same target metrics, year/size filters, sortable card list as similoo.',
                prs: [],
            },
            {
                kind: 'new',
                icon: 'git-fork',
                text: 'Forked from mbuchi/similoo. Brand identifiers (page title, OG/Twitter, localStorage namespace `similoo-three-theme` / `similoo-three:locale`, telemetry app_name `similoo-three`, screenshot APP_SOURCE, file prefix `similoo_three_`) are switched so similoo and similoo-three do not collide.',
                prs: [],
            },
        ],
    },
];

export const CURRENT_VERSION = RELEASES[0].version;
