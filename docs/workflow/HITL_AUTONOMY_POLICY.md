# Human-in-the-Loop Autonomy Policy

This policy states when work may proceed and when explicit human approval is
required. It does not grant permission beyond the user's request.

## Approval boundary

Read-only inspection, diagnosis, planning, and scoring do not require approval.
Writing is allowed only inside the task scope authorized by the user and the
repository sandbox.

| Final RRI | Default autonomy gate |
|---|---|
| 0–25 Low | A clear user request authorizes bounded implementation; no extra card |
| 26–40 Moderate | Present a compact card and wait, unless the current request already authorizes the exact bounded implementation; record that authorization |
| 41–55 High | Present after the 1st Reviewer passes; wait for explicit approval; require an independent 2nd Reviewer before closure |
| 56–70 Complex | Decompose first; human approves the plan/subtask; both reviewers gate executable work |
| 71–85 Critical | Decompose; both reviewers plus human approval/diff review per executable boundary |
| 86–100 Extreme | 1st Reviewer checks decomposition; no aggregate implementation or 2nd review |

An explicit instruction such as “implement this bounded change and do not ask
again” may waive the ordinary 26–55 presentation checkpoint. It does not waive
the always-approval actions below, scope limits, required review, decomposition,
or verification.

## Always requires explicit approval

Ask immediately before the action, even when an implementation card was already
approved:

- deleting or overwriting user data or material files when the exact target was
  not explicitly requested;
- committing, pushing, publishing, deploying, opening/merging a PR, or writing
  to an external system;
- installing or upgrading dependencies, SDKs, native toolchains, or plugins;
- schema/save-format migration that can make existing persisted data unreadable;
- handling or exposing secrets, credentials, private data, or permissions;
- paid operations or actions with material real-world consequences.

Safe, reversible file edits inside the repository are not “overwriting” for this
rule when they are the clearly requested implementation and user changes are
preserved.

## Scope change and reapproval

Stop, update the RRI, and request renewed approval when the implementation would:

- add an unapproved product behavior or dependency;
- cross a new architecture or persistence boundary;
- activate a higher risk floor;
- materially expand allowed paths;
- turn a reversible operation into an irreversible or outward-facing one.

Small test fixtures, type fixes, and documentation sync required by the approved
acceptance criteria do not need reapproval when they stay inside the stated
boundary and do not activate a new risk.

## Review authority

Model review and automated checks advise; they never supply human approval.
Likewise, human approval does not replace tests or an independent review required
by the RRI band.

If a required reviewer is unavailable, report the missing gate. A human may
perform the independent review or explicitly waive that review for the bounded
task, but the waiver must be recorded and may not fabricate a `PASS`.

A Low task delegated to a local developer requires a fresh 1st Reviewer for its
task analysis and a separately resolved fresh 2nd Reviewer for its solution.
Use the workflow guide's fixed local bindings. Both must pass; no role may fill
or waive another, and cloud substitution requires explicit rerouting.

## Approval wording

End a required card with:

`Execution has not started. Approve this task to proceed.`

If the current request already supplies a valid bounded authorization, state:

`Authorization: current user request; no additional checkpoint required.`
