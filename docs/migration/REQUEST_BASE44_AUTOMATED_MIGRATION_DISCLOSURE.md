# Pedido ao Base44 — divulgação completa para migração **automatizada**

**Repositório:** varejosync (GitHub)  
**Canal:** este ficheiro versionado + PRs — para que a migração não dependa de conversas efémeras nem de trabalho manual repetido.

## Objetivo

Obter de forma **estruturada e reprodutível** todo o âmbito de:

1. **Integrações** (`integrations.Core` e equivalentes server-side)  
2. **Análise** (dependências, contratos, limites)  
3. **Automations** (funções serverless, gatilhos, conectores, jobs)

…de modo a permitir **pipelines automatizados** (scripts, CI, importação para PostgreSQL/Supabase, geração de código), **minimizando** descoberta manual e erros.

---

## O que o GitHub já prova (inventário parcial no repo)

### Integrações Core referenciadas no código

Facilitador central: [`src/api/integrations.js`](../../src/api/integrations.js) — exporta:

`InvokeLLM`, `SendEmail`, `SendSMS`, `UploadFile`, `GenerateImage`, `ExtractDataFromUploadedFile`, e o objeto `Core`.

Uso directo de `base44.integrations.Core.*` em múltiplos módulos em `src/` (upload, LLM, extração de ficheiros) e em `base44/functions/` (ex.: `SendEmail`, `UploadFile`, `GenerateImage` com `asServiceRole` onde aplicável).

**Pedido:** manifesto **oficial** (idealmente JSON Schema ou OpenAPI) para **cada** método: parâmetros obrigatórios/opcionais, tipos, erros, limites de taxa, tamanhos máximos, e semântica exacta de resposta — suficiente para **gerar automaticamente** wrappers no nosso backend (Supabase Edge ou outro).

### Automations / funções serverless

No repositório existem **dezenas** de funções Deno em [`base44/functions/`](../../base44/functions/) (cada pasta com `entry.ts`). O assistente Base44 indicou que o sync bidireccional com produção faz deste tree a **fonte de verdade** do código.

**Pedido:**

- Confirmação **escrita** (para este doc ou comentário em PR) de que **não** existe lógica de produção fora deste tree.  
- Ficheiro **`docs/migration/automations-manifest.json`** (ou nome acordado) gerado pelo Base44 com, por função: `name`, `trigger` (http / interno / agendado se existir), `entities_read[]`, `entities_write[]`, `integrations_used[]`, `secrets_expected[]`, `invoke_contract` (body JSON de exemplo).  
- Se existirem **automações só no painel** (sem pasta no Git): lista completa + como exportá-las ou equivalente API.

### Análise

**Pedido:**

- Grafo ou tabela **máquina-legível** (JSON/CSV): entidade → funções que leem/escrevem → integrações.  
- Lista completa de **entidades** da app (além dos ficheiros parciais em `base44/entities/*.jsonc`).  
- Qualquer **RLS / política de autorização** documentada ao nível de plataforma que devamos replicar em PostgreSQL.

---

## Entregáveis desejados (para automação, não só leitura humana)

- **E1** — Dump ou pipeline de export de **todas** as entidades com IDs preservados: script documentado + JSON/NDJSON por tabela ou SQL `COPY`.
- **E2** — Modelo de dados completo: `DATA_MODEL.md` + opcional `schema.json` (JSON Schema por entidade).
- **E3** — Manifesto de integrações Core: `integrations-manifest.json` + anexo humano `INTEGRATIONS.md`.
- **E4** — Manifesto de automations: `automations-manifest.json` (ver secção anterior).
- **E5** — Contrato `functions.invoke` ↔ implementação: CSV ou JSON com `invoke_name`, `path_to_entry.ts`, `request_example`, `response_example`.
- **E6** — Storage: mapa `file_url` / chave → procedimento de download em massa ou API batch.
- **E7** — Conectores (GitHub, etc.): documentação de permissões e variáveis para reprodução fora do Base44.

Qualquer um destes itens pode ser **gerado ou preenchido pelo assistente Base44** desde que o resultado final seja **commitado neste repositório** (canal GitHub).

---

## Colar no assistente Base44 (inglês — copiar bloco abaixo)

```
Context: Our canonical request lives in GitHub:
docs/migration/REQUEST_BASE44_AUTOMATED_MIGRATION_DISCLOSURE.md

We need FULL disclosure of scope—not for curiosity, but to AUTOMATE migration
(Supabase/Postgres, CI, scripts). Stateless chat is not enough: we will commit
your outputs into that folder via PR.

Please produce (machine-readable where possible):

1. integrations-manifest.json — every Core integration we might call: params,
   types, errors, rate/size limits, response shape; map to recommended external
   equivalents (OpenAI, S3/Supabase Storage, Resend, etc.).

2. automations-manifest.json — one row per serverless function in base44/functions:
   name, triggers, entities touched, integrations used, secrets, minimal
   invoke contract. Confirm whether ANY production automation exists OUTSIDE
   this repo tree.

3. entities-inventory.json — complete list of app entities/fields (not only
   base44/entities/*.jsonc in Git).

4. functions.invoke inventory — map each invoke name used in src/ to entry.ts
   + example payload/response.

5. If official bulk export exists, exact steps + auth (service token policy).
   If not, a SDK script spec we can run in CI.

Deliver as paste-ready files; we will commit them under docs/migration/.
```

---

## Colar no assistente Base44 (português — resumo)

> O pedido completo está versionado em GitHub: **`docs/migration/REQUEST_BASE44_AUTOMATED_MIGRATION_DISCLOSURE.md`**.  
> Precisamos de **manifestos máquina-legíveis** (integrações, automations, entidades, contratos `invoke`) e confirmação de que **toda** a lógica de produção está no repo, para **automatizar** a migração e reduzir trabalho manual.  
> Por favor devolve os ficheiros prontos a colar ou indica PR; a nossa equipa faz **commit** em `docs/migration/` para ficar histórico no GitHub.

---

## Nota de governança

- **SLA / contrato / export oficial em massa** continuam sujeitos a **suporte humano** Base44 ([base44.com](https://base44.com)) quando a política da empresa for necessária.  
- Este documento alinha **o que queremos em formato automatizável**; a empresa pode responder “sim com limitações” — mesmo assim o GitHub fica com o pedido explícito.

---

*Criado para servir de pedido estável no canal GitHub. Atualiza este ficheiro se o âmbito do pedido mudar.*
