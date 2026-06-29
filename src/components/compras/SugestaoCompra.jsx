import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, P38TableShell } from '@/components/ui/table';
import FiltrosSugestaoCompra from '@/components/compras/FiltrosSugestaoCompra';
import { ShoppingCart, RefreshCw, CheckCircle, FileText, Truck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { dataHoje } from '@/components/utils/dateUtils';
import { buildSnapshotExibicaoComercial, resolveCommercialDisplay } from '@/lib/productUnits';
import { resolveFatorEmbalagemCompra } from '@/lib/calcularMetasEstoqueVendas';
import { P38MobileLine, P38MobileLineList, P38StatusLabel, p38AccentKeyFromTone } from '@/components/ui/p38-mobile-line';

const FORNECEDOR_VAZIO = '__none__';

export default function SugestaoCompra({ onStatsChange }) {
  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState({});
  const [fornecedorPorProduto, setFornecedorPorProduto] = useState({});

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearch, setTagSearch] = useState('');
  const [hidePending, setHidePending] = useState(false);
  const [roundingMode, setRoundingMode] = useState('auto');

  const { toast } = useToast();

  const allTags = useMemo(() => {
    const tags = new Set();
    produtos.forEach((p) => p.tags?.forEach((t) => tags.add(t)));
    return [...tags].sort();
  }, [produtos]);

  const produtoParaCompra = (produto) => buildSnapshotExibicaoComercial(produto);

  const calcQuantity = (produto) => {
    const target =
      produto.estoque_ideal ||
      produto.estoque_maximo ||
      (produto.estoque_minimo > 0 ? produto.estoque_minimo * 2 : 10);
    const pack = resolveFatorEmbalagemCompra(produto);
    const need = Math.max(target - (produto.estoque_atual || 0), pack);

    if (pack <= 1) return need;

    if (roundingMode === 'up') return Math.ceil(need / pack) * pack;
    if (roundingMode === 'down') {
      const q = Math.floor(need / pack) * pack;
      return q === 0 ? pack : q;
    }
    if (roundingMode === 'none') return need;

    const q = Math.round(need / pack) * pack;
    return q === 0 ? pack : q;
  };

  const sugestaoDisplay = (produto) => {
    const qBase = calcQuantity(produto);
    return resolveCommercialDisplay(
      produtoParaCompra(produto),
      qBase,
      produto.unidade_principal || 'UN',
    );
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prods, forn, cats, pedidos] = await Promise.all([
        base44.entities.Produto.filter({ tipo: 'Produto', ativo: true }),
        base44.entities.Terceiro.list(),
        base44.entities.Categoria.list(),
        base44.entities.PedidoCompra.filter({
          status: ['Enviado', 'Aguardando Recepção', 'Aguardando Embarque', 'Recebido Parcialmente'],
        }),
      ]);

      const pending = {};
      pedidos.forEach((p) => {
        p.itens?.forEach((i) => {
          pending[i.produto_id] = (pending[i.produto_id] || 0) + (i.quantidade || 0);
        });
      });

      const filtered = prods
        .filter((p) => {
          const ea = p.estoque_atual || 0;
          const em = p.estoque_minimo || 0;
          return ea < em || (ea === 0 && (em > 0 || p.estoque_ideal > 0 || p.estoque_maximo > 0));
        })
        .map((p) => ({
          ...p,
          quantidade_pendente: pending[p.id] || 0,
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome));

      setProdutos(filtered);
      setFornecedores(forn);
      setCategorias(cats);
    } catch (error) {
      toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return produtos.filter((p) => {
      if (hidePending && p.quantidade_pendente > 0) return false;
      if (s && !p.nome.toLowerCase().includes(s)) return false;
      if (categoryFilter !== 'all' && p.categoria_id !== categoryFilter) return false;
      if (supplierFilter !== 'all' && p.fornecedor_padrao_id !== supplierFilter) return false;
      if (selectedTags.length > 0 && !selectedTags.every((t) => p.tags?.includes(t))) return false;
      return true;
    });
  }, [produtos, searchTerm, categoryFilter, supplierFilter, selectedTags, hidePending]);

  const selectedCount = Object.keys(selectedItems).length;

  useEffect(() => {
    onStatsChange?.({
      total: filteredProducts.length,
      selected: selectedCount,
      catalogo: produtos.length,
    });
  }, [filteredProducts.length, selectedCount, produtos.length, onStatsChange]);

  const handleSelectAll = (checked) => {
    if (checked) {
      const all = {};
      filteredProducts.forEach((p) => {
        all[p.id] = true;
      });
      setSelectedItems(all);
    } else {
      setSelectedItems({});
    }
  };

  const limparFiltros = () => {
    setCategoryFilter('all');
    setSupplierFilter('all');
    setSelectedTags([]);
    setTagSearch('');
    setHidePending(false);
    setRoundingMode('auto');
  };

  const handleGenerate = async () => {
    const selected = filteredProducts.filter((p) => selectedItems[p.id]);
    if (selected.length === 0) return;

    const noSupplier = selected.filter((p) => !fornecedorPorProduto[p.id] && !p.fornecedor_padrao_id);
    if (noSupplier.length > 0) {
      toast({
        title: 'Produtos sem fornecedor',
        description: `${noSupplier.length} produto(s) sem fornecedor`,
        variant: 'destructive',
      });
      return;
    }

    const bySupplier = {};
    selected.forEach((p) => {
      const sid = fornecedorPorProduto[p.id] || p.fornecedor_padrao_id;
      const supplier = fornecedores.find((f) => f.id === sid);
      if (!bySupplier[sid]) {
        bySupplier[sid] = { fornecedor_id: sid, fornecedor_nome: supplier?.nome || 'N/A', itens: [] };
      }
      const qBase = calcQuantity(p);
      const snap = produtoParaCompra(p);
      const disp = resolveCommercialDisplay(snap, qBase, p.unidade_principal || 'UN');
      const custoBase = p.preco_custo_calculado || p.valor_compra || 0;
      const custoUnitCompra = custoBase * (disp.fator_conversao || 1);
      bySupplier[sid].itens.push({
        produto_id: p.id,
        produto_nome: p.nome,
        quantidade: disp.quantidade,
        quantidade_base: qBase,
        fator_conversao: disp.fator_conversao,
        unidade: disp.unidade,
        custo_unitario: custoUnitCompra,
        total: qBase * custoBase,
      });
    });

    try {
      const all = await base44.entities.PedidoCompra.list();
      let num =
        (all.length > 0 ? Math.max(...all.map((x) => parseInt(x.numero?.split('-')[1] || 0, 10))) : 0) + 1;

      await Promise.all(
        Object.values(bySupplier).map((data) => {
          const total = data.itens.reduce((sum, i) => sum + i.total, 0);
          return base44.entities.PedidoCompra.create({
            ...data,
            numero: `PC-${String(num++).padStart(5, '0')}`,
            status: 'Rascunho',
            valor_total: total,
          });
        }),
      );

      toast({
        title: 'Pedidos gerados',
        description: `${Object.keys(bySupplier).length} pedido(s) criados`,
        className: 'bg-green-100 text-green-800',
      });
      setSelectedItems({});
      loadData();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleQuote = async () => {
    const selected = filteredProducts.filter((p) => selectedItems[p.id]);
    if (selected.length === 0) return;

    try {
      const all = await base44.entities.Cotacao.list();
      const num =
        (all.length > 0 ? Math.max(...all.map((c) => parseInt(c.numero?.split('-')[1] || 0, 10))) : 0) + 1;

      const suppliers = [
        ...new Set(selected.map((p) => fornecedorPorProduto[p.id] || p.fornecedor_padrao_id).filter(Boolean)),
      ];

      await base44.entities.Cotacao.create({
        numero: `COT-${String(num).padStart(5, '0')}`,
        titulo: `Cotação - ${new Date().toLocaleDateString()}`,
        status: 'Rascunho',
        data_abertura: dataHoje(),
        itens: selected.map((p) => {
          const qBase = calcQuantity(p);
          const disp = resolveCommercialDisplay(produtoParaCompra(p), qBase, p.unidade_principal || 'UN');
          return {
            produto_id: p.id,
            produto_nome: p.nome,
            quantidade: disp.quantidade,
            unidade: disp.unidade,
            quantidade_base: qBase,
            fator_conversao: disp.fator_conversao,
          };
        }),
        fornecedores: suppliers.map((id) => {
          const f = fornecedores.find((x) => x.id === id);
          return { fornecedor_id: id, fornecedor_nome: f?.nome || 'N/A', status_envio: 'Pendente' };
        }),
      });

      toast({ title: 'Cotação criada', className: 'bg-blue-100 text-blue-800' });
      setSelectedItems({});
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const renderFornecedorSelect = (produto, className = '') => {
    const value = fornecedorPorProduto[produto.id] || produto.fornecedor_padrao_id || FORNECEDOR_VAZIO;
    return (
      <Select
        value={value}
        onValueChange={(v) =>
          setFornecedorPorProduto({
            ...fornecedorPorProduto,
            [produto.id]: v === FORNECEDOR_VAZIO ? '' : v,
          })
        }
      >
        <SelectTrigger className={className || 'h-8 w-full max-w-[14rem] rounded-lg border-0 bg-muted/40 text-xs'}>
          <SelectValue placeholder="Fornecedor..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FORNECEDOR_VAZIO}>Selecione...</SelectItem>
          {fornecedores.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      <FiltrosSugestaoCompra
        searchTerm={searchTerm}
        onSearchTerm={setSearchTerm}
        categoryFilter={categoryFilter}
        onCategoryFilter={setCategoryFilter}
        categorias={categorias}
        supplierFilter={supplierFilter}
        onSupplierFilter={setSupplierFilter}
        fornecedores={fornecedores}
        selectedTags={selectedTags}
        onSelectedTags={setSelectedTags}
        allTags={allTags}
        tagSearch={tagSearch}
        onTagSearch={setTagSearch}
        hidePending={hidePending}
        onHidePending={setHidePending}
        roundingMode={roundingMode}
        onRoundingMode={setRoundingMode}
        onLimparFiltros={limparFiltros}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground/85">
          {filteredProducts.length} sugestão(ões)
          {selectedCount > 0 ? ` · ${selectedCount} selecionada(s)` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-2xl bg-muted shrink-0"
            onClick={loadData}
            title="Atualizar"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 rounded-2xl gap-1.5"
            disabled={selectedCount === 0}
            onClick={handleQuote}
          >
            <FileText className="w-4 h-4" />
            Cotação
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-11 rounded-2xl gap-1.5"
            disabled={selectedCount === 0}
            onClick={handleGenerate}
          >
            <ShoppingCart className="w-4 h-4" />
            Gerar pedido{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </Button>
        </div>
      </div>

      {produtos.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl shadow-sm border border-border/30">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Estoque saudável. Nenhuma sugestão no momento.</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl shadow-sm border border-border/30">
          <p className="text-muted-foreground">Nenhum produto corresponde aos filtros.</p>
        </div>
      ) : (
        <>
          <P38TableShell className="hidden desktop-layout:block min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredProducts.length > 0 &&
                        filteredProducts.every((p) => selectedItems[p.id])
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="w-52">Fornecedor</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead className="text-center">Pendente</TableHead>
                  <TableHead className="text-right">Qtd sugerida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p) => {
                  const disp = sugestaoDisplay(p);
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/40">
                      <TableCell>
                        <Checkbox
                          checked={!!selectedItems[p.id]}
                          onCheckedChange={(c) =>
                            setSelectedItems((prev) =>
                              c ? { ...prev, [p.id]: true } : { ...prev, [p.id]: undefined },
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{p.nome}</div>
                        {p.quantidade_pendente > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Truck className="w-3 h-3" />
                            Em trânsito
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{renderFornecedorSelect(p)}</TableCell>
                      <TableCell className="text-center tabular-nums">
                        <span className="font-medium">{p.estoque_atual || 0}</span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="text-muted-foreground text-xs">{p.estoque_minimo || 0}</span>
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground">
                        {p.quantidade_pendente > 0 ? p.quantidade_pendente : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="font-semibold text-foreground">{disp.quantidade}</span>
                        <span className="text-muted-foreground text-xs ml-2">{disp.unidade}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </P38TableShell>

          <P38MobileLineList>
            {filteredProducts.map((p, index) => {
              const disp = sugestaoDisplay(p);
              return (
                <P38MobileLine
                  key={p.id}
                  striped={index % 2 === 1}
                  accent={p38AccentKeyFromTone(selectedItems[p.id] ? 'info' : 'muted')}
                  title={p.nome}
                  meta={
                    <>
                      <P38StatusLabel
                        tone={(p.estoque_atual || 0) <= (p.estoque_minimo || 0) ? 'warning' : 'success'}
                      >
                        Estoque
                      </P38StatusLabel>
                      <span>
                        {p.estoque_atual || 0}/{p.estoque_minimo || 0} mín
                      </span>
                      {p.quantidade_pendente > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Truck className="w-3 h-3 shrink-0" />
                          {p.quantidade_pendente} em trânsito
                        </span>
                      )}
                      <div className="w-full mt-1" onClick={(e) => e.stopPropagation()}>
                        {renderFornecedorSelect(
                          p,
                          'h-9 w-full max-w-[14rem] rounded-lg border-0 bg-muted/40 text-sm',
                        )}
                      </div>
                    </>
                  }
                  value={disp.quantidade}
                  valueSub={disp.unidade}
                  trailing={
                    <Checkbox
                      checked={!!selectedItems[p.id]}
                      onCheckedChange={(c) =>
                        setSelectedItems((prev) =>
                          c ? { ...prev, [p.id]: true } : { ...prev, [p.id]: undefined },
                        )
                      }
                      className="shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                  }
                />
              );
            })}
          </P38MobileLineList>
        </>
      )}
    </div>
  );
}
