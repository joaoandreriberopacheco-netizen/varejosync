import React from 'react';
import { AlertTriangle, CheckCircle, Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tarefa } from '@/entities/Tarefa';

export default function ControleDesconto({ 
  percentualDesconto, 
  limiteUsuario, 
  pedidoData, 
  onEnviarAprovacao 
}) {
  const descontoExcedido = percentualDesconto > limiteUsuario;

  const handleEnviarParaAprovacao = async () => {
    // Criar tarefa de aprovação de desconto
    const tarefa = {
      titulo: `Aprovação de Desconto: ${percentualDesconto.toFixed(1)}%`,
      tipo: 'Aprovação de Desconto',
      status: 'Pendente',
      prioridade: 'Alta',
      responsavel_id: 'gerente', // Em produção, buscar gerente do sistema
      responsavel_nome: 'Gerente',
      referencia_tipo: 'PedidoVenda',
      referencia_id: pedidoData.id,
      referencia_numero: pedidoData.numero,
      descricao: `Pedido para ${pedidoData.cliente_nome} - Desconto solicitado: ${percentualDesconto.toFixed(1)}% (Limite do vendedor: ${limiteUsuario}%)`,
      data_vencimento: new Date().toISOString().split('T')[0]
    };

    await Tarefa.create(tarefa);
    
    if (onEnviarAprovacao) {
      onEnviarAprovacao();
    }
  };

  if (!descontoExcedido) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Desconto de <strong>{percentualDesconto.toFixed(1)}%</strong> está dentro do seu limite de {limiteUsuario}%.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-red-50 border-red-200">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Desconto excede seu limite!</p>
            <p className="text-sm">
              Desconto aplicado: <strong>{percentualDesconto.toFixed(1)}%</strong> | 
              Seu limite: <strong>{limiteUsuario}%</strong>
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 border-red-300 text-red-700 hover:bg-red-100"
            onClick={handleEnviarParaAprovacao}
          >
            <Send className="w-4 h-4" />
            Enviar para Aprovação
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}