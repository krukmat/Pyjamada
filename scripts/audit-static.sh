#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "AUDIT STATIC CHECK FAILED: $1" >&2
  exit 1
}

echo "[audit] checking shell script syntax"
bash -n scripts/audit-static.sh
bash -n scripts/android-screenshots.sh

echo "[audit] checking gameplay -> presentation dependency boundary"
if grep -R -n -E "from ['\"]\.\./presentation|from ['\"][^'\"]*presentation" src/game/systemic --include='*.ts' --include='*.tsx'; then
  fail "gameplay modules must not import presentation modules"
fi

echo "[audit] checking legacy renderer removal"
if grep -R -n -E "RETRO_PALETTE|PixelArtKit|PixelBlocks|KeySprite" src --include='*.ts' --include='*.tsx'; then
  fail "legacy visual compatibility code remains in src/"
fi

echo "[audit] checking screenshot audit contract"
grep -q "01_main_menu" maestro/screenshots.yaml || fail "screenshot tour is missing menu baseline"
grep -q "09_success" maestro/screenshots.yaml || fail "screenshot tour is missing success state"
grep -q "10_restart" maestro/screenshots.yaml || fail "screenshot tour is missing restart state"
grep -q "11_continue_restore" maestro/screenshots.yaml || fail "screenshot tour is missing continue/restore state"
grep -q "11_continue_restore.png" scripts/android-screenshots.sh || fail "screenshot runner does not expect continue/restore evidence"

EXPECTED_COUNT="$(grep -c '^[[:space:]]*"[0-9][0-9]_.*\.png"$' scripts/android-screenshots.sh)"
[[ "$EXPECTED_COUNT" -eq 11 ]] || fail "screenshot runner must require exactly 11 named evidence files"

echo "[audit] checking presentation policy and incident log"
test -f docs/PRESENTATION_POLICY.md || fail "presentation policy is missing"
test -f docs/VISUAL_REFACTOR_INCIDENTS.md || fail "incident log is missing"
test -f docs/AUDIT_READINESS.md || fail "audit readiness handoff is missing"
test -f docs/AUDIT_REVIEW_GUIDE.md || fail "audit review guide is missing"

echo "[audit] static architecture checks passed"
