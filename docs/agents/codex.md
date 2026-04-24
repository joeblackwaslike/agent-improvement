# Codex CLI — Agent Config Reference

Config root: `~/.codex/`
Research source: [github.com/openai/codex](https://github.com/openai/codex)
Last verified: 2026-04-24

## Skills

| Scope | Path |
| --- | --- |
| Global | `~/.agents/skills/<name>/SKILL.md` |
| Project | `.agents/skills/<name>/SKILL.md` |

Install via `@vercel-labs/skills`:

```sh
npx skills add <owner/repo> --skill <name> --agent codex -g -y
```

Agent identifier: `codex`

Codex invokes skills as slash commands (`/skill-name`). There are no separate command files — skills serve both purposes.

## MCP Servers

Config file: `~/.codex/config.toml` under `[mcp_servers.<name>]`.

Stdio server:

```toml
[mcp_servers.my-server]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
env = { GITHUB_TOKEN = "$MY_TOKEN" }
enabled = true
```

HTTP server:

```toml
[mcp_servers.remote]
url = "https://example.com/mcp"
bearer_token_env_var = "MY_API_TOKEN"
```

Merge via `toml-merge.ts` (converts Claude Code JSON format):

```sh
npx tsx src/lib/aip/toml-merge.ts ~/.codex/config.toml '<json-servers-object>'
```

The script preserves existing entries (skips, never overwrites). Creates the file if absent.

## Commands

Codex has no separate command file format. Skills serve as slash commands: install a skill to `~/.agents/skills/<name>/SKILL.md` and invoke it with `/<name>` in a Codex session.

## Hooks

Configured in `~/.codex/config.toml` under `hooks`. Format:

```toml
[hooks]
# Fires before any tool call
pre_tool_use = "bash ~/.claude/hooks/pre-tool.sh"

# Fires after any tool call
post_tool_use = "bash ~/.claude/hooks/post-tool.sh"
```

Each hook value is a shell command string. The hook receives tool context via environment variables or stdin (implementation-dependent — verify against current Codex docs before wiring up hooks).

To register a portable hook script shared with Claude Code:

```toml
[hooks]
pre_tool_use = "bash ~/path/to/hooks/portable/pre-tool.sh"
```

Keep hook logic in `hooks/portable/*.sh` in this repo so it can be referenced by both Claude Code (`~/.claude/settings.json`) and Codex (`~/.codex/config.toml`) without duplication.

## Instruction Files

| Scope | File |
| --- | --- |
| Project | `AGENTS.md` |
| Global | `instructions` key in `~/.codex/config.toml` |

Global instructions example:

```toml
instructions = """
Always use conventional commits.
Prefer async/await over callbacks.
"""
```

## Config File Shape

`~/.codex/config.toml` top-level structure:

```toml
# Global instruction text
instructions = "..."

# MCP server registrations
[mcp_servers.server-name]
command = "..."
args = ["..."]
enabled = true

# Hook registrations
[hooks]
pre_tool_use = "bash ..."
post_tool_use = "bash ..."

# Model preferences
[model]
provider = "openai"
name = "o4-mini"
```
