import { base44 } from '@/api/base44Client';

// Gera um UUID simples (sem dependências externas)
function gerarId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Processa um movimento de caixa e gera lançamentos financeiros correspondentes
 * Para Reforço: entrada na conta origem
 * Para Recolhimento: saída na conta origem + entrada na conta destino (duplo)
 */
export async function processarMovimentoCaixa(movimento, contaOrigem, contaDestino = null) {
  try {
    const grupoId = gerarId(); // Agrupa os lançamentos para rastreabilidade
    const agora = new Date().toISOString();

    if (movimento.tipo === 'Reforço') {
      // Reforço: apenas entrada na conta
      const lancamento = {
        tipo: 'Receita',
        descricao: `Reforço de caixa - ${movimento.numero}`,
        valor: movimento.valor,
        conta_financeira_id: contaOrigem.id,
        conta_financeira_nome: contaOrigem.nome,
        data_vencimento: agora.split('T')[0],
        data_pagamento: agora.split('T')[0],
        status: 'Pago',
        forma_pagamento_tipo: 'Dinheiro',
        referencia_tipo: 'MovimentosCaixa',
        referencia_id: movimento.id,
        referencia_numero: movimento.numero,
        observacoes: movimento.observacao || '',
        grupo_lancamento_id: grupoId,
        turno_caixa_id: movimento.turno_caixa_id,
      };
      await base44.entities.LancamentoFinanceiro.create(lancamento);
    } else if (movimento.tipo === 'Sangria' || movimento.tipo === 'Recolhimento de Caixa') {
      // DESATIVADO: Recolhimentos NÃO criam mais lançamentos financeiros
      // O MovimentosCaixa é o único registro de controle
      // Nenhum lançamento é criado aqui
    }

    return { sucesso: true, grupoId };
  } catch (e) {
    console.error('Erro ao processar movimento de caixa:', e);
    throw e;
  }
}