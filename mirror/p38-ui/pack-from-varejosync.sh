#!/usr/bin/env bash
# Atalho bash — preferir: npm run mirror:pack (scripts/mirror-pack.mjs)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec node "$ROOT/scripts/mirror-pack.mjs"
