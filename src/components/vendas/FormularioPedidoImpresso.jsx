import React from 'react';

export default function FormularioPedidoImpresso({ pedido, empresa }) {
  const formatCurrency = (value) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const linhaTotal = 60;
  const linhaChar = '-';
  const linha = linhaChar.repeat(linhaTotal);

  return (
    <div style={{ fontFamily: 'Courier New, monospace', fontSize: '12px', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
{`${(empresa?.nome_fantasia || 'EMPRESA').padEnd(linhaTotal).substring(0, linhaTotal)}
${(empresa?.cnpj || '').padEnd(linhaTotal).substring(0, linhaTotal)}
${linha}
FORMULÁRIO DE PEDIDO DE VENDA
${linha}

Data: ${formatDate(new Date())}
Número: ${pedido.numero || '---'}
Status: ${pedido.status}

${linha}
CLIENTE:
${(pedido.cliente_nome || 'CLIENTE NÃO INFORMADO').padEnd(linhaTotal).substring(0, linhaTotal)}

VENDEDOR:
${(pedido.vendedor_nome || 'SEM VENDEDOR').padEnd(linhaTotal).substring(0, linhaTotal)}

${linha}
ITENS DO PEDIDO:
${linha}
`}
      {pedido.itens && pedido.itens.length > 0 ? (
        <>
{`DESCR.                                    QTD.        P.UNIT.        TOTAL
${linha}
`}
          {pedido.itens.map((item, idx) => {
            const descr = (item.produto_nome || `Item ${idx + 1}`).substring(0, 37).padEnd(37);
            const qtd = String(item.quantidade || 0).padStart(7);
            const preco = formatCurrency(item.preco_unitario_praticado || 0).padStart(12);
            const total = formatCurrency(item.total || 0).padStart(13);
            return `${descr} ${qtd} ${preco} ${total}\n`;
          }).join('')}
        </>
      ) : (
        `SEM ITENS CADASTRADOS\n`
      )}

{`${linha}
RESUMO FINANCEIRO:
${linha}
Subtotal.................................. ${formatCurrency(pedido.subtotal || 0).padStart(20)}
Desconto.................................. ${formatCurrency(pedido.valor_desconto || 0).padStart(20)}
Frete..................................... ${formatCurrency(pedido.valor_frete || 0).padStart(20)}
${linha}
TOTAL.................................... ${formatCurrency(pedido.valor_total || 0).padStart(20)}
${linha}

Método de Entrega: ${pedido.metodo_entrega || 'NÃO INFORMADO'}
${pedido.observacoes ? `Obs: ${pedido.observacoes}` : ''}
${linha}

${new Date().toLocaleTimeString('pt-BR')}
    `}
    </div>
  );
}