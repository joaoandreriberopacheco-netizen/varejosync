/**
 * ──────────────────────────────────────────────────────────────────
 * MOTOR DE TEMPLATES — ComprovanteTemplate
 * ──────────────────────────────────────────────────────────────────
 *
 * Sintaxe de placeholders:
 *   {{campo}}               → valor simples
 *   {{#lista}}...{{/lista}} → loop sobre array (itens, pagamentos)
 *   {{#campo}}...{{/campo}} → bloco condicional (só renderiza se truthy)
 *   {{^campo}}...{{/campo}} → bloco negativo (só renderiza se falsy)
 *
 * Dentro de um loop {{#lista}}, os campos do objeto corrente estão
 * disponíveis diretamente: {{nome}}, {{quantidade}}, {{total}}, etc.
 * ──────────────────────────────────────────────────────────────────
 */

/**
 * Renderiza um template HTML com os dados fornecidos.
 * @param {string} template - HTML com placeholders {{}}
 * @param {object} dados    - Objeto de dados para substituição
 * @returns {string}        - HTML final renderizado
 */
export function renderTemplate(template, dados) {
  if (!template) return '';

  let html = template;

  // 1. Processa loops: {{#lista}}...{{/lista}}
  html = html.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, chave, bloco) => {
    const valor = getValor(dados, chave);
    if (!valor || !Array.isArray(valor) || valor.length === 0) return '';
    return valor.map(item => renderTemplate(bloco, { ...dados, ...item })).join('');
  });

  // 2. Processa condicionais positivos: {{#campo}}...{{/campo}} (não-array)
  html = html.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, chave, bloco) => {
    const valor = getValor(dados, chave);
    if (!valor || (Array.isArray(valor) && valor.length === 0)) return '';
    return bloco;
  });

  // 3. Processa condicionais negativos: {{^campo}}...{{/campo}}
  html = html.replace(/\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, chave, bloco) => {
    const valor = getValor(dados, chave);
    if (valor && !(Array.isArray(valor) && valor.length === 0)) return '';
    return bloco;
  });

  // 4. Substitui variáveis simples: {{campo}}
  html = html.replace(/\{\{(\w+)\}\}/g, (_, chave) => {
    const valor = getValor(dados, chave);
    if (valor === null || valor === undefined) return '';
    return String(valor);
  });

  return html;
}

function getValor(dados, chave) {
  if (!dados || !(chave in dados)) return undefined;
  return dados[chave];
}

/**
 * Prepara o objeto de dados para um PedidoVenda
 * para uso no motor de template.
 */
export function prepararDadosVenda(pedido, dadosEmpresa) {
  const fmtV = (v) => {
    const num = parseFloat(v) || 0;
    const formatted = num.toFixed(2).replace('.', ',');
    const parts = formatted.split(',');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  };

  const fmtData = (d) => {
    try {
      return new Date(d).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return ''; }
  };

  const itens = (pedido.itens || []).map((item, idx) => ({
    num: String(idx + 1).padStart(2, '0'),
    nome: (item.produto_nome || '').toUpperCase(),
    quantidade: parseFloat(item.quantidade) || 0,
    preco_unitario: `R$ ${fmtV(item.preco_unitario_praticado)}`,
    total: `R$ ${fmtV(item.total)}`,
    // valores numéricos brutos também disponíveis
    quantidade_raw: parseFloat(item.quantidade) || 0,
    preco_unitario_raw: fmtV(item.preco_unitario_praticado),
    total_raw: fmtV(item.total),
  }));

  const pagamentos = (pedido.pagamentos || []).map(pag => ({
    forma: pag.forma_pagamento || '',
    parcelas: pag.parcelas > 1 ? `${pag.parcelas}x` : '',
    valor: `R$ ${fmtV(pag.valor)}`,
    tem_parcelas: pag.parcelas > 1,
  }));

  return {
    // Empresa
    empresa_nome: (dadosEmpresa?.razao_social || 'VAREJOSYNC').toUpperCase(),
    empresa_endereco: dadosEmpresa?.endereco || '',
    empresa_numero: dadosEmpresa?.numero || '',
    empresa_bairro: dadosEmpresa?.bairro || '',
    empresa_cidade: dadosEmpresa?.cidade || '',
    empresa_estado: dadosEmpresa?.estado || '',
    empresa_telefone: dadosEmpresa?.telefone || '',
    empresa_cnpj: dadosEmpresa?.cnpj || '',
    empresa_logo: dadosEmpresa?.logo_url || '',
    empresa_rodape: (dadosEmpresa?.mensagem_rodape || 'OBRIGADO PELA PREFERÊNCIA!').toUpperCase(),

    // Pedido
    numero: pedido.numero || 'S/N',
    data: fmtData(pedido.created_date || new Date()),
    cliente: (pedido.cliente_nome || 'AVULSO').toUpperCase(),
    vendedor: (pedido.vendedor_nome || '').toUpperCase(),
    caixa: pedido.created_by ? pedido.created_by.split('@')[0].toUpperCase() : '',
    status: pedido.status || '',
    observacoes: pedido.observacoes || '',

    // Valores
    subtotal: pedido.subtotal > 0 ? `R$ ${fmtV(pedido.subtotal)}` : '',
    desconto: pedido.valor_desconto > 0 ? `R$ ${fmtV(pedido.valor_desconto)}` : '',
    frete: pedido.valor_frete > 0 ? `R$ ${fmtV(pedido.valor_frete)}` : '',
    total: `R$ ${fmtV(pedido.valor_total || 0)}`,

    // Booleanos para condicionais
    tem_subtotal: pedido.subtotal > 0,
    tem_desconto: pedido.valor_desconto > 0,
    tem_frete: pedido.valor_frete > 0,
    tem_cliente: !!pedido.cliente_nome,
    tem_vendedor: !!pedido.vendedor_nome,
    tem_observacoes: !!pedido.observacoes,

    // Arrays
    itens,
    pagamentos,
  };
}

/**
 * Prepara dados para um Orçamento
 */
export function prepararDadosOrcamento(itens, total, desconto, subtotal, observacoes, nomeTabela, clienteNome, empresa) {
  const fmtR = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtData = () => new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const itensFormatados = (itens || []).map((item, idx) => ({
    num: String(idx + 1).padStart(2, '0'),
    nome: item.nome || '',
    quantidade: item.qtd || 0,
    unidade: item.unidade || 'UN',
    preco_unitario: `R$ ${fmtR(item.preco_unit)}`,
    total: `R$ ${fmtR((item.preco_unit || 0) * (item.qtd || 0))}`,
  }));

  return {
    empresa_nome: empresa?.nome || '',
    empresa_cnpj: empresa?.cnpj || '',
    empresa_telefone: empresa?.telefone || '',
    empresa_cidade: empresa?.cidade || '',
    empresa_estado: empresa?.estado || '',

    data: fmtData(),
    cliente: clienteNome || '',
    tabela: nomeTabela || '',
    observacoes: observacoes || '',

    subtotal: subtotal > 0 ? `R$ ${fmtR(subtotal)}` : '',
    desconto: desconto > 0 ? `R$ ${fmtR(desconto)}` : '',
    total: `R$ ${fmtR(total)}`,
    total_itens: itens?.reduce((s, i) => s + (i.qtd || 0), 0) || 0,

    tem_subtotal: subtotal > 0,
    tem_desconto: desconto > 0,
    tem_cliente: !!clienteNome,
    tem_tabela: !!nomeTabela,
    tem_observacoes: !!observacoes,

    itens: itensFormatados,
  };
}

/**
 * Prepara dados para Recibo de Entrega
 */
export function prepararDadosEntrega(pedido, protocolo, dadosEmpresa) {
  const fmtV = (v) => {
    const num = parseFloat(v) || 0;
    return num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };
  const fmtData = (d) => {
    try { return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  const itens = (pedido?.itens || []).map((item, idx) => ({
    num: String(idx + 1).padStart(2, '0'),
    nome: item.produto_nome || '',
    quantidade: parseFloat(item.quantidade) || 0,
    unidade: item.unidade || 'UN',
  }));

  return {
    empresa_nome: (dadosEmpresa?.razao_social || '').toUpperCase(),
    empresa_cnpj: dadosEmpresa?.cnpj || '',
    empresa_telefone: dadosEmpresa?.telefone || '',
    empresa_endereco: dadosEmpresa?.endereco || '',
    empresa_cidade: dadosEmpresa?.cidade || '',
    empresa_estado: dadosEmpresa?.estado || '',

    numero: pedido?.numero || 'S/N',
    data_entrega: fmtData(protocolo?.data_hora_entrega || new Date()),
    tipo_entrega: protocolo?.tipo_entrega || '',
    cliente: (pedido?.cliente_nome || '').toUpperCase(),
    recebedor: (protocolo?.nome_recebedor || '').toUpperCase(),
    documento_recebedor: protocolo?.documento_recebedor || '',
    responsavel: (protocolo?.responsavel_entrega_nome || '').toUpperCase(),
    observacoes: protocolo?.observacoes || '',
    total: `R$ ${fmtV(pedido?.valor_total || 0)}`,

    tem_recebedor: !!protocolo?.nome_recebedor,
    tem_documento: !!protocolo?.documento_recebedor,
    tem_observacoes: !!protocolo?.observacoes,

    itens,
  };
}