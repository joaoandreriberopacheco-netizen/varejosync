import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2 } from "lucide-react";
import ConferenciaEditorComponent from "@/components/estoque/auditoria/ConferenciaEditor.jsx";

export default function ConferenciaEditorPage() {
  const [conferencia, setConferencia] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");

  useEffect(() => {
    if (!id) { navigate(createPageUrl("ConferenciaEstoque")); return; }
    base44.entities.ConferenciaEstoque.filter({ id }).then(res => {
      if (res?.length > 0) setConferencia(res[0]);
      else navigate(createPageUrl("ConferenciaEstoque"));
      setLoading(false);
    });
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  );

  if (!conferencia) return null;

  return (
    <ConferenciaEditorComponent
      conferencia={conferencia}
      onVoltar={() => navigate(createPageUrl("ConferenciaEstoque"))}
    />
  );
}