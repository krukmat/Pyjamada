#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ID="com.krukmat.pyjamada"
APK_PATH="$REPO_ROOT/android/app/build/outputs/apk/release/app-release.apk"
FLOW_PATH="$REPO_ROOT/maestro/screenshots.yaml"
SCREENSHOTS_DIR="$REPO_ROOT/artifacts/android-screenshots"
MAESTRO_REPORT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/pyjamada-maestro.XXXXXX")"

cleanup() {
  find "$MAESTRO_REPORT_DIR" -type f -name '*.png' -exec cp {} "$SCREENSHOTS_DIR/" \; 2>/dev/null || true
  rm -rf "$MAESTRO_REPORT_DIR"
}
trap cleanup EXIT

for command_name in adb maestro node npm; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "Missing required command: $command_name" >&2
    exit 1
  }
done

EMULATOR_SERIAL="$(adb devices | awk '/emulator-[0-9]+[[:space:]]+device/{print $1; exit}')"
if [[ -z "$EMULATOR_SERIAL" ]]; then
  echo "No running Android emulator found." >&2
  exit 1
fi

mkdir -p "$SCREENSHOTS_DIR"

if [[ ! -d "$REPO_ROOT/node_modules" ]]; then
  (cd "$REPO_ROOT" && npm install)
fi

if [[ ! -d "$REPO_ROOT/android" ]]; then
  (cd "$REPO_ROOT" && npx expo prebuild --platform android --clean)
fi

if [[ -n "${PYJAMADA_JAVA_HOME:-}" ]]; then
  export JAVA_HOME="$PYJAMADA_JAVA_HOME"
elif [[ -x /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home/bin/java ]]; then
  export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
fi

if [[ -z "${JAVA_HOME:-}" || ! -x "$JAVA_HOME/bin/java" ]]; then
  echo "Java 17 was not found. Set PYJAMADA_JAVA_HOME to its installation directory." >&2
  exit 1
fi

"$JAVA_HOME/bin/java" -version 2>&1 | head -n 1

ANDROID_ABI="$(adb -s "$EMULATOR_SERIAL" shell getprop ro.product.cpu.abi | tr -d '\r')"
if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  echo "Building release APK for $ANDROID_ABI..."
  (
    cd "$REPO_ROOT"
    NODE_ENV=production ./android/gradlew -p android :app:assembleRelease \
      "-PreactNativeArchitectures=$ANDROID_ABI" --no-daemon
  )
fi

test -s "$APK_PATH"
adb -s "$EMULATOR_SERIAL" install -r "$APK_PATH"
adb -s "$EMULATOR_SERIAL" shell input keyevent 82 >/dev/null 2>&1 || true

echo "Capturing Android screens with Maestro..."
maestro --device "$EMULATOR_SERIAL" test \
  --test-output-dir "$MAESTRO_REPORT_DIR" \
  "$FLOW_PATH"

find "$MAESTRO_REPORT_DIR" -type f -name '*.png' -exec cp {} "$SCREENSHOTS_DIR/" \;
PNG_COUNT="$(find "$SCREENSHOTS_DIR" -maxdepth 1 -type f -name '*.png' | wc -l | tr -d ' ')"
if [[ "$PNG_COUNT" -lt 7 ]]; then
  echo "Expected at least 7 screenshots, found $PNG_COUNT." >&2
  exit 1
fi

echo "$PNG_COUNT Android screenshots available in $SCREENSHOTS_DIR"
