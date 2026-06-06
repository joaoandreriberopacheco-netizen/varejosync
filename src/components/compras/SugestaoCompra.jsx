import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import SearchableFilterSelect from '@/components/compras/SearchableFilterSelect';
import { ShoppingCart, RefreshCw, Lightbulb, CheckCircle, FileText, FilterX, Truck, Search, Package, X, SlidersHorizontal } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { dataHoje } from '@/components/utils/dateUtils';
import { resolveCommercialDisplay } from '@/lib/productUnits';
import { P38MobileLine, P38MobileLineList, P38StatusLabel, p38AccentKeyFromTone } from '@/components/ui/p38-mobile-line';

export default function SugestaoCompra() {
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
  const [showFilters, setShowFilters] = useState(false);
  
  const { toast } = useToast();

  const allTags = useMemo(() => {
    const tags = new Set();
    produtos.forEach(p => p.tags?.forEach(t => tags.add(t)));
    return [...tags].sort();
  }, [produtos]);

  const calcQuantity = (produto) => {
    const target = produto.estoque_ideal || produto.estoque_maximo || 
                   (produto.estoque_minimo > 0 ? produto.estoque_minimo * 2 : 10);
    const need = Math.max(target - (produto.estoque_atual || 0), produto.unidades_por_pacote || 1);
    const pack = produto.unidades_por_pacote || 1;
    
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
    return resolveCommercialDisplay(produto, qBase, produto.unidade_principal || 'UN');
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prods, forn, cats, pedidos] = await Promise.all([
        base44.entities.Produto.filter({ tipo: 'Produto', ativo: true }),
        base44.entities.Terceiro.list(),
        base44.entities.Categoria.list(),
        base44.entities.PedidoCompra.filter({ 
          status: ['Enviado', 'Aguardando Recepção', 'Aguardando Embarque', 'Recebido Parcialmente'] 
        })
      ]);

      const pending = {};
      pedidos.forEach(p => {
        p.itens?.forEach(i => {
          pending[i.produto_id] = (pending[i.produto_id] || 0) + (i.quantidade || 0);
        });
      });

      const filtered = prods.filter(p => {
        const ea = p.estoque_atual || 0;
        const em = p.estoque_minimo || 0;
        return ea < em || (ea === 0 && (em > 0 || p.estoque_ideal > 0 || p.estoque_maximo > 0));
      }).map(p => ({
        ...p,
        quantidade_pendente: pending[p.id] || 0
      })).sort((a, b) => a.nome.localeCompare(b.nome));

      setProdutos(filtered);
      setFornecedores(forn);
      setCategorias(cats);
    } catch (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredProducts = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return produtos.filter(p => {
      if (hidePending && p.quantidade_pendente > 0) return false;
      if (s && !p.nome.toLowerCase().includes(s)) return false;
      if (categoryFilter !== 'all' && p.categoria_id !== categoryFilter) return false;
      if (supplierFilter !== 'all' && p.fornecedor_padrao_id !== supplierFilter) return false;
      if (selectedTags.length > 0 && !selectedTags.every(t => p.tags?.includes(t))) return false;
      return true;
    });
  }, [produtos, searchTerm, categoryFilter, supplierFilter, selectedTags, hidePending]);

  const selectedCount = Object.keys(selectedItems).length;

  const handleSelectAll = (checked) => {
    if (checked) {
      const all = {};
      filteredProducts.forEach(p => all[p.id] = true);
      setSelectedItems(all);
    } else {
      setSelectedItems({});
    }
  };

  const handleGenerate = async () => {
    const selected = filteredProducts.filter(p => selectedItems[p.id]);
    if (selected.length === 0) return;

    const noSupplier = selected.filter(p => !fornecedorPorProduto[p.id] && !p.fornecedor_padrao_id);
    if (noSupplier.length > 0) {
      toast({ title: "Produtos sem fornecedor", description: `${noSupplier.length} produto(s) sem fornecedor`, variant: "destructive" });
      return;
    }

    const bySupplier = {};
    selected.forEach(p => {
      const sid = fornecedorPorProduto[p.id] || p.fornecedor_padrao_id;
      const supplier = fornecedores.find(f => f.id === sid);
      if (!bySupplier[sid]) {
        bySupplier[sid] = { fornecedor_id: sid, fornecedor_nome: supplier?.nome || 'N/A', itens: [] };
      }
      const qBase = calcQuantity(p);
      const disp = resolveCommercialDisplay(p, qBase, p.unidade_principal || 'UN');
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
      let num = (all.length > 0 ? Math.max(...all.map(x => parseInt(x.numero?.split('-')[1] || 0))) : 0) + 1;

      await Promise.all(Object.values(bySupplier).map(data => {
        const total = data.itens.reduce((sum, i) => sum + i.total, 0);
        return base44.entities.PedidoCompra.create({
          ...data,
          numero: `PC-${String(num++).padStart(5, '0')}`,
          status: 'Rascunho',
          valor_total: total
        });
      }));

      toast({ title: "✓ Pedidos Gerados!", description: `${Object.keys(bySupplier).length} pedido(s) criados`, className: "bg-green-100 text-green-800" });
      setSelectedItems({});
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleQuote = async () => {
    const selected = filteredProducts.filter(p => selectedItems[p.id]);
    if (selected.length === 0) return;

    try {
      const all = await base44.entities.Cotacao.list();
      const num = (all.length > 0 ? Math.max(...all.map(c => parseInt(c.numero?.split('-')[1] || 0))) : 0) + 1;

      const suppliers = [...new Set(selected.map(p => fornecedorPorProduto[p.id] || p.fornecedor_padrao_id).filter(Boolean))];
      
      await base44.entities.Cotacao.create({
        numero: `COT-${String(num).padStart(5, '0')}`,
        titulo: `Cotação - ${new Date().toLocaleDateString()}`,
        status: 'Rascunho',
        data_abertura: dataHoje(),
        itens: selected.map((p) => {
          const qBase = calcQuantity(p);
          const disp = resolveCommercialDisplay(p, qBase, p.unidade_principal || 'UN');
          return {
            produto_id: p.id,
            produto_nome: p.nome,
            quantidade: disp.quantidade,
            unidade: disp.unidade,
            quantidade_base: qBase,
            fator_conversao: disp.fator_conversao,
          };
        }),
        fornecedores: suppliers.map(id => {
          const f = fornecedores.find(x => x.id === id);
          return { fornecedor_id: id, fornecedor_nome: f?.nome || 'N/A', status_envio: 'Pendente' };
        })
      });

      toast({ title: "✓ Cotação Criada!", className: "bg-blue-100 text-blue-800" });
      setSelectedItems({});
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const activeFiltersCount = [
    categoryFilter !== 'all',
    supplierFilter !== 'all',
    selectedTags.length > 0,
    hidePending,
    roundingMode !== 'auto'
  ].filter(Boolean).length;

  const filtersPanel = (
    <div className="space-y-3">
      <SearchableFilterSelect
        value={categoryFilter}
        onChange={setCategoryFilter}
        placeholder="Todas Categorias"
        searchPlaceholder="Buscar categoria..."
        options={[
          { value: 'all', label: 'Todas Categorias' },
          ...categorias.map(c => ({ value: c.id, label: c.nome }))
        ]}
      />

      <SearchableFilterSelect
        value={supplierFilter}
        onChange={setSupplierFilter}
        placeholder="Todos Fornecedores"
        searchPlaceholder="Buscar fornecedor..."
        options={[
          { value: 'all', label: 'Todos Fornecedores' },
          ...fornecedores.map(f => ({ value: f.id, label: f.nome }))
        ]}
      />

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map(tag => (
            <Badge key={tag} className="bg-primary text-white px-2 py-1 flex items-center gap-1 rounded-lg">
              {tag}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))} />
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Input 
          placeholder="Buscar tag..."
          value={tagSearch}
          onChange={(e) => setTagSearch(e.target.value)}
          className="bg-muted border-0 h-12 rounded-xl"
        />
        {tagSearch && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl shadow-lg border border-border/40 max-h-40 overflow-y-auto z-10">
            {allTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()) && !selectedTags.includes(t)).slice(0, 10).map(tag => (
              <button
                key={tag}
                onClick={() => { setSelectedTags([...selectedTags, tag]); setTagSearch(''); }}
                className="w-full text-left px-3 py-2 hover:bg-muted/40 dark:hover:bg-muted text-sm"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <Button onClick={() => setHidePending(!hidePending)} variant="outline" className="w-full h-12 justify-start border-0 bg-muted rounded-xl">
        <FilterX className="w-4 h-4 mr-2" />
        {hidePending ? 'Mostrar' : 'Ocultar'} Pendentes
      </Button>

      <div className="bg-muted p-4 rounded-2xl">
        <div className="flex items-center gap-3 mb-3">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Otimização de Pacotes</span>
        </div>
        <Select value={roundingMode} onValueChange={setRoundingMode}>
          <SelectTrigger className="h-12 bg-card border-0 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Automático (Mais Próximo)</SelectItem>
            <SelectItem value="up">Arredondar p/ Cima</SelectItem>
            <SelectItem value="down">Arredondar p/ Baixo</SelectItem>
            <SelectItem value="none">Quantidade Exata</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="ghost"
        className="w-full h-11 rounded-xl text-muted-foreground"
        onClick={() => {
          setCategoryFilter('all');
          setSupplierFilter('all');
          setSelectedTags([]);
          setTagSearch('');
          setHidePending(false);
          setRoundingMode('auto');
        }}
      >
        Limpar filtros
      </Button>
    </div>
  );

  return (
    <div className="space-y-4 -mx-2 md:mx-0">
      <div className="px-2 md:px-0">
        <div className="rounded-[28px] bg-primary dark:bg-card/95 text-white p-4 md:p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg md:text-xl font-semibold font-glacial flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-muted-foreground" />
                Sugestões de Compra
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Reposição baseada em estoque mínimo</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button onClick={loadData} variant="ghost" size="icon" className="h-11 w-11 rounded-2xl bg-card hover:bg-muted text-white border-0">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={() => setShowFilters(true)} variant="ghost" size="icon" className="h-11 w-11 rounded-2xl bg-card hover:bg-muted text-white border-0 relative">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-card text-foreground text-[10px] font-bold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar produto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-card text-white placeholder:text-muted-foreground border-0 h-12 rounded-2xl"
            />
          </div>

          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{filteredProducts.length} item(ns)</span>
            <span>{selectedCount} selecionado(s)</span>
          </div>

          <div className="grid grid-cols-2 md:flex gap-2">
            <Button onClick={handleQuote} disabled={selectedCount === 0} variant="outline" size="sm" className="gap-1.5 h-11 rounded-2xl border-border/40 bg-card text-white hover:bg-muted">
              <FileText className="w-3.5 h-3.5" />Cotação
            </Button>
            <Button onClick={handleGenerate} disabled={selectedCount === 0} size="sm" className="gap-1.5 h-11 rounded-2xl bg-card text-foreground hover:bg-muted">
              <ShoppingCart className="w-3.5 h-3.5" />Gerar ({selectedCount})
            </Button>
          </div>
        </div>
      </div>

      <Drawer open={showFilters} onOpenChange={setShowFilters}>
        <DrawerContent className="border-0 rounded-t-[28px] bg-card dark:bg-card px-4 pb-6">
          <DrawerHeader className="px-0 pb-2 text-left">
            <DrawerTitle className="font-glacial text-foreground">Filtros</DrawerTitle>
            <DrawerDescription>Refine as sugestões sem ocupar a tela principal.</DrawerDescription>
          </DrawerHeader>
          {filtersPanel}
        </DrawerContent>
      </Drawer>

      <div className="hidden lg:block px-2 lg:px-0">
        <div className="rounded-2xl bg-card p-4 shadow-sm">
          {filtersPanel}
        </div>
      </div>

      {produtos.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl mx-2 md:mx-0">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Estoque saudável. Nenhuma sugestão no momento.</p>
        </div>
      ) : (
        <div className="hidden lg:block rounded-xl min-w-0 overflow-x-auto bg-card shadow-sm">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b border-border/40">
                <th className="w-12 p-3 text-left">
                  <Checkbox checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedItems[p.id])} onCheckedChange={handleSelectAll} />
                </th>
                <th className="p-3 text-left text-xs font-normal text-muted-foreground">Produto</th>
                <th className="p-3 text-left text-xs font-normal text-muted-foreground w-48">Fornecedor</th>
                <th className="p-3 text-center text-xs font-normal text-muted-foreground">Estoque</th>
                <th className="p-3 text-center text-xs font-normal text-muted-foreground">Pendente</th>
                <th className="p-3 text-right text-xs font-normal text-muted-foreground">Qtd Sugerida</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => (
                <tr key={p.id} className="border-b border-border/40 hover:bg-muted/40/50">
                  <td className="p-3">
                    <Checkbox checked={!!selectedItems[p.id]} onCheckedChange={(c) => setSelectedItems(prev => c ? {...prev, [p.id]: true} : {...prev, [p.id]: undefined})} />
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-foreground/90">{p.nome}</div>
                    {p.quantidade_pendente > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Truck className="w-3 h-3" />Em andamento
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <select 
                      className="w-full h-8 text-xs bg-transparent border-0 hover:bg-muted/40 dark:hover:bg-muted rounded"
                      value={fornecedorPorProduto[p.id] || p.fornecedor_padrao_id || ''}
                      onChange={(e) => setFornecedorPorProduto({...fornecedorPorProduto, [p.id]: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-medium">{p.estoque_atual || 0}</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-muted-foreground text-xs">{p.estoque_minimo || 0}</span>
                  </td>
                  <td className="p-3 text-center">
                    {p.quantidade_pendente > 0 ? (
                      <Badge variant="outline" className="bg-muted/40 text-muted-foreground font-normal">{p.quantidade_pendente}</Badge>
                    ) : '-'}
                  </td>
                  <td className="p-3 text-right">
                    <span className="font-bold text-foreground/90">{sugestaoDisplay(p).quantidade}</span>
                    <span className="text-muted-foreground text-xs ml-2">{sugestaoDisplay(p).unidade}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <P38MobileLineList className="pb-20 px-0 mx-2">
        {filteredProducts.map((p, index) => (
          <P38MobileLine
            key={p.id}
            striped={index % 2 === 1}
            accent={p38AccentKeyFromTone(selectedItems[p.id] ? 'info' : 'muted')}
            title={p.nome}
            meta={
              <>
                <P38StatusLabel tone={(p.estoque_atual || 0) <= (p.estoque_minimo || 0) ? 'warning' : 'success'}>Estoque</P38StatusLabel>
                <span>
                  Estoque {p.estoque_atual || 0}/{p.estoque_minimo || 0} mín
                </span>
                {p.quantidade_pendente > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Truck className="w-3 h-3 shrink-0" />
                    {p.quantidade_pendente} em trânsito
                  </span>
                )}
                <select
                  className="w-full max-w-[14rem] h-9 bg-secondary/40 border-0 rounded text-sm mt-1"
                  value={fornecedorPorProduto[p.id] || p.fornecedor_padrao_id || ''}
                  onChange={(e) => setFornecedorPorProduto({ ...fornecedorPorProduto, [p.id]: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">Fornecedor...</option>
                  {fornecedores.map(f => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </>
            }
            value={sugestaoDisplay(p).quantidade}
            valueSub={sugestaoDisplay(p).unidade}
            trailing={
              <Checkbox
                checked={!!selectedItems[p.id]}
                onCheckedChange={(c) =>
                  setSelectedItems(prev =>
                    c ? { ...prev, [p.id]: true } : { ...prev, [p.id]: undefined }
                  )
                }
                className="shrink-0"
                onClick={(e) => e.stopPropagation()}
              />
            }
          />
        ))}
      </P38MobileLineList>
    </div>
  );
}