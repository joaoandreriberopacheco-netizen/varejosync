#!/usr/bin/env bash
# Ignora builds automáticos do Git na Vercel (sem VITE_SUPABASE_* no painel).
# Deploy canónico: GitHub Actions workflow "Vercel Deploy" com secrets.
# Para forçar build nativo Vercel: incluir [vercel-native-build] na mensagem de commit.
set -e
if git log -1 --pretty=%B 2>/dev/null | grep -qF '[vercel-native-build]'; then
  echo 'Build nativo Vercel solicitado via [vercel-native-build] no commit.'
  exit 1
fi
echo 'Skip: deploy via GitHub Actions (env Supabase nos secrets).'
exit 0
