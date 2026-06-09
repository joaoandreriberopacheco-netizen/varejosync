import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, ClipboardList, Loader2, Play, Plus,
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
import {
  contarProdutosSessao,
  criarSessaoContagemExpress,
  listarSessoesContagemExpress,
} from '@/lib/contagemExpressSessao';

export default function ContagemExpressPainelSessoes({
  usuario,
  onContinuar,
  onVoltar,
}) {
  const [sessoes, setSessoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [nomeNova, setNomeNova] = useState('');
  const [mostrarNome, setMostrarNome] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const lista = await listarSessoesContagemExpress(base44);
      setSessoes(lista);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

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
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2.5">
        <button
          type="button"
          onClick={onVoltar}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground"
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
          className="h-9 rounded-xl px-3"
        >
          {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" />Nova</>}
        </Button>
      </div>

      {mostrarNome && (
        <div className="flex gap-2 border-b border-border/40 px-3 py-3">
          <Input
            placeholder="Nome (opcional)"
            value={nomeNova}
            onChange={(e) => setNomeNova(e.target.value)}
            className="h-10 rounded-xl border-0 bg-muted/50"
          />
          <Button type="button" onClick={handleNova} disabled={criando} className="h-10 rounded-xl px-4">
            Iniciar
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessoes.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhuma contagem em pausa</p>
          </div>
        ) : (
          <P38MobileLineList>
            {sessoes.map((sessao, index) => {
              const { produtos, itens } = contarProdutosSessao(sessao);
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
                    <p className="truncate text-sm font-medium text-foreground">
                      {sessao.nome_conferencia || 'Contagem Express'}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <P38StatusLabel tone={tone}>Em pausa</P38StatusLabel>
                      <span className="text-xs text-muted-foreground">
                        {produtos} prod. · {itens} ent. · {dataFmt}
                      </span>
                    </div>
                  </div>
                </P38MobileLine>
              );
            })}
          </P38MobileLineList>
        )}
      </div>
    </div>
  );
}
