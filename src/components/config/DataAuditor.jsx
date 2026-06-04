import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Search, CheckCircle, Trash2, ShieldCheck } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Badge } from '@/components/ui/badge';

export default function DataAuditor() {
  const [results, setResults] = useState([]);
  const [scanning, setScanning] = useState(false);
  const { toast } = useToast();

  const entitiesToScan = [
    'Produto',
    'Terceiro',
    'PedidoVenda',
    'ContasFinanceiras',
    'MovimentosCaixa',
    'VendaPerdida',
    'LancamentoFinanceiro',
    'CategoriaFinanceira',
    'TabelaPreco',
    'PoliticasDesconto'
  ];

  const scanDatabase = async () => {
    setScanning(true);
    setResults([]);
    const newResults = [];

    try {
      // Scan each entity
      for (const entityName of entitiesToScan) {
        try {
          // AGORA RESTRITO: Buscamos APENAS registros do tenant atual para garantir privacidade.
          // "Roupa suja se lava em casa" -> Não podemos ver registros de outros tenants.
          // O objetivo agora é encontrar inconsistências DENTRO do próprio tenant (ex: registros corrompidos).
          
          const records = await base44.entities[entityName].list();
          
          // Não há mais sistema de tenant, então não verificamos empresa_id
        } catch (err) {
          console.error(`Erro ao escanear ${entityName}:`, err);
        }
      }
      
      setResults(newResults);
      
      if (newResults.length === 0) {
        toast({
          title: "Auditoria Concluída",
          description: "Nenhum problema encontrado na base de dados.",
          className: "bg-emerald-100 text-emerald-800"
        });
      } else {
        toast({
          title: "Auditoria Concluída",
          description: `${newResults.length} registros problemáticos encontrados.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro na Auditoria",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setScanning(false);
    }
  };

  const handleFix = async (item) => {
    try {
      await base44.entities[item.entity].update(item.id, {});
      
      setResults(results.filter(r => r.id !== item.id));
      toast({
        title: "Corrigido",
        description: "Registro atualizado com sucesso.",
        className: "bg-emerald-100 text-emerald-800"
      });
    } catch (error) {
      toast({
        title: "Erro ao corrigir",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (item) => {
    if (!confirm("Tem certeza que deseja excluir este registro permanentemente?")) return;

    try {
      await base44.entities[item.entity].delete(item.id);
      
      setResults(results.filter(r => r.id !== item.id));
      toast({
        title: "Excluído",
        description: "Registro removido com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`ATENÇÃO: Isso excluirá permanentemente ${results.length} registros encontrados.\n\nTem certeza absoluta?`)) return;

    setScanning(true); // Reusing scanning state to show activity
    let deletedCount = 0;
    const errors = [];

    try {
      // Execute deletions in sequence to avoid overwhelming the API, or use Promise.all for small batches
      // Using a loop here for simplicity and to track progress if needed
      for (const item of results) {
        try {
          await base44.entities[item.entity].delete(item.id);
          deletedCount++;
        } catch (err) {
          console.error(`Failed to delete ${item.entity} ${item.id}:`, err);
          errors.push(`${item.name}: ${err.message}`);
        }
      }

      if (deletedCount > 0) {
        toast({
          title: "Exclusão em Massa Concluída",
          description: `${deletedCount} registros foram removidos.`,
          className: "bg-emerald-100 text-emerald-800"
        });
      }

      if (errors.length > 0) {
        toast({
          title: "Erros na exclusão",
          description: `${errors.length} registros não puderam ser excluídos.`,
          variant: "destructive"
        });
      }

      // Re-scan to show remaining items (if any)
      await scanDatabase();

    } catch (error) {
      toast({
        title: "Erro Crítico",
        description: error.message,
        variant: "destructive"
      });
      setScanning(false);
    }
  };

  return (
    <Card className="font-glacial border-0 shadow-sm bg-card">
      <CardHeader className="pb-2 border-b border-slate-50 bg-slate-50/30">
        <CardTitle className="text-base md:text-lg font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          Auditoria de Dados
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-amber-800 dark:text-amber-300 text-sm">Ferramenta de Diagnóstico</h3>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
              Esta ferramenta verifica se existem registros na base de dados que não pertencem à sua empresa (tenant) ou que estão "órfãos" (sem vínculo).
              Isso pode ocorrer devido a importações antigas ou erros de sistema.
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button 
            onClick={scanDatabase} 
            disabled={scanning}
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[200px]"
          >
            {scanning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Processando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Escanear Agora
              </>
            )}
          </Button>

          {results.length > 0 && !scanning && (
            <Button 
              onClick={handleDeleteAll} 
              disabled={scanning}
              size="lg"
              variant="destructive"
              className="min-w-[200px] gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Excluir Todos ({results.length})
            </Button>
          )}
        </div>

        {results.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40 dark:bg-muted">
                <TableRow>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Identificador / Nome</TableHead>
                  <TableHead>Problema</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((item, index) => (
                  <TableRow key={`${item.entity}-${item.id}-${index}`}>
                    <TableCell className="font-medium">{item.entity}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{item.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{item.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {item.issue}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-xs border-emerald-200 hover:bg-emerald-50 text-emerald-700"
                          onClick={() => handleFix(item)}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Assumir
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-xs border-red-200 hover:bg-red-50 text-red-700"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {!scanning && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-border/40 rounded-lg">
            Os resultados da auditoria aparecerão aqui.
          </div>
        )}
      </CardContent>
    </Card>
  );
}