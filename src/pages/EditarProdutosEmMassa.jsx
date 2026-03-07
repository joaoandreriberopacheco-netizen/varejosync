import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Monitor } from 'lucide-react';
import GradeEdicaoMassiva from '@/components/produtos/GradeEdiacaoMassiva';
import FiltrosProdutosEmMassa from '@/components/produtos/FiltrosProdutosEmMassa';

export default function EditarProdutosEmMassa() {
  const [isMobile, setIsMobile] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ busca: '', categoria: '', ativo: 'todos' });
  const [salvarLoading, setSalvarLoading] = useState(false);

  // Detectar tamanho da tela
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Carregar produtos
  useEffect(() => {
    if (!isMobile) {
      carregarProdutos();
    }
  }, [isMobile]);

  const carregarProdutos = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.Produto.list();
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar produtos
  const produtosFiltrados = produtos.filter(produto => {
    const matchBusca = !filtros.busca || 
      produto.nome?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      produto.codigo_interno?.includes(filtros.busca);
    
    const matchCategoria = !filtros.categoria || produto.categoria_id === filtros.categoria;
    
    const matchAtivo = filtros.ativo === 'todos' || 
      (filtros.ativo === 'ativo' ? produto.ativo : !produto.ativo);
    
    return matchBusca && matchCategoria && matchAtivo;
  });

  // Definição de colunas AG Grid
  const columnDefs = [
    { field: 'codigo_interno', headerName: 'Código', width: 100, editable: false },
    { field: 'nome', headerName: 'Produto', width: 250, editable: false },
    {
      field: 'valor_compra',
      headerName: 'Valor Compra',
      width: 120,
      editable: true,
      type: 'rightAligned',
      cellClass: (p) => {
        const val = p.data?.valor_compra;
        return val < 0 ? 'bg-red-100 dark:bg-red-900/20' : '';
      }
    },
    {
      field: 'preco_venda_padrao',
      headerName: 'Preço Venda',
      width: 120,
      editable: true,
      type: 'rightAligned',
      cellClass: (p) => {
        const val = p.data?.preco_venda_padrao;
        const custo = p.data?.valor_compra || 0;
        if (val < custo) return 'bg-red-100 dark:bg-red-900/20';
        const margem = ((val - custo) / val) * 100;
        return margem < 20 ? 'bg-yellow-100 dark:bg-yellow-900/20' : '';
      }
    },
    {
      field: 'preco_venda_percentual',
      headerName: 'Margem %',
      width: 110,
      editable: true,
      type: 'rightAligned'
    },
    { field: 'estoque_atual', headerName: 'Estoque', width: 90, editable: false, type: 'rightAligned' },
    { field: 'estoque_minimo', headerName: 'Mínimo', width: 90, editable: true, type: 'rightAligned' },
    { field: 'ativo', headerName: 'Ativo', width: 70, editable: true, type: 'boolean' }
  ];

  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    suppressMovable: false
  };

  const handleCellValueChanged = (event) => {
    const { data, field, newValue, oldValue } = event;
    
    // Aplicar parser de fórmula se for número
    let valorFinal = newValue;
    if (['valor_compra', 'preco_venda_padrao', 'preco_venda_percentual', 'estoque_minimo'].includes(field)) {
      valorFinal = avaliarFormula(newValue);
    }

    if (valorFinal === oldValue) return;

    setAlteracoes(prev => ({
      ...prev,
      [data.id]: {
        ...(prev[data.id] || {}),
        [field]: valorFinal
      }
    }));
  };

  const handleSalvar = async () => {
    try {
      setSalvarLoading(true);
      
      const updates = Object.entries(alteracoes).map(([id, dados]) => ({
        id,
        ...dados,
      }));

      if (updates.length > 0) {
        for (const update of updates) {
          await base44.entities.Produto.update(update.id, update);
        }
        setAlteracoes({});
        await carregarProdutos();
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setSalvarLoading(false);
    }
  };

  const handleUndo = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.undoCellEditing();
    }
  };

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6 bg-white dark:bg-gray-900">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center max-w-sm">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Monitor className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </div>
          </div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Disponível apenas em desktop
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            A edição em massa de produtos é otimizada para telas grandes. Use um computador ou tablet em modo paisagem para acessar esta funcionalidade.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-glacial font-semibold text-gray-900 dark:text-white">
              Editar Produtos em Massa
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {produtosFiltrados.length} produto{produtosFiltrados.length !== 1 ? 's' : ''}
              {Object.keys(alteracoes).length > 0 && ` • ${Object.keys(alteracoes).length} alteração${Object.keys(alteracoes).length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleUndo}
              variant="outline"
              size="sm"
              className="gap-2"
              title="Desfazer (Ctrl+Z)"
            >
              <RotateCcw className="w-4 h-4" />
              Desfazer
            </Button>
            <Button
              onClick={handleSalvar}
              disabled={Object.keys(alteracoes).length === 0 || salvarLoading}
              size="sm"
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="w-4 h-4" />
              {salvarLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <FiltrosProdutosEmMassa 
        filtros={filtros}
        onFiltrosChange={setFiltros}
      />

      {/* Grade AG Grid */}
      <div className="flex-1 overflow-hidden ag-theme-quartz dark:ag-theme-quartz-dark">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 dark:text-gray-400">Carregando produtos...</div>
          </div>
        ) : (
          <AgGridReact
            ref={gridRef}
            rowData={produtosFiltrados}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            onCellValueChanged={handleCellValueChanged}
            undoRedoCellEditing={true}
            undoRedoCellEditingLimit={50}
            animateRows={true}
            domLayout="normal"
            suppressCellFocus={false}
            suppressRowClickSelection={false}
            suppressMovableColumns={true}
            getRowClass={(p) => alteracoes[p.data.id] ? 'bg-blue-50 dark:bg-blue-900/10' : ''}
          />
        )}
      </div>
    </div>
  );
}