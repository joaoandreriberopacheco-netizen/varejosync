import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, CheckCircle2, AlertCircle, Info, TrendingUp, Package } from 'lucide-react';
import { format } from 'date-fns';
import { P38MobileLine, P38MobileLineList, P38StatusLabel, p38TypeTone, p38AccentKeyFromTone } from '@/components/ui/p38-mobile-line';

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Placeholder - será implementado com sistema de notificações real
    const mockNotifications = [
      {
        id: '1',
        type: 'success',
        title: 'Venda finalizada',
        message: 'Pedido PV-00123 concluído com sucesso',
        timestamp: new Date(),
        read: false
      },
      {
        id: '2',
        type: 'warning',
        title: 'Estoque baixo',
        message: '5 produtos precisam de reposição',
        timestamp: new Date(Date.now() - 3600000),
        read: false
      },
      {
        id: '3',
        type: 'info',
        title: 'Atualização do sistema',
        message: 'Novos recursos disponíveis',
        timestamp: new Date(Date.now() - 7200000),
        read: true
      }
    ];
    setNotifications(mockNotifications);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'success': return CheckCircle2;
      case 'warning': return AlertCircle;
      case 'info': return Info;
      default: return Bell;
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'success': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400';
      case 'warning': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
      case 'info': return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
      default: return 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">
            Notificações
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {notifications.filter(n => !n.read).length} não lidas
          </p>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-border/40 bg-card shadow-sm">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
          </div>
        ) : (
          <P38MobileLineList className="md:block">
            {notifications.map((notification, index) => {
              const tone = p38TypeTone(notification.type);
              return (
                <P38MobileLine
                  key={notification.id}
                  striped={index % 2 === 1}
                  accent={!notification.read ? p38AccentKeyFromTone(tone) : 'muted'}
                  title={notification.title}
                  subtitle={notification.message}
                  meta={<P38StatusLabel tone={tone}>{notification.type}</P38StatusLabel>}
                  valueSub={format(notification.timestamp, 'HH:mm')}
                />
              );
            })}
          </P38MobileLineList>
        )}
      </div>
    </div>
  );
}