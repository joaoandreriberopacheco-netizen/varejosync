import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, RefreshCw, Mail, Search, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { gerenciarPin } from '@/functions/gerenciarPin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  P38MobileLine,
  P38MobileLineList,
  P38StatusLabel,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';

export default function AuditoriaPins() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [resetandoId, setResetandoId] = useState(null);
  const [feedbacks, setFeedbacks] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u));
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const users = await base44.entities.User.list('-created_date', 200);
      setUsuarios(users);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async (user) => {
    setResetandoId(user.id);
    try {
      const res = await gerenciarPin({ operacao: 'admin_reset_pin', target_user_id: user.id });
      setFeedbacks(prev => ({
        ...prev,
        [user.id]: { tipo: 'ok', msg: res.data?.mensagem || 'PIN redefinido e enviado por e-mail.' }
      }));
      // Recarregar para atualizar status
      await carregarUsuarios();
    } catch (e) {
      setFeedbacks(prev => ({
        ...prev,
        [user.id]: { tipo: 'erro', msg: e?.response?.data?.error || 'Erro ao redefinir PIN.' }
      }));
    } finally {
      setResetandoId(null);
    }
  };

  const usuariosFiltrados = usuarios.filter(u =>
    !busca ||
    u.full_name?.toLowerCase().includes(busca.toLowerCase()) ||
    u.email?.toLowerCase().includes(busca.toLowerCase())
  );

  const comPin = usuarios.filter(u => u.pin_definido).length;
  const semPin = usuarios.length - comPin;

  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-gray-700 dark:text-gray-300 font-medium">Acesso restrito</p>
        <p className="text-xs text-gray-400 mt-1">Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Shield className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
        <div>
          <h1 className="text-lg font-glacial font-semibold text-gray-800 dark:text-white">Auditoria de PINs</h1>
          <p className="text-xs text-gray-400">Gerencie os PINs de segurança dos usuários</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{usuarios.length}</p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Total</p>
        </div>
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-600">{comPin}</p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Com PIN</p>
        </div>
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-red-500">{semPin}</p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center justify-center gap-1"><XCircle className="w-3 h-3 text-red-400" /> Sem PIN</p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar usuário..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="pl-9 border-0 bg-white dark:bg-gray-800/50 shadow-sm"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800/50 rounded-2xl p-4 shadow-sm animate-pulse">
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-40 mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-56" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {usuariosFiltrados.map(user => {
            const feedback = feedbacks[user.id];
            const isResetting = resetandoId === user.id;
            return (
              <div key={user.id} className="bg-white dark:bg-gray-800/50 rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    user.pin_definido ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                  }`}>
                    {user.pin_definido
                      ? <CheckCircle className="w-4 h-4 text-green-500" />
                      : <XCircle className="w-4 h-4 text-red-400" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{user.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    {feedback && (
                      <p className={`text-xs mt-0.5 ${feedback.tipo === 'ok' ? 'text-green-500' : 'text-red-500'}`}>
                        {feedback.msg}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleResetPin(user)}
                  disabled={isResetting}
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  title="Resetar PIN e enviar por e-mail"
                >
                  {isResetting
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Mail className="w-3.5 h-3.5" />
                  }
                  {isResetting ? 'Enviando...' : 'Resetar'}
                </button>
              </div>
            );
          })}

          {usuariosFiltrados.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">
              Nenhum usuário encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}