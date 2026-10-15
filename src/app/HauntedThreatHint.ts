/**
 * On-screen advice while Ghosts hunt Wally in the haunted bedroom. Ghosts
 * cannot be outrun or jumped, so the hint names the one answer that works:
 * turn toward the Ghost (Dream Sparks fly the way Wally faces) and ATTACK.
 */
export function activeGhostHint(activeGhosts: number): string | undefined {
  if (activeGhosts <= 0) return undefined;
  return activeGhosts === 1 ? 'Ghost! Face it and tap ATTACK.' : `${activeGhosts} ghosts! Face one, tap ATTACK.`;
}
