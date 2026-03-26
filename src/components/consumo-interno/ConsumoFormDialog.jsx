import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ConsumoStepTabs from '@/components/consumo-interno/ConsumoStepTabs';
import ConsumoDestinacaoStep from '@/components/consumo-interno/ConsumoDestinacaoStep';
import ConsumoItensStep from '@/components/consumo-interno/ConsumoItensStep';
import ConsumoMinutaStep from '@/components/consumo-interno/ConsumoMinutaStep';

export default function ConsumoFormDialog({
  open,
  onOpenChange,
  mobileStep,
  setMobileStep,
  formData,
  setFormData,
  turnos,
  destinacoes,
  responsaveis,
  setNovoCadastro,
  destinacaoRef,
  responsavelRef,
  tagsRef,
  observacoesRef,
  totalAtual,
  onOpenSelector,
  currentUser,
  onOpenAssinatura,
  onSubmit,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl rounded-[32px] border-0 bg-gray-50 p-0 shadow-2xl dark:bg-gray-900 sm:max-h-[90vh] sm:overflow-hidden">
        <div className="flex max-h-[90vh] flex-col overflow-hidden">
          <div className="border-b border-gray-100 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">Novo consumo interno</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Preencha a movimentação e conclua a minuta.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            <ConsumoStepTabs mobileStep={mobileStep} setMobileStep={setMobileStep} />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5">
                <div className={`${mobileStep !== 'destinacao' ? 'hidden md:block' : ''}`}>
                  <ConsumoDestinacaoStep
                    formData={formData}
                    setFormData={setFormData}
                    turnos={turnos}
                    destinacoes={destinacoes}
                    responsaveis={responsaveis}
                    setNovoCadastro={setNovoCadastro}
                    destinacaoRef={destinacaoRef}
                    responsavelRef={responsavelRef}
                    tagsRef={tagsRef}
                    observacoesRef={observacoesRef}
                    onNext={() => setMobileStep('itens')}
                  />
                </div>

                <div className={`${mobileStep !== 'itens' ? 'hidden md:block' : ''}`}>
                  <ConsumoItensStep
                    formData={formData}
                    totalAtual={totalAtual}
                    onOpenSelector={onOpenSelector}
                    onBack={() => setMobileStep('destinacao')}
                    onNext={() => setMobileStep('minuta')}
                  />
                </div>
              </div>

              <div className={`${mobileStep !== 'minuta' ? 'hidden md:block' : ''}`}>
                <ConsumoMinutaStep
                  formData={formData}
                  currentUser={currentUser}
                  onOpenAssinatura={onOpenAssinatura}
                  onBack={() => setMobileStep('itens')}
                  onSubmit={onSubmit}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}