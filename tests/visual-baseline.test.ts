import { createInitialGameState, BEDROOM_KEY_ID } from '../src/game/core/GameState';
import { MOVE_STEP, ROOM_IDS } from '../src/game/core/World';
import { getPocketLabel, getWalkFrame, RETRO_PALETTE, ROOM_VISUALS } from '../src/game/render/VisualLanguage';
import { equal, test } from './assert';

async function run() {
  await test('V1.1 visual language defines a palette for every V1 room', () => {
    for (const roomId of ROOM_IDS) {
      const palette = ROOM_VISUALS[roomId];
      equal(typeof palette.background, 'string', `${roomId} background`);
      equal(typeof palette.primary, 'string', `${roomId} primary`);
      equal(typeof palette.secondary, 'string', `${roomId} secondary`);
      equal(typeof palette.accent, 'string', `${roomId} accent`);
    }
  });

  await test('restrained polish exposes explicit shade tokens instead of runtime color filters', () => {
    for (const token of ['cyanDark', 'blueDark', 'magentaDark', 'purpleDark', 'yellowDark', 'redDark', 'greenDark', 'orangeDark'] as const) {
      equal(typeof RETRO_PALETTE[token], 'string', `${token} shade token`);
      equal(RETRO_PALETTE[token].startsWith('#'), true, `${token} uses explicit authored color`);
    }
  });

  await test('V1.1 walk pose derives from position without adding gameplay state', () => {
    const initial = createInitialGameState();
    const next = { ...initial, player: { ...initial.player, x: initial.player.x + MOVE_STEP } };
    equal(getWalkFrame(initial) === getWalkFrame(next), false, 'walk frame changes after one movement step');
  });

  await test('V1.1 pocket display is derived from the real inventory', () => {
    const initial = createInitialGameState();
    equal(getPocketLabel(initial), 'EMPTY', 'empty pocket');
    const carryingKey = { ...initial, inventory: [BEDROOM_KEY_ID] };
    equal(getPocketLabel(carryingKey), 'KEY', 'key pocket');
  });
}

void run();
