#!/usr/bin/env bash
# Sincroniza VITE_* para o projecto Vercel (fallback se alguém reactivar build Git nativo).
set -euo pipefail
: "${VERCEL_TOKEN:?VERCEL_TOKEN em falta}"

add_env() {
  local name="$1"
  local value="$2"
  [ -n "$value" ] || return 0
  printf '%s' "$value" | npx --yes vercel@latest env add "$name" production --token "$VERCEL_TOKEN" --force >/dev/null
  echo "  $name → production (Vercel)"
}

echo "[sync-vercel-env] A actualizar env vars de produção no Vercel…"
add_env VITE_P38_PROVIDER "${VITE_P38_PROVIDER:-supabase}"
add_env VITE_P38_BYPASS_BASE44 "${VITE_P38_BYPASS_BASE44:-true}"
add_env VITE_SUPABASE_URL "${VITE_SUPABASE_URL:-}"
add_env VITE_SUPABASE_ANON_KEY "${VITE_SUPABASE_ANON_KEY:-}"
add_env VITE_P38_USE_SUPABASE_AUTH "${VITE_P38_USE_SUPABASE_AUTH:-true}"
echo "[sync-vercel-env] OK."
