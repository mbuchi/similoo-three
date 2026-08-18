import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DEFAULT_ZONE_FIELD, DEFAULT_ZONE_MODE, resolveZoneLabel } from '@aireon/shared/parcel-zone';

// Suite rule (aireon-shared/docs/PARCEL_ZONE_STANDARD.md, 2026-08-19): a
// parcel's zone is the MUNICIPAL designation (`cz_local`, e.g. "Dorfzone 2",
// "Wohnzone, Bauklasse 4"), one label per parcel, resolved by
// @aireon/shared/parcel-zone. The federal category `cz_harmonized` is a
// filter, never the label. The comparison sidebar is the only surface in
// similoo-three that prints a zone, so it is the only place the rule can drift.

const sidebar = readFileSync(new URL('../src/js/comparison/sidebar.js', import.meta.url), 'utf8');

test('the comparison sidebar resolves the zone through @aireon/shared/parcel-zone', () => {
  assert.match(sidebar, /import \{ resolveZoneLabel \} from '@aireon\/shared\/parcel-zone';/);
  assert.match(sidebar, /escapeHtml\(resolveZoneLabel\(target\) \|\| dash\(\)\)/);
  // No hand-rolled municipal-first chain and no raw column read for display.
  assert.doesNotMatch(sidebar, /target\.cz_local\s*\|\|/);
  assert.doesNotMatch(sidebar, /\.cz_harmonized/);
  assert.doesNotMatch(sidebar, /\.cz_canton_name/);
});

// v1.177.0, the municipal-zone release: default single / cz_local.
test('the shared resolver defaults to the municipal designation', () => {
  assert.equal(DEFAULT_ZONE_MODE, 'single');
  assert.equal(DEFAULT_ZONE_FIELD, 'cz_local');
});

// Real production rows: Grenchen (harmonized present, must NOT win) and Zürich
// (no cz_harmonized, cz_canton is a legal cross-reference).
test('resolveZoneLabel returns the municipal designation, never the federal category as the label', () => {
  assert.equal(
    resolveZoneLabel({ cz_local: 'Wohnzone, Bauklasse 4', cz_canton: 'Wohnzone 4 G', cz_harmonized: 'Wohnzonen' }),
    'Wohnzone, Bauklasse 4',
  );
  assert.equal(
    resolveZoneLabel({
      cz_local: 'dreigeschossige Wohnzone',
      cz_harmonized: null,
      cz_canton: 'siehe gültige Bau- und Zonenordnung der Stadt Zürich',
    }),
    'dreigeschossige Wohnzone',
  );
  // The /score/similoo target carries cz_abbrev (RES fills it from cz_canton),
  // so a ZH cross-reference sentence there must not leak into the sidebar.
  assert.equal(
    resolveZoneLabel({ cz_local: null, cz_abbrev: 'siehe gültige Bau- und Zonenordnung der Stadt Zürich' }),
    null,
  );
  // The deterministic mock target (cz_local + cz_abbrev only) reads its municipal label.
  assert.equal(resolveZoneLabel({ cz_local: 'W2 — Wohnzone 2', cz_abbrev: 'W2' }), 'W2 — Wohnzone 2');
  // Only when the municipal designation is missing does the federal category fill in.
  assert.equal(resolveZoneLabel({ cz_local: null, cz_harmonized: 'Wohnzonen' }), 'Wohnzonen');
});
