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
        version: '0.9.7',
        date: 'June 10, 2026',
        codename: 'Safe Splat',
        summary:
            'Hardened the /splat 3D Gaussian-splat viewer against a reflected cross-site-scripting (XSS) issue and brought its page metadata onto the Aireon domains.',
        items: [
            {
                kind: 'fixed',
                icon: 'shield',
                text: 'Fixed a reflected-XSS issue in the /splat viewer: the ?src= parameter and load-error text are now rendered as inert text via DOM nodes instead of innerHTML, so a crafted ?src= link can no longer execute markup.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'sparkles',
                text: 'Repointed the /splat page favicon, Open Graph and canonical metadata from the old swissnovo URLs to the Aireon hub (hub.aireon.ch / similoo-three.aireon.ch).',
                prs: [],
            },
        ],
    },
    {
        version: '0.9.6',
        date: 'June 9, 2026',
        codename: 'Aligned Meta',
        summary:
            'The page metadata now uses the same description shown on the Aireon hub card.',
        items: [
            {
                kind: 'improved',
                icon: 'sparkles',
                text: 'Updated the HTML meta, Open Graph and Twitter descriptions to match the Aireon hub card copy: "See buildings plus its surroundings live in 3D.".',
                prs: [],
            },
        ],
    },
{
        version: '0.9.5',
        date: 'June 5, 2026',
        codename: 'One Sign-In',
        summary:
            'Cross-app single sign-on now works: if you are signed in to any Aireon app, similoo-three signs you in automatically on load via a brief, UI-less prompt=none check. Anonymous visitors are unaffected.',
        highlight: true,
        items: [
            {
                kind: 'new',
                icon: 'log-in',
                text: 'Added cross-app single sign-on: signed in to any Aireon app, similoo-three now signs you in automatically on load via a brief, UI-less prompt=none session check. Anonymous visitors are unaffected.',
                prs: [],
            },
        ],
    },
    {
        version: '0.9.4',
        date: 'June 4, 2026',
        codename: 'Instant Reopen',
        summary:
            'Re-opening an address is now instant. A client-side IndexedDB blob cache (byte-budget LRU + 14-day TTL) fronts the streamed 3D terrain and building GLB meshes, so revisiting a coordinate renders from disk and offloads the Contoor 3D API.',
        highlight: true,
        items: [
            {
                kind: 'new',
                icon: 'database',
                text: 'Added a client-side IndexedDB blob cache (byte-budget LRU + TTL) for the streamed 3D terrain/building GLB meshes so re-opening an address is instant and offloads the Contoor 3D API. The cache is keyed by the request coordinate, capped at ~150 MB (least-recently-used eviction), expires after 14 days, and degrades silently to a plain network fetch in private-browsing or when storage is unavailable — the viewer never blocks on it.',
                prs: [],
            },
        ],
    },
    {
        version: '0.9.3',
        date: 'June 4, 2026',
        codename: 'Track Parcel',
        summary:
            'The save-parcel button now reads "Track parcel" (and "Tracked" once saved) instead of "Save parcel"/"Saved", matching the suite-wide wording standard for clearer new-user intent. Relabelled in all four languages.',
        highlight: false,
        items: [
            {
                kind: 'improved',
                icon: 'bookmark',
                text: 'Info-panel save button relabelled to "Track parcel" / "Tracked" (was "Save parcel" / "Saved") for suite consistency: EN "Track parcel"/"Tracked", FR "Suivre la parcelle"/"Suivie", DE "Parzelle verfolgen"/"Verfolgt", IT "Segui la particella"/"Seguita". The saving / sign-in / error states are unchanged.',
                prs: [],
            },
        ],
    },
    {
        version: '0.9.2',
        date: 'June 3, 2026',
        codename: 'Hyphen, Not Dash',
        summary:
            'The browser tab title now uses a plain hyphen separator instead of an em dash, matching the suite convention.',
        highlight: false,
        items: [
            {
                kind: 'improved',
                icon: 'type',
                text: 'Page title (static <title> and i18n meta.title in all languages) now uses a hyphen separator instead of an em dash.',
                prs: [],
            },
        ],
    },
    {
        version: '0.8.5',
        date: 'June 2, 2026',
        codename: 'Suite UI consistency sweep',
        summary:
            'Suite-wide consistency pass. The CSS design tokens move back to the shared `--hood-*` prefix — the intentional suite standard every app inherits from the hood fork — so similoo-three lines up with the rest of the suite again. Dark mode also gets several missing overrides and the navbar controls gain proper styling with keyboard focus rings.',
        highlight: false,
        items: [
            {
                kind: 'improved',
                icon: 'palette',
                text: 'CSS custom properties across styles/scene/landing/comparison renamed back to the suite-standard `--hood-*` prefix (from the app-specific `--similoo-three-*` namespace) for cross-suite consistency.',
                prs: [22],
            },
            {
                kind: 'improved',
                icon: 'sun-moon',
                text: 'Navbar theme-toggle and language selector now have proper styling (rounded card, accent-red hover) plus a suite-standard focus-visible ring for keyboard users; the sun/moon icon now swaps with the active theme.',
                prs: [22],
            },
            {
                kind: 'fixed',
                icon: 'moon',
                text: 'Dark-mode fixes: the mobile dropdown menu, camera monitor, and address header no longer stay white-on-dark — each now flips to the dark surface in dark mode.',
                prs: [22],
            },
        ],
    },
    {
        version: '0.8.4',
        date: 'June 2, 2026',
        codename: 'CSS token namespace cleanup',
        summary:
            'Internal naming hygiene: the design-token and layout CSS custom properties were renamed from the inherited `--hood-` prefix to the app-specific `--similoo-three-` namespace, removing naming drift carried over from the hood fork. No visual changes.',
        highlight: false,
        items: [
            {
                kind: 'improved',
                icon: 'palette',
                text: 'CSS custom properties across styles/scene/landing/comparison renamed from `--hood-*` to `--similoo-three-*` for a consistent app namespace.',
                prs: [21],
            },
        ],
    },
    {
        version: '0.8.3',
        date: 'May 31, 2026',
        codename: 'Centralised share card',
        summary:
            'The social-share preview image (Open Graph / Twitter card) now points at the centralized toolbox-hosted canonical image instead of a per-app file, with the correct real pixel dimensions.',
        highlight: false,
        items: [
            {
                kind: 'improved',
                icon: 'image',
                text: 'social-share preview image now uses the centralized toolbox URL (https://toolbox.swissnovo.com/meta/similoo-three.jpg) with correct dimensions.',
                prs: [],
            },
        ],
    },
    {
        version: '0.8.2',
        date: 'May 31, 2026',
        codename: 'Skip-link i18n fix',
        summary:
            'Follow-up to the v0.8.1 accessibility pass: the new keyboard "Skip to content" link referenced a translation key (nav.skip_to_content) that had not been added to the catalog, so it rendered the raw key text. The key is now translated in all four languages (EN/FR/DE/IT), so the link reads correctly for everyone.',
        highlight: false,
        items: [
            {
                kind: 'fixed',
                icon: 'accessibility',
                text: 'Skip-to-content link now shows localised text in EN/FR/DE/IT instead of the literal key "nav.skip_to_content" (the translation key was missing from the catalog in v0.8.1).',
                prs: [],
            },
        ],
    },
    {
        version: '0.8.1',
        date: 'May 30, 2026',
        codename: 'A11y polish',
        summary:
            'Accessibility polish pass on the 2D chrome around the 3D scene. A keyboard "Skip to content" link now lets users jump past the navbar straight to the address search; it stays visually hidden until focused and is localised in EN/FR/DE/IT. The landing address search is now a proper ARIA combobox — it exposes aria-expanded, aria-controls and aria-activedescendant so screen readers announce the live result list and the keyboard-highlighted option as you arrow through it. The whole interactive area is wrapped in a <main id="main-content"> landmark. Finally, prefers-reduced-motion now also calms the scene chrome (status-bar pulse, layer spinner, info-panel reveal), not just the skeleton loaders.',
        highlight: false,
        items: [
            {
                kind: 'improved',
                icon: 'accessibility',
                text: 'Keyboard "Skip to content" link (visually hidden until focused) jumps past the navbar to the address search / 3D scene. Localised in EN/FR/DE/IT.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'search',
                text: 'Landing address search is a proper ARIA combobox: aria-expanded reflects the result list, aria-controls points at it, and aria-activedescendant tracks the arrow-key-highlighted option so screen readers announce it.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'layout',
                text: 'Interactive area wrapped in a <main id="main-content"> landmark for assistive-tech navigation.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'eye',
                text: 'prefers-reduced-motion now also pauses the scene status-bar pulse, layer spinner and info-panel reveal animation, matching the skeleton-loader behaviour.',
                prs: [],
            },
        ],
    },
    {
        version: '0.8.0',
        date: 'May 28, 2026',
        codename: 'Auth & PRM',
        summary:
            'Suite parity step one: Zitadel auth + Parcel Registry Management (PRM) save-parcel. Signing in works through the standard SwissNovo OIDC flow (the same Zitadel realm the rest of the suite uses); the building info panel grows a "Save parcel" footer button that hits the proom PRM backend via @aireon/shared\'s vanilla helpers. The button is state-aware — "Save parcel" → "Saving…" → "Saved" (or "Sign in to save" for anonymous users, who get the login popup on click). Locale-correct labels for all five states in EN/FR/DE/IT. The shared i18n engine is now registered with our 293-key catalog so the suite-shared auth nav speaks the same language as the rest of the UI. Claire (text + voice) is the remaining parity gap — defer to a follow-up because the React-based ClaireAssistant component needs a tiny React island that doesn\'t exist in this vanilla app yet.',
        highlight: true,
        items: [
            {
                kind: 'new',
                icon: 'log-in',
                text: 'Zitadel auth via @aireon/shared/cesium-app/auth: setupAuth() injects the login button + profile dropdown into the existing <div id="authNav"> placeholder. Standard SwissNovo OIDC redirect_uri / silent SSO flow, no app-specific config beyond setupApp({appName: "similoo-three"}).',
                prs: [],
            },
            {
                kind: 'new',
                icon: 'bookmark',
                text: 'Save-parcel button in the building info panel footer. Calls @aireon/shared\'s createPrmRecord/fetchPrmByParcel with the picked building\'s GWR id as the parcel_id. State machine: idle → saving → saved (or auth → error). Re-clicking a saved parcel shows the "Saved" state without re-saving.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'languages',
                text: 'Shared i18n engine now registered with our 293-key catalog at i18n.js load time. The auth nav + profile modal pull their strings from the same catalog as the rest of similoo-three — no more EN-only fallback in shared UI.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'globe',
                text: 'Save-parcel labels translated for all five states in EN/FR/DE/IT: "Save parcel" / "Enregistrer" / "Parzelle speichern" / "Salva particella", plus the saving / saved / sign-in / error variants.',
                prs: [],
            },
            {
                kind: 'docs',
                icon: 'message-square',
                text: 'Defer: Claire (text + voice) is the remaining parity gap. The shared ClaireAssistant is a React component; integrating it into this vanilla Vite app needs a tiny React island that\'s tracked for a follow-up PR. Save-parcel is the higher-value first step (it persists user work; Claire is a UX layer on top).',
                prs: [],
            },
        ],
    },
    {
        version: '0.7.3',
        date: 'May 28, 2026',
        codename: 'Cache Layer',
        summary:
            'Repeat lookups are now answered from localStorage instead of going back to the network. EGRID resolution caches at 1 m precision for 24 h; /score/similoo comparables cache by (egrid, years, limit) for 7 days (matches the backend Redis TTL); Contoor /building-height-volume caches by clicked-building lat/lng for 7 days. A small TTL-aware wrapper (src/js/cache.js) handles all three, with a 64-entry soft cap that evicts oldest-expiring first when localStorage gets crowded. Mock similoo responses and failed height-volume calls are deliberately NOT cached — they\'re either deterministic from the seed or transient enough that retrying is the right move.',
        highlight: false,
        items: [
            {
                kind: 'new',
                icon: 'database',
                text: 'New src/js/cache.js — tiny TTL-aware localStorage wrapper. Each entry stores {v, e: expiry}; reads check expiry and evict on the fly. Soft cap of 64 entries per namespace, sorted by oldest expiry on overflow.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'zap',
                text: 'EGRID lookups (parcelLookup.js) cache by lat,lng rounded to 5 decimals (~1 m). Re-clicking the same building skips the /api/parcel roundtrip entirely.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'zap',
                text: 'Comparable buildings (fetchSimilooComparables) cache by (egrid, years, limit) for 7 days. Re-opening a comparable\'s sidebar in a new session is instant. Mock data is bypassed (deterministic from EGRID seed).',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'zap',
                text: 'Building height-volume metrics (Contoor /building-height-volume) cache by lat,lng for 7 days. Picking the same building twice in a session — no second Contoor call. Partial failures aren\'t cached so retries get a fresh attempt.',
                prs: [],
            },
        ],
    },
    {
        version: '0.7.2',
        date: 'May 28, 2026',
        codename: 'Locale Parity',
        summary:
            'All 30 new strings introduced across v0.4.0–v0.7.1 (compass ticks, scene info panel, layers dock, sun control, retry button, error pill, canvas aria-label) now have proper French / German / Italian translations alongside the original English. Locale-correct cardinal directions on the compass (N E S O in FR/IT, N O S W in DE), Swiss-flavoured terminology ("RegBL"/"RegEd" for the building registry, "Geschosse"/"Étages"/"Piani" for floors). All four locales now share exact 293-key parity — no more silent EN fallback for new features.',
        highlight: false,
        items: [
            {
                kind: 'improved',
                icon: 'languages',
                text: 'FR/DE/IT translations added for every key introduced in v0.4.0 through v0.7.1 (~30 keys): compass ticks, building info panel rows, layers dock, sun control + altitude readout, retry button, error pill, 3D canvas aria-label.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'compass',
                text: 'Locale-correct cardinal direction on the compass: N E S O for French and Italian (Ouest/Ovest), N O S W for German (Ost/West). Previously the compass always read "N E S W" regardless of locale.',
                prs: [],
            },
            {
                kind: 'improved',
                icon: 'check-check',
                text: 'All four locales now share exact 293-key parity (en = fr = de = it). The fallback chain still resolves any missing key to EN, but the new-feature surface no longer silently falls back.',
                prs: [],
            },
        ],
    },
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
