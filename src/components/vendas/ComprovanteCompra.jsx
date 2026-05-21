import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Printer, Zap, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { imprimirCupomTermico } from '@/functions/imprimirCupomTermico';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { renderTemplate, prepararDadosVenda } from '@/lib/templateEngine';
import { shareOrDownloadBlob, shouldUseMobileDocumentExport } from '@/lib/mobilePrintAndShare';
import CupomVendaLayout, { CUPOM_LARGURA_UTIL_PX } from '@/components/vendas/cupom/CupomVendaLayout';
import CupomVendaA4Shell from '@/components/vendas/cupom/CupomVendaA4Shell';
import { criarIndiceContextoVenda } from '@/lib/contextoVendaIntegrado';
import {
  CUPOM_PAPEL_MM,
  CUPOM_LARGURA_UTIL_MM,
  FONT_TERMICA,
  CUPOM_LINE_HEIGHT_TERMICO,
  HTML2CANVAS_TERMICO,
  wrapCupomHtmlForPrint,
  addCupomImageToPdf80,
  estiloEscalaVerticalCupomTermico,
} from '@/lib/cupomTermico80';

function PreviewScaled({ children, docWidthPx = CUPOM_LARGURA_UTIL_PX }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calc = () => {
      if (!containerRef.current) return;
      const available = containerRef.current.offsetWidth - 32;
      setScale(Math.min(1, available / docWidthPx));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [docWidthPx]);

  return (
    <div ref={containerRef} className="w-full flex justify-center py-4 px-4">
      <div
        style={{
          width: docWidthPx,
          transformOrigin: 'top center',
          transform: `scale(${scale})`,
        }}
      >
        <div className="shadow-2xl rounded-sm overflow-hidden bg-white">{children}</div>
      </div>
    </div>
  );
}

function TemplateRenderer({ htmlContent }) {
  return (
    <div
      id="cupom-print"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{
        width: `${CUPOM_LARGURA_UTIL_MM}mm`,
        maxWidth: '100%',
        background: '#fff',
        color: '#000',
        fontFamily: FONT_TERMICA,
        fontWeight: 400,
        lineHeight: CUPOM_LINE_HEIGHT_TERMICO,
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
        ...estiloEscalaVerticalCupomTermico,
      }}
    />
  );
}

export default function ComprovanteCompra({ pedido, indiceContexto: indiceContextoProp, open, onClose }) {
  const indiceContexto = React.useMemo(() => {
    if (indiceContextoProp) return indiceContextoProp;
    if (!pedido) return null;
    return criarIndiceContextoVenda({ pedidos: [pedido] });
  }, [indiceContextoProp, pedido]);

  const [dadosEmpresa, setDadosEmpresa] = useState(null);
  const [ipImpressora, setIpImpressora] = useState('');
  const [imprimindoTermica, setImprimindoTermica] = useState(false);
  const [formato, setFormato] = useState('80mm');
  const [gerando, setGerando] = useState(false);
  const [templates, setTemplates] = useState({ '80mm': null, a4: null });

  useEffect(() => {
    if (!open) return;
    base44.entities.DadosEmpresa.list().then((r) => r?.length && setDadosEmpresa(r[0])).catch(() => {});
    const ip = localStorage.getItem('ip_impressora_termica');
    if (ip) setIpImpressora(ip);
    base44.entities.ComprovanteTemplate.filter({ is_default: true })
      .then((tpls) => {
        const map = { '80mm': null, a4: null };
        tpls.forEach((t) => {
          if (t.tipo === 'venda_80mm') map['80mm'] = t;
          if (t.tipo === 'venda_a4') map.a4 = t;
        });
        setTemplates(map);
      })
      .catch(() => {});
  }, [open]);

  const renderCupomBody = () => {
    if (formato === 'a4') {
      return (
        <CupomVendaA4Shell pedido={pedido} dadosEmpresa={dadosEmpresa} indiceContexto={indiceContexto} />
      );
    }
    if (templates['80mm'] && dadosEmpresa !== undefined) {
      return (
        <TemplateRenderer
          htmlContent={renderTemplate(
            templates['80mm'].html_template,
            prepararDadosVenda(pedido, dadosEmpresa)
          )}
        />
      );
    }
    return (
      <CupomVendaLayout
        pedido={pedido}
        dadosEmpresa={dadosEmpresa}
        indiceContexto={indiceContexto}
        variant="termico"
      />
    );
  };

  const handlePrint = async () => {
    const el = document.getElementById('cupom-print');
    if (!el) return;

    if (shouldUseMobileDocumentExport()) {
      setGerando(true);
      try {
        const pdf = await gerarPDF();
        if (!pdf) {
          toast.error('Não foi possível montar o PDF');
          return;
        }
        const fileName = `pedido-${pedido?.numero || 'comprovante'}.pdf`;
        const r = await shareOrDownloadBlob(
          pdf.output('blob'),
          fileName,
          'application/pdf',
          `Pedido ${pedido?.numero || ''}`
        );
        if (r === 'downloaded') toast.success('PDF pronto — use Abrir em para imprimir');
      } catch (e) {
        if (e?.name !== 'AbortError') toast.error('Erro ao gerar PDF');
      } finally {
        setGerando(false);
      }
      return;
    }

    const html =
      formato === 'a4'
        ? `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pedido ${pedido?.numero || ''}</title>
           <style>*{box-sizing:border-box}@page{size:A4 portrait;margin:10mm}body{margin:0;background:#fff}</style></head>
           <body>${el.outerHTML}</body></html>`
        : wrapCupomHtmlForPrint(el.outerHTML, `Pedido ${pedido?.numero || ''}`);

    const old = document.getElementById('print-frame');
    if (old) old.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'print-frame';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);

    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => iframe.remove(), 2000);
      }, 350);
    };
  };

  const gerarPDF = async () => {
    const el = document.getElementById('cupom-print');
    if (!el) return null;

    const isA4 = formato === 'a4';
    const canvas = await html2canvas(el, isA4 ? { scale: 2, useCORS: true, backgroundColor: '#ffffff' } : HTML2CANVAS_TERMICO);
    const imgData = canvas.toDataURL('image/png');

    if (isA4) {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const ratio = canvas.width / canvas.height;
      const imgH = pageW / ratio;
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, Math.min(imgH, 297));
      return pdf;
    }

    const conteudoMm = CUPOM_LARGURA_UTIL_MM;
    const heightMm = (canvas.height / canvas.width) * conteudoMm;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [CUPOM_PAPEL_MM, Math.max(40, heightMm + 8)],
    });
    addCupomImageToPdf80(pdf, imgData, canvas);
    return pdf;
  };

  const handleShare = async () => {
    setGerando(true);
    try {
      const pdf = await gerarPDF();
      if (!pdf) {
        toast.error('Não foi possível montar o PDF');
        return;
      }
      const fileName = `pedido-${pedido?.numero || 'comprovante'}.pdf`;
      const r = await shareOrDownloadBlob(
        pdf.output('blob'),
        fileName,
        'application/pdf',
        `Pedido ${pedido?.numero || ''}`
      );
      if (r === 'downloaded') toast.success('PDF gerado com sucesso');
    } catch (e) {
      if (e?.name !== 'AbortError') toast.error('Erro ao gerar PDF');
    } finally {
      setGerando(false);
    }
  };

  const handleImprimirTermica = async () => {
    if (!ipImpressora) {
      toast.error('Informe o IP da impressora térmica');
      return;
    }
    setImprimindoTermica(true);
    try {
      const response = await imprimirCupomTermico({
        pedido_id: pedido.id,
        ip_impressora: ipImpressora,
      });
      if (response.data.success) {
        toast.success('Cupom enviado para impressora térmica!');
        localStorage.setItem('ip_impressora_termica', ipImpressora);
      } else {
        toast.error(response.data.error || 'Erro ao imprimir');
      }
    } catch {
      toast.error('Falha na comunicação com a impressora');
    } finally {
      setImprimindoTermica(false);
    }
  };

  if (!open || !pedido) return null;

  const previewWidth = formato === 'a4' ? Math.round(210 * 3.7795) : CUPOM_LARGURA_UTIL_PX;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-100 dark:bg-gray-950">
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 font-glacial">
          Comprovante
        </span>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            disabled={gerando}
            size="sm"
            variant="outline"
            className="h-9 text-xs gap-1.5 rounded-xl px-3"
            title="Imprimir"
          >
            {gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
          </Button>
          <Button
            onClick={handleShare}
            disabled={gerando}
            size="sm"
            className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white h-9 text-xs gap-1.5 rounded-xl px-4"
          >
            {gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
            {gerando ? 'Gerando...' : 'PDF'}
          </Button>
        </div>
      </div>

      <div className="px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Formato:</span>
          <Button
            onClick={() => setFormato('80mm')}
            size="sm"
            variant={formato === '80mm' ? 'default' : 'outline'}
            className="h-8 text-xs"
          >
            80 mm (72 útil)
          </Button>
          <Button
            onClick={() => setFormato('a4')}
            size="sm"
            variant={formato === 'a4' ? 'default' : 'outline'}
            className="h-8 text-xs"
          >
            A4
          </Button>
          <span className="text-[10px] text-gray-400 w-full sm:w-auto">
            Térmica: Arial, preto sólido, margem esq. extra (compensa desvio)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="IP impressora térmica (ex: 192.168.1.100)"
            value={ipImpressora}
            onChange={(e) => setIpImpressora(e.target.value)}
            className="h-8 text-xs flex-1"
          />
          <Button
            onClick={handleImprimirTermica}
            disabled={imprimindoTermica}
            size="sm"
            className="h-8 bg-green-600 hover:bg-green-700 text-white whitespace-nowrap gap-1.5 text-xs"
          >
            <Zap className="w-3.5 h-3.5" />
            {imprimindoTermica ? 'Enviando...' : 'Térmica'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <PreviewScaled docWidthPx={previewWidth}>{renderCupomBody()}</PreviewScaled>
      </div>
    </div>
  );
}
