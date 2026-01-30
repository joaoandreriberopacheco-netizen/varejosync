import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, CheckCircle, AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function ConferenciaVolumes() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const codigo = searchParams.get('codigo');

  const [manifesto, setManifesto] = useState(null);
  const [conferente, setConferente] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [volumes, setVolumes] = useState([{ descricao: '', quantidade: '' }]);
  const [finalizando, setFinalizando] = useState(false);

  useEffect(() => {
    if (!codigo) {
      navigate('/ConferenciaEntrada');
      return;
    }
    carregarDados();
  }, [codigo]);

  const carregarDados = async () => {
    try {
      const response = await base44.functions.invoke('validateConferenceCode', { codigo });
      
      if (!response.data.success) {
        toast.error(response.data.error || 'Código inválido');
        navigate('/ConferenciaEntrada');
        return;
      }

      if (response.data.tipo !== 'volumes') {
        toast.error('Este código é para conferência de itens');
        navigate('/ConferenciaEntrada');
        return;
      }

      setManifesto(response.data.manifesto);
      setConferente(response.data.conferente);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar dados');
      navigate('/ConferenciaEntrada');
    } finally {
      setCarregando(false);
    }
  };

  const handleAddVolume = () => {
    setVolumes([...volumes, { descricao: '', quantidade: '' }]);
  };

  const handleRemoveVolume = (index) => {
    if (volumes.length > 1) {
      setVolumes(volumes.filter((_, i) => i !== index));
    }
  };

  const handleVolumeChange = (index, field, value) => {
    const novosVolumes = [...volumes];
    novosVolumes[index][field] = value;
    setVolumes(novosVolumes);
  };

  const handleFinalizar = async () => {
    // Validar
    const volumesValidos = volumes.filter(v => v.descricao.trim() && v.quantidade);
    if (volumesValidos.length === 0) {
      toast.error('Adicione pelo menos um volume');
      return;
    }

    try {
      setFinalizando(true);

      // Atualizar supermanifesto com dados conferidos
      const volumesConferidos = volumesValidos.map(v => ({
        descricao: v.descricao.trim(),
        quantidade: parseFloat(v.quantidade)
      }));

      await base44.entities.Supermanifesto.update(manifesto.id, {
        volumes_conferidos: volumesConferidos,
        data_conferencia_volumes: new Date().toISOString(),
        conferente_volumes_id: conferente.id,
        conferente_volumes_nome: conferente.full_name,
        status_codigo_conferencia_volumes: 'Concluído'
      });

      toast.success('Conferência de volumes concluída!');
      navigate('/HubLogistico');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao finalizar conferência');
    } finally {
      setFinalizando(false);
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Package className="w-7 h-7 text-gray-700 dark:text-gray-300" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Conferência de Volumes</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Registre os volumes recebidos</p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">Conferência Cega Ativa</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Registre APENAS o que você está recebendo fisicamente, sem consultar documentos.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário de Volumes */}
        <div className="space-y-3">
          {volumes.map((volume, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">
                      Descrição
                    </label>
                    <Input
                      placeholder="Ex: Caixas de papelão"
                      value={volume.descricao}
                      onChange={(e) => handleVolumeChange(index, 'descricao', e.target.value)}
                      className="bg-gray-50 dark:bg-gray-900 border-0 shadow-sm h-11"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">
                      Quantidade
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={volume.quantidade}
                      onChange={(e) => handleVolumeChange(index, 'quantidade', e.target.value)}
                      className="bg-gray-50 dark:bg-gray-900 border-0 shadow-sm h-11"
                    />
                  </div>
                </div>
                {volumes.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveVolume(index)}
                    className="mt-7 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={handleAddVolume}
            className="w-full h-12 border-0 bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Volume
          </Button>
        </div>

        {/* Ações */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/HubLogistico')}
              className="flex-1 h-12 border-0 shadow-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleFinalizar}
              disabled={finalizando}
              className="flex-1 h-12 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 shadow-lg"
            >
              {finalizando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Finalizar Conferência
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}