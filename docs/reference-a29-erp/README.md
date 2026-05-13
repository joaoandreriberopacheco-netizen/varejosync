# A29-ERP — cópia local SÓ PARA LEITURA (referência)

> Explorador de ficheiros: abre primeiro [`PLACA_AVISO.txt`](PLACA_AVISO.txt) nesta pasta.

```
================================================================================
||                                                                            ||
||   ESTE DIRECTÓRIO NÃO É CÓDIGO DO VAREJOSYNC. NÃO FAZ PARTE DO BUILD.     ||
||   NÃO IMPORTAR EM `src/`. NÃO COPIAR SEGREDOS. NÃO COMMITAR O CHECKOUT.     ||
||                                                                            ||
||   Propósito: ter o repositório **a29-erp** ao lado para comparar política  ||
||   de embalagens, UX, OCR, catálogo, etc., sem abrir outro workspace.       ||
||                                                                            ||
================================================================================
```

## O que fazer (uma vez na tua máquina)

1. Garante que existe a pasta `checkout` (fica **fora do Git** — ver `.gitignore` na raiz do varejosync).

2. No terminal, na raiz do **varejosync**:

   ```bash
   mkdir -p docs/reference-a29-erp/checkout
   cd docs/reference-a29-erp/checkout
   git clone --depth 1 <URL_DO_TEU_REPO_A29_ERP> .
   ```

   No PowerShell (Windows):

   ```powershell
   New-Item -ItemType Directory -Force -Path docs/reference-a29-erp/checkout | Out-Null
   Set-Location docs/reference-a29-erp/checkout
   git clone --depth 1 <URL_DO_TEU_REPO_A29_ERP> .
   ```

3. Opcional: atualizar só para ver diferenças (sem alterar o teu trabalho no varejosync):

   ```bash
   cd docs/reference-a29-erp/checkout && git fetch && git pull
   ```

## Regras

| Faz | Não faz |
|-----|---------|
| Ler, pesquisar, comparar ficheiros | `import` a partir de `checkout/` no Vite/React |
| Copiar **ideias** ou excertos para `src/` à mão, adaptando | Apontar `alias` no `vite.config` para esta pasta |
| Documentar diferenças em PR/commit do varejosync | Commitar o conteúdo de `checkout/` (está gitignored) |
| Tratar código A29 como fonte de verdade **só** para o monorepo A29 | Assumir que APIs/RLS do A29 existem no Base44 |

## Onde cruzar com o VarejoSync

- Inventário e gap (preencher após clone A29): [`docs/migration/A29_EMBALAGENS_INVENTORY.md`](../migration/A29_EMBALAGENS_INVENTORY.md), [`docs/migration/A29_VS_VAREJO_EMBALAGENS_GAP.md`](../migration/A29_VS_VAREJO_EMBALAGENS_GAP.md)
- Domínio de unidades / embalagens no cliente: `src/lib/productUnits.js`
- Planilhas embalagens: `src/components/produtos/massa/`

## Modelo de tabela de gaps (copiar para notas ou PR)

| Área | A29 (caminho) | VarejoSync (caminho) | Acção |
|------|---------------|----------------------|--------|
| Domínio | `…` | `src/lib/productUnits.js` | … |
| UI produto | `…` | `…` | … |
| Import massa | `…` | `ImportacaoProdutos.jsx` / `embalagensPlanilhaUtils.js` | … |
| OCR compras | `…` | `ImportadorPedidoCompra.jsx` / integrações | … |
| Catálogo | `…` | `…` | … |

Quando `checkout/` estiver vazio, o Cursor/agente não consegue inventariar o A29 aqui — preenche primeiro com `git clone`.

## Atalho (Windows)

Na raiz do varejosync, com URL real do monorepo:

```powershell
$env:A29_ERP_GIT_URL = 'https://github.com/SEU_ORG/a29-erp.git'
.\scripts\clone-a29-reference.ps1
```

Ou: `.\scripts\clone-a29-reference.ps1 -RemoteUrl 'https://...'`

Também há `PLACA_AVISO.txt` nesta pasta para quem abre o explorador de ficheiros.
