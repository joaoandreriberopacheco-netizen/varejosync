import { base44 } from '@/api/base44Client';
import { MOVIMENTO_STATUS_PAGAMENTO, MOVIMENTO_TIPOS, SITUACAO_FOLHA, competenciaEstaFechada, formatCompetenciaLabel } from '@/lib/folhaPrevisaoCalculos';
import {
  adicionarMovimento,
  garantirCompetencia,
  listarModelos,
} from '@/lib/folhaPrevisaoService';

/** Pessoas com modelo ativo na folha (para seleção de vale no fluxo). */
export async function listarPessoasFolhaParaVale() {
  const modelos = await listarModelos();
  return (modelos || [])
    .filter(
      (m) =>
        m.colaborador_id &&
        m.ativo !== false &&
        m.situacao !== SITUACAO_FOLHA.DESLIGADO,
    )
    .map((m) => ({
      id: m.id,
      colaborador_id: m.colaborador_id,
      nome: m.colaborador_nome || m.nome,
      tipo_vinculo: m.tipo_vinculo || 'funcionario',
    }))
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
}

export function lancamentoEhValeFolha(lancamento) {
  return Array.isArray(lancamento?.tags) && lancamento.tags.includes('vale_folha');
}

export function resolverStatusPagamentoVale(lancamento) {
  if (!lancamento) return MOVIMENTO_STATUS_PAGAMENTO.PENDENTE;
  if (lancamento.status === 'Cancelado') return MOVIMENTO_STATUS_PAGAMENTO.CANCELADO;
  if (lancamento.status === 'Pago' || lancamento.data_pagamento) {
    return MOVIMENTO_STATUS_PAGAMENTO.PAGO;
  }
  return MOVIMENTO_STATUS_PAGAMENTO.PENDENTE;
}

/**
 * Registra o vale na competência da folha após criar o lançamento no fluxo.
 * Falha silenciosa não — propaga erro para o dialog avisar.
 */
export async function registrarValeNoFolhaAposLancamento({
  modeloId,
  valor,
  data,
  lancamentoId,
  descricao,
  lancamentoPago = true,
}) {
  const modelo = await base44.entities.FolhaPrevisaoModelo.get(modeloId);
  if (!modelo?.colaborador_id) {
    throw new Error('Modelo da folha sem colaborador vinculado.');
  }

  const dataStr = String(data || '').slice(0, 10);
  const competencia = dataStr.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(competencia)) {
    throw new Error('Data inválida para registrar o vale na folha.');
  }

  const colaborador = {
    id: modelo.colaborador_id,
    nome: modelo.colaborador_nome || modelo.nome,
  };

  const comp = await garantirCompetencia({ colaborador, modelo, competencia });
  if (!comp) {
    throw new Error('Esta pessoa não está ativa na folha deste mês.');
  }
  if (competenciaEstaFechada(comp)) {
    throw new Error(
      `A folha de ${formatCompetenciaLabel(competencia)} já fechou. Vales só entram até o último dia do mês.`,
    );
  }

  await adicionarMovimento(comp.id, {
    tipo: MOVIMENTO_TIPOS.VALE,
    valor: Number(valor) || 0,
    data: dataStr,
    descricao: descricao || `Vale — ${colaborador.nome}`,
    referencia_id: lancamentoId || '',
    referencia_tipo: 'LancamentoFinanceiro',
    status_pagamento: lancamentoPago
      ? MOVIMENTO_STATUS_PAGAMENTO.PAGO
      : MOVIMENTO_STATUS_PAGAMENTO.PENDENTE,
  });

  return comp;
}

/**
 * Atualiza o status do vale na folha quando o lançamento financeiro muda
 * (ex.: marcar como pago no fluxo de caixa).
 */
export async function sincronizarValeFolhaComLancamento(lancamento) {
  if (!lancamentoEhValeFolha(lancamento) || !lancamento.id) return null;

  const competencia = (
    lancamento.data_vencimento ||
    lancamento.data_pagamento ||
    ''
  ).slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(competencia)) return null;

  const novoStatus = resolverStatusPagamentoVale(lancamento);
  const comps = await base44.entities.FolhaPrevisaoCompetencia.filter({ competencia });

  for (const comp of comps || []) {
    const movimentos = comp.movimentos || [];
    const idx = movimentos.findIndex(
      (m) =>
        m.referencia_id === lancamento.id &&
        m.referencia_tipo === 'LancamentoFinanceiro' &&
        m.tipo === MOVIMENTO_TIPOS.VALE,
    );
    if (idx === -1) continue;

    if (movimentos[idx].status_pagamento === novoStatus) return comp;

    const atualizados = [...movimentos];
    atualizados[idx] = { ...atualizados[idx], status_pagamento: novoStatus };
    return base44.entities.FolhaPrevisaoCompetencia.update(comp.id, { movimentos: atualizados });
  }

  return null;
}

export function montarTagsValeFolha(tagsBase, pessoa) {
  const set = new Set([...(tagsBase || []), 'vale_folha', 'folha_previsao']);
  set.add(pessoa?.tipo_vinculo === 'socio' ? 'folha_socio' : 'folha_funcionario');
  return Array.from(set);
}

export function descricaoPadraoVale(nome) {
  return `Vale — ${nome || 'colaborador'}`;
}
