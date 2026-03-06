import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format, addWeeks, addMonths, addYears } from 'date-fns';
import { SeletorCategoria, useCategorias } from './fluxo/DialogCategoria';
import RecorrenciaConfig from './fluxo/RecorrenciaConfig';
import TagsInput from './fluxo/TagsInput';

const TIPOS = [
  { value: 'Receita', label: 'Receita', icon: ArrowDownLeft },
  { value: 'Despesa', label: 'Despesa', icon: ArrowUpRight },
  { value: 'Transferência', label: 'Transf.', icon: ArrowRightLeft },
];

const FREQS_MAP = {
  'Semanal': (d, i) => addWeeks(d, i),
  'Mensal': (d, i) => addMonths(d, i),
  'Bimestral': (d, i) => addMonths(d, i * 2),
  'Trimestral': (d, i) => addMonths(d, i * 3),
  'Semestral': (d, i) => addMonths(d, i * 6),
  'Anual': (d, i) => addYears(d, i),
};

export default function NovoLancamentoDialog({ open, onClose, onSaved, contaDefaultId, tipoInicial }) {
  const [tipo, setTipo] = useState(tipoInicial || 'Despesa');
  const [contas, setContas] = useState([]);
  const [valorCents, setValorCents] = useState('0');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoria, setCategoria] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [contaId, setContaId] = useState(contaDefaultId || '');
  const [contaDestinoId, setContaDestinoId] = useState('');
  const [status, setStatus] = useState('Em Aberto');
  const [tags, setTags] = useState([]);
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [frequencia, setFrequencia] = useState('');
  const [parcelas, setParcelas] = useState(2);
  const [dataFim, setDataFim] = useState('');
  const [step, setStep] = useState('valor');
  const { toast } = useToast();
  const { categorias, reload: reloadCats } = useCategorias();

  useEffect(() => {
    if (open) {
      base44.entities.ContasFinanceiras.filter({ ativo: true }).then(setContas);
      setTipo(tipoInicial || 'Despesa');
      setValorCents('0');
      setDescricao('');
      setData(format(new Date(), 'yyyy-MM-dd'));
      setCategoria('');
      setCategoriaId('');
      setContaId(contaDefaultId || '');
      setContaDestinoId('');
      setStatus('Em Aberto');
      setTags([]);
      setIsRecorrente(false);
      setFrequencia('');
      setParcelas(2);
      setDataFim('');
      setStep('valor');
    }
  }, [open, tipoInicial, contaDefaultId]);

  if (!open) return null;

  const valorNumerico = parseInt(valorCents || '0', 10) / 100;
  const display = valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const gerarGrupoId = () => `grp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const handleSave = async () => {
    if (!valorNumerico || valorNumerico <= 0) { toast({ title: 'Informe o valor', variant: 'destructive' }); return; }
    if (tipo !== 'Transferência' && !descricao.trim()) { toast({ title: 'Informe a descrição', variant: 'destructive' }); return; }
    if (!contaId) { toast({ title: 'Selecione a conta', variant: 'destructive' }); return; }

    const conta = contas.find(c => c.id === contaId);

    if (tipo === 'Transferência') {
      if (!contaDestinoId) { toast({ title: 'Selecione a conta destino', variant: 'destructive' }); return; }
      const contaDest = contas.find(c => c.id === contaDestinoId);
      await base44.entities.LancamentoFinanceiro.create({ tipo: 'Despesa', descricao: `Transferência para ${contaDest?.nome}`, valor: valorNumerico, data_vencimento: data, data_pagamento: data, status: 'Pago', status_conciliacao: 'N/A', categoria: 'Transferência entre Contas', conta_financeira_id: contaId, conta_financeira_nome: conta?.nome, referencia_tipo: 'Manual' });
      await base44.entities.LancamentoFinanceiro.create({ tipo: 'Receita', descricao: `Transferência de ${conta?.nome}`, valor: valorNumerico, data_vencimento: data, data_pagamento: data, status: 'Pago', status_conciliacao: 'N/A', categoria: 'Transferência entre Contas', conta_financeira_id: contaDestinoId, conta_financeira_nome: contaDest?.nome, referencia_tipo: 'Manual' });
      await base44.entities.ContasFinanceiras.update(contaId, { saldo_atual: (conta?.saldo_atual || 0) - valorNumerico });
      await base44.entities.ContasFinanceiras.update(contaDestinoId, { saldo_atual: (contas.find(c => c.id === contaDestinoId)?.saldo_atual || 0) + valorNumerico });
    } else if (isRecorrente && frequencia) {
      // Gerar múltiplos lançamentos agrupados
      const grupoId = gerarGrupoId();
      const baseDate = new Date(data);
      const isPago = status === 'Pago';
      const lotes = [];

      if (frequencia === 'Parcelado') {
        for (let i = 0; i < parcelas; i++) {
          const dtVenc = addMonths(baseDate, i);
          lotes.push({
            tipo, descricao: `${descricao} (${i + 1}/${parcelas})`,
            valor: valorNumerico, data_vencimento: format(dtVenc, 'yyyy-MM-dd'),
            data_pagamento: i === 0 && isPago ? data : null,
            status: i === 0 && isPago ? 'Pago' : 'Em Aberto',
            status_conciliacao: i === 0 && isPago ? 'Pendente' : 'N/A',
            categoria, categoria_id: categoriaId, tags,
            conta_financeira_id: contaId, conta_financeira_nome: conta?.nome,
            referencia_tipo: 'Manual',
            is_recorrente: true, frequencia_recorrencia: frequencia,
            numero_parcelas_total: parcelas, parcela_atual: i + 1,
            grupo_lancamento_id: grupoId,
          });
        }
      } else {
        // Recorrência: gerar até dataFim ou 12 ocorrências como máximo
        const addFn = FREQS_MAP[frequencia] || FREQS_MAP['Mensal'];
        const limiteDate = dataFim ? new Date(dataFim) : addMonths(baseDate, 11);
        let i = 0;
        let dtAtual = baseDate;
        while (dtAtual <= limiteDate && i < 60) {
          lotes.push({
            tipo, descricao,
            valor: valorNumerico, data_vencimento: format(dtAtual, 'yyyy-MM-dd'),
            data_pagamento: i === 0 && isPago ? data : null,
            status: i === 0 && isPago ? 'Pago' : 'Em Aberto',
            status_conciliacao: i === 0 && isPago ? 'Pendente' : 'N/A',
            categoria, categoria_id: categoriaId, tags,
            conta_financeira_id: contaId, conta_financeira_nome: conta?.nome,
            referencia_tipo: 'Manual',
            is_recorrente: true, frequencia_recorrencia: frequencia,
            parcela_atual: i + 1, grupo_lancamento_id: grupoId,
            data_fim_recorrencia: dataFim || null,
          });
          i++;
          dtAtual = addFn(baseDate, i);
        }
      }

      await base44.entities.LancamentoFinanceiro.bulkCreate(lotes);
      if (isPago && conta) {
        const delta = tipo === 'Receita' ? valorNumerico : -valorNumerico;
        await base44.entities.ContasFinanceiras.update(conta.id, { saldo_atual: (conta.saldo_atual || 0) + delta });
      }
    } else {
      // Lançamento único
      const isPago = status === 'Pago';
      await base44.entities.LancamentoFinanceiro.create({
        tipo, descricao, valor: valorNumerico,
        data_vencimento: data, data_pagamento: isPago ? data : null,
        status, status_conciliacao: isPago ? 'Pendente' : 'N/A',
        categoria, categoria_id: categoriaId, tags,
        conta_financeira_id: contaId, conta_financeira_nome: conta?.nome,
        referencia_tipo: 'Manual',
      });
      if (isPago && conta) {
        const delta = tipo === 'Receita' ? valorNumerico : -valorNumerico;
        await base44.entities.ContasFinanceiras.update(conta.id, { saldo_atual: (conta.saldo_atual || 0) + delta });
      }
    }

    toast({ title: 'Lançamento salvo!' });
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-gray-900" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 active:scale-95">
          <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex gap-1 bg-gray-200 dark:bg-gray-800 rounded-2xl p-1">
          {TIPOS.map(t => {
            const Icon = t.icon;
            const isActive = tipo === t.value;
            return (
              <button key={t.value} onClick={() => setTipo(t.value)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${isActive ? 'bg-gray-500 dark:bg-gray-200 text-white dark:text-gray-900 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                <Icon className="w-3.5 h-3.5" />{t.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1">
          <div className={`w-2 h-2 rounded-full transition-all ${step === 'valor' ? 'bg-gray-800 dark:bg-gray-200' : 'bg-gray-300 dark:bg-gray-600'}`} />
          <div className={`w-2 h-2 rounded-full transition-all ${step === 'detalhes' ? 'bg-gray-800 dark:bg-gray-200' : 'bg-gray-300 dark:bg-gray-600'}`} />
        </div>
      </div>

      {step === 'valor' ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="text-center w-full">
            <p className="text-[0.7rem] uppercase tracking-widest text-gray-400 mb-2">Valor</p>
            <input
              type="number" inputMode="decimal" min="0" step="0.01"
              value={valorNumerico === 0 ? '' : valorNumerico}
              onChange={e => setValorCents(Math.round(parseFloat(e.target.value || '0') * 100).toString() || '0')}
              placeholder="0,00"
              className="w-full text-center text-5xl font-semibold text-gray-900 dark:text-white tracking-tight font-glacial bg-transparent outline-none border-0 placeholder-gray-300"
            />
            <p className="text-xs text-gray-400 mt-1">R$</p>
          </div>
          <input
            value={descricao} onChange={e => setDescricao(e.target.value)}
            placeholder={tipo === 'Transferência' ? 'Observações (opcional)' : 'Descrição *'}
            className="w-full text-center bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 py-2 text-sm text-gray-600 dark:text-gray-300 placeholder-gray-400 outline-none focus:border-gray-400 transition-colors"
          />
          <button onClick={() => setStep('detalhes')}
            className="w-full h-14 rounded-2xl bg-gray-500 dark:bg-white text-white dark:text-gray-900 text-base font-semibold active:scale-95 transition-all flex items-center justify-center gap-2">
            Continuar <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3 pt-2">
          {/* Resumo */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm">
            <span className="text-sm text-gray-500 dark:text-gray-400">{tipo} · {descricao || '—'}</span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">R$ {display}</span>
          </div>

          {/* Data */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
            <div className="px-4 py-1 text-[10px] text-gray-400 uppercase tracking-wider pt-3">Data de Vencimento</div>
            <input type="date" value={data} onChange={e => setData(e.target.value)}
              className="w-full bg-transparent px-4 pb-3 text-sm text-gray-800 dark:text-gray-200 outline-none" />
          </div>

          {/* Conta */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger className="border-0 shadow-none bg-transparent h-12 dark:text-gray-200 text-sm px-4">
                <SelectValue placeholder={tipo === 'Transferência' ? 'Conta Origem *' : 'Conta *'} />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {tipo === 'Transferência' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              <Select value={contaDestinoId} onValueChange={setContaDestinoId}>
                <SelectTrigger className="border-0 shadow-none bg-transparent h-12 dark:text-gray-200 text-sm px-4">
                  <SelectValue placeholder="Conta Destino *" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {contas.filter(c => c.id !== contaId).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {tipo !== 'Transferência' && (
            <>
              {/* Status */}
              <div className="flex gap-2">
                {['Em Aberto', 'Pago'].map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    className={`flex-1 h-12 rounded-2xl text-sm font-medium transition-all shadow-sm ${status === s ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                    {s}
                  </button>
                ))}
              </div>

              {/* Categoria dinâmica */}
              <SeletorCategoria
                tipo={tipo}
                value={categoria}
                onChange={(nome, id) => { setCategoria(nome); setCategoriaId(id || ''); }}
                categorias={categorias}
                onCriada={reloadCats}
              />

              {/* Tags */}
              <TagsInput tags={tags} onChange={setTags} />

              {/* Recorrência */}
              <RecorrenciaConfig
                isRecorrente={isRecorrente} onToggle={setIsRecorrente}
                frequencia={frequencia} onFrequencia={setFrequencia}
                parcelas={parcelas} onParcelas={setParcelas}
                dataFim={dataFim} onDataFim={setDataFim}
              />
            </>
          )}

          <button onClick={handleSave}
            className="w-full h-14 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-semibold active:scale-95 transition-all flex items-center justify-center gap-2 mt-2">
            <CheckCircle2 className="w-5 h-5" />
            {isRecorrente && frequencia === 'Parcelado' ? `Criar ${parcelas} parcelas` : isRecorrente ? 'Criar Recorrência' : 'Confirmar Lançamento'}
          </button>
        </div>
      )}
    </div>
  );
}