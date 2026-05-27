# similoo-three — Address-first 3D Comparable Buildings

Type a Swiss address. similoo-three renders the building and a 100 m slice around it in live 3D (Three.js + the Contoor 3D API), then opens the same comparable-buildings sidebar similoo ships — backed by `/score/similoo` on the RES API.

This is a testing fork of [similoo](https://github.com/mbuchi/similoo) that swaps the Switzerland-wide map for an address-search-first flow (à la [doorway](https://github.com/mbuchi/doorway)) and replaces the map-based 3D view with a dynamic Three.js scene generated per address.

## Flow

1. Landing view: Mapbox-geocoded address search (debounced, Switzerland-restricted).
2. On pick, the lat/lng feeds two backend calls in parallel:
   - **`/api/three3d/terrain`** → Contoor `POST /api/v1/pointcloud/glb` (terrain mesh, ~100 m radius, local meters).
   - **`/api/three3d/building`** → Contoor `POST /api/v1/building-model` (building GLB for the point).
3. Both GLBs land in a Three.js scene with OrbitControls and a HemisphereLight + DirectionalLight rig. A 100 m × 100 m grid gives scale.
4. In parallel, `/api/parcel` resolves the EGRID at the picked lat/lng and the comparable-buildings sidebar opens (same UI as similoo).

## Tech Stack

| Layer        | Choice                                                          |
| ------------ | --------------------------------------------------------------- |
| Build tool   | [Vite 5](https://vitejs.dev/)                                   |
| Language     | Vanilla JavaScript (ES modules)                                 |
| 3D engine    | [three.js](https://threejs.org/) v0.184 + OrbitControls         |
| Geocoder     | Mapbox Search API v6 (forward geocoding, Switzerland-restricted) |
| Icons        | [Lucide](https://lucide.dev/)                                   |
| Hosting      | Vercel (static site + Node.js serverless functions)             |
| 3D API       | [project_res_3D_api](../../project_res_3D_api) (Contoor)        |
| Comparables  | `POST /score/similoo` on `project_RES`                          |

## Local Development

```bash
npm install
cp .env.example .env  # optional — VITE_MAPBOX_TOKEN if you want your own, CONTOOR_3D_API_KEY if the 3D API is gated
npm run dev           # http://localhost:5173
npm run build         # static bundle in dist/
```

### Vercel environment variables

| Var                   | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `CONTOOR_3D_API_KEY`  | Optional `X-API-Key` for the Contoor 3D API (server)   |
| `CONTOOR_3D_API_BASE` | Override the Contoor base URL (defaults to gisjoe.com) |
| `VITE_MAPBOX_TOKEN`   | Mapbox token for geocoding (falls back to suite token) |

## Deployment

Vercel autodeploys `main`. Production URL: `https://swissnovo-similoo-three.vercel.app`.

## Lineage

Forked from `mbuchi/similoo`. Brand identifiers (`app_name`, `APP_SOURCE`, screenshot prefix, localStorage namespace) are switched to `similoo-three` so telemetry and per-user state stay isolated.
