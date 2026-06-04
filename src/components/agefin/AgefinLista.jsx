import React, { useState, useMemo } from 'react';
import { ChevronRight, AlertCircle, Calendar, Paperclip, Filter, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AgefinDetalhes from './AgefinDetalhes';
import { P38MobileLine, P38MobileLineList, P38StatusLabel, p38AccentKeyFromTone } from '@/components/ui/p38-mobile-line';

export default function AgefinLista({ contas, onRefresh }) {
  const [selectedConta, setSelectedConta] = useState(null);
  const [sortBy, setSortBy] = useState('vencimento'); // vencimento, valor, status
  const [filterStatus, setFilterStatus] = useState('Pendente');

  const sorted = useMemo(() => {
    const contasPagar = (contas || []).filter((c) => c && c.tipo !== 'Receita');
    let filtered = filterStatus ? contasPagar.filter(c => c.status === filterStatus) : contasPagar;

    return filtered.sort((a, b) => {
      if (sortBy === 'vencimento') {
        return new Date(a.data_vencimento) - new Date(b.data_vencimento);
      } else if (sortBy === 'valor') {
        return b.valor - a.valor;
      }
      return 0;
    });
  }, [contas, sortBy, filterStatus]);

  if (selectedConta) {
    return (
      <AgefinDetalhes
        conta={selectedConta}
        onBack={() => setSelectedConta(null)}
        onUpdate={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        {['Pendente', 'Boleto Anexado', 'Pago', 'Cancelado'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(filterStatus === status ? null : status)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-muted text-foreground/90'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex gap-2">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="flex-1 px-4 py-3 rounded-2xl bg-muted text-foreground border-0 focus:ring-2 focus:ring-blue-500"
        >
          <option value="vencimento">Ordenar por vencimento</option>
          <option value="valor">Ordenar por valor</option>
        </select>
      </div>

      {/* List */}
      <div>
        {sorted.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Filter className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-foreground/90 font-medium mb-2">Nenhuma conta encontrada</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {filterStatus ? `Nenhuma conta com status "${filterStatus}". Ajuste o filtro para ver outras contas.` : 'Adicione contas para começar a gerenciar seus pagamentos.'}
            </p>
            {filterStatus && (
              <button
                onClick={() => setFilterStatus(null)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
              >
                <X className="w-4 h-4" />
                Limpar filtro
              </button>
            )}
          </div>
        ) : (
          <P38MobileLineList>
            {sorted.map((conta, index) => (
              <ContaCard key={conta.id} conta={conta} striped={index % 2 === 1} onClick={() => setSelectedConta(conta)} />
            ))}
          </P38MobileLineList>
        )}
      </div>
    </div>
  );
}

function ContaCard({ conta, onClick, striped }) {
  const isPaid = conta.status === 'Pago' || conta.status_visual === 'pago';
  const isOverdue = new Date(conta.data_vencimento) < new Date() && !isPaid;
  const hasBoleto = !!conta.tem_boleto;
  const daysUntil = Math.ceil((new Date(conta.data_vencimento) - new Date()) / (1000 * 60 * 60 * 24));
  const statusLabel = isPaid ? 'Pago' : isOverdue ? 'Vencido' : hasBoleto ? 'Boleto' : conta.status || 'Pendente';
  const tone = isPaid ? 'success' : isOverdue ? 'danger' : hasBoleto ? 'info' : conta.status === 'Cancelado' ? 'muted' : 'warning';

  return (
    <P38MobileLine
      as="button"
      type="button"
      striped={striped}
      accent={p38AccentKeyFromTone(tone)}
      onClick={onClick}
      className="w-full text-left"
      title={conta.descricao}
      meta={
        <>
          <P38StatusLabel tone={tone}>{statusLabel}</P38StatusLabel>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3 shrink-0" />
            {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}
          </span>
          {daysUntil > 0 && !isPaid && <span>{daysUntil} dia{daysUntil > 1 ? 's' : ''}</span>}
          {conta.tem_anexo && <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />}
          {conta.valor_desatualizado && <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />}
        </>
      }
      value={`R$ ${conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
      trailing={<ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
    />
  );
}