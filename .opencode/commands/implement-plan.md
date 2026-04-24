---
description: Implement an approved agent improvement plan by its 4-digit number
---

# Implement Plan

Implement an agent improvement plan by number. Argument: $input (4-digit plan number, e.g. `0001`)

An optional `--agents` flag overrides the plan's `agents:` frontmatter for this install only:
`/implement-plan 0003 --agents claude-code,gemini-cli`

## Steps

1. **Find the plan file**

   Search `docs/improvement-plans/` for a file matching `{NNNN}-*.md` where NNNN is `$input`.
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
   If `--agents` was passed in `$input`, that list overrides the frontmatter value for this run.
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

   c. Install by type — see the Claude Code `implement-plan` command for the full install logic.
      Key types: `skill`, `mcp-config`, `claude-md-addition`, and plain file writes.

   d. Log each install: `✓ Installed {type} → {resolved-destination}`

6. **Run validation**

   Read the **Validation** section. Work through each check listed there.
   Report results for each check: pass or fail with a reason.
   If any check fails, do not mark the plan complete — investigate and fix before continuing.

7. **Complete**

   Update the plan file frontmatter:

   - `status: completed`
   - `updated: {today's date in YYYY-MM-DD}`
   - `version`: bump to the next semver (first implementation → `1.0.0`).

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

- Never skip the Requirements check
- For `claude-md-addition`, check for duplicates before appending
- Skills installed globally take effect on the next session start
- When `source:` is used for skills, `npx skills add` handles agent-specific path resolution
