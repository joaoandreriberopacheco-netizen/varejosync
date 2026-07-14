# Espelho P38 → a29-erp

Pasta de **exportação** do código VarejoSync para o monorepo **a29-erp**. Não entra no build de produção do Base44.

## Fluxo (2 passos)

```bash
# Tudo num comando (pack + push, mantém paleta A29 por defeito)
npm run mirror:sync -- ../a29-erp

# Ou em dois passos:
npm run mirror:pack
npm run mirror:push -- ../a29-erp
```

Por defeito o **push preserva a paleta do A29** (`tailwind.config.js`, `globals.css`, `index.css`, `p38-identity.css`) e actualiza páginas, componentes e layout com as últimas mudanças do VarejoSync.

Para sobrescrever também as cores: `npm run mirror:push -- ../a29-erp --no-preserve-theme`

Destino no a29-erp: **`legacy/varejosync/`** (snapshot da UI Vite + integrações P38).

## Sync automático (GitHub Actions)

Com secrets `A29_ERP_GIT_URL` e `A29_ERP_DEPLOY_TOKEN` no varejosync: **Actions → Sync mirror to a29-erp → Run workflow**.

## O que vai no espelho

| Origem (varejosync) | Destino (a29-erp) |
|---------------------|-------------------|
| `mirror/p38-ui/` | `legacy/varejosync/` |

Inclui: `src/` (páginas, componentes, `integrations/p38`, etc.), `public/`, ficheiros Vite na raiz.  
**Não inclui:** `base44/` (funções serverless Base44), `node_modules/`, `.env*`.

Lista completa: [`p38-ui/INVENTARIO.md`](./p38-ui/INVENTARIO.md).

## Estrutura

```
mirror/
├── README.md           ← este ficheiro
└── p38-ui/             ← espelho gerado (scaffold versionado; conteúdo gerado localmente)
    ├── pack-from-varejosync.sh
    ├── push-to-a29.sh
    ├── INVENTARIO.md
    └── SNAPSHOT.example.txt  ← modelo; o pack gera SNAPSHOT.txt local (não versionado)
```

## Notas

- O conteúdo **gerado** pelo `mirror:pack` fica **fora do Git** (ver `.gitignore` em `p38-ui/`). Só a documentação e scripts sobem para o remoto.
- Depois de validares no A29, não há sync automático — repete pack + push quando quiseres actualizar o snapshot.
- Para **ler** o a29-erp sem exportar (comparação de embalagens, OCR, etc.): [`docs/reference-a29-erp/README.md`](../docs/reference-a29-erp/README.md).
