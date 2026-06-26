import { base44 } from '@/api/base44Client';
import { MOVIMENTO_TIPOS, SITUACAO_FOLHA } from '@/lib/folhaPrevisaoCalculos';
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

  await adicionarMovimento(comp.id, {
    tipo: MOVIMENTO_TIPOS.VALE,
    valor: Number(valor) || 0,
    data: dataStr,
    descricao: descricao || `Vale — ${colaborador.nome}`,
    referencia_id: lancamentoId || '',
    referencia_tipo: 'LancamentoFinanceiro',
  });

  return comp;
}

export function montarTagsValeFolha(tagsBase, pessoa) {
  const set = new Set([...(tagsBase || []), 'vale_folha', 'folha_previsao']);
  set.add(pessoa?.tipo_vinculo === 'socio' ? 'folha_socio' : 'folha_funcionario');
  return Array.from(set);
}

export function descricaoPadraoVale(nome) {
  return `Vale — ${nome || 'colaborador'}`;
}
