import { BEDROOM_KEY_ID, type GameState } from '../core/GameState';
import { MOVE_STEP, type RoomId } from '../core/World';

export const RETRO_PALETTE = {
  void: '#050509',
  panel: '#0c0912',
  panelRaised: '#171326',
  ink: '#f7f0cf',
  cyan: '#48d6d2',
  cyanDark: '#257f82',
  blue: '#4262c7',
  blueDark: '#293a7d',
  magenta: '#d45aaa',
  magentaDark: '#7e356d',
  purple: '#774e9e',
  purpleDark: '#49305f',
  yellow: '#f1d75c',
  yellowDark: '#8e7c34',
  red: '#d94d5d',
  redDark: '#7d303b',
  green: '#55b66a',
  greenDark: '#326f40',
  orange: '#df8847',
  orangeDark: '#844f2c',
  shadow: '#21172d',
  moon: '#d8e7ff',
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
