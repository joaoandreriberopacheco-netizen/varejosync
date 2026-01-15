import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Ship, 
  Truck, 
  Plane, 
  Package, 
  FileText, 
  MoreHorizontal, 
  Plus, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export default function PlanejamentoSemanal() {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [events, setEvents] = useState([]);
  const [backlogOrders, setBacklogOrders] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEventDrawerOpen, setIsEventDrawerOpen] = useState(false);
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = useState(false);
  
  // Novo Evento State
  const [newEvent, setNewEvent] = useState({
    nome: '',
    transportadora: '',
    tipo_veiculo: 'Balsa/Barco',
    data_previsao_chegada: '',
    status: 'Agendado'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eventsData, ordersData] = await Promise.all([
        base44.entities.EventosLogisticos.list(),
        base44.entities.PedidoCompra.list()
      ]);

      // Enriquecer eventos com seus pedidos
      const eventsWithOrders = eventsData.map(event => ({
        ...event,
        pedidos: ordersData.filter(order => order.evento_logistico_id === event.id)
      }));

      setEvents(eventsWithOrders);
      setBacklogOrders(ordersData.filter(order => !order.evento_logistico_id && order.status !== 'Recebido' && order.status !== 'Cancelado'));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  const handleCreateEvent = async () => {
    try {
      await base44.entities.EventosLogisticos.create(newEvent);
      setIsNewEventDialogOpen(false);
      loadData();
      setNewEvent({
         nome: '',
         transportadora: '',
         tipo_veiculo: 'Balsa/Barco',
         data_previsao_chegada: '',
         status: 'Agendado'
      });
    } catch (error) {
      console.error("Erro ao criar evento:", error);
    }
  };

  const handleLinkOrderToEvent = async (orderId, eventId) => {
    try {
      await base44.entities.PedidoCompra.update(orderId, { 
        evento_logistico_id: eventId,
        status: 'Aguardando Embarque' 
      });
      loadData();
      // Se o drawer estiver aberto, atualiza o evento selecionado
      if (selectedEvent && selectedEvent.id === eventId) {
         const updatedEvent = events.find(e => e.id === eventId);
         // Pequeno hack para atualizar o drawer já que o loadData é async
         // Idealmente usaríamos react-query
         if(updatedEvent) setSelectedEvent(updatedEvent);
      }
    } catch (error) {
      console.error("Erro ao vincular pedido:", error);
    }
  };

  const handleUnlinkOrder = async (orderId) => {
    try {
      await base44.entities.PedidoCompra.update(orderId, { evento_logistico_id: null });
      loadData();
      setIsEventDrawerOpen(false);
    } catch (error) {
      console.error("Erro ao desvincular pedido:", error);
    }
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'Balsa/Barco': return <Ship className="w-4 h-4" />;
      case 'Caminhão': return <Truck className="w-4 h-4" />;
      case 'Aéreo': return <Plane className="w-4 h-4" />;
      default: return <Truck className="w-4 h-4" />;
    }
  };

  const getVisualWeight = (event) => {
    // Calcula altura visual baseada no peso total ou volume dos pedidos
    const totalWeight = event.pedidos?.reduce((acc, p) => acc + (p.peso_total_kg || 0), 0) || 0;
    // Base 100px + 1px por 100kg, max 300px
    return Math.min(120 + (totalWeight / 100), 300);
  };

  const getTotalVolume = (event) => {
    return event.pedidos?.reduce((acc, p) => acc + (p.qtd_volumes || 0), 0) || 0;
  };

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Header da Timeline */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Planejamento de Entrada</h2>
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))} className="h-7 w-7">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 text-sm font-medium min-w-[140px] text-center">
              {format(currentWeekStart, "d 'de' MMM", { locale: ptBR })} - {format(addDays(currentWeekStart, 6), "d 'de' MMM", { locale: ptBR })}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))} className="h-7 w-7">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <Dialog open={isNewEventDialogOpen} onOpenChange={setIsNewEventDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900">
              <Plus className="w-4 h-4 mr-2" />
              Novo Evento Logístico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Evento Logístico</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Evento (Viagem)</Label>
                <Input 
                  placeholder="Ex: Balsa Rei do Rio - Saída 10/Out" 
                  value={newEvent.nome}
                  onChange={e => setNewEvent({...newEvent, nome: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Transportadora</Label>
                  <Input 
                    placeholder="Ex: Navegação XYZ" 
                    value={newEvent.transportadora}
                    onChange={e => setNewEvent({...newEvent, transportadora: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Veículo</Label>
                  <Select value={newEvent.tipo_veiculo} onValueChange={v => setNewEvent({...newEvent, tipo_veiculo: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Balsa/Barco">Balsa/Barco</SelectItem>
                      <SelectItem value="Caminhão">Caminhão</SelectItem>
                      <SelectItem value="Carreta">Carreta</SelectItem>
                      <SelectItem value="Aéreo">Aéreo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Previsão de Chegada</Label>
                <Input 
                  type="datetime-local" 
                  value={newEvent.data_previsao_chegada}
                  onChange={e => setNewEvent({...newEvent, data_previsao_chegada: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewEventDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateEvent}>Criar Evento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Timeline Grid */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="grid grid-cols-7 h-full min-w-[1000px] divide-x divide-gray-100 dark:divide-gray-800">
            {weekDays.map((day, index) => {
               const dayEvents = events.filter(e => isSameDay(parseISO(e.data_previsao_chegada), day));
               const isToday = isSameDay(day, new Date());
               
               return (
                <div key={index} className={`flex flex-col h-full ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                  <div className="p-3 border-b border-gray-100 dark:border-gray-800 text-center">
                    <span className="text-xs uppercase text-gray-500 font-medium block">{format(day, 'EEE', { locale: ptBR })}</span>
                    <span className={`text-lg font-semibold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto bg-gray-50/20 dark:bg-gray-900/20">
                    {dayEvents.map(event => {
                      const volumeTotal = getTotalVolume(event);
                      const hasPendingNF = event.pedidos?.some(p => !p.nfe_emitida);
                      const hasPendingManifest = event.pedidos?.some(p => !p.manifesto_conferido);
                      
                      return (
                        <div
                          key={event.id}
                          onClick={() => {
                            setSelectedEvent(event);
                            setIsEventDrawerOpen(true);
                          }}
                          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                          style={{ minHeight: `${getVisualWeight(event)}px` }}
                        >
                          <div className={`absolute top-0 left-0 w-1 h-full ${
                            event.status === 'Atracado' ? 'bg-green-500' : 
                            event.status === 'Em Trânsito' ? 'bg-blue-500' : 'bg-gray-300'
                          }`} />
                          
                          <div className="pl-2 flex flex-col h-full">
                            <div className="flex items-start justify-between mb-2">
                              <div className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center gap-1 w-fit">
                                {getVehicleIcon(event.tipo_veiculo)}
                                <span className="truncate max-w-[80px]">{event.transportadora}</span>
                              </div>
                              {/* Traffic Lights */}
                              <div className="flex gap-1">
                                <div className={`w-2 h-2 rounded-full ${hasPendingNF ? 'bg-red-500' : 'bg-green-500'}`} title="NF Status" />
                                <div className={`w-2 h-2 rounded-full ${hasPendingManifest ? 'bg-amber-500' : 'bg-green-500'}`} title="Manifesto Status" />
                              </div>
                            </div>

                            <h3 className="font-semibold text-sm text-gray-900 dark:text-white leading-tight mb-1 line-clamp-2">
                              {event.nome}
                            </h3>
                            
                            <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700 border-dashed">
                              <div className="flex justify-between items-center text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" /> {event.pedidos?.length || 0} POs
                                </span>
                                <span className="flex items-center gap-1">
                                  <Package className="w-3 h-3" /> {volumeTotal} Vol.
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Área de Drop (Visual apenas por enquanto) */}
                    <div className="h-full min-h-[100px] border-2 border-dashed border-transparent hover:border-gray-300 dark:hover:border-gray-700 rounded-xl transition-colors flex items-center justify-center group">
                      <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 select-none pointer-events-none">
                        Arraste aqui
                      </span>
                    </div>
                  </div>
                </div>
               );
            })}
          </div>
        </div>

        {/* Sidebar Backlog */}
        <div className="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Backlog de Pedidos
            </h3>
            <p className="text-xs text-gray-500 mt-1">Arraste para um evento na timeline</p>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {backlogOrders.map(order => (
                <div 
                  key={order.id} 
                  className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:border-blue-400 cursor-grab active:cursor-grabbing group"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("orderId", order.id);
                  }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-xs font-medium bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                      {order.numero || 'N/A'}
                    </span>
                    <span className="text-xs text-gray-500">R$ {order.valor_total?.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="font-medium text-sm text-gray-800 dark:text-gray-200 mb-1 line-clamp-1">
                    {order.fornecedor_nome}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Package className="w-3 h-3" /> {order.itens?.length} itens
                  </div>
                  
                  {/* Botão rápido de ação para mobile ou clique */}
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 hidden group-hover:flex justify-end">
                    {events.filter(e => e.status !== 'Finalizado').length > 0 ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="xs" className="h-6 text-[10px]">Vincular</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Vincular a qual evento?</DialogTitle></DialogHeader>
                          <div className="space-y-2">
                            {events.filter(e => e.status !== 'Finalizado').map(ev => (
                              <Button 
                                key={ev.id} 
                                variant="outline" 
                                className="w-full justify-start"
                                onClick={() => handleLinkOrderToEvent(order.id, ev.id)}
                              >
                                {ev.nome} ({format(parseISO(ev.data_previsao_chegada), 'dd/MM')})
                              </Button>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <span className="text-[10px] text-gray-400">Sem eventos abertos</span>
                    )}
                  </div>
                </div>
              ))}
              {backlogOrders.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Nenhum pedido pendente
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Drawer de Detalhes do Evento */}
      <Sheet open={isEventDrawerOpen} onOpenChange={setIsEventDrawerOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2 text-xl">
              {selectedEvent?.tipo_veiculo === 'Balsa/Barco' ? <Ship className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
              {selectedEvent?.nome}
            </SheetTitle>
            <SheetDescription>
              {selectedEvent?.transportadora} • Chegada Prevista: {selectedEvent?.data_previsao_chegada && format(parseISO(selectedEvent.data_previsao_chegada), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </SheetDescription>
          </SheetHeader>

          {selectedEvent && (
            <div className="space-y-6">
              {/* Status Geral */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-gray-50 dark:bg-gray-800 border-none">
                  <div className="text-xs text-gray-500 uppercase mb-1">Volume Total</div>
                  <div className="text-2xl font-bold">{getTotalVolume(selectedEvent)}</div>
                  <div className="text-xs text-gray-400">Volumes</div>
                </Card>
                <Card className="p-4 bg-gray-50 dark:bg-gray-800 border-none">
                  <div className="text-xs text-gray-500 uppercase mb-1">Peso Total</div>
                  <div className="text-2xl font-bold">
                    {selectedEvent.pedidos?.reduce((acc, p) => acc + (p.peso_total_kg || 0), 0).toLocaleString('pt-BR')}
                  </div>
                  <div className="text-xs text-gray-400">kg (estimado)</div>
                </Card>
              </div>

              {/* Lista de Pedidos no Evento */}
              <div>
                <h3 className="font-medium text-sm mb-3 flex items-center justify-between">
                  <span>Carga (Pedidos de Compra)</span>
                  <Badge variant="outline">{selectedEvent.pedidos?.length} pedidos</Badge>
                </h3>
                
                <div className="space-y-3">
                  {selectedEvent.pedidos?.map(pedido => (
                    <div key={pedido.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-sm">{pedido.fornecedor_nome}</div>
                          <div className="text-xs text-gray-500 font-mono">{pedido.numero}</div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="xs" 
                          className="h-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleUnlinkOrder(pedido.id)}
                        >
                          Remover
                        </Button>
                      </div>
                      
                      {/* Checklist Documental */}
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className={`flex items-center gap-2 p-2 rounded-md text-xs border ${
                          pedido.nfe_emitida 
                            ? 'bg-green-50 border-green-100 text-green-700' 
                            : 'bg-red-50 border-red-100 text-red-700'
                        }`}>
                          {pedido.nfe_emitida ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          <span>Nota Fiscal</span>
                        </div>
                        <div className={`flex items-center gap-2 p-2 rounded-md text-xs border ${
                          pedido.manifesto_conferido 
                            ? 'bg-green-50 border-green-100 text-green-700' 
                            : 'bg-amber-50 border-amber-100 text-amber-700'
                        }`}>
                          {pedido.manifesto_conferido ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          <span>Manifesto</span>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Input 
                           placeholder="Qtd Vol." 
                           className="h-7 text-xs" 
                           defaultValue={pedido.qtd_volumes}
                           onBlur={async (e) => {
                             const val = parseFloat(e.target.value);
                             if(val !== pedido.qtd_volumes) {
                               await base44.entities.PedidoCompra.update(pedido.id, { qtd_volumes: val });
                               // Atualiza visualmente depois (simplificação)
                             }
                           }}
                        />
                        <Input 
                           placeholder="Peso Kg" 
                           className="h-7 text-xs"
                           defaultValue={pedido.peso_total_kg}
                           onBlur={async (e) => {
                             const val = parseFloat(e.target.value);
                             if(val !== pedido.peso_total_kg) {
                               await base44.entities.PedidoCompra.update(pedido.id, { peso_total_kg: val });
                             }
                           }}
                        />
                      </div>
                    </div>
                  ))}
                  
                  {(!selectedEvent.pedidos || selectedEvent.pedidos.length === 0) && (
                    <div className="text-center py-6 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200">
                      Nenhum pedido vinculado a este evento.
                      <br/>
                      <span className="text-xs">Arraste pedidos do backlog para cá.</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                 <h3 className="font-medium text-sm mb-2">Equipe & Recursos</h3>
                 <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex gap-3 items-start">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <span className="font-semibold block mb-1">Sugestão do Sistema</span>
                      Para {getTotalVolume(selectedEvent)} volumes estimados, recomenda-se uma equipe de <strong>{Math.ceil(getTotalVolume(selectedEvent) / 200) + 1} pessoas</strong> para descarga em 4 horas.
                    </div>
                 </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}