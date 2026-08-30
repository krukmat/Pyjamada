import { updateGame } from '../src/game/core/GameRuntime';
import { BEDROOM_KEY_ID, createInitialGameState, type GameState } from '../src/game/core/GameState';
import { decodeGameState, encodeGameState } from '../src/game/core/GameStateCodec';
import { deepEqual, equal, test } from './assert';

function press(state:GameState,input:'left'|'right'|'action',times=1){let current=state;for(let i=0;i<times;i++)current=updateGame(current,input).state;return current}
async function run(){
  await test('CU-03 locked bedroom door acts as collision boundary',()=>{const state=press(createInitialGameState(),'right',30);equal(state.roomId,'room-01','room');equal(state.player.x,84,'blocked x');equal(Boolean(state.flags.bedroomDoorUnlocked),false,'locked')});
  await test('CU-03 collects one item into minimal inventory',()=>{const state=press(createInitialGameState(),'right',6);equal(state.flags.bedroomKeyCollected,true,'key flag');equal(state.inventory.includes(BEDROOM_KEY_ID),true,'inventory')});
  await test('CU-03 uses inventory item to unlock door and set progression flag',()=>{let state=press(createInitialGameState(),'right',20);equal(state.player.x,84,'door approach');state=updateGame(state,'action').state;equal(state.flags.bedroomDoorUnlocked,true,'door flag');equal(state.inventory.includes(BEDROOM_KEY_ID),false,'key consumed')});
  await test('CU-03 transitions through three representative rooms',()=>{let state=press(createInitialGameState(),'right',20);state=updateGame(state,'action').state;state=press(state,'right',8);equal(state.roomId,'room-02','room 2');state=press(state,'right',26);equal(state.roomId,'room-03','room 3');equal(state.flags.verticalSliceReached,true,'slice flag')});
  await test('CU-03 persisted slice state preserves room, inventory and flags',()=>{let state=press(createInitialGameState(),'right',20);state=updateGame(state,'action').state;state=press(state,'right',8);const decoded=decodeGameState(encodeGameState(state));equal(decoded.status,'ok','decode');if(decoded.status==='ok')deepEqual(decoded.gameState,state,'persisted slice state')});
}
void run();
