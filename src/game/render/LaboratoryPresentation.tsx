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
import { PixelSpritePicture } from './PixelSpritePicture';
import { ROOM_TEXTURE_ORIGIN, roomTexture } from './RoomTextures';
import {
  NIGHTMARE_CORE,
  NIGHTMARE_ORIGIN,
  VESPER_DOWN_ORIGIN,
  VESPER_DOWN_SPRITE,
  VESPER_ORIGIN,
  VESPER_SPRITE,
  nightmareSprite,
} from './VesperSprites';
import { ROOM_VIEW_WIDTH, STAGE_LOGICAL_WIDTH, STAGE_SIDE_MARGIN, acrossRoom, spreadX } from './StageViewport';
import { Spread } from './RoomSpread';

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
      <Rect x={px(-STAGE_SIDE_MARGIN)} y={0} width={px(STAGE_LOGICAL_WIDTH)} height={px(128)} color="#090d18" />
      <Rect x={px(-STAGE_SIDE_MARGIN)} y={px(17)} width={px(STAGE_LOGICAL_WIDTH)} height={px(70)} color="#172131" />
      <Rect x={px(-STAGE_SIDE_MARGIN)} y={px(20)} width={px(STAGE_LOGICAL_WIDTH)} height={px(2)} color="#31465d" />
      <Rect x={px(-STAGE_SIDE_MARGIN)} y={px(87)} width={px(STAGE_LOGICAL_WIDTH)} height={px(41)} color="#101722" />
      <Rect x={px(-STAGE_SIDE_MARGIN)} y={px(101)} width={px(STAGE_LOGICAL_WIDTH)} height={px(3)} color="#263746" />
      <PixelSpritePicture sprite={roomTexture('laboratory')} x={ROOM_TEXTURE_ORIGIN.x} y={ROOM_TEXTURE_ORIGIN.y} px={px} />

      {pressure?.lane && pressure.minX !== undefined && pressure.maxX !== undefined && (
        <>
          <Rect
            x={px(spreadX(pressure.minX))}
            y={px(88)}
            width={px(spreadX(pressure.maxX - pressure.minX))}
            height={px(15)}
            color={pressure.phase === 'active' ? 'rgba(255,93,105,0.24)' : 'rgba(211,107,255,0.12)'}
          />
          <Line
            p1={vec(px(spreadX(pressure.minX)), px(89))}
            p2={vec(px(spreadX(pressure.maxX)), px(89))}
            color={pressure.phase === 'active' ? '#ff5d69' : '#d36bff'}
            strokeWidth={px(pressure.phase === 'active' ? 1.8 : 0.9)}
          />
        </>
      )}

      {resonatorElectrical?.lane && resonatorElectrical.minX !== undefined && resonatorElectrical.maxX !== undefined && (
        <>
          <Rect
            x={px(spreadX(resonatorElectrical.minX))}
            y={px(88)}
            width={px(spreadX(resonatorElectrical.maxX - resonatorElectrical.minX))}
            height={px(15)}
            color={resonatorElectrical.phase === 'active' ? 'rgba(121,232,255,0.24)' : 'rgba(121,232,255,0.09)'}
          />
          <Line
            p1={vec(px(spreadX(resonatorElectrical.minX)), px(90))}
            p2={vec(px(spreadX(resonatorElectrical.maxX)), px(90))}
            color={resonatorElectrical.phase === 'active' ? '#d7fbff' : '#79e8ff'}
            strokeWidth={px(resonatorElectrical.phase === 'active' ? 1.8 : 0.9)}
          />
        </>
      )}

      {distortion?.minX !== undefined && distortion.maxX !== undefined && distortion.phase !== 'idle' && (
        <>
          <Rect
            x={px(spreadX(distortion.minX))}
            y={px(24)}
            width={px(spreadX(distortion.maxX - distortion.minX))}
            height={px(76)}
            color={distortion.phase === 'active' ? 'rgba(211,107,255,0.10)' : 'rgba(211,107,255,0.045)'}
          />
          <Line
            p1={vec(px(spreadX(distortion.minX)), px(31))}
            p2={vec(px(spreadX(distortion.maxX)), px(94))}
            color={distortion.phase === 'active' ? '#d36bff' : 'rgba(211,107,255,0.45)'}
            strokeWidth={px(distortion.phase === 'active' ? 1.2 : 0.7)}
          />
          <Line
            p1={vec(px(spreadX(distortion.maxX)), px(31))}
            p2={vec(px(spreadX(distortion.minX)), px(94))}
            color={distortion.phase === 'active' ? '#79e8ff' : 'rgba(121,232,255,0.38)'}
            strokeWidth={px(distortion.phase === 'active' ? 1.2 : 0.7)}
          />
        </>
      )}

      {nightmareState?.attack && nightmareState.minX !== undefined && nightmareState.maxX !== undefined && nightmareState.phase !== 'recovery' && (
        <>
          <Rect
            x={px(spreadX(nightmareState.minX))}
            y={px(nightmareState.attack === 'center-rift' ? 25 : 86)}
            width={px(spreadX(nightmareState.maxX - nightmareState.minX))}
            height={px(nightmareState.attack === 'center-rift' ? 76 : 17)}
            color={nightmareState.phase === 'active' ? 'rgba(255,93,105,0.23)' : 'rgba(211,107,255,0.10)'}
          />
          <Line
            p1={vec(px(spreadX(nightmareState.minX)), px(89))}
            p2={vec(px(spreadX(nightmareState.maxX)), px(89))}
            color={nightmareState.phase === 'active' ? '#ff5d69' : '#d36bff'}
            strokeWidth={px(nightmareState.phase === 'active' ? 2 : 0.9)}
          />
        </>
      )}

      {/* Structural ribs / containment wall. */}
      {acrossRoom(2, 22).map((x) => (
        <React.Fragment key={`lab-rib-${x}`}>
          <Rect x={px(x)} y={px(23)} width={px(2)} height={px(63)} color="#223144" />
          <Rect x={px(x + 3)} y={px(27)} width={px(1)} height={px(54)} color="rgba(121,232,255,0.12)" />
        </React.Fragment>
      ))}

      {/* Basement feed enters at the left and terminates at the Resonator. */}
      <Spread at={10} px={px}>
      <RoundedRect x={px(4)} y={px(55)} width={px(22)} height={px(47)} r={px(2)} color="#1f2d39" />
      <Rect x={px(8)} y={px(59)} width={px(14)} height={px(32)} color="#0c131c" />
      </Spread>
      <Spread at={10} px={px}>
      <Line
        p1={vec(px(14), px(27))}
        p2={vec(px(14), px(94))}
        color={encounterPhase === 'complete' ? '#344049' : '#79e8ff'}
        strokeWidth={px(encounterPhase === 'complete' ? 0.8 : 1.4)}
      />
      </Spread>
      <Line
        p1={vec(px(14 + spreadX(10) - 10), px(94))}
        p2={vec(px(spreadX(55)), px(94))}
        color={encounterPhase === 'complete' ? '#344049' : '#79e8ff'}
        strokeWidth={px(encounterPhase === 'complete' ? 0.8 : 1.4)}
      />
      <Spread at={10} px={px}>
      <Circle
        cx={px(14)}
        cy={px(72)}
        r={px(encounterPhase === 'complete' ? 4 : 4 + fastPulse)}
        color={encounterPhase === 'complete' ? 'rgba(72,83,92,0.06)' : 'rgba(121,232,255,0.09)'}
      />
      </Spread>

      {/* Resonator containment frame and central core. */}
      <Spread at={76} px={px}>
      <RoundedRect x={px(52)} y={px(31)} width={px(48)} height={px(70)} r={px(4)} color="#223044" />
      <Rect x={px(57)} y={px(36)} width={px(38)} height={px(60)} color="#0b121d" />
      <Line p1={vec(px(61), px(39))} p2={vec(px(61), px(93))} color="#536c7c" strokeWidth={px(1.4)} />
      <Line p1={vec(px(91), px(39))} p2={vec(px(91), px(93))} color="#536c7c" strokeWidth={px(1.4)} />
      <Line p1={vec(px(61), px(42))} p2={vec(px(91), px(42))} color="#536c7c" strokeWidth={px(1.2)} />
      <Line p1={vec(px(61), px(90))} p2={vec(px(91), px(90))} color="#536c7c" strokeWidth={px(1.2)} />

      <Circle
        cx={px(76)}
        cy={px(65)}
        r={px(encounterPhase === 'resonator' ? 24 + fastPulse : 22)}
        color={encounterPhase === 'complete' ? 'rgba(74,88,96,0.035)' : encounterPhase === 'resonator' ? 'rgba(211,107,255,0.075)' : 'rgba(121,232,255,0.045)'}
      />
      <Circle
        cx={px(76)}
        cy={px(65)}
        r={px(encounterPhase === 'resonator' ? 18 + pulse * 0.4 : 16)}
        color={encounterPhase === 'complete' ? 'rgba(74,88,96,0.045)' : 'rgba(211,107,255,0.07)'}
      />
      <Circle
        cx={px(76)}
        cy={px(65)}
        r={px(encounterPhase === 'complete' ? 7 : coreRadius + (encounterPhase === 'resonator' ? 2.5 + fastPulse : 0))}
        color={encounterPhase === 'complete' ? 'rgba(90,105,112,0.10)' : encounterPhase === 'resonator' ? 'rgba(255,93,105,0.16)' : 'rgba(121,232,255,0.14)'}
      />
      <Circle cx={px(76)} cy={px(65)} r={px(5)} color={encounterPhase === 'complete' ? '#303b42' : encounterPhase === 'resonator' ? '#fff1a8' : '#d7fbff'} />
      <Circle cx={px(76)} cy={px(65)} r={px(2.2)} color={encounterPhase === 'complete' ? '#1a2228' : fastPulse === 0 ? '#79e8ff' : '#d36bff'} />
      <Line
        p1={vec(px(76), px(42))}
        p2={vec(px(76), px(55))}
        color={encounterPhase === 'complete' ? '#344049' : '#d36bff'}
        strokeWidth={px(encounterPhase === 'complete' ? 0.7 : 1.1)}
      />
      <Line
        p1={vec(px(76), px(75))}
        p2={vec(px(76), px(91))}
        color={encounterPhase === 'complete' ? '#344049' : '#79e8ff'}
        strokeWidth={px(encounterPhase === 'complete' ? 0.7 : 1.1)}
      />
      </Spread>
      <Line
        p1={vec(px(spreadX(55)), px(94))}
        p2={vec(px(spreadX(76) - 8), px(79))}
        color={encounterPhase === 'complete' ? '#344049' : '#79e8ff'}
        strokeWidth={px(encounterPhase === 'complete' ? 0.8 : 1.4)}
      />

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
              <Circle cx={px(spreadX(x))} cy={px(84)} r={px(7 + fastPulse)} color="rgba(255,241,168,0.14)" />
            )}
            <Circle cx={px(spreadX(x))} cy={px(84)} r={px(4.2)} color={state === 'disabled' ? '#151c24' : '#1d2a38'} />
            <Circle cx={px(spreadX(x))} cy={px(84)} r={px(2.3)} color={nodeColor} />
            {state === 'disabled' && (
              <>
                <Line p1={vec(px(spreadX(x) - 4), px(80))} p2={vec(px(spreadX(x) + 4), px(88))} color="#ff5d69" strokeWidth={px(1)} />
                <Line p1={vec(px(spreadX(x) + 4), px(80))} p2={vec(px(spreadX(x) - 4), px(88))} color="#ff5d69" strokeWidth={px(1)} />
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
              <Circle cx={px(spreadX(x) + 4)} cy={px(69)} r={px(10 + fastPulse)} color="rgba(255,241,168,0.11)" />
            )}
            <RoundedRect x={px(spreadX(x))} y={px(48)} width={px(8)} height={px(38)} r={px(2)} color={state === 'disabled' ? '#18212a' : '#29384a'} />
            {[54, 62, 70, 78].map((y) => (
              <Line
                key={`coil-${id}-${y}`}
                p1={vec(px(spreadX(x) + 1), px(y))}
                p2={vec(px(spreadX(x) + 7), px(y))}
                color={towerColor}
                strokeWidth={px(state === 'vulnerable' ? 1.3 : 0.8)}
              />
            ))}
            {state === 'sealed' && encounterPhase === 'vesper-control' && (
              <Circle cx={px(spreadX(x) + 4)} cy={px(69)} r={px(7)} color="rgba(121,232,255,0.06)" />
            )}
            {state === 'disabled' && (
              <Line
                p1={vec(px(spreadX(x)), px(49))}
                p2={vec(px(spreadX(x) + 8), px(85))}
                color={encounterPhase === 'complete' ? 'rgba(72,83,92,0.45)' : '#ff5d69'}
                strokeWidth={px(encounterPhase === 'complete' ? 0.7 : 1)}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* Vesper stands behind the operator station; he mutates only during the Nightmare phase. */}
      {encounterPhase !== 'nightmare' && encounterPhase !== 'shutdown' && encounterPhase !== 'complete' && (
        <Spread at={114} px={px}>
        <PixelSpritePicture sprite={VESPER_SPRITE} x={VESPER_ORIGIN.x} y={VESPER_ORIGIN.y} px={px} />
        </Spread>
      )}
      <Spread at={114} px={px}>
      <RoundedRect x={px(102)} y={px(70)} width={px(25)} height={px(29)} r={px(2)} color="#243142" />
      <Rect x={px(105)} y={px(74)} width={px(19)} height={px(10)} color="#0b1219" />
      </Spread>
      <Line
        p1={vec(px(108), px(78))}
        p2={vec(px(121), px(78))}
        color={encounterPhase === 'complete' ? '#344049' : '#79e8ff'}
        strokeWidth={px(0.8)}
      />
      <Line
        p1={vec(px(108), px(81))}
        p2={vec(px(117), px(81))}
        color={encounterPhase === 'complete' ? '#344049' : '#d36bff'}
        strokeWidth={px(0.8)}
      />


      {encounterPhase === 'vesper-control' && (
        <>
          <Line p1={vec(px(spreadX(102)), px(42))} p2={vec(px(spreadX(52)), px(58))} color="rgba(211,107,255,0.58)" strokeWidth={px(0.8)} />
          <Line p1={vec(px(spreadX(125)), px(66))} p2={vec(px(spreadX(108)), px(58))} color="rgba(211,107,255,0.58)" strokeWidth={px(0.8)} />
        </>
      )}

      {encounterPhase === 'nightmare' && (
        <>
          {nightmareState?.vulnerable && (
            <Circle
              cx={px(spreadX(VESPER_NIGHTMARE_TARGET.x))}
              cy={px(NIGHTMARE_ORIGIN.y + NIGHTMARE_CORE.y)}
              r={px(17 + fastPulse)}
              color="rgba(255,241,168,0.14)"
            />
          )}
          <PixelSpritePicture
            sprite={nightmareSprite(nowMs, Boolean(nightmareState?.vulnerable))}
            x={NIGHTMARE_ORIGIN.x + spreadX(VESPER_NIGHTMARE_TARGET.x) - VESPER_NIGHTMARE_TARGET.x}
            y={NIGHTMARE_ORIGIN.y}
            px={px}
          />
          {[0, 1, 2].map(index => (
            <Circle
              key={`nightmare-hit-${index}`}
              cx={px(ROOM_VIEW_WIDTH - 18 + index * 7)}
              cy={px(30)}
              r={px(1.8)}
              color={(nightmareState?.hits ?? 0) > index ? '#ff5d69' : '#394354'}
            />
          ))}
        </>
      )}

      {(encounterPhase === 'shutdown' || encounterPhase === 'complete') && (
        <>
          <PixelSpritePicture sprite={VESPER_DOWN_SPRITE} x={VESPER_DOWN_ORIGIN.x + spreadX(VESPER_NIGHTMARE_TARGET.x) - VESPER_NIGHTMARE_TARGET.x} y={VESPER_DOWN_ORIGIN.y} px={px} />
        </>
      )}

      {/* Floor conduits connect operator, Resonator and incoming feed. */}
      <Line
        p1={vec(px(spreadX(76)), px(94))}
        p2={vec(px(spreadX(114)), px(94))}
        color={encounterPhase === 'complete' ? 'rgba(72,83,92,0.34)' : 'rgba(211,107,255,0.58)'}
        strokeWidth={px(1.1)}
      />
      <Circle cx={px(spreadX(76))} cy={px(94)} r={px(2)} color={encounterPhase === 'complete' ? '#344049' : '#79e8ff'} />
      <Circle cx={px(spreadX(114))} cy={px(94)} r={px(2)} color={encounterPhase === 'complete' ? '#344049' : '#d36bff'} />

      {hauntedSession && <HauntedPlayerReadability x={px(spreadX(playerX))} y={px(playerY)} px={px} />}
    </>
  );
}
