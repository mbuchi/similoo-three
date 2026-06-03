#!/usr/bin/env node
// make-sample-splat.mjs — generate public/sample.splat
//
// The /splat sub-path is a 3D Gaussian Splatting viewer. A *real* scene comes
// from photogrammetry: drone/phone photos of a building are trained into a
// cloud of 3D Gaussians, cleaned up in SuperSplat, then served as a .ply/.splat.
//
// We can't train a real capture here, so this script synthesises a small,
// on-brand stand-in: a stylised Swiss house (warm-grey walls, blue windows,
// gravel roof) with a Swiss-cross flag laid on the roof, sitting on a green
// lawn. It exercises the exact same renderer path a real capture would, with
// zero third-party hosting — the viewer loads it from the same origin.
//
// Output format: the antimatter15 ".splat" layout that
// @mkkellogg/gaussian-splats-3d reads natively — 32 bytes per splat:
//   position  3 × float32   (x, y, z)            metres, Y up
//   scale     3 × float32   (sx, sy, sz)         metres (linear)
//   color     4 × uint8     (r, g, b, a)
//   rotation  4 × uint8     quaternion, byte = q*128 + 128
//
// Deterministic (seeded PRNG) so the committed file is stable across runs.
//
//   node scripts/make-sample-splat.mjs            # → public/sample.splat
//   node scripts/make-sample-splat.mjs out.splat  # custom path

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// ── seeded PRNG (mulberry32) ──────────────────────────────────────────────
let _s = 0x9e3779b9;
function rng() {
  _s |= 0;
  _s = (_s + 0x6d2b79f5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rand = (a, b) => a + (b - a) * rng();
const jit = (v, d) => Math.max(0, Math.min(255, Math.round(v + rand(-d, d))));

// ── splat accumulator ─────────────────────────────────────────────────────
const splats = [];
const IDENT = [1, 0, 0, 0]; // identity quaternion — our surfaces are axis-aligned
function push(pos, scale, color, rot = IDENT) {
  splats.push({ pos, scale, color, rot });
}

// Fill an axis-aligned rectangle living in a plane, with a per-point colour fn.
//   axisU/axisV: unit-ish step directions; `n` points jittered across the rect.
function fillRect({ origin, u, v, uLen, vLen, n, scale, color, jitterNormal = 0, normal }) {
  for (let i = 0; i < n; i++) {
    const su = rand(0, uLen);
    const sv = rand(0, vLen);
    const nOff = jitterNormal ? rand(-jitterNormal, jitterNormal) : 0;
    const p = [
      origin[0] + u[0] * su + v[0] * sv + (normal ? normal[0] * nOff : 0),
      origin[1] + u[1] * su + v[1] * sv + (normal ? normal[1] * nOff : 0),
      origin[2] + u[2] * su + v[2] * sv + (normal ? normal[2] * nOff : 0),
    ];
    const c = typeof color === 'function' ? color(su / uLen, sv / vLen) : color;
    push(p, scale, c);
  }
}

// ── 1. Lawn — green disc, flat splats ─────────────────────────────────────
{
  const R = 18;
  const n = 4800;
  for (let i = 0; i < n; i++) {
    const ang = rand(0, Math.PI * 2);
    // sqrt for uniform area; bias a touch toward the edges so it doesn't clump
    const r = Math.sqrt(rng()) * R;
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r;
    const shade = 1 - 0.28 * (r / R); // slightly darker outward
    push(
      [x, rand(-0.04, 0.04), z],
      [0.9, 0.05, 0.9],
      [jit(92 * shade + 10, 11), jit(132 * shade + 12, 12), jit(70 * shade + 8, 9), 246],
    );
  }
}

// ── building envelope: footprint 10 (x) × 8 (z), height 12 ─────────────────
// Splats are sized/dense enough to read as *solid* surfaces from across the
// lawn (sparse tiny splats vanish at viewing distance).
const HX = 5, HZ = 4, H = 12;
const WALL = () => [jit(188, 8), jit(180, 8), jit(166, 8), 250]; // warm grey
const wallScaleZ = [0.33, 0.33, 0.06]; // flat in z (front/back walls)
const wallScaleX = [0.06, 0.33, 0.33]; // flat in x (side walls)

// front (z=+HZ) & back (z=-HZ)
for (const z of [HZ, -HZ]) {
  fillRect({
    origin: [-HX, 0, z], u: [1, 0, 0], v: [0, 1, 0], uLen: 2 * HX, vLen: H,
    n: 2400, scale: wallScaleZ, color: WALL, normal: [0, 0, 1], jitterNormal: 0.03,
  });
}
// left (x=-HX) & right (x=+HX)
for (const x of [-HX, HX]) {
  fillRect({
    origin: [x, 0, -HZ], u: [0, 0, 1], v: [0, 1, 0], uLen: 2 * HZ, vLen: H,
    n: 1900, scale: wallScaleX, color: WALL, normal: [1, 0, 0], jitterNormal: 0.03,
  });
}

// ── windows — glassy blue rectangles on front & back walls ─────────────────
{
  const W = 1.2, Hh = 1.6;
  const xs = [-3, 0, 3], ys = [2.4, 7.0];
  const glass = () => [jit(88, 10), jit(122, 10), jit(160, 10), 240];
  for (const z of [HZ + 0.04, -(HZ + 0.04)]) {
    for (const cx of xs) {
      for (const cy of ys) {
        fillRect({
          origin: [cx - W / 2, cy - Hh / 2, z], u: [1, 0, 0], v: [0, 1, 0],
          uLen: W, vLen: Hh, n: 110, scale: [0.16, 0.16, 0.05], color: glass,
        });
      }
    }
  }
  // a door on the front
  fillRect({
    origin: [-0.7, 0, HZ + 0.04], u: [1, 0, 0], v: [0, 1, 0],
    uLen: 1.4, vLen: 2.3, n: 220, scale: [0.16, 0.16, 0.05],
    color: () => [jit(96, 8), jit(64, 8), jit(44, 8), 248],
  });
}

// ── roof — gravel-grey cap at y=H ──────────────────────────────────────────
fillRect({
  origin: [-HX, H, -HZ], u: [1, 0, 0], v: [0, 0, 1], uLen: 2 * HX, vLen: 2 * HZ,
  n: 1500, scale: [0.34, 0.05, 0.34],
  color: () => [jit(110, 9), jit(110, 9), jit(116, 9), 250],
});

// ── Swiss-cross flag laid on the roof ──────────────────────────────────────
// Red square 5 (x) × 4 (z); white cross arms ~1/5 of the square (Swiss ratio).
{
  const FX = 5, FZ = 4; // span
  const x0 = -FX / 2, z0 = -FZ / 2;
  const armHalfX = 0.55, armHalfZ = 0.55; // cross thickness (half)
  const crossReachX = 1.75, crossReachZ = 1.55; // cross arm length (half)
  const RED = () => [jit(213, 6), jit(43, 6), jit(30, 6), 252];
  const WHITE = () => [jit(240, 4), jit(240, 4), jit(243, 4), 252];
  const n = 1700;
  for (let i = 0; i < n; i++) {
    const lx = rand(x0, x0 + FX); // local x in [-2.5,2.5]
    const lz = rand(z0, z0 + FZ); // local z in [-2,2]
    const inVert = Math.abs(lx) <= armHalfX && Math.abs(lz) <= crossReachZ;
    const inHorz = Math.abs(lz) <= armHalfZ && Math.abs(lx) <= crossReachX;
    const white = inVert || inHorz;
    push([lx, H + 0.09, lz], [0.17, 0.04, 0.17], (white ? WHITE : RED)());
  }
}

// ── encode to .splat (32 bytes/splat, little-endian) ───────────────────────
const N = splats.length;
const buf = Buffer.alloc(N * 32);
for (let i = 0; i < N; i++) {
  const o = i * 32;
  const s = splats[i];
  buf.writeFloatLE(s.pos[0], o + 0);
  buf.writeFloatLE(s.pos[1], o + 4);
  buf.writeFloatLE(s.pos[2], o + 8);
  buf.writeFloatLE(s.scale[0], o + 12);
  buf.writeFloatLE(s.scale[1], o + 16);
  buf.writeFloatLE(s.scale[2], o + 20);
  buf.writeUInt8(s.color[0], o + 24);
  buf.writeUInt8(s.color[1], o + 25);
  buf.writeUInt8(s.color[2], o + 26);
  buf.writeUInt8(s.color[3], o + 27);
  for (let k = 0; k < 4; k++) {
    buf.writeUInt8(Math.max(0, Math.min(255, Math.round(s.rot[k] * 128 + 128))), o + 28 + k);
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(here, '..', 'public', 'sample.splat');
writeFileSync(out, buf);
console.log(`wrote ${N} splats (${(buf.length / 1024).toFixed(1)} KiB) → ${out}`);
