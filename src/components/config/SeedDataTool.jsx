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

  const convertToNumericCodes = async () => {
    if (!confirm("Esta ação converterá TODOS os códigos internos alfanuméricos (ARA-001, TIN-002, etc) para códigos numéricos sequenciais (000001, 000002, etc).\n\nDeseja continuar?")) return;

    setLoading(true);

    try {
      const produtos = await base44.entities.Produto.list('-created_date', 5000);
      let codigoSequencial = 1;
      let convertedCount = 0;

      for (const produto of produtos) {
        const codigoNumerico = String(codigoSequencial).padStart(6, '0');
        await base44.entities.Produto.update(produto.id, { 
          codigo_interno: codigoNumerico 
        });
        codigoSequencial++;
        convertedCount++;
      }

      toast({
        title: "Conversão Concluída",
        description: `${convertedCount} produtos foram atualizados com códigos numéricos sequenciais.`,
        className: "bg-emerald-100 text-emerald-800"
      });

    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao converter códigos",
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
      // 1. Fornecedores (8 fornecedores) - TUDO EM MAIÚSCULAS
      const fornecedoresData = [
        { nome: "VOTORANTIM CIMENTOS", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "vendas@votorantim.com", telefone: "(11) 3333-4444", ativo: true },
        { nome: "TIGRE TUBOS E CONEXÕES", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "comercial@tigre.com.br", telefone: "(47) 2107-6000", ativo: true },
        { nome: "SUVINIL TINTAS", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "contato@suvinil.com.br", telefone: "(11) 2184-2000", ativo: true },
        { nome: "GERDAU AÇOS", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "vendas@gerdau.com.br", telefone: "(51) 3323-2000", ativo: true },
        { nome: "QUARTZOLIT MATERIAIS", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "sac@quartzolit.com.br", telefone: "0800 701 1105", ativo: true },
        { nome: "CERÂMICA ELIZABETH", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "vendas@elizabeth.com.br", telefone: "(47) 3357-9000", ativo: true },
        { nome: "TELHANORTE DISTRIBUIÇÃO", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "comercial@telhanorte.com.br", telefone: "(11) 3311-3000", ativo: true },
        { nome: "LEROY MERLIN BRASIL", tipo: "Fornecedor", perfil: "Empresa/Loja", email: "fornecedores@leroymerlin.com.br", telefone: "(11) 3033-3000", ativo: true }
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

      // 2. Clientes (7 clientes) - TUDO EM MAIÚSCULAS
      const clientesData = [
        { nome: "CONSTRUTORA SILVA & FILHOS", tipo: "Cliente", perfil: "Construtora/Obra", email: "obras@silva.com.br", telefone: "(11) 98765-4321", ativo: true },
        { nome: "JOÃO PEDREIRO", tipo: "Cliente", perfil: "Profissional/Instalador", email: "joao.pedreiro@gmail.com", telefone: "(11) 99876-5432", ativo: true },
        { nome: "MARIA OLIVEIRA REFORMAS", tipo: "Cliente", perfil: "Pessoa Física", email: "maria.oliveira@gmail.com", telefone: "(11) 97654-3210", ativo: true },
        { nome: "EDIFICAÇÕES MODERNA LTDA", tipo: "Cliente", perfil: "Construtora/Obra", email: "contato@moderna.com.br", telefone: "(11) 3322-1100", ativo: true },
        { nome: "CARLOS ENCANADOR", tipo: "Cliente", perfil: "Profissional/Instalador", email: "carlos.enc@hotmail.com", telefone: "(11) 96543-2109", ativo: true },
        { nome: "ANA PAULA SANTOS", tipo: "Cliente", perfil: "Pessoa Física", email: "anapaula@uol.com.br", telefone: "(11) 95432-1098", ativo: true },
        { nome: "CONSTRUTORA HORIZONTE", tipo: "Cliente", perfil: "Construtora/Obra", email: "projetos@horizonte.com.br", telefone: "(11) 3344-5566", ativo: true }
      ];

      for (const c of clientesData) {
        const exists = await base44.entities.Terceiro.filter({ nome: c.nome });
        if (exists.length === 0) {
          await base44.entities.Terceiro.create(c);
        }
      }

      // 3. Obter último código interno e gerar sequenciais
      const todosProdutosExistentes = await base44.entities.Produto.list();
      const ultimoNumero = todosProdutosExistentes
        .map(p => parseInt(p.codigo_interno) || 0)
        .reduce((max, num) => Math.max(max, num), 0);
      
      let codigoSequencial = ultimoNumero + 1;

      // 3. 50 Produtos de Materiais de Construção - CÓDIGOS NUMÉRICOS E TUDO EM MAIÚSCULAS
      const produtosData = [
        { nome: "CIMENTO CP-II 50KG", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 28.50, preco_venda_padrao: 42.00, unidade_principal: "SC", fornecedor_padrao_id: createdFornecedores[0]?.id, marca: "VOTORANTIM", ativo: true },
        { nome: "CIMENTO CP-III 50KG", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 31.00, preco_venda_padrao: 45.50, unidade_principal: "SC", fornecedor_padrao_id: createdFornecedores[0]?.id, marca: "VOTORANTIM", ativo: true },
        { nome: "AREIA MÉDIA LAVADA (M³)", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 80.00, preco_venda_padrao: 120.00, unidade_principal: "M3", marca: "GRANEL", ativo: true },
        { nome: "AREIA FINA (M³)", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 75.00, preco_venda_padrao: 110.00, unidade_principal: "M3", marca: "GRANEL", ativo: true },
        { nome: "BRITA 1 (M³)", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 85.00, preco_venda_padrao: 130.00, unidade_principal: "M3", marca: "GRANEL", ativo: true },
        { nome: "BRITA 0 (M³)", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 82.00, preco_venda_padrao: 125.00, unidade_principal: "M3", marca: "GRANEL", ativo: true },
        { nome: "TIJOLO BAIANO 8 FUROS (MILHEIRO)", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 650.00, preco_venda_padrao: 890.00, unidade_principal: "MIL", marca: "CERÂMICA", ativo: true },
        { nome: "TIJOLO MACIÇO (MILHEIRO)", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 720.00, preco_venda_padrao: 980.00, unidade_principal: "MIL", marca: "CERÂMICA", ativo: true },
        { nome: "BLOCO DE CONCRETO 14X19X39", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 3.20, preco_venda_padrao: 4.80, unidade_principal: "UN", marca: "CONCRETO", ativo: true },
        { nome: "BLOCO DE CONCRETO 9X19X39", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 2.50, preco_venda_padrao: 3.90, unidade_principal: "UN", marca: "CONCRETO", ativo: true },
        { nome: "TUBO PVC ESGOTO 100MM 6M", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 45.00, preco_venda_padrao: 61.60, unidade_principal: "BR", fornecedor_padrao_id: createdFornecedores[1]?.id, marca: "TIGRE", ativo: true },
        { nome: "TUBO PVC ESGOTO 150MM 6M", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 89.00, preco_venda_padrao: 128.00, unidade_principal: "BR", fornecedor_padrao_id: createdFornecedores[1]?.id, marca: "TIGRE", ativo: true },
        { nome: "TUBO PVC ÁGUA 25MM 6M", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 22.00, preco_venda_padrao: 32.00, unidade_principal: "BR", fornecedor_padrao_id: createdFornecedores[1]?.id, marca: "TIGRE", ativo: true },
        { nome: "JOELHO 90° PVC ESGOTO 100MM", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 5.20, preco_venda_padrao: 7.80, unidade_principal: "UN", fornecedor_padrao_id: createdFornecedores[1]?.id, marca: "TIGRE", ativo: true },
        { nome: "TE PVC ESGOTO 100MM", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 6.50, preco_venda_padrao: 9.50, unidade_principal: "UN", fornecedor_padrao_id: createdFornecedores[1]?.id, marca: "TIGRE", ativo: true },
        { nome: "LUVA PVC ESGOTO 100MM", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 4.80, preco_venda_padrao: 6.90, unidade_principal: "UN", fornecedor_padrao_id: createdFornecedores[1]?.id, marca: "TIGRE", ativo: true },
        { nome: "TINTA ACRÍLICA FOSCA BRANCO NEVE 18L", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 280.00, preco_venda_padrao: 420.00, unidade_principal: "LT", fornecedor_padrao_id: createdFornecedores[2]?.id, marca: "SUVINIL", ativo: true },
        { nome: "TINTA ACRÍLICA PALHA 18L", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 290.00, preco_venda_padrao: 435.00, unidade_principal: "LT", fornecedor_padrao_id: createdFornecedores[2]?.id, marca: "SUVINIL", ativo: true },
        { nome: "TINTA LÁTEX PREMIUM BRANCO 18L", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 320.00, preco_venda_padrao: 480.00, unidade_principal: "LT", fornecedor_padrao_id: createdFornecedores[2]?.id, marca: "SUVINIL", ativo: true },
        { nome: "VERNIZ MARÍTIMO 3,6L", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 85.00, preco_venda_padrao: 125.00, unidade_principal: "LT", marca: "SUVINIL", ativo: true },
        { nome: "FERRO CA-50 8MM 12M", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 42.00, preco_venda_padrao: 58.00, unidade_principal: "BR", fornecedor_padrao_id: createdFornecedores[3]?.id, marca: "GERDAU", ativo: true },
        { nome: "FERRO CA-50 10MM 12M", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 65.00, preco_venda_padrao: 89.00, unidade_principal: "BR", fornecedor_padrao_id: createdFornecedores[3]?.id, marca: "GERDAU", ativo: true },
        { nome: "FERRO CA-50 12,5MM 12M", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 98.00, preco_venda_padrao: 135.00, unidade_principal: "BR", fornecedor_padrao_id: createdFornecedores[3]?.id, marca: "GERDAU", ativo: true },
        { nome: "ARAME RECOZIDO 1KG", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 12.00, preco_venda_padrao: 18.00, unidade_principal: "KG", marca: "GERDAU", ativo: true },
        { nome: "PREGO 18X27 1KG", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 8.50, preco_venda_padrao: 13.00, unidade_principal: "KG", marca: "GERDAU", ativo: true },
        { nome: "CAL HIDRATADA 20KG", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 12.00, preco_venda_padrao: 18.00, unidade_principal: "SC", marca: "ITAÚ", ativo: true },
        { nome: "ARGAMASSA AC-II 20KG", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 18.50, preco_venda_padrao: 27.00, unidade_principal: "SC", fornecedor_padrao_id: createdFornecedores[4]?.id, marca: "QUARTZOLIT", ativo: true },
        { nome: "ARGAMASSA AC-III 20KG", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 22.00, preco_venda_padrao: 32.00, unidade_principal: "SC", fornecedor_padrao_id: createdFornecedores[4]?.id, marca: "QUARTZOLIT", ativo: true },
        { nome: "REJUNTE BRANCO 1KG", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 9.50, preco_venda_padrao: 14.50, unidade_principal: "KG", fornecedor_padrao_id: createdFornecedores[4]?.id, marca: "QUARTZOLIT", ativo: true },
        { nome: "REJUNTE CINZA 1KG", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 9.50, preco_venda_padrao: 14.50, unidade_principal: "KG", fornecedor_padrao_id: createdFornecedores[4]?.id, marca: "QUARTZOLIT", ativo: true },
        { nome: "CERÂMICA 45X45 ACETINADO M²", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 32.00, preco_venda_padrao: 48.00, unidade_principal: "M2", fornecedor_padrao_id: createdFornecedores[5]?.id, marca: "ELIZABETH", ativo: true },
        { nome: "CERÂMICA 60X60 POLIDO M²", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 48.00, preco_venda_padrao: 72.00, unidade_principal: "M2", fornecedor_padrao_id: createdFornecedores[5]?.id, marca: "ELIZABETH", ativo: true },
        { nome: "PORCELANATO 60X60 POLIDO M²", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 68.00, preco_venda_padrao: 98.00, unidade_principal: "M2", fornecedor_padrao_id: createdFornecedores[5]?.id, marca: "ELIZABETH", ativo: true },
        { nome: "TELHA CERÂMICA ROMANA", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 2.80, preco_venda_padrao: 4.20, unidade_principal: "UN", marca: "CERÂMICA", ativo: true },
        { nome: "TELHA FIBROCIMENTO 2,44M", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 45.00, preco_venda_padrao: 65.00, unidade_principal: "UN", marca: "BRASILIT", ativo: true },
        { nome: "CAIXA D'ÁGUA 500L", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 180.00, preco_venda_padrao: 260.00, unidade_principal: "UN", marca: "FORTLEV", ativo: true },
        { nome: "CAIXA D'ÁGUA 1000L", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 320.00, preco_venda_padrao: 480.00, unidade_principal: "UN", marca: "FORTLEV", ativo: true },
        { nome: "PORTA DE MADEIRA 80CM", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 280.00, preco_venda_padrao: 420.00, unidade_principal: "UN", marca: "MADEIRA", ativo: true },
        { nome: "JANELA BASCULANTE 60X40", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 145.00, preco_venda_padrao: 210.00, unidade_principal: "UN", marca: "ALUMÍNIO", ativo: true },
        { nome: "FECHADURA CROMADA 55MM", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 32.00, preco_venda_padrao: 48.00, unidade_principal: "UN", marca: "PADO", ativo: true },
        { nome: "DOBRADIÇA 3\" CROMADA", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 8.50, preco_venda_padrao: 13.00, unidade_principal: "UN", marca: "PADO", ativo: true },
        { nome: "TOMADA 2P+T 10A BRANCA", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 5.20, preco_venda_padrao: 8.50, unidade_principal: "UN", marca: "TRAMONTINA", ativo: true },
        { nome: "INTERRUPTOR SIMPLES BRANCO", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 4.80, preco_venda_padrao: 7.50, unidade_principal: "UN", marca: "TRAMONTINA", ativo: true },
        { nome: "FIO ELÉTRICO 2,5MM 100M", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 85.00, preco_venda_padrao: 125.00, unidade_principal: "RL", marca: "PIRELLI", ativo: true },
        { nome: "FIO ELÉTRICO 4MM 100M", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 140.00, preco_venda_padrao: 200.00, unidade_principal: "RL", marca: "PIRELLI", ativo: true },
        { nome: "DISJUNTOR 20A BIPOLAR", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 18.00, preco_venda_padrao: 27.00, unidade_principal: "UN", marca: "SCHNEIDER", ativo: true },
        { nome: "QUADRO DE LUZ 12 DISJUNTORES", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 95.00, preco_venda_padrao: 140.00, unidade_principal: "UN", marca: "STECK", ativo: true },
        { nome: "REGISTRO ESFERA 1/2\" CROMADO", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 12.00, preco_venda_padrao: 18.50, unidade_principal: "UN", marca: "DECA", ativo: true },
        { nome: "REGISTRO PRESSÃO 3/4\"", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 18.00, preco_venda_padrao: 27.00, unidade_principal: "UN", marca: "DECA", ativo: true },
        { nome: "TORNEIRA LAVATÓRIO CROMADA", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 45.00, preco_venda_padrao: 68.00, unidade_principal: "UN", marca: "DECA", ativo: true },
        { nome: "TORNEIRA PIA DE COZINHA", codigo_interno: String(codigoSequencial++).padStart(6, '0'), tipo: "Produto", valor_compra: 52.00, preco_venda_padrao: 78.00, unidade_principal: "UN", marca: "DECA", ativo: true }
      ];

      const createdProdutos = [];
      for (const p of produtosData) {
        const exists = await base44.entities.Produto.filter({ nome: p.nome });
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
          produto_nome: prod.nome.toUpperCase(),
          tipo: "Entrada",
          motivo: "Ajuste de Inventário",
          quantidade: 100,
          custo_unitario: prod.valor_compra,
          observacoes: "ESTOQUE INICIAL (SEED)",
          usuario_responsavel: "SISTEMA"
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

          <Button 
            onClick={convertToNumericCodes} 
            disabled={loading}
            size="lg"
            variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 min-w-[200px]"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Convertendo...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Converter p/ Numérico
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}