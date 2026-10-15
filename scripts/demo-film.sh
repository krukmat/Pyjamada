#!/usr/bin/env bash
# Records a video of the QA bot playing one real run (DEMO) on a connected
# Android device or emulator, plus one still per numbered moment.
# The app must already be installed (npm run android). Output:
#   artifacts/demo-film/<timestamp>/demo-run.mp4 and MOMENT_*.png
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$REPO_ROOT/artifacts/demo-film/$(date +%Y%m%d-%H%M%S)"
SEGMENT_SECONDS=170 # screenrecord stops itself at 180 s, so record in segments

for command_name in adb maestro; do
  command -v "$command_name" >/dev/null 2>&1 || { echo "missing required command: $command_name" >&2; exit 1; }
done
SERIAL="${ANDROID_SERIAL:-$(adb devices | awk 'NR>1 && $2=="device"{print $1; exit}')}"
[[ -n "$SERIAL" ]] || { echo "no Android device or emulator connected" >&2; exit 1; }
mkdir -p "$OUT_DIR"
# Close the app first so the film opens on one cold launch, not a relaunch.
adb -s "$SERIAL" shell am force-stop com.krukmat.pyjamada
adb -s "$SERIAL" shell rm -f '/sdcard/pyjamada-demo-*.mp4'

STOP_FILE="$OUT_DIR/.stop"
(
  segment=0
  while [[ ! -e "$STOP_FILE" ]]; do
    segment=$((segment + 1))
    adb -s "$SERIAL" shell screenrecord --time-limit "$SEGMENT_SECONDS" "/sdcard/pyjamada-demo-$(printf %03d "$segment").mp4" || true
  done
) &
RECORDER=$!

status=0
maestro --device "$SERIAL" test --test-output-dir "$OUT_DIR" "$REPO_ROOT/maestro/demo-film.yaml" || status=$?

touch "$STOP_FILE"
adb -s "$SERIAL" shell pkill -INT screenrecord >/dev/null 2>&1 || true
wait "$RECORDER" || true
sleep 1 # let screenrecord finish writing the last file
rm -f "$STOP_FILE"

for segment in $(adb -s "$SERIAL" shell ls '/sdcard/pyjamada-demo-*.mp4' 2>/dev/null | tr -d '\r'); do
  adb -s "$SERIAL" pull "$segment" "$OUT_DIR/" >/dev/null
done
adb -s "$SERIAL" shell rm -f '/sdcard/pyjamada-demo-*.mp4'
find "$OUT_DIR" -mindepth 2 -name 'MOMENT_*.png' -exec mv {} "$OUT_DIR/" \; 2>/dev/null || true

segments=("$OUT_DIR"/pyjamada-demo-*.mp4)
if [[ -e "${segments[0]}" ]]; then
  if command -v ffmpeg >/dev/null 2>&1; then
    printf "file '%s'\n" "${segments[@]}" > "$OUT_DIR/segments.txt"
    ffmpeg -loglevel error -f concat -safe 0 -i "$OUT_DIR/segments.txt" -c copy "$OUT_DIR/demo-run.mp4" \
      && rm -f "${segments[@]}" "$OUT_DIR/segments.txt"
  else
    echo "ffmpeg not found: the video is left in ${#segments[@]} segment(s)." >&2
  fi
fi

echo "DEMO film in $OUT_DIR ($(find "$OUT_DIR" -maxdepth 1 -name 'MOMENT_*.png' | wc -l | tr -d ' ') stills)"
exit "$status"
