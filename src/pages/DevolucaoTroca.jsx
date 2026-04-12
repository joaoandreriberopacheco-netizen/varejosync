import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Printer, CheckCircle2, Minus, Plus, Camera, X, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { createPageUrl } from '@/components/utils';
import { openPrintWindowOrShareHtml } from '@/lib/mobilePrintAndShare';

// Step 1: Buscar pedido
function BuscarPedidoStep({ onFound }) {
  const [numeroPedido, setNumeroPedido] = useState('');
  const [buscando, setBuscando] = useState(false);
  const { toast } = useToast();

  const buscar = async () => {
    const termo = numeroPedido.trim().toUpperCase();
    if (!termo) return;
    setBuscando(true);
    const todos = await base44.entities.PedidoVenda.list();
    const encontrado = todos.find(p =>
      p.numero?.toUpperCase() === termo ||
      p.numero?.toUpperCase().includes(termo)
    );
    setBuscando(false);
    if (!encontrado) {
      toast({ title: 'Pedido não encontrado', variant: 'destructive' });
      return;
    }
    const statusOk = ['Financeiro OK', 'Em Separação', 'Em Rota de Entrega', 'Pedido Concluído'];
    if (!statusOk.includes(encontrado.status)) {
      toast({ title: 'Este pedido não pode ser devolvido', description: `Status: ${encontrado.status}`, variant: 'destructive' });
      return;
    }
    onFound(encontrado);
  };

  return (
    <div className="flex flex-col gap-5 p-5 max-w-lg mx-auto w-full">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Informe o número do pedido de venda</p>
        <div className="flex gap-3">
          <Input
            autoFocus
            placeholder="Ex: PV-00042"
            value={numeroPedido}
            onChange={e => setNumeroPedido(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar()}
            className="text-lg font-mono uppercase border-0 border-b border-gray-200 dark:border-gray-700 rounded-none bg-transparent focus-visible:ring-0 flex-1 h-12"
          />
          <Button onClick={buscar} disabled={buscando} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl px-6 h-12">
            {buscando ? '...' : <Search className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Step 2: Selecionar itens, forma de reembolso, fotos
function SelecionarItensStep({ pedido, onConfirm }) {
  const [qtds, setQtds] = useState(
    Object.fromEntries((pedido.itens || []).map(i => [i.produto_id + '_' + i.produto_nome, 0]))
  );
  const [focusedKey, setFocusedKey] = useState(null);
  const [formaReembolso, setFormaReembolso] = useState('Vale Troca');
  const [motivo, setMotivo] = useState('');
  const [fotos, setFotos] = useState([]); // { file, previewUrl, uploading, url }
  const [uploadingFotos, setUploadingFotos] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const totalDevolvido = (pedido.itens || []).reduce((sum, i) => {
    const key = i.produto_id + '_' + i.produto_nome;
    return sum + (qtds[key] || 0) * (i.preco_unitario_praticado || 0);
  }, 0);

  const itensSelecionados = (pedido.itens || []).filter(i => {
    const key = i.produto_id + '_' + i.produto_nome;
    return (qtds[key] || 0) > 0;
  });

  const formatValor = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const handleAdicionarFotos = async (files) => {
    const novasFotos = Array.from(files).slice(0, 5 - fotos.length);
    if (novasFotos.length === 0) return;

    const previews = novasFotos.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: true,
      url: null
    }));
    setFotos(prev => [...prev, ...previews]);
    setUploadingFotos(true);

    const uploadadas = await Promise.all(
      novasFotos.map(async (file, idx) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return { ...previews[idx], uploading: false, url: file_url };
      })
    );

    setFotos(prev => {
      const base = prev.slice(0, prev.length - novasFotos.length);
      return [...base, ...uploadadas];
    });
    setUploadingFotos(false);
  };

  const removerFoto = (idx) => {
    setFotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmarClick = () => {
    if (uploadingFotos) {
      toast({ title: 'Aguarde o upload das fotos', variant: 'destructive' });
      return;
    }
    const fotosUrls = fotos.filter(f => f.url).map(f => f.url);
    onConfirm({ itensSelecionados, qtds, formaReembolso, motivo, totalDevolvido, fotosUrls });
  };

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto w-full pb-36">
      {/* Cabeçalho do pedido */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-base font-semibold text-gray-900 dark:text-white">{pedido.numero}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{pedido.cliente_nome}</div>
          </div>
          <div className="text-base font-bold text-gray-700 dark:text-gray-300">{formatValor(pedido.valor_total)}</div>
        </div>
      </div>

      {/* Itens */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Selecione os itens a devolver</p>
        </div>
        {(pedido.itens || []).map(item => {
          const key = item.produto_id + '_' + item.produto_nome;
          const qtd = qtds[key] || 0;
          return (
            <div key={key} className="px-4 py-4 flex items-center gap-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{item.produto_nome}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {item.quantidade}x · {formatValor(item.preco_unitario_praticado)}/un
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQtds(prev => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) - 1) }))}
                  className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Minus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={0}
                  max={item.quantidade}
                  value={focusedKey === key ? (qtd === 0 ? '' : qtd) : qtd}
                  onFocus={(e) => { setFocusedKey(key); e.target.select(); }}
                  onBlur={() => setFocusedKey(null)}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 0;
                    setQtds(prev => ({ ...prev, [key]: Math.min(item.quantidade, Math.max(0, v)) }));
                  }}
                  className={`w-14 text-center text-base font-bold tabular-nums rounded-lg border-0 bg-transparent focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 transition-all ${qtd > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}
                  style={{ minHeight: '36px' }}
                />
                <button
                  onClick={() => setQtds(prev => ({ ...prev, [key]: Math.min(item.quantidade, (prev[key] || 0) + 1) }))}
                  className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Forma de reembolso + Motivo */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-5 shadow-sm space-y-4">
        <div>
          <label className="text-sm text-gray-500 dark:text-gray-400 block mb-2">Forma de reembolso</label>
          <Select value={formaReembolso} onValueChange={setFormaReembolso}>
            <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-0 rounded-xl h-12 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800">
              <SelectItem value="Vale Troca">Vale Troca (crédito na loja)</SelectItem>
              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
              <SelectItem value="PIX">PIX</SelectItem>
              <SelectItem value="Estorno Cartão">Estorno no Cartão</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-gray-500 dark:text-gray-400 block mb-2">Motivo</label>
          <Input
            placeholder="Ex: Produto com defeito, cliente desistiu..."
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            className="bg-gray-50 dark:bg-gray-700 border-0 rounded-xl h-12 text-sm"
          />
        </div>
      </div>

      {/* Fotos da mercadoria */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-5 shadow-sm">
        <label className="text-sm text-gray-500 dark:text-gray-400 block mb-3">Fotos da mercadoria (opcional)</label>
        <div className="flex flex-wrap gap-3">
          {fotos.map((foto, idx) => (
            <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
              <img src={foto.previewUrl} alt="" className="w-full h-full object-cover" />
              {foto.uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!foto.uploading && (
                <button
                  onClick={() => removerFoto(idx)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              )}
            </div>
          ))}
          {fotos.length < 5 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-500 transition-colors flex-shrink-0"
            >
              <Camera className="w-5 h-5" />
              <span className="text-xs">Foto</span>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={e => handleAdicionarFotos(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Total + Botão fixo no rodapé */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 space-y-3 z-10">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <span className="text-sm text-gray-500 dark:text-gray-400">Total a reembolsar</span>
          <span className="text-2xl font-bold text-red-600 dark:text-red-400 font-glacial">{formatValor(totalDevolvido)}</span>
        </div>
        <Button
          disabled={itensSelecionados.length === 0 || totalDevolvido === 0}
          onClick={handleConfirmarClick}
          className="w-full max-w-lg mx-auto block h-14 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-semibold text-base"
        >
          Confirmar Devolução
        </Button>
      </div>
    </div>
  );
}

// Step 3: Comprovante
function ComprovanteStep({ resultado, onClose }) {
  const formatValor = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const imprimir = async () => {
    const html = `<html><head><title>Comprovante de Devolução</title>
      <style>body{font-family:monospace;font-size:13px;padding:20px;max-width:320px;margin:0 auto}
      .center{text-align:center}.dashed{border-top:2px dashed #aaa;margin:12px 0}.big{font-size:20px;font-weight:bold}.row{display:flex;justify-content:space-between;margin:6px 0}
      .alert{background:#f0fdf4;border:1px solid #86efac;padding:10px;border-radius:6px;margin:8px 0;text-align:center}
      </style></head><body>
      <div class="center"><b>VAREJOSYNC</b><br/><small>Comprovante de Devolução</small></div>
      <div class="dashed"></div>
      <div class="row"><span>Nº:</span><b>${resultado.numero}</b></div>
      <div class="row"><span>Pedido Origem:</span><b>${resultado.pedidoNumero}</b></div>
      <div class="row"><span>Cliente:</span><span>${resultado.clienteNome}</span></div>
      <div class="row"><span>Data/Hora:</span><span>${format(new Date(), 'dd/MM/yyyy HH:mm')}</span></div>
      <div class="dashed"></div>
      <div class="row big"><span>VALOR:</span><span>-R$ ${(resultado.valorTotal || 0).toFixed(2).replace('.', ',')}</span></div>
      <div class="row"><span>Reembolso:</span><b>${resultado.formaReembolso}</b></div>
      ${resultado.valeCode ? `
        <div class="dashed"></div>
        <div class="alert">
          <b>VALE TROCA: ${resultado.valeCode}</b><br/>
          <small>Saldo: R$ ${(resultado.valorTotal || 0).toFixed(2).replace('.', ',')}</small><br/>
          <small>Apresente este código na próxima compra</small><br/>
          <small>O código permanece válido enquanto houver saldo</small>
        </div>` : ''}
      <div class="dashed"></div>
      ${resultado.motivo ? `<p><small>Motivo: ${resultado.motivo}</small></p>` : ''}
      <div class="center"><small>Não é documento fiscal</small></div>
      </body></html>`;
    try {
      await openPrintWindowOrShareHtml(html, `comprovante-devolucao-${resultado.numero}.html`, 'Comprovante de devolução', {
        windowFeatures: 'width=400,height=650',
      });
    } catch {
      /* popup bloqueado */
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 p-5 max-w-lg mx-auto w-full">
      <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>

      <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden" style={{ fontFamily: 'Courier New, monospace' }}>
        <div className="px-5 py-4 text-center border-b-2 border-dashed border-gray-200 dark:border-gray-700">
          <div className="text-sm font-bold text-gray-900 dark:text-white">VAREJOSYNC</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Comprovante de Devolução</div>
        </div>
        <div className="px-5 py-4 space-y-3">
          {[
            { l: 'Número', v: resultado.numero },
            { l: 'Pedido Origem', v: resultado.pedidoNumero },
            { l: 'Cliente', v: resultado.clienteNome },
            { l: 'Data/Hora', v: format(new Date(), 'dd/MM/yyyy HH:mm') },
          ].map(({ l, v }) => (
            <div key={l} className="flex justify-between text-sm">
              <span className="text-gray-400">{l}:</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{v}</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t-2 border-b-2 border-dashed border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Valor reembolsado:</span>
            <span className="text-xl font-bold text-red-600 dark:text-red-400 font-glacial">−{formatValor(resultado.valorTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Forma:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{resultado.formaReembolso}</span>
          </div>
        </div>

        {resultado.valeCode && (
          <div className="px-5 py-4 bg-emerald-50 dark:bg-emerald-900/20 space-y-2">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center font-medium">Vale Troca Gerado</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 font-mono text-center">{resultado.valeCode}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Saldo: {formatValor(resultado.valorTotal)}</p>
            <div className="bg-emerald-100/60 dark:bg-emerald-900/30 rounded-xl p-3 mt-1">
              <p className="text-xs text-emerald-700 dark:text-emerald-300 text-center leading-relaxed">
                📌 Se o cliente usar apenas parte do saldo, o mesmo código continuará válido com o saldo restante.
              </p>
            </div>
          </div>
        )}

        {resultado.motivo && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400">Motivo: {resultado.motivo}</p>
          </div>
        )}

        <div className="px-5 py-3 text-center">
          <p className="text-xs text-gray-400">Não é documento fiscal</p>
        </div>
      </div>

      <div className="w-full flex gap-3 pb-4">
        <button onClick={onClose} className="flex-1 h-14 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-medium text-base">
          Fechar
        </button>
        <button onClick={imprimir} className="flex-1 h-14 rounded-2xl font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 flex items-center justify-center gap-2 text-base">
          <Printer className="w-4 h-4" /> Imprimir
        </button>
      </div>
    </div>
  );
}

export default function DevolucaoTrocaPage() {
  const [step, setStep] = useState('buscar');
  const [pedido, setPedido] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [processando, setProcessando] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    window.location.href = createPageUrl('VendasGestao');
  };

  const handleConfirm = async ({ itensSelecionados, qtds, formaReembolso, motivo, totalDevolvido, fotosUrls }) => {
    setProcessando(true);
    const user = await base44.auth.me();
    const todos = await base44.entities.DevolucaoTroca.list();
    const nextNum = (todos.length > 0 ? Math.max(...todos.map(d => parseInt(d.numero?.split('-')[1] || 0) || 0)) : 0) + 1;
    const numeroDev = `DT-${String(nextNum).padStart(5, '0')}`;

    const itensDevolvidos = itensSelecionados.map(item => {
      const key = item.produto_id + '_' + item.produto_nome;
      const qtd = qtds[key] || 0;
      return {
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        quantidade_devolvida: qtd,
        preco_unitario: item.preco_unitario_praticado || 0,
        total: qtd * (item.preco_unitario_praticado || 0),
      };
    });

    let valeId = null;
    let valeCodigo = null;
    if (formaReembolso === 'Vale Troca') {
      const todosVales = await base44.entities.ValeCompra.list();
      const nextVale = (todosVales.length > 0 ? Math.max(...todosVales.map(v => parseInt(v.codigo?.split('-')[1] || 0) || 0)) : 0) + 1;
      valeCodigo = `VC-${String(nextVale).padStart(5, '0')}`;
      const vale = await base44.entities.ValeCompra.create({
        codigo: valeCodigo,
        valor_original: totalDevolvido,
        valor_disponivel: totalDevolvido,
        cliente_id: pedido.cliente_id,
        cliente_nome: pedido.cliente_nome,
        origem_tipo: 'Devolução',
        pedido_origem_id: pedido.id,
        pedido_origem_numero: pedido.numero,
        status: 'Ativo',
      });
      valeId = vale.id;
    }

    await base44.entities.DevolucaoTroca.create({
      numero: numeroDev,
      pedido_origem_id: pedido.id,
      pedido_origem_numero: pedido.numero,
      cliente_id: pedido.cliente_id,
      cliente_nome: pedido.cliente_nome,
      itens_devolvidos: itensDevolvidos,
      valor_total_devolvido: totalDevolvido,
      forma_reembolso: formaReembolso,
      vale_compra_id: valeId,
      vale_compra_codigo: valeCodigo,
      motivo,
      fotos_mercadoria: fotosUrls || [],
      operador_id: user?.id,
      operador_nome: user?.full_name,
      status: 'Processada',
    });

    for (const item of itensDevolvidos) {
      const produto = await base44.entities.Produto.get(item.produto_id);
      if (produto) {
        await base44.entities.Produto.update(item.produto_id, {
          estoque_atual: (produto.estoque_atual || 0) + item.quantidade_devolvida,
        });
        await base44.entities.MovimentacaoEstoque.create({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          tipo: 'Entrada',
          motivo: 'Devolução',
          quantidade: item.quantidade_devolvida,
          custo_unitario: item.preco_unitario,
          referencia_tipo: 'PedidoVenda',
          referencia_id: pedido.id,
          referencia_numero: pedido.numero,
          usuario_responsavel: user?.full_name,
        });
      }
    }

    if (formaReembolso === 'Dinheiro') {
      const todosEstornos = await base44.entities.AutorizacaoEstorno.list();
      const nextEstorno = (todosEstornos.length > 0 ? Math.max(...todosEstornos.map(a => parseInt(a.numero?.split('-')[1] || 0) || 0)) : 0) + 1;
      const numeroEstorno = `AE-${String(nextEstorno).padStart(5, '0')}`;
      const todossTurnos = await base44.entities.TurnoCaixa.list();
      const turnosAtivos = todossTurnos.filter(t => !t.data_fechamento);
      for (const turno of turnosAtivos) {
        await base44.entities.AutorizacaoEstorno.create({
          numero: numeroEstorno,
          devolucao_id: numeroDev,
          devolucao_numero: numeroDev,
          pedido_origem_numero: pedido.numero,
          cliente_nome: pedido.cliente_nome,
          valor_autorizado: totalDevolvido,
          forma_reembolso: 'Dinheiro',
          motivo: `Devolução${motivo ? ` - ${motivo}` : ''}`,
          turno_caixa_destino_id: turno.id,
          turno_caixa_destino_numero: turno.numero,
          gerente_aprovador_id: user?.id,
          gerente_aprovador_nome: user?.full_name,
          status: 'Pendente',
        });
      }
    } else if (formaReembolso === 'PIX') {
      const contas = await base44.entities.ContasFinanceiras.list();
      const caixaGeral = contas.find(c => c.is_caixa_geral) || contas[0];
      if (caixaGeral) {
        await base44.entities.LancamentoFinanceiro.create({
          tipo: 'Despesa',
          descricao: `Devolução - ${numeroDev} - ${pedido.numero}`,
          valor: totalDevolvido,
          conta_financeira_id: caixaGeral.id,
          conta_financeira_nome: caixaGeral.nome,
          data_vencimento: format(new Date(), 'yyyy-MM-dd'),
          data_pagamento: format(new Date(), 'yyyy-MM-dd'),
          status: 'Pago',
          categoria: 'Outros',
          referencia_tipo: 'PedidoVenda',
          referencia_id: pedido.id,
          referencia_numero: pedido.numero,
          observacoes: `Reembolso PIX por Devolução`,
        });
        await base44.entities.ContasFinanceiras.update(caixaGeral.id, {
          saldo_atual: (caixaGeral.saldo_atual || 0) - totalDevolvido,
        });
      }
    }

    setResultado({
      numero: numeroDev,
      pedidoNumero: pedido.numero,
      clienteNome: pedido.cliente_nome,
      valorTotal: totalDevolvido,
      formaReembolso,
      valeCode: valeCodigo,
      motivo,
    });
    setStep('comprovante');
    setProcessando(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center flex-shrink-0 sticky top-0 z-20">
        <button
          onClick={step === 'itens' ? () => setStep('buscar') : handleClose}
          className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
        <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">
          Devolução de Produto
        </h2>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto relative">
        {processando && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-white" />
          </div>
        )}
        {step === 'buscar' && <BuscarPedidoStep onFound={p => { setPedido(p); setStep('itens'); }} />}
        {step === 'itens' && pedido && <SelecionarItensStep pedido={pedido} onConfirm={handleConfirm} />}
        {step === 'comprovante' && resultado && <ComprovanteStep resultado={resultado} onClose={handleClose} />}
      </div>
    </div>
  );
}