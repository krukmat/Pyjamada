import React from 'react';
import { Circle, Rect, RoundedRect } from '@shopify/react-native-skia';
import type { EnemyVisualProfile } from './EnemyVisualProfile';
import { rgba } from './EnemyVisualProfile';

type CueProps = {
  profile: EnemyVisualProfile;
  x: number;
  y: number;
  scale: number;
  pulse: number;
};

type PresenceProps = Omit<CueProps, 'pulse'> & {
  dying?: boolean;
};

function px(scale: number, value: number): number {
  return Math.max(1, Math.round(value * scale));
}

export function EnemyPresenceCue({ profile, x, y, scale, dying = false }: PresenceProps) {
  const p = (value: number) => px(scale, value);
  const centerY = y - p(profile.centerYOffset);
  return (
    <>
      <Circle
        cx={x}
        cy={centerY}
        r={p(profile.presenceGlowRadius)}
        color={dying ? rgba(profile.secondaryRgb, 0.055) : rgba(profile.primaryRgb, 0.085)}
      />
      <RoundedRect
        x={x - p(profile.shadowWidth / 2)}
        y={y - p(3)}
        width={p(profile.shadowWidth)}
        height={p(4)}
        r={p(2)}
        color={dying ? rgba(profile.outlineRgb, 0.20) : rgba(profile.outlineRgb, 0.36)}
      />
    </>
  );
}

export function EnemyTelegraphCue({ profile, x, y, scale, pulse }: CueProps) {
  switch (profile.telegraphStyle) {
    case 'ground-spawn':
      return <GroundSpawnCue profile={profile} x={x} y={y} scale={scale} pulse={pulse} />;
    case 'bone-burst':
      return <BoneBurstCue profile={profile} x={x} y={y} scale={scale} pulse={pulse} />;
    case 'materialize':
    default:
      return <MaterializeCue profile={profile} x={x} y={y} scale={scale} pulse={pulse} />;
  }
}

function MaterializeCue({ profile, x, y, scale, pulse }: CueProps) {
  const p = (value: number) => px(scale, value);
  const centerY = y - p(profile.centerYOffset);
  const halo = pulse === 0 ? 0.17 : 0.24;
  const body = pulse === 0 ? 0.22 : 0.32;
  return (
    <>
      <Circle cx={x} cy={centerY} r={p(pulse === 0 ? profile.telegraphRadius - 2 : profile.telegraphRadius)} color={rgba(profile.primaryRgb, halo)} />
      <Circle cx={x} cy={centerY} r={p(Math.max(5, profile.telegraphRadius - 7))} color={rgba(profile.accentRgb, 0.075)} />

      <RoundedRect
        x={x - p(profile.bodyWidth / 2)}
        y={y - p(profile.centerYOffset + profile.bodyHeight - 4)}
        width={p(profile.bodyWidth)}
        height={p(profile.bodyHeight)}
        r={p(6)}
        color={rgba(profile.primaryRgb, body)}
      />
      <Rect x={x - p(7)} y={y - p(17)} width={p(5)} height={p(6)} color={rgba(profile.secondaryRgb, body)} />
      <Rect x={x - p(1)} y={y - p(17)} width={p(4)} height={p(5)} color={rgba(profile.primaryRgb, body)} />
      <Rect x={x + p(4)} y={y - p(17)} width={p(3)} height={p(4)} color={rgba(profile.secondaryRgb, body)} />
      <Rect x={x - p(11)} y={y - p(27)} width={p(4)} height={p(4)} color={rgba(profile.primaryRgb, 0.24)} />
      <Rect x={x + p(7)} y={y - p(25)} width={p(5)} height={p(4)} color={rgba(profile.primaryRgb, 0.24)} />

      <Rect x={x - p(profile.eyeOffsetX + 1)} y={centerY - p(3)} width={p(3)} height={p(3)} color={rgba(profile.accentRgb, 0.96)} />
      <Rect x={x + p(profile.eyeOffsetX - 1)} y={centerY - p(3)} width={p(3)} height={p(3)} color={rgba(profile.accentRgb, 0.96)} />

      <Rect x={x - p(profile.telegraphRadius + 2)} y={centerY - p(1)} width={p(6)} height={p(2)} color={rgba(profile.primaryRgb, 0.78)} />
      <Rect x={x + p(profile.telegraphRadius - 4)} y={centerY - p(1)} width={p(6)} height={p(2)} color={rgba(profile.accentRgb, 0.82)} />
      <Rect x={x - p(1)} y={centerY - p(profile.telegraphRadius + 2)} width={p(2)} height={p(6)} color={rgba(profile.primaryRgb, 0.82)} />
      <Rect x={x - p(1)} y={centerY + p(profile.telegraphRadius - 4)} width={p(2)} height={p(5)} color={rgba(profile.primaryRgb, 0.72)} />

      <Rect x={x - p(13)} y={y - p(39)} width={p(2)} height={p(2)} color={rgba(profile.primaryRgb, 0.90)} />
      <Rect x={x + p(11)} y={y - p(37)} width={p(2)} height={p(2)} color={rgba(profile.accentRgb, 0.90)} />
      <Rect x={x - p(15)} y={y - p(10)} width={p(2)} height={p(2)} color={rgba(profile.primaryRgb, 0.72)} />
      <Rect x={x + p(14)} y={y - p(12)} width={p(2)} height={p(2)} color={rgba(profile.primaryRgb, 0.72)} />
    </>
  );
}

function GroundSpawnCue({ profile, x, y, scale, pulse }: CueProps) {
  const p = (value: number) => px(scale, value);
  const radius = pulse === 0 ? profile.telegraphRadius - 2 : profile.telegraphRadius;
  return (
    <>
      <RoundedRect x={x - p(radius)} y={y - p(3)} width={p(radius * 2)} height={p(5)} r={p(2)} color={rgba(profile.primaryRgb, 0.20)} />
      <RoundedRect x={x - p(radius - 3)} y={y - p(2)} width={p((radius - 3) * 2)} height={p(3)} r={p(1)} color={rgba(profile.accentRgb, 0.20)} />
      <Rect x={x - p(8)} y={y - p(12)} width={p(3)} height={p(7)} color={rgba(profile.primaryRgb, 0.58)} />
      <Rect x={x - p(1)} y={y - p(16)} width={p(3)} height={p(10)} color={rgba(profile.secondaryRgb, 0.70)} />
      <Rect x={x + p(6)} y={y - p(10)} width={p(3)} height={p(5)} color={rgba(profile.accentRgb, 0.62)} />
    </>
  );
}

function BoneBurstCue({ profile, x, y, scale, pulse }: CueProps) {
  const p = (value: number) => px(scale, value);
  const centerY = y - p(profile.centerYOffset);
  const reach = pulse === 0 ? profile.telegraphRadius - 2 : profile.telegraphRadius;
  return (
    <>
      <Circle cx={x} cy={centerY} r={p(reach)} color={rgba(profile.primaryRgb, 0.10)} />
      <Rect x={x - p(reach)} y={centerY - p(1)} width={p(5)} height={p(2)} color={rgba(profile.primaryRgb, 0.80)} />
      <Rect x={x + p(reach - 5)} y={centerY - p(1)} width={p(5)} height={p(2)} color={rgba(profile.accentRgb, 0.82)} />
      <Rect x={x - p(1)} y={centerY - p(reach)} width={p(2)} height={p(5)} color={rgba(profile.primaryRgb, 0.86)} />
      <Rect x={x - p(1)} y={centerY + p(reach - 5)} width={p(2)} height={p(5)} color={rgba(profile.secondaryRgb, 0.78)} />
      <Rect x={x - p(8)} y={centerY - p(8)} width={p(4)} height={p(2)} color={rgba(profile.primaryRgb, 0.74)} />
      <Rect x={x + p(5)} y={centerY + p(6)} width={p(4)} height={p(2)} color={rgba(profile.accentRgb, 0.74)} />
    </>
  );
}
