export type InteractionRequest = {
  roomId: string;
  playerX: number;
  kind: 'proximity' | 'action';
};

export type InteractionTarget = {
  id: string;
  roomId: string;
  x: number;
  radius?: number;
  actionMinX?: number;
  actionMaxX?: number;
  tags: readonly string[];
};

export function canReachInteraction(request: InteractionRequest, target: InteractionTarget): boolean {
  if (request.roomId !== target.roomId) return false;
  if (request.kind === 'proximity') {
    return typeof target.radius === 'number' && Math.abs(request.playerX - target.x) <= target.radius;
  }
  return typeof target.actionMinX === 'number'
    && typeof target.actionMaxX === 'number'
    && request.playerX >= target.actionMinX
    && request.playerX <= target.actionMaxX;
}
