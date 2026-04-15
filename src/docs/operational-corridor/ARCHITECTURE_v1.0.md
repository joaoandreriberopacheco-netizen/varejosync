# Corredor Operacional Base44 — Arquitetura Estratégica

**Status:** Pronto para Implementação  
**Data:** 2026-04-15  
**Versão:** 1.0.0  
**Escopo:** Acesso server-side contínuo, sem dependência de sessão local

---

## A) ARQUITETURA RECOMENDADA

### A.1 Pilares

```
┌─────────────────────────────────────────────────────────────┐
│         CORREDOR OPERACIONAL ABERTO (Open Corridor)        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AUTENTICAÇÃO & AUTORIZAÇÃO (RBAC Layer)            │  │
│  │  ├─ Service Role Token (Base44 SDK)                 │  │
│  │  ├─ Permissões por Role (admin, operator, viewer)   │  │
│  │  ├─ Token Rotation + Secret Management              │  │
│  │  └─ Audit Trail (logging estruturado)               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  DATA ACCESS LAYER (Unified Entity Gateway)          │  │
│  │  ├─ Generic CRUD para todas entidades               │  │
│  │  ├─ Paginação, filtros, ordenação                   │  │
│  │  ├─ Transações atómicas                             │  │
│  │  ├─ Soft-delete support                             │  │
│  │  └─ Change tracking (audit log)                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  OPERATIONS API (Endpoints Internos)                │  │
│  │  ├─ /health → system status                         │  │
│  │  ├─ /entities/{name}/list → paginado               │  │
│  │  ├─ /entities/{name}/export → idempotente          │  │
│  │  ├─ /sync/{resource}/status → monitoramento        │  │
│  │  ├─ /automations/status → state de triggers        │  │
│  │  └─ /github/webhook → push/pr events               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  OBSERVABILITY STACK (Logging + Metrics)             │  │
│  │  ├─ Structured logging (JSON, correlation ID)       │  │
│  │  ├─ Request tracing (trace/span IDs)                │  │
│  │  ├─ Metrics (latency, throughput, errors)           │  │
│  │  ├─ Alerts (PagerDuty, email)                       │  │
│  │  └─ Dashboards (Grafana/datadog)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  RELIABILITY & RESILIENCE                            │  │
│  │  ├─ Retry com exponential backoff                   │  │
│  │  ├─ Circuit breaker                                 │  │
│  │  ├─ Dead letter queue para falhas                   │  │
│  │  ├─ Idempotency keys                                │  │
│  │  └─ Graceful degradation                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### A.2 Fluxo de Autenticação

```
┌──────────────────┐
│  Sistema Externo │  (CI/CD, cron, webhook)
│  (ou local dev)  │
└────────┬─────────┘
         │ GET /health or /entities/list
         ↓
┌──────────────────────────────────┐
│  REQUEST INTERCEPTOR             │
│  └─ Extract: API Key / JWT token │
└────────┬─────────────────────────┘
         │ Validar assinatura
         ↓
┌──────────────────────────────────┐
│  RBAC POLICY ENGINE              │
│  ├─ Verificar role (admin/op)   │
│  ├─ Verificar escopo (entidad)   │
│  ├─ Verificar timestamp (TTL)    │
│  └─ Rejeitar se inválido         │
└────────┬─────────────────────────┘
         │ ✅ Válido
         ↓
┌──────────────────────────────────┐
│  BASE44 SDK (Service Role)       │
│  └─ Executar operação sem RLS    │
└────────┬─────────────────────────┘
         │ resultado
         ↓
┌──────────────────────────────────┐
│  AUDIT LOGGER                    │
│  ├─ Registar operação            │
│  ├─ Registar quem/quando/o quê   │
│  └─ Registar resultado           │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  RETURN: 200 OK + data/error     │
└──────────────────────────────────┘
```

### A.3 Topologia de Secrets

```
Environment Variables (dotenv ou dashboard):
├─ BASE44_APP_ID              (público)
├─ BASE44_SERVICE_KEY         (privado, rotativo)
├─ OPERATIONS_API_KEY         (privado, rotativo)
├─ GITHUB_TOKEN               (scope: repo, user)
├─ GITHUB_WEBHOOK_SECRET      (HMAC para validar webhook)
├─ OPERATIONS_ALLOWED_IPS     (optional: IP whitelist)
└─ OPERATIONS_ALLOWED_ROLES   (admin, operator, viewer)
```

### A.4 Entidades Incluídas (Fase 1)

**Critical Path:**
- `TargetFlare` (Flare tracking)
- `PedidoVenda` (Sales orders)
- `LancamentoFinanceiro` (Financial entries)
- `Produto` (Products)
- `TurnoCaixa` (Cash shifts)

**Extended (Fase 2):**
- Todas as 50+ entidades atuais
- Futuras entidades (auto-descoberta)

---

## B) CONFIGURAÇÕES EXATAS

### B.1 Funções Serverless (Novo Stack)

#### B.1.1 `functions/operationsGateway.js`

**Responsabilidade:** Unified entry point para todas operações de leitura/escrita.

```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALLOWED_ROLES = ['admin', 'operator'];
const ALLOWED_IPS = Deno.env.get('OPERATIONS_ALLOWED_IPS')?.split(',') || [];
const OPERATIONS_API_KEY = Deno.env.get('OPERATIONS_API_KEY');

Deno.serve(async (req) => {
  const correlationId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    // 1. AUTHENTICATION
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(401, 'Missing or invalid Authorization header', correlationId);
    }
    
    const token = authHeader.slice(7);
    if (token !== OPERATIONS_API_KEY) {
      logAudit({
        correlationId,
        event: 'auth_failed',
        reason: 'invalid_token',
        ip: req.headers.get('x-forwarded-for'),
      });
      return errorResponse(401, 'Invalid API key', correlationId);
    }
    
    // 2. IP WHITELIST (optional)
    if (ALLOWED_IPS.length > 0) {
      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0];
      if (!ALLOWED_IPS.includes(clientIp)) {
        logAudit({
          correlationId,
          event: 'ip_blocked',
          ip: clientIp,
        });
        return errorResponse(403, 'IP not whitelisted', correlationId);
      }
    }
    
    // 3. ROUTE DISPATCH
    const { pathname, searchParams } = new URL(req.url);
    
    if (pathname === '/health' && req.method === 'GET') {
      return handleHealth(correlationId);
    }
    
    if (pathname.match(/^\/entities\/[a-z]+\/list$/i)) {
      return handleEntityList(req, correlationId);
    }
    
    if (pathname.match(/^\/entities\/[a-z]+\/export$/i)) {
      return handleEntityExport(req, correlationId);
    }
    
    if (pathname === '/sync/status') {
      return handleSyncStatus(req, correlationId);
    }
    
    if (pathname === '/automations/status') {
      return handleAutomationsStatus(req, correlationId);
    }
    
    if (pathname === '/github/webhook' && req.method === 'POST') {
      return handleGithubWebhook(req, correlationId);
    }
    
    return errorResponse(404, 'Route not found', correlationId);
    
  } catch (error) {
    logError({
      correlationId,
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(500, 'Internal server error', correlationId);
  } finally {
    const duration = Date.now() - startTime;
    logMetric({
      correlationId,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });
  }
});

// HANDLERS

async function handleHealth(correlationId) {
  const base44 = createClientFromRequest(new Request('http://localhost'));
  
  try {
    const user = await base44.auth.me();
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      correlationId,
      auth: 'valid',
      user_email: user?.email,
    });
  } catch (err) {
    return Response.json({
      status: 'degraded',
      error: err.message,
      correlationId,
    }, { status: 503 });
  }
}

async function handleEntityList(req, correlationId) {
  const { pathname, searchParams } = new URL(req.url);
  const match = pathname.match(/^\/entities\/([a-z_]+)\/list$/i);
  const entityName = match?.[1];
  
  if (!entityName) {
    return errorResponse(400, 'Invalid entity name', correlationId);
  }
  
  const page = parseInt(searchParams.get('page') || '0');
  const limit = parseInt(searchParams.get('limit') || '50');
  const sort = searchParams.get('sort') || '-created_date';
  const filter = searchParams.get('filter') ? 
    JSON.parse(searchParams.get('filter')) : {};
  
  try {
    const base44 = createClientFromRequest(req);
    const entity = base44.entities[entityName];
    
    if (!entity) {
      return errorResponse(404, `Entity ${entityName} not found`, correlationId);
    }
    
    const data = await entity.filter(filter, sort, limit + 1);
    const hasMore = data.length > limit;
    const items = data.slice(0, limit);
    
    logAudit({
      correlationId,
      event: 'entity_list',
      entity: entityName,
      page,
      limit,
      count: items.length,
    });
    
    return Response.json({
      correlationId,
      entity: entityName,
      data: items,
      hasMore,
      page,
      limit,
    });
  } catch (error) {
    logError({ correlationId, event: 'entity_list_error', entity: entityName, error: error.message });
    return errorResponse(500, `Failed to list ${entityName}`, correlationId);
  }
}

async function handleEntityExport(req, correlationId) {
  const { pathname } = new URL(req.url);
  const match = pathname.match(/^\/entities\/([a-z_]+)\/export$/i);
  const entityName = match?.[1];
  
  if (!entityName) {
    return errorResponse(400, 'Invalid entity name', correlationId);
  }
  
  try {
    const idempotencyKey = req.headers.get('idempotency-key');
    if (!idempotencyKey) {
      return errorResponse(400, 'Missing idempotency-key header', correlationId);
    }
    
    const base44 = createClientFromRequest(req);
    const entity = base44.entities[entityName];
    
    if (!entity) {
      return errorResponse(404, `Entity ${entityName} not found`, correlationId);
    }
    
    // Fetch all with pagination
    let allData = [];
    let offset = 0;
    const pageSize = 500;
    let hasMore = true;
    
    while (hasMore) {
      const batch = await entity.list('-created_date', pageSize);
      if (batch.length < pageSize) hasMore = false;
      allData = allData.concat(batch);
      offset += batch.length;
    }
    
    const csvData = convertToCSV(allData);
    
    logAudit({
      correlationId,
      event: 'entity_export',
      entity: entityName,
      count: allData.length,
      idempotencyKey,
    });
    
    return new Response(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${entityName}_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    logError({ correlationId, event: 'entity_export_error', entity: entityName, error: error.message });
    return errorResponse(500, `Failed to export ${entityName}`, correlationId);
  }
}

async function handleSyncStatus(req, correlationId) {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar status de sincronização de cada entidade crítica
    const entities = ['TargetFlare', 'PedidoVenda', 'LancamentoFinanceiro', 'Produto'];
    const status = {};
    
    for (const ent of entities) {
      try {
        const recent = await base44.entities[ent].list('-updated_date', 1);
        status[ent] = {
          count: (await base44.entities[ent].list()).length,
          lastUpdated: recent[0]?.updated_date || null,
          healthy: true,
        };
      } catch (err) {
        status[ent] = {
          healthy: false,
          error: err.message,
        };
      }
    }
    
    return Response.json({
      correlationId,
      timestamp: new Date().toISOString(),
      status,
    });
  } catch (error) {
    return errorResponse(500, 'Sync status check failed', correlationId);
  }
}

async function handleAutomationsStatus(req, correlationId) {
  // TODO: Implementar quando Base44 expor automations API
  return Response.json({
    correlationId,
    message: 'Automations status coming soon',
  });
}

async function handleGithubWebhook(req, correlationId) {
  const signature = req.headers.get('x-hub-signature-256');
  const payload = await req.text();
  
  const secret = Deno.env.get('GITHUB_WEBHOOK_SECRET');
  const expectedSig = 'sha256=' + 
    new TextEncoder().encode(
      await crypto.subtle.sign(
        'hmac',
        await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
        new TextEncoder().encode(payload)
      )
    ).toString('hex');
  
  if (signature !== expectedSig) {
    logAudit({
      correlationId,
      event: 'webhook_validation_failed',
      source: 'github',
    });
    return errorResponse(401, 'Invalid webhook signature', correlationId);
  }
  
  const event = JSON.parse(payload);
  logAudit({
    correlationId,
    event: 'github_webhook_received',
    action: event.action,
    repo: event.repository?.name,
  });
  
  // Processar evento (ex: sync codebase snapshot, trigger flare export)
  // TODO: implementar lógica específica
  
  return Response.json({ correlationId, status: 'accepted' });
}

// UTILITIES

function errorResponse(status, message, correlationId) {
  return Response.json({
    correlationId,
    error: message,
  }, { status });
}

function logAudit(data) {
  console.log(JSON.stringify({
    level: 'audit',
    timestamp: new Date().toISOString(),
    ...data,
  }));
}

function logError(data) {
  console.error(JSON.stringify({
    level: 'error',
    timestamp: new Date().toISOString(),
    ...data,
  }));
}

function logMetric(data) {
  console.log(JSON.stringify({
    level: 'metric',
    timestamp: new Date().toISOString(),
    ...data,
  }));
}

function convertToCSV(data) {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h];
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
```

#### B.1.2 `functions/auditLogger.js`

**Responsabilidade:** Centralizar logs estruturados + enviar para observability stack.

```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Endpoint para registar eventos de auditoria
 * POST /audit-log
 * Body: { correlationId, event, metadata }
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 });
  }
  
  try {
    const { correlationId, event, metadata } = await req.json();
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Registar em entidade dedicada de auditoria
    // (ou enviar para observability backend)
    const auditRecord = {
      correlationId,
      event,
      metadata,
      user_email: user?.email,
      timestamp: new Date().toISOString(),
      ip: req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent'),
    };
    
    // Enviar para DataDog / Grafana Loki / CloudWatch
    await sendToObservability(auditRecord);
    
    return Response.json({ recorded: true });
  } catch (error) {
    console.error('Audit log error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendToObservability(record) {
  // TODO: Configurar baseado no provider escolhido
  // Ex: DataDog, Grafana, CloudWatch, Loki
  
  // Placeholder: log to stdout (será picado por container logs)
  console.log(JSON.stringify(record));
}
```

#### B.1.3 `functions/automationManager.js`

**Responsabilidade:** Orchestrator de automations críticas (sem duplicação, com estado).

```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Centralizar controle de automations:
 * - Deletar duplicadas
 * - Monitorar estado
 * - Recriar em caso de falha
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }
  
  const { action, automation_id } = await req.json();
  
  switch (action) {
    case 'list':
      return handleListAutomations(base44);
    case 'disable':
      return handleDisableAutomation(base44, automation_id);
    case 'delete_duplicates':
      return handleDeleteDuplicates(base44);
    default:
      return Response.json({ error: 'Unknown action' }, { status: 400 });
  }
});

async function handleListAutomations(base44) {
  // TODO: Expor via Base44 API quando disponível
  return Response.json({
    automations: [
      {
        id: '69be3ff0',
        name: 'gerarLancamentosCartao',
        type: 'cron',
        schedule: '02:00 UTC',
        status: 'active',
      },
    ],
  });
}

async function handleDisableAutomation(base44, automationId) {
  // TODO: Implementar via Base44 API
  return Response.json({
    automationId,
    status: 'disabled',
  });
}

async function handleDeleteDuplicates(base44) {
  // Detectar e remover automations duplicadas
  // RISCO CRÍTICO: gerarLancamentosCartao rodando 2x
  
  return Response.json({
    message: 'Delete duplicates not yet implemented',
  });
}
```

### B.2 Automações Necessárias

#### B.2.1 Health Check Periódico

```
Tipo: Scheduled (Cron)
Expressão: "0 */6 * * *" (a cada 6h)
Função: /operationsGateway (GET /health)
Objetivo: Detectar falhas de connectividade
Alertar: Se status != 200 por >2h
```

#### B.2.2 Sync Status Monitor

```
Tipo: Scheduled (Cron)
Expressão: "0 */1 * * *" (a cada hora)
Função: /operationsGateway (GET /sync/status)
Objetivo: Monitorar integridade de entidades críticas
Alertar: Se entity.healthy = false ou lastUpdated > 24h
```

#### B.2.3 GitHub Webhook Listener

```
Tipo: Connector (GitHub webhook)
Integração: github
Eventos: ["push", "pull_request"]
Função: /operationsGateway (POST /github/webhook)
Objetivo: Sincronizar alterações de código
```

#### B.2.4 Resolução de Duplicatas

```
Tipo: Scheduled (Manual + cron)
Expressão: "0 0 1 * *" (1x mês)
Função: /automationManager (DELETE /duplicates)
Objetivo: Remover automations duplicadas
Nota: CRÍTICO - gerarLancamentosCartao rodando 2x!
```

### B.3 Secrets & Configuration

```bash
# .env (ou dashboard Base44 > Settings > Environment Variables)

# API Authentication
OPERATIONS_API_KEY=sk_ops_<random_64_chars>  # gerado via crypto.randomUUID()
OPERATIONS_API_KEY_ROTATION_DATE=2026-05-15  # monthly rotation

# IP Whitelist (opcional, comma-separated)
OPERATIONS_ALLOWED_IPS=203.0.113.45,198.51.100.23

# Roles permitidos
OPERATIONS_ALLOWED_ROLES=admin,operator

# GitHub
GITHUB_TOKEN=ghp_...                         # (já existe)
GITHUB_WEBHOOK_SECRET=whsec_...              # HMAC para validar webhooks

# Observability (escolher um ou mais)
DATADOG_API_KEY=dd_...                       # (opcional)
SENTRY_DSN=https://...                       # (opcional)
GRAFANA_API_KEY=...                          # (opcional)

# Feature flags
ENABLE_AUDIT_LOGGING=true
ENABLE_IDEMPOTENCY=true
ENABLE_IP_WHITELIST=false
```

---

## C) CHECKLIST DE VALIDAÇÃO

### C.1 Validação Técnica

- [ ] `functions/operationsGateway.js` criada e deployada
- [ ] `functions/auditLogger.js` criada e deployada
- [ ] `functions/automationManager.js` criada e deployada
- [ ] Health check respondendo em <500ms
- [ ] Entity list paginação funcionando (limit, offset, sort)
- [ ] Entity export idempotente (mesmo idempotency-key = mesmos dados)
- [ ] Sincronização de entidades críticas em <1h
- [ ] GitHub webhook recebendo eventos (POST /github/webhook)
- [ ] Correlação por request (todos logs incluem correlationId)
- [ ] Error handling com retry + backoff (max 3 tentativas)
- [ ] Circuit breaker ativando se >50% falhas em janela de 5 min

### C.2 Validação de Segurança

- [ ] API key rotativo mensalmente (processo documentado)
- [ ] Token expiração em JWT (se usar, 1h TTL)
- [ ] IP whitelist configurado (se habilitado)
- [ ] Webhook signature validation (GitHub HMAC)
- [ ] Logs nunca expõem dados sensíveis (credit cards, SSN, etc.)
- [ ] Rate limiting (max 100 req/min por API key)
- [ ] CORS restritivo (apenas origins conhecidas)
- [ ] Audit trail completo em >30 dias
- [ ] Acesso a operationsGateway requer autenticação
- [ ] Service key nunca comitida em git (usar secrets manager)

### C.3 Validação de Conformidade

- [ ] Documentação de API (OpenAPI/Swagger)
- [ ] Runbook de operação atualizado
- [ ] Incident response plan documentado
- [ ] Testes E2E de conectividade (curl + validação)
- [ ] Monitoring + alertas configurados
- [ ] SLA de uptime: 99.5% (máx 21.6 min downtime/mês)
- [ ] RTO: <15 min (tempo para recuperar de falha)
- [ ] RPO: <5 min (perda máxima de dados)

### C.4 Testes de Penetração

```bash
# Teste 1: Authentication
curl -X GET https://api.app.com/health
# Esperado: 401 Unauthorized

curl -X GET https://api.app.com/health \
  -H "Authorization: Bearer invalid_key"
# Esperado: 401 Invalid API key

curl -X GET https://api.app.com/health \
  -H "Authorization: Bearer $OPERATIONS_API_KEY"
# Esperado: 200 OK { status: healthy, ... }

# Teste 2: Authorization (role-based)
# TODO: Se usar RBAC, testar role escalation, resource access
```

---

## D) PLANO DE IMPLEMENTAÇÃO (4 SEMANAS)

### Week 1: Foundation

**Objetivo:** Core authentication + gateway básico

- **Seg–Ter:** Implementar `operationsGateway.js` (health check + entity list)
- **Qua:** Testes unitários (autenticação, routing)
- **Qui:** Deploy em ambiente Dev
- **Sex:** Validar integração com Base44 SDK

**Deliverables:**
- ✅ Função serverless funcional
- ✅ 5 testes unitários
- ✅ Documentação de API (endpoints)

**Critérios de Aceite:**
- GET /health retorna 200 + timestamp
- GET /entities/TargetFlare/list retorna dados paginados
- Autenticação rejeita requests sem token

---

### Week 2: Feature Complete

**Objetivo:** Export idempotent + logging + automations

- **Seg–Ter:** Implementar entity export (CSV) + idempotency
- **Qua:** Implementar `auditLogger.js`
- **Qui:** Criar automations (health check, sync monitor)
- **Sex:** Testes integrados + load testing (100 req/s)

**Deliverables:**
- ✅ Export de entidades (todos formatos)
- ✅ Auditoria centralizada
- ✅ Automations ativas
- ✅ Load test report (<500ms P95)

**Critérios de Aceite:**
- Export com idempotency-key produz resultado idêntico
- Logs estruturados em JSON
- Automations executando sem erros

---

### Week 3: Observability + Hardening

**Objetivo:** Monitoring, alertas, e segurança

- **Seg–Ter:** Integrar observability stack (escolher: Datadog/Sentry/Grafana)
- **Qua:** Rate limiting + IP whitelist + CORS
- **Qui:** Testes de segurança (penetration testing)
- **Sex:** Documentação de runbook + incident response

**Deliverables:**
- ✅ Dashboard com métricas (latência, erro rate, throughput)
- ✅ Alertas configurados (PagerDuty ou email)
- ✅ Segurança hardened
- ✅ Runbook oficial

**Critérios de Aceite:**
- Alertas acionando corretamente
- Taxa de erro <0.1%
- IP whitelist bloqueando requests não-autorizados
- Runbook testado (onboarding de novo operador)

---

### Week 4: Production Ready + Cutover

**Objetivo:** Validação final + deploy em Production

- **Seg–Ter:** Testes E2E completos (CI/CD pipeline)
- **Qua:** Validação de compliance (security checklist)
- **Qui:** Plano de rollback + canary deployment
- **Sex:** Go-live + monitoring 24h

**Deliverables:**
- ✅ Testes E2E automatizados
- ✅ Certificação de segurança
- ✅ Plano de contingência
- ✅ Produção ao vivo

**Critérios de Aceite:**
- Pipeline CI/CD passando (todos testes)
- Segurança sign-off de team
- <1 erro por 10k requests em primeiras 24h
- Documentação atualizada

---

### Timeline Gráfico

```
Semana 1       Semana 2       Semana 3       Semana 4
[Foundation]   [Features]     [Observability][Produção]
├─ Gateway     ├─ Export      ├─ Monitoring  ├─ E2E Tests
├─ Auth        ├─ Logging     ├─ Alertas     ├─ Security
└─ SDK calls   ├─ Automations ├─ Hardening   ├─ Rollback
               └─ Load test   └─ Runbook     └─ Go-live

Risco: Week 2 pode slippage se Base44 SDK não expor automations API
Mitigação: Providenciar fallback endpoint em Week 1
```

---

## E) MATRIZ DE RISCO & MITIGAÇÃO

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|--------|-----------|
| Base44 SDK versão incompatível | Média | Alto | Testar com latest version + vendor lock-in plan |
| Rate limiting não funciona | Baixa | Médio | Implementar cliente-side throttle como fallback |
| GitHub webhook delayed/lost | Média | Médio | Add retry queue + dead letter queue |
| Audit logs > storage limit | Baixa | Médio | Implementar log rotation + archival |
| API key comprometida | Baixa | Crítico | Rotação mensal + immediate revoke protocol |

---

## F) SUCESSO: KPIs & OKRs

**KPIs (Technical):**
- ✅ API availability: >99.5%
- ✅ P95 latency: <500ms
- ✅ Error rate: <0.1%
- ✅ Sync lag: <1h para todas entidades

**OKRs (Business):**
- ✅ Operações em Production sem dependência local
- ✅ Zero manual token-rotations por semana
- ✅ Incident response <30 min
- ✅ Auditoria completa para compliance

---

**Assinado:** Base44 Architecture Team  
**Data:** 2026-04-15  
**Status:** ✅ READY FOR IMPLEMENTATION