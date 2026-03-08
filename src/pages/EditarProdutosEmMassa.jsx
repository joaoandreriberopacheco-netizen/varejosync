import React, { useState, useEffect, useRef } from 'react';
import { Produto } from '@/entities/Produto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, Plus, Filter, Calculator, Trash2, Loader2, ClipboardPaste } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function EdicaoMassivaProdutos() {
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState('');
  const { toast } = useToast();
  
  // Referência para detectar alterações e evitar loops
  const originalDataRef = useRef([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await Produto.list();
      originalDataRef.current = JSON.parse(JSON.stringify(data));
      
      // Adiciona 15 linhas vazias para "Canvas Infinito"
      const bufferRows = Array(15).fill().map(() => ({
        nome: '', preco_venda: '', preco_custo: '', categoria: '', isNew: true
      }));
      
      setGridData([...data, ...bufferRows]);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar produtos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Processador de Fórmulas Aritméticas (Valor de Face)
  const processarFormula = (valor) => {
    if (typeof valor === 'string' && valor.startsWith('=')) {
      try {
        // Limpa a string e executa apenas matemática básica (+-*/)
        const expressao = valor.substring(1).replace(/[^-()\d/*+.]/g, '');
        const resultado = Function(`"use strict"; return (${expressao})`)();
        return isFinite(resultado) ? Number(resultado).toFixed(2) : valor;
      } catch (e) {
        return valor;
      }
    }
    return valor;
  };

  const handleCellChange = (index, campo, valor) => {
    const novaGrid = [...gridData];
    let valorFinal = valor;

    // Se sair da célula (onBlur) ou for valor final, processa fórmula
    if (campo === 'preco_venda' || campo === 'preco_custo') {
      valorFinal = processarFormula(valor);
    }

    novaGrid[index] = { ...novaGrid[index], [campo]: valorFinal, dirty: true };

    // Expansão Automática: Se preencher a penúltima linha, cria mais
    if (index === gridData.length - 2) {
      novaGrid.push({ nome: '', preco_venda: '', preco_custo: '', isNew: true });
    }

    setGridData(novaGrid);
  };

  // Handler de Paste (Copiar do Excel/Sheets)
  const handlePaste = (e) => {
    const pasteData = e.clipboardData.getData('text');
    const rows = pasteData.split(/\r?\n/).filter(row => row.trim() !== '');
    const matrix = rows.map(row => row.split('\t')); // Excel usa TAB

    const novaGrid = [...gridData];
    
    matrix.forEach((rowData, i) => {
      const rowIndex = gridData.findIndex(r => r.isNew && !r.nome) + i;
      if (rowIndex !== -1 && rowIndex < novaGrid.length + 10) {
        if (!novaGrid[rowIndex]) novaGrid[rowIndex] = { isNew: true };
        novaGrid[rowIndex] = {
          ...novaGrid[rowIndex],
          nome: rowData[0] || novaGrid[rowIndex].nome,
          preco_venda: rowData[1] || novaGrid[rowIndex].preco_venda,
          preco_custo: rowData[2] || novaGrid[rowIndex].preco_custo,
          dirty: true
        };
      }
    });
    setGridData(novaGrid);
    toast({ title: "Dados colados", description: "Planilha importada para a matriz." });
  };

  const handleSalvar = async () => {
    setSaving(true);
    const alterados = gridData.filter(item => item.dirty && item.nome && item.preco_venda);
    
    try {
      for (const item of alterados) {
        const payload = {
          nome: item.nome,
          preco_venda: parseFloat(item.preco_venda),
          preco_custo: parseFloat(item.preco_custo),
          categoria: item.categoria
        };

        if (item.id) {
          await Produto.update(item.id, payload);
        } else {
          await Produto.create(payload);
        }
      }
      toast({ title: "Arsenal Sincronizado", description: "Alterações guardadas com sucesso!" });
      loadData();
    } catch (error) {
      toast({ title: "Erro ao salvar", description: "Verifique os dados e tente novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getMargemClass = (venda, custo) => {
    const v = parseFloat(venda);
    const c = parseFloat(custo);
    if (!v || !c) return "";
    if (v < c) return "bg-red-100 text-red-800"; // Margem Negativa
    if ((v - c) / v < 0.2) return "bg-yellow-100 text-yellow-800"; // Margem < 20%
    return "bg-green-50 text-green-800";
  };

  return (
    <div className="p-4 space-y-4" onPaste={handlePaste}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-600" />
            Bancada de Inspeção (Editor de Matriz)
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData} disabled={loading}>
              Desfazer Tudo
            </Button>
            <Button onClick={handleSalvar} disabled={saving || loading} className="bg-blue-700">
              {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
              Sincronizar Arsenal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Filtrar produtos na matriz..." 
                className="pl-10"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>
            <Badge variant="outline" className="py-2">
              <ClipboardPaste className="w-4 h-4 mr-2" />
              Dica: Podes colar (Ctrl+V) do Excel diretamente aqui.
            </Badge>
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="w-24">Código/ID</TableHead>
                  <TableHead className="flex-1">Nome do Produto (Mãe)</TableHead>
                  <TableHead className="w-32">Custo</TableHead>
                  <TableHead className="w-32">Venda</TableHead>
                  <TableHead className="w-24">Margem %</TableHead>
                  <TableHead className="w-32">Categoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gridData
                  .filter(p => !filtro || p.nome?.toLowerCase().includes(filtro.toLowerCase()))
                  .map((item, index) => (
                  <TableRow key={index} className={item.dirty ? "bg-blue-50/50" : ""}>
                    <TableCell className="text-gray-400 text-xs">
                      {item.id ? item.id.substring(0,8) : <Plus className="w-3 h-3 text-green-500" />}
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={item.nome || ''} 
                        onChange={(e) => handleCellChange(index, 'nome', e.target.value)}
                        className="border-transparent hover:border-gray-300 focus:bg-white bg-transparent h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={item.preco_custo || ''} 
                        onChange={(e) => handleCellChange(index, 'preco_custo', e.target.value)}
                        className="border-transparent hover:border-gray-300 focus:bg-white bg-transparent h-8 font-mono"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={item.preco_venda || ''} 
                        onChange={(e) => handleCellChange(index, 'preco_venda', e.target.value)}
                        className={`border-transparent hover:border-gray-300 focus:bg-white h-8 font-mono ${getMargemClass(item.preco_venda, item.preco_custo)}`}
                        placeholder="=valor*1.1"
                      />
                    </TableCell>
                    <TableCell className="text-xs font-bold">
                      {item.preco_venda && item.preco_custo ? 
                        (((item.preco_venda - item.preco_custo) / item.preco_venda) * 100).toFixed(1) + '%' 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={item.categoria || ''} 
                        onChange={(e) => handleCellChange(index, 'categoria', e.target.value)}
                        className="border-transparent hover:border-gray-300 focus:bg-white bg-transparent h-8"
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
