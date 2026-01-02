import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, RefreshCw, Lightbulb, AlertCircle, CheckCircle, FileText, FilterX, Truck, Search, Filter, Settings2, Package, Info, X, Tag } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast"
import { getTenantId } from '@/components/utils/tenant';
import { debounce } from 'lodash';

export default function SugestaoCompra() {
  const [sugestoes, setSugestoes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState({});
  const [hidePending, setHidePending] = useState(false);
  
  // Filtros e Configurações
  const [filterTerm, setFilterTerm] = useState('');
  const [debouncedFilterTerm, setDebouncedFilterTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [filterTags, setFilterTags] = useState([]);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [roundingMode, setRoundingMode] = useState('auto'); // auto, up, down, none
  
  const { toast } = useToast();

  // Debounce para busca de texto
  const debouncedSearch = useCallback(
    debounce((value) => {
      setDebouncedFilterTerm(value);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(filterTerm);
    return () => debouncedSearch.cancel();
  }, [filterTerm, debouncedSearch]);

  const handleRefresh = async () => {
  setIsLoading(true);
  try {
      const tenantId = getTenantId();
      // Buscar Produtos, Fornecedores, Categorias e Pedidos em Aberto
      const [produtos, fornecedorData, categoriasData, pedidosAbertos] = await Promise.all([
          base44.entities.Produto.filter({ empresa_id: tenantId, tipo: 'Produto', ativo: true }),
          base44.entities.Terceiro.filter({ empresa_id: tenantId }),
          base44.entities.Categoria.filter({ empresa_id: tenantId }),
          base44.entities.PedidoCompra.filter({ 
            empresa_id: tenantId,
            status: ['Enviado', 'Aguardando Recepção', 'Aguardando Embarque', 'Recebido Parcialmente'] 
          })
      ]);
      
      const fornecedorMap = fornecedorData.reduce((acc, f) => {
          acc[f.id] = f.nome;
          return acc;
      }, {});
      setFornecedores(fornecedorData);
      setCategorias(categoriasData);

      // Extrair todas as tags únicas dos produtos
      const tagsSet = new Set();
      produtos.forEach(p => {
        if (p.tags && Array.isArray(p.tags)) {
          p.tags.forEach(tag => tagsSet.add(tag));
        }
      });
      setAllTags([...tagsSet].sort());

      // Calcular quantidades pendentes por produto
      const qtdPendenteMap = {};
      pedidosAbertos.forEach(pedido => {
        pedido.itens?.forEach(item => {
          qtdPendenteMap[item.produto_id] = (qtdPendenteMap[item.produto_id] || 0) + (item.quantidade || 0);
        });
      });

      const sugestoesGeradas = produtos
        .filter(p => {
          const estoqueAtual = p.estoque_atual || 0;
          const estoqueMinimo = p.estoque_minimo || 0;
          const estoqueIdeal = p.estoque_ideal || 0;
          const estoqueMaximo = p.estoque_maximo || 0;
          
          // Inclui se: estoque abaixo do mínimo OU (estoque zerado E tem algum parâmetro de estoque definido)
          return estoqueAtual < estoqueMinimo || 
                 (estoqueAtual === 0 && (estoqueMinimo > 0 || estoqueIdeal > 0 || estoqueMaximo > 0));
        })
        .map(p => {
          // Lógica de Sugestão Aprimorada:
          let estoqueAlvo = p.estoque_ideal || p.estoque_maximo || 0;
          
          // Se não tem alvo definido, usa mínimo * 2 ou um padrão
          if (estoqueAlvo === 0) {
            if ((p.estoque_minimo || 0) > 0) {
              estoqueAlvo = p.estoque_minimo * 2;
            } else {
              // Produto sem parâmetros: sugere 10 unidades ou 1 pacote
              estoqueAlvo = Math.max(10, p.unidades_por_pacote || 1);
            }
          }

          let necessidade = estoqueAlvo - (p.estoque_atual || 0);

          // Garante mínimo de 1 unidade ou 1 pacote
          if (necessidade <= 0) {
            necessidade = p.unidades_por_pacote || 1;
          }

          if (necessidade <= 0) return null;

          // Ajuste para tamanho do pacote de compra (ex: caixa com 12)
          const fator = p.unidades_por_pacote || 1;
          let quantidadeSugerida = necessidade;

          if (fator > 1) {
             if (roundingMode === 'up') {
                quantidadeSugerida = Math.ceil(necessidade / fator) * fator;
             } else if (roundingMode === 'down') {
                quantidadeSugerida = Math.floor(necessidade / fator) * fator;
                if (quantidadeSugerida === 0 && necessidade > 0) quantidadeSugerida = fator; // Mínimo 1 pacote se precisar
             } else if (roundingMode === 'none') {
                quantidadeSugerida = necessidade;
             } else {
                // Auto / Nearest
                quantidadeSugerida = Math.round(necessidade / fator) * fator;
                if (quantidadeSugerida === 0) quantidadeSugerida = fator;
             }
          }

          return {
            produto_id: p.id,
            produto_nome: p.nome,
            categoria_id: p.categoria_id,
            fornecedor_padrao_id: p.fornecedor_padrao_id,
            fornecedor_selecionado_id: p.fornecedor_padrao_id, // Inicialmente o padrão, mas editável
            fornecedor_nome: fornecedorMap[p.fornecedor_padrao_id] || 'Não definido',
            estoque_atual: p.estoque_atual,
            estoque_minimo: p.estoque_minimo,
            estoque_ideal: p.estoque_ideal,
            quantidade_sugerida: quantidadeSugerida,
            quantidade_pendente: qtdPendenteMap[p.id] || 0, // Quantidade já comprada aguardando chegada
            unidade_compra: p.unidade_compra,
            custo_unitario: p.preco_custo_calculado,
            tags: p.tags || []
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.produto_nome.localeCompare(b.produto_nome)); // Ordenar alfabeticamente

      setSugestoes(sugestoesGeradas);
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast({
        title: "Erro ao carregar sugestões",
        description: "Não foi possível carregar as sugestões de compra.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, [roundingMode]); // Recalcular quando mudar o modo de arredondamento

  const handleSelectItem = (id, checked) => {
    setSelectedItems(prev => {
        const newSelection = {...prev};
        if(checked) {
            newSelection[id] = true;
        } else {
            delete newSelection[id];
        }
        return newSelection;
    });
  }

  // Funções de edição (Quantidade e Fornecedor)
  const handleUpdateQuantidade = (produtoId, novaQtd) => {
    setSugestoes(prev => prev.map(s => 
      s.produto_id === produtoId ? { ...s, quantidade_sugerida: parseFloat(novaQtd) || 0 } : s
    ));
  };

  const handleUpdateFornecedor = (produtoId, fornecedorId) => {
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    setSugestoes(prev => prev.map(s => 
      s.produto_id === produtoId ? { 
        ...s, 
        fornecedor_selecionado_id: fornecedorId,
        fornecedor_nome: fornecedor?.nome || s.fornecedor_nome 
      } : s
    ));
  };

  const handleRemovePending = () => {
    setSugestoes(prev => prev.filter(s => s.quantidade_pendente === 0));
    toast({ title: "Lista filtrada", description: "Itens com pedidos pendentes foram removidos da visualização." });
  };

  const itensSelecionados = useMemo(() => {
      return sugestoes.filter(s => selectedItems[s.produto_id]);
  }, [sugestoes, selectedItems]);
  
  const handleGerarPedidos = async () => {
      if (itensSelecionados.length === 0) return;

      const itensSemFornecedor = itensSelecionados.filter(item => !item.fornecedor_selecionado_id);
      if (itensSemFornecedor.length > 0) {
          toast({ 
            title: "Produtos sem fornecedor", 
            description: `${itensSemFornecedor.length} produto(s) selecionado(s) não possuem fornecedor selecionado.`,
            variant: "destructive" 
          });
          return;
      }

      const pedidosPorFornecedor = itensSelecionados.reduce((acc, item) => {
          const fornecedorId = item.fornecedor_selecionado_id;
          const fornecedor = fornecedores.find(f => f.id === fornecedorId);

          if(!acc[fornecedorId]) {
              acc[fornecedorId] = {
                  fornecedor_id: fornecedorId,
                  fornecedor_nome: fornecedor?.nome || item.fornecedor_nome,
                  itens: []
              };
          }
          acc[fornecedorId].itens.push({
              produto_id: item.produto_id,
              produto_nome: item.produto_nome,
              quantidade: item.quantidade_sugerida,
              custo_unitario: item.custo_unitario || 0,
              total: (item.quantidade_sugerida * (item.custo_unitario || 0))
          });
          return acc;
      }, {});

      try {
        const tenantId = getTenantId();
        const allPOs = await base44.entities.PedidoCompra.filter({ empresa_id: tenantId });
        let nextNumber = (allPOs.length > 0 ? Math.max(...allPOs.map(p => parseInt(p.numero?.split('-')[1] || 0))) : 0) + 1;
        
        const promises = Object.values(pedidosPorFornecedor).map(pedidoData => {
            const valor_total = pedidoData.itens.reduce((sum, item) => sum + item.total, 0);
            const po = {
                ...pedidoData,
                empresa_id: tenantId,
                numero: `PC-${String(nextNumber++).padStart(5, '0')}`,
                status: 'Rascunho',
                valor_total: valor_total,
            };
            return base44.entities.PedidoCompra.create(po);
        });

        await Promise.all(promises);

        toast({
            title: "✓ Pedidos Gerados!",
            description: `${promises.length} pedido(s) criados em Rascunho.`,
            className: "bg-green-100 text-green-800"
        });

        setSelectedItems({});
        handleRefresh();
      } catch (error) {
          console.error("Error generating purchase orders:", error);
          toast({ title: "Erro", description: error.message, variant: "destructive" });
      }
  }

  const handleEnviarCotacao = async () => {
    if (itensSelecionados.length === 0) return;

    try {
        const tenantId = getTenantId();
        const allCots = await base44.entities.Cotacao.filter({ empresa_id: tenantId });
        let nextNumber = (allCots.length > 0 ? Math.max(...allCots.map(c => parseInt(c.numero?.split('-')[1] || 0))) : 0) + 1;

        // Usa o fornecedor selecionado na tabela, não necessariamente o padrão
        const fornecedoresIds = [...new Set(itensSelecionados.map(i => i.fornecedor_selecionado_id).filter(Boolean))];
        const fornecedoresConvidados = fornecedoresIds.map(id => {
            const f = fornecedores.find(forn => forn.id === id);
            return {
                fornecedor_id: id,
                fornecedor_nome: f?.nome || 'Unknown',
                status_envio: 'Pendente'
            };
        });

        const novaCotacao = {
            empresa_id: tenantId,
            numero: `COT-${String(nextNumber++).padStart(5, '0')}`,
            titulo: `Cotação Automática - ${new Date().toLocaleDateString()}`,
            status: 'Rascunho',
            data_abertura: new Date().toISOString().split('T')[0],
            itens: itensSelecionados.map(item => ({
                produto_id: item.produto_id,
                produto_nome: item.produto_nome,
                quantidade: item.quantidade_sugerida,
                unidade: item.unidade_compra || 'UN'
            })),
            fornecedores: fornecedoresConvidados
        };

        await base44.entities.Cotacao.create(novaCotacao);

        toast({
            title: "✓ Cotação Criada!",
            description: `Cotação ${novaCotacao.numero} criada com sucesso.`,
            className: "bg-blue-100 text-blue-800"
        });

        setSelectedItems({});
    } catch (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const produtosSemFornecedor = sugestoes.filter(s => !s.fornecedor_selecionado_id);
  
  // Aplicar filtros
  const sugestoesVisiveis = sugestoes.filter(s => {
     const matchesPending = hidePending ? s.quantidade_pendente === 0 : true;
     const matchesTerm = debouncedFilterTerm ? s.produto_nome.toLowerCase().includes(debouncedFilterTerm.toLowerCase()) : true;
     const matchesCategory = filterCategory === 'all' || s.categoria_id === filterCategory;
     const matchesSupplier = filterSupplier === 'all' || s.fornecedor_padrao_id === filterSupplier || s.fornecedor_selecionado_id === filterSupplier;
     
     // Filtro de tags: produto deve ter todas as tags selecionadas
     const matchesTags = filterTags.length === 0 || filterTags.every(tag => 
       s.tags && s.tags.includes(tag)
     );

     return matchesPending && matchesTerm && matchesCategory && matchesSupplier && matchesTags;
  });

  const selectableItems = sugestoesVisiveis; // Agora permite selecionar mesmo sem fornecedor (usuário pode atribuir depois)
  const selectedSelectableItems = itensSelecionados.filter(s => sugestoesVisiveis.some(v => v.produto_id === s.produto_id));
  const masterCheckboxChecked = selectableItems.length > 0 && selectableItems.every(s => selectedItems[s.produto_id]);

  return (
    <div className="space-y-5 md:space-y-6 -mx-2 md:mx-0">
      <div className="flex flex-col gap-3 pb-4 border-b border-gray-200 dark:border-gray-700 px-2 md:px-0">
        <div>
          <h3 className="text-base md:text-lg font-light text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-400" />
            Sugestões de Compra
          </h3>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-light">
            Reposição baseada em estoque mínimo
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline"
            size="sm"
            className="gap-1.5 border-gray-300 text-gray-600 hover:bg-gray-50 flex-1 sm:flex-none h-9"
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-xs">Atualizar</span>
          </Button>
          <div className="hidden md:flex gap-2">
            <Button 
              onClick={handleEnviarCotacao}
              disabled={itensSelecionados.length === 0}
              variant="outline"
              size="sm"
              className="gap-1.5 border-gray-300 text-gray-700"
            >
              <FileText className="w-3.5 h-3.5" />
              Cotação
            </Button>
            <Button 
              onClick={handleGerarPedidos}
              disabled={itensSelecionados.length === 0}
              size="sm"
              className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-normal"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Gerar ({itensSelecionados.length})
            </Button>
          </div>
        </div>
        </div>

        {/* Barra de Controles Otimizada (Filtros + Ferramentas) */}
        <div className="flex flex-col gap-3 px-2 md:px-0">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
            {/* Busca */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Buscar produto..." 
                value={filterTerm}
                onChange={(e) => setFilterTerm(e.target.value)}
                className="pl-9 bg-white dark:bg-gray-900 border-0 h-10"
              />
            </div>

            {/* Seletor de Tags */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-500 uppercase">Filtrar por Tags</span>
              </div>
              
              {/* Tags selecionadas */}
              {filterTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {filterTags.map(tag => (
                    <Badge 
                      key={tag} 
                      variant="secondary"
                      className="bg-gray-700 dark:bg-gray-600 text-white text-xs px-2 py-1 flex items-center gap-1"
                    >
                      {tag}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-gray-300" 
                        onClick={() => setFilterTags(filterTags.filter(t => t !== tag))}
                      />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Input de busca de tags */}
              <div className="relative">
                <Input 
                  placeholder="Buscar e adicionar tag..."
                  value={tagSearchTerm}
                  onChange={(e) => setTagSearchTerm(e.target.value)}
                  className="bg-white dark:bg-gray-900 border-0 h-9 text-sm"
                />
                {tagSearchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-40 overflow-y-auto z-10">
                    {allTags
                      .filter(tag => 
                        tag.toLowerCase().includes(tagSearchTerm.toLowerCase()) && 
                        !filterTags.includes(tag)
                      )
                      .slice(0, 10)
                      .map(tag => (
                        <button
                          key={tag}
                          onClick={() => {
                            setFilterTags([...filterTags, tag]);
                            setTagSearchTerm('');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-200"
                        >
                          {tag}
                        </button>
                      ))}
                    {allTags.filter(tag => 
                      tag.toLowerCase().includes(tagSearchTerm.toLowerCase()) && 
                      !filterTags.includes(tag)
                    ).length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-400">Nenhuma tag encontrada</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Filtros em linha compacta */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="bg-white dark:bg-gray-900 border-0 h-9 text-xs">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categorias.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                <SelectTrigger className="bg-white dark:bg-gray-900 border-0 h-9 text-xs">
                  <SelectValue placeholder="Fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {fornecedores.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Controles adicionais */}
            <div className="flex items-center justify-between gap-2">
              <Button 
                onClick={() => setHidePending(!hidePending)}
                variant="ghost"
                size="sm"
                className={`h-8 text-xs ${hidePending ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500'}`}
              >
                <FilterX className="w-3.5 h-3.5 mr-1.5" />
                {hidePending ? 'Mostrar' : 'Ocultar'} Pendentes
              </Button>

              <Select value={roundingMode} onValueChange={setRoundingMode}>
                <SelectTrigger className="bg-white dark:bg-gray-900 border-0 h-8 text-xs w-[140px]">
                  <Package className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automático</SelectItem>
                  <SelectItem value="up">Arred. Cima</SelectItem>
                  <SelectItem value="down">Arred. Baixo</SelectItem>
                  <SelectItem value="none">Exato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

      {produtosSemFornecedor.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 flex items-start gap-3 mx-2 md:mx-0">
          <div className="w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-500 mt-1.5 flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm">
              {produtosSemFornecedor.length} produtos sem fornecedor
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Atribua um fornecedor para prosseguir com o pedido.
            </p>
          </div>
        </div>
      )}

      {sugestoes.length === 0 && !isLoading ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl mx-2 md:mx-0 shadow-sm">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400 font-light">Estoque saudável. Nenhuma sugestão no momento.</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-800">
                <TableRow className="border-gray-100 dark:border-gray-700">
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={masterCheckboxChecked}
                      onCheckedChange={(checked) => {
                          const allIds = {};
                          if(checked) {
                              selectableItems.forEach(s => allIds[s.produto_id] = true);
                          }
                          setSelectedItems(allIds);
                      }}
                      disabled={selectableItems.length === 0}
                    />
                  </TableHead>
                  <TableHead className="font-normal text-gray-500">Produto</TableHead>
                  <TableHead className="font-normal text-gray-500 w-[200px]">Fornecedor</TableHead>
                  <TableHead className="font-normal text-gray-500 text-center">Estoque</TableHead>
                  <TableHead className="font-normal text-gray-500 text-center">Em Pedido</TableHead>
                  <TableHead className="font-normal text-gray-500 text-right">Qtd. Sugerida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan="6" className="h-24 text-center text-gray-400">Carregando...</TableCell>
                  </TableRow>
                ) : (
                  sugestoesVisiveis.map(s => {
                    const temPendente = s.quantidade_pendente > 0;
                    
                    return (
                      <TableRow 
                        key={s.produto_id} 
                        className={`border-gray-100 dark:border-gray-800 hover:bg-gray-50/50`}
                      >
                        <TableCell>
                            <Checkbox 
                                checked={!!selectedItems[s.produto_id]} 
                                onCheckedChange={(checked) => handleSelectItem(s.produto_id, checked)}
                            />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-700 dark:text-gray-200">{s.produto_nome}</div>
                          {temPendente && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                               <Truck className="w-3 h-3" />
                               <span>Já existe pedido em andamento</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                           <Select 
                              value={s.fornecedor_selecionado_id || "none"} 
                              onValueChange={(v) => handleUpdateFornecedor(s.produto_id, v)}
                           >
                              <SelectTrigger className="h-8 text-xs border-transparent hover:border-gray-300 bg-transparent">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {fornecedores.map(f => (
                                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                                ))}
                              </SelectContent>
                           </Select>
                        </TableCell>
                        <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                                <div>
                                    <span className="text-gray-900 font-medium">{s.estoque_atual}</span>
                                    <span className="text-gray-400 text-xs mx-1">/</span>
                                    <span className="text-gray-500 text-xs">{s.estoque_minimo}</span>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="text-center">
                            {s.quantidade_pendente > 0 ? (
                                <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 font-normal">
                                    {s.quantidade_pendente} {s.unidade_compra}
                                </Badge>
                            ) : (
                                <span className="text-gray-300">-</span>
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                <Input 
                                    type="number" 
                                    className="h-8 w-20 text-right font-bold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                                    value={s.quantidade_sugerida}
                                    onChange={(e) => handleUpdateQuantidade(s.produto_id, e.target.value)}
                                />
                                <span className="text-gray-400 text-xs w-8 text-left">{s.unidade_compra}</span>
                            </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-5 pb-20 px-2">
             {sugestoesVisiveis.map(s => {
                const isSelected = !!selectedItems[s.produto_id];
                const temPendente = s.quantidade_pendente > 0;

                return (
                  <div 
                    key={s.produto_id}
                    className={`p-4 rounded-xl transition-all ${
                      isSelected 
                        ? 'bg-white dark:bg-gray-800 shadow-md' 
                        : 'bg-white dark:bg-gray-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <Checkbox 
                        checked={isSelected}
                        className="mt-1"
                        onCheckedChange={(checked) => handleSelectItem(s.produto_id, checked)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2" onClick={() => handleSelectItem(s.produto_id, !isSelected)}>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate pr-2">{s.produto_nome}</h4>
                          <div className="flex flex-col items-end flex-shrink-0">
                             <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{s.quantidade_sugerida}</span>
                             <span className="text-xs text-gray-400">{s.unidade_compra}</span>
                          </div>
                        </div>
                         {temPendente && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-lg w-fit">
                               <Truck className="w-3.5 h-3.5" />
                               <span>{s.quantidade_pendente} em trânsito</span>
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-50 dark:border-gray-800">
                       <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2">Estoque Atual</p>
                          <div className="text-sm">
                            <span className="text-gray-900 dark:text-gray-100 font-medium">{s.estoque_atual}</span>
                            <span className="text-gray-400 mx-1.5">/</span>
                            <span className="text-gray-600 dark:text-gray-300">{s.estoque_minimo} mín</span>
                          </div>
                       </div>
                       <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2">Fornecedor</p>
                          <Select 
                              value={s.fornecedor_selecionado_id || "none"} 
                              onValueChange={(v) => handleUpdateFornecedor(s.produto_id, v)}
                          >
                              <SelectTrigger className="h-10 w-full bg-gray-50 dark:bg-gray-900 border-0 shadow-sm">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {fornecedores.map(f => (
                                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                                ))}
                              </SelectContent>
                          </Select>
                       </div>
                    </div>
                  </div>
                );
             })}
          </div>
        </>
      )}
    </div>
  );
}