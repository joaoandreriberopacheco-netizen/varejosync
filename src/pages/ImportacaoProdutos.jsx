import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Upload, CheckCircle, AlertTriangle, Loader2, FileText, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { createPageUrl } from '@/components/utils';
import { Link } from 'react-router-dom';
import OperacaoAuthenticator from '@/components/auth/OperacaoAuthenticator';
import { getTenantId } from '@/components/utils/tenant';

export default function ImportacaoProdutos() {
  const [step, setStep] = useState(1); // 1: Upload, 2: Validação, 3: Importação
  const [file, setFile] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleDownloadTemplate = async () => {
    try {
      const categorias = await base44.entities.Categoria.list();
      const fornecedores = await base44.entities.Terceiro.filter({ tipo: 'Fornecedor' });

      let csvContent = "\uFEFF";
      csvContent += "CODIGO_BARRAS;NOME;CATEGORIA;MARCA;FORNECEDOR_CODIGO;VALOR_COMPRA;FRETE_PERCENTUAL;IMPOSTO1_PERCENTUAL;IMPOSTO2_PERCENTUAL;DESCONTO_COMERCIAL_PERCENTUAL;OUTROS_CUSTOS_PERCENTUAL;PRECO_VENDA;ESTOQUE_MINIMO;ESTOQUE_IDEAL;ESTOQUE_MAXIMO;ESTOQUE_ATUAL;UNIDADE_PRINCIPAL;TEMPO_REPOSICAO_DIAS;PESO_KG;DIMENSOES_CM;TAGS;OBSERVACOES\n";
      csvContent += "7891234567890;PRODUTO EXEMPLO;MATERIAIS DE CONSTRUÇÃO;MARCA EXEMPLO;FOR-00001;100.00;5.00;10.00;2.00;1.50;0.50;150.00;10;50;100;25;UN;15;2.5;30X20X15;HIDRAULICA,TORNEIRA;PRODUTO DE EXEMPLO PARA IMPORTAÇÃO\n";

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `template_importacao_produtos_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Template baixado",
        description: "Use este arquivo como base para importação",
        className: "bg-gray-100 text-gray-800"
      });
    } catch (error) {
      toast({ title: "Erro ao gerar template", description: error.message, variant: "destructive" });
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidationResult(null);
    }
  };

  const handleValidateFile = async () => {
    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo CSV primeiro.",
        variant: "destructive"
      });
      return;
    }
    
    setIsValidating(true);

    try {
      const text = await file.text();
      const linhas = text.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim());
      
      if (linhas.length < 2) {
        throw new Error("Arquivo vazio ou sem dados válidos");
      }

      const headers = linhas[0].split(';').map(h => h.trim().toUpperCase());
      
      const requiredHeaders = ['NOME', 'PRECO_VENDA'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

      if (missingHeaders.length > 0) {
        setValidationResult({
          success: false,
          error: `Colunas obrigatórias ausentes: ${missingHeaders.join(', ')}`,
          totalLinhas: 0
        });
        setIsValidating(false);
        return;
      }

      const produtosValidos = linhas.slice(1).filter(linha => {
        const cols = linha.split(';');
        return cols.length >= 2;
      });

      if (produtosValidos.length === 0) {
        throw new Error("Nenhum produto válido encontrado no arquivo");
      }

      const [categorias, fornecedores, produtosExistentes] = await Promise.all([
        base44.entities.Categoria.list(),
        base44.entities.Terceiro.filter({ tipo: 'Fornecedor' }),
        base44.entities.Produto.list()
      ]);
      
      let novos = 0;
      let atualizacoes = 0;

      produtosValidos.forEach(linha => {
        const cols = linha.split(';');
        const codigoBarras = cols[headers.indexOf('CODIGO_BARRAS')]?.trim().toUpperCase();
        if (codigoBarras) {
          const existe = produtosExistentes.find(p => p.codigo_barras === codigoBarras);
          if (existe) atualizacoes++;
          else novos++;
        } else {
          novos++;
        }
      });

      setValidationResult({
        success: true,
        totalLinhas: produtosValidos.length,
        novos,
        atualizacoes,
        totalCategorias: categorias.length,
        totalFornecedores: fornecedores.length
      });

      toast({
        title: "Arquivo validado!",
        description: `${produtosValidos.length} produtos prontos para importar.`,
        className: "bg-green-100 text-green-800"
      });

      setStep(2);
    } catch (error) {
      console.error("Erro na validação:", error);
      setValidationResult({
        success: false,
        error: error.message,
        totalLinhas: 0
      });
      
      toast({
        title: "Erro na validação",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleInitiateImport = () => {
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = async () => {
    setIsAuthOpen(false);
    setStep(3);
    setIsImporting(true);

    try {
      const text = await file.text();
      const linhas = text.split('\n').filter(l => l.trim());
      const headers = linhas[0].split(';').map(h => h.trim());

      const categorias = await base44.entities.Categoria.list();
      const fornecedores = await base44.entities.Terceiro.filter({ tipo: 'Fornecedor' });
      const produtosExistentes = await base44.entities.Produto.list();
      const tenantId = getTenantId();

      const produtosParaImportar = [];
      const linhasDados = linhas.slice(1);

      setImportProgress({ current: 0, total: linhasDados.length });

      for (let i = 0; i < linhasDados.length; i++) {
        const linha = linhasDados[i];
        const cols = linha.split(';');
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = cols[idx]?.trim() || ''; });

        const codigoBarras = obj.CODIGO_BARRAS?.toUpperCase();
        if (!codigoBarras || !obj.NOME) continue;

        const existe = produtosExistentes.find(p => p.codigo_barras === codigoBarras);

        const parseNum = (val) => {
          if (!val) return 0;
          const num = parseFloat(String(val).replace(',', '.'));
          return isNaN(num) ? 0 : num;
        };

        const valorCompra = parseNum(obj.VALOR_COMPRA);
        const fretePercentual = parseNum(obj.FRETE_PERCENTUAL);
        const imposto1Percentual = parseNum(obj.IMPOSTO1_PERCENTUAL);
        const imposto2Percentual = parseNum(obj.IMPOSTO2_PERCENTUAL);
        const descontoComercialPercentual = parseNum(obj.DESCONTO_COMERCIAL_PERCENTUAL);
        const outrosCustosPercentual = parseNum(obj.OUTROS_CUSTOS_PERCENTUAL);
        const precoVenda = parseNum(obj.PRECO_VENDA);

        const frete = valorCompra * (fretePercentual / 100);
        const imposto1 = valorCompra * (imposto1Percentual / 100);
        const imposto2 = valorCompra * (imposto2Percentual / 100);
        const desconto = valorCompra * (descontoComercialPercentual / 100);
        const outros = valorCompra * (outrosCustosPercentual / 100);
        const custoTotal = valorCompra + frete + imposto1 + imposto2 + outros - desconto;

        let precoVendaTipo = 'numerico';
        let precoVendaPercentual = 0;
        if (precoVenda > 0 && custoTotal > 0) {
          precoVendaPercentual = ((precoVenda - custoTotal) / custoTotal) * 100;
          precoVendaTipo = 'percentual';
        }

        const categoria = categorias.find(c => c.nome?.toUpperCase() === obj.CATEGORIA?.toUpperCase());
        const fornecedor = fornecedores.find(f => f.codigo_interno?.toUpperCase() === obj.FORNECEDOR_CODIGO?.toUpperCase());

        const tags = obj.TAGS ? obj.TAGS.split(',').map(t => t.trim().toUpperCase()).filter(t => t) : [];

        const produtoData = {
          empresa_id: tenantId,
          codigo_barras: codigoBarras,
          nome: obj.NOME?.toUpperCase(),
          categoria_id: categoria?.id || null,
          categoria_nome: categoria?.nome || null,
          marca: obj.MARCA?.toUpperCase() || '',
          fornecedor_padrao_id: fornecedor?.id || null,
          fornecedor_padrao_codigo: fornecedor?.codigo_interno || null,
          valor_compra: valorCompra,
          custo_frete_padrao: fretePercentual,
          custo_imposto1_padrao: imposto1Percentual,
          custo_imposto2_padrao: imposto2Percentual,
          desconto_compra_padrao: descontoComercialPercentual,
          custo_outros_padrao: outrosCustosPercentual,
          preco_custo_calculado: custoTotal,
          preco_venda_padrao: precoVenda,
          preco_venda_tipo: precoVendaTipo,
          preco_venda_percentual: precoVendaPercentual,
          estoque_minimo: parseNum(obj.ESTOQUE_MINIMO),
          estoque_ideal: parseNum(obj.ESTOQUE_IDEAL),
          estoque_maximo: parseNum(obj.ESTOQUE_MAXIMO),
          estoque_atual: parseNum(obj.ESTOQUE_ATUAL),
          unidade_principal: obj.UNIDADE_PRINCIPAL?.toUpperCase() || 'UN',
          tempo_reposicao_dias: parseNum(obj.TEMPO_REPOSICAO_DIAS),
          peso_kg: parseNum(obj.PESO_KG),
          dimensoes_cm: obj.DIMENSOES_CM?.toUpperCase() || '',
          tags,
          tipo: 'Produto',
          ativo: true
        };

        if (existe) {
          await base44.entities.Produto.update(existe.id, produtoData);
        } else {
          await base44.entities.Produto.create(produtoData);
        }

        setImportProgress({ current: i + 1, total: linhasDados.length });
      }

      toast({
        title: "✓ Importação Concluída!",
        description: `${validationResult.novos} produtos criados, ${validationResult.atualizacoes} atualizados.`,
        className: "bg-green-100 text-green-800",
        duration: 5000
      });

      setTimeout(() => {
        window.location.href = createPageUrl('Produtos');
      }, 2000);

    } catch (error) {
      toast({ title: "Erro na importação", description: error.message, variant: "destructive" });
      setStep(2);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Produtos')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">
              Importação de Produtos
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Importe produtos em lote via arquivo CSV
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                step >= s 
                  ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900 shadow-md' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
              }`}>
                {step > s ? <CheckCircle className="w-5 h-5" /> : <span className="text-sm font-medium">{s}</span>}
              </div>
              {s < 3 && <div className={`w-16 h-0.5 ${step > s ? 'bg-gray-800 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <Download className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    1. Baixe o template CSV
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Use nosso modelo com todas as colunas necessárias
                  </p>
                  <Button onClick={handleDownloadTemplate} className="gap-2">
                    <Download className="w-4 h-4" />
                    Baixar Template
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <Upload className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    2. Selecione o arquivo preenchido
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Formato CSV com separador ponto-e-vírgula (;)
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {!file ? (
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Selecionar Arquivo
                    </Button>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFile(null)}
                        className="rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {file && (
                    <Button
                      onClick={handleValidateFile}
                      disabled={isValidating}
                      className="gap-2 mt-4 w-full"
                    >
                      {isValidating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Validando...
                        </>
                      ) : (
                        'Validar e Continuar'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Validation Result */}
        {step === 2 && validationResult && (
          <div className="space-y-6">
            {validationResult.success ? (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Arquivo validado com sucesso!
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total de Linhas</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {validationResult.totalLinhas}
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                      <p className="text-xs text-green-700 dark:text-green-400 mb-1">Novos Produtos</p>
                      <p className="text-2xl font-semibold text-green-700 dark:text-green-400">
                        {validationResult.novos}
                      </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                      <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">Atualizações</p>
                      <p className="text-2xl font-semibold text-blue-700 dark:text-blue-400">
                        {validationResult.atualizacoes}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Categorias</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {validationResult.totalCategorias}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setStep(1); setFile(null); setValidationResult(null); }} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleInitiateImport} className="flex-1 gap-2">
                    Confirmar Importação
                  </Button>
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm">
                <div className="flex items-start gap-3 mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Erro na validação
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {validationResult.error}
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => { setStep(1); setFile(null); setValidationResult(null); }}>
                  Voltar
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 3 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-gray-600 dark:text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Importando produtos...
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Por favor, aguarde. Não feche esta página.
              </p>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Progresso
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {importProgress.current} / {importProgress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gray-800 dark:bg-white h-full transition-all duration-300 rounded-full"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <OperacaoAuthenticator
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
        operationName="Importação de Produtos"
      />
    </div>
  );
}