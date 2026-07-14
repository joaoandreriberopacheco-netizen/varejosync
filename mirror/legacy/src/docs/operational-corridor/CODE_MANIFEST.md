# Manifest de Código — Ficheiros a Criar/Modificar

**Status:** Pronto para Implementação  
**Data:** 2026-04-15  
**Versão:** 1.0.0

---

## 📝 Ficheiros a Criar (Week 1–4)

### Backend Functions (Deno Serverless)

#### 1. `functions/operationsGateway.js` (NEW)

**Responsabilidade:** Unified API gateway para operações  
**Linhas:** ~800  
**Dependências:** Base44 SDK v0.8.25+, Deno  
**Deadline:** Week 1, Friday

**O que fazer:**
- [ ] Copiar spec from [ARCHITECTURE_v1.0.md](./ARCHITECTURE_v1.0.md) Section B.1.1
- [ ] Implementar routes:
  - [ ] GET /health
  - [ ] GET /entities/{entity}/list
  - [ ] GET /entities/{entity}/export
  - [ ] GET /sync/status
  - [ ] GET /automations/status
  - [ ] POST /github/webhook
- [ ] Implementar autenticação (Bearer token)
- [ ] Implementar retry logic (max 3, exponential backoff)
- [ ] Implementar correlation ID
- [ ] Testes unitários (5+)

**Teste de aceitação:**
```bash
curl -X GET http://localhost:8000/health \
  -H "Authorization: Bearer sk_ops_test"
# → 200 { status: "healthy", correlationId: "...", ... }
```

---

#### 2. `functions/auditLogger.js` (NEW)

**Responsabilidade:** Centralizar logging estruturado  
**Linhas:** ~250  
**Dependências:** Base44 SDK, observability client (Datadog/Sentry)  
**Deadline:** Week 2, Wednesday

**O que fazer:**
- [ ] Copiar spec from [ARCHITECTURE_v1.0.md](./ARCHITECTURE_v1.0.md) Section B.1.2
- [ ] Implementar POST /audit-log endpoint
- [ ] Implementar JSON logging (estruturado)
- [ ] Implementar envio para observability stack
- [ ] Implementar retenção policy (30–90 dias)
- [ ] Implementar data sanitization (sem PII)

**Teste de aceitação:**
```bash
curl -X POST http://localhost:8000/audit-log \
  -H "Authorization: Bearer sk_ops_test" \
  -H "Content-Type: application/json" \
  -d '{
    "correlationId": "abc123",
    "event": "entity_export",
    "metadata": { "entity": "TargetFlare", "count": 100 }
  }'
# → 200 { recorded: true }
```

---

#### 3. `functions/automationManager.js` (NEW)

**Responsabilidade:** Orchestrator de automations + resolver duplicatas  
**Linhas:** ~300  
**Dependências:** Base44 SDK  
**Deadline:** Week 2, Friday

**O que fazer:**
- [ ] Copiar spec from [ARCHITECTURE_v1.0.md](./ARCHITECTURE_v1.0.md) Section B.1.3
- [ ] Implementar POST /automations/list
- [ ] Implementar POST /automations/disable
- [ ] Implementar POST /automations/delete
- [ ] Implementar DELETE /automations/duplicates (critical!)
  - [ ] Detectar automations com mesmo name
  - [ ] Deletar instâncias antigas (manter mais recente)
  - [ ] **CRÍTICO:** Resolver gerarLancamentosCartao duplicada
- [ ] Testes (5+)

**KRITICAL FIX — Duplicata gerarLancamentosCartao:**
```
ID1: 69be3ff0 (Cron 02:00 UTC daily)
ID2: 69be3ecd (Cron 02:00 UTC daily)
→ Ambas rodando = 2x lançamentos financeiros

FIX:
curl -X POST /automations/delete \
  -d '{ "automation_id": "69be3ecd" }'
```

---

### Configuration Files

#### 4. `.env.example` (MODIFY)

**O que adicionar:**
```bash
# Operações Gateway
OPERATIONS_API_KEY=sk_ops_<gerado>
OPERATIONS_API_KEY_ROTATION_DATE=2026-05-15
OPERATIONS_ALLOWED_IPS=203.0.113.45,198.51.100.23  # optional
OPERATIONS_ALLOWED_ROLES=admin,operator,viewer

# Observability
DATADOG_API_KEY=dd_<your-key>
SENTRY_DSN=https://...
GRAFANA_API_KEY=...

# Feature Flags
ENABLE_AUDIT_LOGGING=true
ENABLE_IDEMPOTENCY=true
ENABLE_IP_WHITELIST=false
ENABLE_RATE_LIMITING=true
```

---

#### 5. `build/sourceLocationBabelPlugin.cjs` (ALREADY CREATED ✅)

Status: ✅ Criado em resposta ao erro anterior.  
Validação: Verificar se vite build passa sem erros.

---

### Documentation Files (ALREADY COMPLETE ✅)

#### ✅ `docs/operational-corridor/ARCHITECTURE_v1.0.md`
Status: ✅ Criado (885 linhas)

#### ✅ `docs/operational-corridor/RUNBOOK_v1.0.md`
Status: ✅ Criado (531 linhas)

#### ✅ `docs/operational-corridor/VALIDATION_CHECKLIST.md`
Status: ✅ Criado (400+ linhas)

#### ✅ `docs/operational-corridor/IMPLEMENTATION_PLAN.md`
Status: ✅ Criado (600+ linhas)

#### ✅ `docs/operational-corridor/EXECUTIVE_SUMMARY.md`
Status: ✅ Criado (200+ linhas)

#### ✅ `docs/operational-corridor/README.md`
Status: ✅ Criado (index centralizado)

#### ✅ `docs/operational-corridor/CODE_MANIFEST.md`
Status: ✅ Este ficheiro

---

## 🔄 Ficheiros a Modificar (Week 1–4)

### 1. `App.jsx` (MODIFY — IF NEEDED)

**Situação:** Se operationsGateway será acessível via UI (unlikely)

**O que fazer:**
- [ ] **NÃO MODIFICAR** (gateway é server-only, não para UI)
- Endpoints acessíveis via CLI/curl, não via frontend

---

### 2. `vite.config.js` (MODIFY)

**Situação:** Adicionar compilação de funções serverless

**O que fazer:**
```javascript
// Adicionar ao export
{
  define: {
    'process.env.OPERATIONS_API_KEY': JSON.stringify(process.env.OPERATIONS_API_KEY),
  },
  build: {
    rollupOptions: {
      output: {
        // Garantir que functions/ são compiladas separately
      }
    }
  }
}
```

---

### 3. `.github/workflows/ci.yml` (MODIFY)

**Situação:** Adicionar pipeline de CI/CD para validação automática

**O que fazer:**
```yaml
name: Operations CI/CD

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Deno
        uses: denoland/setup-deno@v1
      - name: Test operationsGateway
        run: deno test --allow-net functions/operationsGateway.js
      - name: Lint
        run: deno lint functions/
      - name: Build app
        run: npm run build
      - name: Deploy to Dev
        if: github.ref == 'refs/heads/main'
        run: |
          # Trigger Base44 deploy
```

---

### 4. `package.json` (MODIFY)

**O que adicionar:**
```json
{
  "scripts": {
    "test:operations": "deno test --allow-net functions/operationsGateway.js",
    "lint:operations": "deno lint functions/",
    "deploy:gateway": "base44 deploy functions/operationsGateway.js",
    "health-check": "curl -H 'Authorization: Bearer $OPERATIONS_API_KEY' http://localhost:8000/health"
  }
}
```

---

### 5. `.gitignore` (MODIFY)

**O que adicionar:**
```
# Operational secrets (NUNCA commit)
OPERATIONS_API_KEY
.env.local
.env.prod

# Logs
operations-*.log
audit-*.log

# Backups
/backups/
*.csv.backup
```

---

## 📊 Roadmap de Criação (Day-by-Day)

### Week 1: Foundation

| Data | Tarefa | Ficheiro | Owner | Status |
|------|--------|----------|-------|--------|
| Seg 15 | Kick-off + architecture review | - | Lead Eng | ⏳ |
| Seg 15 | Setup dev env + SDK exploration | - | Eng 1 | ⏳ |
| Ter 16 | operationsGateway boilerplate | operationsGateway.js | Eng 1 | ⏳ |
| Ter 16 | /health endpoint | operationsGateway.js | Eng 1 | ⏳ |
| Qua 17 | Entity list + pagination | operationsGateway.js | Eng 2 | ⏳ |
| Qua 17 | Unit tests (5+) | operationsGateway.test.js | Eng 1 | ⏳ |
| Qui 18 | Auth validation | operationsGateway.js | Eng 1 | ⏳ |
| Qui 18 | Error handling | operationsGateway.js | Eng 1 | ⏳ |
| Sex 19 | Integration test | - | Eng 2 | ⏳ |
| Sex 19 | Deploy Dev | - | DevOps | ⏳ |

### Week 2: Features

| Data | Tarefa | Ficheiro | Owner | Status |
|------|--------|----------|-------|--------|
| Seg 22 | Entity export (CSV) | operationsGateway.js | Eng 1 | ⏳ |
| Ter 23 | Idempotency support | operationsGateway.js | Eng 2 | ⏳ |
| Qua 24 | auditLogger.js | auditLogger.js | Eng 1 | ⏳ |
| Qui 25 | Automations setup | automationManager.js | Eng 2 | ⏳ |
| Sex 26 | Load testing | - | DevOps | ⏳ |

### Week 3: Hardening

| Data | Tarefa | Ficheiro | Owner | Status |
|------|--------|----------|-------|--------|
| Seg 29 | Observability config | .env.example | DevOps | ⏳ |
| Ter 30 | Rate limiting | operationsGateway.js | Eng 1 | ⏳ |
| Qua 01 | Security hardening | operationsGateway.js | Eng 2 | ⏳ |
| Qui 02 | Runbook final | - | Lead Eng | ⏳ |
| Sex 03 | Security review | - | Ana (Security) | ⏳ |

### Week 4: Go-Live

| Data | Tarefa | Ficheiro | Owner | Status |
|------|--------|----------|-------|--------|
| Seg 06 | E2E tests | - | Eng 1 | ⏳ |
| Ter 07 | Canary deployment | - | DevOps | ⏳ |
| Qua 08 | Team training | - | Lead Eng | ⏳ |
| Qui 09 | Final validation | - | QA | ⏳ |
| **Sex 10** | **GO-LIVE** | - | All | ⏳ |

---

## ✅ Validation per File

### operationsGateway.js

```bash
# Unit tests
deno test --allow-net functions/operationsGateway.js

# Expected output:
# test result: ok. 5 passed; 0 failed

# Integration test
npm run health-check
# Expected: 200 OK { status: "healthy", ... }

# Load test
ab -n 1000 -c 10 http://localhost:8000/health
# Expected: P95 < 500ms, 0 errors
```

### auditLogger.js

```bash
# Test POST /audit-log
curl -X POST http://localhost:8000/audit-log \
  -H "Authorization: Bearer sk_ops_test" \
  -H "Content-Type: application/json" \
  -d '{ "correlationId": "test", "event": "test", "metadata": {} }'
# Expected: 200 { recorded: true }

# Verify logs in observability tool
# Expected: Event appears in Datadog/Sentry within 5s
```

### automationManager.js

```bash
# List automations
curl -X POST http://localhost:8000/automations/list \
  -H "Authorization: Bearer sk_ops_admin" \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: JSON array of automations

# Delete duplicate (CRITICAL)
curl -X POST http://localhost:8000/automations/delete \
  -H "Authorization: Bearer sk_ops_admin" \
  -H "Content-Type: application/json" \
  -d '{ "automation_id": "69be3ecd" }'
# Expected: 200 { status: "deleted" }
```

---

## 📦 Dependências Externas

| Dependência | Versão | Status | Notas |
|-------------|--------|--------|-------|
| Base44 SDK | 0.8.25+ | ✅ Disponível | Usar latest |
| Deno | 1.40+ | ✅ Disponível | Runtime para serverless |
| Node.js | 18+ | ✅ Instalado | Para npm scripts |
| Datadog | - | ⏳ Orçado | Para observability |
| PagerDuty | - | ⏳ Orçado | Para alerting |

---

## 🚀 Deployment Checklist

### Local Development

```bash
# 1. Clone & setup
git clone repo && cd repo
npm install

# 2. Configure .env
cp .env.example .env
# Edit: OPERATIONS_API_KEY, GITHUB_TOKEN, etc.

# 3. Run functions locally
deno run --allow-net functions/operationsGateway.js

# 4. Test
curl -H "Authorization: Bearer $OPERATIONS_API_KEY" \
  http://localhost:8000/health
```

### Dev Deployment

```bash
# 1. Deploy to Base44 Dev environment
base44 deploy functions/operationsGateway.js

# 2. Validate
curl -H "Authorization: Bearer $OPERATIONS_API_KEY" \
  https://dev-api.seu-app.com/health
```

### Production Deployment

```bash
# 1. Canary (5% traffic)
base44 deploy --canary functions/operationsGateway.js

# 2. Monitor (30 min)
# → Check metrics, error logs

# 3. Full rollout (if green)
base44 deploy functions/operationsGateway.js

# 4. Validate
curl -H "Authorization: Bearer $OPERATIONS_API_KEY" \
  https://prod-api.seu-app.com/health
```

---

## 📋 Checklist Final

### Code Quality
- [ ] Linting passa (deno lint)
- [ ] Testes unitários (5+) passam
- [ ] Testes integração (3+) passam
- [ ] Code review: aprovado
- [ ] No hardcoded secrets
- [ ] Error messages úteis (sem stack traces)

### Security
- [ ] Autenticação validada
- [ ] Autorização RBAC testada
- [ ] Rate limiting ativo
- [ ] IP whitelist (se enabled)
- [ ] CORS restritivo
- [ ] Logs não expõem PII

### Documentation
- [ ] README atualizado
- [ ] API endpoints documentados
- [ ] Runbook completo
- [ ] Testes de aceitação listados
- [ ] Known issues documentados

### Deployment
- [ ] .env.example atualizado
- [ ] GitHub Actions pipeline pronto
- [ ] Base44 deploy workflow testado
- [ ] Rollback plan pronto
- [ ] Monitoring configured

---

**Status:** ✅ READY FOR IMPLEMENTATION  
**Próximo:** Start Week 1 kick-off  
**Data:** 2026-04-15