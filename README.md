# varejosync (P38 / Base44)

## Dois repositórios, papéis diferentes (evitar confusão)

| Onde | Papel |
|------|--------|
| **`varejosync` (este repo)** | Código que o **Base44** costuma construir quando o projecto está ligado a este GitHub (`p38.base44.app`, funções em `base44/`, UI Vite). **Correcções que precisam entrar no hosted Base44** devem ser commitadas **aqui** para o pipeline Git → Base44 apanhar. |
| **`a29-erp` (monorepo)** | Schema Drizzle, `packages/*`, `ops/supabase`, e uma cópia de referência em **`legacy/varejosync`** (snapshot; não substitui por si só o deploy Base44 se o remote canónico for este repo). |

Enquanto o negócio operar no Base44 com sync por Git, tratar **este** repositório como fonte da UI/funções que essa stack publica. Alinhar mudanças grandes com `docs/` no monorepo **a29-erp** quando tocarem migração Supabase ou política de dados.

## Exportar UI para o a29-erp (`legacy/varejosync`)

O monorepo **a29-erp** mantém um snapshot em `legacy/varejosync/`. Para actualizar a partir deste repo:

```bash
npm run mirror:pack
npm run mirror:push -- ../a29-erp
```

Detalhes: [`mirror/README.md`](./mirror/README.md).

---

*Título anterior: Base44 App.*
