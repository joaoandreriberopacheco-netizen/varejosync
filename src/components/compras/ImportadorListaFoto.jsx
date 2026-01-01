import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Loader2, Camera, Image as ImageIcon, Sparkles, Calculator, Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { getTenantId } from '@/components/utils/tenant';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function ImportadorListaFoto({ isOpen, onClose, onImportComplete }) {
    const [step, setStep] = useState('upload');
    const [isUploading, setIsUploading] = useState(false);
    const [analyzedItems, setAnalyzedItems] = useState([]);
    const [products, setProducts] = useState([]);
    
    const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
    const [newProductData, setNewProductData] = useState({ nome: '', preco: '', unidade: 'UN', index: -1 });
    const [isCreatingProduct, setIsCreatingProduct] = useState(false);
    const [activeRowIndex, setActiveRowIndex] = useState(null);

    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            loadProducts();
            setStep('upload');
            setAnalyzedItems([]);
            setActiveRowIndex(null);
        }
    }, [isOpen]);

    const loadProducts = async () => {
        try {
            const tenantId = getTenantId();
            const prods = await base44.entities.Produto.filter({ empresa_id: tenantId, tipo: 'Produto', ativo: true });
            setProducts(prods);
        } catch (error) {
            console.error("Erro ao carregar produtos:", error);
        }
    };

    const calculateSuggestion = (product) => {
        if (!product) return 1;

        let estoqueAlvo = product.estoque_ideal || product.estoque_maximo || 0;
        if (estoqueAlvo === 0 && (product.estoque_minimo || 0) > 0) {
            estoqueAlvo = (product.estoque_minimo * 2);
        }

        let necessidade = estoqueAlvo - (product.estoque_atual || 0);

        if (necessidade <= 0 && (product.estoque_atual || 0) <= (product.estoque_minimo || 0)) {
            necessidade = Math.max(1, ((product.estoque_minimo || 0) - (product.estoque_atual || 0)) + (product.unidades_por_pacote || 1));
        }

        if (necessidade <= 0) return 1;

        const fator = product.unidades_por_pacote || 1;
        if (fator > 1) {
            return Math.ceil(necessidade / fator) * fator;
        }

        return necessidade;
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setStep('processing');

        try {
            const uploadRes = await base44.integrations.Core.UploadFile({ file });
            const fileUrl = uploadRes.file_url;

            const productsContext = products.map(p => ({ id: p.id, nome: p.nome })).slice(0, 400);

            const prompt = `
                ATENÇÃO: Analise esta imagem de lista manuscrita detalhadamente.
                Sua prioridade ABSOLUTA é transcrever TODOS os itens visíveis na imagem, linha por linha.
                Não ignore nenhum item. Se houver 20 itens escritos, retorne 20 itens.
                
                Para cada item transcrito, tente encontrar o produto correspondente nesta lista do sistema (match aproximado):
                ${JSON.stringify(productsContext)}
                
                Retorne JSON:
                {
                    "itens": [
                        {
                            "texto_identificado": "string (Transcreva exatamente o que está escrito)",
                            "produto_id_match": "string (id do produto correspondente ou null se não encontrar)",
                            "quantidade_escrita": "string (ex: 2cx, 10m, ou null)",
                            "confianca": "alta|media|baixa"
                        }
                    ]
                }
            `;

            const aiRes = await base44.integrations.Core.InvokeLLM({
                prompt: prompt,
                file_urls: [fileUrl],
                response_json_schema: {
                    type: "object",
                    properties: {
                        itens: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    texto_identificado: { type: "string" },
                                    produto_id_match: { type: ["string", "null"] },
                                    quantidade_escrita: { type: ["string", "null"] },
                                    confianca: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            const result = typeof aiRes === 'string' ? JSON.parse(aiRes) : aiRes;

            const itens = Array.isArray(result.itens) ? result.itens : [];
            const processedItems = itens.map(item => {
                const matchedProduct = products.find(p => p.id === item.produto_id_match);
                const suggestedQty = calculateSuggestion(matchedProduct);

                return {
                    ...item,
                    selected_product_id: item.produto_id_match || null,
                    quantity: suggestedQty,
                    ignored: false
                };
            });

            setAnalyzedItems(processedItems);
            setStep('review');

        } catch (error) {
            console.error(error);
            toast({ title: "Erro na análise", description: error.message, variant: "destructive" });
            setStep('upload');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCreateQuotation = async () => {
        const itemsToImport = analyzedItems.filter(i => !i.ignored && i.selected_product_id);

        if (itemsToImport.length === 0) {
            toast({ title: "Nenhum item válido", description: "Vincule pelo menos um produto.", variant: "destructive" });
            return;
        }

        const novosItens = itemsToImport.map(i => {
            const prod = products.find(p => p.id === i.selected_product_id);
            return {
                produto_id: prod.id,
                produto_nome: prod.nome,
                quantidade: parseFloat(i.quantity) || 1,
                unidade: prod.unidade_principal || 'UN'
            };
        });

        onImportComplete(novosItens);
        onClose();
    };

    const openCreateProductModal = (idx, initialName) => {
        setNewProductData({ nome: initialName, preco: '', unidade: 'UN', index: idx });
        setIsCreateProductOpen(true);
    };

    const handleCreateProduct = async () => {
        if (!newProductData.nome) return;
        setIsCreatingProduct(true);
        try {
            const tenantId = getTenantId();
            
            // Buscar categorias para classificação inteligente
            const categorias = await base44.entities.Categoria.filter({ empresa_id: tenantId });
            let categoria_id = null;
            let categoria_nome = '';
            
            if (categorias.length > 0) {
                const prompt = `
                    Dado o produto "${newProductData.nome}", qual destas categorias é a mais adequada?
                    Categorias disponíveis: ${JSON.stringify(categorias.map(c => ({ id: c.id, nome: c.nome })))}
                    
                    Retorne apenas o ID da categoria mais adequada.
                `;
                
                try {
                    const aiRes = await base44.integrations.Core.InvokeLLM({
                        prompt: prompt,
                        response_json_schema: {
                            type: "object",
                            properties: {
                                categoria_id: { type: "string" }
                            }
                        }
                    });
                    
                    const result = typeof aiRes === 'string' ? JSON.parse(aiRes) : aiRes;
                    categoria_id = result.categoria_id;
                    const cat = categorias.find(c => c.id === categoria_id);
                    categoria_nome = cat?.nome || '';
                } catch (err) {
                    console.log("Erro ao classificar categoria via IA, usando primeira categoria", err);
                    categoria_id = categorias[0].id;
                    categoria_nome = categorias[0].nome;
                }
            }
            
            const newProd = await base44.entities.Produto.create({
                empresa_id: tenantId,
                nome: newProductData.nome,
                tipo: 'Produto',
                unidade_principal: newProductData.unidade,
                preco_venda_padrao: parseFloat(newProductData.preco) || 0,
                valor_compra: 0,
                ativo: true,
                codigo_interno: `PRD-${Math.floor(Math.random()*10000)}`,
                categoria_id: categoria_id,
                categoria_nome: categoria_nome
            });

            setProducts(prev => [...prev, newProd]);
            
            const newItems = [...analyzedItems];
            if (newProductData.index >= 0) {
                newItems[newProductData.index].selected_product_id = newProd.id;
                newItems[newProductData.index].quantity = calculateSuggestion(newProd);
                newItems[newProductData.index].ignored = false;
            }
            setAnalyzedItems(newItems);
            
            toast({ title: "Produto criado", className: "bg-green-50 text-green-800" });
            setIsCreateProductOpen(false);
        } catch (error) {
            toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
        } finally {
            setIsCreatingProduct(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-10">
                    <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg">
                                    <X className="w-5 h-5" />
                                </Button>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-medium text-gray-900 dark:text-white">Importação Inteligente</h2>
                                        <p className="text-sm text-gray-500">IA identifica produtos e sugere quantidades</p>
                                    </div>
                                </div>
                            </div>
                            {step === 'review' && (
                                <div className="flex items-center gap-3">
                                    <div className="hidden md:flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-full">
                                        <Calculator className="w-3.5 h-3.5" />
                                        <span>Sugestão Automática Ativa</span>
                                    </div>
                                    <Button onClick={handleCreateQuotation} className="bg-gray-900 hover:bg-black text-white rounded-lg shadow-lg">
                                        Gerar Cotação
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                    {step === 'upload' && (
                        <div className="max-w-2xl mx-auto">
                            <div className="py-20 flex flex-col items-center justify-center">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800 flex items-center justify-center mb-8">
                                    <Camera className="w-12 h-12 text-purple-500 dark:text-purple-400" />
                                </div>
                                <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-2">Nova Cotação via Foto</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md">
                                    Tire uma foto da sua lista de compras manual ou envie um arquivo. 
                                    Nossa IA identificará os produtos e sugerirá as quantidades.
                                </p>
                                
                                <div className="relative">
                                    <Button size="lg" className="h-14 px-10 bg-gray-900 hover:bg-gray-800 text-white rounded-full shadow-xl">
                                        <ImageIcon className="w-5 h-5 mr-2.5" /> 
                                        Selecionar Imagem
                                    </Button>
                                    <input 
                                        type="file" 
                                        accept="image/*,.pdf"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={isUploading}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="max-w-2xl mx-auto py-20 flex flex-col items-center justify-center">
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-purple-100 dark:bg-purple-900/20 rounded-full animate-ping opacity-50"></div>
                                <div className="relative bg-white dark:bg-gray-800 p-6 rounded-full shadow-xl">
                                    <Sparkles className="w-10 h-10 text-purple-600 dark:text-purple-400 animate-pulse" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-2">Analisando Imagem...</h3>
                            <p className="text-gray-500 dark:text-gray-400">Identificando produtos e calculando reposição</p>
                        </div>
                    )}

                    {step === 'review' && (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Identificado</th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[40%]">Produto no Sistema</th>
                                                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estoque</th>
                                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sugerido</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {analyzedItems.map((item, idx) => {
                                                const product = products.find(p => p.id === item.selected_product_id);
                                                const isRowActive = activeRowIndex === idx;
                                                
                                                return (
                                                    <tr key={idx} className={`${item.ignored ? 'opacity-40 bg-gray-50 dark:bg-gray-900/20' : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/50'} transition-colors`}>
                                                        <td className="px-6 py-4">
                                                            <Checkbox 
                                                                checked={!item.ignored} 
                                                                onCheckedChange={(checked) => {
                                                                    const newItems = [...analyzedItems];
                                                                    newItems[idx].ignored = !checked;
                                                                    setAnalyzedItems(newItems);
                                                                }}
                                                                className="rounded-md w-5 h-5"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-gray-900 dark:text-white">{item.texto_identificado}</div>
                                                            {item.quantidade_escrita && (
                                                                <div className="text-xs text-gray-400 mt-1">
                                                                    Escrito: {item.quantidade_escrita}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className={`px-6 py-4 overflow-visible relative ${isRowActive ? 'z-50' : 'z-0'}`}>
                                                            <CustomProductCombobox 
                                                                products={products}
                                                                value={item.selected_product_id}
                                                                isOpen={isRowActive}
                                                                onToggle={(open) => setActiveRowIndex(open ? idx : null)}
                                                                onSelect={(val) => {
                                                                    const newItems = [...analyzedItems];
                                                                    newItems[idx].selected_product_id = val;
                                                                    if (val) {
                                                                        const p = products.find(prod => prod.id === val);
                                                                        newItems[idx].quantity = calculateSuggestion(p);
                                                                        newItems[idx].ignored = false;
                                                                    }
                                                                    setAnalyzedItems(newItems);
                                                                    setActiveRowIndex(null);
                                                                }}
                                                                onCreate={() => {
                                                                    openCreateProductModal(idx, item.texto_identificado);
                                                                    setActiveRowIndex(null);
                                                                }}
                                                                suggestedTerm={item.texto_identificado}
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {product ? (
                                                                <div className="flex flex-col items-center">
                                                                    <span className="font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">
                                                                        {product.estoque_atual || 0}
                                                                    </span>
                                                                    <span className="text-gray-400 text-[10px] mt-1">Min: {product.estoque_minimo || 0}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-200 text-xl">−</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex justify-end items-center gap-2">
                                                                <Input 
                                                                    type="number" 
                                                                    className="h-10 w-20 text-right font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-0 rounded-lg"
                                                                    value={item.quantity}
                                                                    onChange={(e) => {
                                                                        const newItems = [...analyzedItems];
                                                                        newItems[idx].quantity = e.target.value;
                                                                        setAnalyzedItems(newItems);
                                                                    }}
                                                                    disabled={item.ignored}
                                                                />
                                                                <span className="text-xs text-gray-400 w-8 font-medium">
                                                                    {product?.unidade_principal || 'UN'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-sm text-gray-500">
                                <span>{analyzedItems.filter(i => !i.ignored).length} itens selecionados</span>
                                <Button variant="ghost" onClick={() => setStep('upload')} className="text-gray-500">
                                    Voltar e Reenviar
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Product Modal */}
            <Dialog open={isCreateProductOpen} onOpenChange={setIsCreateProductOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Novo Produto</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2">Nome do Produto</Label>
                            <Input 
                                value={newProductData.nome} 
                                onChange={e => setNewProductData({...newProductData, nome: e.target.value})} 
                                className="bg-white dark:bg-gray-900"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2">Preço Venda (Est.)</Label>
                                <Input 
                                    type="number" 
                                    value={newProductData.preco} 
                                    onChange={e => setNewProductData({...newProductData, preco: e.target.value})} 
                                    className="bg-white dark:bg-gray-900"
                                />
                            </div>
                            <div>
                                <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2">Unidade</Label>
                                <Input 
                                    value={newProductData.unidade} 
                                    onChange={e => setNewProductData({...newProductData, unidade: e.target.value})} 
                                    className="bg-white dark:bg-gray-900"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateProductOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateProduct} disabled={isCreatingProduct} className="bg-purple-600 hover:bg-purple-700">
                            {isCreatingProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Produto'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function CustomProductCombobox({ products, value, onSelect, onCreate, suggestedTerm, isOpen, onToggle }) {
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    const selectedProduct = products.find(p => p.id === value);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                onToggle(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onToggle]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            if (!value && suggestedTerm && !searchTerm) {
                setSearchTerm(""); 
            }
        }
        if (!isOpen) {
            setSearchTerm("");
        }
    }, [isOpen]);

    const filteredProducts = useMemo(() => {
        const term = searchTerm.toLowerCase();
        if (!term && suggestedTerm) {
            const st = suggestedTerm.toLowerCase();
            return [...products].sort((a, b) => {
                 const aName = a.nome.toLowerCase();
                 const bName = b.nome.toLowerCase();
                 if (aName === st) return -1;
                 if (bName === st) return 1;
                 if (aName.startsWith(st) && !bName.startsWith(st)) return -1;
                 if (bName.startsWith(st) && !aName.startsWith(st)) return 1;
                 if (aName.includes(st) && !bName.includes(st)) return -1;
                 if (bName.includes(st) && !aName.includes(st)) return 1;
                 return 0;
            }).slice(0, 50);
        }

        return products.filter(p => 
            p.nome.toLowerCase().includes(term)
        ).slice(0, 50);
    }, [products, searchTerm, suggestedTerm]);

    return (
        <div className="relative" ref={wrapperRef}>
            <div 
                className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg cursor-pointer transition-all h-10 ${isOpen ? 'bg-white ring-2 ring-purple-500 shadow-md' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                onClick={() => onToggle(!isOpen)}
            >
                <span className={`truncate ${selectedProduct ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400'}`}>
                    {selectedProduct ? selectedProduct.nome : "Vincular Produto..."}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[100] w-[350px] mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden left-0">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-purple-500" />
                            <input
                                ref={inputRef}
                                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                placeholder="Buscar produto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div className="max-h-[280px] overflow-y-auto">
                        <div 
                            className="px-4 py-3 text-sm text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 font-medium"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCreate();
                            }}
                        >
                            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                                <Plus className="w-3.5 h-3.5" />
                            </div>
                            Criar novo: "{searchTerm || suggestedTerm}"
                        </div>
                        
                        {filteredProducts.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-400 text-xs">
                                Nenhum produto encontrado.
                            </div>
                        ) : (
                            filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between ${value === product.id ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(product.id);
                                    }}
                                >
                                    <span className={`${value === product.id ? 'text-purple-900 dark:text-purple-300 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                                        {product.nome}
                                    </span>
                                    {value === product.id && <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}