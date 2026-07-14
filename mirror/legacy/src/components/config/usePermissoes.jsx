import { useState, useEffect, createContext, useContext } from 'react';
import { base44 } from '@/api/base44Client';

// Context para permissões
export const PermissoesContext = createContext(null);

// Hook principal para usar permissões
export function usePermissoes() {
  const context = useContext(PermissoesContext);
  if (context) return context;

  // Fallback se não estiver no provider (compatibilidade)
  return { pode: () => true, perfil: null, menuCompacto: false };
}

// Provider de permissões (usado no Layout)
export function usePermissoesProvider() {
  const [perfilAcesso, setPerfilAcesso] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarPerfil();
  }, []);

  const carregarPerfil = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) { setLoading(false); return; }

      // Admin sempre tem acesso total
      if (user.role === 'admin') {
        setPerfilAcesso({ _isAdmin: true, menu_compacto: false, permissoes: {} });
        setLoading(false);
        return;
      }

      // Busca perfil de acesso vinculado ao usuário
      if (user.perfil_acesso_id) {
        const perfis = await base44.entities.PerfilDeAcesso.filter({ id: user.perfil_acesso_id });
        if (perfis.length > 0) {
          setPerfilAcesso(perfis[0]);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar perfil de acesso:', e);
    } finally {
      setLoading(false);
    }
  };

  // Verifica se o usuário pode fazer uma ação
  // Uso: pode('produtos.editar'), pode('financeiro.acesso')
  const pode = (chave) => {
    if (!perfilAcesso) return false;
    if (perfilAcesso._isAdmin) return true;

    const partes = chave.split('.');
    let atual = perfilAcesso.permissoes || {};
    for (const parte of partes) {
      if (atual === undefined || atual === null) return false;
      atual = atual[parte];
    }
    return atual === true;
  };

  const menuCompacto = perfilAcesso?.menu_compacto === true && !perfilAcesso?._isAdmin;

  return { pode, perfilAcesso, menuCompacto, loading, recarregar: carregarPerfil };
}