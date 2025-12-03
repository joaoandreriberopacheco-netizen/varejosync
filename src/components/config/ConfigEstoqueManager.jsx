import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function ConfigEstoqueManager() {
  const [config, setConfig] = useState({
    alerta_estoque_minimo: true,
    alerta_validade_proxima: true,
    permitir_venda_estoque_negativo: false,
    contagem_cega_recepcao: true,
    dias_alerta_validade: 30,
    dias_reposicao_automatica: 7
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await base44.entities.ConfiguracoesEstoque.list();
      if (data.length > 0) {
        setConfig(data[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const allConfigs = await base44.entities.ConfiguracoesEstoque.list();
      
      if (allConfigs.length > 0) {
        await base44.entities.ConfiguracoesEstoque.update(allConfigs[0].id, config);
      } else {
        await base44.entities.ConfiguracoesEstoque.create(config);
      }

      toast({
        title: "✓ Configurações salvas!",
        className: "bg-emerald-100 text-emerald-800"
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    }
    setIsSaving(false);
  };

  return (
    <Card className="font-glacial border-0 shadow-sm bg-white dark:bg-gray-800">
      <CardHeader className="pb-2 border-b border-emerald-50 bg-emerald-50/30">
        <CardTitle className="text-base md:text-lg font-medium text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-600" />
          Configurações de Estoque
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-semibold text-gray-700 mb-3">Alertas de Estoque</h3>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-sm md:text-base text-gray-700 dark:text-gray-200">Alerta de estoque mínimo</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">Notificar quando produtos atingirem estoque mínimo</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={config.alerta_estoque_minimo}
                  onChange={e => setConfig({...config, alerta_estoque_minimo: e.target.checked})}
                  className="w-5 h-5 text-emerald-600 accent-emerald-600 cursor-pointer mt-1" 
                />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-sm md:text-base text-gray-700 dark:text-gray-200">Alerta de validade próxima</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">Notificar quando produtos estiverem próximos do vencimento</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={config.alerta_validade_proxima}
                  onChange={e => setConfig({...config, alerta_validade_proxima: e.target.checked})}
                  className="w-5 h-5 text-emerald-600 accent-emerald-600 cursor-pointer mt-1" 
                />
              </div>
            </div>
          </div>

          <div className="border-b pb-4">
            <h3 className="font-semibold text-gray-700 mb-3">Controles</h3>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-sm md:text-base text-gray-700 dark:text-gray-200">Permitir venda com estoque negativo</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">Sistema permitirá vendas mesmo sem estoque disponível</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={config.permitir_venda_estoque_negativo}
                  onChange={e => setConfig({...config, permitir_venda_estoque_negativo: e.target.checked})}
                  className="w-5 h-5 text-emerald-600 accent-emerald-600 cursor-pointer mt-1" 
                />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-sm md:text-base text-gray-700 dark:text-gray-200">Contagem cega na recepção</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">Gateway de recepção não mostra quantidade esperada</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={config.contagem_cega_recepcao}
                  onChange={e => setConfig({...config, contagem_cega_recepcao: e.target.checked})}
                  className="w-5 h-5 text-emerald-600 accent-emerald-600 cursor-pointer mt-1" 
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Dias de antecedência para alertas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Alerta de validade (dias)</Label>
                <Input 
                  type="number" 
                  value={config.dias_alerta_validade}
                  onChange={e => setConfig({...config, dias_alerta_validade: parseInt(e.target.value) || 30})}
                />
              </div>
              <div>
                <Label>Reposição automática (dias)</Label>
                <Input 
                  type="number" 
                  value={config.dias_reposicao_automatica}
                  onChange={e => setConfig({...config, dias_reposicao_automatica: parseInt(e.target.value) || 7})}
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 w-full"
          >
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}