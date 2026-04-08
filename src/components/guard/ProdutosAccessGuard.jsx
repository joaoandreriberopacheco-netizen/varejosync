import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';

export default function ProdutosAccessGuard({ children }) {
  const [acessoPermitido, setAcessoPermitido] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          setAcessoPermitido(false);
          return;
        }
        
        // Admin BASE44 (não perfil customizado) sempre tem acesso
        if (user.role === 'admin') {
          setAcessoPermitido(true);
          return;
        }

        // Para usuários regulares, verificar perfil de acesso customizado
        if (user?.perfil_acesso_id) {
          const perfis = await base44.entities.PerfilDeAcesso.list();
          const perfil = perfis.find(p => p.id === user.perfil_acesso_id);
          // Verificar se tem permissão específica em estoque ou acesso geral
          const temAcesso = perfil?.permissoes?.estoque?.acesso === true || 
                           perfil?.permissoes?.produtos?.acesso === true ||
                           perfil?.acesso_geral === true;
          setAcessoPermitido(temAcesso);
        } else {
          // Sem perfil vinculado = acesso padrão (permitir)
          setAcessoPermitido(true);
        }
      } catch (error) {
        console.error("Erro ao validar acesso a Produtos:", error);
        setAcessoPermitido(false);
      }
    };
    checkAccess();
  }, []);

  // Esperando validação
  if (acessoPermitido === null) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-gray-500">Carregando...</div></div>;
  }

  // Acesso negado
  if (!acessoPermitido) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900 p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <Package className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Acesso Negado</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm">
            Seu perfil de acesso não possui permissão para visualizar o catálogo de produtos.
          </p>
          <a 
            href={createPageUrl('Home')} 
            className="inline-block mt-6 px-6 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Voltar para Home
          </a>
        </div>
      </div>
    );
  }

  // Acesso permitido
  return children;
}