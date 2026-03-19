# Arquitetura de Powering de Relatórios

## 📊 Visão Geral

Sistema de **"powering"** (alimentação) de relatórios através de mapeamento de entidades, pipeline de transformação de dados e automação via backend functions.

---

## 🏗️ Modelo de Entidades & Relacionamentos

### Core Entities (Fonte de Dados)

```
┌─────────────────────────────────────────────────────┐
│                  VENDAS (PedidoVenda)               │
├─────────────────────────────────────────────────────┤
│ itens[]:                                            │
│   - produto_id → Produto.id                         │
│   - quantidade, preco_unitario_praticado, total     │
│ pagamentos[]                                        │
│ vendedor_id → (User)                                │
│ cliente_id → Terceiro.id                            │
└─────────────────────────────────────────────────────┘
         ↓
    ┌────────────────────────────────────────────┐
    │         PRODUTO (Master Data)              │
    ├────────────────────────────────────────────┤
    │ preco_custo_calculado (custo agregado)     │
    │ preco_venda_padrao                         │
    │ categoria_id → Categoria.id                │
    │ tags[], abcd (classificação)               │
    │ marca                                      │
    └────────────────────────────────────────────┘
         ↓
    ┌────────────────────────────────────────────┐
    │     COMPRAS (PedidoCompra + Manifesto)     │
    ├────────────────────────────────────────────┤
    │ itens[]:                                   │
    │   - produto_id, quantidade, custo_unitario│
    │ fornecedor_id → Terceiro.id                │
    │ data_aprovacao_financeira (timeline)      │
    │ data_despacho, data_chegada                │
    │ status (controle de fluxo)                 │
    └────────────────────────────────────────────┘
         ↓
    ┌────────────────────────────────────────────┐
    │   ESTOQUE (MovimentacaoEstoque)            │
    ├────────────────────────────────────────────┤
    │ produto_id, tipo (entrada/saída)           │
    │ motivo (Compra, Venda, Ajuste...)          │
    │ quantidade, custo_unitario                 │
    │ referencia_id (linkado a PedidoVenda/PC)  │
    └────────────────────────────────────────────┘
         ↓
    ┌────────────────────────────────────────────┐
    │  FINANCEIRO (LancamentoFinanceiro)         │
    ├────────────────────────────────────────────┤
    │ tipo (Receita/Despesa)                     │
    │ referencia_id → PedidoVenda/PedidoCompra   │
    │ valor, valor_liquido                       │
    │ status, data_vencimento, data_pagamento    │
    │ categoria_id → CategoriaFinanceira         │
    └────────────────────────────────────────────┘
```

---

## 📈 Mapeamento de Relatórios → Entidades

### VENDAS

| Relatório | Entidades Primárias | Cálculos |
|-----------|-------------------|----------|
| **Markup & Margem** | PedidoVenda → itens → Produto | markup = lucro/custo; margem = lucro/receita |
| **Ranking Vendedores** | PedidoVenda (vendedor_id) + itens | GROUP BY vendedor; SUM(total); COUNT(pedidos) |
| **Ticket Médio** | PedidoVenda | SUM(valor_total) / COUNT(pedidos) |
| **Taxa Conversão** | PedidoVenda (tipo='Orçamento' vs 'PDV') | COUNT(PDV) / COUNT(Orçamento) |
| **Produtos Top** | PedidoVenda → itens → Produto | GROUP BY produto; SUM(quantidade, total) |
| **Vendas Período** | PedidoVenda.created_date + itens | FILTER by dateRange; SUM(total) |

### COMPRAS

| Relatório | Entidades Primárias | Cálculos |
|-----------|-------------------|----------|
| **Curva ABC Fornecedores** | PedidoCompra (fornecedor) → itens | GROUP BY fornecedor; SUM(valor); RANK |
| **Lead Time** | PedidoCompra (data_despacho, data_chegada) | AVG(data_chegada - data_aprovacao); BY fornecedor |
| **Histórico de Preços** | PedidoCompra → itens + Produto | TRACK preco_unitario over time |
| **Pedidos Pendentes** | PedidoCompra (status != 'Concluído') | FILTER active; SORT by due_date |

### ESTOQUE

| Relatório | Entidades Primárias | Cálculos |
|-----------|-------------------|----------|
| **Inventário Valorizado** | Produto (estoque_atual, preco_custo) | estoque_atual × preco_custo_calculado; SUM total |
| **Giro de Estoque** | MovimentacaoEstoque + Produto | dias_sem_movimento; rotatividade = vendas/estoque |
| **Estoque Crítico** | Produto (estoque_atual < estoque_minimo) | FLAG produtos críticos |
| **Produtos Sem Giro** | MovimentacaoEstoque + Produto | last_sale_date; IF vazio há >N dias |
| **Performance Produto (IEP)** | Produto + PedidoVenda + MovimentacaoEstoque | margem% × giro × anexacao (3 pilares) |

### FINANCEIRO

| Relatório | Entidades Primárias | Cálculos |
|-----------|-------------------|----------|
| **Fluxo de Caixa** | LancamentoFinanceiro (data_vencimento) | GROUP by período; SUM receitas - SUM despesas |
| **Contas a Pagar/Receber** | LancamentoFinanceiro (status='Em Aberto') | SUM by vencimento; aging analysis |
| **DRE (Demonstração)** | LancamentoFinanceiro + CategoriaFinanceira | Receita - CMV - Despesas = Lucro |

### GERENCIAIS

| Relatório | Entidades Primárias | Cálculos |
|-----------|-------------------|----------|
| **Ponto de Equilíbrio** | Produto (margem) + LancamentoFinanceiro (custos fixos) | PE = custos_fixos / margem_média |
| **Eficiência Operacional** | PedidoVenda + PedidoCompra + LancamentoFinanceiro | lucro_bruto / investimento_compras |
| **Dashboard Executivo** | ALL (consolidação de KPIs) | Agregação de todos acima |

---

## 🔄 Pipeline de Transformação de Dados

### Fluxo de Alimentação

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAMADA 1: EXTRAÇÃO                           │
├─────────────────────────────────────────────────────────────────┤
│ • base44.entities.*.list() / filter()                           │
│ • Busca raw data: vendas, compras, estoque, financeiro         │
│ • Cria snapshots em timestamp para histórico                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                  CAMADA 2: TRANSFORMAÇÃO                        │
├─────────────────────────────────────────────────────────────────┤
│ • JOIN entidades via IDs (produto_id, vendor_id, etc)          │
│ • Calcula métricas (markup, margem, giro, etc)                 │
│ • Agrega por período, categoria, segmento                      │
│ • Normaliza moedas e unidades                                  │
│ • Resolve relacionamentos N:N (tags, múltiplos pagtos)        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              CAMADA 3: CACHE/MATERIALIZAÇÃO (opcional)          │
├─────────────────────────────────────────────────────────────────┤
│ • Entidade auxiliar: RelatorioDados (snapshot diário)          │
│ • Armazena results processados para queries rápidas            │
│ • TTL: 24h (regenerado via automation scheduled)               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                   CAMADA 4: APRESENTAÇÃO                        │
├─────────────────────────────────────────────────────────────────┤
│ • Component consome dados transformados                        │
│ • Filtros/sorts acontecem no frontend (se dados < 1MB)        │
│ • Ou via query-string params para backend re-processar        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🤖 Automações Sugeridas

### 1. **Sincronização de Custos de Produtos** (daily @ 02:00 AM)
```javascript
// Function: atualizarCustoProduto
// Trigger: scheduled, daily
// Action:
// - Busca PedidoCompra confirmados do último mês
// - Calcula custo médio ponderado por produto
// - Atualiza Produto.preco_custo_calculado
```

### 2. **Regeneração de Cache de Relatórios** (daily @ 03:00 AM)
```javascript
// Function: regenerarCacheRelatorios
// Trigger: scheduled, daily
// Action:
// - Executa todos os pipelines de transformação
// - Armazena snapshots em RelatorioDados
// - Invalidates frontend cache
```

### 3. **Atualização de Métricas de Performance** (on entity update)
```javascript
// Function: atualizarPerformanceProduto
// Trigger: entity (Produto, MovimentacaoEstoque, PedidoVenda)
// Action:
// - Recalcula IEP (margem, giro, anexacao)
// - Atualiza Produto.abcd (classificação)
// - Gera alertas de anomalias
```

### 4. **Sincronização de Status Financeiro** (daily)
```javascript
// Function: sincronizarStatusFinanceiro
// Trigger: scheduled, daily
// Action:
// - Busca LancamentoFinanceiro com data_vencimento = hoje
// - Atualiza status → "Vencido" se não pago
// - Calcula aging de contas a pagar/receber
```

### 5. **Alertas de Estoque Crítico** (hourly)
```javascript
// Function: verificarEstoqueCritico
// Trigger: scheduled, hourly
// Action:
// - Identifica Produto.estoque_atual < estoque_minimo
// - Cria Task automática para reposição
// - Notifica admin
```

---

## 💾 Entidade Auxiliar Proposta: RelatorioDados

Para otimizar queries de relatórios grandes, considere materializar dados pré-processados:

```json
{
  "name": "RelatorioDados",
  "type": "object",
  "properties": {
    "tipo_relatorio": {
      "type": "string",
      "enum": ["margem", "vendedores", "compras", "estoque", "financeiro"]
    },
    "periodo_inicio": { "type": "string", "format": "date" },
    "periodo_fim": { "type": "string", "format": "date" },
    "dados_processados": {
      "type": "object",
      "description": "JSON serializado com dados transformados"
    },
    "ttl_expiracao": { "type": "string", "format": "date-time" },
    "versao_schema": { "type": "string" },
    "gerado_automaticamente": { "type": "boolean", "default": true }
  }
}
```

---

## 🔧 Padrão de Implementação

### Para cada relatório:

```javascript
// 1. FUNÇÃO BACKEND: extrair e transformar dados
async function gerarRelatorioDados(tipo, filtros) {
  const raw = await base44.entities.*.list();
  const transformed = processData(raw, filtros);
  return { data: transformed, meta: { rows: transformed.length } };
}

// 2. HOOK NO FRONTEND: consumir dados
export function useRelatorio(tipo, filtros) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['relatorio', tipo, filtros],
    queryFn: () => gerarRelatorioDados(tipo, filtros),
    staleTime: 1000 * 60 * 60 // 1h cache
  });
  return { data, isLoading, error };
}

// 3. COMPONENTE: renderizar
<RelatorioComponent dados={data} loading={isLoading} />
```

---

## 🎯 Checklist de "Powering"

### Para Ativar um Relatório:

- [ ] Mapear entidades necessárias (quais queries? quais joins?)
- [ ] Definir fórmulas de cálculo (markup, giro, etc)
- [ ] Criar função backend para extração/transformação
- [ ] Implementar hook `useRelatorio()`
- [ ] Criar componente de visualização
- [ ] Testar com dados reais (min 1000+ registros)
- [ ] Configurar automação (se requer cache)
- [ ] Documentar filtros e saídas

---

## 📝 Notas Técnicas

1. **Joins**: Usar `reduce()` com Maps para relações N:1 (produto → categoria)
2. **Agregações**: `Array.reduce()` para GROUP BY; `Date` para time-series
3. **Performance**: Se > 5000 linhas, usar paginação (100/200 items por page)
4. **Cache**: Frontend: 1h; Backend snapshots: 24h
5. **Tratamento de NULLs**: Usar valores padrão (0, "N/A", "Sem categoria")

---

## 🚀 Próximos Passos

1. **Criar tabela de relacionamentos** (spreadsheet: entidades × relatórios)
2. **Implementar RelatorioDados** (entidade auxiliar para cache)
3. **Scheduler de automações** (daily @ 2-3 AM)
4. **Library de transformação** (`lib/reportPipeline.js`)
5. **Testes de performance** (load com 10k+ registros)