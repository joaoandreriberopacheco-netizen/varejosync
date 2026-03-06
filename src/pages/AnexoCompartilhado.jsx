import React, { useState, useEffect, useRef } from 'react';
import { FileText, Image as ImageIcon, File, Link2, Plus, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import BuscarLancamentoSheet from '@/components/anexos/BuscarLancamentoSheet';
import NovoLancamentoDialog from '@/components/financeiro/NovoLancamentoDialog';

export default function AnexoCompartilhado() {
  const [arquivo, setArquivo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [etapa, setEtapa] = useState('opcoes');
  const [uploadando, setUploadando] = useState(false);
  const [lancamentoVinculado, setLancamentoVinculado] = useState(null);
  const [abrirNovo, setAbrirNovo] = useState(false);
  const pollingRef = useRef(null);

  // Busca arquivo do cache 'VarejoSync-shared-files' usando a URL recebida via postMessage
  const carregarArquivoDoCache = async (fileUrl) => {
    console.log('PAGE: carregarArquivoDoCache chamado para:', fileUrl);
    try {
      const cache = await caches.open('VarejoSync-shared-files');
      const resp = await cache.match(fileUrl);
      if (!resp) {
        console.warn('PAGE: carregarArquivoDoCache - Não encontrou arquivo no cache para:', fileUrl);
        return false;
      }
      const blob = await resp.blob();
      if (blob.size === 0) {
        console.warn('PAGE: carregarArquivoDoCache - Arquivo vazio no cache para:', fileUrl);
        return false;
      }
      await cache.delete(fileUrl); // Remove do cache após carregar
      console.log('PAGE: carregarArquivoDoCache - Arquivo carregado e removido do cache:', fileUrl);
      const fileName = fileUrl.split('/').pop().replace(/^\d+-/, '') || 'arquivo';
      const file = new File([blob], fileName, { type: blob.type });
      const previewUrl = URL.createObjectURL(blob);
      setArquivo({ file, previewUrl, nome: fileName, tipo: blob.type });
      return true;
    } catch (e) {
      console.error('PAGE: Erro em carregarArquivoDoCache:', e);
      return false;
    }
  };

  // Fallback: varre todo o cache 'VarejoSync-shared-files' em busca de qualquer arquivo
  const varrerCache = async () => {
    console.log('PAGE: varrerCache chamado (fallback de polling).');
    try {
      const cache = await caches.open('VarejoSync-shared-files');
      const keys = await cache.keys();
      if (keys.length === 0) {
        console.log('PAGE: varrerCache - Cache vazio.');
        return false;
      }
      
      // Itera sobre as chaves para encontrar um arquivo válido (pode haver URLs de texto vazias)
      for (const req of keys) {
        const resp = await cache.match(req);
        if (!resp) {
          console.warn('PAGE: varrerCache - Não encontrou resposta para:', req.url);
          continue;
        }
        const blob = await resp.blob();
        if (blob.size > 0) { // Garante que é um arquivo real com conteúdo
          await cache.delete(req); // Remove do cache após carregar
          console.log('PAGE: varrerCache - Arquivo carregado e removido do cache (via varredura):', req.url);
          const url = typeof req === 'string' ? req : req.url;
          const fileName = url.split('/').pop().replace(/^\d+-/, '') || 'arquivo';
          const file = new File([blob], fileName, { type: blob.type });
          const previewUrl = URL.createObjectURL(blob);
          setArquivo({ file, previewUrl, nome: fileName, tipo: blob.type });
          return true;
        } else {
            // Se for um blob vazio, pode ser uma entrada de texto/URL sem arquivo
            await cache.delete(req); // Limpa entradas vazias
            console.log('PAGE: varrer
