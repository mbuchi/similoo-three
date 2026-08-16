import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scene = readFileSync(new URL('../src/css/scene.css', import.meta.url), 'utf8');
const comparison = readFileSync(new URL('../src/css/comparison.css', import.meta.url), 'utf8');
const bugReport = readFileSync(new URL('../src/css/bugReport.css', import.meta.url), 'utf8');
const chrome = readFileSync(new URL('../src/css/styles.css', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../src/css/landing.css', import.meta.url), 'utf8');
const info = readFileSync(new URL('../src/js/three/buildingInfoPanel.js', import.meta.url), 'utf8');
const mobileControls = readFileSync(new URL('../src/js/three/mobileSceneControls.js', import.meta.url), 'utf8');
const sidebar = readFileSync(new URL('../src/js/comparison/sidebar.js', import.meta.url), 'utf8');
const releases = readFileSync(new URL('../src/js/releaseNotes/releaseNotesData.js', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const deploySetupScript = fileURLToPath(
  new URL('../scripts/setup-aireon-shared-ssh.sh', import.meta.url),
);

test('Vercel runs the hardened shared-package setup before npm install', () => {
  assert.equal(
    vercel.installCommand,
    'bash scripts/setup-aireon-shared-ssh.sh && npm install',
  );
});

test('the shared-package setup enforces its deploy key and configures secure SSH', (t) => {
  assert.equal(existsSync(deploySetupScript), true, 'deployment SSH setup script must exist');

  const tempHome = mkdtempSync(join(tmpdir(), 'similoo-three-deploy-test-'));
  const stubBin = join(tempHome, 'bin');
  const mkdirResult = spawnSync('/bin/mkdir', ['-p', stubBin]);
  assert.equal(mkdirResult.status, 0);
  t.after(() => rmSync(tempHome, { recursive: true, force: true }));

  const baseEnv = {
    HOME: tempHome,
    PATH: `${stubBin}:/usr/bin:/bin`,
  };
  const missingKey = spawnSync('/bin/bash', [deploySetupScript], {
    encoding: 'utf8',
    env: baseEnv,
  });
  assert.equal(missingKey.status, 1);
  assert.match(
    `${missingKey.stdout}${missingKey.stderr}`,
    /AIREON_SHARED_DEPLOY_KEY is required/,
  );

  const sshKeyscanStub = join(stubBin, 'ssh-keyscan');
  writeFileSync(
    sshKeyscanStub,
    '#!/bin/sh\nprintf "%s\\n" "github.com ssh-ed25519 AAAA-test-known-host"\n',
  );
  chmodSync(sshKeyscanStub, 0o755);
  const gitStub = join(stubBin, 'git');
  writeFileSync(
    gitStub,
    '#!/bin/sh\nprintf "%s\\n" "$@" > "$HOME/git-args"\n',
  );
  chmodSync(gitStub, 0o755);

  const configured = spawnSync('/bin/bash', [deploySetupScript], {
    encoding: 'utf8',
    env: {
      ...baseEnv,
      AIREON_SHARED_DEPLOY_KEY: 'test-only-deploy-key',
    },
  });
  assert.equal(configured.status, 0, `${configured.stdout}${configured.stderr}`);

  const sshDir = join(tempHome, '.ssh');
  const keyFile = join(sshDir, 'aireon_shared_deploy_key');
  const knownHosts = join(sshDir, 'known_hosts');
  assert.equal(statSync(sshDir).mode & 0o777, 0o700);
  assert.equal(statSync(keyFile).mode & 0o777, 0o600);
  assert.equal(readFileSync(keyFile, 'utf8'), 'test-only-deploy-key\n');
  assert.equal(statSync(knownHosts).mode & 0o777, 0o600);
  assert.equal(
    readFileSync(knownHosts, 'utf8'),
    'github.com ssh-ed25519 AAAA-test-known-host\n',
  );
  assert.deepEqual(
    readFileSync(join(tempHome, 'git-args'), 'utf8').trim().split('\n'),
    [
      'config',
      '--global',
      'core.sshCommand',
      `ssh -i ${keyFile} -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=${knownHosts}`,
    ],
  );
});

test('phone scene and navbar controls expose 44px targets', () => {
  assert.match(scene, /\.scene-sun-slider\s*{[^}]*min-height:\s*44px/s);
  assert.match(scene, /\.scene-info-close[^}]*height:\s*44px/s);
  assert.match(scene, /\.scene-info-save[^}]*height:\s*44px/s);
  assert.match(chrome, /\.aireon-hublink-btn[^}]*min-width:\s*44px[^}]*min-height:\s*44px/s);
  assert.match(chrome, /\.skip-link[^}]*min-height:\s*44px/s);
  assert.match(chrome, /\.aireon-onav-btn[^}]*width:\s*44px[^}]*height:\s*44px/s);
  assert.match(landing, /\.landing-result-remove[^}]*min-height:\s*44px/s);
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
  assert.match(sidebar, /<details class="cmp-section cmp-filters">/);
  assert.doesNotMatch(sidebar, /<details class="cmp-section cmp-filters" open>/);
  assert.match(comparison, /\.cmp-launcher:not\(\[hidden\]\)/);
});

test('focused inputs do not trigger the iOS Safari auto-zoom', () => {
  assert.match(
    html,
    /<meta name="viewport" content="width=device-width, initial-scale=1\.0, maximum-scale=1\.0, viewport-fit=cover">/,
  );
  assert.match(bugReport, /\.aireon-bug-field input,\s*\.aireon-bug-field textarea\s*{\s*font-size:\s*16px/s);
  assert.match(comparison, /\.cmp-size-sub input\s*{\s*font-size:\s*16px/s);
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

test('release and package metadata are aligned at 0.10.23', () => {
  assert.equal(pkg.version, '0.10.23');
  assert.equal(lock.version, '0.10.23');
  assert.equal(lock.packages[''].version, '0.10.23');
  assert.match(releases, /export const RELEASES = \[\s*{\s*version: '0\.10\.23'/s);
});

test('clean builds use the pinned shared package tag', () => {
  assert.equal(pkg.dependencies['@aireon/shared'], 'github:mbuchi/aireon-shared#v1.171.3');
});
