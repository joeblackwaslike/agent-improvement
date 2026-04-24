// scripts/seed-global-memory.ts
// Runbook — execute steps inside a Claude session with claude-mem MCP available.
//
// PURPOSE: Seed ~/.claude/MEMORY.md with cross-project facts from claude-mem observations.
//
// STEPS:
//
// 1. Search claude-mem for cross-project observations:
//    - search query="preferences stack choices working style" limit=50
//    - search query="decisions patterns anti-patterns" limit=50
//    - search query="tools libraries frameworks preferred" limit=50
//
// 2. For each observation, decide if it belongs in global MEMORY.md:
//    BELONGS:  stack preferences, working style, tool choices, cross-project patterns,
//              persistent feedback about Claude behavior, environment notes
//    SKIP:     project-specific bugs, one-off decisions scoped to a single repo,
//              file paths, ephemeral task state
//
// 3. For each global fact, write a memory file to ~/.claude/projects/memory/
//    using this frontmatter format:
//
//    ---
//    name: <descriptive-slug>
//    description: <one-line — used to decide relevance in future conversations>
//    type: user | feedback | project | reference
//    ---
//
//    <body — for feedback/project types, include Why: and How to apply: lines>
//
// 4. Add a pointer line to ~/.claude/MEMORY.md index:
//    - [Title](file.md) — one-line hook (under 150 chars)
//
// 5. Verify: read ~/.claude/MEMORY.md and confirm index is coherent, no duplicates.
//
// EXPECTED OUTPUT: 10-30 memory entries covering Joe's stable preferences,
// stack choices, and cross-project patterns.
//
// NOTE: Do not save ephemeral session state, current task lists, or PR summaries.
// If unsure whether something belongs, ask "would this be useful in a fresh session
// on a completely different project?" — if yes, save it.
