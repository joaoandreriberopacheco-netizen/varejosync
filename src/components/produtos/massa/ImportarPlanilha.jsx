import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, FileSpreadsheet, X, AlertTriangle } from 'lucide-react';
import ExcelJS from 'exceljs';
import { COLUNAS_CONFIG } from './colunasConfig';
import { toast } from 'sonner';

function getCellValue(cell) {
  if (!cell) return null;
  if (cell.value !== null && typeof cell.value === 'object' && 'result' in cell.value) {
    return cell.value.result ?? null;
  }
  return cell.value ?? null;
}

function concatHierarquia(h1, h2, h3, h4, h5) {
  return [h1, h2, h3, h4, h5].map(v => (v || '').trim()).filter(Boolean).join(' ').trim();
}

export default function ImportarPlanilha({ onParsed }) {
  const [arquivo, setArquivo] = useState(null);
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef(null);

  const handleArquivo = useCallback(async (file) => {
    if (!file) return;
    setArquivo(file);
    setParsing(true);

    try {
      // 1. Carregar produtos para comparação
      let produtosAtuais = [];
      let skip = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const batch = await base44.entities.Produto.list('-updated_date', pageSize, skip);
        if (batch.length === 0) hasMore = false;
        else { produtosAtuais = produtosAtuais.concat(batch); skip += pageSize; }
      }
      const mapaAtual = {};
      produtosAtuais.forEach(p => { mapaAtual[p.id] = p; });

      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const ws = wb.worksheets[0];

      const headerRow = ws.getRow(1);
      const colIndexMap = {};
      headerRow.eachCell((cell, colNumber) => {
        const label = (getCellValue(cell) || '').toString().trim();
        const colConfig = COLUNAS_CONFIG.find(c => c.label === label);
        if (colConfig) colIndexMap[colConfig.key] = colNumber;
      });

      const alterados = [];
      const erros = [];

      for (let i = 2; i <= ws.rowCount; i++) {
        const row = ws.getRow(i);
        const idCell = row.getCell(colIndexMap['id']);
        const h1Cell = row.getCell(colIndexMap['campo_hierarquico_1']);
        
        const id = String(getCellValue(idCell) || '').trim();
        const h1 = String(getCellValue(h1Cell) || '').trim();

        if (!id && !h1) continue;

        const dadosExtraidos = {};
        let erroNaLinha = false;
        
        // --- DETECTOR DE ERROS POR COLUNA ---
        for (const col of COLUNAS_CONFIG) {
          if (col.editavel && !col.calculado) {
            const cell = row.getCell(colIndexMap[col.key]);
            const valorBruto = getCellValue(cell);
            
            if (col.tipo === 'numero') {
              const num = parseFloat(valorBruto);
              if (isNaN(num)) {
                // Se for um campo que não pode ser vazio, avisa a linha e a coluna
                erros.push({ 
                  linha: i, 
                  mensagem: `Linha ${i}: Coluna "${col.label}" deve ser um NÚMERO e está vazia ou inválida.` 
                });
                erroNaLinha = true;
              }
              dadosExtraidos[col.key] = isNaN(num) ? 0 : num;
            } else {
              dadosExtraidos[col.key] = valorBruto ? String(valorBruto).trim() : '';
            }
          }
        }

        // Validação específica do campo 'tipo'
        if (!dadosExtraidos.tipo || dadosExtraidos.tipo === '') {
           erros.push({ 
             linha: i, 
             mensagem: `Linha ${i}: O campo "Tipo" é obrigatório e não foi encontrado.` 
           });
           erroNaLinha = true;
        }

        if (erroNaLinha) continue; // Pula esta linha se tiver erro e vai para a próxima

        // Limpeza de segurança (remove o campo 'numero' se ele tentar entrar)
        delete dadosExtraidos.numero;

        const nome = concatHierarquia(
          dadosExtraidos.campo_hierarquico_1,
          dadosExtraidos.campo_hierarquico_2,
          dadosExtraidos.campo_hierarquico_3,
          dadosExtraidos.campo_hierarquico_4,
          dadosExtraidos.campo_hierarquico_5
        );
        dadosExtraidos.nome = nome;

        if (id && mapaAtual[id]) {
          alterados.push({ id, dados: dadosExtraidos, nome, isNew: false });
        } else if (!id && h1) {
          alterados.push({ id: null, dados: dadosExtraidos, nome, isNew: true });
        }
      }

      // Se houver erros, avisamos o usuário com um Toast
      if (erros.length > 0) {
        toast.error(`Encontrados ${erros.length} erros na planilha. Verifique a lista.`);
