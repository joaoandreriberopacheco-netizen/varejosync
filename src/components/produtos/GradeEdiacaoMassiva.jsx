import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { avaliarFormula } from './utils/formulaParser.js';
import { AlertCircle } from 'lucide-react';

const COLUNAS = [
  { key: 'codigo_interno', label: 'Código', tipo: 'text', largura: 100, readonly: true },
  { key: 'campo_hierarquico_1', label: 'Nome', tipo: 'text', largura: 200 },
  { key: 'valor_compra', label: 'Custo', tipo: 'number', largura: 100 },
  { key: 'preco_venda_padrao', label: 'Preço', tipo: 'number', largura: 100 },
  { key: 'estoque_atual', label: 'Estoque', tipo: 'number', largura: 80, readonly: true },
  { key: 'codigo_barras', label: 'EAN', tipo: 'text', largura: 120 },
  // Colunas calculadas
  { key: '_margem_bruta', label: 'Margem %', tipo: 'calculated', largura: 90, readonly: true },
  { key: '_diferenca', label: 'Diferença', tipo: 'calculated', largura: 90, readonly: true },
];

const MARGEM_CRITICA = 15; // 15% é considerad crítica

export default function GradeEdicaoMassiva({ produtos, onSalvar }) {
  const [dados, setDados] = useState(
    produtos.map(p => ({
      id: p.id,
      ...COLUNAS.reduce((acc, col) => {
        if (col.tipo !== 'calculated') {
          acc[col.key] = p[col.key] ?? '';
        }
        return acc;
      }, {}),
    }))
  );

  const [alteracoes, setAlteracoes] = useState({});
  const [celulaSelecionada, setCelulaSelecionada] = useState(null);
  const [celulaEmEdicao, setCelulaEmEdicao] = useState(null);
  const [dragFillAtivo, setDragFillAtivo] = useState(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Calcular valores das colunas calculadas
  const calcularColunaCalculada = useCallback((produtoId, chaveColuna) => {
    const linha = dados.find(d => d.id === produtoId);
    if (!linha) return '';

    const custo = parseFloat(linha.valor_compra) || 0;
    const preco = parseFloat(linha.preco_venda_padrao) || 0;

    if (chaveColuna === '_margem_bruta') {
      if (custo === 0) return '0%';
      const margem = ((preco - custo) / custo) * 100;
      return `${margem.toFixed(1)}%`;
    }

    if (chaveColuna === '_diferenca') {
      return (preco - custo).toFixed(2);
    }

    return '';
  }, [dados]);

  // Obter status de validação da célula
  const obterStatusCelula = useCallback((produtoId, chaveColuna) => {
    const linha = dados.find(d => d.id === produtoId);
    if (!linha) return 'normal';

    const custo = parseFloat(linha.valor_compra) || 0;
    const preco = parseFloat(linha.preco_venda_padrao) || 0;

    if (chaveColuna === 'preco_venda_padrao') {
      if (preco > 0 && preco < custo) return 'erro'; // Vermelho
      if (custo > 0) {
        const margem = ((preco - custo) / custo) * 100;
        if (margem < MARGEM_CRITICA && margem >= 0) return 'aviso'; // Amarelo
      }
    }

    return 'normal';
  }, [dados]);

  // Verificar se há erros críticos
  const temErrosCriticos = useMemo(() => {
    return dados.some(linha => {
      const custo = parseFloat(linha.valor_compra) || 0;
      const preco = parseFloat(linha.preco_venda_padrao) || 0;
      return preco > 0 && preco < custo;
    });
  }, [dados]);

  // Ao editar célula
  const handleEditarCelula = useCallback((produtoId, chaveColuna, valor) => {
    const coluna = COLUNAS.find(c => c.key === chaveColuna);
    if (coluna?.readonly) return;

    let valorFinal = valor;

    // Se é número, avaliar como fórmula
    if (coluna?.tipo === 'number') {
      const avaliado = avaliarFormula(valor);
      valorFinal = avaliado === null ? valor : avaliado;
    }

    setDados(prev =>
      prev.map(d =>
        d.id === produtoId ? { ...d, [chaveColuna]: valorFinal } : d
      )
    );

    // Rastrear alterações
    setAlteracoes(prev => ({
      ...prev,
      [produtoId]: {
        ...(prev[produtoId] || {}),
        [chaveColuna]: valorFinal,
      },
    }));
  }, []);

  // Drag-to-fill com mouse
  const handleMouseDown = useCallback((e, produtoId, chaveColuna) => {
    if (e.button !== 0) return; // Apenas left-click
    
    const rect = e.currentTarget.getBoundingClientRect();
    const isNearEdge = e.clientX > rect.right - 8 && e.clientY > rect.bottom - 8;
    
    if (isNearEdge) {
      e.preventDefault();
      setDragFillAtivo({ produtoId, chaveColuna, startY: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!dragFillAtivo) return;

    const indexAtual = dados.findIndex(d => d.id === dragFillAtivo.produtoId);
    const cellHeight = 36; // altura aproximada da célula
    const distancia = e.clientY - dragFillAtivo.startY;
    const linhasAbaixo = Math.round(distancia / cellHeight);

    setDragFillAtivo(prev => ({ ...prev, linhasAbaixo }));
  }, [dragFillAtivo, dados]);

  const handleMouseUp = useCallback(() => {
    if (dragFillAtivo?.linhasAbaixo > 0) {
      const valor = dados.find(d => d.id === dragFillAtivo.produtoId)?.[dragFillAtivo.chaveColuna];
      const indexAtual = dados.findIndex(d => d.id === dragFillAtivo.produtoId);

      setDados(prev => {
        const novo = [...prev];
        for (let i = 1; i <= dragFillAtivo.linhasAbaixo && indexAtual + i < novo.length; i++) {
          novo[indexAtual + i] = { ...novo[indexAtual + i], [dragFillAtivo.chaveColuna]: valor };
          
          setAlteracoes(p => ({
            ...p,
            [novo[indexAtual + i].id]: {
              ...(p[novo[indexAtual + i].id] || {}),
              [dragFillAtivo.chaveColuna]: valor,
            },
          }));
        }
        return novo;
      });
    }
    setDragFillAtivo(null);
  }, [dragFillAtivo, dados]);

  useEffect(() => {
    if (dragFillAtivo) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragFillAtivo, handleMouseMove, handleMouseUp]);

  // Iniciar edição ao pressionar Enter ou qualquer tecla em célula selecionada
  const handleKeyDown = useCallback((e, produtoId, chaveColuna) => {
    const coluna = COLUNAS.find(c => c.key === chaveColuna);
    
    if (e.key === 'Enter' && !coluna?.readonly) {
      e.preventDefault();
      setCelulaEmEdicao({ produtoId, chaveColuna });
      setTimeout(() => inputRef.current?.focus(), 0);
    } else if (e.key === 'Escape') {
      setCelulaEmEdicao(null);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const indexLinha = dados.findIndex(d => d.id === produtoId);
      if (indexLinha < dados.length - 1) {
        setCelulaSelecionada({
          produtoId: dados[indexLinha + 1].id,
          chaveColuna,
        });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const indexLinha = dados.findIndex(d => d.id === produtoId);
      if (indexLinha > 0) {
        setCelulaSelecionada({
          produtoId: dados[indexLinha - 1].id,
          chaveColuna,
        });
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const indexColuna = COLUNAS.findIndex(c => c.key === chaveColuna);
      if (indexColuna < COLUNAS.length - 1) {
        setCelulaSelecionada({
          produtoId,
          chaveColuna: COLUNAS[indexColuna + 1].key,
        });
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const indexColuna = COLUNAS.findIndex(c => c.key === chaveColuna);
      if (indexColuna > 0) {
        setCelulaSelecionada({
          produtoId,
          chaveColuna: COLUNAS[indexColuna - 1].key,
        });
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const indexColuna = COLUNAS.findIndex(c => c.key === chaveColuna);
      const novaColuna = e.shiftKey 
        ? COLUNAS[indexColuna - 1] 
        : COLUNAS[indexColuna + 1];
      
      if (novaColuna) {
        setCelulaSelecionada({
          produtoId,
          chaveColuna: novaColuna.key,
        });
      }
    }
  }, [dados]);

  // Salvar alterações
  const handleSalvar = async () => {
    if (temErrosCriticos) return;

    setLoading(true);
    try {
      // Apenas enviar linhas alteradas
      const alteracoesFiltradas = Object.entries(alteracoes).reduce((acc, [id, mudancas]) => {
        if (Object.keys(mudancas).length > 0) {
          // Remover colunas calculadas
          const mudancasFiltradas = Object.fromEntries(
            Object.entries(mudancas).filter(([key]) => !key.startsWith('_'))
          );
          if (Object.keys(mudancasFiltradas).length > 0) {
            acc[id] = mudancasFiltradas;
          }
        }
        return acc;
      }, {});

      await onSalvar(alteracoesFiltradas);
      setAlteracoes({});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header com resumo */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {dados.length} produto{dados.length !== 1 ? 's' : ''} •{' '}
          {Object.keys(alteracoes).length} alterado{Object.keys(alteracoes).length !== 1 ? 's' : ''}
        </div>
        <div className="flex gap-2">
          {temErrosCriticos && (
            <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              Erros críticos detectados
            </div>
          )}
          <button
            onClick={handleSalvar}
            disabled={Object.keys(alteracoes).length === 0 || temErrosCriticos || loading}
            className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded transition-colors"
          >
            {loading ? 'Salvando...' : 'Sincronizar'}
          </button>
        </div>
      </div>

      {/* Grade */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-white dark:bg-gray-900"
      >
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
            <tr>
              {COLUNAS.map(col => (
                <th
                  key={col.key}
                  style={{ width: col.largura }}
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.map((linha, idx) => (
              <tr
                key={linha.id}
                className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                  alteracoes[linha.id] ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                }`}
              >
                {COLUNAS.map(col => {
                  const valor = col.tipo === 'calculated' ? calcularColunaCalculada(linha.id, col.key) : linha[col.key];
                  const status = obterStatusCelula(linha.id, col.key);
                  const isSelected =
                    celulaSelecionada?.produtoId === linha.id &&
                    celulaSelecionada?.chaveColuna === col.key;
                  const isEmEdicao =
                    celulaEmEdicao?.produtoId === linha.id &&
                    celulaEmEdicao?.chaveColuna === col.key;

                  return (
                    <td
                      key={col.key}
                      style={{ width: col.largura }}
                      className={`px-3 py-2 border-r border-gray-200 dark:border-gray-700 relative ${
                        status === 'erro'
                          ? 'bg-red-100 dark:bg-red-900/20'
                          : status === 'aviso'
                            ? 'bg-yellow-100 dark:bg-yellow-900/20'
                            : ''
                      }`}
                      onClick={() => !col.readonly && setCelulaSelecionada({ produtoId: linha.id, chaveColuna: col.key })}
                      onMouseDown={(e) => !col.readonly && handleMouseDown(e, linha.id, col.key)}
                    >
                      {col.readonly || col.tipo === 'calculated' ? (
                        <div className="text-xs text-gray-700 dark:text-gray-300 pointer-events-none">
                          {valor}
                        </div>
                      ) : isEmEdicao ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={valor}
                          onChange={(e) => handleEditarCelula(linha.id, col.key, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setCelulaEmEdicao(null);
                            } else if (e.key === 'Enter') {
                              setCelulaEmEdicao(null);
                              const indexLinha = dados.findIndex(d => d.id === linha.id);
                              if (indexLinha < dados.length - 1) {
                                setCelulaSelecionada({
                                  produtoId: dados[indexLinha + 1].id,
                                  chaveColuna: col.key,
                                });
                              }
                            } else {
                              handleKeyDown(e, linha.id, col.key);
                            }
                          }}
                          onBlur={() => setCelulaEmEdicao(null)}
                          autoFocus
                          className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-blue-500 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <input
                          type="text"
                          value={valor}
                          readOnly
                          onKeyDown={(e) => handleKeyDown(e, linha.id, col.key)}
                          onFocus={() => setCelulaSelecionada({ produtoId: linha.id, chaveColuna: col.key })}
                          className={`w-full px-2 py-1 text-xs bg-transparent border-0 cursor-pointer text-gray-900 dark:text-white ${
                            isSelected ? 'ring-1 ring-blue-500 rounded' : ''
                          }`}
                        />
                      )}
                      {/* Fill handle */}
                      {!col.readonly && !col.tipo !== 'calculated' && isSelected && (
                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-blue-500 cursor-cell hover:bg-blue-600" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 dark:bg-red-900/20 rounded" />
            Preço menor que custo
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/20 rounded" />
            Margem &lt; {MARGEM_CRITICA}%
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 dark:bg-blue-900/10 rounded" />
            Linha alterada
          </div>
        </div>
        <div className="text-gray-600 dark:text-gray-300">
          Dica: Use fórmulas (ex: =10*1.15) nas células de número. Navegue com setas do teclado.
        </div>
      </div>
    </div>
  );
}