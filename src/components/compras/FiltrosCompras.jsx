import React, { useState, useMemo, useRef } from 'react';
import { Search, X, SlidersHorizontal, Tag } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import MobileDateRangePicker from '@/components/vendas/MobileDateRangePicker';

const STATUS_OPTIONS = [
  { codigo: '__nao_concluido__',    label: 'Ocultar concluídos',    cor: 'bg-primary text-white dark:bg-muted dark:text-foreground' },
  { codigo: 'Rascunho',             label: 'Rascunho',              cor: 'bg-muted text-foreground/90' },
  { codigo: 'Aguardando Liberação', label: 'Aguardando Liberação',  cor: 'bg-yellow-100 text-yellow-800' },
  { codigo: 'Aguardando Aprovação Financeira', label: 'Aguardando Liberação', cor: 'bg-yellow-100 text-yellow-800' },
  { codigo: 'Aprovado',             label: 'Aprovado',              cor: 'bg-green-100 text-green-800' },
  { codigo: 'Despachado',           label: 'Despachado',            cor: 'bg-blue-100 text-blue-800' },
  { codigo: 'Em Trânsito',          label: 'Em Trânsito',           cor: 'bg-sky-100 text-sky-800' },
  { codigo: 'Pendência',            label: 'Pendência',             cor: 'bg-orange-100 text-orange-800' },
  { codigo: 'Devolvido',            label: 'Devolvido',             cor: 'bg-rose-100 text-rose-800' },
  { codigo: 'Concluído',            label: 'Concluído',             cor: 'bg-emerald-100 text-emerald-800' },
  { codigo: 'Cancelado',            label: 'Cancelado',             cor: 'bg-red-100 text-red-800' },
  // Status virtuais de embarque
  { codigo: 'Aguardando Embarque',  label: '↳ Ag. Embarque',        cor: 'bg-orange-50 text-orange-700' },
  { codigo: 'Recebido OK',          label: '↳ Recebido OK',         cor: 'bg-emerald-100 text-emerald-800' },
  { codigo: 'Recebido Parcial',     label: '↳ Recebido Parcial',    cor: 'bg-amber-100 text-amber-800' },
  { codigo: 'Com Divergência',      label: '↳ Com Divergência',     cor: 'bg-rose-100 text-rose-800' },
];

export default function FiltrosCompras({ 
  search, onSearch, 
  statusSel, onStatusSel, 
  fornecedores, fornecedorSel, onFornecedorSel,
  todasTags, tagsSel, onTagsSel,
  dataInicial, onDataInicial,
  dataFinal, onDataFinal,
  hasActiveFilters, onLimparFiltros 
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchFornecedor, setSearchFornecedor] = useState('');
  const [searchTag, setSearchTag] = useState('');
  const fornecedorInputRef = useRef(null);

  const tagsFiltradas = useMemo(() => {
    const sorted = [...(todasTags || [])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    if (!searchTag.trim()) return sorted;
    return sorted.filter(t => t.toLowerCase().includes(searchTag.toLowerCase()));
  }, [todasTags, searchTag]);

  const fornecedoresFiltrados = useMemo(() => {
    const sorted = [...fornecedores].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (!searchFornecedor.trim()) return sorted;
    const lower = searchFornecedor.toLowerCase();
    return sorted.filter(f => f.nome.toLowerCase().includes(lower));
  }, [fornecedores, searchFornecedor]);

  const toggleStatus = (codigo) => {
    if (statusSel.includes(codigo)) {
      onStatusSel(statusSel.filter(s => s !== codigo));
      return;
    }

    if (codigo === 'Concluído') {
      onStatusSel([...statusSel.filter(s => s !== '__nao_concluido__'), codigo]);
      return;
    }

    if (codigo === '__nao_concluido__') {
      onStatusSel(statusSel.filter(s => s !== 'Concluído').concat(codigo));
      return;
    }

    onStatusSel([...statusSel, codigo]);
  };

  const toggleFornecedor = (id) => {
    if (fornecedorSel.includes(id)) {
      onFornecedorSel(fornecedorSel.filter(f => f !== id));
    } else {
      onFornecedorSel([...fornecedorSel, id]);
    }
  };

  const toggleTag = (tag) => {
    if (tagsSel.includes(tag)) {
      onTagsSel(tagsSel.filter(t => t !== tag));
    } else {
      onTagsSel([...tagsSel, tag]);
    }
  };

  const fornecedoresSelecionadosNomes = fornecedorSel.length > 0
    ? fornecedores.filter(f => fornecedorSel.includes(f.id)).map(f => f.nome).join(', ')
    : '';

  const keepInputVisibleOnMobileKeyboard = (inputRef) => {
    if (typeof window === 'undefined' || !inputRef?.current) return;
    window.setTimeout(() => {
      inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 220);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input autoComplete="off"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Buscar embarque, pedido, fornecedor..."
            className="w-full pl-10 pr-4 h-12 bg-card dark:bg-muted border-0 text-foreground/90 dark:text-foreground placeholder:text-muted-foreground rounded-2xl outline-none shadow-sm text-sm focus:ring-2 focus:ring-teal-300 dark:focus:ring-teal-600 transition-shadow"
          />
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm relative bg-muted dark:bg-muted text-foreground/90"
          title="Filtros"
        >
          <SlidersHorizontal className="w-5 h-5" />
          {hasActiveFilters && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-teal-500 dark:bg-teal-400 rounded-full text-[10px] text-white flex items-center justify-center">•</span>
          )}
        </button>
      </div>

      {/* Chips de fornecedores e tags selecionadas */}
      {(fornecedorSel.length > 0 || tagsSel.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {fornecedores.filter(f => fornecedorSel.includes(f.id)).map(f => (
            <span key={f.id} className="inline-flex items-center gap-1 text-xs bg-muted text-foreground/90 px-2 py-1 rounded-full">
              {f.nome}
              <button onClick={() => toggleFornecedor(f.id)} className="hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {tagsSel.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 text-xs bg-teal-600 dark:bg-teal-700 text-white px-2 py-1 rounded-full">
              <Tag className="w-2.5 h-2.5" />
              {tag}
              <button onClick={() => toggleTag(tag)} className="hover:opacity-70 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Drawer open={showFilters} onOpenChange={setShowFilters}>
        <DrawerContent className="border-0 rounded-t-[28px] bg-card dark:bg-card px-4 pb-6">
          <DrawerHeader className="px-0 pb-2 text-left">
            <DrawerTitle className="font-glacial text-foreground">Filtros</DrawerTitle>
          </DrawerHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Período do pedido</label>
              <MobileDateRangePicker
                startDate={dataInicial}
                endDate={dataFinal}
                onApply={(inicio, fim) => { onDataInicial(inicio); onDataFinal(fim); }}
                onClear={() => { onDataInicial(''); onDataFinal(''); }}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Status</label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(s => {
                  const selected = statusSel.includes(s.codigo);
                  return (
                    <button
                      key={s.codigo}
                      onClick={() => toggleStatus(s.codigo)}
                      className={`inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full transition-all ${selected ? `${s.cor} font-medium shadow-sm` : 'bg-muted dark:bg-muted text-muted-foreground'}`}
                    >
                      {selected && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {(todasTags?.length > 0) && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Tags</label>
                <div className="space-y-2">
                  <div className="relative">
                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Buscar tag..." className="pl-8 h-11 text-xs bg-muted dark:bg-muted border-0 shadow-sm rounded-2xl" value={searchTag} onChange={e => setSearchTag(e.target.value)} />
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-0.5 pr-1">
                    {tagsFiltradas.map(tag => (
                      <label key={tag} className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-muted/40 dark:hover:bg-card cursor-pointer">
                        <Checkbox checked={tagsSel.includes(tag)} onCheckedChange={() => toggleTag(tag)} className="w-3.5 h-3.5" />
                        <span className="text-xs text-foreground/90 truncate">{tag}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {fornecedores.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Fornecedores</label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      ref={fornecedorInputRef}
                      placeholder="Buscar fornecedor..."
                      className="pl-8 h-11 text-xs bg-muted dark:bg-muted border-0 shadow-sm rounded-2xl"
                      value={searchFornecedor}
                      onFocus={() => keepInputVisibleOnMobileKeyboard(fornecedorInputRef)}
                      onChange={e => setSearchFornecedor(e.target.value)}
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
                    {fornecedoresFiltrados.map(f => (
                      <label key={f.id} className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-muted/40 dark:hover:bg-card cursor-pointer">
                        <Checkbox checked={fornecedorSel.includes(f.id)} onCheckedChange={() => toggleFornecedor(f.id)} className="w-3.5 h-3.5" />
                        <span className="text-xs text-foreground/90 truncate">{f.nome}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  onLimparFiltros();
                  setSearchFornecedor('');
                  setSearchTag('');
                }}
                className="flex-1 h-11 rounded-2xl bg-muted dark:bg-muted text-sm text-muted-foreground"
              >
                Limpar
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 h-11 rounded-2xl bg-teal-600 dark:bg-teal-500 text-sm text-white"
              >
                Aplicar
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}