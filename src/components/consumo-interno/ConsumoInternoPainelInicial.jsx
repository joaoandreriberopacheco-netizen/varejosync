import React from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, RefreshCw, MapPin, UserRound, Package, MoreVertical, Pencil, Paperclip, Trash2, Eye, Plus, Tags, ImageIcon } from 'lucide-react';

const formatCurrency = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function ConsumoInternoPainelInicial({
  filtroTemporal,
  setFiltroTemporal,
  labelFiltro,
  consumosFiltrados,
  search,
  setSearch,
  consumosAgrupadosPorDia,
  onRefresh,
  onView,
  onViewAttachments,
  onEdit,
  onAttach,
  onDelete,
  showFabMenu,
  setShowFabMenu,
  onNovoFormulario,
}) {
  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-900 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5 pb-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">Consumo Interno</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Movimentações internas.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRefresh} className="rounded-[24px] bg-white p-3 shadow-sm transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700" style={{ minWidth: '48px', minHeight: '48px' }}>
              <RefreshCw className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
            <div className="rounded-[24px] bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total — {labelFiltro[filtroTemporal]}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(consumosFiltrados.reduce((sum, item) => sum + (item.valor_total || 0), 0))}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(labelFiltro).map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setFiltroTemporal(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                filtroTemporal === key
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-white text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-[30px] bg-white p-5 shadow-sm dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">Histórico</p>
            <div className="relative w-full max-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar" className="h-10 rounded-2xl border-0 bg-gray-100 pl-9 shadow-sm dark:bg-gray-900" />
            </div>
          </div>

          <div className="space-y-4">
            {consumosAgrupadosPorDia.length === 0 && (
              <div className="rounded-[24px] bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">
                Nenhuma movimentação encontrada.
              </div>
            )}

            {consumosAgrupadosPorDia.map(([dia, itens]) => (
              <div key={dia}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {format(new Date(dia + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {formatCurrency(itens.reduce((s, i) => s + (i.valor_total || 0), 0))}
                  </p>
                </div>

                <div className="space-y-2">
                  {itens.map((item) => (
                    <div key={item.id} className="flex w-full items-center justify-between rounded-[24px] bg-gray-50 px-4 py-3 shadow-sm dark:bg-gray-900">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.numero}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{item.destinacao}</span>
                          <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{item.responsavel_recebimento}</span>
                          <span className="inline-flex items-center gap-1"><Package className="h-3.5 w-3.5" />{item.quantidade_total_itens} item(ns)</span>
                          {!!item.assinatura_recolhedor_url && <span className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" />assinatura</span>}
                          {!!item.tags?.length && <span className="inline-flex items-center gap-1"><Tags className="h-3.5 w-3.5" />{item.tags.join(', ')}</span>}
                        </div>
                      </div>

                      <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onView(item)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-500 shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                          aria-label="Visualizar consumo"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(item.valor_total)}</p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" onClick={(e) => e.stopPropagation()} className="rounded-xl p-1.5 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700">
                              <MoreVertical className="h-4 w-4 text-gray-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 dark:border-gray-700 dark:bg-gray-800">
                            <DropdownMenuItem onClick={() => onEdit(item)} className="cursor-pointer gap-2 dark:text-gray-200 dark:hover:bg-gray-700">
                              <Pencil className="h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onViewAttachments(item)} className="cursor-pointer gap-2 dark:text-gray-200 dark:hover:bg-gray-700">
                              <ImageIcon className="h-4 w-4" /> Ver anexos
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAttach(item)} className="cursor-pointer gap-2 dark:text-gray-200 dark:hover:bg-gray-700">
                              <Paperclip className="h-4 w-4" /> Anexar doc / foto
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onDelete(item)} className="cursor-pointer gap-2 text-red-600 dark:text-red-400 dark:hover:bg-gray-700">
                              <Trash2 className="h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-28 right-4 z-40 flex flex-col items-end gap-3 md:bottom-10 md:right-6">
        {showFabMenu && (
          <div className="flex flex-col gap-2 rounded-[28px] bg-white p-2 shadow-2xl dark:bg-gray-800">
            <button
              type="button"
              onClick={onNovoFormulario}
              className="min-h-[48px] rounded-2xl px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Novo formulário
            </button>
            <Link
              to="/AnexoCompartilhado"
              onClick={() => setShowFabMenu(false)}
              className="min-h-[48px] rounded-2xl px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Página antiga
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowFabMenu((prev) => !prev)}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-900 text-white shadow-2xl transition-transform hover:scale-105 dark:bg-white dark:text-gray-900"
          aria-label="Novo consumo interno"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}