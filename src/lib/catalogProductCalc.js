import { getCatalogoComercialView } from '@/lib/productUnits';

/** Custo calculado do produto (preco_custo_calculado ou soma dos componentes). */
export function calcCusto(p) {
  const salvo = p.preco_custo_calculado || 0;
  if (salvo > 0) return salvo;
  const vc = p.valor_compra || 0;
  return vc
    + (p.custo_frete_padrao || 0)
    + (p.custo_imposto1_padrao || 0)
    + (p.custo_imposto2_padrao || 0)
    + (p.custo_outros_padrao || 0)
    - (p.desconto_compra_padrao || 0);
}

/** Markup % sobre custo na embalagem comercial. */
export function calcMarkup(p) {
  const cat = getCatalogoComercialView(p);
  if (cat.precoVenda > 0 && cat.custoNaEmbalagem > 0) return cat.markupSobreCustoPct;
  if (p.preco_venda_percentual > 0) return p.preco_venda_percentual;
  return 0;
}
