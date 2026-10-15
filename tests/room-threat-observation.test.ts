import { equal, test } from './assert';
import { createAdventureState, setRoomSwitch } from '../src/game/adventure/AdventureState';
import { isInsideObservedDanger, observeRoomThreats, TELEGRAPHED_THREAT_KINDS } from '../src/game/adventure/RoomThreatObservation';
import { createHauntedSession } from '../src/game/haunted/HauntedSessionRuntime';
import {
  BATHROOM_TWIN_LIVE,
  explorationIn,
  isTelegraphed,
  laboratoryIn,
  measureWarningLead,
  observeAt,
  THREAT_SCENARIOS,
  THREAT_X_SAMPLES,
} from './support/ThreatScenarios';

function ok(value: unknown, message: string) { if (!value) throw new Error(message); }

void test('every exploration room threat has a scenario', () => {
  const kinds = new Set(THREAT_SCENARIOS.map(scenario => scenario.kind));
  for (const kind of [...TELEGRAPHED_THREAT_KINDS, 'bathroom-twin' as const]) ok(kinds.has(kind), `scenario for ${kind}`);
});

void test('a danger observation covers exactly the floor the hazard hit test hits', () => {
  for (const scenario of THREAT_SCENARIOS) {
    let dangerSamples = 0;
    for (let t = scenario.startMs; t < scenario.startMs + 2 * scenario.cycleMs; t += 7) {
      const observations = observeAt(scenario.adventure, t);
      ok(observations.every(observation => observation.kind === scenario.kind), `${scenario.kind}: only its own kind is observed`);
      ok(observations.every(observation => observation.minX <= observation.maxX), `${scenario.kind}: zones are well formed`);
      const hit = scenario.hit(t);
      for (const x of THREAT_X_SAMPLES) {
        for (const grounded of [true, false]) {
          const expected = hit(x, grounded);
          const observed = isInsideObservedDanger(observations, x, grounded);
          if (expected !== observed) {
            throw new Error(`${scenario.kind} at t=${t} x=${x} grounded=${grounded}: hit test ${expected}, observed danger ${observed} (${JSON.stringify(observations)})`);
          }
          if (expected) dangerSamples += 1;
        }
      }
    }
    ok(dangerSamples > 0, `${scenario.kind}: the sampled cycles include danger`);
  }
});

void test('every telegraphed danger is preceded by a warning on the same floor', () => {
  const leads: string[] = [];
  for (const scenario of THREAT_SCENARIOS) {
    if (!isTelegraphed(scenario.kind)) continue;
    const lead = measureWarningLead(scenario);
    ok(lead.onsets > 0, `${scenario.kind}: dangers start inside the sampled window`);
    equal(JSON.stringify(lead.unwarned), '[]', `${scenario.kind}: floor that turns dangerous without a warning`);
    ok(lead.minLeadMs >= 1, `${scenario.kind}: the warning is visible before the danger`);
    leads.push(`${scenario.kind} ${lead.minLeadMs}ms`);
  }
  console.log(`  shortest warning before danger: ${leads.join(', ')}`);
});

void test('floor waves are the only jumpable threats, and their fronts stay inside the charged path', () => {
  for (const scenario of THREAT_SCENARIOS) {
    const jumpable = scenario.kind === 'kitchen-surge' || scenario.kind === 'living-room-static';
    for (let t = scenario.startMs; t < scenario.startMs + scenario.cycleMs; t += 13) {
      const observations = observeAt(scenario.adventure, t);
      ok(observations.every(observation => observation.jumpable === jumpable), `${scenario.kind}: jumpable flag at t=${t}`);
      for (const danger of observations.filter(observation => observation.phase === 'danger' && jumpable)) {
        ok(observations.some(warning => warning.phase === 'warning' && warning.minX <= danger.minX && warning.maxX >= danger.maxX),
          `${scenario.kind}: wave front at t=${t} lies inside the charged path`);
      }
    }
  }
});

void test('the bathroom reflection zone is the mirror contact band and needs no telegraph', () => {
  const observations = observeAt(BATHROOM_TWIN_LIVE, 0);
  equal(observations.length, 1, 'one zone while the reflection is out');
  equal(observations[0].phase, 'danger', 'the reflection is dangerous on contact');
  equal(observations[0].minX, 60, 'contact starts 4 units left of the mirror');
  equal(observations[0].maxX, 68, 'contact ends 4 units right of the mirror');
  const confirmed = setRoomSwitch(BATHROOM_TWIN_LIVE, 'bathroom', 'mirror-route-revealed', true);
  equal(observeAt(confirmed, 0).length, 0, 'no zone once the reflected route is confirmed');
});

void test('calm rooms and the haunted bedroom run expose no threats', () => {
  equal(observeRoomThreats(createHauntedSession('calm'), createAdventureState()).length, 0, 'haunted bedroom run has no room threats');
  equal(observeAt(explorationIn('hallway'), 5_000).length, 0, 'hallway before the clock is calm');
  const unarmed = setRoomSwitch(explorationIn('kitchen'), 'kitchen', 'circuit-overloaded', true);
  equal(observeAt(unarmed, 5_000).length, 0, 'an unarmed hazard shows nothing');
  equal(observeAt(laboratoryIn('vesper-control'), 1_300).length, 0, 'the idle beat between Vesper lanes is clear');
});
