# Agent Compatibility Matrix

Verified paths and feature support for all AIP target agents.
Last verified: 2026-04-24. Re-validate when a target agent ships a major version.

## Target Agents

| Agent | Identifier | Config Root | Research Source |
| --- | --- | --- | --- |
| Claude Code | `claude-code` | `~/.claude/` | [docs](https://docs.anthropic.com/en/docs/claude-code/settings) |
| Codex CLI | `codex` | `~/.codex/` | [github](https://github.com/openai/codex) |
| OpenCode | `opencode` | `~/.config/opencode/` | [github](https://github.com/sst/opencode) |
| Gemini CLI | `gemini-cli` | `~/.gemini/` | [github](https://github.com/google-gemini/gemini-cli) |

## Skills

| Agent | `@vercel-labs/skills` value | Project path | Global path | Format |
| --- | --- | --- | --- | --- |
| Claude Code | `claude-code` | `.claude/skills/<name>/SKILL.md` | `~/.claude/skills/<name>/SKILL.md` | SKILL.md directory |
| Codex CLI | `codex` | `.agents/skills/<name>/SKILL.md` | `~/.agents/skills/<name>/SKILL.md` | SKILL.md directory |
| OpenCode | `opencode` | `.agents/skills/<name>/SKILL.md` | `~/.config/opencode/skills/<name>/SKILL.md` | SKILL.md directory |
| Gemini CLI | `gemini-cli` | `.agents/skills/<name>/SKILL.md` | `~/.gemini/skills/<name>/SKILL.md` | SKILL.md directory |

Install command (all agents, global, non-interactive):

```sh
npx skills add <owner/repo> --skill <name> --agent claude-code codex opencode gemini-cli -g -y
```

## MCP Servers

| Agent | Config file | Key | Format | Transport support |
| --- | --- | --- | --- | --- |
| Claude Code | `~/.claude/settings.json` | `mcpServers` | JSON | stdio, HTTP (`type: http`) |
| Codex CLI | `~/.codex/config.toml` | `[mcp_servers.<name>]` | TOML | stdio (`command`), HTTP (`url`) |
| OpenCode | `~/.config/opencode/opencode.json` | `mcp` | JSON | local (`type: local`), remote (`type: remote`) |
| Gemini CLI | `~/.gemini/settings.json` | `mcpServers` | JSON | stdio (`command`), SSE (`url`), HTTP (`httpUrl`) |

### Config examples

**Claude Code / Gemini CLI** (identical `mcpServers` schema):

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "$MY_TOKEN" }
    }
  }
}
```

**Codex CLI** (`~/.codex/config.toml`):

```toml
[mcp_servers.my-server]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
env = { GITHUB_TOKEN = "$MY_TOKEN" }
enabled = true
```

**OpenCode** (`~/.config/opencode/opencode.json`):

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

## Commands / Slash Commands

| Agent | Mechanism | File format | Location |
| --- | --- | --- | --- |
| Claude Code | `.claude/commands/<name>.md` | Markdown + YAML frontmatter (`description`, `argument-hint`) | `.claude/commands/` (project), `~/.claude/commands/` (global) |
| Codex CLI | Skills invoked as `/skill-name` | SKILL.md | `.agents/skills/<name>/SKILL.md` |
| OpenCode | `.opencode/commands/<name>.md` | Markdown + frontmatter (`description`, `model`, `subtask`) | `.opencode/commands/` (project), `~/.config/opencode/commands/` (global) |
| Gemini CLI | `.gemini/commands/<name>.toml` | TOML | `.gemini/commands/` (project), `~/.gemini/commands/` (global) |

## Hooks

| Agent | Support | Location | Format |
| --- | --- | --- | --- |
| Claude Code | Full (`PreToolUse`, `PostToolUse`, `Stop`, etc.) | `hooks` key in `~/.claude/settings.json` | JSON |
| Codex CLI | Yes | `hooks` key in `~/.codex/config.toml` | TOML |
| OpenCode | Via plugins only | `.opencode/plugins/` | Plugin format |
| Gemini CLI | Not supported | — | — |

## Instruction Files

| Agent | Project file | Global file | Notes |
| --- | --- | --- | --- |
| Claude Code | `CLAUDE.md` | `~/.claude/CLAUDE.md` | |
| Codex CLI | `AGENTS.md` | `instructions` key in `config.toml` | |
| OpenCode | `AGENTS.md` | `~/.config/opencode/AGENTS.md` | **Falls back to `CLAUDE.md`** if absent |
| Gemini CLI | `GEMINI.md` | `~/.gemini/GEMINI.md` | Filename configurable via settings |

## Feature Support Summary

| Feature | Claude Code | Codex CLI | OpenCode | Gemini CLI |
| --- | --- | --- | --- | --- |
| Skills (`@vercel-labs/skills`) | ✓ | ✓ | ✓ | ✓ |
| SKILL.md `context: fork` | ✓ (CC only) | — | — | — |
| SKILL.md `hooks` | ✓ (CC only) | — | — | — |
| MCP servers | ✓ | ✓ | ✓ | ✓ |
| Slash commands | ✓ | via skills | ✓ | ✓ (TOML) |
| Hooks | ✓ | ✓ | via plugins | — |
| Non-interactive headless | ✓ | ✓ | ✓ | ✓ (`-p` flag) |
| Reads `CLAUDE.md` | ✓ | — | ✓ (fallback) | — |

## Excluded Agents

**OpenClaw** — personal AI messaging gateway (WhatsApp, Telegram, Slack, etc.), not a coding agent.
Its skill system targets social integrations, not developer workflows. Excluded from AIP targets.
