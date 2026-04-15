# Cutover Runbook — P38 + Supabase/SubPayze

## Objetivo

Executar virada definitiva com risco controlado e rollback preparado.

## Pré-condições (Go/No-Go)

- [ ] Sincronização principal → paralelo em dia (até 24h).
- [ ] `CRITICAL_PARITY_VALIDATION.md` sem `FAIL`.
- [ ] Flags prontas para ativação controlada:
  - [ ] `VITE_P38_PROVIDER=subpayze`
  - [ ] `VITE_P38_ENABLE_SUBPAYZE=true`
  - [ ] `VITE_P38_SUBPAYZE_READY=true`
- [ ] Credenciais válidas no ambiente (API URL, API key, webhook secret).
- [ ] Time de suporte disponível na janela de virada.

Se qualquer item acima falhar, **NO-GO**.

## Janela recomendada

- Início: fora do pico operacional.
- Duração planejada: 60–120 minutos.
- Janela de observação intensiva: 24–72h.

## Sequência de cutover

1. Congelar alterações não essenciais.
2. Aplicar migrações finais no Supabase.
3. Executar carga final de dados pendentes.
4. Ativar flags para novo provider.
5. Rodar smoke dos fluxos críticos (PDV, financeiro, anexos).
6. Confirmar métricas e logs.

## Smoke imediato (15 min)

- [ ] Criar venda no PDV.
- [ ] Verificar movimento de estoque.
- [ ] Verificar lançamento financeiro associado.
- [ ] Executar fluxo de anexo (upload e remoção).
- [ ] Validar webhook com assinatura.

## Métricas mínimas para manter GO

- Taxa de erro sem aumento relevante.
- Latência dentro da faixa homologada.
- Sem inconsistências de saldo/estoque.
- Logs com `request-id` em 100% dos erros.

## Rollback (se necessário)

Condição de rollback:

- falha crítica em fluxo financeiro/PDV,
- inconsistência de dados não recuperável em tempo aceitável,
- indisponibilidade sustentada.

Passos:

1. Reativar provider Base44:
   - `VITE_P38_PROVIDER=base44`
   - `VITE_P38_ENABLE_SUBPAYZE=false`
   - `VITE_P38_SUBPAYZE_READY=false`
2. Revalidar fluxo crítico no Base44.
3. Congelar mudanças no paralelo para análise.
4. Abrir postmortem técnico com causa raiz e correção.

## Pós-cutover (D+1, D+3, D+7)

- D+1: revisão de erros e latência.
- D+3: reconciliação de dados (saldo/estoque/numeração).
- D+7: encerramento formal da janela de transição.

## Evidências obrigatórias

- SHA da release de cutover.
- Snapshot das env vars aplicadas.
- Resultado do smoke checklist.
- Resultado da reconciliação D+1.
