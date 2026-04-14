import React from 'react';

export const ModoFlareContext = React.createContext({
  openFlare: () => {},
});

export function useModoFlare() {
  return React.useContext(ModoFlareContext);
}
