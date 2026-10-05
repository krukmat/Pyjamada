import React from 'react';
import { Rect } from '@shopify/react-native-skia';
import { VISUAL_TOKENS } from './VisualLanguage';

type Px = (value: number) => number;
type Block = readonly [x: number, y: number, width: number, height: number, color: string];

type Props = {
  px: Px;
  groundY: number;
};

const C = {
  ink: VISUAL_TOKENS.actor.outline,
  hairDeep: VISUAL_TOKENS.actor.hairDeep,
  hair: VISUAL_TOKENS.actor.hair,
  hairLight: VISUAL_TOKENS.actor.hairLight,
  skinShadow: VISUAL_TOKENS.actor.skinShadow,
  skin: VISUAL_TOKENS.actor.skin,
  skinLight: VISUAL_TOKENS.actor.skinLight,
  pajamaShadow: VISUAL_TOKENS.actor.pajamasShadow,
  pajama: VISUAL_TOKENS.actor.pajamas,
  pajamaLight: VISUAL_TOKENS.actor.pajamasLight,
  accent: VISUAL_TOKENS.actor.pajamasAccent,
  trousersShadow: VISUAL_TOKENS.actor.trousersShadow,
  trousers: VISUAL_TOKENS.actor.trousers,
  trousersLight: VISUAL_TOKENS.actor.trousersLight,
  slipper: VISUAL_TOKENS.actor.slippers,
  eye: VISUAL_TOKENS.actor.eyeWhite,
} as const;

function Sprite({ blocks, anchorX, groundY, px }: {
  blocks: readonly Block[];
  anchorX: number;
  groundY: number;
  px: Px;
}) {
  return (
    <>
      {blocks.map(([x, y, width, height, color], index) => (
        <Rect
          key={index}
          x={px(anchorX + x)}
          y={px(groundY + y)}
          width={px(width)}
          height={px(height)}
          color={color}
        />
      ))}
    </>
  );
}

// A — keeps more of the original domestic / sleepy identity. The head is
// deliberately stepped and asymmetrical so it does not read as a square icon.
const A: readonly Block[] = [
  [-7,-31,10,1,C.hairDeep],[-9,-30,14,2,C.ink],[-10,-28,16,6,C.ink],[-9,-27,14,8,C.skinShadow],
  [-8,-26,12,7,C.skin],[-7,-25,10,2,C.skinLight],
  [-9,-29,9,3,C.hair],[-7,-30,7,2,C.hairLight],[-10,-27,3,6,C.hairDeep],[3,-27,3,5,C.hairDeep],
  [-6,-23,3,1,C.ink],[1,-23,3,1,C.ink],[-5,-22,2,1,C.eye],[2,-22,1,1,C.eye],
  [-1,-21,2,1,C.skinShadow],[0,-19,3,1,C.ink],
  [-6,-18,12,2,C.ink],[-7,-16,14,8,C.ink],[-6,-16,12,7,C.pajama],
  [-5,-15,10,2,C.pajamaLight],[-2,-14,4,4,C.accent],[-1,-13,2,2,C.pajama],
  [-9,-15,3,7,C.ink],[-8,-14,2,5,C.skin], [6,-15,3,7,C.ink],[6,-14,2,5,C.skin],
  [-5,-8,4,7,C.ink],[1,-8,4,7,C.ink],[-4,-7,3,6,C.trousers],[1,-7,3,6,C.trousersLight],
  [-6,-2,6,2,C.ink],[0,-2,6,2,C.ink],[-5,-1,5,1,C.slipper],[1,-1,4,1,C.slipper],
];

// B — narrower console-era proportions, extra facial and clothing definition.
const B: readonly Block[] = [
  [-6,-32,9,1,C.hairDeep],[-8,-31,13,2,C.ink],[-9,-29,15,7,C.ink],
  [-8,-28,13,9,C.skinShadow],[-7,-27,11,8,C.skin],[-6,-26,9,2,C.skinLight],
  [-8,-30,6,4,C.hair],[-4,-31,8,3,C.hair],[2,-29,4,4,C.hairDeep],[-9,-27,2,6,C.hairDeep],
  [-5,-24,2,2,C.eye],[1,-24,2,2,C.eye],[-5,-23,2,1,C.ink],[1,-23,2,1,C.ink],
  [-1,-22,1,2,C.skinShadow],[0,-20,3,1,C.ink],
  [-5,-18,10,2,C.ink],[-6,-16,12,9,C.ink],[-5,-16,10,8,C.pajama],
  [-4,-15,8,2,C.pajamaLight],[-1,-14,2,5,C.accent],
  [-8,-15,2,7,C.ink],[-8,-13,2,4,C.skin], [6,-15,2,7,C.ink],[6,-13,2,4,C.skin],
  [-4,-7,3,6,C.ink],[1,-7,3,6,C.ink],[-3,-7,2,5,C.trousersLight],[1,-7,2,5,C.trousers],
  [-5,-2,5,2,C.ink],[0,-2,5,2,C.ink],[-4,-1,4,1,C.slipper],[1,-1,3,1,C.slipper],
  [-5,-17,2,1,C.pajamaShadow],[3,-17,2,1,C.pajamaShadow],
];

// C — compact and intentionally charming, with a strong sleepy face.
const CANDIDATE_C: readonly Block[] = [
  [-7,-29,11,1,C.hairDeep],[-9,-28,15,2,C.ink],[-10,-26,17,7,C.ink],
  [-9,-25,15,9,C.skinShadow],[-8,-25,13,8,C.skin],[-7,-24,11,2,C.skinLight],
  [-9,-27,7,4,C.hair],[-4,-28,9,3,C.hair],[-10,-24,3,5,C.hairDeep],[4,-24,3,5,C.hairDeep],
  [-6,-21,3,1,C.ink],[1,-21,3,1,C.ink],[-5,-20,2,1,C.eye],[2,-20,1,1,C.eye],
  [-1,-19,2,1,C.skinShadow],[-1,-17,4,1,C.ink],
  [-6,-16,12,2,C.ink],[-7,-14,14,8,C.ink],[-6,-14,12,7,C.pajama],
  [-5,-13,10,2,C.pajamaLight],[-2,-12,4,4,C.accent],[-1,-11,2,2,C.pajama],
  [-9,-13,3,6,C.ink],[-8,-12,2,4,C.skin], [6,-13,3,6,C.ink],[6,-12,2,4,C.skin],
  [-5,-6,4,5,C.ink],[1,-6,4,5,C.ink],[-4,-5,3,4,C.trousers],[1,-5,3,4,C.trousersLight],
  [-6,-2,6,2,C.ink],[0,-2,6,2,C.ink],[-5,-1,5,1,C.slipper],[1,-1,4,1,C.slipper],
];

export function WallyConceptVariants({ px, groundY }: Props) {
  return (
    <>
      <Sprite blocks={A} anchorX={30} groundY={groundY} px={px} />
      <Sprite blocks={B} anchorX={64} groundY={groundY} px={px} />
      <Sprite blocks={CANDIDATE_C} anchorX={98} groundY={groundY} px={px} />
    </>
  );
}
