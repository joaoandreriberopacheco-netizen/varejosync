import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getTenantId, initializeTenant } from '@/components/utils/tenant';
import { Trash2, RefreshCw, Search, AlertTriangle, CheckCircle, Play } from 'lucide-react';

export default function DebugTenant() {
    const [currentTenantId, setCurrentTenantId] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [colaboradorStatus, setColaboradorStatus] = useState(null);
    const [targetEmail, setTargetEmail] = useState('casaisrael1@hotmail.com');
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        loadInfo();
    }, []);

    const addLog = (msg) => setLogs(prev => [`${new Date().toLocaleTimeString()} - ${msg}`, ...prev]);

    const loadInfo = async () => {
        const tid = getTenantId();
        setCurrentTenantId(tid || 'Nenhum ID no LocalStorage');
        addLog(`Tenant ID atual no navegador: ${tid}`);

        try {
            const user = await base44.auth.me();
            setCurrentUser(user);
            addLog(`Usuário logado: ${user.email} (ID: ${user.id})`);
        } catch (e) {
            addLog('Nenhum usuário logado via auth.me()');
        }
    };

    const checkEmailInDb = async () => {
        if (!targetEmail) return;
        addLog(`Verificando e-mail: ${targetEmail}...`);
        try {
            // 1. Busca na entidade Colaborador
            const colabs = await base44.entities.Colaborador.filter({ email: targetEmail });
            setColaboradorStatus(colabs);
            
            if (colabs.length > 0) {
                addLog(`⚠️ ALERTA: Encontrados ${colabs.length} vínculos de COLABORADOR!`);
                colabs.forEach(c => {
                    addLog(`- Vínculo ID: ${c.id} | Empresa: ${c.empresa_id} | Nome: ${c.nome}`);
                });
            } else {
                addLog("✅ OK: Nenhum vínculo de Colaborador encontrado.");
            }

            // 2. Busca na entidade DadosEmpresa (email de contato)
            const empresas = await base44.entities.DadosEmpresa.filter({ email: targetEmail });
            if (empresas.length > 0) {
                addLog(`⚠️ INFO: Encontradas ${empresas.length} EMPRESAS com este email!`);
                empresas.forEach(e => {
                    addLog(`- Empresa ID: ${e.id} | Razão: ${e.razao_social}`);
                });
            } else {
                 addLog("✅ OK: Nenhuma empresa encontrada com este email.");
            }

        } catch (error) {
            addLog(`Erro ao buscar: ${error.message}`);
        }
    };

    const forceDeleteColaborador = async () => {
        if (!colaboradorStatus || colaboradorStatus.length === 0) return;
        
        if (!window.confirm(`Tem certeza que deseja DELETAR PERMANENTEMENTE os vínculos do usuário ${targetEmail}?`)) return;

        addLog("Iniciando remoção forçada...");
        try {
            for (const colab of colaboradorStatus) {
                await base44.entities.Colaborador.delete(colab.id);
                addLog(`🗑️ Registro ${colab.id} deletado com sucesso.`);
            }
            addLog("✅ Todos os registros removidos.");
            setColaboradorStatus([]);
            checkEmailInDb();
        } catch (error) {
            addLog(`Erro ao deletar: ${error.message}`);
        }
    };

    const clearLocalStorage = () => {
        localStorage.removeItem('tenant_id');
        setCurrentTenantId(null);
        addLog("LocalStorage limpo. Tenant ID removido.");
        alert("Cache limpo! Agora faça logout e tente criar a conta novamente.");
    };

    const manualInitialize = async () => {
        if (!currentUser) {
            addLog("Erro: Nenhum usuário logado para inicializar.");
            return;
        }
        addLog("Tentando inicializar tenant manualmente...");
        try {
            const newTenantId = await initializeTenant(currentUser);
            if (newTenantId) {
                addLog(`SUCESSO! Novo Tenant ID criado/recuperado: ${newTenantId}`);
                setCurrentTenantId(newTenantId);
            } else {
                addLog("FALHA: initializeTenant retornou null. Verifique o console para erros detalhados.");
            }
        } catch (error) {
            addLog(`ERRO CRÍTICO ao inicializar: ${error.message}`);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6 bg-gray-50 min-h-screen">
            <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <h1 className="text-2xl font-bold text-gray-900">Diagnóstico de Multi-Tenant</h1>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Estado Atual */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" /> Estado do Navegador
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-3 bg-gray-100 rounded text-sm font-mono break-all">
                            <div className="text-gray-500 mb-1">Tenant ID (LocalStorage)</div>
                            <div className="font-bold">{currentTenantId}</div>
                        </div>
                        
                        <div className="p-3 bg-gray-100 rounded text-sm font-mono break-all">
                            <div className="text-gray-500 mb-1">Usuário Logado</div>
                            <div className="font-bold">{currentUser?.email || 'Não logado'}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" onClick={loadInfo} className="w-full">
                                Atualizar
                            </Button>
                            <Button variant="destructive" onClick={clearLocalStorage} className="w-full">
                                Limpar Cache
                            </Button>
                        </div>
                        <div className="pt-2 border-t border-gray-200 mt-2">
                            <Button onClick={manualInitialize} className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
                                <Play className="w-4 h-4" /> Tentar Inicializar Agora
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Verificação de Banco */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Search className="w-4 h-4" /> Verificar Vínculo (Banco de Dados)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input 
                                value={targetEmail} 
                                onChange={e => setTargetEmail(e.target.value)} 
                                placeholder="Email para verificar"
                            />
                            <Button onClick={checkEmailInDb}>Buscar</Button>
                        </div>
                        
                        {colaboradorStatus && colaboradorStatus.length > 0 ? (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg animate-pulse-subtle">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-red-800">Vínculo Encontrado!</p>
                                        <p className="text-sm text-red-700 mt-1">
                                            O e-mail <strong>{targetEmail}</strong> ainda está vinculado à empresa <code>{colaboradorStatus[0].empresa_id}</code>.
                                        </p>
                                        <p className="text-sm text-red-700 mt-1">
                                            Isso impede que ele crie uma nova empresa ao fazer login.
                                        </p>
                                        <Button 
                                            onClick={forceDeleteColaborador} 
                                            className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            FORÇAR EXCLUSÃO
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : colaboradorStatus && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <div>
                                        <p className="font-bold text-green-800">Limpo!</p>
                                        <p className="text-sm text-green-700">
                                            Nenhum vínculo encontrado. O usuário está livre para criar uma nova empresa (tenant).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Logs */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Logs de Execução</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-xs shadow-inner">
                        {logs.length === 0 && <span className="text-gray-500">Aguardando ações...</span>}
                        {logs.map((log, i) => (
                            <div key={i} className="border-b border-gray-800 py-1 last:border-0">
                                {log}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}