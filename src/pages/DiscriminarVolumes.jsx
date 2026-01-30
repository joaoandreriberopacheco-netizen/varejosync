import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Plus, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function DiscriminarVolumes() {
  const navigate = useNavigate();
  const descricaoRef = useRef(null);
  const quantidadeRef = useRef(null);
  const pesoRef = useRef(null);

  const [manifesto, setManifesto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [peso, setPeso] = useState('');
  const [volumes, setVolumes] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const manifestoId = params.get('id');
    const tipo = params.get('tipo');

    if (manifestoId && tipo) {
      loadManifesto(manifestoId, tipo);
    } else {
      toast.error('Manifesto não encontrado');
      navigate(createPageUrl('Compras'));
    }
  }, []);

  useEffect(() => {
    if (!loading && descricaoRef.current) {
      descricaoRef.current.focus();
    }
  }, [loading]);

  const loadManifesto = async (id, tipo) => {
    try {
      setLoading(true);
      let data;
      
      if (tipo === 'supermanifesto') {
        data = await base44.entities.Supermanifesto.filter({ id });
        if (data && data.length > 0) {
          setManifesto({ ...data[0], tipo: 'supermanifesto' });
          setVolumes(data[0].volumes || []);
        }
      } else {
        data = await base44.entities.ManifestoEntrada.filter({ id });
        if (data && data.length > 0) {
          setManifesto({ ...data[0], tipo: 'manifesto' });
          setVolumes(data[0].volumes || []);
        }
      }

      if (!data || data.length === 0) {
        toast.error('Manifesto não encontrado');
        navigate(createPageUrl('Compras'));
      }
    } catch (error) {
      console.error('Erro ao carregar manifesto:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVolume = () => {
    if (!descricao.trim()) {
      toast.error('Informe a descrição do volume');
      descricaoRef.current?.focus();
      return;
    }

    if (!quantidade || isNaN(quantidade) || parseInt(quantidade) <= 0) {
      toast.error('Informe uma quantidade válida');
      quantidadeRef.current?.focus();
      return;
    }

    if (peso && (isNaN(peso) || parseFloat(peso) < 0)) {
      toast.error('Informe um peso válido');
      pesoRef.current?.focus();
      return;
    }

    const novoVolume = {
      descricao: descricao.trim(),
      quantidade: parseInt(quantidade),
      peso_kg: peso ? parseFloat(peso) : null
    };

    setVolumes([...volumes, novoVolume]);
    setDescricao('');
    setQuantidade('');
    setPeso('');
    descricaoRef.current?.focus();
  };

  const handleRemoveVolume = (index) => {
    setVolumes(volumes.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e, nextRef) => {
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      if (nextRef === 'add') {
        handleAddVolume();
      } else {
        nextRef?.current?.focus();
      }
    }
  };

  const handleSave = async () => {
    if (volumes.length === 0) {
      toast.error('Adicione pelo menos um volume');
      return;
    }

    try {
      setSaving(true);

      const updateData = { volumes };

      if (manifesto.tipo === 'supermanifesto') {
        await base44.entities.Supermanifesto.update(manifesto.id, updateData);
      } else {
        await base44.entities.ManifestoEntrada.update(manifesto.id, updateData);
      }

      toast.success('Volumes salvos com sucesso');
      navigate(createPageUrl('Compras'));
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar volumes');
    } finally {
      setSaving(false);
    }
  };

  const totalVolumes = volumes.reduce((sum, v) => sum + v.quantidade, 0);
  const pesoTotal = volumes.reduce((sum, v) => sum + (v.peso_kg || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Carregando...</div>
      </div>
    );
  }

  if (!manifesto) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl('Compras'))}
              className="text-gray-600 dark:text-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Discriminar Volumes
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {manifesto.numero}
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || volumes.length === 0}
              className="bg-gray-900 hover:bg-gray-800 text-white gap-2 rounded-lg"
            >
              <Save className="w-4 h-4" />
              Salvar
            </Button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-4">
          <div className="grid gap-3">
            <Input
              ref={descricaoRef}
              placeholder="Descrição do volume (ex: Caixas de papelão)"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, quantidadeRef)}
              className="text-base"
            />
            
            <div className="grid grid-cols-2 gap-3">
              <Input
                ref={quantidadeRef}
                type="number"
                inputMode="numeric"
                placeholder="Quantidade"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, pesoRef)}
                className="text-base"
              />
              
              <Input
                ref={pesoRef}
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="Peso (kg) - Opcional"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'add')}
                className="text-base"
              />
            </div>

            <Button
              onClick={handleAddVolume}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white gap-2 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Adicionar Volume
            </Button>
          </div>
        </div>

        {/* Resumo */}
        {volumes.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Package className="w-4 h-4" />
                <span>Total de Volumes</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">{totalVolumes}</span>
            </div>
            {pesoTotal > 0 && (
              <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Peso Total</span>
                <span className="font-semibold text-gray-900 dark:text-white">{pesoTotal.toFixed(2)} kg</span>
              </div>
            )}
          </div>
        )}

        {/* Lista de Volumes */}
        {volumes.length > 0 ? (
          <div className="space-y-2">
            {volumes.map((vol, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {vol.descricao}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>Qtd: {vol.quantidade}</span>
                    {vol.peso_kg && <span>Peso: {vol.peso_kg} kg</span>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveVolume(index)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhum volume adicionado ainda
            </p>
          </div>
        )}
      </div>
    </div>
  );
}