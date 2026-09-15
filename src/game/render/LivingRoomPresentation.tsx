import React from 'react';
import { Circle, Line, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import { HauntedPlayerReadability } from './HauntedStagePresentation';

type Px = (value: number) => number;

type Props = {
  hauntedSession?: HauntedSessionState;
  playerX: number;
  playerY: number;
  nowMs: number;
  px: Px;
};

export function LivingRoomPresentation({ hauntedSession, playerX, playerY, nowMs, px }: Props) {
  const screenPulse = Math.floor(nowMs / 520) % 2;

  return (
    <>
      <Rect x={px(-20)} y={0} width={px(168)} height={px(128)} color="#121726" />
      <Rect x={px(-20)} y={px(18)} width={px(168)} height={px(68)} color="#263143" />
      <Rect x={px(-20)} y={px(20)} width={px(168)} height={px(2)} color="#39475b" />
      <Rect x={px(-20)} y={px(86)} width={px(168)} height={px(42)} color="#211f2f" />
      {[0, 18, 36, 54, 72, 90, 108].map((x) => (
        <Rect key={`living-floor-${x}`} x={px(x)} y={px(101)} width={px(1)} height={px(27)} color="rgba(7,10,18,0.26)" />
      ))}
      <Rect x={px(-20)} y={px(101)} width={px(168)} height={px(2)} color="#0d1220" />

      <RoundedRect x={px(3)} y={px(44)} width={px(23)} height={px(59)} r={px(2)} color="#3d4657" />
      <Rect x={px(7)} y={px(49)} width={px(15)} height={px(52)} color="#1c2533" />
      <Rect x={px(9)} y={px(54)} width={px(11)} height={px(17)} color="rgba(88,104,125,0.19)" />
      <Circle cx={px(20)} cy={px(77)} r={px(1.1)} color="#f1d75c" />

      <RoundedRect x={px(34)} y={px(73)} width={px(43)} height={px(27)} r={px(4)} color="#172333" />
      <RoundedRect x={px(37)} y={px(68)} width={px(37)} height={px(23)} r={px(4)} color="#344a58" />
      <Rect x={px(42)} y={px(72)} width={px(12)} height={px(16)} color="#405c69" />
      <Rect x={px(58)} y={px(72)} width={px(12)} height={px(16)} color="#2e4352" />
      <Rect x={px(39)} y={px(98)} width={px(5)} height={px(5)} color="#111923" />
      <Rect x={px(68)} y={px(98)} width={px(5)} height={px(5)} color="#111923" />

      <Rect x={px(79)} y={px(84)} width={px(13)} height={px(3)} color="#483b36" />
      <Rect x={px(81)} y={px(87)} width={px(2)} height={px(15)} color="#332a29" />
      <Rect x={px(88)} y={px(87)} width={px(2)} height={px(15)} color="#332a29" />
      <Circle cx={px(85.5)} cy={px(80)} r={px(4)} color="rgba(248,218,118,0.12)" />
      <Line p1={vec(px(85.5), px(84))} p2={vec(px(85.5), px(98))} color="#7d6850" strokeWidth={px(1)} />

      <RoundedRect x={px(96)} y={px(48)} width={px(27)} height={px(24)} r={px(2)} color="#0a0f18" />
      <Rect x={px(99)} y={px(51)} width={px(21)} height={px(17)} color={screenPulse === 0 ? "#152331" : "#172836"} />
      <Rect x={px(101)} y={px(53)} width={px(17)} height={px(1)} color="rgba(121,232,255,0.07)" />
      <Rect x={px(101)} y={px(58)} width={px(17)} height={px(1)} color="rgba(121,232,255,0.05)" />
      <Rect x={px(101)} y={px(63)} width={px(17)} height={px(1)} color="rgba(121,232,255,0.04)" />
      <Rect x={px(108)} y={px(72)} width={px(3)} height={px(7)} color="#111722" />
      <Rect x={px(101)} y={px(79)} width={px(17)} height={px(4)} color="#1b202a" />
      <Rect x={px(98)} y={px(83)} width={px(23)} height={px(20)} color="#272633" />
      <Rect x={px(101)} y={px(86)} width={px(17)} height={px(5)} color="#32313e" />

      <RoundedRect x={px(49)} y={px(34)} width={px(13)} height={px(17)} r={px(1)} color="#161b27" />
      <Rect x={px(51)} y={px(36)} width={px(9)} height={px(13)} color="#465263" />
      <RoundedRect x={px(70)} y={px(31)} width={px(12)} height={px(18)} r={px(1)} color="#161b27" />
      <Rect x={px(72)} y={px(33)} width={px(8)} height={px(14)} color="#5a4655" />

      {hauntedSession && <HauntedPlayerReadability x={px(playerX)} y={px(playerY)} px={px} />}
    </>
  );
}
