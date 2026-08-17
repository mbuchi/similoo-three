import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolveZoneLabel } from '@aireon/shared/parcel-zone';

// Suite rule (aireon-shared/docs/PARCEL_ZONE_STANDARD.md): a parcel's zone is
// the harmonized federal category, one label per parcel, resolved by
// @aireon/shared/parcel-zone. The comparison sidebar is the only surface in
// similoo-three that prints a zone, so it is the only place the rule can drift.

const sidebar = readFileSync(new URL('../src/js/comparison/sidebar.js', import.meta.url), 'utf8');

test('the comparison sidebar resolves the zone through @aireon/shared/parcel-zone', () => {
  assert.match(sidebar, /import \{ resolveZoneLabel \} from '@aireon\/shared\/parcel-zone';/);
  assert.match(sidebar, /escapeHtml\(resolveZoneLabel\(target\) \|\| dash\(\)\)/);
  // No hand-rolled municipal-first chain and no raw harmonized read for display.
  assert.doesNotMatch(sidebar, /target\.cz_local\s*\|\|/);
  assert.doesNotMatch(sidebar, /\.cz_harmonized/);
  assert.doesNotMatch(sidebar, /\.cz_canton_name/);
});

// Real production rows: Grenchen (harmonized present) and Zürich (no
// cz_harmonized, cz_canton is a legal cross-reference).
test('resolveZoneLabel prefers the harmonized category and falls back to the municipal one', () => {
  assert.equal(
    resolveZoneLabel({ cz_local: 'Wohnzone, Bauklasse 4', cz_harmonized: 'Wohnzonen' }),
    'Wohnzonen',
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
  // The deterministic mock target (no cz_harmonized) still reads its municipal label.
  assert.equal(resolveZoneLabel({ cz_local: 'W2 — Wohnzone 2', cz_abbrev: 'W2' }), 'W2 — Wohnzone 2');
});
