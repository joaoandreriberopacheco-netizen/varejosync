import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload, Search, Save, Building2, FileText } from 'lucide-react';

export default function DadosEmpresaManager() {
    const [empresa, setEmpresa] = useState({
        razao_social: '',
        nome_fantasia: '',
        cnpj: '',
        inscricao_estadual: '',
        inscricao_municipal: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        telefone: '',
        email: '',
        site: '',
        atividade_principal: '',
        natureza_juridica: '',
        situacao_cadastral: '',
        data_abertura: '',
        porte: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const dados = await base44.entities.DadosEmpresa.list();
            if (dados && dados.length > 0) {
                setEmpresa(dados[0]);
            }
        } catch (error) {
            console.error("Erro ao carregar dados da empresa:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (empresa.id) {
                await base44.entities.DadosEmpresa.update(empresa.id, empresa);
            } else {
                const newEmpresa = await base44.entities.DadosEmpresa.create(empresa);
                setEmpresa(newEmpresa);
            }
            toast({
                title: "Dados salvos",
                description: "Informações da empresa atualizadas com sucesso.",
                className: "bg-green-100 text-green-800"
            });
        } catch (error) {
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const uploadRes = await base44.integrations.Core.UploadFile({ file });
            const fileUrl = uploadRes.file_url;

            const prompt = `
                Extraia os dados do Cartão CNPJ deste arquivo PDF/Imagem.
                Retorne um JSON com as seguintes chaves (se encontrar):
                razao_social (Nome Empresarial),
                nome_fantasia (Nome Fantasia),
                cnpj (Número de Inscrição),
                data_abertura (Data de Abertura, formato YYYY-MM-DD),
                natureza_juridica (Código e Descrição),
                atividade_principal (Código e Descrição),
                endereco (Logradouro),
                numero,
                complemento,
                bairro,
                cidade (Município),
                estado (UF),
                cep,
                email (Endereço Eletrônico),
                telefone,
                situacao_cadastral,
                porte
            `;

            const aiRes = await base44.integrations.Core.InvokeLLM({
                prompt: prompt,
                file_urls: [fileUrl],
                response_json_schema: {
                    type: "object",
                    properties: {
                        razao_social: { type: "string" },
                        nome_fantasia: { type: "string" },
                        cnpj: { type: "string" },
                        data_abertura: { type: "string" },
                        natureza_juridica: { type: "string" },
                        atividade_principal: { type: "string" },
                        endereco: { type: "string" },
                        numero: { type: "string" },
                        complemento: { type: "string" },
                        bairro: { type: "string" },
                        cidade: { type: "string" },
                        estado: { type: "string" },
                        cep: { type: "string" },
                        email: { type: "string" },
                        telefone: { type: "string" },
                        situacao_cadastral: { type: "string" },
                        porte: { type: "string" }
                    }
                }
            });

            const extractedData = typeof aiRes === 'string' ? JSON.parse(aiRes) : aiRes;

            setEmpresa(prev => ({
                ...prev,
                ...extractedData
            }));

            toast({
                title: "Importação concluída",
                description: "Dados extraídos do arquivo com sucesso. Verifique e salve.",
                className: "bg-blue-100 text-blue-800"
            });

        } catch (error) {
            console.error(error);
            toast({
                title: "Erro na importação",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsImporting(false);
            e.target.value = null; // Reset input
        }
    };

    const handleConsultarCNPJ = async () => {
        if (!empresa.cnpj) {
            toast({ title: "Informe o CNPJ", description: "Digite o CNPJ para consultar.", variant: "destructive" });
            return;
        }

        setIsSearching(true);
        try {
            // Simulating a search using LLM + Internet since we don't have a direct CNPJ API tool
            // In a real scenario, we would use a specialized API or the integration if available.
            const prompt = `
                Busque na internet os dados públicos da empresa com CNPJ ${empresa.cnpj}.
                Preciso de: Razão Social, Nome Fantasia, Endereço completo, Atividade Principal.
                Retorne em JSON.
            `;

            const aiRes = await base44.integrations.Core.InvokeLLM({
                prompt: prompt,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        razao_social: { type: "string" },
                        nome_fantasia: { type: "string" },
                        endereco: { type: "string" },
                        bairro: { type: "string" },
                        cidade: { type: "string" },
                        estado: { type: "string" },
                        cep: { type: "string" },
                        atividade_principal: { type: "string" }
                    }
                }
            });
            
            const searchResult = typeof aiRes === 'string' ? JSON.parse(aiRes) : aiRes;

             setEmpresa(prev => ({
                ...prev,
                razao_social: searchResult.razao_social || prev.razao_social,
                nome_fantasia: searchResult.nome_fantasia || prev.nome_fantasia,
                endereco: searchResult.endereco || prev.endereco,
                bairro: searchResult.bairro || prev.bairro,
                cidade: searchResult.cidade || prev.cidade,
                estado: searchResult.estado || prev.estado,
                cep: searchResult.cep || prev.cep,
                atividade_principal: searchResult.atividade_principal || prev.atividade_principal
            }));

             toast({
                title: "Consulta concluída",
                description: "Dados encontrados e preenchidos.",
                className: "bg-blue-100 text-blue-800"
            });

        } catch (error) {
             toast({
                title: "Erro na consulta",
                description: "Não foi possível encontrar dados para este CNPJ.",
                variant: "destructive"
            });
        } finally {
            setIsSearching(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
    }

    return (
        <div className="space-y-4 md:space-y-6 font-glacial">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-lg md:text-2xl font-medium text-slate-800 dark:text-slate-100 tracking-tight">Dados da Empresa</h2>
                    <p className="text-xs md:text-sm text-slate-500 font-light">Informações cadastrais para emissão de documentos</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <input
                            type="file"
                            accept=".pdf,image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={handleFileUpload}
                            disabled={isImporting}
                        />
                        <Button variant="outline" className="gap-2 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100" disabled={isImporting}>
                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Importar Cartão CNPJ
                        </Button>
                    </div>
                    <Button onClick={handleSave} className="gap-2 bg-green-600 hover:bg-green-700" disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar Alterações
                    </Button>
                </div>
            </div>

            <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm md:text-lg font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-sky-500" />
                        Identificação
                    </CardTitle>
                    <p className="text-[10px] md:text-xs text-slate-500 font-light">Dados principais de registro da empresa</p>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="md:col-span-1">
                            <Label>CNPJ</Label>
                            <div className="flex gap-2 mt-1.5">
                                <Input 
                                    value={empresa.cnpj} 
                                    onChange={e => setEmpresa({...empresa, cnpj: e.target.value})} 
                                    placeholder="00.000.000/0000-00"
                                />
                                <Button size="icon" variant="outline" onClick={handleConsultarCNPJ} disabled={isSearching} title="Consultar na Web">
                                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <Label>Razão Social</Label>
                            <Input 
                                value={empresa.razao_social} 
                                onChange={e => setEmpresa({...empresa, razao_social: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Nome Fantasia</Label>
                            <Input 
                                value={empresa.nome_fantasia} 
                                onChange={e => setEmpresa({...empresa, nome_fantasia: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label>Atividade Principal</Label>
                            <Input 
                                value={empresa.atividade_principal} 
                                onChange={e => setEmpresa({...empresa, atividade_principal: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <Label>Natureza Jurídica</Label>
                            <Input 
                                value={empresa.natureza_juridica} 
                                onChange={e => setEmpresa({...empresa, natureza_juridica: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label>Situação Cadastral</Label>
                            <Input 
                                value={empresa.situacao_cadastral} 
                                onChange={e => setEmpresa({...empresa, situacao_cadastral: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label>Data Abertura</Label>
                            <Input 
                                type="date" // Simple date input, could be formatted better
                                value={empresa.data_abertura ? empresa.data_abertura.split('T')[0] : ''} 
                                onChange={e => setEmpresa({...empresa, data_abertura: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label>Porte</Label>
                            <Input 
                                value={empresa.porte} 
                                onChange={e => setEmpresa({...empresa, porte: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <Label>Inscrição Estadual</Label>
                            <Input 
                                value={empresa.inscricao_estadual} 
                                onChange={e => setEmpresa({...empresa, inscricao_estadual: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label>Inscrição Municipal</Label>
                            <Input 
                                value={empresa.inscricao_municipal} 
                                onChange={e => setEmpresa({...empresa, inscricao_municipal: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm md:text-lg font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-sky-500" />
                        Endereço e Contato
                    </CardTitle>
                    <p className="text-[10px] md:text-xs text-slate-500 font-light">Localização e canais de comunicação</p>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3">
                            <Label>Logradouro</Label>
                            <Input 
                                value={empresa.endereco} 
                                onChange={e => setEmpresa({...empresa, endereco: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label>Número</Label>
                            <Input 
                                value={empresa.numero} 
                                onChange={e => setEmpresa({...empresa, numero: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div>
                            <Label>Complemento</Label>
                            <Input 
                                value={empresa.complemento} 
                                onChange={e => setEmpresa({...empresa, complemento: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label>Bairro</Label>
                            <Input 
                                value={empresa.bairro} 
                                onChange={e => setEmpresa({...empresa, bairro: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                         <div>
                            <Label>CEP</Label>
                            <Input 
                                value={empresa.cep} 
                                onChange={e => setEmpresa({...empresa, cep: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>Cidade</Label>
                            <Input 
                                value={empresa.cidade} 
                                onChange={e => setEmpresa({...empresa, cidade: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label>Estado (UF)</Label>
                            <Input 
                                value={empresa.estado} 
                                onChange={e => setEmpresa({...empresa, estado: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label>Telefone</Label>
                            <Input 
                                value={empresa.telefone} 
                                onChange={e => setEmpresa({...empresa, telefone: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Email</Label>
                            <Input 
                                value={empresa.email} 
                                onChange={e => setEmpresa({...empresa, email: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label>Site</Label>
                            <Input 
                                value={empresa.site} 
                                onChange={e => setEmpresa({...empresa, site: e.target.value})} 
                                className="mt-1.5"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}