/**
 * Report Pipeline Library
 * Padroniza extração, transformação e agregação de dados para relatórios
 */

/**
 * CAMADA 1: Extração Raw
 */
export const extraction = {
  // Busca vendas e expande itens
  async getSalesWithProducts(baseClient, filters = {}) {
    const sales = await baseClient.entities.PedidoVenda.filter(filters);
    const products = await baseClient.entities.Produto.list();
    const prodMap = new Map(products.map(p => [p.id, p]));
    
    return {
      sales,
      products,
      prodMap
    };
  },

  // Busca compras e expande itens
  async getPurchasesWithVendors(baseClient, filters = {}) {
    const purchases = await baseClient.entities.PedidoCompra.filter(filters);
    const vendors = await baseClient.entities.Terceiro.filter({ tipo: 'Fornecedor' });
    const vendorMap = new Map(vendors.map(v => [v.id, v]));
    
    return {
      purchases,
      vendors,
      vendorMap
    };
  },

  // Busca movimentações de estoque
  async getStockMovements(baseClient, filters = {}) {
    const movements = await baseClient.entities.MovimentacaoEstoque.filter(filters);
    const products = await baseClient.entities.Produto.list();
    const prodMap = new Map(products.map(p => [p.id, p]));
    
    return {
      movements,
      products,
      prodMap
    };
  },

  // Busca lançamentos financeiros
  async getFinancialRecords(baseClient, filters = {}) {
    const records = await baseClient.entities.LancamentoFinanceiro.filter(filters);
    const categories = await baseClient.entities.CategoriaFinanceira.list();
    const catMap = new Map(categories.map(c => [c.id, c]));
    
    return {
      records,
      categories,
      catMap
    };
  }
};

/**
 * CAMADA 2: Transformação & Cálculos
 */
export const transforms = {
  // Calcula métrica de venda
  calculateSaleMetrics(item, product, defaultCost = 0) {
    const unitCost = product?.preco_custo_calculado || defaultCost;
    const totalCost = unitCost * item.quantidade;
    const profit = item.total - totalCost;
    const markup = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    const margin = item.total > 0 ? (profit / item.total) * 100 : 0;

    return {
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario_praticado || (item.total / item.quantidade),
      total_recebido: item.total,
      custo_unitario: unitCost,
      custo_total: totalCost,
      lucro_total: profit,
      markup_percentual: markup,
      margem_percentual: margin,
      lucro_unitario: profit / item.quantidade
    };
  },

  // Calcula lote de imposto/frete
  calculateAcquisitionCost(purchaseItem, product = {}) {
    const baseCost = purchaseItem.custo_unitario || 0;
    const freight = (purchaseItem.frete || 0) / purchaseItem.quantidade;
    const tax1 = (purchaseItem.imposto1 || 0) / purchaseItem.quantidade;
    const tax2 = (purchaseItem.imposto2 || 0) / purchaseItem.quantidade;
    const other = (purchaseItem.outros_custos || 0) / purchaseItem.quantidade;
    const discount = (purchaseItem.desconto || 0) / purchaseItem.quantidade;

    const totalCost = baseCost + freight + tax1 + tax2 + other - discount;

    return {
      base_cost: baseCost,
      freight_per_unit: freight,
      tax1_per_unit: tax1,
      tax2_per_unit: tax2,
      other_per_unit: other,
      discount_per_unit: discount,
      total_cost_per_unit: totalCost,
      total_qty: purchaseItem.quantidade,
      total_acquisition_cost: totalCost * purchaseItem.quantidade
    };
  },

  // Calcula dias em estoque
  calculateStockDays(lastMovementDate) {
    if (!lastMovementDate) return null;
    const days = Math.floor(
      (new Date() - new Date(lastMovementDate)) / (1000 * 60 * 60 * 24)
    );
    return days;
  },

  // Calcula rotatividade de estoque
  calculateStockTurnover(totalSalesQty, avgStockQty, daysInPeriod = 30) {
    if (avgStockQty === 0) return 0;
    return (totalSalesQty / avgStockQty) * (365 / daysInPeriod);
  },

  // Calcula IEP (3 pilares)
  calculateIEP(margin, turnoverDays, attachmentRate) {
    // Normaliza: margin (0-100), giro (0-100), anexação (0-100)
    const normalizedMargin = Math.min(margin / 1, 100);
    const normalizedTurnover = Math.min((365 / Math.max(turnoverDays, 1)) * 10, 100);
    const normalizedAttachment = Math.min(attachmentRate * 100, 100);

    // Weighted average: 40% margem, 35% giro, 25% anexação
    const iep = (normalizedMargin * 0.4) + (normalizedTurnover * 0.35) + (normalizedAttachment * 0.25);
    
    return {
      iep: Math.round(iep),
      pilar_margem: normalizedMargin,
      pilar_giro: normalizedTurnover,
      pilar_anexacao: normalizedAttachment
    };
  }
};

/**
 * CAMADA 3: Agregação
 */
export const aggregations = {
  // Group By com aggregação
  groupByAndAggregate(items, groupKey, aggregators = {}) {
    const grouped = new Map();

    items.forEach(item => {
      const key = item[groupKey];
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          items: [],
          aggregated: {}
        });
      }

      const group = grouped.get(key);
      group.items.push(item);

      // Aplica agregadores
      Object.entries(aggregators).forEach(([aggKey, aggFn]) => {
        if (!group.aggregated[aggKey]) {
          group.aggregated[aggKey] = aggFn.initial();
        }
        group.aggregated[aggKey] = aggFn.aggregate(
          group.aggregated[aggKey],
          item
        );
      });
    });

    return Array.from(grouped.values());
  },

  // Agregadores comuns
  aggregators: {
    sum: (field) => ({
      initial: () => 0,
      aggregate: (acc, item) => acc + (item[field] || 0)
    }),
    count: () => ({
      initial: () => 0,
      aggregate: (acc) => acc + 1
    }),
    avg: (field) => ({
      initial: () => ({ sum: 0, count: 0 }),
      aggregate: (acc, item) => ({
        sum: acc.sum + (item[field] || 0),
        count: acc.count + 1
      }),
      finalize: (acc) => acc.count > 0 ? acc.sum / acc.count : 0
    }),
    min: (field) => ({
      initial: () => Infinity,
      aggregate: (acc, item) => Math.min(acc, item[field] || Infinity)
    }),
    max: (field) => ({
      initial: () => -Infinity,
      aggregate: (acc, item) => Math.max(acc, item[field] || -Infinity)
    })
  },

  // Cria totais consolidados
  calculateTotals(items, fields = []) {
    const totals = {};
    fields.forEach(field => {
      totals[field] = items.reduce((sum, item) => sum + (item[field] || 0), 0);
    });
    return totals;
  }
};

/**
 * CAMADA 4: Filtragem & Sorting
 */
export const filters = {
  // Por data
  byDateRange(items, field, from, to) {
    return items.filter(item => {
      const itemDate = new Date(item[field]);
      return itemDate >= from && itemDate <= to;
    });
  },

  // Por search term
  bySearchTerm(items, searchTerm, searchFields = ['nome', 'codigo_interno']) {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      searchFields.some(field =>
        (item[field]?.toString() || '').toLowerCase().includes(term)
      )
    );
  },

  // Por tags
  byTags(items, tags) {
    if (!tags || tags.length === 0) return items;
    return items.filter(item =>
      item.tags && Array.isArray(item.tags) &&
      tags.some(tag => item.tags.includes(tag))
    );
  },

  // Por range de valor
  byRange(items, field, min, max) {
    return items.filter(item => {
      const value = item[field];
      return value >= min && value <= max;
    });
  },

  // Sort por múltiplos campos
  sort(items, sortConfigs = []) {
    // sortConfigs: [{ field: 'nome', order: 'asc' }, ...]
    return [...items].sort((a, b) => {
      for (const config of sortConfigs) {
        const aVal = a[config.field];
        const bVal = b[config.field];

        let comparison = 0;
        if (typeof aVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else {
          comparison = (aVal || 0) - (bVal || 0);
        }

        if (comparison !== 0) {
          return config.order === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }
};

/**
 * PIPELINE COMPLETO: Extração → Transformação → Agregação
 */
export async function buildReportPipeline(baseClient, config = {}) {
  const {
    type,           // 'vendas', 'compras', 'estoque', 'financeiro'
    dateFrom,
    dateTo,
    groupBy,        // campo para agrupar
    searchTerm,
    tags,
    sortBy,         // [{ field, order }]
    limit = 1000
  } = config;

  let data = [];
  let raw = {};

  try {
    // EXTRAÇÃO
    switch (type) {
      case 'vendas':
        raw = await extraction.getSalesWithProducts(baseClient, {
          tipo: 'PDV'
        });
        
        // TRANSFORMAÇÃO
        data = raw.sales.flatMap(sale => {
          return sale.itens.map(item => {
            const product = raw.prodMap.get(item.produto_id);
            return {
              ...item,
              produto_nome: product?.nome || 'Desconhecido',
              categoria: product?.categoria_nome || 'Sem categoria',
              ...transforms.calculateSaleMetrics(item, product),
              created_date: sale.created_date,
              vendedor_id: sale.vendedor_id,
              vendedor_nome: sale.vendedor_nome
            };
          });
        });
        break;

      case 'compras':
        raw = await extraction.getPurchasesWithVendors(baseClient);
        
        data = raw.purchases.flatMap(purchase => {
          return purchase.itens.map(item => {
            const vendor = raw.vendorMap.get(purchase.fornecedor_id);
            return {
              ...item,
              fornecedor_nome: vendor?.nome || 'Desconhecido',
              ...transforms.calculateAcquisitionCost(item),
              created_date: purchase.created_date,
              status: purchase.status,
              data_aprovacao: purchase.data_aprovacao_financeira,
              data_despacho: purchase.data_despacho,
              data_chegada: purchase.data_chegada
            };
          });
        });
        break;

      case 'estoque':
        raw = await extraction.getStockMovements(baseClient);
        
        data = raw.movements.map(movement => {
          const product = raw.prodMap.get(movement.produto_id);
          return {
            ...movement,
            produto_nome: product?.nome || 'Desconhecido',
            estoque_atual: product?.estoque_atual || 0,
            estoque_minimo: product?.estoque_minimo || 0,
            dias_sem_movimento: transforms.calculateStockDays(movement.created_date),
            custo_estoque: (product?.estoque_atual || 0) * (product?.preco_custo_calculado || 0)
          };
        });
        break;

      case 'financeiro':
        raw = await extraction.getFinancialRecords(baseClient);
        
        data = raw.records.map(record => {
          const category = raw.catMap.get(record.categoria_id);
          return {
            ...record,
            categoria_nome: category?.nome || 'Sem categoria',
            dias_vencimento: record.data_vencimento ? 
              Math.floor((new Date(record.data_vencimento) - new Date()) / (1000 * 60 * 60 * 24)) : 
              null
          };
        });
        break;
    }

    // FILTRAGEM
    if (dateFrom && dateTo) {
      data = filters.byDateRange(data, 'created_date', new Date(dateFrom), new Date(dateTo));
    }
    
    if (searchTerm) {
      data = filters.bySearchTerm(data, searchTerm);
    }
    
    if (tags && tags.length > 0) {
      data = filters.byTags(data, tags);
    }

    // AGREGAÇÃO
    let result = data;
    if (groupBy) {
      const aggregatedGroups = aggregations.groupByAndAggregate(
        data,
        groupBy,
        {
          total: aggregations.aggregators.sum('total_recebido'),
          quantidade: aggregations.aggregators.sum('quantidade'),
          count: aggregations.aggregators.count()
        }
      );
      result = aggregatedGroups;
    }

    // SORTING
    if (sortBy && Array.isArray(sortBy)) {
      result = Array.isArray(result[0]?.items) 
        ? result // grouped
        : filters.sort(result, sortBy);
    }

    // LIMITE
    result = Array.isArray(result[0]?.items)
      ? result.slice(0, limit)
      : result.slice(0, limit);

    return {
      success: true,
      data: result,
      meta: {
        type,
        total_rows: data.length,
        filtered_rows: result.length,
        generated_at: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Report pipeline error:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

export default {
  extraction,
  transforms,
  aggregations,
  filters,
  buildReportPipeline
};