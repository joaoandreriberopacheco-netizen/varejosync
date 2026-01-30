import React, { useState, useEffect, Suspense } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Truck, FileText, Calendar, PlusCircle, CheckCircle, Search, Ship } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function VincularManifestosSupermanifestos({ manifestosAguardando, onRefresh }) {
  const [selectedManifestos, setSelectedManifestos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showVincularDialog, setShowVincularDialog] = useState(false);
  const [transportadoras, setTransportadoras] = useState([]);
  const [transportadoraSelecionada, setTransportadoraSelecionada] = useState('');
  const [eta, setEta] = useState('');
  const [showNovoSupermanifesto, setShowNovoSupermanifesto] = useState(false);
  const [showDiscriminarVolumes, setShowDiscriminarVolumes] = useState(false);
  const [createdSupermanifesto, setCreatedSupermanifesto] = useState(null);

  useEffect(() => {
    loadTransportadoras();
  }, []);

  const loadTransportadoras = async () => {
    try {
      const data = await base44.entities.Terceiro.filter({
        tipo: { $in: ['Fornecedor', 'Ambos'] },
        ativo: true
      });
      setTransportadoras(data);
    } catch (error) {
      console.error('Erro ao carregar transportadoras:', error);
    }
  };

  const manifestosFiltrados = manifestosAguardando.filter(m => 
    m.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.fornecedor_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleManifesto = (manifestoId) => {
    setSelectedManifestos(prev => 
      prev.includes(manifestoId) 
        ? prev.filter(id => id !== manifestoId)
        : [...prev, manifestoId]
    );
  };

  const handleVincular = () => {
    if (selectedManifestos.length === 0) {
      toast.error('Selecione pelo menos um manifesto');
      return;
    }
    setShowVincularDialog(true);
  };

  const confirmarVinculacao = async () => {
    if (!transportadoraSelecionada || !eta) {
      toast.error('Preencha a transportadora e ETA');
      return;
    }

    try {
      const transportadora = transportadoras.find(t => t.id === transportadoraSelecionada);
      
      // Gerar número do supermanifesto
      const todosSupermanifestos = await base44.entities.Supermanifesto.list();
      const numero = `SM-${String(todosSupermanifestos.length + 1).padStart(5, '0')}`;

      // Criar o supermanifesto
      const novoSupermanifesto = await base44.entities.Supermanifesto.create({
        numero,
        transportadora_id: transportadoraSelecionada,
        transportadora_nome: transportadora.nome,
        eta: eta,
        status: 'Pendente',
        peso_total_bruto_kg: 0,
        pedidos_vinculados: []
      });

      // Vincular todos os manifestos selecionados ao supermanifesto
      for (const manifestoId of selectedManifestos) {
        await base44.entities.ManifestoEntrada.update(manifestoId, {
          supermanifesto_id: novoSupermanifesto.id
        });
      }

      toast.success(`Supermanifesto ${numero} criado com ${selectedManifestos.length} manifesto(s)`);
      setSelectedManifestos([]);
      setShowVincularDialog(false);
      setTransportadoraSelecionada('');
      setEta('');
      onRefresh();
    } catch (error) {
      console.error('Erro ao vincular:', error);
      toast.error('Erro ao criar supermanifesto');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar manifesto..." 
            className="pl-9 bg-gray-50 border-0 shadow-sm" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <Button 
          onClick={handleVincular} 
          disabled={selectedManifestos.length === 0}
          className="bg-blue-600 hover:bg-blue-700 gap-2 shadow-sm"
        >
          <Ship className="w-4 h-4" />
          Criar Supermanifesto ({selectedManifestos.length})
        </Button>
      </div>

      {manifestosFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhum manifesto aguardando vinculação</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {manifestosFiltrados.map(manifesto => {
            const isSelected = selectedManifestos.includes(manifesto.id);
            return (
              <div
                key={manifesto.id}
                onClick={() => toggleManifesto(manifesto.id)}
                className={`p-5 rounded-xl cursor-pointer transition-all border ${
                  isSelected 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-md' 
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    isSelected 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isSelected && <CheckCircle className="w-5 h-5 text-white" />}
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Número</p>
                      <p className="font-medium text-gray-900 dark:text-white">{manifesto.numero}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Fornecedor</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{manifesto.fornecedor_nome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Pedido Principal</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{manifesto.pedido_numero}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Status</p>
                      <Badge className="bg-gray-100 text-gray-700 border-0">
                        {manifesto.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showVincularDialog} onOpenChange={setShowVincularDialog}>
        <DialogContent className="dark:bg-gray-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ship className="w-5 h-5 text-blue-600" />
              Criar Supermanifesto
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Agrupando <strong>{selectedManifestos.length} manifesto(s)</strong> em um supermanifesto de transporte.
              </p>
            </div>

            <div>
              <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Transportadora *</Label>
              <Select value={transportadoraSelecionada} onValueChange={setTransportadoraSelecionada}>
                <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-0 shadow-sm">
                  <SelectValue placeholder="Selecione a transportadora..." />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800">
                  {transportadoras.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Data de Chegada (ETA) *</Label>
              <Input
                type="datetime-local"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
                className="bg-gray-50 dark:bg-gray-700 border-0 shadow-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVincularDialog(false)} className="border-0 shadow-sm">
              Cancelar
            </Button>
            <Button onClick={confirmarVinculacao} className="bg-blue-600 hover:bg-blue-700">
              Criar Supermanifesto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Discriminar Volumes - importado dinamicamente */}
      {showDiscriminarVolumes && (
        <DiscriminarVolumesManifesto
          manifesto={createdSupermanifesto}
          isOpen={showDiscriminarVolumes}
          onClose={() => {
            setShowDiscriminarVolumes(false);
            setCreatedSupermanifesto(null);
          }}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}

// Import dinâmico do componente
const DiscriminarVolumesManifesto = React.lazy(() => 
  import('./DiscriminarVolumesManifesto')
);