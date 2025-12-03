import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getTenantId } from '@/components/utils/tenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Hammer, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Badge } from '@/components/ui/badge';

export default function SeedDataTool() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const clearData = async () => {
    if (!confirm("ATENÇÃO: Isso APAGARÁ TODOS os dados de teste (Produtos, Clientes, Fornecedores, Movimentações) do seu ambiente.\n\nEsta ação não pode ser desfeita.\n\nDeseja continuar?")) return;

    setLoading(true);
    const tenantId = getTenantId();
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      // Ordem de exclusão AJUSTADA para evitar erros de chave estrangeira
      // Entidades filhas (que apontam para outras) devem ser deletadas PRIMEIRO
      const entitiesToDelete = [
        'CustoDetalhado', 'MovimentacaoEstoque', 'OrdemSeparacao', 'ProtocoloEntrega', 'AgendaLogistica', // Dependentes de Produto/Pedido
        'LancamentoFinanceiro', 'MovimentosCaixa', // Dependentes de Contas/Terceiros
        'PedidoVenda', 'PedidoCompra', 'VendaPerdida', 'Cotacao', 'Tarefa', // Transacionais
        'Produto', // Tem dependentes deletados acima
        'Veiculo', 'Campanha', 'TabelaPreco', 
        'Terceiro', 'Colaborador', // Pessoas
        'ContasFinanceiras', 'FormasDePagamento', 'Maquininha', 
        'CategoriaFinanceira', 'PoliticasDesconto', 'EventosLogisticos', 
        'ConfiguracoesVenda', 'ConfiguracoesEstoque',
        'Categoria', 'CategoriaProduto'
      ];

      let totalDeleted = 0;

      for (const entityName of entitiesToDelete) {
        try {
          // Loop para garantir que tudo seja deletado (paginação)
          let hasMore = true;
          while (hasMore) {
            const records = await base44.entities[entityName].filter({ empresa_id: tenantId }, null, 100); 
            
            if (records && records.length > 0) {
              // Deletar em paralelo
              await Promise.all(records.map(r => base44.entities[entityName].delete(r.id)));
              totalDeleted += records.length;
              
              // Se retornou menos que o limite, acabou
              if (records.length < 100) hasMore = false;
            } else {
              hasMore = false;
            }
          }
        } catch (err) {
          console.warn(`Erro ao limpar ${entityName}:`, err);
          // Continua para as próximas entidades
        }
      }

      toast({
        title: "Zerar Sistema Concluído",
        description: `${totalDeleted} registros foram apagados de todas as tabelas operacionais.`,
        className: "bg-emerald-100 text-emerald-800"
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao limpar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeDuplicates = async () => {
    if (!confirm("Esta ação buscará por Produtos e Terceiros duplicados (mesmo código ou nome) e manterá apenas UM de cada, removendo os excedentes.\n\nDeseja continuar?")) return;

    setLoading(true);
    const tenantId = getTenantId();
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      let deletedCount = 0;

      // 1. Deduplicar Produtos por codigo_interno
      const produtos = await base44.entities.Produto.filter({ empresa_id: tenantId }, null, 5000);
      const produtosMap = new Map();
      const produtosToDelete = [];

      produtos.forEach(p => {
        if (!p.codigo_interno) return;
        if (produtosMap.has(p.codigo_interno)) {
          produtosToDelete.push(p.id);
        } else {
          produtosMap.set(p.codigo_interno, p.id);
        }
      });

      if (produtosToDelete.length > 0) {
        // Delete em batches
        for (const id of produtosToDelete) {
          await base44.entities.Produto.delete(id);
        }
        deletedCount += produtosToDelete.length;
      }

      // 2. Deduplicar Terceiros por nome
      const terceiros = await base44.entities.Terceiro.filter({ empresa_id: tenantId }, null, 5000);
      const terceirosMap = new Map();
      const terceirosToDelete = [];

      terceiros.forEach(t => {
        if (!t.nome) return;
        const key = t.nome.toLowerCase().trim();
        if (terceirosMap.has(key)) {
          terceirosToDelete.push(t.id);
        } else {
          terceirosMap.set(key, t.id);
        }
      });

      if (terceirosToDelete.length > 0) {
        for (const id of terceirosToDelete) {
          await base44.entities.Terceiro.delete(id);
        }
        deletedCount += terceirosToDelete.length;
      }

      toast({
        title: "Limpeza de Duplicatas Concluída",
        description: `${deletedCount} registros duplicados foram removidos.`,
        className: "bg-emerald-100 text-emerald-800"
      });

    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao remover duplicatas",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateData = async () => {
    if (!confirm("ATENÇÃO: Isso criará vários dados de teste (Produtos, Clientes, etc) no seu ambiente atual.\n\nDeseja continuar?")) return;

    setLoading(true);
    const tenantId = getTenantId();
    
    if (!tenantId) {
      toast({ title: "Erro", description: "Tenant não identificado.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      // 1. Fornecedores
      const fornecedores = [
        { nome: "Votorantim Cimentos", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "contato@votorantim.com", empresa_id: tenantId, ativo: true },
        { nome: "Tigre Tubos e Conexões", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "vendas@tigre.com", empresa_id: tenantId, ativo: true },
        { nome: "Suvinil Tintas", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "contato@suvinil.com.br", empresa_id: tenantId, ativo: true }
      ];

      const createdFornecedores = [];
      for (const f of fornecedores) {
        // Verificar duplicidade
        const exists = await base44.entities.Terceiro.filter({ nome: f.nome, empresa_id: tenantId });
        if (exists.length === 0) {
          const res = await base44.entities.Terceiro.create(f);
          createdFornecedores.push(res);
        } else {
          createdFornecedores.push(exists[0]);
        }
      }

      // 2. Clientes
      const clientes = [
        { nome: "Construtora Silva & Filhos", tipo: "Cliente", perfil: "Construtora/Obra", email: "obras@silva.com", empresa_id: tenantId, ativo: true },
        { nome: "João da Reforma", tipo: "Cliente", perfil: "Profissional/Instalador", email: "joao.pedreiro@gmail.com", empresa_id: tenantId, ativo: true },
        { nome: "Maria Oliveira", tipo: "Cliente", perfil: "Pessoa Física", email: "maria.o@uol.com.br", empresa_id: tenantId, ativo: true }
      ];

      for (const c of clientes) {
        const exists = await base44.entities.Terceiro.filter({ nome: c.nome, empresa_id: tenantId });
        if (exists.length === 0) {
          await base44.entities.Terceiro.create(c);
        }
      }

      // 3. Produtos
      const produtos = [
        { 
          nome: "Cimento CP-II 50kg", 
          codigo_interno: "CIM-001", 
          tipo: "Produto", 
          valor_compra: 28.50, 
          preco_venda_padrao: 39.90, 
          estoque_atual: 0, 
          unidade_principal: "SC",
          empresa_id: tenantId,
          fornecedor_padrao_id: createdFornecedores[0]?.id,
          ativo: true
        },
        { 
          nome: "Areia Média Lavada (m³)", 
          codigo_interno: "ARE-005", 
          tipo: "Produto", 
          valor_compra: 80.00, 
          preco_venda_padrao: 120.00, 
          estoque_atual: 0, 
          unidade_principal: "M3",
          empresa_id: tenantId,
          ativo: true
        },
        { 
          nome: "Tijolo Baiano 8 Furos (Milheiro)", 
          codigo_interno: "TIJ-8F", 
          tipo: "Produto", 
          valor_compra: 650.00, 
          preco_venda_padrao: 890.00, 
          estoque_atual: 0, 
          unidade_principal: "MIL",
          empresa_id: tenantId,
          ativo: true
        },
        { 
          nome: "Tubo PVC Esgoto 100mm 6m", 
          codigo_interno: "PVC-100", 
          tipo: "Produto", 
          valor_compra: 45.00, 
          preco_venda_padrao: 78.90, 
          estoque_atual: 0, 
          unidade_principal: "BR",
          empresa_id: tenantId,
          fornecedor_padrao_id: createdFornecedores[1]?.id,
          ativo: true
        },
        { 
          nome: "Tinta Acrílica Fosca Branco Neve 18L", 
          codigo_interno: "TIN-18L", 
          tipo: "Produto", 
          valor_compra: 280.00, 
          preco_venda_padrao: 420.00, 
          estoque_atual: 0, 
          unidade_principal: "LT",
          empresa_id: tenantId,
          fornecedor_padrao_id: createdFornecedores[2]?.id,
          ativo: true
        }
      ];

      const createdProdutos = [];
      for (const p of produtos) {
        const exists = await base44.entities.Produto.filter({ codigo_interno: p.codigo_interno, empresa_id: tenantId });
        if (exists.length === 0) {
          const res = await base44.entities.Produto.create(p);
          createdProdutos.push(res);
        } else {
           createdProdutos.push(exists[0]);
        }
      }

      // 4. Colaboradores (Fictícios)
      const colaboradores = [
        { nome: "Carlos Vendedor", email: "carlos@loja.com", cargo: "Vendedor", perfil: "Vendedor", empresa_id: tenantId, ativo: true },
        { nome: "Ana Caixa", email: "ana@loja.com", cargo: "Caixa", perfil: "Caixa", empresa_id: tenantId, ativo: true, acesso_caixa: true },
        { nome: "Pedro Estoque", email: "pedro@loja.com", cargo: "Estoquista", perfil: "Estoquista", empresa_id: tenantId, ativo: true, acesso_estoque: true }
      ];

      for (const colab of colaboradores) {
        // Verifica se já existe para não duplicar e-mail (opcional, mas bom)
        const exists = await base44.entities.Colaborador.filter({ email: colab.email, empresa_id: tenantId });
        if (exists.length === 0) {
          await base44.entities.Colaborador.create(colab);
        }
      }

      // 5. Movimentação de Estoque (Entrada Inicial)
      for (const prod of createdProdutos) {
        await base44.entities.MovimentacaoEstoque.create({
          empresa_id: tenantId,
          produto_id: prod.id,
          produto_nome: prod.nome,
          tipo: "Entrada",
          motivo: "Ajuste de Inventário",
          quantidade: 100, // Estoque inicial generoso
          custo_unitario: prod.valor_compra,
          observacoes: "Estoque Inicial (Seed)",
          usuario_responsavel: "Admin"
        });

        // Atualiza o produto com o estoque
        await base44.entities.Produto.update(prod.id, { estoque_atual: 100 });
      }

      toast({
        title: "Dados Gerados!",
        description: "Ambiente populado com sucesso (Material de Construção).",
        className: "bg-emerald-100 text-emerald-800"
      });

    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao gerar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="font-glacial border-0 shadow-sm bg-white dark:bg-gray-800 mt-6">
      <CardHeader className="pb-2 border-b border-slate-50 bg-slate-50/30">
        <CardTitle className="text-base md:text-lg font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          Gerador de Dados de Teste
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
          <Hammer className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-blue-800 dark:text-blue-300 text-sm">Ambiente de Materiais de Construção</h3>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
              Utilize esta ferramenta para popular seu ambiente com dados fictícios de uma loja de materiais de construção.
              Isso criará Produtos, Clientes, Fornecedores e Colaboradores vinculados ao seu tenant atual.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Button 
            onClick={generateData} 
            disabled={loading}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px]"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Gerar Dados
              </>
            )}
          </Button>

          <Button 
            onClick={clearData} 
            disabled={loading}
            size="lg"
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 text-white min-w-[200px]"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ZERANDO SISTEMA...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 mr-2" />
                ZERAR TUDO (DANGER)
              </>
            )}
          </Button>

          <Button 
            onClick={removeDuplicates} 
            disabled={loading}
            size="lg"
            variant="outline"
            className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800 min-w-[200px]"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Remover Duplicatas
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}