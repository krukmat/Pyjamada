import { strict as assert } from 'node:assert';
import {
  GHOST_VISUAL_PROFILE,
  GOBLIN_VISUAL_PROFILE,
  HAUNTED_ENEMY_VISUAL_PROFILES,
  SKULL_VISUAL_PROFILE,
  rgba,
  validateEnemyVisualProfile,
} from '../src/game/render/EnemyVisualProfile';

for (const profile of HAUNTED_ENEMY_VISUAL_PROFILES) {
  assert.deepEqual(validateEnemyVisualProfile(profile), [], `${profile.id} visual profile must satisfy the shared enemy presentation contract`);
}

assert.equal(GHOST_VISUAL_PROFILE.telegraphStyle, 'materialize', 'Ghost keeps the proven materialization language');
assert.equal(GOBLIN_VISUAL_PROFILE.telegraphStyle, 'ground-spawn', 'Goblin reserves a grounded spawn language distinct from Ghost');
assert.equal(SKULL_VISUAL_PROFILE.telegraphStyle, 'bone-burst', 'Skull reserves a bone-burst language distinct from Ghost/Goblin');

assert.equal(new Set(HAUNTED_ENEMY_VISUAL_PROFILES.map((profile) => profile.telegraphStyle)).size, 3, 'initial enemy roster uses distinct telegraph silhouettes');
assert.equal(new Set(HAUNTED_ENEMY_VISUAL_PROFILES.map((profile) => profile.accentRgb)).size, 3, 'initial enemy roster uses distinct accent palettes');

assert.equal(rgba('1,2,3', 0.5), 'rgba(1,2,3,0.5)', 'rgba preserves valid alpha');
assert.equal(rgba('1,2,3', 2), 'rgba(1,2,3,1)', 'rgba clamps high alpha');
assert.equal(rgba('1,2,3', -1), 'rgba(1,2,3,0)', 'rgba clamps low alpha');

console.log('enemy presentation profile tests passed');
