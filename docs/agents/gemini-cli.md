# Gemini CLI — Agent Config Reference

Config root: `~/.gemini/`
Research source: [github.com/google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)
Last verified: 2026-04-24

## Skills

| Scope | Path |
| --- | --- |
| Global | `~/.gemini/skills/<name>/SKILL.md` |
| Project | `.agents/skills/<name>/SKILL.md` |

Install via `@vercel-labs/skills`:

```sh
npx skills add <owner/repo> --skill <name> --agent gemini-cli -g -y
```

Non-interactive install also works via:

```sh
gemini skills install <url> --scope workspace
```

Agent identifier: `gemini-cli`

## MCP Servers

Config file: `~/.gemini/settings.json` under `mcpServers`. Schema is identical to Claude Code.

Stdio server:

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

HTTP/SSE server:

```json
{
  "mcpServers": {
    "remote-sse": {
      "url": "https://example.com/sse"
    },
    "remote-http": {
      "httpUrl": "https://example.com/mcp"
    }
  }
}
```

Merge without overwriting the full file (identical to Claude Code):

```sh
jq -s '.[0] * {"mcpServers": .[1]}' ~/.gemini/settings.json <(echo '{...}') \
  | sponge ~/.gemini/settings.json
```

Because the schema and key name are identical to Claude Code, a single `mcp-config` artifact with both agents in `targets:` (or in the plan's `agents:` list) installs correctly to both without any format translation.

## Commands

| Scope | Path | Format |
| --- | --- | --- |
| Project | `.gemini/commands/<name>.toml` | TOML |
| Global | `~/.gemini/commands/<name>.toml` | TOML |

Example command:

```toml
description = "Search the web for a query"
prompt = "Search the web for: {input}"
```

Gemini CLI commands use TOML, not markdown. There is no direct port of Claude Code's markdown command format; commands must be re-authored in TOML.

## Hooks

Gemini CLI does not support hooks. There is no equivalent to Claude Code's `PreToolUse`/`PostToolUse` system.

## Instruction Files

| Scope | File |
| --- | --- |
| Project | `GEMINI.md` |
| Global | `~/.gemini/GEMINI.md` |

The instruction filename is configurable via settings (`instructionFileName` key). Gemini CLI does not fall back to `CLAUDE.md` — create a `GEMINI.md` in any project that needs Gemini-specific instructions.

## Settings File Shape

`~/.gemini/settings.json` top-level structure:

```json
{
  "mcpServers": {},
  "theme": "Default",
  "instructionFileName": "GEMINI.md"
}
```
