#!/usr/bin/env node
// A-05: scripts/audit-assets.mjs (A-04) proves each committed PNG is a
// structurally valid, manifest-consistent PNG using a hand-rolled decoder.
// That is a different claim from "Android's own resource compiler accepts
// this exact file" — FINDING-001's corrupted Wally atlas blob is the
// concrete case where packaging-specific rejection was the actual risk this
// plan exists to close, and a future asset could in principle satisfy A-04
// while still tripping an AAPT2-specific rejection A-04's decoder does not
// model. This gate defers entirely to the real `aapt2` binary instead of
// reimplementing any part of its judgment, and stages each PNG under the
// exact resource name Metro's own Android asset pipeline generates for it
// (see `android/app/build/generated/res/react/release/drawable-mdpi/`), so a
// pass here reflects the real packaging path, not an arbitrary stand-in name.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Plain lexicographic sort misorders numeric version components once a
// build-tools major version reaches two digits after a one-digit one (e.g.
// "9.0.0" vs "10.0.0"); compare each dot-separated part numerically instead.
export function compareBuildToolsVersions(a, b) {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  const length = Math.max(partsA.length, partsB.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (partsA[index] || 0) - (partsB[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function resolveAapt2Path(env = process.env) {
  const sdkRoot = env.ANDROID_SDK_ROOT || env.ANDROID_HOME;
  if (!sdkRoot) {
    throw new Error('ANDROID_SDK_ROOT or ANDROID_HOME must be set to locate aapt2; this script does not install the Android SDK.');
  }
  const buildToolsDir = path.join(sdkRoot, 'build-tools');
  let versions;
  try {
    versions = fs.readdirSync(buildToolsDir);
  } catch (error) {
    throw new Error(`no build-tools directory at ${buildToolsDir}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const withAapt2 = versions
    .filter((version) => fs.existsSync(path.join(buildToolsDir, version, 'aapt2')))
    .sort(compareBuildToolsVersions);
  const latest = withAapt2[withAapt2.length - 1];
  if (!latest) {
    throw new Error(`no aapt2 binary found under any version in ${buildToolsDir}; this script does not install build-tools.`);
  }
  return path.join(buildToolsDir, latest, 'aapt2');
}

export function compileWithAapt2(aapt2Path, sourcePngPath, resourceName) {
  const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pyjamada-aapt2-'));
  try {
    const resDir = path.join(stagingRoot, 'res', 'drawable');
    fs.mkdirSync(resDir, { recursive: true });
    const stagedPngPath = path.join(resDir, `${resourceName}.png`);
    fs.copyFileSync(sourcePngPath, stagedPngPath);
    const outDir = path.join(stagingRoot, 'compiled');
    fs.mkdirSync(outDir, { recursive: true });
    execFileSync(aapt2Path, ['compile', stagedPngPath, '-o', outDir], { stdio: 'pipe' });
    return { ok: true };
  } catch (error) {
    const stderrText = error && error.stderr ? error.stderr.toString('utf8').trim() : '';
    if (stderrText) {
      return { ok: false, message: stderrText };
    }
    // A sufficiently malformed PNG can crash aapt2 outright (observed: SIGBUS,
    // no stdout/stderr at all) rather than print a normal rejection message —
    // report the signal/exit code so this reads as a crash, not a silent no-op.
    if (error && error.signal) {
      return { ok: false, message: `aapt2 terminated by signal ${error.signal} with no diagnostic output (likely crashed on this input)` };
    }
    const status = error && typeof error.status === 'number' ? error.status : undefined;
    const message = status !== undefined
      ? `aapt2 exited with status ${status} and no diagnostic output`
      : (error instanceof Error ? error.message : String(error));
    return { ok: false, message };
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}

// Resource names Metro's Android asset pipeline actually generates for each
// committed source path (flattened relative path, hyphens stripped) — not
// arbitrary stand-ins. Verified against
// android/app/build/generated/res/react/release/drawable-mdpi/*.png.
export const PRODUCTION_ASSETS = [
  { path: 'assets/game/wally/wally.png', resourceName: 'assets_game_wally_wally' },
  { path: 'assets/game/objects/bedroom-objects.png', resourceName: 'assets_game_objects_bedroomobjects' },
  { path: 'assets/game/fx/domestic-fx.png', resourceName: 'assets_game_fx_domesticfx' },
];

export function auditProductionAssets(repoRoot, aapt2Path, assets = PRODUCTION_ASSETS) {
  const results = [];
  for (const asset of assets) {
    const fullPath = path.join(repoRoot, asset.path);
    if (!fs.existsSync(fullPath)) {
      results.push({ path: asset.path, ok: false, message: 'file not found' });
      continue;
    }
    const result = compileWithAapt2(aapt2Path, fullPath, asset.resourceName);
    results.push({ path: asset.path, resourceName: asset.resourceName, ...result });
  }
  return results;
}

function main() {
  const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

  let aapt2Path;
  try {
    aapt2Path = resolveAapt2Path();
  } catch (error) {
    console.error(`[android-assets] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
    return;
  }
  console.log(`[android-assets] using aapt2 at ${aapt2Path}`);

  const results = auditProductionAssets(repoRoot, aapt2Path);
  let failures = 0;
  for (const result of results) {
    if (!result.ok) {
      console.error(`[${result.path}] aapt2 rejected this file as Android drawable resource "${result.resourceName ?? '?'}":`);
      console.error(String(result.message).split('\n').map((line) => `    ${line}`).join('\n'));
      failures += 1;
      continue;
    }
    console.log(`[android-assets] OK ${result.path} compiles as Android resource "${result.resourceName}"`);
  }

  if (failures > 0) {
    console.error(`[android-assets] ${failures} asset(s) failed AAPT2 resource compilation`);
    process.exit(1);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}
