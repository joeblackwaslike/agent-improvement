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

# Run tests
test:
    npx vitest run

# Type-check without emitting
typecheck:
    npx tsc --noEmit
