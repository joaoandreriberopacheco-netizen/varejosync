import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Gera números sequenciais únicos para qualquer entidade/tipo de documento.
 * Uso: { tipo: 'PV' } → 'PV-00001'
 * Tipos suportados: PV (PedidoVenda), DT (DevolucaoTroca), VC (ValeCompra), TC (TurnoCaixa), MCX (MovimentosCaixa)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tipo } = await req.json();
    if (!tipo) return Response.json({ error: 'Parâmetro "tipo" obrigatório.' }, { status: 400 });

    const prefixMap = {
      PV: { entity: 'PedidoVenda', field: 'numero', prefix: 'PV' },
      DT: { entity: 'DevolucaoTroca', field: 'numero', prefix: 'DT' },
      VC: { entity: 'ValeCompra', field: 'codigo', prefix: 'VC' },
      TC: { entity: 'TurnoCaixa', field: 'numero', prefix: 'TC' },
      MCX: { entity: 'MovimentosCaixa', field: 'numero', prefix: 'MCX' },
      PC: { entity: 'PedidoCompra', field: 'numero', prefix: 'PC' },
      CI: { entity: 'ConsumoInterno', field: 'numero', prefix: 'CI' },
    };

    const config = prefixMap[tipo];
    if (!config) return Response.json({ error: `Tipo "${tipo}" não suportado.` }, { status: 400 });

    // Busca todos os registros e extrai o maior número
    const registros = await base44.asServiceRole.entities[config.entity].list();
    let maxNum = 0;
    for (const r of registros) {
      const val = r[config.field] || '';
      // Suporta prefixos como "PV-00001" ou "MCX-00001"
      const match = val.match(new RegExp(`^${config.prefix}-?(\\d+)$`));
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }

    const proximo = maxNum + 1;
    const numero = `${config.prefix}-${String(proximo).padStart(5, '0')}`;

    return Response.json({ numero, proximo });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});