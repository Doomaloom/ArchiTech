#!/usr/bin/env bash
set -euo pipefail

# Loads variables from .env.local into the current shell.
# Usage: source scripts/set-gemini-env.sh

ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env.local at $ENV_FILE" >&2
  return 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

echo "Loaded GEMINI_API_KEY and GEMINI_MODEL (if set) from .env.local"
