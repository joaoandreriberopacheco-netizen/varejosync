import { useState } from 'react';
import { AlertTriangle, Trash2, Archive, CheckCircle2, ChevronDown, ChevronRight, Info, Code2, Database, FileCode, Layers } from 'lucide-react';

const AUDIT_DATA = {
  funcoesMigracao: {
    label: 'Funções de Migração One-Time',
    icon: Code2,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/10',
    border: 'border-l-red-400',
    risco: 'ALTO — Scripts já executados. Sem utilidade, ocupam bundle e confundem o contexto.',
    items: [
      { nome: 'migrarTagContaPagar', motivo: 'Migração de tag já concluída. Substituída por corrigirTagContaPagar.' },
      { nome: 'corrigirTagContaPagar', motivo: 'Correção pontual já executada com sucesso (29 registros).' },
      { nome: 'migrarMovimentosParaLancamentos', motivo: 'Migração de entidade legada já concluída.' },
      { nome: 'migrarCustosParaProduto', motivo: 'Campo de custo já movido. Migração concluída.' },
      { nome: 'migrarDadosLegadosEmbarqueRecebimento', motivo: 'Dados legados de embarque já migrados.' },
      { nome: 'migrarEmbarquesOriginais', motivo: 'Estrutura de embarques refatorada. Script obsoleto.' },
      { nome: 'migrarLancamentosVendas', motivo: 'Lançamentos de venda agora gerados automaticamente no fluxo.' },
      { nome: 'migrarNumerosPedidosCompra', motivo: 'Numeração PC já padronizada.' },
      { nome: 'migrarPedidoCompraParaEmbarque', motivo: 'Modelo de embarque separado já vigente.' },
      { nome: 'migrarStatusPedidos', motivo: 'Enum de status migrado. Dados atualizados.' },
      { nome: 'popularSnapshotRetroativo', motivo: 'Snapshot histórico de estoque já populado.' },
      { nome: 'corrigirDatasMarcoLancamentos', motivo: 'Correção pontual de datas já aplicada.' },
      { nome: 'renumerarPedidosVendaDuplicados', motivo: 'Duplicação de numeração resolvida. Sem reincidência.' },
      { nome: 'recalcularTodosEstoques', motivo: 'Recálculo de massa executado. Automação incremental já ativa.' },
      { nome: 'recalcularSupermanifestos', motivo: 'Totais já corretos. Script foi corretivo.' },
      { nome: 'recalcularConclusaoPedidoCompra', motivo: 'Substituído por reprocessarConclusaoPedidosCompra.' },
      { nome: 'reprocessarConclusaoPedidosCompra', motivo: 'Correção one-time de status de conclusão.' },
      { nome: 'regularizarSaldosCaixaRetroativo', motivo: 'Saldos retroativos corrigidos. Fluxo atual não gera mais inconsistência.' },
      { nome: 'deduplicarColaboradores', motivo: 'Deduplicação já aplicada. Entidade Colaborador sem novos duplicados.' },
      { nome: 'deduplicarUsuarios', motivo: 'Deduplicação já aplicada no início do projeto.' },
      { nome: 'repararLancamentosCartao', motivo: 'Lançamentos de cartão já normalizados pelo fluxo atual do PDV.' },
      { nome: 'repararLancamentoPedidosAprovados', motivo: 'Consistência de aprovação financeira já garantida no fluxo.' },
    ],
  },
  paginasDuplicadas: {
    label: 'Páginas Duplicadas / Superadas',
    icon: Layers,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    border: 'border-l-amber-400',
    risco: 'MÉDIO — Versões antigas mantidas ao lado das novas, gerando confusão de rota e menu.',
    items: [
      { nome: 'AuditoriaEstoque (V1)', motivo: 'AuditoriaEstoqueV2 já em produção. V1 nunca mais recebeu updates.' },
      { nome: 'Financeiro', motivo: 'Substituída por FinanceiroModulo. Antiga tela integrada de finanças.' },
      { nome: 'FluxoCaixa', motivo: 'Componente ExecucaoOrcamentaria dentro de FinanceiroModulo/Agefin já cobre isso.' },
      { nome: 'FinanceiroAprovacoes', motivo: 'Fluxo de aprovação financeira já integrado em AprovacoesFinanceiras (rota explícita).' },
      { nome: 'Compras', motivo: 'Substituída por PedidosCompra + PedidoCompraDetalhe com mais features.' },
      { nome: 'ControleCaixasAtivos', motivo: 'CaixasAtivos (rota explícita) é a versão atual. ControleCaixasAtivos é legado.' },
      { nome: 'HubLogistico', motivo: 'Funcionalidades absorvidas por ItinerarioFluvial, GestaoManifestosPage e GestaoSupermanifestosPage.' },
      { nome: 'Operacoes', motivo: 'Nome genérico sem função clara. Verificar se ainda tem uso real no menu.' },
      { nome: 'EdicaoMassivaCustos', motivo: 'Substituída por EditarProdutosEmMassa, que é mais completa.' },
      { nome: 'InterfaceSeparador', motivo: 'Fluxo de separação integrado a OrdemSeparacao e PDV. Página isolada não é mais acessada.' },
      { nome: 'MapaFuncionalidades', motivo: 'Página de diagnóstico/desenvolvimento. Não deve estar acessível em produção.' },
      { nome: 'ExclusaoDocumentos', motivo: 'Funcionalidade de exclusão integrada às próprias telas. Página standalone obsoleta.' },
      { nome: 'PainelGerente', motivo: 'Dashboard já cobre visão gerencial. Verificar se PainelGerente ainda tem diferenciação real.' },
      { nome: 'DashboardCaixa', motivo: 'Visão de caixa já integrada em PDVCaixa e VisualizadorCaixa.' },
    ],
  },
  entidadesLegadas: {
    label: 'Entidades / Schemas Obsoletos',
    icon: Database,
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/10',
    border: 'border-l-purple-400',
    risco: 'MÉDIO-ALTO — Schemas sem uso geram confusão sobre modelo de dados e podem causar migrações desnecessárias.',
    items: [
      { nome: 'EventoLogisticoSandbox', motivo: '"Sandbox" no nome indica entidade de teste. Substituída por EventosLogisticos.' },
      { nome: 'ContaPrevista', motivo: 'Contas previstas agora são LancamentoFinanceiro com tags. Entidade redundante.' },
      { nome: 'StatusPedidoCompra', motivo: 'Status embutido como enum em PedidoCompra. Entidade separada não é mais usada.' },
      { nome: 'StatusAprovacaoFinanceira', motivo: 'Aprovação financeira controlada por campo em PedidoCompra. Entidade isolada é legado.' },
      { nome: 'TransicaoPedidoCompra', motivo: 'Histórico de transição embutido no campo historico de PedidoCompra.' },
      { nome: 'ConfiguracoesRelatorios', motivo: 'Configurações de relatório nunca foram salvas via esta entidade no fluxo atual.' },
      { nome: 'EventoEditorLayout', motivo: 'Editor de layout refatorado (EditorLayoutsTres). Entidade de eventos do editor antigo.' },
      { nome: 'PadraoLayout', motivo: 'Sistema de layout agora usa LayoutTemplate e ComprovanteTemplate unificados.' },
      { nome: 'AvisosAuto', motivo: 'Módulo de auto-atendimento com status incerto. Verificar uso real.' },
      { nome: 'ConfigAutoAtendimento', motivo: 'Idem AvisosAuto — verificar se AutoAtendimento ainda é uma feature ativa.' },
      { nome: 'LoteEstoque', motivo: 'Controle de lote implementado dentro de MovimentacaoEstoque. Entidade separada vazia.' },
      { nome: 'ImportacaoLog', motivo: 'Logs de importação não são mais consultados. Dados históricos sem uso operacional.' },
    ],
  },
  funcoesRedundantes: {
    label: 'Funções com Sobreposição Lógica',
    icon: FileCode,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    border: 'border-l-blue-400',
    risco: 'BAIXO-MÉDIO — Funções que fazem coisas similares, gerando dúvida sobre qual usar.',
    items: [
      { nome: 'sincronizarContaPrevia vs gerarContasPrevistasRecorrentes', motivo: 'Duas funções cuidando de contas futuras. Unificar em uma.' },
      { nome: 'sincronizarEstoquePorMovimentacao vs recalcularEstoqueProduto', motivo: 'Uma incremental, outra total. Documentar diferença ou unificar.' },
      { nome: 'atualizarStatusLancamentos vs sincronizarStatusFinanceiro', motivo: 'Ambas atualizam status financeiro. Verificar se não há duplicação de automações.' },
      { nome: 'gerarViagensTransportadora vs atualizarViagensTransportadoras vs sincronizarViagensTransportadora', motivo: '3 funções para viagens de transportadora. Consolidar em uma com parâmetros.' },
      { nome: 'gerarRelatorioConferencia vs gerarRelatorioConsolidadoCompra vs gerarRelatorioPedido vs gerarRelatorioPedidosCompra', motivo: 'Relatórios de compra fragmentados em 4 funções. Candidatos a um pipeline unificado.' },
    ],
  },
};

const BADGE = {
  ALTO: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MÉDIO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'MÉDIO-ALTO': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'BAIXO-MÉDIO': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function RiscoLabel({ texto }) {
  const nivel = texto.split(' —')[0];
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE[nivel] || 'bg-gray-100 text-gray-600'}`}>
      {nivel}
    </span>
  );
}

function AuditSection({ secao }) {
  const [open, setOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});
  const Icon = secao.icon;

  const toggleItem = (nome) => setExpandedItems(prev => ({ ...prev, [nome]: !prev[nome] }));

  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${secao.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${secao.color}`} />
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-800 dark:text-gray-100 text-sm md:text-base">
              {secao.label}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {secao.items.length} item{secao.items.length !== 1 ? 's' : ''} identificado{secao.items.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RiscoLabel texto={secao.risco} />
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700/50">
          <div className={`mx-4 md:mx-5 my-3 p-3 rounded-xl ${secao.bg} flex items-start gap-2`}>
            <Info className={`w-4 h-4 mt-0.5 shrink-0 ${secao.color}`} />
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {secao.risco.split(' — ')[1]}
            </p>
          </div>

          <div className="px-4 md:px-5 pb-4 space-y-1.5">
            {secao.items.map((item) => (
              <div
                key={item.nome}
                className={`rounded-xl border-l-4 ${secao.border} bg-gray-50 dark:bg-gray-700/30 overflow-hidden`}
              >
                <button
                  onClick={() => toggleItem(item.nome)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <code className="text-xs md:text-sm font-mono text-gray-700 dark:text-gray-200">
                    {item.nome}
                  </code>
                  {expandedItems[item.nome]
                    ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                </button>
                {expandedItems[item.nome] && (
                  <div className="px-4 pb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed border-t border-gray-200 dark:border-gray-600 pt-2 mt-1">
                      {item.motivo}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditoriaCodigoProjeto() {
  const totalItens = Object.values(AUDIT_DATA).reduce((acc, s) => acc + s.items.length, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-sm p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              Auditoria de Código Morto
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Análise estática do projeto — identificação de scripts de migração, páginas superadas, entidades obsoletas e sobreposições lógicas.
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Funções mortas', value: AUDIT_DATA.funcoesMigracao.items.length, color: 'text-red-600 dark:text-red-400', icon: Trash2 },
            { label: 'Páginas obsoletas', value: AUDIT_DATA.paginasDuplicadas.items.length, color: 'text-amber-600 dark:text-amber-400', icon: Layers },
            { label: 'Entidades legadas', value: AUDIT_DATA.entidadesLegadas.items.length, color: 'text-purple-600 dark:text-purple-400', icon: Database },
            { label: 'Sobreposições', value: AUDIT_DATA.funcoesRedundantes.items.length, color: 'text-blue-600 dark:text-blue-400', icon: Archive },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recomendação de Ação */}
      <div className="bg-green-50 dark:bg-green-900/10 rounded-2xl p-4 flex items-start gap-3 border border-green-100 dark:border-green-800/30">
        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">Plano de ação sugerido</p>
          <p className="text-xs text-green-700 dark:text-green-400 mt-1 leading-relaxed">
            <strong>Fase 1 (imediato):</strong> deletar as {AUDIT_DATA.funcoesMigracao.items.length} funções de migração — são código morto certo. <br />
            <strong>Fase 2:</strong> confirmar e arquivar as {AUDIT_DATA.paginasDuplicadas.items.length} páginas duplicadas, removendo-as do menu e das rotas. <br />
            <strong>Fase 3:</strong> auditar dados das {AUDIT_DATA.entidadesLegadas.items.length} entidades suspeitas antes de deletá-las (verificar se têm registros ativos). <br />
            <strong>Fase 4:</strong> consolidar as sobreposições lógicas em funções únicas bem documentadas.
          </p>
        </div>
      </div>

      {/* Seções */}
      {Object.values(AUDIT_DATA).map((secao) => (
        <AuditSection key={secao.label} secao={secao} />
      ))}

      <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-4">
        Análise baseada na inspeção estrutural do código-fonte — gerada em {new Date().toLocaleDateString('pt-BR')}.
        Confirme com o time antes de deletar.
      </p>
    </div>
  );
}