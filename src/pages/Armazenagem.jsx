import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, TrendingUp, History, BarChart3, ClipboardCheck, QrCode, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { toast } from 'sonner';
import FilaSeparacao from '@/components/estoque/FilaSeparacao';
import MovimentacaoEstoqueForm from '@/components/estoque/MovimentacaoEstoqueForm';
import HistoricoMovimentacoes from '@/components/estoque/HistoricoMovimentacoes';

export default function Armazenagem() {
  const [currentUser, setCurrentUser] = useState(null);
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const user = await base44.auth.me();
    setCurrentUser(user);
    
    const produtosData = await base44.entities.Produto.list();
    setProdutos(produtosData);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-light text-gray-900 dark:text-white">Módulo de Estoque</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie seu inventário, separação de pedidos, entradas, saídas e histórico completo
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="separacao" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm">
            <TabsTrigger 
              value="separacao" 
              className="flex items-center gap-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700"
            >
              <Package className="w-4 h-4" />
              <span className="hidden md:inline">Fila de Separação</span>
            </TabsTrigger>
            <TabsTrigger 
              value="movimentacao"
              className="flex items-center gap-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden md:inline">Nova Movimentação</span>
            </TabsTrigger>
            <TabsTrigger 
              value="historico"
              className="flex items-center gap-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700"
            >
              <History className="w-4 h-4" />
              <span className="hidden md:inline">Histórico</span>
            </TabsTrigger>
            <TabsTrigger 
              value="inventario"
              className="flex items-center gap-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden md:inline">Inventário Atual</span>
            </TabsTrigger>
            <TabsTrigger 
              value="conferencia"
              className="flex items-center gap-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span className="hidden md:inline">Conferência</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="separacao" className="mt-6">
            <FilaSeparacao />
          </TabsContent>

          <TabsContent value="movimentacao" className="mt-6">
            <MovimentacaoEstoqueForm produtos={produtos} onSuccess={loadData} />
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <HistoricoMovimentacoes />
          </TabsContent>

          <TabsContent value="inventario" className="mt-6">
            <InventarioAtual produtos={produtos} />
          </TabsContent>

          <TabsContent value="conferencia" className="mt-6">
            <ConferenciaManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ConferenciaManagement() {
  const [supermanifestos, setSupermanifestos] = useState([]);
  const [manifestos, setManifestos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [smData, meData] = await Promise.all([
        base44.entities.Supermanifesto.list('-created_date', 50),
        base44.entities.ManifestoEntrada.list('-created_date', 50)
      ]);
      setSupermanifestos(smData);
      setManifestos(meData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar manifestos');
    } finally {
      setCarregando(false);
    }
  };

  const handleGerarCodigo = async (tipo, id, entidade) => {
    try {
      const response = await base44.functions.invoke('generateConferenceCode', {
        tipo,
        manifesto_id: id
      });

      if (response.data.success) {
        toast.success('Código gerado com sucesso!');
        carregarDados();
      } else {
        toast.error(response.data.error || 'Erro ao gerar código');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao gerar código');
    }
  };

  if (carregando) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Carregando dados de conferência...
      </div>
    );
  }

  const manifestosPendentes = manifestos.filter(m => 
    m.status_codigo_conferencia_itens === 'Pendente Geração' || 
    m.status_codigo_conferencia_itens === 'Gerado'
  );

  const supermanifestosPendentes = supermanifestos.filter(s => 
    s.status_codigo_conferencia_volumes === 'Pendente Geração' || 
    s.status_codigo_conferencia_volumes === 'Gerado'
  );

  return (
    <div className="space-y-6">
      {/* Header com instrução */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <ClipboardCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Gerenciamento de Conferências
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Gere códigos para conferência cega de volumes (Supermanifestos) e itens (Manifestos de Entrada).
            </p>
          </div>
        </div>
      </div>

      {/* Supermanifestos - Conferência de Volumes */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" />
          CONFERÊNCIA DE VOLUMES (SUPERMANIFESTOS)
        </h3>
        
        {supermanifestosPendentes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhum supermanifesto aguardando conferência
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {supermanifestosPendentes.map((sm) => (
              <div key={sm.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{sm.numero}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{sm.transportadora_nome}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {sm.status}
                  </Badge>
                </div>

                {sm.codigo_conferencia_volumes ? (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <QrCode className="w-4 h-4 text-gray-500" />
                    <code className="flex-1 font-mono text-sm font-bold text-gray-900 dark:text-white">
                      {sm.codigo_conferencia_volumes}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(sm.codigo_conferencia_volumes);
                        toast.success('Código copiado!');
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGerarCodigo('volumes', sm.id, 'Supermanifesto')}
                    className="w-full"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Gerar Código de Volumes
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manifestos de Entrada - Conferência de Itens */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4" />
          CONFERÊNCIA DE ITENS (MANIFESTOS)
        </h3>
        
        {manifestosPendentes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhum manifesto aguardando conferência
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {manifestosPendentes.map((me) => (
              <div key={me.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{me.numero}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Pedido: {me.pedido_numero} • {me.fornecedor_nome}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {me.status}
                  </Badge>
                </div>

                {me.codigo_conferencia_itens ? (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <QrCode className="w-4 h-4 text-gray-500" />
                    <code className="flex-1 font-mono text-sm font-bold text-gray-900 dark:text-white">
                      {me.codigo_conferencia_itens}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(me.codigo_conferencia_itens);
                        toast.success('Código copiado!');
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGerarCodigo('itens', me.id, 'ManifestoEntrada')}
                    className="w-full"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Gerar Código de Itens
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Link para Entrada de Conferência */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Após gerar o código, o conferente deve acessar:
        </p>
        <Link to={createPageUrl('ConferenciaEntrada')}>
          <Button variant="outline" className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Ir para Tela de Conferência
          </Button>
        </Link>
      </div>
    </div>
  );
}

function InventarioAtual({ produtos }) {
  const [inventario, setInventario] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarInventario();
  }, [produtos]);

  const carregarInventario = async () => {
    try {
      const produtosComEstoque = await Promise.all(
        produtos.map(async (produto) => {
          const estoque = produto.estoque_atual || 0;
          return { ...produto, estoque };
        })
      );
      setInventario(produtosComEstoque.filter(p => p.estoque > 0));
    } catch (error) {
      console.error('Erro ao carregar inventário:', error);
    } finally {
      setCarregando(false);
    }
  };

  if (carregando) {
    return <div className="text-center py-12 text-gray-500">Carregando inventário...</div>;
  }

  if (inventario.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Nenhum produto em estoque</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">PRODUTO</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">CÓDIGO</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">ESTOQUE</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">MÍN.</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {inventario.map((produto) => {
              const abaixoMinimo = produto.estoque < (produto.estoque_minimo || 0);
              return (
                <tr key={produto.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{produto.nome}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{produto.codigo_interno || '-'}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white font-medium">{produto.estoque}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500 dark:text-gray-400">{produto.estoque_minimo || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    {abaixoMinimo ? (
                      <span className="inline-flex px-2 py-1 text-xs rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                        Abaixo do Mínimo
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}