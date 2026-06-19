/**
 * Conta financeira de destino para receitas de cartão (maquininha).
 * Nunca deve cair no Caixa PDV — mesmo comportamento do PIX na conta configurada.
 */
export async function resolveContaDestinoCartao(base44, pag) {
  let contaDestinoId = pag.maquininha_conta_id || null;
  let contaDestinoNome = pag.maquininha_conta_nome || pag.maquininha_nome || 'Maquininha';

  if (!contaDestinoId && pag.maquininha_id) {
    try {
      const maq = await base44.entities.Maquininha.get(pag.maquininha_id);
      if (maq?.conta_destino_id) {
        contaDestinoId = maq.conta_destino_id;
        contaDestinoNome = maq.conta_destino_nome || maq.nome || contaDestinoNome;
      }
    } catch {
      /* maquininha não encontrada */
    }
  }

  if (!contaDestinoId) {
    throw new Error(
      `Maquininha "${pag.maquininha_nome || 'sem nome'}" sem conta destino. ` +
        'Configure em Configurações → Maquininhas (ex.: Banco do Brasil).'
    );
  }

  return { id: contaDestinoId, nome: contaDestinoNome };
}

/** Lê maquininha_id do JSON em observacoes (lançamentos já gravados). */
export function parseMaquininhaIdFromLancamento(l) {
  if (!l?.observacoes) return null;
  try {
    const obs = typeof l.observacoes === 'string' ? JSON.parse(l.observacoes) : l.observacoes;
    return obs?.maquininha_id || null;
  } catch {
    return null;
  }
}
