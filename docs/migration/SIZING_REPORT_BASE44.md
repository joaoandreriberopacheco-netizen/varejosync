# Relatório de dimensionamento (Base44 → Supabase)

**Fonte:** assistente de IA Base44 + leituras de entidades / automações (sessão que gerou também commit `commitSizingRequest` / `REQUEST_BASE44_SIZING_FOR_SUPABASE.md`).  
**Data de apuramento:** 2026-04-15 (aprox.)  
**Nota:** valores são **estimativas** salvo quando indicado “exacto”; métricas de billing só com suporte oficial.

---

## Resumo executivo

| Dimensão | Estimativa | Fonte (segundo o assistente) |
|----------|------------|------------------------------|
| **Base de dados** | ~**15–40 MB** · ~**5 000–8 000** registos totais (várias entidades) | Contagens / amostras por entidade |
| **Storage Base44** | ~**0 MB** — ficheiros pesados em **Google Drive** externo | Campos `drive_file_id` em `AnexoDocumento` |
| **Google Drive (anexos)** | ~**60–90 MB** (fora do Base44) | Idem |
| **MAU / utilizadores** | **7** registados · **3–5** activos/mês (estimativa) | Entidade `User` |
| **Funções serverless** | ~**252** runs acumulados (automations) + ~**10–30** invocações/dia via PDV | Metadados de automations + uso típico |
| **Realtime** | &lt; **15 000** msg/mês (estimativa) | Utilizadores × frequência de escrita |
| **Integrações Core** | `InvokeLLM` ~**50–200**/mês; uploads Drive ~**20–50**/mês | Análise de código das funções |
| **Egress** | ~**150–750 MB**/mês (estimativa) | Volume de vendas × payload médio |

### Conclusão do assistente Base44

> A app **cabe no Supabase Free Tier** com margem (ordem de grandeza dos números acima).

### Nota da equipa (produção)

O **Free** do Supabase inclui limites e **pausa do projeto** após inatividade — para **produção** com SLA e backups diários, o **Pro (~25 USD/projeto)** continua a ser a referência habitual, **mesmo** com base pequena. Os números acima servem para **não superestimar** disco; não substituem decisão de produto/compliance.

---

## Métricas que **não** são acessíveis ao assistente (ticket oficial)

Pedir a **support@base44.com** (ou canal indicado no painel), referindo a app:

- Tamanho **exacto** da base (bytes).
- **Egress / bandwidth** real (últimos 90 dias).
- Contagem **exacta** de invocações **por função**.
- Créditos **Core** (LLM, etc.) consumidos.
- Histórico **Realtime** (mensagens / ligações).

**App ID (para o ticket):** `68a91b1a009497f8d44af37e` — *não partilhar em canais públicos se o repositório for público; remover deste ficheiro se necessário.*

---

## Apuramento detalhado (como foi descrito)

- Amostras com `limit` / `skip` em entidades: `LancamentoFinanceiro`, `Produto`, `PedidoVenda`, `MovimentacaoEstoque`, `Terceiro`, `AnexoDocumento`, `User`.
- Indícios de volume: skips testados (ex.: `PedidoVenda` skip 570, `MovimentacaoEstoque` skip 999, `AnexoDocumento` skip 199) — interpretar com cautela (podem ser buracos de ID vs contagem densa).

---

## Formato máquina (JSON)

```json
{
  "schema_version": "1.0.0",
  "source": "base44_ai_assistant",
  "generated_at": "2026-04-15",
  "database_estimate_mb": [15, 40],
  "database_records_approx": [5000, 8000],
  "storage_base44_mb": 0,
  "storage_google_drive_mb": [60, 90],
  "mau_estimate": [3, 5],
  "users_registered": 7,
  "serverless_runs_accumulated": 252,
  "realtime_messages_month_estimate_max": 15000,
  "egress_mb_month_estimate": [150, 750],
  "requires_official_metrics": true
}
```

---

*Actualizar este ficheiro quando o suporte Base44 devolver números exactos ou quando fizerem export real da base.*
