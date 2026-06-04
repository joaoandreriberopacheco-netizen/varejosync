import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { dataHoje } from '@/components/utils/dateUtils';

const funcionalidades = [
  {
    modulo: "Dashboard Estratégico",
    items: [
      { nome: "Dashboard Geral", status: "funcional", obs: "KPIs principais visíveis" },
      { nome: "Aba Vendas", status: "funcional", obs: "Gráficos e métricas" },
      { nome: "Aba Compras", status: "funcional", obs: "Análise e sugestões" },
      { nome: "Aba Estoque", status: "funcional", obs: "Visão e alertas" },
      { nome: "Aba Financeiro", status: "funcional", obs: "Resumo financeiro" },
      { nome: "Alertas Críticos", status: "funcional", obs: "Produtos abaixo do mínimo" },
      { nome: "Ponto de Equilíbrio", status: "funcional", obs: "Cálculo automático" },
      { nome: "Eficiência Operacional", status: "funcional", obs: "Métricas de performance" }
    ]
  },
  {
    modulo: "Vendas - PDV Vendedor",
    items: [
      { nome: "Busca de produtos", status: "funcional", obs: "Com navegação por setas" },
      { nome: "Adicionar ao carrinho", status: "funcional", obs: "Com validação de estoque" },
      { nome: "Ajustar quantidade", status: "funcional", obs: "Incremento/decremento" },
      { nome: "Remover itens", status: "funcional", obs: "Individual ou limpar tudo" },
      { nome: "Aplicar desconto (% ou R$)", status: "funcional", obs: "Com limite por usuário" },
      { nome: "Aplicar acréscimo (% ou R$)", status: "funcional", obs: "Sem limite" },
      { nome: "Buscar/Cadastrar cliente", status: "funcional", obs: "Com navegação por setas" },
      { nome: "Método de entrega", status: "funcional", obs: "Retirada/Delivery" },
      { nome: "Gerar pré-venda", status: "funcional", obs: "Layout térmico 72mm" },
      { nome: "Atalhos de teclado", status: "funcional", obs: "F1-F4, ESC" }
    ]
  },
  {
    modulo: "Vendas - PDV Caixa",
    items: [
      { nome: "Fila de pagamentos", status: "funcional", obs: "Atualização automática" },
      { nome: "Navegação por setas", status: "funcional", obs: "Realce verde lateral" },
      { nome: "Múltiplas formas de pagamento", status: "funcional", obs: "Dinheiro, PIX, Cartão" },
      { nome: "Validação de pagamento", status: "funcional", obs: "Soma automática" },
      { nome: "Baixa automática de estoque", status: "funcional", obs: "Ao confirmar" },
      { nome: "Lançamento financeiro", status: "funcional", obs: "Receita automática" },
      { nome: "Comprovante de venda", status: "funcional", obs: "Layout térmico Courier New" },
      { nome: "Atalhos de teclado", status: "funcional", obs: "F1-F3, setas, Enter" }
    ]
  },
  {
    modulo: "Vendas - Pedidos Manuais",
    items: [
      { nome: "Criar pedido", status: "funcional", obs: "Formulário completo" },
      { nome: "Editar pedido", status: "funcional", obs: "Todos os campos" },
      { nome: "Adicionar/Remover itens", status: "funcional", obs: "Tabela interativa" },
      { nome: "Aplicar desconto", status: "funcional", obs: "Com bloqueio se exceder" },
      { nome: "Análise de entrega", status: "funcional", obs: "Peso, volume, distância" },
      { nome: "Listagem e filtros", status: "funcional", obs: "Número, cliente, status" }
    ]
  },
  {
    modulo: "Compras",
    items: [
      { nome: "Sugestão Inteligente", status: "funcional", obs: "Baseado em estoque mínimo" },
      { nome: "Cálculo de quantidade", status: "funcional", obs: "Até estoque ideal" },
      { nome: "Previsão de dias", status: "funcional", obs: "Baseado em vendas" },
      { nome: "Agrupamento por fornecedor", status: "funcional", obs: "Facilita criação PC" },
      { nome: "Gerar pedido de compra", status: "funcional", obs: "Direto da sugestão" },
      { nome: "Criar PC manual", status: "funcional", obs: "Com múltiplos itens" },
      { nome: "Editar PC", status: "funcional", obs: "Todos os campos" },
      { nome: "Status do PC", status: "funcional", obs: "Rascunho/Enviado/Recebido" },
      { nome: "Data prevista entrega", status: "funcional", obs: "Campo obrigatório" },
      { nome: "Listagem e filtros", status: "funcional", obs: "Número, fornecedor" },
      { nome: "Recebimento com baixa", status: "parcial", obs: "Não baixa estoque auto" }
    ]
  },
  {
    modulo: "Estoque",
    items: [
      { nome: "Movimentação manual", status: "funcional", obs: "Entrada/Saída" },
      { nome: "Motivos diversos", status: "funcional", obs: "8 motivos disponíveis" },
      { nome: "Histórico completo", status: "funcional", obs: "Auditoria" },
      { nome: "Inventário atual", status: "parcial", obs: "Em desenvolvimento" },
      { nome: "Controle lote/validade", status: "nao", obs: "Não implementado" },
      { nome: "Controle de serial", status: "nao", obs: "Não implementado" },
      { nome: "Separação FEFO", status: "parcial", obs: "Componente criado, não integrado" }
    ]
  },
  {
    modulo: "Produtos",
    items: [
      { nome: "Cadastro completo", status: "funcional", obs: "Todos os campos" },
      { nome: "Edição", status: "funcional", obs: "Todos os campos" },
      { nome: "Código de barras/SKU", status: "funcional", obs: "Busca integrada" },
      { nome: "Preço de venda", status: "funcional", obs: "Obrigatório" },
      { nome: "Custo detalhado", status: "parcial", obs: "Tela separada, não auto-soma" },
      { nome: "Controle de estoque", status: "funcional", obs: "Min/Ideal/Máximo" },
      { nome: "Fornecedor padrão", status: "funcional", obs: "Integrado" },
      { nome: "Conversão unidades", status: "funcional", obs: "Fator de conversão" },
      { nome: "Categoria", status: "funcional", obs: "Com filtro" },
      { nome: "Status Ativo/Inativo", status: "funcional", obs: "Controle visual" },
      { nome: "Indicador de estoque", status: "funcional", obs: "OK/Baixo/Crítico" },
      { nome: "Filtros avançados", status: "funcional", obs: "Categoria, fornecedor" },
      { nome: "KPIs do catálogo", status: "funcional", obs: "Total, valor, alertas" },
      { nome: "Importação em massa", status: "nao", obs: "Não implementado" }
    ]
  },
  {
    modulo: "Terceiros (Clientes/Fornecedores)",
    items: [
      { nome: "Cadastro de clientes", status: "funcional", obs: "Formulário completo" },
      { nome: "Cadastro de fornecedores", status: "funcional", obs: "Mesmo formulário" },
      { nome: "Tipo: Cliente/Fornecedor/Ambos", status: "funcional", obs: "Seleção obrigatória" },
      { nome: "Dados completos", status: "funcional", obs: "CPF/CNPJ, email, telefone" },
      { nome: "Endereço", status: "funcional", obs: "Campo texto livre" },
      { nome: "Busca e filtros", status: "funcional", obs: "Nome ou documento" },
      { nome: "Importação Excel", status: "funcional", obs: "Com preview e validação" },
      { nome: "Exportação CSV", status: "funcional", obs: "Compatível Excel" },
      { nome: "Template importação", status: "funcional", obs: "Download automático" },
      { nome: "Edição", status: "funcional", obs: "Todos os campos" }
    ]
  },
  {
    modulo: "Financeiro",
    items: [
      { nome: "Saldo de caixa", status: "funcional", obs: "Cálculo automático" },
      { nome: "Movimentos (Reforço/Sangria)", status: "funcional", obs: "Com justificativa" },
      { nome: "Histórico de movimentos", status: "funcional", obs: "Lista completa" },
      { nome: "Receita de vendas PDV", status: "funcional", obs: "Automático" },
      { nome: "Último fechamento", status: "parcial", obs: "Não implementado" },
      { nome: "Contas a Pagar/Receber", status: "parcial", obs: "Em desenvolvimento" },
      { nome: "Criar lançamento manual", status: "nao", obs: "Não implementado" },
      { nome: "Baixa de contas", status: "nao", obs: "Não implementado" },
      { nome: "Despesa de compras", status: "nao", obs: "Não implementado" }
    ]
  },
  {
    modulo: "Logística",
    items: [
      { nome: "Agendar entrega", status: "funcional", obs: "Data, turno, motorista" },
      { nome: "Rota do dia", status: "funcional", obs: "Lista organizada" },
      { nome: "Atualizar status", status: "funcional", obs: "Agendado/Em Rota/Entregue" },
      { nome: "Comprovante", status: "parcial", obs: "Upload não implementado" },
      { nome: "Histórico", status: "funcional", obs: "Filtros data/status" },
      { nome: "Entregas frustradas", status: "funcional", obs: "Com motivo" },
      { nome: "Cálculo de peso", status: "funcional", obs: "Soma produtos" },
      { nome: "Cálculo de volume", status: "funcional", obs: "Baseado dimensões" },
      { nome: "Sugestão de veículo", status: "funcional", obs: "Por capacidade" },
      { nome: "Análise viabilidade", status: "funcional", obs: "Alertas capacidade" },
      { nome: "Cadastro veículos", status: "funcional", obs: "Placa, tipo, capacidade" },
      { nome: "Motorista padrão", status: "funcional", obs: "Integrado usuários" },
      { nome: "Status veículo", status: "funcional", obs: "Ativo/Inativo" }
    ]
  },
  {
    modulo: "Configurações",
    items: [
      { nome: "Criar tabela de preço", status: "funcional", obs: "Com fator ajuste" },
      { nome: "Editar tabela", status: "funcional", obs: "Todos os campos" },
      { nome: "Ativar/Desativar", status: "funcional", obs: "Controle booleano" },
      { nome: "Atribuir a usuários", status: "funcional", obs: "No cadastro" },
      { nome: "Exemplo de cálculo", status: "funcional", obs: "Visual na tela" },
      { nome: "Criar campanha", status: "funcional", obs: "Com período e tipo" },
      { nome: "Tipos de campanha", status: "funcional", obs: "4 tipos disponíveis" },
      { nome: "Período vigência", status: "funcional", obs: "Data início/fim" },
      { nome: "Produtos participantes", status: "funcional", obs: "Seleção múltipla" },
      { nome: "Status campanha", status: "funcional", obs: "Ativo/Inativo" },
      { nome: "Aplicação auto PDV", status: "nao", obs: "Não implementado" },
      { nome: "Perfis de usuário", status: "funcional", obs: "6 perfis disponíveis" },
      { nome: "Limite de desconto", status: "funcional", obs: "Por perfil/usuário" },
      { nome: "Tabela preço padrão", status: "funcional", obs: "Atribuição" },
      { nome: "Acesso ao caixa", status: "funcional", obs: "Flag booleana" }
    ]
  },
  {
    modulo: "Relatórios",
    items: [
      { nome: "Relatório vendas", status: "parcial", obs: "Básico no dashboard" },
      { nome: "Relatório compras", status: "parcial", obs: "Básico no dashboard" },
      { nome: "Relatório estoque", status: "parcial", obs: "Básico no dashboard" },
      { nome: "Relatório financeiro", status: "parcial", obs: "Básico no dashboard" },
      { nome: "Relatório margens", status: "parcial", obs: "Cálculo por produto" },
      { nome: "Relatório clientes", status: "nao", obs: "Não implementado" },
      { nome: "Relatório fornecedores", status: "nao", obs: "Não implementado" },
      { nome: "Exportação Excel", status: "nao", obs: "Não implementado" },
      { nome: "Relatórios customizáveis", status: "nao", obs: "Não implementado" }
    ]
  },
  {
    modulo: "Interface e UX",
    items: [
      { nome: "Menu lateral responsivo", status: "funcional", obs: "Desktop + Mobile" },
      { nome: "Auto-hide menu mobile", status: "funcional", obs: "Ao navegar ou clicar fora" },
      { nome: "Realce verde navegação", status: "funcional", obs: "PDV e Caixa" },
      { nome: "Atalhos F1-F12", status: "funcional", obs: "PDV Vendedor e Caixa" },
      { nome: "Tela fullscreen PDV", status: "funcional", obs: "Sem menu lateral" },
      { nome: "Toast notifications", status: "funcional", obs: "Feedback visual" },
      { nome: "Loading states", status: "funcional", obs: "Em processos assíncronos" },
      { nome: "Comprovantes 72mm", status: "funcional", obs: "Layout CobreFácil" },
      { nome: "Dialogs modais", status: "funcional", obs: "Para confirmações" },
      { nome: "Tabs de navegação", status: "funcional", obs: "Dashboard, Vendas, Compras" }
    ]
  }
];

const StatusBadge = ({ status }) => {
  const config = {
    funcional: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Funcional' },
    parcial: { icon: AlertCircle, color: 'bg-yellow-100 text-yellow-800', label: 'Parcial' },
    nao: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Não Implementado' }
  };

  const { icon: Icon, color, label } = config[status];
  
  return (
    <Badge className={`${color} gap-1`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

export default function MapaFuncionalidades() {
  const [openModulos, setOpenModulos] = useState({});

  const toggleModulo = (modulo) => {
    setOpenModulos(prev => ({ ...prev, [modulo]: !prev[modulo] }));
  };

  const stats = funcionalidades.reduce((acc, modulo) => {
    modulo.items.forEach(item => {
      acc.total++;
      acc[item.status]++;
    });
    return acc;
  }, { total: 0, funcional: 0, parcial: 0, nao: 0 });

  const percentualFuncional = ((stats.funcional / stats.total) * 100).toFixed(1);

  const handleGerarExcel = () => {
    const pages = [
      { nome: "Dashboard", status: "Funcional", tipo: "Página", obs: "Dashboard estratégico com 5 abas" },
      { nome: "Vendas", status: "Funcional", tipo: "Página", obs: "PDV Vendedor, PDV Caixa e Pedidos" },
      { nome: "Compras", status: "Funcional", tipo: "Página", obs: "Sugestão inteligente e pedidos de compra" },
      { nome: "Produtos", status: "Funcional", tipo: "Página", obs: "Cadastro completo de produtos" },
      { nome: "Terceiros", status: "Funcional", tipo: "Página", obs: "Clientes e fornecedores" },
      { nome: "Estoque", status: "Parcial", tipo: "Página", obs: "Movimentação manual" },
      { nome: "Financeiro", status: "Parcial", tipo: "Página", obs: "Gestão de caixa" },
      { nome: "Logística", status: "Funcional", tipo: "Página", obs: "Agenda de entregas" },
      { nome: "Veículos", status: "Funcional", tipo: "Página", obs: "Cadastro de veículos" },
      { nome: "Tabelas de Preço", status: "Funcional", tipo: "Página", obs: "Configuração de tabelas" },
      { nome: "Campanhas", status: "Parcial", tipo: "Página", obs: "Campanhas promocionais" },
      { nome: "Relatórios", status: "Parcial", tipo: "Página", obs: "Em desenvolvimento" },
      { nome: "Mapa de Funcionalidades", status: "Funcional", tipo: "Página", obs: "Mapa interativo" },
      { nome: "Edição Massiva de Custos", status: "Funcional", tipo: "Página", obs: "Edição em lote" }
    ];

    const components = [
      { nome: "PDVVendedor", status: "Funcional", tipo: "Componente", modulo: "Vendas", obs: "Tela do vendedor com atalhos F1-F4" },
      { nome: "PDVCaixa", status: "Funcional", tipo: "Componente", modulo: "Vendas", obs: "Tela do caixa com atalhos F1-F3" },
      { nome: "PedidoVendaForm", status: "Funcional", tipo: "Componente", modulo: "Vendas", obs: "Formulário de pedidos" },
      { nome: "ConfirmarPagamento", status: "Funcional", tipo: "Componente", modulo: "Vendas", obs: "Múltiplas formas de pagamento" },
      { nome: "ComprovanteCompra", status: "Funcional", tipo: "Componente", modulo: "Vendas", obs: "Layout térmico 72mm Courier New" },
      { nome: "ComprovantePreVenda", status: "Funcional", tipo: "Componente", modulo: "Vendas", obs: "Layout térmico 72mm Courier New" },
      { nome: "AnaliseEntrega", status: "Funcional", tipo: "Componente", modulo: "Vendas", obs: "Análise logística" },
      { nome: "PedidoCompraForm", status: "Funcional", tipo: "Componente", modulo: "Compras", obs: "Formulário de pedidos" },
      { nome: "SugestaoCompra", status: "Funcional", tipo: "Componente", modulo: "Compras", obs: "Sugestão inteligente" },
      { nome: "MovimentacaoEstoqueForm", status: "Funcional", tipo: "Componente", modulo: "Estoque", obs: "Movimentação manual" },
      { nome: "GestaoCaixa", status: "Funcional", tipo: "Componente", modulo: "Financeiro", obs: "Reforço e sangria" },
      { nome: "AgendamentoForm", status: "Funcional", tipo: "Componente", modulo: "Logística", obs: "Agendar entregas" },
      { nome: "RotaEntregasHoje", status: "Funcional", tipo: "Componente", modulo: "Logística", obs: "Rota do dia" },
      { nome: "HistoricoEntregas", status: "Funcional", tipo: "Componente", modulo: "Logística", obs: "Histórico completo" },
      { nome: "ListaSeparacaoFEFO", status: "Parcial", tipo: "Componente", modulo: "Estoque", obs: "Não integrado" },
      { nome: "DashboardKPIs", status: "Funcional", tipo: "Componente", modulo: "Dashboard", obs: "KPIs principais" },
      { nome: "GeralTab", status: "Funcional", tipo: "Componente", modulo: "Dashboard", obs: "Aba geral" },
      { nome: "VendasTab", status: "Funcional", tipo: "Componente", modulo: "Dashboard", obs: "Aba vendas" },
      { nome: "ComprasTab", status: "Funcional", tipo: "Componente", modulo: "Dashboard", obs: "Aba compras" },
      { nome: "EstoqueTab", status: "Funcional", tipo: "Componente", modulo: "Dashboard", obs: "Aba estoque" },
      { nome: "FinanceiroTab", status: "Funcional", tipo: "Componente", modulo: "Dashboard", obs: "Aba financeiro" },
      { nome: "PontoEquilibrio", status: "Funcional", tipo: "Componente", modulo: "Dashboard", obs: "Cálculo automático" },
      { nome: "EficienciaOperacional", status: "Funcional", tipo: "Componente", modulo: "Dashboard", obs: "Métricas" },
      { nome: "AlertasCriticos", status: "Funcional", tipo: "Componente", modulo: "Dashboard", obs: "Alertas" }
    ];

    const entities = [
      { nome: "Produto", campos: 23, status: "Completa", obs: "Todos os campos de produto" },
      { nome: "Terceiro", campos: 7, status: "Completa", obs: "Clientes e fornecedores" },
      { nome: "PedidoVenda", campos: 15, status: "Completa", obs: "Vendas e orçamentos" },
      { nome: "PedidoCompra", campos: 9, status: "Completa", obs: "Compras" },
      { nome: "MovimentacaoEstoque", campos: 8, status: "Completa", obs: "Auditoria de estoque" },
      { nome: "LancamentoFinanceiro", campos: 11, status: "Completa", obs: "Contas a pagar/receber" },
      { nome: "MovimentosCaixa", campos: 5, status: "Completa", obs: "Reforço e sangria" },
      { nome: "AgendaLogistica", campos: 21, status: "Completa", obs: "Entregas" },
      { nome: "Veiculo", campos: 8, status: "Completa", obs: "Frota" },
      { nome: "TabelaPreco", campos: 3, status: "Completa", obs: "Tabelas de preço" },
      { nome: "Campanha", campos: 11, status: "Completa", obs: "Promoções" },
      { nome: "CustoDetalhado", campos: 3, status: "Completa", obs: "Custos do produto" },
      { nome: "Tarefa", campos: 11, status: "Completa", obs: "Tarefas do sistema" },
      { nome: "User", campos: 6, status: "Completa", obs: "Usuários e permissões" }
    ];

    // UTF-8 COM BOM para Excel Brasil
    let csvContent = "\uFEFF";

    csvContent += "VAREJOSYNC - MAPA COMPLETO DO SISTEMA\n";
    csvContent += `Gerado em;${new Date().toLocaleDateString('pt-BR')};${new Date().toLocaleTimeString('pt-BR')}\n`;
    csvContent += `Status Geral;${percentualFuncional}% Funcional\n`;
    csvContent += `Total de Funcionalidades;${stats.total}\n`;
    csvContent += `Funcionais;${stats.funcional}\n`;
    csvContent += `Parciais;${stats.parcial}\n`;
    csvContent += `Não Implementadas;${stats.nao}\n\n`;

    csvContent += "PÁGINAS DO SISTEMA\n";
    csvContent += "Nome;Status;Tipo;Observações\n";
    pages.forEach(p => {
      csvContent += `${p.nome};${p.status};${p.tipo};${p.obs}\n`;
    });
    csvContent += "\n";

    csvContent += "COMPONENTES\n";
    csvContent += "Nome;Status;Tipo;Módulo;Observações\n";
    components.forEach(c => {
      csvContent += `${c.nome};${c.status};${c.tipo};${c.modulo};${c.obs}\n`;
    });
    csvContent += "\n";

    csvContent += "ENTIDADES (BANCO DE DADOS)\n";
    csvContent += "Nome;Número de Campos;Status;Observações\n";
    entities.forEach(e => {
      csvContent += `${e.nome};${e.campos};${e.status};${e.obs}\n`;
    });
    csvContent += "\n";

    csvContent += "FUNCIONALIDADES DETALHADAS POR MÓDULO\n";
    csvContent += "Módulo;Funcionalidade;Status;Observações\n";
    funcionalidades.forEach(modulo => {
      modulo.items.forEach(item => {
        const statusMap = { funcional: 'Funcional', parcial: 'Parcial', nao: 'Não Implementado' };
        csvContent += `${modulo.modulo};${item.nome};${statusMap[item.status]};${item.obs}\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `VarejoSync_Mapa_Completo_${dataHoje()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-muted/40 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mapa de Funcionalidades</h1>
            <p className="text-muted-foreground mt-2">VarejoSync - Sistema de Gestão Integrada</p>
          </div>
          <Button 
            onClick={handleGerarExcel}
            className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-lg"
            size="lg"
          >
            <FileText className="w-5 h-5" />
            Baixar Planilha Excel (.csv)
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total de Funcionalidades</p>
                <p className="text-3xl font-bold mt-2">{stats.total}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800 font-semibold">Funcionais</p>
                </div>
                <p className="text-3xl font-bold text-green-900">{stats.funcional}</p>
                <p className="text-sm text-green-700 mt-1">{percentualFuncional}%</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <p className="text-sm text-yellow-800 font-semibold">Parciais</p>
                </div>
                <p className="text-3xl font-bold text-yellow-900">{stats.parcial}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-800 font-semibold">Não Implementados</p>
                </div>
                <p className="text-3xl font-bold text-red-900">{stats.nao}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {funcionalidades.map((modulo) => {
            const isOpen = openModulos[modulo.modulo];
            const moduloStats = modulo.items.reduce((acc, item) => {
              acc[item.status]++;
              return acc;
            }, { funcional: 0, parcial: 0, nao: 0 });

            return (
              <Card key={modulo.modulo}>
                <Collapsible open={isOpen} onOpenChange={() => toggleModulo(modulo.modulo)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                          <CardTitle className="text-xl">{modulo.modulo}</CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Badge className="bg-green-100 text-green-800">{moduloStats.funcional}</Badge>
                          {moduloStats.parcial > 0 && (
                            <Badge className="bg-yellow-100 text-yellow-800">{moduloStats.parcial}</Badge>
                          )}
                          {moduloStats.nao > 0 && (
                            <Badge className="bg-red-100 text-red-800">{moduloStats.nao}</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-2">
                        {modulo.items.map((item, idx) => (
                          <div key={idx} className="flex items-start justify-between p-3 bg-muted/40 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{item.nome}</p>
                              <p className="text-sm text-muted-foreground mt-1">{item.obs}</p>
                            </div>
                            <StatusBadge status={item.status} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-bold text-lg text-blue-900 mb-3">🎯 Próximos Passos Recomendados</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p><span className="font-semibold">Alta Prioridade:</span></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Aplicação automática de campanhas no PDV</li>
                <li>Recebimento de mercadoria com baixa de estoque</li>
                <li>Custo detalhado com auto-soma no produto</li>
                <li>Contas a pagar/receber completo</li>
                <li>Relatórios customizáveis</li>
              </ul>
              
              <p className="mt-3"><span className="font-semibold">Média Prioridade:</span></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Controle de lote/validade</li>
                <li>Separação FEFO integrada</li>
                <li>Upload de comprovante de entrega</li>
                <li>Importação em massa de produtos</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Última atualização: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="mt-1">VarejoSync v1.0.0 - {percentualFuncional}% Funcional</p>
        </div>
      </div>
    </div>
  );
}