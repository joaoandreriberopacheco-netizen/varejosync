const pending = [
  {
    id: 'h1',
    status: 'pending',
    confidence: 'high',
    file_path: 'src/pages/FluxoCaixa.jsx',
    line: 120,
    column: 8,
    action_briefing: 'Corrigir cálculo de saldo diário',
    context_image_url: '',
  },
  {
    id: 'h2',
    status: 'pending',
    confidence: 'high',
    file_path: 'src/pages/FluxoCaixa.jsx',
    line: 240,
    column: 12,
    action_briefing: 'Ajustar label de filtros',
    context_image_url: '',
  },
  {
    id: 'h3',
    status: 'pending',
    confidence: 'high',
    file_path: 'src/components/caixa/TabelaResumo.jsx',
    line: 44,
    column: 5,
    action_briefing: 'Garantir ordenação por data',
    context_image_url: '',
  },
  {
    id: 'm1',
    status: 'pending',
    confidence: 'medium',
    file_path: '',
    line: null,
    column: null,
    action_briefing: 'Ajustar alinhamento do card principal',
    context_image_url: 'https://example.com/flare-context.png',
  },
];

const high = pending.filter((item) => item.confidence === 'high');
const mediumWithImage = pending.filter((item) => item.confidence === 'medium' && item.context_image_url);

if (high.length !== 3) {
  throw new Error(`[acceptance] Esperado 3 alvos high-confidence, recebido ${high.length}.`);
}
if (mediumWithImage.length !== 1) {
  throw new Error('[acceptance] Esperado 1 alvo medium com imagem de contexto.');
}

const resolved = pending.map((item) => ({
  ...item,
  status: 'resolved',
  resolution_precision: item.confidence === 'high' ? 'high' : 'medium',
}));

const unresolved = resolved.filter((item) => item.status !== 'resolved');
if (unresolved.length > 0) {
  throw new Error('[acceptance] Existem alvos que não transitaram para resolved.');
}

console.log('[acceptance] OK: 3 high + 1 imagem, ciclo pending -> resolved validado.');
