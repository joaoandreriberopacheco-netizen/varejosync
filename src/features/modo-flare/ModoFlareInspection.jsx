import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const HUD_Z = 10060;
const BRIEF_Z = 10070;
const LOCAL_PINS_KEY = 'p38_flare_local_pins';

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

function readLocalPins() {
  try {
    const raw = localStorage.getItem(LOCAL_PINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalPins(pins) {
  try {
    localStorage.setItem(LOCAL_PINS_KEY, JSON.stringify(pins));
  } catch {
    // noop
  }
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
  const [isListening, setIsListening] = useState(false);
  const [successMarker, setSuccessMarker] = useState(null);
  const [localPins, setLocalPins] = useState([]);
  const [syncMode, setSyncMode] = useState('loading');
  const recognitionRef = useRef(null);
  const skipClickAfterTouchRef = useRef(false);
  const successMarkerTimerRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-flare-inspection', '1');
    return () => {
      document.documentElement.removeAttribute('data-flare-inspection');
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadPins = async () => {
      try {
        const rows = await base44.entities.TargetFlare.filter({ status: 'pending' });
        if (!isMounted) return;
        const normalized = (Array.isArray(rows) ? rows : []).map((item, index) => ({
          id: item.id || `remote-${index}`,
          source_location_raw: item.source_location_raw || '',
          briefing: item.briefing || '',
          scope: 'remote',
        }));
        setLocalPins(normalized);
        setSyncMode('remote');
      } catch {
        if (!isMounted) return;
        const fallback = readLocalPins();
        setLocalPins(Array.isArray(fallback) ? fallback : []);
        setSyncMode('local');
      }
    };

    loadPins();
    return () => {
      isMounted = false;
    };
  }, []);

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
      if (!parsed) {
        toast({
          title: 'Origem desconhecida',
          description: 'Este elemento não tem data-source-location.',
          variant: 'destructive',
        });
        return;
      }
      setPendingMeta({
        ...parsed,
        component_name: componentNameFromFilePath(parsed.file_path),
      });
      const rect = el.getBoundingClientRect();
      setPendingRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      setBriefingDraft('');
      setBriefingOpen(true);
      requestAnimationFrame(() => briefingTextareaRef.current?.focus?.());
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

  const handleClick = useCallback(
    (e) => {
      if (briefingOpen) return;
      if (skipClickAfterTouchRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const el = pickElementBehindPortal(portalRef.current, e.clientX, e.clientY);
      if (el) openBriefingForElement(el);
    },
    [briefingOpen, openBriefingForElement]
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
    if (!text) {
      toast({ title: 'Escreva ou dite o briefing', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const createRemote = async () => {
        await base44.entities.TargetFlare.create({
          status: 'pending',
          file_path: pendingMeta.file_path,
          line: pendingMeta.line,
          column: pendingMeta.column,
          source_location_raw: pendingMeta.source_location_raw,
          component_name: pendingMeta.component_name,
          briefing: text,
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
              briefing: text,
              scope: 'local',
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
              briefing: text,
              scope: 'remote',
            },
            ...prev,
          ]);
        } catch {
          saveLocalFallback();
        }
      };

      setBriefingOpen(false);
      setPendingMeta(null);
      setPendingRect(null);
      setBriefingDraft('');
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
      setSaving(false);
    }
  }, [briefingDraft, pendingMeta, pendingRect, stopRecognition, syncMode, toast]);

  const pinPositions = (localPins || [])
    .map((flare) => {
      const raw = flare.source_location_raw;
      if (!raw) return null;
      let el = null;
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
      onClick={handleClick}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) handlePointer(e);
      }}
      onTouchEnd={(e) => {
        if (briefingOpen) return;
        const t = e.changedTouches[0];
        if (!t) return;
        skipClickAfterTouchRef.current = true;
        window.setTimeout(() => {
          skipClickAfterTouchRef.current = false;
        }, 500);
        const el = pickElementBehindPortal(portalRef.current, t.clientX, t.clientY);
        if (el) openBriefingForElement(el);
      }}
      role="presentation"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between border-b border-amber-500/40 bg-amber-950/85 px-4 py-2 text-sm text-amber-100"
        style={{ zIndex: HUD_Z + 1 }}
      >
        <span className="font-medium">Modo Inspeção (Flare)</span>
        <span className="opacity-90">Clique no elemento · Esc para sair</span>
        <button
          type="button"
          className="pointer-events-auto rounded-md bg-amber-800 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
          onClick={onClose}
        >
          Sair
        </button>
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
            {pendingMeta.file_path}:{pendingMeta.line}:{pendingMeta.column} · {pendingMeta.component_name}
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={toggleVoice}>
              {isListening ? <MicOff className="mr-1 h-4 w-4" /> : <Mic className="mr-1 h-4 w-4" />}
              {isListening ? 'Parar' : 'Microfone'}
            </Button>
            <Button type="button" size="sm" onClick={saveBriefing} disabled={saving}>
              {saving ? 'A guardar…' : 'Guardar (Ctrl+Enter)'}
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
