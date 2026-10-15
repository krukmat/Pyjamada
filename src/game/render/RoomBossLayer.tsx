import React, { useRef } from 'react';
import { BlendColor, Group, Oval, Paint, Rect } from '@shopify/react-native-skia';
import { PLAYER_GROUND_Y } from '../core/World';
import type { RoomBossSnapshot } from '../adventure/RoomBossHazard';
import { PixelSpritePicture } from './PixelSpritePicture';
import { ROOM_BOSS_SCALE, roomBossFrame } from './RoomBossSprites';
import { ROOM_VIEW_WIDTH, spreadX } from './StageViewport';

const HIT_FLASH_MS = 140;
const HIT_SHAKE_MS = 180;
const DISPEL_MS = 650;

export type RoomBossFx = {
  /** Wounded a moment ago: draw it white. */
  flash: boolean;
  /** Stage offset for the whole scene. */
  shake: { x: number; y: number };
  /** The boss just dispelled, with how far its fade has gone (0..1). */
  dispelling?: { boss: RoomBossSnapshot; progress: number };
};

/**
 * Presentation-only memory of the boss between frames: when it was last
 * wounded and when it was dispelled. Derived from snapshots, never stored.
 */
export function useRoomBossFx(
  boss: RoomBossSnapshot | undefined,
  isDispelledHere: (room: RoomBossSnapshot['config']['room']) => boolean,
  nowMs: number,
): RoomBossFx {
  const memory = useRef<{ last?: RoomBossSnapshot; hitAtMs: number; gone?: RoomBossSnapshot; goneAtMs: number }>({
    hitAtMs: -Infinity,
    goneAtMs: -Infinity,
  });
  const m = memory.current;
  if (boss) {
    if (m.last?.config.room === boss.config.room && boss.hits > m.last.hits) m.hitAtMs = nowMs;
    m.last = boss;
  } else if (m.last) {
    if (isDispelledHere(m.last.config.room)) {
      m.gone = m.last;
      m.goneAtMs = nowMs;
    }
    m.last = undefined;
  }
  const sinceHit = nowMs - m.hitAtMs;
  const sinceGone = nowMs - m.goneAtMs;
  const flip = Math.floor(nowMs / 35) % 2 === 0 ? 1 : -1;
  const magnitude = sinceGone < DISPEL_MS / 2 ? 3 : sinceHit < HIT_SHAKE_MS ? 1.5 : 0;
  return {
    flash: sinceHit < HIT_FLASH_MS,
    shake: { x: flip * magnitude, y: -flip * magnitude * 0.5 },
    dispelling: m.gone && sinceGone < DISPEL_MS ? { boss: m.gone, progress: sinceGone / DISPEL_MS } : undefined,
  };
}

type Props = {
  boss: RoomBossSnapshot;
  nowMs: number;
  px: (value: number) => number;
  flash?: boolean;
  /** 0..1 while the boss bursts into dust after its last wound. */
  dispelProgress?: number;
};

/**
 * A room boss: floor shadow, animated sprite (faint while rising or
 * telegraphing, ringed by a shield while it shows its attack), a white flash
 * when wounded and a health bar across the top of the room.
 */
export function RoomBossLayer({ boss, nowMs, px, flash = false, dispelProgress }: Props) {
  const dispelling = dispelProgress !== undefined;
  const fast = boss.pose === 'charge' || boss.pose === 'fly' || boss.pose === 'telegraph';
  const sprite = roomBossFrame(boss.config.kind, nowMs, fast);
  const width = sprite.width * ROOM_BOSS_SCALE;
  const height = sprite.height * ROOM_BOSS_SCALE;
  const x = spreadX(boss.x);
  const left = x - width / 2;
  const top = PLAYER_GROUND_Y - boss.lift - height;
  const blink = Math.floor(nowMs / 90) % 2 === 0;
  const opacity = dispelling
    ? (1 - dispelProgress) * (blink ? 1 : 0.5)
    : boss.pose === 'rise' ? (blink ? 0.25 : 0.5) : boss.pose === 'telegraph' ? (blink ? 0.2 : 0.45) : 1;
  // The Roach twitches in place before it charges.
  const twitch = boss.config.kind === 'roach' && boss.pose === 'telegraph' && blink ? 1 : 0;
  const shadowWidth = width * (boss.lift > 0 ? 0.5 : 0.8);
  // A dispel only blinks white at the start, then fades in its own colours: a
  // full white silhouette read as a blank box on the boxy Wraith.
  const white = flash || (dispelling && dispelProgress < 0.3 && blink);
  const ring = 3 + (blink ? 1 : 0);

  return (
    <Group>
      <Oval
        x={px(x - shadowWidth / 2)}
        y={px(PLAYER_GROUND_Y - 2)}
        width={px(shadowWidth)}
        height={px(4)}
        color="#000000"
        opacity={0.35 * opacity}
      />
      <Group
        opacity={opacity}
        transform={boss.facing < 0 ? [{ translateX: px(x) * 2 }, { scaleX: -1 }] : undefined}
        layer={white ? <Paint><BlendColor color="#ffffff" mode="srcIn" /></Paint> : undefined}
      >
        <PixelSpritePicture sprite={sprite} x={left + twitch} y={top} px={px} scale={ROOM_BOSS_SCALE} />
      </Group>
      {boss.shielded && !dispelling && (
        <Oval
          x={px(left - ring)}
          y={px(top - ring)}
          width={px(width + 2 * ring)}
          height={px(height + 2 * ring)}
          color="#9ff6ff"
          style="stroke"
          strokeWidth={px(1)}
          opacity={blink ? 0.85 : 0.45}
        />
      )}
      {!dispelling && <RoomBossHealthBar boss={boss} px={px} />}
    </Group>
  );
}

const BAR = { y: 4, segmentWidth: 14, gap: 2, height: 4 } as const;

function RoomBossHealthBar({ boss, px }: { boss: RoomBossSnapshot; px: (value: number) => number }) {
  const { hp } = boss.config;
  const total = hp * BAR.segmentWidth + (hp - 1) * BAR.gap;
  const left = (ROOM_VIEW_WIDTH - total) / 2;
  const full = boss.shielded ? '#9ff6ff' : '#ff5277';
  return (
    <Group>
      <Rect x={px(left - 2)} y={px(BAR.y - 2)} width={px(total + 4)} height={px(BAR.height + 4)} color="#0b0a12" opacity={0.85} />
      {Array.from({ length: hp }, (_, index) => (
        <Rect
          key={index}
          x={px(left + index * (BAR.segmentWidth + BAR.gap))}
          y={px(BAR.y)}
          width={px(BAR.segmentWidth)}
          height={px(BAR.height)}
          color={index < hp - boss.hits ? full : '#2a2638'}
        />
      ))}
    </Group>
  );
}
