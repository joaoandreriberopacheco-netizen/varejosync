import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, Calendar, Weight, Package as PackageIcon, User, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export default function DetalhesSupermanifesto({ manifesto, isOpen, onClose }) {
  const [manifestosVinculados, setManifestosVinculados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (isOpen && manifesto) {
      loadManifestosVinculados();
    }
  }, [isOpen, manifesto]);

  const loadManifestosVinculados = async () => {
    setLoading(true);
    try {
      const manifestos = await base44.entities.ManifestoEntrada.filter({ 
        supermanifesto_id: manifesto.id 
      });
      setManifestosVinculados(manifestos);
    } catch (error) {
      console.error('Erro ao carregar manifestos vinculados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (tipo) => {
    try {
      setPrinting(true);
      const { data } = await base44.functions.invoke('gerarRelatorioSupermanifesto', {
        supermanifesto_id: manifesto.id,
        tipo: tipo // 'volumes' ou 'carga'
      });

      if (data.pdfBase64) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${data.pdfBase64}`;
        const sufixo = tipo === 'carga' ? 'Carga' : 'Volumes';
        link.download = `Relatorio_${sufixo}_${manifesto.numero}.pdf`;
        link.click();
        toast.success(`Relatório de ${sufixo} gerado com sucesso!`);
      } else {
        throw new Error('Falha ao gerar PDF');
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setPrinting(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'Pendente': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'Em Trânsito': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'Recebido': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      'Cancelado': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const totalVolumes = manifestosVinculados.reduce((acc, m) => {
    return acc + (m.volumes?.reduce((sum, v) => sum + (v.quantidade || 0), 0) || 0);
  }, 0);

  if (!manifesto) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto dark:bg-gray-900 dark:border-gray-800">
        <DialogHeader className="pb-3 border-b border-gray-100 dark:border-gray-700">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
            <Truck className="w-4 h-4 text-gray-400" />
            {manifesto.numero} — Detalhes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Cabeçalho: Info Principal */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Transportadora</p>
              <p className="font-semibold text-gray-900 dark:text-white">{manifesto.transportadora_nome}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Status</p>
              <Badge className={`${getStatusBadge(manifesto.status)} border-0 font-medium px-2.5 py-1`}>
                {manifesto.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">ETA</p>
              <p className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {manifesto.eta ? format(parseISO(manifesto.eta), 'dd/MM/yyyy HH:mm') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Peso Total</p>
              <p className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                <Weight className="w-3.5 h-3.5 text-gray-400" />
                {manifesto.peso_total_bruto_kg?.toFixed(2) || '0.00'} kg
              </p>
            </div>
          </div>

          {/* Total de Volumes */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
            <div className="flex items-center gap-2">
              <PackageIcon className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Total de Volumes</span>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{totalVolumes}</span>
          </div>

          {/* Manifestos Vinculados */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1">
              Manifestos Vinculados
            </p>
            {loading ? (
              <div className="text-center py-8 text-xs text-gray-400">Carregando...</div>
            ) : manifestosVinculados.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                Nenhum manifesto vinculado
              </div>
            ) : (
              <div className="space-y-2">
                {manifestosVinculados.map((m, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 dark:border-gray-700/50">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">{m.numero}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{m.fornecedor_nome}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                        {m.pedido_numero || 'S/ Pedido'}
                      </span>
                    </div>
                    {m.volumes && m.volumes.length > 0 ? (
                      <div className="px-4 py-2 space-y-1">
                        {m.volumes.map((vol, vIdx) => (
                          <div key={vIdx} className="flex items-center justify-between py-1 border-b border-gray-50 dark:border-gray-700/30 last:border-0">
                            <span className="text-xs text-gray-600 dark:text-gray-300">{vol.descricao}</span>
                            <div className="flex gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                              <span>Qtd <strong className="text-gray-700 dark:text-gray-200">{vol.quantidade}</strong></span>
                              <span>{vol.peso_kg}kg</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="px-4 py-2 text-xs text-gray-400 italic">Nenhum volume discriminado.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Descritivo Consolidado */}
          {manifesto.observacoes_consolidadas && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                Descritivo Consolidado
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {manifesto.observacoes_consolidadas}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-gray-100 dark:border-gray-700 pt-3 flex flex-col sm:flex-row gap-2 sm:justify-between w-full">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={() => handlePrint('volumes')} disabled={printing}
              className="gap-1.5 flex-1 sm:flex-none h-8 text-xs bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              {printing ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <PackageIcon className="w-3.5 h-3.5" />}
              Volumes
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handlePrint('carga')} disabled={printing}
              className="gap-1.5 flex-1 sm:flex-none h-8 text-xs bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              {printing ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              Carga
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs text-gray-500 dark:text-gray-400 w-full sm:w-auto">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}