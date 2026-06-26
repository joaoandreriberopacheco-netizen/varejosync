/**
 * Guia canónica A–J para classificação automática de produtos no catálogo.
 * Usada pelo MassCategoryClassifier (InvokeLLM + categoria_id / categoria_nome).
 */

export const CLASSIFY_MODES = {
  ONLY_WITHOUT_CATEGORY: 'only_without_category',
  RECLASSIFY_ALL: 'reclassify_all',
};

export const CANONICAL_CATALOG_CATEGORIES = [
  {
    codigo: 'A',
    nome: 'Materiais Básicos',
    logica: 'A base bruta e estrutural da obra.',
    referencias: 'Areia, seixo, blocos, vergalhão, argamassas (AC1, AC2, AC3), cimento.',
  },
  {
    codigo: 'B',
    nome: 'Coberturas e Forros',
    logica: 'Fechamento superior da obra (fase que segue a estrutura básica).',
    referencias: 'Telhas, compensados, forro de PVC e acessórios de fixação/acabamento (perfis, emendas, cantoneiras).',
  },
  {
    codigo: 'C',
    nome: 'Hidráulica Bruta',
    logica: 'Tubulação e conexões de água e esgoto embutidas (infraestrutura).',
    referencias: 'Tubos (PVC, CPVC, PPR), conexões (joelhos, tês, luvas), caixas sifonadas, registros de gaveta, caixas de inspeção.',
  },
  {
    codigo: 'D',
    nome: 'Elétrica Bruta',
    logica: 'Fiação e passagem de energia embutida na alvenaria ou forro (infraestrutura).',
    referencias: 'Fios, cabos elétricos, caixinhas de luz (4x2, 4x4), conduítes, eletrodutos, quadros de distribuição, disjuntores.',
  },
  {
    codigo: 'E',
    nome: 'Pisos e Revestimentos',
    logica: 'Acabamentos de superfícies (chão e paredes).',
    referencias: 'Cerâmicas, porcelanatos, pastilhas, rodapés, soleiras, rejuntes. Argamassas de assentamento ficam na categoria A.',
  },
  {
    codigo: 'F',
    nome: 'Esquadrias e Ferragens',
    logica: 'Aberturas e sistemas de fechamento e segurança.',
    referencias: 'Portas, janelas, portões, batentes, fechaduras, dobradiças, cadeados, armários e gabinetes de cozinha/banheiro.',
  },
  {
    codigo: 'G',
    nome: 'Pintura e Químicos',
    logica: 'Preparação de superfícies, vedação e estética visual fina.',
    referencias: 'Tintas, massas (corrida/acrílica), vernizes, solventes, impermeabilizantes, mantas líquidas, silicone e colas químicas (PU).',
  },
  {
    codigo: 'H',
    nome: 'Acabamentos para Áreas Molhadas',
    logica: 'Louças, metais, equipamentos e acessórios aparentes em ambientes com água (cozinhas, banheiros, lavabos, lavanderias, jardineiras/áreas externas).',
    referencias: 'Torneiras, pias, cubas, vasos sanitários, caixas de descarga, chuveiros, sifões, engates flexíveis, ralos decorativos, grelhas para jardim, trituradores, lixeiras de embutir.',
  },
  {
    codigo: 'I',
    nome: 'Iluminação e Acabamentos',
    logica: 'Itens elétricos de acabamento e iluminação aparente.',
    referencias: 'Tomadas, interruptores, espelhos/placas, luminárias, lâmpadas, plafons, lustres, fitas LED.',
  },
  {
    codigo: 'J',
    nome: 'Ferramentas e Consumíveis',
    logica: 'Equipamentos para aplicar materiais, fixação geral e EPIs.',
    referencias: 'Pregos, parafusos, buchas, colas de uso geral, martelos, serrotes, prumos, trenas, fitas isolantes, brocas, luvas, óculos e capacetes.',
  },
];

const DISAMBIGUATION_RULES = `
Regras de desambiguação (prioridade em caso de dúvida):
- Função na obra: embutido/infraestrutura (C ou D) vs aparente/acabamento (H ou I).
- Ralos: ralo/caixa sifonada de obra embutida → C; ralo aparente/decorativo → H.
- Grelhas: grelha aparente em área molhada/externa → H; tubo/caixa enterrada → C.
- Colas: argamassa colante/cola de azulejo → A; cola universal de montagem → J; silicone/PU/impermeabilizante → G.
- Madeira estrutural (vigas, ripas) → A; compensado para cobertura/forro → B.
- Em dúvida entre duas categorias: função na obra → material principal → uso típico.
`;

export function formatCategoryDisplayName(codigo, nome) {
  return `${String(codigo || '').trim().toUpperCase()} - ${String(nome || '').trim()}`;
}

function normalizeKey(value) {
  return String(value || '').trim().toLocaleLowerCase('pt-BR');
}

export function normalizeCategoryCode(value) {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-J]$/.test(code) ? code : null;
}

export function findCategoryByCode(categorias = [], codigo) {
  const normalizedCode = normalizeCategoryCode(codigo);
  if (!normalizedCode) return null;

  const canonical = CANONICAL_CATALOG_CATEGORIES.find((item) => item.codigo === normalizedCode);
  if (!canonical) return null;

  const displayName = formatCategoryDisplayName(normalizedCode, canonical.nome);
  const targets = new Set([
    normalizeKey(displayName),
    normalizeKey(canonical.nome),
    normalizeKey(`${normalizedCode} - ${canonical.nome}`),
  ]);

  return (categorias || []).find((cat) => {
    const nome = normalizeKey(cat?.nome);
    return targets.has(nome) || nome.startsWith(`${normalizeKey(normalizedCode)} -`);
  }) || null;
}

export function hasMeaningfulCategory(product) {
  return Boolean(String(product?.categoria_nome || product?.categoria_id || '').trim());
}

export function buildClassificationGuideText() {
  const lines = CANONICAL_CATALOG_CATEGORIES.map((cat) => {
    return `${cat.codigo} - ${cat.nome}
- Lógica: ${cat.logica}
- Itens de referência: ${cat.referencias}`;
  });

  return `${lines.join('\n\n')}\n\n${DISAMBIGUATION_RULES}`;
}

export function buildClassificationPrompt(productsList, { reclassify = false } = {}) {
  const guide = buildClassificationGuideText();
  const categoryList = CANONICAL_CATALOG_CATEGORIES.map(
    (cat) => `${cat.codigo} (${cat.nome})`
  ).join(', ');

  return `
Você é um especialista em catalogação de materiais de construção, organização de estoque e estruturação de ERP.

Sua tarefa é classificar cada produto da lista em exatamente UMA das 10 categorias abaixo (códigos A a J).
Siga rigorosamente a lógica de separação entre infraestrutura/estrutura da obra e fase de acabamento.

Categorias permitidas: ${categoryList}

Guia de classificação:
${guide}

Regras de resposta:
1. Retorne categoria_codigo com UMA letra de A a J.
2. categoria_nome deve ser o nome simples da categoria (sem o prefixo da letra).
3. confianca: "alta", "media" ou "baixa".
4. motivo_curto: uma frase objetiva (máx. 80 caracteres).
5. Se não for possível classificar com segurança, use categoria_codigo null e confianca "baixa".
6. ${reclassify
    ? 'Reclassifique mesmo quando já houver categoria_atual; escolha a melhor categoria do guia.'
    : 'Produtos sem categoria_atual: escolha a melhor categoria do guia.'}
7. Retorne APENAS JSON válido:
{
  "updates": [
    {
      "id": "ID_DO_PRODUTO",
      "categoria_codigo": "C",
      "categoria_nome": "Hidráulica Bruta",
      "confianca": "alta",
      "motivo_curto": "Tubo PVC soldável 50mm"
    }
  ]
}

Produtos:
${JSON.stringify(productsList)}
`.trim();
}

export async function ensureCanonicalCategories(base44) {
  const existing = await base44.entities.Categoria.list();
  const map = {};
  const created = [];

  for (const canonical of CANONICAL_CATALOG_CATEGORIES) {
    const found = findCategoryByCode(existing, canonical.codigo);
    if (found) {
      map[canonical.codigo] = found;
      continue;
    }

    const nome = formatCategoryDisplayName(canonical.codigo, canonical.nome);
    const createdCategory = await base44.entities.Categoria.create({
      nome,
      descricao: canonical.logica,
      ativa: true,
    });
    map[canonical.codigo] = createdCategory;
    created.push(createdCategory);
  }

  return {
    map,
    created,
    all: [...existing, ...created],
  };
}

export function resolveCategoryUpdate(update, categoryMap) {
  const codigo = normalizeCategoryCode(update?.categoria_codigo);
  if (!codigo) return null;

  const category = categoryMap[codigo];
  if (!category?.id) return null;

  const canonical = CANONICAL_CATALOG_CATEGORIES.find((item) => item.codigo === codigo);
  const nome = formatCategoryDisplayName(codigo, canonical?.nome || update?.categoria_nome || '');

  return {
    codigo,
    categoria_id: category.id,
    categoria_nome: nome.toUpperCase(),
    confianca: String(update?.confianca || 'media').toLowerCase(),
    motivo_curto: String(update?.motivo_curto || '').trim(),
  };
}
