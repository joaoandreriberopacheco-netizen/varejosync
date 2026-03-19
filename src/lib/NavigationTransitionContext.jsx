import React, { createContext, useContext, useState, useCallback } from 'react';

const NavigationTransitionContext = createContext();

export const NavigationTransitionProvider = ({ children }) => {
  const [showTransition, setShowTransition] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const triggerTransition = useCallback(async (callback) => {
    setShowTransition(true);
    setIsNavigating(true);
    
    // Aguarda a logo se animar (300ms - mais rápido e fluido)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Executa a navegação
    if (callback) {
      callback();
    }
    
    // Aguarda a animação de saída (flame) completar (500ms - mais leve)
    await new Promise(resolve => setTimeout(resolve, 500));
    
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