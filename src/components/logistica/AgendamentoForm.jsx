import React, { useState } from 'react';
import { AgendaLogistica } from '@/entities/AgendaLogistica';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Truck, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";

export default function AgendamentoForm({ pedidosPendentes, onSuccess }) {
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [formData, setFormData] = useState({
    endereco_entrega: '',
    bairro: '',
    cidade: '',
    telefone_contato: '',
    data_agendada: '',
    turno_entrega: 'Manhã (8h-12h)',
    observacoes: ''
  });
  const { toast } = useToast();

  const handleSelectPedido = (pedido) => {
    setSelectedPedido(pedido);
    // Pré-preencher dados do pedido se disponíveis
    setFormData(prev => ({
      ...prev,
      telefone_contato: pedido.cliente_telefone || '',
      // Dados seriam buscados do cadastro do cliente
    }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPedido) return;

    try {
      // Calcular peso total dos itens
      const pesoTotal = selectedPedido.itens.reduce((sum, item) => {
        // Aqui buscaríamos o peso real do produto
        return sum + (item.quantidade * 10); // Placeholder
      }, 0);

      await AgendaLogistica.create({
        pedido_venda_id: selectedPedido.id,
        pedido_numero: selectedPedido.numero,
        cliente_id: selectedPedido.cliente_id,
        cliente_nome: selectedPedido.cliente_nome,
        ...formData,
        peso_total_kg: pesoTotal,
        valor_frete: selectedPedido.valor_frete || 0,
        status: 'Agendado'
      });

      toast({
        title: "Entrega Agendada!",
        description: `Entrega do pedido ${selectedPedido.numero} programada para ${format(new Date(formData.data_agendada), 'dd/MM/yyyy')}`,
        className: "bg-green-100 text-green-800"
      });

      // Limpar formulário
      setSelectedPedido(null);
      setFormData({
        endereco_entrega: '',
        bairro: '',
        cidade: '',
        telefone_contato: '',
        data_agendada: '',
        turno_entrega: 'Manhã (8h-12h)',
        observacoes: ''
      });

      onSuccess();
    } catch (error) {
      toast({
        title: "Erro ao Agendar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Lista de Pedidos Pendentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-orange-600" />
            Pedidos Aguardando Agendamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pedidosPendentes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              Todos os pedidos aprovados já foram agendados!
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {pedidosPendentes.map(pedido => (
                <div 
                  key={pedido.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPedido?.id === pedido.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelectPedido(pedido)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{pedido.numero}</div>
                      <div className="text-sm text-gray-600">{pedido.cliente_nome}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {pedido.itens?.length || 0} itens
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        R$ {pedido.valor_total?.toFixed(2)}
                      </div>
                      <Badge className="bg-orange-100 text-orange-800 mt-1">
                        Delivery
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulário de Agendamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Agendar Entrega
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedPedido ? (
            <div className="p-8 text-center text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              Selecione um pedido ao lado para agendar a entrega
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-medium text-blue-900">Pedido: {selectedPedido.numero}</div>
                <div className="text-sm text-blue-700">Cliente: {selectedPedido.cliente_nome}</div>
              </div>

              <div>
                <Label>Endereço de Entrega *</Label>
                <Input 
                  value={formData.endereco_entrega}
                  onChange={e => handleChange('endereco_entrega', e.target.value)}
                  placeholder="Rua, número, complemento"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bairro *</Label>
                  <Input 
                    value={formData.bairro}
                    onChange={e => handleChange('bairro', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Cidade *</Label>
                  <Input 
                    value={formData.cidade}
                    onChange={e => handleChange('cidade', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Telefone de Contato *</Label>
                <Input 
                  value={formData.telefone_contato}
                  onChange={e => handleChange('telefone_contato', e.target.value)}
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Agendada *</Label>
                  <Input 
                    type="date"
                    value={formData.data_agendada}
                    onChange={e => handleChange('data_agendada', e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    required
                  />
                </div>
                <div>
                  <Label>Turno de Entrega *</Label>
                  <Select value={formData.turno_entrega} onValueChange={v => handleChange('turno_entrega', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manhã (8h-12h)">Manhã (8h-12h)</SelectItem>
                      <SelectItem value="Tarde (13h-17h)">Tarde (13h-17h)</SelectItem>
                      <SelectItem value="Comercial (8h-17h)">Comercial (8h-17h)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Input 
                  value={formData.observacoes}
                  onChange={e => handleChange('observacoes', e.target.value)}
                  placeholder="Pontos de referência, restrições de horário..."
                />
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                <Calendar className="w-4 h-4 mr-2" />
                Confirmar Agendamento
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}