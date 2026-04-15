# RUNBOOK — Canal Base44 ↔ GitHub ↔ Cursor (VarejoSync)

> Versão: 1.1 | Actualizado: automaticamente pela plataforma Base44

---

## Índice
1. [Arquitectura Resumida](#arquitectura)
2. [Ciclo de Vida dos Flares](#ciclo-de-vida)
3. [SLOs](#slos)
4. [Incidentes e Resoluções](#incidentes)
5. [Matriz de Decisão Operacional](#matriz-de-decisão)
6. [Workflow Diário (5 Passos)](#workflow-diário)
7. [Checklist Pronto para Produção](#checklist)

---

## Arquitectura

```
[Base44] TargetFlare (create/update)
    │
    ▼ Automation: FlareQueueSync (imediato)
    │
[Function] exportFlareToGithub
    │  ├── Idempotência: skip se content_hash igual
    │  └── Commit: docs/flare-export/flare-pending.json
    │
[GitHub] branch: main
    │
[Cursor] lê JSON → cria feature/cursor-fix-{id} → PR
    │
[Humano] revê PR → merge → marca flare resolved via flareStatusSync
```

---

## Ciclo de Vida dos Flares

```
pending → in_progress → ready_for_verify → resolved
    │           │               │
    │           └──────────────→ ignored
    │
    └──────────────────────────→ ignored

resolved → reopened → in_progress (...)
```

| Estado | Significado | Quem define |
|---|---|---|
| pending | Flare criado, aguarda trabalho | Base44 / Modo Flare |
| in_progress | Cursor a trabalhar | Cursor / Operador |
| ready_for_verify | PR aberto, aguarda revisão | Cursor / Operador |
| resolved | PR mergeado e verificado | Operador humano |
| reopened | Regressão detectada | Operador humano |
| ignored | Falso positivo / descartado | Operador humano |

---

## SLOs

| Métrica | Objectivo | Alerta se |
|---|---|---|
| TargetFlare salvo → JSON GitHub | ≤ 30s | > 2 min |
| Taxa de sucesso de sync | ≥ 95% | < 90% |
| Lead time médio (pending → resolved) | ≤ 48h | > 72h |
| Taxa de reabertura | ≤ 10% | > 20% |

---

## Incidentes e Resoluções

### GitHub 403 — Forbidden
**Causa:** Token OAuth expirado ou scope insuficiente.
**Acção:**
1. Dashboard → Connectors → GitHub → Reconectar
2. Verificar que scope `repo` está autorizado
3. Re-executar `exportFlareToGithub` manualmente

### GitHub 422 — Unprocessable Entity
**Causa:** SHA desactualizado (conflito de update concorrente).
**Acção:**
1. Aguardar 10s e re-executar — a função faz novo GET do SHA
2. Se persistir: verificar se outra automation está a colidir

### GitHub 409 — Conflict (branch protegido)
**Causa:** Branch `main` com protecção que bloqueia commits directos.
**Acção:**
1. GitHub → Settings → Branches → main → desactivar protecção para bots
2. Ou criar branch `platform-sync` e ajustar GITHUB_BRANCH na função

### Token inválido / expirado
**Sintoma:** Função retorna `error_type: github_api`
**Acção:**
1. Dashboard → Connectors → GitHub → Desconectar → Reconectar
2. Aguardar confirmação de `authorized: true`

### Automation não disparou
**Sintoma:** TargetFlare criado mas JSON não actualizado
**Verificar:**
1. Dashboard → Automations → FlareQueueSync → status = active
2. Testar manualmente: invocar `exportFlareToGithub` via dashboard
3. Verificar logs da automation

---

## Matriz de Decisão Operacional

| Situação | Acção | Transição |
|---|---|---|
| Cursor corrigiu e PR mergeado | Marcar resolved | ready_for_verify → resolved |
| Bug voltou após fix | Reabrir | resolved → reopened |
| Flare criado por engano | Descartar | pending → ignored |
| Cursor não consegue localizar | Ignorar com motivo | pending → ignored |
| PR aberto mas não mergeado | Marcar ready_for_verify | in_progress → ready_for_verify |
| Sprint planning decide prioridade | Deixar em pending | — |
| Acumulou > 20 pendentes | Purge seletivo dos ignored | purgeFlareQueue |

### Quando fazer Purge?
- Apenas flares com status `resolved` ou `ignored` há > 7 dias
- Nunca purge de `pending` ou `in_progress`
- Sempre verificar JSON pós-purge

---

## Workflow Diário (5 Passos)

```
1. START-OF-DAY
   └── Verificar docs/flare-export/flare-pending.json no GitHub
   └── Confirmar _meta.exported_at < 2h atrás
   └── Se desactualizado: invocar exportFlareToGithub manualmente

2. CURSOR WORK SESSION
   └── Cursor lê flare-pending.json
   └── Para cada item: lê source_location_raw → edita ficheiro
   └── Cria PR: feature/cursor-fix-{flare_id}

3. REVISÃO HUMANA
   └── Revisar diff do PR
   └── Se ok: merge → invocar flareStatusSync {id, transition: "resolved"}
   └── Se nok: pedir revisão → {id, transition: "in_progress"}

4. END-OF-DAY CHECK
   └── Invocar flareMetrics → verificar success_rate_pct
   └── Se pending_actionable > 10: priorizar para amanhã

5. MANUTENÇÃO SEMANAL (sexta-feira)
   └── Purge dos resolved/ignored > 7 dias via purgeFlareQueue
   └── Confirmar JSON actualizado e limpo
```

---

## Checklist Pronto para Produção

### Infra
- [ ] Connector GitHub autorizado (scope: repo)
- [ ] Automation FlareQueueSync activa
- [ ] exportFlareToGithub retorna `success: true` em teste manual
- [ ] flareStatusSync retorna transição válida em teste

### Dados
- [ ] flare-pending.json contém `_meta.schema_version: "1.1"`
- [ ] campo `content_hash` presente no _meta
- [ ] todos os flares têm `source_location_raw` preenchido

### Segurança
- [ ] Nenhuma chave em frontend ou ficheiro commitado
- [ ] purgeFlareQueue e flareStatusSync requerem role admin
- [ ] Branch main: Base44 escreve só em docs/, Cursor trabalha em feature/

### Operação
- [ ] Equipa conhece este Runbook
- [ ] Sabe re-executar sync manual via Dashboard → Code → Functions
- [ ] Sabe invocar flareStatusSync para transições

### Observabilidade
- [ ] flareMetrics retorna dados em teste manual
- [ ] SLOs definidos e compreendidos pela equipa
