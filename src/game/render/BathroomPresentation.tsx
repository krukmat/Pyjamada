import React from 'react';
import { Circle, Line, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
import { getRoomState, type AdventureState } from '../adventure/AdventureState';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import { HauntedPlayerReadability } from './HauntedStagePresentation';

type Px = (value: number) => number;

type Props = {
  adventure?: AdventureState;
  hauntedSession?: HauntedSessionState;
  playerX: number;
  playerY: number;
  nowMs: number;
  px: Px;
};

export function BathroomPresentation({ adventure, hauntedSession, playerX, playerY, nowMs, px }: Props) {
  const bathroom = adventure ? getRoomState(adventure, 'bathroom') : undefined;
  const anomalySeen = bathroom?.switches['mirror-anomaly-seen'] === true;
  const lightOff = bathroom?.switches['bathroom-light-off'] === true;
  const routeRevealed = bathroom?.switches['mirror-route-revealed'] === true;
  const pulse = Math.floor(nowMs / 170) % 4;
  const mirrorGlow = lightOff ? 0.22 : anomalySeen ? 0.13 : 0.07;

  return (
    <>
      <Rect x={px(-20)} y={0} width={px(168)} height={px(128)} color="#121823" />
      <Rect x={px(-20)} y={px(18)} width={px(168)} height={px(69)} color="#38424c" />
      <Rect x={px(-20)} y={px(20)} width={px(168)} height={px(2)} color="#58636d" />
      <Rect x={px(-20)} y={px(87)} width={px(168)} height={px(41)} color="#252a31" />
      {[0, 20, 40, 60, 80, 100, 120].map((x) => (
        <Rect key={`bath-floor-${x}`} x={px(x)} y={px(102)} width={px(1)} height={px(26)} color="rgba(8,10,14,0.25)" />
      ))}
      <Rect x={px(-20)} y={px(101)} width={px(168)} height={px(2)} color="#11161d" />

      <RoundedRect x={px(3)} y={px(44)} width={px(23)} height={px(59)} r={px(2)} color="#4a535d" />
      <Rect x={px(7)} y={px(49)} width={px(15)} height={px(52)} color="#222b34" />
      <Circle cx={px(20)} cy={px(77)} r={px(1.1)} color="#f1d75c" />

      <Rect x={px(43)} y={px(72)} width={px(34)} height={px(6)} color="#b8bdba" />
      <RoundedRect x={px(48)} y={px(77)} width={px(24)} height={px(9)} r={px(3)} color="#697780" />
      <Rect x={px(53)} y={px(86)} width={px(14)} height={px(16)} color="#4a555d" />
      <Line p1={vec(px(58), px(69))} p2={vec(px(58), px(73))} color="#aebcc2" strokeWidth={px(1)} />
      <Line p1={vec(px(58), px(69))} p2={vec(px(63), px(69))} color="#aebcc2" strokeWidth={px(1)} />

      <Rect x={px(93)} y={px(54)} width={px(8)} height={px(13)} color="#242b33" />
      <Rect x={px(96)} y={px(57)} width={px(2)} height={px(6)} color={lightOff ? '#59606a' : '#f8da76'} />

      <RoundedRect x={px(53)} y={px(23)} width={px(15)} height={px(3)} r={px(1.5)} color={lightOff ? '#53585d' : '#ddd8c4'} />
      {!lightOff && <Circle cx={px(60.5)} cy={px(31)} r={px(18)} color="rgba(248,218,118,0.055)" />}

      <Line p1={vec(px(26), px(61))} p2={vec(px(47), px(61))} color="rgba(121,232,255,0.62)" strokeWidth={px(0.9)} />
      <Circle cx={px(30 + pulse * 5)} cy={px(61)} r={px(1)} color="rgba(121,232,255,0.82)" />
      <Line p1={vec(px(47), px(61))} p2={vec(px(47), px(69))} color="rgba(121,232,255,0.32)" strokeWidth={px(0.7)} />
      <Circle cx={px(47)} cy={px(61)} r={px(4)} color="rgba(91,238,255,0.05)" />

      <RoundedRect x={px(105)} y={px(42)} width={px(17)} height={px(60)} r={px(2)} color="#303841" />
      <Rect x={px(109)} y={px(47)} width={px(9)} height={px(50)} color="#252d35" />

      {lightOff && <Rect x={px(-20)} y={0} width={px(168)} height={px(128)} color="rgba(4,7,12,0.48)" />}

      <Circle cx={px(65)} cy={px(49)} r={px(24)} color={`rgba(91,238,255,${mirrorGlow})`} />
      <RoundedRect x={px(48)} y={px(29)} width={px(34)} height={px(39)} r={px(2)} color="#17202a" />
      <Rect x={px(51)} y={px(32)} width={px(28)} height={px(33)} color={lightOff ? '#244857' : '#405665'} />
      <Rect x={px(54)} y={px(53)} width={px(20)} height={px(4)} color={lightOff ? '#638893' : '#718189'} />
      <Line
        p1={vec(px(52), px(49))}
        p2={vec(px(77), px(49))}
        color={lightOff ? 'rgba(121,232,255,0.92)' : anomalySeen ? 'rgba(121,232,255,0.72)' : 'rgba(121,232,255,0.38)'}
        strokeWidth={px(lightOff ? 1.2 : 0.8)}
      />
      <Circle cx={px(55 + pulse * 6)} cy={px(49)} r={px(1)} color="rgba(220,252,255,0.90)" />
      <Rect
        x={px(72)}
        y={px(36)}
        width={px(4)}
        height={px(27)}
        color={lightOff ? 'rgba(20,55,67,0.95)' : 'rgba(27,50,60,0.78)'}
      />
      <Line p1={vec(px(71.5), px(35))} p2={vec(px(71.5), px(63))} color={lightOff ? '#79e8ff' : anomalySeen ? 'rgba(121,232,255,0.62)' : 'rgba(121,232,255,0.28)'} strokeWidth={px(lightOff ? 1 : 0.6)} />
      <Line p1={vec(px(76.5), px(35))} p2={vec(px(76.5), px(63))} color={lightOff ? 'rgba(121,232,255,0.72)' : 'rgba(121,232,255,0.30)'} strokeWidth={px(0.7)} />
      <Line p1={vec(px(71.5), px(35))} p2={vec(px(76.5), px(35))} color={lightOff ? 'rgba(121,232,255,0.72)' : 'rgba(121,232,255,0.30)'} strokeWidth={px(0.7)} />

      {routeRevealed && (
        <>
          <Circle cx={px(113.5)} cy={px(67)} r={px(17 + pulse)} color="rgba(91,238,255,0.05)" />
          <Line p1={vec(px(106.5), px(42))} p2={vec(px(106.5), px(102))} color="rgba(121,232,255,0.76)" strokeWidth={px(1)} />
          <Line p1={vec(px(121.5), px(42))} p2={vec(px(121.5), px(102))} color="rgba(121,232,255,0.55)" strokeWidth={px(0.8)} />
          <Line p1={vec(px(106.5), px(42))} p2={vec(px(121.5), px(42))} color="rgba(121,232,255,0.55)" strokeWidth={px(0.8)} />
          <Line p1={vec(px(82), px(49))} p2={vec(px(113), px(49))} color="rgba(121,232,255,0.58)" strokeWidth={px(0.9)} />
          <Circle cx={px(86 + pulse * 8)} cy={px(49)} r={px(1)} color="rgba(121,232,255,0.88)" />
        </>
      )}

      {hauntedSession && <HauntedPlayerReadability x={px(playerX)} y={px(playerY)} px={px} />}
    </>
  );
}
