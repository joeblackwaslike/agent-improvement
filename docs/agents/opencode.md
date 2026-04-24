# OpenCode — Agent Config Reference

Config root: `~/.config/opencode/`
Research source: [github.com/sst/opencode](https://github.com/sst/opencode)
Last verified: 2026-04-24

## Skills

| Scope | Path |
| --- | --- |
| Global | `~/.config/opencode/skills/<name>/SKILL.md` |
| Project | `.opencode/skills/<name>/SKILL.md` or `.agents/skills/<name>/SKILL.md` |

Install via `@vercel-labs/skills`:

```sh
npx skills add <owner/repo> --skill <name> --agent opencode -g -y
```

Agent identifier: `opencode`

## MCP Servers

Config file: `~/.config/opencode/opencode.json` under `"mcp"` key.

OpenCode's server schema differs from Claude Code:

- `command` is an array (not a string + separate `args`)
- Uses `"environment"` instead of `"env"`
- Requires `"type": "local"` for stdio servers, `"type": "remote"` for HTTP

Stdio server:

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

HTTP server:

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

Merge without overwriting the full file:

```sh
jq -s '.[0] * {"mcp": .[1]}' ~/.config/opencode/opencode.json <(echo '{...}') \
  | sponge ~/.config/opencode/opencode.json
```

When auto-detecting from a plan's `agents:` list and the artifact content is in Claude Code format, note that the schema differs. Use explicit `targets:` with per-agent content blocks when schema correctness matters.

## Commands

| Scope | Path | Format |
| --- | --- | --- |
| Project | `.opencode/commands/<name>.md` | Markdown + YAML frontmatter |
| Global | `~/.config/opencode/commands/<name>.md` | Markdown + YAML frontmatter |

Frontmatter fields: `description` (required), `model` (optional), `subtask` (optional boolean).

The body is the prompt template. `$input` replaces the argument passed to the slash command. This repo's `.opencode/commands/` contains ports of the Claude Code commands.

## Hooks

OpenCode does not support hooks natively. Hook-like behavior requires writing a plugin in `.opencode/plugins/`. No equivalent to Claude Code's `PreToolUse`/`PostToolUse` hook events.

## Instruction Files

| Scope | File | Notes |
| --- | --- | --- |
| Project | `AGENTS.md` | Primary |
| Project (fallback) | `CLAUDE.md` | Read if `AGENTS.md` is absent |
| Global | `~/.config/opencode/AGENTS.md` | |

The `CLAUDE.md` fallback is a benefit (free compatibility with Claude Code projects) but means changes to `CLAUDE.md` affect OpenCode sessions when `AGENTS.md` is absent. Create a project `AGENTS.md` to decouple the two agents.

## Config File Shape

`~/.config/opencode/opencode.json` top-level structure:

```json
{
  "mcp": {
    "server-name": {
      "type": "local",
      "command": ["npx", "-y", "..."],
      "environment": {},
      "enabled": true
    }
  },
  "model": "claude-sonnet-4-6",
  "theme": "opencode"
}
```
