import React, { useState } from 'react';
import DesignerCanvas from '@/components/designer/DesignerCanvas';
import DesignerToolbar from '@/components/designer/DesignerToolbar';
import DesignerFieldPanel from '@/components/designer/DesignerFieldPanel';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

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

const LAYOUT_INICIAL = {
  nome: 'Comprovante de Venda',
  largura: 302, // ~80mm em px a 96dpi
  secoes: {
    titulo: { altura: 100, label: 'Title' },
    cabecalho: { altura: 110, label: 'Page Header' },
    detalhe: { altura: 60, label: 'Detail' },
    rodape: { altura: 200, label: 'Page Footer' },
    sumario: { altura: 40, label: 'Summary' },
  },
  campos: [],
};

export default function DesignerDocumento() {
  const [layout, setLayout] = useState(LAYOUT_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [templateNome, setTemplateNome] = useState('Comprovante de Venda');

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const blocksConfig = JSON.stringify(layout);
      const existentes = await base44.entities.LayoutTemplate.filter({ nome: templateNome });
      if (existentes?.length > 0) {
        await base44.entities.LayoutTemplate.update(existentes[0].id, {
          blocks_config: blocksConfig,
          nome: templateNome,
        });
        toast.success('Layout atualizado!');
      } else {
        await base44.entities.LayoutTemplate.create({
          nome: templateNome,
          categoria: 'comprovante',
          tipo: 'venda',
          blocks_config: blocksConfig,
          is_default: true,
        });
        toast.success('Layout salvo!');
      }
    } catch (e) {
      toast.error('Erro ao salvar layout');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-950 overflow-hidden">
      <DesignerToolbar
        templateNome={templateNome}
        onNomeChange={setTemplateNome}
        onSalvar={handleSalvar}
        salvando={salvando}
        layout={layout}
        onLayoutChange={setLayout}
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