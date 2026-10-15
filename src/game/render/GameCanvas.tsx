import React from 'react';
import { BlendColor, Canvas, Group, Paint, Rect, type SkImage } from '@shopify/react-native-skia';
import type { AdventureState, RoomId } from '../adventure/AdventureState';
import { PLAYER_GROUND_Y } from '../core/World';
import { PLAYER_HIT_RULES, type DreamSparkProjectile } from '../haunted/HauntedCombat';
import { GHOST_RULES } from '../haunted/HauntedThreats';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import type { ActiveVisualEvent } from '../presentation/PresentationRuntime';
import { resolveFxFrames, resolveScreenShake } from '../presentation/FxSystem';
import { resolveWallyVisualFrame } from '../presentation/WallyAnimator';
import type { SystemicRunState } from '../systemic/SystemicState';
import { bathroomTwinX, isBathroomTwinActive, isBathroomTwinWounded } from '../adventure/BathroomTwinHazard';
import { isBossDispelled, resolveRoomBoss } from '../adventure/RoomBossHazard';
import { RoomBossLayer, useRoomBossFx } from './RoomBossLayer';
import { getLaboratoryEncounterPhase } from '../adventure/LaboratoryEncounter';
import { HauntedEnemyLayer } from './HauntedEnemyLayer';
import { HauntedHitFeedback } from './HauntedStagePresentation';
import { HauntedWallySprite } from './HauntedWallySprite';
import { IllustratedFx } from './IllustratedFx';
import { IllustratedWally } from './IllustratedWally';
import { PixelArcadeLayer } from './PixelArcadeLayer';
import { pixelPaletteUniform } from './PixelArcadePalette';
import { PixelDreamSpark } from './PixelDreamSpark';
import { RoomPresentation } from './RoomPresentation';
import { spreadX, stageOriginX, stagePx, stageScale } from './StageViewport';
import { SCENE_TOKENS } from './VisualLanguage';

type Props = {
  state: SystemicRunState;
  width: number;
  height: number;
  activeVisualEvents: readonly ActiveVisualEvent[];
  nowMs: number;
  roomId?: RoomId;
  adventure?: AdventureState;
  playerRenderPosition?: { x: number; y: number; facing: 'left' | 'right' };
  dreamSparks?: readonly DreamSparkProjectile[];
  hauntedSession?: HauntedSessionState;
  hauntedWallyImage?: SkImage | null;
  hauntedGhostImage?: SkImage | null;
};

// Wally is drawn a little under his atlas size so the wide rooms read as rooms.
const WALLY_DRAW_SCALE = 0.8;

export function GameCanvas({
  state,
  width,
  height,
  activeVisualEvents,
  nowMs,
  roomId = 'bedroom',
  adventure,
  playerRenderPosition,
  dreamSparks = [],
  hauntedSession,
  hauntedWallyImage = null,
  hauntedGhostImage = null,
}: Props) {
  const scale = stageScale(height);
  const wallyScale = scale * WALLY_DRAW_SCALE;
  const px = (value: number) => stagePx(height, value);
  const originX = stageOriginX(width, height);
  const playerX = playerRenderPosition?.x ?? state.player.x;
  const playerY = playerRenderPosition?.y ?? PLAYER_GROUND_Y;
  const playerFacing = playerRenderPosition?.facing ?? state.player.facing;
  const legacyWally = hauntedSession ? null : resolveWallyVisualFrame(state, activeVisualEvents, nowMs);
  const exploration = adventure?.storyFlags.bedroomEscapeAttempted === true;
  const fx = exploration ? [] : resolveFxFrames(activeVisualEvents, nowMs);
  const domesticShake = exploration ? { x: 0, y: 0 } : resolveScreenShake(activeVisualEvents, nowMs);
  const impactShake = resolveCombatImpactShake(hauntedSession, nowMs);
  const roomBoss = exploration && adventure && hauntedSession ? resolveRoomBoss(adventure, hauntedSession.elapsedMs, playerX) : undefined;
  const bossFx = useRoomBossFx(
    roomBoss,
    (config) => Boolean(adventure && adventure.currentRoom === config.room && isBossDispelled(adventure, config)),
    nowMs,
  );
  const shake = {
    x: domesticShake.x + impactShake.x + bossFx.shake.x,
    y: domesticShake.y + impactShake.y + bossFx.shake.y,
  };
  const playerInvulnerable = Boolean(
    hauntedSession
    // Exploration clamps stale invulnerability when a room's threat clock stops.
    && hauntedSession.combat.invulnerableUntilMs > hauntedSession.elapsedMs,
  );
  const hitDirection = resolveHauntedHitDirection(hauntedSession, playerX, playerInvulnerable);
  const laboratoryPhase = roomId === 'laboratory' && adventure ? getLaboratoryEncounterPhase(adventure) : undefined;
  const twinActive = Boolean(adventure && isBathroomTwinActive(adventure));
  const twinFlicker = Boolean(adventure && isBathroomTwinWounded(adventure)) && Math.floor(nowMs / 90) % 3 === 0;
  const combat = Boolean(
    (hauntedSession && !exploration && hauntedSession.threats.ghosts.some((ghost) => ghost.phase !== 'dying'))
    || laboratoryPhase === 'vesper-control' || laboratoryPhase === 'resonator' || laboratoryPhase === 'nightmare'
    || twinActive
    || roomBoss !== undefined,
  );

  return (
    <Canvas style={{ width, height }}>
      <Rect x={0} y={0} width={width} height={height} color={SCENE_TOKENS.skyDeep} />
      <Group transform={[{ translateX: originX + px(shake.x) }, { translateY: px(shake.y) }]}>
        <PixelArcadeLayer block={scale} palette={pixelPaletteUniform(roomId)}>
          <RoomPresentation
            roomId={roomId}
            adventure={adventure}
            state={state}
            hauntedSession={hauntedSession}
            activeVisualEvents={activeVisualEvents}
            size={height}
            playerX={playerX}
            playerY={playerY}
            nowMs={nowMs}
            scale={scale}
            px={px}
          />
        </PixelArcadeLayer>

        <PixelArcadeLayer block={scale}>
          {!exploration && hauntedSession && (
            <HauntedEnemyLayer
              session={hauntedSession}
              ghostImage={hauntedGhostImage}
              scale={scale}
              nowMs={hauntedSession.elapsedMs}
              playerX={playerX}
              px={px}
            />
          )}

          {roomBoss && <RoomBossLayer boss={roomBoss} nowMs={nowMs} px={px} flash={bossFx.flash} />}
          {bossFx.dispelling && bossFx.dispelling.boss.config !== roomBoss?.config && (
            <RoomBossLayer boss={bossFx.dispelling.boss} nowMs={nowMs} px={px} dispelProgress={bossFx.dispelling.progress} />
          )}

          {twinActive && hauntedSession && (
            // The reflection: Wally's own pose, mirrored across the glass, tinted cyan.
            <Group opacity={twinFlicker ? 0.3 : 0.85} layer={<Paint><BlendColor color="#44d9e6" mode="modulate" /></Paint>}>
              <HauntedWallySprite
                image={hauntedWallyImage}
                session={{ ...hauntedSession, player: { ...hauntedSession.player, x: bathroomTwinX(playerX), facing: playerFacing === 'right' ? 'left' : 'right' } }}
                x={px(spreadX(bathroomTwinX(playerX)))}
                y={px(playerY)}
                scale={wallyScale}
                nowMs={nowMs}
                honorTerminalObjective={false}
                combat
              />
            </Group>
          )}
          {hauntedSession ? (
            <HauntedWallySprite
              image={hauntedWallyImage}
              session={hauntedSession}
              x={px(spreadX(playerX))}
              y={px(playerY)}
              scale={wallyScale}
              nowMs={nowMs}
              honorTerminalObjective={!exploration}
              combat={combat}
            />
          ) : legacyWally ? (
            <IllustratedWally
              state={state}
              visual={legacyWally}
              x={px(spreadX(playerX))}
              y={px(playerY)}
              scale={wallyScale}
              facing={playerFacing}
            />
          ) : null}

          {(!exploration || roomId === 'laboratory' || twinActive || roomBoss) && dreamSparks.map((projectile) => (
            <PixelDreamSpark
              key={projectile.id}
              projectile={projectile}
              x={px(spreadX(projectile.x))}
              y={px(projectile.y)}
              scale={scale}
            />
          ))}

          {fx.map((item) => (
            <IllustratedFx key={item.key} fx={item} x={px(spreadX(item.x))} y={px(item.y)} scale={scale} />
          ))}

          {playerInvulnerable && (
            <HauntedHitFeedback
              x={px(spreadX(playerX))}
              y={px(playerY - 23)}
              px={px}
              pulse={Math.floor(nowMs / 90) % 2}
              direction={hitDirection}
            />
          )}
        </PixelArcadeLayer>
      </Group>
    </Canvas>
  );
}

// A short jolt when a ghost is defeated or Wally is hit. Derived from the
// combat timers, so it is never stored and restarts cleanly.
const IMPACT_SHAKE_MS = 140;

function resolveCombatImpactShake(session: HauntedSessionState | undefined, nowMs: number): { x: number; y: number } {
  if (!session) return { x: 0, y: 0 };
  const ghostImpact = session.threats.ghosts.some(
    (ghost) => ghost.phase === 'dying' && ghost.phaseUntilMs - session.elapsedMs > GHOST_RULES.dyingMs - IMPACT_SHAKE_MS,
  );
  const playerImpact = session.combat.invulnerableUntilMs - session.elapsedMs > PLAYER_HIT_RULES.invulnerabilityMs - IMPACT_SHAKE_MS;
  if (!ghostImpact && !playerImpact) return { x: 0, y: 0 };
  const magnitude = playerImpact ? 2 : 1.5;
  const flip = Math.floor(nowMs / 35) % 2 === 0 ? 1 : -1;
  return { x: flip * magnitude, y: -flip * magnitude * 0.5 };
}

function resolveHauntedHitDirection(
  session: HauntedSessionState | undefined,
  playerX: number,
  active: boolean,
): -1 | 0 | 1 {
  if (!session || !active) return 0;
  const source = session.threats.ghosts
    .filter((ghost) => ghost.phase === 'active')
    .reduce<(typeof session.threats.ghosts)[number] | undefined>((nearest, ghost) => {
      if (!nearest) return ghost;
      return Math.abs(ghost.x - playerX) < Math.abs(nearest.x - playerX) ? ghost : nearest;
    }, undefined);
  if (!source || source.x === playerX) return 0;
  return source.x > playerX ? -1 : 1;
}
