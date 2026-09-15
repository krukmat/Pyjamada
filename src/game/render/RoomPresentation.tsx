import React from 'react';
import { Circle, Rect, RoundedRect } from '@shopify/react-native-skia';
import type { RoomId } from '../adventure/AdventureState';
import { findActiveRoom } from '../adventure/RoomRegistry';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import { resolveObjectVisualFrame } from '../presentation/ObjectAnimator';
import type { ActiveVisualEvent } from '../presentation/PresentationRuntime';
import { findSystemicObject, type SystemicObjectDefinition } from '../systemic/SystemicContent';
import type { SystemicObjectId, SystemicRunState } from '../systemic/SystemicState';
import { SYSTEMIC_OBJECT_IDS } from '../systemic/SystemicState';
import { ArcadeStageAtmosphere, WallyFocusLight } from './ArcadeStageLighting';
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
import { SCENE_TOKENS, VISUAL_TOKENS } from './VisualLanguage';

type Px = (value: number) => number;
type ObjectPlacement = { x: number; y: number };

type Props = {
  roomId: RoomId;
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
    case 'hallway-placeholder':
      return <PlaceholderHallwayPresentation {...props} />;
    case 'bedroom':
    default:
      return <BedroomPresentation {...props} />;
  }
}

function BedroomPresentation({ state, hauntedSession, activeVisualEvents, size, playerX, playerY, nowMs, scale, px }: Props) {
  const target = roomInteractionTarget('bedroom', state);
  const objects = SYSTEMIC_OBJECT_IDS.map((objectId) => ({
    objectId,
    visual: resolveObjectVisualFrame(state, objectId, activeVisualEvents, nowMs),
    placement: OBJECT_PLACEMENTS[objectId],
  }));

  return (
    <>
      <IllustratedBedroomBackdrop state={state} size={size} />
      <ArcadeStageAtmosphere state={state} size={size} />
      <RoomContactShadows state={state} px={px} />
      {hauntedSession && (
        <HauntedExitDoor
          px={px}
          ready={hauntedSession.objective.phase === 'escape-ready' || hauntedSession.objective.phase === 'completed'}
          pulse={Math.floor(nowMs / 140) % 2}
        />
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
          <HauntedStageTreatment px={px} pressure={hauntedSession.threats.ghosts.length} />
          <HauntedPlayerReadability x={px(playerX)} y={px(playerY)} px={px} />
        </>
      )}
    </>
  );
}

function PlaceholderHallwayPresentation({ hauntedSession, playerX, playerY, px }: Props) {
  const pulse = Math.floor((hauntedSession?.elapsedMs ?? 0) / 220) % 2;
  return (
    <>
      <Rect x={px(-20)} y={0} width={px(168)} height={px(128)} color="#17162d" />
      <Rect x={px(-20)} y={px(79)} width={px(168)} height={px(49)} color="#23213a" />
      <Rect x={px(-20)} y={px(101)} width={px(168)} height={px(27)} color="#171528" />
      <RoundedRect x={px(3)} y={px(45)} width={px(22)} height={px(58)} r={px(2)} color="#302d49" />
      <Rect x={px(7)} y={px(50)} width={px(14)} height={px(51)} color="#18172b" />
      <Circle cx={px(19)} cy={px(77)} r={px(1.2)} color="#f1d75c" />
      <RoundedRect x={px(103)} y={px(45)} width={px(22)} height={px(58)} r={px(2)} color="#302d49" />
      <Rect x={px(107)} y={px(50)} width={px(14)} height={px(51)} color="#18172b" />
      <Circle cx={px(109)} cy={px(77)} r={px(1.2)} color="#f1d75c" />
      <Circle cx={px(64)} cy={px(42)} r={px(8)} color="rgba(91,238,255,0.08)" />
      <Circle cx={px(64)} cy={px(42)} r={px(5)} color="#2b2945" />
      <Rect x={px(63.5)} y={px(38)} width={px(1)} height={px(5)} color="#e8d26e" />
      <Rect x={px(64)} y={px(42)} width={px(pulse === 0 ? 4 : 3)} height={px(1)} color="#7ae9ff" />
      <RoundedRect x={px(27)} y={px(100)} width={px(74)} height={px(4)} r={px(2)} color="rgba(91,238,255,0.10)" />
      {hauntedSession && <HauntedPlayerReadability x={px(playerX)} y={px(playerY)} px={px} />}
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
