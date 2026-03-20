import React, { useState, useEffect } from 'react';
import DesignerCanvas from '@/components/designer/DesignerCanvas';
import DesignerToolbar from '@/components/designer/DesignerToolbar';
import DesignerFieldPanel from '@/components/designer/DesignerFieldPanel';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { ArrowLeft, Loader } from 'lucide-react';
import { DOCUMENTOS_DISPONIVEIS, SEEDS_LAYOUT } from '@/lib/documentosSeed';

// Campos disponíveis para arrastar para o canvas
const CAMPOS_DISPONIVEIS = [
  { id: 'razao_social', label: 'Razão Social', secao: 'titulo', w: 200, h: 20 },
  { id: 'cnpj', label: 'CNPJ', secao: 'titulo', w: 160, h: 20 },
  { id: 'endereco', label: 'Endereço', secao: 'titulo', w: 220, h: 20 },
  { id: 'telefone', label: 'Telefone', secao: 'titulo', w: 120, h: 20 },
  { id: 'numero_pedido', label: 'Nº Pedido', secao: 'cabecalho', w: 120, h: 20 },
  { id: 'data_hora', label: 'Data/Hora', secao: 'cabecalho', w: 120, h: 20 },
  { id: 'cliente_nome', label: 'Cliente', secao: 'cabecalho', w: 200, h: 20 },
  { id: 'cliente_doc', label: 'CPF/CNPJ Cliente', secao: 'cabecalho', w: 160, h: 20 },
  { id: 'vendedor', label: 'Vendedor', secao: 'cabecalho', w: 160, h: 20 },
  { id: 'caixa', label: 'Caixa/Operador', secao: 'cabecalho', w: 140, h: 20 },
  { id: 'col_codigo', label: '[Col] Código', secao: 'detalhe', w: 60, h: 20 },
  { id: 'col_descricao', label: '[Col] Descrição', secao: 'detalhe', w: 200, h: 20 },
  { id: 'col_qtd', label: '[Col] Qtd', secao: 'detalhe', w: 50, h: 20 },
  { id: 'col_preco', label: '[Col] Preço Un.', secao: 'detalhe', w: 80, h: 20 },
  { id: 'col_total', label: '[Col] Total', secao: 'detalhe', w: 80, h: 20 },
  { id: 'subtotal', label: 'Subtotal', secao: 'rodape', w: 120, h: 20 },
  { id: 'desconto', label: 'Desconto', secao: 'rodape', w: 120, h: 20 },
  { id: 'frete', label: 'Frete', secao: 'rodape', w: 120, h: 20 },
  { id: 'total', label: 'TOTAL', secao: 'rodape', w: 140, h: 24 },
  { id: 'forma_pagamento', label: 'Forma de Pagamento', secao: 'rodape', w: 200, h: 20 },
  { id: 'observacoes', label: 'Observações', secao: 'rodape', w: 240, h: 60 },
  { id: 'mensagem_rodape', label: 'Mensagem Rodapé', secao: 'rodape', w: 240, h: 20 },
  { id: 'linha_separadora', label: '─── Linha Separadora ───', secao: 'qualquer', w: 260, h: 12 },
];

// ── Tela de seleção de documento ─────────────────────────────────────────────
function SeletorDocumento({ onSelecionar }) {
  const [salvos, setSalvos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.LayoutTemplate.list('-updated_date', 50)
      .then(r => setSalvos(r || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Verifica se já tem um LayoutTemplate salvo para esse documento
  const templateSalvo = (docId) => {
    const doc = DOCUMENTOS_DISPONIVEIS.find(d => d.id === docId);
    if (!doc) return null;
    return salvos.find(t => t.tipo === doc.tipo && t.categoria === doc.categoria) || null;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <div className="px-6 py-5 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white font-glacial">
          Designer de Documentos
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Escolha o documento para editar o layout
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">
            <Loader className="w-5 h-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {DOCUMENTOS_DISPONIVEIS.map(doc => {
              const salvo = templateSalvo(doc.id);
              return (
                <button
                  key={doc.id}
                  onClick={() => onSelecionar(doc, salvo)}
                  className="p-4 text-left rounded-xl bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-800 group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">{doc.icone}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">{doc.nome}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{doc.descricao}</div>
                      <div className="mt-2">
                        {salvo ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                            ✓ Layout salvo — clique para editar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                            Padrão — clique para personalizar
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-gray-500 rotate-180 transition mt-1" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Designer principal ────────────────────────────────────────────────────────
export default function DesignerDocumento() {
  const [documentoSelecionado, setDocumentoSelecionado] = useState(null);
  const [templateExistente, setTemplateExistente] = useState(null);
  const [layout, setLayout] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [templateNome, setTemplateNome] = useState('');

  const handleSelecionar = (doc, salvo) => {
    setDocumentoSelecionado(doc);
    setTemplateExistente(salvo || null);
    setTemplateNome(doc.nome);

    // Se já tem layout salvo, usa ele. Senão usa o seed pré-plotado.
    if (salvo?.blocks_config) {
      try {
        const parsed = JSON.parse(salvo.blocks_config);
        setLayout(parsed);
        return;
      } catch {}
    }

    // Usa seed do documento
    const seed = SEEDS_LAYOUT[doc.id];
    if (seed) {
      setLayout({ ...seed, nome: doc.nome });
    } else {
      // Fallback genérico vazio
      setLayout({
        nome: doc.nome,
        largura: 302,
        secoes: {
          titulo: { altura: 100, label: 'Title' },
          cabecalho: { altura: 110, label: 'Page Header' },
          detalhe: { altura: 60, label: 'Detail' },
          rodape: { altura: 200, label: 'Page Footer' },
        },
        campos: [],
      });
    }
  };

  const handleVoltar = () => {
    setDocumentoSelecionado(null);
    setLayout(null);
    setTemplateExistente(null);
  };

  const handleSalvar = async () => {
    if (!layout || !documentoSelecionado) return;
    setSalvando(true);
    try {
      const blocksConfig = JSON.stringify(layout);
      if (templateExistente) {
        await base44.entities.LayoutTemplate.update(templateExistente.id, {
          blocks_config: blocksConfig,
          nome: templateNome,
        });
        toast.success('Layout atualizado!');
      } else {
        const novo = await base44.entities.LayoutTemplate.create({
          nome: templateNome,
          categoria: documentoSelecionado.categoria,
          tipo: documentoSelecionado.tipo,
          blocks_config: blocksConfig,
          is_default: true,
        });
        setTemplateExistente(novo);
        toast.success('Layout salvo!');
      }
    } catch {
      toast.error('Erro ao salvar layout');
    } finally {
      setSalvando(false);
    }
  };

  // ── Tela de seleção ──
  if (!documentoSelecionado || !layout) {
    return <SeletorDocumento onSelecionar={handleSelecionar} />;
  }

  // ── Editor ──
  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-950 overflow-hidden">
      <DesignerToolbar
        templateNome={templateNome}
        onNomeChange={setTemplateNome}
        onSalvar={handleSalvar}
        salvando={salvando}
        layout={layout}
        onLayoutChange={setLayout}
        onVoltar={handleVoltar}
        documentoInfo={documentoSelecionado}
      />
      <div className="flex flex-1 overflow-hidden">
        <DesignerFieldPanel campos={CAMPOS_DISPONIVEIS} />
        <DesignerCanvas
          layout={layout}
          onLayoutChange={setLayout}
          camposDisponiveis={CAMPOS_DISPONIVEIS}
        />
      </div>
    </div>
  );
}