export type HauntedHeldControl = 'left' | 'right';
export type HauntedActionControl = 'jump' | 'attack' | 'interact';

export type HauntedInputState = {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
  attackPressed: boolean;
  interactPressed: boolean;
};

export function createHauntedInputState(): HauntedInputState {
  return {
    left: false,
    right: false,
    jumpPressed: false,
    attackPressed: false,
    interactPressed: false,
  };
}

export function setHeldControl(state: HauntedInputState, control: HauntedHeldControl, pressed: boolean): HauntedInputState {
  return { ...state, [control]: pressed };
}

export function pressAction(state: HauntedInputState, control: HauntedActionControl): HauntedInputState {
  const key = `${control}Pressed` as const;
  return { ...state, [key]: true };
}

export function consumeTransientActions(state: HauntedInputState): HauntedInputState {
  if (!state.jumpPressed && !state.attackPressed && !state.interactPressed) return state;
  return {
    ...state,
    jumpPressed: false,
    attackPressed: false,
    interactPressed: false,
  };
}

export function horizontalIntent(state: HauntedInputState): -1 | 0 | 1 {
  if (state.left === state.right) return 0;
  return state.left ? -1 : 1;
}
