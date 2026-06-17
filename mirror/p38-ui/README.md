# Espelho P38 (UI) — para colar no a29-erp

Pasta de **exportação isolada**. Não faz parte do build do varejosync em produção.

## Para que serve

1. Colas aqui o espelho da UI (páginas, componentes, layout, estilos).
2. Clonas ou copias esta pasta para o monorepo **a29-erp**:

   ```
   a29-erp/legacy/varejosync/
   ```

3. Depois de validares no A29, **fechas as válvulas** entre os dois repos (sem sync automático).

## Estrutura esperada (quando estiver cheia)

```
mirror/p38-ui/          →  a29-erp/legacy/varejosync/
├── src/
│   ├── pages/          ← ecrãs (~86 ficheiros .jsx)
│   ├── components/     ← UI por módulo
│   ├── lib/            ← auth, helpers, query-client
│   ├── hooks/
│   ├── api/
│   ├── integrations/   ← camada P38 (p38/)
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
├── postcss.config.js
├── components.json
└── jsconfig.json
```

Ver lista completa em [`INVENTARIO.md`](./INVENTARIO.md).

## Como colar (no teu PC)

### Opção A — Script automático (a partir da raiz do varejosync)

```bash
./mirror/p38-ui/pack-from-varejosync.sh
```

Copia os ficheiros listados no inventário para dentro de `mirror/p38-ui/`.

### Opção B — Manual

Abre [`INVENTARIO.md`](./INVENTARIO.md) e copia pasta a pasta do varejosync para `mirror/p38-ui/`.

**Não copies:** `node_modules/`, `.git/`, `dist/`, `build/`, `.env*`, `base44/`.

## Como levar para o a29-erp

```bash
# 1. Clonar o a29-erp (se ainda não tiveres)
git clone https://github.com/joaoandreriberopacheco-netizen/a29-erp.git
cd a29-erp

# 2. Espelhar o conteúdo desta pasta
rsync -av --delete \
  --exclude node_modules --exclude .git --exclude dist --exclude .env* \
  /caminho/para/varejosync/mirror/p38-ui/ legacy/varejosync/

# 3. Configurar e testar
npm install
# .env conforme README do a29-erp
npm run dev
```

No Windows (PowerShell), equivalente:

```powershell
$src = "C:\caminho\para\varejosync\mirror\p38-ui"
$dst = "C:\caminho\para\a29-erp\legacy\varejosync"
robocopy $src $dst /MIR /E /XD node_modules .git dist build /XF .env .env.local
```

## Registo do snapshot

Quando terminares o espelho, preenche [`SNAPSHOT.txt`](./SNAPSHOT.txt) com a data e o commit SHA do varejosync de origem.

## Branch Git

Este scaffold vive na branch `cursor/p38-ui-mirror-scaffold-b9fd` (não em `main`).
