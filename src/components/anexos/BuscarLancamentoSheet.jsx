import React, { useState, useEffect, useMemo } from 'react';
import { Search, ArrowLeft, Loader2, CheckCircle2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const PAGE_SIZE = 800;

function priorizarDespesas(lista) {
  return [...lista].sort((a, b) => {
    const pa = a.tipo === 'Despesa' ? 0 : a.tipo === 'Receita' ? 1 : 2;
    const pb = b.tipo === 'Despesa' ? 0 : b.tipo === 'Receita' ? 1 : 2;
    if (pa !== pb) return pa - pb;
    const da = a.data_vencimento || '';
    const db = b.data_vencimento || '';
    return db.localeCompare(da);
  });
}

export default function BuscarLancamentoSheet({ onSelecionar, onVoltar, uploadando }) {
  const [query, setQuery] = useState('');
  const [cache, setCache] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [selecionado, setSelecionado] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const todos = await base44.entities.LancamentoFinanceiro.list('-data_vencimento', PAGE_SIZE);
        if (cancelled) return;
        const lista = Array.isArray(todos) ? todos : [];
        setCache(priorizarDespesas(lista));
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setErro(e?.message || 'Não foi possível carregar os lançamentos.');
          setCache([]);
        }
      } finally {
        if (!cancelled) setCarregando(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const lancamentos = useMemo(() => {
    if (!query.trim()) return cache;
    const lower = query.trim().toLowerCase();
    return cache.filter(
      (l) =>
        l.descricao?.toLowerCase().includes(lower) ||
        l.terceiro_nome?.toLowerCase().includes(lower) ||
        l.categoria?.toLowerCase().includes(lower) ||
        l.id?.toLowerCase().includes(lower)
    );
  }, [cache, query]);

  const handleConfirmar = () => {
    if (selecionado) onSelecionar(selecionado);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-4 px-5 pb-6 pt-4">
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onVoltar}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 dark:bg-muted dark:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium text-gray-700 dark:text-foreground">Selecionar lançamento</p>
      </div>

      <div className="relative shrink-0">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por descrição, fornecedor..."
          className="w-full rounded-2xl border-0 bg-white py-3 pl-10 pr-4 text-sm text-gray-800 shadow-sm outline-none dark:border dark:border-border dark:bg-card dark:text-foreground"
        />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
        {erro && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {erro}
          </p>
        )}
        {carregando ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : lancamentos.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400 dark:text-muted-foreground">
            {cache.length === 0
              ? 'Nenhum lançamento disponível. Crie ou importe contas no Financeiro.'
              : 'Nenhum lançamento corresponde à busca.'}
          </p>
        ) : (
          lancamentos.map((l) => (
            <LancamentoItem
              key={l.id}
              lancamento={l}
              selecionado={selecionado?.id === l.id}
              onClick={() => setSelecionado(l)}
            />
          ))
        )}
      </div>

      {selecionado && (
        <button
          type="button"
          onClick={handleConfirmar}
          disabled={uploadando}
          className="mt-auto flex h-14 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50 dark:bg-primary dark:text-primary-foreground"
        >
          {uploadando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" /> Vincular ao lançamento
            </>
          )}
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
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-all active:scale-[0.98] ${
        selecionado
          ? 'bg-primary/15 ring-2 ring-primary/40 dark:bg-muted dark:ring-primary/45'
          : 'bg-white shadow-sm dark:border dark:border-border dark:bg-card'
      }`}
    >
      <div
        className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${
          selecionado ? 'bg-primary/20 dark:bg-background/50' : 'bg-gray-100 dark:bg-muted'
        }`}
      >
        <Icon
          className={`h-4 w-4 ${
            selecionado
              ? 'text-primary dark:text-primary'
              : isReceita
                ? 'text-green-500'
                : 'text-red-400'
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${selecionado ? 'text-foreground' : 'text-gray-800 dark:text-foreground'}`}>
          {lancamento.descricao || '—'}
        </p>
        <p className={`mt-0.5 text-xs ${selecionado ? 'text-muted-foreground' : 'text-gray-400 dark:text-muted-foreground'}`}>
          {lancamento.data_vencimento ? format(new Date(lancamento.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy') : '—'}
          {lancamento.status && ` · ${lancamento.status}`}
        </p>
      </div>
      <span
        className={`flex-none text-sm font-semibold ${
          selecionado
            ? 'text-foreground'
            : isReceita
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-500 dark:text-red-400'
        }`}
      >
        R$ {valor}
      </span>
    </button>
  );
}
