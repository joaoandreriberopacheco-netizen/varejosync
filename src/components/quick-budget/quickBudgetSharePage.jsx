export function buildQuickBudgetShareHtml({ items, summary }) {
  const formatCurrency = (value) => `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const rows = items.map((item) => `
    <div class="item">
      <div class="item-main">
        <div class="item-name">${String(item.produto_nome || 'Item')}</div>
        <div class="item-meta">${Number(item.quantidade || 0)} x ${formatCurrency(item.preco_unitario)}</div>
      </div>
      <div class="item-total">${formatCurrency(item.total)}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Orçamento rápido</title>
  <style>
    body { margin: 0; font-family: Inter, Arial, sans-serif; background: #f8fafc; color: #111827; }
    .wrap { max-width: 720px; margin: 0 auto; padding: 24px 16px 48px; }
    .card { background: #fff; border-radius: 24px; box-shadow: 0 6px 24px rgba(15, 23, 42, 0.08); padding: 20px; }
    .top { display: flex; justify-content: space-between; gap: 12px; align-items: start; }
    h1 { margin: 0; font-size: 28px; font-family: Quicksand, Inter, sans-serif; }
    .muted { color: #6b7280; font-size: 14px; }
    .total { text-align: right; }
    .total strong { display: block; font-size: 28px; }
    .list { margin-top: 18px; display: grid; gap: 10px; }
    .item { background: #f8fafc; border-radius: 18px; padding: 14px; display: flex; justify-content: space-between; gap: 12px; }
    .item-name { font-weight: 600; }
    .item-meta { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .item-total { font-weight: 700; white-space: nowrap; }
    .summary { margin-top: 18px; background: #f8fafc; border-radius: 18px; padding: 14px; display: grid; gap: 8px; }
    .summary-row { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
    .summary-row.total-row { font-size: 18px; font-weight: 700; color: #111827; }
    .actions { margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap; }
    .button { appearance: none; border: 0; border-radius: 16px; padding: 14px 18px; background: #111827; color: white; font-weight: 600; cursor: pointer; text-decoration: none; }
    .button.secondary { background: #e5e7eb; color: #111827; }
    @media print {
      body { background: white; }
      .wrap { padding: 0; }
      .card { box-shadow: none; border-radius: 0; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="top">
        <div>
          <h1>Orçamento rápido</h1>
          <div class="muted">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
          <div class="muted">${Number(summary.quantidadeItens || 0)} unidades · ${items.length} itens</div>
        </div>
        <div class="total">
          <div class="muted">Total</div>
          <strong>${formatCurrency(summary.total)}</strong>
        </div>
      </div>
      <div class="list">${rows}</div>
      <div class="summary">
        <div class="summary-row"><span>Subtotal</span><strong>${formatCurrency(summary.subtotal)}</strong></div>
        ${Number(summary.desconto || 0) > 0 ? `<div class="summary-row"><span>Desconto</span><strong>${formatCurrency(summary.desconto)}</strong></div>` : ''}
        <div class="summary-row total-row"><span>Total</span><strong>${formatCurrency(summary.total)}</strong></div>
      </div>
      <div class="actions">
        <button class="button" onclick="window.print()">Baixar PDF</button>
        <a class="button secondary" href="https://wa.me/?text=${encodeURIComponent('Segue o orçamento para você acessar: ')}${encodeURIComponent(window.location.href)}">Compartilhar no WhatsApp</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}