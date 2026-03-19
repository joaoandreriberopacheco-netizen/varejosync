import React, { createContext, useContext, useState, useCallback } from 'react';

const NavigationTransitionContext = createContext();

export const NavigationTransitionProvider = ({ children }) => {
  const [showTransition, setShowTransition] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const triggerTransition = useCallback(async (callback) => {
    setShowTransition(true);
    setIsNavigating(true);
    
    // Aguarda a splash screen aparecer
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Executa a navegação
    if (callback) {
      callback();
    }
    
    // Aguarda a animação de saída completar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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