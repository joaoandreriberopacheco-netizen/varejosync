import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, CheckCircle2, RefreshCw, Trash2, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getTenantId, setTenantId, initializeTenant } from '@/components/utils/tenant';

export default function TenantDebugger() {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [logs, setLogs] = useState([]);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    checkCurrentState();
  }, []);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  const checkCurrentState = async () => {
    const tenantId = getTenantId();
    setCurrentTenant(tenantId);
    
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (e) {
      setCurrentUser(null);
    }
  };

  const runDiagnostics = async () => {
    setStatus('loading');
    setLogs([]);
    addLog('Iniciando diagnóstico...', 'info');

    try {
      // 1. Verificar Usuário
      addLog('Verificando usuário logado...', 'info');
      const user = await base44.auth.me();
      if (!user) {
        addLog('ERRO: Usuário não está logado.', 'error');
        setStatus('error');
        return;
      }
      addLog(`Usuário logado: ${user.email} (${user.full_name})`, 'success');

      // 2. Verificar LocalStorage
      addLog('Verificando LocalStorage...', 'info');
      const storedTenantId = getTenantId();
      if (storedTenantId) {
        addLog(`Tenant ID no LocalStorage: ${storedTenantId}`, 'success');
      } else {
        addLog('AVISO: Tenant ID não encontrado no LocalStorage.', 'warning');
      }

      // 3. Verificar Colaborador
      addLog('Buscando vínculo de Colaborador...', 'info');
      const colaboradores = await base44.entities.Colaborador.filter({ email: user.email });
      
      if (colaboradores.length > 0) {
        const colab = colaboradores[0];
        addLog(`Colaborador encontrado. ID: ${colab.id}, Empresa ID vinculado: ${colab.empresa_id}`, 'success');
        
        if (colab.empresa_id === storedTenantId) {
          addLog('✓ O ID do LocalStorage corresponde ao do Colaborador.', 'success');
        } else {
          addLog(`⚠ DESCOMPASSO: LocalStorage (${storedTenantId}) diferente do Colaborador (${colab.empresa_id})`, 'error');
        }

        // 4. Verificar se a empresa existe
        if (colab.empresa_id) {
             addLog(`Verificando existência da empresa ${colab.empresa_id}...`, 'info');
             // Como não podemos buscar por ID diretamente sem filter (às vezes), usamos filter ou assumimos que existe se o colab aponta.
             // Vamos tentar listar com filtro de ID se possível, ou listar todos (pouco eficiente mas ok pra debug)
             // Melhor: tentar um filter dummy se o ID for suportado, ou assumir ok.
             // Vamos tentar listar empresas criadas pelo user como fallback check
             const empresas = await base44.entities.DadosEmpresa.filter({ id: colab.empresa_id }); // Filter by ID usually works if supported by backend adapter
             if (empresas.length > 0) {
                 addLog(`Empresa encontrada: ${empresas[0].razao_social}`, 'success');
             } else {
                 addLog('⚠ Empresa vinculada não foi encontrada no banco (pode ter sido deletada ou erro de permissão).', 'warning');
             }
        }

      } else {
        addLog('Nenhum registro de Colaborador encontrado para este e-mail.', 'warning');
      }

      setStatus('success');
    } catch (error) {
      console.error(error);
      addLog(`Erro crítico durante diagnóstico: ${error.message}`, 'error');
      setStatus('error');
    } finally {
        checkCurrentState();
    }
  };

  const forceReinitialize = async () => {
    setStatus('loading');
    addLog('Forçando reinicialização do Tenant...', 'info');
    try {
        const user = await base44.auth.me();
        const newTenantId = await initializeTenant(user);
        addLog(`Reinicialização concluída. Novo Tenant ID: ${newTenantId}`, 'success');
        toast({
            title: "Tenant Reinicializado",
            description: `ID: ${newTenantId}`,
            className: "bg-green-50 dark:bg-green-900 border-green-200",
        });
        checkCurrentState();
        setStatus('success');
    } catch (error) {
        addLog(`Erro ao reinicializar: ${error.message}`, 'error');
        setStatus('error');
    }
  };

  const clearTenant = () => {
      setTenantId(null);
      addLog('Tenant ID removido do LocalStorage.', 'warning');
      toast({
          title: "Tenant Removido",
          description: "Você precisará recarregar a página para reinicializar.",
          variant: "destructive",
      });
      checkCurrentState();
  };

  return (
    <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10 dark:border-orange-800 mb-6">
      <CardHeader>
        <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <CardTitle className="text-lg text-orange-900 dark:text-orange-100">Diagnóstico de Multi-Tenancy</CardTitle>
        </div>
        <CardDescription className="text-orange-700 dark:text-orange-300">
          Ferramenta para identificar e corrigir problemas de vínculo com a empresa (Tenant ID).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Status Atual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-orange-100 dark:border-orange-900/50 shadow-sm">
            <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuário Atual</span>
                <div className="font-mono text-sm text-gray-900 dark:text-gray-100 truncate" title={currentUser?.email}>
                    {currentUser ? currentUser.email : 'Não logado'}
                </div>
            </div>
            <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tenant ID (LocalStorage)</span>
                <div className="font-mono text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {currentTenant || 'Nenhum (null)'}
                    {currentTenant ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                </div>
            </div>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-3">
            <Button 
                onClick={runDiagnostics} 
                disabled={status === 'loading'}
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-100 hover:text-orange-800 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/50"
            >
                <Search className="w-4 h-4 mr-2" />
                Executar Diagnóstico
            </Button>

            <Button 
                onClick={forceReinitialize} 
                disabled={status === 'loading'}
                variant="secondary"
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
            >
                <RefreshCw className={`w-4 h-4 mr-2 ${status === 'loading' ? 'animate-spin' : ''}`} />
                Forçar Reinicialização
            </Button>

            <Button 
                onClick={clearTenant} 
                disabled={status === 'loading'}
                variant="destructive"
                className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/50"
            >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Tenant ID
            </Button>
        </div>

        {/* Logs */}
        {logs.length > 0 && (
            <div className="mt-4 bg-gray-900 rounded-md p-4 overflow-hidden">
                <div className="text-xs font-mono text-gray-400 mb-2 border-b border-gray-700 pb-1">LOG DE EXECUÇÃO</div>
                <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-xs">
                    {logs.map((log, index) => (
                        <div key={index} className={`break-all ${
                            log.includes('ERRO') || log.includes('DESCOMPASSO') ? 'text-red-400' : 
                            log.includes('AVISO') ? 'text-yellow-400' : 
                            log.includes('✓') || log.includes('sucesso') ? 'text-green-400' : 
                            'text-gray-300'
                        }`}>
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        )}

      </CardContent>
    </Card>
  );
}