---
argument-hint: "[title hint]"
description: Create a new numbered agent improvement plan and open a GitHub issue
---

# New Plan

Create a new agent improvement plan. Argument (optional): $ARGUMENTS

## Steps

1. **Determine the next plan number**

   List `docs/improvement-plans/` and find all files matching `[0-9][0-9][0-9][0-9]-*.md`.
   Extract the highest 4-digit prefix and increment by 1. Zero-pad to 4 digits (e.g. `0042`).
   If no plans exist yet, start at `0001`.

2. **Determine the slug**

   If `$ARGUMENTS` is provided, slugify it: lowercase, replace spaces/special chars with hyphens,
   strip leading/trailing hyphens, truncate to 40 chars.
   If no argument is provided, ask the user for a short title and slugify it.

3. **Create the plan file**

   Copy `docs/improvement-plans/template.md` to `docs/improvement-plans/{NNNN}-{slug}.md`.
   Pre-fill the frontmatter:

   - `num`: the 4-digit number as a quoted string (e.g. `"0042"`)
   - `created`: today's date in `YYYY-MM-DD` format
   - `updated`: same as `created`
   - Leave all other frontmatter fields at their template defaults for the user to fill in.

   The `## Variables` section (between the frontmatter and `## Summary`) holds plan-specific
   named values that `implement-plan` substitutes into artifact content at install time.
   Ask the user if there are any environment variables, file paths, or credentials the plan
   needs — populate those as `KEY: value` entries. Leave the HTML comment placeholder if none.

4. **Create the GitHub issue**

   Run:

   ```sh
   gh issue create \
     --repo joeblackwaslike/AIPs \
     --title "[{NNNN}] {title from frontmatter}" \
     --body "Plan file: docs/improvement-plans/{NNNN}-{slug}.md" \
     --label "improvement-plan" \
     --label "status/draft"
   ```

   If the labels don't exist yet, create them first:

   ```sh
   gh label create "improvement-plan" --color "0075ca" --repo joeblackwaslike/AIPs
   gh label create "status/draft" --color "e4e669" --repo joeblackwaslike/AIPs
   ```

   The plan number `num` is the canonical link between the plan file and the GH issue — no URL
   is stored in frontmatter. Issues are found by searching for `[{NNNN}]` in the title.

5. **Display and guide**

   Show the created plan file path and the GH issue URL.
   Then walk the user through each section in order:

   - **Summary**: ask for 1–2 sentences, outcome-first
   - **Problem**: ask for current behavior + 2–3 failure examples
   - **Options**: remind that ≥2 credible alternatives are required; ask about tool preferences,
     org constraints, model preferences as relevant
   - **Decision**: fill in after Options is complete
   - Remaining sections: offer to help fill in each one

6. **Remind**

   - Status stays `draft` until the user reviews and sets it to `review`, then `approved`
   - Version starts at `0.1.0` (draft). Bump to `1.0.0` on first implementation. After that:
     patch = fixes/clarifications, minor = new content/ACs, major = decision change
   - Update the `updated` date and `version` together whenever the file changes
   - GH issues are never closed — AIPs are living documents that evolve as the AI space changes
   - Add area and priority labels to the GH issue once frontmatter is filled in:

   ```sh
   gh issue edit {issue-number} --add-label "area/{area}" --add-label "priority/{priority}"
   ```
