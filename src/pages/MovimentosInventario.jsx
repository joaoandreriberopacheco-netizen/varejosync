import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  ClipboardList,
  Info,
  Loader2,
  Package,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  buildSaleUnitOptions,
  calculateBaseQuantity,
  commercialQuantityFromBase,
  formatCommercialQuantity,
  formatUnitConversion,
  normalizeUnitCode,
  resolvePrimaryFromFactorOne,
} from '@/lib/productUnits';

const REFERENCIA_MOVIMENTO_INVENTARIO = 'MovimentoInventario';
const MOTIVOS_ENTRADA = ['Ajuste pontual de inventário', 'Entrada manual', 'Devolução ao estoque', 'Correção de saldo'];
const MOTIVOS_SAIDA = ['Ajuste pontual de inventário', 'Perda / avaria', 'Consumo interno', 'Correção de saldo'];

const round6 = (value) => Math.round((Number(value) || 0) * 1_000_000) / 1_000_000;

function parseQuantidade(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value || '').trim().replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getProdutoNome(produto) {
  return (
    produto?.nome ||
    [produto?.campo_hierarquico_1, produto?.campo_hierarquico_2, produto?.campo_hierarquico_3]
      .filter(Boolean)
      .join(' ') ||
    'Produto sem nome'
  );
}

function getProdutoCodigo(produto) {
  return produto?.codigo_interno || produto?.codigo_barras || produto?.id || '';
}

function getUnitOptions(produto) {
  if (!produto) return [];
  const fallback = normalizeUnitCode(produto?.unidade_principal) || 'UN';
  const options = buildSaleUnitOptions(produto, 1);
  if (options.length > 0) {
    return options.map((option) => ({
      ...option,
      id: option.id || option.unidade || 'primary',
      unidade: normalizeUnitCode(option.unidade) || fallback,
      fator_conversao: Number(option.fator_conversao) > 0 ? Number(option.fator_conversao) : 1,
    }));
  }
  return [{
    id: 'primary',
    nome: 'Unidade base',
    unidade: fallback,
    fator_conversao: 1,
    is_primary: true,
  }];
}

function getProdutoUnidadeId(unit) {
  if (!unit) return 'principal';
  if (unit.is_primary || unit.id === 'primary') return 'principal';
  return unit.id || unit.unidade;
}

function unitLabel(unit, unidadePrincipal) {
  const nome = unit?.nome && unit.nome !== unit.unidade ? `${unit.nome} · ` : '';
  return `${nome}${formatUnitConversion(unit, unidadePrincipal)}`;
}

function isInventarioManual(movimento) {
  return (
    movimento?.referencia_tipo === REFERENCIA_MOVIMENTO_INVENTARIO ||
    movimento?.origem_tipo === REFERENCIA_MOVIMENTO_INVENTARIO
  );
}

export default function MovimentosInventario() {
  const [produtos, setProdutos] = useState([]);
  const [movimentosRecentes, setMovimentosRecentes] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduto, setSelectedProduto] = useState(null);
  const [selectedUnitCode, setSelectedUnitCode] = useState('');
  const [tipo, setTipo] = useState('Entrada');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('Ajuste pontual de inventário');
  const [documentoReferencia, setDocumentoReferencia] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [userData, produtosData, movimentosData] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.Produto.filter({ ativo: true }, '-created_date').catch(() => []),
        base44.entities.MovimentacaoEstoque.list('-created_date', 80).catch(() => []),
      ]);
      setCurrentUser(userData);
      setProdutos(Array.isArray(produtosData) ? produtosData.filter((p) => p?.id) : []);
      setMovimentosRecentes((Array.isArray(movimentosData) ? movimentosData : [])
        .filter(isInventarioManual)
        .slice(0, 12));
    } catch (error) {
      console.error('Erro ao carregar movimentos de inventário:', error);
      toast.error('Erro ao carregar dados de inventário.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProdutos = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    const lista = termo
      ? produtos.filter((produto) => {
          const haystack = [
            getProdutoNome(produto),
            produto.codigo_interno,
            produto.codigo_barras,
            produto.categoria_nome,
            produto.marca,
          ].filter(Boolean).join(' ').toLowerCase();
          return haystack.includes(termo);
        })
      : produtos;

    return [...lista]
      .sort((a, b) => getProdutoNome(a).localeCompare(getProdutoNome(b), 'pt-BR'))
      .slice(0, 20);
  }, [produtos, searchTerm]);

  const unitOptions = useMemo(() => getUnitOptions(selectedProduto), [selectedProduto]);
  const selectedUnit = useMemo(
    () => unitOptions.find((unit) => unit.unidade === selectedUnitCode) || unitOptions[0] || null,
    [selectedUnitCode, unitOptions]
  );
  const unidadePrincipal = useMemo(
    () => resolvePrimaryFromFactorOne(selectedProduto, selectedProduto?.unidade_principal || 'UN'),
    [selectedProduto]
  );
  const quantidadeComercial = parseQuantidade(quantidade);
  const fatorConversao = Number(selectedUnit?.fator_conversao) > 0 ? Number(selectedUnit.fator_conversao) : 1;
  const quantidadeBase = round6(calculateBaseQuantity(quantidadeComercial, fatorConversao));
  const estoqueAtualBase = round6(selectedProduto?.estoque_atual);
  const estoqueAtualNaUnidade = selectedUnit
    ? commercialQuantityFromBase(estoqueAtualBase, fatorConversao, selectedUnit.unidade)
    : estoqueAtualBase;
  const estoqueDepoisBase = tipo === 'Entrada'
    ? round6(estoqueAtualBase + quantidadeBase)
    : round6(estoqueAtualBase - quantidadeBase);
  const motivosDisponiveis = tipo === 'Entrada' ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA;
  const canSave = Boolean(selectedProduto?.id && selectedUnit && quantidadeBase > 0 && !saving);

  useEffect(() => {
    if (!selectedProduto) return;
    const defaultUnit = unitOptions[0];
    if (!unitOptions.some((unit) => unit.unidade === selectedUnitCode)) {
      setSelectedUnitCode(defaultUnit?.unidade || '');
    }
  }, [selectedProduto, selectedUnitCode, unitOptions]);

  useEffect(() => {
    if (!motivosDisponiveis.includes(motivo)) {
      setMotivo(motivosDisponiveis[0]);
    }
  }, [motivo, motivosDisponiveis]);

  const handleSelectProduto = async (produto) => {
    setSelectedProduto(produto);
    setSelectedUnitCode(getUnitOptions(produto)[0]?.unidade || '');
    try {
      const full = await base44.entities.Produto.get(produto.id);
      if (full?.id === produto.id) {
        setSelectedProduto((prev) => ({ ...prev, ...full }));
        setSelectedUnitCode(getUnitOptions(full)[0]?.unidade || '');
      }
    } catch (error) {
      console.warn('[MovimentosInventario] Produto.get falhou; usando linha da lista.', error);
    }
  };

  const resetFormAfterSave = (produtoAtualizado) => {
    setSelectedProduto(produtoAtualizado);
    setProdutos((prev) => prev.map((produto) => (
      produto.id === produtoAtualizado.id ? { ...produto, ...produtoAtualizado } : produto
    )));
    setQuantidade('');
    setDocumentoReferencia('');
    setObservacoes('');
  };

  const handleSave = async () => {
    if (!selectedProduto?.id) {
      toast.error('Selecione um produto.');
      return;
    }
    if (!selectedUnit) {
      toast.error('Selecione a unidade do produto.');
      return;
    }
    if (quantidadeBase <= 0) {
      toast.error('Informe uma quantidade maior que zero.');
      return;
    }

    setSaving(true);
    try {
      const produtoAtual = await base44.entities.Produto.get(selectedProduto.id).catch(() => selectedProduto);
      const estoqueAntes = round6(produtoAtual?.estoque_atual);
      const deltaBase = tipo === 'Entrada' ? quantidadeBase : -quantidadeBase;
      const estoqueDepois = round6(estoqueAntes + deltaBase);

      if (estoqueDepois < 0) {
        toast.error('A saída deixaria o estoque negativo. Ajuste a quantidade ou confira o saldo atual.');
        return;
      }

      const usuario = currentUser?.full_name || currentUser?.email || 'Sistema';
      const produtoNome = getProdutoNome(produtoAtual);
      const referenciaNumero = documentoReferencia.trim();
      const obsContexto = [
        observacoes.trim(),
        `Estoque: ${formatCommercialQuantity(estoqueAntes, unidadePrincipal)} ${unidadePrincipal} -> ${formatCommercialQuantity(estoqueDepois, unidadePrincipal)} ${unidadePrincipal}`,
        `Lancado em ${formatCommercialQuantity(quantidadeComercial, selectedUnit.unidade)} ${selectedUnit.unidade} (fator ${fatorConversao})`,
      ].filter(Boolean).join(' | ');

      const payloadMovimento = {
        produto_id: produtoAtual.id,
        produto_nome: produtoNome,
        tipo,
        motivo,
        quantidade: quantidadeBase,
        quantidade_base: quantidadeBase,
        quantidade_comercial: quantidadeComercial,
        unidade_medida: selectedUnit.unidade,
        unidade_sigla: selectedUnit.unidade,
        produto_unidade_id: getProdutoUnidadeId(selectedUnit),
        fator_conversao: fatorConversao,
        custo_unitario: Number(produtoAtual?.preco_custo_calculado) || Number(produtoAtual?.valor_compra) || 0,
        documento_referencia: referenciaNumero,
        referencia_tipo: REFERENCIA_MOVIMENTO_INVENTARIO,
        referencia_numero: referenciaNumero || 'Ajuste manual',
        origem_tipo: REFERENCIA_MOVIMENTO_INVENTARIO,
        origem_id: referenciaNumero || null,
        observacoes: obsContexto,
        usuario_responsavel: usuario,
      };

      const movimentoCriado = await base44.entities.MovimentacaoEstoque.create(payloadMovimento);
      const produtoAtualizado = await base44.entities.Produto.update(produtoAtual.id, {
        estoque_atual: estoqueDepois,
      });

      resetFormAfterSave({ ...produtoAtual, ...produtoAtualizado, estoque_atual: estoqueDepois });
      setMovimentosRecentes((prev) => [{ ...payloadMovimento, ...movimentoCriado }, ...prev].slice(0, 12));
      toast.success(`${tipo} registrada. Estoque atualizado para ${formatCommercialQuantity(estoqueDepois, unidadePrincipal)} ${unidadePrincipal}.`);
    } catch (error) {
      console.error('Erro ao registrar movimento de inventário:', error);
      toast.error(error?.message || 'Erro ao registrar movimento de inventário.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-950 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Estoque
            </p>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Movimentos de Inventário
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              Registre entradas e saídas pontuais para corrigir o saldo de um produto. Esta tela não substitui
              conferência ou auditoria de estoque.
            </p>
          </div>
          <Button variant="outline" onClick={loadInitialData} disabled={loading || saving}>
            Atualizar dados
          </Button>
        </div>

        <Alert className="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100">
          <Info className="h-4 w-4" />
          <AlertTitle>Uso correto</AlertTitle>
          <AlertDescription>
            Use para ajuste manual e pontual: sobras, perdas, correções pequenas ou regularizações operacionais.
            Para contagem formal com divergências, continue usando Conferência/Auditoria.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-blue-600" />
                Novo movimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-2">
                  <Label htmlFor="produto-search">Produto</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="produto-search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Busque por nome, código, marca ou categoria"
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-72 overflow-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                    {filteredProdutos.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">Nenhum produto encontrado.</div>
                    ) : (
                      filteredProdutos.map((produto) => {
                        const selected = selectedProduto?.id === produto.id;
                        return (
                          <button
                            key={produto.id}
                            type="button"
                            onClick={() => handleSelectProduto(produto)}
                            className={`flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left last:border-b-0 transition-colors dark:border-gray-800 ${
                              selected
                                ? 'bg-blue-50 dark:bg-blue-950/40'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/70'
                            }`}
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                              <Package className="h-5 w-5 text-gray-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                {getProdutoNome(produto)}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                {getProdutoCodigo(produto) && <span>#{getProdutoCodigo(produto)}</span>}
                                <span>
                                  Estoque: {formatCommercialQuantity(produto.estoque_atual, produto.unidade_principal || 'UN')} {produto.unidade_principal || 'UN'}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                  <div>
                    <Label>Tipo</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={tipo === 'Entrada' ? 'default' : 'outline'}
                        onClick={() => setTipo('Entrada')}
                        className="gap-2"
                      >
                        <ArrowUpCircle className="h-4 w-4" />
                        Entrada
                      </Button>
                      <Button
                        type="button"
                        variant={tipo === 'Saída' ? 'destructive' : 'outline'}
                        onClick={() => setTipo('Saída')}
                        className="gap-2"
                      >
                        <ArrowDownCircle className="h-4 w-4" />
                        Saída
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Motivo</Label>
                    <Select value={motivo} onValueChange={setMotivo}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {motivosDisponiveis.map((item) => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {selectedProduto && (
                <div className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-3">
                  <div className="md:col-span-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">Produto selecionado</Badge>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {getProdutoNome(selectedProduto)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Unidade do movimento</Label>
                    <Select value={selectedUnitCode} onValueChange={setSelectedUnitCode}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((unit) => (
                          <SelectItem key={`${unit.id}-${unit.unidade}`} value={unit.unidade}>
                            {unitLabel(unit, unidadePrincipal)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantidade">Quantidade em {selectedUnit?.unidade || 'unidade'}</Label>
                    <Input
                      id="quantidade"
                      inputMode="decimal"
                      value={quantidade}
                      onChange={(event) => setQuantidade(event.target.value)}
                      placeholder="Ex: 2,5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="documento-referencia">Referência opcional</Label>
                    <Input
                      id="documento-referencia"
                      value={documentoReferencia}
                      onChange={(event) => setDocumentoReferencia(event.target.value)}
                      placeholder="Ex: ajuste balcão, OS, romaneio"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <div className="grid gap-3 rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-950 md:grid-cols-3">
                      <div>
                        <span className="block text-xs uppercase tracking-wide text-gray-500">Saldo atual</span>
                        <strong className="text-gray-900 dark:text-gray-100">
                          {formatCommercialQuantity(estoqueAtualNaUnidade, selectedUnit?.unidade)} {selectedUnit?.unidade}
                        </strong>
                        {selectedUnit?.unidade !== unidadePrincipal && (
                          <span className="mt-0.5 block text-xs text-gray-500">
                            {formatCommercialQuantity(estoqueAtualBase, unidadePrincipal)} {unidadePrincipal}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-wide text-gray-500">Movimento em base</span>
                        <strong className={tipo === 'Entrada' ? 'text-emerald-700' : 'text-red-700'}>
                          {tipo === 'Entrada' ? '+' : '-'}{formatCommercialQuantity(quantidadeBase, unidadePrincipal)} {unidadePrincipal}
                        </strong>
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-wide text-gray-500">Saldo após salvar</span>
                        <strong className={estoqueDepoisBase < 0 ? 'text-red-700' : 'text-gray-900 dark:text-gray-100'}>
                          {formatCommercialQuantity(estoqueDepoisBase, unidadePrincipal)} {unidadePrincipal}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={observacoes}
                      onChange={(event) => setObservacoes(event.target.value)}
                      placeholder="Explique rapidamente o motivo operacional do ajuste."
                    />
                  </div>

                  <div className="flex flex-col gap-2 md:col-span-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Boxes className="h-4 w-4" />
                      A quantidade é convertida para a unidade base do estoque antes de gravar.
                    </div>
                    <Button onClick={handleSave} disabled={!canSave || estoqueDepoisBase < 0} className="min-w-44">
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Registrar movimento
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg">Últimos ajustes pontuais</CardTitle>
            </CardHeader>
            <CardContent>
              {movimentosRecentes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-800">
                  Nenhum movimento manual recente.
                </div>
              ) : (
                <div className="space-y-3">
                  {movimentosRecentes.map((movimento) => (
                    <div key={movimento.id || `${movimento.produto_id}-${movimento.created_date}`} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                            {movimento.produto_nome || movimento.produto_id || 'Produto'}
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(movimento.created_date || movimento.created_at)}</p>
                        </div>
                        <Badge variant={movimento.tipo === 'Entrada' ? 'secondary' : 'destructive'}>
                          {movimento.tipo}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        {formatCommercialQuantity(movimento.quantidade_comercial || movimento.quantidade, movimento.unidade_medida)} {movimento.unidade_medida || 'base'}
                        {movimento.quantidade_base && movimento.unidade_medida && (
                          <span className="text-xs text-gray-500">
                            {' '}({formatCommercialQuantity(movimento.quantidade_base)} base)
                          </span>
                        )}
                      </div>
                      {movimento.motivo && (
                        <p className="mt-1 text-xs text-gray-500">{movimento.motivo}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">Resumo técnico do lançamento</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campo</TableHead>
                  <TableHead>Valor atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell>{selectedProduto ? getProdutoNome(selectedProduto) : '-'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Unidade escolhida</TableCell>
                  <TableCell>{selectedUnit ? unitLabel(selectedUnit, unidadePrincipal) : '-'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Quantidade base que será gravada</TableCell>
                  <TableCell>{selectedProduto ? `${formatCommercialQuantity(quantidadeBase, unidadePrincipal)} ${unidadePrincipal}` : '-'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Tipo de referência</TableCell>
                  <TableCell>{REFERENCIA_MOVIMENTO_INVENTARIO}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
