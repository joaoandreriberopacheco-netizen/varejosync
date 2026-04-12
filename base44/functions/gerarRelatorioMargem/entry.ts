import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Backend Function: Gerar Relatório de Margem
 * 
 * Pipeline de relatório: extrai vendas, calcula markups e margens,
 * agrupa por categoria e retorna dados transformados prontos para frontend.
 * 
 * Query Params:
 * - dateFrom, dateTo (ISO strings)
 * - groupBy (category, vendedor, etc)
 * - sortBy (comma-separated field:order)
 * - limit (max rows)
 * - tags (comma-separated)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const groupBy = url.searchParams.get('groupBy') || 'produto_id';
    const sortByStr = url.searchParams.get('sortBy') || 'lucro_total:desc';
    const tagsStr = url.searchParams.get('tags');
    const limit = parseInt(url.searchParams.get('limit') || '1000');

    // Parse sortBy
    const sortBy = sortByStr.split(',').map(s => {
      const [field, order] = s.split(':');
      return { field, order: order || 'desc' };
    });

    const tags = tagsStr ? tagsStr.split(',') : [];

    // EXTRAÇÃO
    console.log('🔄 [EXTRAÇÃO] Carregando vendas e produtos...');
    const sales = await base44.entities.PedidoVenda.filter({ tipo: 'PDV' });
    const products = await base44.entities.Produto.list();
    const prodMap = new Map(products.map(p => [p.id, p]));

    // TRANSFORMAÇÃO
    console.log('⚙️ [TRANSFORMAÇÃO] Calculando markups e margens...');
    const expandedItems = [];

    sales.forEach(sale => {
      const saleDate = new Date(sale.created_date);
      
      // Filtra por data se fornecido
      if (dateFrom && saleDate < new Date(dateFrom)) return;
      if (dateTo && saleDate > new Date(dateTo)) return;

      sale.itens?.forEach(item => {
        const product = prodMap.get(item.produto_id);
        if (!product) return;

        const unitCost = product.preco_custo_calculado || 0;
        const totalCost = unitCost * item.quantidade;
        const profit = item.total - totalCost;
        const markup = totalCost > 0 ? (profit / totalCost) * 100 : 0;
        const margin = item.total > 0 ? (profit / item.total) * 100 : 0;

        expandedItems.push({
          produto_id: item.produto_id,
          codigo_interno: product.codigo_interno,
          nome: product.nome,
          categoria_nome: product.categoria_nome || 'Sem categoria',
          tags: product.tags || [],
          quantidade: item.quantidade,
          preco_unitario_praticado: item.preco_unitario_praticado,
          total_recebido: item.total,
          custo_unitario: unitCost,
          custo_total: totalCost,
          lucro_total: profit,
          lucro_unitario: profit / item.quantidade,
          markup_percentual: markup,
          margem_percentual: margin,
          created_date: sale.created_date,
          vendedor_id: sale.vendedor_id,
          vendedor_nome: sale.vendedor_nome
        });
      });
    });

    // FILTRAGEM por tags
    let filtered = expandedItems;
    if (tags.length > 0) {
      filtered = filtered.filter(item =>
        item.tags && item.tags.some(tag => tags.includes(tag))
      );
    }

    // AGREGAÇÃO por categoria (se solicitado)
    let result = filtered;
    if (groupBy === 'categoria') {
      console.log('📊 [AGREGAÇÃO] Agrupando por categoria...');
      const grouped = new Map();

      filtered.forEach(item => {
        const cat = item.categoria_nome;
        if (!grouped.has(cat)) {
          grouped.set(cat, {
            categoria: cat,
            items: [],
            totals: {
              quantidade: 0,
              total_recebido: 0,
              custo_total: 0,
              lucro_total: 0
            }
          });
        }

        const group = grouped.get(cat);
        group.items.push(item);
        group.totals.quantidade += item.quantidade;
        group.totals.total_recebido += item.total_recebido;
        group.totals.custo_total += item.custo_total;
        group.totals.lucro_total += item.lucro_total;
      });

      result = Array.from(grouped.values());
    }

    // SORTING
    if (sortBy.length > 0 && !groupBy === 'categoria') {
      result = result.sort((a, b) => {
        for (const sort of sortBy) {
          const aVal = a[sort.field] || 0;
          const bVal = b[sort.field] || 0;

          let comparison = 0;
          if (typeof aVal === 'string') {
            comparison = aVal.localeCompare(bVal);
          } else {
            comparison = aVal - bVal;
          }

          if (comparison !== 0) {
            return sort.order === 'desc' ? -comparison : comparison;
          }
        }
        return 0;
      });
    }

    // LIMITE
    result = result.slice(0, limit);

    // CÁLCULO DE TOTAIS
    const totals = {
      quantidade: 0,
      total_recebido: 0,
      custo_total: 0,
      lucro_total: 0
    };

    if (groupBy === 'categoria') {
      result.forEach(group => {
        totals.quantidade += group.totals.quantidade;
        totals.total_recebido += group.totals.total_recebido;
        totals.custo_total += group.totals.custo_total;
        totals.lucro_total += group.totals.lucro_total;
      });
    } else {
      filtered.forEach(item => {
        totals.quantidade += item.quantidade;
        totals.total_recebido += item.total_recebido;
        totals.custo_total += item.custo_total;
        totals.lucro_total += item.lucro_total;
      });
    }

    const totalMarkup = totals.custo_total > 0 
      ? (totals.lucro_total / totals.custo_total) * 100 
      : 0;
    const totalMargin = totals.total_recebido > 0 
      ? (totals.lucro_total / totals.total_recebido) * 100 
      : 0;

    console.log(`✅ [CONCLUÍDO] ${result.length} registros processados`);

    return Response.json({
      success: true,
      data: result,
      totals: {
        ...totals,
        markup_percentual: totalMarkup,
        margem_percentual: totalMargin
      },
      meta: {
        rows: result.length,
        generated_at: new Date().toISOString(),
        filters: {
          dateFrom,
          dateTo,
          groupBy,
          tags
        }
      }
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});