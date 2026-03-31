import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Loader2, Check, X, ArrowLeft, Package, FileText, Camera, Sparkles, AlertCircle } from 'lucide-react';

export default function ImportadorPedidoCompra({ isOpen, onClose, onImportComplete }) {
  const [mode, setMode] = useState('pdf');
  const [step, setStep] = useState('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [items, setItems] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [fornecedorInfo, setFornecedorInfo] = useState({ id: '', nome: '', cnpj: '' });
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingStep, setProcessingStep] = useState(1);
  const [productSearch, setProductSearch] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    setStep('upload');
    setItems([]);
    setFornecedorInfo({ id: '', nome: '', cnpj: '' });
    Promise.all([
      base44.entities.Produto.filter({ tipo: 'Produto', ativo: true }),
      base44.entities.Terceiro.filter({ tipo: ['Fornecedor', 'Ambos'] })
    ]).then(([prods, fns]) => {
      setProdutos(prods);
      setFornecedores(fns);
    });
  }, [isOpen]);

  const formatCurrency = (value) => (parseFloat(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getFilteredProducts = (index) => {
    const query = (productSearch[index] || '').trim().toLowerCase();
    if (!query) return produtos;
    return produtos.filter((produto) => (produto.nome || '').toLowerCase().includes(query));
  };

  const progressWidth = useMemo(() => `${(processingStep / 5) * 100}%`, [processingStep]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStep('processing');
    setProcessingStep(1);
    setProcessingStatus('Carregando arquivo');

    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadRes.file_url;

      setProcessingStep(2);
      setProcessingStatus('Lendo documento');

      const prompt = mode === 'pdf'
        ? `Analise este PDF de compra/orçamento de fornecedor.
Extraia fornecedor e itens.
Tente identificar o fornecedor nesta lista: ${JSON.stringify(fornecedores.map(f => ({ id: f.id, nome: f.nome, cnpj: f.cpf_cnpj })))}
Para encontrar o produto correspondente, considere apenas similaridade de descrição/nome do item com a descrição/nome do produto.
Ignore código, marca, embalagem e qualquer outro campo na hora de decidir o match.
Lista de produtos: ${JSON.stringify(produtos.map(p => ({ id: p.id, nome: p.nome })))}
Retorne JSON com fornecedor e itens.
{
  "fornecedor": {"nome_identificado": "string", "cnpj_identificado": "string", "id_match": "string ou vazio"},
  "itens": [{
    "descricao": "string",
    "codigo": "string",
    "marca": "string",
    "quantidade": number,
    "preco_unitario": number,
    "produto_id_match": "string ou vazio",
    "confianca": "alta|media|baixa"
  }]
}`
        : `Analise esta imagem de lista de compra.
Extraia todos os itens visíveis.
Para encontrar o produto correspondente, considere apenas similaridade de descrição/nome do item com a descrição/nome do produto.
Ignore código, marca, embalagem e qualquer outro campo na hora de decidir o match.
Lista de produtos: ${JSON.stringify(produtos.map(p => ({ id: p.id, nome: p.nome })))}
Retorne JSON:
{
  "fornecedor": {"nome_identificado": "", "cnpj_identificado": "", "id_match": ""},
  "itens": [{
    "descricao": "string",
    "codigo": "",
    "marca": "",
    "quantidade": number,
    "preco_unitario": number,
    "produto_id_match": "string ou vazio",
    "confianca": "alta|media|baixa"
  }]
}`;

      setProcessingStep(3);
      setProcessingStatus('Identificando itens');

      const aiRes = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [fileUrl],
        response_json_schema: {
          type: 'object',
          properties: {
            fornecedor: {
              type: 'object',
              properties: {
                nome_identificado: { type: 'string' },
                cnpj_identificado: { type: 'string' },
                id_match: { type: 'string' }
              }
            },
            itens: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  descricao: { type: 'string' },
                  codigo: { type: 'string' },
                  marca: { type: 'string' },
                  quantidade: { type: 'number' },
                  preco_unitario: { type: 'number' },
                  produto_id_match: { type: 'string' },
                  confianca: { type: 'string' }
                }
              }
            }
          }
        }
      });

      setProcessingStep(4);
      setProcessingStatus('Identificando fornecedor');

      const result = typeof aiRes === 'string' ? JSON.parse(aiRes) : aiRes;
      setFornecedorInfo({
        id: result.fornecedor?.id_match || 'new',
        nome: result.fornecedor?.nome_identificado || '',
        cnpj: result.fornecedor?.cnpj_identificado || ''
      });
      setProcessingStep(5);
      setProcessingStatus('Buscando correspondências no catálogo');

      setItems((result.itens || []).map(item => ({
        ...item,
        selected_product_id: item.produto_id_match || '',
        ignored: false
      })));
      setStep('review');
    } catch (error) {
      toast({ title: 'Erro na análise', description: error.message, variant: 'destructive' });
      setStep('upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      let fornecedorId = fornecedorInfo.id;
      if (fornecedorId === 'new' && fornecedorInfo.nome.trim()) {
        const novoFornecedor = await base44.entities.Terceiro.create({
          nome: fornecedorInfo.nome,
          cpf_cnpj: fornecedorInfo.cnpj,
          tipo: 'Fornecedor',
          ativo: true
        });
        fornecedorId = novoFornecedor.id;
      }

      const validItems = items.filter(item => !item.ignored && item.selected_product_id);
      const importedItems = [];

      for (const item of validItems) {
        let produtoId = item.selected_product_id;

        if (produtoId === 'create_new') {
          const novoProduto = await base44.entities.Produto.create({
            campo_hierarquico_1: item.descricao,
            nome: item.descricao,
            marca: item.marca || '',
            tipo: 'Produto',
            preco_venda_padrao: (item.preco_unitario || 0) * 1.4,
            valor_compra: item.preco_unitario || 0,
            unidade_principal: 'UN',
            ativo: true
          });
          produtoId = novoProduto.id;
        }

        const produto = produtos.find(p => p.id === produtoId) || { id: produtoId, nome: item.descricao, unidade_principal: 'UN' };
        importedItems.push({
          produto_id: produtoId,
          produto_nome: produto.nome,
          quantidade: item.quantidade || 1,
          unidade_medida: produto.unidade_principal || 'UN',
          custo_unitario: item.preco_unitario || 0,
          valor_desconto_item: 0,
          observacao_item: mode === 'pdf' ? 'Importado via PDF' : 'Importado via foto'
        });
      }

      onImportComplete({ fornecedorId, fornecedorNome: fornecedorInfo.nome, items: importedItems });
      onClose();
      toast({ title: 'Itens importados com sucesso' });
    } catch (error) {
      toast({ title: 'Erro ao importar', description: error.message, variant: 'destructive' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-white dark:bg-gray-900 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-full">
              <X className="w-4 h-4" />
            </Button>
            <div>
              <p className="font-glacial text-lg text-gray-900 dark:text-white">Importar para pedido</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">PDF ou foto direto nos itens</p>
            </div>
          </div>
          {step === 'review' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('upload')} className="border-0 shadow-sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button onClick={handleConfirm} className="shadow-sm">
                <Check className="w-4 h-4 mr-2" />Confirmar
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant={mode === 'pdf' ? 'default' : 'outline'} onClick={() => setMode('pdf')} className="flex-1 border-0 shadow-sm">
                <FileText className="w-4 h-4 mr-2" />PDF
              </Button>
              <Button variant={mode === 'foto' ? 'default' : 'outline'} onClick={() => setMode('foto')} className="flex-1 border-0 shadow-sm">
                <Camera className="w-4 h-4 mr-2" />Foto
              </Button>
            </div>
            <div className="rounded-3xl bg-gray-50 dark:bg-gray-800/60 p-8 md:p-14 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm">
                {mode === 'pdf' ? <FileText className="w-8 h-8 text-gray-600" /> : <Sparkles className="w-8 h-8 text-gray-600" />}
              </div>
              <p className="font-glacial text-xl text-gray-900 dark:text-white mb-2">
                {mode === 'pdf' ? 'Enviar PDF do fornecedor' : 'Enviar foto da lista'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">A importação vai preencher os itens do pedido.</p>
              <div className="relative inline-block">
                <input type="file" accept={mode === 'pdf' ? '.pdf' : 'image/*,.pdf'} onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploading} />
                <Button size="lg" className="rounded-full px-8 shadow-sm">
                  <Upload className="w-4 h-4 mr-2" />Selecionar arquivo
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-20 flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <Loader2 className="w-12 h-12 animate-spin text-gray-700 dark:text-gray-300 mb-4" />
            <p className="font-glacial text-xl text-gray-900 dark:text-white">{processingStatus}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Passo {processingStep} de 5</p>
            <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden shadow-sm">
              <div className="h-full bg-gray-700 dark:bg-gray-300 transition-all duration-300" style={{ width: progressWidth }} />
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4 shadow-sm md:col-span-2">
                <Label className="text-xs text-gray-500 mb-2 block">Fornecedor</Label>
                <Select value={fornecedorInfo.id || 'new'} onValueChange={(value) => setFornecedorInfo(prev => ({ ...prev, id: value }))}>
                  <SelectTrigger className="border-0 bg-white dark:bg-gray-900 shadow-sm">
                    <SelectValue placeholder="Selecionar fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Criar novo fornecedor</SelectItem>
                    {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {fornecedorInfo.id === 'new' && (
                <>
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4 shadow-sm">
                    <Label className="text-xs text-gray-500 mb-2 block">Nome</Label>
                    <Input value={fornecedorInfo.nome} onChange={(e) => setFornecedorInfo(prev => ({ ...prev, nome: e.target.value }))} className="border-0 bg-white dark:bg-gray-900 shadow-sm" />
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4 shadow-sm">
                    <Label className="text-xs text-gray-500 mb-2 block">CNPJ</Label>
                    <Input value={fornecedorInfo.cnpj} onChange={(e) => setFornecedorInfo(prev => ({ ...prev, cnpj: e.target.value }))} className="border-0 bg-white dark:bg-gray-900 shadow-sm" />
                  </div>
                </>
              )}
            </div>

            <div className="rounded-3xl bg-white dark:bg-gray-800/70 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/40">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Package className="w-4 h-4" />Itens identificados
                </div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((item, index) => (
                  <div key={index} className={`p-4 grid gap-3 md:grid-cols-[40px_1.4fr_1fr_120px] items-center ${item.ignored ? 'opacity-50' : ''}`}>
                    <Checkbox checked={!item.ignored} onCheckedChange={(checked) => setItems(prev => prev.map((current, currentIndex) => currentIndex === index ? { ...current, ignored: !checked } : current))} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.descricao}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {item.codigo ? <span>Cód: {item.codigo}</span> : null}
                        {item.marca ? <span>{item.marca}</span> : null}
                        {item.confianca ? <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><AlertCircle className="w-3 h-3" />{item.confianca}</span> : null}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={productSearch[index] || ''}
                        onChange={(e) => setProductSearch((prev) => ({ ...prev, [index]: e.target.value }))}
                        placeholder="Buscar no catálogo"
                        className="border-0 bg-gray-50 dark:bg-gray-900 shadow-sm"
                      />
                      <Select value={item.selected_product_id || 'none'} onValueChange={(value) => setItems(prev => prev.map((current, currentIndex) => currentIndex === index ? { ...current, selected_product_id: value === 'none' ? '' : value, ignored: false } : current))}>
                        <SelectTrigger className="border-0 bg-gray-50 dark:bg-gray-900 shadow-sm">
                          <SelectValue placeholder="Vincular produto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem vínculo</SelectItem>
                          <SelectItem value="create_new">Criar novo produto</SelectItem>
                          {getFilteredProducts(index).map(produto => (
                            <SelectItem key={produto.id} value={produto.id}>{produto.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{item.quantidade || 1} × R$ {formatCurrency(item.preco_unitario)}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">R$ {formatCurrency((item.quantidade || 1) * (item.preco_unitario || 0))}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}