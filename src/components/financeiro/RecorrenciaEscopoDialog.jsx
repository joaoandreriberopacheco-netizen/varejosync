import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RefreshCw, ChevronRight, FileEdit, Loader2 } from 'lucide-react';

const OPCOES_PAGAMENTO = [
  { value: 'apenas_esta',  label: 'Apenas esta',          desc: 'Altera somente este lançamento' },
  { value: 'todas',        label: 'Todas',                 desc: 'Altera todas do grupo (exceto pagas)' },
  { value: 'futuras',      label: 'Esta e futuras',        desc: 'A partir desta data (exceto pagas)' },
  { value: 'passadas',     label: 'Esta e anteriores',     desc: 'Até esta data (exceto pagas)' },
];

const OPCOES_CADASTRO = [
  { value: 'apenas_esta', label: 'Só esta parcela', desc: 'Descrição, valor e vencimento só neste mês.' },
  {
    value: 'futuras',
    label: 'Esta e as futuras',
    desc: 'Parcelas em aberto desta mesma conta (mesmo vínculo), a partir desta competência. Não mistura outras linhas do mesmo grupo.',
  },
  { value: 'todas', label: 'Todas em aberto', desc: 'Todas as parcelas não pagas desta mesma conta (mesmo vínculo).' },
];

export default function RecorrenciaEscopoDialog({ open, onClose, onConfirm, mode = 'pagamento' }) {
  const [working, setWorking] = useState(false);

  if (!open) return null;
  const opcoes = mode === 'cadastro' ? OPCOES_CADASTRO : OPCOES_PAGAMENTO;
  const Icon = mode === 'cadastro' ? FileEdit : RefreshCw;
  const titulo = mode === 'cadastro' ? 'Recorrência — dados da conta' : 'Lançamento recorrente';
  const subtitulo =
    mode === 'cadastro'
      ? 'Aplicar descrição, valor e vencimento onde?'
      : 'Como deseja aplicar a alteração?';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-xs p-0 gap-0 dark:bg-background dark:border-border/40 rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{titulo}</p>
        </div>
        <p className="text-xs text-muted-foreground px-5 pb-3">{subtitulo}</p>
        <div className="h-px bg-muted" />
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {opcoes.map(op => (
            <button
              key={op.value}
              type="button"
              disabled={working}
              onClick={async () => {
                setWorking(true);
                try {
                  await Promise.resolve(onConfirm(op.value));
                } finally {
                  setWorking(false);
                  onClose();
                }
              }}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors text-left disabled:opacity-50 disabled:pointer-events-none"
            >
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{op.label}</p>
                <p className="text-[0.65rem] text-muted-foreground mt-0.5">{op.desc}</p>
              </div>
              {working ? (
                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin flex-none" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-muted-foreground flex-none" />
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}