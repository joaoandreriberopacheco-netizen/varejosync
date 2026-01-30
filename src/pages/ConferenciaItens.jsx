import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, CheckCircle, AlertCircle, Loader2, Search, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function ConferenciaItens() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const codigo = searchParams.get('codigo');

  const [manifestoEntrada, setManifestoEntrada] = useState(null);
  const [conferente, setConferente] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [itensConferidos, setItensConferidos] = useState([]);
  const [busca, setBusca] = useState('');
  const [finalizando, setFinalizando] = useState(false);

  useEffect(() => {
    if (!codigo) {
      navigate('/ConferenciaEntrada');
      return;
    }
    carregarDados();
  }, [codigo]);

  const carregarDados = async () => {
    try {
      const [responseValidacao, produtosData] = await Promise.all([
        base44.functions.invoke('validateConferenceCode', { codigo }),
        base44.entities.Produto.list()
      ]);
      
      if (!responseValidacao.data.success) {
        toast.error(responseValidacao.data.error || 'Código inválido');
        navigate('/ConferenciaEntrada');
        return;
      }

      if (responseValidacao.data.tipo !== 'itens') {
        toast.error('Este código é para conferência de volumes');
        navigate('/ConferenciaEntrada');
        return;
      }

      setManifestoEntrada(responseValidacao.data.manifesto_entrada);
      setConferente(responseValidacao.data.conferente);
      setProdutos(produtosData);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar dados');
      navigate('/ConferenciaEntrada');
    } finally {
      setCarregando(false);
    }
  };

  const produtosFiltrados = produtos.filter(p => {
    if (!busca.trim()) return false;
    const lower = busca.toLowerCase();
    return (
      p.nome.toLowerCase().includes(lower) ||
      (p.codigo_interno && p.codigo_interno.toLowerCase().includes(lower)) ||
      (p.codigo_barras && p.codigo_barras.includes(lower))
    );
  }).slice(0, 20);

  const handleAdicionarItem = (produto) => {
    const existe = itensConferidos.find(i => i.produto_id === produto.id);
    if (existe) {
      toast.error('Produto já adicionado');
      return;
    }

    setItensConferidos([...itensConferidos, {
      produto_id: produto.id,
      produto_nome: produto.nome,
      quantidade_conferida: ''
    }]);
    setBusca('');
  };

  const handleQuantidadeChange = (index, valor) => {
    const novosItens = [...itensConferidos];
    novosItens[index].quantidade_conferida = valor;
    setItensConferidos(novosItens);
  };

  const handleRemoverItem = (index) => {
    setItensConferidos(itensConferidos.filter((_, i) => i !== index));
  };

  const handleFinalizar = async () => {
    const itensValidos = itensConferidos.filter(i => i.quantidade_conferida > 0);
    if (itensValidos.length === 0) {
      toast.error('Adicione pelo menos um item com quantidade');
      return;
    }

    try {
      setFinalizando(true);

      // Atualizar manifesto de entrada
      await base44.entities.ManifestoEntrada.update(manifestoEntrada.id, {
        itens_conferidos: itensValidos,
        data_conferencia: new Date().toISOString(),
        conferente_id: conferente.id,
        conferente_nome: conferente.full_name,
        status: 'Conferido',
        status_codigo_conferencia_itens: 'Concluído'
      });

      // Criar movimentações de estoque
      for (const item of itensValidos) {
        await base44.entities.MovimentacaoEstoque.create({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          tipo: 'Entrada',
          motivo: 'Compra',
          quantidade: parseFloat(item.quantidade_conferida),
          referencia_tipo: 'ManifestoEntrada',
          referencia_id: manifestoEntrada.id,
          referencia_numero: manifestoEntrada.numero,
          usuario_responsavel: conferente.full_name,
          observacoes: `Conferência cega - Código: ${codigo}`
        });
      }

      toast.success('Conferência concluída e estoque atualizado!');
      navigate('/HubLogistico');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao finalizar conferência');
    } finally {
      setFinalizando(false);
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Package className="w-7 h-7 text-gray-700 dark:text-gray-300" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Conferência de Itens</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Registre os produtos recebidos</p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">Conferência Cega Ativa</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Registre APENAS o que você está recebendo fisicamente. Busque produtos e informe quantidades.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Busca de Produtos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-3 block">
            Buscar Produto
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Digite nome ou código..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 bg-gray-50 dark:bg-gray-900 border-0 shadow-sm h-11"
              autoFocus
            />
          </div>

          {busca.trim() && produtosFiltrados.length > 0 && (
            <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border-0 shadow-sm">
              {produtosFiltrados.map((produto) => (
                <div
                  key={produto.id}
                  onClick={() => handleAdicionarItem(produto)}
                  className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{produto.nome}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {produto.codigo_interno || produto.codigo_barras || 'S/CÓD'}
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Itens Conferidos */}
        {itensConferidos.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900">
                  <TableRow className="border-0">
                    <TableHead className="text-gray-700 dark:text-gray-300">Produto</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 w-32">Quantidade</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensConferidos.map((item, index) => (
                    <TableRow key={index} className="border-0 hover:bg-gray-50 dark:hover:bg-gray-900">
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        {item.produto_nome}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={item.quantidade_conferida}
                          onChange={(e) => handleQuantidadeChange(index, e.target.value)}
                          className="h-9 bg-gray-50 dark:bg-gray-900 border-0 shadow-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoverItem(index)}
                          className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/HubLogistico')}
              className="flex-1 h-12 border-0 shadow-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleFinalizar}
              disabled={finalizando || itensConferidos.length === 0}
              className="flex-1 h-12 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 shadow-lg"
            >
              {finalizando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Finalizar Conferência
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}