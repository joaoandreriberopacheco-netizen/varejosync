# Análise de Limpeza Técnica — 11/04/2026

## 1. ENTIDADES DE MOVIMENTO DE ESTOQUE

### Achados: Fragmentação identificada
- **MovimentacaoEstoque** — Entidade principal (Schema completo com tipos, motivação, rastreamento)
- **EstoqueDiario** — Possivelmente redundante (precisa validação)
- **ConsumoInterno** — Entidade específica (saídas com destinação e assinatura)
- **DevolucaoTroca** — Entidade específica (movimento com contexto comercial)

### Recomendação:
- ✅ **MovimentacaoEstoque** é a fonte única para toda movimentação
- ⚠️ **EstoqueDiario** deve ser reavaliado — pode ser snapshot histórico ou redundância
- ✅ **ConsumoInterno** e **DevolucaoTroca** são válidas — têm semântica própria

---

## 2. PÁGINAS SEM PONTE / ORFÃS

### Páginas potencialmente orfãs (não linkadas no menu ou Home):
1. **AnexoCompartilhado** — Sem link no menu/Home
2. **AuditoriaEstoque** vs **AuditoriaEstoqueV2** — Duplicação (qual é ativa?)
3. **ConferenciaEditor** — Sem link claro
4. **DiscriminarVolumes** — Função específica, sem ponte
5. **EstimativaEmbalagensIA** — IA, sem integração visível
6. **OtimizacaoEstoqueIA** — IA, sem integração visível
7. **LogsAutenticacao** — Admin-only, sem menu?
8. **MapaFuncionalidades** — Documentação interna?

---

## 3. POSSÍVEIS REDUNDÂNCIAS

### Suite de Auditoria/Conferência:
- **ConferenciaEstoque** (geral)
- **ConferenciaEditor** (específico)
- **ConferenciaItens** (itens de manifesto)
- **ConferenciaVolumes** (volumes)
- **AuditoriaEstoque** + **AuditoriaEstoqueV2** (Qual é atual?)

👉 **Ação**: Mapeá-las e unificar sob conceito único

### Suite de Dashboards:
- **Dashboard** (geral)
- **DashboardCaixa** (PDV específico)
- **DashboardVendedor** (vendedor específico)
- **PainelGerente** (gerencial)

👉 **Ação**: Documentar diferenças; considerar unificação

### Suite de Movimentos de Caixa:
- **CaixasAtivos** (painel de caixas ativos)
- **ControleCaixasAtivos** (controle de caixas ativos)

👉 **Ação**: São realmente diferentes?

---

## 4. BOTÕES/LINKS QUEBRADOS NO HOME E PAINÉIS

### No Home.jsx:
- ✅ Atalhos via `ALL_QUICK_ACTIONS` (dinâmicos, seguro)
- ✅ Link "Ver Dashboard Completo" → `Dashboard` (existe)
- ✅ Avisos → PDVCaixa / Produtos (existem)
- ✅ Consumo Interno (hardcoded link, deve validar `/ConsumoInterno`)

### No Compras.jsx:
- ❌ `DetalhesSupermanifesto` — **DELETADO**
- ❌ `GestaoManifestos` — **DELETADO**
- ❌ `GestaoSupermanifestos` — **DELETADO**
- ✅ Corrigido em commit anterior

---

## 5. ENTIDADES DELETADAS (Audit Trail)

Removidas no últmimo ciclo:
- ❌ `StatusAprovacaoFinanceira`
- ❌ `TransicaoPedidoCompra`
- ❌ `LoteEstoque`
- ❌ Componentes manifesto/supermanifesto (8 componentes)
- ❌ Páginas logística legada

---

## 6. CHECKLIST PARA PRÓXIMAS AÇÕES

- [ ] Validar **EstoqueDiario** — é necessária ou redundância?
- [ ] Unificar **AuditoriaEstoque** vs **AuditoriaEstoqueV2**
- [ ] Consolidar suite de conferência (5 páginas → quantas realmente?)
- [ ] Unificar **CaixasAtivos** e **ControleCaixasAtivos**
- [ ] Documentar fins de **EstimativaEmbalagensIA** e **OtimizacaoEstoqueIA**
- [ ] Remover links quebrados em `Home.jsx` para páginas orfãs
- [ ] Validar `ALL_QUICK_ACTIONS` — remover ações para páginas deletadas

---

## 7. IMPACTO DO RELATÓRIO ANTERIOR (Manifesto)

Build fixado:
- Removidos 2 imports + 2 rotas em App.jsx
- 14 arquivos deletados
- Compras.jsx corrigido

✅ **Sistema limpo e funcional**