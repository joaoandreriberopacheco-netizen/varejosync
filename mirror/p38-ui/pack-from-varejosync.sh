#!/usr/bin/env bash
# Copia UI P38 do varejosync para mirror/p38-ui/ (correr na raiz do repo).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="$ROOT/mirror/p38-ui"

echo "Origem:  $ROOT"
echo "Destino: $DEST"

copy_path() {
  local rel="$1"
  local src="$ROOT/$rel"
  local dst="$DEST/$rel"
  if [[ ! -e "$src" ]]; then
    echo "  [skip] $rel (não existe)"
    return 0
  fi
  mkdir -p "$(dirname "$dst")"
  if [[ -d "$src" ]]; then
    rsync -a --delete "$src/" "$dst/"
  else
    cp "$src" "$dst"
  fi
  echo "  [ok]   $rel"
}

# Raiz Vite
for f in index.html package.json package-lock.json vite.config.js tailwind.config.js postcss.config.js components.json jsconfig.json; do
  copy_path "$f"
done

copy_path public

# src UI
for d in pages components lib hooks api integrations config entities features styles utils assets paiol; do
  copy_path "src/$d"
done

for f in App.jsx App.css Layout.jsx main.jsx pages.config.js globals.css index.css; do
  copy_path "src/$f"
done

SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

cat > "$DEST/SNAPSHOT.txt" <<EOF
# Registo do espelho P38 → A29
data_espelho=$DATE
varejosync_commit_sha=$SHA
varejosync_branch=$(git -C "$ROOT" branch --show-current 2>/dev/null || echo unknown)
autor=$(git -C "$ROOT" config user.name 2>/dev/null || echo unknown)
notas=Gerado por pack-from-varejosync.sh
EOF

echo ""
echo "Feito. Revisa mirror/p38-ui/ e depois rsync para a29-erp/legacy/varejosync/"
