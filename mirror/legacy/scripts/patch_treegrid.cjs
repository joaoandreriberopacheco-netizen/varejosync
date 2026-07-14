const fs = require("fs");
const p = "src/components/produtos/treegrid/TreeGrid.jsx";
let c = fs.readFileSync(p, "utf8");
const imp = "import { useTreeGrid, flattenTree, buildExpandedForLevel } from './useTreeGrid';\r\n";
const imp2 = "import { useTreeGrid, flattenTree, buildExpandedForLevel } from './useTreeGrid';\r\nimport { formatEstoqueApresentacao } from '@/lib/productUnits';\r\n";
if (!c.includes(imp)) {
  if (c.includes(imp.replace(/\r\n/g,"\n"))) c = c.replace(imp.replace(/\r\n/g,"\n"), imp2.replace(/\r\n/g,"\n"));
  else throw new Error("import not found");
} else c = c.replace(imp, imp2);

const oldLine = "    case 'estoque_atual':        return <span className=\"text-xs text-gray-600 dark:text-gray-300 tabular-nums\">{fmtN(produto.estoque_atual)} {produto.unidade_principal || ''}</span>;";
const newBlock = `    case 'estoque_atual': {
      const apresent = formatEstoqueApresentacao(produto);
      return (
        <span className="flex flex-col text-xs text-gray-600 dark:text-gray-300 tabular-nums leading-tight">
          <span>{fmtN(produto.estoque_atual)} {produto.unidade_principal || ''}</span>
          {apresent && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              ~{fmtN(apresent.quantidade)} {apresent.sigla}{apresent.rotulo ? \` (\${apresent.rotulo})\` : ''}
            </span>
          )}
        </span>
      );
    }`;
if (!c.includes(oldLine)) throw new Error("estoque line not found");
c = c.replace(oldLine, newBlock);
fs.writeFileSync(p, c, "utf8");
console.log("OK TreeGrid");
