export const LOGICAL_SIZE = 128;
export const FLOOR_Y = 104;
export const PLAYER_WIDTH = 8;
export const PLAYER_HEIGHT = 16;
export const PLAYER_GROUND_Y = FLOOR_Y - PLAYER_HEIGHT;
export const MOVE_STEP = 4;

export const ROOM_IDS = ['room-01', 'room-02', 'room-03'] as const;
export type RoomId = (typeof ROOM_IDS)[number];

export function isRoomId(value: unknown): value is RoomId {
  return typeof value === 'string' && (ROOM_IDS as readonly string[]).includes(value);
}

export type Rect = { x: number; y: number; width: number; height: number };

export type RoomDefinition = {
  id: RoomId;
  label: string;
  background: string;
  floor: string;
  platforms: readonly Rect[];
};

export const ROOMS: Record<RoomId, RoomDefinition> = {
  'room-01': {
    id: 'room-01',
    label: 'Bedroom',
    background: '#101020',
    floor: '#57406f',
    platforms: [
      { x: 8, y: 72, width: 32, height: 8 },
      { x: 80, y: 64, width: 40, height: 8 },
    ],
  },
  'room-02': {
    id: 'room-02',
    label: 'Hall',
    background: '#14232b',
    floor: '#41636d',
    platforms: [
      { x: 24, y: 68, width: 24, height: 8 },
      { x: 76, y: 76, width: 32, height: 8 },
    ],
  },
  'room-03': {
    id: 'room-03',
    label: 'Landing',
    background: '#25172a',
    floor: '#74405b',
    platforms: [
      { x: 16, y: 72, width: 40, height: 8 },
      { x: 88, y: 60, width: 24, height: 8 },
    ],
  },
};
