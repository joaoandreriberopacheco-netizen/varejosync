import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { brandSurface } from '@/lib/brandSurfaces';

/**
 * Fluxo descontinuado (museu): o atualizador de boletos recorrentes foi abandonado.
 * Edite contas no Planejamento Financeiro; use importação de PDF só para criar conta nova.
 */
export default function AtualizarBoletoRecorrente() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      navigate(createPageUrl('PlanejamentoFinanceiro'), { replace: true });
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <div className={`flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 ${brandSurface.pageScreen}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="max-w-md text-center space-y-2">
        <h1 className="text-lg font-semibold text-foreground">Atualizador de boletos descontinuado</h1>
        <p className={`text-sm ${brandSurface.textMuted}`}>
          Este fluxo foi retirado. Abra o mês no Planejamento Financeiro e edite valor e vencimento à mão.
          Para ler um PDF e criar uma conta nova, use Importar conta no Financeiro ou na Torre de controle.
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-2">
        <button
          type="button"
          onClick={() => navigate(createPageUrl('PlanejamentoFinanceiro'), { replace: true })}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          Ir ao Planejamento Financeiro
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => navigate(createPageUrl('Financeiro'), { replace: true })}
          className="h-12 rounded-2xl bg-muted px-5 text-sm font-medium text-foreground"
        >
          Importar nova conta (PDF)
        </button>
      </div>
    </div>
  );
}
