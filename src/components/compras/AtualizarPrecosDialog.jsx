import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import OperacaoAuthenticator from '@/components/auth/OperacaoAuthenticator';
import {
  resolvePrimaryFromFactorOne,
  resolveCommercialUnit,
  formatUnitConversion,
  buildPurchaseUnitOptions,
} from '@/lib/productUnits';

// Formata número para string BR
const fmt = (v) => (parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Parseia string BR para número
const parse = (s) => {
  if (!s && s !== 0) return 0;
  if (typeof s === 'number') return s;
  return parseFloat(String(s).replace(/\./g, '').replace(',', '.')) || 0;
};

// Calcula custo total a partir dos campos
const calcCusto = (c) =>
  (c.valor_compra || 0) + (c.custo_frete_padrao || 0) + (c.custo_imposto1_padrao || 0) +
  (c.custo_imposto2_padrao || 0) + (c.custo_outros_padrao || 0) - (c.desconto_compra_padrao || 0);

// Calcula preço venda a partir do custo e markup
const calcPreco = (custo, markup) => custo > 0 ? custo * (1 + markup / 100) : 0;

// Calcula markup a partir do custo e preço venda
const calcMarkup = (custo, preco) => custo > 0 ? ((preco / custo) - 1) * 100 : 0;

const COST_FIELDS = ['valor_compra', 'custo_frete_padrao', 'custo_imposto1_padrao', 'custo_imposto2_padrao', 'custo_outros_padrao'];

/** Mesmas equivalências usadas em compras / produtos para casar CX, M2, etc. */
function normalizarSiglaUnidade(raw) {
  return String(raw || '').trim().toUpperCase()
    .replace('CAIXAS', 'CX')
    .replace('CAIXA', 'CX')
    .replace('M²', 'M2')
    .replace('METRO QUADRADO', 'M2');
}

/**
 * Fator da **linha do pedido**: converte custo_unitario → valor_compra na unidade base do cadastro.
 * (Quando compra está em M², isto é 1 — não misturar com embalagem só de apresentação.)
 */
function resolveFatorPedidoParaBase(item, produto) {
  const qtd = Number(item?.quantidade);
  const qb = Number(item?.quantidade_base);
  if (qtd > 0 && qb > 0) {
    const derivado = qb / qtd;
    if (Number.isFinite(derivado) && derivado > 0) {
      return Math.round(derivado * 10000) / 10000;
    }
  }
  const sigla = normalizarSiglaUnidade(item?.unidade_medida || '');
  if (produto && sigla) {
    const opcoes = buildPurchaseUnitOptions(produto);
    const match = opcoes.find((o) => normalizarSiglaUnidade(o.unidade) === sigla);
    if (match && Number(match.fator_conversao) > 0) {
      return Number(match.fator_conversao);
    }
  }
  const f = Number(item?.fator_conversao);
  return Number.isFinite(f) && f > 0 ? f : 1;
}

/**
 * Último recurso: extrai quantos m² tem a embalagem a partir do nome (ex.: "(2,10m²/CX)", "CX2,1M2").
 */
function extrairM2PorEmbalagemDoNome(nomeProduto) {
  if (!nomeProduto || typeof nomeProduto !== 'string') return null;
  const patterns = [
    /\(\s*([\d]{1,4}[,.]?[\d]{0,4})\s*[mM][²2]\s*\/\s*[cC][xX]/,
    /[cC][xX]\s*([\d]{1,4}[,.]?[\d]{0,4})\s*[mM][²2]/,
    /[cC][xX]\s*([\d]{1,4}[,.]?[\d]{0,4})\s*[mM]2\b/i,
  ];
  for (const re of patterns) {
    const m = nomeProduto.match(re);
    if (m && m[1]) {
      const num = parseFloat(String(m[1]).replace(/\./g, '').replace(',', '.'));
      if (Number.isFinite(num) && num > 0) return num;
    }
  }
  return null;
}

/** Inferência simples da sigla da embalagem pelo nome (para legenda quando cadastro não tem alternativa). */
function inferSiglaEmbalagemDoNome(nomeProduto) {
  if (!nomeProduto || typeof nomeProduto !== 'string') return null;
  const u = nomeProduto.toUpperCase();
  if (/\bCX\b|CX[\d]|\/\s*CX|\(.*CX|[cC][xX]\s*[\d]/i.test(u)) return 'CX';
  if (/CAIXA/i.test(u)) return 'CX';
  return null;
}

/** Fator da unidade comercial de apresentação no cadastro (ex.: 1 CX = 2,1 M2). */
function resolveFatorComercialCadastro(produto) {
  if (!produto) return 1;
  const principal = resolvePrimaryFromFactorOne(produto, 'UN');
  const pref = resolveCommercialUnit(produto, principal);
  if (normalizarSiglaUnidade(pref) !== normalizarSiglaUnidade(principal)) {
    const opcoes = buildPurchaseUnitOptions(produto);
    const match = opcoes.find((o) => normalizarSiglaUnidade(o.unidade) === normalizarSiglaUnidade(pref));
    if (match && Number(match.fator_conversao) > 1) return Number(match.fator_conversao);
  }
  const fromNome = extrairM2PorEmbalagemDoNome(produto.nome || '');
  if (fromNome != null && fromNome > 0) return fromNome;
  return 1;
}

/**
 * Fator para **exibir** valores na unidade comercial: usa o pedido (CX, etc.) se houver;
 * senão usa a embalagem/apresentação do cadastro — assim compra em M2 ainda mostra preço por caixa.
 */
function resolveFatorExibicaoComercial(item, produto) {
  const fp = resolveFatorPedidoParaBase(item, produto);
  if (fp > 1) return fp;
  const fc = resolveFatorComercialCadastro(produto);
  return fc > 1 ? fc : 1;
}

/** Multiplicador visual: na unidade comercial, valores monetários = base × fator. */
function multiplicadorVisual(unidadeVisualizacao, fator) {
  if (unidadeVisualizacao !== 'comercial') return 1;
  return fator > 0 ? fator : 1;
}

const sanitizeTwoDecimalInput = (value) => {
  const raw = String(value ?? '');
  const cleaned = raw.replace(/[^0-9,.-]/g, '');
  const isNegative = cleaned.includes('-');
  const unsigned = cleaned.replace(/-/g, '');
  const hasComma = unsigned.includes(',');
  const hasDot = unsigned.includes('.');

  const separator = hasComma ? ',' : hasDot ? '.' : null;

  if (separator) {
    const parts = unsigned.split(separator);
    const integerPart = (parts.shift() || '').replace(/[,.]/g, '');
    const decimalPart = parts.join('').replace(/[,.]/g, '');
    const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '') || '0';
    return `${isNegative ? '-' : ''}${normalizedInteger}${separator}${decimalPart.slice(0, 2)}`;
  }

  const normalizedInteger = unsigned.replace(/[,.]/g, '').replace(/^0+(?=\d)/, '') || '0';
  return `${isNegative ? '-' : ''}${normalizedInteger}`;
};

export default function AtualizarPrecosDialog({ isOpen, onClose, itens, produtos }) {
  const [selecionados, setSelecionados] = useState({});
  const [processando, setProcessando] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  // Estado principal (valores numéricos)
  const [costs, setCosts] = useState({});
  // Estado local dos inputs (strings para digitação livre)
  const [inputs, setInputs] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  /** Padrão do diálogo: sempre unidade comercial (embalagem); unidade base só se o usuário alternar. */
  const [unidadeVisualizacao, setUnidadeVisualizacao] = useState('comercial');

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Inicializa estado ao abrir — custos sempre na unidade base do cadastro; custo_unitario do item pode ser por embalagem
  useEffect(() => {
    if (!isOpen || !itens.length) return;
    const modoInicial = 'comercial';
    setUnidadeVisualizacao(modoInicial);

    const initialCosts = {};
    const initialInputs = {};
    itens.forEach(item => {
      const p = produtos.find(x => x.id === item.produto_id);
      if (!p) return;

      const fatorPedido = resolveFatorPedidoParaBase(item, p);
      const custoNaUnidadePedido = item.custo_unitario ?? p.valor_compra ?? 0;
      const valorCompraBase = fatorPedido > 0 ? custoNaUnidadePedido / fatorPedido : custoNaUnidadePedido;

      let descontoPct = item.desconto_pct_item || 0;
      if (!descontoPct && item.valor_desconto_item && custoNaUnidadePedido > 0) {
        descontoPct = (Math.abs(item.valor_desconto_item) / custoNaUnidadePedido) * 100;
      }
      if (item.valor_desconto_item < 0) descontoPct = -Math.abs(descontoPct);

      const descontoValorCalcBase = valorCompraBase * Math.abs(descontoPct) / 100;
      const descontoComSinal = descontoPct < 0 ? -descontoValorCalcBase : descontoValorCalcBase;

      const c = {
        valor_compra: valorCompraBase,
        custo_frete_padrao: p.custo_frete_padrao || 0,
        custo_imposto1_padrao: p.custo_imposto1_padrao || 0,
        custo_imposto2_padrao: p.custo_imposto2_padrao || 0,
        custo_outros_padrao: p.custo_outros_padrao || 0,
        desconto_compra_padrao: descontoComSinal,
        desconto_pct: descontoPct,
        preco_venda_percentual: p.preco_venda_percentual || 40,
        preco_venda_padrao: p.preco_venda_padrao || 0,
      };
      if (!c.preco_venda_padrao) {
        c.preco_venda_padrao = calcPreco(calcCusto(c), c.preco_venda_percentual);
      }
      initialCosts[item.produto_id] = c;

      const mult = multiplicadorVisual(modoInicial, resolveFatorExibicaoComercial(item, p));
      COST_FIELDS.forEach(field => {
        initialInputs[`${item.produto_id}_${field}`] = fmt((c[field] || 0) * mult);
      });
      initialInputs[`${item.produto_id}_desconto_pct`] = String(Math.round((descontoPct) * 100) / 100);
      initialInputs[`${item.produto_id}_markup`] = String(Math.round((c.preco_venda_percentual || 40) * 100) / 100);
      initialInputs[`${item.produto_id}_preco`] = fmt((c.preco_venda_padrao || 0) * mult);
    });
    setCosts(initialCosts);
    setInputs(initialInputs);
  }, [isOpen, itens, produtos]);

  // Recalcula desconto absoluto a partir do %
  const recalcDesconto = (c) => {
    const pct = c.desconto_pct || 0;
    const base = c.valor_compra || 0;
    const absVal = parseFloat((base * Math.abs(pct) / 100).toFixed(2));
    return pct < 0 ? -absVal : absVal;
  };

  const alternarUnidadeVisualizacao = (modo) => {
    if (modo === unidadeVisualizacao) return;
    setUnidadeVisualizacao(modo);
    setInputs((prev) => {
      const next = { ...prev };
      itens.forEach((item) => {
        const id = item.produto_id;
        const c = costs[id];
        if (!c) return;
        const pRow = produtos.find((x) => x.id === id);
        const mult = multiplicadorVisual(modo, resolveFatorExibicaoComercial(item, pRow));
        COST_FIELDS.forEach((field) => {
          next[`${id}_${field}`] = fmt((c[field] || 0) * mult);
        });
        next[`${id}_desconto_pct`] = String(Math.round((c.desconto_pct || 0) * 100) / 100);
        next[`${id}_markup`] = String(Math.round((c.preco_venda_percentual || 40) * 100) / 100);
        next[`${id}_preco`] = fmt((c.preco_venda_padrao || 0) * mult);
      });
      return next;
    });
  };

  // Ao sair de um campo de custo: commita valor e recalcula preço venda mantendo markup
  const handleCostBlur = (produtoId, field) => {
    const raw = inputs[`${produtoId}_${field}`];
    const item = itens.find((i) => i.produto_id === produtoId);
    const prodRow = produtos.find((x) => x.id === produtoId);
    const m = multiplicadorVisual(unidadeVisualizacao, resolveFatorExibicaoComercial(item || {}, prodRow));
    const val = parse(raw) / m;
    setCosts(prev => {
      const c = { ...prev[produtoId], [field]: val };
      // Se mudou valor_compra, recalcular desconto absoluto baseado no %
      if (field === 'valor_compra') {
        c.desconto_compra_padrao = recalcDesconto(c);
      }
      const custo = calcCusto(c);
      const markup = c.preco_venda_percentual || 0;
      const novoPreco = calcPreco(custo, markup);
      const next = { ...c, preco_venda_padrao: novoPreco };
      const dm = multiplicadorVisual(unidadeVisualizacao, resolveFatorExibicaoComercial(item || {}, prodRow));
      setInputs(p2 => ({
        ...p2,
        [`${produtoId}_${field}`]: fmt(val * dm),
        [`${produtoId}_preco`]: fmt(novoPreco * dm),
      }));
      return { ...prev, [produtoId]: next };
    });
  };

  // Ao sair do campo desconto %
  const handleDescontoPctBlur = (produtoId) => {
    const raw = inputs[`${produtoId}_desconto_pct`];
    const normalized = String(raw).replace(',', '.');
    const pct = parseFloat(normalized) || 0;
    handleDescontoPctBlurDirect(produtoId, Math.round(pct * 100) / 100);
  };

  // Versão direta (usada pelo toggle)
  const handleDescontoPctBlurDirect = (produtoId, pct) => {
    const linha = itens.find((i) => i.produto_id === produtoId);
    const prodRow = produtos.find((x) => x.id === produtoId);
    const dm = multiplicadorVisual(unidadeVisualizacao, resolveFatorExibicaoComercial(linha || {}, prodRow));
    setCosts(prev => {
      const c = { ...prev[produtoId], desconto_pct: pct };
      c.desconto_compra_padrao = recalcDesconto(c);
      const custo = calcCusto(c);
      const markup = c.preco_venda_percentual || 0;
      const novoPreco = calcPreco(custo, markup);
      const next = { ...c, preco_venda_padrao: novoPreco };
      setInputs(p2 => ({
        ...p2,
        [`${produtoId}_desconto_pct`]: String(Math.round(pct * 100) / 100),
        [`${produtoId}_preco`]: fmt(novoPreco * dm),
      }));
      return { ...prev, [produtoId]: next };
    });
  };

  // Ao sair do markup: recalcula preço venda
  const handleMarkupBlur = (produtoId) => {
    const raw = inputs[`${produtoId}_markup`];
    const markup = parseFloat(raw) || 0;
    const linha = itens.find((i) => i.produto_id === produtoId);
    const prodRow = produtos.find((x) => x.id === produtoId);
    const dm = multiplicadorVisual(unidadeVisualizacao, resolveFatorExibicaoComercial(linha || {}, prodRow));
    setCosts(prev => {
      const c = { ...prev[produtoId], preco_venda_percentual: markup };
      const custo = calcCusto(c);
      const novoPreco = calcPreco(custo, markup);
      const next = { ...c, preco_venda_padrao: novoPreco };
      setInputs(p2 => ({
        ...p2,
        [`${produtoId}_markup`]: String(Math.round(markup * 100) / 100),
        [`${produtoId}_preco`]: fmt(novoPreco * dm),
      }));
      return { ...prev, [produtoId]: next };
    });
  };

  // Ao sair do preço venda: recalcula markup
  const handlePrecoBlur = (produtoId) => {
    const raw = inputs[`${produtoId}_preco`];
    const item = itens.find((i) => i.produto_id === produtoId);
    const prodRow = produtos.find((x) => x.id === produtoId);
    const m = multiplicadorVisual(unidadeVisualizacao, resolveFatorExibicaoComercial(item || {}, prodRow));
    const preco = parse(raw) / m;
    setCosts(prev => {
      const c = prev[produtoId];
      const custo = calcCusto(c);
      const novoMarkup = Math.max(0, calcMarkup(custo, preco));
      const next = { ...c, preco_venda_padrao: preco, preco_venda_percentual: novoMarkup };
      const dm = multiplicadorVisual(unidadeVisualizacao, resolveFatorExibicaoComercial(item || {}, prodRow));
      setInputs(p2 => ({
        ...p2,
        [`${produtoId}_preco`]: fmt(preco * dm),
        [`${produtoId}_markup`]: String(Math.round(novoMarkup * 100) / 100),
      }));
      return { ...prev, [produtoId]: next };
    });
  };

  // Dados calculados por item para exibição (custos internos sempre na unidade base do cadastro)
  const itensCalc = itens.map(item => {
    const p = produtos.find(x => x.id === item.produto_id);
    if (!p) return null;
    const c = costs[item.produto_id] || {};
    const novoCusto = calcCusto(c);
    const custoAtual = p.preco_custo_calculado || p.valor_compra || 0;
    const diferencaCusto = novoCusto - custoAtual;
    const temDiferenca = Math.abs(diferencaCusto) > 0.01;
    const principal = resolvePrimaryFromFactorOne(p, 'UN');
    const uCadastroComercial = resolveCommercialUnit(p, principal);
    const fatorPedido = resolveFatorPedidoParaBase(item, p);
    const fatorExibicao = resolveFatorExibicaoComercial(item, p);
    const multDisplay = multiplicadorVisual(unidadeVisualizacao, fatorExibicao);
    const unidadeBase = principal;
    const linhaSigla = normalizarSiglaUnidade(item?.unidade_medida || '');
    let unidadeComercialLegenda =
      fatorPedido > 1 ? (linhaSigla || normalizarSiglaUnidade(uCadastroComercial)) : normalizarSiglaUnidade(uCadastroComercial);
    const baseNorm = normalizarSiglaUnidade(principal);
    const legNorm = normalizarSiglaUnidade(unidadeComercialLegenda);
    if (fatorExibicao > 1 && (!legNorm || legNorm === baseNorm)) {
      const guessed = inferSiglaEmbalagemDoNome(p.nome || '');
      if (guessed) unidadeComercialLegenda = guessed;
      else if (extrairM2PorEmbalagemDoNome(p.nome || '')) unidadeComercialLegenda = 'CX';
    }
    return {
      ...item,
      produto: p,
      novoCusto,
      custoAtual,
      diferencaCusto,
      temDiferenca,
      c,
      fatorExibicao,
      multDisplay,
      unidadeBase,
      unidadeComercialLegenda,
    };
  }).filter(Boolean);

  const algumItemComConversao = itensCalc.some((i) => i.fatorExibicao !== 1);
  const siglasComerciais = [...new Set(itensCalc.filter((i) => i.fatorExibicao !== 1).map((i) => i.unidadeComercialLegenda).filter(Boolean))];

  const qtdComDiferenca = itensCalc.filter(i => i.temDiferenca).length;

  const handleToggle = (id) => setSelecionados(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSelecionarTodos = () => {
    const todos = {};
    itensCalc.forEach(i => { if (i.temDiferenca) todos[i.produto_id] = true; });
    setSelecionados(todos);
  };

  const handleInitiateUpdate = () => {
    const sel = itensCalc.filter(i => selecionados[i.produto_id]);
    if (!sel.length) {
      toast({ title: "Nenhum item selecionado", description: "Selecione ao menos um item para atualizar", variant: "destructive" });
      return;
    }
    setPendingUpdate(sel);
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = async (authData) => {
    if (!pendingUpdate) return;
    setProcessando(true);
    try {
      for (const item of pendingUpdate) {
        const c = costs[item.produto_id];
        await base44.entities.Produto.update(item.produto_id, {
          valor_compra: c.valor_compra,
          custo_frete_padrao: c.custo_frete_padrao,
          custo_imposto1_padrao: c.custo_imposto1_padrao,
          custo_imposto2_padrao: c.custo_imposto2_padrao,
          custo_outros_padrao: c.custo_outros_padrao,
          desconto_compra_padrao: c.desconto_compra_padrao,
          preco_custo_calculado: calcCusto(c),
          preco_venda_percentual: c.preco_venda_percentual,
          preco_venda_padrao: c.preco_venda_padrao,
        });
      }
      toast({ title: "✓ Preços atualizados", description: `${pendingUpdate.length} produto(s) atualizado(s) [Auth: ${authData.intervenienteName}]`, className: "bg-emerald-100 text-emerald-800" });
      onClose(true);
    } catch (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } finally {
      setProcessando(false);
      setPendingUpdate(null);
    }
  };

  const inp = (produtoId, field) => inputs[`${produtoId}_${field}`] ?? '';
  const setInp = (produtoId, field, val) => setInputs(prev => ({ ...prev, [`${produtoId}_${field}`]: val }));

  const numSel = Object.keys(selecionados).filter(k => selecionados[k]).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? '!max-w-[100vw] !w-[100vw] h-[100vh] !rounded-none p-0' : '!max-w-[95vw]'} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader className={isMobile ? 'px-4 pt-4 pb-3' : ''}>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <DollarSign className="w-5 h-5 text-gray-800 dark:text-gray-200" />
            Revisar Preços de Venda
          </DialogTitle>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            {qtdComDiferenca > 0
              ? `${qtdComDiferenca} produto(s) com alteração de custo detectada. Revise e selecione quais preços deseja atualizar.`
              : 'Nenhuma alteração de custo detectada. Você pode revisar os preços atuais dos produtos.'}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Os valores monetários são mostrados por <strong className="font-semibold text-gray-800 dark:text-gray-200">unidade comercial</strong> (ex.: caixa), quando existir conversão — o sistema aplica o fator automaticamente.
            Ao salvar, o cadastro continua gravado na <strong className="font-semibold text-gray-800 dark:text-gray-200">unidade base</strong> (ex.: m²).
          </p>
        </DialogHeader>

        <div className={isMobile ? 'mt-2' : 'mt-4'}>
          {algumItemComConversao && (
            <div className={`flex flex-wrap items-center gap-2 mb-3 ${isMobile ? 'px-4' : ''}`}>
              <span className="text-xs text-gray-600 dark:text-gray-400">Alternar apenas a visualização:</span>
              <Button
                type="button"
                variant={unidadeVisualizacao === 'comercial' ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => alternarUnidadeVisualizacao('comercial')}
              >
                Unidade comercial (embalagem){siglasComerciais.length ? ` · ${siglasComerciais.join(', ')}` : ''}
              </Button>
              <Button
                type="button"
                variant={unidadeVisualizacao === 'base' ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => alternarUnidadeVisualizacao('base')}
              >
                Unidade base do cadastro ({itensCalc[0]?.unidadeBase || '—'})
              </Button>
            </div>
          )}
          <div className={`flex items-center justify-between mb-3 ${isMobile ? 'px-4' : ''}`}>
            <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
              {itensCalc.length} produto(s) no pedido
              {qtdComDiferenca > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded text-[10px] font-semibold">
                  {qtdComDiferenca} com alteração
                </span>
              )}
            </p>
            {qtdComDiferenca > 0 && (
              <Button variant="ghost" size="sm" onClick={handleSelecionarTodos} className="text-xs h-7 shadow-sm">
                Selecionar Alterados
              </Button>
            )}
          </div>

          {isMobile ? (
            <div className="space-y-3 px-4 pb-4">
              {itensCalc.map(item => (
                <div key={item.produto_id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-4 space-y-4">
                  <div className={`rounded-lg border px-3 py-2 ${unidadeVisualizacao === 'comercial' && item.fatorExibicao > 1 ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/50' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'}`}>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Referência dos valores</div>
                    {unidadeVisualizacao === 'comercial' && item.fatorExibicao > 1 && item.unidadeComercialLegenda ? (
                      <div className="mt-1">
                        <span className="text-sm font-bold text-amber-900 dark:text-amber-100">{item.unidadeComercialLegenda}</span>
                        <span className="text-xs text-amber-800/90 dark:text-amber-200/80 ml-1.5">
                          {formatUnitConversion({ unidade: item.unidadeComercialLegenda, fator_conversao: item.fatorExibicao }, item.unidadeBase)}
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">
                        {item.unidadeBase}
                        <span className="text-xs font-normal text-gray-500 ml-1">(unidade base do cadastro)</span>
                      </div>
                    )}
                  </div>
                  {/* Header do produto */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-medium">Produto</div>
                      <div className="font-semibold text-gray-900 dark:text-white text-sm leading-snug mt-0.5">{item.produto_nome}</div>
                      {item.temDiferenca && (
                        <div className="flex items-center gap-1 text-xs mt-1">
                          {item.diferencaCusto > 0 ? (
                            <><TrendingUp className="w-3.5 h-3.5 text-red-500" /><span className="text-red-500 font-semibold">+R$ {fmt(item.diferencaCusto * item.multDisplay)} no custo</span></>
                          ) : (
                            <><TrendingDown className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-500 font-semibold">-R$ {fmt(Math.abs(item.diferencaCusto * item.multDisplay))} no custo</span></>
                          )}
                        </div>
                      )}
                    </div>
                    {item.temDiferenca && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Atualizar</span>
                        <Checkbox checked={selecionados[item.produto_id] || false} onCheckedChange={() => handleToggle(item.produto_id)} />
                      </div>
                    )}
                  </div>

                  {/* Grid de custos */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Preço Compra */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Preço Compra
                        {unidadeVisualizacao === 'comercial' && item.fatorExibicao > 1 ? ` (${item.unidadeComercialLegenda})` : ''}
                        {unidadeVisualizacao === 'base' ? ` (${item.unidadeBase})` : ''}
                      </Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={inp(item.produto_id, 'valor_compra')}
                        onChange={(e) => setInp(item.produto_id, 'valor_compra', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onBlur={() => handleCostBlur(item.produto_id, 'valor_compra')}
                        className="h-11 text-base font-medium border-0 bg-gray-100 dark:bg-gray-800 shadow-none rounded-xl"
                      />
                    </div>
                    {/* Desconto/Acréscimo % com toggle */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className={`text-[11px] font-medium uppercase tracking-wide ${
                          (costs[item.produto_id]?.desconto_pct || 0) < 0
                            ? 'text-red-500 dark:text-red-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>{(costs[item.produto_id]?.desconto_pct || 0) < 0 ? 'Acréscimo %' : 'Desconto %'}</Label>
                        <button
                          type="button"
                          onClick={() => {
                            const rawInput = inputs[`${item.produto_id}_desconto_pct`];
                            const currentTyped = Math.round((parseFloat(String(rawInput).replace(',', '.')) || 0) * 100) / 100;
                            const currentState = costs[item.produto_id]?.desconto_pct || 0;
                            const baseValue = currentTyped || currentState;
                            const flipped = baseValue === 0
                              ? (currentState < 0 ? 1 : -1)
                              : -baseValue;
                            setInputs(p => ({ ...p, [`${item.produto_id}_desconto_pct`]: String(Math.round(flipped * 100) / 100) }));
                            handleDescontoPctBlurDirect(item.produto_id, flipped);
                          }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                            (costs[item.produto_id]?.desconto_pct || 0) < 0
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                              : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {(costs[item.produto_id]?.desconto_pct || 0) < 0
                            ? <><TrendingUp className="w-3 h-3" /> ACR</>
                            : <><TrendingDown className="w-3 h-3" /> DESC</>}
                        </button>
                      </div>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={inp(item.produto_id, 'desconto_pct')}
                        onChange={(e) => setInp(item.produto_id, 'desconto_pct', sanitizeTwoDecimalInput(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        onBlur={() => handleDescontoPctBlur(item.produto_id)}
                        className={`h-11 text-base font-medium border-0 shadow-none rounded-xl ${
                          (costs[item.produto_id]?.desconto_pct || 0) < 0
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                            : (costs[item.produto_id]?.desconto_pct || 0) > 0
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      />
                    </div>
                    {/* Frete, Imp1, Imp2, Outros */}
                    {[
                      { label: 'Frete', field: 'custo_frete_padrao' },
                      { label: 'Imp 1', field: 'custo_imposto1_padrao' },
                      { label: 'Imp 2', field: 'custo_imposto2_padrao' },
                      { label: 'Outros', field: 'custo_outros_padrao' },
                    ].map(({ label, field }) => (
                      <div key={field} className="space-y-1">
                        <Label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {label}
                          {unidadeVisualizacao === 'comercial' && item.fatorExibicao > 1 ? ` (${item.unidadeComercialLegenda})` : ''}
                          {unidadeVisualizacao === 'base' ? ` (${item.unidadeBase})` : ''}
                        </Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={inp(item.produto_id, field)}
                          onChange={(e) => setInp(item.produto_id, field, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handleCostBlur(item.produto_id, field)}
                          className="h-11 text-base font-medium border-0 bg-gray-100 dark:bg-gray-800 shadow-none rounded-xl"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Custo total + markup + preço venda */}
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Custo Total
                        {unidadeVisualizacao === 'comercial' && item.fatorExibicao > 1 ? ` (${item.unidadeComercialLegenda})` : ''}
                        {unidadeVisualizacao === 'base' ? ` (${item.unidadeBase})` : ''}
                      </span>
                      <span className="text-base font-bold text-gray-900 dark:text-white">R$ {fmt(item.novoCusto * item.multDisplay)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Markup %</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={inp(item.produto_id, 'markup')}
                          onChange={(e) => setInp(item.produto_id, 'markup', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handleMarkupBlur(item.produto_id)}
                          className="h-11 text-base font-medium border-0 bg-gray-100 dark:bg-gray-700 shadow-none rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Preço Venda
                          {unidadeVisualizacao === 'comercial' && item.fatorExibicao > 1 ? ` (${item.unidadeComercialLegenda})` : ''}
                          {unidadeVisualizacao === 'base' ? ` (${item.unidadeBase})` : ''}
                        </Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={inp(item.produto_id, 'preco')}
                          onChange={(e) => setInp(item.produto_id, 'preco', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handlePrecoBlur(item.produto_id)}
                          className="h-11 text-base font-bold border-0 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 shadow-none rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200">
                  <tr>
                    <th className="w-8 p-2"></th>
                    <th className="text-left p-2 w-[96px] min-w-[88px]">Unidade</th>
                    <th className="text-left p-2 min-w-[200px]">Produto</th>
                    <th className="text-center p-2 w-[100px]">
                      <span className="block">Preço compra</span>
                      <span className="block text-[10px] font-normal text-gray-500 dark:text-gray-400">
                        {unidadeVisualizacao === 'comercial' ? 'por embalagem' : 'unidade base'}
                      </span>
                    </th>
                    <th className="text-center p-2 w-[90px]">Desc/Acrésc %</th>
                    <th className="text-center p-2 w-[90px]">
                      <span className="block">Frete</span>
                      <span className="block text-[10px] font-normal text-gray-500 dark:text-gray-400">
                        {unidadeVisualizacao === 'comercial' ? 'por embalagem' : 'base'}
                      </span>
                    </th>
                    <th className="text-center p-2 w-[90px]">
                      <span className="block">Imp 1</span>
                      <span className="block text-[10px] font-normal text-gray-500 dark:text-gray-400">
                        {unidadeVisualizacao === 'comercial' ? 'por embalagem' : 'base'}
                      </span>
                    </th>
                    <th className="text-center p-2 w-[90px]">
                      <span className="block">Imp 2</span>
                      <span className="block text-[10px] font-normal text-gray-500 dark:text-gray-400">
                        {unidadeVisualizacao === 'comercial' ? 'por embalagem' : 'base'}
                      </span>
                    </th>
                    <th className="text-center p-2 w-[90px]">
                      <span className="block">Outros</span>
                      <span className="block text-[10px] font-normal text-gray-500 dark:text-gray-400">
                        {unidadeVisualizacao === 'comercial' ? 'por embalagem' : 'base'}
                      </span>
                    </th>
                    <th className="text-center p-2 w-[110px] bg-gray-100 dark:bg-gray-700 font-bold">
                      <span className="block">Custo total</span>
                      <span className="block text-[10px] font-normal opacity-90">
                        {unidadeVisualizacao === 'comercial' ? 'por embalagem' : 'unidade base'}
                      </span>
                    </th>
                    <th className="text-center p-2 w-[80px]">Markup %</th>
                    <th className="text-center p-2 w-[110px] bg-gray-100 dark:bg-gray-700 font-bold">
                      <span className="block">Preço venda</span>
                      <span className="block text-[10px] font-normal opacity-90">
                        {unidadeVisualizacao === 'comercial' ? 'por embalagem' : 'unidade base'}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itensCalc.map(item => (
                    <tr key={item.produto_id} className="border-b border-gray-100 dark:border-gray-800/70 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-2 text-center">
                        {item.temDiferenca && (
                          <Checkbox checked={selecionados[item.produto_id] || false} onCheckedChange={() => handleToggle(item.produto_id)} />
                        )}
                      </td>
                      <td className="p-2 align-top bg-amber-50/50 dark:bg-amber-950/20 border-r border-amber-100 dark:border-amber-900/40">
                        {item.fatorExibicao > 1 && item.unidadeComercialLegenda ? (
                          <div>
                            <div className="text-xs font-bold text-amber-900 dark:text-amber-100">{item.unidadeComercialLegenda}</div>
                            <div className="text-[10px] text-amber-900/70 dark:text-amber-200/90 leading-snug mt-1">
                              {formatUnitConversion({ unidade: item.unidadeComercialLegenda, fator_conversao: item.fatorExibicao }, item.unidadeBase)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.unidadeBase}</div>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{item.produto_nome}</div>
                        {item.temDiferenca && (
                          <div className="flex items-center gap-1 text-xs mt-0.5">
                            {item.diferencaCusto > 0 ? (
                              <><TrendingUp className="w-3 h-3 text-red-500" /><span className="text-red-600 dark:text-red-400 font-medium">+R$ {fmt(item.diferencaCusto * item.multDisplay)}</span></>
                            ) : (
                              <><TrendingDown className="w-3 h-3 text-green-500" /><span className="text-green-600 dark:text-green-400 font-medium">-R$ {fmt(Math.abs(item.diferencaCusto * item.multDisplay))}</span></>
                            )}
                          </div>
                        )}
                      </td>
                      {/* Preço Compra */}
                      <td className="p-2">
                        <Input
                          type="text"
                          value={inp(item.produto_id, 'valor_compra')}
                          onChange={(e) => setInp(item.produto_id, 'valor_compra', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handleCostBlur(item.produto_id, 'valor_compra')}
                          className="h-8 text-center text-sm text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 border-0 shadow-sm"
                        />
                      </td>
                      {/* Desconto/Acréscimo % com toggle */}
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const rawInput = inputs[`${item.produto_id}_desconto_pct`];
                              const currentTyped = Math.round((parse(String(rawInput)) || 0) * 100) / 100;
                              const currentState = costs[item.produto_id]?.desconto_pct || 0;
                              const baseValue = currentTyped || currentState;
                              const flipped = baseValue === 0
                                ? (currentState < 0 ? 1 : -1)
                                : -baseValue;
                              setInputs(p => ({ ...p, [`${item.produto_id}_desconto_pct`]: String(Math.round(flipped * 100) / 100) }));
                              handleDescontoPctBlurDirect(item.produto_id, flipped);
                            }}
                            className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                              (costs[item.produto_id]?.desconto_pct || 0) < 0
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            }`}
                            title={(costs[item.produto_id]?.desconto_pct || 0) < 0 ? 'Acréscimo → Desconto' : 'Desconto → Acréscimo'}
                          >
                            {(costs[item.produto_id]?.desconto_pct || 0) < 0
                              ? <TrendingUp className="w-3.5 h-3.5" />
                              : <TrendingDown className="w-3.5 h-3.5" />}
                          </button>
                          <Input
                            type="text"
                            value={inp(item.produto_id, 'desconto_pct')}
                            onChange={(e) => setInp(item.produto_id, 'desconto_pct', sanitizeTwoDecimalInput(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => handleDescontoPctBlur(item.produto_id)}
                            className={`h-8 text-center text-sm font-medium border-0 shadow-sm flex-1 min-w-0 ${
                              (costs[item.produto_id]?.desconto_pct || 0) < 0
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                : (costs[item.produto_id]?.desconto_pct || 0) > 0
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                            }`}
                          />
                        </div>
                      </td>
                      {/* Frete, Imp1, Imp2, Outros */}
                      {['custo_frete_padrao', 'custo_imposto1_padrao', 'custo_imposto2_padrao', 'custo_outros_padrao'].map(field => (
                        <td key={field} className="p-2">
                          <Input
                            type="text"
                            value={inp(item.produto_id, field)}
                            onChange={(e) => setInp(item.produto_id, field, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => handleCostBlur(item.produto_id, field)}
                            className="h-8 text-center text-sm text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 border-0 shadow-sm"
                          />
                        </td>
                      ))}
                      <td className="p-2 bg-gray-50 dark:bg-gray-800">
                        <div className="text-center font-bold text-gray-900 dark:text-gray-100">R$ {fmt(item.novoCusto * item.multDisplay)}</div>
                      </td>
                      <td className="p-2">
                        <Input
                          type="text"
                          value={inp(item.produto_id, 'markup')}
                          onChange={(e) => setInp(item.produto_id, 'markup', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handleMarkupBlur(item.produto_id)}
                          className="h-8 text-center text-sm bg-gray-50 dark:bg-gray-800 border-0 shadow-sm"
                        />
                      </td>
                      <td className="p-2 bg-gray-50 dark:bg-gray-800">
                        <Input
                          type="text"
                          value={inp(item.produto_id, 'preco')}
                          onChange={(e) => setInp(item.produto_id, 'preco', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handlePrecoBlur(item.produto_id)}
                          className="h-8 text-center text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 border-0 shadow-none font-bold"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={`flex items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 ${isMobile ? 'px-4 pb-4' : ''}`}>
          <Button variant="outline" onClick={() => onClose(false)} disabled={processando} className="border-0 shadow-sm">
            {qtdComDiferenca > 0 ? 'Ignorar' : 'Fechar'}
          </Button>
          {qtdComDiferenca > 0 && (
            <Button onClick={handleInitiateUpdate} disabled={processando || numSel === 0} className="shadow-sm">
              {processando ? 'Aplicando...' : `Autenticar e Aplicar ${numSel} Selecionado(s)`}
            </Button>
          )}
        </div>

        <OperacaoAuthenticator
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={handleAuthSuccess}
          operationName="Atualizar Custos e Preços de Venda"
        />
      </DialogContent>
    </Dialog>
  );
}