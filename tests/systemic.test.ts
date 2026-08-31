import { decodeSystemicRun, encodeSystemicRun } from '../src/game/systemic/SystemicCodec';
import { SYSTEMIC_OBJECTS } from '../src/game/systemic/SystemicContent';
import { SYSTEMIC_RULE_IDS } from '../src/game/systemic/SystemicRuleEngine';
import { restartSystemicRun, updateSystemicRun } from '../src/game/systemic/SystemicRuntime';
import { createSystemicRun, type SystemicRunState } from '../src/game/systemic/SystemicState';
import { InMemorySystemicTelemetry, recordSystemicUpdate, summarizeSystemicTelemetry } from '../src/game/systemic/SystemicTelemetry';

function equal(actual: unknown, expected: unknown, label: string) { if (actual !== expected) throw new Error(`${label}: ${actual} !== ${expected}`); }
function ok(value: unknown, label: string) { if (!value) throw new Error(label); }
function step(state: SystemicRunState, input: 'left'|'right'|'action', times=1) { let s=state; for(let i=0;i<times;i++) s=updateSystemicRun(s,input).state; return s; }
function moveTo(state: SystemicRunState, x: number) { let s=state; while(s.player.x < x) s=updateSystemicRun(s,'right').state; while(s.player.x > x) s=updateSystemicRun(s,'left').state; return s; }

let state = createSystemicRun('test');
equal(SYSTEMIC_OBJECTS.length, 6, 'six objects');
equal(SYSTEMIC_RULE_IDS.length, 10, 'ten rules');

state = moveTo(state, 16);
let update = updateSystemicRun(state,'action'); state=update.state;
equal(state.wallyState, 'normal', 'bed wakes');
ok(update.ruleTrace.includes('bed-wakes-wally'),'bed causal trace');
state = moveTo(state,32); state=step(state,'action');
ok(state.equipped.includes('slippers'),'slippers equipped');
update=updateSystemicRun(state,'right'); state=update.state;
ok(update.ruleTrace.includes('slippers-quiet-step'),'equipment rule reused on movement');
state=moveTo(state,68); state=step(state,'action');
ok(state.flags.dressed,'dressed');
state=moveTo(state,88); const success=updateSystemicRun(state,'action'); state=success.state;
equal(state.objective.status,'completed','efficient success');
ok(state.noise < 40,'efficient low noise');
ok(success.events.some(e=>e.type==='OBJECTIVE_COMPLETED'),'success event');

const decoded=decodeSystemicRun(encodeSystemicRun(state)); equal(decoded.status,'ok','codec roundtrip');
equal(decodeSystemicRun(JSON.stringify({...state,noise:101})).status,'invalid','codec rejects invalid noise');
equal(decodeSystemicRun(JSON.stringify({...state,energy:35.5})).status,'invalid','codec rejects fractional resources');
equal(decodeSystemicRun(JSON.stringify({...state,equipped:['bed']})).status,'invalid','codec rejects impossible equipment');
equal(decodeSystemicRun(JSON.stringify({...state,objective:{id:'leave-ready',status:'failed'}})).status,'invalid','codec rejects failure without reason');
const impossibleComplete=createSystemicRun('impossible-complete');
equal(decodeSystemicRun(JSON.stringify({...impossibleComplete,objective:{id:'leave-ready',status:'completed'}})).status,'invalid','codec rejects completion without requirements');
const impossibleWindow=createSystemicRun('impossible-window');
equal(decodeSystemicRun(JSON.stringify({...impossibleWindow,flags:{...impossibleWindow.flags,windowOpen:true}})).status,'invalid','codec rejects inconsistent window state');

state=createSystemicRun('near-miss');
state=moveTo(state,48); state=step(state,'action');
update=updateSystemicRun(state,'action'); state=update.state;
equal(state.wallyState,'startled','repeated alarm startles');
ok(update.ruleTrace.includes('repeated-alarm-startle'),'repeated alarm causal trace');
state=moveTo(state,68); update=updateSystemicRun(state,'action'); state=update.state;
ok(update.ruleTrace.includes('startled-fumble'),'startled fumble causal trace');
while(state.objective.status==='active') state=step(state,'right');
equal(state.objective.status,'failed','near miss fails');
equal(state.objective.reason,'house-awake','near miss causal failure');

state=createSystemicRun('chaos');
state=moveTo(state,32); state=step(state,'action');
state=moveTo(state,108); state=step(state,'action');
ok(state.flags.windowOpen,'window open');
state=moveTo(state,48);
update=updateSystemicRun(state,'action'); state=update.state;
ok(update.ruleTrace.includes('open-window-echo'),'environment rule extends noisy interaction');
while(state.objective.status==='active') state=step(state,'action');
equal(state.objective.reason,'house-awake','chaos wakes house');

const restarted=restartSystemicRun(state).state;
const baseline=createSystemicRun('chaos');
equal(JSON.stringify({...restarted,lastAction:undefined}),JSON.stringify(baseline),'restart baseline');

const telemetry = new InMemorySystemicTelemetry();
telemetry.record({type:'run_started',runId:'telemetry'});
let telemetryState=createSystemicRun('telemetry');
telemetryState=moveTo(telemetryState,16);
const telemetryBefore=telemetryState;
const telemetryUpdate=updateSystemicRun(telemetryBefore,'action');
recordSystemicUpdate(telemetry,telemetryBefore,'action',telemetryUpdate,0);
let summary=summarizeSystemicTelemetry(telemetry.snapshot());
equal(summary.firstObjectId,'bed','telemetry captures first meaningful object');
equal(summary.retries,0,'telemetry retries baseline');

const nearMissTelemetry = new InMemorySystemicTelemetry();
const nearMissBefore=createSystemicRun('telemetry-near-miss');
const nearMissFailed={...nearMissBefore,noise:85,objective:{id:'leave-ready' as const,status:'failed' as const,reason:'house-awake' as const}};
recordSystemicUpdate(nearMissTelemetry,nearMissBefore,'action',{state:nearMissFailed,events:[{type:'OBJECTIVE_FAILED',reason:'house-awake'}],ruleTrace:[]},1);
summary=summarizeSystemicTelemetry(nearMissTelemetry.snapshot());
equal(summary.outcome,'near-miss','telemetry classifies non-window house-awake failure');
equal(summary.logicalTime,0,'telemetry exposes logical run duration');
equal(summary.retries,1,'telemetry exposes retry count');

const chaosTelemetry = new InMemorySystemicTelemetry();
const chaosBefore=createSystemicRun('telemetry-chaos');
const chaosFailed={...chaosBefore,noise:85,flags:{...chaosBefore.flags,windowOpen:true},objective:{id:'leave-ready' as const,status:'failed' as const,reason:'house-awake' as const}};
recordSystemicUpdate(chaosTelemetry,chaosBefore,'action',{state:chaosFailed,events:[{type:'OBJECTIVE_FAILED',reason:'house-awake'}],ruleTrace:[]},0);
summary=summarizeSystemicTelemetry(chaosTelemetry.snapshot());
equal(summary.outcome,'chaos','telemetry classifies window-amplified house-awake failure');

console.log('systemic tests passed');
