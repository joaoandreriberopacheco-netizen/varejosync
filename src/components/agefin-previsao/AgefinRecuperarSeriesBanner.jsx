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
    partes.push(`backup do sistema (${diag.backupNaoMensais} não mensais)`);
  }
  if (diag.fontes?.includes('local')) {
    partes.push(`dados locais deste navegador (${diag.localNaoMensais} não mensais)`);
  }
  if (diag.fontes?.includes('entidade')) {
    partes.push(`cadastro espelhado (${diag.entityNaoMensais} não mensais)`);
  }
  if (diag.fontes?.includes('financeiro')) {
    partes.push(`lançamentos no financeiro (${diag.reconstruidasNaoMensais} candidata(s))`);
  }
  return partes;
}

function mensagemRecuperacao(diag) {
  const fontes = descreverFontes(diag);
  const faltando = diag.candidatasNaoMensais || diag.faltandoNaoMensais || 0;
  const atual = diag.atualNaoMensais ?? 0;

  if (fontes.length > 0) {
    return `Encontramos contas anuais ou trimestrais em ${fontes.join(', ')}. Hoje aparecem ${atual} no cadastro — é possível recuperar até ${faltando || diag.candidatasNaoMensais || 'algumas'} antes de cadastrar tudo de novo.`;
  }

  return `O cadastro atual tem ${atual} conta(s) anual(is)/trimestral(is), mas há indícios de contas perdidas. Tente recuperar antes de cadastrar tudo de novo.`;
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
            'Não encontramos contas anuais/trimestrais em backup, cadastro local ou financeiro. Se cadastrou hoje neste navegador, peça ajuda para ler o backup local.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Contas recuperadas',
          description: `${resultado.recuperadas} conta(s) restaurada(s), sendo ${resultado.naoMensais} anual(is)/trimestral(is).`,
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
        <p className="text-sm font-medium text-foreground">Contas anuais ou trimestrais podem ter sido perdidas</p>
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
            {recuperando ? 'Recuperando…' : 'Recuperar contas anuais/trimestrais'}
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
