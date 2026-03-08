import React, { useState, useEffect } from 'react';
import { Produto } from '@/entities/Produto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Calculator, Filter, Loader2, ClipboardPaste, RotateCcw, Plus } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

// 1. DICIONÁRIO DE COLUNAS DA ENTIDADE (Excluindo as calculadas pelo sistema)
const COLUNAS_ENTIDADE = [
  { id: 'codigo_interno', label: 'Cód. Interno', tipo: 'string', width: 'min-w-[100px]' },
  { id: 'codigo_barras', label: 'Cód. Barras', tipo: 'string', width: 'min-w-[120px]' },
  { id: 'campo_hierarquico_1', label: 'Nível 1 (*)', tipo: 'string', width: 'min-w-[150px]' },
  { id: 'campo_hierarquico_2', label: 'Nível 2', tipo: 'string', width: 'min-w-[120px]' },
  { id: 'campo_hierarquico_3', label: 'Nível 3', tipo: 'string', width: 'min-w-[120px]' },
  { id: 'campo_hierarquico_4', label: 'Nível 4', tipo: 'string', width: 'min-w-[120px]' },
  { id: 'campo_hierarquico_5', label: 'Nível 5', tipo: 'string', width: 'min-w-[120px]' },
  { id: 'categoria_id', label: 'ID Categoria', tipo: 'string', width: 'min-w-[120px]' },
  { id: 'categoria_nome', label: 'Nome Categoria', tipo: 'string', width: 'min-w-[150px]' },
  { id: 'area_id', label: 'ID Área', tipo: 'string', width: 'min-w-[120px]' },
  { id: 'area_codigo', label: 'Cód. Área', tipo: 'string', width: 'min-w-[100px]' },
  { id: 'marca', label: 'Marca', tipo: 'string', width: 'min-w-[120px]' },
  { id: 'imagem_url', label: 'URL Imagem', tipo: 'string', width: 'min-w-[150px]' },
  { id: 'tags', label: 'Tags (separar por vírgula)', tipo: 'string', width: 'min-w-[180px]' },
  { id: 'tipo', label: 'Tipo (*)', tipo: 'string', width: 'min-w-[100px]' },
  { id: 'valor_compra', label: 'Valor Compra', tipo: 'number', width: 'min-w-[120px]' },
  { id: 'custo_frete_padrao', label: 'Frete', tipo: 'number', width: 'min-w-[100px]' },
  { id: 'custo_imposto1_padrao', label: 'Imposto 1', tipo: 'number', width: 'min-w-[100px]' },
  { id: 'custo_imposto2_padrao', label: 'Imposto 2', tipo: 'number', width: 'min-w-[100px]' },
  { id: 'custo_outros_padrao', label: 'Outros Custos', tipo: 'number', width: 'min-w-[120px]' },
  { id: 'desconto_compra_padrao', label: 'Desconto Compra', tipo: 'number', width: 'min-w-[120px]' },
  { id: 'preco_venda_padrao', label: 'Preço Venda (*)', tipo: 'number', width: 'min-w-[120px]' },
  { id: 'preco_venda_percentual', label: 'Markup %', tipo: 'number', width: 'min-w-[100px]' },
  { id: 'fornecedor_padrao_id', label: 'ID Fornecedor', tipo: 'string', width: 'min-w-[120px]' },
  { id: 'fornecedor_padrao_codigo', label: 'Cód. Fornecedor', tipo: 'string', width: 'min-w-[120px]' },
  { id: 'dimensoes_cm', label: 'Dimensões (AxLxP)', tipo: 'string', width: 'min-w-[150px]' },
  { id: 'peso_kg', label: 'Peso (Kg)', tipo: 'number', width: 'min-w-[100px]' },
  { id: 'tempo_reposicao_dias', label: 'Dias Reposição', tipo: 'number', width: 'min-w-[120px]' },
  { id: 'estoque_minimo', label: 'Estoque Mín.', tipo: 'number', width: 'min-w-[100px]' },
  { id: 'estoque_ideal', label: 'Estoque Ideal', tipo: 'number', width: 'min-w-[100px]' },
  { id: 'estoque_maximo', label: 'Estoque Máx.', tipo: 'number', width: 'min-w-[100px]' },
  { id: 'estoque_avariado', label: 'Estoque Avariado', tipo: 'number', width: 'min-w-[120px]' },
  { id: 'unidade_principal', label: 'Unidade Princ.', tipo: 'string', width: 'min-w-[100px]' },
  { id: 'unidades_por_pacote', label: 'Unid. por Pacote', tipo: 'number', width: 'min-
