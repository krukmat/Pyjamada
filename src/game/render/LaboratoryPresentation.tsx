import React from 'react';
import { Circle, Line, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
import type { AdventureState } from '../adventure/AdventureState';
import { getLaboratoryEncounterPhase } from '../adventure/LaboratoryEncounter';
import {
  resolveResonatorInstabilityState,
  type ResonatorWeakPointId,
} from '../adventure/LaboratoryResonatorInstability';
import { resolveVesperControlState, type VesperControlDeviceId } from '../adventure/LaboratoryVesperControl';
import {
  resolveVesperNightmareState,
  VESPER_NIGHTMARE_TARGET,
} from '../adventure/LaboratoryVesperNightmare';
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

export function LaboratoryPresentation({ adventure, hauntedSession, playerX, playerY, nowMs, px }: Props) {
  const pulse = Math.floor(nowMs / 160) % 4;
  const fastPulse = Math.floor(nowMs / 80) % 2;
  const coreRadius = 8 + pulse * 0.8;
  const encounterPhase = adventure ? getLaboratoryEncounterPhase(adventure) : 'dormant';
  const controlState = adventure && hauntedSession
    ? resolveVesperControlState(adventure, hauntedSession.elapsedMs)
    : undefined;
  const pressure = controlState?.pressure;
  const resonatorState = adventure && hauntedSession
    ? resolveResonatorInstabilityState(adventure, hauntedSession.elapsedMs)
    : undefined;
  const distortion = resonatorState?.distortion;
  const resonatorElectrical = resonatorState?.electrical;
  const nightmareState = adventure && hauntedSession
    ? resolveVesperNightmareState(adventure, hauntedSession.elapsedMs)
    : undefined;

  return (
    <>
      {/* Purpose-built source room: colder, cleaner and more symmetrical than Basement. */}
      <Rect x={px(-20)} y={0} width={px(168)} height={px(128)} color="#090d18" />
      <Rect x={px(-20)} y={px(17)} width={px(168)} height={px(70)} color="#172131" />
      <Rect x={px(-20)} y={px(20)} width={px(168)} height={px(2)} color="#31465d" />
      <Rect x={px(-20)} y={px(87)} width={px(168)} height={px(41)} color="#101722" />
      <Rect x={px(-20)} y={px(101)} width={px(168)} height={px(3)} color="#263746" />

      {pressure?.lane && pressure.minX !== undefined && pressure.maxX !== undefined && (
        <>
          <Rect
            x={px(pressure.minX)}
            y={px(88)}
            width={px(pressure.maxX - pressure.minX)}
            height={px(15)}
            color={pressure.phase === 'active' ? 'rgba(255,93,105,0.24)' : 'rgba(211,107,255,0.12)'}
          />
          <Line
            p1={vec(px(pressure.minX), px(89))}
            p2={vec(px(pressure.maxX), px(89))}
            color={pressure.phase === 'active' ? '#ff5d69' : '#d36bff'}
            strokeWidth={px(pressure.phase === 'active' ? 1.8 : 0.9)}
          />
        </>
      )}

      {resonatorElectrical?.lane && resonatorElectrical.minX !== undefined && resonatorElectrical.maxX !== undefined && (
        <>
          <Rect
            x={px(resonatorElectrical.minX)}
            y={px(88)}
            width={px(resonatorElectrical.maxX - resonatorElectrical.minX)}
            height={px(15)}
            color={resonatorElectrical.phase === 'active' ? 'rgba(121,232,255,0.24)' : 'rgba(121,232,255,0.09)'}
          />
          <Line
            p1={vec(px(resonatorElectrical.minX), px(90))}
            p2={vec(px(resonatorElectrical.maxX), px(90))}
            color={resonatorElectrical.phase === 'active' ? '#d7fbff' : '#79e8ff'}
            strokeWidth={px(resonatorElectrical.phase === 'active' ? 1.8 : 0.9)}
          />
        </>
      )}

      {distortion?.minX !== undefined && distortion.maxX !== undefined && distortion.phase !== 'idle' && (
        <>
          <Rect
            x={px(distortion.minX)}
            y={px(24)}
            width={px(distortion.maxX - distortion.minX)}
            height={px(76)}
            color={distortion.phase === 'active' ? 'rgba(211,107,255,0.10)' : 'rgba(211,107,255,0.045)'}
          />
          <Line
            p1={vec(px(distortion.minX), px(31))}
            p2={vec(px(distortion.maxX), px(94))}
            color={distortion.phase === 'active' ? '#d36bff' : 'rgba(211,107,255,0.45)'}
            strokeWidth={px(distortion.phase === 'active' ? 1.2 : 0.7)}
          />
          <Line
            p1={vec(px(distortion.maxX), px(31))}
            p2={vec(px(distortion.minX), px(94))}
            color={distortion.phase === 'active' ? '#79e8ff' : 'rgba(121,232,255,0.38)'}
            strokeWidth={px(distortion.phase === 'active' ? 1.2 : 0.7)}
          />
        </>
      )}

      {nightmareState?.attack && nightmareState.minX !== undefined && nightmareState.maxX !== undefined && nightmareState.phase !== 'recovery' && (
        <>
          <Rect
            x={px(nightmareState.minX)}
            y={px(nightmareState.attack === 'center-rift' ? 25 : 86)}
            width={px(nightmareState.maxX - nightmareState.minX)}
            height={px(nightmareState.attack === 'center-rift' ? 76 : 17)}
            color={nightmareState.phase === 'active' ? 'rgba(255,93,105,0.23)' : 'rgba(211,107,255,0.10)'}
          />
          <Line
            p1={vec(px(nightmareState.minX), px(89))}
            p2={vec(px(nightmareState.maxX), px(89))}
            color={nightmareState.phase === 'active' ? '#ff5d69' : '#d36bff'}
            strokeWidth={px(nightmareState.phase === 'active' ? 2 : 0.9)}
          />
        </>
      )}

      {/* Structural ribs / containment wall. */}
      {[2, 24, 46, 68, 90, 112].map((x) => (
        <React.Fragment key={`lab-rib-${x}`}>
          <Rect x={px(x)} y={px(23)} width={px(2)} height={px(63)} color="#223144" />
          <Rect x={px(x + 3)} y={px(27)} width={px(1)} height={px(54)} color="rgba(121,232,255,0.12)" />
        </React.Fragment>
      ))}

      {/* Basement feed enters at the left and terminates at the Resonator. */}
      <RoundedRect x={px(4)} y={px(55)} width={px(22)} height={px(47)} r={px(2)} color="#1f2d39" />
      <Rect x={px(8)} y={px(59)} width={px(14)} height={px(32)} color="#0c131c" />
      <Line p1={vec(px(14), px(27))} p2={vec(px(14), px(94))} color="#79e8ff" strokeWidth={px(1.4)} />
      <Line p1={vec(px(14), px(94))} p2={vec(px(55), px(94))} color="#79e8ff" strokeWidth={px(1.4)} />
      <Circle cx={px(14)} cy={px(72)} r={px(4 + fastPulse)} color="rgba(121,232,255,0.09)" />

      {/* Resonator containment frame and central core. */}
      <RoundedRect x={px(52)} y={px(31)} width={px(48)} height={px(70)} r={px(4)} color="#223044" />
      <Rect x={px(57)} y={px(36)} width={px(38)} height={px(60)} color="#0b121d" />
      <Line p1={vec(px(61), px(39))} p2={vec(px(61), px(93))} color="#536c7c" strokeWidth={px(1.4)} />
      <Line p1={vec(px(91), px(39))} p2={vec(px(91), px(93))} color="#536c7c" strokeWidth={px(1.4)} />
      <Line p1={vec(px(61), px(42))} p2={vec(px(91), px(42))} color="#536c7c" strokeWidth={px(1.2)} />
      <Line p1={vec(px(61), px(90))} p2={vec(px(91), px(90))} color="#536c7c" strokeWidth={px(1.2)} />

      <Circle cx={px(76)} cy={px(65)} r={px(encounterPhase === 'resonator' ? 24 + fastPulse : 22)} color={encounterPhase === 'resonator' ? 'rgba(211,107,255,0.075)' : 'rgba(121,232,255,0.045)'} />
      <Circle cx={px(76)} cy={px(65)} r={px(encounterPhase === 'resonator' ? 18 + pulse * 0.4 : 16)} color="rgba(211,107,255,0.07)" />
      <Circle cx={px(76)} cy={px(65)} r={px(coreRadius + (encounterPhase === 'resonator' ? 2.5 + fastPulse : 0))} color={encounterPhase === 'resonator' ? 'rgba(255,93,105,0.16)' : 'rgba(121,232,255,0.14)'} />
      <Circle cx={px(76)} cy={px(65)} r={px(5)} color={encounterPhase === 'resonator' ? '#fff1a8' : '#d7fbff'} />
      <Circle cx={px(76)} cy={px(65)} r={px(2.2)} color={fastPulse === 0 ? '#79e8ff' : '#d36bff'} />
      <Line p1={vec(px(76), px(42))} p2={vec(px(76), px(55))} color="#d36bff" strokeWidth={px(1.1)} />
      <Line p1={vec(px(76), px(75))} p2={vec(px(76), px(91))} color="#79e8ff" strokeWidth={px(1.1)} />
      <Line p1={vec(px(55), px(94))} p2={vec(px(68), px(79))} color="#79e8ff" strokeWidth={px(1.4)} />

      {encounterPhase === 'resonator' && ([
        { id: 'left' as ResonatorWeakPointId, x: 66 },
        { id: 'right' as ResonatorWeakPointId, x: 86 },
      ]).map(({ id, x }) => {
        const state = resonatorState?.weakPoints[id] ?? 'sealed';
        const nodeColor = state === 'disabled'
          ? '#26313a'
          : state === 'vulnerable'
            ? '#fff1a8'
            : state === 'telegraph'
              ? '#d36bff'
              : '#79e8ff';
        return (
          <React.Fragment key={`resonator-node-${id}`}>
            {state === 'vulnerable' && (
              <Circle cx={px(x)} cy={px(84)} r={px(7 + fastPulse)} color="rgba(255,241,168,0.14)" />
            )}
            <Circle cx={px(x)} cy={px(84)} r={px(4.2)} color={state === 'disabled' ? '#151c24' : '#1d2a38'} />
            <Circle cx={px(x)} cy={px(84)} r={px(2.3)} color={nodeColor} />
            {state === 'disabled' && (
              <>
                <Line p1={vec(px(x - 4), px(80))} p2={vec(px(x + 4), px(88))} color="#ff5d69" strokeWidth={px(1)} />
                <Line p1={vec(px(x + 4), px(80))} p2={vec(px(x - 4), px(88))} color="#ff5d69" strokeWidth={px(1)} />
              </>
            )}
          </React.Fragment>
        );
      })}

      {/* Vesper control towers: sealed -> telegraph -> vulnerable -> disabled. */}
      {([
        { id: 'left' as VesperControlDeviceId, x: 48 },
        { id: 'right' as VesperControlDeviceId, x: 104 },
      ]).map(({ id, x }) => {
        const state = controlState?.devices[id] ?? 'sealed';
        const towerColor = state === 'disabled'
          ? '#26313a'
          : state === 'vulnerable'
            ? '#fff1a8'
            : state === 'telegraph'
              ? '#d36bff'
              : '#79e8ff';
        return (
          <React.Fragment key={`coil-${id}`}>
            {state === 'vulnerable' && (
              <Circle cx={px(x + 4)} cy={px(69)} r={px(10 + fastPulse)} color="rgba(255,241,168,0.11)" />
            )}
            <RoundedRect x={px(x)} y={px(48)} width={px(8)} height={px(38)} r={px(2)} color={state === 'disabled' ? '#18212a' : '#29384a'} />
            {[54, 62, 70, 78].map((y) => (
              <Line
                key={`coil-${id}-${y}`}
                p1={vec(px(x + 1), px(y))}
                p2={vec(px(x + 7), px(y))}
                color={towerColor}
                strokeWidth={px(state === 'vulnerable' ? 1.3 : 0.8)}
              />
            ))}
            {state === 'sealed' && encounterPhase === 'vesper-control' && (
              <Circle cx={px(x + 4)} cy={px(69)} r={px(7)} color="rgba(121,232,255,0.06)" />
            )}
            {state === 'disabled' && (
              <Line p1={vec(px(x), px(49))} p2={vec(px(x + 8), px(85))} color="#ff5d69" strokeWidth={px(1)} />
            )}
          </React.Fragment>
        );
      })}

      {/* Operator station remains; Vesper mutates only during the Nightmare phase. */}
      <RoundedRect x={px(102)} y={px(70)} width={px(25)} height={px(29)} r={px(2)} color="#243142" />
      <Rect x={px(105)} y={px(74)} width={px(19)} height={px(10)} color="#0b1219" />
      <Line p1={vec(px(108), px(78))} p2={vec(px(121), px(78))} color="#79e8ff" strokeWidth={px(0.8)} />
      <Line p1={vec(px(108), px(81))} p2={vec(px(117), px(81))} color="#d36bff" strokeWidth={px(0.8)} />

      {encounterPhase !== 'nightmare' && encounterPhase !== 'shutdown' && (
        <>
          <Circle cx={px(114)} cy={px(57)} r={px(5)} color="#151722" />
          <RoundedRect x={px(109)} y={px(61)} width={px(10)} height={px(17)} r={px(3)} color="#d8dde6" />
          <Rect x={px(111)} y={px(64)} width={px(6)} height={px(14)} color="#6d7890" />
          <Line p1={vec(px(108), px(66))} p2={vec(px(103), px(75))} color="#d8dde6" strokeWidth={px(2)} />
          <Line p1={vec(px(120), px(66))} p2={vec(px(124), px(74))} color="#d8dde6" strokeWidth={px(2)} />
          <Circle cx={px(112.5)} cy={px(56)} r={px(0.8)} color="#d36bff" />
          <Circle cx={px(115.8)} cy={px(56)} r={px(0.8)} color="#79e8ff" />
        </>
      )}

      {encounterPhase === 'vesper-control' && (
        <>
          <Line p1={vec(px(109), px(67))} p2={vec(px(52), px(58))} color="rgba(211,107,255,0.58)" strokeWidth={px(0.8)} />
          <Line p1={vec(px(119), px(67))} p2={vec(px(108), px(58))} color="rgba(211,107,255,0.58)" strokeWidth={px(0.8)} />
        </>
      )}

      {encounterPhase === 'nightmare' && (
        <>
          {nightmareState?.vulnerable && (
            <Circle
              cx={px(VESPER_NIGHTMARE_TARGET.x)}
              cy={px(65)}
              r={px(17 + fastPulse)}
              color="rgba(255,241,168,0.14)"
            />
          )}
          <Circle cx={px(108)} cy={px(48)} r={px(8 + fastPulse * 0.5)} color="#1b1425" />
          <RoundedRect x={px(98)} y={px(55)} width={px(20)} height={px(31)} r={px(6)} color="#3a2148" />
          <RoundedRect x={px(102)} y={px(59)} width={px(13)} height={px(24)} r={px(5)} color="#1b1724" />
          <Line p1={vec(px(101), px(61))} p2={vec(px(89), px(73))} color="#d36bff" strokeWidth={px(3)} />
          <Line p1={vec(px(116), px(61))} p2={vec(px(125), px(73))} color="#79e8ff" strokeWidth={px(3)} />
          <Line p1={vec(px(104), px(84))} p2={vec(px(99), px(96))} color="#6e446f" strokeWidth={px(3)} />
          <Line p1={vec(px(113), px(84))} p2={vec(px(117), px(96))} color="#6e446f" strokeWidth={px(3)} />
          <Circle cx={px(105)} cy={px(47)} r={px(1.4)} color="#ff5d69" />
          <Circle cx={px(111)} cy={px(47)} r={px(1.4)} color="#fff1a8" />
          {[0, 1, 2].map(index => (
            <Circle
              key={`nightmare-hit-${index}`}
              cx={px(99 + index * 7)}
              cy={px(38)}
              r={px(1.8)}
              color={(nightmareState?.hits ?? 0) > index ? '#ff5d69' : '#394354'}
            />
          ))}
        </>
      )}

      {encounterPhase === 'shutdown' && (
        <>
          <Circle cx={px(110)} cy={px(82)} r={px(5)} color="#191923" />
          <RoundedRect x={px(101)} y={px(86)} width={px(17)} height={px(8)} r={px(3)} color="#352b3b" />
          <Line p1={vec(px(101), px(91))} p2={vec(px(93), px(96))} color="#5a4a60" strokeWidth={px(2)} />
          <Line p1={vec(px(117), px(91))} p2={vec(px(123), px(96))} color="#5a4a60" strokeWidth={px(2)} />
        </>
      )}

      {/* Floor conduits connect operator, Resonator and incoming feed. */}
      <Line p1={vec(px(76), px(94))} p2={vec(px(114), px(94))} color="rgba(211,107,255,0.58)" strokeWidth={px(1.1)} />
      <Circle cx={px(76)} cy={px(94)} r={px(2)} color="#79e8ff" />
      <Circle cx={px(114)} cy={px(94)} r={px(2)} color="#d36bff" />

      {hauntedSession && <HauntedPlayerReadability x={px(playerX)} y={px(playerY)} px={px} />}
    </>
  );
}
