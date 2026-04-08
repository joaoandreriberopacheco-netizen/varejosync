import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { sincronizarViagensTransportadora } from '@/functions/sincronizarViagensTransportadora';
import TransportadoraProgressDialog from '@/components/logistica-sandbox/TransportadoraProgressDialog';

export default function NewTransportadoraDialog({ open, onOpenChange, onCreated }) {
  const [nome, setNome] = useState('');
  const [saidaReferencia, setSaidaReferencia] = useState('');
  const [showProgress, setShowProgress] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [progressSuccess, setProgressSuccess] = useState(false);

  const progressSteps = ['Atualizando dados', 'Criando/atualizando viagens', 'Atualizando timeline', 'Sucesso'];

  useEffect(() => {
    if (open) {
      setNome('');
      setSaidaReferencia('');
      setShowProgress(false);
      setProgressStep(0);
      setProgressSuccess(false);
    }
  }, [open]);

  const handleSave = async () => {
    setShowProgress(true);
    setProgressSuccess(false);
    setProgressStep(0);

    const novaTransportadora = await base44.entities.Transportadora.create({
      nome,
      saida_referencia: saidaReferencia,
      ativo: true,
    });

    setProgressStep(1);
    await sincronizarViagensTransportadora({
      transportadoraId: novaTransportadora.id,
      nome,
      saidaReferencia,
      ativo: true,
    });

    setProgressStep(2);
    await base44.entities.EventoLogisticoSandbox.list('-data_saida_origem', 1);
    await onCreated?.({ ...novaTransportadora, saida_referencia: saidaReferencia });

    setProgressStep(3);
    setProgressSuccess(true);

    toast({
      title: 'Transportadora salva com sucesso',
      description: 'As viagens foram recalculadas automaticamente a partir da saída de referência.',
    });

    setTimeout(() => {
      onOpenChange(false);
      setShowProgress(false);
    }, 900);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg rounded-[28px] border-0 bg-white dark:bg-gray-900 p-0 overflow-hidden shadow-2xl">
          <div className="p-5 space-y-4">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-semibold font-glacial text-gray-900 dark:text-gray-100">Nova transportadora</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da transportadora" className="h-12 rounded-2xl border-0 bg-gray-100 dark:bg-gray-800 shadow-none" />
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-3 space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Saída de referência</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Escolha a data de saída que serve como ponto de partida. A partir dela, o backend cria um evento logístico com três datas: chegada em Manaus, saída de Manaus e ETA em Tabatinga.</p>
                <Input type="date" value={saidaReferencia} onChange={(e) => setSaidaReferencia(e.target.value)} className="h-12 rounded-2xl border-0 bg-white dark:bg-gray-900 shadow-none" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} className="rounded-2xl bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <TransportadoraProgressDialog open={showProgress} currentStep={progressStep} steps={progressSteps} success={progressSuccess} />
    </>
  );
}