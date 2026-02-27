import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ClipboardList, Play, CheckCircle2, Clock, XCircle, AlertCircle, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import NovaConferenciaDialog from "@/components/estoque/auditoria/NovaConferenciaDialog";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

const statusConfig = {
  "Rascunho": { icon: Clock, color: "text-gray-400", bg: "bg-gray-100 dark:bg-gray-800", label: "Rascunho" },
  "Em Andamento": { icon: Play, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", label: "Em Andamento" },
  "Aguardando Auditoria": { icon: AlertCircle, color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-900/20", label: "Aguardando Auditoria" },
  "Concluída": { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20", label: "Concluída" },
  "Cancelada": { icon: XCircle, color: "text-red-400", bg: "bg-red-50 dark:bg-red-900/20", label: "Cancelada" },
};

const tipoConfig = {
  "Inventário Geral": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  "Cíclico": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  "Específico": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

export default function AuditoriaEstoque() {
  const [conferencias, setConferencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNova, setShowNova] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    setLoading(true);
    const data = await base44.entities.ConferenciaEstoque.list("-created_date", 50);
    setConferencias(data);
    setLoading(false);
  };

  const handleCriada = (nova) => {
    setShowNova(false);
    navigate(createPageUrl(`PDVAuditoria?id=${nova.id}`));
  };

  const abrirConferencia = (conf) => {
    navigate(createPageUrl(`PDVAuditoria?id=${conf.id}`));
  };

  const grupos = {
    ativas: conferencias.filter(c => ["Em Andamento", "Aguardando Auditoria", "Rascunho"].includes(c.status)),
    concluidas: conferencias.filter(c => ["Concluída", "Cancelada"].includes(c.status)),
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold font-glacial text-gray-900 dark:text-white">Auditoria de Estoque</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">{conferencias.length} conferência{conferencias.length !== 1 ? "s" : ""}</p>
        </div>
        <Button
          onClick={() => setShowNova(true)}
          className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl h-9 px-4 text-sm font-medium shadow-none"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nova
        </Button>
      </div>

      <div className="px-4 py-4 space-y-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Ativas */}
            {grupos.ativas.length > 0 && (
              <section>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">Ativas</p>
                <div className="space-y-2">
                  {grupos.ativas.map(conf => (
                    <ConferenciaCard key={conf.id} conf={conf} onClick={abrirConferencia} />
                  ))}
                </div>
              </section>
            )}

            {/* Concluídas */}
            {grupos.concluidas.length > 0 && (
              <section>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">Histórico</p>
                <div className="space-y-2">
                  {grupos.concluidas.map(conf => (
                    <ConferenciaCard key={conf.id} conf={conf} onClick={abrirConferencia} />
                  ))}
                </div>
              </section>
            )}

            {conferencias.length === 0 && (
              <div className="text-center py-20">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhuma conferência encontrada</p>
                <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">Crie uma nova para começar</p>
              </div>
            )}
          </>
        )}
      </div>

      <NovaConferenciaDialog open={showNova} onClose={() => setShowNova(false)} onCriada={handleCriada} />
    </div>
  );
}

function ConferenciaCard({ conf, onClick }) {
  const cfg = statusConfig[conf.status] || statusConfig["Rascunho"];
  const Icon = cfg.icon;
  const itens = conf.itens_conferidos?.length || 0;

  return (
    <button
      onClick={() => onClick(conf)}
      className="w-full text-left bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <Icon className={`w-5 h-5 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{conf.nome_conferencia}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400 dark:text-gray-500">{conf.tipo_conferencia}</span>
          <span className="text-gray-200 dark:text-gray-700">·</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{itens} item{itens !== 1 ? "s" : ""}</span>
          {conf.data_inicio && (
            <>
              <span className="text-gray-200 dark:text-gray-700">·</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {format(new Date(conf.data_inicio), "dd/MM", { locale: ptBR })}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
      </div>
    </button>
  );
}