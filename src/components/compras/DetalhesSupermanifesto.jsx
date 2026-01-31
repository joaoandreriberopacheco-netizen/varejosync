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

  const handlePrint = async () => {
    try {
      setPrinting(true);
      const { data } = await base44.functions.invoke('gerarRelatorioSupermanifesto', {
        supermanifesto_id: manifesto.id
      });

      if (data.pdfBase64) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${data.pdfBase64}`;
        link.download = `Relatorio_Supermanifesto_${manifesto.numero}.pdf`;
        link.click();
        toast.success('Relatório gerado com sucesso!');
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-gray-100 dark:border-gray-700">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Truck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            {manifesto.numero} - Detalhes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Cabeçalho: Info Principal */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
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

          {/* Total de Volumes - PDV Style */}
          <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm">
                 <PackageIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </div>
              <span className="text-base font-medium text-gray-600 dark:text-gray-300">Total de Volumes</span>
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{totalVolumes}</span>
          </div>

          {/* Manifestos Vinculados */}
          <div className="space-y-6">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2 px-1">
              Manifestos Vinculados
            </h4>
            
            {loading ? (
              <div className="text-center py-12 text-gray-400">Carregando manifestos...</div>
            ) : manifestosVinculados.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                Nenhum manifesto vinculado
              </div>
            ) : (
              <div className="grid gap-4">
                {manifestosVinculados.map((m, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
                    <div className="flex flex-col gap-4">
                      {/* Cabeçalho Manifesto */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                            {m.numero}
                          </h5>
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <User className="w-4 h-4" />
                            <span className="text-sm font-medium">{m.fornecedor_nome}</span>
                          </div>
                        </div>
                        <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-0 px-3 py-1">
                          {m.pedido_numero || 'S/ Pedido'}
                        </Badge>
                      </div>

                      {/* Lista de Volumes */}
                      {m.volumes && m.volumes.length > 0 ? (
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 space-y-3">
                          <p className="text-xs uppercase text-gray-400 font-semibold tracking-wider mb-2">Volumes Discriminados</p>
                          {m.volumes.map((vol, vIdx) => (
                            <div key={vIdx} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                              <span className="text-gray-700 dark:text-gray-200 font-medium">
                                {vol.descricao}
                              </span>
                              <div className="flex gap-4 text-sm">
                                <span className="text-gray-500">
                                  Qtd: <strong className="text-gray-900 dark:text-white">{vol.quantidade}</strong>
                                </span>
                                <span className="text-gray-500">
                                  Peso: <strong className="text-gray-900 dark:text-white">{vol.peso_kg}kg</strong>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 italic px-2">
                          Nenhum volume discriminado.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Descritivo Consolidado (Rodapé) */}
          {manifesto.observacoes_consolidadas && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Descritivo Consolidado de Volumes
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {manifesto.observacoes_consolidadas}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-gray-100 dark:border-gray-700 pt-4 flex justify-between sm:justify-between w-full">
          <Button 
            variant="ghost" 
            onClick={handlePrint} 
            disabled={printing}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white gap-2"
          >
            {printing ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <Printer className="w-4 h-4" />}
            {printing ? 'Gerando...' : 'Imprimir Relatório'}
          </Button>
          <Button variant="outline" onClick={onClose} className="rounded-lg">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}