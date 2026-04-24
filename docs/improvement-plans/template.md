---
num: "NNNN"
title: "Short descriptive title (≤60 chars)"
area: search
# area options: search | browser | memory | tools | hooks | context | performance
status: draft
# status options: draft | review | approved | in-progress | completed | rejected | deferred
priority: medium
# priority options: low | medium | high | critical
effort: medium
# effort options: small | medium | large | xlarge
impact: medium
# impact options: low | medium | high
version: "0.1.0"
# version: semver — 0.x.0 = draft, 1.0.0 = first implementation, minor = new content, major = decision change
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: []
depends-on: []
# depends-on: list of plan nums this plan depends on, e.g. ["0002", "0003"]
related: []
# related: list of related plan nums, e.g. ["0004"]
---

## Variables

<!-- Plan-specific named values. Referenced in artifact content as ${VARIABLE_NAME}.
     implement-plan substitutes these before writing each artifact.
     Example: CREDENTIALS_FILE: ~/creds.zsh -->

---

<!-- DO-NOTS — delete this block before marking status: review
  - No vague metrics ("improve performance", "better results") — every metric must be falsifiable
  - No solution-first writing — problem and options come before decision
  - No "TBD" in Acceptance Criteria — unknowns go in Open Questions
  - Options section must list ≥2 credible alternatives, not just the chosen one
  - Artifacts section must contain exact file content — no "see skill file" or "TBD"
  - Agent-Specific Considerations must not be empty
  - Rollback triggers must be quantitative ("if X% of Y fail"), not qualitative
-->

## Summary

<!-- 1–2 sentences. Outcome-first: "Users/agents can now X. This improves Z from A to B." -->

## Problem

<!-- Current behavior, why it matters, 2–3 concrete failure examples.
     Format each example as: Given [context] → Expected [outcome] → Actual [outcome] -->

## Options

<!-- Table of ≥2 credible alternatives. Include all realistic approaches.
     Especially important for: tool selection, memory architecture, model preferences,
     org/policy constraints, third-party tool preferences.
     Plan stays in draft until this section produces a clear decision. -->

| Option | Description | Pros | Cons | Best for |
| --- | --- | --- | --- | --- |
| Option A | ... | ... | ... | ... |
| Option B | ... | ... | ... | ... |

## Decision

<!-- Which option was chosen and why. Reference constraints that narrowed the space
     (existing tools, org policies, model preferences, token cost, credentials required).
     Explicitly state what was rejected and why — prevents re-debate in future sessions. -->

## Acceptance Criteria

<!-- Bulleted list of measurable, falsifiable conditions.
     Each criterion must be independently testable. No "works well" or "feels better". -->

- [ ] ...
- [ ] ...

## Requirements

<!-- Everything needed before implementation begins.
     Separate "already satisfied" from "needs action". -->

**Already satisfied:**

- ...

**Needs action:**

- ...

## Implementation

<!-- Ordered phases. Each phase: name, goal sentence, then 3–6 concrete steps.
     Steps are actions (verbs), not outcomes. -->

### Phase 1 — ...

Goal: ...

1. ...
2. ...

## Artifacts

<!-- The exact files this plan installs. This section is the source of truth —
     /implement-plan reads it and writes each artifact to its destination.
     Never leave content as "TBD" — write the complete file content.

     For each artifact:
       type: skill | command | claude-md-addition | hook | config
       destination: ~/.claude/skills/name.md  (global)
                    ~/.claude/commands/name.md (global)
                    ~/.claude/plugins/{name}/skills/name.md (CC plugin)
                    ~/.claude/CLAUDE.md (append)
-->

### Artifact 1

- type: skill
- destination: `~/.claude/skills/name.md`

```markdown
---
name: name
description: >
  One-line description of what this skill does and when to use it.
---

<!-- skill content here -->
```

## Agent-Specific Considerations

<!-- Mandatory. Cover all of:
     - Silent failures (tool returns empty/wrong result with no error)
     - Hallucination risks (when could Claude fabricate data)
     - Loop/retry risks (what could cause Claude to retry indefinitely)
     - Tool degradation (behavior when a required tool is unavailable)
     - Backwards compatibility (does this break existing behavior) -->

- **Silent failures**: ...
- **Hallucination risks**: ...
- **Loop risk**: ...
- **Tool unavailability**: ...
- **Backwards compatibility**: ...

## Validation

<!-- Specific test cases, benchmarks, or eval checks.
     Tie each check to an Acceptance Criterion above. -->

- AC1: ...
- AC2: ...

## Rollback

<!-- Quantitative trigger + exact revert procedure.
     Name the specific artifact files to delete/restore. -->

Trigger: rollback if ...% of ... fail or ...

Procedure:

1. ...

## Maintenance

<!-- Recurring tasks and monitoring. Be specific about intervals. -->

- Review ... quarterly or when ...
- Re-validate ... if ... changes

## Open Questions

<!-- Unknowns that could block or change the approach.
     Each question notes what would resolve it. -->

- Q: ... Resolved by: ...

## References

<!-- Links, papers, prior art, related plans. -->

- ...
