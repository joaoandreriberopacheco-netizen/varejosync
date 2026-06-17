import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Lock } from 'lucide-react';
import SafeActionButton from '@/components/ui/safe-action-button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { roundToTwoDecimals } from '@/lib/financialUtils';
import {
  resolveContaDestinoCaixaPDV,
  transferirDinheiroFechamentoCaixaPDV,
} from '@/lib/contaDestinoCaixaPDV';
import RelatorioFechamentoCaixa from './caixa/RelatorioFechamentoCaixa';

/**
 * Botão de fechamento de caixa com proteção contra clique duplo.
 */
export default function FechamentoCaixaButton({
  caixaData,
  recebimentosDinheiro,
  turnoAtivo,
  currentUser,
  contaCaixaPDV,
  onFechado,
}) {
  const { toast } = useToast();
  const [showRelatorio, setShowRelatorio] = useState(false);
  const [turnoFechado, setTurnoFechado] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [showConfirmacao, setShowConfirmacao] = useState(false);

  const handleFechar = async () => {
    if (isClosing) return;
    setIsClosing(true);
    const dinheiroConferido = roundToTwoDecimals(
      parseFloat(recebimentosDinheiro.replace(/\./g, '').replace(',', '.')) || 0
    );
    const totalConferido = roundToTwoDecimals(
      dinheiroConferido +
        caixaData.recebimentos.pix +
        (caixaData.recebimentos.credito || 0) +
        (caixaData.recebimentos.debito || 0)
    );
    const esperado = roundToTwoDecimals(caixaData.liquidez - (caixaData.recebimentos.vale || 0));
    const diferenca = roundToTwoDecimals(totalConferido - esperado);

    try {
      await base44.entities.TurnoCaixa.update(turnoAtivo.id, {
        data_fechamento: new Date().toISOString(),
        usuario_fechamento_id: currentUser.id,
        usuario_fechamento_nome: currentUser.full_name,
        saldo_final: caixaData.saldoAtual,
        total_vendas: caixaData.totalVendas,
        total_reforcos: caixaData.reforcos,
        total_sangrias: caixaData.sangrias,
        recebimentos_dinheiro: caixaData.recebimentos.dinheiro,
        recebimentos_pix: caixaData.recebimentos.pix,
        recebimentos_credito: caixaData.recebimentos.credito || 0,
        recebimentos_debito: caixaData.recebimentos.debito || 0,
        dinheiro_conferido: dinheiroConferido,
        diferenca,
        status: 'Fechado',
      });

      const todasContas = await base44.entities.ContasFinanceiras.list();
      const contaDestino = resolveContaDestinoCaixaPDV(todasContas);
      if (contaDestino && dinheiroConferido > 0) {
        await transferirDinheiroFechamentoCaixaPDV({
          base44,
          contaCaixaPDV,
          contaDestino,
          dinheiroConferido,
        });
        await base44.entities.MovimentosCaixa.create({
          numero: `MCX-${String(Date.now()).slice(-5)}`,
          tipo: 'Sangria',
          valor: dinheiroConferido,
          observacao: `Fechamento de turno ${turnoAtivo.numero} - Transferido para ${contaDestino.nome}`,
          conta_id: contaCaixaPDV.id,
          turno_caixa_id: turnoAtivo.id,
          usuario_responsavel_id: currentUser.id,
          usuario_responsavel_nome: currentUser.full_name,
        });
      }

      // Buscar turno atualizado para o relatório
      const turnoAtualizado = await base44.entities.TurnoCaixa.filter({ id: turnoAtivo.id });
      setTurnoFechado(turnoAtualizado[0]);
      setShowRelatorio(true);
    } catch (error) {
      toast({ title: 'Erro ao fechar caixa', description: error.message, variant: 'destructive' });
    } finally {
      setIsClosing(false);
    }
  };

  const handleContinuar = async () => {
    if (isContinuing) return;
    setIsContinuing(true);
    toast({
      title: '✓ Caixa fechado!',
      description: 'Turno encerrado com sucesso.',
      className: 'bg-emerald-100 text-emerald-800',
    });
    setShowRelatorio(false);
    onFechado?.();
    setTimeout(() => {
      setIsContinuing(false);
    }, 300);
  };

  return (
    <>
      <SafeActionButton
        onClick={() => setShowConfirmacao(true)}
        isLoading={isClosing}
        loadingText="Fechando..."
        className="flex-1 h-12 bg-background dark:bg-card text-white dark:text-foreground rounded-2xl font-semibold flex items-center justify-center gap-2 text-sm"
        style={{ minHeight: '48px' }}
      >
        <Lock className="w-4 h-4" /> Fechar Caixa
      </SafeActionButton>

      <AlertDialog open={showConfirmacao} onOpenChange={setShowConfirmacao}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-[28px] border-0 bg-card p-5 shadow-2xl sm:w-full sm:max-w-lg sm:p-6 dark:bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar fechamento do caixa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esse botão é sensível. O caixa só será fechado depois desta confirmação de segurança.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl border-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFechar} className="rounded-2xl bg-background text-white hover:bg-primary dark:bg-card dark:text-foreground">Fechar agora</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RelatorioFechamentoCaixa
        turno={turnoFechado}
        caixaData={{ ...caixaData, dinheiroConferido: parseFloat(recebimentosDinheiro.replace(/\./g, '').replace(',', '.')) || 0 }}
        open={showRelatorio}
        onClose={() => setShowRelatorio(false)}
        onContinuar={handleContinuar}
        isContinuing={isContinuing}
      />
    </>
  );
}