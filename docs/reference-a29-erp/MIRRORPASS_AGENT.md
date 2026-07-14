# mirrorpass — snippet para o agente Cursor no **a29-erp**

Copia o bloco abaixo para o `AGENTS.md` ou uma regra `.cursor/rules/` do repositório **a29-erp**.

---

## Verificar export do VarejoSync (mirrorpass)

Quando o utilizador perguntar se **chegaram os ficheiros novos** do VarejoSync, qual é a **mirrorpass**, **senha do espelho**, ou se o **sync UI** foi aplicado:

1. Lê o ficheiro **`legacy/varejosync/mirrorpass`** (uma só palavra, sem extensão).
2. Responde com essa palavra e, se útil, o `export_id` em `legacy/varejosync/VAREJO_UI_SYNC.stamp`.
3. Se `mirrorpass` **não existir** ou estiver vazio → o último export **ainda não chegou**; pedir para correr no varejosync: `npm run mirror:sync -- <caminho-a29-erp>`.

Exemplo de pergunta do utilizador: *"Qual a mirrorpass?"* / *"Chegou o espelho do varejo?"*

**Não** inventar a senha — só a que está no ficheiro.

---

## Origem (varejosync)

Gerado automaticamente por `npm run mirror:pack` / `npm run mirror:sync` no repo **varejosync**.  
Formato da palavra: `mirror` + commit curto (ex. `mirrorf24e329e`).
