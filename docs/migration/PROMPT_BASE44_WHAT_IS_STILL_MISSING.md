# Prompt ao Base44 — detalhe de “mapa elétrico” (paridade de funcionamento)

**Objetivo:** não basta saber que existe um “encaixe de 200 mm” — precisamos do **mesmo nível de detalhe** que um electricista: **espessura dos fios, tensão da lâmpada, modelo da lâmpada, sequência de ligações, parafusos, caixas e terra**. Ou seja: **comportamento exacto** do sistema hoje no Base44, para o que construirmos **fora** (ex.: Supabase) **funcionar igual** ao que já funciona bem hoje.

**Idioma:** português (este ficheiro e o prompt abaixo são só em português).

**Nota:** **não** pedimos aqui assessoria jurídica nem cláusulas de contrato — o foco é **funcionamento, ligações técnicas e paridade operacional**.

---

## Prompt para colar no assistente Base44

```
Temos uma aplicação em PRODUÇÃO no Base44 que já funciona bem. Temos o código no GitHub, manifestos de entidades/funções/automações e estimativas de dimensionamento.

O que precisamos agora é o nível de detalhe de um MAPA ELÉTRICO com manual de montagem: não só “existe um ponto de luz”, mas tensão, secção dos cabos, modelo da lâmpada, tipo de casquilho, ordem de ligação no quadro, identificação de neutro e terra, e o que acontece se alguém cortar o disjuntor.

Traduzido para software, pedimos documentação e respostas que nos permitam **replicar o comportamento actual** noutra stack (ex.: Supabase), **sem surpresas**:

### 1) Contratos exactos (o “multímetro” em cada ponto)

Para **cada** método que usamos em `integrations.Core` (UploadFile, InvokeLLM, ExtractDataFromUploadedFile, SendEmail, SendSMS, GenerateImage, etc.):

- Formato **exacto** do pedido e da resposta (campos obrigatórios/opcionais, tipos, exemplos JSON reais anonimizados).
- Limites **numéricos**: tamanho máximo de ficheiro, tempo máximo de execução, rate limits, quotas por dia/mês se existirem.
- Lista de **códigos de erro** ou mensagens típicas e o que significam em termos de retry (sim/não).

### 2) Ligação botão → função → entidade → efeito (o “diagrama unifilar”)

Para os fluxos críticos (ex.: fechar venda no PDV, lançamento financeiro, importação, conferência, anexos):

- Ao clicar **X**, que **functions.invoke** ou que chamadas à API são feitas, **em que ordem**?
- Que **entidades** são lidas e escritas em cada passo? Há **transacções implícitas** ou efeitos em cadeia (automations) que disparam a seguir?
- O que o Base44 garante sobre **consistência** (ex.: se falhar o passo 3, o passo 1 reverte ou fica inconsistente)?

### 3) Autenticação e contexto (quem “tem chave do quadro”)

- Como o token / sessão chega às funções serverless e às integrações Core.
- Diferença exacta entre chamada como **utilizador** e como **service role** / automação — o que cada uma pode fazer que a outra não pode.
- Onde existem **roles** ou regras que **não** estão no nosso repositório (só no painel).

### 4) Tempo real (sinal em tempo contínuo)

- Para cada `subscribe` que a app usa: **que entidade**, **que filtro**, **frequência**, e se há **garantia de ordem** dos eventos ou apenas “algo mudou”.
- Limites de ligações simultâneas ou mensagens que devamos reproduzir noutro sistema.

### 5) Automations e agendamentos (temporizadores e relés)

- Lista completa do que corre por **horário** (cron) ou por **mudança de entidade**, incluindo **duplicados** ou IDs antigos que devamos desligar antes da migração.
- Para cada um: **input**, **output**, e **efeitos colaterais** em outras tabelas.

### 6) Conectores (GitHub, Google Drive, outros)

- Fluxo exacto de OAuth: que **scopes**, que **tokens** são guardados onde, e como as funções **commitBabelPlugin**, **syncCodebaseToGithub**, **exportFlareToGithub**, **uploadAnexoDrive**, **deletarAnexo** obtêm credenciais.
- Qualquer detalhe que não esteja óbvio só lendo o código (ex.: variáveis de ambiente obrigatórias no painel).

### 7) O que NÃO está no Git mas afecta o comportamento

- Configurações **só no painel**: feature flags, limites, integrações activas, webhooks externos.
- Qualquer comportamento “mágico” da plataforma (validações, normalização de campos, IDs gerados) que devamos replicar.

### 8) Formato da resposta (obrigatório)

Devolver UM documento Markdown (pode chamar-se `GAPS_E_LIGACOES_DETALHADAS.md`) com:

1. Secção **“Contratos Core”** — tabelas ou JSON por integração.
2. Secção **“Fluxos críticos”** — diagramas em texto (passo 1 → 2 → 3) ou lista numerada.
3. Secção **“Painel vs Git”** — lista do que só existe na nuvem.
4. Secção **“Checklist antes do cutover”** — itens [ ] com **bloqueante sim/não**.

Se algo for **desconhecido** mesmo para o assistente, escrever explicitamente **DESCONHECIDO** e sugerir **ticket de suporte** com o pedido exacto.

O objectivo é: **fora do Base44, o sistema comportar-se como hoje** — lâmpada certa, tensão certa, fios com secção certa, e ninguém leva um choque no primeiro dia em produção.
```

---

## Como usar

1. Copia o bloco entre as linhas ``` do “Prompt para colar” (o texto dentro das aspas triplas no ficheiro fonte é o que interessa — no render Markdown copia o conteúdo do code block).
2. Cola no assistente Base44.
3. Quando responderem, grava a resposta em **`docs/migration/GAPS_E_LIGACOES_DETALHADAS.md`** (ou o nome que derem) e faz **commit** no GitHub.

---

## Versão curta (se o canal tiver limite de caracteres)

```
Precisamos do detalhe de “mapa elétrico” para migrar mantendo o mesmo comportamento que hoje:

1) Para cada integrations.Core: pedido/resposta JSON exactos, limites, erros e retries.
2) Para fluxos críticos (PDV, finanças, anexos): ordem de invokes, entidades tocadas, efeitos em cadeia.
3) Auth: diferença user vs service role vs automation; o que só está no painel.
4) Realtime: o que cada subscribe implica (filtros, ordem, limites).
5) Crons e automations: lista completa com inputs/outputs e efeitos laterais.
6) Conectores GitHub/Drive: OAuth, scopes, env vars no painel.
7) Tudo o que NÃO está no Git mas altera comportamento.

Entrega: um Markdown único com secções e checklist antes do cutover. O que não souberem: DESCONHECIDO + sugestão de ticket.

Foco: paridade de funcionamento — não precisamos de parecer jurídico sobre migração de dados.
```
