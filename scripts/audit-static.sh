#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "AUDIT STATIC CHECK FAILED: $1" >&2
  exit 1
}

echo "[audit] checking shell script syntax"
bash -n scripts/audit-static.sh
bash -n scripts/android-screenshots.sh

echo "[audit] checking gameplay -> presentation/render/react-native/app-screen dependency boundary"
GAMEPLAY_BOUNDARY_PATTERN="from ['\"]\.\./presentation|from ['\"][^'\"]*presentation|from ['\"]\.\./render|from ['\"][^'\"]*render|from ['\"]react['\"]|from ['\"]react-native|from ['\"]@shopify/react-native-skia|from ['\"][^'\"]*/app/|from ['\"]\.\./\.\./App['\"]|from ['\"]\.\./App['\"]"
if grep -R -n -E "$GAMEPLAY_BOUNDARY_PATTERN" src/game/systemic --include='*.ts' --include='*.tsx'; then
  fail "gameplay modules must not import presentation, renderer, React/React Native/Skia, or app-screen modules"
fi

echo "[audit] verifying the dependency boundary rejects a fixture import from each forbidden layer"
cleanup_boundary_fixtures() { rm -f src/game/systemic/__boundary_fixture_*.ts; }
trap cleanup_boundary_fixtures EXIT
cleanup_boundary_fixtures

printf "import type { VisualEvent } from '../presentation/VisualEvent';\nexport const _fixture: VisualEvent | undefined = undefined;\n" > src/game/systemic/__boundary_fixture_presentation.ts
printf "import type { Props } from '../render/GameCanvas';\nexport type _Fixture = Props;\n" > src/game/systemic/__boundary_fixture_render.ts
printf "import React from 'react';\nexport const _fixture = React;\n" > src/game/systemic/__boundary_fixture_react.ts
printf "import { GameScreen } from '../../app/GameScreen';\nexport const _fixture = GameScreen;\n" > src/game/systemic/__boundary_fixture_app.ts

for fixture in presentation render react app; do
  if ! grep -n -E "$GAMEPLAY_BOUNDARY_PATTERN" "src/game/systemic/__boundary_fixture_${fixture}.ts" > /dev/null; then
    fail "boundary self-test: a $fixture import fixture was not rejected by the dependency boundary check"
  fi
done

cleanup_boundary_fixtures
trap - EXIT

echo "[audit] checking legacy renderer removal"
if grep -R -n -E "RETRO_PALETTE|PixelArtKit|PixelBlocks|KeySprite" src --include='*.ts' --include='*.tsx'; then
  fail "legacy visual compatibility code remains in src/"
fi

echo "[audit] checking screenshot audit contract"
node scripts/validate-screenshot-contract.mjs || fail "screenshot flow and runner expectations disagree (see above)"

echo "[audit] checking presentation policy and incident log"
test -f docs/PRESENTATION_POLICY.md || fail "presentation policy is missing"
test -f docs/VISUAL_REFACTOR_INCIDENTS.md || fail "incident log is missing"
test -f docs/AUDIT_READINESS.md || fail "audit readiness handoff is missing"
test -f docs/AUDIT_REVIEW_GUIDE.md || fail "audit review guide is missing"

echo "[audit] static architecture checks passed"
