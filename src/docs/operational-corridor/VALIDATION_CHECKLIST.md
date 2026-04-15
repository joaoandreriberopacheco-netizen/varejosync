# Checklist de Validação Técnica & Segurança

**Status:** Template Pronto para Preenchimento  
**Data de Criação:** 2026-04-15  
**Responsável:** DevOps + Security Team

---

## ✅ VALIDAÇÃO TÉCNICA

### Gateway Core (operationsGateway.js)

- [ ] Função deployada sem erros
- [ ] GET /health responde em <300ms
- [ ] GET /health retorna JSON válido + correlationId
- [ ] POST /entities/{entity}/list funciona com paginação
- [ ] Entity list retorna `hasMore` correto
- [ ] Entity list com `limit=0` retorna erro 400
- [ ] Entity list com entity inexistente retorna 404
- [ ] Sort order funciona (ascending + descending)
- [ ] Filter param é URL-encoded corretamente
- [ ] Timeout se query demora >30s (retorna erro gracioso)

### Entity Export (Idempotency)

- [ ] Export sem `Idempotency-Key` retorna 400
- [ ] Export com mesmo `Idempotency-Key` retorna exatamente os mesmos dados
- [ ] Export CSV bem-formatted (válido para Excel import)
- [ ] CSV headers correspondem aos campos da entidade
- [ ] Strings com aspas escapadas corretamente (`"` → `""`)
- [ ] Números decimais com vírgula (locale PT-BR)
- [ ] Datas em ISO 8601 format
- [ ] Null/undefined renderizado como vazio ou "null"
- [ ] Export com >10K registos funciona (não timeout)
- [ ] File size < 100MB (limite típico)

### Autenticação & Autorização

- [ ] Request sem `Authorization` header retorna 401
- [ ] Request com token inválido retorna 401
- [ ] Request com token válido retorna 200
- [ ] Token format: `Bearer sk_ops_...`
- [ ] Token validation case-sensitive
- [ ] Token expiração implementada (se usar JWT)
- [ ] Service-role operations não usam RLS (listam todos registos)
- [ ] User-scoped operations respeitam RLS
- [ ] Role verificação implementada (admin vs operator vs viewer)
- [ ] Operação não permitida retorna 403 Forbidden

### Logging & Audit

- [ ] Todos endpoints logar evento (audit log)
- [ ] Correlation ID gerado e propagado
- [ ] Logs em formato JSON (estruturado)
- [ ] Logs include: timestamp, correlationId, event, user_email, ip
- [ ] Logs nunca expõem: API keys, passwords, credit cards
- [ ] Audit trail retention >= 30 dias
- [ ] Logs enviados para observability stack
- [ ] Metrics coletadas (latency, throughput, errors)

### Error Handling & Resilience

- [ ] Erro em Base44 SDK tratado graciosamente (não crash)
- [ ] Retry logic: max 3 tentativas com exponential backoff
- [ ] Backoff: 1s, 2s, 4s (totalizando ~7s)
- [ ] Circuit breaker ativa após >50% falhas em 5 min
- [ ] Circuit breaker retorna 503 (não erro genérico)
- [ ] Timeout padrão: 30s para operações
- [ ] Dead letter queue para retry jobs que falham 3x
- [ ] Graceful degradation: se observability indisponível, ainda funciona

### Performance & Load Testing

- [ ] P50 latency < 200ms
- [ ] P95 latency < 500ms
- [ ] P99 latency < 2s
- [ ] Throughput: >100 req/s sem degradação
- [ ] Memory leak test: 1h de load sem aumento > 20%
- [ ] CPU usage <80% sob carga normal
- [ ] No "hanging" connections (timeout properly)

### Integration Testing

- [ ] operationsGateway integra com Base44 SDK corretamente
- [ ] Automações criam eventos que aparecem em sync status
- [ ] GitHub webhook recebe dados e valida signature
- [ ] auditLogger envia eventos para observability
- [ ] Audit logs correlam com metrics
- [ ] Entity export usa dados atualizados (< 1s de lag)

---

## 🔒 VALIDAÇÃO DE SEGURANÇA

### Autenticação

- [ ] API key formato: `sk_ops_` + 32 caracteres hexadecimais
- [ ] API key nunca logada em plain text
- [ ] API key nunca commitida em git (pre-commit hook)
- [ ] API key rotation implementada (monthly)
- [ ] Novo key testado antes de revogação da old
- [ ] Rotação documentada em ROTATION_LOG.md
- [ ] Token TTL < 1 hora (se usar JWT)
- [ ] Token refresh implementado (se necessário)

### Autorização & RBAC

- [ ] Roles definidos: admin, operator, viewer
- [ ] admin: acesso total (list, create, update, delete, export)
- [ ] operator: acesso de leitura + operações específicas (export)
- [ ] viewer: apenas leitura
- [ ] Role verificação ocorre ANTES execução (não depois)
- [ ] Role escalation testada (tentar mudar role sem permissão → fail)

### Network Security

- [ ] IP whitelist implementado (se enabled)
- [ ] IP validation ocorre ANTES autenticação
- [ ] Invalid IP retorna 403 (não 401)
- [ ] CORS headers restritivos (apenas origem esperada)
- [ ] HTTPS/TLS obrigatório (nunca HTTP em prod)
- [ ] Certificate válido + renovação automática
- [ ] TLS version >= 1.2 (no SSLv3, TLS 1.0, 1.1)

### Data Protection

- [ ] Logs nunca expõem: PII, credit cards, API keys, passwords
- [ ] CSV export não inclui campos sensíveis (se aplicável)
- [ ] Encryption at rest (se usar storage persistente)
- [ ] Encryption in transit (HTTPS)
- [ ] Data retention policy: 30 dias para logs, 90 dias para audit
- [ ] Data deletion implementada (soft-delete ou hard-delete policy)
- [ ] Backup strategy: daily snapshots + test restore quarterly

### Webhook Security

- [ ] GitHub webhook signature validation implementada
- [ ] Signature algorithm: SHA-256 HMAC
- [ ] Signature rejeição se inválida (não log + continue)
- [ ] Webhook timeout: 30s (não esperar infinito)
- [ ] Webhook retry: max 3 vezes, então dead letter
- [ ] Webhook secret nunca logado

### Dependency Security

- [ ] npm audit sem vulnerabilidades críticas
- [ ] Deno permissions mínimas apenas (--allow-net, não --allow-all)
- [ ] Dependency pinning: semver ou lock file
- [ ] Dependency scanning: ferramentas como Snyk / Dependabot
- [ ] Package provenance verificada (não typosquatting)

### Compliance & Auditing

- [ ] Todas operações auditadas (create, read, update, delete)
- [ ] Audit logs incluem: who, what, when, where, why (5 Ws)
- [ ] Audit logs imutáveis (append-only)
- [ ] Audit log retention >= 1 ano (legal requirement)
- [ ] Compliance checklist: GDPR, HIPAA (se aplicável)
- [ ] Data breach response plan documentado
- [ ] Security incident response plano pronto

### Testing & Validation

- [ ] Penetration test: SQL injection attempts → sanitize + fail
- [ ] Penetration test: XSS attempts → escape output
- [ ] Penetration test: CSRF tokens (se aplicável)
- [ ] Penetration test: rate limiting enforcement
- [ ] Penetration test: auth bypass attempts
- [ ] Fuzz testing com input aleatório
- [ ] Security code review completado (peer review)

---

## 📋 VALIDAÇÃO DE CONFORMIDADE

### Documentação

- [ ] API documentation completa (OpenAPI/Swagger)
- [ ] Runbook operacional escrito + testado
- [ ] Incident response plan documentado
- [ ] Security policy definida
- [ ] Data retention policy escrita
- [ ] Disaster recovery plan + RTO/RPO definidos
- [ ] Changelog maintained (git tags)

### Infrastructure

- [ ] Base44 app ID válido + secret key configurado
- [ ] Environment variables setadas (não hardcoded)
- [ ] Secrets manager integrado (AWS Secrets, HashiCorp Vault)
- [ ] Blue-green deployment strategy pronto (para rollback)
- [ ] Canary deployment process definido
- [ ] Monitoring/alerting configured (Datadog/Sentry/etc)
- [ ] Log aggregation pipeline pronto (ELK, Grafana Loki, etc)

### SLA & KPIs

- [ ] Uptime target: 99.5% (max 21.6 min downtime/mês)
- [ ] RTO: < 15 minutos (tempo para recuperar)
- [ ] RPO: < 5 minutos (perda máxima de dados)
- [ ] P95 latency: < 500ms
- [ ] Error rate: < 0.1%
- [ ] Error budget monitorado (alertar se consumir > 50%)

### Disaster Recovery

- [ ] Backup automático (daily)
- [ ] Backup test restore (monthly)
- [ ] Backup armazenado em geo-redundância (se crítico)
- [ ] Rollback procedure testado
- [ ] RCA process para incidents > 15 min
- [ ] Post-mortem report template pronto

### Team & Training

- [ ] Operador 1: Treinamento completado + sign-off
- [ ] Operador 2: Treinamento completado + sign-off
- [ ] Runbook walkthrough realizado (com ambos)
- [ ] On-call schedule estabelecido
- [ ] Escalation contacts atualizado
- [ ] Team Slack channel criado (#operations)

---

## 🚀 PRÉ-PRODUÇÃO CHECKLIST

### Week 1: Foundation
- [ ] operationsGateway.js funcional (todos os endpoints)
- [ ] Health check respondendo
- [ ] Entity list paginado
- [ ] Autenticação básica (Bearer token)
- [ ] Testes unitários (5+)
- [ ] Testes de integração (3+)
- [ ] Documentação API iniciada

### Week 2: Features
- [ ] Entity export (CSV, idempotent)
- [ ] Audit logging centralizado
- [ ] Automations criadas (health check, sync monitor)
- [ ] Load testing (100 req/s, P95 < 500ms)
- [ ] Error handling + retry logic
- [ ] Testes de segurança básicos

### Week 3: Observability + Hardening
- [ ] Monitoring + dashboards (Datadog/Sentry/Grafana)
- [ ] Alerting configurado (PagerDuty/email)
- [ ] Rate limiting implementado (100 req/min)
- [ ] IP whitelist (opcional)
- [ ] Penetration testing completado
- [ ] Security review sign-off

### Week 4: Production Ready
- [ ] E2E tests (todos cenários críticos)
- [ ] Compliance checklist: 100% complete
- [ ] Rollback plan testado
- [ ] Runbook testado com novo operador
- [ ] Team treinado
- [ ] Go-live com monitoring 24h

---

## ✍️ SIGN-OFF

### Technical Lead
- [ ] Revisado arquitetura
- [ ] Aprovado código
- [ ] Validado performance
- [ ] Assinado: ________________________ Data: _______

### Security Lead
- [ ] Revisado segurança
- [ ] Validado compliance
- [ ] Aprovado produção
- [ ] Assinado: ________________________ Data: _______

### Operations Lead
- [ ] Treinado team
- [ ] Validado runbook
- [ ] Aprovado go-live
- [ ] Assinado: ________________________ Data: _______

---

**Status:** ☐ NOT STARTED ☐ IN PROGRESS ☐ COMPLETE

**Última atualização:** 2026-04-15