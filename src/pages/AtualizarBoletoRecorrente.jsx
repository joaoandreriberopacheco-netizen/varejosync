import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AgefinImportador from '@/components/agefin/AgefinImportador';
import { createPageUrl } from '@/utils';
import { getContaDoMes, getMonthKey, useRecorrentesBoletoData } from '@/hooks/useRecorrentesBoletoData';
import { brandSurface } from '@/lib/brandSurfaces';

/**
 * Tela dedicada à receção do PDF do boleto e atualização do lançamento recorrente (conta a pagar).
 * Query: grupo = grupo_lancamento_id, mes = YYYY-MM
 */
export default function AtualizarBoletoRecorrente() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const grupoId = searchParams.get('grupo');
  const mesParam = searchParams.get('mes');

  const { recorrentes, contas, loading } = useRecorrentesBoletoData();

  const monthDate = useMemo(() => {
    if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
      const [y, m] = mesParam.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  }, [mesParam]);

  const monthKey = getMonthKey(monthDate);

  const { recorrente, contaMes } = useMemo(() => {
    if (!grupoId || !recorrentes.length) return { recorrente: null, contaMes: null };
    const r = recorrentes.find((x) => x.grupo_lancamento_id === grupoId || x.id === grupoId);
    if (!r) return { recorrente: null, contaMes: null };
    const cm = getContaDoMes(contas, r, monthKey);
    return { recorrente: r, contaMes: cm || null };
  }, [grupoId, recorrentes, contas, monthKey]);

  const voltar = () => {
    navigate(`${createPageUrl('FluxoCaixa')}?aba=agefin`);
  };

  if (!grupoId) {
    return (
      <div className={`flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 ${brandSurface.pageScreen}`}>
        <p className={`text-sm ${brandSurface.textMuted}`}>Parâmetros inválidos.</p>
        <button
          type="button"
          onClick={voltar}
          className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Voltar ao atualizador
        </button>
      </div>
    );
  }

  return (
    <div className={`flex min-h-[100dvh] flex-col ${brandSurface.pageScreen}`}>
      <div
        className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={voltar}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-foreground">Atualizar boleto</h1>
          {loading ? (
            <p className={`mt-0.5 flex items-center gap-2 text-xs ${brandSurface.textLabel}`}>
              <Loader2 className="h-3 w-3 animate-spin" /> Carregando…
            </p>
          ) : (
            <p className={`mt-0.5 truncate text-xs ${brandSurface.textLabel}`}>
              {recorrente?.nome_despesa || 'Recorrente'} · {monthKey}
            </p>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !recorrente || !contaMes ? (
          <div className="space-y-4 px-5 py-8 text-center">
            <p className={`text-sm ${brandSurface.textMuted}`}>
              Não foi encontrado lançamento para este grupo no mês selecionado. Confira o mês na lista ou aguarde a geração automática da parcela.
            </p>
            <button type="button" onClick={voltar} className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
              Voltar
            </button>
          </div>
        ) : (
          <AgefinImportador
            modoAtualizacao
            contaPrevistaId={contaMes.referencia_id || undefined}
            lancamentoFinanceiroId={contaMes.id}
            onSuccess={(_d, meta) => {
              if (meta?.close) {
                navigate(`${createPageUrl('FluxoCaixa')}?aba=agefin`);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
