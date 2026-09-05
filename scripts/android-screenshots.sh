#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK_PATH="$REPO_ROOT/android/app/build/outputs/apk/release/app-release.apk"
FLOW_PATH="$REPO_ROOT/maestro/screenshots.yaml"
SCREENSHOTS_DIR="$REPO_ROOT/artifacts/android-screenshots"
FAILED_DIR="$REPO_ROOT/artifacts/android-screenshots-failed"
STAGING_DIR="$(mktemp -d "${TMPDIR:-/tmp}/pyjamada-screenshots-staging.XXXXXX")"
MAESTRO_REPORT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/pyjamada-maestro.XXXXXX")"
# T-05 follow-up: Gradle's ExecOperations does not forward EXPO_PUBLIC_* shell
# exports to the Metro/export:embed subprocess it spawns (confirmed by probing
# System.getenv() inside the Gradle JVM, which does see the var, versus the
# compiled bundle, which never contains the debug-only string it should gate).
# Expo's own .env.production.local loading happens inside that subprocess by
# reading the file from disk, so it is unaffected by Gradle's exec env gap.
ENV_LOCAL_FILE="$REPO_ROOT/.env.production.local"
ENV_LOCAL_BACKUP="$(mktemp "${TMPDIR:-/tmp}/pyjamada-env-production-local-backup.XXXXXX")"
ENV_LOCAL_HAD_BACKUP=0
EXPECTED_SCREENSHOTS=(
  "01_main_menu.png"
  "02_settings.png"
  "03_run_start_sleepy.png"
  "04_bed_wake.png"
  "05_slippers.png"
  "06_alarm.png"
  "07_startled.png"
  "08_wardrobe_fumble.png"
  "09_success.png"
  "10_restart.png"
  "11_continue_restore.png"
  "12_fail_house_awake.png"
  "13_fail_exhausted.png"
  "14_fail_too_late.png"
)

# T-02: the run is staged in STAGING_DIR/MAESTRO_REPORT_DIR and never touches
# SCREENSHOTS_DIR (the last published evidence) until every check has passed.
# Any failure — a command failing under `set -e`, or an explicit `fail` call —
# archives whatever partial evidence exists into FAILED_DIR instead, so a
# broken run can never silently wipe out the last good evidence set.
PUBLISHED=0

archive_failed_attempt() {
  local reason="$1"
  rm -rf "$FAILED_DIR"
  mkdir -p "$FAILED_DIR"
  find "$STAGING_DIR" "$MAESTRO_REPORT_DIR" -maxdepth 1 -type f -name '*.png' -exec cp {} "$FAILED_DIR/" \; 2>/dev/null || true
  {
    echo "timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "reason: $reason"
  } > "$FAILED_DIR/FAILURE.txt"
  echo "Run failed: $reason" >&2
  echo "Partial evidence (if any) recorded in $FAILED_DIR; last successful evidence in $SCREENSHOTS_DIR is unchanged." >&2
}

fail() {
  archive_failed_attempt "$1"
  exit 1
}

on_error() {
  local exit_code=$? failed_command="${BASH_COMMAND:-unknown command}"
  if [[ "$PUBLISHED" -ne 1 ]]; then
    archive_failed_attempt "command failed (exit $exit_code): $failed_command"
  fi
}
trap on_error ERR

cleanup() {
  rm -rf "$MAESTRO_REPORT_DIR" "$STAGING_DIR"
  if [[ "$ENV_LOCAL_HAD_BACKUP" -eq 1 ]]; then
    mv -f "$ENV_LOCAL_BACKUP" "$ENV_LOCAL_FILE"
  else
    rm -f "$ENV_LOCAL_FILE"
  fi
  rm -f "$ENV_LOCAL_BACKUP"
}
trap cleanup EXIT

for command_name in adb maestro node npm; do
  command -v "$command_name" >/dev/null 2>&1 || fail "missing required command: $command_name"
done

EMULATOR_SERIAL="$(adb devices | awk '/emulator-[0-9]+[[:space:]]+device/{print $1; exit}')"
if [[ -z "$EMULATOR_SERIAL" ]]; then
  fail "no running Android emulator found"
fi

if [[ ! -d "$REPO_ROOT/node_modules" ]]; then
  (cd "$REPO_ROOT" && npm install) || fail "npm install failed"
fi

if [[ ! -d "$REPO_ROOT/android" ]]; then
  (cd "$REPO_ROOT" && npx expo prebuild --platform android --clean) || fail "expo prebuild failed"
fi

if [[ -n "${PYJAMADA_JAVA_HOME:-}" ]]; then
  export JAVA_HOME="$PYJAMADA_JAVA_HOME"
elif [[ -x /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home/bin/java ]]; then
  export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
fi

if [[ -z "${JAVA_HOME:-}" || ! -x "$JAVA_HOME/bin/java" ]]; then
  fail "Java 17 was not found; set PYJAMADA_JAVA_HOME to its installation directory"
fi

"$JAVA_HOME/bin/java" -version 2>&1 | head -n 1

ANDROID_ABI="$(adb -s "$EMULATOR_SERIAL" shell getprop ro.product.cpu.abi | tr -d '\r')"
if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  echo "Building release APK for $ANDROID_ABI..."
  if [[ -e "$ENV_LOCAL_FILE" ]]; then
    cp "$ENV_LOCAL_FILE" "$ENV_LOCAL_BACKUP"
    ENV_LOCAL_HAD_BACKUP=1
  fi
  # T-05: enables GameScreen's hidden debug-readiness element for this build
  # only. Gradle's ExecOperations does not forward this process's exported
  # env vars to the Metro/export:embed subprocess it spawns (verified: the
  # Gradle JVM sees the shell export, the subprocess does not), so the value
  # is written to a file Expo's bundler loads from disk instead. An ordinary
  # `npm run android` or release build never creates this file and never
  # renders the hook. See src/app/testHooks.ts.
  echo "EXPO_PUBLIC_PYJAMADA_TEST_HOOKS=1" > "$ENV_LOCAL_FILE"
  (
    cd "$REPO_ROOT"
    NODE_ENV=production ./android/gradlew -p android :app:assembleRelease \
      "-PreactNativeArchitectures=$ANDROID_ABI" --no-daemon
  ) || fail "release build failed for $ANDROID_ABI"
fi

if [[ ! -s "$APK_PATH" ]]; then
  fail "release APK was not produced at $APK_PATH"
fi
adb -s "$EMULATOR_SERIAL" install -r "$APK_PATH"
adb -s "$EMULATOR_SERIAL" shell input keyevent 82 >/dev/null 2>&1 || true

echo "Capturing Android screens with Maestro..."
maestro --device "$EMULATOR_SERIAL" test \
  --test-output-dir "$MAESTRO_REPORT_DIR" \
  "$FLOW_PATH"

find "$MAESTRO_REPORT_DIR" -type f -name '*.png' -exec cp {} "$STAGING_DIR/" \;

for screenshot in "${EXPECTED_SCREENSHOTS[@]}"; do
  if [[ ! -s "$STAGING_DIR/$screenshot" ]]; then
    fail "missing screenshot: $screenshot"
  fi
done

PNG_COUNT="$(find "$STAGING_DIR" -maxdepth 1 -type f -name '*.png' | wc -l | tr -d ' ')"
EXPECTED_COUNT="${#EXPECTED_SCREENSHOTS[@]}"
if [[ "$PNG_COUNT" -ne "$EXPECTED_COUNT" ]]; then
  fail "expected exactly $EXPECTED_COUNT screenshots, found $PNG_COUNT"
fi

# Publish: every check above passed, so it is now safe to replace the last
# published evidence set with this run's staged one.
rm -rf "${SCREENSHOTS_DIR}.previous"
if [[ -d "$SCREENSHOTS_DIR" ]]; then
  mv "$SCREENSHOTS_DIR" "${SCREENSHOTS_DIR}.previous"
fi
mkdir -p "$(dirname "$SCREENSHOTS_DIR")"
mv "$STAGING_DIR" "$SCREENSHOTS_DIR"
rm -rf "${SCREENSHOTS_DIR}.previous" "$FAILED_DIR"
PUBLISHED=1

echo "$PNG_COUNT Android screenshots published to $SCREENSHOTS_DIR"
