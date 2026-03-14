import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Comandos ESC/POS básicos
const ESC = '\x1B';
const GS = '\x1D';

const ESCPOS = {
  INIT: ESC + '@',
  ALIGN_CENTER: ESC + 'a' + '1',
  ALIGN_LEFT: ESC + 'a' + '0',
  ALIGN_RIGHT: ESC + 'a' + '2',
  BOLD_ON: ESC + 'E' + '1',
  BOLD_OFF: ESC + 'E' + '0',
  SIZE_NORMAL: GS + '!' + '\x00',
  SIZE_DOUBLE: GS + '!' + '\x11',
  SIZE_TRIPLE: GS + '!' + '\x22',
  CUT: GS + 'V' + '1',
  FEED: ESC + 'd' + '3',
  LINE_FEED: '\n',
};

function formatarValor(valor) {
  const num = parseFloat(valor) || 0;
  return num.toFixed(2);
}

function centralizar(texto, largura = 48) {
  const padding = Math.max(0, Math.floor((largura - texto.length) / 2));
  return ' '.repeat(padding) + texto;
}

function alinharDireita(texto, largura = 48) {
  const padding = Math.max(0, largura - texto.length);
  return ' '.repeat(padding) + texto;
}

function linha(char = '-', largura = 48) {
  return char.repeat(largura);
}

function gerarCupomESCPOS(pedido, dadosEmpresa) {
  let cupom = ESCPOS.INIT;

  // Cabeçalho
  cupom += ESCPOS.ALIGN_CENTER;
  cupom += ESCPOS.SIZE_DOUBLE + ESCPOS.BOLD_ON;
  cupom += (dadosEmpresa?.razao_social || 'VAREJOSYNC').toUpperCase() + ESCPOS.LINE_FEED;
  cupom += ESCPOS.BOLD_OFF + ESCPOS.SIZE_NORMAL;
  
  if (dadosEmpresa?.endereco) {
    cupom += dadosEmpresa.endereco;
    if (dadosEmpresa.numero) cupom += ', ' + dadosEmpresa.numero;
    cupom += ESCPOS.LINE_FEED;
  }
  
  if (dadosEmpresa?.bairro || dadosEmpresa?.cidade) {
    if (dadosEmpresa.bairro) cupom += dadosEmpresa.bairro + ' - ';
    if (dadosEmpresa.cidade) cupom += dadosEmpresa.cidade;
    if (dadosEmpresa.estado) cupom += '/' + dadosEmpresa.estado;
    cupom += ESCPOS.LINE_FEED;
  }
  
  if (dadosEmpresa?.cep) cupom += 'CEP: ' + dadosEmpresa.cep + ESCPOS.LINE_FEED;
  if (dadosEmpresa?.cnpj) cupom += 'CNPJ: ' + dadosEmpresa.cnpj + ESCPOS.LINE_FEED;
  if (dadosEmpresa?.telefone) cupom += 'Tel: ' + dadosEmpresa.telefone + ESCPOS.LINE_FEED;

  cupom += ESCPOS.LINE_FEED;
  cupom += linha() + ESCPOS.LINE_FEED;

  // Número do recibo
  cupom += ESCPOS.SIZE_DOUBLE + ESCPOS.BOLD_ON;
  cupom += centralizar('RECIBO Nº ' + (pedido.numero?.replace(/\D/g, '').slice(-5) || 'S/N')) + ESCPOS.LINE_FEED;
  cupom += ESCPOS.BOLD_OFF + ESCPOS.SIZE_NORMAL;
  
  cupom += linha() + ESCPOS.LINE_FEED;
  cupom += ESCPOS.ALIGN_LEFT;

  // Dados do pedido
  const dataHora = new Date(pedido.created_date || new Date());
  const dataFormatada = String(dataHora.getDate()).padStart(2, '0') + '/' + 
                        String(dataHora.getMonth() + 1).padStart(2, '0') + '/' + 
                        String(dataHora.getFullYear()).slice(-2) + ' ' +
                        String(dataHora.getHours()).padStart(2, '0') + ':' +
                        String(dataHora.getMinutes()).padStart(2, '0');
  
  cupom += 'DATA/HORA: ' + dataFormatada + ESCPOS.LINE_FEED;
  cupom += 'CLIENTE: ' + (pedido.cliente_nome || 'AVULSO').substring(0, 30).toUpperCase() + ESCPOS.LINE_FEED;
  
  cupom += linha() + ESCPOS.LINE_FEED;

  // Itens
  const itens = pedido.itens ? [...pedido.itens].sort((a, b) => 
    (a.produto_nome || '').localeCompare(b.produto_nome || '')
  ) : [];

  itens.forEach((item, idx) => {
    const nome = (item.produto_nome || '').toUpperCase();
    const qtd = parseFloat(item.quantidade).toFixed(0);
    const preco = formatarValor(item.preco_unitario_praticado);
    const total = formatarValor(item.total);
    
    cupom += String(idx + 1).padStart(2, '0') + ' ' + nome.substring(0, 44) + ESCPOS.LINE_FEED;
    cupom += '   ' + qtd + ' UN x R$ ' + preco + ' = R$ ' + total + ESCPOS.LINE_FEED;
  });

  cupom += linha() + ESCPOS.LINE_FEED;

  // Totais
  cupom += ESCPOS.ALIGN_RIGHT;
  cupom += 'SUBTOTAL: R$ ' + formatarValor(pedido.subtotal || 0) + ESCPOS.LINE_FEED;
  
  if (pedido.valor_desconto > 0) {
    cupom += 'DESCONTO: R$ ' + formatarValor(pedido.valor_desconto) + ESCPOS.LINE_FEED;
  }
  
  if (pedido.valor_frete > 0) {
    cupom += 'FRETE: R$ ' + formatarValor(pedido.valor_frete) + ESCPOS.LINE_FEED;
  }
  
  cupom += ESCPOS.BOLD_ON + ESCPOS.SIZE_DOUBLE;
  cupom += 'TOTAL: R$ ' + formatarValor(pedido.valor_total || 0) + ESCPOS.LINE_FEED;
  cupom += ESCPOS.BOLD_OFF + ESCPOS.SIZE_NORMAL;
  
  cupom += ESCPOS.ALIGN_LEFT;
  cupom += linha() + ESCPOS.LINE_FEED;

  // Formas de pagamento
  if (pedido.pagamentos && pedido.pagamentos.length > 0) {
    cupom += ESCPOS.BOLD_ON + 'FORMAS DE PAGAMENTO:' + ESCPOS.BOLD_OFF + ESCPOS.LINE_FEED;
    pedido.pagamentos.forEach(pag => {
      cupom += pag.forma_pagamento + ': R$ ' + formatarValor(pag.valor) + ESCPOS.LINE_FEED;
    });
    cupom += linha() + ESCPOS.LINE_FEED;
  }

  // Rodapé
  cupom += ESCPOS.ALIGN_CENTER;
  cupom += ESCPOS.LINE_FEED;
  cupom += (dadosEmpresa?.mensagem_rodape || 'OBRIGADO PELA PREFERENCIA!') + ESCPOS.LINE_FEED;
  cupom += ESCPOS.LINE_FEED;
  cupom += 'Este documento nao possui validade fiscal' + ESCPOS.LINE_FEED;
  
  cupom += ESCPOS.FEED;
  cupom += ESCPOS.CUT;

  return cupom;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pedido_id, ip_impressora, porta = 9100 } = await req.json();

    if (!pedido_id) {
      return Response.json({ error: 'pedido_id é obrigatório' }, { status: 400 });
    }

    if (!ip_impressora) {
      return Response.json({ error: 'ip_impressora é obrigatório' }, { status: 400 });
    }

    // Buscar pedido
    const pedidos = await base44.entities.PedidoVenda.filter({ id: pedido_id });
    if (!pedidos || pedidos.length === 0) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }
    const pedido = pedidos[0];

    // Buscar dados da empresa
    const empresas = await base44.entities.DadosEmpresa.list();
    const dadosEmpresa = empresas && empresas.length > 0 ? empresas[0] : null;

    // Gerar cupom ESC/POS
    const cupomESCPOS = gerarCupomESCPOS(pedido, dadosEmpresa);

    // Conectar à impressora via TCP/IP
    const encoder = new TextEncoder();
    const dados = encoder.encode(cupomESCPOS);

    try {
      const conn = await Deno.connect({ hostname: ip_impressora, port: porta });
      await conn.write(dados);
      conn.close();

      return Response.json({ 
        success: true, 
        message: 'Cupom enviado para impressora térmica com sucesso',
        bytes_enviados: dados.length
      });
    } catch (error) {
      console.error('Erro ao conectar com impressora:', error);
      return Response.json({ 
        error: 'Falha ao conectar com a impressora térmica',
        detalhes: error.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});