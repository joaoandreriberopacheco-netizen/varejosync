import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, UserPlus, ArrowRight, Search, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function AutoIdentification({ onIdentify, onSkip, onRegister, onBack }) {
  const [documento, setDocumento] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!documento || documento.length < 3) return;

    setLoading(true);
    try {
      // Busca por CPF/CNPJ ou Telefone
      const clientes = await base44.entities.Terceiro.filter({ 
        tipo: 'Cliente', 
        ativo: true
      });
      
      const cliente = clientes.find(c => 
        (c.cpf_cnpj && c.cpf_cnpj.replace(/\D/g, '') === documento.replace(/\D/g, '')) ||
        (c.telefone && c.telefone.replace(/\D/g, '') === documento.replace(/\D/g, ''))
      );

      if (cliente) {
        onIdentify(cliente);
      } else {
        toast({
          title: "Não encontrado",
          description: "Cliente não encontrado. Verifique o número ou cadastre-se.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Erro ao buscar cliente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="flex-1 flex flex-col bg-background p-6 md:p-12"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-2">Identificação</h2>
          <p className="text-muted-foreground">Informe seu CPF ou Telefone para continuar</p>
        </div>

        <form onSubmit={handleSearch} className="space-y-6 bg-card p-8 rounded-2xl shadow-xl">
          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-2">
              CPF, CNPJ ou Telefone
            </label>
            <div className="relative">
              <Input
                type="tel"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="Digite apenas números"
                className="h-14 text-lg bg-muted/40 dark:bg-muted border-border/40 rounded-xl"
                autoFocus
              />
              <button 
                type="submit"
                disabled={loading || !documento}
                className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors"
              >
                <Search className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border/40"></div>
            <span className="flex-shrink-0 mx-4 text-muted-foreground text-sm">OU</span>
            <div className="flex-grow border-t border-border/40"></div>
          </div>

          <Button 
            type="button"
            onClick={onRegister}
            variant="outline"
            className="w-full h-14 text-lg font-medium border-2 border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Quero me Cadastrar
          </Button>
        </form>

        <div className="mt-8 space-y-4">
          <Button 
            onClick={onSkip}
            variant="ghost"
            className="w-full h-12 text-muted-foreground hover:text-foreground/90 dark:hover:text-gray-200 hover:bg-muted rounded-xl"
          >
            Continuar sem identificação <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          <Button 
            onClick={onBack}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-muted-foreground"
          >
            Voltar ao início
          </Button>
        </div>
      </div>
    </motion.div>
  );
}