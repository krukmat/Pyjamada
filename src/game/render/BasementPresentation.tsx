import React from 'react';
import { Circle, Line, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
import { getRoomState, type AdventureState } from '../adventure/AdventureState';
import {
  BASEMENT_ELECTRICAL_HAZARD,
  resolveBasementElectricalHazard,
} from '../adventure/BasementElectricalHazard';
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

export function BasementPresentation({ adventure, hauntedSession, playerX, playerY, nowMs, px }: Props) {
  const basement = adventure ? getRoomState(adventure, 'basement') : undefined;
  const faultTraced = basement?.switches['basement-fault-traced'] === true;
  const stabilized = basement?.switches['basement-power-stabilized'] === true;
  const controlRevealed = basement?.switches['basement-control-revealed'] === true;
  const lossOfControlRevealed = basement?.switches['basement-loss-of-control-revealed'] === true;
  const laboratoryRouteRevealed = basement?.switches['laboratory-route-revealed'] === true;
  const conduitFocused = basement?.switches['conduit-focused'] === true;
  const relayFocused = basement?.switches['relay-focused'] === true;
  const terminalFocused = basement?.switches['terminal-focused'] === true;
  const hazard = adventure && hauntedSession
    ? resolveBasementElectricalHazard(adventure, hauntedSession.elapsedMs)
    : undefined;
  const hazardTelegraph = hazard?.phase === 'telegraph';
  const hazardDischarge = hazard?.phase === 'discharge';
  const pulse = Math.floor(nowMs / 160) % 4;
  const fastPulse = Math.floor(nowMs / 70) % 2;
  const live = stabilized ? '#79e8ff' : pulse % 2 === 0 ? '#9ff3ff' : '#4aa9bd';

  return (
    <>
      <Rect x={px(-20)} y={0} width={px(168)} height={px(128)} color="#101419" />
      <Rect x={px(-20)} y={px(23)} width={px(168)} height={px(66)} color="#252b2d" />
      <Rect x={px(-20)} y={px(89)} width={px(168)} height={px(39)} color="#191e21" />

      {[0, 24, 48, 72, 96, 120].map((x) => (
        <Line key={`wall-v-${x}`} p1={vec(px(x), px(24))} p2={vec(px(x), px(89))} color="rgba(126,139,137,0.09)" strokeWidth={px(0.8)} />
      ))}
      {[39, 55, 71].map((y) => (
        <Line key={`wall-h-${y}`} p1={vec(px(-20), px(y))} p2={vec(px(148), px(y))} color="rgba(126,139,137,0.07)" strokeWidth={px(0.7)} />
      ))}

      <Rect x={px(-20)} y={px(101)} width={px(168)} height={px(2)} color="#090d10" />
      {[6, 28, 50, 72, 94, 116].map((x) => (
        <Line key={`floor-${x}`} p1={vec(px(x), px(103))} p2={vec(px(x + 7), px(128))} color="rgba(5,8,10,0.30)" strokeWidth={px(0.8)} />
      ))}

      {/* Attic ladder / return route. */}
      <RoundedRect x={px(2)} y={px(31)} width={px(16)} height={px(72)} r={px(1)} color="#1a2022" />
      <Line p1={vec(px(6), px(34))} p2={vec(px(6), px(101))} color="#697377" strokeWidth={px(1.4)} />
      <Line p1={vec(px(14), px(34))} p2={vec(px(14), px(101))} color="#697377" strokeWidth={px(1.4)} />
      {[42, 52, 62, 72, 82, 92].map((y) => (
        <Line key={`ladder-${y}`} p1={vec(px(6), px(y))} p2={vec(px(14), px(y))} color="#7f898a" strokeWidth={px(0.9)} />
      ))}

      {/* Old domestic utility pipes. */}
      <Line p1={vec(px(20), px(35))} p2={vec(px(126), px(35))} color="#5b6463" strokeWidth={px(3.2)} />
      <Line p1={vec(px(33), px(35))} p2={vec(px(33), px(77))} color="#4e5757" strokeWidth={px(2.5)} />
      <Line p1={vec(px(112), px(35))} p2={vec(px(112), px(65))} color="#4e5757" strokeWidth={px(2.5)} />
      <Circle cx={px(33)} cy={px(58)} r={px(4)} color="#313a3b" />
      <Circle cx={px(33)} cy={px(58)} r={px(2)} color="#687271" />

      {/* New resonance feed entering from Attic and crossing old utilities. */}
      <Line p1={vec(px(18), px(27))} p2={vec(px(54), px(27))} color={live} strokeWidth={px(1.4)} />
      <Line p1={vec(px(54), px(27))} p2={vec(px(54), px(84))} color={live} strokeWidth={px(1.4)} />
      <Line p1={vec(px(54), px(84))} p2={vec(px(91), px(84))} color={stabilized ? '#79e8ff' : 'rgba(121,232,255,0.54)'} strokeWidth={px(1.2)} />
      <Circle cx={px(54)} cy={px(55)} r={px(3.5)} color={stabilized ? '#214654' : '#4b2f2f'} />
      <Circle cx={px(54)} cy={px(55)} r={px(1.4)} color={stabilized ? '#dffcff' : '#ffd08a'} />

      {!stabilized && (
        <>
          <Line p1={vec(px(54), px(49))} p2={vec(px(49 - pulse), px(43))} color="#ffd08a" strokeWidth={px(0.9)} />
          <Line p1={vec(px(55), px(58))} p2={vec(px(61 + pulse), px(64))} color="#9ff3ff" strokeWidth={px(0.8)} />
          <Circle cx={px(54)} cy={px(55)} r={px(10 + pulse)} color="rgba(255,190,110,0.05)" />
        </>
      )}
      {(faultTraced || conduitFocused) && !stabilized && (
        <>
          <Circle cx={px(54)} cy={px(55)} r={px(14)} color="rgba(255,190,110,0.08)" />
          <Line p1={vec(px(42), px(69))} p2={vec(px(54), px(55))} color="rgba(255,208,138,0.72)" strokeWidth={px(0.8)} />
        </>
      )}

      {/* Isolation relay. */}
      <RoundedRect x={px(81)} y={px(50)} width={px(23)} height={px(51)} r={px(2)} color="#343b3e" />
      <Rect x={px(85)} y={px(55)} width={px(15)} height={px(18)} color="#171c1f" />
      <Circle cx={px(89)} cy={px(61)} r={px(1.4)} color={stabilized ? '#79e8ff' : '#9c6262'} />
      <Circle cx={px(96)} cy={px(61)} r={px(1.4)} color={faultTraced ? '#f8da76' : '#545b5d'} />
      <Line p1={vec(px(87), px(78))} p2={vec(px(98), px(78))} color="#8a9392" strokeWidth={px(1)} />
      <Line p1={vec(px(92), px(78))} p2={vec(px(92), px(89))} color={stabilized ? '#79e8ff' : '#777f7f'} strokeWidth={px(1.3)} />
      {relayFocused && <Circle cx={px(92)} cy={px(72)} r={px(15)} color="rgba(248,218,118,0.07)" />}

      {/* Basement control terminal. */}
      <RoundedRect x={px(108)} y={px(56)} width={px(20)} height={px(45)} r={px(2)} color="#252b30" />
      <Rect x={px(111)} y={px(61)} width={px(14)} height={px(15)} color="#101619" />
      {!stabilized && (
        <Line p1={vec(px(113), px(68))} p2={vec(px(123), px(68))} color="#354044" strokeWidth={px(0.7)} />
      )}
      {stabilized && !controlRevealed && (
        <>
          <Line p1={vec(px(113), px(65))} p2={vec(px(123), px(65))} color="rgba(121,232,255,0.45)" strokeWidth={px(0.7)} />
          <Line p1={vec(px(113), px(68))} p2={vec(px(120), px(68))} color="rgba(121,232,255,0.62)" strokeWidth={px(0.7)} />
          <Line p1={vec(px(113), px(71))} p2={vec(px(122), px(71))} color="rgba(121,232,255,0.34)" strokeWidth={px(0.7)} />
        </>
      )}
      {controlRevealed && (
        <>
          <Rect x={px(113)} y={px(72)} width={px(10)} height={px(1)} color="#7f3434" />
          <Rect x={px(113)} y={px(69)} width={px(8)} height={px(2)} color="#d65f5f" />
          <Rect x={px(113)} y={px(66)} width={px(6)} height={px(2)} color="#f08b62" />
          <Line p1={vec(px(121.5), px(63))} p2={vec(px(121.5), px(74))} color="#f8da76" strokeWidth={px(0.6)} />
          <Circle cx={px(123)} cy={px(63.5)} r={px(1.2)} color="#ff7b82" />
          <Circle cx={px(118)} cy={px(68)} r={px(12)} color="rgba(255,92,105,0.06)" />
        </>
      )}
      {lossOfControlRevealed && (
        <>
          <Line p1={vec(px(112), px(63))} p2={vec(px(124), px(74))} color="#ff7b82" strokeWidth={px(1)} />
          <Line p1={vec(px(124), px(63))} p2={vec(px(112), px(74))} color="#ff7b82" strokeWidth={px(1)} />
          <Rect x={px(112)} y={px(77)} width={px(12)} height={px(2)} color={fastPulse === 0 ? '#f8da76' : '#ff9f73'} />
        </>
      )}
      {[113, 118, 123].map((x, index) => (
        <Circle key={`panel-${x}`} cx={px(x)} cy={px(84)} r={px(1)} color={lossOfControlRevealed ? '#ff7b82' : controlRevealed && index === 2 ? '#ff7b82' : stabilized && index === pulse % 3 ? '#79e8ff' : '#596164'} />
      ))}
      {terminalFocused && <Circle cx={px(118)} cy={px(69)} r={px(16)} color={controlRevealed ? 'rgba(255,92,105,0.08)' : 'rgba(121,232,255,0.06)'} />}

      {stabilized && (
        <>
          <Circle cx={px(72)} cy={px(84)} r={px(24)} color="rgba(91,238,255,0.05)" />
          <Line p1={vec(px(92), px(84))} p2={vec(px(118), px(84))} color="rgba(121,232,255,0.68)" strokeWidth={px(1.1)} />
          <Line p1={vec(px(118), px(84))} p2={vec(px(118), px(101))} color={controlRevealed ? 'rgba(255,123,130,0.58)' : 'rgba(121,232,255,0.48)'} strokeWidth={px(1)} />
        </>
      )}

      {/* W5-T6/T7: rejected local failsafe exposes the downstream Laboratory feed hatch. */}
      {lossOfControlRevealed && (
        <>
          <Line p1={vec(px(118), px(84))} p2={vec(px(124), px(92))} color="#ff8f72" strokeWidth={px(1.4)} />
          <Line p1={vec(px(124), px(92))} p2={vec(px(124), px(97))} color="#79e8ff" strokeWidth={px(1.2)} />
          <RoundedRect
            x={px(107)}
            y={px(94)}
            width={px(20)}
            height={px(9)}
            r={px(1.5)}
            color={laboratoryRouteRevealed ? '#315b62' : '#2b3032'}
          />
          <Rect
            x={px(109)}
            y={px(96)}
            width={px(16)}
            height={px(5)}
            color={laboratoryRouteRevealed ? 'rgba(121,232,255,0.26)' : '#171c1f'}
          />
          <Line
            p1={vec(px(109), px(98.5))}
            p2={vec(px(125), px(98.5))}
            color={laboratoryRouteRevealed ? '#9ff3ff' : '#697377'}
            strokeWidth={px(laboratoryRouteRevealed ? 1.1 : 0.8)}
          />
          <Circle
            cx={px(123)}
            cy={px(96)}
            r={px(1.2)}
            color={laboratoryRouteRevealed ? '#79e8ff' : fastPulse === 0 ? '#f8da76' : '#ff9f73'}
          />
          {laboratoryRouteRevealed && <Circle cx={px(117)} cy={px(99)} r={px(12)} color="rgba(121,232,255,0.07)" />}
        </>
      )}

      {/* W5-T5: local overload pressure on the downstream control feed. */}
      {(hazardTelegraph || hazardDischarge) && (
        <>
          <Rect
            x={px(BASEMENT_ELECTRICAL_HAZARD.zoneMinX)}
            y={px(98)}
            width={px(BASEMENT_ELECTRICAL_HAZARD.zoneMaxX - BASEMENT_ELECTRICAL_HAZARD.zoneMinX)}
            height={px(5)}
            color={hazardDischarge ? 'rgba(255,92,105,0.38)' : fastPulse === 0 ? 'rgba(248,218,118,0.18)' : 'rgba(248,218,118,0.30)'}
          />
          <Line
            p1={vec(px(96), px(84))}
            p2={vec(px(118), px(84))}
            color={hazardDischarge ? '#fff0b8' : fastPulse === 0 ? '#f8da76' : '#ff9f73'}
            strokeWidth={px(hazardDischarge ? 2 : 1.2)}
          />
          <Circle cx={px(104)} cy={px(84)} r={px(hazardDischarge ? 10 : 7 + fastPulse)} color={hazardDischarge ? 'rgba(255,92,105,0.12)' : 'rgba(248,218,118,0.08)'} />
          <Circle cx={px(116)} cy={px(84)} r={px(hazardDischarge ? 13 : 8 + fastPulse)} color={hazardDischarge ? 'rgba(121,232,255,0.12)' : 'rgba(255,159,115,0.07)'} />
        </>
      )}
      {hazardDischarge && (
        <>
          <Line p1={vec(px(96), px(84))} p2={vec(px(102), px(75))} color="#fff4c4" strokeWidth={px(1.2)} />
          <Line p1={vec(px(102), px(75))} p2={vec(px(108), px(88))} color="#9ff3ff" strokeWidth={px(1.4)} />
          <Line p1={vec(px(108), px(88))} p2={vec(px(113), px(72))} color="#fff4c4" strokeWidth={px(1.3)} />
          <Line p1={vec(px(113), px(72))} p2={vec(px(119), px(86))} color="#9ff3ff" strokeWidth={px(1.5)} />
          <Line p1={vec(px(119), px(86))} p2={vec(px(124), px(67))} color="#ff7b82" strokeWidth={px(1.1)} />
          <Rect x={px(100)} y={px(37)} width={px(28)} height={px(64)} color="rgba(255,92,105,0.045)" />
        </>
      )}

      {hauntedSession && <HauntedPlayerReadability x={px(playerX)} y={px(playerY)} px={px} />}
    </>
  );
}
