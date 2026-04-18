const fs = require("fs");
const p = "src/components/vendas/PDVVendedor.jsx";
let c = fs.readFileSync(p, "utf8");
const oldA =
  "                const precoTabela = produto.preco_venda_padrao * (tabelaPreco?.fator_ajuste || 1);\r\n";
const newA =
  "                const mult = tabelaPreco?.fator_ajuste || 1;\r\n" +
  "                const opcoesVenda = buildSaleUnitOptions(produto, mult);\r\n" +
  "                const pref = String(produto?.unidade_apresentacao_default || '').trim().toUpperCase();\r\n" +
  "                const saleOpt = pref ? (opcoesVenda.find((o) => o.unidade === pref) || opcoesVenda[0]) : opcoesVenda[0];\r\n" +
  "                const precoTabela = saleOpt?.valor_unitario ?? produto.preco_venda_padrao * mult;\r\n" +
  "                const variasUnidades = opcoesVenda.length > 1;\r\n";
if (!c.includes(oldA)) throw new Error("oldA not found");
c = c.replace(oldA, newA);

const oldB =
  '                        <span className="text-xs text-gray-400 font-mono">#{produto.codigo_interno || \'—\'}</span>\r\n' +
  "                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${estoqueColor}`}>";
const newB =
  '                        <span className="text-xs text-gray-400 font-mono">#{produto.codigo_interno || \'—\'}</span>\r\n' +
  "                        {variasUnidades && (\r\n" +
  '                          <span title="Várias unidades de venda" className="inline-flex items-center text-gray-400">\r\n' +
  '                            <Boxes className="w-3.5 h-3.5" aria-hidden />\r\n' +
  "                          </span>\r\n" +
  "                        )}\r\n" +
  "                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${estoqueColor}`}>";
if (!c.includes(oldB)) throw new Error("oldB not found");
c = c.replace(oldB, newB);

const oldC =
  "                          {produto.estoque_atual} un\r\n" +
  "                        </span>\r\n" +
  '                        <span className="text-base font-bold text-gray-900 dark:text-gray-100 ml-auto tabular-nums">';
const newC =
  "                          {produto.estoque_atual} un\r\n" +
  "                        </span>\r\n" +
  "                        {variasUnidades && (\r\n" +
  "                          <button\r\n" +
  '                            type="button"\r\n' +
  '                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline ml-auto sm:ml-0"\r\n' +
  "                            onClick={(e) => {\r\n" +
  "                              e.stopPropagation();\r\n" +
  "                              setUnitSelector({ open: true, product: produto });\r\n" +
  "                            }}\r\n" +
  "                          >\r\n" +
  "                            Outra unidade\r\n" +
  "                          </button>\r\n" +
  "                        )}\r\n" +
  '                        <span className="text-base font-bold text-gray-900 dark:text-gray-100 ml-auto tabular-nums">';
if (!c.includes(oldC)) throw new Error("oldC not found");
c = c.replace(oldC, newC);

fs.writeFileSync(p, c, "utf8");
console.log("OK map UI");
