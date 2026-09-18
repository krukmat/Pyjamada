import {
  createAdventureState,
  markRoomInspected,
  markRoomInteraction,
  setRoomSwitch,
  setStoryFlag,
  type AdventureState,
  type RoomId,
  type StoryFlag,
} from './AdventureState';
import { transitionAdventure, type AdventureTransitionResult } from './RoomRegistry';

export class AdventureSessionCoordinator {
  private state: AdventureState;

  constructor(initialState: AdventureState = createAdventureState()) {
    this.state = initialState;
  }

  snapshot(): AdventureState {
    return this.state;
  }

  restore(state: AdventureState): AdventureState {
    this.state = state;
    return this.state;
  }

  transition(targetRoom: RoomId, targetEntry: string): AdventureTransitionResult {
    const result = transitionAdventure(this.state, targetRoom, targetEntry);
    if (result.status === 'ok') this.state = result.state;
    return result;
  }

  setStoryFlag(flag: StoryFlag, value = true): AdventureState {
    this.state = setStoryFlag(this.state, flag, value);
    return this.state;
  }

  markInspected(roomId: RoomId, anomalyId: string): AdventureState {
    this.state = markRoomInspected(this.state, roomId, anomalyId);
    return this.state;
  }

  markInteraction(roomId: RoomId, interactionId: string): AdventureState {
    this.state = markRoomInteraction(this.state, roomId, interactionId);
    return this.state;
  }

  setRoomSwitch(roomId: RoomId, switchId: string, value: boolean): AdventureState {
    this.state = setRoomSwitch(this.state, roomId, switchId, value);
    return this.state;
  }
}
