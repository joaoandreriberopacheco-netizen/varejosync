
import React, { useState, useEffect } from 'react';
import { dataHoje } from '@/components/utils/dateUtils';
import { Produto } from '@/entities/Produto';
import { CustoDetalhado } from '@/entities/CustoDetalhado';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Calculator, 
  Filter,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { UploadFile, ExtractDataFromUploadedFile } from '@/integrations/Core';
import { useToast } from "@/components/ui/use-toast";

export default function EdicaoMassivaCustos() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtros, setFiltros] = useState({ categoria: 'todas' });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []); // CORREÇÃO: Remover loadData da dependência para evitar loop infinito

  const loadData = async () => {
    try {
      const produtosData = await Produto.list();
      setProdutos(produtosData);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(produtosData.map(p => p.categoria).filter(Boolean))];
      setCategorias(uniqueCategories);
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os produtos.",
        variant: "destructive"
      });
    }
  };

  const produtosFiltrados = produtos.filter(p => {
    if (filtros.categoria === 'todas') return true;
    return p.categoria === filtros.categoria;
  });

  const handleExportarPlanilha = async () => {
    if (produtosFiltrados.length === 0) {
      toast({
        title: "Nenhum produto encontrado",
        description: "Ajuste os filtros para incluir produtos.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      // 1. Buscar todos os tipos de custo únicos
      const todosCustos = await CustoDetalhado.list();
      const tiposCustoUnicos = [...new Set(todosCustos.map(c => c.descricao_custo))].sort();

      // 2. Para cada produto, buscar seus custos
      const dadosExportacao = await Promise.all(
        produtosFiltrados.map(async (produto) => {
          const custosProduto = await CustoDetalhado.filter({ produto_id: produto.id });
          
          // Criar objeto com informações básicas do produto
          const linhaProduto = {
            id_produto: produto.id,
            nome_produto: produto.nome,
            categoria: produto.categoria || '',
            preco_custo_calculado_atual: produto.preco_custo_calculado || 0
          };

          // Adicionar uma coluna para cada tipo de custo
          tiposCustoUnicos.forEach(tipoCusto => {
            const custoEncontrado = custosProduto.find(c => c.descricao_custo === tipoCusto);
            linhaProduto[`custo_${tipoCusto.replace(/[^a-zA-Z0-9]/g, '_')}`] = custoEncontrado?.valor_custo || 0;
          });

          return linhaProduto;
        })
      );

      // 3. Gerar CSV com separador de ponto e vírgula
      const headers = [
        'id_produto',
        'nome_produto', 
        'categoria',
        'preco_custo_calculado_atual',
        ...tiposCustoUnicos.map(tipo => `custo_${tipo.replace(/[^a-zA-Z0-9]/g, '_')}`)
      ];

      // CORREÇÃO: Adicionar BOM UTF-8 e usar ponto e vírgula
      let csvContent = "\uFEFF"; // BOM UTF-8
      csvContent += headers.join(";") + "\n"; // MUDANÇA: usar ; ao invés de ,

      dadosExportacao.forEach(linha => {
        const row = headers.map(header => linha[header] || '');
        csvContent += row.join(";") + "\n"; // MUDANÇA: usar ; ao invés de ,
      });

      // 4. Download usando Blob para codificação correta
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `custos_produtos_${dataHoje()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Planilha exportada com sucesso!",
        description: `${produtosFiltrados.length} produtos exportados com ${tiposCustoUnicos.length} tipos de custo.`,
        className: "bg-green-100 text-green-800"
      });

    } catch (error) {
      console.error("Erro na exportação:", error);
      toast({
        title: "Erro na Exportação",
        description: "Ocorreu um erro ao gerar a planilha.",
        variant: "destructive"
      });
    }
    
    setIsExporting(false);
  };

  const handleProcessarImportacao = async () => {
    if (!importFile) return;

    setIsImporting(true);

    try {
      // 1. Upload do arquivo
      const { file_url } = await UploadFile({ file: importFile });
      
      // 2. Extrair dados (usando schema dinâmico)
      const schemaImportacao = {
        type: "array",
        items: {
          type: "object",
          properties: {
            id_produto: { type: "string" },
            nome_produto: { type: "string" }
            // Demais campos são dinâmicos baseados nos custos
          },
          additionalProperties: true
        }
      };

      const extraction = await ExtractDataFromUploadedFile({ 
        file_url, 
        json_schema: schemaImportacao 
      });

      if (extraction.status !== 'success' || !extraction.output) {
        throw new Error(extraction.details || "Falha ao processar arquivo.");
      }

      // 3. Processar dados e preparar preview
      const dadosImportados = extraction.output;
      const resumoAlteracoes = {
        novos_custos: 0,
        custos_atualizados: 0,
        produtos_afetados: new Set(),
        erros: []
      };

      for (const linha of dadosImportados) {
        const produtoId = linha.id_produto;
        
        if (!produtoId) {
          resumoAlteracoes.erros.push("Linha sem ID de produto encontrada");
          continue;
        }

        // Buscar custos atuais do produto
        const custosAtuais = await CustoDetalhado.filter({ produto_id: produtoId });
        
        // Processar cada campo de custo na linha
        Object.keys(linha).forEach(key => {
          if (key.startsWith('custo_')) {
            const tipoCusto = key.replace('custo_', '').replace(/_/g, ' ');
            const novoValor = parseFloat(linha[key]) || 0;
            
            const custoExistente = custosAtuais.find(c => 
              c.descricao_custo.replace(/[^a-zA-Z0-9]/g, '_') === key.replace('custo_', '')
            );

            if (custoExistente && custoExistente.valor_custo !== novoValor) {
              resumoAlteracoes.custos_atualizados++;
              resumoAlteracoes.produtos_afetados.add(produtoId);
            } else if (!custoExistente && novoValor > 0) {
              resumoAlteracoes.novos_custos++;
              resumoAlteracoes.produtos_afetados.add(produtoId);
            }
          }
        });
      }

      setPreviewData({
        dados: dadosImportados,
        resumo: {
          ...resumoAlteracoes,
          produtos_afetados: resumoAlteracoes.produtos_afetados.size
        }
      });

      setIsImportDialogOpen(false);
      setIsConfirmDialogOpen(true);

    } catch (error) {
      console.error("Erro no processamento:", error);
      toast({
        title: "Erro no Processamento",
        description: error.message || "Erro inesperado ao processar arquivo.",
        variant: "destructive"
      });
    }
    
    setIsImporting(false);
  };

  const handleConfirmarImportacao = async () => {
    if (!previewData) return;

    setIsImporting(true);

    try {
      const produtosParaRecalcular = new Set();

      // Processar cada linha dos dados importados
      for (const linha of previewData.dados) {
        const produtoId = linha.id_produto;
        
        if (!produtoId) continue;

        // Buscar custos atuais do produto
        const custosAtuais = await CustoDetalhado.filter({ produto_id: produtoId });
        
        // Processar cada campo de custo
        for (const [key, value] of Object.entries(linha)) {
          if (key.startsWith('custo_')) {
            const tipoCusto = key.replace('custo_', '').replace(/_/g, ' ');
            const novoValor = parseFloat(value) || 0;
            
            const custoExistente = custosAtuais.find(c => 
              c.descricao_custo.replace(/[^a-zA-Z0-9]/g, '_') === key.replace('custo_', '')
            );

            if (custoExistente) {
              // Atualizar custo existente
              if (custoExistente.valor_custo !== novoValor) {
                await CustoDetalhado.update(custoExistente.id, { valor_custo: novoValor });
                produtosParaRecalcular.add(produtoId);
              }
            } else if (novoValor > 0) {
              // Criar novo custo
              await CustoDetalhado.create({
                produto_id: produtoId,
                descricao_custo: tipoCusto,
                valor_custo: novoValor
              });
              produtosParaRecalcular.add(produtoId);
            }
          }
        }
      }

      // Recalcular preço de custo para produtos afetados
      for (const produtoId of produtosParaRecalcular) {
        const custosAtualizados = await CustoDetalhado.filter({ produto_id: produtoId });
        const novoPrecoCusto = custosAtualizados.reduce((sum, custo) => sum + (custo.valor_custo || 0), 0);
        
        await Produto.update(produtoId, { preco_custo_calculado: novoPrecoCusto });
      }

      toast({
        title: "Importação Concluída!",
        description: `${produtosParaRecalcular.size} produtos tiveram seus custos atualizados.`,
        className: "bg-green-100 text-green-800"
      });

      // Limpar estados e recarregar dados
      setPreviewData(null);
      setIsConfirmDialogOpen(false);
      setImportFile(null);
      await loadData();

    } catch (error) {
      console.error("Erro na confirmação:", error);
      toast({
        title: "Erro na Importação",
        description: "Ocorreu um erro ao salvar as alterações.",
        variant: "destructive"
      });
    }
    
    setIsImporting(false);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-800">Edição Massiva de Custos</h1>
          <p className="text-gray-600">
            Exporte uma planilha com todos os custos detalhados por produto, edite os valores no Excel e importe para atualizar o sistema em massa.
          </p>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Filtros de Seleção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={filtros.categoria} onValueChange={value => setFiltros(prev => ({...prev, categoria: value}))}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Categorias</SelectItem>
                    {categorias.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {produtosFiltrados.length} produtos selecionados
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações Principais */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Exportação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-green-600" />
                1. Exportar Planilha de Custos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-2">A planilha exportada conterá:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Uma linha para cada produto selecionado</li>
                  <li>Colunas dinâmicas para cada tipo de custo</li>
                  <li>Valores atuais preenchidos</li>
                </ul>
              </div>
              <Button 
                onClick={handleExportarPlanilha} 
                disabled={isExporting || produtosFiltrados.length === 0}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Gerar e Baixar Planilha
              </Button>
            </CardContent>
          </Card>

          {/* Importação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                2. Importar Planilha Editada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-2">Após editar a planilha:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Mantenha as colunas de ID e Nome</li>
                  <li>Edite apenas os valores de custo</li>
                  <li>Salve em formato .csv ou .xlsx</li>
                </ul>
              </div>
              <Button 
                onClick={() => setIsImportDialogOpen(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="mr-2 h-4 w-4" />
                Selecionar Arquivo
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Resumo dos Últimos Produtos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-purple-600" />
              Produtos Selecionados (Prévia)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-w-0 overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Nome do Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Custo Calculado Atual</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtosFiltrados.slice(0, 5).map(produto => (
                    <TableRow key={produto.id}>
                      <TableCell className="font-medium">{produto.nome}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{produto.categoria || 'Sem categoria'}</Badge>
                      </TableCell>
                      <TableCell>
                        R$ {(produto.preco_custo_calculado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={produto.ativo ? "default" : "destructive"} 
                               className={produto.ativo ? "bg-green-100 text-green-800" : ""}>
                          {produto.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {produtosFiltrados.length > 5 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500">
                        ... e mais {produtosFiltrados.length - 5} produtos
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Importação */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Planilha de Custos</DialogTitle>
            <DialogDescription>
              Selecione o arquivo .csv ou .xlsx editado com os novos valores de custo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input 
              type="file" 
              accept=".csv,.xlsx,.xls" 
              onChange={(e) => setImportFile(e.target.files[0])}
            />
            {importFile && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Arquivo selecionado: {importFile.name}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleProcessarImportacao} 
              disabled={!importFile || isImporting}
            >
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Processar Arquivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Confirmar Alterações
            </DialogTitle>
            <DialogDescription>
              Revise o resumo das alterações que serão aplicadas aos custos dos produtos.
            </DialogDescription>
          </DialogHeader>
          
          {previewData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{previewData.resumo.novos_custos}</div>
                  <div className="text-sm text-green-600">Novos Custos</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">{previewData.resumo.custos_atualizados}</div>
                  <div className="text-sm text-blue-600">Custos Atualizados</div>
                </div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">{previewData.resumo.produtos_afetados}</div>
                <div className="text-sm text-purple-600">Produtos Afetados</div>
              </div>

              {previewData.resumo.erros.length > 0 && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-sm font-medium text-red-800 mb-2">Erros Encontrados:</div>
                  <ul className="text-xs text-red-600 list-disc ml-4">
                    {previewData.resumo.erros.map((erro, index) => (
                      <li key={index}>{erro}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarImportacao} 
              disabled={isImporting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar e Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
