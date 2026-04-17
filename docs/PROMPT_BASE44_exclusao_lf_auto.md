# Prompt para solicitar à Base44 (se não deployares a função no projeto)

Copia e cola no ticket/chat da Base44, preenchendo o ambiente:

---

**Assunto:** Função server-side para excluir lançamentos financeiros automáticos antes de uma data

**Pedido:**

Precisamos de uma **Cloud Function** (ou job único autorizado) no nosso projeto Base44 que:

1. Autentique o utilizador e restrinja a **administradores** (ou service role só invocável por nós).
2. Receba por JSON:
   - `dataCorte` (string `YYYY-MM-DD`, ex.: `2026-04-01`) — apagar apenas lançamentos com `data_vencimento` **estritamente anterior** a esta data.
   - `dryRun` (boolean, default `true`) — se `true`, **não apaga**; devolve contagem e lista de `id` candidatos (com limite razoável).
   - `incluirPagos` (boolean, default `false`) — se `false`, considerar só `status === 'Em Aberto'`.
   - `confirmacao` (string) — obrigatória quando `dryRun === false`; valor fixo acordado (ex.: `EXCLUIR_LF_AUTO`) para evitar apagamento acidental.
3. Selecione entidades `LancamentoFinanceiro` onde:
   - `tipo === 'Despesa'`
   - critério de “gerado automaticamente pela janela de recorrência”: tag `lf_gerado_auto` **ou** `observacoes` contendo `gerado automaticamente (janela recorrente)` (case-insensitive).
4. Para cada id elegível com `dryRun === false`, execute `delete` no `LancamentoFinanceiro`.
5. Resposta JSON com totais, ids de erro (se houver), e utilizador que executou.

**Nota:** Não confundir com `ContaPrevista` do job mensal (não tem a tag `lf_gerado_auto`); se for necessário limpar também previstas, pedir critério à parte.

---

## Depois do deploy (neste repositório)

A função já está implementada em:

`base44/functions/excluirLancamentosGeradosAutoAntesData/entry.ts`

1. Fazer deploy dessa função no painel Base44.
2. **Pré-visualização (recomendado):** corpo `POST` JSON:

```json
{ "dataCorte": "2026-04-01", "dryRun": true }
```

3. **Exclusão real:** utilizador admin, corpo:

```json
{
  "dataCorte": "2026-04-01",
  "dryRun": false,
  "confirmacao": "EXCLUIR_LF_AUTO",
  "incluirPagos": false
}
```
