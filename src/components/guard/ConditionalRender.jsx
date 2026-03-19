import React, { useMemo } from 'react';
import { usePermissoesResolvidas } from '@/hooks/usePermissoesResolvidas';
import { useAuth } from '@/lib/AuthContext';

/**
 * Componente para renderização condicional baseada em permissões
 * Evita renderizar o que o usuário não pode ver
 * 
 * Uso:
 * <ConditionalRender permissao="view_produtos">
 *   <ProdutosPage />
 * </ConditionalRender>
 */
export default function ConditionalRender({
  permissao,
  permissoes, // array para AND lógico
  alguma, // array para OR lógico
  fallback = null,
  children,
}) {
  const { currentUser, perfilDeAcesso } = useAuth();
  const { temPermissao, temTodasPermissoes, temAlgumaPermissao } = usePermissoesResolvidas(
    currentUser,
    perfilDeAcesso
  );

  // Determinar se deve renderizar
  const deveMostrar = useMemo(() => {
    if (permissao) {
      return temPermissao(permissao);
    }
    if (permissoes && Array.isArray(permissoes)) {
      return temTodasPermissoes(permissoes);
    }
    if (alguma && Array.isArray(alguma)) {
      return temAlgumaPermissao(alguma);
    }
    return false;
  }, [permissao, permissoes, alguma, temPermissao, temTodasPermissoes, temAlgumaPermissao]);

  return deveMostrar ? children : fallback;
}