import React, { useState } from 'react';
import GestaoCaixa from '../components/financeiro/GestaoCaixa';
import AgefinRecorrentes from '../components/financeiro/AgefinRecorrentes';
import AgefinImportador from '../components/agefin/AgefinImportador';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Wallet, Landmark, ArrowLeftRight, Repeat2, Plus } from "lucide-react";
import { Button } from '@/components/ui/button';

export default function FinanceiroPage() {
  const [activeTab, setActiveTab] = useState('caixa');
  const [showImportDialog, setShowImportDialog] = useState(false);

  return (
    <div className="p-4 lg:p-8 min-h-screen bg-gray-50 dark:bg-background pb-28">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-foreground mb-2">Financeiro</h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-muted-foreground mb-6">Controle suas contas, fluxo de caixa e conciliações bancárias.</p>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full rounded-full bg-gray-100 dark:bg-gray-800 p-1 h-auto">
            <TabsTrigger value="caixa" className="rounded-full text-xs md:text-sm">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="contas" className="rounded-full text-xs md:text-sm">Contas a Pagar</TabsTrigger>
            <TabsTrigger value="agefin" className="rounded-full text-xs md:text-sm">AGEFIN</TabsTrigger>
            <TabsTrigger value="movimentos" className="rounded-full text-xs md:text-sm">Movimentos</TabsTrigger>
          </TabsList>

          <TabsContent value="caixa">
            <GestaoCaixa />
          </TabsContent>

          <TabsContent value="contas">
            <Card className="border-0 shadow-sm rounded-3xl">
              <CardHeader><CardTitle>Contas a Pagar</CardTitle></CardHeader>
              <CardContent>
                <p className="text-gray-500">Em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agefin" className="mt-0">
            <AgefinRecorrentes />
          </TabsContent>

          <TabsContent value="movimentos">
            <Card className="border-0 shadow-sm rounded-3xl">
              <CardHeader><CardTitle>Movimentos Financeiros</CardTitle></CardHeader>
              <CardContent>
                <p className="text-gray-500">Em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Button
          onClick={() => setShowImportDialog(true)}
          className="fixed bottom-24 md:bottom-8 right-4 md:right-8 h-14 w-14 rounded-full shadow-lg bg-gray-900 hover:bg-gray-800 text-white z-50"
          size="icon"
        >
          <Plus className="w-6 h-6" />
        </Button>

        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-2xl p-0 rounded-3xl border-0 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Importar conta</h2>
            </div>
            <AgefinImportador
              onSuccess={() => {
                setShowImportDialog(false);
                setShowImportDialog(true);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}