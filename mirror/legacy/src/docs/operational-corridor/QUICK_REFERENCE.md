# Quick Reference Card — Corredor Operacional

**Imprima ou compartilhe este ficheiro com seu team.**

---

## 🎯 Visão Geral em 30 Segundos

```
┌─────────────────────────────────────────┐
│   Corredor Operacional Base44 (v1.0)   │
├─────────────────────────────────────────┤
│ O QUÊ: API gateway seguro 24/7         │
│ PORQUÊ: Eliminar dependência de sessão │
│ QUANDO: 2026-05-10 (go-live)           │
│ QUEM: Lead Eng + 2 Devs + 1 DevOps     │
│ QUANTO: ~$20K labor + $2-5K infra      │
└─────────────────────────────────────────┘
```

---

## 📚 Documentação (Choose Your Path)

| Você é... | Leia isto | Tempo |
|-----------|----------|-------|
| **CTO / Executivo** | [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md) | 10 min |
| **Arquiteto** | [ARCHITECTURE_v1.0.md](./ARCHITECTURE_v1.0.md) | 45 min |
| **Engenheiro** | [ARCHITECTURE_v1.0.md](./ARCHITECTURE_v1.0.md) + [CODE_MANIFEST.md](./CODE_MANIFEST.md) | 60 min |
| **DevOps / Operador** | [RUNBOOK_v1.0.md](./RUNBOOK_v1.0.md) | 30 min |
| **QA / Tester** | [VALIDATION_CHECKLIST.md](./VALIDATION_CHECKLIST.md) | 20 min |
| **Project Manager** | [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | 30 min |

---

## 🚀 Endpoints da API

### Health Check
```bash
GET /health

curl -H "Authorization: Bearer sk_ops_..." \
  https://api.seu-app.com/health
# → { status: "healthy", timestamp: "...", correlationId: "..." }
```

### Entity List (Paginated)
```bash
GET /entities/{entity}/list?limit=50&page=0&sort=-created_date

curl -H "Authorization: Bearer sk_ops_..." \
  'https://api.seu-app.com/entities/TargetFlare/list?limit=10'
# → { data: [...], hasMore: true, page: 0, limit: 10 }
```

### Entity Export (Idempotent CSV)
```bash
GET /entities/{entity}/export

curl -H "Authorization: Bearer sk_ops_..." \
  -H "Idempotency-Key: abc123" \
  https://api.seu-app.com/entities/TargetFlare/export \
  -o TargetFlare.csv
```

### Sync Status
```bash
GET /sync/status

curl -H "Authorization: Bearer sk_ops_..." \
  https://api.seu-app.com/sync/status
# → { TargetFlare: { healthy: true, ... }, ... }
```

### Automations Status
```bash
GET /automations/status

curl -H "Authorization: Bearer sk_ops_..." \
  https://api.seu-app.com/automations/status
# → [ { name: "gerarLancamentosCartao", status: "active", ... }, ... ]
```

---

## 🔑 Autenticação

```bash
# Header requerido em TODOS os requests:
Authorization: Bearer sk_ops_...

# Exemplo:
curl -H "Authorization: Bearer sk_ops_a1b2c3d4e5f6..." \
  https://api.seu-app.com/health

# Status codes:
# 200 → OK
# 401 → Unauthorized (token inválido/faltando)
# 403 → Forbidden (role insuficiente)
# 404 → Not found
# 429 → Rate limit (100 req/min)
# 500 → Server error
```

---

## 🗝️ Secrets Management

```bash
# Onde estão os secrets
Dashboard Base44 > Settings > Environment Variables

# Quais secrets necessários
OPERATIONS_API_KEY              (gerado, rotativo)
GITHUB_TOKEN                    (existing)
GITHUB_WEBHOOK_SECRET           (new)
DATADOG_API_KEY                 (optional)
OPERATIONS_ALLOWED_ROLES        (admin,operator,viewer)
OPERATIONS_ALLOWED_IPS          (optional)

# Rotação mensal
1º domingo do mês, 22:00 UTC
```

---

## ⚠️ Incident Response

### Gateway Down (503)
```bash
# 1. Confirmar problema
curl -H "Authorization: Bearer $OPERATIONS_API_KEY" \
  https://api.seu-app.com/health
# → erro

# 2. Check logs
# → Dashboard observability (Datadog/Sentry)

# 3. Page on-call engineer
# → PagerDuty ou #incidents Slack

# 4. Rollback (se necessário)
# → git revert + redeploy
```

### Security Incident (Token Leak)
```bash
# 1. REVOKE IMMEDIATELY
# → Dashboard > Settings > remove OPERATIONS_API_KEY

# 2. Generate new token
NEW_KEY=$(openssl rand -hex 32)

# 3. Update dashboard
# → Paste: sk_ops_$NEW_KEY

# 4. Rotate em local .env
sed -i "s/OPERATIONS_API_KEY=.*/OPERATIONS_API_KEY=sk_ops_$NEW_KEY/" .env
```

### Duplicate Automations (gerarLancamentosCartao)
```bash
# CRÍTICO: Resolvido em Week 4 (automationManager.js)

# Se ainda houver duplicação:
curl -X POST https://api.seu-app.com/automations/delete \
  -H "Authorization: Bearer sk_ops_admin" \
  -d '{ "automation_id": "69be3ecd" }'
```

---

## 📊 Monitoramento Diário

### Morning Check (08:00 AM)
```bash
# 1. Health
curl -H "Authorization: Bearer $OPERATIONS_API_KEY" \
  https://api.seu-app.com/health

# 2. Sync status
curl -H "Authorization: Bearer $OPERATIONS_API_KEY" \
  https://api.seu-app.com/sync/status

# 3. Check dashboard (Datadog)
# → P95 latency
# → Error rate
# → Uptime
```

### Key Metrics to Watch
```
✅ Availability: 99.5%+
✅ P95 Latency: <500ms
✅ Error Rate: <0.1%
✅ Sync Lag: <1h
```

---

## 🎓 Training Checklist (New Operator)

- [ ] Ler [RUNBOOK_v1.0.md](./RUNBOOK_v1.0.md) (30 min)
- [ ] Setup local .env (10 min)
- [ ] Test /health endpoint (5 min)
- [ ] Test /entities/list (5 min)
- [ ] Read incident response (seção 4, RUNBOOK) (10 min)
- [ ] Walkthrough com Lead Eng (30 min)
- [ ] Practice health check script (10 min)
- [ ] Review escalation contacts (5 min)
- [ ] Signoff: "Ready for on-call" ✅

---

## 🔄 Weekly Routine

| Dia | Atividade | Duração | Owner |
|-----|----------|---------|-------|
| **Seg** | Standup (status, blockers) | 30 min | All |
| **Qua** | Performance review (metrics) | 15 min | DevOps |
| **Sex** | Status update (stakeholders) | 15 min | Lead Eng |
| **Dom** | Health check (manual) | 10 min | Ops |

---

## 📞 Contacts & Escalation

### For Questions
- **Architecture:** Lead Eng (João) → @joao
- **Operations:** DevOps (Carlos) → @carlos
- **Security:** Ana → @ana-security

### Escalation
```
Severity 1 (Critical) → Page Lead Eng + DevOps
Severity 2 (Major)   → Email Lead Eng + Slack #incidents
Severity 3 (Minor)   → Slack #incidents
```

---

## ✅ Pre-Go-Live Checklist

**Week 1:**
- [ ] operationsGateway.js funcional
- [ ] /health respondendo
- [ ] Entity list paginado
- [ ] Testes: 5+ passing

**Week 2:**
- [ ] Export CSV idempotente
- [ ] Audit logging
- [ ] Automations rodando
- [ ] Load test: P95 <500ms

**Week 3:**
- [ ] Observability configurado
- [ ] Security review: 0 critical vulns
- [ ] Runbook completo
- [ ] Team treinado

**Week 4:**
- [ ] E2E tests: 100% passing
- [ ] Canary: 5% traffic, 0 errors
- [ ] Production ready sign-off
- [ ] Go-live!

---

## 🚨 Critical Items

**NUNCA fazer:**
- ❌ Commitar OPERATIONS_API_KEY em git
- ❌ Logar token em plain text
- ❌ Usar mesmo token em prod + dev
- ❌ Deixar IP whitelist desabilitado em prod
- ❌ Ignorar alerts (investigate sempre)

**SEMPRE fazer:**
- ✅ Validar token antes de usar
- ✅ Rotacionar secrets mensalmente
- ✅ Logar todas operações (audit trail)
- ✅ Testar rollback plan quarterly
- ✅ Manter runbook atualizado

---

## 📈 Success Metrics (After Go-Live)

```
Week 1: Uptime >99%
Week 2: Zero incidents
Week 3: Team confident with runbook
Week 4+: Sustained 99.5% SLA
```

---

## 🔗 Links Rápidos

| Recurso | Link |
|---------|------|
| Full Architecture | [ARCHITECTURE_v1.0.md](./ARCHITECTURE_v1.0.md) |
| Operações Diárias | [RUNBOOK_v1.0.md](./RUNBOOK_v1.0.md) |
| Validação & QA | [VALIDATION_CHECKLIST.md](./VALIDATION_CHECKLIST.md) |
| Timeline | [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) |
| Código | [CODE_MANIFEST.md](./CODE_MANIFEST.md) |
| Sumário Exec | [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md) |

---

## 🎯 Próximos Passos

1. [ ] CTO aprova EXECUTIVE_SUMMARY.md
2. [ ] Kick-off meeting (Seg 10:00 AM)
3. [ ] Week 1 sprint criada (Jira)
4. [ ] Desenvolvimento começa (Ter)
5. [ ] Go-live (Fri 2026-05-10)

---

**Versão:** 1.0.0  
**Data:** 2026-04-15  
**Imprima & Partilhe!**