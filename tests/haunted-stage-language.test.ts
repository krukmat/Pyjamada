import { strict as assert } from 'node:assert';
import {
  HAUNTED_LAYER_ORDER,
  HAUNTED_STAGE_RULES,
  HAUNTED_STAGE_TOKENS,
  HAUNTED_VISUAL_PRIORITY,
  hauntedEdgeAlpha,
  hauntedPressureLevel,
  hauntedWashAlpha,
  validateHauntedStageLanguage,
} from '../src/game/render/HauntedStageLanguage';

assert.deepEqual(validateHauntedStageLanguage(), [], 'Haunted stage language must satisfy its shared readability contract');

assert.equal(hauntedPressureLevel(0), 'calm', 'zero enemies keeps the calm atmosphere budget');
assert.equal(hauntedPressureLevel(1), 'pressure', 'one enemy activates the pressure atmosphere budget');
assert.equal(hauntedPressureLevel(3), 'pressure', 'additional enemies never create an unbounded atmosphere tier');
assert.equal(hauntedWashAlpha(0), HAUNTED_STAGE_TOKENS.atmosphere.washAlphaCalm, 'calm wash uses the declared token');
assert.equal(hauntedWashAlpha(2), HAUNTED_STAGE_TOKENS.atmosphere.washAlphaPressure, 'enemy pressure uses the declared wash token');
assert.equal(hauntedEdgeAlpha(2), HAUNTED_STAGE_TOKENS.atmosphere.edgeAlphaPressure, 'enemy pressure uses the declared edge token');
assert.ok(hauntedWashAlpha(2) <= HAUNTED_STAGE_RULES.maxAtmosphereAlpha, 'pressure wash cannot overpower actors');

const layerIndex = (name: (typeof HAUNTED_LAYER_ORDER)[number]) => HAUNTED_LAYER_ORDER.indexOf(name);
assert.ok(layerIndex('enemies') < layerIndex('player'), 'Wally keeps hero priority over enemies');
assert.ok(layerIndex('player') < layerIndex('projectiles'), 'player attacks remain readable over both actors');
assert.ok(layerIndex('projectiles') < layerIndex('combat-feedback'), 'impact feedback is the brightest transient layer');

assert.ok(HAUNTED_VISUAL_PRIORITY.environment < HAUNTED_VISUAL_PRIORITY.interactiveFocus, 'interactables outrank the environment');
assert.ok(HAUNTED_VISUAL_PRIORITY.interactiveFocus < HAUNTED_VISUAL_PRIORITY.enemies, 'active threats outrank static interaction focus');
assert.ok(HAUNTED_VISUAL_PRIORITY.enemies < HAUNTED_VISUAL_PRIORITY.player, 'the player remains the primary persistent actor');
assert.ok(HAUNTED_VISUAL_PRIORITY.player < HAUNTED_VISUAL_PRIORITY.projectile, 'attacks receive transient priority above the player');
assert.ok(HAUNTED_VISUAL_PRIORITY.projectile < HAUNTED_VISUAL_PRIORITY.combatFeedback, 'damage feedback receives the highest transient priority');

assert.notEqual(HAUNTED_STAGE_TOKENS.projectile.core, HAUNTED_STAGE_TOKENS.projectile.edge, 'Dream Spark core and edge stay visually separable');
assert.notEqual(HAUNTED_STAGE_TOKENS.player.groundShadow, HAUNTED_STAGE_TOKENS.player.groundAccent, 'player grounding keeps a dark base plus cold accent');

console.log('haunted stage language tests passed');
