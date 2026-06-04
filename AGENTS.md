# agent-improvement

Centralized repo for Claude/agent workflow improvements. Tracks design decisions, hosts new hook scripts deployed to `~/.claude/hooks/`, and manages agent improvement initiatives via beads.

## Structure

- `docs/ingested/` — source documents (read-only, verbatim copies)
- `docs/superpowers/specs/` — brainstorm design docs
- `docs/superpowers/plans/` — implementation plans
- `docs/decisions/` — ADRs
- `hooks/` — shell wrappers (thin, invoke `src/` via `tsx`)
- `src/hooks/` — TypeScript hook logic
- `src/lib/` — shared utilities (Anthropic client, fs helpers)
- `scripts/` — one-off maintenance scripts

## Build & Test

```bash
just test          # run vitest
just typecheck     # tsc --noEmit
just deploy        # symlink hooks/ into ~/.claude/hooks/
just undeploy      # remove symlinks
just link-skills   # symlink all skills from agent-skills into skills/
```

## Hook Development

New hooks: `src/hooks/*.ts` with a thin shell wrapper in `hooks/*.sh`. Run `just deploy` to symlink into `~/.claude/hooks/`. Existing `~/.claude/hooks/` scripts are NOT managed here.

## Skill Development

Skills live in `github.com/joeblackwaslike/agent-skills` (the canonical Claude Code plugin repo). The `skills/` directory here contains only symlinks into that repo — never real skill files.

**To develop a new skill here:**

1. Create the skill in `agent-skills/skills/<name>/SKILL.md`
2. Run `just link-skills` — it will symlink the new skill into `skills/<name>` here
3. Commit the symlink in `agent-improvement` and the skill in `agent-skills`

If you find a real skill directory in `skills/` (not a symlink), move it to `agent-skills` first, then re-run `just link-skills`.

## Conventions

- Node/TypeScript + shell only (no Python)
- `tsx` for zero-compile hook execution
- Supplement existing `~/.claude/` setup — do not replace or adopt existing hooks
