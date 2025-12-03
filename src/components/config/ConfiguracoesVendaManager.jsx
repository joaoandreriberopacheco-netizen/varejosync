import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from "@/components/ui/use-toast";
import { getTenantId } from '@/components/utils/tenant';
import { Store, ShoppingBag, Truck, Save, Settings2 } from 'lucide-react';

export default function ConfiguracoesVendaManager() {
    const [config, setConfig] = useState({
        fluxo_venda_padrao: 'completo',
        auto_delivery_balcao: true,
        exibir_estoque_pdv: true,
        permitir_venda_sem_estoque: false,
        bloquear_venda_preco_zero: true
    });
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const tenantId = getTenantId();
            if (!tenantId) return;

            const configs = await base44.entities.ConfiguracoesVenda.filter({ empresa_id: tenantId });
            if (configs && configs.length > 0) {
                setConfig(configs[0]);
            }
        } catch (error) {
            console.error("Erro ao carregar configurações:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const tenantId = getTenantId();
            if (!tenantId) {
                toast({ title: "Erro", description: "Empresa não identificada", variant: "destructive" });
                return;
            }

            const configs = await base44.entities.ConfiguracoesVenda.filter({ empresa_id: tenantId });
            const dataToSave = { ...config, empresa_id: tenantId };

            if (configs && configs.length > 0) {
                await base44.entities.ConfiguracoesVenda.update(configs[0].id, dataToSave);
            } else {
                await base44.entities.ConfiguracoesVenda.create(dataToSave);
            }
            toast({ title: "Configurações salvas", className: "bg-green-100 text-green-800", duration: 3000 });
        } catch (error) {
            toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        }
    };

    return (
        <Card className="font-glacial border-0 shadow-sm bg-white dark:bg-gray-800">
            <CardHeader className="pb-2 border-b border-slate-50 bg-slate-50/30">
                <CardTitle className="text-base md:text-lg font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-sky-500" />
                    Parâmetros de Venda
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                
                <div className="space-y-3">
                    <Label className="text-slate-700 font-medium">Fluxo de Venda Padrão</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div 
                            className={`cursor-pointer p-4 rounded-xl border transition-all relative overflow-hidden group ${config.fluxo_venda_padrao === 'completo' ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-500 shadow-sm' : 'border-slate-200 hover:border-sky-200 hover:bg-slate-50'}`}
                            onClick={() => setConfig({...config, fluxo_venda_padrao: 'completo'})}
                        >
                            <div className="flex items-center gap-2 mb-2 relative z-10">
                                <div className={`p-2 rounded-lg ${config.fluxo_venda_padrao === 'completo' ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500'}`}>
                                    <Truck className="w-5 h-5" />
                                </div>
                                <span className={`font-medium ${config.fluxo_venda_padrao === 'completo' ? 'text-sky-900' : 'text-slate-700'}`}>Completo</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed relative z-10 line-clamp-2 md:line-clamp-none">Fluxo de 3 etapas: Venda, Pagamento e Entrega/Separação em momentos distintos.</p>
                        </div>

                        <div 
                            className={`cursor-pointer p-4 rounded-xl border transition-all relative overflow-hidden group flex flex-col justify-between ${config.fluxo_venda_padrao === 'balcao' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 shadow-sm' : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'}`}
                            onClick={() => setConfig({...config, fluxo_venda_padrao: 'balcao'})}
                        >
                            <div className="flex items-center gap-2 mb-2 relative z-10">
                                <div className={`p-2 rounded-lg ${config.fluxo_venda_padrao === 'balcao' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                    <ShoppingBag className="w-5 h-5" />
                                </div>
                                <span className={`font-medium ${config.fluxo_venda_padrao === 'balcao' ? 'text-emerald-900' : 'text-slate-700'}`}>Balcão</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed relative z-10 line-clamp-2 md:line-clamp-none">Fluxo de 2 etapas: Venda e Pagamento/Entrega juntos. Delivery opcional.</p>
                        </div>

                        <div 
                            className={`cursor-pointer p-4 rounded-xl border transition-all relative overflow-hidden group flex flex-col justify-between ${config.fluxo_venda_padrao === 'supermercado' ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500 shadow-sm' : 'border-slate-200 hover:border-violet-200 hover:bg-slate-50'}`}
                            onClick={() => setConfig({...config, fluxo_venda_padrao: 'supermercado'})}
                        >
                            <div className="flex items-center gap-2 mb-2 relative z-10">
                                <div className={`p-2 rounded-lg ${config.fluxo_venda_padrao === 'supermercado' ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-500'}`}>
                                    <Store className="w-5 h-5" />
                                </div>
                                <span className={`font-medium ${config.fluxo_venda_padrao === 'supermercado' ? 'text-violet-900' : 'text-slate-700'}`}>Supermercado</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed relative z-10 line-clamp-2 md:line-clamp-none">Fluxo único: Venda, Pagamento e Entrega na mesma tela (PDV Ágil).</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between space-x-2 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="flex flex-col space-y-1">
                                <Label htmlFor="exibir_estoque" className="font-medium text-slate-700 cursor-pointer">Exibir Estoque no PDV</Label>
                                <span className="text-xs text-slate-500">Mostra quantidade disponível ao vender</span>
                            </div>
                            <Switch 
                                id="exibir_estoque" 
                                checked={config.exibir_estoque_pdv}
                                onCheckedChange={(v) => setConfig({...config, exibir_estoque_pdv: v})}
                            />
                        </div>

                        <div className="flex items-center justify-between space-x-2 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="flex flex-col space-y-1">
                                <Label htmlFor="auto_delivery" className="font-medium text-slate-700 cursor-pointer">Auto-Delivery (Balcão)</Label>
                                <span className="text-xs text-slate-500">Padrão 'Retirada' para vendas balcão</span>
                            </div>
                            <Switch 
                                id="auto_delivery" 
                                checked={config.auto_delivery_balcao}
                                onCheckedChange={(v) => setConfig({...config, auto_delivery_balcao: v})}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between space-x-2 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="flex flex-col space-y-1">
                                <Label htmlFor="venda_sem_estoque" className="font-medium text-slate-700 cursor-pointer">Vender sem Estoque</Label>
                                <span className="text-xs text-slate-500">Permite negativar o estoque</span>
                            </div>
                            <Switch 
                                id="venda_sem_estoque" 
                                checked={config.permitir_venda_sem_estoque}
                                onCheckedChange={(v) => setConfig({...config, permitir_venda_sem_estoque: v})}
                            />
                        </div>

                        <div className="flex items-center justify-between space-x-2 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="flex flex-col space-y-1">
                                <Label htmlFor="venda_zero" className="font-medium text-slate-700 cursor-pointer">Bloquear Preço Zero</Label>
                                <span className="text-xs text-slate-500">Impede venda de itens sem preço</span>
                            </div>
                            <Switch 
                                id="venda_zero" 
                                checked={config.bloquear_venda_preco_zero}
                                onCheckedChange={(v) => setConfig({...config, bloquear_venda_preco_zero: v})}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} className="bg-sky-600 hover:bg-sky-700 text-white gap-2 shadow-sm">
                        <Save className="w-4 h-4" />
                        Salvar Parâmetros
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}