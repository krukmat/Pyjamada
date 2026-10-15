import React, { useRef } from 'react';
import { BlendColor, Group, Oval, Paint } from '@shopify/react-native-skia';
import { PLAYER_GROUND_Y } from '../core/World';
import type { RoomBossSnapshot } from '../adventure/RoomBossHazard';
import { PixelSpritePicture } from './PixelSpritePicture';
import { roomBossFrame } from './RoomBossSprites';

const HIT_FLASH_MS = 140;

type Props = {
  boss: RoomBossSnapshot;
  nowMs: number;
  px: (value: number) => number;
};

/** A room boss: floor shadow, animated sprite, faint while rising or telegraphing, white flash on a hit. */
export function RoomBossLayer({ boss, nowMs, px }: Props) {
  // Presentation-only memory of the last hit, to flash the sprite for a moment.
  const lastHit = useRef({ hits: boss.hits, atMs: -Infinity });
  if (boss.hits !== lastHit.current.hits) lastHit.current = { hits: boss.hits, atMs: nowMs };
  const flash = nowMs - lastHit.current.atMs < HIT_FLASH_MS;

  const fast = boss.pose === 'charge' || boss.pose === 'fly' || boss.pose === 'telegraph';
  const sprite = roomBossFrame(boss.config.kind, nowMs, fast);
  const left = boss.x - sprite.width / 2;
  const top = PLAYER_GROUND_Y - boss.lift - sprite.height;
  const blink = Math.floor(nowMs / 90) % 2 === 0;
  const opacity = boss.pose === 'rise' ? (blink ? 0.25 : 0.5) : boss.pose === 'telegraph' ? (blink ? 0.2 : 0.45) : 1;
  // The Roach twitches in place before it charges.
  const twitch = boss.config.kind === 'roach' && boss.pose === 'telegraph' && blink ? 1 : 0;
  const shadowWidth = sprite.width * (boss.lift > 0 ? 0.5 : 0.8);

  return (
    <Group>
      <Oval
        x={px(boss.x - shadowWidth / 2)}
        y={px(PLAYER_GROUND_Y - 1.5)}
        width={px(shadowWidth)}
        height={px(3)}
        color="#000000"
        opacity={0.35 * opacity}
      />
      <Group
        opacity={opacity}
        transform={boss.facing < 0 ? [{ translateX: px(boss.x) * 2 }, { scaleX: -1 }] : undefined}
        layer={flash ? <Paint><BlendColor color="#ffffff" mode="srcIn" /></Paint> : undefined}
      >
        <PixelSpritePicture sprite={sprite} x={left + twitch} y={top} px={px} />
      </Group>
    </Group>
  );
}
