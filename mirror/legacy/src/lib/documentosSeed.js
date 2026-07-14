// ── Seeds de Layout: campos pré-plotados por documento ───────────────────────
// Cada documento tem campos já posicionados no canvas, espelhando o JSX atual.
// O usuário abre o designer, vê tudo plotado, e só ajusta o que quiser.

export const DOCUMENTOS_DISPONIVEIS = [
  {
    id: 'comprovante_venda',
    nome: 'Comprovante de Venda',
    descricao: 'Cupom térmico 80mm — PDV / Caixa',
    icone: '🧾',
    categoria: 'comprovante',
    tipo: 'venda',
  },
  {
    id: 'orcamento_cupom',
    nome: 'Orçamento / Pré-Venda',
    descricao: 'Cupom térmico 80mm — Orçamento',
    icone: '📋',
    categoria: 'comprovante',
    tipo: 'orcamento',
  },
  {
    id: 'pre_venda',
    nome: 'Comprovante Pré-Venda',
    descricao: 'Senha de atendimento — fila',
    icone: '🎫',
    categoria: 'comprovante',
    tipo: 'pre_venda',
  },
  {
    id: 'pedido_impresso',
    nome: 'Formulário Pedido de Compra',
    descricao: 'Formulário A4 — Pedido de compra ao fornecedor',
    icone: '📦',
    categoria: 'comprovante',
    tipo: 'pedido_compra',
  },
];

// Largura padrão 80mm ≈ 302px a 96dpi
const W = 302;

// ── Layout seed do Comprovante de Venda ──────────────────────────────────────
const SEED_COMPROVANTE_VENDA = {
  largura: W,
  secoes: {
    titulo: { altura: 120, label: 'Title' },
    cabecalho: { altura: 90, label: 'Page Header' },
    detalhe: { altura: 80, label: 'Detail (linha por item)' },
    rodape: { altura: 200, label: 'Page Footer' },
  },
  campos: [
    // ── Título (dados empresa) ──
    { id: 'razao_social_1', campo_id: 'razao_social', label: 'Razão Social', secao: 'titulo', x: 10, y: 8, w: 280, h: 22, fontSize: 14, bold: true, align: 'center', border: false },
    { id: 'endereco_1', campo_id: 'endereco', label: 'Endereço', secao: 'titulo', x: 10, y: 34, w: 280, h: 16, fontSize: 8, bold: false, align: 'center', border: false },
    { id: 'telefone_1', campo_id: 'telefone', label: 'Telefone', secao: 'titulo', x: 10, y: 52, w: 280, h: 16, fontSize: 8, bold: false, align: 'center', border: false },
    { id: 'cnpj_1', campo_id: 'cnpj', label: 'CNPJ', secao: 'titulo', x: 10, y: 70, w: 280, h: 16, fontSize: 8, bold: false, align: 'center', border: false },
    { id: 'sep_titulo', campo_id: 'linha_separadora', label: '─── Linha ───', secao: 'titulo', x: 0, y: 92, w: W, h: 10, fontSize: 8, bold: false, align: 'center', border: false },

    // ── Cabeçalho ──
    { id: 'numero_pedido_1', campo_id: 'numero_pedido', label: 'Nº Pedido', secao: 'cabecalho', x: 10, y: 8, w: 280, h: 18, fontSize: 12, bold: true, align: 'center', border: false },
    { id: 'data_hora_1', campo_id: 'data_hora', label: 'Data/Hora', secao: 'cabecalho', x: 10, y: 28, w: 180, h: 14, fontSize: 8, bold: false, align: 'left', border: false },
    { id: 'cliente_nome_1', campo_id: 'cliente_nome', label: 'Cliente', secao: 'cabecalho', x: 10, y: 44, w: 280, h: 14, fontSize: 8, bold: true, align: 'left', border: false },
    { id: 'vendedor_1', campo_id: 'vendedor', label: 'Vendedor', secao: 'cabecalho', x: 10, y: 60, w: 140, h: 14, fontSize: 8, bold: false, align: 'left', border: false },
    { id: 'caixa_1', campo_id: 'caixa', label: 'Caixa/Operador', secao: 'cabecalho', x: 150, y: 60, w: 140, h: 14, fontSize: 8, bold: false, align: 'left', border: false },

    // ── Detalhe (cabeçalho de colunas — 1 linha repetida por item) ──
    { id: 'col_descricao_1', campo_id: 'col_descricao', label: '[Col] Descrição', secao: 'detalhe', x: 0, y: 8, w: 160, h: 16, fontSize: 8, bold: false, align: 'left', border: false },
    { id: 'col_qtd_1', campo_id: 'col_qtd', label: '[Col] Qtd', secao: 'detalhe', x: 162, y: 8, w: 40, h: 16, fontSize: 8, bold: false, align: 'right', border: false },
    { id: 'col_preco_1', campo_id: 'col_preco', label: '[Col] Preço Un.', secao: 'detalhe', x: 204, y: 8, w: 50, h: 16, fontSize: 8, bold: false, align: 'right', border: false },
    { id: 'col_total_1', campo_id: 'col_total', label: '[Col] Total', secao: 'detalhe', x: 256, y: 8, w: 44, h: 16, fontSize: 8, bold: false, align: 'right', border: false },

    // ── Rodapé ──
    { id: 'sep_rodape', campo_id: 'linha_separadora', label: '─── Linha ───', secao: 'rodape', x: 0, y: 0, w: W, h: 10, fontSize: 8, bold: false, align: 'center', border: false },
    { id: 'subtotal_1', campo_id: 'subtotal', label: 'Subtotal', secao: 'rodape', x: 10, y: 14, w: 280, h: 16, fontSize: 9, bold: false, align: 'right', border: false },
    { id: 'desconto_1', campo_id: 'desconto', label: 'Desconto', secao: 'rodape', x: 10, y: 32, w: 280, h: 16, fontSize: 9, bold: false, align: 'right', border: false },
    { id: 'frete_1', campo_id: 'frete', label: 'Frete', secao: 'rodape', x: 10, y: 50, w: 280, h: 16, fontSize: 9, bold: false, align: 'right', border: false },
    { id: 'total_1', campo_id: 'total', label: 'TOTAL', secao: 'rodape', x: 10, y: 68, w: 280, h: 22, fontSize: 15, bold: true, align: 'right', border: false },
    { id: 'sep_total', campo_id: 'linha_separadora', label: '─── Linha ───', secao: 'rodape', x: 0, y: 94, w: W, h: 10, fontSize: 8, bold: false, align: 'center', border: false },
    { id: 'forma_pagamento_1', campo_id: 'forma_pagamento', label: 'Forma de Pagamento', secao: 'rodape', x: 10, y: 108, w: 280, h: 16, fontSize: 9, bold: false, align: 'left', border: false },
    { id: 'sep_pag', campo_id: 'linha_separadora', label: '─── Linha ───', secao: 'rodape', x: 0, y: 128, w: W, h: 10, fontSize: 8, bold: false, align: 'center', border: false },
    { id: 'mensagem_rodape_1', campo_id: 'mensagem_rodape', label: 'Mensagem Rodapé', secao: 'rodape', x: 10, y: 142, w: 280, h: 16, fontSize: 9, bold: true, align: 'center', border: false },
  ],
};

// ── Layout seed do Orçamento ──────────────────────────────────────────────────
const SEED_ORCAMENTO = {
  largura: W,
  secoes: {
    titulo: { altura: 120, label: 'Title' },
    cabecalho: { altura: 80, label: 'Page Header' },
    detalhe: { altura: 80, label: 'Detail (linha por item)' },
    rodape: { altura: 180, label: 'Page Footer' },
  },
  campos: [
    { id: 'razao_social_1', campo_id: 'razao_social', label: 'Razão Social', secao: 'titulo', x: 10, y: 8, w: 280, h: 22, fontSize: 14, bold: true, align: 'center', border: false },
    { id: 'endereco_1', campo_id: 'endereco', label: 'Endereço', secao: 'titulo', x: 10, y: 34, w: 280, h: 16, fontSize: 8, bold: false, align: 'center', border: false },
    { id: 'cnpj_1', campo_id: 'cnpj', label: 'CNPJ', secao: 'titulo', x: 10, y: 52, w: 280, h: 16, fontSize: 8, bold: false, align: 'center', border: false },
    { id: 'sep_titulo', campo_id: 'linha_separadora', label: '─── Linha ───', secao: 'titulo', x: 0, y: 72, w: W, h: 10, fontSize: 8, bold: false, align: 'center', border: false },
    { id: 'titulo_doc', campo_id: 'numero_pedido', label: 'ORÇAMENTO Nº', secao: 'titulo', x: 10, y: 86, w: 280, h: 18, fontSize: 12, bold: true, align: 'center', border: false },

    { id: 'data_hora_1', campo_id: 'data_hora', label: 'Data/Hora', secao: 'cabecalho', x: 10, y: 8, w: 180, h: 14, fontSize: 8, bold: false, align: 'left', border: false },
    { id: 'cliente_nome_1', campo_id: 'cliente_nome', label: 'Cliente', secao: 'cabecalho', x: 10, y: 24, w: 280, h: 14, fontSize: 8, bold: true, align: 'left', border: false },
    { id: 'vendedor_1', campo_id: 'vendedor', label: 'Vendedor', secao: 'cabecalho', x: 10, y: 40, w: 280, h: 14, fontSize: 8, bold: false, align: 'left', border: false },

    { id: 'col_descricao_1', campo_id: 'col_descricao', label: '[Col] Descrição', secao: 'detalhe', x: 0, y: 8, w: 160, h: 16, fontSize: 8, bold: false, align: 'left', border: false },
    { id: 'col_qtd_1', campo_id: 'col_qtd', label: '[Col] Qtd', secao: 'detalhe', x: 162, y: 8, w: 40, h: 16, fontSize: 8, bold: false, align: 'right', border: false },
    { id: 'col_preco_1', campo_id: 'col_preco', label: '[Col] Preço Un.', secao: 'detalhe', x: 204, y: 8, w: 50, h: 16, fontSize: 8, bold: false, align: 'right', border: false },
    { id: 'col_total_1', campo_id: 'col_total', label: '[Col] Total', secao: 'detalhe', x: 256, y: 8, w: 44, h: 16, fontSize: 8, bold: false, align: 'right', border: false },

    { id: 'sep_rodape', campo_id: 'linha_separadora', label: '─── Linha ───', secao: 'rodape', x: 0, y: 0, w: W, h: 10, fontSize: 8, bold: false, align: 'center', border: false },
    { id: 'subtotal_1', campo_id: 'subtotal', label: 'Subtotal', secao: 'rodape', x: 10, y: 14, w: 280, h: 16, fontSize: 9, bold: false, align: 'right', border: false },
    { id: 'total_1', campo_id: 'total', label: 'TOTAL', secao: 'rodape', x: 10, y: 32, w: 280, h: 22, fontSize: 15, bold: true, align: 'right', border: false },
    { id: 'observacoes_1', campo_id: 'observacoes', label: 'Observações', secao: 'rodape', x: 10, y: 58, w: 280, h: 40, fontSize: 8, bold: false, align: 'left', border: false },
    { id: 'mensagem_rodape_1', campo_id: 'mensagem_rodape', label: 'Mensagem Rodapé', secao: 'rodape', x: 10, y: 102, w: 280, h: 16, fontSize: 9, bold: true, align: 'center', border: false },
  ],
};

// ── Seeds por documento_id ────────────────────────────────────────────────────
export const SEEDS_LAYOUT = {
  comprovante_venda: SEED_COMPROVANTE_VENDA,
  orcamento_cupom: SEED_ORCAMENTO,
  pre_venda: {
    largura: W,
    secoes: {
      titulo: { altura: 100, label: 'Title' },
      cabecalho: { altura: 120, label: 'Page Header' },
      detalhe: { altura: 60, label: 'Detail' },
      rodape: { altura: 80, label: 'Page Footer' },
    },
    campos: [
      { id: 'razao_social_1', campo_id: 'razao_social', label: 'Razão Social', secao: 'titulo', x: 10, y: 10, w: 280, h: 22, fontSize: 13, bold: true, align: 'center', border: false },
      { id: 'sep_titulo', campo_id: 'linha_separadora', label: '─── Linha ───', secao: 'titulo', x: 0, y: 40, w: W, h: 10, fontSize: 8, bold: false, align: 'center', border: false },
      { id: 'titulo_senha', campo_id: 'numero_pedido', label: 'SENHA DE ATENDIMENTO', secao: 'cabecalho', x: 10, y: 10, w: 280, h: 18, fontSize: 12, bold: true, align: 'center', border: false },
      { id: 'cliente_nome_1', campo_id: 'cliente_nome', label: 'Cliente', secao: 'cabecalho', x: 10, y: 36, w: 280, h: 60, fontSize: 36, bold: true, align: 'center', border: false },
      { id: 'data_hora_1', campo_id: 'data_hora', label: 'Data/Hora', secao: 'cabecalho', x: 10, y: 100, w: 280, h: 14, fontSize: 8, bold: false, align: 'center', border: false },
      { id: 'mensagem_rodape_1', campo_id: 'mensagem_rodape', label: 'Mensagem', secao: 'rodape', x: 10, y: 20, w: 280, h: 16, fontSize: 9, bold: false, align: 'center', border: false },
    ],
  },
  pedido_impresso: {
    largura: 794, // A4
    secoes: {
      titulo: { altura: 100, label: 'Title' },
      cabecalho: { altura: 80, label: 'Page Header' },
      detalhe: { altura: 60, label: 'Detail' },
      rodape: { altura: 120, label: 'Page Footer' },
    },
    campos: [
      { id: 'razao_social_1', campo_id: 'razao_social', label: 'Razão Social', secao: 'titulo', x: 20, y: 10, w: 400, h: 26, fontSize: 16, bold: true, align: 'left', border: false },
      { id: 'cnpj_1', campo_id: 'cnpj', label: 'CNPJ', secao: 'titulo', x: 20, y: 40, w: 250, h: 16, fontSize: 10, bold: false, align: 'left', border: false },
      { id: 'titulo_doc', campo_id: 'numero_pedido', label: 'PEDIDO DE COMPRA Nº', secao: 'titulo', x: 550, y: 10, w: 220, h: 22, fontSize: 13, bold: true, align: 'right', border: false },
      { id: 'data_hora_1', campo_id: 'data_hora', label: 'Data/Hora', secao: 'titulo', x: 550, y: 36, w: 220, h: 16, fontSize: 10, bold: false, align: 'right', border: false },
      { id: 'cliente_nome_1', campo_id: 'cliente_nome', label: 'Fornecedor', secao: 'cabecalho', x: 20, y: 10, w: 400, h: 16, fontSize: 10, bold: false, align: 'left', border: false },
      { id: 'col_descricao_1', campo_id: 'col_descricao', label: '[Col] Descrição', secao: 'detalhe', x: 0, y: 8, w: 440, h: 16, fontSize: 9, bold: false, align: 'left', border: false },
      { id: 'col_qtd_1', campo_id: 'col_qtd', label: '[Col] Qtd', secao: 'detalhe', x: 442, y: 8, w: 80, h: 16, fontSize: 9, bold: false, align: 'right', border: false },
      { id: 'col_preco_1', campo_id: 'col_preco', label: '[Col] Preço Un.', secao: 'detalhe', x: 524, y: 8, w: 120, h: 16, fontSize: 9, bold: false, align: 'right', border: false },
      { id: 'col_total_1', campo_id: 'col_total', label: '[Col] Total', secao: 'detalhe', x: 646, y: 8, w: 120, h: 16, fontSize: 9, bold: false, align: 'right', border: false },
      { id: 'total_1', campo_id: 'total', label: 'TOTAL', secao: 'rodape', x: 20, y: 20, w: 750, h: 22, fontSize: 14, bold: true, align: 'right', border: false },
      { id: 'observacoes_1', campo_id: 'observacoes', label: 'Observações', secao: 'rodape', x: 20, y: 50, w: 750, h: 50, fontSize: 9, bold: false, align: 'left', border: false },
    ],
  },
};