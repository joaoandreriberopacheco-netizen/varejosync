import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { gerenciarPin } from '@/functions/gerenciarPin';

export default function PinSetupDialog({ isOpen, onClose, user }) {
  const [modo, setModo] = useState('form'); // form | sucesso | reset_ok
  const [pinAtual, setPinAtual] = useState('');
  const [pinNovo, setPinNovo] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const temPin = user?.pin_definido;

  const resetForm = () => {
    setPinAtual(''); setPinNovo(''); setPinConfirm('');
    setErro(''); setModo('form');
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleSalvar = async () => {
    setErro('');
    if (pinNovo.length !== 6) return setErro('PIN deve ter exatamente 6 dígitos.');
    if (!/^\d+$/.test(pinNovo)) return setErro('Use apenas números.');
    if (pinNovo !== pinConfirm) return setErro('Os PINs não coincidem.');

    setLoading(true);
    try {
      const res = await gerenciarPin({ operacao: 'set_pin', pin: pinNovo, pin_atual: pinAtual || undefined });
      if (res.data?.sucesso) {
        setModo('sucesso');
      } else {
        setErro(res.data?.error || 'Erro ao definir PIN.');
      }
    } catch (e) {
      setErro(e?.response?.data?.error || 'Erro ao definir PIN.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetEmail = async () => {
    setLoading(true);
    setErro('');
    try {
      const res = await gerenciarPin({ operacao: 'reset_pin_email' });
      if (res.data?.sucesso) setModo('reset_ok');
      else setErro(res.data?.error || 'Erro ao enviar e-mail.');
    } catch (e) {
      setErro(e?.response?.data?.error || 'Erro ao enviar e-mail.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm bg-white dark:bg-gray-900 border-none shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-glacial text-gray-800 dark:text-white">
            <Shield className="w-5 h-5 text-gray-500" />
            {temPin ? 'Alterar PIN' : 'Cadastrar PIN'}
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-xs">
            Usado para autorizar operações críticas no sistema.
          </DialogDescription>
        </DialogHeader>

        {modo === 'sucesso' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="font-medium text-gray-800 dark:text-white">PIN definido com sucesso!</p>
            <Button onClick={handleClose} className="mt-2 w-full bg-gray-900 dark:bg-white dark:text-gray-900 text-white">Fechar</Button>
          </div>
        )}

        {modo === 'reset_ok' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Mail className="w-12 h-12 text-blue-500" />
            <p className="font-medium text-gray-800 dark:text-white">PIN temporário enviado!</p>
            <p className="text-xs text-gray-400">Verifique seu e-mail e use o PIN enviado para fazer login. Depois redefina-o aqui.</p>
            <Button onClick={handleClose} className="mt-2 w-full bg-gray-900 dark:bg-white dark:text-gray-900 text-white">Fechar</Button>
          </div>
        )}

        {modo === 'form' && (
          <div className="space-y-4 py-2">
            {temPin && (
              <div className="space-y-1">
                <label className="text-xs text-gray-500">PIN atual</label>
                <div className="relative">
                  <Input
                    type={mostrar ? 'text' : 'password'}
                    value={pinAtual}
                    onChange={e => setPinAtual(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••"
                    className="text-center tracking-widest text-lg border-0 bg-gray-50 dark:bg-gray-800"
                    maxLength={8}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-gray-500">{temPin ? 'Novo PIN' : 'Criar PIN'} (6 dígitos)</label>
              <div className="relative">
                <Input
                  type={mostrar ? 'text' : 'password'}
                  value={pinNovo}
                  onChange={e => setPinNovo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••"
                  className="text-center tracking-widest text-lg border-0 bg-gray-50 dark:bg-gray-800 pr-10"
                  maxLength={8}
                />
                <button
                  type="button"
                  onClick={() => setMostrar(!mostrar)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500">Confirmar PIN</label>
              <Input
                type={mostrar ? 'text' : 'password'}
                value={pinConfirm}
                onChange={e => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
                className="text-center tracking-widest text-lg border-0 bg-gray-50 dark:bg-gray-800"
                maxLength={8}
                onKeyDown={e => e.key === 'Enter' && handleSalvar()}
              />
            </div>

            {erro && <p className="text-xs text-red-500 text-center">{erro}</p>}

            <Button
              onClick={handleSalvar}
              disabled={loading}
              className="w-full bg-gray-900 dark:bg-white dark:text-gray-900 text-white"
            >
              {loading ? 'Salvando...' : 'Salvar PIN'}
            </Button>

            {temPin && (
              <button
                onClick={handleResetEmail}
                disabled={loading}
                className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-center pt-1"
              >
                Esqueci meu PIN — enviar novo por e-mail
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}