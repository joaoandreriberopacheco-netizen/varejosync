/**
 * Automação de Entidade: Quando ContaPrevista vira "Pago", 
 * cria automaticamente um LancamentoFinanceiro correspondente
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Só processa se mudou para status "Pago"
    if (data.status !== 'Pago' || old_data?.status === 'Pago') {
      return Response.json({ skipped: true });
    }

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verifica se já existe um lançamento para esta conta prevista
    const existentes = await base44.entities.LancamentoFinanceiro.filter({
      referencia_tipo: 'ContaPrevista',
      referencia_id: data.id
    });

    if (existentes && existentes.length > 0) {
      return Response.json({ skipped: true, reason: 'LancamentoFinanceiro já existe' });
    }

    // Cria LancamentoFinanceiro
    await base44.entities.LancamentoFinanceiro.create({
      tipo: 'Despesa', // ajuste conforme sua lógica
      descricao: data.descricao,
      terceiro_id: data.terceiro_id,
      terceiro_nome: data.terceiro_nome,
      valor: data.valor,
      valor_liquido: data.valor,
      data_vencimento: data.data_vencimento,
      data_pagamento: new Date().toISOString().split('T')[0],
      status: 'Pago',
      categoria_id: data.categoria_financeira_id,
      categoria: data.categoria_nome,
      referencia_tipo: 'ContaPrevista',
      referencia_id: data.id,
      // Você pode ajustar conta_financeira_id se necessário
      conta_financeira_id: 'caixa_geral' // ou obter dinamicamente
    });

    return Response.json({ 
      success: true, 
      message: 'LancamentoFinanceiro criado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao sincronizar ContaPrevista:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});