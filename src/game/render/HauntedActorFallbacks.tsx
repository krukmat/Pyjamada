import React from 'react';
import { Group, Rect } from '@shopify/react-native-skia';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import type { HauntedGhostState } from '../haunted/HauntedThreats';
import { selectHauntedWallyPose } from './HauntedWallyVisual';

type WallyProps = {
  session: HauntedSessionState;
  x: number;
  y: number;
  scale: number;
  honorTerminalObjective?: boolean;
};

type GhostProps = {
  ghost: HauntedGhostState;
  x: number;
  y: number;
  scale: number;
  playerX: number;
};

function scaled(scale: number, value: number): number {
  return Math.round(value * scale);
}

/**
 * Synchronous Skia fallback for Haunted Wally. The PNG atlas remains the
 * preferred renderer, but a bundled-image decode problem must never make the
 * player disappear. Coordinates intentionally mirror the 32x48 atlas anchor
 * (16, 47) so switching between fallback and atlas does not move the actor.
 */
export function HauntedWallyFallback({
  session,
  x,
  y,
  scale,
  honorTerminalObjective = true,
}: WallyProps) {
  const p = (value: number) => scaled(scale, value);
  const pose = selectHauntedWallyPose(session, { honorTerminalObjective });
  const dressed = session.domestic.flags.dressed;
  const facing = session.player.facing === 'left' ? -1 : 1;
  const jumpLift = pose === 'jump' ? p(2) : 0;
  const attackArm = pose === 'attack' ? 6 : 2;
  const hitLean = pose === 'hit' || pose === 'startled' ? -2 : 0;
  const body = dressed ? '#2f8b74' : '#2888d8';
  const bodyLight = dressed ? '#55c49f' : '#59b9f2';

  return (
    <Group transform={[{ translateX: x }, { translateY: y - jumpLift }, { scaleX: facing }]}>
      <Rect x={p(-7 + hitLean)} y={p(-31)} width={p(14)} height={p(18)} color="#11233d" />
      <Rect x={p(-6 + hitLean)} y={p(-30)} width={p(12)} height={p(17)} color={body} />
      <Rect x={p(-4 + hitLean)} y={p(-29)} width={p(5)} height={p(13)} color={bodyLight} />

      <Rect x={p(-6 + hitLean)} y={p(-42)} width={p(12)} height={p(11)} color="#efb27a" />
      <Rect x={p(-7 + hitLean)} y={p(-44)} width={p(14)} height={p(5)} color="#6b3829" />
      <Rect x={p(-5 + hitLean)} y={p(-46)} width={p(4)} height={p(3)} color="#6b3829" />
      <Rect x={p(2 + hitLean)} y={p(-45)} width={p(4)} height={p(4)} color="#6b3829" />
      <Rect x={p(2 + hitLean)} y={p(-38)} width={p(2)} height={p(2)} color="#172239" />

      <Rect x={p(-10 + hitLean)} y={p(-29)} width={p(4)} height={p(13)} color="#11233d" />
      <Rect x={p(-9 + hitLean)} y={p(-28)} width={p(3)} height={p(11)} color={body} />
      <Rect x={p(6 + hitLean)} y={p(-29)} width={p(attackArm)} height={p(4)} color="#11233d" />
      <Rect x={p(6 + hitLean)} y={p(-28)} width={p(Math.max(2, attackArm - 1))} height={p(3)} color={body} />
      {pose === 'attack' && <Rect x={p(12 + hitLean)} y={p(-29)} width={p(3)} height={p(3)} color="#ffe45c" />}

      <Rect x={p(-6)} y={p(-13)} width={p(5)} height={p(12)} color="#11233d" />
      <Rect x={p(1)} y={p(-13)} width={p(5)} height={p(12)} color="#11233d" />
      <Rect x={p(-5)} y={p(-12)} width={p(4)} height={p(10)} color={body} />
      <Rect x={p(1)} y={p(-12)} width={p(4)} height={p(10)} color={body} />
      <Rect x={p(-7)} y={p(-2)} width={p(7)} height={p(2)} color="#f4d063" />
      <Rect x={p(1)} y={p(-2)} width={p(7)} height={p(2)} color="#f4d063" />

      {!dressed && (
        <>
          <Rect x={p(-2)} y={p(-25)} width={p(2)} height={p(2)} color="#ffe45c" />
          <Rect x={p(3)} y={p(-20)} width={p(2)} height={p(2)} color="#ffe45c" />
        </>
      )}
    </Group>
  );
}

/**
 * Synchronous Haunted Ghost fallback. It deliberately keeps the same visual
 * footprint as the 32x40 atlas and remains readable in telegraph/active/dying
 * phases, so enemy gameplay never depends on asynchronous PNG decoding.
 */
export function HauntedGhostFallback({ ghost, x, y, scale, playerX }: GhostProps) {
  const p = (value: number) => scaled(scale, value);
  const facing = ghost.x <= playerX ? 1 : -1;
  const dying = ghost.phase === 'dying';
  const telegraph = ghost.phase === 'telegraph';
  const body = dying ? '#87a9bd' : '#bff7ff';
  const shade = dying ? '#53677f' : '#55cfe5';

  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scaleX: facing }]} opacity={dying ? 0.58 : telegraph ? 0.8 : 1}>
      <Rect x={p(-8)} y={p(-33)} width={p(16)} height={p(20)} color="#10223d" />
      <Rect x={p(-7)} y={p(-32)} width={p(14)} height={p(19)} color={body} />
      <Rect x={p(-5)} y={p(-29)} width={p(4)} height={p(4)} color="#18304d" />
      <Rect x={p(2)} y={p(-29)} width={p(4)} height={p(4)} color="#18304d" />
      <Rect x={p(-4)} y={p(-28)} width={p(2)} height={p(2)} color="#ffe45c" />
      <Rect x={p(3)} y={p(-28)} width={p(2)} height={p(2)} color="#ffe45c" />
      <Rect x={p(-2)} y={p(-21)} width={p(5)} height={p(2)} color={shade} />

      <Rect x={p(-12)} y={p(-27)} width={p(5)} height={p(5)} color="#10223d" />
      <Rect x={p(-11)} y={p(-26)} width={p(5)} height={p(4)} color={body} />
      <Rect x={p(7)} y={p(-25)} width={p(7)} height={p(5)} color="#10223d" />
      <Rect x={p(7)} y={p(-24)} width={p(6)} height={p(4)} color={body} />

      <Rect x={p(-7)} y={p(-13)} width={p(14)} height={p(6)} color={body} />
      <Rect x={p(-6)} y={p(-7)} width={p(5)} height={p(5)} color={shade} />
      <Rect x={p(1)} y={p(-7)} width={p(5)} height={p(4)} color={shade} />
      <Rect x={p(-3)} y={p(-3)} width={p(4)} height={p(3)} color={body} />

      {telegraph && (
        <>
          <Rect x={p(-12)} y={p(-37)} width={p(3)} height={p(3)} color="#5beeff" />
          <Rect x={p(10)} y={p(-35)} width={p(2)} height={p(2)} color="#ffe45c" />
        </>
      )}
    </Group>
  );
}
