import React from 'react';
import {
  ArrowLeft,
  ChevronRight,
  ShoppingCart,
  Wallet,
  Plus,
  Link2,
  FileUp,
  Anchor,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { brandSurface } from '@/lib/brandSurfaces';
import { formatarValorBRL } from '@/lib/extrairDadosComprovante';

function WidgetCard({ icon: Icon, titulo, descricao, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left shadow-sm transition-colors md:rounded-3xl md:p-5 ${
        brandSurface.card
      } ${disabled ? 'cursor-not-allowed opacity-45' : 'hover:bg-muted/40 dark:hover:bg-muted/30'}`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center md:h-12 md:w-12 ${brandSurface.iconCapsule}`}>
        <Icon className="h-5 w-5 text-foreground/90 dark:text-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{titulo}</p>
        <p className={`mt-0.5 text-xs ${brandSurface.textLabel}`}>{descricao}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function SubOpcao({ icon: Icon, titulo, descricao, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-2xl border border-border/50 px-4 py-3.5 text-left transition-colors dark:border-border/40 ${
        disabled ? 'cursor-not-allowed opacity-45' : 'hover:bg-muted/30'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{titulo}</p>
        <p className={`text-xs ${brandSurface.textLabel}`}>{descricao}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

export default function TorreWidgetDestinos({
  widgetMenu,
  onWidgetMenuChange,
  dadosComprovante,
  lendoComprovante,
  temArquivo,
  onPedidoNovo,
  onPedidoExistente,
  onFinanceiroNovo,
  onFinanceiroExistente,
  onMaisFrete,
  onMaisBoleto,
  onMaisAgefin,
}) {
  const valorLabel =
    dadosComprovante?.valor != null ? formatarValorBRL(dadosComprovante.valor) : null;

  return (
    <div className="flex flex-col gap-3 px-4 md:px-5">
      {(valorLabel || lendoComprovante || dadosComprovante?.descricao) && (
        <div className={`rounded-2xl px-4 py-3 ${brandSurface.card}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Leitura do comprovante
          </p>
          {lendoComprovante ? (
            <p className="mt-1 text-sm text-muted-foreground">A ler valor e descrição…</p>
          ) : (
            <>
              {valorLabel && (
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{valorLabel}</p>
              )}
              {dadosComprovante?.descricao && (
                <p className={`mt-0.5 truncate text-xs ${brandSurface.textLabel}`}>{dadosComprovante.descricao}</p>
              )}
              {!valorLabel && !dadosComprovante?.descricao && (
                <p className="mt-1 text-sm text-muted-foreground">Não foi possível detectar o valor automaticamente.</p>
              )}
            </>
          )}
        </div>
      )}

      {widgetMenu !== 'raiz' && (
        <button
          type="button"
          onClick={() => onWidgetMenuChange('raiz')}
          className="flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>
      )}

      {widgetMenu === 'raiz' && (
        <>
          <p className="px-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Para onde vai este arquivo?
          </p>
          <WidgetCard
            icon={ShoppingCart}
            titulo="Pedidos de compra"
            descricao="Novo pedido com PDF ou anexar a pedido existente"
            onClick={() => onWidgetMenuChange('pedidos')}
          />
          <WidgetCard
            icon={Wallet}
            titulo="Financeiro"
            descricao="Novo lançamento ou vincular a conta existente"
            onClick={() => onWidgetMenuChange('financeiro')}
          />
        </>
      )}

      {widgetMenu === 'pedidos' && (
        <div className="flex flex-col gap-2">
          <p className="px-0.5 text-sm font-semibold text-foreground">Pedidos de compra</p>
          <SubOpcao
            icon={FileUp}
            titulo="Novo pedido"
            descricao="Criar pedido e importar itens do PDF"
            disabled={!temArquivo}
            onClick={onPedidoNovo}
          />
          <SubOpcao
            icon={Link2}
            titulo="Pedido existente"
            descricao="Anexar comprovante a um pedido já criado"
            onClick={onPedidoExistente}
          />
        </div>
      )}

      {widgetMenu === 'financeiro' && (
        <div className="flex flex-col gap-2">
          <p className="px-0.5 text-sm font-semibold text-foreground">Financeiro</p>
          <SubOpcao
            icon={Plus}
            titulo="Novo lançamento"
            descricao={valorLabel ? `Abrir formulário com ${valorLabel}` : 'Registrar despesa e anexar comprovante'}
            onClick={onFinanceiroNovo}
          />
          <SubOpcao
            icon={Link2}
            titulo="Lançamento existente"
            descricao={valorLabel ? `Buscar conta com valor ${valorLabel}` : 'Buscar conta a pagar ou despesa'}
            onClick={onFinanceiroExistente}
          />
        </div>
      )}

      {widgetMenu === 'raiz' && (
        <details className="mt-1 rounded-2xl border border-dashed border-border/60 px-4 py-3 dark:border-border/40">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Mais opções</summary>
          <div className="mt-3 flex flex-col gap-2">
            <SubOpcao
              icon={Anchor}
              titulo="Viagem / frete fluvial"
              descricao="Anexar a evento logístico"
              onClick={onMaisFrete}
            />
            <SubOpcao
              icon={RefreshCw}
              titulo="Atualizar boleto recorrente"
              descricao="Substituir PDF do mês"
              disabled={!temArquivo}
              onClick={onMaisBoleto}
            />
            <SubOpcao
              icon={FileText}
              titulo="Importar conta a pagar (boleto)"
              descricao="Ler PDF e criar conta no AGEFIN"
              disabled={!temArquivo}
              onClick={onMaisAgefin}
            />
          </div>
        </details>
      )}
    </div>
  );
}
