/** Monta `unidades_alternativas` a partir das chaves emb1…emb5 e remove-as do objeto. */
export function extrairUnidadesAlternativasDosSlots(dados) {
  const alt = [];
  for (let n = 1; n <= 5; n++) {
    const r = dados[`emb${n}_rotulo`];
    const s = dados[`emb${n}_sigla`];
    const f = dados[`emb${n}_fator`];
    const a = dados[`emb${n}_ajuste`];
    delete dados[`emb${n}_rotulo`];
    delete dados[`emb${n}_sigla`];
    delete dados[`emb${n}_fator`];
    delete dados[`emb${n}_ajuste`];
    if (s != null && String(s).trim() !== '' && f != null && String(f).trim() !== '' && !Number.isNaN(parseFloat(f))) {
      alt.push({
        unidade: String(s).trim().toUpperCase(),
        fator_conversao: parseFloat(f),
        rotulo: r != null ? String(r).trim() : '',
        ajuste_percentual: parseFloat(a) || 0,
        preco_venda: 0,
        ativo: true,
      });
    }
  }
  return alt;
}
