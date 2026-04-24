---
argument-hint: "<NNNN>"
description: Implement an approved agent improvement plan by its 4-digit number
---

# Implement Plan

Implement an agent improvement plan by number. Argument: $ARGUMENTS (4-digit plan number, e.g. `0001`)

## Steps

1. **Find the plan file**

   Search `docs/improvement-plans/` for a file matching `{NNNN}-*.md` where NNNN is `$ARGUMENTS`.
   If not found, abort with: "No plan found for number {NNNN}. Run `/new-plan` to create one."

2. **Read and validate the plan**

   Read the plan file in full.
   If `status` is not `approved`, abort with:
   "Plan {NNNN} has status '{status}' — only approved plans can be implemented.
   Update the frontmatter to `status: approved` when the plan is ready."

   Parse the **Variables** section (between the frontmatter `---` and the first `##` heading
   other than `## Variables`). Each non-comment line of the form `KEY: value` becomes a
   substitution variable. When installing artifacts (step 5), replace every `${KEY}` in the
   artifact content with its resolved value before writing.

   Variable values may reference shell environment variables using `~` for home directory
   expansion (e.g. `~/creds.zsh` → `/Users/{username}/creds.zsh`). Expand them before use.

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
   gh issue edit {number} --add-label "status/in-progress" --remove-label "status/draft" --remove-label "status/approved"
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

   a. Parse `type`, `destination`, and `content` (the fenced code block).

   b. Resolve the destination path:

      - Paths starting with `~/` → expand to the user's home directory
      - Paths starting with `plugin:{name}/` → `~/.claude/plugins/{name}/`
      - Relative paths → relative to the repo root

   c. Install by type:

      - `claude-md-addition` — append the content block to the destination file
        (check for duplicate heading first)
      - `mcp-config` — merge the artifact's JSON into the destination file under the `mcpServers` key.
        Command: `jq -s '.[0] * .[1]' {destination} <(echo '{artifact-json}') | sponge {destination}`
        If `sponge` is unavailable: write to a temp file then `mv`. Never overwrite the full settings file.
      - All other types — write the content as a new file at the destination.

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
