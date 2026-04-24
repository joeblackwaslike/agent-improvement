---
num: "0002"
title: "Cross-Agent Compatibility Layer"
area: tools
status: draft
priority: high
effort: large
impact: high
version: "0.1.0"
created: 2026-04-24
updated: 2026-04-24
tags: [cross-agent, skills, mcp, commands, hooks, plugins, compatibility]
depends-on: ["0001"]
related: ["0003"]
---

## Variables

<!-- None required at this stage — agent-specific paths are resolved dynamically at install time. -->

---

## Summary

AIPs can now define skills, MCP servers, commands, hooks, and plugins in an agent-agnostic format. The `/implement-plan` command applies agent-specific install logic for each supported agent, so a single plan works across Claude Code, Codex, OpenCode, Gemini CLI, and OpenClaw without modification.

## Problem

Currently every AIP artifact is Claude Code-specific — hardcoded paths, config key names, and file formats that have no meaning in other agents. As the team adopts additional agents, every plan must be manually translated per agent, or the translation is skipped and the improvement only lands in one environment.

- Given a skill defined for Claude Code → Expected: auto-installs in Gemini CLI and Codex too → Actual: manual copy required, format differs, often skipped
- Given an MCP server config in `~/.claude/settings.json` → Expected: also registered in OpenCode and Codex config → Actual: different key names, different files, done by hand or not at all
- Given a new agent added to the workflow → Expected: all prior AIPs apply retroactively → Actual: no install path exists; prior improvements are silently missing

## Options

### Skills installation

| Option | Description | Pros | Cons | Best for |
| --- | --- | --- | --- | --- |
| agentskills.io + `@vercel-labs/skills` | Standard SKILL.md format; `npx @vercel-labs/skills install` handles 41+ agents | One CLI for all agents; community maintained; handles discovery, install, update | Requires adherence to SKILL.md spec; npm dep | Cross-agent skill install |
| Per-agent install scripts | Custom shell script per agent | Full control | Maintenance burden scales with agents | One-off or proprietary skills |
| Symlinks to canonical location | One file, many symlinks | Simple | Agents have incompatible formats and discovery paths | Agents with identical skill formats |

### MCP server configuration

| Option | Description | Pros | Cons | Best for |
| --- | --- | --- | --- | --- |
| Per-agent config adapters in implement-plan | implement-plan writes agent-specific config files | No new tooling | Logic grows with each agent | Small agent set |
| mcp-installer library | Dedicated library (e.g. `mcp-get`, `mcp-manager`) | Abstracted; community | Dependency; may lag new agents | When a stable community tool exists |
| Unified config file + per-agent sync script | One canonical `mcp-servers.json`; sync script writes to each agent's format | Single source of truth | Sync must be re-run after agent updates | Multi-agent, stable agent set |

### Commands / slash commands

| Option | Description | Pros | Cons | Best for |
| --- | --- | --- | --- | --- |
| Agent-native only | Each agent uses its own command format | No translation layer | Commands don't cross agents | Single-agent use |
| AGENTS.md / GEMINI.md injection | Append command descriptions to each agent's instruction file | No new spec; works today | Not interactive slash commands; agents may ignore | Guidance-style commands |
| agentskills.io SKILL.md as universal command | Skills double as commands when invoked explicitly | One format | Not all agents have a skill invocation path | Agents that support skills |

### Hooks

| Option | Description | Pros | Cons | Best for |
| --- | --- | --- | --- | --- |
| Claude Code hooks only | Keep hooks in `~/.claude/settings.json` | Already working | No cross-agent hook support | CC-only workflows |
| Shell scripts in `~/.agent-hooks/` | Agent-agnostic shell scripts; each agent's hook config points to them | Portable logic | Each agent still needs its own hook registration | Shared hook logic |
| Wait for ecosystem convergence | Hooks are too agent-specific to abstract today | No engineering cost | Improvement siloed in CC | Deferred |

### Plugins

| Option | Description | Pros | Cons | Best for |
| --- | --- | --- | --- | --- |
| Claude Code plugins only | CC plugin system is the primary target | Mature; already in use | No cross-agent | CC-focused AIPs |
| Per-agent plugin registries | Research and document each agent's plugin mechanism | Full coverage | High research cost; formats diverge rapidly | Comprehensive future-proofing |

## Decision

**Tiered approach by artifact type:**

1. **Skills** — standardize on the [agentskills.io](https://agentskills.io) SKILL.md spec and use `npx @vercel-labs/skills` as the primary install/update mechanism. This covers 41+ agents with one command. All AIP skills must be authored in SKILL.md format going forward; Claude Code-specific `~/.claude/skills/*.md` installs are a secondary fallback for skills that use CC-only features.

2. **MCP servers** — implement per-agent config adapters inside `implement-plan`. A new `mcp-config` artifact type writes to each agent's config file. Phase 1 covers Claude Code and Codex; additional agents added as research is completed.

3. **Commands** — agent-native only for now. Claude Code commands stay as `.claude/commands/*.md`. For other agents, inject a summary into the agent's instruction file (AGENTS.md, GEMINI.md, etc.). True cross-agent slash commands are deferred pending ecosystem convergence.

4. **Hooks** — Claude Code hooks remain in `~/.claude/settings.json`. Hook logic that can be extracted to a shell script is placed in `hooks/` in this repo and symlinked/referenced from agent configs where supported.

5. **Plugins** — Claude Code plugins are the primary target. Other agent plugin mechanisms documented as research completes.

Rejected: per-agent install scripts for skills — maintenance cost grows quadratically with (agents × skills).
Rejected: waiting for full ecosystem convergence — the AI agent space is moving fast; partial support now is better than perfect support never.

## Acceptance Criteria

- [ ] All AIP skill artifacts are authored in agentskills.io SKILL.md format
- [ ] `npx @vercel-labs/skills install <skill>` successfully installs a skill into Claude Code, Codex, and at least one additional agent
- [ ] `implement-plan` `mcp-config` artifact type writes correct config for Claude Code and Codex
- [ ] Agent compatibility matrix exists documenting what each agent supports (skills, MCP, commands, hooks, plugins)
- [ ] `implement-plan` accepts an optional `--agents` flag (or plan frontmatter `agents:` list) to target specific agents
- [ ] Existing AIP artifacts (skills in 0003) are migrated to SKILL.md format

## Requirements

**Already satisfied:**

- `node` / `npx` available for `@vercel-labs/skills`
- Claude Code is fully supported by the existing `implement-plan` infrastructure
- `gh` CLI for GH issue tracking

**Needs action:**

- Research Codex CLI config format for MCP servers and skills
- Research OpenCode config format and skill/MCP install paths
- Research Gemini CLI MCP config and skill invocation mechanism
- Research OpenClaw architecture and supported artifact types
- Verify `@vercel-labs/skills` handles Claude Code's `~/.claude/skills/` path correctly
- Confirm agentskills.io SKILL.md spec compatibility with the skill format in AIP 0003

## Implementation

### Phase 1 — Skills standardization

1. Read the [agentskills.io SKILL.md spec](https://agentskills.io) and `@vercel-labs/skills` CLI docs
2. Audit the skill artifact in AIP 0003 (`web-research.md`); rewrite its preamble to be SKILL.md-compliant while preserving all routing content
3. Update `implement-plan` skill type: run `npx @vercel-labs/skills install` as the primary installer; fall back to direct file write for CC-only skills
4. Add `find-skills` skill from `@vercel-labs/skills` to the global skill set so agents can search the agentskills.io catalog

### Phase 2 — Agent research and compatibility matrix

1. Test Codex CLI: locate config files, verify MCP and skill install paths, document in `docs/agents/codex.md`
2. Test OpenCode: same — `docs/agents/opencode.md`
3. Test Gemini CLI: same — `docs/agents/gemini.md`
4. Research OpenClaw — `docs/agents/openclaw.md`
5. Build `docs/agents/compatibility-matrix.md`: rows = agents, cols = artifact types, cells = support level (full / partial / none / unknown)

### Phase 3 — implement-plan multi-agent support

1. Add optional `agents: [claude-code, codex, gemini]` list to plan frontmatter (defaults to `[claude-code]`)
2. Add `--agents <list>` flag to `implement-plan` command to override frontmatter at install time
3. Implement per-agent install handlers for each artifact type, gated by the agent list
4. Add agent detection: check for presence of agent-specific config dirs/files to auto-detect installed agents

### Phase 4 — MCP config adapters

1. Extend `mcp-config` artifact type to accept a `targets` map: agent → config path + merge strategy
2. Implement Codex MCP config writer (research required first)
3. Implement Gemini CLI MCP config writer (research required first)
4. Document the `mcp-config` multi-target format in the template

### Phase 5 — Commands and hooks cross-agent

1. For each agent that supports instruction files (AGENTS.md, GEMINI.md, etc.), add a `command-stub` artifact type that appends a command description to that file
2. Extract reusable hook logic from `src/hooks/*.ts` into standalone shell scripts in `hooks/portable/`
3. Document which hooks have portable equivalents in the compatibility matrix

## Artifacts

### Artifact 1 — find-skills skill

- type: skill
- destination: `~/.claude/skills/find-skills.md`

```markdown
---
name: find-skills
description: >
  Search, install, and update agent skills from the agentskills.io catalog using
  @vercel-labs/skills. Use when the user asks to find a skill, install a skill for
  a specific agent, or check for skill updates. Supports 41+ agents.
---

## Finding and Installing Skills

Use `npx @vercel-labs/skills` to interact with the agentskills.io catalog.

### Search for skills

```sh
npx @vercel-labs/skills search <query>
```

### Install a skill for the current agent

```sh
npx @vercel-labs/skills install <skill-name>
```

### Install for a specific agent

```sh
npx @vercel-labs/skills install <skill-name> --agent <agent-name>
```

### List installed skills

```sh
npx @vercel-labs/skills list
```

### Update all skills

```sh
npx @vercel-labs/skills update
```

### Check skill compatibility

```sh
npx @vercel-labs/skills check <skill-name>
```

When a user asks to find or install a skill, run the search command first and present results before installing.
```

## Agent-Specific Considerations

- **Silent failures**: An MCP config written to the wrong path silently has no effect — always verify the config was picked up by tailing the agent's log or checking its active server list after install.
- **Hallucination risk**: Agent config paths and key names must be verified against real agent documentation, not assumed from Claude Code conventions. Paths vary significantly.
- **Loop risk**: `npx @vercel-labs/skills install` should not be retried automatically if it fails — surface the error and ask the user to resolve the npm/network issue first.
- **Tool unavailability**: If `npx` is unavailable, fall back to direct SKILL.md file write to the agent's skills directory. Always document the fallback path in the artifact entry.
- **Backwards compatibility**: Existing Claude Code-only artifacts in earlier AIPs remain valid. Migration to SKILL.md format is recommended but not required for completed plans.
- **Agent version drift**: Agent config formats change with releases. The compatibility matrix must note the agent version at time of research; re-validate when major agent versions ship.

## Validation

- AC1: `npx @vercel-labs/skills install web-research` → skill appears in Claude Code and at least one other agent's skill list
- AC2: `implement-plan 0003 --agents claude-code,codex` → MCP config written to both agents' config files without error
- AC3: `docs/agents/compatibility-matrix.md` exists with entries for all 5 target agents
- AC4: `npx @vercel-labs/skills list` → shows at least the `web-research` and `find-skills` skills
- AC5: An AIP artifact authored as SKILL.md passes `npx @vercel-labs/skills check`

## Rollback

Trigger: rollback if cross-agent installs produce config corruption in any agent (confirmed by agent failing to start or load its config) or if the `@vercel-labs/skills` CLI introduces breaking changes that break `implement-plan`.

Procedure:

1. Remove any MCP config entries added by the adapter from each affected agent's config file
2. Restore prior skill files from git history (`git show HEAD~1:path/to/skill.md`)
3. Pin `@vercel-labs/skills` to the last known good version in a local `.npmrc` or `package.json`

## Maintenance

- Re-run the compatibility matrix research when any target agent ships a major version
- Update MCP config adapters when agent config key names or file paths change
- Monitor `@vercel-labs/skills` changelog; update skill format if the spec evolves
- Revisit the commands/hooks cross-agent decision when the ecosystem produces a stable standard

## Open Questions

- Q: Does `@vercel-labs/skills` correctly target Claude Code's `~/.claude/skills/` path, or does it use a different discovery mechanism? Resolved by: running `npx @vercel-labs/skills install` on a test skill and inspecting installed location.
- Q: What is OpenClaw's architecture and does it have a documented plugin/skill API? Resolved by: checking OpenClaw GitHub repo and docs.
- Q: Should the `agents:` frontmatter field default to `[claude-code]` only, or to "all detected agents"? Resolved by: defaulting to `[claude-code]` for safety; explicit opt-in to multi-agent installs.
- Q: Can Gemini CLI's `activate_skill` be driven non-interactively by `@vercel-labs/skills`? Resolved by: testing `npx @vercel-labs/skills install --agent gemini` against a real skill.

## References

- [agentskills.io](https://agentskills.io) — skill spec and catalog
- [@vercel-labs/skills GitHub](https://github.com/vercel-labs/skills) — CLI source and SKILL.md format
- [find-skills SKILL.md](https://github.com/vercel-labs/skills/blob/main/skills/find-skills/SKILL.md) — reference implementation
- [Claude Code MCP config](https://docs.anthropic.com/en/docs/claude-code/settings) — `mcpServers` key in settings.json
- [Codex CLI](https://github.com/openai/codex) — OpenAI Codex CLI docs
- [OpenCode](https://github.com/sst/opencode) — SST OpenCode agent
- AIP 0001 — AIP system (this plan depends on it for `/implement-plan` infrastructure)
- AIP 0003 — first plan with a skill artifact to be migrated to SKILL.md format
