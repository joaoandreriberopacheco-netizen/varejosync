import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Loader2, Camera, Image as ImageIcon, Sparkles, Calculator, Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { getTenantId } from '@/components/utils/tenant';

export default function ImportadorListaFoto({ isOpen, onClose, onImportComplete }) {
    const [step, setStep] = useState('upload'); // upload, processing, review
    const [isUploading, setIsUploading] = useState(false);
    const [analyzedItems, setAnalyzedItems] = useState([]);
    const [products, setProducts] = useState([]);
    
    // States for creating new product
    const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
    const [newProductData, setNewProductData] = useState({ nome: '', preco: '', unidade: 'UN', index: -1 });
    const [isCreatingProduct, setIsCreatingProduct] = useState(false);
    const [activeRowIndex, setActiveRowIndex] = useState(null); // Track which row has an open dropdown

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

            // Simplificar contexto para não estourar tokens, mas enviar nomes para matching fuzzy
            // Limitando a 400 produtos para garantir performance e limites de token
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

            const processedItems = result.itens.map(item => {
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
            const newProd = await base44.entities.Produto.create({
                empresa_id: tenantId,
                nome: newProductData.nome,
                tipo: 'Produto',
                unidade_principal: newProductData.unidade,
                preco_venda_padrao: parseFloat(newProductData.preco) || 0,
                valor_compra: 0,
                ativo: true,
                codigo_interno: `PRD-${Math.floor(Math.random()*10000)}` // Temp
            });

            setProducts(prev => [...prev, newProd]);
            
            // Auto-select created product
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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0 gap-0 bg-white dark:bg-gray-900 border-none shadow-2xl rounded-2xl">
                <div className="px-8 py-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-20">
                    <DialogTitle className="flex items-center gap-3 text-xl font-light text-gray-800 dark:text-gray-100">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                        </div>
                        Importação Inteligente
                    </DialogTitle>
                    {step === 'review' && (
                        <div className="flex items-center gap-2 text-xs font-medium text-purple-700 bg-purple-50 px-4 py-1.5 rounded-full">
                            <Calculator className="w-3.5 h-3.5" />
                            <span>Sugestão Automática Ativa</span>
                        </div>
                    )}
                </div>

                <div className="p-8">
                    {step === 'upload' && (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800 rounded-full flex items-center justify-center mb-8 shadow-sm border border-purple-50">
                                <Camera className="w-10 h-10 text-purple-500 dark:text-purple-400" />
                            </div>
                            <h3 className="text-2xl font-light text-gray-900 dark:text-gray-100 mb-3">Nova Cotação via Foto</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-md font-light leading-relaxed">
                                Tire uma foto da sua lista de compras manual ou envie um arquivo. 
                                Nossa IA identificará os produtos e sugerirá as quantidades.
                            </p>
                            
                            <div className="relative group">
                                <Button className="h-14 px-10 bg-gray-900 hover:bg-gray-800 text-white rounded-full shadow-xl transition-all hover:scale-105 font-medium text-lg">
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
                    )}

                    {step === 'processing' && (
                        <div className="py-32 flex flex-col items-center justify-center text-center">
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-purple-100 rounded-full animate-ping opacity-50"></div>
                                <div className="relative bg-white dark:bg-gray-800 p-6 rounded-full shadow-xl border border-purple-50">
                                    <Sparkles className="w-10 h-10 text-purple-600 animate-pulse" />
                                </div>
                            </div>
                            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100">Analisando Imagem...</h3>
                            <p className="text-gray-500 mt-2 font-light">Identificando produtos e calculando reposição</p>
                        </div>
                    )}

                    {step === 'review' && (
                        <div className="space-y-2">
                            <div className="rounded-2xl border border-gray-50 dark:border-gray-800 overflow-visible bg-white dark:bg-gray-900 shadow-sm ring-1 ring-black/5">
                                <Table>
                                    <TableHeader className="bg-gray-50/30 dark:bg-gray-800/30">
                                        <TableRow className="border-none hover:bg-transparent">
                                            <TableHead className="w-[50px] pl-6"></TableHead>
                                            <TableHead className="font-medium text-gray-400 text-xs uppercase tracking-wider">Item Identificado</TableHead>
                                            <TableHead className="font-medium text-gray-400 text-xs uppercase tracking-wider w-[45%]">Produto no Sistema</TableHead>
                                            <TableHead className="text-center font-medium text-gray-400 text-xs uppercase tracking-wider">Estoque</TableHead>
                                            <TableHead className="text-right font-medium text-gray-400 text-xs uppercase tracking-wider pr-6">Sugerido</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analyzedItems.map((item, idx) => {
                                            const product = products.find(p => p.id === item.selected_product_id);
                                            
                                            const isRowActive = activeRowIndex === idx;
                                            
                                            return (
                                                <TableRow key={idx} className={`border-none transition-colors hover:bg-purple-50/30 dark:hover:bg-gray-800/30 ${item.ignored ? 'opacity-40 grayscale' : ''} ${isRowActive ? 'z-50 relative' : 'z-0'}`}>
                                                    <TableCell className="pl-6 py-4">
                                                        <Checkbox 
                                                            checked={!item.ignored} 
                                                            onCheckedChange={(checked) => {
                                                                const newItems = [...analyzedItems];
                                                                newItems[idx].ignored = !checked;
                                                                setAnalyzedItems(newItems);
                                                            }}
                                                            className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 rounded-md w-5 h-5 border-gray-300"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="font-medium text-gray-900 dark:text-gray-100 text-base">{item.texto_identificado}</div>
                                                        {item.quantidade_escrita && (
                                                            <div className="text-xs text-gray-400 font-light mt-1 flex items-center gap-1">
                                                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                                Escrito: {item.quantidade_escrita}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className={`py-4 overflow-visible relative ${isRowActive ? 'z-[100]' : 'z-10'}`}>
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
                                                    </TableCell>
                                                    <TableCell className="text-center py-4">
                                                        {product ? (
                                                            <div className="flex flex-col items-center justify-center h-full">
                                                                <span className="font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">{product.estoque_atual}</span>
                                                                <span className="text-gray-400 text-[10px] mt-1">Min: {product.estoque_minimo}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-200 text-xl">−</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="pr-6 py-4">
                                                        <div className="flex justify-end items-center gap-2">
                                                            <Input 
                                                                type="number" 
                                                                className="h-10 w-20 text-right font-bold text-purple-600 border-0 bg-purple-50/50 focus:ring-1 focus:ring-purple-200 rounded-lg text-base"
                                                                value={item.quantity}
                                                                onChange={(e) => {
                                                                    const newItems = [...analyzedItems];
                                                                    newItems[idx].quantity = e.target.value;
                                                                    setAnalyzedItems(newItems);
                                                                }}
                                                                disabled={item.ignored}
                                                            />
                                                            <span className="text-xs text-gray-400 w-8 font-medium text-left">
                                                                {product?.unidade_principal || 'UN'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-50 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center sticky bottom-0 z-20">
                    {step === 'review' ? (
                        <>
                             <div className="text-xs text-gray-400">
                                {analyzedItems.filter(i => !i.ignored).length} itens selecionados
                             </div>
                             <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => setStep('upload')} className="text-gray-500 hover:text-gray-800 font-normal">
                                    Voltar
                                </Button>
                                <Button onClick={handleCreateQuotation} className="bg-gray-900 hover:bg-black text-white rounded-lg px-8 h-10 shadow-lg shadow-purple-900/10">
                                    Gerar Cotação
                                </Button>
                            </div>
                        </>
                    ) : (
                        <Button variant="ghost" onClick={onClose} className="ml-auto text-gray-400">Cancelar</Button>
                    )}
                </div>
            </DialogContent>

            {/* Create Product Modal */}
            <Dialog open={isCreateProductOpen} onOpenChange={setIsCreateProductOpen}>
                <DialogContent className="max-w-md border-none shadow-2xl bg-white p-6 rounded-2xl">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-lg font-medium">Novo Produto</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5">
                        <div>
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nome do Produto</Label>
                            <Input 
                                value={newProductData.nome} 
                                onChange={e => setNewProductData({...newProductData, nome: e.target.value})} 
                                className="mt-1.5 bg-gray-50 border-gray-100 h-11"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preço Venda (Est.)</Label>
                                <Input 
                                    type="number" 
                                    value={newProductData.preco} 
                                    onChange={e => setNewProductData({...newProductData, preco: e.target.value})} 
                                    className="mt-1.5 bg-gray-50 border-gray-100 h-11"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unidade</Label>
                                <Input 
                                    value={newProductData.unidade} 
                                    onChange={e => setNewProductData({...newProductData, unidade: e.target.value})} 
                                    className="mt-1.5 bg-gray-50 border-gray-100 h-11"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mt-8">
                        <Button variant="ghost" onClick={() => setIsCreateProductOpen(false)} className="text-gray-500">Cancelar</Button>
                        <Button onClick={handleCreateProduct} disabled={isCreatingProduct} className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-6">
                            {isCreatingProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Produto'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}

// Custom Combobox without relying on shadcn Command
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
            // Pre-fill with suggested term if no value selected yet
            if (!value && suggestedTerm && !searchTerm) {
                setSearchTerm(""); 
            }
        }
        if (!isOpen) {
            setSearchTerm(""); // Clear search when closed
        }
    }, [isOpen]);

    const filteredProducts = useMemo(() => {
        const term = searchTerm.toLowerCase();
        // If empty search, sort by relevance to suggestedTerm (if exists)
        if (!term && suggestedTerm) {
            const st = suggestedTerm.toLowerCase();
            return [...products].sort((a, b) => {
                 const aName = a.nome.toLowerCase();
                 const bName = b.nome.toLowerCase();
                 // Exact match
                 if (aName === st) return -1;
                 if (bName === st) return 1;
                 // Starts with
                 if (aName.startsWith(st) && !bName.startsWith(st)) return -1;
                 if (bName.startsWith(st) && !aName.startsWith(st)) return 1;
                 // Includes
                 if (aName.includes(st) && !bName.includes(st)) return -1;
                 if (bName.includes(st) && !aName.includes(st)) return 1;
                 return 0;
            }).slice(0, 50);
        }

        // Standard search filter
        return products.filter(p => 
            p.nome.toLowerCase().includes(term)
        ).slice(0, 50);
    }, [products, searchTerm, suggestedTerm]);

    return (
        <div className="relative" ref={wrapperRef}>
            <div 
                className={`flex items-center justify-between w-full px-3 py-2 text-sm border border-transparent rounded-lg cursor-pointer transition-all h-10 ${isOpen ? 'bg-white ring-2 ring-purple-500 border-transparent shadow-md' : 'bg-gray-50 hover:bg-gray-100 hover:border-gray-200'}`}
                onClick={() => onToggle(!isOpen)}
            >
                <span className={`truncate ${selectedProduct ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    {selectedProduct ? selectedProduct.nome : "Vincular Produto..."}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[100] w-[350px] mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5 left-0">
                    <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-purple-500" />
                            <input
                                ref={inputRef}
                                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none shadow-sm"
                                placeholder="Buscar produto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div className="max-h-[280px] overflow-y-auto bg-white">
                        <div 
                            className="px-4 py-3 text-sm text-purple-700 hover:bg-purple-50 cursor-pointer flex items-center gap-2 border-b border-gray-50 font-medium transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCreate();
                            }}
                        >
                            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
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
                                    className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between group transition-colors ${value === product.id ? 'bg-purple-50/50' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(product.id);
                                    }}
                                >
                                    <span className={`group-hover:text-gray-900 ${value === product.id ? 'text-purple-900 font-medium' : 'text-gray-600'}`}>{product.nome}</span>
                                    {value === product.id && <Check className="w-4 h-4 text-purple-600" />}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}