import React, { useState, useRef, forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

// Processa fórmulas e retorna apenas o valor numérico
const processarFormula = (valor) => {
  if (typeof valor === 'number') return valor;
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
    return typeof resultado === 'number' && !isNaN(resultado) ? Math.round(resultado * 100) / 100 : null;
  } catch {
    return null;
  }
};

// Parser TSV para dados de clipboard
const parseClipboard = (texto) => {
  const linhas = texto.split('\n').filter(l => l.trim());
  return linhas.map(linha => 
    linha.split('\t').map(cell => cell.trim())
  );
};

// Colunas editáveis (sem voláteis)
const COLUNAS_BASE = [
  { key: 'codigo_interno', label: 'Código', width: 100, editavel: false },
  { key: 'nome', label: 'Produto', width: 250, editavel: false },
  { key: 'valor_compra', label: 'Valor Compra', width: 120, editavel: true, tipo: 'numero' },
  { key: 'preco_venda_padrao', label: 'Preço Venda', width: 120, editavel: true, tipo: 'numero' },
  { key: 'preco_venda_percentual', label: 'Margem %', width: 110, editavel: true, tipo: 'numero' },
  { key: 'estoque_minimo', label: 'Mínimo', width: 90, editavel: true, tipo: 'numero' },
  { key: 'ativo', label: 'Ativo', width: 70, editavel: true, tipo: 'boolean' },
];

// Colunas voláteis (apenas frontend)
const COLUNAS_VOLATEIS = [
  { key: 'margem_bruta', label: 'Margem Bruta', width: 120, volatile: true, calcular: (p) => {
    const venda = p.preco_venda_padrao || 0;
    const custo = p.valor_compra || 0;
    return venda > 0 ? Math.round(((venda - custo) / venda) * 100) : 0;
  }},
];

const LINHAS_VISIVEIS = 50;
const ALTURA_LINHA = 40;

const SpreadsheetNativa = forwardRef(({ produtos, alteracoes, onAlteracoes }, ref) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [editandoCell, setEditandoCell] = useState(null);
  const [avisos, setAvisos] = useState({});
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const tableRef = useRef(null);

  const colunas = [...COLUNAS_BASE, ...COLUNAS_VOLATEIS];
  const startIdx = Math.floor(scrollTop / ALTURA_LINHA);
  const endIdx = Math.min(startIdx + LINHAS_VISIVEIS, produtos.length);
  const linhasVisiveis = produtos.slice(startIdx, endIdx);
  const alturaTotal = produtos.length * ALTURA_LINHA;

  // Obter valor considerando alterações
  const obterValor = (produtoId, campo) => {
    if (alteracoes[produtoId]?.[campo] !== undefined) {
      return alteracoes[produtoId][campo];
    }
    return produtos.find(p => p.id === produtoId)?.[campo];
  };

  // Validar linha (campos obrigatórios)
  const validarLinha = (produto) => {
    const erros = [];
    if (!obterValor(produto.id, 'nome')?.trim()) erros.push('Nome obrigatório');
    if (!obterValor(produto.id, 'preco_venda_padrao')) erros.push('Preço obrigatório');
    return erros;
  };

  // Classe CSS para célula
  const obterClassesCelula = (produto, coluna) => {
    const baseClasses = 'px-3 py-2 text-sm border-b border-border/40';
    
    // Destacar alterações
    if (!coluna.volatile && alteracoes[produto.id]?.[coluna.key] !== undefined) {
      return baseClasses + ' bg-blue-50 dark:bg-blue-900/10';
    }

    // Alertas de validação
    if (avisos[produto.id]?.includes(coluna.key)) {
      return baseClasses + ' bg-red-50 dark:bg-red-900/20';
    }

    // Alerta de margem baixa
    if (coluna.key === 'preco_venda_percentual') {
      const margem = obterValor(produto.id, coluna.key);
      if (typeof margem === 'number' && margem < 20) {
        return baseClasses + ' bg-yellow-50 dark:bg-yellow-900/20';
      }
    }

    // Alerta de preço < custo
    if (coluna.key === 'preco_venda_padrao') {
      const preco = obterValor(produto.id, coluna.key) || 0;
      const custo = obterValor(produto.id, 'valor_compra') || 0;
      if (preco < custo) {
        return baseClasses + ' bg-red-50 dark:bg-red-900/20';
      }
    }

    return baseClasses;
  };

  // Manipular mudança de célula
  const handleCellChange = (produtoId, campo, novoValor) => {
    let valorProcessado = novoValor;

    // Processar fórmulas para números
    if (['valor_compra', 'preco_venda_padrao', 'preco_venda_percentual', 'estoque_minimo'].includes(campo)) {
      valorProcessado = processarFormula(novoValor);
      if (valorProcessado === null) return;
    }

    // Toggle boolean
    if (campo === 'ativo') {
      valorProcessado = !obterValor(produtoId, campo);
    }

    // Atualizar estado
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

  // Paste de dados externos (TSV)
  const handlePaste = async (e) => {
    if (!editandoCell) return;

    e.preventDefault();
    const texto = e.clipboardData.getData('text/plain');
    const dados = parseClipboard(texto);

    if (!dados.length) return;

    const { produtoId } = editandoCell;
    const produtoIdx = produtos.findIndex(p => p.id === produtoId);

    // Mapear dados colados para colunas
    const novasAlteracoes = { ...alteracoes };
    dados.forEach((linha, rowOffset) => {
      const idx = produtoIdx + rowOffset;
      if (idx >= produtos.length) return;

      const targetProdutoId = produtos[idx].id;
      novasAlteracoes[targetProdutoId] = novasAlteracoes[targetProdutoId] || {};

      linha.forEach((valor, colOffset) => {
        const colIdx = COLUNAS_BASE.findIndex(c => c.key === editandoCell.campo) + colOffset;
        if (colIdx < COLUNAS_BASE.length && colIdx >= 0) {
          const coluna = COLUNAS_BASE[colIdx];
          if (coluna.editavel) {
            let valorProcessado = processarFormula(valor);
            novasAlteracoes[targetProdutoId][coluna.key] = valorProcessado;
          }
        }
      });
    });

    onAlteracoes(novasAlteracoes);
  };

  // Scroll handler
  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  // Validar ao sair da célula
  const handleCellBlur = (produtoId) => {
    const erros = validarLinha(produtos.find(p => p.id === produtoId));
    if (erros.length > 0) {
      setAvisos(prev => ({ ...prev, [produtoId]: erros }));
    } else {
      setAvisos(prev => {
        const novo = { ...prev };
        delete novo[produtoId];
        return novo;
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-x-auto overflow-y-auto bg-card"
      onScroll={handleScroll}
    >
      {/* Cabeçalho fixo */}
      <div className="sticky top-0 z-10 bg-muted/50 border-b border-border/40">
        <div className="flex" style={{ minWidth: colunas.reduce((acc, col) => acc + col.width, 0) }}>
          {colunas.map(coluna => (
            <div
              key={coluna.key}
              style={{ width: coluna.width }}
              className={`px-3 py-2 text-xs font-semibold border-b border-border/40 dark:border-border/40 ${
                coluna.volatile 
                  ? 'bg-muted text-muted-foreground italic' 
                  : 'bg-muted/50 text-foreground/90'
              }`}
            >
              {coluna.label}
              {coluna.volatile && ' (temp)'}
            </div>
          ))}
        </div>
      </div>

      {/* Container virtualizado */}
      <div 
        ref={tableRef}
        style={{ height: alturaTotal, position: 'relative' }}
        onPaste={handlePaste}
      >
        <div style={{ height: startIdx * ALTURA_LINHA }} />

        {linhasVisiveis.map((produto) => (
          <div key={produto.id} className="flex">
            {colunas.map(coluna => {
              let valor;
              if (coluna.volatile) {
                valor = coluna.calcular?.(obterValor(produto.id, 'preco_venda_padrao') > 0 ? {
                  preco_venda_padrao: obterValor(produto.id, 'preco_venda_padrao'),
                  valor_compra: obterValor(produto.id, 'valor_compra')
                } : produto);
              } else {
                valor = obterValor(produto.id, coluna.key);
              }

              const estaSendoEditada = editandoCell?.produtoId === produto.id && editandoCell?.campo === coluna.key;
              const temAviso = avisos[produto.id]?.some(a => a.includes(coluna.label));

              return (
                <div
                  key={coluna.key}
                  style={{ width: coluna.width, height: ALTURA_LINHA }}
                  className={obterClassesCelula(produto, coluna)}
                  onClick={() => coluna.editavel && !coluna.volatile && setEditandoCell({ produtoId: produto.id, campo: coluna.key })}
                >
                  {estaSendoEditada ? (
                    coluna.tipo === 'boolean' ? (
                      <label className="flex items-center gap-2 cursor-pointer h-full">
                        <input
                          type="checkbox"
                          defaultChecked={valor}
                          onChange={(e) => handleCellChange(produto.id, coluna.key, undefined)}
                          className="w-4 h-4"
                          onBlur={() => handleCellBlur(produto.id)}
                          autoFocus
                        />
                      </label>
                    ) : (
                      <input autoComplete="off"
                        ref={inputRef}
                        type="text"
                        defaultValue={valor}
                        onBlur={(e) => {
                          handleCellChange(produto.id, coluna.key, e.target.value);
                          handleCellBlur(produto.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCellChange(produto.id, coluna.key, e.target.value);
                            handleCellBlur(produto.id);
                          }
                          if (e.key === 'Escape') setEditandoCell(null);
                        }}
                        className="w-full h-full px-2 border border-blue-500 dark:border-blue-400 bg-card text-foreground text-sm focus:outline-none placeholder:text-muted-foreground"
                        placeholder={coluna.tipo === 'numero' ? '0 ou =50*1.1' : ''}
                        autoFocus
                      />
                    )
                  ) : (
                    <div className={`truncate ${coluna.volatile ? 'text-muted-foreground dark:text-muted-foreground italic' : 'text-foreground hover:opacity-75 cursor-pointer'}`}>
                      {coluna.tipo === 'boolean' ? (
                        <input type="checkbox" checked={valor || false} disabled className="w-4 h-4 pointer-events-none" />
                      ) : typeof valor === 'number' ? (
                        valor.toFixed(2)
                      ) : (
                        valor || '—'
                      )}
                    </div>
                  )}
                  {temAviso && (
                    <div className="absolute right-1 top-1">
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <div style={{ height: Math.max(0, (produtos.length - endIdx) * ALTURA_LINHA) }} />
      </div>
    </div>
  );
});

SpreadsheetNativa.displayName = 'SpreadsheetNativa';
export default SpreadsheetNativa;