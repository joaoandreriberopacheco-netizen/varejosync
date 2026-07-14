import pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
p = ROOT / "src/components/produtos/ProdutoFormCompleto.jsx"
c = p.read_text(encoding="utf-8")
needle = """              />
            </div>

            <div className=\"border-t pt-6 dark:border-gray-700\">
              <h3 className=\"text-base font-semibold mb-4 text-gray-800 dark:text-gray-200\">Níveis de Estoque</h3>"""
if needle not in c:
    needle = needle.replace("\n", "\r\n")
block = """              />
            </div>

            <div className=\"rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4 md:p-5\">
              <Label className=\"text-sm text-gray-700 dark:text-gray-300 mb-2 block\">Unidade de apresentação (PDV)</Label>
              <p className=\"text-xs text-gray-500 dark:text-gray-400 mb-3\">Modo que abre primeiro ao vender. No PDV use &quot;Outra unidade&quot; para mudar.</p>
              <Select
                value={(formData.unidade_apresentacao_default && String(formData.unidade_apresentacao_default).trim()) ? String(formData.unidade_apresentacao_default).trim().toUpperCase() : '__principal__'}
                onValueChange={(v) => handleChange('unidade_apresentacao_default', v === '__principal__' ? '' : v)}
              >
                <SelectTrigger className=\"bg-white dark:bg-gray-900 border-0 shadow-sm rounded-xl max-w-md\">
                  <SelectValue placeholder=\"Principal\" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=\"__principal__\">Principal ({formData.unidade_principal || 'UN'})</SelectItem>
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

            <div className=\"border-t pt-6 dark:border-gray-700\">
              <h3 className=\"text-base font-semibold mb-4 text-gray-800 dark:text-gray-200\">Níveis de Estoque</h3>"""
if "\r\n" in c:
    block = block.replace("\n", "\r\n")
if needle not in c:
    raise SystemExit("needle not found")
p.write_text(c.replace(needle, block, 1), encoding="utf-8")
print("ok")
