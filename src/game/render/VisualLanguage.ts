import { BEDROOM_KEY_ID, type GameState } from '../core/GameState';
import { MOVE_STEP, type RoomId } from '../core/World';

export const RETRO_PALETTE = {
  void: '#050509',
  ink: '#f7f0cf',
  cyan: '#48d6d2',
  blue: '#4262c7',
  magenta: '#d45aaa',
  purple: '#774e9e',
  yellow: '#f1d75c',
  red: '#d94d5d',
  green: '#55b66a',
  orange: '#df8847',
  shadow: '#21172d',
} as const;

export type RoomVisualPalette = {
  background: string;
  wall: string;
  floor: string;
  primary: string;
  secondary: string;
  accent: string;
};

export const ROOM_VISUALS: Record<RoomId, RoomVisualPalette> = {
  'room-01': {
    background: RETRO_PALETTE.void,
    wall: '#171326',
    floor: RETRO_PALETTE.blue,
    primary: RETRO_PALETTE.cyan,
    secondary: RETRO_PALETTE.magenta,
    accent: RETRO_PALETTE.yellow,
  },
  'room-02': {
    background: RETRO_PALETTE.void,
    wall: '#10201f',
    floor: '#28756f',
    primary: RETRO_PALETTE.green,
    secondary: RETRO_PALETTE.cyan,
    accent: RETRO_PALETTE.yellow,
  },
  'room-03': {
    background: RETRO_PALETTE.void,
    wall: '#241326',
    floor: '#74304f',
    primary: RETRO_PALETTE.magenta,
    secondary: RETRO_PALETTE.red,
    accent: RETRO_PALETTE.cyan,
  },
};

export function getWalkFrame(state: GameState): 0 | 1 {
  return Math.floor(state.player.x / MOVE_STEP) % 2 === 0 ? 0 : 1;
}

export function hasBedroomKey(state: GameState): boolean {
  return state.inventory.includes(BEDROOM_KEY_ID);
}

export function getPocketLabel(state: GameState): 'KEY' | 'EMPTY' {
  return hasBedroomKey(state) ? 'KEY' : 'EMPTY';
}
