# Perguntas à Base44 + canal Cursor + UX Modo Flare

Documento para copiar/colar em partes ao assistente Base44 ou enviar ao suporte. Objetivo: **não ser conservador** — já temos o “não”; o próximo passo é pedir o que falta para o fluxo **Flare → GitHub → Cursor** ser simples e o Modo Flare **só o essencial**.

---

## Visão do fluxo (correção)

**Na UI (observador avançado):** só **marcar** o alvo → abre a **caixa de texto** (ou **speech-to-text**) → **Salvar** → o registo fica na entidade **`TargetFlare`** (o “caderno de alvos” na nuvem).

**No Cursor (centro de artilharia):** o assistente só “vê” o que está no **repositório GitHub** do projecto — por exemplo **`docs/flare-export/flare-pending.json`** — e daí monta o plano (**busca de flares**).

**Metáfora:** o observador partilha o **caderno** com a artilharia; a **chave** é o caderno **chegar** ao sítio onde o Cursor lê. Hoje o problema não é a ideia do fluxo: é o **caderno não estar a chegar** (ficheiro JSON no repo após `git pull`, ou automation GitHub ainda incompleta / caminho errado / branch).

---

## 1. O que o Cursor (e o repositório) podem “ver”

- O assistente no Cursor **só** lê o que está no **clone GitHub** do projecto (ficheiros no disco do developer).
- O canal acordado para a fila pendente é um JSON com `exportedAt`, `count`, `items` — preferencialmente em **`docs/flare-export/flare-pending.json`** (alinhado com `npm run flare:export` e a regra **busca de flares**).
- **Pedido explícito à Base44:** confirmar que a função/automation de export para GitHub (ex. `exportFlareToGithub`) grava **exactamente** nesse caminho e no **branch** que o TI usa para desenvolvimento, para que `git pull` traga o ficheiro sem renomear regras no repo.

---

## 2. Perguntas e pedidos à Base44 (copiar blocos)

### A. GitHub e automação

1. O conector GitHub da app **varejosync** tem permissão de **escrita** em `contents` para fazer `PUT /repos/.../contents/...`? Se não, o que falta activar?
2. A função **`exportFlareToGithub`** (ou nome final) está **deployada** e ligada a uma **Automation** em `TargetFlare`? Dispara em **create**, **update**, ou ambos? Há **debounce** ou risco de um commit por cada tecla no briefing?
3. Podem **gerar ou documentar** um exemplo de payload da Automation (evento → função) para auditarmos no repo?
4. Confirmam o formato do ficheiro commitado: igual a `listFlarePending` / `flare:export` (`exportedAt`, `count`, `items` com campos da entidade)?

### B. Segredos e ambiente

5. Os segredos `FLARE_GITHUB_OWNER`, `FLARE_GITHUB_REPO`, `FLARE_GITHUB_BRANCH`, `FLARE_GITHUB_PATH` — há **validação** no painel quando o commit falha (403, branch protegido, path inválido)?
6. Branch **protegido** com required PR: o commit via API ainda é suportado ou precisamos de branch dedicado (ex. `flare-export`)?

### C. Pedidos “lua” (se suportarem ou roadmap)

7. **Webhook** genérico ao alterar `TargetFlare` (para além do GitHub) — existe ou roadmap?
8. **Token de serviço** só para leitura da fila pendente (sem admin) para CI — política recomendada?
9. **Fila única no Git** com **merge automático** ou **squash** para não poluir histórico — recomendação?

### D. Resposta directa

10. Com o estado **actual** da nossa app, qual é o **caminho mínimo** que recomendam para: marcar flare na UI → aparecer JSON no repo → developer faz `pull` → Cursor executa **busca de flares**?

---

## 3. UX Modo Flare (requisitos para o repo — implementação futura)

O caminho feliz é **só**: marcar → **modal** (digitar ou voz) → **Salvar** → registo na entidade. Tudo o resto (fila visível, export manual, admin) é secundário ou deve ir para **painel colapsável** / **Avançado**.

Hoje o painel **Fila de caça** expõe muitos botões (Precheck, Limpar tudo, Smoke, Fechar compras, Recarregar, Exportar relatório, etc.) e a lista ocupa sempre espaço.

**Direcção desejada:**

- **Ecrã principal:** quase vazio — só o necessário para **marcar** (crosshair, destaque, instrução curta).
- **Após marcar:** caixa de digitação ou **speech-to-text**, depois **Salvar** (já existe; simplificar copy se preciso).
- **Sair:** um controlo claro (ex. canto superior).
- **Lista de pendentes / export:** **oculta por defeito**; um controlo “Fila” ou “Mais” expande (lista + export se ainda for preciso offline até o GitHub automation estar fiável).
- **Funções admin** (smoke, limpeza total, precheck): **submenu “Avançado”** — não no caminho do observador que só alimenta o caderno.

*(Refactor em `ModoFlareInspection.jsx`; a chegada do caderno ao GitHub é Base44 + conector + secrets.)*

---

## 4. Frase única para o assistente Base44

> “Queremos que o único canal do assistente Cursor para ‘ver’ a fila Flare seja um ficheiro JSON no repositório GitHub (path e branch acordados). Que peças na Base44 (função, automation, conector, segredos) precisam de estar verdes para isso ser contínuo e que limitações conhecem (branch protegido, rate limit, commits frequentes)?”
