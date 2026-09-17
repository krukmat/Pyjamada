import React from 'react';
import { Circle, Line, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
import { getRoomState, type AdventureState, type RoomId } from '../adventure/AdventureState';
import { findActiveRoom } from '../adventure/RoomRegistry';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import { resolveObjectVisualFrame } from '../presentation/ObjectAnimator';
import type { ActiveVisualEvent } from '../presentation/PresentationRuntime';
import { findSystemicObject, type SystemicObjectDefinition } from '../systemic/SystemicContent';
import type { SystemicObjectId, SystemicRunState } from '../systemic/SystemicState';
import { SYSTEMIC_OBJECT_IDS } from '../systemic/SystemicState';
import { ArcadeStageAtmosphere, WallyFocusLight } from './ArcadeStageLighting';
import { AtticPresentation } from './AtticPresentation';
import { BasementPresentation } from './BasementPresentation';
import { BathroomPresentation } from './BathroomPresentation';
import {
  HauntedExitDoor,
  HauntedPlayerReadability,
  HauntedStageTreatment,
} from './HauntedStagePresentation';
import {
  IllustratedBedroomBackdrop,
  IllustratedBedroomForeground,
  IllustratedBedroomLightOverlay,
} from './IllustratedBedroomScene';
import { IllustratedObject } from './IllustratedObject';
import { KitchenPresentation } from './KitchenPresentation';
import { LivingRoomPresentation } from './LivingRoomPresentation';
import { SCENE_TOKENS, VISUAL_TOKENS } from './VisualLanguage';

type Px = (value: number) => number;
type ObjectPlacement = { x: number; y: number };

type Props = {
  roomId: RoomId;
  adventure?: AdventureState;
  state: SystemicRunState;
  hauntedSession?: HauntedSessionState;
  activeVisualEvents: readonly ActiveVisualEvent[];
  size: number;
  playerX: number;
  playerY: number;
  nowMs: number;
  scale: number;
  px: Px;
};

const OBJECT_PLACEMENTS: Record<SystemicObjectId, ObjectPlacement> = {
  bed: { x: 16, y: 105 },
  slippers: { x: 32, y: 105 },
  'alarm-clock': { x: 48, y: 78 },
  wardrobe: { x: 68, y: 105 },
  keys: { x: 88, y: 66 },
  window: { x: 108, y: 66 },
};

export function roomInteractionTarget(roomId: RoomId, state: SystemicRunState): SystemicObjectDefinition | undefined {
  return roomId === 'bedroom' ? findSystemicObject(state.player.x) : undefined;
}

export function RoomPresentation(props: Props) {
  const presentationId = findActiveRoom(props.roomId)?.presentationId;
  switch (presentationId) {
    case 'hallway':
      return <HallwayPresentation {...props} />;
    case 'living-room':
      return (
        <LivingRoomPresentation
          adventure={props.adventure}
          hauntedSession={props.hauntedSession}
          playerX={props.playerX}
          playerY={props.playerY}
          nowMs={props.nowMs}
          px={props.px}
        />
      );
    case 'kitchen':
      return (
        <KitchenPresentation
          adventure={props.adventure}
          hauntedSession={props.hauntedSession}
          playerX={props.playerX}
          playerY={props.playerY}
          nowMs={props.nowMs}
          px={props.px}
        />
      );
    case 'bathroom':
      return (
        <BathroomPresentation
          adventure={props.adventure}
          hauntedSession={props.hauntedSession}
          playerX={props.playerX}
          playerY={props.playerY}
          nowMs={props.nowMs}
          px={props.px}
        />
      );
    case 'attic':
      return (
        <AtticPresentation
          adventure={props.adventure}
          hauntedSession={props.hauntedSession}
          playerX={props.playerX}
          playerY={props.playerY}
          nowMs={props.nowMs}
          px={props.px}
        />
      );
    case 'basement':
      return (
        <BasementPresentation
          adventure={props.adventure}
          hauntedSession={props.hauntedSession}
          playerX={props.playerX}
          playerY={props.playerY}
          nowMs={props.nowMs}
          px={props.px}
        />
      );
    case 'bedroom':
    default:
      return <BedroomPresentation {...props} />;
  }
}

function BedroomPresentation({ adventure, state, hauntedSession, activeVisualEvents, size, playerX, playerY, nowMs, scale, px }: Props) {
  const altered = adventure?.storyFlags.bedroomEscapeAttempted === true;
  const target = altered ? undefined : roomInteractionTarget('bedroom', state);
  const objects = SYSTEMIC_OBJECT_IDS.map((objectId) => ({
    objectId,
    visual: resolveObjectVisualFrame(state, objectId, activeVisualEvents, nowMs),
    placement: OBJECT_PLACEMENTS[objectId],
  }));

  return (
    <>
      <IllustratedBedroomBackdrop state={state} size={size} />
      <ArcadeStageAtmosphere state={state} size={size} />
      {altered && <Rect x={px(-20)} y={0} width={px(168)} height={px(128)} color="rgba(30,28,72,0.17)" />}
      <RoomContactShadows state={state} px={px} />
      {hauntedSession && (
        <HauntedExitDoor
          px={px}
          ready={altered || hauntedSession.objective.phase === 'escape-ready' || hauntedSession.objective.phase === 'completed'}
          pulse={Math.floor(nowMs / 140) % 2}
        />
      )}
      {altered && (
        <>
          <Circle cx={px(114)} cy={px(73)} r={px(15)} color="rgba(91,238,255,0.08)" />
          <RoundedRect x={px(106)} y={px(48)} width={px(17)} height={px(55)} r={px(2)} color="rgba(66,49,110,0.16)" />
          <Rect x={px(105)} y={px(101)} width={px(20)} height={px(2)} color="rgba(91,238,255,0.22)" />
          <Circle cx={px(92)} cy={px(31)} r={px(1.3)} color="rgba(248,218,118,0.72)" />
          <Circle cx={px(38)} cy={px(45)} r={px(1)} color="rgba(91,238,255,0.58)" />
        </>
      )}
      {target && (
        <InteractionFocus objectId={target.id} placement={OBJECT_PLACEMENTS[target.id]} px={px} phase={Math.floor(nowMs / 240) % 2} />
      )}
      {objects.map(({ objectId, visual, placement }) => (
        <IllustratedObject
          key={objectId}
          objectId={objectId}
          visual={visual}
          x={px(placement.x)}
          y={px(placement.y)}
          scale={scale}
        />
      ))}
      <WallyFocusLight state={state} size={size} x={playerX} groundY={playerY} />
      <IllustratedBedroomLightOverlay state={state} size={size} />
      <IllustratedBedroomForeground state={state} size={size} />
      {hauntedSession && (
        <>
          <HauntedStageTreatment px={px} pressure={altered ? 0 : hauntedSession.threats.ghosts.length} />
          <HauntedPlayerReadability x={px(playerX)} y={px(playerY)} px={px} />
        </>
      )}
    </>
  );
}

function HallwayPresentation({ adventure, hauntedSession, playerX, playerY, nowMs, px }: Props) {
  const hallway = adventure ? getRoomState(adventure, 'hallway') : undefined;
  const clockInspected = hallway?.inspected.includes('backward-clock') === true;
  const livingUnlocked = hallway?.switches['living-room-unlocked'] === true;
  const clockStep = Math.floor(nowMs / 260) % 12;
  const minuteAngle = (-clockStep / 12) * Math.PI * 2 - Math.PI / 2;
  const hourAngle = (-(clockStep / 3) / 12) * Math.PI * 2 - Math.PI / 2;
  const minuteEnd = vec(px(64 + Math.cos(minuteAngle) * 4), px(43 + Math.sin(minuteAngle) * 4));
  const hourEnd = vec(px(64 + Math.cos(hourAngle) * 2.7), px(43 + Math.sin(hourAngle) * 2.7));

  return (
    <>
      <Rect x={px(-20)} y={0} width={px(168)} height={px(128)} color="#15152b" />
      <Rect x={px(-20)} y={px(18)} width={px(168)} height={px(67)} color="#292644" />
      <Rect x={px(-20)} y={px(21)} width={px(168)} height={px(2)} color="#3b3659" />
      {[4, 29, 54, 79, 104].map((x) => (
        <Rect key={`panel-${x}`} x={px(x)} y={px(25)} width={px(20)} height={px(55)} color="rgba(70,61,98,0.18)" />
      ))}
      <Rect x={px(-20)} y={px(84)} width={px(168)} height={px(44)} color="#242039" />
      {[0, 16, 32, 48, 64, 80, 96, 112].map((x) => (
        <Rect key={`floor-${x}`} x={px(x)} y={px(102)} width={px(1)} height={px(26)} color="rgba(9,10,24,0.24)" />
      ))}
      <Rect x={px(-20)} y={px(101)} width={px(168)} height={px(2)} color="#111126" />

      <HallwayDoor x={4} px={px} accent="bedroom" unlocked />
      <HallwayDoor x={103} px={px} accent="living" unlocked={livingUnlocked} />

      <RoundedRect x={px(31)} y={px(35)} width={px(13)} height={px(17)} r={px(1)} color="#17162b" />
      <Rect x={px(33)} y={px(37)} width={px(9)} height={px(13)} color="#4a3a57" />
      <Circle cx={px(37.5)} cy={px(42)} r={px(2.6)} color="#8e6e7d" />
      <RoundedRect x={px(84)} y={px(31)} width={px(15)} height={px(20)} r={px(1)} color="#17162b" />
      <Rect x={px(86)} y={px(33)} width={px(11)} height={px(16)} color="#35475a" />
      <Circle cx={px(91.5)} cy={px(39)} r={px(3)} color="#6d8890" />

      {clockInspected && <Circle cx={px(64)} cy={px(43)} r={px(10)} color="rgba(91,238,255,0.10)" />}
      <Circle cx={px(64)} cy={px(43)} r={px(7)} color="#17172d" />
      <Circle cx={px(64)} cy={px(43)} r={px(5.6)} color="#393653" />
      <Circle cx={px(64)} cy={px(43)} r={px(0.8)} color="#f8da76" />
      <Line p1={vec(px(64), px(43))} p2={minuteEnd} color="#79e8ff" strokeWidth={px(0.7)} />
      <Line p1={vec(px(64), px(43))} p2={hourEnd} color="#f8da76" strokeWidth={px(0.9)} />
      {[0, 3, 6, 9].map((tick) => {
        const angle = (tick / 12) * Math.PI * 2 - Math.PI / 2;
        return <Circle key={`tick-${tick}`} cx={px(64 + Math.cos(angle) * 4.7)} cy={px(43 + Math.sin(angle) * 4.7)} r={px(0.45)} color="#b6abc9" />;
      })}

      <RoundedRect x={px(25)} y={px(100)} width={px(77)} height={px(4)} r={px(2)} color="rgba(91,238,255,0.08)" />
      {livingUnlocked && (
        <>
          <Circle cx={px(114)} cy={px(70)} r={px(16)} color="rgba(91,238,255,0.07)" />
          <Rect x={px(102)} y={px(101)} width={px(24)} height={px(2)} color="rgba(91,238,255,0.34)" />
        </>
      )}
      {hauntedSession && <HauntedPlayerReadability x={px(playerX)} y={px(playerY)} px={px} />}
    </>
  );
}

function HallwayDoor({ x, px, accent, unlocked }: { x: number; px: Px; accent: 'bedroom' | 'living'; unlocked: boolean }) {
  const frame = unlocked && accent === 'living' ? '#4b7487' : '#3c3654';
  const panel = unlocked && accent === 'living' ? '#172d3a' : '#1b1a31';
  return (
    <>
      <RoundedRect x={px(x)} y={px(44)} width={px(23)} height={px(59)} r={px(2)} color={frame} />
      <Rect x={px(x + 4)} y={px(49)} width={px(15)} height={px(52)} color={panel} />
      <Rect x={px(x + 6)} y={px(53)} width={px(11)} height={px(18)} color="rgba(91,83,120,0.20)" />
      <Rect x={px(x + 6)} y={px(75)} width={px(11)} height={px(20)} color="rgba(91,83,120,0.16)" />
      <Circle cx={px(x + (accent === 'bedroom' ? 17 : 6))} cy={px(77)} r={px(1.1)} color={unlocked ? '#f1d75c' : '#766b84'} />
    </>
  );
}

function InteractionFocus({ objectId, placement, px, phase }: {
  objectId: SystemicObjectId;
  placement: ObjectPlacement;
  px: Px;
  phase: number;
}) {
  const elevated = objectId === 'window' || objectId === 'keys' || objectId === 'alarm-clock';
  const radius = objectId === 'bed' ? 16 : objectId === 'wardrobe' ? 14 : objectId === 'alarm-clock' || objectId === 'keys' ? 9 : 8;
  const cueY = elevated ? placement.y - (objectId === 'alarm-clock' ? 8 : 11) : placement.y + 1;
  const alpha = phase === 0 ? 0.13 : 0.21;

  return (
    <>
      <RoundedRect x={px(placement.x - radius)} y={px(cueY - 2)} width={px(radius * 2)} height={px(4)} r={px(2)} color={`rgba(241,215,92,${alpha})`} />
      <Circle cx={px(placement.x - radius + 1)} cy={px(cueY - 5 - phase)} r={px(1.2)} color={VISUAL_TOKENS.interactive.focusLight} />
      <Circle cx={px(placement.x + radius - 1)} cy={px(cueY - 7 + phase)} r={px(1)} color={VISUAL_TOKENS.interactive.focus} />
    </>
  );
}

function RoomContactShadows({ state, px }: { state: SystemicRunState; px: Px }) {
  return (
    <>
      <RoundedRect x={px(2)} y={px(102)} width={px(30)} height={px(4)} r={px(2)} color={SCENE_TOKENS.contactShadow} />
      <RoundedRect x={px(53)} y={px(102)} width={px(31)} height={px(4)} r={px(2)} color={SCENE_TOKENS.contactShadow} />
      {!state.equipped.includes('slippers') && <RoundedRect x={px(26)} y={px(102)} width={px(12)} height={px(3)} r={px(1.5)} color={SCENE_TOKENS.contactShadow} />}
    </>
  );
}
