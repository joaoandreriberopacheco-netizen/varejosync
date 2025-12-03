import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, DollarSign, Package, Truck, CheckCircle } from 'lucide-react';

export default function CentralAcoes() {
  const [tarefas, setTarefas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const todasTarefas = await base44.entities.Tarefa.list();
      if (Array.isArray(todasTarefas)) {
        const tarefasPendentes = todasTarefas.filter(t => 
          t && (t.status === 'Pendente' || t.status === 'Em Andamento' || t.status === 'Atrasada')
        );
        setTarefas(tarefasPendentes);
      } else {
        setTarefas([]);
      }
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error);
      setTarefas([]);
    } finally {
      setIsLoading(false);
    }
  };

  const tarefasPorTipo = (tipo) => tarefas.filter(t => t && t.tipo === tipo).length;

  const modulos = [
    { nome: 'Compras', icon: ShoppingCart, count: tarefasPorTipo('Aguardando Manifesto/NF') + tarefasPorTipo('Recebimento de Mercadoria') },
    { nome: 'Financeiro', icon: DollarSign, count: tarefasPorTipo('Pagar Fatura') + tarefasPorTipo('Confirmar Pagamento') },
    { nome: 'Estoque', icon: Package, count: tarefasPorTipo('Separação de Estoque') + tarefasPorTipo('Contagem de Estoque') + tarefasPorTipo('Resolver Discrepância') },
    { nome: 'Logística', icon: Truck, count: tarefasPorTipo('Entrega Agendada') }
  ];

  const totalTarefas = modulos.reduce((acc, mod) => acc + mod.count, 0);

  if (isLoading) {
    return (
      <div className="pb-6 mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6 mb-6 border-b border-gray-200 dark:border-gray-700">
      {/* Header */}
      <h2 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-4">Ações Pendentes</h2>

      {/* Grid SEM BORDAS - apenas fundo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {modulos.map((modulo) => {
          const Icon = modulo.icon;
          return (
            <button 
              key={modulo.nome}
              className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-center group shadow-sm border border-transparent dark:border-gray-700"
            >
              <Icon className="w-6 h-6 mx-auto text-gray-600 dark:text-gray-200 mb-2 transition-colors" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">{modulo.count}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide">{modulo.nome}</div>
            </button>
          );
        })}
      </div>

      {/* Status */}
      {totalTarefas === 0 && (
        <div className="mt-4 text-center py-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <CheckCircle className="w-5 h-5 mx-auto text-green-600 dark:text-green-500 mb-1" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Tudo em dia!</p>
        </div>
      )}
    </div>
  );
}