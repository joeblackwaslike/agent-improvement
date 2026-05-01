# Agent Improvement Repo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the `agent-improvement` repo as a versioned hub for Claude workflow improvements, then implement the gap items identified in the Obsidian audit doc.

**Architecture:** Hybrid-flat repo — `docs/` for specs and ingested sources, `hooks/` for shell wrappers, `src/` for TypeScript hook logic with shared lib, `scripts/` for one-off tooling. New hooks are developed here and deployed to `~/.claude/hooks/` via `just deploy`. Existing hooks are untouched.

**Tech Stack:** Node 22+, TypeScript 5.7, tsx (zero-compile execution), @anthropic-ai/sdk, vitest, zod, just

---

## File Map

| File | Action | Purpose |
| --- | --- | --- |
| `package.json` | Create | Node project, deps: sdk + tsx + vitest + zod |
| `tsconfig.json` | Create | Strict ESNext, bundler resolution |
| `justfile` | Create | `deploy`, `undeploy`, `test`, `typecheck` targets |
| `.claude/CLAUDE.md` | Create | Project-level Claude instructions |
| `docs/ingested/agent-claude-memory-improvements.md` | Create | Verbatim Obsidian source doc |
| `~/.claude-mem/settings.json` | Modify | Update model to claude-sonnet-4-6 |
| `~/.claude/CLAUDE.md` | Modify | Add mem-search + smart-explore behavioral rules |
| `src/lib/anthropic.ts` | Create | Shared Anthropic client factory |
| `src/hooks/session-end.ts` | Create | Prospective memory hook logic |
| `src/hooks/session-end.test.ts` | Create | Unit tests for hook logic |
| `hooks/stop_continuation.sh` | Create | Shell wrapper invoking tsx session-end |
| `scripts/seed-global-memory.ts` | Create | One-time script to seed ~/.claude/MEMORY.md |

---

## Task 1: Git init + project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `justfile`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/joeblack/github/joeblackwaslike/agent-improvement
git init
```

Expected: `Initialized empty Git repository in .../agent-improvement/.git/`

- [ ] **Step 2: Create `.gitignore`**

```text
node_modules/
dist/
.DS_Store
*.js.map
```

Save to `.gitignore`.

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "agent-improvement",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.52.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": ".",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*", "scripts/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Create `justfile`**

```just
# Deploy new hooks to ~/.claude/hooks/ via symlink
deploy:
    #!/usr/bin/env bash
    set -euo pipefail
    REPO="$(cd "$(dirname "{{justfile()}}")" && pwd)"
    for hook in hooks/*.sh; do
        name=$(basename "$hook")
        target="$HOME/.claude/hooks/$name"
        ln -sf "$REPO/$hook" "$target"
        echo "Linked: $name"
    done

# Remove symlinks created by deploy
undeploy:
    #!/usr/bin/env bash
    set -euo pipefail
    for hook in hooks/*.sh; do
        name=$(basename "$hook")
        target="$HOME/.claude/hooks/$name"
        if [ -L "$target" ]; then
            rm "$target"
            echo "Removed: $name"
        fi
    done

# Run tests
test:
    npx vitest run

# Type-check without emitting
typecheck:
    npx tsc --noEmit
```

- [ ] **Step 6: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, `package-lock.json` written.

- [ ] **Step 7: Create directory structure**

```bash
mkdir -p hooks src/lib src/hooks scripts docs/decisions docs/superpowers/specs docs/superpowers/plans docs/ingested .claude
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: scaffold agent-improvement repo"
```

---

## Task 2: Ingest Obsidian source doc

**Files:**
- Create: `docs/ingested/agent-claude-memory-improvements.md`

- [ ] **Step 1: Copy the Obsidian doc verbatim**

```bash
cp "/Users/joeblack/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault/agent & claude memory ongoing iterative improvements.md" \
  docs/ingested/agent-claude-memory-improvements.md
```

- [ ] **Step 2: Verify copy**

```bash
head -5 docs/ingested/agent-claude-memory-improvements.md
```

Expected: `---` frontmatter and doc content visible.

- [ ] **Step 3: Commit**

```bash
git add docs/ingested/
git commit -m "docs: ingest Obsidian agent improvement audit"
```

---

## Task 3: Project CLAUDE.md

**Files:**
- Create: `.claude/CLAUDE.md`

- [ ] **Step 1: Create `.claude/CLAUDE.md`**

```markdown
# agent-improvement

Centralized repo for Claude/agent workflow improvements.

## Structure

- `docs/ingested/` — source documents (read-only, verbatim)
- `docs/superpowers/specs/` — brainstorm design docs
- `docs/superpowers/plans/` — implementation plans
- `docs/decisions/` — ADRs
- `hooks/` — shell wrappers (thin, invoke src/ via tsx)
- `src/hooks/` — TypeScript hook logic
- `src/lib/` — shared utilities
- `scripts/` — one-off maintenance scripts

## Hook Development

New hooks go in `src/hooks/*.ts` with a thin shell wrapper in `hooks/*.sh`.
Run `just deploy` to symlink into `~/.claude/hooks/`.
Existing `~/.claude/hooks/` scripts are NOT managed here.

## Running

- Tests: `just test`
- Type check: `just typecheck`
- Deploy hooks: `just deploy`
```

- [ ] **Step 2: Commit**

```bash
git add .claude/
git commit -m "docs: add project CLAUDE.md"
```

---

## Task 4: Update claude-mem model

**Files:**
- Modify: `~/.claude-mem/settings.json`

- [ ] **Step 1: Read current value**

```bash
grep CLAUDE_MEM_MODEL ~/.claude-mem/settings.json
```

Expected: `"CLAUDE_MEM_MODEL": "claude-sonnet-4-5"`

- [ ] **Step 2: Update model string**

Using str_replace: change `"claude-sonnet-4-5"` to `"claude-sonnet-4-6"` in `~/.claude-mem/settings.json`.

- [ ] **Step 3: Verify**

```bash
grep CLAUDE_MEM_MODEL ~/.claude-mem/settings.json
```

Expected: `"CLAUDE_MEM_MODEL": "claude-sonnet-4-6"`

- [ ] **Step 4: Commit a record of the change**

```bash
git add -A
git commit -m "chore: record claude-mem model update (4-5 → 4-6)"
```

Note: The actual settings file change is at `~/.claude-mem/settings.json` (outside this repo). This commit records the decision in the repo's history via the CLAUDE.md or a decision doc if desired.

---

## Task 5: Bootstrap beads issue DB

**Files:**
- Create: `.beads/` (managed by beads)

- [ ] **Step 1: Invoke the beads skill**

Use the `beads:init` skill to initialize the issue database in this repo. Follow the skill's instructions.

- [ ] **Step 2: Create Phase 1 issues**

Create the following beads issues (use `beads:create` skill or CLI):

**Issue 1 — Build joe-preferences corpus**
```
Title: Build joe-preferences claude-mem corpus
Body:
Run in a Claude session with claude-mem MCP available:

  build_corpus name="joe-preferences" \
    description="Cross-project preferences, patterns, stack choices, and working style" \
    limit=500

Then:
  prime_corpus name="joe-preferences"

Verify with: list_corpora
```

**Issue 2 — timeline-report**
```
Title: Generate timeline-report once session summaries accumulate
Body:
Session summarization was fixed 2026-04-23. Revisit after 5+ sessions have
accumulated. Use the timeline-report skill to generate a narrative summary
of recent project work.
```

- [ ] **Step 3: Commit**

```bash
git add .beads/
git commit -m "chore: init beads issue DB with Phase 1 issues"
```

---

## Task 6: Serena onboarding

- [ ] **Step 1: Run serena onboarding**

Use the `serena` MCP tool `onboarding` to index this project. This gives serena knowledge of the repo structure for future sessions.

- [ ] **Step 2: Verify**

Use `serena` `get_symbols_overview` on `src/` to confirm it sees the project.

---

## Task 7: Global CLAUDE.md — behavioral rules

**Files:**
- Modify: `~/.claude/CLAUDE.md`

- [ ] **Step 1: Read the current Serena section**

Read `~/.claude/CLAUDE.md` and locate the section that describes Serena MCP usage (the "Code Reading / Editing" section near the bottom).

- [ ] **Step 2: Add mem-search rule**

After the Serena section, insert:

```markdown
## Memory Search

At the start of any session that references past work, past decisions, or asks
"what did we do with X", invoke the `claude-mem:mem-search` skill before
answering. The 3-layer search (search → timeline → get_observations) gives
semantically relevant context that isn't in the current project files.
```

- [ ] **Step 3: Add smart-explore rule**

Append to the same Serena section (or directly after mem-search):

```markdown
## Smart-Explore (supplemental to Serena)

When entering an unfamiliar codebase OR resuming a project after a multi-day
gap, invoke the `claude-mem:smart-explore` skill before reading any files.
It combines AST structure (smart_outline, smart_unfold) with observation
history to give a "what do I know about this code" orientation.

Serena remains the primary tool for all code editing. smart-explore is
read-only orientation, not a replacement.
```

- [ ] **Step 4: Verify the file looks correct**

Read `~/.claude/CLAUDE.md` and confirm both sections are present and properly formatted.

- [ ] **Step 5: Commit a record**

```bash
git commit -m "chore: record global CLAUDE.md behavioral rules (mem-search, smart-explore)"
```

---

## Task 8: Shared Anthropic client

**Files:**
- Create: `src/lib/anthropic.ts`
- Create: `src/lib/anthropic.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/anthropic.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({ messages: {} })),
}));

import { createClient } from "./anthropic.js";

describe("createClient", () => {
  it("returns an Anthropic instance", () => {
    const client = createClient();
    expect(client).toBeDefined();
    expect(client.messages).toBeDefined();
  });

  it("throws if ANTHROPIC_API_KEY is missing", () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => createClient()).toThrow();
    process.env.ANTHROPIC_API_KEY = original;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/anthropic.test.ts
```

Expected: FAIL — `createClient` not defined.

- [ ] **Step 3: Implement `src/lib/anthropic.ts`**

```typescript
import Anthropic from "@anthropic-ai/sdk";

export function createClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return new Anthropic({ apiKey });
}

export const MODEL = "claude-sonnet-4-6";
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/anthropic.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/
git commit -m "feat: add shared Anthropic client"
```

---

## Task 9: Prospective memory hook

**Files:**
- Create: `src/hooks/session-end.ts`
- Create: `src/hooks/session-end.test.ts`
- Create: `hooks/stop_continuation.sh`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/hooks/session-end.test.ts
import { describe, it, expect } from "vitest";
import { formatContinuation, buildPrompt } from "./session-end.js";

describe("formatContinuation", () => {
  it("wraps summary in continuation markdown with timestamp", () => {
    const result = formatContinuation("- Did X\n- Next: Y", "2026-04-23T12:00:00.000Z");
    expect(result).toContain("# Session Continuation");
    expect(result).toContain("2026-04-23T12:00:00.000Z");
    expect(result).toContain("- Did X");
    expect(result).toContain("- Next: Y");
  });
});

describe("buildPrompt", () => {
  it("includes the transcript tail in the prompt", () => {
    const prompt = buildPrompt("some transcript content here");
    expect(prompt).toContain("some transcript content here");
    expect(prompt).toContain("in progress");
    expect(prompt).toContain("next");
  });

  it("truncates very long transcripts to last 10000 chars", () => {
    const long = "x".repeat(20000);
    const prompt = buildPrompt(long);
    expect(prompt).toContain("x".repeat(100));
    // prompt should not contain 20000 x's worth
    expect(prompt.length).toBeLessThan(15000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/hooks/session-end.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/hooks/session-end.ts`**

```typescript
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createClient, MODEL } from "../lib/anthropic.js";

interface StopHookInput {
  hook_event_name: string;
  session_id: string;
  transcript_path?: string;
  cwd?: string;
}

export function buildPrompt(transcript: string): string {
  const tail = transcript.slice(-10000);
  return `Based on this Claude session transcript, write a concise continuation note with three sections:

**In progress** (2-3 bullets): What was actively being worked on
**Next steps** (2-3 bullets): What should happen in the next session
**Unresolved** (0-2 bullets): Open decisions or blockers (omit section if none)

Be specific. Use exact file names and task descriptions where visible.

Transcript:
${tail}`;
}

export function formatContinuation(summary: string, timestamp: string): string {
  return `# Session Continuation\n\n_Generated: ${timestamp}_\n\n${summary}\n`;
}

async function main(): Promise<void> {
  const raw = readFileSync("/dev/stdin", "utf8").trim();
  if (!raw) process.exit(0);

  const input = JSON.parse(raw) as StopHookInput;
  const { cwd, transcript_path } = input;

  if (!transcript_path || !cwd) process.exit(0);

  let transcript: string;
  try {
    transcript = readFileSync(transcript_path, "utf8");
  } catch {
    process.exit(0);
  }

  const client = createClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: "user", content: buildPrompt(transcript) }],
  });

  const summary =
    response.content[0].type === "text" ? response.content[0].text : "";

  const continuation = formatContinuation(summary, new Date().toISOString());
  writeFileSync(join(cwd, "_continuation.md"), continuation, "utf8");
}

main().catch((err) => {
  console.error("[stop_continuation] error:", err);
  process.exit(0); // never block the session from ending
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/hooks/session-end.test.ts
```

Expected: PASS

- [ ] **Step 5: Create shell wrapper `hooks/stop_continuation.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

exec npx tsx "$REPO_DIR/src/hooks/session-end.ts"
```

```bash
chmod +x hooks/stop_continuation.sh
```

- [ ] **Step 6: Deploy the hook**

```bash
just deploy
```

Expected: `Linked: stop_continuation.sh`

- [ ] **Step 7: Verify symlink**

```bash
ls -la ~/.claude/hooks/stop_continuation.sh
```

Expected: symlink pointing to repo.

- [ ] **Step 8: Register in `~/.claude/settings.json`**

Read `~/.claude/settings.json` and add to the `hooks` array under the `Stop` event:

```json
{
  "matcher": "",
  "hooks": [
    {
      "type": "command",
      "command": "~/.claude/hooks/stop_continuation.sh"
    }
  ]
}
```

Merge this with existing Stop hooks — do not replace them.

- [ ] **Step 9: Smoke test**

Start and immediately end a Claude session in a test directory. Verify `_continuation.md` is written there.

- [ ] **Step 10: Commit**

```bash
git add src/hooks/ hooks/
git commit -m "feat: add prospective memory stop hook"
```

---

## Task 10: Global MEMORY.md seeding script

**Files:**
- Create: `scripts/seed-global-memory.ts`

Note: This script runs *inside a Claude session* using the claude-mem MCP tools, not as a standalone Node script. It is a prompt script — a structured set of instructions to follow interactively.

- [ ] **Step 1: Create the seeding instructions**

```typescript
// scripts/seed-global-memory.ts
// This is a runbook script — execute steps inside a Claude session.
//
// PURPOSE: Seed ~/.claude/MEMORY.md with cross-project facts from claude-mem.
//
// STEPS:
//
// 1. In a Claude session, search claude-mem for cross-project observations:
//    - search query="preferences stack choices working style" limit=50
//    - search query="decisions patterns anti-patterns" limit=50
//
// 2. For each relevant observation, determine if it belongs in global MEMORY.md:
//    - Belongs: stack preferences, working style, tool choices, cross-project patterns
//    - Does NOT belong: project-specific bugs, one-off decisions, file paths
//
// 3. For each global fact, write to ~/.claude/MEMORY.md using the memory format:
//    ---
//    name: <descriptive-name>
//    description: <one-line — used for relevance decisions>
//    type: user | feedback | project | reference
//    ---
//    <body>
//
// 4. Update MEMORY.md index with a pointer to each file.
//
// 5. Verify: read ~/.claude/MEMORY.md and confirm index is coherent.
//
// EXPECTED OUTPUT: 10-30 memory entries covering Joe's stable preferences,
// stack choices, and cross-project patterns.
```

- [ ] **Step 2: Commit the runbook**

```bash
git add scripts/
git commit -m "docs: add global MEMORY.md seeding runbook"
```

- [ ] **Step 3: Execute the runbook**

Follow the instructions in `scripts/seed-global-memory.ts` in this Claude session using claude-mem MCP search tools.

---

## Task 11: Final verification + typecheck

- [ ] **Step 1: Run full test suite**

```bash
just test
```

Expected: All tests pass.

- [ ] **Step 2: Type-check**

```bash
just typecheck
```

Expected: No errors.

- [ ] **Step 3: Verify beads issues exist**

Use `beads:list` skill to confirm Phase 1 issues are tracked.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification pass"
```
