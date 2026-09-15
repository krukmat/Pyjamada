import React from 'react';
import { Circle, Rect, RoundedRect } from '@shopify/react-native-skia';
import {
  HAUNTED_STAGE_RULES,
  HAUNTED_STAGE_TOKENS,
  hauntedEdgeAlpha,
  hauntedWashAlpha,
} from './HauntedStageLanguage';

type Px = (value: number) => number;

export function HauntedStageTreatment({ px, pressure }: { px: Px; pressure: number }) {
  const washAlpha = hauntedWashAlpha(pressure);
  const edgeAlpha = hauntedEdgeAlpha(pressure);
  const atmosphere = HAUNTED_STAGE_TOKENS.atmosphere;

  return (
    <>
      <Rect x={px(-20)} y={0} width={px(168)} height={px(128)} color={`rgba(${atmosphere.washRgb},${washAlpha})`} />
      <Rect x={px(-20)} y={0} width={px(34)} height={px(128)} color={`rgba(${atmosphere.edgeLeftRgb},${edgeAlpha})`} />
      <Rect x={px(116)} y={0} width={px(32)} height={px(128)} color={`rgba(${atmosphere.edgeRightRgb},${edgeAlpha})`} />
      <Rect x={px(-20)} y={px(91)} width={px(168)} height={px(37)} color={atmosphere.floorShade} />
      <Circle
        cx={px(HAUNTED_STAGE_RULES.coldWindowX)}
        cy={px(HAUNTED_STAGE_RULES.coldWindowY)}
        r={px(HAUNTED_STAGE_RULES.coldWindowRadius)}
        color={atmosphere.coldWindowGlow}
      />
      <Circle
        cx={px(HAUNTED_STAGE_RULES.coldWindowX)}
        cy={px(HAUNTED_STAGE_RULES.coldWindowY)}
        r={px(20)}
        color={atmosphere.coldWindowInnerGlow}
      />
      <RoundedRect
        x={px(HAUNTED_STAGE_RULES.exitLaneStartX)}
        y={px(101)}
        width={px(HAUNTED_STAGE_RULES.exitLaneWidth)}
        height={px(4)}
        r={px(2)}
        color={atmosphere.exitLaneGlow}
      />
    </>
  );
}

export function HauntedPlayerReadability({ x, y, px }: { x: number; y: number; px: Px }) {
  const player = HAUNTED_STAGE_TOKENS.player;
  return (
    <>
      <Circle
        cx={x}
        cy={y - px(HAUNTED_STAGE_RULES.playerBackingYOffset)}
        r={px(HAUNTED_STAGE_RULES.playerBackingRadius)}
        color={player.backing}
      />
      <Circle
        cx={x}
        cy={y - px(HAUNTED_STAGE_RULES.playerBackingYOffset)}
        r={px(13)}
        color={player.warmRim}
      />
      <RoundedRect
        x={x - px(HAUNTED_STAGE_RULES.playerShadowWidth / 2)}
        y={y - px(2)}
        width={px(HAUNTED_STAGE_RULES.playerShadowWidth)}
        height={px(4)}
        r={px(2)}
        color={player.groundShadow}
      />
      <RoundedRect x={x - px(6)} y={y - px(1)} width={px(12)} height={px(2)} r={px(1)} color={player.groundAccent} />
    </>
  );
}

export function HauntedHitFeedback({ x, y, px, pulse }: { x: number; y: number; px: Px; pulse: number }) {
  const hit = HAUNTED_STAGE_TOKENS.hit;
  const reach = pulse === 0 ? 8 : 10;
  return (
    <>
      <Circle cx={x} cy={y} r={px(pulse === 0 ? 7 : 9)} color={hit.glow} />
      <Rect x={x - px(reach)} y={y - px(1)} width={px(4)} height={px(2)} color={hit.horizontalWarm} />
      <Rect x={x + px(reach - 4)} y={y - px(1)} width={px(4)} height={px(2)} color={hit.horizontalCold} />
      <Rect x={x - px(1)} y={y - px(reach)} width={px(2)} height={px(4)} color={hit.verticalDanger} />
      <Rect x={x - px(1)} y={y + px(reach - 4)} width={px(2)} height={px(4)} color={hit.verticalWarm} />
      <Rect x={x - px(6)} y={y - px(7)} width={px(2)} height={px(2)} color={hit.verticalWarm} />
      <Rect x={x + px(5)} y={y + px(5)} width={px(2)} height={px(2)} color={hit.horizontalCold} />
    </>
  );
}

export function HauntedExitDoor({ px, ready, pulse }: { px: Px; ready: boolean; pulse: number }) {
  const exit = HAUNTED_STAGE_TOKENS.exit;
  const glowAlpha = ready ? (pulse === 0 ? 0.18 : 0.32) : 0.06;
  return (
    <>
      <RoundedRect x={px(111)} y={px(68)} width={px(15)} height={px(37)} r={px(1.5)} color={ready ? exit.frameReady : exit.frameIdle} />
      <Rect x={px(114)} y={px(72)} width={px(9)} height={px(31)} color={ready ? exit.panelReady : exit.panelIdle} />
      <Rect x={px(116)} y={px(75)} width={px(5)} height={px(25)} color={ready ? exit.coreReady : exit.coreIdle} opacity={ready ? 0.35 : 0.18} />
      <Circle cx={px(121)} cy={px(88)} r={px(1)} color={ready ? exit.knobReady : exit.knobIdle} />
      <RoundedRect
        x={px(109)}
        y={px(102)}
        width={px(19)}
        height={px(4)}
        r={px(2)}
        color={`rgba(91,238,255,${glowAlpha})`}
      />
    </>
  );
}
