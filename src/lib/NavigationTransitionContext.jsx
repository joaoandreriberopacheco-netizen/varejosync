import React, { createContext, useContext, useState, useCallback } from 'react';

const NavigationTransitionContext = createContext();

export const NavigationTransitionProvider = ({ children }) => {
  const [showTransition, setShowTransition] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const triggerTransition = useCallback(async (callback) => {
    setShowTransition(true);
    setIsNavigating(true);
    
    // Aguarda a splash screen aparecer e o logo se animar
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Executa a navegação
    if (callback) {
      callback();
    }
    
    // Aguarda a animação de saída (flame) completar
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    setShowTransition(false);
    setIsNavigating(false);
  }, []);

  return (
    <NavigationTransitionContext.Provider value={{ triggerTransition, showTransition, isNavigating }}>
      {children}
    </NavigationTransitionContext.Provider>
  );
};

export const useNavigationTransition = () => {
  const context = useContext(NavigationTransitionContext);
  if (!context) {
    throw new Error('useNavigationTransition must be used within NavigationTransitionProvider');
  }
  return context;
};