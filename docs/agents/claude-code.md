# Claude Code — Agent Config Reference

Config root: `~/.claude/`
Research source: [docs.anthropic.com/en/docs/claude-code/settings](https://docs.anthropic.com/en/docs/claude-code/settings)
Last verified: 2026-04-24

## Skills

| Scope | Path |
| --- | --- |
| Global | `~/.claude/skills/<name>/SKILL.md` |
| Project | `.claude/skills/<name>/SKILL.md` |

Install via `@vercel-labs/skills`:

```sh
npx skills add <owner/repo> --skill <name> --agent claude-code -g -y
```

Agent identifier: `claude-code`

CC-only SKILL.md extensions: `context: fork`, `hooks` key. These are silently ignored by other agents.

## MCP Servers

Config file: `~/.claude/settings.json` under `mcpServers`.

Stdio server:

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

HTTP server:

```json
{
  "mcpServers": {
    "remote": {
      "type": "http",
      "url": "https://example.com/mcp",
      "headers": { "Authorization": "Bearer ${MY_TOKEN}" }
    }
  }
}
```

Merge without overwriting the full file:

```sh
jq -s '.[0] * {"mcpServers": .[1]}' ~/.claude/settings.json <(echo '{...}') | sponge ~/.claude/settings.json
```

Verify installed servers: `/mcp` in a Claude Code session.

## Commands

| Scope | Path | Format |
| --- | --- | --- |
| Project | `.claude/commands/<name>.md` | Markdown + YAML frontmatter |
| Global | `~/.claude/commands/<name>.md` | Markdown + YAML frontmatter |

Frontmatter fields: `description` (required), `argument-hint` (optional, shown in command picker).

The body is the prompt template. `$ARGUMENTS` is replaced with any text after the slash command name.

## Hooks

Configured in `~/.claude/settings.json` under `hooks`. Supported events:

| Event | When it fires |
| --- | --- |
| `PreToolUse` | Before any tool call |
| `PostToolUse` | After any tool call |
| `Stop` | When the agent stops generating |
| `Notification` | On agent notification |
| `SessionStart` | On session start |

Each hook entry:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/pre-bash.sh" }]
      }
    ]
  }
}
```

Hook scripts receive context via stdin (JSON) and can block tool use by exiting non-zero.

## Instruction Files

| Scope | File |
| --- | --- |
| Project | `CLAUDE.md` |
| Global | `~/.claude/CLAUDE.md` |

Both are concatenated and injected at the start of every session. The global file runs first.

## Settings File Shape

`~/.claude/settings.json` top-level keys:

```json
{
  "mcpServers": {},
  "hooks": {},
  "permissions": {},
  "env": {}
}
```
