import { useState } from 'react';

const FASES = [
  {
    id: 'funcoes_migracao',
    fase: 'Fase 1',
    titulo: 'Funções de Migração',
    descricao: 'Scripts one-time já executados. Candidatos certos à exclusão.',
    itens: [
      'functions/migrarTagContaPagar',
      'functions/corrigirTagContaPagar',
      'base44/functions/migrarMovimentosParaLancamentos',
      'functions/migrarCustosParaProduto',
      'functions/migrarDadosLegadosEmbarqueRecebimento',
      'functions/migrarEmbarquesOriginais',
      'functions/migrarLancamentosVendas',
      'functions/migrarNumerosPedidosCompra',
      'functions/migrarPedidoCompraParaEmbarque',
      'functions/migrarStatusPedidos',
      'functions/popularSnapshotRetroativo',
      'functions/corrigirDatasMarcoLancamentos',
      'functions/renumerarPedidosVendaDuplicados',
      'functions/recalcularTodosEstoques',
      'functions/recalcularSupermanifestos',
      'functions/recalcularConclusaoPedidoCompra',
      'functions/reprocessarConclusaoPedidosCompra',
      'functions/regularizarSaldosCaixaRetroativo',
      'functions/deduplicarColaboradores',
      'functions/deduplicarUsuarios',
      'functions/repararLancamentosCartao',
      'functions/repararLancamentoPedidosAprovados',
    ],
  },
  {
    id: 'paginas_duplicadas',
    fase: 'Fase 2',
    titulo: 'Páginas Duplicadas / Superadas',
    descricao: 'Versões antigas ou funcionalidades absorvidas por outras páginas.',
    itens: [
      'pages/AuditoriaEstoque (V1 — substituída por AuditoriaEstoqueV2)',
      'pages/Financeiro (substituída por FinanceiroModulo)',
      'pages/FluxoCaixa (absorvida por FinanceiroModulo/Agefin)',
      'pages/FinanceiroAprovacoes (integrada em AprovacoesFinanceiras)',
      'pages/Compras (substituída por PedidosCompra + PedidoCompraDetalhe)',
      'pages/ControleCaixasAtivos (substituída por CaixasAtivos)',
      'pages/HubLogistico (absorvida por ItinerarioFluvial + GestaoManifestosPage)',
      'pages/Operacoes (nome genérico — verificar uso real)',
      'pages/EdicaoMassivaCustos (substituída por EditarProdutosEmMassa)',
      'pages/InterfaceSeparador (separação integrada ao PDV)',
      'pages/MapaFuncionalidades (página de desenvolvimento — não produção)',
      'pages/ExclusaoDocumentos (exclusão integrada nas próprias telas)',
      'pages/PainelGerente (visão coberta pelo Dashboard)',
      'pages/DashboardCaixa (coberta por PDVCaixa + VisualizadorCaixa)',
    ],
  },
  {
    id: 'entidades_legadas',
    fase: 'Fase 3',
    titulo: 'Entidades / Schemas Legados',
    descricao: 'Schemas sem uso ativo. Verificar se há registros antes de deletar.',
    itens: [
      'entities/EventoLogisticoSandbox (entidade de teste — substituída por EventosLogisticos)',
      'entities/ContaPrevista (substituída por LancamentoFinanceiro + tags)',
      'entities/StatusPedidoCompra (enum embutido em PedidoCompra)',
      'entities/StatusAprovacaoFinanceira (campo em PedidoCompra)',
      'entities/TransicaoPedidoCompra (histórico em campo historico de PedidoCompra)',
      'entities/ConfiguracoesRelatorios (nunca gravada no fluxo atual)',
      'entities/EventoEditorLayout (editor antigo — substituído por EditorLayoutsTres)',
      'entities/PadraoLayout (substituído por LayoutTemplate + ComprovanteTemplate)',
      'entities/AvisosAuto (módulo auto-atendimento — verificar uso real)',
      'entities/ConfigAutoAtendimento (idem AvisosAuto)',
      'entities/LoteEstoque (controle de lote em MovimentacaoEstoque)',
      'entities/ImportacaoLog (logs históricos sem uso operacional)',
    ],
  },
  {
    id: 'sobreposicoes',
    fase: 'Fase 4',
    titulo: 'Sobreposições Lógicas',
    descricao: 'Funções que fazem coisas similares. Consolidar em uma só.',
    itens: [
      'sincronizarContaPrevia ↔ gerarContasPrevistasRecorrentes (contas futuras duplicadas)',
      'sincronizarEstoquePorMovimentacao ↔ recalcularEstoqueProduto (incremental vs total)',
      'atualizarStatusLancamentos ↔ sincronizarStatusFinanceiro (status financeiro duplicado)',
      'gerarViagensTransportadora ↔ atualizarViagensTransportadoras ↔ sincronizarViagensTransportadora (3 funções para viagens)',
      'gerarRelatorioConferencia ↔ gerarRelatorioConsolidadoCompra ↔ gerarRelatorioPedido ↔ gerarRelatorioPedidosCompra (relatórios de compra fragmentados)',
    ],
  },
];

const STATUS = {
  pendente: { label: '—', style: 'text-muted-foreground' },
  excluir: { label: '✕ Excluir', style: 'text-red-600 font-semibold' },
  manter: { label: '✓ Manter', style: 'text-green-700 font-semibold' },
  revisar: { label: '? Revisar', style: 'text-amber-600 font-semibold' },
};

export default function AuditoriaCodigoProjeto() {
  const [decisoes, setDecisoes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('auditoria_decisoes') || '{}'); } catch { return {}; }
  });
  const [notas, setNotas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('auditoria_notas') || '{}'); } catch { return {}; }
  });
  const [editandoNota, setEditandoNota] = useState(null);

  const setDecisao = (id, status) => {
    setDecisoes(prev => {
      const next = { ...prev, [id]: prev[id] === status ? 'pendente' : status };
      localStorage.setItem('auditoria_decisoes', JSON.stringify(next));
      return next;
    });
  };

  const totalPorStatus = (s) => Object.values(decisoes).filter(v => v === s).length;
  const totalItens = FASES.reduce((a, f) => a + f.itens.length, 0);
  const totalDecididos = Object.values(decisoes).filter(v => v && v !== 'pendente').length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 font-mono text-sm text-foreground">

      {/* Header */}
      <div className="mb-6 border-b border-border/40 pb-4">
        <h1 className="text-xl font-bold tracking-tight">Auditoria de Código — Checklist</h1>
        <p className="text-muted-foreground text-xs mt-1">
          Marque cada item como <span className="text-red-600">Excluir</span>, <span className="text-green-700">Manter</span> ou <span className="text-amber-600">Revisar</span>.
        </p>
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          <span>{totalDecididos}/{totalItens} decididos</span>
          <span className="text-red-600">{totalPorStatus('excluir')} excluir</span>
          <span className="text-green-700">{totalPorStatus('manter')} manter</span>
          <span className="text-amber-600">{totalPorStatus('revisar')} revisar</span>
        </div>
      </div>

      {/* Fases */}
      {FASES.map((fase) => {
        const decididos = fase.itens.filter(item => decisoes[item] && decisoes[item] !== 'pendente').length;
        return (
          <div key={fase.id} className="mb-8">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{fase.fase}</span>
              <h2 className="font-bold text-base">{fase.titulo}</h2>
              <span className="text-xs text-muted-foreground ml-auto">{decididos}/{fase.itens.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{fase.descricao}</p>

            <div className="space-y-1">
              {fase.itens.map((item) => {
                const status = decisoes[item] || 'pendente';
                const nota = notas[item] || '';
                return (
                  <div
                    key={item}
                    className={`rounded-lg px-3 py-2 transition-colors ${
                      status === 'excluir' ? 'bg-red-50 dark:bg-red-900/10' :
                      status === 'manter' ? 'bg-green-50 dark:bg-green-900/10' :
                      status === 'revisar' ? 'bg-amber-50 dark:bg-amber-900/10' :
                      'bg-muted/50/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {/* Nome */}
                      <span className={`flex-1 text-xs leading-relaxed break-all ${
                        status === 'excluir' ? 'line-through text-muted-foreground' : ''
                      }`}>
                        {item}
                      </span>

                      {/* Botões de decisão */}
                      <div className="flex gap-1 shrink-0">
                        {['excluir', 'manter', 'revisar'].map((s) => (
                          <button
                            key={s}
                            onClick={() => setDecisao(item, s)}
                            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                              status === s
                                ? s === 'excluir' ? 'bg-red-600 text-white border-red-600'
                                  : s === 'manter' ? 'bg-green-700 text-white border-green-700'
                                  : 'bg-amber-500 text-white border-amber-500'
                                : 'bg-card dark:bg-muted border-border/40 text-muted-foreground hover:border-border/40'
                            }`}
                          >
                            {s === 'excluir' ? '✕' : s === 'manter' ? '✓' : '?'}
                          </button>
                        ))}
                        <button
                          onClick={() => setEditandoNota(editandoNota === item ? null : item)}
                          className="text-xs px-2 py-0.5 rounded border border-border/40 bg-card dark:bg-muted text-muted-foreground hover:border-border/40"
                        >
                          ✎
                        </button>
                      </div>
                    </div>

                    {/* Nota inline */}
                    {editandoNota === item && (
                      <input autoComplete="off"
                        autoFocus
                        type="text"
                        value={nota}
                        onChange={e => {
                          const next = { ...notas, [item]: e.target.value };
                          setNotas(next);
                          localStorage.setItem('auditoria_notas', JSON.stringify(next));
                        }}
                        onBlur={() => setEditandoNota(null)}
                        placeholder="Observação..."
                        className="mt-1.5 w-full text-xs bg-card dark:bg-muted border border-border/40 rounded px-2 py-1 outline-none focus:border-border/40"
                      />
                    )}
                    {nota && editandoNota !== item && (
                      <p className="mt-1 text-xs text-muted-foreground italic">↳ {nota}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Resumo exportável */}
      <div className="border-t border-border/40 pt-4 mt-4">
        <p className="text-xs text-muted-foreground mb-2 font-bold uppercase tracking-widest">Resumo das decisões</p>
        {Object.entries(decisoes).filter(([, v]) => v && v !== 'pendente').length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma decisão tomada ainda.</p>
        ) : (
          <div className="space-y-0.5">
            {Object.entries(decisoes)
              .filter(([, v]) => v && v !== 'pendente')
              .sort(([, a], [, b]) => a.localeCompare(b))
              .map(([item, status]) => (
                <div key={item} className="flex gap-2 text-xs">
                  <span className={`w-14 shrink-0 ${STATUS[status]?.style}`}>{STATUS[status]?.label}</span>
                  <span className="text-muted-foreground break-all">{item}</span>
                  {notas[item] && <span className="text-muted-foreground italic">— {notas[item]}</span>}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}