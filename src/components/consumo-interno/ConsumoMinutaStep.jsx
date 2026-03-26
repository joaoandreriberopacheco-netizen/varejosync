import React from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Signature, Clock3 } from 'lucide-react';

export default function ConsumoMinutaStep({ formData, currentUser, onOpenAssinatura, onBack, onSubmit }) {
  return (
    <div className="space-y-5">
      <div className="rounded-[30px] bg-white p-5 shadow-sm dark:bg-gray-800">
        <p className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Minuta</p>
        <div className="space-y-3">
          <Button type="button" variant="outline" className="h-11 w-full justify-start rounded-2xl border-0 shadow-sm" onClick={onOpenAssinatura}>
            <Signature className="mr-2 h-4 w-4" />{formData.assinatura_recolhedor_nome ? `Assinado por ${formData.assinatura_recolhedor_nome}` : 'Coletar assinatura'}
          </Button>
          <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-[24px] bg-gray-100 text-sm text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">
            <Paperclip className="mb-2 h-5 w-5" />Adicionar anexos
            <input id="consumo-anexo-input" type="file" multiple className="hidden" />
          </label>
        </div>

        <div className="mt-5 rounded-[24px] bg-gray-50 p-4 shadow-sm dark:bg-gray-900">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <Clock3 className="h-3.5 w-3.5" />Resumo da minuta
          </div>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <p><strong>Destinação:</strong> {formData.destinacao || '—'}</p>
            <p><strong>Interveniente:</strong> {formData.responsavel_recebimento || '—'}</p>
            <p><strong>Registrado por:</strong> {currentUser?.full_name || currentUser?.email || '—'}</p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button type="button" variant="outline" onClick={onBack} className="h-12 flex-1 rounded-2xl border-0 shadow-sm">
            Voltar
          </Button>
          <Button type="button" onClick={onSubmit} className="h-12 flex-1 rounded-2xl bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900">
            Concluir
          </Button>
        </div>
      </div>
    </div>
  );
}