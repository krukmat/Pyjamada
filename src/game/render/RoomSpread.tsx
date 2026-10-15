import React from 'react';
import { Group } from '@shopify/react-native-skia';
import { spreadX } from './StageViewport';

/**
 * Draws furniture authored in world units at its spread position: the piece
 * keeps its size and shape, anchored at world x `at` (usually the matching
 * interaction's x), so it lines up with where gameplay places it.
 */
export function Spread({ at, px, children }: { at: number; px: (value: number) => number; children: React.ReactNode }) {
  return <Group transform={[{ translateX: px(spreadX(at) - at) }]}>{children}</Group>;
}
