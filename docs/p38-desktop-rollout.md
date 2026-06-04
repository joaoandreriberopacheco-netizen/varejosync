# Plano desktop — paleta P38 (cinza · verde · branco)

Objetivo: em **tablet (≥768px)** e **desktop (≥1024px)**, cada tela usar a mesma linguagem do Relatório de Margem — fundos quentes/cinza, cartões brancos/slate, **verde só em dados e ênfase**, não decoração em massa no menu.

## Padrões de abordagem

| Código | Nome | Quando usar | Desktop |
|--------|------|-------------|---------|
| **A** | Referência total | Relatórios densos (Margem, Catálogo) | `bg-background`, `p38Table`, cabeçalho sticky, verde em lucro/status |
| **B** | Lista + tabela | CRUD com muitas colunas | Mobile: `P38MobileLineList`; desktop: `P38TableShell` + `p38Table.*` |
| **C** | Lista única | Gestão operacional, poucas colunas | `P38MobileLineList` com `allViewports` |
| **D** | Grid / TreeGrid | Produtos, Vendas Gestão | Tokens no header/linhas; não substituir por linhas |
| **E** | Painéis / KPI | Home, Dashboards | `bg-card`, verde só no valor/KPI |
| **F** | Fullscreen / PDV | Balcão, extrato | Não forçar shell ERP; DIN + tokens onde não atrapalhar |
| **G** | Tokens mínimos | Forms simples, admin raro | `gray-*` / `slate-*` → `background` / `card` / `muted` |

### Regra do verde

- **Usar:** lucro, status ok, barra lateral de painel de resumo (Margem), indicador fino na nav inferior.
- **Evitar:** ícones verdes em massa, bordas em todos os itens de menu, decoração verde em todos os atalhos.

## Shell global (Layout)

| Peça | Desktop |
|------|---------|
| Sidebar | `p38ShellColors` — hover/active neutro |
| Conteúdo | `bg-background`, `md:p-6` |
| Busca ⌘K | `card` / `muted` |
| Bottom nav | Só &lt;1024px; traço verde suave no ativo |

**Fullscreen (sem sidebar):** PDV, PDVVendedor, PDVCaixa, AutoAtendimento, ExtratoConta, PedidoCompraDetalhe, AnexoCompartilhado → padrão **F**.

## Inventário por menu

### Início
- **Home** — E + G (atalhos neutros; resumo em card P38)
- **Notificacoes** — C / G

### Dashboard
- **Dashboard** — E
- **PainelGerente** — E + B

### PDV / Caixa
- **PDVVendedor**, **PDV**, **AutoAtendimento**, **PDVCaixa** — F
- **PDVAuditoria** — G → B
- **VisualizadorCaixa** — C + G (tokens; revisar abas desktop)

### Vendas
- **VendasGestao** — D
- **VendasPerdidas**, **Vendas**, **DevolucaoTroca** — B / C / G
- **ControleEntregas** — C + B
- **DashboardVendedor** — E

### Produtos
- **Produtos** — D
- **ImportacaoProdutos**, **EditarProdutosEmMassa**, **EdicaoMassivaCustos** — G / C

### Compras
- **SugestoesCompra**, **Cotacoes**, **PedidosCompra** — G / B
- **PedidoCompraDetalhe** — F
- **ConferenciaEntrada** — C + B
- **ItinerarioFluvial** — G

### Estoque
- **MovimentosInventario** — C + B
- **ConferenciaEstoque**, **AuditoriaEstoque**, **AuditoriaEstoqueV2** — C
- **Armazenagem**, **InterfaceSeparador**, **TabelaPrecosConsulta** — G / C
- **ConferenciaVolumes**, **ConferenciaItens**, **Expedicao**, **HubLogistico** — G / B / C
- **ConsumoInterno** — C + G

### Financeiro
- **FluxoCaixa**, **ContasFinanceiras**, **AprovacoesFinanceiras**, **FinanceiroAprovacoes** — B / C / G
- **CaixasAtivos**, **TurnosFechados** — C ✅
- **Agefin**, **AgefinConsulta** — G / C
- **Financeiro**, **FinanceiroModulo**, **ExtratoConta** — G / F
- **ReversaoDespesasSangrias**, **SimuladorCartao** — C / G

### Relatórios
- **Relatorios** — E
- **RelatorioMargem**, **RelatorioCatalogoEstoque** — A ✅
- **RelatorioPerformance** — A / D
- **ReimpressaoDocumentos** — C + G

### Configurações / admin
- **Configuracoes**, **Terceiros**, **Intervenientes** — G / B
- **Veiculos**, **TabelasPreco**, **Campanhas**, **Compras** — G / B
- **LogsAutenticacao**, **AuditoriaPins**, **ExclusaoDocumentos** — B / C
- Demais telas admin — G

## Componentes partilhados (prioridade)

1. `TabelaDinamica` / `ProdutosPlanaTable`
2. `ListaLancamentos`, `ContasAbertas`, `AgefinLista`
3. `DetalhesPedidoVenda` e drawers de vendas
4. Dialogs: `bg-card`, `border-border`

## Ondas de implementação

| Onda | Escopo | Estado |
|------|--------|--------|
| **0** | Shell + tokens globais | ✅ |
| **1** | Financeiro + componentes `financeiro/`, `agefin/` | ✅ tokens (`scripts/p38-token-migrate.mjs`) |
| **2** | Vendas (exc. PDV fullscreen), `ControleEntregas`, `DevolucaoTroca` | ✅ tokens |
| **3** | Produtos, estoque, compras, consumo interno | ✅ tokens + `TabelaDinamica` parcial |
| **4** | Relatórios, config, admin, restantes em `src/pages` | ✅ tokens em massa |
| **—** | PDV / AutoAtendimento / PDVCaixa | ⏸️ intocado (padrão F) |

Ferramentas:

| Comando | Função |
|---------|--------|
| `npm run p38:color-audit` | Lista ficheiros com classes `gray-*` / `slate-*` legadas |
| `npm run p38:color-fix` | Substitui por tokens P38 (`background`, `card`, `muted`, `foreground`, `primary`, `ring`) |
| `npm run p38:token-migrate` | Migração literal em massa (script legado) |

Código: `scripts/p38-color-audit.mjs` — mapeamento + correção. **Exclui** PDV fullscreen (`PDVCaixa`, `PDVVendedor`, `PDVSupermercado`, `AutoAtendimento`).

Após `p38:color-fix` (2026-06): **0 ocorrências** gray/slate no âmbito auditado; PDV mantém classes próprias até pedido explícito.

Pendente fino: `allViewports` em listas só-mobile; TreeGrid/VendasGestao revisão visual; PDV fullscreen.

## Checklist por tela

- [ ] Fundo = `bg-background` (não `gray-50` / `gray-900`)
- [ ] Cartões = `bg-card` + `border-border/40`
- [ ] Tabela desktop com `p38Table` onde há dados tabulares
- [ ] Tablet: linhas ou tabela coerente (`allViewports` ou `md+` tabela)
- [ ] Verde só em KPI/status/dados
- [ ] DIN 1451 (herda do Layout)

## Referências no código

- Tokens: `src/index.css`, `src/styles/p38-identity.css`
- Superfícies JS: `src/lib/p38ThemeSurfaces.js`, `src/lib/p38TableSurfaces.js`, `src/lib/p38ShellColors.js`
- Linhas: `src/components/ui/p38-mobile-line.jsx` (`allViewports`)
- Menu: `src/components/config/usePermissoesResolvidas.jsx` → `ALL_MENU_ITEMS`
