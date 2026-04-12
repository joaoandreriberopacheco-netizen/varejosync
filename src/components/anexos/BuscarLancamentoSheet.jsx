import React, { useState, useEffect } from 'react';
import { Search, ArrowLeft, Loader2, CheckCircle2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function BuscarLancamentoSheet({ onSelecionar, onVoltar, uploadando }) {
  const [query, setQuery] = useState('');
  const [lancamentos, setLancamentos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [selecionado, setSelecionado] = useState(null);

  useEffect(() => {
    buscar();
  }, []);

  const buscar = async (q = '') => {
    setCarregando(true);
    setErro(null);
    try {
      const todos = await base44.entities.LancamentoFinanceiro.list('-data_vencimento', 50);
      const lista = todos || [];
      if (q) {
        const lower = q.toLowerCase();
        setLancamentos(
          lista.filter(
            (l) =>
              l.descricao?.toLowerCase().includes(lower) ||
              l.terceiro_nome?.toLowerCase().includes(lower) ||
              l.categoria?.toLowerCase().includes(lower)
          )
        );
      } else {
        setLancamentos(lista);
      }
    } catch (e) {
      console.error(e);
      setErro(e?.message || 'Não foi possível carregar os lançamentos.');
      setLancamentos([]);
    } finally {
      setCarregando(false);
    }
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    buscar(val);
  };

  const handleConfirmar = () => {
    if (selecionado) onSelecionar(selecionado);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 px-5 pb-6 pt-4">
      {/* Voltar */}
      <div className="flex items-center gap-3">
        <button
          onClick={onVoltar}
          className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Selecionar lançamento</p>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={query}
          onChange={handleSearch}
          placeholder="Buscar por descrição, fornecedor..."
          className="w-full bg-white dark:bg-gray-900 rounded-2xl pl-10 pr-4 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 shadow-sm outline-none"
        />
      </div>

      {/* Lista */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
        {erro && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {erro}
          </p>
        )}
        {carregando ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : lancamentos.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">Nenhum lançamento encontrado</p>
        ) : (
          lancamentos.map(l => (
            <LancamentoItem
              key={l.id}
              lancamento={l}
              selecionado={selecionado?.id === l.id}
              onClick={() => setSelecionado(l)}
            />
          ))
        )}
      </div>

      {/* Confirmar */}
      {selecionado && (
        <button
          onClick={handleConfirmar}
          disabled={uploadando}
          className="w-full h-14 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold active:scale-95 transition-all flex items-center justify-center gap-2 mt-auto"
        >
          {uploadando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
            : <><CheckCircle2 className="w-4 h-4" /> Vincular ao lançamento</>
          }
        </button>
      )}
    </div>
  );
}

function LancamentoItem({ lancamento, selecionado, onClick }) {
  const isReceita = lancamento.tipo === 'Receita';
  const valor = (lancamento.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const Icon = isReceita ? ArrowDownLeft : ArrowUpRight;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98] text-left ${
        selecionado
          ? 'bg-gray-900 dark:bg-white shadow-md'
          : 'bg-white dark:bg-gray-900 shadow-sm'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none ${
        selecionado ? 'bg-white/20 dark:bg-gray-900/20' : 'bg-gray-100 dark:bg-gray-800'
      }`}>
        <Icon className={`w-4 h-4 ${
          selecionado
            ? 'text-white dark:text-gray-900'
            : isReceita ? 'text-green-500' : 'text-red-400'
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${selecionado ? 'text-white dark:text-gray-900' : 'text-gray-800 dark:text-gray-100'}`}>
          {lancamento.descricao || '—'}
        </p>
        <p className={`text-xs mt-0.5 ${selecionado ? 'text-white/70 dark:text-gray-600' : 'text-gray-400'}`}>
          {lancamento.data_vencimento ? format(new Date(lancamento.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy') : '—'}
          {lancamento.status && ` · ${lancamento.status}`}
        </p>
      </div>
      <span className={`text-sm font-semibold flex-none ${
        selecionado
          ? 'text-white dark:text-gray-900'
          : isReceita ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
      }`}>
        R$ {valor}
      </span>
    </button>
  );
}