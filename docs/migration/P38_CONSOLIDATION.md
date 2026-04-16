# P38 Consolidation Guide

## O que foi consolidado

- `p38` agora expõe `createRequestContext()` para padronizar `request-id`.
- `invokeFunction` injeta `requestContext` em todas as chamadas de função.
- `subpayzeAdapter` saiu do modo apenas placeholder para modo sandbox HTTP:
  - `auth.me`, `auth.login`, `auth.logout`,
  - `functions.invoke(name, body)`,
  - `integrations.Core.createCharge`,
  - `integrations.Core.getChargeStatus`,
  - `integrations.Core.verifyWebhookSignature` (placeholder com TODO para HMAC oficial).
- `base44Adapter` aceita `requestContext` sem quebrar compatibilidade.

## Rotas esperadas no sandbox SubPayze

- `GET /auth/me`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /functions/:name`
- `POST /payments/charges`
- `GET /payments/charges/:chargeId`

## Feature flags de ativação

- `VITE_P38_PROVIDER=base44|subpayze`
- `VITE_P38_SAFE_MODE=true|false`
- `VITE_P38_ENABLE_SUBPAYZE=true|false`
- `VITE_P38_SUBPAYZE_READY=true|false`

SubPayze só recebe tráfego se os 3 sinais estiverem ativos:

1. `VITE_P38_PROVIDER=subpayze`
2. `VITE_P38_ENABLE_SUBPAYZE=true`
3. `VITE_P38_SUBPAYZE_READY=true`

## Datalink Supabase (entidades)

Com `VITE_USE_SUPABASE_ENTITIES=true` e `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, o export `base44` passa a usar **PostgREST** para as entidades listadas em `src/integrations/p38/entityTableMap.js` (ex.: `Produto`, `TargetFlare`, `LancamentoFinanceiro`). Auth, `functions.invoke` e entidades não mapeadas continuam no SDK Base44. Realtime (`subscribe`) nas entidades Supabase é noop até ligar canais.

## Pendências para produção

1. Trocar validação de assinatura webhook por HMAC real conforme especificação SubPayze.
2. Definir timeout/retry central por endpoint no adapter.
3. Adicionar mascaramento de dados sensíveis em logs.
