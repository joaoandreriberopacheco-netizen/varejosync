/**
 * Diagnóstico legível para ficha IEP / ABCD do produto (cálculo ao vivo no catálogo).
 */

const CLASSE_LABEL = {
  A: 'Classe A — entre os que mais geram lucro no subtipo (nível 2)',
  B: 'Classe B — relevância intermediária-alta',
  C: 'Classe C — relevância intermediária-baixa',
  D: 'Classe D — menor contribuição de lucro no período',
};

const PERFIL_LABEL = {
  TOP: 'TOP — desempenho forte com boa consistência',
  ESP: 'ESP — resultado pontual (esporádico), precisa maturar',
  NEU: 'NEU — comportamento neutro no período',
  CAR: 'CAR — baixa energia com evidência consistente',
};

const CONFIANCA_LABEL = {
  '++': 'Amostra robusta',
  '+': 'Amostra suficiente',
  '-': 'Amostra fraca',
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
        'Ainda não há classificação para este item. Isso costuma acontecer quando não houve venda nos últimos 90 dias. Abra o catálogo de produtos para o sistema recalcular automaticamente.',
    };
  }

  const classeEfetiva = classe || 'D';

  if (classeEfetiva === 'A' && iep >= 70) {
    return {
      temDados: true,
      titulo: 'Destaque estratégico',
      texto:
        'Este item está entre os que mais geram lucro no subtipo e apresenta bom desempenho individual. Vale proteger estoque, manter visibilidade e usar o volume para negociar com fornecedores.',
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

export function gerarLaudoProdutoIep(produto) {
  const score = Number(produto?.iep_score);
  const scoreBase = Number(produto?.iep_score_base);
  const scoreExibicao = String(produto?.iep_score_exibicao || '').trim();
  const confiancaIndice = Number(produto?.iep_confianca_indice);
  const confiancaSimbolo = String(produto?.iep_confianca_simbolo || '').trim();
  const perfil = String(produto?.iep_codigo_comportamento || '').toUpperCase().trim();
  const qtdVitrine = Number(produto?.iep_quantidade_vitrine_90d);
  const unVitrine = String(produto?.iep_unidade_vitrine || '').trim();
  const mediaSubtipo = Number(produto?.iep_score_nivel_2);

  if (!Number.isFinite(score) || score <= 0) {
    return {
      disponivel: false,
      resumo: 'Sem vendas elegíveis no período de 90 dias para gerar laudo.',
      pontos: [],
    };
  }

  const pontos = [];
  pontos.push(`IEP atual: ${scoreExibicao || `${Math.round(score)}${confiancaSimbolo}`}.`);
  if (Number.isFinite(scoreBase) && scoreBase > 0) {
    pontos.push(`Score base (antes da confiança): ${Math.round(scoreBase)}.`);
  }
  if (Number.isFinite(confiancaIndice)) {
    const lbl = CONFIANCA_LABEL[confiancaSimbolo] || 'Confiabilidade sem faixa';
    pontos.push(`Confiabilidade: ${Math.round(confiancaIndice)} (${lbl}).`);
  }
  if (perfil) {
    pontos.push(`Perfil comportamental: ${PERFIL_LABEL[perfil] || perfil}.`);
  }
  if (Number.isFinite(qtdVitrine) && qtdVitrine > 0 && unVitrine) {
    pontos.push(`Movimento 90d em vitrine: ${qtdVitrine.toLocaleString('pt-BR')} ${unVitrine}.`);
  }
  if (Number.isFinite(mediaSubtipo) && mediaSubtipo > 0) {
    const delta = Math.round(score - mediaSubtipo);
    const sinal = delta > 0 ? '+' : '';
    pontos.push(`Comparação com média do subtipo: ${Math.round(mediaSubtipo)} (${sinal}${delta} pontos).`);
  }

  return {
    disponivel: true,
    resumo: 'Laudo gerado com base no comportamento de vendas dos últimos 90 dias.',
    pontos,
  };
}
