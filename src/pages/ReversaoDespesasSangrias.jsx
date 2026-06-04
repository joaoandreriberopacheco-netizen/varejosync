import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Trash2, AlertCircle, RefreshCw, Minus, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export default function ReversaoDespesasSangrias() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [despesasProblematicas, setDespesasProblematicas] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revertendo, setRevertendo] = useState(false);
  const [abaSelecionada, setAbaSelecionada] = useState('despesas');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [despesas, movs] = await Promise.all([
        base44.entities.LancamentoFinanceiro.filter({ tipo: 'Despesa' }),
        base44.entities.MovimentosCaixa.list()
      ]);

      setMovimentos(movs);

      // Filtrar despesas que estão vinculadas a sangrias
      const problematicas = despesas.filter(d => {
        if (d.referencia_tipo === 'MovimentosCaixa' && d.referencia_id) {
          const movimento = movs.find(m => m.id === d.referencia_id);
          return movimento && (movimento.tipo === 'Sangria' || movimento.tipo === 'Recolhimento de Caixa');
        }
        return false;
      });

      setDespesasProblematicas(problematicas);
    } catch (error) {
      toast({
        title: 'Erro ao carregar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const reverterDespesa = async (despesa) => {
    if (!window.confirm(`Reverter despesa "${despesa.descricao}" (R$ ${despesa.valor.toFixed(2)})?`)) {
      return;
    }

    setRevertendo(true);
    try {
      await base44.entities.LancamentoFinanceiro.delete(despesa.id);
      if (despesa.conta_financeira_id) {
        const conta = await base44.entities.ContasFinanceiras.get(despesa.conta_financeira_id);
        if (conta) {
          const novoSaldo = (conta.saldo_atual || 0) + despesa.valor;
          await base44.entities.ContasFinanceiras.update(despesa.conta_financeira_id, {
            saldo_atual: novoSaldo
          });
        }
      }
      toast({
        title: '✓ Revertido com sucesso',
        description: `${despesa.descricao} foi removido`,
        className: 'bg-emerald-100 text-emerald-800'
      });
      carregarDados();
    } catch (error) {
      toast({
        title: 'Erro ao reverter',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setRevertendo(false);
    }
  };

  const deletarMovimento = async (movimento) => {
    if (!window.confirm(`Deletar ${movimento.tipo} #${movimento.numero} (R$ ${movimento.valor.toFixed(2)})?`)) {
      return;
    }

    setRevertendo(true);
    try {
      await base44.entities.MovimentosCaixa.delete(movimento.id);
      toast({
        title: '✓ Deletado com sucesso',
        description: `${movimento.tipo} foi removido`,
        className: 'bg-emerald-100 text-emerald-800'
      });
      carregarDados();
    } catch (error) {
      toast({
        title: 'Erro ao deletar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setRevertendo(false);
    }
  };

  const formatValor = (valor) => {
    return `R$ ${(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 dark:border-gray-700 dark:border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          style={{ minWidth: '44px', minHeight: '44px' }}>
          <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white">
          Reversão de Despesas
        </h1>
        <button
          onClick={carregarDados}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          style={{ minWidth: '44px', minHeight: '44px' }}>
          <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <div className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 px-4">
        <div className="max-w-2xl mx-auto flex gap-1">
          <button
            onClick={() => setAbaSelecionada('despesas')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              abaSelecionada === 'despesas'
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}>
            Despesas ({despesasProblematicas.length})
          </button>
          <button
            onClick={() => setAbaSelecionada('movimentos')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              abaSelecionada === 'movimentos'
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}>
            Movimentos ({movimentos.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-2xl mx-auto">
          {abaSelecionada === 'despesas' && despesasProblematicas.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-[#4A5D23] dark:text-[#a4ce33]" />
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">Tudo limpo!</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Nenhuma despesa vinculada a sangrias foi encontrada.
              </p>
            </div>
          ) : abaSelecionada === 'despesas' ? (
            <div className="space-y-3">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    Encontradas <strong>{despesasProblematicas.length}</strong> despesa(s) vinculada(s) a sangrias/recolhimentos. 
                    Clique em "Reverter" para remover cada uma.
                  </div>
                </div>
              </div>

              {despesasProblematicas.map((despesa) => {
                const movimento = movimentos.find(m => m.id === despesa.referencia_id);
                return (
                  <div
                    key={despesa.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {despesa.descricao}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Conta: {despesa.conta_financeira_nome}
                      </div>
                      {movimento && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Vinculado a: {movimento.numero} ({movimento.tipo})
                        </div>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-red-600 dark:text-red-400">
                        {formatValor(despesa.valor)}
                      </div>
                      <button
                        onClick={() => reverterDespesa(despesa)}
                        disabled={revertendo}
                        className="mt-3 h-10 px-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                        style={{ minHeight: '40px' }}>
                        <Trash2 className="w-4 h-4" />
                        Reverter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {abaSelecionada === 'movimentos' && movimentos.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-[#4A5D23] dark:text-[#a4ce33]" />
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum movimento</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Não há movimentos de caixa para deletar.</p>
            </div>
          ) : abaSelecionada === 'movimentos' ? (
            <P38MobileLineList>
              {movimentos.map((movimento, index) => (
                <P38MobileLine
                  key={movimento.id}
                  striped={index % 2 === 1}
                  accent={p38AccentKeyFromTone(movimento.tipo === 'Reforço' ? 'success' : 'info')}
                  className="flex items-start justify-between gap-4 p-4"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      movimento.tipo === 'Reforço' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-blue-50 dark:bg-blue-900/20'
                    }`}>
                      {movimento.tipo === 'Reforço'
                        ? <Plus className="w-5 h-5 text-[#4A5D23] dark:text-[#a4ce33]" />
                        : <Minus className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{movimento.tipo}</div>
                      <div className="text-xs text-muted-foreground mt-1">#{movimento.numero}</div>
                      {movimento.observacao && (
                        <div className="text-xs text-muted-foreground mt-1">{movimento.observacao}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold tabular-nums">
                      R$ {movimento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <button
                      type="button"
                      onClick={() => deletarMovimento(movimento)}
                      disabled={revertendo}
                      className="mt-3 h-10 px-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                      style={{ minHeight: '40px' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Deletar
                    </button>
                  </div>
                </P38MobileLine>
              ))}
            </P38MobileLineList>
          ) : null}
        </div>
      </div>
    </div>
  );
}