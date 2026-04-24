---
num: "0001"
title: "AIP System: Template, Registry, and Slash Commands"
area: tools
status: completed
priority: high
effort: medium
impact: high
version: "1.0.0"
created: 2026-04-23
updated: 2026-04-24
tags: [meta, aip, template, registry, commands, github]
depends-on: []
related: ["0002", "0003"]
---

## Variables

<!-- None required — this plan documents the system itself. -->

---

## Summary

Agents and users can now create, track, and implement structured improvement plans (AIPs) using a numbered registry, a canonical plan template, and two slash commands (`/new-plan`, `/implement-plan`). This replaces ad-hoc planning scattered across conversation context with a durable, version-controlled system.

## Problem

Without a structured system, improvement ideas were proposed in conversation and lost after context compaction. There was no canonical format for capturing decisions, no stable numbering scheme, and no automated way to install plan artifacts.

- Given a good idea surfaced in chat → Expected: durable record with traceability → Actual: lost after session ends
- Given a plan with multiple tool options → Expected: explicit decision with rationale → Actual: option chosen silently, re-debated next session
- Given a completed plan with a skill/hook artifact → Expected: artifact installed consistently → Actual: manually copied, location varies

## Options

| Option | Description | Pros | Cons | Best for |
| --- | --- | --- | --- | --- |
| GitHub Issues + markdown plan files | Issues as number registry; file content in repo | Stable numbers; version history; PR review | Two-repo overhead | Durable, reviewable plans |
| Beads only | Use beads issue tracker for everything | Already integrated | Numbers unstable across sessions; no file artifacts | Ephemeral task tracking |
| Notion/Linear | External project management | Rich UI | Requires credentials; not git-native | Team PM, not agent workflows |

## Decision

GitHub Issues in a dedicated `joeblackwaslike/AIPs` repo serve as the canonical number registry — issue #N = AIP `{N:04d}`. Plan file content lives in `agent-improvement/docs/improvement-plans/`. Beads is used for implementation sub-tasks, not AIP tracking. External tools rejected as unnecessary dependencies.

## Acceptance Criteria

- [x] `docs/improvement-plans/template.md` exists with all 14 sections and frontmatter schema
- [x] `/new-plan` slash command creates a numbered plan file and opens a GH issue in `joeblackwaslike/AIPs`
- [x] `/implement-plan NNNN` reads the plan, checks requirements, installs artifacts, closes the GH issue
- [x] AIP numbers are stable: GH issue #N always equals AIP `{N:04d}`
- [x] Label taxonomy (`status/*`, `area/*`, `priority/*`) exists in the AIPs repo

## Requirements

**Already satisfied:**

- `gh` CLI authenticated with `delete_repo` scope
- `agent-improvement` repo exists on GitHub with `main` branch
- `joeblackwaslike/AIPs` repo created as public registry

**Needs action:**

- None (all requirements satisfied at time of implementation)

## Implementation

### Phase 1 — Template and commands

1. Create `docs/improvement-plans/template.md` with frontmatter schema and all 14 section stubs
2. Add `## Variables` section between frontmatter and first heading
3. Create `.claude/commands/new-plan.md` with YAML frontmatter for slash command registration
4. Create `.claude/commands/implement-plan.md` with YAML frontmatter

### Phase 2 — Registry repo

1. Create `joeblackwaslike/AIPs` repo on GitHub (public)
2. Push `README.md` and `.github/ISSUE_TEMPLATE/aip.md`
3. Create label taxonomy via `gh label create`
4. Create issue #1 (this plan), #2 (infra), #3 (web search) in order

## Artifacts

No runtime artifacts — this plan documents the system; the template and commands are the artifacts.

## Agent-Specific Considerations

- **Silent failures**: If `gh issue create` fails during `/new-plan`, the plan file exists but has no GH number — agent must surface the error, not silently continue.
- **Hallucination risks**: Issue number and plan `num` must always be derived from real GH output, never guessed.
- **Loop risk**: `/implement-plan` should not retry `gh issue edit` more than once if the issue is not found.
- **Tool unavailability**: If `gh` is unauthenticated, both commands abort with a clear error before creating any files.
- **Backwards compatibility**: Adding new plan template sections is additive; existing plan files need not be updated.

## Validation

- `ls docs/improvement-plans/` → `template.md`, `0001-aip-system.md`, `0002-planning-infrastructure.md`, `0003-web-search-and-rendering.md`
- `ls .claude/commands/` → `new-plan.md`, `implement-plan.md`
- `gh issue list --repo joeblackwaslike/AIPs` → issues #1, #2, #3 visible with correct titles
- `/new-plan test` → creates `0004-test.md`, opens GH issue #4, prompts through sections

## Rollback

Not applicable — this plan is already completed and stable. If the template or commands need revision,
create a new AIP rather than rolling back.

## Maintenance

- Update `template.md` whenever a new required section is identified — bump `updated` date
- Review label taxonomy when new areas or priorities are added
- Re-validate slash command registration after Claude Code updates that change command frontmatter format

## Open Questions

None — all questions resolved during implementation.

## References

- [AIP registry](https://github.com/joeblackwaslike/AIPs)
- [agent-improvement repo](https://github.com/joeblackwaslike/agent-improvement)
- [Google AIP format](https://google.aip.dev/1) (inspiration for numbered plan system)
