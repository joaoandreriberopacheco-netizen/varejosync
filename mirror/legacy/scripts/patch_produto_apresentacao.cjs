const fs = require("fs");
const path = require("path");
const p = path.join(__dirname, "../src/components/produtos/ProdutoFormCompleto.jsx");
let c = fs.readFileSync(p, "utf8");
let needle = "              />\r\n            </div>\r\n\r\n            <div className=\"border-t pt-6 dark:border-gray-700\">\r\n              <h3 className=\"text-base font-semibold mb-4 text-gray-800 dark:text-gray-200\">Níveis de Estoque</h3>";
if (!c.includes(needle)) {
  needle = needle.replace(/\r\n/g, "\n");
  c = c.replace(/\r\n/g, "\n");
}
const block = `              />
            </div>

            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4 md:p-5">
              <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Unidade de apresentação (PDV)</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Modo que abre primeiro ao vender. No PDV use &quot;Outra unidade&quot; para mudar.</p>
              <Select
                value={(formData.unidade_apresentacao_default && String(formData.unidade_apresentacao_default).trim()) ? String(formData.unidade_apresentacao_default).trim().toUpperCase() : '__principal__'}
                onValueChange={(v) => handleChange('unidade_apresentacao_default', v === '__principal__' ? '' : v)}
              >
                <SelectTrigger className="bg-white dark:bg-gray-900 border-0 shadow-sm rounded-xl max-w-md">
                  <SelectValue placeholder="Principal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__principal__">Principal ({formData.unidade_principal || 'UN'})</SelectItem>
                  {(formData.unidades_alternativas || []).filter((u) => u && String(u.unidade || '').trim()).map((u) => {
                    const sigla = String(u.unidade).trim().toUpperCase();
                    return (
                      <SelectItem key={sigla} value={sigla}>
                        {sigla}{u.rotulo ? (' — ' + u.rotulo) : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-6 dark:border-gray-700">
              <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Níveis de Estoque</h3>`;
const out = c.includes("\r\n") ? block.replace(/\n/g, "\r\n") : block;
if (!c.includes(needle)) throw new Error("needle not found");
fs.writeFileSync(p, c.replace(needle, out));
console.log("patched");
