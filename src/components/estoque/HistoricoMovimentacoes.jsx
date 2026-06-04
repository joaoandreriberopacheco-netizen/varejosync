import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, P38TableShell } from '@/components/ui/table';
import { P38MobileLine, P38MobileLineList } from '@/components/ui/p38-mobile-line';
import { Badge } from '@/components/ui/badge';
import { ArrowDownCircle, ArrowUpCircle, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

export default function HistoricoMovimentacoes() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('all');
  const [filtroProduto, setFiltroProduto] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [movData, prodData] = await Promise.all([
        base44.entities.MovimentacaoEstoque.list('-created_date'),
        base44.entities.Produto.list()
      ]);
      setMovimentacoes(movData);
      setProdutos(prodData);
    } catch (error) {
      console.error("Erro ao carregar movimentações:", error);
    }
    setIsLoading(false);
  };

  const filteredMovimentacoes = movimentacoes.filter(mov => {
    const matchSearch = mov.produto_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        mov.documento_referencia?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = filtroTipo === 'all' || mov.tipo === filtroTipo;
    const matchProduto = filtroProduto === 'all' || mov.produto_id === filtroProduto;
    
    return matchSearch && matchTipo && matchProduto;
  });

  const getTipoBadge = (tipo) => {
    return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
  };

  const getMotivoBadge = (motivo) => {
    return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <ArrowUpCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          Histórico Completo de Movimentações
        </h2>
      </div>
      
      <div>
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Buscar produto ou documento..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="Entrada">Entrada</SelectItem>
              <SelectItem value="Saída">Saída</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtroProduto} onValueChange={setFiltroProduto}>
            <SelectTrigger>
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Produtos</SelectItem>
              {produtos.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={loadData} className="gap-2">
            <Filter className="w-4 h-4" />
            Atualizar
          </Button>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Total Entradas</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {movimentacoes.filter(m => m.tipo === 'Entrada').length}
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Total Saídas</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {movimentacoes.filter(m => m.tipo === 'Saída').length}
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Total Movimentações</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {movimentacoes.length}
            </div>
          </div>
        </div>

        {/* Lista Mobile */}
        {isLoading ? (
          <div className="md:hidden text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredMovimentacoes.length === 0 ? (
          <div className="md:hidden text-center py-8 text-muted-foreground">Nenhuma movimentação encontrada</div>
        ) : (
          <P38MobileLineList>
            {filteredMovimentacoes.map((mov, index) => {
              const tone = mov.tipo === 'Entrada' ? 'success' : 'danger';
              const qtyPrefix = mov.tipo === 'Entrada' ? '+' : '-';
              return (
                <P38MobileLine
                  key={mov.id}
                  striped={index % 2 === 1}
                  accent={tone}
                  title={mov.produto_nome}
                  subtitle={format(new Date(mov.created_date), 'dd/MM/yyyy HH:mm')}
                  meta={
                    <>
                      <span className="font-medium">{mov.tipo}</span>
                      <span>{mov.motivo}</span>
                      <span className="truncate">{mov.usuario_responsavel || 'N/A'}</span>
                      <span>Doc: {mov.documento_referencia || '-'}</span>
                    </>
                  }
                  value={`${qtyPrefix}${mov.quantidade}`}
                  valueSub={`R$ ${mov.custo_unitario?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`}
                />
              );
            })}
          </P38MobileLineList>
        )}

        {/* Tabela Desktop */}
        <P38TableShell className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredMovimentacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Nenhuma movimentação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovimentacoes.map(mov => (
                  <TableRow key={mov.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div>{format(new Date(mov.created_date), 'dd/MM/yyyy')}</div>
                      <div className="text-xs text-gray-500">{format(new Date(mov.created_date), 'HH:mm')}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTipoBadge(mov.tipo)}>
                        {mov.tipo === 'Entrada' ? (
                          <ArrowDownCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <ArrowUpCircle className="w-3 h-3 mr-1" />
                        )}
                        {mov.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{mov.produto_nome}</div>
                      <div className="text-xs text-gray-500">
                        Custo: R$ {mov.custo_unitario?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getMotivoBadge(mov.motivo)} variant="outline">
                        {mov.motivo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold ${mov.tipo === 'Entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {mov.tipo === 'Entrada' ? '+' : '-'}{mov.quantidade}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{mov.documento_referencia || '-'}</TableCell>
                    <TableCell className="text-sm">{mov.usuario_responsavel || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </P38TableShell>

        {filteredMovimentacoes.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Exibindo {filteredMovimentacoes.length} de {movimentacoes.length} movimentações
          </div>
        )}
      </div>
    </div>
  );
}
