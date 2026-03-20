import React, { useState, useRef, useCallback, useMemo, useEffect, memo } from 'react';
import { AlertCircle } from 'lucide-react';

const avaliarFormula = (valor) => {
  if (typeof valor !== 'string' || !valor.trim()) return valor;
  const trimmed = valor.trim();
  if (!trimmed.startsWith('=')) {
    const num = parseFloat(trimmed);
    return isNaN(num) ? trimmed : num;
  }
  try {
    const expressao = trimmed.substring(1);
    if (!/^[\d\s+\-*/.()]+$/.test(expressao)) return null;
    const resultado = Function('"use strict"; return (' + expressao + ')')();
    if (typeof resultado !== 'number' || isNaN(resultado)) return null;
    return Math.round(resultado * 100) / 100;
  } catch {
    return null;
  }
};

const COLUNAS = [
  { key: 'codigo_interno',      label: 'Código',        tipo: 'text',       largura: 90,  readonly: true },
  { key: 'campo_hierarquico_1', label: 'Nome',          tipo: 'text',       largura: 200 },
  { key: 'valor_compra',        label: 'Custo',         tipo: 'number',     largura: 90 },
  { key: 'preco_venda_padrao',  label: 'Preço',         tipo: 'number',     largura: 90 },
  { key: 'estoque_atual',       label: 'Estoque',       tipo: 'number',     largura: 75,  readonly: true },
  { key: 'codigo_barras',       label: 'EAN',           tipo: 'text',       largura: 120 },
  { key: 'preco_livre',         label: 'Preço Livre',   tipo: 'boolean',    largura: 85 },
  { key: 'casas_decimais',      label: 'Decimais Qtd',  tipo: 'decimais',   largura: 95 },
  { key: '_margem_bruta',       label: 'Margem %',      tipo: 'calculated', largura: 85,  readonly: true },
  { key: '_diferenca',          label: 'Diferença',     tipo: 'calculated', largura: 85,  readonly: true },
];

const MARGEM_CRITICA = 15;

// ─── Célula memoizada: só re-renderiza quando SEUS dados mudarem ───────────────
const CelulaEditavel = memo(({ col, linha, isSelected, isEmEdicao, status, valor, valorCalculado,
  onSelect, onMouseDown, onToggleBoolean, onSetDecimais, onEditar, onKeyDown,
  onStartEdit, onEndEdit, onMoveDown, dadosLength, inputRef }) => {

  const valorExibido = col.tipo === 'calculated' ? valorCalculado : valor;

  if (col.tipo === 'boolean') {
    return (
      <td style={{ width: col.largura }} className="px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-center"
        onClick={() => onToggleBoolean(linha.id, col.key)}>
        <div className={`inline-flex items-center justify-center w-6 h-6 rounded cursor-pointer transition-colors ${
          valorExibido ? 'bg-gray-800 dark:bg-gray-200' : 'bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600'
        }`}>
          {valorExibido && <span className="text-white dark:text-gray-900 text-xs font-bold">✓</span>}
        </div>
      </td>
    );
  }

  if (col.tipo === 'decimais') {
    return (
      <td style={{ width: col.largura }} className="px-2 py-1.5 border-r border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-0.5">
          {[0, 1, 2, 3].map(n => (
            <button key={n} onClick={() => onSetDecimais(linha.id, col.key, n)}
              className={`w-7 h-6 text-xs rounded transition-colors ${
                (valorExibido ?? 0) === n
                  ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 font-bold'
                  : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}>
              {n}
            </button>
          ))}
        </div>
      </td>
    );
  }

  if (col.readonly || col.tipo === 'calculated') {
    return (
      <td style={{ width: col.largura }}
        className={`px-3 py-2 border-r border-gray-200 dark:border-gray-700 ${
          status === 'erro' ? 'bg-red-100 dark:bg-red-900/20' : status === 'aviso' ? 'bg-yellow-100 dark:bg-yellow-900/20' : ''
        }`}>
        <div className="text-xs text-gray-700 dark:text-gray-300">{valorExibido}</div>
      </td>
    );
  }

  return (
    <td style={{ width: col.largura }}
      className={`px-3 py-2 border-r border-gray-200 dark:border-gray-700 relative ${
        status === 'erro' ? 'bg-red-100 dark:bg-red-900/20' : status === 'aviso' ? 'bg-yellow-100 dark:bg-yellow-900/20' : ''
      }`}
      onClick={() => onSelect(linha.id, col.key)}
      onMouseDown={(e) => onMouseDown(e, linha.id, col.key)}>
      {isEmEdicao ? (
        <input
          ref={inputRef}
          type="text"
          value={valorExibido}
          onChange={(e) => onEditar(linha.id, col.key, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { onEndEdit(); }
            else if (e.key === 'Enter') { onEndEdit(); onMoveDown(linha.id, col.key); }
            else { onKeyDown(e, linha.id, col.key); }
          }}
          onBlur={onEndEdit}
          autoFocus
          className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-blue-500 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      ) : (
        <input
          type="text"
          value={valorExibido ?? ''}
          readOnly
          onKeyDown={(e) => onKeyDown(e, linha.id, col.key)}
          onFocus={() => onSelect(linha.id, col.key)}
          onDoubleClick={() => onStartEdit(linha.id, col.key)}
          className={`w-full px-2 py-1 text-xs bg-transparent border-0 cursor-pointer text-gray-900 dark:text-white ${
            isSelected ? 'ring-1 ring-blue-500 rounded' : ''
          }`}
        />
      )}
      {!col.readonly && isSelected && (
        <div className="absolute bottom-0 right-0 w-2 h-2 bg-blue-500 cursor-cell hover:bg-blue-600" />
      )}
    </td>
  );
});
CelulaEditavel.displayName = 'CelulaEditavel';

// ─── Linha memoizada: só re-renderiza quando dados dessa linha mudarem ─────────
const LinhaTabela = memo(({ linha, colIdx, alterada, celulaSelecionada, celulaEmEdicao,
  dadosMap, dadosLength, inputRef,
  onSelect, onMouseDown, onToggleBoolean, onSetDecimais, onEditar, onKeyDown,
  onStartEdit, onEndEdit, onMoveDown }) => {

  const custo = parseFloat(linha.valor_compra) || 0;
  const preco = parseFloat(linha.preco_venda_padrao) || 0;
  const margemBruta = custo === 0 ? '0%' : `${(((preco - custo) / custo) * 100).toFixed(1)}%`;
  const diferenca = (preco - custo).toFixed(2);

  const getStatus = (chaveColuna) => {
    if (chaveColuna !== 'preco_venda_padrao') return 'normal';
    if (preco > 0 && preco < custo) return 'erro';
    if (custo > 0) {
      const margem = ((preco - custo) / custo) * 100;
      if (margem < MARGEM_CRITICA && margem >= 0) return 'aviso';
    }
    return 'normal';
  };

  return (
    <tr className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
      alterada ? 'bg-blue-50 dark:bg-blue-900/10' : ''
    }`}>
      {COLUNAS.map(col => {
        const isSelected = celulaSelecionada?.produtoId === linha.id && celulaSelecionada?.chaveColuna === col.key;
        const isEmEdicao = celulaEmEdicao?.produtoId === linha.id && celulaEmEdicao?.chaveColuna === col.key;
        const status = getStatus(col.key);
        const valorCalculado = col.key === '_margem_bruta' ? margemBruta : col.key === '_diferenca' ? diferenca : undefined;

        return (
          <CelulaEditavel
            key={col.key}
            col={col}
            linha={linha}
            isSelected={isSelected}
            isEmEdicao={isEmEdicao}
            status={status}
            valor={linha[col.key]}
            valorCalculado={valorCalculado}
            dadosLength={dadosLength}
            inputRef={isEmEdicao ? inputRef : undefined}
            onSelect={onSelect}
            onMouseDown={onMouseDown}
            onToggleBoolean={onToggleBoolean}
            onSetDecimais={onSetDecimais}
            onEditar={onEditar}
            onKeyDown={onKeyDown}
            onStartEdit={onStartEdit}
            onEndEdit={onEndEdit}
            onMoveDown={onMoveDown}
          />
        );
      })}
    </tr>
  );
});
LinhaTabela.displayName = 'LinhaTabela';

// ─── Componente principal ──────────────────────────────────────────────────────
export default function GradeEdicaoMassiva({ produtos, onSalvar }) {
  const [dados, setDados] = useState(() =>
    produtos.map(p => ({
      id: p.id,
      ...COLUNAS.reduce((acc, col) => {
        if (col.tipo !== 'calculated') {
          acc[col.key] = p[col.key] ?? (col.tipo === 'boolean' ? false : col.tipo === 'decimais' ? 0 : '');
        }
        return acc;
      }, {}),
    }))
  );

  const [alteracoes, setAlteracoes] = useState({});
  const [celulaSelecionada, setCelulaSelecionada] = useState(null);
  const [celulaEmEdicao, setCelulaEmEdicao] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Drag-fill: usa ref para não disparar re-renders no mousemove
  const dragFillRef = useRef(null);

  // Mapa id→index para navegação O(1) sem .findIndex() em cada keydown
  const dadosIndexMap = useMemo(() => {
    const m = new Map();
    dados.forEach((d, i) => m.set(d.id, i));
    return m;
  }, [dados]);

  const temErrosCriticos = useMemo(() => {
    return dados.some(linha => {
      const custo = parseFloat(linha.valor_compra) || 0;
      const preco = parseFloat(linha.preco_venda_padrao) || 0;
      return preco > 0 && preco < custo;
    });
  }, [dados]);

  const registrarAlteracao = useCallback((produtoId, chaveColuna, valorFinal) => {
    setDados(prev => prev.map(d => d.id === produtoId ? { ...d, [chaveColuna]: valorFinal } : d));
    setAlteracoes(prev => ({
      ...prev,
      [produtoId]: { ...(prev[produtoId] || {}), [chaveColuna]: valorFinal },
    }));
  }, []);

  const handleEditar = useCallback((produtoId, chaveColuna, valor) => {
    const coluna = COLUNAS.find(c => c.key === chaveColuna);
    if (coluna?.readonly) return;
    let valorFinal = valor;
    if (coluna?.tipo === 'number') {
      const avaliado = avaliarFormula(valor);
      valorFinal = avaliado === null ? valor : avaliado;
    }
    registrarAlteracao(produtoId, chaveColuna, valorFinal);
  }, [registrarAlteracao]);

  const handleToggleBoolean = useCallback((produtoId, chaveColuna) => {
    setDados(prev => {
      const linha = prev.find(d => d.id === produtoId);
      if (!linha) return prev;
      const novoValor = !linha[chaveColuna];
      setAlteracoes(a => ({ ...a, [produtoId]: { ...(a[produtoId] || {}), [chaveColuna]: novoValor } }));
      return prev.map(d => d.id === produtoId ? { ...d, [chaveColuna]: novoValor } : d);
    });
  }, []);

  const handleSetDecimais = useCallback((produtoId, chaveColuna, valor) => {
    registrarAlteracao(produtoId, chaveColuna, valor);
  }, [registrarAlteracao]);

  const handleSelect = useCallback((produtoId, chaveColuna) => {
    setCelulaSelecionada({ produtoId, chaveColuna });
  }, []);

  const handleStartEdit = useCallback((produtoId, chaveColuna) => {
    const col = COLUNAS.find(c => c.key === chaveColuna);
    if (col?.readonly) return;
    setCelulaEmEdicao({ produtoId, chaveColuna });
  }, []);

  const handleEndEdit = useCallback(() => {
    setCelulaEmEdicao(null);
  }, []);

  const handleMoveDown = useCallback((produtoId, chaveColuna) => {
    const i = dadosIndexMap.get(produtoId);
    if (i !== undefined && i < dados.length - 1) {
      setCelulaSelecionada({ produtoId: dados[i + 1].id, chaveColuna });
    }
  }, [dadosIndexMap, dados]);

  // Drag-fill — não usa state durante o move, apenas no mouseup
  const handleMouseDown = useCallback((e, produtoId, chaveColuna) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isNearEdge = e.clientX > rect.right - 8 && e.clientY > rect.bottom - 8;
    if (isNearEdge) {
      e.preventDefault();
      dragFillRef.current = { produtoId, chaveColuna, startY: e.clientY };
    }
  }, []);

  useEffect(() => {
    const onMouseMove = () => {}; // intencionalmente vazio — não causa re-render
    const onMouseUp = (e) => {
      if (!dragFillRef.current) return;
      const { produtoId, chaveColuna, startY } = dragFillRef.current;
      dragFillRef.current = null;
      const linhasAbaixo = Math.round((e.clientY - startY) / 36);
      if (linhasAbaixo <= 0) return;
      setDados(prev => {
        const indexAtual = prev.findIndex(d => d.id === produtoId);
        if (indexAtual < 0) return prev;
        const valor = prev[indexAtual][chaveColuna];
        const novo = [...prev];
        const novasAlteracoes = {};
        for (let i = 1; i <= linhasAbaixo && indexAtual + i < novo.length; i++) {
          novo[indexAtual + i] = { ...novo[indexAtual + i], [chaveColuna]: valor };
          novasAlteracoes[novo[indexAtual + i].id] = { [chaveColuna]: valor };
        }
        setAlteracoes(a => {
          const merged = { ...a };
          for (const id of Object.keys(novasAlteracoes)) {
            merged[id] = { ...(merged[id] || {}), ...novasAlteracoes[id] };
          }
          return merged;
        });
        return novo;
      });
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const handleKeyDown = useCallback((e, produtoId, chaveColuna) => {
    const coluna = COLUNAS.find(c => c.key === chaveColuna);
    if (e.key === 'Enter' && !coluna?.readonly) {
      e.preventDefault();
      setCelulaEmEdicao({ produtoId, chaveColuna });
    } else if (e.key === 'Escape') {
      setCelulaEmEdicao(null);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const i = dadosIndexMap.get(produtoId);
      if (i !== undefined && i < dados.length - 1) setCelulaSelecionada({ produtoId: dados[i + 1].id, chaveColuna });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const i = dadosIndexMap.get(produtoId);
      if (i !== undefined && i > 0) setCelulaSelecionada({ produtoId: dados[i - 1].id, chaveColuna });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const ic = COLUNAS.findIndex(c => c.key === chaveColuna);
      if (ic < COLUNAS.length - 1) setCelulaSelecionada({ produtoId, chaveColuna: COLUNAS[ic + 1].key });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const ic = COLUNAS.findIndex(c => c.key === chaveColuna);
      if (ic > 0) setCelulaSelecionada({ produtoId, chaveColuna: COLUNAS[ic - 1].key });
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const ic = COLUNAS.findIndex(c => c.key === chaveColuna);
      const nova = e.shiftKey ? COLUNAS[ic - 1] : COLUNAS[ic + 1];
      if (nova) setCelulaSelecionada({ produtoId, chaveColuna: nova.key });
    }
  }, [dadosIndexMap, dados]);

  const handleSalvar = async () => {
    if (temErrosCriticos) return;
    setLoading(true);
    try {
      const alteracoesFiltradas = Object.entries(alteracoes).reduce((acc, [id, mudancas]) => {
        const filtradas = Object.fromEntries(Object.entries(mudancas).filter(([k]) => !k.startsWith('_')));
        if (Object.keys(filtradas).length > 0) acc[id] = filtradas;
        return acc;
      }, {});
      await onSalvar(alteracoesFiltradas);
      setAlteracoes({});
    } finally {
      setLoading(false);
    }
  };

  const numAlteracoes = Object.keys(alteracoes).length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {dados.length} produto{dados.length !== 1 ? 's' : ''} •{' '}
          {numAlteracoes} alterado{numAlteracoes !== 1 ? 's' : ''}
        </div>
        <div className="flex gap-2 items-center">
          {temErrosCriticos && (
            <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              Erros críticos detectados
            </div>
          )}
          <button
            onClick={handleSalvar}
            disabled={numAlteracoes === 0 || temErrosCriticos || loading}
            className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded transition-colors"
          >
            {loading ? 'Salvando...' : 'Sincronizar'}
          </button>
        </div>
      </div>

      {/* Grade */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-900">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
            <tr>
              {COLUNAS.map(col => (
                <th key={col.key} style={{ width: col.largura }}
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.map((linha) => (
              <LinhaTabela
                key={linha.id}
                linha={linha}
                alterada={!!alteracoes[linha.id]}
                celulaSelecionada={celulaSelecionada}
                celulaEmEdicao={celulaEmEdicao}
                dadosLength={dados.length}
                inputRef={inputRef}
                onSelect={handleSelect}
                onMouseDown={handleMouseDown}
                onToggleBoolean={handleToggleBoolean}
                onSetDecimais={handleSetDecimais}
                onEditar={handleEditar}
                onKeyDown={handleKeyDown}
                onStartEdit={handleStartEdit}
                onEndEdit={handleEndEdit}
                onMoveDown={handleMoveDown}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 space-y-2 flex-shrink-0">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-100 dark:bg-red-900/20 rounded" />
            Preço &lt; Custo
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900/20 rounded" />
            Margem &lt; {MARGEM_CRITICA}%
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-50 dark:bg-blue-900/10 rounded" />
            Alterado
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-800 dark:bg-gray-200">
              <span className="text-white dark:text-gray-900 text-[10px] font-bold">✓</span>
            </div>
            Preço Livre
          </div>
        </div>
        <div className="text-gray-600 dark:text-gray-300">
          <strong>Atalhos:</strong> Enter/2×clique = editar | Esc = cancelar | Setas/Tab = navegar | Arraste canto = fill
        </div>
      </div>
    </div>
  );
}