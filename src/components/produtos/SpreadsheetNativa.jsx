import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

// Função para processar fórmulas simples
const processarFormula = (valor) => {
  if (typeof valor !== 'string') return valor;
  
  const trimmed = valor.trim();
  if (!trimmed.startsWith('=')) {
    const num = parseFloat(trimmed);
    return isNaN(num) ? trimmed : num;
  }

  try {
    const expr = trimmed.substring(1).trim();
    if (!/^[\d\s+\-*/.()]+$/.test(expr)) return null;
    const resultado = Function('"use strict"; return (' + expr + ')')();
    if (typeof resultado !== 'number' || isNaN(resultado)) return null;
    return Math.round(resultado * 100) / 100;
  } catch {
    return null;
  }
};

// Colunas editáveis
const COLUNAS = [
  { key: 'codigo_interno', label: 'Código', width: 100, editavel: false },
  { key: 'nome', label: 'Produto', width: 250, editavel: false },
  { key: 'valor_compra', label: 'Valor Compra', width: 120, editavel: true, tipo: 'numero' },
  { key: 'preco_venda_padrao', label: 'Preço Venda', width: 120, editavel: true, tipo: 'numero' },
  { key: 'preco_venda_percentual', label: 'Margem %', width: 110, editavel: true, tipo: 'numero' },
  { key: 'estoque_minimo', label: 'Mínimo', width: 90, editavel: true, tipo: 'numero' },
  { key: 'ativo', label: 'Ativo', width: 70, editavel: true, tipo: 'boolean' },
];

const LINHAS_VISIVEIS = 50;

const SpreadsheetNativa = forwardRef(({ produtos, alteracoes, onAlteracoes }, ref) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [editandoCell, setEditandoCell] = useState(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Calcular índices visíveis (virtualização manual)
  const alturaLinha = 40;
  const startIdx = Math.floor(scrollTop / alturaLinha);
  const endIdx = Math.min(startIdx + LINHAS_VISIVEIS, produtos.length);
  const linhasVisiveis = produtos.slice(startIdx, endIdx);

  // Obter valor atual (considerando alterações pendentes)
  const obterValor = (produtoId, campo) => {
    if (alteracoes[produtoId]?.[campo] !== undefined) {
      return alteracoes[produtoId][campo];
    }
    return produtos.find(p => p.id === produtoId)?.[campo];
  };

  // Definir classe CSS para célula
  const obterClassesCelula = (produto, campo) => {
    const baseClasses = 'px-3 py-2 text-sm border-b border-gray-200 dark:border-gray-700';
    
    if (campo === 'preco_venda_padrao') {
      const valor = obterValor(produto.id, campo);
      const custo = obterValor(produto.id, 'valor_compra') || 0;
      if (valor < custo) return baseClasses + ' bg-red-50 dark:bg-red-900/20';
      const margem = ((valor - custo) / valor) * 100;
      if (margem < 20) return baseClasses + ' bg-yellow-50 dark:bg-yellow-900/20';
    }
    
    if (alteracoes[produto.id]?.[campo] !== undefined) {
      return baseClasses + ' bg-blue-50 dark:bg-blue-900/10';
    }
    
    return baseClasses;
  };

  // Manipular mudança de célula
  const handleCellChange = (produtoId, campo, novoValor) => {
    let valorProcessado = novoValor;
    
    if (['valor_compra', 'preco_venda_padrao', 'preco_venda_percentual', 'estoque_minimo'].includes(campo)) {
      valorProcessado = processarFormula(novoValor);
      if (valorProcessado === null) return; // Fórmula inválida
    }

    if (campo === 'ativo') {
      valorProcessado = !obterValor(produtoId, campo);
    }

    const novasAlteracoes = {
      ...alteracoes,
      [produtoId]: {
        ...(alteracoes[produtoId] || {}),
        [campo]: valorProcessado
      }
    };

    onAlteracoes(novasAlteracoes);
    setEditandoCell(null);
  };

  // Iniciar edição de célula
  const iniciarEdicao = (produtoId, campo) => {
    setEditandoCell({ produtoId, campo });
  };

  // Scroll handler
  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  const alturaTotal = produtos.length * alturaLinha;

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-x-auto overflow-y-auto bg-white dark:bg-gray-900"
      onScroll={handleScroll}
    >
      {/* Cabeçalho fixo */}
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 shadow-sm">
        <div className="flex" style={{ minWidth: COLUNAS.reduce((acc, col) => acc + col.width, 0) }}>
          {COLUNAS.map(coluna => (
            <div
              key={coluna.key}
              style={{ width: coluna.width }}
              className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
            >
              {coluna.label}
            </div>
          ))}
        </div>
      </div>

      {/* Container virtualizado */}
      <div style={{ height: alturaTotal, position: 'relative' }}>
        {/* Padding superior para scroll */}
        <div style={{ height: startIdx * alturaLinha }} />

        {/* Linhas visíveis */}
        {linhasVisiveis.map((produto) => (
          <div
            key={produto.id}
            className={`flex ${
              alteracoes[produto.id] ? 'bg-blue-50 dark:bg-blue-900/10' : ''
            }`}
            style={{ minWidth: COLUNAS.reduce((acc, col) => acc + col.width, 0) }}
          >
            {COLUNAS.map(coluna => {
              const valor = obterValor(produto.id, coluna.key);
              const estaSendoEditada = editandoCell?.produtoId === produto.id && editandoCell?.campo === coluna.key;

              return (
                <div
                  key={coluna.key}
                  style={{ width: coluna.width, height: alturaLinha }}
                  className={obterClassesCelula(produto, coluna.key)}
                  onClick={() => coluna.editavel && iniciarEdicao(produto.id, coluna.key)}
                >
                  {estaSendoEditada ? (
                    coluna.tipo === 'boolean' ? (
                      <label className="flex items-center gap-2 cursor-pointer h-full">
                        <input
                          type="checkbox"
                          defaultChecked={valor}
                          onChange={(e) => handleCellChange(produto.id, coluna.key, undefined)}
                          className="w-4 h-4"
                          autoFocus
                        />
                      </label>
                    ) : (
                      <input
                        ref={inputRef}
                        type="text"
                        defaultValue={valor}
                        onBlur={(e) => handleCellChange(produto.id, coluna.key, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCellChange(produto.id, coluna.key, e.target.value);
                          if (e.key === 'Escape') setEditandoCell(null);
                        }}
                        className="w-full h-full px-2 border border-blue-500 dark:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none"
                        autoFocus
                      />
                    )
                  ) : (
                    <div className={`truncate cursor-pointer hover:opacity-75 ${!coluna.editavel ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                      {coluna.tipo === 'boolean' ? (
                        <input
                          type="checkbox"
                          checked={valor || false}
                          disabled
                          className="w-4 h-4 pointer-events-none"
                        />
                      ) : typeof valor === 'number' ? (
                        valor.toFixed(2)
                      ) : (
                        valor
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Padding inferior para scroll */}
        <div style={{ height: Math.max(0, (produtos.length - endIdx) * alturaLinha) }} />
      </div>

      {/* Mensagem vazia */}
      {produtos.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          Nenhum produto encontrado
        </div>
      )}
    </div>
  );
});

SpreadsheetNativa.displayName = 'SpreadsheetNativa';
export default SpreadsheetNativa;