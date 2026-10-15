import React from 'react';
import { Circle, Line, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
import { getRoomState, type AdventureState } from '../adventure/AdventureState';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import { KITCHEN_SURGE, resolveKitchenSurge } from '../adventure/KitchenSurgeHazard';
import { HauntedPlayerReadability } from './HauntedStagePresentation';
import { PixelSpritePicture } from './PixelSpritePicture';
import { ROOM_TEXTURE_ORIGIN, roomTexture } from './RoomTextures';
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

export function KitchenPresentation({ adventure, hauntedSession, playerX, playerY, nowMs, px }: Props) {
  const kitchen = adventure ? getRoomState(adventure, 'kitchen') : undefined;
  const overloaded = kitchen?.switches['circuit-overloaded'] === true;
  const rerouted = kitchen?.switches['power-rerouted'] === true;
  const breakerInspected = kitchen?.inspected.includes('breaker-panel') === true;
  const microwaveOn = kitchen?.switches['microwave-on'] === true;
  const pulse = Math.floor(nowMs / 150) % 3;
  const flicker = overloaded && Math.floor(nowMs / 90) % 2 === 0;
  const surge = adventure && hauntedSession ? resolveKitchenSurge(adventure, hauntedSession.elapsedMs) : undefined;
  const sparkPhase = Math.floor(nowMs / 70) % 2;

  return (
    <>
      <Rect x={px(-STAGE_SIDE_MARGIN)} y={0} width={px(STAGE_LOGICAL_WIDTH)} height={px(128)} color="#111722" />
      <Rect x={px(-STAGE_SIDE_MARGIN)} y={px(18)} width={px(STAGE_LOGICAL_WIDTH)} height={px(69)} color={overloaded && flicker ? '#242836' : '#303745'} />
      <Rect x={px(-STAGE_SIDE_MARGIN)} y={px(20)} width={px(STAGE_LOGICAL_WIDTH)} height={px(2)} color="#48505e" />
      <Rect x={px(-STAGE_SIDE_MARGIN)} y={px(87)} width={px(STAGE_LOGICAL_WIDTH)} height={px(41)} color="#25252c" />
      {acrossRoom(0, 16).map((x) => (
        <Rect key={`kitchen-floor-${x}`} x={px(x)} y={px(102)} width={px(1)} height={px(26)} color="rgba(7,8,12,0.28)" />
      ))}
      <Rect x={px(-STAGE_SIDE_MARGIN)} y={px(101)} width={px(STAGE_LOGICAL_WIDTH)} height={px(2)} color="#12151a" />
      <PixelSpritePicture sprite={roomTexture('kitchen')} x={ROOM_TEXTURE_ORIGIN.x} y={ROOM_TEXTURE_ORIGIN.y} px={px} />

      <Spread at={10} px={px}>
      <RoundedRect x={px(3)} y={px(44)} width={px(23)} height={px(59)} r={px(2)} color="#4a4f57" />
      <Rect x={px(7)} y={px(49)} width={px(15)} height={px(52)} color="#232a30" />
      <Circle cx={px(20)} cy={px(77)} r={px(1.1)} color="#f1d75c" />
      </Spread>

      <Spread at={41} px={px}>
      <RoundedRect x={px(31)} y={px(38)} width={px(20)} height={px(64)} r={px(2)} color="#606773" />
      <Rect x={px(34)} y={px(42)} width={px(14)} height={px(25)} color="#4a515b" />
      <Rect x={px(34)} y={px(70)} width={px(14)} height={px(28)} color="#444a54" />
      <Circle cx={px(47)} cy={px(62)} r={px(0.8)} color="#c7c2b5" />
      <Circle cx={px(47)} cy={px(75)} r={px(0.8)} color="#c7c2b5" />
      </Spread>

      <Rect x={px(spreadX(52))} y={px(79)} width={px(spreadX(72))} height={px(7)} color="#52505a" />
      <Rect x={px(spreadX(52) + 2)} y={px(86)} width={px(spreadX(72) - 4)} height={px(16)} color="#34353d" />
      {acrossRoom(spreadX(52) + 6, 18).filter((x) => x <= spreadX(124) - 18).map((x) => (
        <Rect key={`cabinet-${x}`} x={px(x)} y={px(89)} width={px(14)} height={px(10)} color="#3d3e47" />
      ))}

      <Spread at={64} px={px}>
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
      </Spread>
      <Spread at={64} px={px}>
      {overloaded && (
        <>
          <Circle cx={px(64.5)} cy={px(63)} r={px(12 + pulse)} color="rgba(245,137,87,0.06)" />
          <Rect x={px(59 + pulse)} y={px(59)} width={px(10 - pulse)} height={px(1)} color="rgba(255,223,164,0.58)" />
        </>
      )}
      </Spread>

      <Spread at={93} px={px}>
      <Rect x={px(82)} y={px(72)} width={px(22)} height={px(7)} color="#1b1f25" />
      {[85, 91, 97, 101].map((x) => (
        <Circle key={`burner-${x}`} cx={px(x)} cy={px(75)} r={px(1.7)} color="#4b5054" />
      ))}
      </Spread>
      <Spread at={108} px={px}>
      <Rect x={px(106)} y={px(54)} width={px(9)} height={px(16)} color="#1a2028" />
      <Rect x={px(108)} y={px(57)} width={px(5)} height={px(10)} color={rerouted ? '#164452' : overloaded ? '#574037' : '#2a333c'} />
      <Circle cx={px(110.5)} cy={px(60)} r={px(0.7)} color={rerouted ? '#79e8ff' : overloaded ? '#f8da76' : '#716d66'} />
      <Circle cx={px(110.5)} cy={px(64)} r={px(0.7)} color={breakerInspected ? '#c8b97a' : '#5c6165'} />
      </Spread>

      <Line
        p1={vec(px(spreadX(108) + 2.5), px(54))}
        p2={vec(px(spreadX(108) + 2.5), px(31))}
        color={rerouted ? 'rgba(121,232,255,0.72)' : '#313842'}
        strokeWidth={px(rerouted ? 1 : 0.7)}
      />
      <Line
        p1={vec(px(spreadX(108) + 2.5), px(31))}
        p2={vec(px(ROOM_VIEW_WIDTH), px(31))}
        color={rerouted ? 'rgba(121,232,255,0.58)' : '#313842'}
        strokeWidth={px(rerouted ? 1 : 0.7)}
      />
      {rerouted && (
        <>
          <Circle cx={px(spreadX(108) + 5 + pulse * 5)} cy={px(31)} r={px(1.1)} color="rgba(121,232,255,0.85)" />
          <Circle cx={px(ROOM_VIEW_WIDTH - 2)} cy={px(31)} r={px(5 + pulse)} color="rgba(91,238,255,0.04)" />
        </>
      )}
      {overloaded && (
        <>
          <Spread at={108} px={px}>
          <Line p1={vec(px(107), px(52))} p2={vec(px(104), px(48 - pulse))} color="#f8da76" strokeWidth={px(0.8)} />
          <Line p1={vec(px(112), px(52))} p2={vec(px(116), px(48 + pulse))} color="#ff8d68" strokeWidth={px(0.7)} />
          </Spread>
        </>
      )}

      <Spread at={64} px={px}>
      <RoundedRect x={px(58)} y={px(22)} width={px(13)} height={px(3)} r={px(1.5)} color={rerouted ? '#9edee5' : overloaded ? '#3b3c42' : '#5f6268'} />
      {rerouted && <Circle cx={px(64.5)} cy={px(30)} r={px(16)} color="rgba(121,232,255,0.05)" />}
      </Spread>

      <Spread at={122} px={px}>
      <RoundedRect x={px(119)} y={px(44)} width={px(12)} height={px(59)} r={px(2)} color={rerouted ? '#426878' : '#353941'} />
      <Rect x={px(122)} y={px(49)} width={px(8)} height={px(52)} color={rerouted ? '#17303b' : '#20252c'} />
      </Spread>
      {rerouted && (
        <>
          <Spread at={122} px={px}>
          <Rect x={px(119)} y={px(101)} width={px(12)} height={px(2)} color="rgba(121,232,255,0.45)" />
          <Circle cx={px(123)} cy={px(77)} r={px(1)} color="#f1d75c" />
          </Spread>
        </>
      )}

      {overloaded && <Rect x={px(-STAGE_SIDE_MARGIN)} y={0} width={px(STAGE_LOGICAL_WIDTH)} height={px(128)} color={flicker ? 'rgba(5,8,14,0.18)' : 'rgba(5,8,14,0.34)'} />}

      {/* Floor surge: sparks at the breaker outlet, then an arc running to the door. */}
      {surge?.phase === 'telegraph' && (
        <>
          <Rect x={px(spreadX(KITCHEN_SURGE.sourceX) - 2)} y={px(101)} width={px(6)} height={px(1)} color={`rgba(255,216,74,${(0.25 + surge.progress * 0.6).toFixed(2)})`} />
          <Line p1={vec(px(spreadX(KITCHEN_SURGE.sourceX)), px(100))} p2={vec(px(spreadX(KITCHEN_SURGE.sourceX) - 3 - sparkPhase * 2), px(95 - surge.progress * 4))} color="#ffd84a" strokeWidth={px(1)} />
          <Line p1={vec(px(spreadX(KITCHEN_SURGE.sourceX) + 1), px(100))} p2={vec(px(spreadX(KITCHEN_SURGE.sourceX) + 4 - sparkPhase), px(96 - surge.progress * 3))} color="#44d9e6" strokeWidth={px(1)} />
          {surge.progress > 0.5 && <Circle cx={px(spreadX(KITCHEN_SURGE.sourceX))} cy={px(99)} r={px(1.5 + sparkPhase)} color="#f4f1de" />}
        </>
      )}
      {surge?.phase === 'surge' && surge.frontX !== undefined && (
        <>
          <Rect x={px(spreadX(surge.frontX))} y={px(101)} width={px(spreadX(KITCHEN_SURGE.sourceX - surge.frontX))} height={px(1)} color="rgba(255,216,74,0.45)" />
          <Line p1={vec(px(spreadX(surge.frontX) - 4), px(101))} p2={vec(px(spreadX(surge.frontX) - 2), px(90))} color="#44d9e6" strokeWidth={px(1.4)} />
          <Line p1={vec(px(spreadX(surge.frontX) - 2), px(90))} p2={vec(px(spreadX(surge.frontX)), px(100))} color="#f4f1de" strokeWidth={px(1.4)} />
          <Line p1={vec(px(spreadX(surge.frontX)), px(100))} p2={vec(px(spreadX(surge.frontX) + 2), px(88 + sparkPhase))} color="#44d9e6" strokeWidth={px(1.4)} />
          <Line p1={vec(px(spreadX(surge.frontX) + 2), px(88 + sparkPhase))} p2={vec(px(spreadX(surge.frontX) + 4), px(101))} color="#f4f1de" strokeWidth={px(1.4)} />
          <Circle cx={px(spreadX(surge.frontX))} cy={px(98)} r={px(5)} color="rgba(68,217,230,0.22)" />
        </>
      )}

      {hauntedSession && <HauntedPlayerReadability x={px(spreadX(playerX))} y={px(playerY)} px={px} />}
    </>
  );
}
