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


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
