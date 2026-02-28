import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { User, LogOut, Settings, Sun, Moon, X } from 'lucide-react';

export default function MobileUserMenu({ darkMode, toggleDarkMode }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => u && setUser(u)).catch(() => {});
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?';

  return (
    <>
      {/* Trigger — bolinha no canto superior direito */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 right-4 z-40 w-9 h-9 rounded-full bg-white dark:bg-gray-800 shadow-md flex items-center justify-center border border-gray-100 dark:border-gray-700"
        style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        {user?.full_name ? (
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 font-glacial">
            {initials}
          </span>
        ) : (
          <User className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Drawer */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 safe-area-container">
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />

            {/* User info */}
            {user && (
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 font-glacial">
                    {initials}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.perfil || 'Admin'}</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="ml-auto w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            )}

            {/* Opções */}
            <div className="space-y-1">
              {/* Modo escuro */}
              <button
                onClick={() => { toggleDarkMode(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {darkMode
                  ? <Sun className="w-5 h-5 text-gray-500" />
                  : <Moon className="w-5 h-5 text-gray-500" />
                }
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  {darkMode ? 'Modo Claro' : 'Modo Escuro'}
                </span>
              </button>

              {/* Configurações */}
              <button
                onClick={() => { window.location.href = createPageUrl('Configuracoes'); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Settings className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-200">Configurações</span>
              </button>

              {/* Sair */}
              <button
                onClick={() => base44.auth.logout()}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-500">Sair</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}