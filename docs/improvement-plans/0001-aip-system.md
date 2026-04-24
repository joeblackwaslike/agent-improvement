---
num: "0001"
title: "AIP System: Template, Registry, and Slash Commands"
area: tools
status: completed
priority: high
effort: medium
impact: high
version: "1.1.0"
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

Agents and users can now create, track, and implement structured improvement plans (AIPs) using a numbered registry, a canonical plan template, and two slash commands (`/new-plan`, `/implement-plan`). This replaces ad-hoc planning scattered across conversation context with a durable, version-controlled, session-portable system.

## Problem

Agent improvements were being applied ad hoc — discussed in a session, implemented inline, then forgotten after context compaction. No audit trail, no rollback procedure, no way to queue work across sessions or share rationale with future agents.

- Given a good idea surfaced in chat → Expected: durable record with traceability → Actual: lost after session ends
- Given a plan with multiple tool options → Expected: explicit decision with rationale → Actual: option chosen silently, re-debated next session
- Given a skill or CLAUDE.md block needing a revert → Expected: clear rollback procedure → Actual: no record of what was installed or why

## Options

| Option | Description | Pros | Cons | Best for |
| --- | --- | --- | --- | --- |
| Plain markdown docs | Unstructured notes in `docs/` | Zero friction | No schema, no install automation | Quick notes |
| GitHub Issues only | Track work in GH issues | Built-in PM | No embedded artifacts, no install automation | Simple task tracking |
| Plan files + commands | Numbered markdown plans with embedded artifacts and slash commands | Full audit trail; installable; session-portable; GH-backed | Slightly more structure to fill in | This repo's primary use case |
| External PM tool (Linear, Notion) | Dedicated project management | Rich UI | Separate from code; agents can't write there natively | Team workflows |

## Decision

**Plan files + commands.** The `{NNNN}-{slug}.md` format in `docs/improvement-plans/` is the canonical record. Each plan is self-contained: describes the problem, documents the decision, and embeds the exact artifact content that `/implement-plan` installs. GitHub issues in the dedicated `joeblackwaslike/AIPs` repo are the stable number registry — issue #N = AIP `{N:04d}`. Beads tracks in-session sub-tasks, not AIP tracking.

Rejected: plain docs — no install automation, no schema enforcement.
Rejected: GH issues only — can't embed full skill/config artifact content.

## Acceptance Criteria

- [x] `docs/improvement-plans/template.md` exists with all 14 sections, Variables block, and semver `version` field
- [x] `/new-plan [title]` creates a numbered plan file and opens a GH issue in `joeblackwaslike/AIPs`
- [x] `/implement-plan NNNN` reads Variables, substitutes `${KEY}` in artifacts, installs each to its destination, runs validation
- [x] AIP numbers are stable: GH issue #N always equals AIP `{N:04d}`
- [x] Label taxonomy (`status/*`, `area/*`, `priority/*`) exists in the `joeblackwaslike/AIPs` repo
- [x] GH issues are never closed — AIPs are living documents versioned with semver

## Requirements

**Already satisfied:**

- `gh` CLI authenticated with `delete_repo` scope
- `joeblackwaslike/agent-improvement` repo exists on GitHub
- `joeblackwaslike/AIPs` repo created as public registry with full label taxonomy
- `.claude/commands/new-plan.md` and `.claude/commands/implement-plan.md` present with YAML frontmatter

**Needs action:**

- None.

## Implementation

### Phase 1 — Template and commands

1. Create `docs/improvement-plans/template.md` with frontmatter schema, `## Variables` block, and all 14 section stubs
2. Create `.claude/commands/new-plan.md` with YAML frontmatter (`argument-hint`, `description`) for slash command registration
3. Create `.claude/commands/implement-plan.md` with variable substitution and artifact install logic

### Phase 2 — Registry repo

1. Create `joeblackwaslike/AIPs` as a public GitHub repo
2. Push `README.md` and `.github/ISSUE_TEMPLATE/aip.md`
3. Create label taxonomy via `gh label create`
4. Create GH issues in number order to establish AIP→issue alignment

## Artifacts

No runtime artifacts — the deliverables are `template.md` and the two command files listed above.

## Agent-Specific Considerations

- **Silent failures**: If `gh issue create` fails during `/new-plan`, the plan file exists without a GH number — surface the error immediately, do not continue silently.
- **Hallucination risk**: AIP numbers are derived from real GH issue output or `ls docs/improvement-plans/` — never invent one.
- **Loop risk**: `/implement-plan` must not re-install already-present artifacts. The `claude-md-addition` duplicate check prevents repeated appends; skill overwrites require an explicit diff + confirm.
- **Tool unavailability**: If `.claude/commands/` files are not picked up, verify each has the YAML frontmatter block. If `gh` is unauthenticated, both commands must abort before creating any files.
- **Backwards compatibility**: Adding new template sections is additive; existing plan files need not be retroactively updated.

## Validation

- `ls docs/improvement-plans/` → `template.md`, `0001-aip-system.md`, `0002-cross-agent-compatibility.md`, `0003-web-search-and-rendering.md`
- `ls .claude/commands/` → `new-plan.md` and `implement-plan.md`, both with YAML frontmatter
- `gh issue list --repo joeblackwaslike/AIPs` → issues #1, #2, #3 open with correct titles
- `/new-plan test` → creates `0004-test.md`, opens GH issue #4, prompts through sections

## Rollback

Trigger: rollback if `/new-plan` or `/implement-plan` are consistently unrecognized after two session restarts (indicates a CC version incompatibility with the frontmatter format).

Procedure:

1. Remove YAML frontmatter from command files and test without it
2. If still broken, move command files to `~/.claude/commands/` (global scope) as a workaround
3. File a bug against Claude Code if project-scoped commands remain non-functional

## Maintenance

- Update `template.md` whenever a new required section is identified — bump this plan's version
- Review label taxonomy when new `area/*` values are needed
- Re-validate slash command registration after Claude Code updates that change command frontmatter format

## Open Questions

- Q: Should project commands require a namespace prefix (e.g. `/project:new-plan`)? Resolved by: testing in the next session — `/new-plan` works without a prefix with the YAML frontmatter present.

## References

- [AIP registry](https://github.com/joeblackwaslike/AIPs)
- [agent-improvement repo](https://github.com/joeblackwaslike/agent-improvement)
- [Google AIP format](https://google.aip.dev/1) (inspiration for numbered plan system)
- [Claude Code slash commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands)
