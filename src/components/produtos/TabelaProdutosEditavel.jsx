import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown, Trash2, Plus, X } from 'lucide-react';

const CAMPOS_EDISTAVEIS = [
  { key: 'codigo_interno', label: 'Código', tipo: 'text', width: '120px' },
  { key: 'campo_hierarquico_1', label: 'Nível 1', tipo: 'text', width: '150px', obrigatorio: true },
  { key: 'campo_hierarquico_2', label: 'Nível 2', tipo: 'text', width: '150px' },
  { key: 'campo_hierarquico_3', label: 'Nível 3', tipo: 'text', width: '120px' },
  { key: 'campo_hierarquico_4', label: 'Nível 4', tipo: 'text', width: '120px' },
  { key: 'campo_hierarquico_5', label: 'Nível 5 (Marca)', tipo: 'text', width: '150px' },
  { key: 'valor_compra', label: 'V. Compra', tipo: 'number', width: '110px' },
  { key: 'custo_frete_padrao', label: 'Frete', tipo: 'number', width: '100px' },
  { key: 'custo_imposto1_padrao', label: 'Imposto 1', tipo: 'number', width: '100px' },
  { key: 'custo_imposto2_padrao', label: 'Imposto 2', tipo: 'number', width: '100px' },
  { key: 'custo_outros_padrao', label: 'Outros Custos', tipo: 'number', width: '110px' },
  { key: 'desconto_compra_padrao', label: 'Desconto', tipo: 'number', width: '100px' },
  { key: 'preco_venda_padrao', label: 'V. Venda', tipo: 'number', width: '120px', obrigatorio: true },
  { key: 'preco_venda_percentual', label: '% Markup', tipo: 'number', width: '100px' },
  { key: 'estoque_minimo', label: 'Est. Mín.', tipo: 'number', width: '100px' },
  { key: 'estoque_ideal', label: 'Est. Ideal', tipo: 'number', width: '100px' },
  { key: 'estoque_maximo', label: 'Est. Máx.', tipo: 'number', width: '100px' },
  { key: 'ativo', label: 'Ativo', tipo: 'boolean', width: '80px' },
];

// Função para avaliar fórmulas simples
const avaliarFormula = (formula, rowData, colunasTemp) => {
  try {
    if (!formula.startsWith('=')) return formula;
    let expr = formula.substring(1).toUpperCase();
    
    // Substituir referências de colunas por valores
    Object.keys(rowData).forEach(key => {
      const val = rowData[key];
      expr = expr.replace(new RegExp(key.toUpperCase(), 'g'), val || 0);
    });
    
    colunasTemp.forEach((col, idx) => {
      const colName = col.key.toUpperCase();
      const val = rowData[col.key] || 0;
      expr = expr.replace(new RegExp(colName, 'g'), val || 0);
    });
    
    // Avaliar expressão matemática simples
    return Function('"use strict"; return (' + expr + ')')();
  } catch (e) {
    return formula;
  }
};

export default function TabelaProdutosEditavel({ produtos, alteracoes, onAlteracao }) {
  const scrollRef = useRef(null);
  const [colunasTemp, setColunasTemp] = useState([]);
  const [cellSelection, setCellSelection] = useState(null);
  const clipboard = useRef(null);

  const getValor = (produto, campo) => {
    const valor = alteracoes[produto.id]?.[campo] ?? produto[campo] ?? '';
    if (typeof valor === 'string' && valor.startsWith('=')) {
      return avaliarFormula(valor, { ...produto, ...alteracoes[produto.id] }, colunasTemp);
    }
    return valor;
  };

  const adicionarColunaTmp = () => {
    const novaCol = {
      key: `temp_${Date.now()}`,
      label: `Temp ${colunasTemp.length + 1}`,
      tipo: 'text',
      width: '120px',
      temporaria: true
    };
    setColunasTemp([...colunasTemp, novaCol]);
  };

  const removerColunaTmp = (key) => {
    setColunasTemp(colunasTemp.filter(c => c.key !== key));
    const novasAlteracoes = { ...alteracoes };
    Object.keys(novasAlteracoes).forEach(id => {
      delete novasAlteracoes[id][key];
    });
    Object.keys(novasAlteracoes).forEach(id => {
      if (Object.keys(novasAlteracoes[id]).length === 0) delete novasAlteracoes[id];
    });
  };

  const handleColar = async (e) => {
    const texto = await navigator.clipboard.readText();
    const linhas = texto.split('\n').filter(l => l.trim());
    const colunas = linhas[0].split('\t');
    
    linhas.forEach((linha, idxLinha) => {
      const valores = linha.split('\t');
      if (idxLinha < produtos.length) {
        const produto = produtos[idxLinha];
        colunas.forEach((header, idxCol) => {
          const campo = CAMPOS_EDISTAVEIS.find(c => c.label === header.trim())?.key || 
                       colunasTemp.find(c => c.label === header.trim())?.key;
          if (campo && valores[idxCol]) {
            onAlteracao(produto.id, campo, valores[idxCol].trim());
          }
        });
      }
    });
  };

  const handleCopiar = () => {
    if (!cellSelection) return;
    const { produtoId, campo } = cellSelection;
    const produto = produtos.find(p => p.id === produtoId);
    const valor = getValor(produto, campo);
    navigator.clipboard.writeText(String(valor || ''));
  };

  const handlePasteValores = async (e) => {
    e.preventDefault();
    const texto = await navigator.clipboard.readText();
    if (cellSelection) {
      const { produtoId, campo } = cellSelection;
      const valor = texto.trim();
      onAlteracao(produtoId, campo, valor);
    }
  };

  const validar = (campo, valor, produto) => {
    const erros = [];
    
    if (campo === 'preco_venda_padrao') {
      const precoVenda = parseFloat(valor);
      const custoBase = parseFloat(getValor(produto, 'valor_compra')) || 0;
      if (precoVenda < custoBase) {
        erros.push('Preço de venda menor que custo');
      }
    }

    if (CAMPOS_EDISTAVEIS.find(c => c.key === campo)?.obrigatorio && !valor) {
      erros.push('Campo obrigatório');
    }

    return erros;
  };

  return (
    <div 
      ref={scrollRef}
      className="overflow-x-auto overflow-y-auto h-full bg-white dark:bg-gray-900 flex flex-col"
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') handleCopiar();
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') handlePasteValores(e);
      }}
    >
      <div className="flex gap-2 p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button
          onClick={handleColar}
          className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          title="Cole dados do Excel (Ctrl+V)"
        >
          Colar
        </button>
        <button
          onClick={adicionarColunaTmp}
          className="text-xs px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Coluna Temp
        </button>
      </div>

      <table className="w-full border-collapse flex-1">
        <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="w-12 px-4 py-3 text-left">
              <input type="checkbox" className="rounded" />
            </th>
            {CAMPOS_EDISTAVEIS.map(campo => (
              <th 
                key={campo.key}
                style={{ width: campo.width, minWidth: campo.width }}
                className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
              >
                {campo.label}
                {campo.obrigatorio && <span className="text-red-500">*</span>}
              </th>
            ))}
            {colunasTemp.map(col => (
              <th
                key={col.key}
                style={{ width: col.width, minWidth: col.width }}
                className="px-3 py-3 text-left text-xs font-medium text-yellow-600 dark:text-yellow-400 whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/20 relative"
              >
                {col.label}
                <button
                  onClick={() => removerColunaTmp(col.key)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-yellow-600 dark:text-yellow-400 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </th>
            ))}
            <th className="w-12 px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {produtos.map((produto) => {
            const hasAlteracoes = !!alteracoes[produto.id];
            return (
              <tr 
                key={produto.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                  hasAlteracoes ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                }`}
              >
                <td className="px-4 py-2">
                  <input type="checkbox" className="rounded" />
                </td>
                {CAMPOS_EDISTAVEIS.map(campo => {
                  const valor = getValor(produto, campo.key);
                  const erros = validar(campo.key, valor, produto);
                  const temErro = erros.length > 0;

                  return (
                    <td 
                      key={campo.key}
                      style={{ width: campo.width, minWidth: campo.width }}
                      className="px-3 py-2"
                    >
                      {campo.tipo === 'boolean' ? (
                        <input
                          type="checkbox"
                          checked={valor ?? false}
                          onChange={(e) => onAlteracao(produto.id, campo.key, e.target.checked)}
                          className="rounded cursor-pointer"
                        />
                      ) : (
                        <div className="relative">
                          <input
                            type={campo.tipo}
                            value={valor}
                            onChange={(e) => onAlteracao(produto.id, campo.key, e.target.value)}
                            className={`w-full px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border transition-colors ${
                              temErro
                                ? 'border-red-300 dark:border-red-600'
                                : 'border-gray-200 dark:border-gray-600 focus:border-blue-500'
                            } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                          />
                          {temErro && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs p-1 rounded whitespace-nowrap overflow-hidden text-ellipsis z-20">
                              {erros[0]}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-2 text-center">
                  {produto.id.startsWith('novo_') && (
                    <button className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}