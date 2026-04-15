# Export da fila Flare (Cursor)

Este ficheiro `flare-pending.json` é **gerado localmente** e está **gitignored**. Serve para o Cursor (ou outras ferramentas) lerem a lista de `TargetFlare` pendentes sem aceder à API manualmente.

## Gerar ou atualizar

**Na app (browser):** no Modo Flare, painel **Fila de caça**, botão **Exportar relatório** — descarrega um `.json` com o mesmo formato (`exportedAt`, `count`, `items`) que o script abaixo. Podes guardar o ficheiro em `docs/flare-export/flare-pending.json` à mão para o Cursor ler.

**No terminal** — com credenciais Base44 no ambiente (mesmas variáveis que `npm run flare:list`):

```bash
npm run flare:export
```

Saída por defeito: `docs/flare-export/flare-pending.json`.

Outro caminho:

```bash
node scripts/export-flare-pending.mjs --out=./meu-caminho.json
```

## API local (dev)

```bash
npm run flare:api
```

- `GET http://127.0.0.1:3844/pending` — JSON dos pendentes  
- `GET http://127.0.0.1:3844/export` — grava o ficheiro e devolve o mesmo payload  
- `GET http://127.0.0.1:3844/health` — verifica se há credenciais no processo  

Porta: variável `FLARE_API_PORT` (padrão 3844). O token só existe no processo Node, não no browser.

## Nuvem (admin)

Função Base44 `listFlarePending`: `POST` autenticado, apenas **admin**, devolve `{ count, items }` para integrações.

## Caçar bandeirinhas no Cursor

1. Correr `npm run flare:export` (ou abrir o JSON existente).  
2. Ler `docs/flare-export/flare-pending.json`.  
3. Priorizar `confidence: high`, aplicar `action_briefing`, abrir `file_path` na linha indicada.  
4. Marcar registos como `resolved` após correção.

## Busca de flares (frase de arranque)

No Cursor, depois de gerares o JSON, podes dizer **busca de flares**: a regra do projeto em [`.cursor/rules/busca-de-flares.mdc`](../../.cursor/rules/busca-de-flares.mdc) orienta o assistente a ler o export, montar um **plano ordenado** e **só executar** depois da tua aprovação (“bombs away”).
