# Task Brief and Compact Approval Card

Use blocks 1–3 for every staged task, including Low. Add 4–6 when HITL requires
a decision; link oversized definitions and RRI evidence.

## 1. Decision

`<ID or short name> | <status> | RRI <score> <band> | Effort <S/M/L/XL> | <approval gate>`

| Route | Resolved value |
|---|---|
| Orchestrator | `<responsible context>` |
| Capability route | `<model>/<reasoning effort> — short rationale>` |
| Primary execution | `<primary agent | local model developer | repository tooling | device/GUI | external service>` |
| Local developer | `<eligible | ineligible | unavailable> — <model/adapter if resolved> — <reason>` |
| Required environment | `<project commands, runtime/service readiness, device or n/a>` |
| 1st Reviewer — task analysis | `<model/human, fresh context, required/optional/n/a>` |
| 2nd Reviewer — solution | `<model/human, separate fresh context, required/optional/n/a>` |
| Escalation | `<capability trigger -> route; operational trigger -> equivalent route/pause>` |
| RRI evidence | `<base, modifiers, floors, dominant drivers, artifact>` |

For Low local delegation, resolve the placeholders literally as: Author
`devstral-small-2:24b-instruct-2512-q4_K_M`; 1st Reviewer
`gemma4:26b-a4b-it-qat`; 2nd Reviewer `gpt-oss:20b` with
`num_ctx=131072`. All use Ollama in separate contexts.

## 2. Scope and acceptance

- Objective: `<one sentence>`
- In scope: `<paths and behaviors>`
- Out of scope: `<explicit boundaries>`
- Acceptance:
  - `<observable success criterion>`
  - `<failure/edge criterion>`
- Evidence: `<commands and manual checks>`

## 3. Execution workflow

| Phase | Responsible | Gate/output |
|---|---|---|
| Scope and score | `<orchestrator>` | Frozen boundary + RRI evidence |
| 1st Reviewer — task analysis | `<reviewer or n/a>` | `PASS`, `REVISE`, or `BLOCKED` |
| Human approval | `<user or recorded bounded authorization>` | Scope authorization only |
| Implement | `<authoring context/model>` | In-scope candidate change |
| Verify | `<orchestrator>` | Exact project-local command/manual/device evidence |
| 2nd Reviewer — solution | `<independent reviewer or exemption>` | `PASS`, `REVISE`, or `BLOCKED` |
| Close | `<orchestrator>` | Outcome, evidence, residual risk, status sync |

```text
1st Reviewer / task analysis: <reviewer/context> - <PASS|REVISE|BLOCKED|n/a>
2nd Reviewer / solution: <reviewer/context> - <PASS|REVISE|BLOCKED|n/a>
```

For a local-model handoff, also record exact allowed paths, supplied context,
expected patch format and fallback if the adapter/model is unavailable. Both
reviewers are mandatory when the local developer authors a Low task, and the
local author cannot fill either role. Cloud is not an implicit Low fallback;
record `unavailable` and pause for rerouting. For ineligibility, state why.

## 4. Diagrams (approval card only)

Add a compact workflow or technical-boundary diagram only when it makes a
multi-step route, dependency direction, or state boundary materially easier to
approve. Never add more than two.

## 5. References (approval card only)

`Task: <path> | Plan: <path> | Governing: <only material docs>`

## 6. Approval (approval card only)

`Execution has not started. Approve this task to proceed.`

When a precise current request already authorizes the bounded task and the HITL
policy permits it, replace the line with:

`Authorization: current user request; no additional checkpoint required.`
