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

export function KitchenPresentation({ adventure, hauntedSession, playerX, playerY, nowMs, px }: Props) {
  const kitchen = adventure ? getRoomState(adventure, 'kitchen') : undefined;
  const overloaded = kitchen?.switches['circuit-overloaded'] === true;
  const rerouted = kitchen?.switches['power-rerouted'] === true;
  const breakerInspected = kitchen?.inspected.includes('breaker-panel') === true;
  const microwaveOn = kitchen?.switches['microwave-on'] === true;
  const pulse = Math.floor(nowMs / 150) % 3;
  const flicker = overloaded && Math.floor(nowMs / 90) % 2 === 0;

  return (
    <>
      <Rect x={px(-20)} y={0} width={px(168)} height={px(128)} color="#111722" />
      <Rect x={px(-20)} y={px(18)} width={px(168)} height={px(69)} color={overloaded && flicker ? '#242836' : '#303745'} />
      <Rect x={px(-20)} y={px(20)} width={px(168)} height={px(2)} color="#48505e" />
      <Rect x={px(-20)} y={px(87)} width={px(168)} height={px(41)} color="#25252c" />
      {[0, 16, 32, 48, 64, 80, 96, 112].map((x) => (
        <Rect key={`kitchen-floor-${x}`} x={px(x)} y={px(102)} width={px(1)} height={px(26)} color="rgba(7,8,12,0.28)" />
      ))}
      <Rect x={px(-20)} y={px(101)} width={px(168)} height={px(2)} color="#12151a" />

      <RoundedRect x={px(3)} y={px(44)} width={px(23)} height={px(59)} r={px(2)} color="#4a4f57" />
      <Rect x={px(7)} y={px(49)} width={px(15)} height={px(52)} color="#232a30" />
      <Circle cx={px(20)} cy={px(77)} r={px(1.1)} color="#f1d75c" />

      <RoundedRect x={px(31)} y={px(38)} width={px(20)} height={px(64)} r={px(2)} color="#606773" />
      <Rect x={px(34)} y={px(42)} width={px(14)} height={px(25)} color="#4a515b" />
      <Rect x={px(34)} y={px(70)} width={px(14)} height={px(28)} color="#444a54" />
      <Circle cx={px(47)} cy={px(62)} r={px(0.8)} color="#c7c2b5" />
      <Circle cx={px(47)} cy={px(75)} r={px(0.8)} color="#c7c2b5" />

      <Rect x={px(52)} y={px(79)} width={px(72)} height={px(7)} color="#52505a" />
      <Rect x={px(54)} y={px(86)} width={px(68)} height={px(16)} color="#34353d" />
      {[58, 76, 94, 112].map((x) => (
        <Rect key={`cabinet-${x}`} x={px(x)} y={px(89)} width={px(14)} height={px(10)} color="#3d3e47" />
      ))}

      <RoundedRect x={px(55)} y={px(55)} width={px(21)} height={px(16)} r={px(2)} color="#171c22" />
      <Rect
        x={px(58)}
        y={px(58)}
        width={px(13)}
        height={px(10)}
        color={microwaveOn ? (overloaded ? '#9b513a' : '#36505c') : '#26313a'}
      />
      <Rect x={px(72)} y={px(58)} width={px(2)} height={px(10)} color="#30363c" />
      <Circle cx={px(73)} cy={px(60)} r={px(0.7)} color={microwaveOn ? '#f8da76' : '#77736c'} />
      {overloaded && (
        <>
          <Circle cx={px(64.5)} cy={px(63)} r={px(12 + pulse)} color="rgba(245,137,87,0.06)" />
          <Rect x={px(59 + pulse)} y={px(59)} width={px(10 - pulse)} height={px(1)} color="rgba(255,223,164,0.58)" />
        </>
      )}

      <Rect x={px(82)} y={px(72)} width={px(22)} height={px(7)} color="#1b1f25" />
      {[85, 91, 97, 101].map((x) => (
        <Circle key={`burner-${x}`} cx={px(x)} cy={px(75)} r={px(1.7)} color="#4b5054" />
      ))}
      <Rect x={px(106)} y={px(54)} width={px(9)} height={px(16)} color="#1a2028" />
      <Rect x={px(108)} y={px(57)} width={px(5)} height={px(10)} color={rerouted ? '#164452' : overloaded ? '#574037' : '#2a333c'} />
      <Circle cx={px(110.5)} cy={px(60)} r={px(0.7)} color={rerouted ? '#79e8ff' : overloaded ? '#f8da76' : '#716d66'} />
      <Circle cx={px(110.5)} cy={px(64)} r={px(0.7)} color={breakerInspected ? '#c8b97a' : '#5c6165'} />

      <Line
        p1={vec(px(110.5), px(54))}
        p2={vec(px(110.5), px(31))}
        color={rerouted ? 'rgba(121,232,255,0.72)' : '#313842'}
        strokeWidth={px(rerouted ? 1 : 0.7)}
      />
      <Line
        p1={vec(px(110.5), px(31))}
        p2={vec(px(128), px(31))}
        color={rerouted ? 'rgba(121,232,255,0.58)' : '#313842'}
        strokeWidth={px(rerouted ? 1 : 0.7)}
      />
      {rerouted && (
        <>
          <Circle cx={px(113 + pulse * 5)} cy={px(31)} r={px(1.1)} color="rgba(121,232,255,0.85)" />
          <Circle cx={px(126)} cy={px(31)} r={px(5 + pulse)} color="rgba(91,238,255,0.04)" />
        </>
      )}
      {overloaded && (
        <>
          <Line p1={vec(px(107), px(52))} p2={vec(px(104), px(48 - pulse))} color="#f8da76" strokeWidth={px(0.8)} />
          <Line p1={vec(px(112), px(52))} p2={vec(px(116), px(48 + pulse))} color="#ff8d68" strokeWidth={px(0.7)} />
        </>
      )}

      <RoundedRect x={px(58)} y={px(22)} width={px(13)} height={px(3)} r={px(1.5)} color={overloaded ? '#3b3c42' : rerouted ? '#9edee5' : '#d5ccb1'} />
      {!overloaded && <Circle cx={px(64.5)} cy={px(30)} r={px(16)} color={rerouted ? 'rgba(121,232,255,0.05)' : 'rgba(248,218,118,0.05)'} />}
      {overloaded && <Rect x={px(-20)} y={0} width={px(168)} height={px(128)} color={flicker ? 'rgba(5,8,14,0.18)' : 'rgba(5,8,14,0.34)'} />}

      {hauntedSession && <HauntedPlayerReadability x={px(playerX)} y={px(playerY)} px={px} />}
    </>
  );
}
