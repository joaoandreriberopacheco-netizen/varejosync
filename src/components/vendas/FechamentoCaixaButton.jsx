import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Lock } from 'lucide-react';
import SafeActionButton from '@/components/ui/safe-action-button';
import { useToast } from '@/components/ui/use-toast';
import RelatorioFechamentoCaixa from './caixa/RelatorioFechamentoCaixa';
import { createPageUrl } from '@/utils';

/**
 * Botão de fechar caixa inline — sem dialog redundante.
 * Executa o fechamento diretamente e redireciona ao seletor.
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

  const handleFechar = async () => {
    if (isClosing) return;
    setIsClosing(true);
    const dinheiroConferido =
      parseFloat(recebimentosDinheiro.replace(/\./g, '').replace(',', '.')) || 0;
    const totalConferido =
      dinheiroConferido +
      caixaData.recebimentos.pix +
      (caixaData.recebimentos.credito || 0) +
      (caixaData.recebimentos.debito || 0);
    const esperado = caixaData.liquidez - (caixaData.recebimentos.vale || 0);
    const diferenca = totalConferido - esperado;

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
      const caixaGeral = todasContas.find((c) => c.is_caixa_geral === true);
      if (caixaGeral && dinheiroConferido > 0) {
        await base44.entities.ContasFinanceiras.update(contaCaixaPDV.id, { saldo_atual: 0 });
        await base44.entities.ContasFinanceiras.update(caixaGeral.id, {
          saldo_atual: caixaGeral.saldo_atual + dinheiroConferido,
        });
        await base44.entities.MovimentosCaixa.create({
          numero: `MCX-${String(Date.now()).slice(-5)}`,
          tipo: 'Sangria',
          valor: dinheiroConferido,
          observacao: `Fechamento de turno ${turnoAtivo.numero} - Transferido para ${caixaGeral.nome}`,
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
    setShowRelatorio(false);
    toast({
      title: '✓ Caixa fechado!',
      description: 'Turno encerrado.',
      className: 'bg-emerald-100 text-emerald-800',
    });
    setTimeout(() => {
      window.location.href = createPageUrl('PDV') + '?mode=caixa';
    }, 500);
  };

  return (
    <>
      <SafeActionButton
        onClick={handleFechar}
        isLoading={isClosing}
        loadingText="Fechando..."
        className="flex-1 h-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-semibold flex items-center justify-center gap-2 text-sm"
        style={{ minHeight: '48px' }}
      >
        <Lock className="w-4 h-4" /> Fechar Caixa
      </SafeActionButton>

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