import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TrendingUp, TrendingDown, DollarSign, ArrowUpDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import OperacaoAuthenticator from '@/components/auth/OperacaoAuthenticator';

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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Inicializa estado ao abrir
  useEffect(() => {
    if (!isOpen || !itens.length) return;
    const initialCosts = {};
    const initialInputs = {};
    itens.forEach(item => {
      const p = produtos.find(x => x.id === item.produto_id);
      if (!p) return;

      // Resolve desconto percentual: prioriza o % do item (vindo do buscador), senão calcula do valor absoluto
      const custoBase = item.custo_unitario || p.valor_compra || 0;
      let descontoPct = item.desconto_pct_item || 0;
      if (!descontoPct && item.valor_desconto_item && custoBase > 0) {
        descontoPct = (Math.abs(item.valor_desconto_item) / custoBase) * 100;
      }
      // Se valor_desconto_item negativo = acréscimo, pct fica negativo
      if (item.valor_desconto_item < 0) descontoPct = -Math.abs(descontoPct);

      const descontoValorCalc = custoBase * Math.abs(descontoPct) / 100;
      const descontoComSinal = descontoPct < 0 ? -descontoValorCalc : descontoValorCalc;

      const c = {
        valor_compra: custoBase,
        custo_frete_padrao: p.custo_frete_padrao || 0,
        custo_imposto1_padrao: p.custo_imposto1_padrao || 0,
        custo_imposto2_padrao: p.custo_imposto2_padrao || 0,
        custo_outros_padrao: p.custo_outros_padrao || 0,
        desconto_compra_padrao: descontoComSinal,
        desconto_pct: descontoPct,
        preco_venda_percentual: p.preco_venda_percentual || 40,
        preco_venda_padrao: p.preco_venda_padrao || 0,
      };
      // Se não tem preço de venda, calcula pelo markup
      if (!c.preco_venda_padrao) {
        c.preco_venda_padrao = calcPreco(calcCusto(c), c.preco_venda_percentual);
      }
      initialCosts[item.produto_id] = c;
      // Inputs locais para todos os campos
      COST_FIELDS.forEach(f => {
        initialInputs[`${item.produto_id}_${f}`] = fmt(c[f]);
      });
      initialInputs[`${item.produto_id}_desconto_pct`] = String(Math.round((descontoPct) * 100) / 100);
      initialInputs[`${item.produto_id}_markup`] = String(Math.round((c.preco_venda_percentual || 40) * 100) / 100);
      initialInputs[`${item.produto_id}_preco`] = fmt(c.preco_venda_padrao);
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

  // Ao sair de um campo de custo: commita valor e recalcula preço venda mantendo markup
  const handleCostBlur = (produtoId, field) => {
    const raw = inputs[`${produtoId}_${field}`];
    const val = parse(raw);
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
      // Atualiza input do preço venda
      setInputs(p2 => ({
        ...p2,
        [`${produtoId}_${field}`]: fmt(val),
        [`${produtoId}_preco`]: fmt(novoPreco),
      }));
      return { ...prev, [produtoId]: next };
    });
  };

  // Ao sair do campo desconto %
  const handleDescontoPctBlur = (produtoId) => {
    const raw = inputs[`${produtoId}_desconto_pct`];
    const pct = parseFloat(raw) || 0;
    handleDescontoPctBlurDirect(produtoId, pct);
  };

  // Versão direta (usada pelo toggle)
  const handleDescontoPctBlurDirect = (produtoId, pct) => {
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
        [`${produtoId}_preco`]: fmt(novoPreco),
      }));
      return { ...prev, [produtoId]: next };
    });
  };

  // Ao sair do markup: recalcula preço venda
  const handleMarkupBlur = (produtoId) => {
    const raw = inputs[`${produtoId}_markup`];
    const markup = parseFloat(raw) || 0;
    setCosts(prev => {
      const c = { ...prev[produtoId], preco_venda_percentual: markup };
      const custo = calcCusto(c);
      const novoPreco = calcPreco(custo, markup);
      const next = { ...c, preco_venda_padrao: novoPreco };
      setInputs(p2 => ({
        ...p2,
        [`${produtoId}_markup`]: String(Math.round(markup * 100) / 100),
        [`${produtoId}_preco`]: fmt(novoPreco),
      }));
      return { ...prev, [produtoId]: next };
    });
  };

  // Ao sair do preço venda: recalcula markup
  const handlePrecoBlur = (produtoId) => {
    const raw = inputs[`${produtoId}_preco`];
    const preco = parse(raw);
    setCosts(prev => {
      const c = prev[produtoId];
      const custo = calcCusto(c);
      const novoMarkup = Math.max(0, calcMarkup(custo, preco));
      const next = { ...c, preco_venda_padrao: preco, preco_venda_percentual: novoMarkup };
      setInputs(p2 => ({
        ...p2,
        [`${produtoId}_preco`]: fmt(preco),
        [`${produtoId}_markup`]: String(Math.round(novoMarkup * 100) / 100),
      }));
      return { ...prev, [produtoId]: next };
    });
  };

  // Dados calculados por item para exibição
  const itensCalc = itens.map(item => {
    const p = produtos.find(x => x.id === item.produto_id);
    if (!p) return null;
    const c = costs[item.produto_id] || {};
    const novoCusto = calcCusto(c);
    const custoAtual = p.preco_custo_calculado || p.valor_compra || 0;
    const diferencaCusto = novoCusto - custoAtual;
    const temDiferenca = Math.abs(diferencaCusto) > 0.01;
    return { ...item, produto: p, novoCusto, custoAtual, diferencaCusto, temDiferenca, c };
  }).filter(Boolean);

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
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            Revisar Preços de Venda
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {qtdComDiferenca > 0
              ? `${qtdComDiferenca} produto(s) com alteração de custo detectada. Revise e selecione quais preços deseja atualizar.`
              : 'Nenhuma alteração de custo detectada. Você pode revisar os preços atuais dos produtos.'}
          </p>
        </DialogHeader>

        <div className={isMobile ? 'mt-2' : 'mt-4'}>
          <div className={`flex items-center justify-between mb-3 ${isMobile ? 'px-4' : ''}`}>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {itensCalc.length} produto(s) no pedido
              {qtdComDiferenca > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded text-[10px] font-medium">
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
                  {/* Header do produto */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">{item.produto_nome}</div>
                      {item.temDiferenca && (
                        <div className="flex items-center gap-1 text-xs mt-1">
                          {item.diferencaCusto > 0 ? (
                            <><TrendingUp className="w-3.5 h-3.5 text-red-500" /><span className="text-red-500 font-semibold">+R$ {fmt(item.diferencaCusto)} no custo</span></>
                          ) : (
                            <><TrendingDown className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-500 font-semibold">-R$ {fmt(Math.abs(item.diferencaCusto))} no custo</span></>
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
                      <Label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Preço Compra</Label>
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
                            const pct = costs[item.produto_id]?.desconto_pct || 0;
                            const flipped = -pct;
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
                        onChange={(e) => setInp(item.produto_id, 'desconto_pct', e.target.value)}
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
                        <Label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</Label>
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
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Custo Total</span>
                      <span className="text-base font-bold text-gray-900 dark:text-white">R$ {fmt(item.novoCusto)}</span>
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
                        <Label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Preço Venda</Label>
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
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="w-8 p-2"></th>
                    <th className="text-left p-2 min-w-[200px]">Produto</th>
                    <th className="text-center p-2 w-[100px]">Preço Compra</th>
                    <th className="text-center p-2 w-[90px]">Desc/Acrésc %</th>
                    <th className="text-center p-2 w-[90px]">Frete</th>
                    <th className="text-center p-2 w-[90px]">Imp 1</th>
                    <th className="text-center p-2 w-[90px]">Imp 2</th>
                    <th className="text-center p-2 w-[90px]">Outros</th>
                    <th className="text-center p-2 w-[110px] bg-gray-100 dark:bg-gray-700 font-bold">Custo Total</th>
                    <th className="text-center p-2 w-[80px]">Markup %</th>
                    <th className="text-center p-2 w-[110px] bg-gray-100 dark:bg-gray-700 font-bold">Preço Venda</th>
                  </tr>
                </thead>
                <tbody>
                  {itensCalc.map(item => (
                    <tr key={item.produto_id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-2 text-center">
                        {item.temDiferenca && (
                          <Checkbox checked={selecionados[item.produto_id] || false} onCheckedChange={() => handleToggle(item.produto_id)} />
                        )}
                      </td>
                      <td className="p-2">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{item.produto_nome}</div>
                        {item.temDiferenca && (
                          <div className="flex items-center gap-1 text-xs mt-0.5">
                            {item.diferencaCusto > 0 ? (
                              <><TrendingUp className="w-3 h-3 text-red-500" /><span className="text-red-600 dark:text-red-400 font-medium">+R$ {fmt(item.diferencaCusto)}</span></>
                            ) : (
                              <><TrendingDown className="w-3 h-3 text-green-500" /><span className="text-green-600 dark:text-green-400 font-medium">-R$ {fmt(Math.abs(item.diferencaCusto))}</span></>
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
                          className="h-8 text-center text-sm bg-gray-50 dark:bg-gray-800 border-0 shadow-sm"
                        />
                      </td>
                      {/* Desconto/Acréscimo % com toggle */}
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const pct = costs[item.produto_id]?.desconto_pct || 0;
                              const flipped = -pct;
                              setInputs(p => ({ ...p, [`${item.produto_id}_desconto_pct`]: String(Math.round(flipped * 100) / 100) }));
                              handleDescontoPctBlurDirect(item.produto_id, flipped);
                            }}
                            className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                              (costs[item.producto_id]?.desconto_pct || costs[item.produto_id]?.desconto_pct || 0) < 0
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
                            onChange={(e) => setInp(item.produto_id, 'desconto_pct', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => handleDescontoPctBlur(item.produto_id)}
                            className={`h-8 text-center text-sm border-0 shadow-sm flex-1 min-w-0 ${
                              (costs[item.produto_id]?.desconto_pct || 0) < 0
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                : (costs[item.produto_id]?.desconto_pct || 0) > 0
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                : 'bg-gray-50 dark:bg-gray-800'
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
                            className="h-8 text-center text-sm bg-gray-50 dark:bg-gray-800 border-0 shadow-sm"
                          />
                        </td>
                      ))}
                      <td className="p-2 bg-gray-50 dark:bg-gray-800">
                        <div className="text-center font-bold text-gray-900 dark:text-gray-100">R$ {fmt(item.novoCusto)}</div>
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
                          className="h-8 text-center text-sm bg-gray-50 dark:bg-gray-800 border-0 shadow-none font-bold"
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