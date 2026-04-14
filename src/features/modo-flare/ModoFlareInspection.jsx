import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  clearLocalPins,
  listAllRemoteFlares,
  listPendingFlaresLocalFirst,
  purgeAllRemoteFlares,
  resolveFlareById,
  writeLocalPins,
} from '@/features/modo-flare/flareQueue';

const HUD_Z = 10060;
const BRIEF_Z = 10070;
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

  const [highlight, setHighlight] = useState(null);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [briefingDraft, setBriefingDraft] = useState('');
  const [pendingMeta, setPendingMeta] = useState(null);
  const [pendingRect, setPendingRect] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [successMarker, setSuccessMarker] = useState(null);
  const [localPins, setLocalPins] = useState([]);
  const [syncMode, setSyncMode] = useState('loading');
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [actionBriefingDraft, setActionBriefingDraft] = useState('');
  const [adminBusy, setAdminBusy] = useState(false);
  const [precheckCount, setPrecheckCount] = useState(null);
  const [smokeRunning, setSmokeRunning] = useState(false);
  const recognitionRef = useRef(null);
  const successMarkerTimerRef = useRef(null);
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

  const reloadPins = useCallback(async () => {
    const result = await listPendingFlaresLocalFirst();
    setLocalPins(result.items);
    setSyncMode(result.mode);
  }, []);

  const resolvePin = useCallback(
    async (flare) => {
      try {
        await resolveFlareById(flare, flare?.confidence === 'high' ? 'high' : 'medium');
        setLocalPins((prev) => prev.filter((item) => item.id !== flare.id));
        toast({
          title: 'Alvo resolvido',
          description: `Precisão usada: ${flare?.confidence === 'high' ? 'high' : 'medium'}.`,
        });
      } catch {
        toast({
          title: 'Falha ao resolver alvo',
          description: 'Não foi possível atualizar o status para resolved.',
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
    let isMounted = true;

    const loadPins = async () => {
      const result = await listPendingFlaresLocalFirst();
      if (!isMounted) return;
      setLocalPins(result.items);
      setSyncMode(result.mode);
    };

    loadPins();
    return () => {
      isMounted = false;
    };
  }, []);

  const runPrecheckCount = useCallback(async () => {
    setAdminBusy(true);
    try {
      const all = await listAllRemoteFlares();
      setPrecheckCount(all.length);
      toast({
        title: 'Precheck concluído',
        description: `${all.length} flare(s) remoto(s) encontrados antes da limpeza.`,
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
        action_briefing: 'Validar fluxo pending -> resolved após limpeza total',
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

  useEffect(
    () => () => {
      if (successMarkerTimerRef.current) {
        clearTimeout(successMarkerTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (briefingOpen) {
          setBriefingOpen(false);
          setPendingMeta(null);
          setPendingRect(null);
          setBriefingDraft('');
          setActionBriefingDraft('');
          setSelectedImageFile(null);
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [briefingOpen, onClose]);

  const updateHighlight = useCallback((clientX, clientY) => {
    const el = pickElementBehindPortal(portalRef.current, clientX, clientY);
    if (!el) {
      setHighlight(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setHighlight({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    });
  }, []);

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
      const rect = el.getBoundingClientRect();
      setPendingRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      setBriefingDraft('');
      setActionBriefingDraft('');
      setSelectedImageFile(null);
      setBriefingOpen(true);
      requestAnimationFrame(() => briefingTextareaRef.current?.focus?.());
      if (confidence === 'medium') {
        toast({
          title: 'Sem coordenada source-location',
          description: 'Este alvo será salvo com confiança média. Detalhe a ação e inclua imagem.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const handlePointer = useCallback(
    (e) => {
      if (briefingOpen) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX;
      const y = e.clientY ?? e.touches?.[0]?.clientY;
      if (x == null || y == null) return;
      updateHighlight(x, y);
    },
    [briefingOpen, updateHighlight]
  );

  const selectElementAtPoint = useCallback(
    (x, y) => {
      const el = pickElementBehindPortal(portalRef.current, x, y);
      if (el) openBriefingForElement(el);
    },
    [openBriefingForElement]
  );

  const stopRecognition = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // noop
    }
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

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
        // optional
      }
    }
    briefingTextareaRef.current?.focus?.();
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    let finalTranscript = '';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onresult = (event) => {
      let partial = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const texto = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalTranscript = `${finalTranscript} ${texto}`.trim();
        } else {
          partial = `${partial} ${texto}`.trim();
        }
      }
      setBriefingDraft(`${finalTranscript} ${partial}`.trim());
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, [isListening, stopRecognition, toast]);

  const saveBriefing = useCallback(() => {
    if (!pendingMeta) return;
    const text = briefingDraft.trim();
    const actionText = actionBriefingDraft.trim() || text;
    if (!text) {
      toast({ title: 'Escreva ou dite o briefing', variant: 'destructive' });
      return;
    }
    if (!actionText) {
      toast({ title: 'Descreva a ação esperada', variant: 'destructive' });
      return;
    }
    if (pendingMeta.confidence === 'medium' && (!selectedImageFile || text.length < 30)) {
      toast({
        title: 'Alvo de média precisão incompleto',
        description: 'Inclua imagem e um briefing mais detalhado para permitir pinpoint.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    setUploadingImage(Boolean(selectedImageFile));
    const saveRemoteOrLocal = async () => {
      let imageUrl = '';
      if (selectedImageFile) {
        try {
          const upload = await base44.integrations.Core.UploadFile({ file: selectedImageFile });
          imageUrl = upload?.file_url || '';
        } catch {
          imageUrl = '';
        }
      }
      const createRemote = async () => {
        await base44.entities.TargetFlare.create({
          status: 'pending',
          file_path: pendingMeta.file_path,
          line: pendingMeta.line,
          column: pendingMeta.column,
          source_location_raw: pendingMeta.source_location_raw,
          component_name: pendingMeta.component_name,
          briefing: text,
          action_briefing: actionText,
          context_image_url: imageUrl,
          confidence: pendingMeta.confidence,
          route: window.location.pathname || '',
        });
      };

      const saveLocalFallback = () => {
        setSyncMode('local');
        setLocalPins((prev) => {
          const next = [
            {
              id: `local-${Date.now()}`,
              source_location_raw: pendingMeta.source_location_raw,
              file_path: pendingMeta.file_path,
              line: pendingMeta.line,
              column: pendingMeta.column,
              component_name: pendingMeta.component_name,
              route: window.location.pathname || '',
              briefing: text,
              action_briefing: actionText,
              context_image_url: imageUrl,
              confidence: pendingMeta.confidence,
              scope: 'local',
              status: 'pending',
              created_at: new Date().toISOString(),
            },
            ...prev.filter((p) => p.scope !== 'remote'),
          ];
          writeLocalPins(next);
          return next;
        });
      };

      const saveRemoteOrLocal = async () => {
        try {
          await createRemote();
          setSyncMode('remote');
          setLocalPins((prev) => [
            {
              id: `remote-${Date.now()}`,
              source_location_raw: pendingMeta.source_location_raw,
              file_path: pendingMeta.file_path,
              line: pendingMeta.line,
              column: pendingMeta.column,
              component_name: pendingMeta.component_name,
              route: window.location.pathname || '',
              briefing: text,
              action_briefing: actionText,
              context_image_url: imageUrl,
              confidence: pendingMeta.confidence,
              scope: 'remote',
              status: 'pending',
              created_at: new Date().toISOString(),
            },
            ...prev,
          ]);
        } catch {
          saveLocalFallback();
        }
      };
      await saveRemoteOrLocal();
    };

    try {
      setBriefingOpen(false);
      setPendingMeta(null);
      setPendingRect(null);
      setBriefingDraft('');
      setActionBriefingDraft('');
      setSelectedImageFile(null);
      stopRecognition();
      void saveRemoteOrLocal();

      if (pendingRect) {
        setSuccessMarker({
          top: pendingRect.top,
          left: pendingRect.left,
          width: pendingRect.width,
          height: pendingRect.height,
        });
        if (successMarkerTimerRef.current) {
          clearTimeout(successMarkerTimerRef.current);
        }
        successMarkerTimerRef.current = window.setTimeout(() => {
          setSuccessMarker(null);
          successMarkerTimerRef.current = null;
        }, 1200);
      }
      toast({
        title: 'Bandeirinha fincada com sucesso',
        description:
          syncMode === 'remote'
            ? 'Podes continuar navegando e marcar outro elemento.'
            : 'Guardada localmente. Podes continuar navegando e marcar outro elemento.',
      });
    } finally {
      setUploadingImage(false);
      setSaving(false);
    }
  }, [
    actionBriefingDraft,
    briefingDraft,
    pendingMeta,
    pendingRect,
    selectedImageFile,
    stopRecognition,
    syncMode,
    toast,
  ]);

  const pinPositions = (localPins || [])
    .map((flare) => {
      const raw = flare.source_location_raw;
      let el = null;
      if (!raw) return null;
      try {
        const q = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(raw) : raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        el = document.querySelector(`[data-source-location="${q}"]`);
      } catch {
        el = null;
      }
      if (!el) return { flare, rect: null };
      const r = el.getBoundingClientRect();
      return {
        flare,
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
      };
    })
    .filter(Boolean);

  const hud = (
    <div
      ref={portalRef}
      className="fixed inset-0 touch-none"
      style={{ zIndex: HUD_Z, cursor: 'crosshair' }}
      onWheel={(e) => e.preventDefault()}
      onMouseMove={handlePointer}
      onMouseLeave={() => setHighlight(null)}
      onPointerMove={(e) => {
        if (briefingOpen) return;
        updateHighlight(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (briefingOpen) return;
        const target = e.target;
        if (target?.closest?.('[data-flare-control]')) return;
        e.preventDefault();
        selectElementAtPoint(e.clientX, e.clientY);
      }}
      role="presentation"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between border-b border-amber-500/40 bg-amber-950/85 px-4 py-2 text-sm text-amber-100"
        style={{ zIndex: HUD_Z + 1 }}
      >
        <span className="font-medium">Modo Inspeção (Flare)</span>
        <span className="opacity-90">Clique no elemento · Esc para sair</span>
        <div className="flex items-center gap-2" data-flare-control="1">
          <span className="rounded bg-amber-900/60 px-2 py-1 text-[11px]">{pinPositions.length} alvo(s)</span>
          <button
            type="button"
            data-flare-control="1"
            className="pointer-events-auto rounded-md bg-amber-800 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
            onClick={onClose}
          >
            Sair
          </button>
        </div>
      </div>
      <div
        className="absolute right-4 top-14 w-[360px] rounded-md border border-amber-500/30 bg-black/75 p-3 text-xs text-amber-50"
        style={{ zIndex: HUD_Z + 2 }}
        data-flare-control="1"
      >
        <p className="mb-2 text-[11px] uppercase tracking-wide text-amber-200/90">Fila local de caça</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] pointer-events-auto"
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
            className="h-6 px-2 text-[10px] pointer-events-auto"
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
            className="h-6 px-2 text-[10px] pointer-events-auto"
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
            className="h-6 px-2 text-[10px] pointer-events-auto"
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
            className="h-6 px-2 text-[10px] pointer-events-auto"
            data-flare-control="1"
            onClick={() => {
              void reloadPins();
            }}
            disabled={adminBusy}
          >
            Recarregar
          </Button>
        </div>
        {precheckCount != null ? (
          <p className="mb-2 text-[10px] opacity-80">Precheck remoto: {precheckCount} registro(s).</p>
        ) : null}
        <p className="mb-2 text-[10px] opacity-80">
          Compras: {purchasePins.length} pendente(s) · Total: {localPins.length}
        </p>
        <div className="max-h-56 space-y-2 overflow-auto pr-1">
          {purchasePins.slice(0, 8).map((flare) => (
            <div key={flare.id} className="rounded border border-amber-500/20 bg-amber-950/20 p-2">
              <p className="line-clamp-2 text-[11px]">{flare.action_briefing || flare.briefing}</p>
              <p className="mt-1 text-[10px] opacity-80">
                {flare.confidence} · {flare.component_name || 'sem componente'} · {flare.route || '/'}
              </p>
              {(flare.file_path && flare.line && flare.column) ? (
                <p className="mt-1 break-all font-mono text-[10px] opacity-70">
                  {flare.file_path}:{flare.line}:{flare.column}
                </p>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2 h-6 px-2 text-[10px] pointer-events-auto"
                data-flare-control="1"
                onClick={() => {
                  void resolvePin(flare);
                }}
              >
                Marcar resolved
              </Button>
            </div>
          ))}
          {purchasePins.length === 0 ? (
            <p className="text-[11px] opacity-75">Sem alvos pendentes de compras.</p>
          ) : null}
        </div>
      </div>

      {highlight && (
        <div
          className="pointer-events-none absolute rounded border-2 border-sky-400 bg-sky-400/10 shadow-[0_0_0_1px_rgba(56,189,248,0.4)]"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            zIndex: HUD_Z + 2,
          }}
        />
      )}

      {successMarker && (
        <div
          className="pointer-events-none absolute flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300 bg-emerald-500/90 text-base text-white shadow-lg"
          style={{
            top: successMarker.top + 4,
            left: successMarker.left + successMarker.width - 16,
            zIndex: HUD_Z + 4,
          }}
          title="Bandeirinha fincada com sucesso"
        >
          ✓
        </div>
      )}

      {pinPositions.map(
        (p) =>
          p.rect && (
            <div
              key={p.flare.id}
              className="pointer-events-none absolute text-lg leading-none drop-shadow"
              style={{
                top: p.rect.top + 4,
                left: p.rect.left + p.rect.width - 24,
                zIndex: HUD_Z + 3,
              }}
              title={p.flare.briefing}
            >
              🚩
            </div>
          )
      )}

      <div
        className="pointer-events-none absolute bottom-4 left-4 max-w-md rounded-md bg-gray-900/90 px-3 py-2 text-xs text-white"
        style={{ zIndex: HUD_Z + 2 }}
      >
        {syncMode === 'remote'
          ? 'Fase 2 ativa: bandeirinhas sincronizadas com backend.'
          : syncMode === 'loading'
            ? 'Fase 2: verificando backend...'
            : 'Fase 2 ativa: fallback local (backend indisponível).'}
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
          <h2 className="mb-1 text-lg font-semibold">Briefing do alvo</h2>
          <p className="mb-3 font-mono text-xs text-muted-foreground">
            {(pendingMeta.file_path && pendingMeta.line && pendingMeta.column)
              ? `${pendingMeta.file_path}:${pendingMeta.line}:${pendingMeta.column}`
              : 'Sem source-location (fallback visual)'}{' '}
            · {pendingMeta.component_name} · confiança {pendingMeta.confidence}
          </p>
          <Textarea
            ref={briefingTextareaRef}
            value={briefingDraft}
            onChange={(e) => setBriefingDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                saveBriefing();
              }
            }}
            placeholder="Descreva o bug ou melhoria…"
            className="min-h-[120px] resize-y"
          />
          <Textarea
            value={actionBriefingDraft}
            onChange={(e) => setActionBriefingDraft(e.target.value)}
            placeholder="Ação esperada (ex.: alinhar botão, corrigir validação, ajustar cálculo)"
            className="mt-3 min-h-[80px] resize-y"
          />
          <div className="mt-3">
            <label className="mb-1 block text-xs text-muted-foreground">Imagem de contexto (opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedImageFile(e.target.files?.[0] || null)}
              className="block w-full text-xs"
            />
            {selectedImageFile ? (
              <p className="mt-1 text-xs text-muted-foreground">Anexo: {selectedImageFile.name}</p>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={toggleVoice}>
              {isListening ? <MicOff className="mr-1 h-4 w-4" /> : <Mic className="mr-1 h-4 w-4" />}
              {isListening ? 'Parar' : 'Microfone'}
            </Button>
            <Button type="button" size="sm" onClick={saveBriefing} disabled={saving}>
              {saving || uploadingImage ? 'A guardar…' : 'Guardar (Ctrl+Enter)'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setBriefingOpen(false);
                setPendingMeta(null);
                setPendingRect(null);
                setBriefingDraft('');
                setActionBriefingDraft('');
                setSelectedImageFile(null);
                stopRecognition();
              }}
            >
              Cancelar
            </Button>
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
