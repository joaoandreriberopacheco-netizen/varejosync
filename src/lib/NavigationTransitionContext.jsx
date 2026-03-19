import React, { createContext, useContext, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const NavigationTransitionContext = createContext();

export const NavigationTransitionProvider = ({ children }) => {
  const [showTransition, setShowTransition] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const location = useLocation();

  // Detecta mudanças de rota e ativa transição automaticamente
  React.useEffect(() => {
    if (lastLocation && lastLocation.pathname !== location.pathname) {
      setShowTransition(true);
      setIsNavigating(true);
      
      // Aguarda a animação de saída completar
      const timeout = setTimeout(() => {
        setShowTransition(false);
        setIsNavigating(false);
      }, 800);
      
      return () => clearTimeout(timeout);
    }
    setLastLocation(location);
  }, [location]);

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