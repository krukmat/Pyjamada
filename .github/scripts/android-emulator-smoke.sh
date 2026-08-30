#!/usr/bin/env bash
set -euo pipefail

ANDROID_PACKAGE="${ANDROID_PACKAGE:-com.krukmat.pyjamada}"
ARTIFACT_DIR="${GITHUB_WORKSPACE:-$(pwd)}/artifacts/android-smoke"
mkdir -p "$ARTIFACT_DIR"

cleanup() {
  if [[ -n "${METRO_PID:-}" ]]; then
    kill "$METRO_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "Building Android debug APK"
./android/gradlew -p android assembleDebug --no-daemon

echo "Starting Metro"
npx expo start --localhost > "$ARTIFACT_DIR/metro.log" 2>&1 &
METRO_PID=$!

PACKAGER_READY=0
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8081/status 2>/dev/null | grep -q running; then
    PACKAGER_READY=1
    break
  fi
  sleep 2
done

if [[ "$PACKAGER_READY" -ne 1 ]]; then
  echo "Metro did not become ready"
  cat "$ARTIFACT_DIR/metro.log" || true
  exit 1
fi

echo "Installing app on emulator"
adb reverse tcp:8081 tcp:8081
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am force-stop "$ANDROID_PACKAGE"
adb logcat -c || true
adb shell monkey -p "$ANDROID_PACKAGE" -c android.intent.category.LAUNCHER 1

sleep 20

adb shell dumpsys window windows | grep -E 'mCurrentFocus|mFocusedApp' > "$ARTIFACT_DIR/emulator-focus.txt" || true
adb shell dumpsys activity activities | grep -E 'mResumedActivity|ResumedActivity' >> "$ARTIFACT_DIR/emulator-focus.txt" || true

if ! grep -q "$ANDROID_PACKAGE" "$ARTIFACT_DIR/emulator-focus.txt"; then
  echo "Pyjamada is not the foreground activity"
  adb logcat -d -t 800 > "$ARTIFACT_DIR/android-logcat.txt" || true
  cat "$ARTIFACT_DIR/emulator-focus.txt" || true
  cat "$ARTIFACT_DIR/android-logcat.txt" || true
  exit 1
fi

echo "Capturing real emulator screenshot"
adb exec-out screencap -p > "$ARTIFACT_DIR/pyjamada-main-menu.png"
adb shell uiautomator dump /sdcard/pyjamada-window.xml || true
adb pull /sdcard/pyjamada-window.xml "$ARTIFACT_DIR/pyjamada-window.xml" || true
adb logcat -d -t 800 > "$ARTIFACT_DIR/android-logcat.txt" || true
cp android/app/build/outputs/apk/debug/app-debug.apk "$ARTIFACT_DIR/pyjamada-debug.apk"

file "$ARTIFACT_DIR/pyjamada-main-menu.png"
test -s "$ARTIFACT_DIR/pyjamada-main-menu.png"
test -s "$ARTIFACT_DIR/pyjamada-debug.apk"

echo "Android emulator smoke test passed"
