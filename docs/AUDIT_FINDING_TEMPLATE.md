# Audit Finding Template

Use one block per finding. Keep evidence concrete and separate observation from recommendation.

```md
## FINDING-XXX — Short title

- Severity: Critical | High | Medium | Low
- Area: gameplay | presentation | rendering | performance | UX | persistence | tests | tooling | docs | assets
- Status: open | resolved | accepted-debt | follow-up | not-a-defect
- Recommended disposition: fix-before-merge | accept-debt | follow-up-issue | not-a-defect

### Observation
What was observed. Avoid speculation here.

### Evidence
- file/path + relevant symbol/line
- reproduction/test command
- device/build context when performance/visual

### Impact
What can break or degrade if left unchanged.

### Recommendation
Smallest appropriate correction or decision.

### Resolution / owner decision
Filled after triage. Include commit/issue link if applicable.
```

## Triage rule

Critical/High findings should block merge until resolved or explicitly rejected as not-a-defect by the audit group. Medium findings require a recorded disposition. Low findings may be batched as cleanup when they do not obscure the reviewed architecture.
