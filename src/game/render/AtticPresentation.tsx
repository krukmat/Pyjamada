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

export function AtticPresentation({ adventure, hauntedSession, playerX, playerY, nowMs, px }: Props) {
  const attic = adventure ? getRoomState(adventure, 'attic') : undefined;
  const logSeen = attic?.inspected.includes('attic-experiment-log') === true;
  const sensorsSeen = attic?.inspected.includes('attic-sensor-map') === true;
  const recorderFocused = attic?.switches['recorder-focused'] === true;
  const experimentRevealed = attic?.switches['experiment-revealed'] === true;
  const basementRouteRevealed = attic?.switches['basement-route-revealed'] === true;
  const pulse = Math.floor(nowMs / 180) % 4;

  return (
    <>
      <Rect x={px(-20)} y={0} width={px(168)} height={px(128)} color="#16131a" />
      <Rect x={px(-20)} y={px(32)} width={px(168)} height={px(55)} color="#332a31" />
      <Rect x={px(-20)} y={px(87)} width={px(168)} height={px(41)} color="#242027" />

      <Line p1={vec(px(-8), px(36))} p2={vec(px(31), px(12))} color="#56444a" strokeWidth={px(4)} />
      <Line p1={vec(px(31), px(12))} p2={vec(px(64), px(33))} color="#56444a" strokeWidth={px(4)} />
      <Line p1={vec(px(64), px(33))} p2={vec(px(96), px(12))} color="#56444a" strokeWidth={px(4)} />
      <Line p1={vec(px(96), px(12))} p2={vec(px(136), px(37))} color="#56444a" strokeWidth={px(4)} />
      <Line p1={vec(px(31), px(13))} p2={vec(px(31), px(87))} color="#43363d" strokeWidth={px(2)} />
      <Line p1={vec(px(96), px(13))} p2={vec(px(96), px(87))} color="#43363d" strokeWidth={px(2)} />

      {[0, 18, 36, 54, 72, 90, 108, 126].map((x) => (
        <Line key={`floor-${x}`} p1={vec(px(x), px(103))} p2={vec(px(x + 8), px(128))} color="rgba(9,8,12,0.24)" strokeWidth={px(0.8)} />
      ))}
      <Rect x={px(-20)} y={px(101)} width={px(168)} height={px(2)} color="#100e13" />

      <RoundedRect x={px(3)} y={px(51)} width={px(22)} height={px(52)} r={px(2)} color="#433941" />
      <Rect x={px(7)} y={px(58)} width={px(14)} height={px(43)} color="#201c22" />
      <Line p1={vec(px(8), px(96))} p2={vec(px(21), px(83))} color="#705d5c" strokeWidth={px(1.2)} />
      <Line p1={vec(px(8), px(89))} p2={vec(px(21), px(76))} color="#705d5c" strokeWidth={px(1.2)} />

      <RoundedRect x={px(27)} y={px(79)} width={px(21)} height={px(23)} r={px(1)} color="#655244" />
      <Rect x={px(30)} y={px(82)} width={px(15)} height={px(4)} color="#84705c" />
      <RoundedRect x={px(34)} y={px(66)} width={px(18)} height={px(15)} r={px(1)} color="#58473e" />
      <Rect x={px(37)} y={px(69)} width={px(12)} height={px(3)} color="#766156" />

      <RoundedRect x={px(35)} y={px(39)} width={px(17)} height={px(23)} r={px(1)} color="#211c22" />
      <Rect x={px(38)} y={px(42)} width={px(11)} height={px(17)} color={logSeen ? '#51636a' : '#4b3d43'} />
      <Line p1={vec(px(40), px(46))} p2={vec(px(47), px(46))} color={logSeen ? '#79e8ff' : '#987b6b'} strokeWidth={px(0.7)} />
      <Line p1={vec(px(40), px(50))} p2={vec(px(46), px(50))} color={logSeen ? 'rgba(121,232,255,0.68)' : '#786158'} strokeWidth={px(0.6)} />
      <Line p1={vec(px(40), px(54))} p2={vec(px(47), px(54))} color={logSeen ? 'rgba(121,232,255,0.54)' : '#786158'} strokeWidth={px(0.6)} />
      {logSeen && <Circle cx={px(43)} cy={px(51)} r={px(10)} color="rgba(91,238,255,0.07)" />}

      <RoundedRect x={px(59)} y={px(74)} width={px(23)} height={px(28)} r={px(2)} color="#403b42" />
      <Rect x={px(63)} y={px(78)} width={px(15)} height={px(9)} color={sensorsSeen ? '#244857' : '#252930'} />
      {[64, 69, 74].map((x, index) => (
        <Circle key={`sensor-${x}`} cx={px(x)} cy={px(92)} r={px(1.3)} color={sensorsSeen ? (index === pulse % 3 ? '#dffcff' : '#79e8ff') : '#766b70'} />
      ))}
      <Line p1={vec(px(70), px(74))} p2={vec(px(70), px(62))} color={sensorsSeen ? 'rgba(121,232,255,0.78)' : '#53474f'} strokeWidth={px(0.8)} />
      <Line p1={vec(px(70), px(62))} p2={vec(px(91), px(62))} color={sensorsSeen ? 'rgba(121,232,255,0.58)' : '#53474f'} strokeWidth={px(0.8)} />
      {sensorsSeen && <Circle cx={px(70)} cy={px(86)} r={px(12)} color="rgba(91,238,255,0.06)" />}

      <RoundedRect x={px(87)} y={px(48)} width={px(24)} height={px(53)} r={px(2)} color="#26252d" />
      <Rect x={px(91)} y={px(54)} width={px(16)} height={px(15)} color={experimentRevealed ? '#214654' : '#313943'} />
      <Line p1={vec(px(93), px(62))} p2={vec(px(105), px(62))} color={experimentRevealed ? '#79e8ff' : '#70808c'} strokeWidth={px(0.8)} />
      <Circle cx={px(94 + pulse * 3)} cy={px(62)} r={px(0.9)} color={experimentRevealed ? '#e8ffff' : '#9aa3a8'} />
      <Rect x={px(91)} y={px(73)} width={px(16)} height={px(5)} color="#15151b" />
      <Circle cx={px(94)} cy={px(86)} r={px(1.2)} color={recorderFocused || experimentRevealed ? '#f8da76' : '#675d58'} />
      <Circle cx={px(101)} cy={px(86)} r={px(1.2)} color={experimentRevealed ? '#79e8ff' : '#675d58'} />
      {experimentRevealed && (
        <>
          <Circle cx={px(99)} cy={px(66)} r={px(18)} color="rgba(91,238,255,0.08)" />
          <Line p1={vec(px(92), px(57))} p2={vec(px(106), px(57))} color="rgba(121,232,255,0.52)" strokeWidth={px(0.6)} />
          <Line p1={vec(px(92), px(66))} p2={vec(px(106), px(66))} color="rgba(121,232,255,0.38)" strokeWidth={px(0.6)} />
        </>
      )}

      <Line p1={vec(px(79), px(87))} p2={vec(px(88), px(87))} color="#57434c" strokeWidth={px(1)} />
      <Line p1={vec(px(109), px(83))} p2={vec(px(118), px(83))} color={experimentRevealed ? 'rgba(121,232,255,0.64)' : '#57434c'} strokeWidth={px(1)} />
      <Line p1={vec(px(118), px(83))} p2={vec(px(118), px(102))} color={experimentRevealed ? 'rgba(121,232,255,0.54)' : '#57434c'} strokeWidth={px(1)} />

      <RoundedRect x={px(112)} y={px(87)} width={px(16)} height={px(15)} r={px(1)} color="#332c32" />
      <Rect x={px(115)} y={px(90)} width={px(10)} height={px(9)} color="#1c191e" />

      {basementRouteRevealed && (
        <>
          <Circle cx={px(121)} cy={px(100)} r={px(18 + pulse)} color="rgba(91,238,255,0.09)" />
          <Rect x={px(113)} y={px(96)} width={px(17)} height={px(32)} color="#080d12" />
          <RoundedRect x={px(111)} y={px(94)} width={px(20)} height={px(9)} r={px(1)} color="#132b35" />
          <Line p1={vec(px(112), px(94.5))} p2={vec(px(130), px(94.5))} color="#9ff3ff" strokeWidth={px(1.2)} />
          <Line p1={vec(px(113), px(102))} p2={vec(px(130), px(102))} color="rgba(121,232,255,0.76)" strokeWidth={px(0.9)} />
          <Line p1={vec(px(118), px(83))} p2={vec(px(118), px(113))} color="#79e8ff" strokeWidth={px(1.2)} />
          <Line p1={vec(px(118), px(113))} p2={vec(px(122), px(119))} color="rgba(121,232,255,0.72)" strokeWidth={px(1)} />
          <Line p1={vec(px(122), px(119))} p2={vec(px(122), px(127))} color="rgba(121,232,255,0.44)" strokeWidth={px(0.9)} />
          {[106, 112, 118].map((y) => (
            <Line key={`basement-rung-${y}`} p1={vec(px(124), px(y))} p2={vec(px(129), px(y))} color="rgba(190,232,235,0.48)" strokeWidth={px(0.7)} />
          ))}
        </>
      )}

      {hauntedSession && <HauntedPlayerReadability x={px(playerX)} y={px(playerY)} px={px} />}
    </>
  );
}
