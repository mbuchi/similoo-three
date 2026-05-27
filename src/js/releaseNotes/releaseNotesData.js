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
