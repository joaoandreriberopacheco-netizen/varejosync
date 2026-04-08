import React, { useState, useMemo } from 'react';
import { DollarSign, Paperclip, Upload, Trash2, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function getContaStatusStyle(temConta, status, estaAtrasada) {
  if (!temConta) return { bgClass: 'bg-gray-50 dark:bg-gray-800', strokeColor: '#d1d5db', label: 'Sem vinculação' };
  if (estaAtrasada) return { bgClass: 'bg-red-50 dark:bg-red-900/20', strokeColor: '#ff5a7f', label: 'Atrasada' };
  if (status === 'Pago') return { bgClass: 'bg-green-50 dark:bg-green-900/20', strokeColor: '#7c8a0f', label: 'Paga' };
  return { bgClass: 'bg-lime-50 dark:bg-lime-900/20', strokeColor: '#84cc16', label: 'Vinculada' };
}

export default function FreteDetailPanel({ evento, embarques, onBack }) {
  const [uploadFile, setUploadFile] = useState(null);
  const queryClient = useQueryClient();

  const { data: anexos = [] } = useQuery({
    queryKey: ['anexos-frete', evento?.id],
    queryFn: async () => {
      if (!evento?.conta_frete?.id) return [];
      return base44.entities.AnexoDocumento.filter({
        referencia_id: evento.conta_frete.id,
        referencia_tipo: 'LancamentoFinanceiro'
      });
    },
    enabled: !!evento?.conta_frete?.id
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      
      if (evento.conta_frete?.id) {
        await base44.entities.AnexoDocumento.create({
          referencia_id: evento.conta_frete.id,
          referencia_tipo: 'LancamentoFinanceiro',
          url_arquivo: uploadRes.file_url,
          nome_arquivo: file.name,
          tipo_arquivo: file.type
        });
      }
      
      embarques.forEach(async (embarque) => {
        await base44.entities.AnexoDocumento.create({
          referencia_id: embarque.id,
          referencia_tipo: 'Embarque',
          url_arquivo: uploadRes.file_url,
          nome_arquivo: file.name,
          tipo_arquivo: file.type
        });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos-frete', evento?.id] });
      setUploadFile(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (anexoId) => base44.entities.AnexoDocumento.delete(anexoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos-frete', evento?.id] });
    }
  });

  const temConta = evento?.tem_conta_frete;
  const statusConta = evento?.conta_frete_status;
  const estaAtrasada = temConta && statusConta !== 'Pago' && evento.conta_frete?.data_vencimento && new Date(evento.conta_frete.data_vencimento) < new Date();
  const { bgClass, strokeColor, label } = getContaStatusStyle(temConta, statusConta, estaAtrasada);

  return (
    <div className="space-y-4 pb-4">
      <button
        onClick={onBack}
        className="text-sm text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-300"
      >
        ← Voltar
      </button>

      {/* Cabeçalho com Status */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{evento.embarcacao_nome}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{evento.codigo}</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${bgClass}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 6v12" />
              <path d="M9 9h6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-6" />
            </svg>
          </div>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">{label}</div>
      </div>

      {/* Informações da Conta */}
      {temConta && evento.conta_frete && (
        <div className="rounded-3xl bg-gray-50 dark:bg-gray-800 p-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Valor:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {(evento.conta_frete_valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Status:</span>
            <span className="font-semibold text-gray-900 dark:text-white">{statusConta}</span>
          </div>
          {evento.conta_frete.data_vencimento && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Vencimento:</span>
              <span className={`font-semibold ${estaAtrasada ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {new Date(evento.conta_frete.data_vencimento).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Resumo de Embarques */}
      <div className="rounded-3xl bg-gray-50 dark:bg-gray-800 p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-900 dark:text-white mb-2">Embarques vinculados</p>
        <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
          <div className="flex justify-between">
            <span>Total de embarques:</span>
            <span className="font-medium text-gray-900 dark:text-white">{embarques?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Valor total:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {(evento.valor_total_carga || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Fornecedores:</span>
            <span className="font-medium text-gray-900 dark:text-white">{evento.total_fornecedores_relacionados || 0}</span>
          </div>
        </div>
      </div>

      {/* Seção de Anexos */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-gray-500" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Documentos</p>
            {anexos.length > 0 && (
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                {anexos.length}
              </span>
            )}
          </div>
        </div>

        {/* Upload */}
        <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          <Upload className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-400">Adicionar anexo</span>
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                uploadMutation.mutate(e.target.files[0]);
              }
            }}
            disabled={uploadMutation.isPending}
          />
        </label>

        {/* Lista de Anexos */}
        {anexos.length > 0 && (
          <div className="space-y-1">
            {anexos.map((anexo) => (
              <div key={anexo.id} className="flex items-center justify-between px-2 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 truncate">{anexo.nome_arquivo}</span>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(anexo.id)}
                  disabled={deleteMutation.isPending}
                  className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {anexos.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">Nenhum documento anexado</p>
        )}
      </div>
    </div>
  );
}