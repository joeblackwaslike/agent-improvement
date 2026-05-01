# Agent Improvement Repo — Design Spec

_2026-04-23_

## Purpose

Centralized repository for all work related to improving Claude/agent development workflows. Tracks design decisions, hosts new hook scripts (deployed to `~/.claude/hooks/`), and serves as the issue tracker (via beads) for agent improvement initiatives.

---

## Repo Structure

```text
agent-improvement/
├── docs/
│   ├── superpowers/specs/          # brainstorm design docs
│   ├── ingested/                   # source docs (Obsidian notes, etc.)
│   └── decisions/                  # ADRs
├── hooks/                          # shell hooks (thin wrappers calling into src/)
├── src/
│   ├── hooks/                      # TypeScript hooks (Claude API, structured output)
│   └── lib/                        # shared utilities (Anthropic client, fs helpers)
├── scripts/                        # one-off maintenance scripts
├── .beads/                         # beads issue DB
├── package.json
├── tsconfig.json
├── justfile
└── .claude/
    └── CLAUDE.md
```

**Key conventions:**

- Shell hooks in `hooks/` are thin — they invoke `src/hooks/*.ts` via `tsx` for anything needing the Claude API
- `just deploy` symlinks new hooks into `~/.claude/hooks/`
- `docs/ingested/` keeps source documents as versioned artifacts
- Node/TypeScript throughout (no Python); shell for glue only
- Existing `~/.claude/hooks/` scripts are not adopted — only new hooks live here (supplement, not replace)

---

## Implementation Phases

### Phase 0 — Bootstrap (this session)

- Git init, initial commit
- Copy Obsidian source doc to `docs/ingested/`
- `package.json`, `tsconfig.json`, `justfile` scaffolded
- Beads issue DB initialized
- Serena onboarded to project
- Project `CLAUDE.md` created
- **Update `CLAUDE_MEM_MODEL`** from `claude-sonnet-4-5` → `claude-sonnet-4-6` in `~/.claude-mem/settings.json`

### Phase 1 — Quick Wins (beads issues, next 1-2 sessions)

1. **Build `joe-preferences` corpus** — run `build_corpus name="joe-preferences" description="Cross-project preferences, patterns, and decisions" limit=500` then `prime_corpus`. Tracked as a beads issue with the exact commands.
2. **mem-search behavioral rule** — add invocation pattern to global `~/.claude/CLAUDE.md`: invoke `mem-search` skill at the start of any session referencing past work.
3. **smart-explore behavioral rule** — add to global `~/.claude/CLAUDE.md` alongside Serena section: invoke `smart-explore` when entering an unfamiliar codebase or resuming after a gap, to correlate observation history with code structure before reading files. Serena leads for all editing.
4. **timeline-report** — beads issue to revisit once session summaries accumulate (session summarization was fixed recently).

### Phase 2 — Prospective Memory Hook (medium effort)

**What:** End-of-session TypeScript hook that captures "what's in progress + what's next."

**How:**

- Triggered by the Stop hook event
- Calls Claude API (Anthropic SDK) to summarize the session's in-progress work and next steps
- Writes a structured observation to claude-mem (so future sessions can query it semantically)
- Also writes a `_continuation.md` to the project directory for quick human-readable reference

**Files:**

- `src/hooks/session-end.ts` — main logic
- `hooks/stop_continuation.sh` — shell wrapper invoking tsx
- Deployed via `just deploy`

**Why not use claude-mem's Stop hook summarization:** That hook captures retrospective (what happened). This hook captures prospective (what's next) — a genuine gap in claude-mem's feature set.

### Phase 3 — Global MEMORY.md Seeding (medium effort)

**What:** Populate `~/.claude/MEMORY.md` with cross-project facts drawn from claude-mem observations.

**How:**

- One-time script in `scripts/seed-global-memory.ts`
- Queries claude-mem observations filtered to type=decision/preference/pattern
- Formats and writes to `~/.claude/MEMORY.md` in the required frontmatter format
- Ongoing: global `CLAUDE.md` instructs Claude to write cross-project facts here

---

## Decisions Made

| Decision | Choice | Rationale |
| --- | --- | --- |
| Hook scope | Supplement only | Existing hooks untracked; only new hooks live here |
| Language | Node/TypeScript + shell | Tighter Claude API integration; `tsx` for zero-compile execution |
| Repo structure | Hybrid flat | Simple enough to bootstrap fast; `src/lib/` prevents shell-hook mess as complexity grows |
| smart-explore vs serena | Complementary | Serena leads for editing; smart-explore for retrospective context in unfamiliar codebases |
| CLAUDE_MEM_FOLDER_CLAUDEMD_ENABLED | Stay disabled | Mutates project dirs, noisy in git, global session injection covers the same need |
| Prospective memory | Custom hook | claude-mem Stop hook is retrospective only; prospective is a genuine gap |
| VS Code preview | Extension (working) | No custom hooks needed for opening files |
