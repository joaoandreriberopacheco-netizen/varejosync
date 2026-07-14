import * as React from 'react';
import { base44, p38 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

const AuthContext = React.createContext();

const SUPABASE_PUBLIC_SETTINGS_STUB = Object.freeze({
  id: 'p38-supabase',
  public_settings: {
    auth_required: false,
    provider: 'supabase'
  }
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = React.useState(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = React.useState(true);
  const [authError, setAuthError] = React.useState(null);
  const [appPublicSettings, setAppPublicSettings] = React.useState(null); // Contains only { id, public_settings }

  React.useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      if (p38?.bypassBase44 || p38?.providerName === p38?.providers?.SUPABASE) {
        setAppPublicSettings(SUPABASE_PUBLIC_SETTINGS_STUB);
        setIsLoadingPublicSettings(false);
        await checkUserAuth();
        return;
      }

      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      try {
        const headers = { 'X-App-Id': appParams.appId };
        if (appParams.token) headers['Authorization'] = `Bearer ${appParams.token}`;
        const res = await fetch(`${appParams.serverUrl}/api/apps/public/prod/public-settings/by-id/${appParams.appId}`, { headers });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const err = new Error(data?.message || 'Failed');
          err.status = res.status;
          err.data = data;
          throw err;
        }
        const publicSettings = await res.json();
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        // Visitante na página de login: não marcar erro global (evita redirect / overlay em loop).
        if (typeof window !== 'undefined' && window.location.pathname === '/login') {
          return;
        }
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const navigateToLogin = React.useCallback(() => {
    try {
      base44.auth.redirectToLogin(window.location.href);
    } catch (err) {
      console.warn('redirectToLogin falhou; tentando fallback /login.', err);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, []);

  const logout = React.useCallback((shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);

    try {
      if (shouldRedirect) {
        base44.auth.logout(window.location.href);
      } else {
        base44.auth.logout();
      }
    } catch (err) {
      console.warn('logout falhou; limpando estado local apenas.', err);
      if (shouldRedirect && typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  }, []);

  const contextValue = React.useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
    }),
    [
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};