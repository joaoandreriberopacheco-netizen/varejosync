import React, { createContext, useContext, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

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
    <NavigationTransitionContext.Provider value={{ triggerTransition, showTransition, setShowTransition, isNavigating }}>
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

// Componente que detecta mudanças de rota - deve estar DENTRO do Router
export function NavigationTransitionDetector() {
  const { showTransition, setShowTransition } = useNavigationTransition();
  const [lastLocation, setLastLocation] = useState(null);
  const location = useLocation();

  React.useEffect(() => {
    if (lastLocation && lastLocation.pathname !== location.pathname) {
      setShowTransition(true);
      
      // 2 segundos de transição suave
      const timeout = setTimeout(() => {
        setShowTransition(false);
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
    setLastLocation(location);
  }, [location, setShowTransition]);

  return null;
}