# Base44 — campo `unidade_vitrine` na entidade Produto

Adicione **um** campo na entidade `Produto` na consola Base44 (schema JSON).

## Propriedade para colar no schema

```json
{
  "name": "unidade_vitrine",
  "type": "string",
  "default": "",
  "description": "Sigla da embalagem de vitrine (catálogo/PDV). Vazio = usar unidade_principal. Deve coincidir com unidade_principal ou unidade em unidades_alternativas[]."
}
```

## Regras de negócio (para validação manual ou futura)

| Situação | Valor de `unidade_vitrine` |
|----------|----------------------------|
| Vitrine na unidade base | `""` (string vazia) ou omitir |
| Vitrine numa embalagem alternativa | Sigla, ex.: `"CX"` |
| `unidade_show_ativa` = false | Pode ficar vazio; o app ignora vitrine e usa a base |

## Campos legados (opcionais)

Estes podem permanecer no schema antigo; **não são mais gravados** pelo formulário atual:

- `unidade_comercial_id`
- `unidade_apresentacao_default`
- `unidade_show_comercial`
- `unidade_show_logistica`

O app continua a **ler** `unidade_apresentacao_default` / `unidade_comercial_id` só quando `unidade_vitrine` está vazio.

## Teste rápido após criar o campo

1. Abrir um produto no app, escolher vitrine CX, salvar.
2. GET do produto no Base44: `unidade_vitrine` = `"CX"`.
3. Listagem/catálogo mostra preço/estoque na embalagem CX.
