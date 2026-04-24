#!/usr/bin/env bash
set -euo pipefail

REAL_SCRIPT="$(realpath "${BASH_SOURCE[0]}")"
REPO_DIR="$(cd "$(dirname "$REAL_SCRIPT")/.." && pwd)"

exec npx tsx "$REPO_DIR/src/hooks/session-end.ts"
