# P38 + Supabase: mapeamento `Produto` e overflow JSON

## Variável

`VITE_USE_SUPABASE_ENTITIES=true` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` — ver [`P38_CONSOLIDATION.md`](./P38_CONSOLIDATION.md).

## Mapeamento actual

Em [`src/integrations/p38/entityTableMap.js`](../../src/integrations/p38/entityTableMap.js):

```js
Produto: { table: 'produto', mode: 'columns' },
```

Ou seja: campos de `Produto` mapeados para **colunas** da tabela `public.produto` (não é tabela 100 % JSONB para esta entidade).

## Overflow `dados` JSONB

[`prepareWritePayload`](../../src/integrations/p38/supabaseEntityLayer.js) só desvia campos não listados para `dados` quando o mapeamento está em modo `jsonb` **ou** quando existe lista explícita `columns` (overflow).

Para `Produto` em modo `'columns'` **sem** lista `columns` restritiva, o payload segue **directo** para as colunas conhecidas pelo PostgREST; campos extra no objecto podem ser ignorados ou falhar conforme a schema SQL.

## Conclusão para embalagens

- Manter no cliente os mesmos nomes de campos (`unidade_principal`, `unidades_alternativas`, `unidade_apresentacao_default`, …) alinhados ao Base44.
- Se no futuro `Produto` passar a `columns: [...]` com overflow, os campos não mapeados caem em `dados` **sem renomear** o contrato do objecto na app.

## Verificação manual

1. Ligar `VITE_USE_SUPABASE_ENTITIES=true` num ambiente de homologação.
2. Gravar um produto com alternativas e confirmar leitura/escrita na tabela `produto` (Dashboard Supabase).
