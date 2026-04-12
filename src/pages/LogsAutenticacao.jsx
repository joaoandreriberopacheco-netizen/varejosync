import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Calendar, User, FileText, Image as ImageIcon, Clock, Filter, X } from 'lucide-react';
import { format } from 'date-fns';

export default function LogsAutenticacaoPage() {
  const [logs, setLogs] = useState([]);
  const [intervenientes, setIntervenientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterInterveniente, setFilterInterveniente] = useState('');
  const [filterDataInicio, setFilterDataInicio] = useState('');
  const [filterDataFim, setFilterDataFim] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showImageDialog, setShowImageDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Buscar pedidos que tem histórico com autenticações
      const pedidos = await base44.entities.PedidoCompra.list();
      
      // Extrair logs do histórico
      const extractedLogs = [];
      
      pedidos.forEach(pedido => {
        if (pedido.historico) {
          const matches = pedido.historico.matchAll(/\[(.*?): (.*?) \| Ref: (.*?) \| (.*?)\]/g);
          for (const match of matches) {
            extractedLogs.push({
              id: `${pedido.id}-${match[3]}`,
              pedido_id: pedido.id,
              pedido_numero: pedido.numero,
              acao: match[1],
              interveniente: match[2],
              codigo_operacao: match[3],
              data: match[4],
              timestamp: new Date(match[4].split(' ').reverse().join('/')).getTime()
            });
          }
        }
      });

      // Ordenar por data mais recente
      extractedLogs.sort((a, b) => b.timestamp - a.timestamp);
      
      setLogs(extractedLogs);

      // Buscar intervenientes únicos
      const uniqueIntervenientes = [...new Set(extractedLogs.map(l => l.interveniente))];
      setIntervenientes(uniqueIntervenientes);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
    setIsLoading(false);
  };

  const filteredLogs = logs.filter(log => {
    const matchSearch = !searchTerm || 
      log.pedido_numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.interveniente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.codigo_operacao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.acao?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchInterveniente = !filterInterveniente || log.interveniente === filterInterveniente;

    const matchData = (!filterDataInicio || log.timestamp >= new Date(filterDataInicio).getTime()) &&
                      (!filterDataFim || log.timestamp <= new Date(filterDataFim).getTime());

    return matchSearch && matchInterveniente && matchData;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterInterveniente('');
    setFilterDataInicio('');
    setFilterDataFim('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-medium text-gray-800 dark:text-gray-200 mb-1">Logs de Autenticação</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Histórico completo de operações autenticadas no sistema</p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pb-6 border-b border-gray-200 dark:border-gray-700">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total de Operações</div>
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">{filteredLogs.length}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Intervenientes Ativos</div>
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">{intervenientes.length}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Hoje</div>
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
            {filteredLogs.filter(l => {
              const logDate = new Date(l.data.split(' ').reverse().join('/'));
              const today = new Date();
              return logDate.toDateString() === today.toDateString();
            }).length}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Esta Semana</div>
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
            {filteredLogs.filter(l => {
              const logDate = new Date(l.data.split(' ').reverse().join('/'));
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return logDate >= weekAgo;
            }).length}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Filter className="w-4 h-4" />
            Filtros
          </div>
          {(searchTerm || filterInterveniente || filterDataInicio || filterDataFim) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="gap-2 text-xs"
            >
              <X className="w-3 h-3" />
              Limpar Filtros
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar por pedido, código, ação..."
              className="pl-11 bg-gray-50 dark:bg-gray-700 border-0 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={filterInterveniente} onValueChange={setFilterInterveniente}>
            <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-0 shadow-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <SelectValue placeholder="Todos os intervenientes" />
              </div>
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800">
              <SelectItem value={null}>Todos os intervenientes</SelectItem>
              {intervenientes.map(nome => (
                <SelectItem key={nome} value={nome}>{nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            className="bg-gray-50 dark:bg-gray-700 border-0 shadow-sm"
            value={filterDataInicio}
            onChange={(e) => setFilterDataInicio(e.target.value)}
            placeholder="Data início"
          />

          <Input
            type="date"
            className="bg-gray-50 dark:bg-gray-700 border-0 shadow-sm"
            value={filterDataFim}
            onChange={(e) => setFilterDataFim(e.target.value)}
            placeholder="Data fim"
          />
        </div>
      </div>

      {/* Tabela de Logs */}
      <div className="border-0 shadow-sm rounded-xl bg-white dark:bg-gray-800 min-w-0 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 animate-spin" />
            <p>Carregando logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Nenhum log encontrado</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || filterInterveniente || filterDataInicio ? 'Tente ajustar os filtros' : 'Não há operações registradas'}
            </p>
          </div>
        ) : (
          <div className="w-full min-w-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-900/80">
              <TableRow className="border-0">
                <TableHead className="text-gray-700 dark:text-gray-300">Data/Hora</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">Pedido</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">Ação</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">Interveniente</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">Código Operação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow 
                  key={log.id} 
                  className="border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                >
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {log.data}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-gray-800 dark:text-gray-200">
                    {log.pedido_numero}
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {log.acao}
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      {log.interveniente}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-400">
                    {log.codigo_operacao}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </div>

      {/* Dialog de Imagem */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-gray-200">Evidência Fotográfica</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
                <img 
                  src={selectedLog.evidencia_url} 
                  alt="Evidência"
                  className="w-full h-auto rounded"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pedido</div>
                  <div className="font-medium text-gray-800 dark:text-gray-200">{selectedLog.pedido_numero}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Interveniente</div>
                  <div className="font-medium text-gray-800 dark:text-gray-200">{selectedLog.interveniente}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}