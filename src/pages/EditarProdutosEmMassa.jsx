import React, { useState, useEffect } from 'react';
import { Produto } from '@/entities/Produto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Calculator, Filter, Loader2, ClipboardPaste, RotateCcw } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function EdicaoMassivaProdutos() {
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await Produto.list();
      // Buffer de 20 linhas vazias para criação contínua
      const bufferRows = Array(20).fill().map(() => ({
        nome: '', 
        valor_compra: '', 
        preco_venda_padrao: '', 
        estoque_minimo: '', 
        ativo: true, 
        categoria_nome: '', 
        isNew: true
      }));
      setGridData([...data, ...bufferRows]);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar produtos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resolverFormula = (valor) => {
    if (typeof valor === 'string' && valor.startsWith('=')) {
      try {
        const expressao = valor.substring(1).replace(/[^-()\d/*+.]/g, '');
        const resultado = Function(`"use strict"; return (${expressao})`)();
        return isFinite(resultado) ? Number(resultado).toFixed(2) : valor;
      } catch { return valor; }
    }
    return valor;
  };

  const handleCellChange = (index, campo, valor) => {
    const novaGrid = [...gridData];
    let valorFinal = valor;

    // Processamento de campos numéricos
    if (['valor_compra', 'preco_venda_padrao', 'estoque_minimo'].includes(campo)) {
      valorFinal = resolverFormula(valor);
    }

    novaGrid[index] = { ...novaGrid[index], [campo]: valorFinal, dirty: true };

    // Expansão Automática (Infinite Grid)
    if (index === novaGrid.length - 1 && valor !== '') {
      novaGrid.push({ nome: '', valor_compra: '', preco_venda_padrao: '', estoque_minimo: '', ativo: true, isNew: true });
    }

    setGridData(novaGrid);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const data = e.clipboardData.getData('text');
    const rows = data.split(/\r?\n/).filter(row => row.trim() !== '');
    const matrix = rows.map(row => row.split('\t'));

    const novaGrid = [...gridData];
    matrix.forEach((rowData, i) => {
      const targetIndex = gridData.findIndex(r => r.isNew && !r.nome) + i;
      if (targetIndex !== -1 && targetIndex < novaGrid.length + 50) {
        if (!novaGrid[targetIndex]) novaGrid[targetIndex] = { isNew: true, ativo: true };
        novaGrid[targetIndex] = {
          ...novaGrid[targetIndex],
          nome: rowData[0] || novaGrid[targetIndex].nome,
          valor_compra: resolverFormula(rowData[1] || novaGrid[targetIndex].valor_compra),
          preco_venda_padrao: resolverFormula(rowData[2] || novaGrid[targetIndex].preco_venda_padrao),
          estoque_minimo: resolverFormula(rowData[3] || novaGrid[targetIndex].estoque_minimo),
          dirty: true
        };
      }
    });
    setGridData(novaGrid);
    toast({ title: "Dados Colados", description: "Informações importadas com sucesso." });
  };

  const handleSalvar = async () => {
    setSaving(true);
    const paraProcessar = gridData.filter(item => item.dirty && item.nome && item.preco_venda_padrao);

    try {
      for (const item of paraProcessar) {
        const payload = {
          nome: item.nome,
          valor_compra: parseFloat(item.valor_compra) || 0,
          preco_venda_padrao: parseFloat(item.preco_venda_padrao) || 0,
          estoque_minimo: parseInt(item.estoque_minimo) || 0,
          ativo: item.ativo,
          tipo: "Produto", // Requisito da entidade
          campo_hierarquico_1: item.nome // Requisito obrigatório para novos
        };

        if (item.id) {
          await Produto.update(item.id, payload);
        } else {
          await Produto.create(payload);
        }
      }
      toast({ title: "Arsenal Atualizado", description: "Alterações sincronizadas." });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao salvar alterações.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const calcularMargem = (venda, compra) => {
    const v = parseFloat(venda);
    const c = parseFloat(compra);
    if (!v || !c || v <= 0) return "-";
    return (((v - c) / v) * 100).toFixed(1) + "%";
  };

  const getEstiloMargem = (venda, compra) => {
    const v = parseFloat(venda);
    const c = parseFloat(compra);
    if (!v || !c) return "";
    if (v < c) return "bg-red-50 text-red-700 font-bold";
    if ((v - c) / v < 0.2) return "bg-yellow-50 text-yellow-700";
    return "bg-green-50 text-green-700";
  };

  return (
    <div className="p-4 max-w-[1600px] mx-auto space-y-4" onPaste={handlePaste}>
      <Card className="border-none shadow-sm bg-white/90">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="w-6 h-6 text-blue-600" />
              Bancada de Inspeção (Editor de Matriz)
            </CardTitle>
            <p className="text-sm text-gray-500">Gestão integrada de custos, preços e estoques mínimos.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData} disabled={loading} className="gap-2">
              <RotateCcw className="w-4 h-4" /> Desfazer
            </Button>
            <Button onClick={handleSalvar} disabled={saving || loading} className="bg-slate-900 hover:bg-black gap-2">
              {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
              Sincronizar Arsenal
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Filtrar por nome ou código..." 
                className="pl-10 h-10"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
              />
            </div>
            <Badge variant="outline" className="h-10 px-4 bg-blue-50 text-blue-700 border-blue-100 gap-2">
              <ClipboardPaste className="w-4 h-4" />
              Dica: Cole dados do Excel (Ctrl+V) diretamente na grade.
            </Badge>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-gray-50/80">
                <TableRow>
                  <TableHead className="w-24 text-[10px] uppercase font-bold">Código</TableHead>
                  <TableHead className="min-w-[350px] text-[10px] uppercase font-bold">Nome do Produto</TableHead>
                  <TableHead className="w-32 text-[10px] uppercase font-bold text-right">Compra (R$)</TableHead>
                  <TableHead className="w-32 text-[10px] uppercase font-bold text-right">Venda (R$)</TableHead>
                  <TableHead className="w-24 text-[10px] uppercase font-bold text-center">Margem</TableHead>
                  <TableHead className="w-24 text-[10px] uppercase font-bold text-center">Est. Mín.</TableHead>
                  <TableHead className="w-20 text-[10px] uppercase font-bold text-center">Ativo</TableHead>
                  <TableHead className="w-40 text-[10px] uppercase font-bold">Categoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gridData
                  .filter(p => !filtroTexto || p.nome?.toLowerCase().includes(filtroTexto.toLowerCase()))
                  .map((item, index) => (
                  <TableRow key={index} className={`transition-colors ${item.dirty ? "bg-blue-50/30" : "hover:bg-gray-50/50"}`}>
                    <TableCell className="text-[10px] font-mono text-gray-400">
                      {item.codigo_interno || (item.id ? item.id.substring(0,6) : "NEW")}
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={item.nome || ''} 
                        onChange={(e) => handleCellChange(index, 'nome', e.target.value)}
                        className="h-8 border-none bg-transparent focus-visible:ring-1 focus-visible:ring-blue-400"
                        placeholder="Nome do produto..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={item.valor_compra || ''} 
                        onChange={(e) => handleCellChange(index, 'valor_compra', e.target.value)}
                        className="h-8 border-none bg-transparent focus-visible:ring-1 focus-visible:ring-blue-400 text-right font-mono"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={item.preco_venda_padrao || ''} 
                        onChange={(e) => handleCellChange(index, 'preco_venda_padrao', e.target.value)}
                        className={`h-8 border-none focus-visible:ring-1 focus-visible:ring-blue-400 text-right font-mono ${getEstiloMargem(item.preco_venda_padrao, item.valor_compra)}`}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs text-gray-600">
                      {calcularMargem(item.preco_venda_padrao, item.valor_compra)}
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={item.estoque_minimo || ''} 
                        onChange={(e) => handleCellChange(index, 'estoque_minimo', e.target.value)}
                        className="h-8 border-none bg-transparent focus-visible:ring-1 focus-visible:ring-blue-400 text-center font-mono"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={item.ativo} 
                        onCheckedChange={(v) => handleCellChange(index, 'ativo', v)}
                        className="data-[state=checked]:bg-green-600"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={item.categoria_nome || ''} 
                        onChange={(e) => handleCellChange(index, 'categoria_nome', e.target.value)}
                        className="h-8 border-none bg-transparent focus-visible:ring-1 focus-visible:ring-blue-400"
                        placeholder="Categoria..."
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
