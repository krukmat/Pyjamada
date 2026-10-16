import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { keyBinding } from './KeyboardControls';
import type { ActionZoneId, DirectionZoneId } from './TouchControlZones';

type Handlers = {
  enabled: Readonly<Record<ActionZoneId, boolean>>;
  onHeldControl: (control: DirectionZoneId, pressed: boolean) => void;
  onAction: (action: ActionZoneId) => void;
};

/**
 * Web only: ←/→ (or A/D) steer, ↑/W jumps, Space/X attacks, ↓/E/Enter uses. Actions fire
 * once per key press (auto-repeat ignored), like a touch-down on the deck, and
 * held directions are released when the window loses focus or the screen goes away.
 */
export function useKeyboardControls(active: boolean, handlers: Handlers): void {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    if (Platform.OS !== 'web' || !active) return;
    const held: Record<DirectionZoneId, boolean> = { left: false, right: false };
    const setHeld = (control: DirectionZoneId, pressed: boolean) => {
      if (held[control] === pressed) return;
      held[control] = pressed;
      latest.current.onHeldControl(control, pressed);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const binding = keyBinding(event.key);
      if (!binding) return;
      // Claim the key before any focused button sees it: Space or Enter would
      // otherwise also press the MENU button after it was clicked.
      event.preventDefault();
      event.stopPropagation();
      const down = event.type === 'keydown';
      if (binding.kind === 'held') setHeld(binding.control, down);
      else if (down && !event.repeat && latest.current.enabled[binding.control]) latest.current.onAction(binding.control);
    };
    const releaseAll = () => {
      setHeld('left', false);
      setHeld('right', false);
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
      window.removeEventListener('blur', releaseAll);
      releaseAll();
    };
  }, [active]);
}
