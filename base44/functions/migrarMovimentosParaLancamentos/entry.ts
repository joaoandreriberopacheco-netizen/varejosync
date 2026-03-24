import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Gera um UUID simples
function gerarId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    // Buscar todos os movimentos de caixa
    const movimentos = await base44.asServiceRole.entities.MovimentosCaixa.list();
    const contas = await base44.asServiceRole.entities.ContasFinanceiras.list();
    const caixaGeral = contas.find(c => c.is_caixa_geral);
    
    let criados = 0;
    let erros = [];
    
    for (const mov of movimentos) {
      try {
        // Verificar se já existe lançamento para este movimento
        const existentes = await base44.asServiceRole.entities.LancamentoFinanceiro.filter({
          referencia_tipo: 'MovimentosCaixa',
          referencia_id: mov.id
        });
        
        if (existentes.length > 0) {
          continue; // Já migrado
        }
        
        const contaOrigem = contas.find(c => c.id === mov.conta_id);
        if (!contaOrigem) {
          erros.push(`Conta não encontrada para movimento ${mov.numero}`);
          continue;
        }
        
        const grupoId = gerarId();
        const dataMov = mov.created_date ? mov.created_date.split('T')[0] : new Date().toISOString().split('T')[0];
        
        if (mov.tipo === 'Reforço') {
          // Reforço: entrada na conta
          await base44.asServiceRole.entities.LancamentoFinanceiro.create({
            tipo: 'Receita',
            descricao: `Reforço de caixa - ${mov.numero}`,
            valor: mov.valor,
            conta_financeira_id: contaOrigem.id,
            conta_financeira_nome: contaOrigem.nome,
            data_vencimento: dataMov,
            data_pagamento: dataMov,
            status: 'Pago',
            forma_pagamento_tipo: 'Dinheiro',
            referencia_tipo: 'MovimentosCaixa',
            referencia_id: mov.id,
            referencia_numero: mov.numero,
            observacoes: mov.observacao || '',
            grupo_lancamento_id: grupoId,
            turno_caixa_id: mov.turno_caixa_id,
          });
          criados++;
          
        } else if (mov.tipo === 'Sangria' || mov.tipo === 'Recolhimento de Caixa') {
          // Recolhimento: saída na origem + entrada no destino
          const descricao = `Recolhimento de caixa - ${mov.numero}`;
          
          // Saída
          await base44.asServiceRole.entities.LancamentoFinanceiro.create({
            tipo: 'Despesa',
            descricao: descricao,
            valor: mov.valor,
            conta_financeira_id: contaOrigem.id,
            conta_financeira_nome: contaOrigem.nome,
            data_vencimento: dataMov,
            data_pagamento: dataMov,
            status: 'Pago',
            forma_pagamento_tipo: 'Dinheiro',
            referencia_tipo: 'MovimentosCaixa',
            referencia_id: mov.id,
            referencia_numero: mov.numero,
            observacoes: mov.observacao ? `Saída: ${mov.observacao}` : '',
            grupo_lancamento_id: grupoId,
            turno_caixa_id: mov.turno_caixa_id,
          });
          
          // Entrada no Caixa Geral (se diferente)
          if (caixaGeral && caixaGeral.id !== contaOrigem.id) {
            await base44.asServiceRole.entities.LancamentoFinanceiro.create({
              tipo: 'Receita',
              descricao: descricao,
              valor: mov.valor,
              conta_financeira_id: caixaGeral.id,
              conta_financeira_nome: caixaGeral.nome,
              data_vencimento: dataMov,
              data_pagamento: dataMov,
              status: 'Pago',
              forma_pagamento_tipo: 'Dinheiro',
              referencia_tipo: 'MovimentosCaixa',
              referencia_id: mov.id,
              referencia_numero: mov.numero,
              observacoes: mov.observacao ? `Entrada: ${mov.observacao}` : '',
              grupo_lancamento_id: grupoId,
              turno_caixa_id: mov.turno_caixa_id,
            });
          }
          criados++;
        }
      } catch (e) {
        erros.push(`Erro no movimento ${mov.numero}: ${e.message}`);
      }
    }
    
    return Response.json({ 
      sucesso: true, 
      totalMovimentos: movimentos.length,
      lancamentosCriados: criados,
      erros: erros.length > 0 ? erros : null
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});