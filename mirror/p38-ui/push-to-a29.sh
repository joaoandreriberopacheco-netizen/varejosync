#!/usr/bin/env bash
# Atalho bash — preferir: npm run mirror:push -- /caminho/a29-erp
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec node "$ROOT/scripts/mirror-push-a29.mjs" "$@"
