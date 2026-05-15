# Unidade de vitrine no Produto (Base44)

**O que é:** a sigla da embalagem que o catálogo, o PDV e os relatórios mostram ao cliente. Pode ser a unidade base (fator 1) ou uma alternativa (CX, M2, etc.).

**Campo canónico:** `unidade_vitrine` (texto, sigla normalizada: UN, CX, M2…).

- Deve ser a mesma que `unidade_principal` **ou** o `unidade` de uma linha ativa em `unidades_alternativas[]`.
- **Vazio ou null** = vitrine na unidade base (equivalente a escolher a principal no formulário).

**Onde fica no código:** leitura em `src/lib/productUnits.js` — `resolveVitrineSigla`, `resolveUnidadeExibicao`, `getUnidadeExibicaoSigla`. Gravação: `applyUnidadesToProduto` em `productUnitsCrud.js` + formulário de produto.

Ver também: [BASE44_CAMPO_UNIDADE_VITRINE.md](./BASE44_CAMPO_UNIDADE_VITRINE.md) (schema JSON para a consola Base44).

## Legado (só leitura, uma passagem)

Produtos antigos podem ainda ter `unidade_apresentacao_default`, `unidade_comercial_id`, etc. O app lê esses campos **uma vez** se `unidade_vitrine` estiver vazio; novos saves gravam só `unidade_vitrine`.

## Exemplo JSON (vitrine em CX)

```json
{
  "unidade_principal": "M2",
  "unidade_vitrine": "CX",
  "unidade_show_ativa": true,
  "unidades_alternativas": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "unidade": "CX",
      "fator_conversao": 2.16,
      "ativo": true,
      "is_comercial": true
    }
  ]
}
```

Vitrine na **unidade base** — deixe `unidade_vitrine` vazio:

```json
{
  "unidade_principal": "UN",
  "unidade_vitrine": "",
  "unidade_show_ativa": true,
  "unidades_alternativas": [
    {
      "id": "alt-cx-001",
      "unidade": "CX",
      "fator_conversao": 12,
      "is_comercial": false,
      "ativo": true
    }
  ]
}
```

## Migração de produtos existentes

1. Adicionar o campo `unidade_vitrine` na entidade `Produto` no Base44 (ver doc acima).
2. Não é obrigatório backfill em massa: com vitrine vazia, o app usa a unidade principal.
3. Ao abrir e salvar no formulário, o app grava `unidade_vitrine` a partir da escolha atual.

## Consumidores

| Área | Funções principais |
|------|-------------------|
| Catálogo / produto | `getUnidadeExibicaoSigla`, `resolveUnidadeExibicao` |
| PDV / compras | `pickDefaultSaleUnit`, `resolveUnidadeExibicaoParaCompras` |
| Formulário | `ProdutoFormCompleto` → `unidade_vitrine` no payload |
