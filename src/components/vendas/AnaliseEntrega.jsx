import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Calendar as CalendarIcon, MapPin, Truck, Box } from 'lucide-react';
import { dataHoje } from '@/components/utils/dateUtils';

// Mock data
const frota = [
  { id: 'fiorino-1', nome: 'Fiat Fiorino', capacidade_kg: 650 },
  { id: 'ducato-1', nome: 'Fiat Ducato', capacidade_kg: 1500 },
  { id: 'moto-1', nome: 'Honda Cargo', capacidade_kg: 20 },
];

export default function AnaliseEntrega({ pedido }) {
  const [veiculoSelecionado, setVeiculoSelecionado] = useState(frota[0]);
  const [dataAgendamento, setDataAgendamento] = useState(dataHoje());
  const [horaAgendamento, setHoraAgendamento] = useState('14:30');

  // Mocked data
  const pesoPedido = pedido.itens.reduce((acc, item) => acc + (item.peso_kg || 1) * item.quantidade, 0); // Assuming average weight if not present
  const pesoJaAlocado = 450; // Mocked existing load
  const pesoTotalProjetado = pesoPedido + pesoJaAlocado;
  const capacidadeExcedida = pesoTotalProjetado > veiculoSelecionado.capacidade_kg;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-4 bg-muted/40 rounded-lg border">
      {/* Painel Esquerdo: Rota e Alocação */}
      <div className="lg:col-span-3 space-y-6">
        {/* Rota */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
              Análise de Rota
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="h-48 bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">[Mapa da Rota]</p>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Distância Estimada</Label>
                <p className="font-semibold text-lg">12.5 km</p>
              </div>
              <div>
                <Label>Tempo Estimado</Label>
                <p className="font-semibold text-lg">28 min</p>
              </div>
              <div>
                <Label>Custo do Frete</Label>
                <p className="font-semibold text-lg text-green-600">R$ 32,50</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Alocação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Truck className="w-5 h-5 text-purple-600" />
              Alocação de Carga
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Selecionar Veículo</Label>
              <Select onValueChange={(id) => setVeiculoSelecionado(frota.find(v => v.id === id))} defaultValue={veiculoSelecionado.id}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um veículo" />
                </SelectTrigger>
                <SelectContent>
                  {frota.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.nome} (Cap. {v.capacidade_kg} kg)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <Label>Peso do Pedido</Label>
                <p className="font-bold text-xl">{pesoPedido.toFixed(1)} kg</p>
              </div>
              <div>
                <Label>Carga Pré-existente</Label>
                <p className="font-bold text-xl">{pesoJaAlocado.toFixed(1)} kg</p>
              </div>
              <div>
                <Label>Capacidade do Veículo</Label>
                <p className="font-bold text-xl">{veiculoSelecionado.capacidade_kg.toFixed(1)} kg</p>
              </div>
            </div>
            <div>
              <Label>Ocupação Projetada</Label>
              <Progress value={(pesoTotalProjetado / veiculoSelecionado.capacidade_kg) * 100} className={capacidadeExcedida ? "bg-red-200 [&>*]:bg-red-600" : "[&>*]:bg-green-600"} />
              <p className={`text-right text-sm font-medium mt-1 ${capacidadeExcedida ? 'text-red-600' : 'text-muted-foreground'}`}>
                {pesoTotalProjetado.toFixed(1)} / {veiculoSelecionado.capacidade_kg.toFixed(1)} kg
              </p>
            </div>
            {capacidadeExcedida && (
              <div className="flex items-center gap-2 p-3 bg-red-100 text-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <p className="font-semibold">Atenção: Capacidade de Carga Excedida!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Painel Direito: Agendamento */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="w-5 h-5 text-green-600" />
              Agendamento da Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-64 bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">[Mini-calendário com horários]</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data</Label>
                <Input type="date" value={dataAgendamento} onChange={e => setDataAgendamento(e.target.value)} />
              </div>
              <div>
                <Label>Hora</Label>
                <Input type="time" value={horaAgendamento} onChange={e => setHoraAgendamento(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" disabled={capacidadeExcedida}>
              Confirmar Agendamento
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}