---
argument-hint: "<NNNN> [--agents agent1,agent2]"
description: Implement an approved agent improvement plan by its 4-digit number
---

# Implement Plan

Implement an agent improvement plan by number. Argument: $ARGUMENTS (4-digit plan number, e.g. `0001`)

An optional `--agents` flag overrides the plan's `agents:` frontmatter for this install only:
`/implement-plan 0003 --agents claude-code,gemini-cli`

## Steps

1. **Find the plan file**

   Search `docs/improvement-plans/` for a file matching `{NNNN}-*.md` where NNNN is `$ARGUMENTS`.
   If not found, abort with: "No plan found for number {NNNN}. Run `/new-plan` to create one."

2. **Read and validate the plan**

   Read the plan file in full.
   If `status` is not `approved`, abort with:
   "Plan {NNNN} has status '{status}' — only approved plans can be implemented.
   Update the frontmatter to `status: approved` when the plan is ready."

   **Parse Variables** (between the frontmatter `---` and the first `##` heading other than `## Variables`).
   Each non-comment line of the form `KEY: value` becomes a substitution variable.
   When installing artifacts (step 5), replace every `${KEY}` in artifact content with its resolved value before writing.
   Variable values may use `~` for home directory expansion (e.g. `~/creds.zsh` → `/Users/{username}/creds.zsh`).

   **Parse `agents:`** from frontmatter (list, default: `[claude-code]`).
   If `--agents` was passed in `$ARGUMENTS`, that list overrides the frontmatter value for this run.
   Only install artifacts to agents in the resolved list.

3. **Verify requirements**

   Read the **Requirements** section. For each item under "Needs action":

   - Check whether the requirement is satisfied (MCP connected, env var set, package installed, etc.)
   - If any are unmet, list them clearly and abort: "Requirements not met — resolve these before implementing."

4. **Sync GitHub issue to in-progress**

   Find the GH issue for this plan:

   ```sh
   gh issue list --repo joeblackwaslike/AIPs --search "[{NNNN}]" --json number,title
   ```

   If found, add the `status/in-progress` label and remove `status/draft` or `status/approved`:

   ```sh
   gh issue edit {number} --repo joeblackwaslike/AIPs --add-label "status/in-progress" --remove-label "status/draft" --remove-label "status/approved"
   ```

   If no issue exists, create one:

   ```sh
   gh issue create --repo joeblackwaslike/AIPs \
     --title "[{NNNN}] {plan title}" \
     --body "Plan file: docs/improvement-plans/{NNNN}-{slug}.md" \
     --label "improvement-plan" --label "status/in-progress"
   ```

5. **Install artifacts**

   Read the **Artifacts** section. For each artifact entry, in order:

   a. Parse `type`, `destination` (or `targets`), and `content` / `source`.

   b. Resolve the destination path (for single-destination artifacts):

      - Paths starting with `~/` → expand to the user's home directory
      - Paths starting with `plugin:{name}/` → `~/.claude/plugins/{name}/`
      - Relative paths → relative to the repo root

   c. Install by type:

      **`skill`**

      Two sub-cases based on whether `source:` is present:

      - **`source: owner/repo`** — install via `@vercel-labs/skills` for each agent in the resolved agents list:

        ```sh
        npx skills add {source} --skill {skill-name} --agent {agent1} {agent2} ... -g -y
        ```

        This installs to each agent's global skills directory automatically.

      - **No `source:` (embedded content block)** — write the content directly to `destination`.
        For Claude Code, prefer the directory format: create `~/.claude/skills/{name}/SKILL.md`.
        Create parent directories as needed.

      **`mcp-config`**

      Agent-to-config mapping (used for auto-detection and as a lookup reference):

      | Agent | Config file | Key | Format |
      | --- | --- | --- | --- |
      | `claude-code` | `~/.claude/settings.json` | `mcpServers` | JSON |
      | `gemini-cli` | `~/.gemini/settings.json` | `mcpServers` | JSON |
      | `opencode` | `~/.config/opencode/opencode.json` | `mcp` | JSON |
      | `codex` | `~/.codex/config.toml` | `mcp_servers` | TOML |

      Two sub-cases based on whether `targets:` list is present:

      - **`targets:` list** — explicit list of `{agent, path, key}` entries. For each entry
        whose `agent` is in the resolved agents list, merge the artifact content under the
        specified key in the target's config file using the format for that agent (below).

      - **No `targets:` (auto-detect)** — build targets automatically from the resolved agents
        list using the mapping above. The artifact `content` is treated as Claude Code `mcpServers`
        JSON format and translated as needed per agent.

      **JSON merge** (Claude Code, Gemini CLI, OpenCode):

      ```sh
      # mcpServers key (claude-code, gemini-cli):
      jq -s '.[0] * {"mcpServers": .[1]}' {path} <(echo '{content}') | sponge {path}
      # mcp key (opencode):
      jq -s '.[0] * {"mcp": .[1]}' {path} <(echo '{content}') | sponge {path}
      ```

      If `sponge` is unavailable: write to a temp file then `mv`. Never redirect output back
      to the source file in a pipeline. Create the destination file with `{}` if it does not exist.

      Note: OpenCode's per-server schema differs from Claude Code (`command` is an array,
      uses `environment` instead of `env`, requires `"type": "local"`). When auto-detecting
      targets and the schemas matter, provide per-agent content blocks via explicit `targets:`.
      For simple stdio servers where minor schema differences are acceptable, the auto-detect
      merge works as a best-effort install.

      **TOML merge** (Codex):

      ```sh
      npx tsx src/lib/aip/toml-merge.ts ~/.codex/config.toml '{content}'
      ```

      `toml-merge.ts` converts the Claude Code `mcpServers` JSON format to Codex TOML
      `[mcp_servers.*]` sections. Existing entries are skipped (never overwritten). Creates
      the file if absent. HTTP servers: emits `url` + `bearer_token_env_var` from the
      `Authorization` header's env-var reference. Stdio servers: emits `command`, `args`,
      `env`, `enabled = true`.

      **`claude-md-addition`** — append the content block to the destination file.
      Check for a duplicate heading first; skip if it already exists.

      **All other types** — write the content as a new file at the destination.
      Create parent directories as needed (`mkdir -p`).

   d. Log each install: `✓ Installed {type} → {resolved-destination}`

6. **Run validation**

   Read the **Validation** section. Work through each check listed there.
   Report results for each check: pass or fail with a reason.
   If any check fails, do not mark the plan complete — investigate and fix before continuing.

7. **Complete**

   Update the plan file frontmatter:

   - `status: completed`
   - `updated: {today's date in YYYY-MM-DD}`
   - `version`: bump to the next semver — patch for fixes/clarifications, minor for new content or
     acceptance criteria, major for a decision change. First implementation always lands at `1.0.0`.

   Sync the GH issue — **do not close it** (AIPs are living documents):

   ```sh
   gh issue edit {number} --repo joeblackwaslike/AIPs --add-label "status/completed" --remove-label "status/in-progress"
   ```

   Stage and commit:

   ```sh
   git add docs/improvement-plans/{NNNN}-*.md
   git commit -m "feat: implement plan {NNNN} v{version} — {plan title}"
   git push
   ```

   Print a summary: which artifacts were installed and where, which validation checks passed.

## Notes

- Never skip the Requirements check — installing artifacts into a broken environment wastes time
- For `claude-md-addition`, check for duplicates before appending (search for the section heading)
- If a skill or command already exists at the destination, show a diff and ask the user before overwriting
- Skills installed to `~/.claude/skills/` take effect in the next Claude Code session
- Plugin artifacts (`plugin:{name}/...`) take effect after the plugin is reloaded
- Skill directory format (`~/.claude/skills/{name}/SKILL.md`) is preferred over flat files for new skills
- When `source:` is used for skills, `npx skills add` handles agent-specific path resolution automatically
