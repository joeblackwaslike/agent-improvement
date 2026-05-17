# Deploy new hooks to ~/.claude/hooks/ via symlink
deploy:
    #!/usr/bin/env bash
    set -euo pipefail
    REPO="$(cd "$(dirname "{{justfile()}}")" && pwd)"
    for hook in hooks/*.sh; do
        name=$(basename "$hook")
        target="$HOME/.claude/hooks/$name"
        ln -sf "$REPO/$hook" "$target"
        echo "Linked: $name"
    done

# Remove symlinks created by deploy
undeploy:
    #!/usr/bin/env bash
    set -euo pipefail
    for hook in hooks/*.sh; do
        name=$(basename "$hook")
        target="$HOME/.claude/hooks/$name"
        if [ -L "$target" ]; then
            rm "$target"
            echo "Removed: $name"
        fi
    done

# Symlink all skills from agent-skills into this repo's skills/ dir
link-skills:
    #!/usr/bin/env bash
    set -euo pipefail
    AGENT_SKILLS="/Users/joe/github/joeblackwaslike/agent-skills/skills"
    SKILLS_DIR="$(cd "$(dirname "{{justfile()}}")" && pwd)/skills"
    mkdir -p "$SKILLS_DIR"
    for skill_dir in "$AGENT_SKILLS"/*/; do
        name=$(basename "$skill_dir")
        target="$SKILLS_DIR/$name"
        if [ ! -e "$target" ]; then
            ln -s "$skill_dir" "$target"
            echo "Linked: $name"
        else
            echo "Skipped (exists): $name"
        fi
    done

# Run tests
test:
    npx vitest run

# Type-check without emitting
typecheck:
    npx tsc --noEmit
