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

      toast.success('Volumes salvos com sucesso!');
      
      // Limpa os campos para adicionar novos volumes
      setDescricao('');
      setQuantidade('');
      setPeso('');
      descricaoRef.current?.focus();
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
      <div className="bg-white dark:bg-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl('Compras'))}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-medium text-gray-700 dark:text-gray-300">
                Discriminar Volumes
              </h1>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {manifesto.numero}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Input de Descrição */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
          <Input
            ref={descricaoRef}
            placeholder="Nome, código ou descrição do volume"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, quantidadeRef)}
            className="text-base bg-transparent border-0 focus-visible:ring-0 px-0 placeholder:text-gray-400"
          />
        </div>

        {/* Quantidade e Peso */}
        <div className="flex gap-3">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex-1">
            <Input
              ref={quantidadeRef}
              type="number"
              inputMode="numeric"
              placeholder="Quantidade"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, pesoRef)}
              className="text-base bg-transparent border-0 focus-visible:ring-0 px-0 placeholder:text-gray-400 text-center font-medium"
            />
          </div>
          
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex-1">
            <Input
              ref={pesoRef}
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="Peso (kg)"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'add')}
              className="text-base bg-transparent border-0 focus-visible:ring-0 px-0 placeholder:text-gray-400 text-center"
            />
          </div>
        </div>

        {/* Botão Adicionar */}
        <Button
          onClick={handleAddVolume}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl py-6 text-base font-medium"
        >
          Adicionar
        </Button>

        {/* Resumo */}
        {volumes.length > 0 && (
          <div className="flex items-center justify-between px-2 py-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
            <div className="text-right">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {totalVolumes} {totalVolumes === 1 ? 'volume' : 'volumes'}
              </div>
              {pesoTotal > 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {pesoTotal.toFixed(2)} kg
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lista de Volumes */}
        {volumes.length > 0 ? (
          <div className="space-y-3">
            {volumes.map((vol, index) => (
              <div
                key={index}
                className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {vol.descricao}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <span>{vol.quantidade} un.</span>
                    {vol.peso_kg && <span>• {vol.peso_kg} kg</span>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveVolume(index)}
                  className="text-gray-400 hover:text-red-500 hover:bg-transparent"
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-400 dark:text-gray-500">
              Nenhum volume adicionado ainda
            </p>
          </div>
        )}

        {/* Botão Salvar Fixo */}
        {volumes.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="max-w-2xl mx-auto">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl py-6 text-base font-medium"
              >
                <Save className="w-5 h-5 mr-2" />
                Salvar Volumes
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}