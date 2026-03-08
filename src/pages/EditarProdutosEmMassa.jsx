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
  { id: 'area_id', label: 'ID Área', tipo: 'string', width: 'min-w-
