// A-05: proves scripts/audit-android-assets.mjs is a real AAPT2-backed gate,
// distinct from A-04's platform-neutral decoder — the acceptance criterion is
// that reintroducing the original incompatible Wally blob fails this gate.
// The two cases that matter for that claim run against the real `aapt2`
// binary (not mocked); they skip cleanly (not a false failure) on a machine
// without an Android SDK, since that is exactly this gate's own precondition.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  resolveAapt2Path,
  compileWithAapt2,
  auditProductionAssets,
} from './audit-android-assets.mjs';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const CORRUPTED_WALLY_BLOB = '1bcb54b547579b1a8ceb21c417090ddf2dfd793d';

let aapt2Path = null;
try {
  aapt2Path = resolveAapt2Path();
} catch {
  aapt2Path = null;
}
const skipReason = aapt2Path ? false : 'Android SDK/aapt2 not available in this environment';

function makeFakeSdk(t, versionsWithAapt2, versionsWithoutAapt2 = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pyjamada-fake-sdk-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const buildToolsDir = path.join(root, 'build-tools');
  for (const version of versionsWithAapt2) {
    const dir = path.join(buildToolsDir, version);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'aapt2'), '#!/bin/sh\nexit 0\n');
  }
  for (const version of versionsWithoutAapt2) {
    fs.mkdirSync(path.join(buildToolsDir, version), { recursive: true });
  }
  return root;
}

test('resolveAapt2Path picks the highest build-tools version that actually contains aapt2', (t) => {
  const root = makeFakeSdk(t, ['30.0.3', '36.0.0', '35.0.0'], ['99.0.0-no-aapt2']);
  const resolved = resolveAapt2Path({ ANDROID_SDK_ROOT: root });
  assert.equal(resolved, path.join(root, 'build-tools', '36.0.0', 'aapt2'));
});

test('resolveAapt2Path sorts build-tools versions numerically, not lexicographically', (t) => {
  const root = makeFakeSdk(t, ['9.0.0', '10.0.0']);
  const resolved = resolveAapt2Path({ ANDROID_SDK_ROOT: root });
  assert.equal(resolved, path.join(root, 'build-tools', '10.0.0', 'aapt2'));
});

test('resolveAapt2Path falls back to ANDROID_HOME when ANDROID_SDK_ROOT is unset', (t) => {
  const root = makeFakeSdk(t, ['34.0.0']);
  const resolved = resolveAapt2Path({ ANDROID_HOME: root });
  assert.equal(resolved, path.join(root, 'build-tools', '34.0.0', 'aapt2'));
});

test('resolveAapt2Path throws a clear, non-installing error when no SDK env var is set', () => {
  assert.throws(() => resolveAapt2Path({}), /ANDROID_SDK_ROOT or ANDROID_HOME/);
});

test('resolveAapt2Path throws when no build-tools version actually contains aapt2', (t) => {
  const root = makeFakeSdk(t, [], ['30.0.3', '36.0.0']);
  assert.throws(() => resolveAapt2Path({ ANDROID_SDK_ROOT: root }), /no aapt2 binary found/);
});

test('resolveAapt2Path throws when the SDK root has no build-tools directory at all', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pyjamada-fake-sdk-empty-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.throws(() => resolveAapt2Path({ ANDROID_SDK_ROOT: root }), /no build-tools directory/);
});

test('every real committed production asset compiles via the real aapt2 binary', { skip: skipReason }, () => {
  const results = auditProductionAssets(REPO_ROOT, aapt2Path);
  assert.equal(results.length, 3);
  for (const result of results) {
    assert.equal(result.ok, true, `${result.path} should compile via aapt2 as resource "${result.resourceName}": ${result.message ?? ''}`);
  }
});

test('the original corrupted Wally atlas blob fails the real aapt2 binary', { skip: skipReason }, () => {
  const corruptedBytes = execFileSync('git', ['-C', REPO_ROOT, 'cat-file', 'blob', CORRUPTED_WALLY_BLOB]);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pyjamada-corrupted-wally-'));
  const tmpFile = path.join(tmpDir, 'wally.png');
  fs.writeFileSync(tmpFile, corruptedBytes);
  try {
    const result = compileWithAapt2(aapt2Path, tmpFile, 'assets_game_wally_wally');
    assert.equal(result.ok, false, 'the historically corrupted Wally blob must fail AAPT2 resource compilation');
    assert.ok(result.message && result.message.length > 0, 'a failure must report aapt2 diagnostic text');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
