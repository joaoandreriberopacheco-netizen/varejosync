import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

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

    try {
      const entitiesToDelete = [
        'CustoDetalhado', 'MovimentacaoEstoque', 'OrdemSeparacao', 'ProtocoloEntrega', 'AgendaLogistica',
        'LancamentoFinanceiro', 'MovimentosCaixa',
        'PedidoVenda', 'PedidoCompra', 'VendaPerdida', 'Cotacao', 'Tarefa',
        'Produto',
        'Veiculo', 'Campanha', 'TabelaPreco', 
        'Terceiro', 'Colaborador',
        'ContasFinanceiras', 'FormasDePagamento', 'Maquininha', 
        'CategoriaFinanceira', 'PoliticasDesconto', 'EventosLogisticos', 
        'ConfiguracoesVenda', 'ConfiguracoesEstoque',
        'Categoria', 'CategoriaProduto'
      ];

      let totalDeleted = 0;

      for (const entityName of entitiesToDelete) {
        try {
          let hasMore = true;
          while (hasMore) {
            const records = await base44.entities[entityName].list('-created_date', 100); 
            
            if (records && records.length > 0) {
              await Promise.all(records.map(r => base44.entities[entityName].delete(r.id)));
              totalDeleted += records.length;
              
              if (records.length < 100) hasMore = false;
            } else {
              hasMore = false;
            }
          }
        } catch (err) {
          console.warn(`Erro ao limpar ${entityName}:`, err);
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

    try {
      let deletedCount = 0;

      const produtos = await base44.entities.Produto.list('-created_date', 5000);
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
        for (const id of produtosToDelete) {
          await base44.entities.Produto.delete(id);
        }
        deletedCount += produtosToDelete.length;
      }

      const terceiros = await base44.entities.Terceiro.list('-created_date', 5000);
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
    if (!confirm("ATENÇÃO: Isso criará 50 produtos e 15 terceiros de materiais de construção.\n\nDeseja continuar?")) return;

    setLoading(true);

    try {
      // 1. Fornecedores (8 fornecedores)
      const fornecedoresData = [
        { nome: "Votorantim Cimentos", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "vendas@votorantim.com", telefone: "(11) 3333-4444", ativo: true },
        { nome: "Tigre Tubos e Conexões", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "comercial@tigre.com.br", telefone: "(47) 2107-6000", ativo: true },
        { nome: "Suvinil Tintas", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "contato@suvinil.com.br", telefone: "(11) 2184-2000", ativo: true },
        { nome: "Gerdau Aços", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "vendas@gerdau.com.br", telefone: "(51) 3323-2000", ativo: true },
        { nome: "Quartzolit Materiais", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "sac@quartzolit.com.br", telefone: "0800 701 1105", ativo: true },
        { nome: "Cerâmica Elizabeth", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "vendas@elizabeth.com.br", telefone: "(47) 3357-9000", ativo: true },
        { nome: "Telhanorte Distribuição", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "comercial@telhanorte.com.br", telefone: "(11) 3311-3000", ativo: true },
        { nome: "Leroy Merlin Brasil", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "fornecedores@leroymerlin.com.br", telefone: "(11) 3033-3000", ativo: true }
      ];

      const createdFornecedores = [];
      for (const f of fornecedoresData) {
        const exists = await base44.entities.Terceiro.filter({ nome: f.nome });
        if (exists.length === 0) {
          const res = await base44.entities.Terceiro.create(f);
          createdFornecedores.push(res);
        } else {
          createdFornecedores.push(exists[0]);
        }
      }

      // 2. Clientes (7 clientes)
      const clientesData = [
        { nome: "Construtora Silva & Filhos", tipo: "Cliente", perfil: "Construtora/Obra", email: "obras@silva.com.br", telefone: "(11) 98765-4321", ativo: true },
        { nome: "João Pedreiro", tipo: "Cliente", perfil: "Profissional/Instalador", email: "joao.pedreiro@gmail.com", telefone: "(11) 99876-5432", ativo: true },
        { nome: "Maria Oliveira Reformas", tipo: "Cliente", perfil: "Pessoa Física", email: "maria.oliveira@gmail.com", telefone: "(11) 97654-3210", ativo: true },
        { nome: "Edificações Moderna Ltda", tipo: "Cliente", perfil: "Construtora/Obra", email: "contato@moderna.com.br", telefone: "(11) 3322-1100", ativo: true },
        { nome: "Carlos Encanador", tipo: "Cliente", perfil: "Profissional/Instalador", email: "carlos.enc@hotmail.com", telefone: "(11) 96543-2109", ativo: true },
        { nome: "Ana Paula Santos", tipo: "Cliente", perfil: "Pessoa Física", email: "anapaula@uol.com.br", telefone: "(11) 95432-1098", ativo: true },
        { nome: "Construtora Horizonte", tipo: "Cliente", perfil: "Construtora/Obra", email: "projetos@horizonte.com.br", telefone: "(11) 3344-5566", ativo: true }
      ];

      for (const c of clientesData) {
        const exists = await base44.entities.Terceiro.filter({ nome: c.nome });
        if (exists.length === 0) {
          await base44.entities.Terceiro.create(c);
        }
      }

      // 3. 50 Produtos de Materiais de Construção
      const produtosData = [
        { nome: "Cimento CP-II 50kg", codigo_interno: "CIM-001", tipo: "Produto", valor_compra: 28.50, preco_venda_padrao: 42.00, unidade_principal: "SC", fornecedor_padrao_id: createdFornecedores[0]?.id, marca: "Votorantim", ativo: true },
        { nome: "Cimento CP-III 50kg", codigo_interno: "CIM-002", tipo: "Produto", valor_compra: 31.00, preco_venda_padrao: 45.50, unidade_principal: "SC", fornecedor_padrao_id: createdFornecedores[0]?.id, marca: "Votorantim", ativo: true },
        { nome: "Areia Média Lavada (m³)", codigo_interno: "ARE-001", tipo: "Produto", valor_compra: 80.00, preco_venda_padrao: 120.00, unidade_principal: "M3", marca: "Granel", ativo: true },
        { nome: "Areia Fina (m³)", codigo_interno: "ARE-002", tipo: "Produto", valor_compra: 75.00, preco_venda_padrao: 110.00, unidade_principal: "M3", marca: "Granel", ativo: true },
        { nome: "Brita 1 (m³)", codigo_interno: "BRI-001", tipo: "Produto", valor_compra: 85.00, preco_venda_padrao: 130.00, unidade_principal: "M3", marca: "Granel", ativo: true },
        { nome: "Brita 0 (m³)", codigo_interno: "BRI-002", tipo: "Produto", valor_compra: 82.00, preco_venda_padrao: 125.00, unidade_principal: "M3", marca: "Granel", ativo: true },
        { nome: "Tijolo Baiano 8 Furos (Milheiro)", codigo_interno: "TIJ-001", tipo: "Produto", valor_compra: 650.00, preco_venda_padrao: 890.00, unidade_principal: "MIL", marca: "Cerâmica", ativo: true },
        { nome: "Tijolo Maciço (Milheiro)", codigo_interno: "TIJ-002", tipo: "Produto", valor_compra: 720.00, preco_venda_padrao: 980.00, unidade_principal: "MIL", marca: "Cerâmica", ativo: true },
        { nome: "Bloco de Concreto 14x19x39", codigo_interno: "BLC-001", tipo: "Produto", valor_compra: 3.20, preco_venda_padrao: 4.80, unidade_principal: "UN", marca: "Concreto", ativo: true },
        { nome: "Bloco de Concreto 9x19x39", codigo_interno: "BLC-002", tipo: "Produto", valor_compra: 2.50, preco_venda_padrao: 3.90, unidade_principal: "UN", marca: "Concreto", ativo: true },
        { nome: "Tubo PVC Esgoto 100mm 6m", codigo_interno: "PVC-001", tipo: "Produto", valor_compra: 45.00, preco_venda_padrao: 61.60, unidade_principal: "BR", fornecedor_padrao_id: createdFornecedores[1]?.id, marca: "Tigre", ativo: true },
        { nome: "Tubo PVC Esgoto 150mm 6m", codigo_interno: "PVC-002", tipo: "Produto", valor_compra: 89.00, preco_venda_padrao: 128.00, unidade_principal: "BR", fornecedor_padrao_id: createdFornecedores[1]?.id, marca: "Tigre", ativo: true },
        { nome: "Tubo PVC Água 25mm 6m", codigo_interno: "PVC-003", tipo: "Produto", valor_compra: 22.00, preco_venda_padrao: 32.00, unidade_principal: "BR", fornecedor_padrao_id: createdFornecedores[1]?.id, marca: "Tigre", ativo: true },
        { nome: "Joelho 90° PVC Esgoto 100mm", codigo_interno: "CNX-001", tipo: "Produto", valor_compra: 5.20, preco_venda_padrao: 7.80, unidade_principal: "UN", fornecedor_padrao_id: createdFornecedores[1]?.id, marca: "Tigre", ativo: true },
        { nome: "Te PVC Esgoto 100mm", codigo_interno: "CNX-002", tipo: "Produto", valor_compra: 6.50, preco_venda_padrao: 9.50, unidade_principal: "UN", fornecedor_padrao_id: createdFornecedores[1]?.id, marca: "Tigre", ativo: true },
        { nome: "Luva PVC Esgoto 100mm", codigo_interno: "CNX-003", tipo: "Produto", valor_compra: 4.80, preco_venda_padrao: 6.90, unidade_principal: "UN", fornecedor_padrao_id: createdFornecedores[1]?.id, marca: "Tigre", ativo: true },
        { nome: "Tinta Acrílica Fosca Branco Neve 18L", codigo_interno: "TIN-001", tipo: "Produto", valor_compra: 280.00, preco_venda_padrao: 420.00, unidade_principal: "LT", fornecedor_padrao_id: createdFornecedores[2]?.id, marca: "Suvinil", ativo: true },
        { nome: "Tinta Acrílica Palha 18L", codigo_interno: "TIN-002", tipo: "Produto", valor_compra: 290.00, preco_venda_padrao: 435.00, unidade_principal: "LT", fornecedor_padrao_id: createdFornecedores[2]?.id, marca: "Suvinil", ativo: true },
        { nome: "Tinta Látex Premium Branco 18L", codigo_interno: "TIN-003", tipo: "Produto", valor_compra: 320.00, preco_venda_padrao: 480.00, unidade_principal: "LT", fornecedor_padrao_id: createdFornecedores[2]?.id, marca: "Suvinil", ativo: true },
        { nome: "Verniz Marítimo 3,6L", codigo_interno: "VER-001", tipo: "Produto", valor_compra: 85.00, preco_venda_padrao: 125.00, unidade_principal: "LT", marca: "Suvinil", ativo: true },
        { nome: "Ferro CA-50 8mm 12m", codigo_interno: "FER-001", tipo: "Produto", valor_compra: 42.00, preco_venda_padrao: 58.00, unidade_principal: "BR", fornecedor_padrao_id: createdFornecedores[3]?.id, marca: "Gerdau", ativo: true },
        { nome: "Ferro CA-50 10mm 12m", codigo_interno: "FER-002", tipo: "Produto", valor_compra: 65.00, preco_venda_padrao: 89.00, unidade_principal: "BR", fornecedor_padrao_id: createdFornecedores[3]?.id, marca: "Gerdau", ativo: true },
        { nome: "Ferro CA-50 12,5mm 12m", codigo_interno: "FER-003", tipo: "Produto", valor_compra: 98.00, preco_venda_padrao: 135.00, unidade_principal: "BR", fornecedor_padrao_id: createdFornecedores[3]?.id, marca: "Gerdau", ativo: true },
        { nome: "Arame Recozido 1kg", codigo_interno: "ARA-001", tipo: "Produto", valor_compra: 12.00, preco_venda_padrao: 18.00, unidade_principal: "KG", marca: "Gerdau", ativo: true },
        { nome: "Prego 18x27 1kg", codigo_interno: "PRG-001", tipo: "Produto", valor_compra: 8.50, preco_venda_padrao: 13.00, unidade_principal: "KG", marca: "Gerdau", ativo: true },
        { nome: "Cal Hidratada 20kg", codigo_interno: "CAL-001", tipo: "Produto", valor_compra: 12.00, preco_venda_padrao: 18.00, unidade_principal: "SC", marca: "Itaú", ativo: true },
        { nome: "Argamassa AC-II 20kg", codigo_interno: "ARG-001", tipo: "Produto", valor_compra: 18.50, preco_venda_padrao: 27.00, unidade_principal: "SC", fornecedor_padrao_id: createdFornecedores[4]?.id, marca: "Quartzolit", ativo: true },
        { nome: "Argamassa AC-III 20kg", codigo_interno: "ARG-002", tipo: "Produto", valor_compra: 22.00, preco_venda_padrao: 32.00, unidade_principal: "SC", fornecedor_padrao_id: createdFornecedores[4]?.id, marca: "Quartzolit", ativo: true },
        { nome: "Rejunte Branco 1kg", codigo_interno: "REJ-001", tipo: "Produto", valor_compra: 9.50, preco_venda_padrao: 14.50, unidade_principal: "KG", fornecedor_padrao_id: createdFornecedores[4]?.id, marca: "Quartzolit", ativo: true },
        { nome: "Rejunte Cinza 1kg", codigo_interno: "REJ-002", tipo: "Produto", valor_compra: 9.50, preco_venda_padrao: 14.50, unidade_principal: "KG", fornecedor_padrao_id: createdFornecedores[4]?.id, marca: "Quartzolit", ativo: true },
        { nome: "Cerâmica 45x45 Acetinado m²", codigo_interno: "CER-001", tipo: "Produto", valor_compra: 32.00, preco_venda_padrao: 48.00, unidade_principal: "M2", fornecedor_padrao_id: createdFornecedores[5]?.id, marca: "Elizabeth", ativo: true },
        { nome: "Cerâmica 60x60 Polido m²", codigo_interno: "CER-002", tipo: "Produto", valor_compra: 48.00, preco_venda_padrao: 72.00, unidade_principal: "M2", fornecedor_padrao_id: createdFornecedores[5]?.id, marca: "Elizabeth", ativo: true },
        { nome: "Porcelanato 60x60 Polido m²", codigo_interno: "POR-001", tipo: "Produto", valor_compra: 68.00, preco_venda_padrao: 98.00, unidade_principal: "M2", fornecedor_padrao_id: createdFornecedores[5]?.id, marca: "Elizabeth", ativo: true },
        { nome: "Telha Cerâmica Romana", codigo_interno: "TEL-001", tipo: "Produto", valor_compra: 2.80, preco_venda_padrao: 4.20, unidade_principal: "UN", marca: "Cerâmica", ativo: true },
        { nome: "Telha Fibrocimento 2,44m", codigo_interno: "TEL-002", tipo: "Produto", valor_compra: 45.00, preco_venda_padrao: 65.00, unidade_principal: "UN", marca: "Brasilit", ativo: true },
        { nome: "Caixa D'água 500L", codigo_interno: "CXA-001", tipo: "Produto", valor_compra: 180.00, preco_venda_padrao: 260.00, unidade_principal: "UN", marca: "Fortlev", ativo: true },
        { nome: "Caixa D'água 1000L", codigo_interno: "CXA-002", tipo: "Produto", valor_compra: 320.00, preco_venda_padrao: 480.00, unidade_principal: "UN", marca: "Fortlev", ativo: true },
        { nome: "Porta de Madeira 80cm", codigo_interno: "POR-001", tipo: "Produto", valor_compra: 280.00, preco_venda_padrao: 420.00, unidade_principal: "UN", marca: "Madeira", ativo: true },
        { nome: "Janela Basculante 60x40", codigo_interno: "JAN-001", tipo: "Produto", valor_compra: 145.00, preco_venda_padrao: 210.00, unidade_principal: "UN", marca: "Alumínio", ativo: true },
        { nome: "Fechadura Cromada 55mm", codigo_interno: "FEC-001", tipo: "Produto", valor_compra: 32.00, preco_venda_padrao: 48.00, unidade_principal: "UN", marca: "Pado", ativo: true },
        { nome: "Dobradiça 3\" Cromada", codigo_interno: "DOB-001", tipo: "Produto", valor_compra: 8.50, preco_venda_padrao: 13.00, unidade_principal: "UN", marca: "Pado", ativo: true },
        { nome: "Tomada 2P+T 10A Branca", codigo_interno: "ELE-001", tipo: "Produto", valor_compra: 5.20, preco_venda_padrao: 8.50, unidade_principal: "UN", marca: "Tramontina", ativo: true },
        { nome: "Interruptor Simples Branco", codigo_interno: "ELE-002", tipo: "Produto", valor_compra: 4.80, preco_venda_padrao: 7.50, unidade_principal: "UN", marca: "Tramontina", ativo: true },
        { nome: "Fio Elétrico 2,5mm 100m", codigo_interno: "FIO-001", tipo: "Produto", valor_compra: 85.00, preco_venda_padrao: 125.00, unidade_principal: "RL", marca: "Pirelli", ativo: true },
        { nome: "Fio Elétrico 4mm 100m", codigo_interno: "FIO-002", tipo: "Produto", valor_compra: 140.00, preco_venda_padrao: 200.00, unidade_principal: "RL", marca: "Pirelli", ativo: true },
        { nome: "Disjuntor 20A Bipolar", codigo_interno: "DIS-001", tipo: "Produto", valor_compra: 18.00, preco_venda_padrao: 27.00, unidade_principal: "UN", marca: "Schneider", ativo: true },
        { nome: "Quadro de Luz 12 Disjuntores", codigo_interno: "QDL-001", tipo: "Produto", valor_compra: 95.00, preco_venda_padrao: 140.00, unidade_principal: "UN", marca: "Steck", ativo: true },
        { nome: "Registro Esfera 1/2\" Cromado", codigo_interno: "REG-001", tipo: "Produto", valor_compra: 12.00, preco_venda_padrao: 18.50, unidade_principal: "UN", marca: "Deca", ativo: true },
        { nome: "Registro Pressão 3/4\"", codigo_interno: "REG-002", tipo: "Produto", valor_compra: 18.00, preco_venda_padrao: 27.00, unidade_principal: "UN", marca: "Deca", ativo: true },
        { nome: "Torneira Lavatório Cromada", codigo_interno: "TOR-001", tipo: "Produto", valor_compra: 45.00, preco_venda_padrao: 68.00, unidade_principal: "UN", marca: "Deca", ativo: true },
        { nome: "Torneira Pia de Cozinha", codigo_interno: "TOR-002", tipo: "Produto", valor_compra: 52.00, preco_venda_padrao: 78.00, unidade_principal: "UN", marca: "Deca", ativo: true }
      ];

      const createdProdutos = [];
      for (const p of produtosData) {
        const exists = await base44.entities.Produto.filter({ codigo_interno: p.codigo_interno });
        if (exists.length === 0) {
          const res = await base44.entities.Produto.create(p);
          createdProdutos.push(res);
        } else {
          createdProdutos.push(exists[0]);
        }
      }

      // Movimentação de estoque
      for (const prod of createdProdutos) {
        await base44.entities.MovimentacaoEstoque.create({
          produto_id: prod.id,
          produto_nome: prod.nome,
          tipo: "Entrada",
          motivo: "Ajuste de Inventário",
          quantidade: 100,
          custo_unitario: prod.valor_compra,
          observacoes: "Estoque Inicial (Seed)",
          usuario_responsavel: "Sistema"
        });

        await base44.entities.Produto.update(prod.id, { estoque_atual: 100 });
      }

      toast({
        title: "Dados Gerados!",
        description: `${createdProdutos.length} produtos e ${fornecedoresData.length + clientesData.length} terceiros criados com sucesso.`,
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
              Cria 50 produtos e 15 terceiros de materiais de construção para teste.
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