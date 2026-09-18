# W7 — Ending / Cohesion

## Status

**CLOSED — T0–T9 COMPLETE**

W6 is closed at the persisted `laboratory-encounter-complete` boundary.

## Product goal

Finish the playable adventure without introducing a new room, save schema or generic cinematic framework.

The ending should:
- resolve the Laboratory boundary cleanly;
- return Wally to a recognizable Bedroom;
- prove the experiment physically happened;
- deliver one final non-combat Ghost sting;
- terminate in a stable credits/lifecycle state;
- remain resumable and restartable without replaying the boss.

## Final sequence

```text
RESONATOR SHUT DOWN
        ↓
fade / save boundary
        ↓
MORNING AFTER · BEDROOM
        ↓
BURNED SENSOR TAG
        ↓
CHECK THE WINDOW
        ↓
final Ghost sting
        ↓
END NIGHT
        ↓
credits / ending screen
```

## Task status

### W7-T0 — Ending contract — COMPLETE

Delivered:
- dedicated `AdventureEnding` domain module;
- derived ending phases:
  `locked -> ready -> awakening -> evidence -> ghost-sting -> complete`;
- ending progress stored in Bedroom room-local switches;
- no AdventureState or save-envelope version change;
- terminal completion is idempotent.

### W7-T1 — Post-Laboratory transition — COMPLETE

Delivered:
- completed Laboratory automatically enters the ending boundary;
- the completed Laboratory state is persisted before the fade begins;
- ending startup is separately persisted as a milestone;
- player input/combat/transient projectiles are normalized;
- no Laboratory retry/checkpoint semantics survive into the ending.

### W7-T2 — Final awakening — COMPLETE

Delivered:
- Wally returns to the production Bedroom at a stable spawn beside the bed;
- normal morning Bedroom presentation is restored instead of the altered false-escape treatment;
- Bedroom combat Ghosts are cleared;
- HP is normalized for the safe ending presentation;
- ending controls are reduced to movement + interaction.

### W7-T3 — Physical evidence payoff — COMPLETE

Delivered:
- a visible burned sensor tag remains in the Bedroom;
- explicit `BURNED SENSOR TAG` interaction;
- interaction persists the evidence milestone;
- copy confirms the Laboratory was physically real;
- no generic clue/inventory system was introduced.

### W7-T4 — Final Ghost sting — COMPLETE

Delivered:
- after the evidence, the Window becomes the next interaction;
- Window interaction reveals a small persistent Ghost face;
- no combat phase, HP damage, spawn system or new enemy behavior is reopened;
- the final beat is a visual/narrative punchline only.

### W7-T5 — Ending / credits / lifecycle — COMPLETE

Delivered:
- explicit `END NIGHT` action after the Ghost sting;
- static ending/credits screen;
- `PLAY AGAIN` creates a clean new run;
- `BACK TO MENU` preserves the completed save;
- completed saves expose `VIEW ENDING` instead of ordinary Continue semantics;
- Continue on a completed run returns directly to the ending screen;
- failed final persistence leaves the player on the Ghost-sting phase so `END NIGHT` can be retried.

### W7-T6 — Cohesion pass — COMPLETE

Delivered:
- main-menu mission card changes to `RESONATOR SHUT DOWN · NIGHT COMPLETE` for completed runs;
- Bedroom Hallway exit is hidden during the ending so the player cannot escape the sequence;
- normal Bedroom domestic interactions remain out of the Adventure interaction path;
- ending copy/objectives align with the final world state;
- no new room or broad runtime abstraction was added.

Audio note:
- the repository currently has settings for audio but no audio/music/SFX runtime or assets;
- W7 does not introduce a speculative audio subsystem solely for the ending.

### W7-T7 — Accessibility / readability — COMPLETE

Delivered:
- all ending phases have explicit text objectives in addition to visual state;
- the physical-evidence interaction has a concrete label;
- the Ghost sting is communicated by shape/placement plus text, not color alone;
- ending-screen actions use accessibility button roles and labels;
- no rapid flashing dependency was added.

### W7-T8 — Release hardening — COMPLETE

Automated coverage:
- ending remains locked before Laboratory completion;
- ending startup is idempotent;
- dirty combat/projectile/Ghost state is cleaned on awakening;
- physical evidence must precede the Ghost sting;
- Ghost sting cannot replay;
- terminal completion requires the sting;
- save envelope v3 round-trips a completed ending;
- fresh New Game contains no ending progress;
- deterministic ending screenshot states are covered;
- screenshot runner preserves the previous accepted evidence on local failure.

Repository validation:
```text
Assets                         PASS
Game/settings/presentation     PASS
Adventure ending tests         PASS
Screenshot scenario tests      PASS
Screenshot contract/runner     PASS
TypeScript                     PASS
Static architecture audit      PASS
```

### W7-T9 — Final Android acceptance — COMPLETE

Deterministic evidence is prepared:

```text
43_ending_awakening.png
44_ending_evidence.png
45_ending_ghost_sting.png
46_ending_credits.png
```

The full Android screenshot contract expects exactly **46 PNGs**.

Accepted Android evidence:
- `43_ending_awakening.png` — PASS: normal-but-not-quite-normal Bedroom, clear morning-after framing;
- `44_ending_evidence.png` — PASS: burned sensor tag remains visually discoverable and the physical-evidence payoff reads clearly;
- `45_ending_ghost_sting.png` — PASS: Ghost face is immediate, readable and clearly non-combat;
- `46_ending_credits.png` — PASS: terminal credits/lifecycle screen is legible with clear Play Again / Back to Menu actions.

The complete 46-frame Android set was produced successfully and frames 1–42 remained present.

## Current execution boundary

**W7 CLOSED. Haunted House Adventure ending/cohesion scope is complete.**
