import React from 'react';

export const ModoFlareContext = React.createContext({
  openFlare: () => {},
  openCatalog: () => {},
});

export function useModoFlare() {
  return React.useContext(ModoFlareContext);
}
