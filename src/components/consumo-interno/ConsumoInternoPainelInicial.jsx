import React from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, RefreshCw, MapPin, UserRound, Package, MoreVertical, Pencil, Paperclip, Trash2, Eye, Plus, Tags, ImageIcon } from 'lucide-react';
import { P38MobileLine, P38MobileLineList, P38StatusLabel, p38StatusTone, p38AccentKeyFromTone } from '@/components/ui/p38-mobile-line';

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
    <div className="min-h-screen bg-muted/40 p-4 dark:bg-background md:p-6">
      <div className="mx-auto max-w-6xl space-y-5 pb-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold text-foreground">Consumo Interno</p>
            <p className="text-sm text-muted-foreground">Movimentações internas.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRefresh} className="rounded-[24px] bg-card p-3 shadow-sm transition-colors hover:bg-muted/50 dark:hover:bg-primary/90" style={{ minWidth: '48px', minHeight: '48px' }}>
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="rounded-[24px] bg-card px-4 py-3 shadow-sm dark:bg-muted">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total — {labelFiltro[filtroTemporal]}</p>
              <p className="text-lg font-semibold text-foreground">{formatCurrency(consumosFiltrados.reduce((sum, item) => sum + (item.valor_total || 0), 0))}</p>
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
                  ? 'bg-background text-white dark:bg-card dark:text-foreground'
                  : 'bg-card text-muted-foreground shadow-sm dark:bg-muted dark:text-foreground/90'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-[30px] bg-card p-5 shadow-sm dark:bg-muted">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-lg font-semibold text-foreground">Histórico</p>
            <div className="relative w-full max-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar" className="h-10 rounded-2xl border-0 bg-muted pl-9 shadow-sm dark:bg-background" />
            </div>
          </div>

          <div className="space-y-4">
            {consumosAgrupadosPorDia.length === 0 && (
              <div className="rounded-[24px] bg-muted/40 px-4 py-10 text-center text-sm text-muted-foreground shadow-sm dark:bg-background dark:text-muted-foreground">
                Nenhuma movimentação encontrada.
              </div>
            )}

            {consumosAgrupadosPorDia.map(([dia, itens]) => (
              <div key={dia}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {format(new Date(dia + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {formatCurrency(itens.reduce((s, i) => s + (i.valor_total || 0), 0))}
                  </p>
                </div>

                <P38MobileLineList>
                  {itens.map((item, index) => (
                    <P38MobileLine
                      key={item.id}
                      striped={index % 2 === 1}
                      accent="muted"
                      title={item.numero}
                      meta={
                        <>
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{item.destinacao}</span>
                          <span className="inline-flex items-center gap-1"><UserRound className="h-3 w-3 shrink-0" />{item.responsavel_recebimento}</span>
                          <span className="inline-flex items-center gap-1"><Package className="h-3 w-3 shrink-0" />{item.quantidade_total_itens} item(ns)</span>
                          {!!item.assinatura_recolhedor_url && <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3 shrink-0" />assinatura</span>}
                          {!!item.tags?.length && <span className="inline-flex items-center gap-1"><Tags className="h-3 w-3 shrink-0" />{item.tags.join(', ')}</span>}
                        </>
                      }
                      value={formatCurrency(item.valor_total)}
                      trailing={
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onView(item)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
                            aria-label="Visualizar consumo"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" onClick={(e) => e.stopPropagation()} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => onEdit(item)} className="cursor-pointer gap-2">
                                <Pencil className="h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onViewAttachments(item)} className="cursor-pointer gap-2">
                                <ImageIcon className="h-4 w-4" /> Ver anexos
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onAttach(item)} className="cursor-pointer gap-2">
                                <Paperclip className="h-4 w-4" /> Anexar doc / foto
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onDelete(item)} className="cursor-pointer gap-2 text-destructive">
                                <Trash2 className="h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      }
                    />
                  ))}
                </P38MobileLineList>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed right-4 z-[55] flex flex-col items-end gap-3 p38-bottom-fab1 lg:bottom-10 lg:right-6">
        {showFabMenu && (
          <div className="flex flex-col gap-2 rounded-[28px] bg-card p-2 shadow-2xl dark:bg-muted">
            <button
              type="button"
              onClick={onNovoFormulario}
              className="min-h-[48px] rounded-2xl px-4 py-3 text-left text-sm font-medium text-foreground/90 transition-colors hover:bg-muted/40 dark:text-foreground dark:hover:bg-primary/90"
            >
              Novo formulário
            </button>
            <Link
              to="/AnexoCompartilhado"
              onClick={() => setShowFabMenu(false)}
              className="min-h-[48px] rounded-2xl px-4 py-3 text-left text-sm font-medium text-foreground/90 transition-colors hover:bg-muted/40 dark:text-foreground dark:hover:bg-primary/90"
            >
              Página antiga
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowFabMenu((prev) => !prev)}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-background text-white shadow-2xl transition-transform hover:scale-105 dark:bg-card dark:text-foreground"
          aria-label="Novo consumo interno"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}