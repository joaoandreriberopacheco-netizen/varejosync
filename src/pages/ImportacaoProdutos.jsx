import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Upload, CheckCircle, AlertTriangle, Loader2, FileText, X, History } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import HistoricoImportacoes from '../components/produtos/HistoricoImportacoes';
import { createPageUrl } from '@/components/utils';
import { Link } from 'react-router-dom';
import OperacaoAuthenticator from '@/components/auth/OperacaoAuthenticator';
import { getTenantId } from '@/components/utils/tenant';

export default function ImportacaoProdutos() {
  const [step, setStep] = useState(1); // 1: Upload, 2: Validação, 3: Importação
  const [file, setFile] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState({ step: '', progress: 0 });
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isHistoricoOpen, setIsHistoricoOpen] = useState(false);
  const [importacoes, setImportacoes] = useState([]);
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const cacheRef = useRef({ categorias: null, fornecedores: null, produtos: null });

  const loadHistorico = async () => {
    setIsLoadingHistorico(true);
    try {
      const logs = await base44.entities.ImportacaoLog.list('-created_date', 50);
      setImportacoes(logs);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setIsLoadingHistorico(false);
    }
  };

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
    setValidationProgress({ step: 'Lendo arquivo...', progress: 10 });

    try {
      const text = await file.text();
      
      setValidationProgress({ step: 'Carregando dados do sistema...', progress: 20 });

      let categorias = cacheRef.current.categorias;
      let fornecedores = cacheRef.current.fornecedores;
      let produtosExistentes = cacheRef.current.produtos;

      if (!categorias) {
        await new Promise(resolve => setTimeout(resolve, 300));
        categorias = await base44.entities.Categoria.list();
        cacheRef.current.categorias = categorias;
      }

      setValidationProgress({ step: 'Carregando fornecedores...', progress: 35 });

      if (!fornecedores) {
        await new Promise(resolve => setTimeout(resolve, 300));
        fornecedores = await base44.entities.Terceiro.filter({ tipo: 'Fornecedor' });
        cacheRef.current.fornecedores = fornecedores;
      }

      setValidationProgress({ step: 'Carregando produtos existentes...', progress: 50 });

      if (!produtosExistentes) {
        await new Promise(resolve => setTimeout(resolve, 300));
        produtosExistentes = await base44.entities.Produto.list();
        cacheRef.current.produtos = produtosExistentes;
      }

      setValidationProgress({ step: 'Identificando formato...', progress: 65 });

      const linhas = text.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim());
      if (linhas.length < 2) {
        throw new Error("Arquivo vazio ou com dados insuficientes");
      }

      const primeiraLinha = linhas[0];
      const separador = primeiraLinha.includes(';') ? ';' : (primeiraLinha.includes(',') ? ',' : '\t');
      
      const headers = primeiraLinha.split(separador).map(h => h.trim().toUpperCase());
      
      console.log('📋 Cabeçalhos detectados:', headers);
      console.log('🔍 Separador detectado:', separador);
      
      const mapearColuna = (nomesOpcoes) => {
        for (const nome of nomesOpcoes) {
          const idx = headers.findIndex(h => h === nome.toUpperCase());
          if (idx >= 0) return idx;
        }
        return -1;
      };

      const mapeamento = {
        separador,
        indice_codigo_barras: mapearColuna(['CODIGO_BARRAS', 'COD_BARRAS', 'BARCODE', 'EAN']),
        indice_nome: mapearColuna(['NOME', 'PRODUTO', 'DESCRICAO', 'DESCRIPTION']),
        indice_categoria: mapearColuna(['CATEGORIA', 'CATEGORY']),
        indice_marca: mapearColuna(['MARCA', 'BRAND']),
        indice_fornecedor: mapearColuna(['FORNECEDOR_CODIGO', 'FORNECEDOR', 'SUPPLIER']),
        indice_valor_compra: mapearColuna(['VALOR_COMPRA', 'CUSTO', 'COST']),
        indice_frete: mapearColuna(['FRETE_PERCENTUAL', 'FRETE', 'FREIGHT']),
        indice_imposto1: mapearColuna(['IMPOSTO1_PERCENTUAL', 'IMPOSTO1', 'IPI']),
        indice_imposto2: mapearColuna(['IMPOSTO2_PERCENTUAL', 'IMPOSTO2', 'ICMS']),
        indice_desconto: mapearColuna(['DESCONTO_COMERCIAL_PERCENTUAL', 'DESCONTO']),
        indice_outros: mapearColuna(['OUTROS_CUSTOS_PERCENTUAL', 'OUTROS']),
        indice_preco_venda: mapearColuna(['PRECO_VENDA', 'PRECO', 'PRICE']),
        indice_estoque_minimo: mapearColuna(['ESTOQUE_MINIMO', 'MIN']),
        indice_estoque_ideal: mapearColuna(['ESTOQUE_IDEAL', 'IDEAL']),
        indice_estoque_maximo: mapearColuna(['ESTOQUE_MAXIMO', 'MAX']),
        indice_estoque_atual: mapearColuna(['ESTOQUE_ATUAL', 'ESTOQUE', 'STOCK']),
        indice_unidade: mapearColuna(['UNIDADE_PRINCIPAL', 'UNIDADE', 'UNIT']),
        indice_tempo_reposicao: mapearColuna(['TEMPO_REPOSICAO_DIAS', 'TEMPO_REPOSICAO', 'LEAD_TIME']),
        indice_peso: mapearColuna(['PESO_KG', 'PESO', 'WEIGHT']),
        indice_dimensoes: mapearColuna(['DIMENSOES_CM', 'DIMENSOES', 'DIMENSIONS']),
        indice_tags: mapearColuna(['TAGS', 'KEYWORDS'])
      };

      console.log('🗺️ Mapeamento de colunas:', mapeamento);
      
      if (mapeamento.indice_nome === -1 || mapeamento.indice_preco_venda === -1) {
        throw new Error(`Colunas obrigatórias não encontradas. Necessário: NOME (${mapeamento.indice_nome}) e PRECO_VENDA (${mapeamento.indice_preco_venda}). Cabeçalhos: ${headers.join(', ')}`);
      }

      setValidationProgress({ step: 'Processando todos os produtos...', progress: 75 });

      const linhasDados = linhas.slice(1);
      const produtosIA = [];

      for (let i = 0; i < linhasDados.length; i++) {
        const cols = linhasDados[i].split(separador).map(c => c.trim());
        
        const getCol = (idx) => idx >= 0 && idx < cols.length ? cols[idx] : '';
        const getNum = (idx) => {
          const val = getCol(idx);
          if (!val) return 0;
          const num = parseFloat(val.replace(',', '.'));
          return isNaN(num) ? 0 : num;
        };

        const nome = getCol(mapeamento.indice_nome);
        const preco = getNum(mapeamento.indice_preco_venda);

        if (!nome || !preco) continue;

        produtosIA.push({
          nome,
          preco_venda: preco,
          codigo_barras: getCol(mapeamento.indice_codigo_barras),
          categoria_nome: getCol(mapeamento.indice_categoria),
          fornecedor_codigo: getCol(mapeamento.indice_fornecedor),
          marca: getCol(mapeamento.indice_marca),
          valor_compra: getNum(mapeamento.indice_valor_compra),
          frete_percentual: getNum(mapeamento.indice_frete),
          imposto1_percentual: getNum(mapeamento.indice_imposto1),
          imposto2_percentual: getNum(mapeamento.indice_imposto2),
          desconto_comercial_percentual: getNum(mapeamento.indice_desconto),
          outros_custos_percentual: getNum(mapeamento.indice_outros),
          estoque_minimo: getNum(mapeamento.indice_estoque_minimo),
          estoque_ideal: getNum(mapeamento.indice_estoque_ideal),
          estoque_maximo: getNum(mapeamento.indice_estoque_maximo),
          estoque_atual: getNum(mapeamento.indice_estoque_atual),
          unidade_principal: getCol(mapeamento.indice_unidade),
          tempo_reposicao_dias: getNum(mapeamento.indice_tempo_reposicao),
          peso_kg: getNum(mapeamento.indice_peso),
          dimensoes_cm: getCol(mapeamento.indice_dimensoes),
          tags: getCol(mapeamento.indice_tags)
        });

        if (i % 100 === 0) {
          setValidationProgress({ 
            step: `Processando ${i}/${linhasDados.length} produtos...`, 
            progress: 75 + Math.floor((i / linhasDados.length) * 10)
          });
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      setValidationProgress({ step: 'Processando resultados...', progress: 85 });
      
      console.log(`✅ ${produtosIA.length} produtos processados`);
      
      if (produtosIA.length === 0) {
        throw new Error("Nenhum produto válido encontrado no arquivo. Verifique se as colunas NOME e PRECO_VENDA estão preenchidas.");
      }

      let novos = 0;
      let atualizacoes = 0;

      produtosIA.forEach(prod => {
        if (prod.codigo_barras) {
          const existe = produtosExistentes.find(p => 
            p.codigo_barras?.toUpperCase() === prod.codigo_barras?.toUpperCase()
          );
          if (existe) atualizacoes++;
          else novos++;
        } else {
          novos++;
        }
      });

      cacheRef.current.produtosIA = produtosIA;

      setValidationProgress({ step: 'Finalizando...', progress: 100 });

      setValidationResult({
        success: true,
        totalLinhas: produtosIA.length,
        novos,
        atualizacoes,
        totalCategorias: categorias.length,
        totalFornecedores: fornecedores.length
      });

      toast({
        title: "Validação concluída!",
        description: `${produtosIA.length} produtos reconhecidos`,
        className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      });

      setTimeout(() => setStep(2), 100);
    } catch (error) {
      console.error('Erro detalhado na validação:', error);
      
      setValidationResult({
        success: false,
        error: error.message,
        totalLinhas: 0
      });
      
      toast({
        title: "Erro na análise",
        description: error.message,
        variant: "destructive",
        duration: 5000
      });

      setTimeout(() => setStep(2), 100);
    } finally {
      setIsValidating(false);
      setValidationProgress({ step: '', progress: 0 });
    }
  };

  const handleInitiateImport = () => {
    console.log('Iniciando autenticação para importação...');
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = async () => {
    console.log('Autenticação bem-sucedida, iniciando importação...');
    setIsAuthOpen(false);
    setStep(3);
    setIsImporting(true);

    try {
      const produtosIA = cacheRef.current.produtosIA || [];
      const categorias = cacheRef.current.categorias;
      const fornecedores = cacheRef.current.fornecedores;
      const produtosExistentes = cacheRef.current.produtos;
      const tenantId = getTenantId();

      setImportProgress({ current: 0, total: produtosIA.length });

      const produtosCriadosIds = [];
      const produtosAtualizadosData = [];

      for (let i = 0; i < produtosIA.length; i++) {
        const prod = produtosIA[i];
        
        if (!prod.nome || !prod.preco_venda) continue;

        const codigoBarras = prod.codigo_barras?.toUpperCase() || null;
        const existe = codigoBarras ? produtosExistentes.find(p => 
          p.codigo_barras?.toUpperCase() === codigoBarras
        ) : null;

        const valorCompra = prod.valor_compra || 0;
        const fretePerc = prod.frete_percentual || 0;
        const imp1Perc = prod.imposto1_percentual || 0;
        const imp2Perc = prod.imposto2_percentual || 0;
        const descPerc = prod.desconto_comercial_percentual || 0;
        const outrosPerc = prod.outros_custos_percentual || 0;

        const frete = valorCompra * (fretePerc / 100);
        const imp1 = valorCompra * (imp1Perc / 100);
        const imp2 = valorCompra * (imp2Perc / 100);
        const desc = valorCompra * (descPerc / 100);
        const outros = valorCompra * (outrosPerc / 100);
        const custoTotal = valorCompra + frete + imp1 + imp2 + outros - desc;

        let precoVendaTipo = 'numerico';
        let precoVendaPerc = 0;
        if (prod.preco_venda > 0 && custoTotal > 0) {
          precoVendaPerc = ((prod.preco_venda - custoTotal) / custoTotal) * 100;
          precoVendaTipo = 'percentual';
        }

        const categoria = categorias.find(c => 
          c.nome?.toUpperCase() === prod.categoria_nome?.toUpperCase()
        );
        
        const fornecedor = fornecedores.find(f => 
          f.codigo_interno === prod.fornecedor_codigo
        );

        const tags = prod.tags ? prod.tags.split(',').map(t => t.trim().toUpperCase()).filter(t => t) : [];

        const produtoData = {
          empresa_id: tenantId,
          codigo_barras: codigoBarras,
          nome: prod.nome.toUpperCase(),
          categoria_id: categoria?.id || null,
          categoria_nome: categoria?.nome || null,
          marca: prod.marca?.toUpperCase() || '',
          fornecedor_padrao_id: fornecedor?.id || null,
          fornecedor_padrao_codigo: fornecedor?.codigo_interno || null,
          valor_compra: valorCompra,
          custo_frete_padrao: fretePerc,
          custo_imposto1_padrao: imp1Perc,
          custo_imposto2_padrao: imp2Perc,
          desconto_compra_padrao: descPerc,
          custo_outros_padrao: outrosPerc,
          preco_custo_calculado: custoTotal,
          preco_venda_padrao: prod.preco_venda,
          preco_venda_tipo: precoVendaTipo,
          preco_venda_percentual: precoVendaPerc,
          estoque_minimo: prod.estoque_minimo || 0,
          estoque_ideal: prod.estoque_ideal || 0,
          estoque_maximo: prod.estoque_maximo || 0,
          estoque_atual: prod.estoque_atual || 0,
          unidade_principal: prod.unidade_principal?.toUpperCase() || 'UN',
          tempo_reposicao_dias: prod.tempo_reposicao_dias || 0,
          peso_kg: prod.peso_kg || 0,
          dimensoes_cm: prod.dimensoes_cm?.toUpperCase() || '',
          tags,
          tipo: 'Produto',
          ativo: true
        };

        if (existe) {
          produtosAtualizadosData.push({
            id: existe.id,
            dados_anteriores: {
              nome: existe.nome,
              preco_venda_padrao: existe.preco_venda_padrao,
              preco_custo_calculado: existe.preco_custo_calculado,
              valor_compra: existe.valor_compra,
              estoque_atual: existe.estoque_atual
            }
          });
          await base44.entities.Produto.update(existe.id, produtoData);
        } else {
          const criado = await base44.entities.Produto.create(produtoData);
          produtosCriadosIds.push(criado.id);
        }

        await new Promise(resolve => setTimeout(resolve, 150));
        setImportProgress({ current: i + 1, total: produtosIA.length });
      }

      const allLogs = await base44.entities.ImportacaoLog.list();
      const nextNumber = allLogs.length + 1;

      await base44.entities.ImportacaoLog.create({
        numero: `IMP-${String(nextNumber).padStart(5, '0')}`,
        tipo: 'Produtos',
        status: 'Concluída',
        total_novos: validationResult.novos,
        total_atualizados: validationResult.atualizacoes,
        produtos_ids: produtosCriadosIds,
        produtos_atualizados: produtosAtualizadosData,
        arquivo_nome: file.name
      });

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
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">
              Importação de Produtos
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Importe produtos em lote via arquivo CSV
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadHistorico();
              setIsHistoricoOpen(true);
            }}
            className="gap-2 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <History className="w-4 h-4" />
            Histórico
          </Button>
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

                  {file && !isValidating && (
                    <Button
                      onClick={handleValidateFile}
                      className="gap-2 mt-4 w-full"
                    >
                      Validar e Continuar
                    </Button>
                  )}

                  {file && isValidating && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {validationProgress.step}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {validationProgress.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gray-800 dark:bg-white h-full transition-all duration-500 rounded-full"
                          style={{ width: `${validationProgress.progress}%` }}
                        />
                      </div>
                    </div>
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
                  <Button 
                    variant="outline" 
                    onClick={() => { 
                      setStep(1); 
                      setFile(null); 
                      setValidationResult(null); 
                    }} 
                    className="flex-1"
                    disabled={isImporting}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleInitiateImport} 
                    className="flex-1 gap-2"
                    disabled={isImporting}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      'Confirmar Importação'
                    )}
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

      <HistoricoImportacoes
        isOpen={isHistoricoOpen}
        onClose={() => setIsHistoricoOpen(false)}
        importacoes={importacoes}
        onRefresh={loadHistorico}
      />
    </div>
  );
}