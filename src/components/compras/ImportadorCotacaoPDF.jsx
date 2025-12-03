import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Loader2, AlertCircle, Check, FileText, Plus } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { getTenantId } from '@/components/utils/tenant';

export default function ImportadorCotacaoPDF({ isOpen, onClose, cotacao, onImportComplete }) {
    const [step, setStep] = useState('upload'); // upload, processing, review
    const [isUploading, setIsUploading] = useState(false);
    const [aiData, setAiData] = useState(null);
    const [mappings, setMappings] = useState([]);
    const [fornecedorInfo, setFornecedorInfo] = useState({ nome: '', cnpj: '', id: 'new' });
    const [produtosSistema, setProdutosSistema] = useState([]);
    const [fornecedoresSistema, setFornecedoresSistema] = useState([]);
    const { toast } = useToast();

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setStep('processing');

        try {
            // 1. Upload File
            const uploadRes = await base44.integrations.Core.UploadFile({ file });
            const fileUrl = uploadRes.file_url;

            // 2. Load Context Data (Products & Suppliers)
            const tenantId = getTenantId();
            const [produtos, fornecedores] = await Promise.all([
                base44.entities.Produto.filter({ empresa_id: tenantId }), // Load all products for matching capability
                base44.entities.Terceiro.filter({ empresa_id: tenantId, tipo: ['Fornecedor', 'Ambos'] })
            ]);
            setProdutosSistema(produtos);
            setFornecedoresSistema(fornecedores);

            // 3. Call LLM
            const prompt = `
                Analise este PDF de cotação/orçamento de fornecedor.
                Extraia os dados do fornecedor e a lista de itens.
                
                Tente identificar se o fornecedor já existe nesta lista (por nome ou CNPJ aproximado):
                ${JSON.stringify(fornecedores.map(f => ({ id: f.id, nome: f.nome, cnpj: f.cpf_cnpj })))}

                Tente identificar a correspondência dos itens com estes produtos da cotação atual:
                ${JSON.stringify(cotacao.itens.map(i => ({ id: i.produto_id, nome: i.produto_nome, qtd: i.quantidade })))}
                
                Se não encontrar na cotação, tente buscar na lista geral de produtos se possível, ou deixe sem correspondência.

                Retorne um JSON com:
                {
                    "fornecedor": { 
                        "nome_identificado": "string", 
                        "cnpj_identificado": "string",
                        "id_match": "string (id do sistema ou null se novo)"
                    },
                    "financeiro": {
                        "subtotal": number,
                        "desconto_global": number,
                        "total_final": number
                    },
                    "itens": [
                        {
                            "descricao_pdf": "string",
                            "codigo_pdf": "string",
                            "quantidade_pdf": number,
                            "preco_unitario_pdf": number,
                            "produto_sistema_match_id": "string (id do produto ou null)",
                            "confianca_match": "alta|media|baixa"
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
                        fornecedor: {
                            type: "object",
                            properties: {
                                nome_identificado: { type: "string" },
                                cnpj_identificado: { type: "string" },
                                id_match: { type: ["string", "null"] }
                            }
                        },
                        financeiro: {
                            type: "object",
                            properties: {
                                subtotal: { type: "number" },
                                desconto_global: { type: "number" },
                                total_final: { type: "number" }
                            }
                        },
                        itens: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    descricao_pdf: { type: "string" },
                                    codigo_pdf: { type: "string" },
                                    quantidade_pdf: { type: "number" },
                                    preco_unitario_pdf: { type: "number" },
                                    produto_sistema_match_id: { type: ["string", "null"] },
                                    confianca_match: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            const result = typeof aiRes === 'string' ? JSON.parse(aiRes) : aiRes;
            setAiData(result);
            
            // Initialize Mappings
            setMappings(result.itens.map(item => ({
                ...item,
                selected_product_id: item.produto_sistema_match_id || '',
                ignored: !item.produto_sistema_match_id // Auto ignore if no match found initially
            })));

            // Initialize Supplier Info
            setFornecedorInfo({
                id: result.fornecedor.id_match || 'new',
                nome: result.fornecedor.nome_identificado,
                cnpj: result.fornecedor.cnpj_identificado
            });

            setStep('review');

        } catch (error) {
            console.error(error);
            toast({ title: "Erro na análise", description: error.message, variant: "destructive" });
            setStep('upload');
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirmImport = async () => {
        try {
            let finalFornecedorId = fornecedorInfo.id;

            // 1. Create Supplier if new
            if (finalFornecedorId === 'new') {
                const tenantId = getTenantId();
                const novoFornecedor = await base44.entities.Terceiro.create({
                    empresa_id: tenantId,
                    nome: fornecedorInfo.nome,
                    cpf_cnpj: fornecedorInfo.cnpj,
                    tipo: 'Fornecedor',
                    ativo: true
                });
                finalFornecedorId = novoFornecedor.id;
            }

            // 2. Process items (Create products if needed)
            const validItems = mappings.filter(m => !m.ignored && m.selected_product_id);
            
            const processedItems = [];
            const novosItensCotacao = [];

            for (const m of validItems) {
                let produtoId = m.selected_product_id;

                // Criar produto se selecionado 'create_new'
                if (produtoId === 'create_new') {
                    try {
                        const tenantId = getTenantId();
                        const novoProduto = await base44.entities.Produto.create({
                            empresa_id: tenantId,
                            nome: m.descricao_pdf,
                            codigo_interno: 'IMP-' + Math.floor(Math.random() * 10000), // Temp code
                            tipo: 'Produto',
                            preco_venda_padrao: m.preco_unitario_pdf * 1.5, // Sugestão inicial
                            valor_compra: m.preco_unitario_pdf,
                            unidade_principal: 'UN', // Default
                            ativo: true
                        });
                        produtoId = novoProduto.id;
                        
                        // Adicionar à lista de novos itens para incluir na cotação
                        novosItensCotacao.push({
                            produto_id: novoProduto.id,
                            produto_nome: novoProduto.nome,
                            quantidade: m.quantidade_pdf,
                            unidade: 'UN'
                        });
                    } catch (err) {
                        console.error("Erro ao criar produto", err);
                        toast({ title: "Erro ao criar produto", description: m.descricao_pdf, variant: "destructive" });
                        continue; 
                    }
                }

                processedItems.push({ ...m, final_product_id: produtoId });
            }

            // 3. Calculate effective prices
            const subtotalItens = processedItems.reduce((sum, m) => sum + (m.quantidade_pdf * m.preco_unitario_pdf), 0);
            let discountRatio = 1;
            if (aiData.financeiro.desconto_global > 0 && subtotalItens > 0) {
                discountRatio = 1 - (aiData.financeiro.desconto_global / subtotalItens);
            }

            const respostas = processedItems.map(m => ({
                fornecedor_id: finalFornecedorId,
                produto_id: m.final_product_id,
                preco_unitario: m.preco_unitario_pdf * discountRatio,
                quantidade_ofertada: m.quantidade_pdf, // Quantidade que veio do fornecedor
                marca: m.descricao_pdf,
                observacao: `Importado via PDF. Preço original: R$ ${m.preco_unitario_pdf}. Desconto aplicado.`,
                vencedor: false
            }));

            // Se houver novos produtos criados, precisamos adicioná-los à cotação original
            if (novosItensCotacao.length > 0) {
                // Atualiza cotação com novos itens
                const cotacaoAtualizada = await base44.entities.Cotacao.get(cotacao.id);
                const itensAtualizados = [...cotacaoAtualizada.itens, ...novosItensCotacao];
                await base44.entities.Cotacao.update(cotacao.id, { itens: itensAtualizados });
            }

            onImportComplete(finalFornecedorId, respostas, aiData.financeiro.desconto_global);
            onClose();
            toast({ title: "Importação concluída com sucesso!", className: "bg-green-100 text-green-800" });

        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Importar Cotação via PDF (IA)</DialogTitle>
                </DialogHeader>

                {step === 'upload' && (
                    <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                        <Upload className="w-12 h-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Upload do PDF da Cotação</h3>
                        <p className="text-sm text-gray-500 mb-6">A IA irá ler os itens, preços e identificar o fornecedor.</p>
                        <div className="relative">
                            <input 
                                type="file" 
                                accept=".pdf"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={isUploading}
                            />
                            <Button disabled={isUploading}>
                                {isUploading ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando...</>
                                ) : (
                                    "Selecionar Arquivo"
                                )}
                            </Button>
                        </div>
                        {isUploading && <p className="text-xs text-gray-400 mt-4">Isso pode levar alguns segundos...</p>}
                    </div>
                )}

                {step === 'processing' && (
                    <div className="py-12 flex flex-col items-center justify-center">
                        <Loader2 className="w-16 h-16 text-teal-600 animate-spin mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Processando com Inteligência Artificial...</h3>
                        <p className="text-sm text-gray-500">Extraindo dados e buscando correspondências.</p>
                    </div>
                )}

                {step === 'review' && aiData && (
                    <div className="space-y-6">
                        {/* 1. Supplier Identification */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Dados do Fornecedor Identificado
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-xs">Fornecedor no Sistema</Label>
                                    <Select 
                                        value={fornecedorInfo.id} 
                                        onValueChange={(v) => setFornecedorInfo({...fornecedorInfo, id: v})}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new">+ Criar Novo Fornecedor</SelectItem>
                                            {fornecedoresSistema.map(f => (
                                                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {fornecedorInfo.id === 'new' && (
                                    <>
                                        <div>
                                            <Label className="text-xs">Nome Identificado</Label>
                                            <Input 
                                                value={fornecedorInfo.nome} 
                                                onChange={e => setFornecedorInfo({...fornecedorInfo, nome: e.target.value})} 
                                                className="bg-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">CNPJ Identificado</Label>
                                            <Input 
                                                value={fornecedorInfo.cnpj} 
                                                onChange={e => setFornecedorInfo({...fornecedorInfo, cnpj: e.target.value})} 
                                                className="bg-white"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 2. Financial Summary */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-3 bg-gray-50 rounded border">
                                <p className="text-xs text-gray-500">Subtotal (Itens)</p>
                                <p className="font-medium">R$ {aiData.financeiro.subtotal?.toFixed(2)}</p>
                            </div>
                            <div className="p-3 bg-orange-50 rounded border border-orange-100">
                                <p className="text-xs text-orange-700">Desconto Global Detectado</p>
                                <p className="font-bold text-orange-700">R$ {aiData.financeiro.desconto_global?.toFixed(2)}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded border border-green-100">
                                <p className="text-xs text-green-700">Total Final</p>
                                <p className="font-bold text-green-700">R$ {aiData.financeiro.total_final?.toFixed(2)}</p>
                            </div>
                        </div>
                        {aiData.financeiro.desconto_global > 0 && (
                            <p className="text-xs text-gray-500 italic">
                                * O desconto global será rateado proporcionalmente no preço unitário de cada item importado.
                            </p>
                        )}

                        {/* 3. Items Matching */}
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-gray-100">
                                    <TableRow>
                                        <TableHead className="w-[50px]">Imp.</TableHead>
                                        <TableHead>Item no PDF (Descrição / Código)</TableHead>
                                        <TableHead>Qtd / Preço PDF</TableHead>
                                        <TableHead>Correspondência no Sistema</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mappings.map((m, idx) => (
                                        <TableRow key={idx} className={m.ignored ? 'opacity-50 bg-gray-50' : ''}>
                                            <TableCell>
                                                <Checkbox 
                                                    checked={!m.ignored} 
                                                    onCheckedChange={(checked) => {
                                                        const newMappings = [...mappings];
                                                        newMappings[idx].ignored = !checked;
                                                        setMappings(newMappings);
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-sm">{m.descricao_pdf}</div>
                                                <div className="text-xs text-gray-500">{m.codigo_pdf || '-'}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{m.quantidade_pdf} x R$ {m.preco_unitario_pdf?.toFixed(2)}</div>
                                                <div className="font-bold text-xs">Total: R$ {(m.quantidade_pdf * m.preco_unitario_pdf)?.toFixed(2)}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Select 
                                                    value={m.selected_product_id} 
                                                    onValueChange={(v) => {
                                                        const newMappings = [...mappings];
                                                        newMappings[idx].selected_product_id = v;
                                                        newMappings[idx].ignored = false; // Auto select un-ignores
                                                        setMappings(newMappings);
                                                    }}
                                                    disabled={m.ignored}
                                                >
                                                    <SelectTrigger className="w-full h-9 text-xs">
                                                        <SelectValue placeholder="Selecione o produto..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {/* First show products from current quotation for easy access */}
                                                        <SelectItem value="create_new" className="text-teal-600 font-semibold bg-teal-50">
                                                            + Cadastrar: {m.descricao_pdf}
                                                        </SelectItem>
                                                        <SelectItem value={null} disabled>-- Da Cotação --</SelectItem>
                                                        {cotacao.itens.map(i => (
                                                            <SelectItem key={i.produto_id} value={i.produto_id}>
                                                                {i.produto_nome}
                                                            </SelectItem>
                                                        ))}
                                                        <SelectItem value="separator" disabled>-- Outros Produtos --</SelectItem>
                                                        {produtosSistema
                                                            .filter(p => !cotacao.itens.find(ci => ci.produto_id === p.id))
                                                            .slice(0, 20)
                                                            .map(p => (
                                                                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                                                            ))
                                                        }
                                                    </SelectContent>
                                                </Select>
                                                {m.confianca_match && !m.ignored && (
                                                    <div className={`text-[10px] mt-1 flex items-center gap-1 ${
                                                        m.confianca_match === 'alta' ? 'text-green-600' : 'text-amber-600'
                                                    }`}>
                                                        {m.confianca_match === 'alta' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                        Confiança IA: {m.confianca_match}
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === 'review' ? (
                        <>
                            <Button variant="outline" onClick={() => setStep('upload')}>Voltar / Reenviar</Button>
                            <Button onClick={handleConfirmImport} className="bg-teal-600 hover:bg-teal-700">
                                Confirmar Importação
                            </Button>
                        </>
                    ) : (
                        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}