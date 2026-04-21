import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, Mic } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  clearLocalPins,
  createFlareEntry,
  listAllRemoteFlares,
  listPendingFlaresLocalFirst,
  purgeAllRemoteFlares,
  resolveFlareById,
  writeLocalPins,
} from '@/features/modo-flare/flareQueue';

const HUD_Z = 110000;
const BRIEF_Z = 120000;
function pickElementBehindPortal(portalEl, clientX, clientY) {
  if (!portalEl) return null;
  const prev = portalEl.style.visibility;
  portalEl.style.visibility = 'hidden';
  const hit = document.elementFromPoint(clientX, clientY);
  portalEl.style.visibility = prev || '';
  return hit?.closest?.('[data-source-location]') ?? null;
}

function parseDataSourceLocation(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const match = raw.trim().match(/^(.+):(\d+):(\d+)$/);
  if (!match) return null;
  return {
    file_path: match[1].replace(/\\/g, '/'),
    line: Number(match[2]),
    column: Number(match[3]),
    source_location_raw: raw.trim(),
  };
}

function componentNameFromFilePath(filePath) {
  const base = (filePath || '').split('/').pop() || 'Desconhecido';
  return base.replace(/\.(jsx?|tsx?)$/i, '') || base;
}

export default function ModoFlareInspection({ onClose }) {
  const { toast } = useToast();
  const portalRef = useRef(null);
  const briefingTextareaRef = useRef(null);

  const [briefingOpen, setBriefingOpen] = useState(false);
  const [briefingDraft, setBriefingDraft] = useState('');
  const [pendingMeta, setPendingMeta] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [localPins, setLocalPins] = useState([]);
  const [syncMode, setSyncMode] = useState('loading');
  const [adminBusy, setAdminBusy] = useState(false);
  const [precheckCount, setPrecheckCount] = useState(null);
  const [smokeRunning, setSmokeRunning] = useState(false);
  const [reportExporting, setReportExporting] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef(null);
  const voiceSessionActiveRef = useRef(false);
  const voiceBaseTextRef = useRef('');
  const voiceFinalTextRef = useRef('');
  const remoteListFailureNotifiedRef = useRef(false);
  const purchasePins = useMemo(() => {
    return localPins
      .filter((flare) => {
        const file = String(flare?.file_path || '').toLowerCase();
        const route = String(flare?.route || '').toLowerCase();
        const component = String(flare?.component_name || '').toLowerCase();
        const text = `${file} ${route} ${component}`;
        return (
          text.includes('pedidocompra') ||
          text.includes('pedido_compra') ||
          text.includes('pedido-compra') ||
          text.includes('compras')
        );
      })
      .sort((a, b) => {
        if (a.confidence !== b.confidence) {
          return a.confidence === 'high' ? -1 : 1;
        }
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
  }, [localPins]);

  const otherPins = useMemo(() => {
    const purchaseIds = new Set(purchasePins.map((p) => p.id));
    return localPins
      .filter((flare) => !purchaseIds.has(flare.id))
      .sort((a, b) => {
        if (a.confidence !== b.confidence) {
          return a.confidence === 'high' ? -1 : 1;
        }
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
  }, [localPins, purchasePins]);

  const listStatusFooter = useMemo(() => {
    const n = localPins.length;
    if (syncMode === 'loading') {
      return `${n} marcas · a sincronizar origem…`;
    }
    if (syncMode === 'remote') {
      return `${n} marcas · origem: nuvem`;
    }
    return `${n} marcas · origem: neste dispositivo`;
  }, [syncMode, localPins.length]);

  const applyPendingListResult = useCallback(
    (result) => {
      setLocalPins(result.items);
      setSyncMode(result.mode);
      if (result.mode === 'remote' && !result.remoteFetchFailed) {
        remoteListFailureNotifiedRef.current = false;
      }
      if (result.remoteFetchFailed && !remoteListFailureNotifiedRef.current) {
        remoteListFailureNotifiedRef.current = true;
        toast({
          title: 'Ligação à nuvem em pausa',
          description:
            'Estamos a mostrar só as marcas deste dispositivo. Quando a ligação voltar, a lista na nuvem atualiza.',
        });
      }
    },
    [toast]
  );

  const reloadPins = useCallback(async () => {
    const result = await listPendingFlaresLocalFirst();
    applyPendingListResult(result);
  }, [applyPendingListResult]);

  const resolvePin = useCallback(
    async (flare) => {
      try {
        await resolveFlareById(flare, flare?.confidence === 'high' ? 'high' : 'medium');
        setLocalPins((prev) => prev.filter((item) => item.id !== flare.id));
        toast({
          title: 'Marca resolvida',
          description: `Precisão: ${flare?.confidence === 'high' ? 'alta' : 'média'}.`,
        });
      } catch {
        toast({
          title: 'Não foi possível concluir',
          description: 'Não conseguimos marcar esta entrada como resolvida. Tenta outra vez.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-flare-inspection', '1');
    return () => {
      document.documentElement.removeAttribute('data-flare-inspection');
    };
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(Boolean(SpeechRecognition));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadPins = async () => {
      const result = await listPendingFlaresLocalFirst();
      if (!isMounted) return;
      applyPendingListResult(result);
    };

    loadPins();
    return () => {
      isMounted = false;
    };
  }, [applyPendingListResult]);

  const runPrecheckCount = useCallback(async () => {
    setAdminBusy(true);
    try {
      const all = await listAllRemoteFlares();
      setPrecheckCount(all.length);
      toast({
        title: 'Precheck concluído',
        description: `Total na nuvem: ${all.length} registo(s).`,
      });
      return all.length;
    } catch {
      setPrecheckCount(null);
      toast({
        title: 'Precheck indisponível',
        description: 'Não foi possível consultar o backend agora.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setAdminBusy(false);
    }
  }, [toast]);

  const runFullCleanup = useCallback(async () => {
    setAdminBusy(true);
    try {
      const before = await runPrecheckCount();
      const purge = await purgeAllRemoteFlares();
      clearLocalPins();
      writeLocalPins([]);
      await reloadPins();
      const afterRows = await listAllRemoteFlares();
      const after = afterRows.length;
      toast({
        title: 'Limpeza de flares concluída',
        description: `Antes: ${before ?? '?'} · removidos: ${purge.removed} · falhas: ${purge.failed} · depois: ${after}.`,
        variant: after === 0 && purge.failed === 0 ? 'default' : 'destructive',
      });
    } catch {
      toast({
        title: 'Falha na limpeza total',
        description: 'Não foi possível completar a limpeza remota/local.',
        variant: 'destructive',
      });
    } finally {
      setAdminBusy(false);
    }
  }, [reloadPins, runPrecheckCount, toast]);

  const runSmokeNewFlare = useCallback(async () => {
    setSmokeRunning(true);
    try {
      const targetEl = document.querySelector('[data-source-location]');
      if (!targetEl) {
        toast({
          title: 'Smoke test sem alvo',
          description: 'Nenhum elemento com data-source-location disponível nesta tela.',
          variant: 'destructive',
        });
        return;
      }
      const raw = targetEl.getAttribute('data-source-location');
      const parsed = parseDataSourceLocation(raw);
      if (!parsed) {
        toast({
          title: 'Smoke test inválido',
          description: 'Elemento encontrado sem coordenada válida.',
          variant: 'destructive',
        });
        return;
      }
      const created = await base44.entities.TargetFlare.create({
        status: 'pending',
        ...parsed,
        component_name: componentNameFromFilePath(parsed.file_path),
        briefing: 'Smoke test pós-limpeza',
        action_briefing: 'Smoke test pós-limpeza',
        context_image_url: '',
        confidence: 'high',
        route: window.location.pathname || '',
      });
      await reloadPins();
      await resolveFlareById({ id: created?.id, scope: 'remote', confidence: 'high' }, 'high');
      await reloadPins();
      toast({
        title: 'Smoke test concluído',
        description: 'Novo flare criado e resolvido com sucesso após limpeza.',
      });
    } catch {
      toast({
        title: 'Falha no smoke test',
        description: 'Não foi possível validar criação/resolução pós-limpeza.',
        variant: 'destructive',
      });
    } finally {
      setSmokeRunning(false);
    }
  }, [reloadPins, toast]);

  const resolveAllPurchasePins = useCallback(async () => {
    if (!purchasePins.length) {
      toast({ title: 'Sem flares de compras pendentes' });
      return;
    }
    setAdminBusy(true);
    try {
      await Promise.all(
        purchasePins.map((flare) =>
          resolveFlareById(flare, flare?.confidence === 'high' ? 'high' : 'medium')
        )
      );
      await reloadPins();
      toast({
        title: 'Rodada de compras concluída',
        description: `${purchasePins.length} flare(s) marcado(s) como resolved.`,
      });
    } catch {
      toast({
        title: 'Falha ao fechar rodada',
        description: 'Não foi possível resolver todos os flares de compras.',
        variant: 'destructive',
      });
    } finally {
      setAdminBusy(false);
    }
  }, [purchasePins, reloadPins, toast]);

  const exportFlarePendingReport = useCallback(async () => {
    setReportExporting(true);
    try {
      const rows = await base44.entities.TargetFlare.filter({ status: 'pending' }, '-created_date', 500);
      const items = Array.isArray(rows) ? rows : rows?.data ?? [];
      const payload = {
        exportedAt: new Date().toISOString(),
        count: items.length,
        items,
      };
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `flare-pending-${stamp}.json`;
      const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: 'Relatório exportado',
        description: `${items.length} pendente(s). Ficheiro: ${filename} — podes copiar para docs/flare-export/ para o Cursor.`,
      });
    } catch {
      toast({
        title: 'Exportação falhou',
        description: 'Não foi possível obter os pendentes na nuvem. Verifica sessão e permissões.',
        variant: 'destructive',
      });
    } finally {
      setReportExporting(false);
    }
  }, [toast]);

  const stopRecognition = useCallback(() => {
    voiceSessionActiveRef.current = false;
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // noop
    }
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (briefingOpen) {
          setBriefingOpen(false);
          setPendingMeta(null);
          setBriefingDraft('');
          stopRecognition();
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [briefingOpen, onClose, stopRecognition]);

  const openBriefingForElement = useCallback(
    (el) => {
      const raw = el.getAttribute('data-source-location');
      const parsed = parseDataSourceLocation(raw);
      const confidence = parsed ? 'high' : 'medium';
      setPendingMeta({
        file_path: parsed?.file_path || '',
        line: parsed?.line || null,
        column: parsed?.column || null,
        source_location_raw: parsed?.source_location_raw || '',
        component_name: componentNameFromFilePath(parsed?.file_path || ''),
        confidence,
      });
      setBriefingDraft('');
      setBriefingOpen(true);
      requestAnimationFrame(() => briefingTextareaRef.current?.focus?.());
      if (confidence === 'medium') {
        toast({
          title: 'Sem coordenada de código neste elemento',
          description: 'Será registado com confiança média. Detalhe o briefing e inclua imagem se ajudar.',
        });
      }
    },
    [toast]
  );

  const selectElementAtPoint = useCallback(
    (x, y) => {
      const el = pickElementBehindPortal(portalRef.current, x, y);
      if (el) openBriefingForElement(el);
    },
    [openBriefingForElement]
  );

  useEffect(() => () => stopRecognition(), [stopRecognition]);

  const toggleVoice = useCallback(async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: 'Voz não suportada neste navegador', variant: 'destructive' });
      return;
    }
    if (isListening) {
      stopRecognition();
      return;
    }
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        toast({
          title: 'Microfone bloqueado',
          description:
            'Permita o microfone para este site (ícone na barra de endereço) e volte a tocar em Microfone.',
          variant: 'destructive',
        });
        return;
      }
    }
    voiceBaseTextRef.current = (briefingTextareaRef.current?.value || briefingDraft || '').trim();
    voiceFinalTextRef.current = '';
    briefingTextareaRef.current?.focus?.();
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    voiceSessionActiveRef.current = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      if (!voiceSessionActiveRef.current || recognitionRef.current !== recognition) {
        setIsListening(false);
        recognitionRef.current = null;
        return;
      }
      window.setTimeout(() => {
        if (!voiceSessionActiveRef.current || recognitionRef.current !== recognition) return;
        if (document.visibilityState === 'hidden') return;
        try {
          recognition.start();
        } catch {
          voiceSessionActiveRef.current = false;
          setIsListening(false);
          recognitionRef.current = null;
        }
      }, 250);
    };
    recognition.onerror = (event) => {
      const code = event?.error || '';
      if (code === 'no-speech') return;
      if (code === 'aborted' && voiceSessionActiveRef.current) return;
      voiceSessionActiveRef.current = false;
      setIsListening(false);
      recognitionRef.current = null;
      const descriptions = {
        'not-allowed':
          'Permissão negada para microfone ou reconhecimento de voz. Verifique HTTPS e as permissões do site.',
        'audio-capture': 'Não foi possível captar áudio. Verifique o microfone.',
        network: 'Falha de rede no serviço de reconhecimento de voz.',
        'service-not-allowed': 'Serviço de voz não permitido neste contexto (navegador ou política).',
      };
      toast({
        title: 'Reconhecimento de voz',
        description: descriptions[code] || (code ? `Erro: ${code}` : 'Erro desconhecido.'),
        variant: 'destructive',
      });
    };
    recognition.onresult = (event) => {
      let partial = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const texto = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          voiceFinalTextRef.current = `${voiceFinalTextRef.current} ${texto}`.trim();
        } else {
          partial = `${partial} ${texto}`.trim();
        }
      }
      const spoken = `${voiceFinalTextRef.current} ${partial}`.trim();
      const next = [voiceBaseTextRef.current, spoken].filter(Boolean).join(' ').trim();
      setBriefingDraft(next);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      voiceSessionActiveRef.current = false;
      setIsListening(false);
      recognitionRef.current = null;
      toast({
        title: 'Microfone',
        description: 'Não foi possível iniciar o reconhecimento de voz.',
        variant: 'destructive',
      });
    }
  }, [briefingDraft, isListening, stopRecognition, toast]);

  const saveBriefing = useCallback(async () => {
    if (!pendingMeta) return;
    const text = briefingDraft.trim();
    if (!text) {
      toast({ title: 'Escreva ou dite o briefing', variant: 'destructive' });
      return;
    }
    if (pendingMeta.confidence === 'medium' && text.length < 30) {
      toast({
        title: 'Alvo de média precisão incompleto',
        description: 'Descreva o briefing com mais detalhe para permitir pinpoint.',
        variant: 'destructive',
      });
      return;
    }

    const meta = pendingMeta;
    setSaving(true);
    const imageUrl = '';

    let savedOrigin = 'local';
    try {
      const created = await createFlareEntry(
        {
          ...meta,
          route: window.location.pathname || '',
        },
        text,
        { context_image_url: imageUrl }
      );
      savedOrigin = created.origin;
      setSyncMode(created.origin === 'remote' ? 'remote' : 'local');
      setLocalPins((prev) => {
        if (created.origin === 'remote') {
          return [created.item, ...prev];
        }
        return [created.item, ...prev.filter((p) => p.scope !== 'remote')];
      });

      setBriefingOpen(false);
      setPendingMeta(null);
      setBriefingDraft('');
      stopRecognition();
      toast({
        title: 'Bandeirinha registada',
        description: `Podes continuar a marcar outros elementos. Origem: ${
          savedOrigin === 'remote' ? 'nuvem' : 'neste dispositivo'
        }.`,
      });
    } finally {
      setSaving(false);
    }
  }, [
    briefingDraft,
    pendingMeta,
    stopRecognition,
    toast,
  ]);

  const hud = (
    <div
      ref={portalRef}
      className="fixed inset-0 touch-none"
      style={{ zIndex: HUD_Z }}
      onPointerDownCapture={(e) => {
        const target = e.target;
        if (target?.closest?.('[data-flare-control]')) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      onClickCapture={(e) => {
        const target = e.target;
        if (target?.closest?.('[data-flare-control]')) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerUpCapture={(e) => {
        const target = e.target;
        if (target?.closest?.('[data-flare-control]')) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      onWheel={(e) => e.preventDefault()}
      onPointerUp={(e) => {
        if (briefingOpen) return;
        const target = e.target;
        if (target?.closest?.('[data-flare-control]')) return;
        e.preventDefault();
        e.stopPropagation();
        selectElementAtPoint(e.clientX, e.clientY);
      }}
      role="presentation"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between border-b border-slate-700/50 bg-slate-900/90 px-4 py-2 text-sm text-slate-100 backdrop-blur-sm"
        style={{ zIndex: HUD_Z + 1 }}
      >
        <span className="font-medium">Marcar melhorias</span>
        <span className="hidden opacity-90 sm:inline">Toca num elemento · Esc para sair</span>
        <div className="flex items-center gap-2" data-flare-control="1">
          <span className="rounded-md border border-slate-600/50 bg-slate-800/80 px-2 py-1 text-[11px] text-slate-200">
            {localPins.length} marcas
          </span>
          <button
            type="button"
            data-flare-control="1"
            className="pointer-events-auto rounded-md bg-slate-700 px-3 py-1 text-xs font-medium text-white hover:bg-slate-600"
            onClick={onClose}
          >
            Sair
          </button>
        </div>
      </div>
      {!queueOpen ? (
        <div className="absolute right-4 top-14" style={{ zIndex: HUD_Z + 2 }} data-flare-control="1">
          <button
            type="button"
            data-flare-control="1"
            className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-slate-600/50 bg-slate-900/90 px-3 py-2 text-xs font-medium text-slate-100 shadow-md backdrop-blur-sm hover:bg-slate-800/95"
            onClick={() => setQueueOpen(true)}
          >
            Pendentes ({localPins.length})
            <ChevronDown className="h-4 w-4 opacity-80" aria-hidden />
          </button>
        </div>
      ) : (
        <div
          className="absolute right-4 top-14 w-[360px] rounded-lg border border-slate-600/40 bg-slate-950/90 p-3 text-xs text-slate-100 shadow-xl backdrop-blur-sm"
          style={{ zIndex: HUD_Z + 2 }}
          data-flare-control="1"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-50">Marcas pendentes</p>
            <button
              type="button"
              data-flare-control="1"
              className="pointer-events-auto flex items-center gap-1 rounded-md border border-slate-600/50 bg-slate-800/80 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700/80"
              onClick={() => setQueueOpen(false)}
              title="Fechar painel"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Fechar
            </button>
          </div>
          <p className="mb-2 text-[10px] text-slate-400">
            Compras: {purchasePins.length} · Outros: {otherPins.length} · Total: {localPins.length}
          </p>
          <Collapsible open={teamOpen} onOpenChange={setTeamOpen} className="mb-3">
            <CollapsibleTrigger
              type="button"
              data-flare-control="1"
              className="pointer-events-auto flex w-full items-center justify-between rounded-md border border-slate-600/40 bg-slate-900/60 px-2 py-1.5 text-left text-[11px] font-medium text-slate-200 hover:bg-slate-800/80"
            >
              Equipa (avançado)
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${teamOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 border-slate-600 bg-slate-900/40 px-2 text-[10px] pointer-events-auto text-slate-200 hover:bg-slate-800"
                  data-flare-control="1"
                  onClick={() => {
                    void runPrecheckCount();
                  }}
                  disabled={adminBusy}
                >
                  Precheck
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 border-slate-600 bg-slate-900/40 px-2 text-[10px] pointer-events-auto text-slate-200 hover:bg-slate-800"
                  data-flare-control="1"
                  onClick={() => {
                    void runFullCleanup();
                  }}
                  disabled={adminBusy}
                >
                  Limpar tudo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 border-slate-600 bg-slate-900/40 px-2 text-[10px] pointer-events-auto text-slate-200 hover:bg-slate-800"
                  data-flare-control="1"
                  onClick={() => {
                    void runSmokeNewFlare();
                  }}
                  disabled={smokeRunning || adminBusy}
                >
                  Smoke
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 border-slate-600 bg-slate-900/40 px-2 text-[10px] pointer-events-auto text-slate-200 hover:bg-slate-800"
                  data-flare-control="1"
                  onClick={() => {
                    void resolveAllPurchasePins();
                  }}
                  disabled={adminBusy}
                >
                  Fechar compras
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 border-slate-600 bg-slate-900/40 px-2 text-[10px] pointer-events-auto text-slate-200 hover:bg-slate-800"
                  data-flare-control="1"
                  onClick={() => {
                    void reloadPins();
                  }}
                  disabled={adminBusy}
                >
                  Recarregar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 border-slate-600 bg-slate-900/40 px-2 text-[10px] pointer-events-auto text-slate-200 hover:bg-slate-800"
                  data-flare-control="1"
                  onClick={() => {
                    void exportFlarePendingReport();
                  }}
                  disabled={adminBusy || reportExporting}
                  title="Descarrega JSON no mesmo formato que npm run flare:export"
                >
                  {reportExporting ? 'A exportar…' : 'Exportar relatório'}
                </Button>
              </div>
              {precheckCount != null ? (
                <p className="text-[10px] text-slate-500">Nuvem (total): {precheckCount} registo(s).</p>
              ) : null}
            </CollapsibleContent>
          </Collapsible>
          <div className="max-h-56 space-y-3 overflow-auto pr-1">
            {purchasePins.length > 0 ? (
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">Compras</p>
                <div className="space-y-2">
                  {purchasePins.slice(0, 8).map((flare) => (
                    <div key={flare.id} className="rounded-md border border-slate-600/40 bg-slate-900/50 p-2">
                      <p className="mb-1 text-[9px] uppercase tracking-wide text-slate-500">
                        {flare.scope === 'remote' ? 'Nuvem' : 'Dispositivo'}
                      </p>
                      <p className="line-clamp-2 text-[11px] text-slate-100">{flare.action_briefing || flare.briefing}</p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {flare.confidence} · {flare.component_name || 'sem componente'} · {flare.route || '/'}
                      </p>
                      {flare.file_path && flare.line && flare.column ? (
                        <p className="mt-1 break-all font-mono text-[10px] text-slate-500">
                          {flare.file_path}:{flare.line}:{flare.column}
                        </p>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 h-6 border-slate-600 px-2 text-[10px] pointer-events-auto text-slate-200"
                        data-flare-control="1"
                        onClick={() => {
                          void resolvePin(flare);
                        }}
                      >
                        Marcar como resolvida
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {otherPins.length > 0 ? (
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">Outros</p>
                <div className="space-y-2">
                  {otherPins.slice(0, 24).map((flare) => (
                    <div key={flare.id} className="rounded-md border border-slate-600/40 bg-slate-900/50 p-2">
                      <p className="mb-1 text-[9px] uppercase tracking-wide text-slate-500">
                        {flare.scope === 'remote' ? 'Nuvem' : 'Dispositivo'}
                      </p>
                      <p className="line-clamp-2 text-[11px] text-slate-100">{flare.action_briefing || flare.briefing}</p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {flare.confidence} · {flare.component_name || 'sem componente'} · {flare.route || '/'}
                      </p>
                      {flare.file_path && flare.line && flare.column ? (
                        <p className="mt-1 break-all font-mono text-[10px] text-slate-500">
                          {flare.file_path}:{flare.line}:{flare.column}
                        </p>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 h-6 border-slate-600 px-2 text-[10px] pointer-events-auto text-slate-200"
                        data-flare-control="1"
                        onClick={() => {
                          void resolvePin(flare);
                        }}
                      >
                        Marcar como resolvida
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {purchasePins.length === 0 && otherPins.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-600/50 bg-slate-900/30 p-3 text-[11px] leading-relaxed text-slate-400">
                {syncMode === 'loading'
                  ? 'A sincronizar…'
                  : 'Nada por aqui — marca um elemento no ecrã ou espera pela sincronização com a equipa.'}
              </p>
            ) : null}
          </div>
        </div>
      )}

      <div
        className="pointer-events-none absolute bottom-4 left-4 max-w-md rounded-md border border-slate-700/40 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 backdrop-blur-sm"
        style={{ zIndex: HUD_Z + 2 }}
      >
        {listStatusFooter}
      </div>
    </div>
  );

  const briefingLayer =
    briefingOpen && pendingMeta ? (
      <div
        className="fixed inset-0 flex items-center justify-center bg-black/50 p-4"
        style={{ zIndex: BRIEF_Z }}
        role="dialog"
        aria-modal="true"
      >
        <div className="relative w-full max-w-lg rounded-lg border bg-background p-6 shadow-xl">
          <h2 className="mb-2 text-lg font-semibold">Nota para este ponto</h2>
          <p className="mb-4 font-mono text-xs text-muted-foreground">
            {(pendingMeta.file_path && pendingMeta.line && pendingMeta.column)
              ? `${pendingMeta.file_path}:${pendingMeta.line}:${pendingMeta.column}`
              : 'Sem coordenada de código neste elemento'}{' '}
            · {pendingMeta.component_name} · confiança {pendingMeta.confidence}
          </p>
          <Textarea
            ref={briefingTextareaRef}
            value={briefingDraft}
            onChange={(e) => setBriefingDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void saveBriefing();
              }
            }}
            placeholder="Descreva o problema ou a melhoria…"
            className="min-h-[120px] resize-y"
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={isListening ? 'default' : 'outline'}
              size="sm"
              onClick={toggleVoice}
              aria-pressed={isListening}
              aria-label={isListening ? 'Parar fala para texto' : 'Iniciar fala para texto'}
            >
              <Mic className="mr-1 h-4 w-4" />
              {isListening ? 'Parar fala para texto' : 'Fala para texto'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void saveBriefing();
              }}
              disabled={saving}
            >
              {saving ? 'A guardar…' : 'Guardar'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {voiceSupported
                ? isListening
                  ? 'A ouvir... fale naturalmente para preencher as observações.'
                  : 'Dica: use fala para texto para descrever rápido o contexto.'
                : 'Fala para texto indisponível neste navegador.'}
            </span>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      {createPortal(hud, document.body)}
      {briefingLayer ? createPortal(briefingLayer, document.body) : null}
    </>
  );
}
