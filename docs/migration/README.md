# Migração Base44 → stack própria (canal GitHub)

Este diretório é o **canal versionado** para pedidos, respostas e artefactos da migração: o que estiver aqui em `main` (ou na vossa branch) é a **fonte de verdade** para a equipa e para o Cursor — não depende da memória de um chat.

## Documentos

- **[REQUEST_BASE44_AUTOMATED_MIGRATION_DISCLOSURE.md](./REQUEST_BASE44_AUTOMATED_MIGRATION_DISCLOSURE.md)** — Pedido formal ao Base44 para **revelar todo o âmbito** de integrações, análise e automações em formatos **automatizáveis** (migração o menos manual possível).

## Como usar com o assistente Base44

1. Abre o ficheiro `REQUEST_BASE44_AUTOMATED_MIGRATION_DISCLOSURE.md` no repositório (ou copia o bloco “Colar no assistente Base44”).
2. Cola no canal de IA do Base44 e pede que **devolva os artefactos** (JSON, Markdown, scripts) de forma a poderes **colar de volta** num PR nesta pasta `docs/migration/` ou em `scripts/`.
3. Faz **merge** no GitHub — assim o “canal GitHub” fica com o histórico do que foi acordado e gerado.

## Ligações úteis no código

- Integrações expostas no cliente: `src/api/integrations.js`
- Funções serverless no repo: `base44/functions/` (55 `entry.ts` no momento da criação deste README — o número pode mudar; usa `Get-ChildItem -Recurse -Filter entry.ts` para atualizar).
