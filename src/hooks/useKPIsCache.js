import { useState, useCallback, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const KPI_CACHE_KEY = 'p38_kpis_cache';
const KPI_CACHE_TTL = 60 * 1000; // 1 minuto

export function useKPIsCache() {
  const [kpis, setKpis] = useState({
    vendasHoje: 0,
    valorVendasHoje: 0,
    estoqueAlerta: 0,
    pedidosPendentes: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef(null);

  const getFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(KPI_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < KPI_CACHE_TTL) {
          return data.kpis;
        }
      }
    } catch {
      // Falha silenciosa
    }
    return null;
  }, []);

  const saveToCache = useCallback((data) => {
    try {
      localStorage.setItem(KPI_CACHE_KEY, JSON.stringify({
        kpis: data,
        timestamp: Date.now()
      }));
    } catch {
      // Falha silenciosa
    }
  }, []);

  const loadKPIs = useCallback(async () => {
    // Verificar cache primeiro
    const cached = getFromCache();
    if (cached) {
      setKpis(cached);
      return;
    }

    setIsLoading(true);
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // Carregamento paralelo otimizado
      const [vendas, produtos, pedidos] = await Promise.all([
        base44.entities.PedidoVenda.list(),
        base44.entities.Produto.list(),
        base44.entities.PedidoVenda.filter({ status: 'Aguardando Caixa' })
      ]);

      const vendasHoje = vendas.filter(v => new Date(v.created_date) >= hoje);
      const produtosAlerta = produtos.filter(p => (p.estoque_atual || 0) <= (p.estoque_minimo || 0));

      const newKpis = {
        vendasHoje: vendasHoje.length,
        valorVendasHoje: vendasHoje.reduce((sum, v) => sum + (v.valor_total || 0), 0),
        estoqueAlerta: produtosAlerta.length,
        pedidosPendentes: pedidos.length
      };

      setKpis(newKpis);
      saveToCache(newKpis);
    } catch (error) {
      console.error('Erro ao carregar KPIs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getFromCache, saveToCache]);

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(KPI_CACHE_KEY);
    } catch {
      // Falha silenciosa
    }
  }, []);

  return { kpis, isLoading, loadKPIs, clearCache };
}