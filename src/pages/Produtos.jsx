import React, { useState, useEffect, useMemo } from 'react';
// entities imported via base44 client
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  PlusCircle,
  Edit,
  Download,
  Upload,
  Package,
  DollarSign,
  MoreHorizontal,
  Archive,
  Copy,
  TrendingUp,
  CheckCircle,
  Loader2,
  RefreshCw,
  Columns,
  Search,
  Image as ImageIcon,
  Sparkles,
  Wand2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from '@/api/base44Client';


import ProdutoFormCompleto from '../components/produtos/ProdutoFormCompleto';
import PullToRefreshWrapper from '@/components/ui/PullToRefreshWrapper';
import ColumnSelector from '../components/produtos/ColumnSelector';
import MassTagGenerator from '../components/produtos/MassTagGenerator';
import MassImageUploader from '../components/produtos/MassImageUploader';
import TabelaDinamica from '../components/produtos/TabelaDinamica';
import TreeGrid, { LevelControl } from '../components/produtos/treegrid/TreeGrid';
import MobileHierarquica from '../components/produtos/MobileHierarquica';
import ProdutoFAB from '../components/produtos/ProdutoFAB';


const isCadastroIncompleto = (produto) => {
  const checks = {
    semCategoria: !produto.categoria_nome,
    semFornecedor: !produto.fornecedor_padrao_id,
    semPrecoVenda: !produto.preco_venda_padrao || produto.preco_venda_padrao <= 0,
    semCodigoBarras: !produto.codigo_barras,
    semImagem: !produto.imagem_url
  };
  const totalIncompleto = Object.values(checks).filter(Boolean).length;
  return { incompleto: totalIncompleto > 0, totalIncompleto, checks };
};

const getStockStatusIndicator = (produto) => {
  if (!produto.ativo) {
    return <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-xs"><div className="w-2 h-2 bg-gray-600 rounded-full" /> Inativo</div>;
  }
  const estoque = produto.estoque_atual || 0;
  const minimo = produto.estoque_minimo || 0;

  if (estoque <= 0) {
    return <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs"><div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" /> Crítico</div>;
  }
  if (estoque <= minimo / 2) {
    return <div className="flex items-center gap-1.5 text-red-500 dark:text-red-300 text-xs"><div className="w-2 h-2 bg-red-500 rounded-full" /> Crítico</div>;
  }
  if (estoque <= minimo) {
    return <div className="flex items-center gap-1.5 text-orange-500 dark:text-orange-300 text-xs"><div className="w-2 h-2 bg-orange-500 rounded-full" /> Baixo</div>;
  }
  return <div className="flex items-center gap-1.5 text-green-500 dark:text-green-300 text-xs"><div className="w-2 h-2 bg-green-500 rounded-full" /> OK</div>;
};

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [stats, setStats] = useState({ total: 0, valorEstoque: 0, abaixoMinimo: 0 });

  const [filters, setFilters] = useState({
    searchTerm: '',
    categoria: 'all',
    fornecedorId: 'all',
    statusEstoque: 'all',
    cadastroIncompleto: 'all'
  });
  const [sortOrder, setSortOrder] = useState('az');
  const [viewMode, setViewMode] = useState('dinamica'); // 'dinamica' | 'plana'

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState(null);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState([
    'status', 'fornecedor', 'estoque_atual', 'preco_venda', 'margem'
  ]);
  // ── Nível de expansão do TreeGrid (controlado pelo painel fixo externo) ─────
  const [treeLevel, setTreeLevel] = useState(1);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMassImageUploaderOpen, setIsMassImageUploaderOpen] = useState(false);
  // States for unified import (products + costs)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

  // States for costs only import (original functionality, kept for now but could be refactored)
  const [isImportCustosDialogOpen, setIsImportCustosDialogOpen] = useState(false);
  const [importCustosFile, setImportCustosFile] = useState(null);
  const [isProcessingCustos, setIsProcessingCustos] = useState(false);
  const [previewCustosData, setPreviewCustosData] = useState(null);
  const [isPreviewCustosDialogOpen, setIsPreviewCustosDialogOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [produtosData, fornecedoresData] = await Promise.all([
      base44.entities.Produto.list('-created_date'),
      base44.entities.Terceiro.list()
    ]);
    
    // Defensive filtering to ensure only valid objects with proper prototypes are used
    const safeProdutos = Array.isArray(produtosData) 
      ? produtosData.filter(p => p && typeof p === 'object' && p !== null) 
      : [];
    const safeFornecedores = Array.isArray(fornecedoresData) 
      ? fornecedoresData.filter(f => f && typeof f === 'object' && f !== null && (f.tipo === 'Fornecedor' || f.tipo === 'Ambos')) 
      : [];
    
    setProdutos(safeProdutos);
    setFornecedores(safeFornecedores);

    // Calcular estatísticas e categorias
    let valorTotal = 0;
    let abaixoMin = 0;
    const catSet = new Set();
    safeProdutos.forEach(p => {
      valorTotal += (p.estoque_atual || 0) * (p.preco_custo_calculado || 0);
      if (p.estoque_atual <= p.estoque_minimo && p.ativo) {
        abaixoMin++;
      }
      if(p.categoria_nome) catSet.add(p.categoria_nome);
    });

    setStats({ total: safeProdutos.length, valorEstoque: valorTotal, abaixoMinimo: abaixoMin });
    setCategorias(Array.from(catSet));
  };

  const handleSave = async () => {
    await loadData();
    // setIsFormOpen(false); // Mantendo aberto para feedback
  };

  const handleEdit = React.useCallback((produto) => {
    setSelectedProduto(produto);
    setIsFormOpen(true);
  }, []);

  const handleAddNew = React.useCallback(() => {
    setSelectedProduto(null);
    setIsFormOpen(true);
  }, []);

  const handleFilterChange = React.useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const formatarNumero = React.useCallback((numero) => {
    if (numero === null || numero === undefined) return '0,00';
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, []);

  const handleExportarCatalogo = () => {
    const headers = [
      "codigo_interno",
      "codigo_barras",
      "campo_hierarquico_1",
      "campo_hierarquico_2",
      "campo_hierarquico_3",
      "campo_hierarquico_4",
      "campo_hierarquico_5",
      "nome",
      "campos_pendentes",
      "tipo",
      "categoria",
      "marca",
      "tags",
      "imagem_url",
      "valor_compra",
      "frete_percentual",
      "imposto_1_percentual",
      "imposto_2_percentual",
      "desconto_comercial_percentual",
      "outros_custos_percentual",
      "preco_custo_calculado",
      "fornecedor_codigo",
      "preco_venda_padrao",
      "preco_venda_tipo",
      "preco_venda_percentual",
      "dimensoes_cm",
      "volume_cm3",
      "peso_kg",
      "tempo_reposicao_dias",
      "estoque_atual",
      "estoque_minimo",
      "estoque_ideal",
      "estoque_maximo",
      "estoque_avariado",
      "unidade_principal",
      "unidades_por_pacote",
      "controla_serial",
      "controla_lote_validade",
      "ativo"
    ];

    let csvContent = "\uFEFF";
    csvContent += headers.join(";") + "\n";

    produtos.forEach(p => {
      const fornecedor = fornecedores.find(f => f.id === p.fornecedor_padrao_id);
      const fornecedorCodigo = fornecedor?.codigo_interno || '';
      const tagsString = Array.isArray(p.tags) ? p.tags.join(',') : '';
      
      // Identificar campos pendentes
      const cadastroStatus = isCadastroIncompleto(p);
      const camposPendentes = [];
      if (cadastroStatus.checks.semCategoria) camposPendentes.push('Categoria');
      if (cadastroStatus.checks.semFornecedor) camposPendentes.push('Fornecedor');
      if (cadastroStatus.checks.semPrecoVenda) camposPendentes.push('Preço');
      if (cadastroStatus.checks.semCodigoBarras) camposPendentes.push('Cód.Barras');
      if (cadastroStatus.checks.semImagem) camposPendentes.push('Imagem');
      const camposPendentesString = camposPendentes.length > 0 ? camposPendentes.join(', ') : '';

      const row = [
        p.codigo_interno || '',
        p.codigo_barras || '',
        p.campo_hierarquico_1 || '',
        p.campo_hierarquico_2 || '',
        p.campo_hierarquico_3 || '',
        p.campo_hierarquico_4 || '',
        p.campo_hierarquico_5 || '',
        p.nome || '',
        camposPendentesString,
        p.tipo || 'Produto',
        p.categoria_nome || '',
        p.marca || '',
        tagsString,
        p.imagem_url || '',
        formatarNumero(p.valor_compra || 0),
        formatarNumero(p.custo_frete_padrao || 0),
        formatarNumero(p.custo_imposto1_padrao || 0),
        formatarNumero(p.custo_imposto2_padrao || 0),
        formatarNumero(p.desconto_compra_padrao || 0),
        formatarNumero(p.custo_outros_padrao || 0),
        formatarNumero(p.preco_custo_calculado || 0),
        fornecedorCodigo,
        formatarNumero(p.preco_venda_padrao || 0),
        p.preco_venda_tipo || 'percentual',
        formatarNumero(p.preco_venda_percentual || 0),
        p.dimensoes_cm || '',
        formatarNumero(p.volume_cm3 || 0),
        formatarNumero(p.peso_kg || 0),
        p.tempo_reposicao_dias || 0,
        formatarNumero(p.estoque_atual || 0),
        formatarNumero(p.estoque_minimo || 0),
        formatarNumero(p.estoque_ideal || 0),
        formatarNumero(p.estoque_maximo || 0),
        formatarNumero(p.estoque_avariado || 0),
        p.unidade_principal || 'UN',
        p.unidades_por_pacote || 1,
        p.controla_serial ? 'true' : 'false',
        p.controla_lote_validade ? 'true' : 'false',
        p.ativo ? 'true' : 'false'
      ];
      csvContent += row.join(";") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `catalogo_produtos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Catálogo exportado!",
      description: `${produtos.length} produtos exportados com todos os campos.`,
      className: "bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700",
      duration: 3000
    });
  };



  const handleBaixarTemplateUnificado = () => {
    const headers = [
      "codigo_barras",
      "campo_hierarquico_1",
      "campo_hierarquico_2",
      "campo_hierarquico_3",
      "campo_hierarquico_4",
      "campo_hierarquico_5",
      "nome",
      "tipo",
      "categoria",
      "marca",
      "tags",
      "imagem_url",
      "valor_compra",
      "frete_percentual",
      "imposto_1_percentual",
      "imposto_2_percentual",
      "desconto_comercial_percentual",
      "outros_custos_percentual",
      "fornecedor_codigo",
      "preco_venda_padrao",
      "dimensoes_cm",
      "peso_kg",
      "tempo_reposicao_dias",
      "estoque_atual",
      "estoque_minimo",
      "estoque_ideal",
      "estoque_maximo",
      "estoque_avariado",
      "unidade_principal",
      "unidades_por_pacote",
      "controla_serial",
      "controla_lote_validade",
      "ativo"
    ];
    
    let csvContent = "\uFEFF";
    csvContent += "# TEMPLATE COMPLETO DE IMPORTAÇÃO/ATUALIZAÇÃO DE PRODUTOS\n";
    csvContent += "# Se codigo_barras existir, o produto será ATUALIZADO, senão será CRIADO\n";
    csvContent += "# CAMPO_HIERARQUICO_1: obrigatório (ex: Torneira). Define o agrupamento principal na tabela.\n";
    csvContent += "# CAMPO_HIERARQUICO_2..5: opcionais (ex: Mesa, Cromada, 1/2\", Deca). Formam subgrupos.\n";
    csvContent += "# NOME: deixe vazio para gerar automaticamente pela concatenação dos campos hierárquicos\n";
    csvContent += "# TIPO: Produto ou Serviço\n";
    csvContent += "# TAGS: separadas por vírgula (ex: torneira,banheiro,metais)\n";
    csvContent += "# DIMENSOES: formato AxLxP (ex: 30x20x15)\n";
    csvContent += "# Custos em PERCENTUAL (sistema calcula valor em R$)\n";
    csvContent += "# PRECO_VENDA_PADRAO: informe o valor final de venda (sistema calcula markup automaticamente)\n";
    csvContent += "# ESTOQUE_ATUAL: estoque livre para venda\n";
    csvContent += "# CODIGO_INTERNO: gerado automaticamente, não preencher\n";
    csvContent += "# CONTROLA_SERIAL/LOTE_VALIDADE: true/false\n";
    csvContent += "\n";
    csvContent += headers.join(";") + "\n";
    
    // Linha de exemplo
    const exemplo = [
      "7891234567890",
      "Torneira",
      "Mesa",
      "Cromada",
      "1/2\"",
      "Deca",
      "",
      "Produto",
      "Hidráulica",
      "Deca",
      "torneira,banheiro,metais",
      "",
      "100,00",
      "5",
      "12",
      "9",
      "0",
      "4",
      "FOR-001",
      "180,00",
      "30x20x15",
      "1,5",
      "20",
      "150",
      "50",
      "100",
      "200",
      "0",
      "UN",
      "12",
      "false",
      "false",
      "true"
    ];
    csvContent += exemplo.join(";") + "\n";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `template_produtos_custos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "✓ Template baixado!",
      description: "Preencha produtos e custos conforme os comentários no arquivo.",
      className: "bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700",
      duration: 3000
    });
  };

  const handleProcessarImportacaoUnificada = async () => {
    if (!importFile) {
      toast({ title: "Nenhum arquivo selecionado.", variant: "destructive" });
      return;
    }
    setIsProcessingImport(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: importFile });
      
      const produtosSchema = {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                "codigo_barras": { type: "string" },
                "campo_hierarquico_1": { type: "string" },
                "campo_hierarquico_2": { type: "string" },
                "campo_hierarquico_3": { type: "string" },
                "campo_hierarquico_4": { type: "string" },
                "campo_hierarquico_5": { type: "string" },
                "nome": { type: "string" },
                "tipo": { type: "string" },
                "categoria": { type: "string" },
                "marca": { type: "string" },
                "tags": { type: "string" },
                "imagem_url": { type: "string" },
                "valor_compra": { type: "number" },
                "frete_percentual": { type: "number" },
                "imposto_1_percentual": { type: "number" },
                "imposto_2_percentual": { type: "number" },
                "desconto_comercial_percentual": { type: "number" },
                "outros_custos_percentual": { type: "number" },
                "fornecedor_codigo": { type: "string" },
                "preco_venda_padrao": { type: "number" },
                "dimensoes_cm": { type: "string" },
                "peso_kg": { type: "number" },
                "tempo_reposicao_dias": { type: "number" },
                "estoque_atual": { type: "number" },
                "estoque_minimo": { type: "number" },
                "estoque_ideal": { type: "number" },
                "estoque_maximo": { type: "number" },
                "estoque_avariado": { type: "number" },
                "unidade_principal": { type: "string" },
                "unidades_por_pacote": { type: "number" },
                "controla_serial": { type: "boolean" },
                "controla_lote_validade": { type: "boolean" },
                "ativo": { type: "boolean" }
              },
              required: ["nome"],
              additionalProperties: true
            }
          }
        }
      };
      
      const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({ 
        file_url, 
        json_schema: produtosSchema 
      });

      if (extraction.status !== 'success' || !extraction.output || !extraction.output.data) {
        throw new Error(extraction.details || "Falha ao extrair dados.");
      }

      const importedData = extraction.output.data;
      const resumo = { novos: 0, atualizados: 0, erros: [] };
      const produtosValidados = [];

      for (const linha of importedData) {
        const errosLinha = [];
        
        if (!linha.nome) {
          errosLinha.push("Nome é obrigatório");
        }

        if (errosLinha.length > 0) {
          resumo.erros.push(`Produto '${linha.nome || 'Sem nome'}': ${errosLinha.join(', ')}`);
          continue;
        }

        // Verificar se produto já existe (por código de barras)
        let produtoExistente = null;
        if (linha.codigo_barras) {
          produtoExistente = produtos.find(p => p.codigo_barras === String(linha.codigo_barras));
        }
        const isUpdate = !!produtoExistente;

        // Buscar fornecedor pelo código
        let fornecedor_id = '';
        let fornecedor_codigo = '';
        if (linha.fornecedor_codigo) {
          const forn = fornecedores.find(f => f.codigo_interno === String(linha.fornecedor_codigo)); // Ensure string comparison
          if (forn) {
            fornecedor_id = forn.id;
            fornecedor_codigo = forn.codigo_interno;
          }
        }

        // Parse numerical values, handling potential comma decimals
        const parseNumber = (val) => {
          if (typeof val === 'string') {
            return parseFloat(val.replace(',', '.'));
          }
          return parseFloat(val);
        };

        const valorCompra = parseNumber(linha.valor_compra) || 0;
        const fretePercentual = parseNumber(linha.frete_percentual) || 0;
        const imposto1Percentual = parseNumber(linha.imposto_1_percentual) || 0;
        const imposto2Percentual = parseNumber(linha.imposto_2_percentual) || 0;
        const descontoComercialPercentual = parseNumber(linha.desconto_comercial_percentual) || 0;
        const outrosCustosPercentual = parseNumber(linha.outros_custos_percentual) || 0;

        const frete = valorCompra * (fretePercentual / 100);
        const imposto1 = valorCompra * (imposto1Percentual / 100);
        const imposto2 = valorCompra * (imposto2Percentual / 100);
        const desconto = valorCompra * (descontoComercialPercentual / 100);
        const outros = valorCompra * (outrosCustosPercentual / 100);
        
        // Summing up costs based on the outline's logic
        const custoTotal = valorCompra + frete + imposto1 + imposto2 + outros - desconto;

        // Calculate preço de venda e markup automaticamente
        const precoVenda = parseNumber(linha.preco_venda_padrao) || 0;
        
        // Calcular markup percentual baseado no custo e preço de venda
        let markupPercentual = 0;
        if (custoTotal > 0 && precoVenda > custoTotal) {
          markupPercentual = ((precoVenda - custoTotal) / custoTotal) * 100;
        }

        // Process 'tipo' field (Produto/Serviço or 0/1)
        let tipoProduto = 'Produto'; // Default
        if (linha.tipo && (String(linha.tipo).toLowerCase() === 'serviço' || String(linha.tipo) === '1')) {
          tipoProduto = 'Serviço';
        } else if (linha.tipo && (String(linha.tipo).toLowerCase() === 'produto' || String(linha.tipo) === '0')) {
          tipoProduto = 'Produto';
        }

        // Process 'tags' field
        let tagsArray = [];
        if (linha.tags && typeof linha.tags === 'string') {
          tagsArray = linha.tags.split(',').map(t => t.trim()).filter(t => t);
        }

        // Calculate volume_cm3 if dimensions are provided
        let volume_cm3 = 0;
        if (linha.dimensoes_cm) {
            const parts = String(linha.dimensoes_cm).split('x').map(p => parseFloat(p.trim()));
            if (parts.length === 3 && parts.every(p => !isNaN(p) && p > 0)) {
                volume_cm3 = parts[0] * parts[1] * parts[2];
            }
        }
        
        // Gerar nome automaticamente se vazio, concatenando campos hierárquicos
        const h1 = (linha.campo_hierarquico_1 || linha.nome || '').toString().toUpperCase().trim();
        const h2 = (linha.campo_hierarquico_2 || '').toString().toUpperCase().trim();
        const h3 = (linha.campo_hierarquico_3 || '').toString().toUpperCase().trim();
        const h4 = (linha.campo_hierarquico_4 || '').toString().toUpperCase().trim();
        const h5 = (linha.campo_hierarquico_5 || '').toString().toUpperCase().trim();
        const nomeGerado = linha.nome?.trim()
          ? linha.nome.toUpperCase()
          : [h1, h2, h3, h4, h5].filter(Boolean).join(' | ');

        const produtoData = {
          id: isUpdate ? produtoExistente.id : undefined,
          campo_hierarquico_1: h1,
          campo_hierarquico_2: h2 || undefined,
          campo_hierarquico_3: h3 || undefined,
          campo_hierarquico_4: h4 || undefined,
          campo_hierarquico_5: h5 || undefined,
          nome: nomeGerado,
          codigo_barras: String(linha.codigo_barras || ''),
          tipo: tipoProduto,
          categoria_nome: linha.categoria ? linha.categoria.toUpperCase() : '',
          marca: linha.marca ? linha.marca.toUpperCase() : '',
          tags: tagsArray,
          imagem_url: linha.imagem_url || '',
          preco_venda_padrao: precoVenda,
          preco_venda_tipo: 'percentual',
          preco_venda_percentual: markupPercentual,
          preco_custo_calculado: custoTotal,
          valor_compra: valorCompra,
          unidade_principal: linha.unidade_principal || 'UN',
          unidades_por_pacote: parseInt(linha.unidades_por_pacote) || 1,
          estoque_atual: parseNumber(linha.estoque_atual) || 0,
          estoque_minimo: parseNumber(linha.estoque_minimo) || 0,
          estoque_ideal: parseNumber(linha.estoque_ideal) || 0,
          estoque_maximo: parseNumber(linha.estoque_maximo) || 0,
          estoque_avariado: parseNumber(linha.estoque_avariado) || 0,
          fornecedor_padrao_id: fornecedor_id || null,
          fornecedor_padrao_codigo: fornecedor_codigo || null,
          tempo_reposicao_dias: parseInt(linha.tempo_reposicao_dias) || 0,
          peso_kg: parseNumber(linha.peso_kg) || 0,
          dimensoes_cm: linha.dimensoes_cm || '',
          volume_cm3: volume_cm3,
          custo_frete_padrao: frete,
          custo_imposto1_padrao: imposto1,
          custo_imposto2_padrao: imposto2,
          desconto_compra_padrao: desconto,
          custo_outros_padrao: outros,
          controla_serial: (linha.controla_serial === true || String(linha.controla_serial).toLowerCase() === 'true'),
          controla_lote_validade: (linha.controla_lote_validade === true || String(linha.controla_lote_validade).toLowerCase() === 'true'),
          ativo: (linha.ativo === true || String(linha.ativo).toLowerCase() === 'true')
        };

        produtosValidados.push(produtoData);
        if (isUpdate) {
          resumo.atualizados++;
        } else {
          resumo.novos++;
        }
      }

      setPreviewData({ produtos: produtosValidados, resumo });
      setIsImportDialogOpen(false);
      setIsPreviewDialogOpen(true);

    } catch (error) {
      console.error("Erro no processamento da importação unificada:", error);
      toast({ 
        title: "Erro no Processamento", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsProcessingImport(false);
    }
  };

  const handleConfirmarImportacaoUnificada = async () => {
    if (!previewData) return;
    setIsProcessingImport(true);

    try {
      const BATCH_SIZE = 20;
      const novos = [];
      const atualizacoes = [];

      // Separar novos de atualizações
      for (const produtoData of previewData.produtos) {
        const { custos, id, ...productData } = produtoData;
        if (id) {
          atualizacoes.push({ id, data: productData });
        } else {
          novos.push(productData);
        }
      }

      // Processar atualizações em lotes
      for (let i = 0; i < atualizacoes.length; i += BATCH_SIZE) {
        const batch = atualizacoes.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(item => base44.entities.Produto.update(item.id, item.data)));
      }

      // Processar criações em lotes
      for (let i = 0; i < novos.length; i += BATCH_SIZE) {
        const batch = novos.slice(i, i + BATCH_SIZE);
        await base44.entities.Produto.bulkCreate(batch);
      }

      toast({
        title: "✓ Importação Concluída!",
        description: `${previewData.resumo.novos} criados, ${previewData.resumo.atualizados} atualizados.`,
        className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
        duration: 5000
      });

      setPreviewData(null);
      setIsPreviewDialogOpen(false);
      setImportFile(null);
      await loadData();

    } catch (error) {
      console.error("Erro na importação final unificada:", error);
      toast({ 
        title: "Erro na Importação", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsProcessingImport(false);
    }
  };


  const handleBaixarTemplateCustos = () => {
    const headers = [
      "id_produto",
      "codigo_interno",
      "codigo_barras",
      "nome_produto",
      "novo_valor_compra"
    ];

    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += headers.join(";") + "\n";

    // Adicionar alguns exemplos
    produtos.slice(0, 5).forEach(p => {
      const row = [
        p.id || '',
        p.codigo_interno || '',
        p.codigo_barras || '',
        p.nome || '',
        formatarNumero(p.preco_custo_calculado || 0)
      ];
      csvContent += row.join(";") + "\n";
    });

    // Linha de exemplo
    csvContent += ";SKU-999;7899999999999;Produto Exemplo;100,50\n";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `template_atualizacao_custos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "✓ Template baixado!",
      description: "Preencha com os novos valores de compra e importe.",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
      duration: 3000
    });
  };



  const handleProcessarImportacaoCustos = async () => {
    if (!importCustosFile) {
      toast({ title: "Nenhum arquivo selecionado.", variant: "destructive" });
      return;
    }
    setIsProcessingCustos(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: importCustosFile });

      const custosSchema = {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                "id_produto": { type: "string" },
                "codigo_interno": { type: "string" },
                "codigo_barras": { type: "string" },
                "nome_produto": { type: "string" },
                "novo_valor_compra": { type: "number" }
              },
              required: ["novo_valor_compra"],
              // allow additional properties for flexibility but focus on required ones
              additionalProperties: true
            }
          }
        }
      };

      const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: custosSchema
      });

      if (extraction.status !== 'success' || !extraction.output || !extraction.output.data) {
        throw new Error(extraction.details || "Falha ao extrair dados.");
      }

      const importedData = extraction.output.data;
      const resumo = { atualizacoes: 0, erros: [], naoEncontrados: [] };
      const atualizacoesValidadas = [];

      for (const linha of importedData) {
        const errosLinha = [];
        const parseNumber = (val) => {
          if (typeof val === 'string') {
            return parseFloat(val.replace(',', '.'));
          }
          return parseFloat(val);
        };

        // Validar se tem identificador
        if (!linha.id_produto && !linha.codigo_interno && !linha.codigo_barras) {
          errosLinha.push("Precisa ter id_produto, codigo_interno ou codigo_barras");
        }

        // Validar valor
        const novoValorCompraParsed = parseNumber(linha.novo_valor_compra);
        if (typeof novoValorCompraParsed !== 'number' || isNaN(novoValorCompraParsed) || novoValorCompraParsed <= 0) {
          errosLinha.push("novo_valor_compra deve ser um número maior que zero");
        }

        if (errosLinha.length > 0) {
          const identificadorLinha = linha.nome_produto || linha.codigo_interno || linha.codigo_barras || JSON.stringify(linha);
          resumo.erros.push(`Produto '${identificadorLinha}': ${errosLinha.join(', ')}`);
          continue;
        }

        // Encontrar produto
        let produto = null;
        if (linha.id_produto) {
          produto = produtos.find(p => p.id === linha.id_produto);
        }
        if (!produto && linha.codigo_interno) {
          produto = produtos.find(p => p.codigo_interno === String(linha.codigo_interno));
        }
        if (!produto && linha.codigo_barras) {
          produto = produtos.find(p => p.codigo_barras === String(linha.codigo_barras));
        }

        if (!produto) {
          resumo.naoEncontrados.push(
            linha.nome_produto || String(linha.codigo_interno) || String(linha.codigo_barras) || 'Desconhecido'
          );
          continue;
        }

        const custoAnterior = produto.preco_custo_calculado || 0;
        
        // Recalcular custo total com o novo valor de compra
        const frete = novoValorCompraParsed * ((produto.custo_frete_padrao || 0) / 100);
        const imposto1 = novoValorCompraParsed * ((produto.custo_imposto1_padrao || 0) / 100);
        const imposto2 = novoValorCompraParsed * ((produto.custo_imposto2_padrao || 0) / 100);
        const desconto = novoValorCompraParsed * ((produto.desconto_compra_padrao || 0) / 100);
        const outros = novoValorCompraParsed * ((produto.custo_outros_padrao || 0) / 100);
        const novoCustoTotal = novoValorCompraParsed + frete + imposto1 + imposto2 + outros - desconto;
        
        // Recalcular preço de venda se for tipo percentual
        let novoPrecoVenda = produto.preco_venda_padrao || 0;
        if (produto.preco_venda_tipo === 'percentual') {
          novoPrecoVenda = novoCustoTotal * (1 + (parseFloat(produto.preco_venda_percentual) || 0) / 100);
        }

        const variacaoCusto = custoAnterior > 0 ?
          ((novoCustoTotal - custoAnterior) / custoAnterior) * 100 :
          (novoCustoTotal > 0 ? 100 : 0);

        atualizacoesValidadas.push({
          produto_id: produto.id,
          nome: produto.nome,
          codigo_interno: produto.codigo_interno,
          valor_compra_anterior: custoAnterior,
          novo_valor_compra: novoValorCompraParsed,
          novo_custo_total: novoCustoTotal,
          novo_preco_venda: novoPrecoVenda,
          variacao_custo: variacaoCusto,
          produto_completo: produto
        });

        resumo.atualizacoes++;
      }

      setPreviewCustosData({ atualizacoes: atualizacoesValidadas, resumo });
      setIsImportCustosDialogOpen(false);
      setIsPreviewCustosDialogOpen(true);

    } catch (error) {
      console.error("Erro no processamento da importação:", error);
      toast({
        title: "Erro no Processamento",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessingCustos(false);
    }
  };

  const handleConfirmarImportacaoCustos = async () => {
    if (!previewCustosData) return;
    setIsProcessingCustos(true);

    try {
      for (const atualizacao of previewCustosData.atualizacoes) {
        const produto = atualizacao.produto_completo;
        
        // Recalcular custos percentuais baseados no novo valor de compra
        const frete = atualizacao.novo_valor_compra * ((produto.custo_frete_padrao || 0) / 100);
        const imposto1 = atualizacao.novo_valor_compra * ((produto.custo_imposto1_padrao || 0) / 100);
        const imposto2 = atualizacao.novo_valor_compra * ((produto.custo_imposto2_padrao || 0) / 100);
        const desconto = atualizacao.novo_valor_compra * ((produto.desconto_compra_padrao || 0) / 100);
        const outros = atualizacao.novo_valor_compra * ((produto.custo_outros_padrao || 0) / 100);

        await base44.entities.Produto.update(atualizacao.produto_id, {
          valor_compra: atualizacao.novo_valor_compra,
          preco_custo_calculado: atualizacao.novo_custo_total,
          preco_venda_padrao: atualizacao.novo_preco_venda
        });
      }

      toast({
        title: "✓ Custos Atualizados!",
        description: `${previewCustosData.atualizacoes.length} produtos atualizados com sucesso.`,
        className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
        duration: 5000
      });

      setPreviewCustosData(null);
      setIsPreviewCustosDialogOpen(false);
      setImportCustosFile(null);
      await loadData();

    } catch (error) {
      console.error("Erro na importação final de custos:", error);
      toast({
        title: "Erro na Importação",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessingCustos(false);
    }
  };

  const filteredProdutos = useMemo(() => {
    if (!Array.isArray(produtos)) return [];
    let filtered = produtos.filter(p => {
      if (!p || typeof p !== 'object') return false;
      const nome = p.nome || '';
      const codigo = p.codigo_interno || '';
      
      const searchTermMatch = nome.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                              codigo.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const categoriaMatch = filters.categoria === 'all' || p.categoria_nome === filters.categoria;
      const tagMatch = !filters.tag || (Array.isArray(p.tags) && p.tags.some(t => t && t.toLowerCase().includes(filters.tag.toLowerCase())));
      const fornecedorMatch = filters.fornecedorId === 'all' || p.fornecedor_padrao_id === filters.fornecedorId;

      const statusMatch = () => {
        if (filters.statusEstoque === 'all') return true;
        const estoque = p.estoque_atual || 0;
        const minimo = p.estoque_minimo || 0;

        if (filters.statusEstoque === 'inativo' && !p.ativo) return true;
        if (filters.statusEstoque === 'ok' && p.ativo && estoque > minimo) return true;
        if (filters.statusEstoque === 'baixo' && p.ativo && estoque > 0 && estoque <= minimo) return true;
        if (filters.statusEstoque === 'critico' && p.ativo && (estoque <= 0 || estoque <= minimo/2)) return true;
        return false;
      };

      const cadastroMatch = () => {
        if (filters.cadastroIncompleto === 'all') return true;
        const { incompleto } = isCadastroIncompleto(p);
        if (filters.cadastroIncompleto === 'incompleto') return incompleto;
        if (filters.cadastroIncompleto === 'completo') return !incompleto;
        return false;
      };

      return searchTermMatch && categoriaMatch && tagMatch && fornecedorMatch && statusMatch() && cadastroMatch();
    });

    if (sortOrder === 'az') {
      filtered = [...filtered].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    } else if (sortOrder === 'za') {
      filtered = [...filtered].sort((a, b) => (b.nome || '').localeCompare(a.nome || ''));
    }

    return filtered;
  }, [produtos, filters, sortOrder]);

  const fornecedorMap = useMemo(() => {
    return fornecedores.reduce((acc, f) => {
      acc[f.id] = f.nome;
      return acc;
    }, {});
  }, [fornecedores]);

  const activeFilterCount = [
    filters.categoria !== 'all' && filters.categoria,
    filters.fornecedorId !== 'all' && filters.fornecedorId,
    filters.statusEstoque !== 'all' && filters.statusEstoque,
    filters.tag,
    filters.cadastroIncompleto !== 'all' && filters.cadastroIncompleto,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full overflow-hidden w-full max-w-full bg-white dark:bg-gray-900">
      {/* Header - mobile-first compacto */}
      <div className="flex-none bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 w-full min-w-0">
        <div className="w-full min-w-0 px-3 py-2 space-y-2">

          {/* Linha 1: título + KPIs + ações */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate font-glacial">Catálogo</h1>
              <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                <span>{stats.total} produtos</span>
                <span>R$ {formatarNumero(stats.valorEstoque)}</span>
                {stats.abaixoMinimo > 0 && <span className="text-red-500">{stats.abaixoMinimo} abaixo mín.</span>}
              </div>
            </div>

            {/* Ações - ícones puros */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleExportarCatalogo} title="Exportar">
                <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9" title="Importar">
                    <Upload className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                  <DropdownMenuItem onClick={handleBaixarTemplateUnificado} className="dark:text-gray-200 dark:hover:bg-gray-700 text-sm">
                    <Download className="w-4 h-4 mr-2" />Template
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="dark:text-gray-200 dark:hover:bg-gray-700 text-sm">
                    <Link to={createPageUrl('ImportacaoProdutos')}>
                      <Upload className="w-4 h-4 mr-2" />Importar CSV
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsMassImageUploaderOpen(true)} className="dark:text-gray-200 dark:hover:bg-gray-700 text-sm">
                    <ImageIcon className="w-4 h-4 mr-2" />Importar Imagens
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9" title="IA">
                    <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                  <DropdownMenuItem asChild className="dark:text-gray-200 dark:hover:bg-gray-700 text-sm">
                    <Link to={createPageUrl('OtimizacaoEstoqueIA')}>
                      <Sparkles className="w-4 h-4 mr-2 text-purple-500" />Otimizar Estoque
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="dark:text-gray-200 dark:hover:bg-gray-700 text-sm">
                    <Link to={createPageUrl('EstimativaEmbalagensIA')}>
                      <Wand2 className="w-4 h-4 mr-2 text-blue-500" />Estimar Embalagens
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={handleAddNew} variant="ghost" size="icon" className="h-9 w-9" title="Novo produto">
                <PlusCircle className="h-4 w-4 text-gray-700 dark:text-gray-300" />
              </Button>
            </div>
          </div>

          {/* Linha 2: Busca + filtros */}
          <div className="flex gap-2 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <Input
                placeholder="Buscar produto..."
                className="border-none bg-gray-100 dark:bg-gray-800 h-10 text-sm pl-9 text-gray-700 dark:text-gray-200 shadow-none focus-visible:ring-0 w-full min-w-0 rounded-xl"
                value={filters.searchTerm}
                onChange={e => handleFilterChange('searchTerm', e.target.value)}
              />
            </div>
            {/* Botão filtros - mobile: abre drawer / desktop: inline */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-10 w-10 flex-shrink-0 rounded-xl relative md:hidden ${activeFilterCount > 0 ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800'}`}
              onClick={() => setIsFilterOpen(v => !v)}
            >
              <SlidersHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900 text-[10px] rounded-full flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Filtros expandíveis no mobile */}
          {isFilterOpen && (
            <div className="md:hidden space-y-2 pb-1">
              <Select value={filters.categoria === 'all' ? '' : filters.categoria} onValueChange={v => handleFilterChange('categoria', v)}>
                <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-10 text-sm w-full rounded-xl">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="all" className="text-sm">Todas as categorias</SelectItem>
                  {categorias.map(cat => <SelectItem key={cat} value={cat} className="text-sm">{cat}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.fornecedorId === 'all' ? '' : filters.fornecedorId} onValueChange={v => handleFilterChange('fornecedorId', v)}>
                <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-10 text-sm w-full rounded-xl">
                  <SelectValue placeholder="Fornecedor" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="all" className="text-sm">Todos os fornecedores</SelectItem>
                  {fornecedores.map(f => <SelectItem key={f.id} value={f.id} className="text-sm">{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.statusEstoque === 'all' ? '' : filters.statusEstoque} onValueChange={v => handleFilterChange('statusEstoque', v)}>
                <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-10 text-sm w-full rounded-xl">
                  <SelectValue placeholder="Status do estoque" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="all" className="text-sm">Todos os status</SelectItem>
                  <SelectItem value="ok" className="text-sm">OK</SelectItem>
                  <SelectItem value="baixo" className="text-sm">Baixo</SelectItem>
                  <SelectItem value="critico" className="text-sm">Crítico</SelectItem>
                  <SelectItem value="inativo" className="text-sm">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  placeholder="Tag"
                  className="bg-gray-100 dark:bg-gray-800 border-none h-10 text-sm rounded-xl flex-1"
                  value={filters.tag || ''}
                  onChange={e => handleFilterChange('tag', e.target.value)}
                />
                <Select value={filters.cadastroIncompleto === 'all' ? '' : filters.cadastroIncompleto} onValueChange={v => handleFilterChange('cadastroIncompleto', v)}>
                  <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-10 text-sm rounded-xl flex-1">
                    <SelectValue placeholder="Cadastro" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    <SelectItem value="all" className="text-sm">Todos</SelectItem>
                    <SelectItem value="incompleto" className="text-sm">Incompleto</SelectItem>
                    <SelectItem value="completo" className="text-sm">Completo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setFilters({ searchTerm: filters.searchTerm, categoria: 'all', fornecedorId: 'all', statusEstoque: 'all', tag: '', cadastroIncompleto: 'all' })}
                  className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Limpar filtros
                </button>
              )}
            </div>
          )}

          {/* Filtros inline - DESKTOP */}
          <div className="hidden md:grid md:grid-cols-5 gap-2">
            <Select value={filters.categoria === 'all' ? '' : filters.categoria} onValueChange={v => handleFilterChange('categoria', v)}>
              <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-9 text-xs w-full rounded-lg">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="all" className="text-xs">Todas as categorias</SelectItem>
                {categorias.map(cat => <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.fornecedorId === 'all' ? '' : filters.fornecedorId} onValueChange={v => handleFilterChange('fornecedorId', v)}>
              <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-9 text-xs w-full rounded-lg">
                <SelectValue placeholder="Fornecedor" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="all" className="text-xs">Todos os fornecedores</SelectItem>
                {fornecedores.map(f => <SelectItem key={f.id} value={f.id} className="text-xs">{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.statusEstoque === 'all' ? '' : filters.statusEstoque} onValueChange={v => handleFilterChange('statusEstoque', v)}>
              <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-9 text-xs w-full rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="all" className="text-xs">Todos os status</SelectItem>
                <SelectItem value="ok" className="text-xs">OK</SelectItem>
                <SelectItem value="baixo" className="text-xs">Baixo</SelectItem>
                <SelectItem value="critico" className="text-xs">Crítico</SelectItem>
                <SelectItem value="inativo" className="text-xs">Inativo</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Tag"
              className="bg-gray-100 dark:bg-gray-800 border-none h-9 text-xs rounded-lg"
              value={filters.tag || ''}
              onChange={e => handleFilterChange('tag', e.target.value)}
            />
            <Select value={filters.cadastroIncompleto === 'all' ? '' : filters.cadastroIncompleto} onValueChange={v => handleFilterChange('cadastroIncompleto', v)}>
              <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-9 text-xs w-full rounded-lg">
                <SelectValue placeholder="Cadastro" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="all" className="text-xs">Todos</SelectItem>
                <SelectItem value="incompleto" className="text-xs">Incompleto</SelectItem>
                <SelectItem value="completo" className="text-xs">Completo</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>
      </div>

      {/* Tabela - SCROLL INDEPENDENTE */}
      <div className="flex-1 overflow-hidden w-full min-w-0">
        <div className="h-full w-full min-w-0 px-3 md:px-4 pb-4">
          <div className="h-full flex flex-col">
            {/* Painel de Comando Fixo — NÃO rola com a tabela */}
            <div className="flex items-center justify-between py-2 flex-none flex-wrap gap-2">
              <div className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-3">
                <span>{filteredProdutos.length} produto{filteredProdutos.length !== 1 ? 's' : ''}</span>
                {filteredProdutos.length > 0 && (
                  <>
                    <MassTagGenerator products={filteredProdutos} onComplete={loadData} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                          {sortOrder === 'az' ? (
                            <TrendingUp className="w-3.5 h-3.5 rotate-90" />
                          ) : (
                            <TrendingUp className="w-3.5 h-3.5 -rotate-90" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="dark:bg-gray-800 dark:border-gray-700">
                        <DropdownMenuItem onClick={() => setSortOrder('az')} className="dark:text-gray-200 dark:hover:bg-gray-700 text-xs">A → Z</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortOrder('za')} className="dark:text-gray-200 dark:hover:bg-gray-700 text-xs">Z → A</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
              <div className="hidden md:flex items-center gap-2 flex-wrap">
                {/* Seletor de Nível — só aparece no Tree Grid */}
                {viewMode === 'dinamica' && (
                  <LevelControl level={treeLevel} onChange={setTreeLevel} />
                )}
                {/* Toggle Tabela Dinâmica / Plana */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded p-0.5 gap-0.5">
                  <button
                    onClick={() => setViewMode('dinamica')}
                    className={`text-[10px] px-2 py-1 rounded transition-colors ${viewMode === 'dinamica' ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm font-medium' : 'text-gray-400 dark:text-gray-500'}`}
                  >
                    Tree Grid
                  </button>
                  <button
                    onClick={() => setViewMode('plana')}
                    className={`text-[10px] px-2 py-1 rounded transition-colors ${viewMode === 'plana' ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm font-medium' : 'text-gray-400 dark:text-gray-500'}`}
                  >
                    Plana
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsColumnSelectorOpen(true)}
                  className="h-7 px-2 text-xs dark:text-gray-300"
                >
                  <Columns className="w-3.5 h-3.5 text-gray-700 dark:text-gray-400" />
                  <span className="ml-1.5 text-gray-700 dark:text-gray-300">Colunas</span>
                </Button>
              </div>
            </div>

            {/* Tabela - MOBILE/DESKTOP */}
            <div className="flex-1 overflow-hidden w-full min-w-0">
              {/* MOBILE: Vista Hierárquica — scroll independente, header fixo */}
              <div className="md:hidden w-full h-full overflow-y-auto overflow-x-hidden">
                <MobileHierarquica
                  produtos={filteredProdutos}
                  onEdit={handleEdit}
                  formatarNumero={formatarNumero}
                />
              </div>

              {/* DESKTOP: Tree Grid Hierárquico */}
              {viewMode === 'dinamica' && (
                <div className="hidden md:flex md:flex-col w-full h-full">
                  <TreeGrid
                    produtos={filteredProdutos}
                    onEdit={handleEdit}
                    visibleColumns={visibleColumns}
                    masterLevel={treeLevel}
                  />
                </div>
              )}

              {/* DESKTOP: Tabela Plana (original) */}
              <div className={`${viewMode === 'plana' ? 'hidden md:block' : 'hidden'} w-full h-full overflow-auto border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900`}>
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0 z-20 dark:bg-gray-800">
                    <TableRow>
                      <TableHead className="sticky left-0 z-30 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 w-[50px] border-r border-gray-200 dark:border-gray-700 text-xs p-2">
                        
                      </TableHead>
                      <TableHead className="sticky left-[50px] z-30 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 min-w-[60px] border-r border-gray-200 dark:border-gray-700 text-xs text-center">
                        Img
                      </TableHead>
                      <TableHead className="sticky left-[110px] z-30 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 min-w-[220px] border-r border-gray-200 dark:border-gray-700 text-xs">
                        Produto
                      </TableHead>
                      
                      {visibleColumns.includes('status') && (
                        <TableHead className="min-w-[100px] text-gray-700 dark:text-gray-300 text-xs">Status</TableHead>
                      )}
                      {visibleColumns.includes('cadastro') && (
                        <TableHead className="min-w-[110px] text-gray-700 dark:text-gray-300 text-xs">Cadastro</TableHead>
                      )}
                      {visibleColumns.includes('codigo_interno') && (
                        <TableHead className="min-w-[110px] text-gray-700 dark:text-gray-300 text-xs">Código</TableHead>
                      )}
                      {visibleColumns.includes('codigo_barras') && (
                        <TableHead className="min-w-[130px] text-gray-700 dark:text-gray-300 text-xs">Cód. Barras</TableHead>
                      )}
                      {visibleColumns.includes('categoria') && (
                        <TableHead className="min-w-[130px] text-gray-700 dark:text-gray-300 text-xs">Categoria</TableHead>
                      )}
                      {visibleColumns.includes('tags') && (
                        <TableHead className="min-w-[130px] text-gray-700 dark:text-gray-300 text-xs">Tags</TableHead>
                      )}
                      {visibleColumns.includes('fornecedor') && (
                        <TableHead className="min-w-[140px] text-gray-700 dark:text-gray-300 text-xs">Fornecedor</TableHead>
                      )}
                      {visibleColumns.includes('preco_venda') && (
                        <TableHead className="min-w-[110px] text-gray-700 dark:text-gray-300 text-xs">Preço Venda</TableHead>
                      )}
                      {visibleColumns.includes('preco_custo') && (
                        <TableHead className="min-w-[110px] text-gray-700 dark:text-gray-300 text-xs">Custo Total</TableHead>
                      )}
                      {visibleColumns.includes('margem') && (
                        <TableHead className="min-w-[90px] text-gray-700 dark:text-gray-300 text-xs">Margem</TableHead>
                      )}
                      {visibleColumns.includes('valor_compra') && (
                        <TableHead className="min-w-[110px] text-gray-700 dark:text-gray-300 text-xs">Vl. Compra</TableHead>
                      )}
                      {visibleColumns.includes('frete') && (
                        <TableHead className="min-w-[90px] text-gray-700 dark:text-gray-300 text-xs">Frete</TableHead>
                      )}
                      {visibleColumns.includes('imposto_1') && (
                        <TableHead className="min-w-[90px] text-gray-700 dark:text-gray-300 text-xs">Imposto 1</TableHead>
                      )}
                      {visibleColumns.includes('imposto_2') && (
                        <TableHead className="min-w-[90px] text-gray-700 dark:text-gray-300 text-xs">Imposto 2</TableHead>
                      )}
                      {visibleColumns.includes('desconto') && (
                        <TableHead className="min-w-[90px] text-gray-700 dark:text-gray-300 text-xs">Desconto</TableHead>
                      )}
                      {visibleColumns.includes('outros_custos') && (
                        <TableHead className="min-w-[100px] text-gray-700 dark:text-gray-300 text-xs">Outros</TableHead>
                      )}
                      {visibleColumns.includes('markup') && (
                        <TableHead className="min-w-[90px] text-gray-700 dark:text-gray-300 text-xs">Markup %</TableHead>
                      )}
                      {visibleColumns.includes('estoque_atual') && (
                        <TableHead className="min-w-[110px] text-gray-700 dark:text-gray-300 text-xs">Estoque</TableHead>
                      )}
                      {visibleColumns.includes('estoque_minimo') && (
                        <TableHead className="min-w-[90px] text-gray-700 dark:text-gray-300 text-xs">Est. Mín</TableHead>
                      )}
                      {visibleColumns.includes('estoque_ideal') && (
                        <TableHead className="min-w-[90px] text-gray-700 dark:text-gray-300 text-xs">Est. Ideal</TableHead>
                      )}
                      {visibleColumns.includes('estoque_maximo') && (
                        <TableHead className="min-w-[90px] text-gray-700 dark:text-gray-300 text-xs">Est. Máx</TableHead>
                      )}
                      {visibleColumns.includes('tempo_reposicao') && (
                        <TableHead className="min-w-[100px] text-gray-700 dark:text-gray-300 text-xs">Repos.</TableHead>
                      )}
                      {visibleColumns.includes('peso') && (
                        <TableHead className="min-w-[90px] text-gray-700 dark:text-gray-300 text-xs">Peso</TableHead>
                      )}
                      {visibleColumns.includes('dimensoes') && (
                        <TableHead className="min-w-[120px] text-gray-700 dark:text-gray-300 text-xs">Dimensões</TableHead>
                      )}
                      {visibleColumns.includes('tipo') && (
                        <TableHead className="min-w-[90px] text-gray-700 dark:text-gray-300 text-xs">Tipo</TableHead>
                      )}
                      {visibleColumns.includes('unidade') && (
                        <TableHead className="min-w-[70px] text-gray-700 dark:text-gray-300 text-xs">Unid.</TableHead>
                      )}
                      {visibleColumns.includes('unidades_pacote') && (
                        <TableHead className="min-w-[90px] text-gray-700 dark:text-gray-300 text-xs">Un/Pct</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProdutos.map(produto => {
                      const custoReal = produto.preco_custo_calculado > 0
                        ? produto.preco_custo_calculado
                        : (produto.valor_compra || 0)
                          + (produto.custo_frete_padrao || 0)
                          + (produto.custo_imposto1_padrao || 0)
                          + (produto.custo_imposto2_padrao || 0)
                          + (produto.custo_outros_padrao || 0)
                          - (produto.desconto_compra_padrao || 0);
                      const margem = produto.preco_venda_padrao > 0 && custoReal > 0 ?
                        ((produto.preco_venda_padrao - custoReal) / produto.preco_venda_padrao) * 100 : 0;
                      const cadastroStatus = isCadastroIncompleto(produto);
                      return (
                        <TableRow key={produto.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <TableCell className="sticky left-0 z-10 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-1">
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreHorizontal className="h-3.5 w-3.5 text-gray-700 dark:text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent 
                            align="start" 
                            className="z-50 dark:bg-gray-800 dark:border-gray-700" 
                            sideOffset={5}
                          >
                                <DropdownMenuItem 
                                  onClick={() => handleEdit(produto)}
                                  className="dark:text-gray-200 dark:hover:bg-gray-700 text-xs"
                                >
                                  <Edit className="mr-2 h-3.5 w-3.5"/>Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="dark:text-gray-200 dark:hover:bg-gray-700 text-xs">
                                  <Copy className="mr-2 h-3.5 w-3.5"/>Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600 dark:text-red-400 dark:hover:bg-gray-700 text-xs">
                                  <Archive className="mr-2 h-3.5 w-3.5"/>Inativar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          <TableCell className="sticky left-[50px] z-10 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-1 text-center">
                            <div className="w-10 h-10 mx-auto bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center overflow-hidden">
                              {produto.imagem_url ? (
                                <img src={produto.imagem_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-5 h-5 text-gray-300" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="sticky left-[110px] z-10 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
                            <div className="font-medium text-sm text-gray-700 dark:text-gray-200 uppercase">{produto.nome}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 uppercase">{produto.codigo_interno}</div>
                          </TableCell>
                          
                          {visibleColumns.includes('codigo_interno') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{produto.codigo_interno}</TableCell>
                          )}
                          {visibleColumns.includes('codigo_barras') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{produto.codigo_barras || '-'}</TableCell>
                          )}
                          {visibleColumns.includes('categoria') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{produto.categoria_nome || '-'}</TableCell>
                          )}
                          {visibleColumns.includes('tags') && (
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(produto.tags || []).slice(0, 2).map(tag => (
                                  <span key={tag} className="text-[10px] px-1 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.includes('status') && (
                            <TableCell>{getStockStatusIndicator(produto)}</TableCell>
                          )}
                          {visibleColumns.includes('cadastro') && (
                            <TableCell>
                              {cadastroStatus.incompleto ? (
                                <div className="flex flex-col gap-0.5">
                                  {cadastroStatus.checks.semCategoria && <span className="text-[10px] text-red-600 dark:text-red-400">Sem categoria</span>}
                                  {cadastroStatus.checks.semFornecedor && <span className="text-[10px] text-red-600 dark:text-red-400">Sem fornecedor</span>}
                                  {cadastroStatus.checks.semPrecoVenda && <span className="text-[10px] text-red-600 dark:text-red-400">Sem preço</span>}
                                  {cadastroStatus.checks.semCodigoBarras && <span className="text-[10px] text-red-600 dark:text-red-400">Sem cód. barras</span>}
                                  {cadastroStatus.checks.semImagem && <span className="text-[10px] text-red-600 dark:text-red-400">Sem imagem</span>}
                                </div>
                              ) : (
                                <span className="text-xs text-green-600 dark:text-green-400">Completo</span>
                              )}
                            </TableCell>
                          )}
                          {visibleColumns.includes('fornecedor') && (
                            <TableCell>
                              {fornecedorMap[produto.fornecedor_padrao_id] ? (
                                <div className="text-xs text-gray-700 dark:text-gray-300">{fornecedorMap[produto.fornecedor_padrao_id]}</div>
                              ) : <span className="text-xs text-gray-600 dark:text-gray-400">N/A</span>}
                            </TableCell>
                          )}
                          {visibleColumns.includes('preco_venda') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">R$ {formatarNumero(produto.preco_venda_padrao)}</TableCell>
                          )}
                          {visibleColumns.includes('margem') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{formatarNumero(margem)}%</TableCell>
                          )}
                          {visibleColumns.includes('preco_custo') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">R$ {formatarNumero(produto.preco_custo_calculado)}</TableCell>
                          )}
                          {visibleColumns.includes('valor_compra') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">R$ {formatarNumero(produto.valor_compra)}</TableCell>
                          )}
                          {visibleColumns.includes('markup') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{produto.preco_venda_percentual || 0}%</TableCell>
                          )}
                          {visibleColumns.includes('estoque_atual') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{formatarNumero(produto.estoque_atual)} {produto.unidade_principal}</TableCell>
                          )}
                          {visibleColumns.includes('estoque_minimo') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{formatarNumero(produto.estoque_minimo)}</TableCell>
                          )}
                          {visibleColumns.includes('estoque_ideal') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{formatarNumero(produto.estoque_ideal)}</TableCell>
                          )}
                          {visibleColumns.includes('estoque_maximo') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{formatarNumero(produto.estoque_maximo)}</TableCell>
                          )}
                          {visibleColumns.includes('tempo_reposicao') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{produto.tempo_reposicao_dias || 0}d</TableCell>
                          )}
                          {visibleColumns.includes('peso') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{formatarNumero(produto.peso_kg)}kg</TableCell>
                          )}
                          {visibleColumns.includes('dimensoes') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{produto.dimensoes_cm || '-'}</TableCell>
                          )}
                          {visibleColumns.includes('tipo') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{produto.tipo}</TableCell>
                          )}
                          {visibleColumns.includes('unidade') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{produto.unidade_principal}</TableCell>
                          )}
                          {visibleColumns.includes('unidades_pacote') && (
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{produto.unidades_por_pacote || 1}</TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Tela completa para o formulário */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900">
          <ProdutoFormCompleto
            produto={selectedProduto}
            onSave={handleSave}
            onClose={() => setIsFormOpen(false)}
          />
        </div>
      )}

      {/* Dialog de Upload Unificado (Produtos + Custos) */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-md dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-base font-medium text-gray-800 dark:text-gray-200">Importar Produtos e Custos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div>
              <Label htmlFor="importFile" className="text-sm mb-2 block dark:text-gray-200">
                Arquivo CSV (.csv, .xlsx)
              </Label>
              <Input 
                id="importFile"
                type="file" 
                accept=".csv,.xlsx,.xls" 
                onChange={(e) => setImportFile(e.target.files[0])} 
                className="border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 text-sm"
              />
              {importFile && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-300">
                  <CheckCircle className="w-4 h-4 text-gray-700 dark:text-gray-400" />
                  {importFile.name}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportFile(null);
              }}
              className="text-sm dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleProcessarImportacaoUnificada} 
              disabled={isProcessingImport || !importFile}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm dark:bg-gray-600 dark:hover:bg-gray-500"
            >
              {isProcessingImport && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Processar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Preview de Importação Unificada */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-base font-medium text-gray-800 dark:text-gray-200">Confirmar Importação de Produtos e Custos</DialogTitle>
          </DialogHeader>
          
          {previewData && (
            <div className="space-y-4 py-4">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 border border-gray-200 rounded-lg dark:border-gray-700 dark:bg-gray-800">
                  <div className="text-xl font-semibold text-green-700 dark:text-green-400">
                    {previewData.resumo.novos}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Novos</div>
                </div>
                <div className="text-center p-3 border border-gray-200 rounded-lg dark:border-gray-700 dark:bg-gray-800">
                  <div className="text-xl font-semibold text-blue-700 dark:text-blue-400">
                    {previewData.resumo.atualizados}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Atualizações</div>
                </div>
                {previewData.resumo.erros.length > 0 && (
                  <div className="text-center p-3 border border-gray-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-900">
                    <div className="text-xl font-semibold text-red-700 dark:text-red-300">
                      {previewData.resumo.erros.length}
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-300">Erros</div>
                  </div>
                )}
              </div>

              {/* Erros */}
              {previewData.resumo.erros.length > 0 && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200 dark:bg-red-900/20 dark:border-red-900">
                  <div className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">❌ Erros:</div>
                  <ul className="text-xs text-red-600 dark:text-red-300 list-disc ml-4 max-h-24 overflow-y-auto">
                    {previewData.resumo.erros.map((erro, i) => <li key={i}>{erro}</li>)}
                  </ul>
                </div>
              )}

              {/* Preview dos Produtos */}
              {previewData.produtos.length > 0 && (
                <div className="border rounded-lg overflow-hidden dark:border-gray-700">
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-gray-50 sticky top-0 dark:bg-gray-800">
                        <TableRow>
                          <TableHead className="dark:text-gray-400 text-xs">Nome</TableHead>
                          <TableHead className="text-right dark:text-gray-400 text-xs">Custo Calculado</TableHead>
                          <TableHead className="text-right dark:text-gray-400 text-xs">Preço Venda</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.produtos.map((produto, index) => (
                          <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <TableCell className="font-medium text-xs dark:text-gray-200">{produto.nome}</TableCell>
                            <TableCell className="text-right text-xs dark:text-gray-200">R$ {formatarNumero(produto.preco_custo_calculado)}</TableCell>
                            <TableCell className="text-right font-medium text-xs dark:text-gray-200">R$ {formatarNumero(produto.preco_venda_padrao)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 dark:bg-blue-900/20 dark:border-blue-900 dark:text-blue-300">
                <strong>ℹ️ Atenção:</strong> Esta operação irá:
                <ul className="list-disc ml-4 mt-1">
                  <li>Criar novos produtos (sem código de barras cadastrado)</li>
                  <li>Atualizar produtos existentes (com código de barras já cadastrado)</li>
                  <li>Atualizar estoque atual dos produtos conforme informado</li>
                  <li>Recalcular preços de custo automaticamente baseado nos percentuais</li>
                  <li>Calcular markup percentual automaticamente baseado no preço de venda informado</li>
                </ul>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsPreviewDialogOpen(false);
                setPreviewData(null);
              }}
              className="text-sm dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarImportacaoUnificada} 
              disabled={
                isProcessingImport || 
                !previewData || 
                previewData.produtos.length === 0
              }
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm dark:bg-gray-600 dark:hover:bg-gray-500"
            >
              {isProcessingImport && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Importação ({previewData?.produtos.length || 0})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Dialog de Upload de Custos (Existing) */}
      <Dialog open={isImportCustosDialogOpen} onOpenChange={setIsImportCustosDialogOpen}>
        <DialogContent className="sm:max-w-md dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-medium text-gray-800 dark:text-gray-200">
              <RefreshCw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Importar Atualização de Custos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:border-blue-900 dark:text-blue-300">
              <p className="font-semibold mb-1">💡 Como funciona:</p>
              <ul className="text-xs list-disc ml-4 space-y-1">
                <li>Baixe o template com seus produtos atuais</li>
                <li>Atualize a coluna <strong>novo_valor_compra</strong></li>
                <li>Importe de volta e confirme as alterações</li>
                <li>O sistema recalculará automaticamente custos totais e preços de venda</li>
              </ul>
            </div>

            <div>
              <Label htmlFor="importCustosFile" className="text-sm font-semibold mb-2 block dark:text-gray-200">
                Arquivo CSV (.csv, .xlsx)
              </Label>
              <Input
                id="importCustosFile"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setImportCustosFile(e.target.files[0])}
                className="dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 text-sm"
              />
              {importCustosFile && (
                <div className="flex items-center gap-2 mt-2 text-sm text-green-600 dark:text-green-300">
                  <CheckCircle className="w-4 h-4" />
                  {importCustosFile.name}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportCustosDialogOpen(false);
                setImportCustosFile(null);
              }}
              className="text-sm dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleProcessarImportacaoCustos}
              disabled={isProcessingCustos || !importCustosFile}
              className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 text-sm"
            >
              {isProcessingCustos && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Processar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column Selector */}
      <ColumnSelector
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
        open={isColumnSelectorOpen}
        onClose={() => setIsColumnSelectorOpen(false)}
      />

      <MassImageUploader 
        isOpen={isMassImageUploaderOpen}
        onClose={() => setIsMassImageUploaderOpen(false)}
        onComplete={() => {
          loadData();
          // Optional: close dialog automatically or keep it open for results viewing
          // setIsMassImageUploaderOpen(false); 
        }}
      />

      {/* FAB - Floating Action Button */}
      <ProdutoFAB onNovoClicked={handleAddNew} />

      {/* Dialog de Preview de Custos (Existing) */}
      <Dialog open={isPreviewCustosDialogOpen} onOpenChange={setIsPreviewCustosDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-medium text-gray-800 dark:text-gray-200">
              <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Confirmar Atualização de Custos
            </DialogTitle>
          </DialogHeader>

          {previewCustosData && (
            <div className="space-y-4 py-4">
              {/* Resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="text-center p-3 bg-orange-50 rounded-lg border-2 border-orange-200 dark:bg-orange-900/20 dark:border-orange-900">
                  <div className="text-xl font-bold text-orange-700 dark:text-orange-300">
                    {previewCustosData.resumo.atualizacoes}
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-300 font-semibold">Produtos a Atualizar</div>
                </div>
                {previewCustosData.resumo.erros.length > 0 && (
                  <div className="text-center p-3 bg-red-50 rounded-lg border-2 border-red-200 dark:bg-red-900/20 dark:border-red-900">
                    <div className="text-xl font-bold text-red-700 dark:text-red-300">
                      {previewCustosData.resumo.erros.length}
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-300 font-semibold">Erros</div>
                  </div>
                )}
                {previewCustosData.resumo.naoEncontrados.length > 0 && (
                  <div className="text-center p-3 bg-yellow-50 rounded-lg border-2 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900">
                    <div className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                      {previewCustosData.resumo.naoEncontrados.length}
                    </div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-300 font-semibold">Não Encontrados</div>
                  </div>
                )}
              </div>

              {/* Erros e Avisos */}
              {previewCustosData.resumo.erros.length > 0 && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200 dark:bg-red-900/20 dark:border-red-900">
                  <div className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">❌ Erros:</div>
                  <ul className="text-xs text-red-600 dark:text-red-300 list-disc ml-4 max-h-24 overflow-y-auto">
                    {previewCustosData.resumo.erros.map((erro, i) => <li key={i}>{erro}</li>)}
                  </ul>
                </div>
              )}

              {previewCustosData.resumo.naoEncontrados.length > 0 && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900">
                  <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">⚠️ Produtos não encontrados:</div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-300 max-h-24 overflow-y-auto">
                    {previewCustosData.resumo.naoEncontrados.join(', ')}
                  </div>
                </div>
              )}

              {/* Tabela de Preview */}
              {previewCustosData.atualizacoes.length > 0 && (
                <div className="border rounded-lg overflow-hidden dark:border-gray-700">
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-gray-50 sticky top-0 dark:bg-gray-800">
                        <TableRow>
                          <TableHead className="w-[150px] dark:text-gray-400 text-xs">Produto</TableHead>
                          <TableHead className="text-right dark:text-gray-400 text-xs">Custo Atual</TableHead>
                          <TableHead className="text-right dark:text-gray-400 text-xs">Novo Valor Compra</TableHead>
                          <TableHead className="text-right dark:text-gray-400 text-xs">Novo Custo Total</TableHead>
                          <TableHead className="text-right dark:text-gray-400 text-xs">Novo Preço Venda</TableHead>
                          <TableHead className="text-right dark:text-gray-400 text-xs">Variação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewCustosData.atualizacoes.map((item, index) => {
                          const isAumento = item.variacao_custo > 0;
                          return (
                            <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <TableCell>
                                <div className="font-medium text-xs dark:text-gray-200">{item.nome}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{item.codigo_interno}</div>
                              </TableCell>
                              <TableCell className="text-right text-xs text-gray-600 dark:text-gray-300">
                                R$ {formatarNumero(item.valor_compra_anterior)}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-orange-600 dark:text-orange-400 text-xs">
                                R$ {formatarNumero(item.novo_valor_compra)}
                              </TableCell>
                              <TableCell className="text-right font-semibold dark:text-gray-200 text-xs">
                                R$ {formatarNumero(item.novo_custo_total)}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600 dark:text-green-400 text-xs">
                                R$ {formatarNumero(item.novo_preco_venda)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge
                                  className={`text-[10px] ${
                                    isAumento
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                                      : item.variacao_custo < 0
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {isAumento ? '↑' : item.variacao_custo < 0 ? '↓' : '='}
                                  {Math.abs(item.variacao_custo).toFixed(1)}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 dark:bg-blue-900/20 dark:border-blue-900 dark:text-blue-300">
                <strong>ℹ️ Atenção:</strong> Esta operação irá:
                <ul className="list-disc ml-4 mt-1">
                  <li>Atualizar o "Valor de Compra" base no produto</li>
                  <li>Recalcular automaticamente todos os custos percentuais (frete, impostos, etc)</li>
                  <li>Atualizar o Custo Total calculado</li>
                  <li>Recalcular o Preço de Venda (se estiver em modo Markup %)</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPreviewCustosDialogOpen(false);
                setPreviewCustosData(null);
              }}
              className="text-sm dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarImportacaoCustos}
              disabled={
                isProcessingCustos ||
                !previewCustosData ||
                previewCustosData.atualizacoes.length === 0
              }
              className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 text-sm"
            >
              {isProcessingCustos && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Atualização ({previewCustosData?.atualizacoes.length || 0})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}