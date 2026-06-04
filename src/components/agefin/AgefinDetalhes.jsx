import React, { useState } from 'react';
import { ChevronLeft, Upload, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function AgefinDetalhes({ conta, onBack, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleMarkAsPaid = async () => {
    setLoading(true);
    try {
      await base44.entities.ContaPrevista.update(conta.id, { status: 'Pago', status_visual: 'pago' });
      onUpdate?.();
      onBack();
    } catch (err) {
      setError('Erro ao marcar como pago');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Deseja realmente remover esta conta?')) return;
    setLoading(true);
    try {
      await base44.entities.ContaPrevista.delete(conta.id);
      onUpdate?.();
      onBack();
    } catch (err) {
      setError('Erro ao remover conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/40">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-full">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">{conta.descricao}</h2>
          <p className="text-sm text-muted-foreground">
            {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Value */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-3xl p-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">Valor</p>
        <p className="text-4xl font-bold text-foreground">
          R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Info */}
      <div className="space-y-3">
        <InfoRow label="Status" value={conta.status} />
        <InfoRow label="Natureza" value={conta.natureza} />
        <InfoRow label="Categoria" value={conta.categoria_nome || 'N/A'} />
        <InfoRow label="Beneficiário" value={conta.terceiro_nome || 'N/A'} />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 pt-4">
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={loading}
          className="rounded-2xl h-14"
        >
          <Trash2 className="w-5 h-5 mr-2" />
          Remover
        </Button>
        {conta.status !== 'Pago' && (
          <Button
            onClick={handleMarkAsPaid}
            disabled={loading}
            className="rounded-2xl h-14 bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Marcar Pago
          </Button>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-2xl">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}