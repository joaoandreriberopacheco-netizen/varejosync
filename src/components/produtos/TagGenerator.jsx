import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from "@/components/ui/use-toast";

export default function TagGenerator({ produtoNome, produtoDescricao, onTagsGenerated }) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!produtoNome) {
      toast({ title: "Nome do produto necessário", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const prompt = `
        Analise o produto abaixo e gere uma lista de tags relevantes para categorização em um e-commerce e sistema de gestão.
        Produto: ${produtoNome}
        Descrição: ${produtoDescricao || ''}
        
        Retorne APENAS um objeto JSON no seguinte formato, sem markdown:
        {
          "tags": ["tag1", "tag2", "tag3", "categoria_sugerida", "marca_sugerida"]
        }
        
        As tags devem incluir:
        1. Categoria principal (ex: Hidráulica, Elétrica)
        2. Subcategoria (ex: Conexões, Fios)
        3. Marca (se identificável)
        4. Características (ex: PVC, 20mm, 3/4)
        5. Uso (ex: Parede, Piso)
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            tags: { type: "array", items: { type: "string" } }
          }
        }
      });

      if (response && response.tags) {
        onTagsGenerated(response.tags);
        toast({ title: "Tags geradas com sucesso!", className: "bg-emerald-100 text-emerald-800" });
      }
    } catch (error) {
      console.error("Erro ao gerar tags:", error);
      toast({ title: "Erro ao gerar tags", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      type="button" 
      variant="outline" 
      size="sm" 
      onClick={handleGenerate} 
      disabled={isLoading}
      className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
      Gerar Tags com IA
    </Button>
  );
}