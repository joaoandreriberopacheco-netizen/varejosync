import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from "@/components/ui/use-toast";
import { FileText, Plus, Trophy, CheckCircle, UploadCloud, AlertCircle, Camera, Trash2, Search, Minus } from 'lucide-react';
import { format } from 'date-fns';
import ImportadorCotacaoPDF from './ImportadorCotacaoPDF';
import ImportadorListaFoto from './ImportadorListaFoto';
import { dataHoje } from '@/components/utils/dateUtils';

export default function CotacoesManager() {
  const [cotacoes, setCotacoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCotacao, setSelectedCotacao] = useState(null);
  const [fornecedores, setFornecedores] = useState([]);
  const [isImportadorOpen, setIsImportadorOpen] = useState(false);
  const [isImportadorFotoOpen, setIsImportadorFotoOpen] = useState(false);
  const [isNovaCotacaoOpen, setIsNovaCotacaoOpen] = useState(false);
  const [novaCotacaoTitulo, setNovaCotacaoTitulo] = useState('');
  const [produtosCatalogo, setProdutosCatalogo] = useState([]);
  const [manualSearch, setManualSearch] = useState('');
  const [manualCart, setManualCart] = useState([]);
  const { toast } = useToast();

  const [precosInput, setPrecosInput] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cotacoesData, fornecedoresData] = await Promise.all([
        base44.entities.Cotacao.list('-created_date'),
        base44.entities.Terceiro.filter({ tipo: ['Fornecedor', 'Ambos'] })
      ]);
      setCotacoes(cotacoesData);
      setFornecedores(fornecedoresData);
      const produtosData = await base44.entities.Produto.filter({ tipo: 'Produto', ativo: true });
      setProdutosCatalogo(produtosData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePedido = async (cotacao) => {
    const itensVencedores = cotacao.respostas.filter(r => r.vencedor);
    
    if (itensVencedores.length === 0) {
      toast({ title: "Nenhum vencedor", description: "Selecione os itens vencedores antes de gerar pedido.", variant: "destructive" });
      return;
    }

    const itensPorFornecedor = {};
    itensVencedores.forEach(resp => {
      if (!itensPorFornecedor[resp.fornecedor_id]) {
        itensPorFornecedor[resp.fornecedor_id] = [];
      }
      const itemOriginal = cotacao.itens.find(i => i.produto_id === resp.produto_id);
      if (itemOriginal) {
        itensPorFornecedor[resp.fornecedor_id].push({
          produto_id: resp.produto_id,
          produto_nome: itemOriginal.produto_nome,
          quantidade: resp.quantidade_ofertada || itemOriginal.quantidade,
          custo_unitario: resp.preco_unitario,
          total: (resp.quantidade_ofertada || itemOriginal.quantidade) * resp.preco_unitario
        });
      }
    });

    try {
      const allPOs = await base44.entities.PedidoCompra.list();
      let nextNumber = (allPOs.length > 0 ? Math.max(...allPOs.map(p => parseInt(p.numero?.split('-')[1] || 0))) : 0) + 1;

      for (const fornecedorId in itensPorFornecedor) {
        const itens = itensPorFornecedor[fornecedorId];
        const fornecedor = fornecedores.find(f => f.id === fornecedorId);
        const total = itens.reduce((sum, i) => sum + i.total, 0);

        await base44.entities.PedidoCompra.create({
          numero: `PC-${String(nextNumber++).padStart(5, '0')}`,
          fornecedor_id: fornecedorId,
          fornecedor_nome: fornecedor?.nome || 'Desconhecido',
          status: 'Rascunho',
          itens: itens,
          valor_total: total,
          observacoes: `Gerado a partir da Cotação ${cotacao.numero}`
        });
      }

      await base44.entities.Cotacao.update(cotacao.id, { status: 'Finalizada' });
      toast({ title: "Sucesso", description: "Pedidos de compra gerados com sucesso!", className: "bg-green-100 text-green-800" });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdatePreco = (fornecedorId, produtoId, valor) => {
    setPrecosInput(prev => ({
      ...prev,
      [`${fornecedorId}_${produtoId}`]: valor
    }));
  };

  const filteredManualProducts = useMemo(() => {
    const query = manualSearch.trim().toLowerCase();
    if (!query) return [];
    return produtosCatalogo
      .filter((produto) => {
        const searchText = [
          produto.nome,
          produto.codigo_interno,
          produto.codigo_barras,
          produto.marca
        ].filter(Boolean).join(' ').toLowerCase();
        return query.split(/\s+/).every((word) => searchText.includes(word));
      })
      .slice(0, 20);
  }, [manualSearch, produtosCatalogo]);

  const handleOpenAnaliseCotacao = (cotacao) => {
    setSelectedCotacao(cotacao);
    const inputs = {};
    cotacao.respostas?.forEach(r => {
      inputs[`${r.fornecedor_id}_${r.produto_id}`] = r.preco_unitario;
    });
    setPrecosInput(inputs);
    setManualSearch('');
    setManualCart(
      (cotacao.itens || []).map((item) => ({
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        quantidade: item.quantidade || 1,
        unidade: item.unidade || 'UN'
      }))
    );
  };

  const handleAddManualProduct = (produto) => {
    setManualCart((prev) => {
      const index = prev.findIndex((item) => item.produto_id === produto.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = {
          ...next[index],
          quantidade: (parseFloat(next[index].quantidade) || 0) + 1
        };
        return next;
      }
      return [
        ...prev,
        {
          produto_id: produto.id,
          produto_nome: produto.nome,
          quantidade: 1,
          unidade: produto.unidade_principal || 'UN'
        }
      ];
    });
  };

  const handleManualQtyChange = (produtoId, nextValue) => {
    setManualCart((prev) => prev.map((item) => (
      item.produto_id === produtoId
        ? { ...item, quantidade: nextValue }
        : item
    )));
  };

  const handleRemoveManualItem = (produtoId) => {
    setManualCart((prev) => prev.filter((item) => item.produto_id !== produtoId));
  };

  const handleSaveManualItems = async () => {
    if (!selectedCotacao) return;
    const itensValidos = manualCart
      .map((item) => ({ ...item, quantidade: parseFloat(item.quantidade) || 0 }))
      .filter((item) => item.quantidade > 0);

    if (itensValidos.length === 0) {
      toast({ title: "Sem itens válidos", description: "Adicione pelo menos um item com quantidade.", variant: "destructive" });
      return;
    }

    await base44.entities.Cotacao.update(selectedCotacao.id, { itens: itensValidos });
    toast({ title: "Itens atualizados", className: "bg-green-100 text-green-800" });
    await loadData();
    const updated = await base44.entities.Cotacao.get(selectedCotacao.id);
    setSelectedCotacao(updated);
    setManualCart((updated.itens || []).map((item) => ({
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      quantidade: item.quantidade || 1,
      unidade: item.unidade || 'UN'
    })));
  };

  const handleDeleteCotacao = async (cotacao) => {
    const confirmDelete = window.confirm(`Excluir a cotação "${cotacao.titulo}"? Essa ação não pode ser desfeita.`);
    if (!confirmDelete) return;
    try {
      await base44.entities.Cotacao.delete(cotacao.id);
      toast({ title: "Cotação excluída", className: "bg-green-100 text-green-800" });
      if (selectedCotacao?.id === cotacao.id) {
        setSelectedCotacao(null);
      }
      loadData();
    } catch (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
  };

  const handleImportComplete = async (fornecedorId, respostasImportadas, descontoGlobal) => {
    // 1. Atualizar lista de fornecedores (caso tenha sido criado um novo)
    const fornecedoresAtualizados = await base44.entities.Terceiro.filter({ tipo: ['Fornecedor', 'Ambos'] });
    setFornecedores(fornecedoresAtualizados);

    // 2. Mesclar respostas
    // Primeiro, pegamos as respostas existentes que NÃO são deste fornecedor
    const outrasRespostas = selectedCotacao.respostas?.filter(r => r.fornecedor_id !== fornecedorId) || [];
    
    // Agora pegamos as respostas existentes DESTE fornecedor para manter marcas/obs se não forem sobrescritas (embora a importação traga tudo)
    // Na verdade, a importação deve prevalecer. Vamos combinar:
    // Se o item não veio na importação, mantemos o antigo? Não, geralmente PDF é o estado atual.
    // Mas vamos manter itens que o PDF não mencionou por segurança?
    // O Importador retorna apenas os itens que foram "match".
    
    const respostasAntigasDesteFornecedor = selectedCotacao.respostas?.filter(r => r.fornecedor_id === fornecedorId) || [];
    
    // Mesclagem inteligente:
    const novasRespostasDesteFornecedor = [...respostasImportadas];
    
    // Se quiser manter itens que o PDF ignorou, descomente abaixo. Mas melhor confiar na importação.
    // respostasAntigasDesteFornecedor.forEach(old => {
    //    if (!novasRespostasDesteFornecedor.find(n => n.produto_id === old.produto_id)) {
    //        novasRespostasDesteFornecedor.push(old);
    //    }
    // });

    const todasRespostas = [...outrasRespostas, ...novasRespostasDesteFornecedor];

    // Atualizar a Cotação
    await base44.entities.Cotacao.update(selectedCotacao.id, { 
        respostas: todasRespostas, 
        status: 'Em Análise',
        // Se quisermos adicionar o fornecedor à lista de convidados da cotação se ele não estiver lá:
        fornecedores: [
            ...(selectedCotacao.fornecedores?.filter(f => f.fornecedor_id !== fornecedorId) || []),
            {
                fornecedor_id: fornecedorId,
                fornecedor_nome: fornecedoresAtualizados.find(f => f.id === fornecedorId)?.nome || 'Novo',
                email: '',
                status_envio: 'Respondido'
            }
        ]
    });

    // Atualizar inputs locais e recarregar
    const inputs = { ...precosInput };
    novasRespostasDesteFornecedor.forEach(r => {
        inputs[`${r.fornecedor_id}_${r.produto_id}`] = r.preco_unitario;
    });
    setPrecosInput(inputs);
    
    loadData();
    const updated = await base44.entities.Cotacao.get(selectedCotacao.id);
    setSelectedCotacao(updated);

    if (descontoGlobal > 0) {
        toast({ title: "Desconto Global Aplicado", description: `O desconto de R$ ${descontoGlobal} foi rateado nos preços unitários.`, duration: 5000 });
    }
  };

  const handleSaveRespostas = async () => {
    if (!selectedCotacao) return;

    const novasRespostas = [];
    selectedCotacao.fornecedores.forEach(f => {
      selectedCotacao.itens.forEach(item => {
        const key = `${f.fornecedor_id}_${item.produto_id}`;
        const preco = parseFloat(precosInput[key]);
        if (!isNaN(preco) && preco > 0) {
          const respExistente = selectedCotacao.respostas?.find(r => r.fornecedor_id === f.fornecedor_id && r.produto_id === item.produto_id);
          novasRespostas.push({
            fornecedor_id: f.fornecedor_id,
            produto_id: item.produto_id,
            preco_unitario: preco,
            marca: respExistente?.marca || '',
            observacao: respExistente?.observacao || '',
            vencedor: respExistente?.vencedor || false
          });
        }
      });
    });

    await base44.entities.Cotacao.update(selectedCotacao.id, { respostas: novasRespostas, status: 'Em Análise' });
    toast({ title: "Preços atualizados", className: "bg-green-100 text-green-800" });
    loadData();
  };

  const toggleVencedor = async (cotacao, resposta) => {
    const novasRespostas = cotacao.respostas.map(r => {
      if (r.produto_id === resposta.produto_id) {
        if (r.fornecedor_id === resposta.fornecedor_id) {
          return { ...r, vencedor: !r.vencedor };
        } else {
          return { ...r, vencedor: false };
        }
      }
      return r;
    });
    
    await base44.entities.Cotacao.update(cotacao.id, { respostas: novasRespostas });
    loadData();
    const updated = await base44.entities.Cotacao.get(cotacao.id);
    setSelectedCotacao(updated);
  };

  const handleImportFotoComplete = async (novosItens) => {
    try {
        const allCots = await base44.entities.Cotacao.list();
        let nextNumber = (allCots.length > 0 ? Math.max(...allCots.map(c => parseInt(c.numero?.split('-')[1] || 0))) : 0) + 1;

        const novaCotacao = {
            numero: `COT-${String(nextNumber++).padStart(5, '0')}`,
            titulo: `Cotação via Foto - ${new Date().toLocaleDateString()}`,
            status: 'Rascunho',
            data_abertura: dataHoje(),
            itens: novosItens,
            fornecedores: [], // Inicialmente sem fornecedores
            respostas: []
        };

        await base44.entities.Cotacao.create(novaCotacao);
        
        toast({
            title: "Cotação Criada!",
            description: `${novosItens.length} itens importados da foto com sucesso.`,
            className: "bg-green-100 text-green-800"
        });
        
        loadData();
    } catch (error) {
        console.error(error);
        toast({ title: "Erro ao criar cotação", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-light text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            Cotações
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-light">
            Análise de preços e concorrência
          </p>
        </div>
        <div className="flex gap-2">
            <Button 
                variant="outline"
                className="border-dashed border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100"
                onClick={() => setIsImportadorFotoOpen(true)}
            >
                <Camera className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Importar Foto</span>
            </Button>
            <Dialog open={isNovaCotacaoOpen} onOpenChange={setIsNovaCotacaoOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm font-normal">
                        <Plus className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Nova Cotação</span>
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nova Cotação</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Título da Cotação</Label>
                            <Input 
                                value={novaCotacaoTitulo} 
                                onChange={(e) => setNovaCotacaoTitulo(e.target.value)}
                                placeholder="Ex: Compra de Cimento Mensal"
                            />
                        </div>
                        <Button onClick={async () => {
                            if (!novaCotacaoTitulo) return;
                            try {
                                const allCots = await base44.entities.Cotacao.list();
                                let nextNumber = (allCots.length > 0 ? Math.max(...allCots.map(c => parseInt(c.numero?.split('-')[1] || 0))) : 0) + 1;

                                const nova = await base44.entities.Cotacao.create({
                                    numero: `COT-${String(nextNumber).padStart(5, '0')}`,
                                    titulo: novaCotacaoTitulo,
                                    status: 'Rascunho',
                                    data_abertura: dataHoje(),
                                    itens: [],
                                    fornecedores: [],
                                    respostas: []
                                });
                                
                                toast({ title: "Cotação criada", className: "bg-green-100 text-green-800" });
                                setIsNovaCotacaoOpen(false);
                                setNovaCotacaoTitulo('');
                                loadData();
                                
                                // Abrir para edição imediatamente
                                setTimeout(() => {
                                    setSelectedCotacao(nova);
                                    setPrecosInput({});
                                }, 500);
                            } catch (e) {
                                toast({ title: "Erro", description: e.message, variant: "destructive" });
                            }
                        }} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                            Criar Cotação
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="grid gap-3">
        {cotacoes.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Nenhuma cotação encontrada</p>
          </div>
        ) : (
          cotacoes.map(cotacao => (
            <div key={cotacao.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 transition-all hover:border-teal-200">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">{cotacao.titulo}</h4>
                      </div>
                      <span className="text-xs font-mono text-gray-400 mt-0.5">{cotacao.numero}</span>
                  </div>
                  <Badge className={`border-0 font-normal px-2 py-0.5 text-[10px] ${
                      cotacao.status === 'Finalizada' ? 'bg-emerald-50 text-emerald-700' : 
                      cotacao.status === 'Em Análise' ? 'bg-blue-50 text-blue-700' : 
                      'bg-gray-100 text-gray-600'
                  }`}>{cotacao.status}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 py-3 border-t border-gray-50 dark:border-gray-700">
                  <div className="text-center sm:text-left">
                      <p className="text-[10px] text-gray-400 uppercase mb-0.5">Produtos</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{cotacao.itens?.length || 0}</p>
                  </div>
                  <div className="text-center sm:text-left">
                      <p className="text-[10px] text-gray-400 uppercase mb-0.5">Fornecedores</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{cotacao.fornecedores?.length || 0}</p>
                  </div>
                  <div className="text-center sm:text-left">
                      <p className="text-[10px] text-gray-400 uppercase mb-0.5">Data</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                           {cotacao.data_abertura ? format(new Date(cotacao.data_abertura), 'dd/MM/yyyy') : '-'}
                      </p>
                  </div>
              </div>

              <div className="pt-2 border-t border-gray-50 dark:border-gray-700">
                  <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full border-gray-200 text-gray-600 hover:text-teal-600 hover:bg-teal-50 h-9 text-sm font-normal" onClick={() => handleOpenAnaliseCotacao(cotacao)}>
                                <Trophy className="w-4 h-4 mr-2" />
                                Analisar & Preços
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="!max-w-[95vw] !w-[95vw] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-light">Análise de Cotação: {cotacao.titulo}</DialogTitle>
                            </DialogHeader>
                            
                            {/* Lançamento Manual: seletor + carrinho */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="space-y-2">
                                    <Label className="text-xs">Selecionar Produto</Label>
                                    <div className="relative">
                                      <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                      <Input
                                        value={manualSearch}
                                        onChange={(e) => setManualSearch(e.target.value)}
                                        placeholder="Buscar por nome, código, barras ou marca..."
                                        className="h-9 text-sm bg-white pl-8"
                                      />
                                    </div>
                                    <div className="max-h-44 overflow-y-auto rounded-md border bg-white">
                                      {filteredManualProducts.length === 0 ? (
                                        <p className="text-xs text-gray-400 p-3">Digite para buscar produtos.</p>
                                      ) : (
                                        filteredManualProducts.map((produto) => (
                                          <button
                                            key={produto.id}
                                            type="button"
                                            className="w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-gray-50"
                                            onClick={() => handleAddManualProduct(produto)}
                                          >
                                            <p className="text-sm text-gray-800">{produto.nome}</p>
                                            <p className="text-[11px] text-gray-500">
                                              {(produto.codigo_interno || produto.codigo_barras || 'Sem código')} • {produto.unidade_principal || 'UN'}
                                            </p>
                                          </button>
                                        ))
                                      )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">Carrinho da Cotação</Label>
                                    <span className="text-xs text-gray-500">{manualCart.length} itens</span>
                                  </div>
                                  <div className="max-h-44 overflow-y-auto rounded-md border bg-white">
                                    {manualCart.length === 0 ? (
                                      <p className="text-xs text-gray-400 p-3">Nenhum item adicionado.</p>
                                    ) : (
                                      manualCart.map((item) => (
                                        <div key={item.produto_id} className="px-3 py-2 border-b last:border-b-0">
                                          <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm text-gray-800">{item.produto_nome}</p>
                                            <button type="button" onClick={() => handleRemoveManualItem(item.produto_id)} className="text-red-500 hover:text-red-700">
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                          <div className="flex items-center gap-2 mt-2">
                                            <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handleManualQtyChange(item.produto_id, Math.max(0, (parseFloat(item.quantidade) || 0) - 1))}>
                                              <Minus className="w-3 h-3" />
                                            </Button>
                                            <Input
                                              value={item.quantidade}
                                              type="number"
                                              className="h-7 text-xs w-20"
                                              onChange={(e) => handleManualQtyChange(item.produto_id, e.target.value)}
                                            />
                                            <span className="text-xs text-gray-500">{item.unidade || 'UN'}</span>
                                            <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handleManualQtyChange(item.produto_id, (parseFloat(item.quantidade) || 0) + 1)}>
                                              <Plus className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                  <Button size="sm" className="h-8 bg-blue-600 text-white w-full" onClick={handleSaveManualItems}>
                                    <Plus className="w-4 h-4 mr-1" /> Salvar Itens no Carrinho
                                  </Button>
                                </div>
                            </div>

                            <div className="border rounded-lg overflow-x-auto mt-4 min-w-0">
                              <Table>
                                  <TableHeader className="bg-gray-50">
                                      <TableRow>
                                          <TableHead className="w-[300px]">Produto</TableHead>
                                          {cotacao.fornecedores?.map(f => (
                                              <TableHead key={f.fornecedor_id} className="text-center min-w-[120px]">
                                                  {f.fornecedor_nome}
                                              </TableHead>
                                          ))}
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {cotacao.itens?.map(item => (
                                          <TableRow key={item.produto_id}>
                                              <TableCell>
                                                  <div className="font-medium">{item.produto_nome}</div>
                                                  <div className="text-xs text-gray-500">{item.quantidade} {item.unidade}</div>
                                              </TableCell>
                                              {cotacao.fornecedores?.map(f => {
                                                  const resposta = cotacao.respostas?.find(r => r.fornecedor_id === f.fornecedor_id && r.produto_id === item.produto_id);
                                                  const isVencedor = resposta?.vencedor;
                                                  const menorPreco = cotacao.respostas
                                                      ?.filter(r => r.produto_id === item.produto_id && r.preco_unitario > 0)
                                                      .sort((a,b) => a.preco_unitario - b.preco_unitario)[0]?.preco_unitario;
                                                  const isMenor = resposta?.preco_unitario > 0 && resposta?.preco_unitario === menorPreco;
                                                  const qtdDiferente = resposta?.quantidade_ofertada && resposta?.quantidade_ofertada !== item.quantidade;

                                                  return (
                                                      <TableCell key={f.fornecedor_id} className="text-center p-2">
                                                          <div className={`p-2 rounded border transition-colors ${isVencedor ? 'bg-green-50 border-green-200' : 'border-transparent hover:bg-gray-50'}`}>
                                                              <Input 
                                                                  type="number" 
                                                                  className={`h-8 text-center bg-transparent border-gray-200 ${isMenor && !isVencedor ? 'text-green-600 font-bold' : ''}`}
                                                                  placeholder="R$ 0,00"
                                                                  value={precosInput[`${f.fornecedor_id}_${item.produto_id}`] || ''}
                                                                  onChange={(e) => handleUpdatePreco(f.fornecedor_id, item.produto_id, e.target.value)}
                                                              />
                                                              {qtdDiferente && (
                                                                <div className="text-[10px] text-amber-600 mt-1 font-medium flex items-center justify-center gap-1" title="Quantidade ofertada diferente da solicitada">
                                                                    <AlertCircle className="w-3 h-3" />
                                                                    Qtd: {resposta.quantidade_ofertada}
                                                                </div>
                                                              )}
                                                              {precosInput[`${f.fornecedor_id}_${item.produto_id}`] > 0 && (
                                                                  <Button 
                                                                      variant="ghost" 
                                                                      size="sm" 
                                                                      className={`mt-1 h-6 w-full text-[10px] ${isVencedor ? 'bg-green-200 text-green-800' : 'text-gray-400 hover:text-green-600'}`}
                                                                      onClick={() => toggleVencedor(cotacao, {fornecedor_id: f.fornecedor_id, produto_id: item.produto_id})}
                                                                  >
                                                                      {isVencedor ? 'Vencedor' : 'Marcar Vencedor'}
                                                                  </Button>
                                                              )}
                                                          </div>
                                                      </TableCell>
                                                  );
                                              })}
                                          </TableRow>
                                      ))}
                                  </TableBody>
                              </Table>
                            </div>

                            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                                <Button 
                                    variant="ghost" 
                                    className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                    onClick={() => setIsImportadorOpen(true)}
                                >
                                    <UploadCloud className="w-4 h-4 mr-2" />
                                    Importar Resposta (PDF)
                                </Button>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => handleSaveRespostas()}>Salvar Preços</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>



                    <div className="flex gap-2 ml-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg font-normal text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDeleteCotacao(cotacao)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </Button>
                      {cotacao.status !== 'Finalizada' && (
                          <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-normal"
                              onClick={() => handleCreatePedido(cotacao)}
                          >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Gerar Pedidos
                          </Button>
                      )}
                    </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedCotacao && (
        <ImportadorCotacaoPDF 
            isOpen={isImportadorOpen}
            onClose={() => setIsImportadorOpen(false)}
            cotacao={selectedCotacao}
            onImportComplete={handleImportComplete}
        />
      )}

      <ImportadorListaFoto 
        isOpen={isImportadorFotoOpen}
        onClose={() => setIsImportadorFotoOpen(false)}
        onImportComplete={handleImportFotoComplete}
      />
    </div>
  );
}