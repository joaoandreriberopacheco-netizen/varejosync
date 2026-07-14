import { useMemo, useCallback } from 'react';
import { usePermissoesCache } from './usePermissoesCache';

/**
 * Hook otimizado para resolver permissões do usuário com cache
 * Combina permissões do perfil com overrides individuais
 */
export function usePermissoesResolvidas(user, perfilDeAcesso) {
  const { getFromCache, setInCache } = usePermissoesCache();

  // Buscar do cache primeiro
  const cachedPermissoes = useMemo(() => {
    if (!user?.id) return null;
    return getFromCache(user.id);
  }, [user?.id, getFromCache]);

  // Calcular permissões apenas se não estiverem em cache
  const permissoesResolvidas = useMemo(() => {
    if (cachedPermissoes) return cachedPermissoes;
    if (!user) return {};

    // Admin tem todas as permissões
    if (user.role === 'admin') {
      const allPermissions = {
        admin: true,
        view_all: true,
        edit_all: true,
        delete_all: true,
        view_produtos: true,
        edit_produtos: true,
        view_vendas: true,
        edit_vendas: true,
        view_financeiro: true,
        edit_financeiro: true,
        view_compras: true,
        edit_compras: true,
        view_estoque: true,
        edit_estoque: true,
        view_logistica: true,
        edit_logistica: true,
      };

      if (user?.id) {
        setInCache(user.id, allPermissions);
      }
      return allPermissions;
    }

    // Perfil padrão do usuário
    const basePermissions = {};

    // Mesclar permissões do perfil se existir
    if (perfilDeAcesso?.permissoes) {
      Object.assign(basePermissions, perfilDeAcesso.permissoes);
    }

    // Aplicar overrides específicos do usuário
    if (user?.permissoes_override) {
      Object.assign(basePermissions, user.permissoes_override);
    }

    if (user?.id) {
      setInCache(user.id, basePermissions);
    }

    return basePermissions;
  }, [user, perfilDeAcesso, cachedPermissoes, setInCache]);

  // Função de validação otimizada
  const temPermissao = useCallback((chavePermissao) => {
    return permissoesResolvidas[chavePermissao] === true;
  }, [permissoesResolvidas]);

  // Função para verificar múltiplas permissões (AND lógico)
  const temTodasPermissoes = useCallback((chaves) => {
    return Array.isArray(chaves) && chaves.every(chave => permissoesResolvidas[chave] === true);
  }, [permissoesResolvidas]);

  // Função para verificar se tem alguma permissão (OR lógico)
  const temAlgumaPermissao = useCallback((chaves) => {
    return Array.isArray(chaves) && chaves.some(chave => permissoesResolvidas[chave] === true);
  }, [permissoesResolvidas]);

  return {
    permissoes: permissoesResolvidas,
    temPermissao,
    temTodasPermissoes,
    temAlgumaPermissao,
  };
}