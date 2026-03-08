import React, { useState } from 'react';
import { Download, Target, BrainCircuit, AlertTriangle, Building2, Mail, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DecomposicaoIEP from '@/components/relatorios/DecomposicaoIEP';

const RelatorioPerformance = ({ dados, onClose }) => {
  // Mock de dados com contexto de negócio (categoria, lucro 90d, médias categoria)
  const {
    nome = 'Produto Exemplo',
    tipo = 'SKU',
    classeABCD = 'A',
    scoreIEP = 85,
    categoria = 'Cimento Portland',
    lucro90dias = 45200.00,
    pilares = {
      margem: { valorReal: '45.2%', score: 85, mediaCat: '38.5%' },
      giro: { valorReal: '24 dias', score: 72, mediaCat: '32 dias' },
      anexacao: { valorReal: '68%', score: 68, mediaCat: '55%' }
    },
    insight = null,
    outliers = [],
    empresa = {
      departamento: 'Inteligência & Compras',
      nome: 'VarejoSync',
      email: 'inteligencia@varejosy nc.com.br'
    }
  } = dados || {};

  // Gera diagnóstico inteligente baseado na matriz ABCD vs IEP
  const gerarDiagnostico = () => {
    const classe = classeABCD;
    const iep = scoreIEP;

    if (classe === 'A' && iep >= 70) {
      return {
        titulo: 'O GENERAL',
        texto: 'Item de elite que sustenta a empresa. Domina faturamento e margem com máxima eficiência. Use este volume para extrair prazo extra e desconto estruturado do fornecedor. Capa importante para negociação estratégica.'
      };
    }
    if (classe === 'A' && iep < 50) {
      return {
        titulo: 'GIGANTE AVARIADO',
        texto: 'Alto volume, mas motor engasgado na margem. Exigir desconto urgente do fornecedor ou revisão de mix de compra. Risco potencial de sangragem de caixa. Priorize renegociação.'
      };
    }
    if ((classe === 'C' || classe === 'D') && iep >= 70) {
      return {
        titulo: 'ESTRELA EM ASCENSÃO',
        texto: 'Vende pouco, mas margem e giro impecáveis. Dar mais exposição, aumentar investimento em PDV e campanhas. Potencial de crescimento fora da curva. Blindar estoque para oportunidade.'
      };
    }
    if ((classe === 'C' || classe === 'D') && iep < 50) {
      return {
        titulo: 'PESO MORTO',
        texto: 'Volume inexpressivo e eficiência baixa. Descontinuar rapidamente. Libera espaço e capital de giro para itens que geram retorno real.'
      };
    }
    if (classe === 'B') {
      return {
        titulo: 'COLUNA VERTEBRAL',
        texto: iep >= 70 
          ? 'Sustém a operação com equilíbrio de volume e eficiência. Manter rigor em estoque e operação. Potencial de upgrade para Classe A.'
          : 'Representa volume médio com eficiência limitada. Revisar precificação e análise competitiva. Candidato a otimização ou descontinuação.'
      };
    }

    return insight || { titulo: 'ANÁLISE PENDENTE', texto: 'Verifique dados de entrada.' };
  };

  const diagnostico = gerarDiagnostico();

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 50) return 'text-amber-500 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const handleImprimir = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const texto = encodeURIComponent(
      `📊 *Dossiê - ${nome}*\n\n` +
      `📍 Classe: ${classeABCD}\n` +
      `💪 Saúde (IEP): ${scoreIEP}\n\n` +
      `🎯 Potencial: ${pilares.margem.score}\n` +
      `⚡ Cinética: ${pilares.giro.score}\n` +
      `🧲 Magnética: ${pilares.anexacao.score}\n\n` +
      `💭 ${insight.titulo}: ${insight.texto}`
    );
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 print:fixed print:inset-0 print:bg-white print:z-auto">
      
      {/* Modal Container */}
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col max-h-[90vh] print:fixed print:inset-0 print:rounded-none print:shadow-none print:max-h-full print:bg-white print:dark:bg-white">
        
        {/* Header com Botão Fechar - Oculto na Impressão */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 print:hidden">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white font-glacial">Dossiê de Performance</h1>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Corpo Scrollável */}
        <div className="flex-1 overflow-y-auto print:overflow-visible">
          <div className="p-6 sm:p-8 print:p-0 print:min-h-screen print:flex print:flex-col print:justify-between">
            
            {/* Cabeçalho do Relatório */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6 print:pb-4 print:mb-4">
              <div className="flex justify-between items-start mb-4 print:mb-3">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none w-2/3">
                  {nome}
                </h2>
                <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold px-2 py-1 uppercase tracking-widest border border-gray-200 dark:border-gray-700 rounded">
                  {tipo === 'SKU' ? 'Unidade' : 'Nível'}
                </span>
              </div>

              {/* Contexto de Negócio: Categoria + Lucro 90d */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded p-3 mb-4 print:bg-white print:border-gray-200">
                <div className="flex justify-between items-baseline text-xs print:text-gray-700">
                  <span>
                    <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Categoria:</span>
                    <span className="text-gray-900 dark:text-white font-bold ml-2">{categoria}</span>
                  </span>
                  <span>
                    <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Lucro 90d:</span>
                    <span className="text-gray-900 dark:text-white font-bold ml-2 font-mono">
                      R$ {lucro90dias.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </span>
                </div>
              </div>

              {/* Classe + IEP */}
              <div className="flex gap-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded border border-gray-100 dark:border-gray-700">
                <div className="flex-1 text-center border-r border-gray-200 dark:border-gray-700">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Classe</p>
                  <p className="text-4xl font-black text-gray-900 dark:text-white mt-1">{classeABCD}</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">IEP Score</p>
                  <p className={`text-4xl font-black mt-1 ${getScoreColor(scoreIEP)}`}>{scoreIEP}</p>
                </div>
              </div>
            </div>

            {/* Decomposição do IEP */}
            <div className="mb-6 print:hidden">
              <DecomposicaoIEP 
                produto={{
                  margem: parseFloat(pilares.margem.valorReal),
                  giro: parseInt(pilares.giro.valorReal),
                  anexacao: parseInt(pilares.anexacao.valorReal)
                }}
                janelaGiro={dados?.janelaGiro || '90d'}
              />
            </div>

            {/* Pilares Técnicos */}
            <div className="mb-6 print:mb-4">
              <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-3 print:mb-2">
                <Target className="w-4 h-4" /> Raio-X Operacional
              </h3>
              <div className="space-y-3 print:space-y-2">
                {/* Potencial */}
                <div className="flex justify-between items-center text-sm border-b border-dashed border-gray-200 dark:border-gray-700 pb-2">
                  <div className="flex-1">
                    <span className="font-bold text-gray-700 dark:text-gray-300">Potencial (Margem)</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-2">média: {pilares.margem.mediaCat}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400 mr-2">{pilares.margem.valorReal}</span>
                    <span className={`font-black ${getScoreColor(pilares.margem.score)}`}>{pilares.margem.score}</span>
                  </div>
                </div>
                {/* Cinética */}
                <div className="flex justify-between items-center text-sm border-b border-dashed border-gray-200 dark:border-gray-700 pb-2">
                  <div className="flex-1">
                    <span className="font-bold text-gray-700 dark:text-gray-300">Cinética (Frequência)</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-2">média: {pilares.giro.mediaCat}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400 mr-2">{pilares.giro.valorReal}</span>
                    <span className={`font-black ${getScoreColor(pilares.giro.score)}`}>{pilares.giro.score}</span>
                  </div>
                </div>
                {/* Magnética */}
                <div className="flex justify-between items-center text-sm border-b border-dashed border-gray-200 dark:border-gray-700 pb-2">
                  <div className="flex-1">
                    <span className="font-bold text-gray-700 dark:text-gray-300">Magnética (Anexação)</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-2">média: {pilares.anexacao.mediaCat}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400 mr-2">{pilares.anexacao.valorReal}</span>
                    <span className={`font-black ${getScoreColor(pilares.anexacao.score)}`}>{pilares.anexacao.score}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnóstico IA */}
            <div className="bg-gray-900 dark:bg-gray-800 text-gray-100 dark:text-gray-200 p-5 rounded mb-6 print:bg-white print:text-gray-900 print:border-2 print:border-gray-900 print:mb-4">
              <h3 className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 mb-2 text-gray-400 dark:text-gray-500 print:text-gray-600">
                <BrainCircuit className="w-4 h-4" /> Diagnóstico do Sistema
              </h3>
              <p className="font-bold text-sm mb-1 uppercase print:text-gray-900">{diagnostico.titulo}</p>
              <p className="text-xs leading-relaxed opacity-90 print:text-gray-700">{diagnostico.texto}</p>
            </div>

            {/* Filtro IQR */}
            {outliers && outliers.length > 0 && (
              <div className="mb-6 print:mb-4">
                <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-3 print:mb-2">
                  <AlertTriangle className="w-4 h-4" /> Filtro de Ruído (IQR)
                </h3>
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 rounded p-3 text-xs print:bg-white print:border-rose-200">
                  <p className="text-rose-800 dark:text-rose-200 font-bold mb-2 flex items-center gap-1 print:text-rose-900">
                    <Info className="w-3 h-3" /> Itens ignorados para não distorcer a média:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-rose-700 dark:text-rose-300 print:text-rose-800">
                    {outliers.map((out, idx) => (
                      <li key={idx}>
                        <span className="font-mono font-bold">{out.sku}</span> - {out.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Rodapé */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center print:mt-4 print:pt-4 print:border-t print:border-gray-300">
              <Building2 className="w-6 h-6 mx-auto text-gray-300 dark:text-gray-600 mb-2 print:text-gray-400" />
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest print:text-gray-600">
                {empresa.departamento}
              </p>
              <p className="text-xs font-bold text-gray-900 dark:text-gray-200 uppercase mt-1 print:text-gray-800">
                {empresa.nome}
              </p>
              <div className="flex justify-center items-center gap-2 mt-2 text-[10px] text-gray-400 dark:text-gray-500 font-mono print:text-gray-600">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {empresa.email}
                </span>
                <span>|</span>
                <span>{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Botões de Ação - Ocultos na Impressão */}
        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-800 print:hidden bg-gray-50 dark:bg-gray-800/50">
          <Button
            variant="outline"
            onClick={handleWhatsApp}
            className="flex-1 text-sm dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            💬 WhatsApp
          </Button>
          <Button
            onClick={handleImprimir}
            className="flex-1 bg-gray-900 hover:bg-gray-800 text-white text-sm flex items-center justify-center gap-2 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            <Download className="w-4 h-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Estilos de Impressão Globais */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
};

export default RelatorioPerformance;