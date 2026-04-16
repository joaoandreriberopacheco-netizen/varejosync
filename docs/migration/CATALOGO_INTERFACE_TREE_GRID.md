# Contrato JSON — `CatalogoInterface` / tree grid

Versão do contrato retornada pela função Base44 `listarCatalogoInterface`: **`contractVersion: "1.0.0"`**.

## Função `listarCatalogoInterface`

- **Método:** `POST`
- **Auth:** utilizador com `role === 'admin'` (igual a outras funções internas do projeto).
- **Corpo JSON (opcional):**

| Campo | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `parent_stable_code` | string | — | Âncora do ramo pelo `stable_code`. Se omitido e `parent_id` vazio, lista só **raízes** (`parent_id` nulo). |
| `parent_id` | string | — | Âncora alternativa por `id` da entidade. |
| `incluir_descontinuados` | boolean | `false` | Se `false`, exclui nós `lifecycle_status === "descontinuado"`. |
| `incluir_rascunhos` | boolean | `false` | Se `false`, exclui nós `lifecycle_status === "rascunho"`. |
| `profundidade_max` | number \| null | `null` | Só com âncora: profundidade **relativa** à âncora (`0` = só o nó âncora; `1` = âncora + filhos diretos; `null` = ilimitado). Sem âncora, ignorado (só raízes). |
| `response_format` | `"flat"` \| `"nested"` | `"flat"` | Formato da resposta. |

## Resposta

| Campo | Descrição |
|--------|-----------|
| `contractVersion` | `"1.0.0"` |
| `responseShape` | `"flat"` ou `"nested"` |
| `branch` | `{ stable_code, id }` da âncora ou `{ null, null }` no modo só raízes |
| `incluir_descontinuados` / `incluir_rascunhos` / `profundidade_max` | Eco dos parâmetros |
| `count` | Número de linhas em `rows` |
| `rows` | Sempre presente: lista **plana** (pré-ordem em modo âncora) |
| `nested` | Se `response_format === "nested"`: `{ anchor, children }` (com âncora) ou `{ roots }` (sem âncora); caso contrário `null` |

### Linha em `rows` (shape `flat`)

Campos da entidade (`stable_code`, `parent_id`, `kind`, `titulo`, …) mais:

- `parent_stable_code`: `stable_code` do pai (string vazia se raiz).
- `depth`: profundidade relativa à âncora (ou à raiz global quando sem âncora).
- `path_ids`, `path_stable_codes`, `path_titles`: caminho da raiz até o nó.

### Shape `nested` (com âncora)

```json
{
  "anchor": { "...campos da linha..." },
  "children": [
    {
      "...": "...",
      "children": []
    }
  ]
}
```

### Metadados (`metadados` JSON no nó)

Convencionados no plano (não validados pelo backend nesta fase):

- `oculto_por_stable_code`: string — quem cobriu o componente no layout.
- Regra derivada: ex. `{ "tipo": "derivado", "expressao": "...", "refs": ["stable_code", ...] }`.
