# Espelho P38 (UI) — para colar no a29-erp

Pasta de **exportação isolada**. Não faz parte do build do varejosync em produção.

## Para que serve

1. Geras aqui o espelho da UI (páginas, componentes, layout, integrações P38).
2. Copias para o monorepo **a29-erp** em `legacy/varejosync/`.
3. Validas no A29; não há sync automático entre repos.

## Comandos (recomendado)

Na **raiz do varejosync**:

```bash
npm run mirror:pack
npm run mirror:push -- ../a29-erp
```

Equivalente em bash (atalhos nesta pasta):

```bash
./mirror/p38-ui/pack-from-varejosync.sh
./mirror/p38-ui/push-to-a29.sh ../a29-erp
```

## Estrutura esperada (após `mirror:pack`)

```
mirror/p38-ui/          →  a29-erp/legacy/varejosync/
├── src/
│   ├── pages/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   ├── api/
│   ├── integrations/   ← camada P38 (importante para Supabase)
│   ├── config/
│   ├── entities/
│   ├── features/
│   ├── styles/
│   ├── utils/
│   ├── assets/
│   ├── App.jsx
│   ├── Layout.jsx
│   ├── main.jsx
│   ├── pages.config.js
│   └── globals.css / index.css
├── public/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── SNAPSHOT.txt        ← commit SHA de origem
```

Ver lista completa em [`INVENTARIO.md`](./INVENTARIO.md).

## Windows (PowerShell)

```powershell
npm run mirror:pack
npm run mirror:push -- "C:\caminho\para\a29-erp"
```

Ou robocopy manual após o pack:

```powershell
$src = "C:\caminho\para\varejosync\mirror\p38-ui"
$dst = "C:\caminho\para\a29-erp\legacy\varejosync"
robocopy $src $dst /MIR /E /XD node_modules .git dist build /XF .env .env.local
```

## O que não copiar

`base44/` (funções Base44), `node_modules/`, `.env*`, `dist/`, `build/`, `mirror/`.

## Carimbo de auditoria

Após `mirror:pack` / `mirror:sync`, verifica no **a29-erp**:

```bash
cat legacy/varejosync/VAREJO_UI_SYNC.stamp
grep VAREJO_UI_SYNC legacy/varejosync/VAREJO_UI_SYNC.stamp
```

Palavra-chave: **`VAREJO_UI_SYNC`** — `export_id` identifica cada actualização.

**Senha (uma palavra):** ficheiro **`mirrorpass`** na mesma pasta — ex. `mirrorf24e329e`. Pergunta ao agente no a29: *"qual a mirrorpass?"*

## Registo do snapshot

Após `npm run mirror:pack`, o ficheiro `SNAPSHOT.txt` (local, não versionado) regista data, commit e branch do varejosync de origem. Modelo: [`SNAPSHOT.example.txt`](./SNAPSHOT.example.txt).
