# Gaps e Ligações Detalhadas: Migração Base44 → Supabase

**Data:** 2026-04-15  
**Versão:** 2.0.0  
**Status:** Pronto para Implementação

---

## 1. Contratos Core Integration

### 1.1 Base44 SDK Frontend

```javascript
import { base44 } from '@/api/base44Client';

// User-scoped (com RLS automático)
const user = await base44.auth.me();
const tasks = await base44.entities.Task.list();
const task = await base44.entities.Task.get(id);
await base44.entities.Task.create({ title: "Nova tarefa" });
await base44.entities.Task.update(id, { status: "done" });
await base44.entities.Task.delete(id);
```

**Mapeamento Supabase:**
```javascript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, key);

const { data: { user } } = await supabase.auth.getUser();
const { data: tasks } = await supabase
  .from('tasks')
  .select('*')
  .eq('user_id', user.id);
```

### 1.2 Operações de Entidade

| SDK Base44 | Parâmetros | Resultado | Supabase Equiv. |
|-----------|-----------|----------|-----------------|
| `Entity.list(orderBy?, limit?)` | `'-created_date', 50` | `Array<Entity>` | `.select('*').order('created_date', {asc:false}).limit(50)` |
| `Entity.filter(query, order?, limit?)` | `{status:'active'}` | `Array<Entity>` | `.select('*').eq('status','active')` |
| `Entity.get(id)` | `uuid` | `Entity\|null` | `.select('*').eq('id',id).single()` |
| `Entity.create(data)` | `{...fields}` | `Entity` | `.insert([data]).select()` |
| `Entity.bulkCreate(array)` | `[{...}, {...}]` | `Array<Entity>` | `.insert(array).select()` |
| `Entity.update(id, partial)` | `id, {field: value}` | `Entity` | `.update(partial).eq('id',id).select()` |
| `Entity.delete(id)` | `uuid` | `{success:true}` | `.delete().eq('id',id)` |
| `Entity.schema()` | (nenhum) | `JSONSchema` | Consultar `information_schema` |

**Campos Automáticos (Base44):**
- `id` — UUID v4
- `created_date` — ISO 8601 UTC
- `updated_date` — ISO 8601 UTC
- `created_by` — Email do utilizador

### 1.3 Upload de Ficheiro

**Base44 - Público:**
```javascript
const { file_url } = await base44.integrations.Core.UploadFile({
  file: fileBlob
});
```

**Supabase - Público:**
```javascript
const { data, error } = await supabase.storage
  .from('public')
  .upload(`${userId}/${filename}`, file);
const publicUrl = supabase.storage.from('public').getPublicUrl(path).data.publicUrl;
```

**Base44 - Privado:**
```javascript
const { file_uri } = await base44.integrations.Core.UploadPrivateFile({
  file: fileBlob
});
const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
  file_uri,
  expires_in: 3600
});
```

**Supabase - Privado:**
```javascript
const { data, error } = await supabase.storage
  .from('private')
  .upload(`${userId}/${filename}`, file);
const { data: signedData } = await supabase.storage
  .from('private')
  .createSignedUrl(path, 3600);
```

### 1.4 InvokeLLM

**Base44:**
```javascript
const response = await base44.integrations.Core.InvokeLLM({
  prompt: "Analisa este PDF...",
  response_json_schema: { type: "object", properties: {...} },
  add_context_from_internet: true,
  file_urls: ["https://..."],
  model: "gpt_5" // opcional
});
```

**Supabase + OpenAI:**
```javascript
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const completion = await openai.chat.completions.create({
  model: "gpt-4-vision",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: fileUrl } }
    ]
  }],
  response_format: { type: "json_schema", json_schema: schema }
});
```

### 1.5 SendEmail

**Base44:**
```javascript
await base44.integrations.Core.SendEmail({
  to: "user@example.com",
  subject: "Notificação",
  body: "Conteúdo",
  from_name: "Minha App"
});
```

**Supabase + Resend:**
```javascript
import { Resend } from 'npm:resend@0.20.0';
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
await resend.emails.send({
  from: "noreply@example.com",
  to: "user@example.com",
  subject: "Notificação",
  html: "<p>Conteúdo</p>"
});
```

### 1.6 ExtractDataFromUploadedFile

**Base44:**
```javascript
const { status, output } = await base44.integrations.Core.ExtractDataFromUploadedFile({
  file_url: "https://...",
  json_schema: { type: "object", properties: {...} }
});
```

**Supabase + XLSX:**
```javascript
import * as XLSX from 'npm:xlsx@0.18.5';
const response = await fetch(fileUrl);
const buffer = await response.arrayBuffer();
const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);
```

### 1.7 GenerateImage

**Base44:**
```javascript
const { url } = await base44.integrations.Core.GenerateImage({
  prompt: "Uma loja moderna, estilo fotográfico",
  existing_image_urls: ["https://..."]
});
```

**Supabase + DALL-E:**
```javascript
const openai = new OpenAI();
const image = await openai.images.generate({
  model: "dall-e-3",
  prompt: "Uma loja moderna, estilo fotográfico",
  n: 1,
  size: "1024x1024"
});
const url = image.data[0].url;
```

---

## 2. Fluxos Críticos de Negócio

### 2.1 Processamento de Venda PDV (processarVendaCaixa)

**Função:** `functions/processarVendaCaixa`

**Sequência:**
```
1. AUTH: Validar user logado
   ↓
2. VALIDATE: Verificar RascunhoPedidoVenda.status != "Em Processamento"
   ↓
3. TRANSIÇÃO: RascunhoPedidoVenda.status → "Em Processamento"
   ↓
4. GERAR NÚMERO: Executar gerarNumeroSequencial() → "PV-00001"
   ↓
5. CREATE: Inserir PedidoVenda com items, cliente, valor_total
   ├─ PedidoVenda.status = "Financeiro OK"
   ├─ PedidoVenda.numero = "PV-00001"
   └─ PedidoVenda.created_by = user.email
   ↓
6. INVENTORY: MovimentacaoEstoque (tipo: "Saída", motivo: "Venda")
   └─ UPDATE Produto.estoque_atual -= quantidade
   ↓
7. FINANCIAL: Criar LancamentoFinanceiro baseado em forma_pagamento
   ├─ PIX/Dinheiro: status = "Pago"
   ├─ Cartão Crédito: status = "Em Aberto", data_pagamento = hoje+prazo
   └─ Boleto: status = "Em Aberto", data_pagamento = hoje+dias_boleto
   ↓
8. CASH: TurnoCaixa.status → "Fechado", calcular saldo_final
   ↓
9. PICKING: [Opcional] Se metodo_entrega="Delivery", gerar OrdemSeparacao
   ↓
10. RETURN: { success: true, numero, valor_total, forma_pagamento }
```

**Entidades Envolvidas:**
- `RascunhoPedidoVenda` (UPDATE)
- `PedidoVenda` (CREATE)
- `MovimentacaoEstoque` (CREATE)
- `Produto` (UPDATE estoque)
- `LancamentoFinanceiro` (CREATE)
- `TurnoCaixa` (UPDATE)
- `ContasFinanceiras` (UPDATE saldo)

**⚠️ RISCO CRÍTICO:** Sem transação atómica entre steps 5–8, se falhar entre `CREATE PedidoVenda` e `CREATE LancamentoFinanceiro`, a venda fica órfã.

**Mitigação Supabase:**
```sql
BEGIN;
  SELECT * FROM rascunho_pedido_venda WHERE id=$1 FOR UPDATE;
  INSERT INTO pedido_venda (...) RETURNING id;
  INSERT INTO movimentacao_estoque (...);
  UPDATE produto SET estoque_atual = estoque_atual - $2 WHERE id=$3;
  INSERT INTO lancamento_financeiro (...);
  UPDATE contas_financeiras SET saldo_atual = ... WHERE id=$4;
  UPDATE turno_caixa SET status='Fechado', saldo_final=... WHERE id=$5;
COMMIT;
```

### 2.2 Lançamento Financeiro Manual

**Fluxo:**
```
1. INPUT: tipo (Receita/Despesa), valor, descricao, conta_id, data_vencimento
   ↓
2. VALIDATE: valor > 0, conta existe, data_vencimento ≥ hoje
   ↓
3. CREATE: LancamentoFinanceiro
   └─ status = "Em Aberto"
   └─ created_by = user.email
   ↓
4. UPDATE: ContasFinanceiras.saldo_atual
   └─ se tipo="Receita": +valor
   └─ se tipo="Despesa": -valor
   ↓
5. [OPCIONAL] RECURRENCE: Se is_recorrente=true, criar ContaRecorrente
   ↓
6. RETURN: LancamentoFinanceiro record
```

### 2.3 Importação de Produtos

**Fluxo:**
```
1. AUTH: Verificar user.role == "admin"
   ↓
2. CATEGORIZE: Identificar produtos novos vs. existentes
   ↓
3. SNAPSHOT: Capturar estado anterior dos existentes
   ↓
4. BATCH: Iterar com retry exponencial (429 rate limit)
   ├─ Sanitizar contra whitelist
   ├─ UPDATE se existe
   └─ CREATE se novo
   ↓
5. LOG: Inserir HistoricoImportacoes
   ↓
6. RETURN: { imported, updated, failed, errors }
```

**Whitelist:** campo_hierarquico_1-5, marca, valor_compra, preco_venda_padrao, estoque_minimo/ideal/maximo, peso_kg, tempo_reposicao_dias, tags

### 2.4 Upload e Sincronização de Anexos (uploadAnexoDrive)

**Fluxo:**
```
1. AUTH: Validar user logado
   ↓
2. OAUTH TOKEN: Obter accessToken Google Drive
   ↓
3. FOLDER: Localizar/criar "Comprovantes - VarejoSync"
   ↓
4. UPLOAD: Multipart POST para Google Drive API
   ↓
5. PERMISSIONS: PATCH para public (role: "reader", type: "anyone")
   ↓
6. RECORD: Inserir AnexoDocumento
   ├─ drive_file_id, url_drive, url_thumbnail
   └─ referencia_tipo, referencia_id
   ↓
7. SYNC: Atualizar ContaPrevista.tem_anexo = true
   ↓
8. RETURN: { file_id, url_drive, url_thumbnail }
```

### 2.5 Conferência de Compra

**Fluxo:**
```
1. SELECT: PedidoCompra (status="Aprovado")
   ↓
2. SCAN ITEMS: Para cada item, registar
   ├─ quantidade_recebida
   ├─ numeros_serie (se controla_serial)
   ├─ lote, data_validade (se controla_lote)
   └─ qualidade_visual
   ↓
3. DIVERGENCE: Se quantidade != ou qualidade=Danificado
   └─ Criar DivergenciaCompra record
   ↓
4. FINALIZE: PedidoCompra.status_recebimento_geral
   ├─ "Concluído OK" (se sem divergência)
   └─ "Concluído com Divergência" (se com divergência)
   ↓
5. INVENTORY: MovimentacaoEstoque (tipo: "Entrada")
   ↓
6. FINANCIAL: [Se divergência] LancamentoFinanceiro.tipo="Ajuste"
   ↓
7. RETURN: ConferenciaCompra record
```

### 2.6 Geração de Número Sequencial

**Lógica:**
```
INPUT: entity_type (ex: "PedidoVenda")

1. Gerar random 6-char alphanum (ex: "ABC123")
2. Construir: "{PREFIX}-{RANDOM}"
   - PedidoVenda → "PV-ABC123"
   - PedidoCompra → "PC-ABC123"
   - LancamentoFinanceiro → "LF-ABC123"
3. QUERY: SELECT * FROM entity WHERE numero=valor
4. SE EXISTE: Retry (até 10 tentativas)
5. SE NÃO: RETURN valor

RISCO: Probabilidade de colisão = 1/(36^6) ≈ 0.0001%
Com 10K registos: ~2% chance colisão em 1 geração
```

**Melhor em Supabase:**
```sql
CREATE SEQUENCE pedido_venda_seq;
INSERT INTO pedido_venda (numero) VALUES ('PV-' || LPAD(nextval('pedido_venda_seq')::text, 5, '0'));
```

---

## 3. Autenticação e Permissões

### 3.1 User-Scoped

```javascript
// Frontend
const user = await base44.auth.me(); // Extrai token do browser
const tasks = await base44.entities.Task.list();
// RLS automático: só vê registos where created_by = user.email

// Backend Function
const base44 = createClientFromRequest(req); // Token do user na request
const user = await base44.auth.me();
const myTasks = await base44.entities.Task.list();
// RLS mantido
```

### 3.2 Service-Role (Admin-Only)

```javascript
// Backend Function
const base44 = createClientFromRequest(req);
const user = await base44.auth.me();

if (user?.role !== 'admin') {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}

// Sem RLS
const allUsers = await base44.asServiceRole.entities.User.list();
const allOrders = await base44.asServiceRole.entities.PedidoVenda.list();
```

### 3.3 Automações (Sem User)

```javascript
// Função agendada: atualizarStatusLancamentos
// Executada sem user token → automático service role

const today = new Date().toISOString().split('T')[0];
const overdue = await base44.entities.LancamentoFinanceiro.filter({
  status: 'Em Aberto',
  data_vencimento: { $lt: today }
});

overdue.forEach(l => {
  base44.entities.LancamentoFinanceiro.update(l.id, {
    status: 'Vencido'
  });
});
```

**Supabase equivalente:**
```javascript
const supabase = createClient(url, service_key); // Service role
const { data: overdue } = await supabase
  .from('lancamento_financeiro')
  .select('*')
  .eq('status', 'Em Aberto')
  .lt('data_vencimento', today);

await supabase
  .from('lancamento_financeiro')
  .update({ status: 'Vencido' })
  .eq('status', 'Em Aberto')
  .lt('data_vencimento', today);
```

---

## 4. Realtime Subscriptions

### 4.1 Entidades Activas

| Entidade | Campo | Use Case |
|----------|-------|----------|
| `PedidoVenda` | status | Notificar mudança status |
| `LancamentoFinanceiro` | status, data_pagamento | Reconciliação automática |
| `TurnoCaixa` | saldo_final | Dashboard em tempo real |
| `Produto` | estoque_atual | Alertas estoque baixo |
| `PedidoCompra` | status_recebimento_geral | Acompanhamento recebimento |
| `AgendaLogistica` | status | Notificação entrega |

### 4.2 Base44 SDK

```javascript
useEffect(() => {
  const unsubscribe = base44.entities.PedidoVenda.subscribe((event) => {
    console.log(`PV ${event.id} ${event.type}d`, event.data);
    setOrders(prev => {
      if (event.type === 'create') return [...prev, event.data];
      if (event.type === 'update') return prev.map(o => 
        o.id === event.id ? event.data : o);
      if (event.type === 'delete') return prev.filter(o => 
        o.id !== event.id);
      return prev;
    });
  });
  return unsubscribe;
}, []);
```

### 4.3 Supabase Realtime

```javascript
useEffect(() => {
  const subscription = supabase
    .channel('public:pedido_venda')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'pedido_venda'
    }, (payload) => {
      if (payload.eventType === 'INSERT') 
        setOrders(prev => [...prev, payload.new]);
      if (payload.eventType === 'UPDATE') 
        setOrders(prev => prev.map(o => 
          o.id === payload.new.id ? payload.new : o));
      if (payload.eventType === 'DELETE') 
        setOrders(prev => prev.filter(o => 
          o.id !== payload.old.id));
    })
    .subscribe();
  return () => subscription.unsubscribe();
}, []);
```

**⚠️ DESCONHECIDO:**
- Limites de conexões simultâneas
- Latência P95 de entrega
- Garantia de entrega (at-least-once? exactly-once?)
- Retenção histórica de eventos

---

## 5. Automações & Cron

### 5.1 Automações Identificadas

| ID | Tipo | Trigger | Função | Status |
|----|----|---------|--------|--------|
| `69be3ff0` | Cron | 02:00 UTC diário | `gerarLancamentosCartao` | ⚠️ **DUPLICADO** |
| `69be3ecd` | Cron | 02:00 UTC diário | `gerarLancamentosCartao` | ⚠️ **DUPLICADO** |
| `8a2c5e1d` | Entity | PedidoVenda.create | `gerarOrdemSeparacao` | ✅ OK |
| `4f9d7a2c` | Entity | LF.update | `atualizarStatusFluxoCaixa` | ✅ OK |
| `5c3b1f8e` | Scheduled | 5 min | `sincronizarEstoquePorMovimentacao` | ⚠️ Overhead |

### 5.2 ACHADO CRÍTICO: gerarLancamentosCartao Duplicado

**Problema:**
```
IDs 69be3ff0 e 69be3ecd
Ambos: "Cron 02:00 UTC diário"
Ambos: chamam gerarLancamentosCartao()

Resultado: 2x lançamentos financeiros gerados
         Duplicação em LancamentoFinanceiro
         Conciliação bancária incorrecta
```

**Resolução:**
- Deletar uma das duas automações (ex: remover `69be3ecd`)
- Adicionar idempotência: processar apenas pagamentos com `lançamento_financeiro_id = null`

### 5.3 Entity Trigger Example

```javascript
// Automação: ao criar PedidoVenda, gerar OrdemSeparacao

// Payload recebido:
{
  event: { type: 'create', entity_name: 'PedidoVenda', entity_id: 'uuid' },
  data: { id, numero, metodo_entrega, itens, ... },
  old_data: null
}

// Handler
if (event.type === 'create' && data.metodo_entrega === 'Delivery') {
  await base44.entities.OrdemSeparacao.create({
    pedido_venda_id: data.id,
    status: 'Pendente'
  });
}
```

---

## 6. Conectores OAuth

### 6.1 Google Drive (Autorizado)

**Base44:**
```javascript
const { accessToken, connectionConfig } = 
  await base44.asServiceRole.connectors.getConnection("googledrive");

const files = await fetch(
  'https://www.googleapis.com/drive/v3/files',
  { headers: { 'Authorization': `Bearer ${accessToken}` } }
);
```

**Scopes:** `drive.file`, `userinfo.email`, `openid`

**Supabase Equivalent (App-User):**
```javascript
// Registar OAuth app builder credentials via dashboard
const { accessToken } = await base44.connectors.connectAppUser(connectorId);
```

### 6.2 GitHub (Autorizado)

**Base44:**
```javascript
const { accessToken } = 
  await base44.asServiceRole.connectors.getConnection("github");

await fetch(
  'https://api.github.com/repos/owner/repo/contents/file.md',
  {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: "Commit from VarejoSync",
      content: Buffer.from(content).toString('base64'),
      sha: currentSha
    })
  }
);
```

**Scopes:** `read:user`, `repo`

**⚠️ DESCONHECIDO:**
- Limite de commits/hora
- Máximo de tamanho de ficheiro
- Delay de webhook

---

## 7. Painel vs. Git-Driven Config

### 7.1 Configurações só no Painel (Base44)

- Perfis de acesso (PerfilDeAcesso)
- Tabelas de preço (TabelaPreco)
- Formas de pagamento (FormasDePagamento)
- Contas financeiras (ContasFinanceiras)
- Máquininhas/adquirentes (Maquininha)
- Políticas de desconto (PoliticasDesconto)

### 7.2 Configurações em Environment

```
GITHUB_TOKEN
FLARE_GITHUB_BRANCH
FLARE_GITHUB_REPO
FLARE_GITHUB_OWNER
OPENAI_API_KEY (se usar InvokeLLM)
RESEND_API_KEY (se usar SendEmail)
```

---

## 8. Checklist de Migração

### Pre-Cutover (Bloqueantes)

- [ ] Resolver duplicação: `gerarLancamentosCartao` (deletar 1)
- [ ] Implementar transação atómica para processarVendaCaixa
- [ ] Implementar lock pessimista em gerarNumeroSequencial (usar sequence SQL)
- [ ] Validar RLS policies em todas as tabelas
- [ ] Testar realtime em 6 entidades (latência, evento loss)
- [ ] Preparar rollback plan (backup + restore test)

### Migration Week 1

- [ ] Exportar schema completo
- [ ] Mapear entidades → tabelas Postgres
- [ ] Criar políticas RLS
- [ ] Configurar autenticação (Supabase Auth ou OAuth)
- [ ] Preparar Deno Functions

### Migration Week 2–3

- [ ] Converter SDK calls → Supabase JS client
- [ ] Reescrever funções serverless
- [ ] Implementar storage
- [ ] Testar automações

### Migration Week 4

- [ ] Exportar dados Production
- [ ] Transformar formato (UUIDs, timestamps)
- [ ] Bulk insert Supabase
- [ ] Validar integridade

### Migration Week 5 (Cutover)

- [ ] Teste funcional completo
- [ ] Load testing (100+ tx/min)
- [ ] Validar RLS
- [ ] Go-live
- [ ] Monitorar 48h

### Bloqueantes Conhecidos

- ❌ Sem transações atómica multi-entidade (PDV risk)
- ❌ Sem lock pessimista nativo (race condition)
- ❌ Automação `gerarLancamentosCartao` duplicada
- ❌ RLS manual em Supabase (mais verboso)

---

## 9. Referências

- **Base44 Docs:** https://docs.base44.com
- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL RLS:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Support:** support@base44.com

---

**Última Update:** 2026-04-15  
**Versão:** 2.0.0  
**Autor:** Migration Task Force