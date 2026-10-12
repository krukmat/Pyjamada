import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildWallyAtlas } from './generate-wally-atlas.mjs';

test('committed Wally atlas matches the generator output', () => {
  const committed = readFileSync(new URL('../assets/game/wally/haunted-wally.png', import.meta.url));
  assert.ok(buildWallyAtlas().equals(committed), 'run `npm run sprites:wally` after changing the generator');
});
