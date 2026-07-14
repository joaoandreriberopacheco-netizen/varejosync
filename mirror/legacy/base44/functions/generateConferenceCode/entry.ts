import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Gera um código alfanumérico único para conferência cega
 * Tipo: 'volumes' para Supermanifesto, 'itens' para ManifestoEntrada
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apenas admin e gerente podem gerar códigos
    if (user.role !== 'admin' && user.perfil !== 'Gerente') {
      return Response.json({ 
        error: 'Forbidden: Apenas gestores podem gerar códigos de conferência' 
      }, { status: 403 });
    }

    const { tipo, manifesto_id } = await req.json();

    if (!tipo || !manifesto_id) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: tipo e manifesto_id' 
      }, { status: 400 });
    }

    if (!['volumes', 'itens'].includes(tipo)) {
      return Response.json({ 
        error: 'Tipo inválido. Use "volumes" ou "itens"' 
      }, { status: 400 });
    }

    // Gera código alfanumérico de 8 caracteres
    const generateCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Remove caracteres confusos (I, O, 0, 1)
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let codigo = generateCode();
    let tentativas = 0;
    const maxTentativas = 10;

    // Garante que o código é único verificando na entidade apropriada
    while (tentativas < maxTentativas) {
      const entityName = tipo === 'volumes' ? 'Supermanifesto' : 'ManifestoEntrada';
      const campocodigo = tipo === 'volumes' ? 'codigo_conferencia_volumes' : 'codigo_conferencia_itens';
      
      const existing = await base44.asServiceRole.entities[entityName].filter({
        [campocodigo]: codigo
      });

      if (existing.length === 0) {
        break;
      }

      codigo = generateCode();
      tentativas++;
    }

    if (tentativas >= maxTentativas) {
      return Response.json({ 
        error: 'Não foi possível gerar código único. Tente novamente.' 
      }, { status: 500 });
    }

    // Atualiza o manifesto com o novo código e invalida o anterior
    const updateData = {};
    
    if (tipo === 'volumes') {
      updateData.codigo_conferencia_volumes = codigo;
      updateData.status_codigo_conferencia_volumes = 'Gerado';
      
      await base44.asServiceRole.entities.Supermanifesto.update(manifesto_id, updateData);
    } else {
      updateData.codigo_conferencia_itens = codigo;
      updateData.status_codigo_conferencia_itens = 'Gerado';
      
      await base44.asServiceRole.entities.ManifestoEntrada.update(manifesto_id, updateData);
    }

    return Response.json({
      success: true,
      codigo,
      tipo,
      manifesto_id,
      gerado_por: user.full_name || user.email,
      gerado_em: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao gerar código de conferência:', error);
    return Response.json({ 
      error: error.message || 'Erro ao gerar código de conferência' 
    }, { status: 500 });
  }
});