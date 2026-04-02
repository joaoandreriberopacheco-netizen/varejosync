import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function gerarBloco(tamanho = 3) {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let resultado = '';
  const array = new Uint32Array(tamanho);
  crypto.getRandomValues(array);

  for (let i = 0; i < tamanho; i++) {
    resultado += caracteres[array[i] % caracteres.length];
  }

  return resultado;
}

function gerarCodigoAleatorio() {
  return `${gerarBloco(3)}-${gerarBloco(3)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tipo } = await req.json();
    if (!tipo) return Response.json({ error: 'Parâmetro "tipo" obrigatório.' }, { status: 400 });

    const prefixMap = {
      PV: { entity: 'PedidoVenda', field: 'numero' },
      DT: { entity: 'DevolucaoTroca', field: 'numero' },
      VC: { entity: 'ValeCompra', field: 'codigo' },
      TC: { entity: 'TurnoCaixa', field: 'numero' },
      MCX: { entity: 'MovimentosCaixa', field: 'numero' },
      PC: { entity: 'PedidoCompra', field: 'numero' },
      CI: { entity: 'ConsumoInterno', field: 'numero' },
    };

    const config = prefixMap[tipo];
    if (!config) return Response.json({ error: `Tipo "${tipo}" não suportado.` }, { status: 400 });

    const registros = await base44.asServiceRole.entities[config.entity].list();
    const existentes = new Set(
      registros
        .map((registro) => String(registro?.[config.field] || '').trim().toUpperCase())
        .filter(Boolean)
    );

    for (let tentativa = 0; tentativa < 50; tentativa++) {
      const numero = gerarCodigoAleatorio();
      if (!existentes.has(numero)) {
        return Response.json({ numero });
      }
    }

    return Response.json({ error: 'Não foi possível gerar um identificador único.' }, { status: 500 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});