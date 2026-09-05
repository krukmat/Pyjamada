// T-02: forced-failure preservation tests for scripts/android-screenshots.sh.
// The real script needs a device, Maestro and a native Android build, so this
// drives the actual script end-to-end inside a throwaway sandbox with stub
// adb/maestro/java binaries on PATH — proving the staging/publish contract
// (last successful evidence untouched, failed attempt archived separately)
// without any device or native toolchain.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts', 'android-screenshots.sh');

const EXPECTED = [
  '01_main_menu.png', '02_settings.png', '03_run_start_sleepy.png', '04_bed_wake.png',
  '05_slippers.png', '06_alarm.png', '07_startled.png', '08_wardrobe_fumble.png',
  '09_success.png', '10_restart.png', '11_continue_restore.png',
  '12_fail_house_awake.png', '13_fail_exhausted.png', '14_fail_too_late.png',
];

function writeExecutable(filePath, script) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `#!/usr/bin/env bash\n${script}`);
  fs.chmodSync(filePath, 0o755);
}

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pyjamada-screenshots-sandbox-'));
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.copyFileSync(SCRIPT_PATH, path.join(root, 'scripts', 'android-screenshots.sh'));
  fs.chmodSync(path.join(root, 'scripts', 'android-screenshots.sh'), 0o755);
  fs.mkdirSync(path.join(root, 'maestro'));
  fs.writeFileSync(path.join(root, 'maestro', 'screenshots.yaml'), 'appId: com.example\n');
  fs.mkdirSync(path.join(root, 'node_modules'));
  fs.mkdirSync(path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release'), { recursive: true });

  const bin = path.join(root, 'bin');
  writeExecutable(path.join(bin, 'adb'), `
args="$*"
if [[ "$args" == *devices* ]]; then
  echo "List of devices attached"
  printf 'emulator-5554\\tdevice\\n'
  exit 0
fi
if [[ "$args" == *getprop* ]]; then
  echo "x86_64"
  exit 0
fi
exit 0
`);
  writeExecutable(path.join(bin, 'maestro'), `
out_dir=""
prev=""
for arg in "$@"; do
  if [[ "$prev" == "--test-output-dir" ]]; then out_dir="$arg"; fi
  prev="$arg"
done
mkdir -p "$out_dir"
case "\${FAKE_MAESTRO_MODE:-success}" in
  success)
    for name in ${EXPECTED.map((n) => n.replace('.png', '')).join(' ')}; do
      printf 'x' > "$out_dir/\${name}.png"
    done
    exit 0
    ;;
  hard-failure)
    printf 'x' > "$out_dir/01_main_menu.png"
    printf 'x' > "$out_dir/02_settings.png"
    echo "assertion failed: something not visible" >&2
    exit 1
    ;;
  silent-partial)
    printf 'x' > "$out_dir/01_main_menu.png"
    printf 'x' > "$out_dir/02_settings.png"
    printf 'x' > "$out_dir/03_run_start_sleepy.png"
    exit 0
    ;;
esac
`);
  writeExecutable(path.join(bin, 'node'), 'exit 0\n');
  writeExecutable(path.join(bin, 'npm'), 'exit 0\n');
  writeExecutable(path.join(bin, 'gradlew-ok'), 'exit 0\n');
  writeExecutable(path.join(bin, 'gradlew-fail'), 'echo "build broken" >&2\nexit 1\n');

  const javaHome = path.join(root, 'fakejava');
  writeExecutable(path.join(javaHome, 'bin', 'java'), 'echo "fake java version 17" >&2\nexit 0\n');

  return { root, bin, javaHome };
}

function seedPreviousEvidence(root) {
  const dir = path.join(root, 'artifacts', 'android-screenshots');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'MARKER_PREVIOUS_RUN.txt'), 'previous successful run');
  for (const name of EXPECTED) fs.writeFileSync(path.join(dir, name), 'PREVIOUS_GOOD');
  return dir;
}

function runScript(root, bin, javaHome, extraEnv) {
  return execFileSync('bash', [path.join(root, 'scripts', 'android-screenshots.sh')], {
    cwd: root,
    env: { PATH: `${bin}:/usr/bin:/bin`, PYJAMADA_JAVA_HOME: javaHome, HOME: root, ...extraEnv },
    encoding: 'utf8',
  });
}

test('a clean run publishes all expected screenshots and clears any prior failure record', () => {
  const { root, bin, javaHome } = makeSandbox();
  fs.writeFileSync(path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'), 'apk');
  fs.mkdirSync(path.join(root, 'artifacts', 'android-screenshots-failed'), { recursive: true });
  fs.writeFileSync(path.join(root, 'artifacts', 'android-screenshots-failed', 'FAILURE.txt'), 'stale failure from a prior run');

  runScript(root, bin, javaHome, { SKIP_BUILD: '1', FAKE_MAESTRO_MODE: 'success' });

  const publishedDir = path.join(root, 'artifacts', 'android-screenshots');
  for (const name of EXPECTED) {
    assert.ok(fs.existsSync(path.join(publishedDir, name)), `expected ${name} to be published`);
  }
  assert.equal(fs.existsSync(path.join(root, 'artifacts', 'android-screenshots-failed')), false, 'a successful publish must clear any stale failure record');
});

test('a hard Maestro failure preserves the last published evidence and archives the partial attempt separately', () => {
  const { root, bin, javaHome } = makeSandbox();
  fs.writeFileSync(path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'), 'apk');
  seedPreviousEvidence(root);

  assert.throws(() => runScript(root, bin, javaHome, { SKIP_BUILD: '1', FAKE_MAESTRO_MODE: 'hard-failure' }));

  const publishedDir = path.join(root, 'artifacts', 'android-screenshots');
  assert.equal(fs.readFileSync(path.join(publishedDir, 'MARKER_PREVIOUS_RUN.txt'), 'utf8'), 'previous successful run', 'last successful evidence must be untouched');
  for (const name of EXPECTED) {
    assert.equal(fs.readFileSync(path.join(publishedDir, name), 'utf8'), 'PREVIOUS_GOOD', `${name} must not be overwritten by the failed run`);
  }

  const failedDir = path.join(root, 'artifacts', 'android-screenshots-failed');
  const failureNote = fs.readFileSync(path.join(failedDir, 'FAILURE.txt'), 'utf8');
  assert.match(failureNote, /reason:.*command failed/);
  assert.ok(fs.existsSync(path.join(failedDir, '01_main_menu.png')), 'the partial screenshots the failed run did produce should be recorded separately');
  assert.ok(fs.existsSync(path.join(failedDir, '02_settings.png')));
});

test('a build failure preserves the last published evidence and records the failure with no fabricated screenshots', () => {
  const { root, bin, javaHome } = makeSandbox();
  fs.copyFileSync(path.join(bin, 'gradlew-fail'), path.join(root, 'android', 'gradlew'));
  fs.chmodSync(path.join(root, 'android', 'gradlew'), 0o755);
  seedPreviousEvidence(root);

  assert.throws(() => runScript(root, bin, javaHome, { FAKE_MAESTRO_MODE: 'success' }));

  const publishedDir = path.join(root, 'artifacts', 'android-screenshots');
  assert.equal(fs.readFileSync(path.join(publishedDir, 'MARKER_PREVIOUS_RUN.txt'), 'utf8'), 'previous successful run');

  const failedDir = path.join(root, 'artifacts', 'android-screenshots-failed');
  const failureNote = fs.readFileSync(path.join(failedDir, 'FAILURE.txt'), 'utf8');
  assert.match(failureNote, /reason: release build failed/);
  const failedPngs = fs.readdirSync(failedDir).filter((name) => name.endsWith('.png'));
  assert.deepEqual(failedPngs, [], 'a build failure happens before any screenshot is staged, so none should be fabricated');
});

test('an incomplete-but-exit-0 tour is rejected by the explicit completeness check and still preserves prior evidence', () => {
  const { root, bin, javaHome } = makeSandbox();
  fs.writeFileSync(path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'), 'apk');
  seedPreviousEvidence(root);

  assert.throws(() => runScript(root, bin, javaHome, { SKIP_BUILD: '1', FAKE_MAESTRO_MODE: 'silent-partial' }));

  const publishedDir = path.join(root, 'artifacts', 'android-screenshots');
  assert.equal(fs.readFileSync(path.join(publishedDir, 'MARKER_PREVIOUS_RUN.txt'), 'utf8'), 'previous successful run');

  const failedDir = path.join(root, 'artifacts', 'android-screenshots-failed');
  const failureNote = fs.readFileSync(path.join(failedDir, 'FAILURE.txt'), 'utf8');
  assert.match(failureNote, /reason: missing screenshot/);
  assert.ok(fs.existsSync(path.join(failedDir, '03_run_start_sleepy.png')));
  assert.equal(fs.existsSync(path.join(failedDir, '04_bed_wake.png')), false);
});
