# Prompt para o assistente Base44

Antes de colar no assistente Base44:

1. Substitui **`[ID ou nome da minha app: preencher]`** no texto abaixo pelo identificador real da tua app (painel Base44 ou variável `VITE_BASE44_APP_ID`).
2. Copia **só** o bloco entre as linhas `---` (secção **Texto para colar**).
3. Depois da resposta, guarda um resumo (schema, deploy, tokens) onde preferires.

Referência no repositório: [`base44/functions/listFlarePending/entry.ts`](../../base44/functions/listFlarePending/entry.ts), [`scripts/flare-sdk.mjs`](../../scripts/flare-sdk.mjs), [`README.md`](./README.md).

---

## Texto para colar

**Contexto**

Tenho uma app no Base44 (front na nuvem; desenvolvimento local limitado). No repositório existe integração **Flare** com a entidade **`TargetFlare`** (filtrar `status: 'pending'`, ordenação `-created_date`, limite 500). Há uma função serverless **`listFlarePending`** (POST, só **admin**) que devolve `{ exportedAt, count, items }` usando `base44.entities.TargetFlare.filter(...)`.

Fora do browser, uso scripts Node com SDK (`createClient`) que precisam de **`VITE_BASE44_APP_ID`** (ou `BASE44_APP_ID`) e **`BASE44_ACCESS_TOKEN`** (ou `ACCESS_TOKEN`), e opcionalmente URL **`VITE_BASE44_BACKEND_URL`** / **`BASE44_BACKEND_URL`** (default `https://base44.app`). Esses scripts listam/exportam pendentes para ficheiro JSON e há uma API local opcional só em `127.0.0.1` para dev.

**Objetivo**

Quero **alinhar** a ligação entre: (1) dados reais na base, (2) função `listFlarePending` publicada e permissões, (3) tokens / app id e ambiente (produção vs staging), para que o que o app cria na nuvem apareça de forma consistente nas consultas admin e nos exports por token.

**Pedidos concretos (usa o teu acesso à base / metadados do projeto)**

1. Confirma se a entidade **`TargetFlare`** existe, quais campos obrigatórios tem (incl. `status`, datas) e se há índices ou restrições que afetem `filter({ status: 'pending' })`.
2. Indica se há registos **`TargetFlare`** com `status: 'pending'` na app **[ID ou nome da minha app: preencher]** e um exemplo agregado (contagem por status), **sem expor dados sensíveis de utilizadores** — só contagens ou IDs anónimos se necessário.
3. Verifica o estado da função **`listFlarePending`**: está deployada? URL/caminho esperado para invocar? Algum requisito extra (CORS, escopo, versão do SDK `createClientFromRequest`)?
4. Esclarece a política de **tokens** para chamadas server-to-server ou scripts: o `BASE44_ACCESS_TOKEN` que obtenho no browser (localStorage) é o adequado para os scripts Node, ou existe token de serviço / rotação / IP? O que costuma falhar quando “lista vazia” mas o UI mostra dados?
5. Lista um **checklist** mínimo para eu validar do meu lado: variáveis de ambiente, utilizador admin a chamar `POST listFlarePending`, e diferença entre dados criados só no cliente vs persistidos.

**Restrições**

- Não preciso de código no repositório; preciso de **decisões e factos** do lado Base44 (schema, deploy, auth).
- Se algo na minha descrição estiver desatualizado em relação ao vosso modelo atual (SDK, nomes de entidade), corrige-me com a nomenclatura oficial.

**Pergunta final**

Com o estado atual da minha app, qual é o caminho recomendado para ter **uma única fonte de verdade** para a fila Flare pendente: só função admin, só scripts com token, ou ambos — e em que ordem devo depurar?

---
