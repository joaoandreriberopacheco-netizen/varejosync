import React, { useEffect, useRef } from 'react';
import {
  ensureGooglePinGsiInitialized,
  googlePinCredentialBridge,
  isGooglePinResetConfigured,
} from './googlePinReset';

/**
 * Botão oficial do Google (GSI renderButton). O callback recebe o JWT `credential`.
 */
export default function GooglePinResetButton({ onCredential, onScriptError, disabled }) {
  const containerRef = useRef(null);
  const handlerRef = useRef(onCredential);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    handlerRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    googlePinCredentialBridge.set((credential) => {
      if (credential) handlerRef.current?.(credential);
    });
    return () => googlePinCredentialBridge.clear();
  }, []);

  useEffect(() => {
    if (!clientId || !containerRef.current || disabled) return undefined;

    let cancelled = false;
    const el = containerRef.current;

    ensureGooglePinGsiInitialized(clientId)
      .then(() => {
        if (cancelled || !el) return;
        el.innerHTML = '';
        window.google.accounts.id.renderButton(el, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 280,
          locale: 'pt-BR',
        });
      })
      .catch(() => {
        onScriptError?.('Não foi possível carregar o Google Sign-In.');
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, disabled, onScriptError]);

  if (!isGooglePinResetConfigured()) return null;

  return (
    <div
      className={`flex w-full justify-center min-h-[44px] ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      ref={containerRef}
    />
  );
}
