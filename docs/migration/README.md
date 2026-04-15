# Migração Base44 → stack própria (canal GitHub)

Este diretório é o **canal versionado** para pedidos, respostas e artefactos da migração: o que estiver aqui em `main` (ou na vossa branch) é a **fonte de verdade** para a equipa e para o Cursor — não depende da memória de um chat.

## Documentos

- **[REQUEST_BASE44_AUTOMATED_MIGRATION_DISCLOSURE.md](./REQUEST_BASE44_AUTOMATED_MIGRATION_DISCLOSURE.md)** — Pedido formal ao Base44 para **revelar todo o âmbito** de integrações, análise e automações em formatos **automatizáveis** (migração o menos manual possível).
- **[REQUEST_BASE44_SIZING_FOR_SUPABASE.md](./REQUEST_BASE44_SIZING_FOR_SUPABASE.md)** — Pedido para o Base44 **verificar e reportar** métricas críticas (BD, storage, egress, MAU, invocações, realtime, integrações) para dimensionar **Supabase Pro**.

## Como usar com o assistente Base44

1. Abre o ficheiro `REQUEST_BASE44_AUTOMATED_MIGRATION_DISCLOSURE.md` no repositório (ou copia o bloco “Colar no assistente Base44”).
2. Cola no canal de IA do Base44 e pede que **devolva os artefactos** (JSON, Markdown, scripts) de forma a poderes **colar de volta** num PR nesta pasta `docs/migration/` ou em `scripts/`.
3. Faz **merge** no GitHub — assim o “canal GitHub” fica com o histórico do que foi acordado e gerado.

### Se o assistente “escreveu” ficheiros só no chat

O conteúdo **não existe no Git** até colares ou fazeres upload. Nomes típicos devolvidos pelo assistente (exemplo real):

- `ENTITIES_MANIFEST.json`
- `AUTOMATIONS_MANIFEST.json`
- `FUNCTIONS_MANIFEST.json`
- `MIGRATION_CHECKLIST.md`

**Ação:** cria estes ficheiros em `docs/migration/` com o conteúdo exacto que ele gerou → **commit + push**. Até lá, a nossa análise no Cursor não os vê.

## Follow-up ao Base44

- **[PROMPT_BASE44_STORAGE_FOLLOWUP.md](./PROMPT_BASE44_STORAGE_FOLLOWUP.md)** — Leitura rápida da primeira resposta + **prompt para copiar/colar** sobre métricas de **armazenamento** (e egress de ficheiros).

## Ligações úteis no código

- Integrações expostas no cliente: `src/api/integrations.js`
- Funções serverless no repo: `base44/functions/` (55 `entry.ts` no momento da criação deste README — o número pode mudar; usa `Get-ChildItem -Recurse -Filter entry.ts` para atualizar).
