import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Wallet, PlusCircle, Edit, Trash2, Eye, Banknote, CreditCard, DollarSign, ArrowRightLeft, Clock } from 'lucide-react';
import ConciliacaoBancaria from '@/components/financeiro/ConciliacaoBancaria';

export default function ContasFinanceirasPage() {
  const [accounts, setAccounts] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [conciliacaoConta, setConciliacaoConta] = useState(null);
  const [pendenciasConciliacao, setPendenciasConciliacao] = useState({});
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'Caixa Físico',
    banco: '',
    saldo_inicial: 0,
    ativo: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contas, pendConciliacao] = await Promise.all([
        base44.entities.ContasFinanceiras.list(),
        base44.entities.LancamentoFinanceiro.filter({ status_conciliacao: 'Pendente' })
      ]);
      setAccounts(contas);

      const mapa = {};
      pendConciliacao.forEach(l => {
        if (l.conta_financeira_id) {
          mapa[l.conta_financeira_id] = (mapa[l.conta_financeira_id] || 0) + 1;
        }
      });
      setPendenciasConciliacao(mapa);
    } catch (error) {
      console.error('Erro ao carregar:', error);
    }
  };

  const handleSave = async () => {
    if (selectedAccount) {
      await base44.entities.ContasFinanceiras.update(selectedAccount.id, formData);
    } else {
      await base44.entities.ContasFinanceiras.create({
        ...formData,
        saldo_atual: formData.saldo_inicial
      });
    }
    loadData();
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedAccount(null);
    setFormData({ nome: '', tipo: 'Caixa Físico', banco: '', saldo_inicial: 0, ativo: true });
  };

  const formatCurrency = (value) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const calcularSaldoConta = (account) => {
    const saldoInicial = Number(account.saldo_inicial || 0);
    return saldoInicial;
  };

  const saldoTotal = accounts.reduce((acc, a) => acc + calcularSaldoConta(a), 0);

  const tipoIconMap = {
    'Caixa Físico': Banknote,
    'Conta Bancária': CreditCard,
    'Carteira Digital': Wallet,
    'Poupança': Wallet,
    'Investimento': DollarSign,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-6">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">
              Contas Financeiras
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Saldo total: {formatCurrency(saldoTotal)}
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-gray-900 dark:bg-white dark:text-gray-900 gap-2 rounded-2xl">
            <PlusCircle className="w-4 h-4" />
            Nova Conta
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const Icon = tipoIconMap[account.tipo] || Wallet;
            const saldo = calcularSaldoConta(account);
            const isNegativo = saldo < 0;
            
            return (
              <div
                key={account.id}
                className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden border-l-4"
                style={{ borderLeftColor: account.cor || '#10B981' }}
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{account.nome}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{account.tipo}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo Atual</p>
                    <p className={`text-2xl font-bold font-glacial ${isNegativo ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                      {formatCurrency(saldo)}
                    </p>
                  </div>

                  {pendenciasConciliacao[account.id] > 0 && (
                    <button
                      onClick={() => setConciliacaoConta(account)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 transition-colors"
                    >
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="text-xs text-amber-700 dark:text-amber-300 flex-1 text-left">
                        {pendenciasConciliacao[account.id]} pendente{pendenciasConciliacao[account.id] > 1 ? 's' : ''}
                      </span>
                    </button>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => window.location.href = createPageUrl(`ExtratoConta?id=${account.id}`)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 text-gray-700 dark:text-gray-300 text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      Extrato
                    </button>
                    <button
                      onClick={() => { setSelectedAccount(account); setFormData(account); setIsDialogOpen(true); }}
                      className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 flex items-center justify-center"
                    >
                      <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle>{selectedAccount ? 'Editar' : 'Nova'} Conta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Nome da Conta</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Caixa Loja 1"
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Caixa Físico">Caixa Físico</SelectItem>
                    <SelectItem value="Conta Bancária">Conta Bancária</SelectItem>
                    <SelectItem value="Carteira Digital">Carteira Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Saldo Inicial</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.saldo_inicial}
                  onChange={(e) => setFormData({ ...formData, saldo_inicial: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!conciliacaoConta} onOpenChange={(open) => !open && setConciliacaoConta(null)}>
          <DialogContent className="max-w-lg max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                Conciliação — {conciliacaoConta?.nome}
              </DialogTitle>
            </DialogHeader>
            {conciliacaoConta && (
              <ConciliacaoBancaria
                contaId={conciliacaoConta.id}
                contaNome={conciliacaoConta.nome}
                onClose={() => setConciliacaoConta(null)}
                onConciliado={loadData}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}