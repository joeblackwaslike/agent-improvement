---
num: "0000"
title: "Agent Improvement Planning Infrastructure"
area: tools
status: completed
priority: high
effort: medium
impact: high
created: 2026-04-23
updated: 2026-04-24
tags: [meta, planning, infrastructure, commands, github]
depends-on: []
related: ["0001"]
---

## Variables:

REPO: joeblackwaslike/agent-improvement

---

## Summary

A structured system for tracking, designing, and implementing agent workflow improvements. Agents and
humans share a common format — numbered plan files with embedded artifacts — so improvements can be
proposed, reviewed, and installed reproducibly across sessions.

## Problem

Agent improvements (better search routing, richer memory, faster tools) were being applied ad hoc —
discussed in a session, implemented inline, then forgotten. No audit trail. No rollback procedure.
No way to queue work across sessions or share rationale with future agents.

- Given: a new session opens after improvements were made → Expected: agent picks up where left off →
  Actual: agent has no knowledge of prior decisions, re-debates resolved questions, repeats mistakes
- Given: a skill or CLAUDE.md block needs reverting → Expected: clear rollback procedure →
  Actual: no record of what was installed or why
- Given: multiple improvements are in flight → Expected: visible priority queue →
  Actual: improvements exist only in conversation history

## Options

| Option | Description | Pros | Cons | Best for |
| --- | --- | --- | --- | --- |
| Plain markdown docs | Unstructured notes in `docs/` | Zero friction | No schema, no tooling, no install automation | Quick notes |
| GitHub Issues only | Track work in GH issues | Built-in project management | No embedded artifacts, no install automation | Simple task tracking |
| Plan files + commands | Numbered markdown plans with embedded artifacts and slash commands | Full audit trail; installable; session-portable; GH-backed | Slightly more structure to fill in | This repo's primary use case |
| External planning tool (Linear, Notion) | Dedicated PM tool | Rich UI | Separate context from code; agents can't write there natively | Team PM workflows |

## Decision

**Plan files + commands.** The `{NNNN}-{slug}.md` format in `docs/improvement-plans/` is the
canonical record. Each plan is self-contained: it describes the problem, documents the decision,
and embeds the exact artifact content that `implement-plan` installs. GitHub issues mirror plan
status for visibility. Beads tracks in-session sub-tasks.

Rejected: plain docs — no install automation, no schema enforcement.
Rejected: GH issues only — no way to embed full skill/config content.

## Acceptance Criteria

- [x] `docs/improvement-plans/template.md` exists with all 14 sections and the Variables block
- [x] `/new-plan [title]` creates a numbered plan file and a GH issue with `[NNNN]` prefix
- [x] `/implement-plan NNNN` reads Artifacts, installs each to its destination, runs validation
- [x] GH repo `joeblackwaslike/agent-improvement` has full label taxonomy (status/*, area/*, priority/*)
- [x] Plan 0001 is the first real improvement plan, demonstrating the full format

## Requirements

**Already satisfied:**

- `gh` CLI authenticated and pointed at `joeblackwaslike/agent-improvement`
- `.claude/commands/new-plan.md` and `.claude/commands/implement-plan.md` present with YAML frontmatter
- `docs/improvement-plans/template.md` with frontmatter schema, Variables section, and 14-section body
- GH labels: `improvement-plan`, `status/draft`, `status/approved`, `status/in-progress`,
  `status/completed`, `status/rejected`, `status/deferred`, `area/search`, `area/browser`,
  `area/memory`, `area/tools`, `area/hooks`, `area/context`, `area/performance`,
  `priority/low`, `priority/medium`, `priority/high`, `priority/critical`

**Needs action:**

- None. All infrastructure is in place.

## Implementation

### Phase 1 — Repository scaffold

1. Create `docs/improvement-plans/template.md` with 14-section schema and Variables block
2. Create `.claude/commands/new-plan.md` with YAML frontmatter and step-by-step instructions
3. Create `.claude/commands/implement-plan.md` with artifact install and variable substitution logic

### Phase 2 — GitHub setup

1. Verify repo exists: `gh repo view joeblackwaslike/agent-improvement`
2. Create full label taxonomy via `gh label create`
3. Create GH issue for plan 0001 to validate the issue format

### Phase 3 — Validation

1. Author plan 0001 (web search routing) as the canonical first real plan
2. Confirm `/new-plan` and `/implement-plan` are recognized as slash commands

## Artifacts

No artifacts — this plan documents infrastructure that was built directly in-session, not via
`/implement-plan`. The deliverables are the files listed in the Requirements section above.

## Agent-Specific Considerations

- **Silent failures**: If `gh` is not authenticated, `new-plan` fails silently on issue creation.
  Always verify `gh auth status` before running any GH command.
- **Loop risk**: `/implement-plan` must not re-install already-installed artifacts. The duplicate
  check for `claude-md-addition` prevents repeated appends; skill overwrites require explicit diff + confirm.
- **Hallucination risk**: Plan numbers are canonical. Never invent a plan number — always list
  `docs/improvement-plans/` to determine the next available `NNNN`.
- **Tool unavailability**: If `.claude/commands/` files are not picked up after a session restart,
  verify each file has the YAML frontmatter block (`argument-hint`, `description`).
- **Backwards compatibility**: The planning system is additive — it does not replace beads task
  tracking. Beads handles in-session sub-tasks; plan files handle cross-session design decisions.

## Validation

- AC1: `ls docs/improvement-plans/` shows `template.md` and `0001-*.md` ✓
- AC2: `ls .claude/commands/` shows `new-plan.md` and `implement-plan.md` with YAML frontmatter ✓
- AC3: `gh issue list --repo joeblackwaslike/agent-improvement` shows issue `[0001]` ✓
- AC4: `gh label list --repo joeblackwaslike/agent-improvement` shows all status/area/priority labels ✓
- AC5: Plan 0001 exists and is `status: approved` ✓

## Rollback

Trigger: rollback if `/new-plan` or `/implement-plan` are consistently unrecognized after two
session restarts (indicates a CC version incompatibility with the frontmatter format).

Procedure:

1. Remove YAML frontmatter from command files and test without it
2. If still broken, move command files to `~/.claude/commands/` (global scope) as a workaround
3. File a bug against Claude Code if project-scoped commands remain non-functional

## Maintenance

- Update `template.md` whenever a new required section is identified
- Re-run AC1–AC5 after any restructuring of `docs/improvement-plans/`
- Review label taxonomy quarterly and add new `area/*` labels as new improvement categories emerge

## Open Questions

- Q: Should project commands require a namespace prefix (e.g. `/project:new-plan`)?
  Resolved by: testing `/new-plan` in the next session after adding YAML frontmatter.
- Q: Should plan 0000 be reserved permanently as the meta-plan, or is it just the lowest-numbered plan?
  Resolved by: convention — 0000 is the planning infrastructure meta-plan; real improvements start at 0001.

## References

- Claude Code slash commands docs: [Custom slash commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands)
- Conventional commits: [conventionalcommits.org](https://www.conventionalcommits.org)
- GH CLI label management: [cli.github.com/manual/gh_label](https://cli.github.com/manual/gh_label_create)
