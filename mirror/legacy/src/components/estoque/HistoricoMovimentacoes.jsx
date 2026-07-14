import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { base44 } from '@/api/base44Client';
import { useProdutosListQuery } from '@/hooks/useP38Entities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, P38TableShell } from '@/components/ui/table';
import { P38MobileLine, P38MobileLineList, p38AccentKeyFromTone } from '@/components/ui/p38-mobile-line';
import { Badge } from '@/components/ui/badge';
import { ArrowDownCircle, ArrowUpCircle, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import {
  getVirtualPadding,
  measureVirtualItem,
  P38_VIRTUAL_LIST_MAX_HEIGHT,
  P38_VIRTUAL_MIN_ROWS,
  P38_VIRTUAL_OVERSCAN,
} from '@/lib/p38VirtualList';

function MovimentoMobileLine({ mov, striped }) {
  const tone = mov.tipo === 'Entrada' ? 'success' : 'danger';
  const qtyPrefix = mov.tipo === 'Entrada' ? '+' : '-';

  return (
    <P38MobileLine
      striped={striped}
      accent={p38AccentKeyFromTone(tone)}
      title={mov.produto_nome}
      subtitle={format(new Date(mov.created_date), 'dd/MM/yyyy HH:mm')}
      meta={
        <>
          <span className="font-medium">{mov.tipo}</span>
          <span>{mov.motivo}</span>
          <span className="truncate">{mov.usuario_responsavel || 'N/A'}</span>
          <span>Doc: {mov.documento_referencia || '-'}</span>
        </>
      }
      value={`${qtyPrefix}${mov.quantidade}`}
      valueSub={`R$ ${mov.custo_unitario?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`}
    />
  );
}

function VirtualizedMovimentosMobile({ movimentacoes }) {
  const parentRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: movimentacoes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    getItemKey: (index) => movimentacoes[index]?.id ?? index,
    measureElement: measureVirtualItem,
    overscan: P38_VIRTUAL_OVERSCAN,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <P38MobileLineList ref={parentRef} className="pr-1" style={{ maxHeight: P38_VIRTUAL_LIST_MAX_HEIGHT }}>
      <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {virtualItems.map((virtualRow) => {
          const mov = movimentacoes[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <MovimentoMobileLine mov={mov} striped={virtualRow.index % 2 === 1} />
            </div>
          );
        })}
      </div>
    </P38MobileLineList>
  );
}

function VirtualizedMovimentosTable({ movimentacoes }) {
  const parentRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: movimentacoes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 58,
    getItemKey: (index) => movimentacoes[index]?.id ?? index,
    measureElement: measureVirtualItem,
    overscan: P38_VIRTUAL_OVERSCAN,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const { paddingTop, paddingBottom } = getVirtualPadding(virtualItems, rowVirtualizer.getTotalSize());

  return (
    <div ref={parentRef} className="hidden desktop-layout:block min-w-0 overflow-auto" style={{ maxHeight: P38_VIRTUAL_LIST_MAX_HEIGHT }}>
      <P38TableShell className="overflow-visible">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Responsável</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paddingTop > 0 && (
              <TableRow aria-hidden="true" className="border-0">
                <TableCell colSpan={7} style={{ height: `${paddingTop}px`, padding: 0 }} />
              </TableRow>
            )}
            {virtualItems.map((virtualRow) => {
              const mov = movimentacoes[virtualRow.index];
              return (
                <TableRow
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className="hover:bg-muted/40"
                >
                  <TableCell className="font-medium">
                    <div>{format(new Date(mov.created_date), 'dd/MM/yyyy')}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(mov.created_date), 'HH:mm')}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-muted text-foreground">
                      {mov.tipo === 'Entrada' ? (
                        <ArrowDownCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <ArrowUpCircle className="w-3 h-3 mr-1" />
                      )}
                      {mov.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{mov.produto_nome}</div>
                    <div className="text-xs text-muted-foreground">
                      Custo: R$ {mov.custo_unitario?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-muted text-foreground" variant="outline">
                      {mov.motivo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold ${mov.tipo === 'Entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {mov.tipo === 'Entrada' ? '+' : '-'}{mov.quantidade}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{mov.documento_referencia || '-'}</TableCell>
                  <TableCell className="text-sm">{mov.usuario_responsavel || '-'}</TableCell>
                </TableRow>
              );
            })}
            {paddingBottom > 0 && (
              <TableRow aria-hidden="true" className="border-0">
                <TableCell colSpan={7} style={{ height: `${paddingBottom}px`, padding: 0 }} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </P38TableShell>
    </div>
  );
}

export default function HistoricoMovimentacoes() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const { data: produtos = [] } = useProdutosListQuery();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('all');
  const [filtroProduto, setFiltroProduto] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const movData = await base44.entities.MovimentacaoEstoque.list('-created_date');
      setMovimentacoes(movData);
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error);
    }
    setIsLoading(false);
  };

  const filteredMovimentacoes = useMemo(
    () =>
      movimentacoes.filter((mov) => {
        const matchSearch =
          mov.produto_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          mov.documento_referencia?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchTipo = filtroTipo === 'all' || mov.tipo === filtroTipo;
        const matchProduto = filtroProduto === 'all' || mov.produto_id === filtroProduto;
        return matchSearch && matchTipo && matchProduto;
      }),
    [movimentacoes, searchTerm, filtroTipo, filtroProduto]
  );

  const stats = useMemo(
    () => ({
      entradas: movimentacoes.filter((m) => m.tipo === 'Entrada').length,
      saidas: movimentacoes.filter((m) => m.tipo === 'Saída').length,
      total: movimentacoes.length,
    }),
    [movimentacoes]
  );

  const shouldVirtualize = filteredMovimentacoes.length >= P38_VIRTUAL_MIN_ROWS;

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border/40">
        <h2 className="text-xl font-medium text-foreground flex items-center gap-2">
          <ArrowUpCircle className="w-5 h-5 text-muted-foreground" />
          Histórico Completo de Movimentações
        </h2>
      </div>

      <div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto ou documento..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="Entrada">Entrada</SelectItem>
              <SelectItem value="Saída">Saída</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtroProduto} onValueChange={setFiltroProduto}>
            <SelectTrigger>
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Produtos</SelectItem>
              {produtos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={loadData} className="gap-2">
            <Filter className="w-4 h-4" />
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground uppercase mb-1">Total Entradas</div>
            <div className="text-2xl font-bold text-foreground dark:text-foreground">{stats.entradas}</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground uppercase mb-1">Total Saídas</div>
            <div className="text-2xl font-bold text-foreground dark:text-foreground">{stats.saidas}</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground uppercase mb-1">Total Movimentações</div>
            <div className="text-2xl font-bold text-foreground dark:text-foreground">{stats.total}</div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredMovimentacoes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhuma movimentação encontrada</div>
        ) : shouldVirtualize ? (
          <>
            <div className="desktop-layout:hidden">
              <VirtualizedMovimentosMobile movimentacoes={filteredMovimentacoes} />
            </div>
            <VirtualizedMovimentosTable movimentacoes={filteredMovimentacoes} />
          </>
        ) : (
          <>
            <P38MobileLineList className="desktop-layout:hidden">
              {filteredMovimentacoes.map((mov, index) => (
                <MovimentoMobileLine key={mov.id} mov={mov} striped={index % 2 === 1} />
              ))}
            </P38MobileLineList>
            <P38TableShell className="hidden desktop-layout:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovimentacoes.map((mov) => (
                    <TableRow key={mov.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium">
                        <div>{format(new Date(mov.created_date), 'dd/MM/yyyy')}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(mov.created_date), 'HH:mm')}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-muted text-foreground">
                          {mov.tipo === 'Entrada' ? (
                            <ArrowDownCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <ArrowUpCircle className="w-3 h-3 mr-1" />
                          )}
                          {mov.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{mov.produto_nome}</div>
                        <div className="text-xs text-muted-foreground">
                          Custo: R$ {mov.custo_unitario?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-muted text-foreground" variant="outline">
                          {mov.motivo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${mov.tipo === 'Entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {mov.tipo === 'Entrada' ? '+' : '-'}{mov.quantidade}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{mov.documento_referencia || '-'}</TableCell>
                      <TableCell className="text-sm">{mov.usuario_responsavel || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </P38TableShell>
          </>
        )}

        {filteredMovimentacoes.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            Exibindo {filteredMovimentacoes.length} de {movimentacoes.length} movimentações
            {shouldVirtualize ? ' · lista virtualizada' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
