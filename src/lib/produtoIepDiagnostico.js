/**
 * Diagnóstico legível para ficha IEP / ABCD do produto (job calcularIEP V8).
 */

const CLASSE_LABEL = {
  A: 'Classe A — entre os que mais geram lucro no subtipo (nível 2 da descrição)',
  B: 'Classe B — relevância intermediária-alta',
  C: 'Classe C — relevância intermediária-baixa',
  D: 'Classe D — menor contribuição de lucro no período',
};

export function produtoTemMetricasIep(produto) {
  if (!produto?.id) return false;
  const classe = String(produto.abcd || produto.iep_classe || '').toUpperCase();
  const score = produto?.iep_score;
  return Boolean(classe) && score != null && Number.isFinite(Number(score));
}

export function gerarDiagnosticoProdutoIep(produto) {
  const classe = String(produto?.abcd || produto?.iep_classe || '').toUpperCase() || null;
  const iep = produto?.iep_score != null ? Number(produto.iep_score) : null;

  if (!produto?.id) {
    return {
      temDados: false,
      titulo: 'Produto ainda não salvo',
      texto: 'Salve o cadastro primeiro. Depois que houver vendas nos últimos 90 dias, o sistema poderá calcular a classificação.',
    };
  }

  if (!classe && (iep == null || !Number.isFinite(iep))) {
    return {
      temDados: false,
      titulo: 'Sem análise disponível',
      texto:
        'Ainda não há classificação para este item. Isso costuma acontecer quando não houve venda nos últimos 90 dias ou o cálculo automático ainda não rodou. Peça para atualizar com o processo «calcular IEP» (job diário ou manual).',
    };
  }

  const classeEfetiva = classe || 'D';

  if (classeEfetiva === 'A' && iep >= 70) {
    return {
      temDados: true,
      titulo: 'Destaque estratégico',
      texto:
        'Este item está entre os que mais geram lucro no subtipo (nível 2) e apresenta bom desempenho individual. Vale proteger estoque, manter visibilidade e usar o volume para negociar com fornecedores.',
    };
  }
  if (classeEfetiva === 'A' && iep < 50) {
    return {
      temDados: true,
      titulo: 'Volume forte, lucro apertado',
      texto:
        'O subtipo vende bem no conjunto, mas este SKU rende pouco por unidade. Revise custo de compra, preço de venda ou mix — o volume alto pode estar comprimindo a margem.',
    };
  }
  if ((classeEfetiva === 'C' || classeEfetiva === 'D') && iep >= 70) {
    return {
      temDados: true,
      titulo: 'Oportunidade em crescimento',
      texto:
        'O grupo ainda não é dos maiores geradores de lucro, mas este SKU se sai bem nas vendas recentes. Pode valer exposição extra no PDV ou campanhas pontuais.',
    };
  }
  if ((classeEfetiva === 'C' || classeEfetiva === 'D') && iep < 50) {
    return {
      temDados: true,
      titulo: 'Baixa prioridade',
      texto:
        'Pouco lucro no período e desempenho fraco. Avalie se mantém no mix, reduz estoque ou descontinua para liberar capital e espaço.',
    };
  }
  if (classeEfetiva === 'B') {
    return {
      temDados: true,
      titulo: 'Eixo operacional',
      texto:
        iep >= 70
          ? 'Item intermediário com bom equilíbrio. Mantenha disciplina de estoque e preço; com ações pontuais pode subir para classe A.'
          : 'Volume intermediário com rentabilidade modesta. Acompanhe preço e custo antes de investir mais capital em estoque.',
    };
  }

  return {
    temDados: true,
    titulo: 'Desempenho estável',
    texto:
      CLASSE_LABEL[classeEfetiva] ||
      'Classificação calculada com base nas vendas dos últimos 90 dias, excluindo vendas atípicas de preço muito alto.',
  };
}

export function rotuloClasseAbcd(classe) {
  const c = String(classe || '').toUpperCase();
  return CLASSE_LABEL[c] || 'Sem classe definida';
}

export function tonalidadeClasseAbcd(classe) {
  const c = String(classe || '').toUpperCase();
  if (c === 'A') return 'success';
  if (c === 'B') return 'info';
  if (c === 'C') return 'warning';
  return 'muted';
}
