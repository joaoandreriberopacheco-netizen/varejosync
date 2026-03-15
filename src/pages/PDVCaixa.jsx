import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import SeletorCaixaPDV from '@/components/vendas/SeletorCaixaPDV';
import ProcessarVendasView from '@/components/vendas/caixa/ProcessarVendasView';
import { AlertCircle } from 'lucide-react';

export default function PDVCaixaPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [contaCaixaPDV, setContaCaixaPDV] = useState(null);
  const [turnoAtivo, setTurnoAtivo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSeletor, setShowSeletor] = useState(false);

  useEffect(() => {
    loadUserAndCaixa();
  }, []);

  const loadUserAndCaixa = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      // Buscar conta Caixa PDV atribuída ao usuário
      const contas = await base44.entities.ContasFinanceiras.filter({ 
        is_caixa_pdv: true 
      });
      
      const contaUsuario = contas.find(c => c.usuario_atribuido_id === user.id);
      
      if (!contaUsuario) {
        setLoading(false);
        return;
      }

      setContaCaixaPDV(contaUsuario);

      // Verificar se existe turno ativo para esta conta
      const turnos = await base44.entities.TurnoCaixa.filter({ 
        conta_caixa_pdv_id: contaUsuario.id,
        status: 'Aberto'
      });

      if (turnos.length > 0) {
        setTurnoAtivo(turnos[0]);
      } else {
        setShowSeletor(true);
      }

      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setLoading(false);
    }
  };

  const handleSelecionarCaixa = (caixa, turno) => {
    setContaCaixaPDV(caixa);
    setTurnoAtivo(turno);
    setShowSeletor(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 dark:border-gray-700 dark:border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  // Usuário não tem conta Caixa PDV atribuída
  if (!contaCaixaPDV) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white font-glacial mb-2">
            Conta Caixa PDV não atribuída
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Você precisa ter uma conta Caixa PDV atribuída para acessar esta funcionalidade.
            Entre em contato com o administrador do sistema.
          </p>
          <button
            onClick={() => window.location.href = createPageUrl('Home')}
            className="w-full h-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-medium"
          >
            Voltar para o Início
          </button>
        </div>
      </div>
    );
  }

  // Mostrar seletor de caixa
  if (showSeletor) {
    return (
      <SeletorCaixaPDV
        open={showSeletor}
        onSelect={handleSelecionarCaixa}
        currentUser={currentUser}
        contaCaixaUsuario={contaCaixaPDV}
      />
    );
  }

  // Renderizar interface de processamento de vendas
  return (
    <ProcessarVendasView 
      contaCaixaPDV={contaCaixaPDV}
      turnoAtivo={turnoAtivo}
      onCloseTurno={() => setShowSeletor(true)}
    />
  );
}