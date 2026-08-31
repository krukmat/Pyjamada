# Pyjamada — Systemic Gameplay Plan

Status: **PROPOSED / NOT YET APPROVED FOR IMPLEMENTATION**  
Baseline: **V1.1 / v0.6.0**  
Target experiment: **Systemic Room Prototype**

## 1. Decision

Pyjamada should evolve from a small deterministic adventure slice into a **systemic domestic comedy** without discarding the architecture already proven in V1.1.

The design combines two principles:

- **Talking Tom principle:** Wally and the house are the engagement surface. Interactions are valuable because Wally visibly reacts and the player becomes curious about what each object does.
- **Hill Climb Racing principle:** very simple input produces depth through reusable rules, resource pressure, risk/reward and the feeling of “I almost had it — one more try”.

Pyjamada's own identity remains:

> **Wally tries to complete an ordinary domestic task; simple actions combine into increasingly absurd consequences.**

This is **not** a plan to clone either reference and **not** a plan to migrate engines.

## 2. Architectural decision

Keep the current stack:

- React Native / Expo = application shell
- TypeScript = game rules
- Skia = rendering
- AsyncStorage adapters = persistence
- Maestro + deterministic TypeScript tests = validation

The existing separation is an asset and should be extended rather than replaced.

### Important constraint

The current `GameRuntime` is input-step driven. The first systemic prototype should **not introduce a real-time fixed-step loop** unless testing proves it is necessary.

For the prototype:

- `time` is a deterministic logical resource consumed by actions;
- `energy` and `noise` are deterministic state values;
- Wally state changes are event/rule driven;
- all rules remain testable without React, Skia, timers or Android runtime dependencies.

This keeps the experiment small and preserves reproducibility.

## 3. Product hypothesis to validate

The prototype is successful only if the same small room can generate multiple understandable stories and the player wants to retry voluntarily.

The target player reaction is:

1. **Curiosity:** “What happens if I touch/use that?”
2. **Causality:** “I understand why that happened.”
3. **Near miss:** “I know what I would change next time.”
4. **Retry:** “One more run.”

The project should not expand to more rooms, monetization or live-ops until this is demonstrated.

## 4. Prototype scope

### In scope

- 1 room: Bedroom
- 1 short objective: **Find the keys and get ready to leave**
- existing left/right/action input model
- 4 systemic dimensions:
  - logical Time
  - Energy
  - Noise
  - Wally state
- 6 interactable objects
- 8–10 reusable rules
- at least 3 materially different successful/failing run patterns
- deterministic restart
- immediate consequence feedback
- tests for rule interaction and run outcomes
- Android playable validation using the existing toolchain

### Initial objects

1. Bed
2. Alarm clock
3. Wardrobe
4. Slippers
5. Window
6. Keys

These objects are deliberately mundane. The depth must come from their relationships, not content volume.

### Initial Wally states

Keep the first set intentionally small:

- `sleepy`
- `normal`
- `rushed`
- `startled`

Do not support arbitrary state stacking in the first prototype. One primary Wally state is enough to validate the model.

### Explicitly out of scope

- Unity/Godot migration
- real-time physics
- multiplayer
- backend/cloud accounts
- procedural generation
- large inventory/crafting
- hunger/hygiene/happiness simulation
- skill trees
- multiple currencies
- ads / IAP
- daily rewards / live ops
- additional rooms before the prototype gate
- final art/audio fidelity
- iOS

## 5. Target core loop

```text
RUN START
  ↓
Short objective
  ↓
Move / interact
  ↓
Immediate Wally reaction
  ↓
Action changes Time / Energy / Noise / Wally state
  ↓
Generic rules evaluate consequences
  ↓
World state changes
  ↓
Player adapts
  ↓
Success / near-miss / comic failure
  ↓
Restart
```

The prototype must make **playing badly interesting**, not merely punish the player.

## 6. Target domain shape

The exact implementation may vary, but responsibilities should converge toward the following structure:

```text
src/game/
├── core/
│   ├── GameState.ts
│   ├── GameRuntime.ts
│   ├── InteractionEngine.ts
│   ├── RuleEngine.ts
│   ├── ObjectiveEngine.ts
│   └── RunEngine.ts
├── content/
│   ├── objects.ts
│   ├── rules.ts
│   └── objectives.ts
├── render/
├── ports/
└── usecases/
```

### State model direction

`GameState` should evolve additively toward concepts equivalent to:

```ts
type SystemState = {
  timeSpent: number;
  energy: number;
  noise: number;
  wallyState: 'sleepy' | 'normal' | 'rushed' | 'startled';
  objectStates: Record<string, string>;
  equipped: readonly string[];
  objective: {
    id: string;
    status: 'active' | 'completed' | 'failed';
  };
};
```

This is a direction, not a required exact schema.

### Content model direction

Objects and rules should be declarative enough that adding a new object does not normally require a new branch in `GameRuntime`.

Example concept:

```ts
{
  id: 'alarm-clock',
  tags: ['noise-source', 'wake-up'],
  interaction: {
    timeCost: 1,
    energyDelta: 0,
    noiseDelta: 20,
  }
}
```

Rules operate on state/tags/events, for example:

```text
Repeated alarm use + sleepy -> startled
High noise + rushed -> additional time penalty
Slippers equipped -> movement noise reduced
Bed interaction -> energy rises but time cost is high
```

Avoid object-specific `if/else` chains when the rule can be generalized.

## 7. Implementation backlog

Tasks are ordered. A later phase must not start merely because implementation is possible; each phase has a gate.

---

## Phase 0 — Protect the baseline

### SG-00 — Freeze V1.1 regression baseline

**Goal**  
Ensure the existing three-room vertical slice remains reproducible while systemic work begins.

**Tasks**

- Preserve current `test:v1` behavior as the regression baseline.
- Record the current Android screenshot flow as reference evidence.
- Do not remove the current key/door/room progression while the prototype is unvalidated.

**Acceptance**

- `npm run typecheck` passes.
- `npm run test:v1` passes unchanged before systemic implementation starts.
- Current release APK flow remains reproducible.

**Why first**  
The systemic experiment must be reversible.

---

## Phase 1 — Create the systemic seam without changing gameplay

### SG-01 — Introduce typed interaction/result primitives

**Goal**  
Separate “player requested an interaction” from hard-coded object behavior.

**Tasks**

- Define domain primitives for interaction requests/results.
- Standardize emitted gameplay events.
- Keep the current key pickup / door unlock behavior functionally identical.

**Acceptance**

- Existing CU-03 tests still pass.
- No React/Skia/AsyncStorage imports enter the core interaction layer.
- Current bedroom key/door sequence is behaviorally unchanged.

### SG-02 — Extract object definitions from runtime constants

**Goal**  
Move object identity and interaction metadata toward data-driven content.

**Tasks**

- Define typed `GameObjectDefinition` and object IDs.
- Represent current bedroom key and door as definitions where practical.
- Introduce tags only where they already provide real reuse; do not invent a large taxonomy.

**Acceptance**

- `GameRuntime` contains less object-specific configuration than before.
- Adding a simple object definition does not require modifying rendering/application code.
- Regression suite remains green.

### Phase 1 gate

Proceed only if the existing V1.1 behavior is preserved and the new abstractions make the runtime simpler rather than more indirect.

---

## Phase 2 — Build the minimum systemic engine

### SG-03 — Add deterministic run resources

**Goal**  
Introduce the Hill-Climb-style pressure layer without adding wall-clock complexity.

**Tasks**

- Add logical `timeSpent`.
- Add `energy` with bounded range.
- Add `noise` with bounded range.
- Define resource mutation helpers and invariants.
- Update save codec/versioning safely.

**Acceptance**

- Resource updates are deterministic.
- Invalid values cannot be persisted.
- Save compatibility is explicitly handled: migrate, reject with reason, or isolate prototype saves. Never silently corrupt V1 saves.
- Tests cover bounds and rapid repeated actions.

### SG-04 — Add Wally state machine

**Goal**  
Make Wally's personality mechanically relevant.

**Tasks**

- Add the four prototype states.
- Define explicit transitions.
- Ensure every state changes at least one gameplay rule, not only visuals.
- Emit state-change events for presentation feedback.

**Acceptance**

- State transitions are deterministic and covered by tests.
- No more than one primary state is active.
- Each state has a documented mechanical effect.

### SG-05 — Implement minimal RuleEngine

**Goal**  
Produce consequences from reusable rules instead of scripted chains.

**Tasks**

- Define rule predicate + effect model.
- Evaluate rules from domain events/state changes.
- Prevent infinite rule recursion / repeated self-trigger loops.
- Add an inspectable rule trace for tests/debugging.

**Acceptance**

- At least one rule is reused by more than one interaction/object.
- Rule ordering is explicit and deterministic.
- A test can explain the complete causal chain for an outcome.
- Core remains framework-independent.

### SG-06 — Implement Objective/Run lifecycle

**Goal**  
Create a repeatable short-run structure.

**Tasks**

- Define objective start/completion/failure.
- Implement deterministic `restartRun`.
- Separate run-local state from persistent progression.
- Define the first objective: find keys + satisfy leave-ready condition.

**Acceptance**

- A run can complete, fail and restart without restarting the app.
- Restart restores the defined run baseline exactly.
- Objective logic is testable without UI.

### Phase 2 gate

Do not add content volume until a headless test can execute a complete run and provide an understandable causal trace.

---

## Phase 3 — Systemic Bedroom Prototype

### SG-07 — Implement six bedroom objects

**Goal**  
Create the smallest content set capable of demonstrating combinatorial behavior.

**Object intent**

- **Bed:** trade time for energy / reduce sleepiness.
- **Alarm clock:** fast wake-up at a noise cost; repeated use can startle Wally.
- **Wardrobe:** required preparation interaction; can cost time/energy/noise depending on Wally state.
- **Slippers:** equipment that changes movement/noise behavior.
- **Window:** optional curiosity interaction that changes environmental rule conditions.
- **Keys:** objective object whose accessibility/collection is affected by run decisions.

**Acceptance**

- All six objects use the common interaction path.
- Object-specific behavior is mostly expressed through definitions/rules rather than runtime branches.
- Every object has immediate visible/debuggable feedback.

### SG-08 — Author 8–10 prototype rules

**Goal**  
Create emergence from a small rule set.

Rules should cover these categories:

- resource trade-off;
- equipment modifier;
- state-dependent consequence;
- noise threshold consequence;
- repeated interaction consequence;
- environment modifier;
- objective-related consequence.

**Acceptance**

- At least 60% of rules are reusable beyond one exact object/action pair.
- At least three rule chains contain two or more causal steps.
- No rule exists solely to fake a pre-scripted “emergent” scene unless clearly marked as a special gag.

### SG-09 — Add consequence-first HUD/feedback

**Goal**  
Make causality obvious on a phone screen.

**Tasks**

- Surface Time / Energy / Noise compactly.
- Surface Wally's current state.
- Show immediate deltas after meaningful actions.
- Use simple animation/text/haptics only where they reinforce cause/effect.

**Acceptance**

- Player does not need a stats/settings screen during a run.
- A tester can explain why a major consequence occurred.
- HUD does not obscure the 128×128 gameplay area excessively.

### SG-10 — Add Wally reaction layer

**Goal**  
Deliver the Talking-Tom-inspired curiosity loop without requiring final art.

**Tasks**

- Map major events/states to Wally reactions.
- Support repeated-object reactions where useful.
- Use temporary geometry/animation if final assets are not approved.
- Keep reaction selection in presentation; gameplay consequence remains owned by the core.

**Acceptance**

- Major state changes are perceptible without reading logs.
- At least three optional interactions are entertaining even when they are not the optimal route.
- Removing the reaction visuals must not change simulation results.

### SG-11 — Create three canonical scenario tests

**Goal**  
Prove replayability using the same room/content.

Required scenarios:

1. **Efficient success** — low noise, acceptable time.
2. **Near miss** — understandable failure or poor result that suggests a better next attempt.
3. **Chaos run** — intentionally bad/curious play creates a funny but causally explainable chain.

**Acceptance**

- All three use the same room and object set.
- Outcomes differ because of decisions/rules, not random scripted branches.
- Each scenario produces a deterministic event/rule trace.

### Phase 3 gate — FUN GATE

Expansion is allowed only if manual play indicates all four signals:

- objective understood quickly;
- cause/effect understood;
- at least one unexpected but logical consequence appears;
- player/tester wants an immediate retry or can state a concrete next experiment.

If this gate fails, **iterate on rules and feedback; do not add rooms**.

---

## Phase 4 — Android validation and evidence

### SG-12 — Extend automated validation

**Tasks**

- Add a focused systemic test command (for example `test:systemic`).
- Keep V1 regression tests separate.
- Add Maestro coverage for start → interact → result → restart.
- Capture reproducible prototype screenshots only after gameplay stabilizes.

**Acceptance**

- Typecheck passes.
- V1 regression suite passes or any intentionally superseded assertion is explicitly documented.
- Systemic domain suite passes.
- Android emulator smoke remains green.

### SG-13 — Add lightweight local telemetry

**Goal**  
Measure prototype behavior before adding external analytics SDKs.

Capture at minimum:

- run started/completed/failed/restarted;
- object interactions;
- rule triggers;
- run duration in logical time and wall-clock observation if available at shell level;
- number of retries;
- first meaningful action;
- chaos/near-miss outcome markers.

**Acceptance**

- Telemetry implementation does not couple the domain to Firebase/Google SDKs.
- It can be disabled/replaced through an interface/adapter.
- Debug output can reconstruct a test run.

### SG-14 — Execute small playtest protocol

**Initial qualitative gate**

Use a small set of external testers before any broad beta.

Observe rather than explain:

- first object touched;
- time to understand objective;
- whether the player experiments;
- whether cause/effect is understood;
- whether the player retries without prompting;
- what they say they would try next.

Primary qualitative success condition:

> After a run, the player can name a concrete alternative strategy or interaction they want to try next.

---

## Phase 5 — Conditional expansion only

This phase is **not pre-approved** by this plan.

If the Systemic Room Prototype passes the fun gate, evaluate:

- second room (Bathroom preferred because `wet/slippery` rules create high reuse);
- 4–6 additional generic rules rather than large scripted content;
- persistent discovery notebook;
- cosmetic progression;
- mode split between timed Routine and untimed Chaos/Sandbox;
- external analytics / closed testing;
- monetization only after retention evidence.

Do not add monetization as part of the first systemic implementation cycle.

## 8. Recommended execution order

```text
SG-00 baseline
  ↓
SG-01 interaction seam
  ↓
SG-02 object definitions
  ↓
SG-03 resources
  ↓
SG-04 Wally state
  ↓
SG-05 rule engine
  ↓
SG-06 run/objective lifecycle
  ↓
HEADLESS SYSTEM GATE
  ↓
SG-07 objects + SG-08 rules
  ↓
SG-09 HUD + SG-10 reactions
  ↓
SG-11 canonical scenarios
  ↓
FUN GATE
  ↓
SG-12 Android automation
  ↓
SG-13 telemetry
  ↓
SG-14 playtest
  ↓
GO / ITERATE / STOP
```

## 9. Engineering guardrails

1. **Preserve determinism.** Randomness is unnecessary for the first prototype.
2. **No React-owned gameplay rules.** React renders/dispatches; TypeScript core decides.
3. **No Skia-owned rules.** Rendering must remain a projection of state/events.
4. **No external analytics dependency in the domain.** Use a port/event sink if needed.
5. **Prefer rule reuse over content count.** Six useful objects beat twenty scripted props.
6. **Avoid premature generic engines.** Build only abstractions required by at least two real cases.
7. **Maintain causal explainability.** Every meaningful outcome should be traceable to action → event → rule → effect.
8. **Protect save compatibility.** State schema changes require an explicit strategy.
9. **Do not broaden scope after a technical success.** Expansion requires the fun gate, not merely green tests.
10. **Final art is not a prerequisite for gameplay validation.** Temporary visuals are acceptable while validating the system.

## 10. Definition of prototype success

The first systemic cycle is complete when:

- one bedroom is genuinely replayable;
- six objects participate in a common interaction model;
- 8–10 rules create multiple causal chains;
- Time/Energy/Noise/Wally state materially influence decisions;
- three deterministic scenario tests demonstrate different outcomes;
- the current architecture remains framework-separated;
- Android execution remains healthy;
- a player can understand why they failed;
- a player wants to retry or can immediately state what they want to try next.

The goal is **not more Pyjamada content**.

The goal is to prove that a very small Pyjamada space can produce:

> **“I touched it because I was curious; it caused a ridiculous problem; I understand why; now I want to try again.”**

## 11. Approval boundary

Creating this document does **not** authorize implementation.

Before SG-00 or any code/configuration/test change begins, obtain explicit repository-owner approval for the systemic gameplay cycle.
