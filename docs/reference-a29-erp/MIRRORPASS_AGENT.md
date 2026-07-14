# mirrorpass — snippet para o agente Cursor no **a29-erp**

Copia o bloco da secção **「Regra para colar no AGENTS.md」** para o `AGENTS.md` ou `.cursor/rules/mirrorpass-a29.mdc` do repositório **a29-erp**.

---

## Porque o agente do A29 não encontrou?

O **mirrorpass só existe no A29 depois** de correres `npm run mirror:sync` no varejosync.  
Até lá, o agente do a29-erp **não tem o que ler** — por isso disse que não existe.

**Não confundir** com a *senha do Modo Flare* (`features/modo-flare`) — é outra coisa (password de equipa na app).

Depois do sync, o agente encontra:
- `legacy/varejosync/mirrorpass`
- `legacy/varejosync/MIRROR_PASS.leia-me.txt` (instruções para grep)
- `legacy/varejosync/VAREJO_UI_SYNC.stamp`

---

## Sempre a mais recente?

**Sim.** Existe **um único** ficheiro:

```
legacy/varejosync/mirrorpass
```

Cada `npm run mirror:sync` no varejosync **substitui** esse ficheiro. Não há histórico de senhas antigas no A29 — o que está no disco **é sempre a última mirrorpass**.

Para saber **quando** foi o último export (data, commit de origem), lê também:

```
legacy/varejosync/VAREJO_UI_SYNC.stamp
```

Campos úteis: `exported_at`, `varejosync_commit`, `export_id`, `mirrorpass` (deve coincidir com o ficheiro `mirrorpass`).

---

## Regra para colar no AGENTS.md (a29-erp)

```markdown
### mirrorpass — verificar sync do VarejoSync

Quando o utilizador perguntar pela **mirrorpass**, **senha do espelho**, se **chegaram ficheiros novos** do VarejoSync, ou **qual é a última mirrorpass**:

1. Lê **`legacy/varejosync/mirrorpass`** — uma só palavra (ex. `mirrorf24e329e`).
   - Este ficheiro é **único** e é **sempre o mais recente** (cada sync substitui o anterior).
   - Se não existir, lê **`legacy/varejosync/MIRROR_PASS.leia-me.txt`** — confirma que o sync ainda não chegou.
   - **Não** confundir com senha do **Modo Flare** (`features/modo-flare`).
2. Lê **`legacy/varejosync/VAREJO_UI_SYNC.stamp`** para data e origem:
   - `exported_at` — quando entrou no A29
   - `varejosync_commit` — commit do varejosync de origem
   - `export_id` — identificador completo do export
   - confirma que `mirrorpass=` no stamp coincide com o ficheiro `mirrorpass`
3. Responde em linguagem simples, por exemplo:
   - *"A mirrorpass actual é `mirrorf24e329e`, exportada em 2026-07-14, commit varejosync f24e329e."*
4. Se `mirrorpass` **não existir** ou estiver vazio → o sync **ainda não chegou**; pedir `npm run mirror:sync` no repo varejosync.

**Não** inventar senha nem adivinhar exports antigos — só o que está nestes dois ficheiros.
```

---

## Perguntas típicas do utilizador

| Pergunta | O que fazer |
|----------|-------------|
| *Qual a mirrorpass?* | Ler `mirrorpass` e responder a palavra. |
| *Qual é a última mirrorpass?* | Igual — só existe uma; é a do ficheiro actual. |
| *Chegou o espelho do varejo?* | Se `mirrorpass` existe → sim; indicar palavra + `exported_at` do stamp. |
| *Quando foi o último sync?* | `exported_at` em `VAREJO_UI_SYNC.stamp`. |

---

## Origem (varejosync)

Gerado por `npm run mirror:pack` / `npm run mirror:sync`.  
Formato da palavra: `mirror` + commit curto (ex. `mirrorf24e329e`).
