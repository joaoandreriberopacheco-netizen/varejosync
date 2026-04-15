# Repositório paralelo (espelho) — setup e governança

Este documento define como operar o repositório paralelo da migração, mantendo o app principal íntegro e sincronizado.

## Objetivo

- Preservar o comportamento atual em produção no repositório principal.
- Evoluir a nova casca (P38 + Supabase/SubPayze) no repositório paralelo.
- Evitar divergência silenciosa entre principal e paralelo.

## Estratégia recomendada

1. Criar repositório paralelo como espelho completo do principal.
2. Definir `upstream` no paralelo apontando para o principal.
3. Fazer sincronização periódica do principal para o paralelo.
4. Trabalhar integrações novas em branches próprias no paralelo.

## Branches e papéis

- `main` (paralelo): espelho estável e base de integração.
- `migration/*`: mudanças técnicas da transição (P38, Supabase, adapters).
- `release/cutover`: branch de pré-virada final.

## Política de sincronização

- Frequência mínima: diária (dias úteis) ou por evento crítico de produção.
- Método: `fetch upstream` + `merge` em `main` do paralelo.
- Toda sincronização deve gerar:
  - SHA de origem (principal),
  - SHA de destino (paralelo),
  - nota breve de conflitos resolvidos.

## Checklist de operação

1. Sincronizar principal → paralelo.
2. Reexecutar validação rápida:
   - build,
   - smoke dos fluxos críticos,
   - integridade de env vars.
3. Só depois integrar mudanças de migração nas branches `migration/*`.

## Registo mínimo obrigatório

Para cada sync, registrar em PR ou comentário:

- `source_sha` (principal),
- `target_sha` (paralelo),
- conflitos resolvidos (se houver),
- risco residual (se houver).

## Critério de qualidade

- Sem sincronização atrasada por mais de 72h em período ativo de migração.
- Sem alterações diretas em `main` do paralelo sem PR.
- Sem merge de mudança de migração sem baseline do principal atualizada.
