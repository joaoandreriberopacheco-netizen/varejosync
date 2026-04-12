import React, { useState, useEffect } from 'react';
import { Search, ArrowLeft, Loader2, CheckCircle2, Anchor } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function BuscarEventoLogisticoParaAnexo({ onSelecionar, onVoltar, uploadando }) {
  const [query, setQuery] = useState('');
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [selecionado, setSelecionado] = useState(null);

  const buscar = async (q = '') => {
    setCarregando(true);
    setErro(null);
    try {
      const todos = await base44.entities.EventosLogisticos.list('-created_date', 100);
      const lista = todos || [];
      if (q) {
        const lower = q.toLowerCase();
        setEventos(
          lista.filter(
            (ev) =>
              String(ev.codigo || '')
                .toLowerCase()
                .includes(lower) ||
              String(ev.embarcacao_nome || '')
                .toLowerCase()
                .includes(lower) ||
              String(ev.status || '')
                .toLowerCase()
                .includes(lower)
          )
        );
      } else {
        setEventos(lista);
      }
    } catch (e) {
      console.error(e);
      setErro(e?.message || 'Não foi possível carregar as viagens.');
      setEventos([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscar();
  }, []);

  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    buscar(val);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 px-5 pb-6 pt-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onVoltar}
          className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Viagem / frete fluvial</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={query}
          onChange={handleSearch}
          placeholder="Código, embarcação..."
          className="w-full bg-white dark:bg-gray-900 rounded-2xl pl-10 pr-4 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 shadow-sm outline-none"
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
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : eventos.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">Nenhuma viagem encontrada</p>
        ) : (
          eventos.map((ev) => (
            <button
              type="button"
              key={ev.id}
              onClick={() => setSelecionado(ev)}
              className={`w-full text-left rounded-2xl px-4 py-3 text-sm shadow-sm flex items-start gap-3 transition-colors ${
                selecionado?.id === ev.id
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200'
              }`}
            >
              <Anchor className="w-4 h-4 mt-0.5 flex-none opacity-70" />
              <div className="min-w-0">
                <p className="font-semibold truncate">{ev.codigo || ev.id}</p>
                <p className="text-xs opacity-80 mt-0.5 truncate">{ev.embarcacao_nome || '—'}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {selecionado && (
        <button
          type="button"
          onClick={() => onSelecionar(selecionado)}
          disabled={uploadando}
          className="w-full h-14 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold flex items-center justify-center gap-2 mt-auto"
        >
          {uploadando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" /> Anexar à viagem
            </>
          )}
        </button>
      )}
    </div>
  );
}
