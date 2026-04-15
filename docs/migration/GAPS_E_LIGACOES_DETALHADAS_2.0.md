# P38 - Gaps e Ligações Detalhadas

## Estado atual da transição
- Camada inicial `P38` criada para desacoplar o app do SDK Base44.
- Fluxo atual continua estável com fallback Base44 por padrão (`VITE_P38_PROVIDER=base44`).
- Entrada SubPayze preparada em adapter dedicado para evolução incremental.
- Segurança reforçada: SubPayze só recebe tráfego com dupla liberação explícita.

## Ligações implementadas nesta etapa
- `src/integrations/p38/index.js`
  - Núcleo de provider (`base44` ou `subpayze`) via `VITE_P38_PROVIDER`.
- `src/integrations/p38/base44Adapter.js`
  - Adapter de compatibilidade para manter comportamento atual.
- `src/integrations/p38/subpayzeAdapter.js`
  - Estrutura inicial de auth/functions/integrations para conexões SubPayze.
- `src/functions/_invokeHelper.js`
  - Invocação agora passa pelo `p38.functions.invoke`.
- `src/api/entities.js` e `src/api/integrations.js`
  - Consumo passa a usar `p38` em vez de referência direta ao SDK legado.

## Gaps técnicos imediatos (próxima execução)
1. Implementar chamadas reais de API no `subpayzeAdapter` (sandbox primeiro).
2. Implementar validação de assinatura de webhook SubPayze.
3. Criar endpoint BFF para receber eventos de pagamento e normalizar payload.
4. Integrar fluxo PDV (criação de cobrança + confirmação por webhook).
5. Instrumentar logs e métricas por `request-id`.

## Variáveis de ambiente previstas
- `VITE_P38_PROVIDER=base44|subpayze`
- `VITE_P38_SAFE_MODE=true|false` (padrão `true`)
- `VITE_P38_ENABLE_SUBPAYZE=true|false` (padrão `false`)
- `VITE_P38_SUBPAYZE_READY=true|false` (padrão `false`)
- `VITE_SUBPAYZE_API_URL`
- `VITE_SUBPAYZE_API_KEY`
- `VITE_SUBPAYZE_WEBHOOK_SECRET`

## Diretriz operacional
- Ativar `subpayze` somente em sandbox até homologação completa.
- Manter fallback automático para Base44 durante o canário de produção.
- Para não interromper Base44, liberar SubPayze somente quando:
  1. `VITE_P38_PROVIDER=subpayze`
  2. `VITE_P38_ENABLE_SUBPAYZE=true`
  3. `VITE_P38_SUBPAYZE_READY=true`
  4. credenciais SubPayze válidas no ambiente
