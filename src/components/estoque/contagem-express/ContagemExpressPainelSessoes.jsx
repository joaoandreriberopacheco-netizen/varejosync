import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, ClipboardList, Loader2, Play, Plus, RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  P38MobileLine,
  P38MobileLineList,
  P38StatusLabel,
  p38AccentKeyFromTone,
  p38StatusTone,
} from '@/components/ui/p38-mobile-line';
import ContagemExpressFiltroPeriodo from '@/components/estoque/contagem-express/ContagemExpressFiltroPeriodo';
import ContagemExpressConsultaTotal from '@/components/estoque/contagem-express/ContagemExpressConsultaTotal';
import {
  contarProdutosSessao,
  criarSessaoContagemExpress,
  filtrarPorPeriodo,
  getPeriodoMesAtual,
  listarSessoesConcluidasContagemExpress,
  listarSessoesContagemExpress,
} from '@/lib/contagemExpressSessao';

function HubTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition-colors sm:py-2.5 sm:text-sm ${
        active ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
      }`}
    >
      {children}
    </button>
  );
}

export default function ContagemExpressPainelSessoes({
  usuario,
  produtos = [],
  onContinuar,
  onVoltar,
}) {
  const periodoPadrao = useMemo(() => getPeriodoMesAtual(), []);
  const [hubView, setHubView] = useState('aguardando');
  const [dataInicio, setDataInicio] = useState(periodoPadrao.start);
  const [dataFim, setDataFim] = useState(periodoPadrao.end);

  const [sessoesAguardando, setSessoesAguardando] = useState([]);
  const [sessoesConcluidas, setSessoesConcluidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [nomeNova, setNomeNova] = useState('');
  const [mostrarNome, setMostrarNome] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const [aguardando, concluidas] = await Promise.all([
        listarSessoesContagemExpress(base44),
        listarSessoesConcluidasContagemExpress(base44),
      ]);
      setSessoesAguardando(aguardando);
      setSessoesConcluidas(concluidas);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const sessoesConcluidasPeriodo = useMemo(
    () => filtrarPorPeriodo(sessoesConcluidas, { dataInicio, dataFim }, 'data_fim'),
    [sessoesConcluidas, dataInicio, dataFim],
  );

  const handlePeriodoChange = ({ dataInicio: inicio, dataFim: fim }) => {
    setDataInicio(inicio);
    setDataFim(fim);
  };

  const handleNova = async () => {
    setCriando(true);
    try {
      const nova = await criarSessaoContagemExpress(base44, usuario, nomeNova);
      setNomeNova('');
      setMostrarNome(false);
      onContinuar(nova);
    } catch (error) {
      console.error(error);
    }
    setCriando(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/40 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onVoltar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold font-glacial text-foreground">
            Contagem Express
          </h2>
          <Button
            type="button"
            size="sm"
            onClick={() => (mostrarNome ? handleNova() : setMostrarNome(true))}
            disabled={criando}
            className="h-9 shrink-0 rounded-xl px-3"
          >
            {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" />Nova</>}
          </Button>
        </div>
      </div>

      {mostrarNome && (
        <div className="flex shrink-0 gap-2 border-b border-border/40 px-3 py-3">
          <Input
            placeholder="Nome (opcional)"
            value={nomeNova}
            onChange={(e) => setNomeNova(e.target.value)}
            className="h-10 rounded-xl border-0 bg-muted/50"
          />
          <Button type="button" onClick={handleNova} disabled={criando} className="h-10 shrink-0 rounded-xl px-4">
            Iniciar
          </Button>
        </div>
      )}

      <div className="shrink-0 border-b border-border/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 gap-1 rounded-2xl bg-muted/50 p-1">
            <HubTab active={hubView === 'aguardando'} onClick={() => setHubView('aguardando')}>
              <span className="sm:hidden">Pausa ({sessoesAguardando.length})</span>
              <span className="hidden sm:inline">Aguardando ({sessoesAguardando.length})</span>
            </HubTab>
            <HubTab active={hubView === 'total'} onClick={() => setHubView('total')}>
              <span className="sm:hidden">Consulta ({sessoesConcluidasPeriodo.length})</span>
              <span className="hidden sm:inline">Consulta ({sessoesConcluidasPeriodo.length})</span>
            </HubTab>
          </div>
          <button
            type="button"
            onClick={carregar}
            disabled={loading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-muted/50 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`h-5 w-5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {hubView === 'total' && (
          <div className="sticky top-0 z-10 border-b border-border/40 bg-background/95 px-3 py-2 backdrop-blur-sm">
            <ContagemExpressFiltroPeriodo
              dataInicio={dataInicio}
              dataFim={dataFim}
              onChange={handlePeriodoChange}
            />
          </div>
        )}

        <div className="px-3 py-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : hubView === 'aguardando' ? (
            sessoesAguardando.length === 0 ? (
              <div className="py-16 text-center">
                <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Nenhuma contagem em pausa</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Toque em <strong>Nova</strong> para iniciar ou consulte contagens concluídas.
                </p>
              </div>
            ) : (
              <P38MobileLineList allViewports className="rounded-lg">
                {sessoesAguardando.map((sessao, index) => {
                  const { produtos: qtdProd, itens } = contarProdutosSessao(sessao);
                  const tone = p38StatusTone('info');
                  const data = sessao.data_inicio || sessao.created_date;
                  const dataFmt = data
                    ? format(new Date(data), "dd/MM/yy HH:mm", { locale: ptBR })
                    : '';

                  return (
                    <P38MobileLine
                      key={sessao.id}
                      accent={p38AccentKeyFromTone(tone)}
                      striped={index % 2 === 1}
                      onClick={() => onContinuar(sessao)}
                      trailing={<Play className="h-4 w-4 text-muted-foreground" />}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug text-foreground break-words whitespace-normal">
                          {sessao.nome_conferencia || 'Contagem Express'}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <P38StatusLabel tone={tone}>Em pausa</P38StatusLabel>
                          <span className="text-xs text-muted-foreground">
                            {qtdProd} prod. · {itens} ent. · {dataFmt}
                          </span>
                        </div>
                      </div>
                    </P38MobileLine>
                  );
                })}
              </P38MobileLineList>
            )
          ) : (
            <ContagemExpressConsultaTotal
              sessoes={sessoesConcluidasPeriodo}
              produtos={produtos}
            />
          )}
        </div>
      </div>
    </div>
  );
}
