# Inventário — o que copiar do varejosync para o espelho

Geração automática: `npm run mirror:pack` (ou `./mirror/p38-ui/pack-from-varejosync.sh`).

Marca cada bloco quando tiveres validado o espelho no a29-erp.

## Raiz do app (Vite)

| Ficheiro / pasta | Origem (varejosync) | Destino (mirror/p38-ui) |
|------------------|---------------------|-------------------------|
| `index.html` | `/index.html` | `/index.html` |
| `package.json` | `/package.json` | `/package.json` |
| `package-lock.json` | `/package-lock.json` | `/package-lock.json` |
| `vite.config.js` | `/vite.config.js` | `/vite.config.js` |
| `tailwind.config.js` | `/tailwind.config.js` | `/tailwind.config.js` |
| `postcss.config.js` | `/postcss.config.js` | `/postcss.config.js` |
| `components.json` | `/components.json` | `/components.json` |
| `jsconfig.json` | `/jsconfig.json` | `/jsconfig.json` |
| `public/` | `/public/` | `/public/` |

## Código UI (`src/`)

| Pasta / ficheiro | Origem | Notas |
|------------------|--------|-------|
| `src/pages/` | `/src/pages/` | ~86 ecrãs |
| `src/components/` | `/src/components/` | UI por domínio |
| `src/lib/` | `/src/lib/` | Auth, cache, helpers |
| `src/hooks/` | `/src/hooks/` | |
| `src/api/` | `/src/api/` | Cliente base44/p38 |
| `src/integrations/` | `/src/integrations/` | **Camada P38** — importante para Supabase |
| `src/config/` | `/src/config/` | |
| `src/entities/` | `/src/entities/` | |
| `src/features/` | `/src/features/` | flare, catálogo overlay |
| `src/styles/` | `/src/styles/` | |
| `src/utils/` | `/src/utils/` | |
| `src/assets/` | `/src/assets/` | |
| `src/paiol/` | `/src/paiol/` | Se usares dashboard paiol |
| `src/App.jsx` | `/src/App.jsx` | |
| `src/App.css` | `/src/App.css` | |
| `src/Layout.jsx` | `/src/Layout.jsx` | Menu / shell |
| `src/main.jsx` | `/src/main.jsx` | |
| `src/pages.config.js` | `/src/pages.config.js` | Rotas lazy |
| `src/globals.css` | `/src/globals.css` | |
| `src/index.css` | `/src/index.css` | |

## Opcional (só se o A29 precisar já na 1.ª cópia)

| Item | Origem | Quando incluir |
|------|--------|----------------|
| `supabase/migrations/` | `/supabase/migrations/` | Se ainda não existir equivalente em `packages/db/` no A29 |
| `docs/migration/` | `/docs/migration/` | Referência de cutover / paridade |
| `src/docs/migration/` | `/src/docs/migration/` | Manifestos de entidades |

## Não copiar para o espelho UI

| Item | Motivo |
|------|--------|
| `base44/` | Backend Base44 — no A29 vai para `packages/api/` |
| `node_modules/` | Pesado; `npm install` no destino |
| `.env*` | Segredos; criar `.env` novo no A29 |
| `dist/`, `build/` | Artefactos de build |
| `.git/` | Histórico fica no repo original |
| `mirror/` | Esta pasta de exportação |

## Checklist rápido

- [ ] Raiz Vite (9 itens)
- [ ] `src/pages/`
- [ ] `src/components/`
- [ ] `src/lib/`, `hooks/`, `api/`, `integrations/`
- [ ] `App.jsx`, `Layout.jsx`, `main.jsx`, `pages.config.js`
- [ ] CSS (`globals.css`, `index.css`, `styles/`)
- [ ] `public/`
- [ ] `VAREJO_UI_SYNC.stamp` visível em `legacy/varejosync/` no A29
- [ ] `mirrorpass` com uma palavra em `legacy/varejosync/mirrorpass`
- [ ] `SNAPSHOT.txt` preenchido (local no varejosync)
