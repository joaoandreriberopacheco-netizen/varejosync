# Deploy Vercel via GitHub Actions

O workflow **Vercel Deploy** (`.github/workflows/vercel-deploy.yml`) faz build com variáveis do Supabase e publica em produção.

## Secrets (GitHub → Settings → Secrets → Actions)

| Secret | Onde obter |
|--------|------------|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel → Settings → General (Team ID ou User ID) |
| `VERCEL_PROJECT_ID` | Projecto → Settings → General → Project ID |
| `VITE_SUPABASE_URL` | `https://zhonvxkkqabfdyehyxpu.supabase.co` (P38) |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |

Opcional: `VITE_P38_USE_SUPABASE_AUTH` = `true` quando login Supabase estiver activo.

## Disparar

- **Automático:** push na `main` (ficheiros da app)
- **Manual:** Actions → **Vercel Deploy** → Run workflow

## O que o build embute

- `VITE_P38_PROVIDER=supabase`
- `VITE_P38_BYPASS_BASE44=true`
- URL e anon key do Supabase (dos secrets)

## Nota

Se o projecto Vercel já tiver integração Git ligada ao mesmo repo, pode haver dois deploys por push. Preferir **um** método: ou só este workflow, ou só a integração nativa (com env vars no painel Vercel).
