import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const scene = readFileSync(new URL('../src/css/scene.css', import.meta.url), 'utf8');
const comparison = readFileSync(new URL('../src/css/comparison.css', import.meta.url), 'utf8');
const chrome = readFileSync(new URL('../src/css/styles.css', import.meta.url), 'utf8');
const info = readFileSync(new URL('../src/js/three/buildingInfoPanel.js', import.meta.url), 'utf8');
const mobileControls = readFileSync(new URL('../src/js/three/mobileSceneControls.js', import.meta.url), 'utf8');
const sidebar = readFileSync(new URL('../src/js/comparison/sidebar.js', import.meta.url), 'utf8');
const releases = readFileSync(new URL('../src/js/releaseNotes/releaseNotesData.js', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));

test('phone scene and navbar controls expose 44px targets', () => {
  assert.match(scene, /\.scene-sun-slider\s*{[^}]*min-height:\s*44px/s);
  assert.match(scene, /\.scene-info-close[^}]*height:\s*44px/s);
  assert.match(scene, /\.scene-info-save[^}]*height:\s*44px/s);
  assert.match(chrome, /\.aireon-hublink-btn[^}]*min-width:\s*44px[^}]*min-height:\s*44px/s);
  assert.match(chrome, /\.skip-link[^}]*min-height:\s*44px/s);
  assert.match(chrome, /\.aireon-onav-btn[^}]*width:\s*44px[^}]*height:\s*44px/s);
});

test('phone comparison controls expose 44px targets and readable labels', () => {
  assert.match(comparison, /\.cmp-close[^}]*width:\s*44px[^}]*height:\s*44px/s);
  assert.match(comparison, /\.cmp-years-range[^}]*min-height:\s*44px/s);
  assert.match(comparison, /\.cmp-size-sub input[^}]*min-height:\s*44px/s);
  assert.match(comparison, /\.cmp-sort[^}]*min-height:\s*44px/s);
  assert.match(comparison, /\.cmp-card-foot-key[^}]*font-size:\s*12px/s);
  assert.match(comparison, /\.cmp-target-val[^}]*font-size:\s*12px/s);
});

test('mobile map settings and comparisons are closed behind dismissible launchers', () => {
  assert.match(scene, /\.scene-controls-fab:not\(\[hidden\]\)/);
  assert.match(scene, /\.scene-controls-overlay\[hidden\]/);
  assert.match(mobileControls, /overlay\.hidden = true/);
  assert.match(mobileControls, /document\.body\.classList\.toggle\('scene-controls-open', open\)/);
  assert.match(mobileControls, /event\.key === 'Escape'/);
  assert.match(mobileControls, /scrim\.addEventListener\('click', closeSheet\)/);
  assert.match(sidebar, /if \(mobileMedia\.matches\) \{\s*collapseToLauncher\(\)/s);
  assert.match(comparison, /\.cmp-launcher:not\(\[hidden\]\)/);
});

test('hidden scene info is removed from the accessibility tree', () => {
  assert.match(info, /root\.setAttribute\('aria-hidden', 'true'\)/);
  assert.match(info, /root\.setAttribute\('aria-hidden', 'false'\)/);
});

test('phone labels wrap without clipping and use local brand artwork', () => {
  assert.match(scene, /\.scene-address[^}]*white-space:\s*normal[^}]*overflow:\s*visible/s);
  assert.match(scene, /\.scene-status-msg[^}]*white-space:\s*normal[^}]*overflow:\s*visible/s);
  assert.doesNotMatch(chrome, /hub\.aireon\.ch\/brand\/aireon-mark\.svg/);
  assert.match(chrome, /mask:\s*url\("\/brand\/aireon-mark\.svg"\)/);
});

test('release and package metadata are aligned at 0.10.11', () => {
  assert.equal(pkg.version, '0.10.11');
  assert.equal(lock.version, '0.10.11');
  assert.equal(lock.packages[''].version, '0.10.11');
  assert.match(releases, /export const RELEASES = \[\s*{\s*version: '0\.10\.11'/s);
});

test('clean builds use the pinned local shared package artifact', () => {
  assert.equal(pkg.dependencies['@aireon/shared'], 'file:vendor/aireon-shared-1.99.0.tgz');
  assert.equal(
    lock.packages['node_modules/@aireon/shared'].resolved,
    'file:vendor/aireon-shared-1.99.0.tgz',
  );
});
