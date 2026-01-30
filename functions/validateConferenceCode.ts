import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Valida um código de conferência e retorna os dados do manifesto
 * Muda o status para 'Em Uso' quando válido
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { codigo } = await req.json();

    if (!codigo || typeof codigo !== 'string') {
      return Response.json({ 
        error: 'Código de conferência obrigatório' 
      }, { status: 400 });
    }

    // Normaliza o código (uppercase, sem espaços)
    const codigoNormalizado = codigo.trim().toUpperCase();

    // Busca em Supermanifesto (volumes)
    const supermanifestos = await base44.asServiceRole.entities.Supermanifesto.filter({
      codigo_conferencia_volumes: codigoNormalizado
    });

    if (supermanifestos.length > 0) {
      const manifesto = supermanifestos[0];

      // Valida o status do código
      if (manifesto.status_codigo_conferencia_volumes === 'Expirado') {
        return Response.json({ 
          error: 'Código expirado. Solicite um novo código ao gestor logístico.',
          tipo: 'codigo_expirado'
        }, { status: 400 });
      }

      if (manifesto.status_codigo_conferencia_volumes === 'Concluído') {
        return Response.json({ 
          error: 'Este código já foi utilizado e a conferência foi concluída.',
          tipo: 'codigo_ja_usado'
        }, { status: 400 });
      }

      if (manifesto.status_codigo_conferencia_volumes !== 'Gerado' && 
          manifesto.status_codigo_conferencia_volumes !== 'Em Uso') {
        return Response.json({ 
          error: 'Código inválido ou não disponível para uso.',
          tipo: 'codigo_invalido'
        }, { status: 400 });
      }

      // Atualiza status para 'Em Uso' se ainda estava 'Gerado'
      if (manifesto.status_codigo_conferencia_volumes === 'Gerado') {
        await base44.asServiceRole.entities.Supermanifesto.update(manifesto.id, {
          status_codigo_conferencia_volumes: 'Em Uso'
        });
      }

      return Response.json({
        success: true,
        tipo: 'volumes',
        manifesto: {
          id: manifesto.id,
          numero: manifesto.numero,
          transportadora_nome: manifesto.transportadora_nome,
          eta: manifesto.eta,
          status: manifesto.status,
          peso_total_bruto_kg: manifesto.peso_total_bruto_kg,
          pedidos_vinculados: manifesto.pedidos_vinculados,
          observacoes_consolidadas: manifesto.observacoes_consolidadas
        },
        conferente: {
          id: user.id,
          nome: user.full_name || user.email
        }
      });
    }

    // Busca em ManifestoEntrada (itens)
    const manifestosEntrada = await base44.asServiceRole.entities.ManifestoEntrada.filter({
      codigo_conferencia_itens: codigoNormalizado
    });

    if (manifestosEntrada.length > 0) {
      const manifesto = manifestosEntrada[0];

      // Valida o status do código
      if (manifesto.status_codigo_conferencia_itens === 'Expirado') {
        return Response.json({ 
          error: 'Código expirado. Solicite um novo código ao gestor logístico.',
          tipo: 'codigo_expirado'
        }, { status: 400 });
      }

      if (manifesto.status_codigo_conferencia_itens === 'Concluído') {
        return Response.json({ 
          error: 'Este código já foi utilizado e a conferência foi concluída.',
          tipo: 'codigo_ja_usado'
        }, { status: 400 });
      }

      if (manifesto.status_codigo_conferencia_itens !== 'Gerado' && 
          manifesto.status_codigo_conferencia_itens !== 'Em Uso') {
        return Response.json({ 
          error: 'Código inválido ou não disponível para uso.',
          tipo: 'codigo_invalido'
        }, { status: 400 });
      }

      // Atualiza status para 'Em Uso' se ainda estava 'Gerado'
      if (manifesto.status_codigo_conferencia_itens === 'Gerado') {
        await base44.asServiceRole.entities.ManifestoEntrada.update(manifesto.id, {
          status_codigo_conferencia_itens: 'Em Uso'
        });
      }

      return Response.json({
        success: true,
        tipo: 'itens',
        manifesto: {
          id: manifesto.id,
          numero: manifesto.numero,
          pedido_numero: manifesto.pedido_numero,
          fornecedor_nome: manifesto.fornecedor_nome,
          supermanifesto_id: manifesto.supermanifesto_id,
          status: manifesto.status,
          itens_esperados: manifesto.itens_esperados
        },
        conferente: {
          id: user.id,
          nome: user.full_name || user.email
        }
      });
    }

    // Código não encontrado
    return Response.json({ 
      error: 'Código de conferência não encontrado. Verifique se digitou corretamente.',
      tipo: 'codigo_nao_encontrado'
    }, { status: 404 });

  } catch (error) {
    console.error('Erro ao validar código de conferência:', error);
    return Response.json({ 
      error: error.message || 'Erro ao validar código de conferência' 
    }, { status: 500 });
  }
});