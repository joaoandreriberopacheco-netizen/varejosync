import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Gera números sequenciais únicos com proteção contra race condition.
 * Uso: { tipo: 'PV' } → 'PV-00001'
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tipo } = await req.json();
    if (!tipo) return Response.json({ error: 'Parâmetro "tipo" obrigatório.' }, { status: 400 });

    const prefixMap = {
      PV:  { entity: 'PedidoVenda',      field: 'numero',  prefix: 'PV'  },
      DT:  { entity: 'DevolucaoTroca',   field: 'numero',  prefix: 'DT'  },
      VC:  { entity: 'ValeCompra',       field: 'codigo',  prefix: 'VC'  },
      TC:  { entity: 'TurnoCaixa',       field: 'numero',  prefix: 'TC'  },
      MCX: { entity: 'MovimentosCaixa',  field: 'numero',  prefix: 'MCX' },
      PC:  { entity: 'PedidoCompra',     field: 'numero',  prefix: 'PC'  },
      CI:  { entity: 'ConsumoInterno',   field: 'numero',  prefix: 'CI'  },
    };

    const config = prefixMap[tipo];
    if (!config) return Response.json({ error: `Tipo "${tipo}" não suportado.` }, { status: 400 });

    // Retry loop: tenta até 10 vezes para resolver race conditions
    for (let tentativa = 0; tentativa < 10; tentativa++) {
      // Pequeno jitter aleatório para reduzir colisões em picos de concorrência
      if (tentativa > 0) {
        await new Promise(r => setTimeout(r, 50 + Math.random() * 100 * tentativa));
      }

      // Busca todos os registros e acha o maior número existente
      const registros = await base44.asServiceRole.entities[config.entity].list();
      const regex = new RegExp(`^${config.prefix}-?(\\d+)$`);
      let maxNum = 0;
      for (const r of registros) {
        const val = r[config.field] || '';
        const match = val.match(regex);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > maxNum) maxNum = n;
        }
      }

      const proximo = maxNum + 1;
      const numero = `${config.prefix}-${String(proximo).padStart(5, '0')}`;

      // Verificação de unicidade: confirma que o número ainda não existe
      const jaExiste = registros.some(r => r[config.field] === numero);
      if (!jaExiste) {
        return Response.json({ numero, proximo });
      }

      // Se já existe (outro processo criou no mesmo instante), tenta novamente
      console.warn(`[gerarNumeroSequencial] Colisão detectada para ${numero}, tentativa ${tentativa + 1}`);
    }

    // Fallback: usa timestamp para garantir unicidade em último caso
    const fallback = `${tipo}-T${Date.now()}`;
    console.error(`[gerarNumeroSequencial] Fallback ativado após 10 tentativas: ${fallback}`);
    return Response.json({ numero: fallback, proximo: -1 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});