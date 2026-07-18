import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { diagnosticarSeriesArmazenadas, recuperarSeriesPerdidas } from '@/lib/agefinPrevisaoService';
import { createPageUrl } from '@/utils';

function descreverFontes(diag) {
  const partes = [];
  if (diag.fontes?.includes('backup')) {
    partes.push(`backup do sistema (${diag.backup} conta(s))`);
  }
  if (diag.fontes?.includes('local')) {
    partes.push(`dados locais deste navegador (${diag.local} conta(s))`);
  }
  if (diag.fontes?.includes('entidade')) {
    partes.push(`cadastro espelhado (${diag.entidade} conta(s))`);
  }
  if (diag.fontes?.includes('financeiro')) {
    partes.push(`lançamentos no financeiro (${diag.reconstruidas} candidata(s))`);
  }
  return partes;
}

function mensagemRecuperacao(diag) {
  const fontes = descreverFontes(diag);
  const faltando = diag.candidatasRecuperacao || diag.faltando || 0;
  const gravado = diag.atualGravado ?? diag.empresa ?? 0;

  if (fontes.length > 0) {
    return `Encontramos contas fixas em ${fontes.join(', ')} que não estão gravadas na nuvem (${gravado} hoje). É possível recuperar até ${faltando} conta(s) — mensais, anuais e trimestrais.`;
  }

  return `O cadastro na nuvem parece incompleto (${gravado} conta(s)). Tente recuperar antes de cadastrar tudo de novo.`;
}

function descreverResultado(resultado) {
  const partes = [];
  if (resultado.mensais > 0) partes.push(`${resultado.mensais} mensal(is)`);
  if (resultado.naoMensais > 0) partes.push(`${resultado.naoMensais} anual(is)/trimestral(is)`);
  return partes.length ? partes.join(' e ') : `${resultado.recuperadas} conta(s)`;
}

export default function AgefinRecuperarSeriesBanner({ className = '', showPlanejamentoLink = false }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recuperando, setRecuperando] = useState(false);

  const { data: diag } = useQuery({
    queryKey: ['agefin-previsao', 'series-diagnostico'],
    queryFn: diagnosticarSeriesArmazenadas,
    staleTime: 30_000,
  });

  if (!diag?.precisaRecuperacao) return null;

  const handleRecuperar = async () => {
    setRecuperando(true);
    try {
      const resultado = await recuperarSeriesPerdidas();
      queryClient.invalidateQueries({ queryKey: ['agefin-previsao'] });
      queryClient.invalidateQueries({ queryKey: ['visao-financeira'] });

      if (resultado.recuperadas === 0) {
        toast({
          title: 'Nada novo para recuperar',
          description:
            'Não encontramos contas em backup, cadastro local ou financeiro. Se cadastrou hoje neste navegador, peça ajuda para ler o backup local.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Contas recuperadas',
          description: `${resultado.recuperadas} conta(s) restaurada(s): ${descreverResultado(resultado)}.`,
        });
      }
    } catch (e) {
      toast({ title: 'Erro ao recuperar', description: e.message, variant: 'destructive' });
    } finally {
      setRecuperando(false);
    }
  };

  return (
    <div className={className}>
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-3 space-y-2">
        <p className="text-sm font-medium text-foreground">Contas fixas podem ter sido perdidas</p>
        <p className="text-xs text-muted-foreground">{mensagemRecuperacao(diag)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg"
            disabled={recuperando}
            onClick={handleRecuperar}
          >
            {recuperando ? 'Recuperando…' : 'Recuperar contas fixas'}
          </Button>
          {showPlanejamentoLink ? (
            <Button type="button" size="sm" variant="ghost" className="rounded-lg" asChild>
              <Link to={createPageUrl('PlanejamentoFinanceiro')}>Abrir planejamento</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
