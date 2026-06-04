import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CheckCircle, XCircle, ChevronDown, FileText, Users, Package, Calendar, AlertCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function AprovacaoPedidoMobile({ pedido, contas, onApprove, onReject, onClose }) {
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState('');
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  const formatCurrency = (value) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const handleApproveClick = () => {
    if (!contaSelecionada) {
      setShowApprovalDialog(true);
      return;
    }
    onApprove(pedido, contaSelecionada);
  };

  const handleRejectClick = () => {
    if (!motivoRejeicao.trim()) {
      setShowRejectDialog(true);
      return;
    }
    onReject(pedido, motivoRejeicao);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="!fixed !inset-0 !max-w-none !w-screen !h-screen !p-0 !m-0 !rounded-none !border-0 !shadow-none !bg-card !dark:bg-background z-[9999] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-border/40 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
            <ChevronDown className="w-5 h-5 rotate-90" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-medium text-foreground truncate">
              Aprovar Pagamento
            </h2>
          </div>
        </div>

        {/* Valor Total Destacado */}
        <div className="flex-shrink-0 px-4 py-6 bg-gradient-to-br from-muted/40 to-muted/60 dark:from-muted/40 dark:to-muted/60">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Valor Total</div>
            <div className="text-4xl font-bold text-foreground mb-2">
              {formatCurrency(pedido.valor_total)}
            </div>
            <Badge className="bg-muted text-foreground/90 border-0">
              {pedido.numero}
            </Badge>
          </div>
        </div>

        {/* Conteúdo Scrollável */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {/* Informações do Pedido */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-card dark:bg-muted flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1">Fornecedor</div>
                <div className="text-sm font-medium text-foreground">
                  {pedido.fornecedor_nome}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-card dark:bg-muted flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1">Itens no Pedido</div>
                <div className="text-sm font-medium text-foreground">
                  {pedido.itens?.length || 0} {pedido.itens?.length === 1 ? 'item' : 'itens'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-card dark:bg-muted flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1">Data de Criação</div>
                <div className="text-sm font-medium text-foreground">
                  {pedido.created_date ? format(new Date(pedido.created_date), 'dd/MM/yyyy HH:mm') : '-'}
                </div>
              </div>
            </div>

            {pedido.observacoes && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="flex items-start gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs font-medium text-blue-800 dark:text-blue-300">Observações</div>
                </div>
                <div className="text-sm text-foreground/90">
                  {pedido.observacoes}
                </div>
              </div>
            )}
          </div>

          {/* Seleção de Conta */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground/90">
              Conta de Pagamento *
            </Label>
            <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
              <SelectTrigger className="bg-muted/50 border-0 h-12 shadow-sm">
                <SelectValue placeholder="Selecione a conta..." />
              </SelectTrigger>
              <SelectContent className="dark:bg-muted border-0 shadow-lg z-[10000]">
                {contas.map(conta => (
                  <SelectItem key={conta.id} value={conta.id}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="font-medium">{conta.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(conta.saldo_atual)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Área de Rejeição */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground/90">
              Motivo da Rejeição (opcional)
            </Label>
            <Textarea
              placeholder="Informe o motivo caso vá rejeitar..."
              className="bg-muted/50 border-0 shadow-sm resize-none"
              rows={3}
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
            />
          </div>
        </div>

        {/* Footer com Botões de Ação */}
        <div className="flex-shrink-0 p-4 border-t border-border/40 bg-card">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-12 border-0 shadow-sm bg-muted/50 gap-2"
              onClick={() => {
                if (motivoRejeicao.trim()) {
                  handleRejectClick();
                } else {
                  setShowRejectDialog(true);
                }
              }}
            >
              <XCircle className="w-5 h-5" />
              Rejeitar
            </Button>
            <Button
              className="h-12 bg-primary hover:bg-primary/90 dark:bg-muted dark:hover:bg-muted gap-2"
              onClick={() => {
                if (contaSelecionada) {
                  handleApproveClick();
                } else {
                  setShowApprovalDialog(true);
                }
              }}
            >
              <CheckCircle className="w-5 h-5" />
              Aprovar
            </Button>
          </div>
        </div>

        {/* Dialog de Alerta - Conta não selecionada */}
        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent className="!max-w-sm mx-4 dark:bg-muted">
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground mb-1">Conta obrigatória</h3>
                  <p className="text-sm text-muted-foreground">
                    Selecione uma conta de pagamento antes de aprovar.
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowApprovalDialog(false)} className="w-full">
                Entendi
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Alerta - Motivo não informado */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="!max-w-sm mx-4 dark:bg-muted">
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground mb-1">Motivo obrigatório</h3>
                  <p className="text-sm text-muted-foreground">
                    Informe o motivo da rejeição para feedback ao setor de compras.
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowRejectDialog(false)} className="w-full">
                Entendi
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}