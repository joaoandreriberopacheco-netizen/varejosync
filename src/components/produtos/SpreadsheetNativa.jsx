import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

// Processa fórmulas simples
const processarFormula = (valor) => {
  if (typeof valor !== 'string') return valor;
  
  const trimmed = valor.trim();
  if (!trimmed.startsWith('=')) {
    const num = parseFloat(trimmed);
    return isNaN(num) ? trimmed : num;
  }

  try {
    const expressao = trimmed.substring(1).trim();
    // Apenas caracteres numéricos, operadores básicos e espaços
    if (!/^[\d\s+\-*/.()]+$/.test(expressao)) return null;
    
    const resultado = new Function('"use strict"; return (' + expressao + ')')();
    return typeof resultado === 'number' ? Math.round(resultado * 100) / 100 : null;
  } catch {
    return null;
  }
};

const SpreadsheetNativa = forwardRef(({ produtos, alteracoes, onAlteracoes }, ref) => {
  const ROWS_PER_PAGE = 50;
  const ROW_HEIGHT = 40;
  
  const [scrollTop, setScrollTop] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const containerRef = useRef(null);
  const pendingChangesRef = useRef({});

  const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
  const visibleRows = produtos.slice(startIndex, startIndex + ROWS_PER_PAGE);
  const totalHeight = produtos.length * ROW_HEIGHT;

  const colunas = [
    { key: 'codigo_interno', label: 'Código', width: 100, editable: false },
    { key: 'nome', label: 'Produto', width: 250, editable: false },
    { key: 'valor_compra', label: 'Valor Compra', width: 120, editable: true, type: 'number' },
    { key: 'preco_venda_padrao', label: 'Preço Venda', width: 120, editable: true, type: 'number' },
    { key: 'preco_venda_percentual', label: 'Margem %', width: 110, editable: true, type: 'number' },
    { key: 'estoque_minimo', label: 'Mínimo', width: 90, editable: true, type: 'number' },
    { key: 'ativo', label: 'Ativo', width: 70, editable: true, type: 'checkbox' },
  ];

  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const handleCellChange = (produtoId, coluna, valor) => {
    // Processar fórmula se necessário
    let valorFinal = valor;
    if (coluna.type === 'number') {
      valorFinal = processarFormula(valor);
    }

    // Armazenar em Ref (não-controlado)
    pendingChangesRef.current = {
      ...pendingChangesRef.current,
      [produtoId]: {
        ...(pendingChangesRef.current[produtoId] || {}),
        [coluna.key]: valorFinal
      }
    };
  };

  const handleCellBlur = (produtoId) => {
    // Confirmar mudanças ao sair da célula
    if (pendingChangesRef.current[produtoId]) {
      onAlteracoes(prev => ({
        ...prev,
        [produtoId]: {
          ...(prev[produtoId] || {}),
          ...pendingChangesRef.current[produtoId]
        }
      }));
      delete pendingChangesRef.current[produtoId];
    }
  };

  const getCellValue = (produto, coluna) => {
    const alterado = alteracoes[produto.id]?.[coluna.key];
    return alterado !== undefined ? alterado : produto[coluna.key];
  };

  const getCellClass = (produto, coluna) => {
    const valor = getCellValue(produto, coluna);
    let classes = 'px-3 py-2 text-sm border-b border-gray-100 dark:border-gray-800';

    // Realce para valores negativos
    if (coluna.type === 'number' && typeof valor === 'number' && valor < 0) {
      classes += ' bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400';
    }

    // Realce para margens baixas
    if (coluna.key === 'preco_venda_percentual' && typeof valor === 'number' && valor < 20) {
      classes += ' bg-yellow-50 dark:bg-yellow-900/10';
    }

    // Realce para linhas alteradas
    if (alteracoes[produto.id]) {
      classes += ' bg-blue-50 dark:bg-blue-900/5';
    }

    return classes;
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden"
    >
      {/* Header */}
      <div className="flex-shrink-0 sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          {colunas.map(coluna => (
            <div
              key={coluna.key}
              style={{ width: `${coluna.width}px`, minWidth: `${coluna.width}px` }}
              className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider"
            >
              {coluna.label}
            </div>
          ))}
        </div>
      </div>

      {/* Tabela Virtualizada */}
      <div
        ref={ref}
        className="flex-1 overflow-y-auto overflow-x-auto"
        onScroll={handleScroll}
        style={{ height: `calc(100% - 40px)` }}
      >
        {/* Espaçador antes das linhas visíveis */}
        <div style={{ height: `${startIndex * ROW_HEIGHT}px` }} />

        {/* Linhas Visíveis */}
        {visibleRows.map((produto) => (
          <div key={produto.id} className="flex border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            {colunas.map(coluna => {
              const valor = getCellValue(produto, coluna);

              return (
                <div
                  key={`${produto.id}-${coluna.key}`}
                  style={{ width: `${coluna.width}px`, minWidth: `${coluna.width}px` }}
                  className={getCellClass(produto, coluna)}
                >
                  {coluna.editable ? (
                    coluna.type === 'checkbox' ? (
                      <input
                        type="checkbox"
                        defaultChecked={valor}
                        onChange={(e) => handleCellChange(produto.id, coluna, e.target.checked)}
                        onBlur={() => handleCellBlur(produto.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    ) : (
                      <input
                        type={coluna.type === 'number' ? 'text' : 'text'}
                        defaultValue={valor ?? ''}
                        onChange={(e) => handleCellChange(produto.id, coluna, e.target.value)}
                        onBlur={() => handleCellBlur(produto.id)}
                        placeholder={coluna.type === 'number' ? '0' : ''}
                        className="w-full bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 px-0 text-right"
                      />
                    )
                  ) : (
                    <span className="text-gray-700 dark:text-gray-300">
                      {coluna.type === 'number' ? (
                        typeof valor === 'number' ? valor.toFixed(2) : valor
                      ) : (
                        valor
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Espaçador depois das linhas visíveis */}
        <div style={{ height: `${Math.max(0, (produtos.length - startIndex - ROWS_PER_PAGE) * ROW_HEIGHT)}px` }} />
      </div>

      {/* Footer com info */}
      <div className="flex-shrink-0 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
        Mostrando {startIndex + 1} a {Math.min(startIndex + ROWS_PER_PAGE, produtos.length)} de {produtos.length} produtos
      </div>
    </div>
  );
});

SpreadsheetNativa.displayName = 'SpreadsheetNativa';

export default SpreadsheetNativa;