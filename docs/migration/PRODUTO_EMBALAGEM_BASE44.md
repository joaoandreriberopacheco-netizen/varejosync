# ProdutoEmbalagem (Base44) — opção B

Unidade de vitrine e JSON em `Produto`: [PRODUTO_UNIDADE_EXIBICAO.md](./PRODUTO_UNIDADE_EXIBICAO.md).

Entidade auxiliar **`ProdutoEmbalagem`** ligada ao produto por **`produto_id`** (texto = `Produto.id`). No máximo **3 linhas ativas** por produto: **1 base** (`is_principal`, fator de conversão **1**) + **até 2 adicionais**; entre as ativas, **exatamente uma** com **`is_comercial: true`**.

O código em `varejosync` só usa esta entidade quando a variável de ambiente **`VITE_USE_PRODUTO_EMBALAGEM_ENTITY=true`**. Caso contrário, ou se a entidade ainda não existir no SDK, o fluxo **não altera** o comportamento atual (campos legados em `Produto`).

## Campos sugeridos na consola Base44

| Campo | Tipo | Notas |
|-------|------|--------|
| `id` | texto | Gerado pelo Base44 |
| `produto_id` | texto | FK → `Produto.id` (mesmo padrão que `MovimentacaoEstoque.produto_id`, etc.) |
| `sigla` | texto | Sigla normalizada (UN, CX, M2…) |
| `nome` | texto | Rótulo amigável |
| `fator_conversao` | número | Na base: **1** |
| `percentual_preco_vs_principal` | número | Opcional; espelha ajuste de preço vs principal |
| `ordem` | número | 0…2 para ordenação estável |
| `is_principal` | boolean | Uma linha `true` por produto |
| `is_comercial` | boolean | **Uma** linha `true` por produto (vitrine) |
| `ativo` | boolean | Default `true`; linhas inativas podem ser ignoradas na leitura |

Regra de negócio: validar na consola ou via automação que não há mais de **3** linhas ativas nem mais de uma **`is_comercial`** por `produto_id`.

## Ativação no Vite

No `.env` local ou na Vercel:

```bash
VITE_USE_PRODUTO_EMBALAGEM_ENTITY=true
```

Enquanto a entidade não existir, deixe a variável **ausente** ou `false` — o cliente continua só com `Produto.unidades` / `unidades_alternativas` / colunas de vitrine.

## Ficheiros relevantes no repo

- `src/lib/produtoEmbalagensEntity.js` — leitura e replace (delete + create)
- `src/lib/produtoEmbalagensAdapter.js` — conversão linhas ↔ campos legados
- `src/components/produtos/ProdutoFormCompleto.jsx` — integração condicionada ao flag
