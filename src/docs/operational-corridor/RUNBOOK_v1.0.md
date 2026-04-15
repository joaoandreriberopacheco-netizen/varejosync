# Runbook Operacional — Corredor Aberto

**Status:** Pronto para Produção  
**Versão:** 1.0.0  
**Público:** Engenheiros, DevOps, SREs

---

## 1. ONBOARDING — Novo Operador

### 1.1 Pré-requisitos

- [ ] Acesso a Base44 dashboard (admin role)
- [ ] Acesso a repository GitHub (read:user, repo scopes)
- [ ] Acceso a observability stack (Datadog/Sentry/Grafana)
- [ ] Máquina com `curl`, `jq`, `openssl` instalados

### 1.2 Setup Local (Dev)

```bash
# 1. Clonar repository
git clone https://github.com/seu-org/seu-app.git
cd seu-app

# 2. Copiar .env.example → .env
cp .env.example .env

# 3. Preencher secrets
cat .env
# OPERATIONS_API_KEY=sk_ops_xxx (pedir a Lead Eng)
# GITHUB_TOKEN=ghp_xxx (pedir a DevOps)

# 4. Teste de conectividade
curl -X GET http://localhost:8000/health \
  -H "Authorization: Bearer $OPERATIONS_API_KEY"
# Esperado: { status: "healthy", ... }

# 5. Teste de entity list
curl -X GET 'http://localhost:8000/entities/TargetFlare/list?limit=5' \
  -H "Authorization: Bearer $OPERATIONS_API_KEY" | jq
# Esperado: { data: [...], hasMore: true, ... }
```

### 1.3 Setup Produção

```bash
# 1. Pedir acesso ao dashboard Base44 (admin)
# 2. Navegar a Settings > Environment Variables
# 3. Verificar que secrets estão setados:
#    - OPERATIONS_API_KEY ✅
#    - GITHUB_TOKEN ✅
#    - GITHUB_WEBHOOK_SECRET ✅

# 4. Testar endpoint de produção
API_KEY=$(aws secretsmanager get-secret-value --secret-id operations-api-key --query 'SecretString' | jq -r .key)
curl -X GET https://prod-api.seu-app.com/health \
  -H "Authorization: Bearer $API_KEY"
```

---

## 2. ROTINAS DIÁRIAS

### 2.1 Morning Health Check (08:00 AM)

```bash
#!/bin/bash
# health_check.sh

API_KEY=$OPERATIONS_API_KEY
API_URL="https://prod-api.seu-app.com"

echo "[$(date)] 🔍 Starting health check..."

# Check 1: Gateway Health
HEALTH=$(curl -s -X GET $API_URL/health \
  -H "Authorization: Bearer $API_KEY" | jq '.status')

if [ "$HEALTH" != '"healthy"' ]; then
  echo "[ERROR] Gateway unhealthy: $HEALTH"
  # Alertar PagerDuty
  curl -X POST https://events.pagerduty.com/v2/enqueue \
    -H 'Content-Type: application/json' \
    -d '{
      "routing_key": "'$PAGERDUTY_ROUTING_KEY'",
      "event_action": "trigger",
      "payload": {
        "summary": "Operations Gateway Health Check Failed",
        "severity": "critical",
        "source": "health_check.sh"
      }
    }'
  exit 1
fi

echo "[OK] Gateway healthy ✅"

# Check 2: Sync Status
SYNC=$(curl -s -X GET $API_URL/sync/status \
  -H "Authorization: Bearer $API_KEY" | jq '.status')

echo "[OK] Sync status: $SYNC" | jq

# Check 3: Entity Counts
for ENTITY in TargetFlare PedidoVenda LancamentoFinanceiro; do
  COUNT=$(curl -s -X GET "$API_URL/entities/$ENTITY/list?limit=1" \
    -H "Authorization: Bearer $API_KEY" | jq '.data | length')
  echo "[OK] $ENTITY: $COUNT records"
done

echo "[$(date)] ✅ Health check completed"
```

**Executar via cron:**
```
0 8 * * * /home/ops/health_check.sh
```

### 2.2 Monitorar Automations Status

```bash
# Verificar que automations críticas estão rodando
curl -X GET https://prod-api.seu-app.com/automations/status \
  -H "Authorization: Bearer $OPERATIONS_API_KEY" | jq

# Esperado:
# {
#   "gerarLancamentosCartao": { "last_run": "2026-04-15T02:00:00Z", "status": "success" },
#   "syncTargetFlare": { "last_run": "2026-04-15T10:30:00Z", "status": "success" },
#   ...
# }
```

### 2.3 Verificar Alertas Críticos

**Dashboard observability:**
- Login a Datadog / Sentry / Grafana
- Navegar a "Incidents" ou "Alerts"
- Filtrar por severidade: `critical`
- Se algum alerta: escalate para Lead Engineer

---

## 3. PROCEDIMENTOS OPERACIONAIS

### 3.1 Exportar Dados de Entidade

**Use case:** Backup manual, análise ad-hoc, reporting

```bash
# Exportar TargetFlare em CSV
IDEMPOTENCY_KEY=$(uuidgen)
curl -X GET "https://prod-api.seu-app.com/entities/TargetFlare/export" \
  -H "Authorization: Bearer $OPERATIONS_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -o "targetflare_$(date +%Y%m%d).csv"

# Verificar
wc -l *.csv
head -5 targetflare_*.csv
```

**Cada run com mesmo `Idempotency-Key` retorna exatamente o mesmo ficheiro** ✅ Idempotente

### 3.2 Sincronizar com GitHub

**Use case:** Exportar estado atual para repositório

```bash
#!/bin/bash
# sync_to_github.sh

set -e

API_KEY=$OPERATIONS_API_KEY
GITHUB_TOKEN=$GITHUB_TOKEN
REPO="seu-org/seu-app"
BRANCH="main"

echo "📤 Syncing to GitHub..."

# 1. Exportar TargetFlare
curl -s -X GET "https://prod-api.seu-app.com/entities/TargetFlare/export" \
  -H "Authorization: Bearer $API_KEY" \
  -o /tmp/targetflare.csv

# 2. Commit para GitHub
cd /tmp
git clone https://github.com/$REPO.git repo
cd repo
cp /tmp/targetflare.csv docs/snapshots/targetflare_$(date +%Y%m%d).csv
git add docs/snapshots/
git commit -m "🔄 Sync TargetFlare snapshot $(date -u +%FT%T%Z)" \
  -m "Automated sync from operationsGateway" \
  --author "ops-bot <ops@seu-app.com>"
git push origin $BRANCH

echo "✅ Sync complete"
```

### 3.3 Atualizar Secrets & Rotação de API Key

**Periodicidade:** Mensal (1º domingo do mês)

```bash
#!/bin/bash
# rotate_api_key.sh

API_KEY_OLD=$OPERATIONS_API_KEY
API_KEY_NEW=$(openssl rand -hex 32)

echo "🔄 Rotating API key..."
echo "OLD: $API_KEY_OLD"
echo "NEW: $API_KEY_NEW"

# 1. Update Base44 dashboard (manual ou via API)
# Dashboard > Settings > Environment Variables > OPERATIONS_API_KEY
# Paste: sk_ops_$API_KEY_NEW

# 2. Validar novo key
sleep 5  # Aguardar propagação
curl -X GET https://prod-api.seu-app.com/health \
  -H "Authorization: Bearer sk_ops_$API_KEY_NEW"
# Esperado: 200 OK

# 3. Atualizar .env local
sed -i "s/OPERATIONS_API_KEY=.*/OPERATIONS_API_KEY=sk_ops_$API_KEY_NEW/" .env

# 4. Update secrets manager (AWS, Vault, etc.)
aws secretsmanager update-secret \
  --secret-id operations-api-key \
  --secret-string "{\"key\": \"sk_ops_$API_KEY_NEW\"}"

# 5. Documentar no audit trail
echo "$(date): API key rotated" >> /var/log/operations-audit.log

echo "✅ API key rotation complete"
```

**Checklist:**
- [ ] Novo key testado (curl /health)
- [ ] Dashboard Base44 atualizado
- [ ] Secrets manager atualizado
- [ ] .env local atualizado
- [ ] Notificação enviada ao team
- [ ] Documentar em ROTATION_LOG.md

### 3.4 Resolução de Automations Duplicadas

**CRÍTICO:** `gerarLancamentosCartao` rodando 2x (IDs: 69be3ff0, 69be3ecd)

```bash
#!/bin/bash
# fix_duplicate_automations.sh

set -e

echo "🔧 Fixing duplicate automations..."

# 1. Listar automations
curl -X POST https://prod-api.seu-app.com/automations/list \
  -H "Authorization: Bearer $OPERATIONS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.automations | group_by(.name)'

# 2. Identificar duplicatas
# Esperado output:
# [
#   [
#     { id: "69be3ff0", name: "gerarLancamentosCartao", ... },
#     { id: "69be3ecd", name: "gerarLancamentosCartao", ... }
#   ]
# ]

# 3. Deletar uma (manter a mais recente)
curl -X POST https://prod-api.seu-app.com/automations/delete \
  -H "Authorization: Bearer $OPERATIONS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "automation_id": "69be3ecd"
  }'

# 4. Verificar que apenas uma permanece
curl -X POST https://prod-api.seu-app.com/automations/list \
  -H "Authorization: Bearer $OPERATIONS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.automations[] | select(.name == "gerarLancamentosCartao")'

echo "✅ Duplicate automation deleted"
```

---

## 4. INCIDENT RESPONSE

### 4.1 Gateway Down (Status 503)

**Sintomas:**
- `/health` retorna 503 Service Unavailable
- Entity list requests failing
- Sync não ocorreu nas últimas 2h

**Ação Imediata (0–5 min):**
```bash
# 1. Confirmar problema
curl -v https://prod-api.seu-app.com/health

# 2. Check Base44 status page
open https://status.base44.com

# 3. Recolher logs
curl -X GET https://logs.seu-observability.com/api/logs?level=error \
  -H "Authorization: Bearer $OBSERVABILITY_KEY" | jq '.logs[-100:]'

# 4. Slack alert ao #incidents channel
# Mensagem: ⛔ Operations Gateway Down | Severity: critical | Auto-recovery in progress
```

**Escalate para Lead Engineer (5–15 min):**
- [ ] PagerDuty page criada
- [ ] War room via Zoom iniciado
- [ ] GitHub issue criada (incident tracking)

### 4.2 Automations Duplicadas (gerarLancamentosCartao)

**Sintomas:**
- 2x lançamentos financeiros por transação
- Reconciliação bancária falha
- Alertas de "duplicate payment" no Slack

**Ação Imediata:**
```bash
# 1. Desabilitar automação de risco
curl -X POST https://prod-api.seu-app.com/automations/disable \
  -H "Authorization: Bearer $OPERATIONS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "automation_id": "69be3ecd" }'

# 2. Executar verificação de duplicatas em dados
SELECT
  created_date,
  COUNT(*) as count
FROM lancamento_financeiro
WHERE created_date >= NOW() - INTERVAL '1 day'
GROUP BY created_date, referencia_id
HAVING COUNT(*) > 1;

# 3. Reverter lançamentos duplicados (manual review)
# Não executar automaticamente! Requer aprovação.
```

**Root Cause Analysis (RCA):**
- Quando foi criada a duplicata? (69be3ecd creation date)
- Quantas transações duplicadas? (SELECT COUNT(*) WHERE duplicated)
- Impacto financeiro? (SUM(valor) das duplicatas)

### 4.3 Data Loss / Inconsistency

**Sintomas:**
- `Sync Status` mostra entidade com count = 0
- `lastUpdated` congelado por >24h
- Teste de audit trail mostra gaps

**Ação Imediata (STOP, não fazer mais operações):**
```bash
# 1. PAUSAR todos os commits / pushes para production
# Comunicar: "🚨 Data consistency issue detected. Pausing sync."

# 2. Validar integridade
curl -X GET https://prod-api.seu-app.com/sync/status \
  -H "Authorization: Bearer $OPERATIONS_API_KEY" | jq

# 3. Exportar snapshot antes de qualquer ação
curl -X GET "https://prod-api.seu-app.com/entities/TargetFlare/export" \
  -H "Authorization: Bearer $OPERATIONS_API_KEY" \
  -o /backups/targetflare_$(date -u +%FT%T%Z)_INCIDENT.csv

# 4. Contactar Data Engineering team
# Eles irão verificar:
# - Backups disponíveis
# - Replication lag (se houver read replicas)
# - Possibility of restore to point-in-time
```

### 4.4 Security Incident (Token Leak)

**Sintomas:**
- OPERATIONS_API_KEY exposto em git history
- Requests anormais de IP desconhecido
- Audit log mostra delete não autorizado

**Ação Imediata (< 5 min):**
```bash
# 1. REVOKE immediately
# Dashboard Base44 > Settings > Environment Variables
# Remover OPERATIONS_API_KEY
# (Isto bloqueia todas as operações, é intencional)

# 2. Gerar novo key
NEW_KEY=$(openssl rand -hex 32)
# Update no dashboard com sk_ops_$NEW_KEY

# 3. Audit access
curl -X GET https://logs.seu-observability.com/api/audit-logs \
  -H "Authorization: Bearer $OBSERVABILITY_KEY" | jq '.logs[] | select(.timestamp >= "2026-04-15T10:00:00Z")'

# 4. Security team review
# Contactar CISO / security@seu-app.com
# Eles irão determinar:
# - Scope of exposure (quando foi leaked? quanto tempo?)
# - Data accessed (quais entidades foram lidas/modificadas?)
# - Remediation (patch, rotate, audit)
```

---

## 5. MAINTENANCE WINDOWS

### 5.1 Scheduled Downtime (Monthly)

```
Próxima: 2º domingo do mês, 22:00–23:00 UTC
Comunicar: 7 dias antes via #incidents + email
Durante: Todas operações via gateway retornam 503 (graceful)
Ação: Pausar cron jobs que usam gateway
Recuperação: ~5 min após restart
```

**Checklist:**
- [ ] Maintenance window agendado no calendário
- [ ] Notificação enviada ao team
- [ ] Cron jobs desabilitados (Disable automations)
- [ ] Logs de manutenção gravados
- [ ] Verificação pós-manutenção (health check)

### 5.2 Dependency Updates

```
Periodicidade: Trimestral (1º semana de Q)
O quê: Base44 SDK, Deno, npm packages
Como:
  1. Testar em Dev
  2. Validar todos endpoints
  3. Canary deploy (5% traffic)
  4. Monitorar por 24h
  5. Full rollout ou rollback
```

---

## 6. CONTACTOS & ESCALATION

| Role | Nome | Slack | Email | Phone |
|------|------|-------|-------|-------|
| Lead Engineer | João | @joao | joao@seu-app.com | +1-XXX-XXX |
| DevOps | Maria | @maria | maria@seu-app.com | +1-XXX-XXX |
| CISO | Carlos | @carlos-security | carlos@seu-app.com | +1-XXX-XXX |
| PagerDuty | - | @pagerduty-bot | alerts@seu-app.com | - |

**Escalation Chain:**
```
Incident Severity 1 (Critical)
  → Trigger PagerDuty
  → Page Lead Engineer + DevOps
  → War room (Zoom)
  → CISO notificado

Incident Severity 2 (Major)
  → Email Lead Engineer
  → Slack #incidents
  → Update status page

Incident Severity 3 (Minor)
  → Slack #incidents
  → Track em GitHub Issues
```

---

## 7. CHECKLISTS RÁPIDAS

### Deploying New Function

```
[ ] Código escrito + testado localmente
[ ] Security review completado
[ ] Função addicionada a operationsGateway routing
[ ] Automação criada (se necessário)
[ ] Docs atualizadas (API, Runbook)
[ ] Merge para main branch
[ ] Base44 rebuild triggered
[ ] Health check ✅
[ ] Canary deploy (1 instance)
[ ] Monitor logs por 30 min
[ ] Full rollout
[ ] Incident postmortem (se houve falha)
```

### Adding New Entity to Operations Coverage

```
[ ] Entity schema validado
[ ] RLS policy confirmada
[ ] Teste de list/export funcionando
[ ] Audit logging configurado
[ ] Sync status monitor atualizado
[ ] Documentation (runbook)
[ ] Automação de backup criada
[ ] Health check modificado para incluir entity
[ ] Teste E2E
[ ] Go-live
```

---

## 8. TROUBLESHOOTING

| Sintoma | Causa Provável | Solução |
|---------|---------------|--------|
| `401 Unauthorized` | Token inválido / expirado | Verificar `OPERATIONS_API_KEY` em .env |
| `503 Service Unavailable` | Gateway down / Base44 outage | Verificar status page + logs |
| `429 Too Many Requests` | Rate limit atingido | Aguardar 60s ou contactar Lead Eng |
| `500 Internal Server Error` | Erro na função | Verificar logs estruturados + correlationId |
| `CSV export vazio` | Entity sem dados | Verificar se registos existem em Base44 dashboard |
| Automations não rodando | Cron desabilitada ou duplicada | Listar + verificar estado |

---

**Última atualização:** 2026-04-15  
**Próxima revisão:** 2026-05-15 (após Month 1)