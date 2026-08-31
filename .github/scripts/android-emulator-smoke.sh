#!/usr/bin/env bash
set -euo pipefail

ANDROID_PACKAGE="${ANDROID_PACKAGE:-com.krukmat.pyjamada}"
ARTIFACT_DIR="${GITHUB_WORKSPACE:-$(pwd)}/artifacts/android-smoke"
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
mkdir -p "$ARTIFACT_DIR"

echo "Building self-contained Android release APK for x86_64 emulator"
NODE_ENV=production ./android/gradlew -p android :app:assembleRelease -PreactNativeArchitectures=x86_64 --no-daemon

test -s "$APK_PATH"

echo "Installing app on emulator"
adb install -r "$APK_PATH"
adb shell am force-stop "$ANDROID_PACKAGE"
adb logcat -c || true
adb shell monkey -p "$ANDROID_PACKAGE" -c android.intent.category.LAUNCHER 1

sleep 15

adb shell dumpsys window windows | grep -E 'mCurrentFocus|mFocusedApp' > "$ARTIFACT_DIR/emulator-focus.txt" || true
adb shell dumpsys activity activities | grep -E 'mResumedActivity|ResumedActivity' >> "$ARTIFACT_DIR/emulator-focus.txt" || true
adb logcat -d -t 1000 > "$ARTIFACT_DIR/android-logcat.txt" || true

if ! grep -q "$ANDROID_PACKAGE" "$ARTIFACT_DIR/emulator-focus.txt"; then
  echo "Pyjamada is not the foreground activity"
  cat "$ARTIFACT_DIR/emulator-focus.txt" || true
  cat "$ARTIFACT_DIR/android-logcat.txt" || true
  exit 1
fi

echo "Capturing real emulator screenshot"
adb exec-out screencap -p > "$ARTIFACT_DIR/pyjamada-main-menu.png"
adb shell uiautomator dump /sdcard/pyjamada-window.xml || true
adb pull /sdcard/pyjamada-window.xml "$ARTIFACT_DIR/pyjamada-window.xml" || true
cp "$APK_PATH" "$ARTIFACT_DIR/pyjamada-release.apk"

file "$ARTIFACT_DIR/pyjamada-main-menu.png"
test -s "$ARTIFACT_DIR/pyjamada-main-menu.png"
test -s "$ARTIFACT_DIR/pyjamada-release.apk"

echo "Android emulator smoke test passed"
