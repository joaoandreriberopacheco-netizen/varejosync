# Validação de paridade — fluxos críticos

## Escopo

Comparar Base44 vs nova casca (P38 + Supabase/SubPayze) em fluxos críticos antes do cutover.

## Matriz de testes

| Fluxo | Entrada | Resultado esperado | Evidência |
|---|---|---|---|
| PDV / fechamento de venda | pedido com 1..n itens + 1..n formas de pagamento | pedido criado, estoque atualizado, lançamentos gerados, saldo atualizado | IDs de `pedido_venda`, `movimentacao_estoque`, `lancamento_financeiro` |
| Lançamento financeiro manual | receita e despesa com conta ativa | status e saldo consistentes | comparação de `contas_financeiras.saldo_atual` |
| Importação de produtos | lote CSV/XLSX controlado | inserts/updates corretos sem duplicidade | contagem por SKU e diffs de campos |
| Anexos (Drive/SubPayze) | upload + delete | metadado criado/removido e arquivo remoto consistente | `anexo_documento` + retorno do provedor |
| Número sequencial | 10 chamadas concorrentes | numeração única e sem colisão | lista de números gerados |

## Critérios de aprovação por fluxo

1. Mesmo resultado funcional visto no app.
2. Mesmo efeito em entidades (ou equivalente explícito e aprovado).
3. Erro tratável e observável (request-id e mensagem útil).
4. Latência dentro da faixa aceitável para operação.

## Query pack (PostgreSQL/Supabase)

```sql
-- 1) pedidos vs lançamentos vinculados
select pv.id, pv.total, sum(lf.valor) as total_lancado
from pedido_venda pv
left join lancamento_financeiro lf
  on lf.referencia_tipo = 'PedidoVenda' and lf.referencia_id = pv.id
group by pv.id, pv.total
order by pv.created_at desc
limit 50;

-- 2) estoque não negativo após saídas
select p.id, p.nome, p.estoque_atual
from produto p
where p.estoque_atual < 0;

-- 3) saldos por conta
select c.id, c.nome, c.saldo_atual,
       coalesce(sum(case when l.tipo = 'Receita' then l.valor else -l.valor end),0) as saldo_recalculado
from contas_financeiras c
left join lancamento_financeiro l
  on l.conta_financeira_id = c.id and l.status = 'Pago'
group by c.id, c.nome, c.saldo_atual
order by c.nome;
```

## Passo-a-passo de execução

1. Rodar o fluxo no Base44 (referência) e registrar outputs.
2. Rodar o mesmo fluxo no ambiente P38/Supabase.
3. Executar query pack e comparar resultados.
4. Classificar: `PASS`, `PASS_COM_DIFERENCA_EXPLICADA`, `FAIL`.
5. Abrir correção imediata para qualquer `FAIL`.

## Gate para avançar

- 100% dos fluxos críticos em `PASS` ou `PASS_COM_DIFERENCA_EXPLICADA` aprovada.
- Zero inconsistência de estoque/saldo.
- Zero erro sem `request-id`.
