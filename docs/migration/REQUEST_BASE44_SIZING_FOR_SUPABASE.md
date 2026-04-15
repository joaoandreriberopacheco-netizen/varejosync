# Pedido ao Base44 — métricas críticas para dimensionar **Supabase Pro (~25 USD)**

**Contexto:** A nossa equipa não tem acesso directo a totais de armazenamento, egress ou picos de utilização no painel da forma necessária para comparar com os limites do **Supabase Pro** (base de dados, storage, auth MAU, realtime, invocações de Edge Functions, tráfego).  
**Pedido:** que o **Base44** (assistente + suporte oficial, conforme política) **verifique e devolva** os valores abaixo — idealmente num ficheiro **`docs/migration/sizing-report-from-base44.json`** (ou Markdown) que possamos commitar no GitHub.

> Nota: números exactos podem exigir **equipa de suporte / billing** se a IA do produto não tiver permissão para ler métricas da conta. Mesmo assim, pedimos **resposta explícita** (mesmo que seja “não disponível na API; abrir ticket X”).

---

## 1. Base de dados (entidades / Postgres equivalente)

| Métrica | Porquê importa (Supabase Pro) |
|--------|--------------------------------|
| **Tamanho total** dos dados da app (GB ou MB) — hoje e tendência se souberem | Tecto típico de disco incluído no Pro (~ordem de **8 GB** na oferta pública; valores mudam com o tempo). |
| **Número de linhas** por entidade principal (top 15 por volume), se disponível | Ajuda a planear índices, migração em fases e RAM. |
| **Maior tabela / documento** ou entidade mais pesada | Identificar risco de queries lentas após migração. |

---

## 2. Ficheiros (Storage / uploads)

| Métrica | Porquê importa |
|--------|----------------|
| **Total de bytes** armazenados em ficheiros ligados à app (imagens, PDFs, anexos) | Pro inclui **poucos GB** de storage na faixa de entrada; anexos de compras/ produtos esgotam rápido. |
| **Número de objectos** (ficheiros) | Operações de migração e listagens. |
| **Tamanho máximo** de um único ficheiro típico na app | Limite de upload no destino (Supabase costuma permitir ficheiros grandes; o gargalo pode ser custo + egress). |

---

## 3. Tráfego (egress / API)

| Métrica | Porquê importa |
|--------|----------------|
| **Egress mensal** (últimos 1–3 meses se existir histórico): API + ficheiros | Comparar com inclusões de egress do Pro e overages. |
| **Volume de pedidos** à API (média e pico diário), se existir | Stress em Edge Functions e DB. |

---

## 4. Autenticação

| Métrica | Porquê importa |
|--------|----------------|
| **Utilizadores activos mensais (MAU)** ou contagem de utilizadores com sessão no último mês | Pro inclui dezenas de milhares de MAU; B2C massivo é outro patamar. |
| **Picos de logins** por dia (se disponível) | Picos de Auth e cold starts. |

---

## 5. Funções serverless / automações

| Métrica | Porquê importa |
|--------|----------------|
| **Invocações mensais** (total e por função top 10) | Supabase Edge cobra por milhões de invocações além do incluído. |
| **Duração média / p95** das invocações (se existir) | RAM/timeout no destino. |
| **Erros / retries** relevantes (taxa) | Estabilidade pós-migração. |

---

## 6. Realtime (se aplicável na vossa stack)

| Métrica | Porquê importa |
|--------|----------------|
| **Ligações WebSocket / subscribe concurrentes** em pico (ou proxy) | Limites de realtime no plano Pro. |
| **Volume de mensagens** realtime por mês (se medido) | Overages de mensagens. |

---

## 7. Integrações Core (IA, email, etc.)

| Métrica | Porquê importa |
|--------|----------------|
| **Chamadas mensais** a `InvokeLLM`, `ExtractDataFromUploadedFile`, `UploadFile`, etc. (agregado) | Custo e quotas ao mover para fornecedores directos; não é só Supabase. |
| **Limites actuais** impostos pela plataforma a essas chamadas | Para não regressar em capacidade após migração. |

---

## Formato desejado da resposta

Ficheiro **`sizing-report-from-base44.json`** com chaves estáveis, por exemplo:

```json
{
  "generated_at": "ISO-8601",
  "app_id": "redacted-or-confirmed",
  "database": { "total_bytes": null, "top_entities_rows": {} },
  "files": { "total_bytes": null, "object_count": null },
  "egress": { "last_30d_bytes": null },
  "auth": { "mau_last_30d": null },
  "serverless": { "invocations_last_30d": null, "top_functions": [] },
  "realtime": { "peak_concurrent_connections": null },
  "integrations_core": { "invoke_llm_last_30d": null },
  "notes": "what is estimated vs exact; what requires support ticket"
}
```

Valores desconhecidos: `null` + explicação em `notes`.

---

## Colar no assistente Base44 (inglês)

```
We are sizing Supabase Pro (~$25/mo per project) for migration from Base44.

We cannot read the critical metrics ourselves. Please CHECK with whatever
access you have (or escalate to support) and return a sizing report.

Canonical doc in our repo:
docs/migration/REQUEST_BASE44_SIZING_FOR_SUPABASE.md

Please fill (exact or best estimate, with source):

1) Total database / entity storage bytes for our app
2) Total file storage bytes + object count
3) Monthly API/file egress (last 30–90 days if available)
4) MAU or active users last 30 days
5) Serverless invocations last 30 days + top functions by count
6) Realtime peak concurrent connections + monthly messages (if tracked)
7) Monthly counts for Core integrations we use heavily (LLM, uploads, extract)

Deliver as paste-ready JSON (schema suggested in that doc) or Markdown.
If any metric is not accessible to the AI assistant, say explicitly which
require official support / billing and the best ticket path.
```

---

## Colar no assistente Base44 (português)

```
Estamos a dimensionar Supabase Pro (~25 USD/projeto) para migração a partir do Base44.

A nossa equipa não consegue ler directamente as métricas críticas. Pedimos que
VERIFIQUEM (com o acesso que tiverem, ou encaminhem ao suporte) e devolvam um
relatório de dimensionamento.

Documento no nosso GitHub:
docs/migration/REQUEST_BASE44_SIZING_FOR_SUPABASE.md

Preencham (valor exacto ou melhor estimativa, com fonte):
1) Tamanho total da base / dados da app
2) Storage de ficheiros (bytes + nº de objectos)
3) Egress mensal (API + ficheiros), últimos 30–90 dias se existir
4) MAU ou utilizadores activos últimos 30 dias
5) Invocações serverless últimos 30 dias + top funções
6) Pico de ligações realtime + mensagens/mês (se medido)
7) Volume mensal das integrações Core que mais usamos (LLM, uploads, etc.)

Entrega: JSON ou Markdown pronto a colar. Se alguma métrica não for acessível
ao assistente, indiquem claramente o que exige ticket oficial / billing.
```

---

*Este pedido não substitui negociação comercial; serve para decisão técnica de plano cloud.*
