import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Loader2, AlertCircle, Check, FileText, X, ArrowLeft, Package } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function ImportadorCotacaoPDF({ isOpen, onClose, cotacao, onImportComplete }) {
    const [step, setStep] = useState('upload');
    const [isUploading, setIsUploading] = useState(false);
    const [aiData, setAiData] = useState(null);
    const [mappings, setMappings] = useState([]);
    const [fornecedorInfo, setFornecedorInfo] = useState({ nome: '', cnpj: '', id: 'new' });
    const [produtosSistema, setProdutosSistema] = useState([]);
    const [fornecedoresSistema, setFornecedoresSistema] = useState([]);
    const { toast } = useToast();

    const formatCurrency = (value) => {
        const num = parseFloat(value) || 0;
        return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setStep('processing');

        try {
            const uploadRes = await base44.integrations.Core.UploadFile({ file });
            const fileUrl = uploadRes.file_url;

            const [produtos, fornecedores] = await Promise.all([
                base44.entities.Produto.filter({ tipo: 'Produto', ativo: true }),
                base44.entities.Terceiro.filter({ tipo: ['Fornecedor', 'Ambos'] })
            ]);
            setProdutosSistema(produtos);
            setFornecedoresSistema(fornecedores);

            const prompt = `
                Analise este PDF de cotação/orçamento de fornecedor.
                Extraia os dados do fornecedor e a lista de itens.
                
                IMPORTANTE: Para cada item, identifique a MARCA do produto (ex: Tramontina, Vonder, Stanley, etc).
                A marca é um critério qualitativo fundamental para comparação de cotações.
                
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
                            "marca_pdf": "string (marca do produto identificada no PDF)",
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
                                    marca_pdf: { type: "string" },
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
            
            // Defensive check for itens array
            const itens = Array.isArray(result.itens) ? result.itens : [];
            setMappings(itens.map(item => ({
                ...item,
                selected_product_id: item.produto_sistema_match_id || '',
                ignored: !item.produto_sistema_match_id
            })));

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

            if (finalFornecedorId === 'new') {
                const novoFornecedor = await base44.entities.Terceiro.create({
                    nome: fornecedorInfo.nome,
                    cpf_cnpj: fornecedorInfo.cnpj,
                    tipo: 'Fornecedor',
                    ativo: true
                });
                finalFornecedorId = novoFornecedor.id;
            }

            const validItems = mappings.filter(m => !m.ignored && m.selected_product_id);
            
            const processedItems = [];
            const novosItensCotacao = [];

            for (const m of validItems) {
                let produtoId = m.selected_product_id;

                if (produtoId === 'create_new') {
                    try {
                        const novoProduto = await base44.entities.Produto.create({
                            nome: m.descricao_pdf,
                            marca: m.marca_pdf || '',
                            codigo_interno: 'IMP-' + Math.floor(Math.random() * 10000),
                            tipo: 'Produto',
                            preco_venda_padrao: m.preco_unitario_pdf * 1.5,
                            valor_compra: m.preco_unitario_pdf,
                            unidade_principal: 'UN',
                            ativo: true
                        });
                        produtoId = novoProduto.id;
                        
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

            const subtotalItens = processedItems.reduce((sum, m) => sum + (m.quantidade_pdf * m.preco_unitario_pdf), 0);
            let discountRatio = 1;
            const descontoGlobal = aiData.financeiro?.desconto_global || 0;
            if (descontoGlobal > 0 && subtotalItens > 0) {
                discountRatio = 1 - (descontoGlobal / subtotalItens);
            }

            const respostas = processedItems.map(m => ({
                fornecedor_id: finalFornecedorId,
                produto_id: m.final_product_id,
                preco_unitario: m.preco_unitario_pdf * discountRatio,
                quantidade_ofertada: m.quantidade_pdf,
                marca: m.marca_pdf || m.descricao_pdf,
                observacao: `Importado via PDF. Preço original: R$ ${m.preco_unitario_pdf.toFixed(2)}${m.marca_pdf ? '. Marca: ' + m.marca_pdf : ''}`,
                vencedor: false
            }));

            if (novosItensCotacao.length > 0) {
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-10">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg">
                                <X className="w-5 h-5" />
                            </Button>
                            <div>
                                <h2 className="text-xl font-medium text-gray-900 dark:text-white">Importar Cotação via PDF</h2>
                                <p className="text-sm text-gray-500">A IA irá extrair itens, preços e marcas automaticamente</p>
                            </div>
                        </div>
                        {step === 'review' && (
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setStep('upload')} className="gap-2">
                                    <ArrowLeft className="w-4 h-4" />
                                    Reenviar
                                </Button>
                                <Button onClick={handleConfirmImport} className="bg-teal-600 hover:bg-teal-700 gap-2">
                                    <Check className="w-4 h-4" />
                                    Confirmar Importação
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
                        <div className="py-20 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                            <Upload className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-6" />
                            <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-2">Upload do PDF da Cotação</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md">
                                A IA irá ler os itens, identificar marcas, preços e fornecedor
                            </p>
                            <div className="relative">
                                <input 
                                    type="file" 
                                    accept=".pdf"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={isUploading}
                                />
                                <Button disabled={isUploading} size="lg" className="bg-teal-600 hover:bg-teal-700">
                                    {isUploading ? (
                                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analisando...</>
                                    ) : (
                                        "Selecionar Arquivo PDF"
                                    )}
                                </Button>
                            </div>
                            {isUploading && <p className="text-sm text-gray-400 mt-6">Isso pode levar alguns segundos...</p>}
                        </div>
                    </div>
                )}

                {step === 'processing' && (
                    <div className="max-w-2xl mx-auto py-20 flex flex-col items-center justify-center">
                        <Loader2 className="w-20 h-20 text-teal-600 animate-spin mb-6" />
                        <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-2">Processando com IA...</h3>
                        <p className="text-gray-500 dark:text-gray-400">Extraindo dados, marcas e buscando correspondências</p>
                    </div>
                )}

                {step === 'review' && aiData && (
                    <div className="space-y-8">
                        {/* Supplier Info */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl">
                            <div className="flex items-center gap-3 mb-6">
                                <FileText className="w-5 h-5 text-gray-400" />
                                <h4 className="font-medium text-gray-900 dark:text-white">Dados do Fornecedor Identificado</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2">Fornecedor no Sistema</Label>
                                    <Select 
                                        value={fornecedorInfo.id} 
                                        onValueChange={(v) => setFornecedorInfo({...fornecedorInfo, id: v})}
                                    >
                                        <SelectTrigger className="bg-white dark:bg-gray-900">
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
                                            <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2">Nome Identificado</Label>
                                            <Input 
                                                value={fornecedorInfo.nome} 
                                                onChange={e => setFornecedorInfo({...fornecedorInfo, nome: e.target.value})} 
                                                className="bg-white dark:bg-gray-900"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2">CNPJ Identificado</Label>
                                            <Input 
                                                value={fornecedorInfo.cnpj} 
                                                onChange={e => setFornecedorInfo({...fornecedorInfo, cnpj: e.target.value})} 
                                                className="bg-white dark:bg-gray-900"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Financial Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Subtotal (Itens)</p>
                                <p className="text-2xl font-light text-gray-900 dark:text-white">
                                    R$ {formatCurrency(aiData.financeiro?.subtotal || 0)}
                                </p>
                            </div>
                            <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-2xl">
                                <p className="text-sm text-orange-700 dark:text-orange-400 mb-2">Desconto Global Detectado</p>
                                <p className="text-2xl font-light text-orange-700 dark:text-orange-400">
                                    R$ {formatCurrency(aiData.financeiro?.desconto_global || 0)}
                                </p>
                            </div>
                            <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl">
                                <p className="text-sm text-green-700 dark:text-green-400 mb-2">Total Final</p>
                                <p className="text-2xl font-light text-green-700 dark:text-green-400">
                                    R$ {formatCurrency(aiData.financeiro?.total_final || 0)}
                                </p>
                            </div>
                        </div>
                        {(aiData.financeiro?.desconto_global || 0) > 0 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic -mt-4">
                                * O desconto global será rateado proporcionalmente no preço unitário de cada item importado.
                            </p>
                        )}

                        {/* Items Table */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <Package className="w-5 h-5 text-gray-400" />
                                    <h4 className="font-medium text-gray-900 dark:text-white">Itens para Importação</h4>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">Imp.</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item / Código / Marca</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd / Preço</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correspondência</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {mappings.map((m, idx) => (
                                            <tr key={idx} className={`${m.ignored ? 'opacity-40 bg-gray-50 dark:bg-gray-900/20' : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/50'} transition-colors`}>
                                                <td className="px-6 py-4">
                                                    <Checkbox 
                                                        checked={!m.ignored} 
                                                        onCheckedChange={(checked) => {
                                                            const newMappings = [...mappings];
                                                            newMappings[idx].ignored = !checked;
                                                            setMappings(newMappings);
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900 dark:text-white mb-1">{m.descricao_pdf}</div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        {m.codigo_pdf && (
                                                            <span className="text-gray-500 dark:text-gray-400">Cód: {m.codigo_pdf}</span>
                                                        )}
                                                        {m.marca_pdf && (
                                                            <span className="px-2 py-0.5 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 rounded-md font-medium">
                                                                {m.marca_pdf}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-gray-700 dark:text-gray-300 mb-1">
                                                        {m.quantidade_pdf} × R$ {formatCurrency(m.preco_unitario_pdf)}
                                                    </div>
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        Total: R$ {formatCurrency(m.quantidade_pdf * m.preco_unitario_pdf)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Select 
                                                        value={m.selected_product_id} 
                                                        onValueChange={(v) => {
                                                            const newMappings = [...mappings];
                                                            newMappings[idx].selected_product_id = v;
                                                            newMappings[idx].ignored = false;
                                                            setMappings(newMappings);
                                                        }}
                                                        disabled={m.ignored}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Selecione o produto..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="create_new" className="text-teal-600 font-semibold">
                                                                + Cadastrar: {m.descricao_pdf}
                                                            </SelectItem>
                                                            <div className="px-2 py-1.5 text-xs text-gray-500 font-medium">Da Cotação</div>
                                                            {cotacao.itens.map(i => (
                                                                <SelectItem key={i.produto_id} value={i.produto_id}>
                                                                    {i.produto_nome}
                                                                </SelectItem>
                                                            ))}
                                                            <div className="px-2 py-1.5 text-xs text-gray-500 font-medium">Outros Produtos</div>
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
                                                        <div className={`flex items-center gap-1.5 mt-2 text-xs ${
                                                            m.confianca_match === 'alta' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                                                        }`}>
                                                            {m.confianca_match === 'alta' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                            Confiança IA: {m.confianca_match}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}