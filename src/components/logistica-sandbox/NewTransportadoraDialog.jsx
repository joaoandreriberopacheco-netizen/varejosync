import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Anchor, Calendar, Ship, Waves } from 'lucide-react';
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
  const [stepStatuses, setStepStatuses] = useState(['waiting', 'waiting', 'waiting', 'waiting']);

  const progressSteps = ['Atualizando dados', 'Criando/atualizando viagens', 'Atualizando timeline', 'Sucesso'];

  useEffect(() => {
    if (open) {
      setNome('');
      setSaidaReferencia('');
      setShowProgress(false);
      setProgressStep(0);
      setProgressSuccess(false);
      setStepStatuses(['waiting', 'waiting', 'waiting', 'waiting']);
    }
  }, [open]);

  const handleSave = async () => {
    setShowProgress(true);
    setProgressSuccess(false);
    setProgressStep(0);
    setStepStatuses(['active', 'waiting', 'waiting', 'waiting']);

    const novaTransportadora = await base44.entities.Transportadora.create({
      nome,
      saida_referencia: saidaReferencia,
      ativo: true,
    });

    setProgressStep(1);
    setStepStatuses(['done', 'active', 'waiting', 'waiting']);
    await sincronizarViagensTransportadora({
      transportadoraId: novaTransportadora.id,
      nome,
      saidaReferencia,
      ativo: true,
    });

    setProgressStep(2);
    setStepStatuses(['done', 'done', 'active', 'waiting']);
    await onCreated?.({ ...novaTransportadora, saida_referencia: saidaReferencia });
    await base44.entities.EventoLogisticoSandbox.list('-data_saida_origem', 1);

    setProgressStep(3);
    setStepStatuses(['done', 'done', 'done', 'active']);
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
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg rounded-[28px] border-0 bg-[#111827] p-0 overflow-hidden shadow-2xl text-white">
          <div className="p-5 space-y-4">
            <DialogHeader className="text-left space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-3xl bg-[#1f2937] flex items-center justify-center shadow-sm">
                  <Ship className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold font-glacial text-white">Nova transportadora</DialogTitle>
                  <p className="text-xs text-muted-foreground">Cadastro em estilo operacional glacial</p>
                </div>
              </div>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="rounded-3xl bg-[#1f2937] p-4 space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Anchor className="w-4 h-4" /> Identificação</div>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da transportadora" className="h-12 rounded-2xl border-0 bg-[#253042] shadow-none text-white placeholder:text-muted-foreground" />
              </div>
              <div className="rounded-3xl bg-[#1f2937] p-4 space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Waves className="w-4 h-4" /> Ciclo base</div>
                <p className="text-xs text-muted-foreground">Defina a saída de referência para criar automaticamente as datas da viagem.</p>
                <div className="flex items-center gap-2 rounded-2xl bg-[#253042] px-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Input type="date" value={saidaReferencia} onChange={(e) => setSaidaReferencia(e.target.value)} className="h-12 border-0 bg-transparent shadow-none text-white" />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} className="rounded-2xl bg-card text-foreground hover:bg-muted">Salvar transportadora</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <TransportadoraProgressDialog open={showProgress} currentStep={progressStep} steps={progressSteps} success={progressSuccess} stepStatuses={stepStatuses} />
    </>
  );
}