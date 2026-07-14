/**
 * Automação Agendada: Todo 1º dia do mês, gera ContasPrevistas 
 * a partir de ContasRecorrentes ativas para os próximos 3 meses
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Busca todas as ContasRecorrentes ativas
    const recorrentes = await base44.asServiceRole.entities.ContaRecorrente.filter({ ativa: true }, '-created_date', 1000);

    if (!recorrentes || recorrentes.length === 0) {
      return Response.json({ message: 'Nenhuma conta recorrente ativa' });
    }

    let geradas = 0;
    const hoje = new Date();

    for (const recorrencia of recorrentes) {
      // Gera para os próximos 3 meses
      for (let i = 0; i < 3; i++) {
        const dataRef = new Date();
        dataRef.setMonth(dataRef.getMonth() + i);

        // Cria data de vencimento
        const vencimento = new Date(dataRef.getFullYear(), dataRef.getMonth(), recorrencia.dia_vencimento);

        // Verifica se já existe ContaPrevista para este período
        const existentes = await base44.asServiceRole.entities.ContaPrevista.filter({
          conta_recorrente_id: recorrencia.id,
          periodo_referencia: new Date(dataRef.getFullYear(), dataRef.getMonth(), 1)
            .toISOString()
            .split('T')[0]
        });

        if (existentes && existentes.length > 0) {
          continue; // Já existe, pula
        }

        // Cria nova ContaPrevista
        await base44.asServiceRole.entities.ContaPrevista.create({
          descricao: recorrencia.nome_despesa,
          terceiro_id: recorrencia.terceiro_id,
          terceiro_nome: recorrencia.terceiro_nome,
          categoria_financeira_id: recorrencia.categoria_financeira_id,
          categoria_nome: recorrencia.categoria_nome,
          valor: recorrencia.valor_previsto,
          data_vencimento: vencimento.toISOString().split('T')[0],
          natureza: 'Recorrente',
          conta_recorrente_id: recorrencia.id,
          periodo_referencia: new Date(dataRef.getFullYear(), dataRef.getMonth(), 1)
            .toISOString()
            .split('T')[0],
          status: 'Pendente',
          tem_anexo: false,
          tem_boleto: false,
          tem_comprovante: false,
          status_visual: 'pendente'
        });

        geradas++;
      }
    }

    return Response.json({
      success: true,
      message: `${geradas} contas previstas geradas com sucesso`
    });
  } catch (error) {
    console.error('Erro ao gerar contas previstas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});