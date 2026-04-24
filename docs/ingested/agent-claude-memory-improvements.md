---
type: todo
---
## The gap suggestions were:

###  1. Prospective memory (biggest gap — no system covers this)               
  When you come back to a project after days away, there's no "here's where
  we left off." The suggestion was an end-of-session hook that writes a
  _continuation.md (or similar) per project: what's in progress, what's     
  next, any unresolved decisions. This is the one that makes re-entering a
  project feel coherent rather than starting cold.                          
                                 
###  2. No global MEMORY.md         
  The file-based auto-memory system is project-scoped. There's no global
  ~/.claude/MEMORY.md. Cross-project facts about you (preferences, stack    
  choices, working style) only live in CLAUDE.md. The auto-memory system was
   designed to accumulate this but was never seeded.                        
                                      
###  3. Fragmented semantic memory       
  Two systems compete for stable facts — file-based MEMORY.md files and
  claude-mem observations — but neither is authoritative. The suggestion:   
  commit to using the file-based auto-memory system consistently and seed it
   for each active project.                                                 
                                      
###  4. A "Joe preferences" corpus                                             
  The corpus/knowledge-agent feature in claude-mem is the right tool to
  aggregate cross-project facts about you into a queryable knowledge base.  
  No corpora have been built yet (list_corpora returned empty). Building one
   from all existing observations would give portable personal context.     
                                      
###  5. Contradiction/staleness handling                                       
  Old observations stay in the index forever. If a file moved, or an
  approach changed, stale facts persist with no expiry or deprecated_by     
  linkage. This is a claude-mem architectural gap to potentially file
  upstream.                                                                 
                                      
###  6. The three memory types scorecard          
  - Episodic (what happened) — ✅ claude-mem covers this, now fixed
  - Semantic (stable facts about you/project) — ⚠️  fragmented, not actively 
  maintained                                                               
  - Procedural (how to do things) — ⚠️  covered by lessons-learned +         
  CLAUDE.md, but not by claude-mem                                 
                                                                            
  The most actionable ones that don't require upstream changes: prospective 
  memory hook and seeding the global MEMORY.md + a preferences corpus.

---

## claude-mem Full Feature Inventory

### Automatic (Hook-Driven) Features

| Feature | What it does | Status |
|---|---|---|
| **Observation capture** | PostToolUse hook extracts facts/decisions/bugs from every tool call via LLM | ✅ Working — 48 observations |
| **Session context injection** | SessionStart hook injects relevant past observations into Claude's context | ✅ Working — you see it in session startup output |
| **Session summarization** | Stop hook queues a summary of each session for long-term recall | ⚠️ Was broken — fixed today, will work next session |
| **User prompt logging** | Every prompt stored in `user_prompts` table | ✅ Working — 7,300+ stored |
| **Chroma vector sync** | Observations + prompts synced to ChromaDB for semantic search | ✅ Working — 149MB of vectors |
| **Folder CLAUDE.md updates** | Writes per-folder context files after observations | ❌ Disabled (`CLAUDE_MEM_FOLDER_CLAUDEMD_ENABLED: false`) |

---

### MCP Search Tools (Available to Claude)

| Tool | What it does | Status |
|---|---|---|
| `search` | FTS + semantic search over observations | ⚠️ Was timing out — fixed today |
| `timeline` | Chronological context around a specific observation | ⚠️ Same fix |
| `get_observations` | Batch-fetch full observation details by IDs | ⚠️ Same fix |
| `smart_search` | AST-parsed structural codebase search (tree-sitter) | ❌ Never used |
| `smart_outline` | Structural outline of a file without reading it | ❌ Never used |
| `smart_unfold` | Expand one symbol's full source | ❌ Never used |
| `build_corpus` | Build a named, filtered knowledge base from observations | ❌ Never used — 0 corpora |
| `list_corpora` | List built corpora | ❌ Empty |
| `prime_corpus` | Load a corpus into an AI session for Q&A | ❌ Never used |
| `query_corpus` | Ask questions to a primed corpus | ❌ Never used |
| `rebuild_corpus` | Refresh a corpus with new observations | ❌ Never used |
| `reprime_corpus` | Fresh AI session for a corpus | ❌ Never used |

---

### Skills

| Skill | What it does | Status |
|---|---|---|
| `mem-search` | Protocol for 3-layer search (search → timeline → get_observations) | ❌ Never invoked |
| `knowledge-agent` | Build + query corpora from observation history | ❌ Never used |
| `smart-explore` | Overrides default file exploration with AST tools | ❌ Never used |
| `timeline-report` | Generates narrative "journey into [project]" from observation history | ❌ Never used |
| `make-plan` | Orchestrated planning with subagents + doc discovery | ❌ Not mem-specific |
| `do` | Executes a make-plan plan via subagents | ❌ Not mem-specific |
| `version-bump` | Plugin release workflow | Not relevant |

---

### Settings Worth Knowing

| Setting | Current value | Notes |
|---|---|---|
| `CLAUDE_MEM_MODEL` | `claude-sonnet-4-5` | **Outdated** — should be `claude-sonnet-4-6` |
| `CLAUDE_MEM_CONTEXT_OBSERVATIONS` | `50` | Max observations injected at session start |
| `CLAUDE_MEM_CONTEXT_SESSION_COUNT` | `10` | Recent sessions shown in context |
| `CLAUDE_MEM_CONTEXT_FULL_COUNT` | `0` | Full narrative observations injected (vs summaries) |
| `CLAUDE_MEM_FOLDER_CLAUDEMD_ENABLED` | `false` | Per-folder context files |
| `CLAUDE_MEM_MAX_CONCURRENT_AGENTS` | `2` | Parallel SDK agents for observation processing |
| `CLAUDE_MEM_EXCLUDED_PROJECTS` | `` | Empty — all projects tracked |

---

### What to Implement (Prioritized)

**Highest value, low effort:**

1. **Update the model** — Change `CLAUDE_MEM_MODEL` from `claude-sonnet-4-5` to `claude-sonnet-4-6` in `~/.claude-mem/settings.json`
   >  do this
2. **Build a "Joe preferences" corpus** — `build_corpus name="joe-preferences" description="Cross-project preferences, patterns, and decisions" limit=500` then `prime_corpus name="joe-preferences"`
   > propose a plan to do this
3. **Use `mem-search` skill** — Claude should invoke this at the start of any session referencing past work (behavioral fix)
   >  do this
4. **Use `smart-explore` skill** — Replace Read+Grep chains with AST-aware search tools (behavioral fix)
   >  is this better than how i currently use serena mcp (explained in user level claude.md doc?)

**Medium effort:**

5. **Prospective memory hook** — End-of-session hook writing a `_continuation.md` per project (custom, not built into claude-mem)
   >  Is there really no Cloud MIM feature that could be used to implement this? It's surprising considering how comprehensive that system is. 
6. **Enable `CLAUDE_MEM_FOLDER_CLAUDEMD_ENABLED`** — Per-folder CLAUDE.md files updated automatically from observations
   >  how does this work and how much bloat does it add 

**Lower priority:**

7. ** `timeline-report` ** — Useful for retrospectives once session summaries are accumulating (now fixed) 
