import React, { createContext, useContext, useCallback } from 'react';

const NavigationTransitionContext = createContext();

export const NavigationTransitionProvider = ({ children }) => {
  const triggerTransition = useCallback(async (callback) => {
    if (callback) {
      callback();
    }
  }, []);

  return (
    <NavigationTransitionContext.Provider
      value={{
        triggerTransition,
        showTransition: false,
        setShowTransition: () => {},
        isNavigating: false,
      }}
    >
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

// Mantido para compatibilidade com imports antigos; a transição visual foi removida.
export function NavigationTransitionDetector() {
  return null;
}