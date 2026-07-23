import React, { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { REPORT_NIVEL_OPTIONS } from '@/lib/relatorioSugestaoCompra/reportData';
import { cn } from '@/components/utils';

export default function SugestaoCompraRelatorioDialog({
  open,
  onOpenChange,
  filteredCount = 0,
  isGenerating = false,
  onConfirm,
}) {
  const [format, setFormat] = useState('pdf');
  const [agruparNivel, setAgruparNivel] = useState('0');

  const handleConfirm = () => {
    onConfirm?.({
      format,
      agruparNivel: Number(agruparNivel) || 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Exportar relatório</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-sm text-muted-foreground">
            {filteredCount > 0
              ? `${filteredCount} item(ns) visíveis na tela serão exportados.`
              : 'Nenhum item visível para exportar.'}
          </p>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Formato</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={cn(
                  'h-11 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-colors',
                  format === 'pdf'
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-muted/40 text-muted-foreground border-border/40',
                )}
              >
                <FileText className="w-4 h-4" />
                PDF (A4 retrato)
              </button>
              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                className={cn(
                  'h-11 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-colors',
                  format === 'xlsx'
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-muted/40 text-muted-foreground border-border/40',
                )}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Agrupar por nível</Label>
            <Select value={agruparNivel} onValueChange={setAgruparNivel}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Sem agrupamento" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_NIVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Com agrupamento, cada curva ABCD mostra subgrupos do cadastro (h1–h5) com média 30d,
              ponto futuro e quantidade sugerida somados.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange?.(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            disabled={filteredCount === 0 || isGenerating}
            onClick={handleConfirm}
          >
            {isGenerating ? 'Gerando...' : 'Gerar relatório'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
