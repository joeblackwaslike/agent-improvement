---
num: "0002"
title: "Cross-Agent Compatibility Layer"
area: tools
status: in-progress
priority: high
effort: large
impact: high
version: "0.2.0"
created: 2026-04-24
updated: 2026-04-24
tags: [cross-agent, skills, mcp, commands, hooks, plugins, compatibility]
depends-on: ["0001"]
related: ["0003"]
agents: [claude-code]
---

## Variables

<!-- None required at this stage — agent-specific paths are resolved dynamically at install time. -->

---

## Summary

AIPs can now define skills, MCP servers, commands, and hooks in an agent-agnostic format. The `/implement-plan` command applies agent-specific install logic for each supported agent, so a single plan works across Claude Code, Codex CLI, OpenCode, and Gemini CLI without modification. Skills are distributed via the agentskills.io SKILL.md spec and `@vercel-labs/skills` CLI, which covers all four target agents plus 41 others.

## Problem

Currently every AIP artifact is Claude Code-specific — hardcoded paths, config key names, and file formats that have no meaning in other agents. As the team adopts additional agents, every plan must be manually translated per agent, or the translation is skipped and the improvement only lands in one environment.

- Given a skill defined for Claude Code → Expected: auto-installs in Gemini CLI and Codex too → Actual: manual copy required, format differs, often skipped
- Given an MCP server config in `~/.claude/settings.json` → Expected: also registered in OpenCode and Codex config → Actual: different key names, different files, done by hand or not at all
- Given a new agent added to the workflow → Expected: all prior AIPs apply retroactively → Actual: no install path exists; prior improvements are silently missing

## Options

### Skills installation

| Option | Description | Pros | Cons | Best for |
| --- | --- | --- | --- | --- |
| agentskills.io + `@vercel-labs/skills` | SKILL.md format; `npx skills add` handles 45 agents | One CLI for all agents; community maintained; discovery, install, update | Must author skills in SKILL.md spec; CC-exclusive fields silently ignored by other agents | Cross-agent skill install |
| Per-agent install scripts | Custom shell script per agent | Full control | Maintenance burden scales with agents | One-off or proprietary skills |
| Symlinks to canonical location | One file, many symlinks | Simple | Agents have different discovery paths; format extensions differ | Same-format agents only |

### MCP server configuration

| Option | Description | Pros | Cons | Best for |
| --- | --- | --- | --- | --- |
| Per-agent config adapters in implement-plan | implement-plan writes each agent's config file | No new tooling; full control | Logic grows with each agent | Small, stable agent set |
| Unified source-of-truth `mcp-servers.json` + sync script | One canonical file; sync writes to each agent's format | Single source of truth | Sync must re-run after agent updates | Multi-agent, stable agent set |

### Commands / slash commands

| Option | Description | Pros | Cons | Best for |
| --- | --- | --- | --- | --- |
| Agent-native per agent | Each agent uses its own command format | No translation layer; full feature support | Commands don't cross agents | Single-agent use |
| Inject stubs into instruction files (AGENTS.md, GEMINI.md) | Append command descriptions as natural language guidance | No new spec; works today | Not interactive slash commands; markdown not menus | Guidance-style commands |

### Hooks

| Option | Description | Pros | Cons | Best for |
| --- | --- | --- | --- | --- |
| Portable shell scripts + per-agent registration | Logic in `hooks/portable/*.sh`; each agent's hook config references them | Shared logic; agent-specific wiring | Per-agent hook registration still required | Hooks with shared logic |
| Claude Code only | Keep hooks in `~/.claude/settings.json` | Already working; no overhead | Improvement siloed in CC | CC-only workflows |

## Decision

**Tiered approach by artifact type, validated against real agent research:**

**Skills** — standardize on the agentskills.io SKILL.md spec. Author skills using only the 6 portable base fields (`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`) for maximum cross-agent compatibility. Claude Code-specific extensions (`context: fork`, `hooks`, `argument-hint`) are permitted but must be documented as CC-only. Use `npx skills add <repo> -a <agents> -g -y` as the primary install mechanism — it handles all four target agents correctly.

**MCP servers** — per-agent config adapters inside `implement-plan`. The `mcp-config` artifact type is extended with a `targets` map: each key is an agent name, value is the config path and merge strategy. Phase 1: Claude Code and Gemini CLI (both use `mcpServers` key — nearly identical). Phase 2: Codex (TOML `[mcp_servers.*]`), OpenCode (JSON `"mcp"` key).

**Commands** — agent-native. Claude Code commands stay as `.claude/commands/*.md`. OpenCode supports `.opencode/commands/<name>.md` with the same frontmatter style. Gemini CLI uses `~/.gemini/commands/<name>.toml`. Codex invokes skills as slash commands (`/skill-name`). No universal cross-agent format exists; generate per-agent command files from a common template where feasible.

**Hooks** — Claude Code primary target. Extract reusable hook logic to standalone shell scripts in `hooks/portable/`. Codex supports hooks in `config.toml`; OpenCode uses plugins; Gemini CLI does not support hooks. Document per agent.

**OpenClaw removed from target list.** Research confirmed OpenClaw is a personal AI messaging gateway (WhatsApp, Telegram, Slack, Discord, etc.), not a coding agent CLI. Its "skills" are social integrations (`apple-notes`, `spotify-player`). It is architecturally incompatible with the coding-agent use case these AIPs address.

Rejected: per-agent install scripts for skills — maintenance cost grows quadratically with (agents × skills).

## Acceptance Criteria

- [ ] All AIP skill artifacts authored using only the 6 portable SKILL.md base fields (CC extensions documented as CC-only)
- [ ] `npx skills add <repo> -a claude-code -g -y` installs a skill to `~/.claude/skills/` without prompts
- [ ] `npx skills add <repo> -a claude-code,codex,opencode,gemini-cli -g -y` installs to all four agents
- [ ] `implement-plan` `mcp-config` artifact type writes correct config for Claude Code and Gemini CLI (Phase 1)
- [ ] `docs/agents/compatibility-matrix.md` exists with all four target agents
- [ ] `implement-plan` accepts `agents:` list in plan frontmatter to target specific agents at install time
- [ ] Existing AIP 0003 `web-research` skill artifact migrated to portable SKILL.md format

## Requirements

**Already satisfied:**

- `node` / `npx` available for `@vercel-labs/skills`
- Claude Code fully supported by existing `implement-plan` infrastructure
- `@vercel-labs/skills` confirmed to install to `~/.claude/skills/` for Claude Code
- Agent research complete for all four target agents (see Implementation Phase 2)

**Needs action:**

- Author or locate a git repo containing the `web-research` skill in SKILL.md format for `npx skills add` distribution
- Implement Codex MCP config adapter (TOML write logic) in `implement-plan`
- Implement OpenCode MCP config adapter (JSON merge) in `implement-plan`
- Add `agents:` frontmatter field support to plan template and `implement-plan`

## Agent Reference

Verified config paths for all four target agents:

### Claude Code

| Artifact | Path |
| --- | --- |
| Skills (global) | `~/.claude/skills/<name>/SKILL.md` |
| Skills (project) | `.claude/skills/<name>/SKILL.md` |
| MCP config | `~/.claude/settings.json` → `mcpServers` key (JSON merge) |
| Commands | `.claude/commands/<name>.md` (YAML frontmatter: `description`, `argument-hint`) |
| Hooks | `~/.claude/settings.json` → `hooks` key |
| Instructions | `CLAUDE.md` (project), `~/.claude/CLAUDE.md` (global) |

`@vercel-labs/skills` agent value: `claude-code`

### Codex CLI

| Artifact | Path |
| --- | --- |
| Skills (global) | `~/.agents/skills/<name>/SKILL.md` |
| Skills (project) | `.agents/skills/<name>/SKILL.md` |
| MCP config | `~/.codex/config.toml` → `[mcp_servers.<name>]` (TOML) |
| Commands | Skills invoked as `/skill-name`; no separate command files |
| Hooks | `~/.codex/config.toml` → `hooks` key (TOML) |
| Instructions | `AGENTS.md` (project), `~/.codex/config.toml` → `instructions` key (global) |

`@vercel-labs/skills` agent value: `codex`

MCP TOML format:

```toml
[mcp_servers.my-server]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
env = { GITHUB_TOKEN = "$MY_TOKEN" }
enabled = true
```

HTTP transport:

```toml
[mcp_servers.remote-server]
url = "https://example.com/mcp"
bearer_token_env_var = "MY_API_TOKEN"
```

### OpenCode

| Artifact | Path |
| --- | --- |
| Skills (global) | `~/.config/opencode/skills/<name>/SKILL.md` |
| Skills (project) | `.opencode/skills/<name>/SKILL.md` or `.agents/skills/<name>/SKILL.md` |
| MCP config | `~/.config/opencode/opencode.json` → `"mcp"` key (JSON merge) |
| Commands | `.opencode/commands/<name>.md` (frontmatter: `description`, `model`, `subtask`) |
| Hooks | Plugins only (`.opencode/plugins/`) |
| Instructions | `AGENTS.md` (project), `~/.config/opencode/AGENTS.md` (global); **falls back to `CLAUDE.md`** if absent |

`@vercel-labs/skills` agent value: `opencode`

MCP JSON format:

```json
{
  "mcp": {
    "my-server": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-github"],
      "environment": { "GITHUB_TOKEN": "$MY_TOKEN" },
      "enabled": true
    }
  }
}
```

HTTP:

```json
{
  "mcp": {
    "remote": {
      "type": "remote",
      "url": "https://example.com/mcp",
      "headers": { "Authorization": "Bearer {env:MY_TOKEN}" }
    }
  }
}
```

### Gemini CLI

| Artifact | Path |
| --- | --- |
| Skills (global) | `~/.gemini/skills/<name>/SKILL.md` |
| Skills (project) | `.agents/skills/<name>/SKILL.md` |
| MCP config | `~/.gemini/settings.json` → `mcpServers` key (same key name as Claude Code) |
| Commands | `~/.gemini/commands/<name>.toml` (global) or `.gemini/commands/<name>.toml` (project) |
| Hooks | Not supported |
| Instructions | `GEMINI.md` (project), `~/.gemini/GEMINI.md` (global) |

`@vercel-labs/skills` agent value: `gemini-cli`

MCP JSON format (identical schema to Claude Code):

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "$MY_TOKEN" },
      "timeout": 30000
    }
  }
}
```

## Implementation

### Phase 1 — Skills standardization

1. Audit the `web-research` skill artifact in AIP 0003; rewrite its frontmatter using only the 6 portable SKILL.md base fields; document any CC-specific extensions as CC-only in the body
2. Host the skill in a git repo so it's installable via `npx skills add <repo> --skill web-research -g -a claude-code -y`
3. Update `implement-plan` skill artifact type: run `npx skills add` as primary installer (using `agents:` list from frontmatter); fall back to direct file write for CC-only skills
4. Add `find-skills` skill (Artifact 1 below) to global Claude Code skills

### Phase 2 — MCP config adapters for Phase 1 agents

1. Extend `mcp-config` artifact type: add optional `targets` map (`agent → {path, format, merge_strategy}`)
2. Implement Claude Code adapter: `jq` merge into `~/.claude/settings.json` under `mcpServers`
3. Implement Gemini CLI adapter: `jq` merge into `~/.gemini/settings.json` under `mcpServers` (same structure)

### Phase 3 — MCP config adapters for Phase 2 agents

1. Implement Codex adapter: `dasel` or `tomlq` merge into `~/.codex/config.toml` under `[mcp_servers.*]`
2. Implement OpenCode adapter: `jq` merge into `~/.config/opencode/opencode.json` under `"mcp"`

### Phase 4 — Multi-agent frontmatter and implement-plan changes

1. Add `agents: [claude-code]` (list, default `[claude-code]`) to plan template frontmatter
2. Add `--agents <list>` CLI flag to `implement-plan` to override frontmatter at run time
3. Add agent detection: check presence of agent-specific config dirs to warn if targeted agent is not installed
4. Write `docs/agents/compatibility-matrix.md` with the verified data from this plan

### Phase 5 — Commands and hooks

1. For OpenCode: generate `.opencode/commands/<name>.md` from `.claude/commands/<name>.md` where the content is portable (no CC-specific tool references)
2. Extract reusable hook logic from `src/hooks/*.ts` into standalone shell scripts in `hooks/portable/`
3. For Codex: document hook registration in `~/.codex/config.toml` for any portable hooks

## Artifacts

### Artifact 1 — find-skills skill

- type: skill
- destination: `~/.claude/skills/find-skills/SKILL.md`

````markdown
---
name: find-skills
description: Search, install, and update agent skills from the agentskills.io catalog using @vercel-labs/skills. Use when the user asks to find a skill, install a skill for a specific agent, or check for skill updates. Supports 45 agents.
---

## Finding and Installing Skills

Use `npx skills` to interact with the agentskills.io catalog.

### Search for skills

```sh
npx skills find <query>
```

### Install a skill globally for one or more agents

```sh
npx skills add <owner/repo> --skill <name> --agent <agent> -g -y
```

For multiple agents:

```sh
npx skills add <owner/repo> --skill <name> --agent claude-code codex opencode gemini-cli -g -y
```

### Install all skills in a repo for all detected agents

```sh
npx skills add <owner/repo> --all
```

### List installed skills

```sh
npx skills list [-g]
```

### Update all skills

```sh
npx skills update [-g] [-y]
```

### Remove a skill

```sh
npx skills remove --skill <name> --agent <agent> -g -y
```

Supported agent values: `claude-code`, `codex`, `opencode`, `gemini-cli`, and 41 others.
When a user asks to find or install a skill, run `npx skills find` first and present results before installing.
````

## Agent-Specific Considerations

- **Silent failures**: An MCP config written to the wrong path or wrong key silently has no effect. Always verify by checking the agent's active server list after install (`/mcp` in Claude Code, `opencode mcp list` for OpenCode).
- **Hallucination risk**: Agent config paths and key names were verified against live documentation (April 2026). Do not assume a path is correct — check `docs/agents/compatibility-matrix.md` or the agent's own docs before writing.
- **Loop risk**: `npx skills add` should not be retried automatically if it fails. Surface the error and ask the user to resolve the npm or network issue first.
- **Tool unavailability**: If `npx` is unavailable, fall back to direct SKILL.md file write to the agent's skills directory. Document the fallback path in the artifact entry.
- **Backwards compatibility**: All existing CC-only AIP artifacts remain valid. Migration to portable SKILL.md format is opt-in; completed plans are not required to update.
- **Agent version drift**: Config formats change with releases. The compatibility matrix records the agent version at time of research; re-validate when major agent versions ship.
- **OpenCode CLAUDE.md fallback**: OpenCode reads `CLAUDE.md` if `AGENTS.md` is absent. This is a benefit (free compatibility) but means changes to `CLAUDE.md` affect OpenCode sessions unexpectedly if AGENTS.md is not present.

## Validation

- AC1: `npx skills add <repo> --skill web-research --agent claude-code -g -y` → `~/.claude/skills/web-research/SKILL.md` written, skill appears in `/skills` listing
- AC2: `npx skills add <repo> --skill web-research --agent claude-code,codex,opencode,gemini-cli -g -y` → skill written to all four agent paths without errors
- AC3: `implement-plan 0003` with `agents: [claude-code, gemini-cli]` → MCP config written to both `~/.claude/settings.json` and `~/.gemini/settings.json`
- AC4: `cat docs/agents/compatibility-matrix.md` → shows all four agents with verified paths
- AC5: `npx skills find web-research` → returns the skill (requires it to be hosted in a discoverable git repo)

## Rollback

Trigger: rollback if cross-agent installs produce config corruption (agent fails to start or silently drops all MCP servers) or if `@vercel-labs/skills` introduces a breaking CLI change that breaks `implement-plan`.

Procedure:

1. Remove any MCP config entries written by the adapter from each affected agent's config file
2. Restore prior skill files: `git show HEAD~1:path/to/SKILL.md > ~/.claude/skills/<name>/SKILL.md`
3. Pin `@vercel-labs/skills` to last known good version: `npx skills@<version>`

## Maintenance

- Re-verify agent config paths when any target agent ships a major version
- Update MCP config adapters if key names or file locations change
- Monitor `@vercel-labs/skills` changelog; update skill format if the spec evolves
- Re-evaluate hooks cross-agent support annually — the ecosystem is converging

## Open Questions

All open questions resolved by research (2026-04-24):

- Q: Does `@vercel-labs/skills` target Claude Code's `~/.claude/skills/`? **Yes** — confirmed via `src/agents.ts` in `vercel-labs/skills`. Project path: `.claude/skills/`; global: `~/.claude/skills/`.
- Q: What is OpenClaw's architecture? **Not a coding agent** — it is a personal AI messaging gateway (WhatsApp, Telegram, Slack, Discord, etc.). Removed from target agent list.
- Q: Should `agents:` frontmatter default to `[claude-code]` only? **Yes** — explicit opt-in to multi-agent installs is safer.
- Q: Can Gemini CLI's `activate_skill` be driven non-interactively? **Yes** via `gemini skills install <url> --scope workspace` — no TTY required. The `@vercel-labs/skills` CLI also works non-interactively against Gemini CLI.

## References

- [agentskills.io](https://agentskills.io) — SKILL.md specification
- [@vercel-labs/skills GitHub](https://github.com/vercel-labs/skills) — CLI and `src/agents.ts` (verified agent paths)
- [skills.sh](https://skills.sh) — community skill discovery/browsing
- [Claude Code settings](https://docs.anthropic.com/en/docs/claude-code/settings) — `mcpServers` and `hooks` in settings.json
- [Codex CLI](https://github.com/openai/codex) — `~/.codex/config.toml`, `[mcp_servers.*]`, `~/.agents/skills/`
- [OpenCode](https://github.com/sst/opencode) — `~/.config/opencode/opencode.json`, `"mcp"` key, AGENTS.md/CLAUDE.md fallback
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) — `~/.gemini/settings.json`, `mcpServers`, `~/.gemini/skills/`
- AIP 0001 — AIP system (`/implement-plan` infrastructure this plan extends)
- AIP 0003 — first skill artifact to be migrated to portable SKILL.md format
