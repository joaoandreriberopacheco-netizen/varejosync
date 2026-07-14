# Prompt — colar no agente Cursor do **a29-erp** (uma vez)

Copia o bloco abaixo **inteiro** no chat do agente do repositório **a29-erp**.  
Depois podes só perguntar *"qual a mirrorpass?"*.

---

## Prompt (copiar tudo dentro do bloco)

```
Tarefa única: preparar mirrorpass do VarejoSync no A29.

1) Baixa os carimbos publicados no varejosync (branch main):
   https://raw.githubusercontent.com/joaoandreriberopacheco-netizen/varejosync/main/mirror/live/mirrorpass
   https://raw.githubusercontent.com/joaoandreriberopacheco-netizen/varejosync/main/mirror/live/VAREJO_UI_SYNC.stamp
   https://raw.githubusercontent.com/joaoandreriberopacheco-netizen/varejosync/main/mirror/live/MIRROR_PASS.leia-me.txt

2) Grava em legacy/varejosync/ (cria a pasta se não existir):
   - legacy/varejosync/mirrorpass
   - legacy/varejosync/VAREJO_UI_SYNC.stamp
   - legacy/varejosync/MIRROR_PASS.leia-me.txt

3) Adiciona ao AGENTS.md (ou .cursor/rules/mirrorpass-a29.mdc) a regra:
   - Quando perguntarem mirrorpass / senha do espelho / chegou o varejo: ler legacy/varejosync/mirrorpass (sempre a mais recente; uma só palavra).
   - NÃO confundir com Modo Flare (features/modo-flare).
   - Se mirrorpass não existir → sync ainda não chegou.

4) Commit: chore(legacy): mirrorpass do varejosync + regra agente
   Push para main (ou abre PR draft).

5) Responde com a mirrorpass que gravaste e o exported_at do stamp.
```

---

## Depois (só perguntar)

- *"Qual a mirrorpass?"*
- *"Chegou o espelho do varejo?"*

O agente lê `legacy/varejosync/mirrorpass`.
