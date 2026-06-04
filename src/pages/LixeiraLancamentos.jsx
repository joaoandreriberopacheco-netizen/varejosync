import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Trash2, RotateCcw } from 'lucide-react';
import { P38MobileLine, P38MobileLineList, P38StatusLabel, p38AccentKeyFromTone } from '@/components/ui/p38-mobile-line';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function LixeiraLancamentos() {
  const navigate = useNavigate();
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarCancelados();
  }, []);

  const carregarCancelados = async () => {
    try {
      const dados = await base44.entities.LancamentoFinanceiro.filter(
        { status: 'Cancelado' },
        '-created_date',
        100
      );
      setLancamentos(dados);
    } catch (error) {
      toast.error('Erro ao carregar lixeira');
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurar = async (lancamento) => {
    try {
      const grupoId = lancamento.grupo_lancamento_id;
      
      if (grupoId) {
        const grupo = await base44.entities.LancamentoFinanceiro.filter(
          { grupo_lancamento_id: grupoId }
        );
        
        for (const lanc of grupo) {
          // Remove a marca de cancelamento
          const obs = lanc.observacoes || '';
          const obsLimpa = obs.replace(/\[CANCELADO.*?\]/s, '').trim();
          
          await base44.entities.LancamentoFinanceiro.update(lanc.id, {
            status: 'Pago',
            observacoes: obsLimpa
          });
        }
      } else {
        const obs = lancamento.observacoes || '';
        const obsLimpa = obs.replace(/\[CANCELADO.*?\]/s, '').trim();
        
        await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
          status: 'Pago',
          observacoes: obsLimpa
        });
      }
      
      toast.success('Movimento restaurado');
      carregarCancelados();
    } catch (error) {
      toast.error('Erro ao restaurar: ' + error.message);
    }
  };

  const handleDeletarPermanente = async (lancamento) => {
    if (!confirm('Deseja deletar permanentemente? Esta ação não pode ser desfeita.')) return;
    
    try {
      const grupoId = lancamento.grupo_lancamento_id;
      
      if (grupoId) {
        const grupo = await base44.entities.LancamentoFinanceiro.filter(
          { grupo_lancamento_id: grupoId }
        );
        for (const lanc of grupo) {
          await base44.entities.LancamentoFinanceiro.delete(lanc.id);
        }
      } else {
        await base44.entities.LancamentoFinanceiro.delete(lancamento.id);
      }
      
      toast.success('Deletado permanentemente');
      carregarCancelados();
    } catch (error) {
      toast.error('Erro: ' + error.message);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-semibold">Lixeira de Lançamentos</h1>
      </div>

      {lancamentos.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhum lançamento cancelado
        </Card>
      ) : (
        <div className="space-y-2">
          {lancamentos.map(lanc => {
            const canceladoInfo = lanc.observacoes?.match(/\[CANCELADO por (.*?) em (.*?)\]/);
            const quemCancelou = canceladoInfo?.[1] || 'Desconhecido';
            const quando = canceladoInfo?.[2] || '';
            
            return (
              <Card key={lanc.id} className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-foreground">
                        {lanc.descricao}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {lanc.referencia_numero}
                      </p>
                    </div>
                    <p className="font-semibold text-red-600">
                      R$ {lanc.valor?.toFixed(2)}
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Cancelado por: <strong>{quemCancelou}</strong></p>
                    {quando && <p>Em: {quando}</p>}
                    {lanc.grupo_lancamento_id && (
                      <p className="text-orange-600">⚠️ Faz parte de um par de movimento</p>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestaurar(lanc)}
                      className="gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restaurar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeletarPermanente(lanc)}
                      className="gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Deletar
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}