import React from 'react';
import GestaoCaixa from '../components/financeiro/GestaoCaixa';
import AgefinRecorrentes from '../components/financeiro/AgefinRecorrentes';
import AgefinImportador from '../components/agefin/AgefinImportador';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Landmark, ArrowLeftRight, Repeat2, Upload } from "lucide-react";

export default function FinanceiroPage() {
  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gray-50 dark:bg-background">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-foreground mb-2">Módulo Financeiro</h1>
        <p className="text-gray-600 dark:text-muted-foreground mb-8">Controle suas contas, fluxo de caixa e conciliações bancárias.</p>

        <Tabs defaultValue="caixa" className="space-y-4">
          <TabsList>
            <TabsTrigger value="caixa" className="gap-2"><Wallet className="w-4 h-4"/> Gestão de Caixa</TabsTrigger>
            <TabsTrigger value="contas" className="gap-2"><Landmark className="w-4 h-4"/> Contas a Pagar/Receber</TabsTrigger>
            <TabsTrigger value="recorrentes" className="gap-2"><Repeat2 className="w-4 h-4"/> Recorrências</TabsTrigger>
            <TabsTrigger value="importar" className="gap-2"><Upload className="w-4 h-4"/> Importar</TabsTrigger>
            <TabsTrigger value="movimentos" className="gap-2"><ArrowLeftRight className="w-4 h-4"/> Movimentos</TabsTrigger>
          </TabsList>
          <TabsContent value="caixa">
            <GestaoCaixa />
          </TabsContent>
          <TabsContent value="contas">
            <Card>
                <CardHeader><CardTitle>Contas a Pagar e Receber</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-gray-500">Em desenvolvimento...</p>
                </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="recorrentes" className="mt-0">
            <AgefinRecorrentes />
          </TabsContent>
          <TabsContent value="importar" className="mt-0">
            <Card>
              <CardHeader><CardTitle>Importar Contas a Pagar</CardTitle></CardHeader>
              <CardContent>
                <AgefinImportador onSuccess={() => {}} />
              </CardContent>
            </Card>
          </TabsContent>
           <TabsContent value="movimentos">
            <Card>
                <CardHeader><CardTitle>Movimentos Financeiros</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-gray-500">Em desenvolvimento...</p>
                </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}