import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Wallet, PlusCircle, Edit, Eye, Banknote, CreditCard, DollarSign, ArrowRightLeft, Clock } from 'lucide-react';
import ConciliacaoBancaria from '@/components/financeiro/ConciliacaoBancaria';
import {
  P38MobileLine,
  P38MobileLineList,
  P38StatusLabel,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';

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
    <div className="min-h-screen bg-background font-din-1451 pb-[var(--p38-scroll-pad-below-nav)] md:pb-6">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground font-glacial">
              Contas Financeiras
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Saldo total: {formatCurrency(saldoTotal)}
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-background dark:bg-card dark:text-foreground gap-2 rounded-2xl">
            <PlusCircle className="w-4 h-4" />
            Nova Conta
          </Button>
        </div>

        <P38MobileLineList className="lg:hidden">
          {accounts.map((account, index) => {
            const saldo = calcularSaldoConta(account);
            const isNegativo = saldo < 0;
            const pend = pendenciasConciliacao[account.id] || 0;
            return (
              <P38MobileLine
                key={account.id}
                thinAccent
                striped={index % 2 === 1}
                accent={p38AccentKeyFromTone(isNegativo ? 'danger' : account.ativo !== false ? 'success' : 'muted')}
                title={account.nome}
                subtitle={account.tipo}
                meta={
                  <>
                    <P38StatusLabel tone={account.ativo !== false ? 'success' : 'muted'}>
                      {account.ativo !== false ? 'Ativa' : 'Inativa'}
                    </P38StatusLabel>
                    {pend > 0 && (
                      <P38StatusLabel tone="warning">
                        {pend} conciliação{pend > 1 ? 'ões' : ''}
                      </P38StatusLabel>
                    )}
                  </>
                }
                value={formatCurrency(saldo)}
                valueSub={account.banco || undefined}
                trailing={
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = createPageUrl(`ExtratoConta?id=${account.id}`);
                      }}
                      className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60"
                      aria-label="Extrato"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAccount(account);
                        setFormData(account);
                        setIsDialogOpen(true);
                      }}
                      className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60"
                      aria-label="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                }
                onClick={() => {
                  if (pend > 0) setConciliacaoConta(account);
                  else window.location.href = createPageUrl(`ExtratoConta?id=${account.id}`);
                }}
              />
            );
          })}
        </P38MobileLineList>

        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const Icon = tipoIconMap[account.tipo] || Wallet;
            const saldo = calcularSaldoConta(account);
            const isNegativo = saldo < 0;
            
            return (
              <div
                key={account.id}
                className="bg-card rounded-3xl shadow-sm overflow-hidden border-l-4"
                style={{ borderLeftColor: account.cor || 'hsl(var(--primary))' }}
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-muted/40 dark:bg-muted flex items-center justify-center">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{account.nome}</p>
                        <p className="text-xs text-muted-foreground">{account.tipo}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Saldo Atual</p>
                    <p className={`text-2xl font-bold font-glacial ${isNegativo ? 'text-red-600' : 'text-foreground'}`}>
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
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-muted/40 dark:bg-muted hover:bg-muted text-foreground/90 text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      Extrato
                    </button>
                    <button
                      onClick={() => { setSelectedAccount(account); setFormData(account); setIsDialogOpen(true); }}
                      className="w-10 h-10 rounded-xl bg-muted/40 dark:bg-muted hover:bg-muted flex items-center justify-center"
                    >
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="dark:bg-muted">
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