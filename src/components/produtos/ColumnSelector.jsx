import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Columns, Package, DollarSign, Truck, Settings } from 'lucide-react';

export default function ColumnSelector({ visibleColumns, onColumnsChange, open, onClose }) {
  // Ensure visibleColumns is always an array
  const [tempColumns, setTempColumns] = useState(Array.isArray(visibleColumns) ? visibleColumns : []);

  const columnGroups = {
    descritivo: {
      name: 'Descritivos',
      icon: Package,
      columns: [
        { id: 'status', label: 'Status' },
        { id: 'codigo_interno', label: 'Código Interno' },
        { id: 'codigo_barras', label: 'Código de Barras' },
        { id: 'categoria', label: 'Categoria' },
        { id: 'tags', label: 'Tags' }
      ]
    },
    comercial: {
      name: 'Comerciais',
      icon: DollarSign,
      columns: [
        { id: 'fornecedor', label: 'Fornecedor Padrão' },
        { id: 'preco_venda', label: 'Preço Venda' },
        { id: 'margem', label: 'Margem Bruta' },
        { id: 'show_comercial', label: 'Unidade comercial (PDV)' }
      ],
      subgroups: [
        {
          name: 'Custos & Markup',
          columns: [
            { id: 'preco_custo', label: 'Custo Total' },
            { id: 'valor_compra', label: 'Valor Compra' },
            { id: 'markup', label: 'Markup %' },
            { id: 'inventario_valorizado', label: 'Inventário Valorizado' }
          ]
        }
      ]
    },
    logistico: {
      name: 'Logísticos',
      icon: Truck,
      columns: [
        { id: 'estoque_atual', label: 'Estoque Atual' },
        { id: 'show_logistica', label: 'Unidade de exibição (sigla)' },
        { id: 'estoque_minimo', label: 'Estoque Mínimo' },
        { id: 'estoque_ideal', label: 'Estoque Ideal' },
        { id: 'estoque_maximo', label: 'Estoque Máximo' },
        { id: 'tempo_reposicao', label: 'Tempo Reposição' },
        { id: 'peso', label: 'Peso' },
        { id: 'dimensoes', label: 'Dimensões' }
      ]
    },
    sistema: {
      name: 'Sistema',
      icon: Settings,
      columns: [
        { id: 'tipo', label: 'Tipo' },
        { id: 'unidade', label: 'Unidade' },
        { id: 'unidades_pacote', label: 'Unidades/Pacote' }
      ]
    }
  };

  const handleToggleColumn = (columnId) => {
    if (columnId === 'produto') return; // Produto sempre visível
    setTempColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(c => c !== columnId)
        : [...prev, columnId]
    );
  };

  const handleSelectAll = (groupKey) => {
    const group = columnGroups[groupKey];
    if (!group) return;

    const allMainColumns = Array.isArray(group.columns) ? group.columns.map(c => c.id) : [];
    const allSubColumns = Array.isArray(group.subgroups) 
      ? group.subgroups.flatMap(sg => Array.isArray(sg.columns) ? sg.columns.map(c => c.id) : []) 
      : [];
    
    const groupColumns = [...allMainColumns, ...allSubColumns];
    const allSelected = groupColumns.every(col => tempColumns.includes(col));
    
    if (allSelected) {
      setTempColumns(prev => prev.filter(c => !groupColumns.includes(c)));
    } else {
      setTempColumns(prev => [...new Set([...prev, ...groupColumns])]);
    }
  };

  const handleSave = () => {
    onColumnsChange(tempColumns);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
            <Columns className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            Selecionar Colunas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <Label className="text-sm font-medium text-gray-800 dark:text-gray-200">Coluna Fixa</Label>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded">
              <Checkbox checked={true} disabled className="dark:border-gray-500" />
              <Label className="text-sm text-gray-600 dark:text-gray-300">Produto (sempre visível)</Label>
            </div>
          </div>

          {Object.entries(columnGroups).map(([groupKey, group]) => {
            const Icon = group.icon;
            const allMainColumns = Array.isArray(group.columns) ? group.columns.map(c => c.id) : [];
            const allSubColumns = Array.isArray(group.subgroups) 
              ? group.subgroups.flatMap(sg => Array.isArray(sg.columns) ? sg.columns.map(c => c.id) : []) 
              : [];
            const allColumns = [...allMainColumns, ...allSubColumns];
            const allSelected = allColumns.every(col => tempColumns.includes(col));
            
            return (
              <div key={groupKey} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <Label className="text-sm font-medium text-gray-800 dark:text-gray-200">{group.name}</Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (allSelected) {
                        setTempColumns(prev => prev.filter(c => !allColumns.includes(c)));
                      } else {
                        setTempColumns(prev => [...new Set([...prev, ...allColumns])]);
                      }
                    }}
                    className="h-7 text-xs dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {allSelected ? 'Desmarcar todos' : 'Marcar todos'}
                  </Button>
                </div>
                
                {/* Colunas principais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {Array.isArray(group.columns) && group.columns.map(column => (
                    <div
                      key={column.id}
                      className="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                      onClick={() => handleToggleColumn(column.id)}
                    >
                      <Checkbox
                        checked={tempColumns.includes(column.id)}
                        onCheckedChange={() => handleToggleColumn(column.id)}
                        className="dark:border-gray-500"
                      />
                      <Label className="text-sm cursor-pointer text-gray-700 dark:text-gray-300">{column.label}</Label>
                    </div>
                  ))}
                </div>

                {/* Subgrupos */}
                {Array.isArray(group.subgroups) && group.subgroups.map((subgroup, idx) => (
                  <div key={idx} className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{subgroup.name}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Array.isArray(subgroup.columns) && subgroup.columns.map(column => (
                        <div
                          key={column.id}
                          className="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                          onClick={() => handleToggleColumn(column.id)}
                        >
                          <Checkbox
                            checked={tempColumns.includes(column.id)}
                            onCheckedChange={() => handleToggleColumn(column.id)}
                            className="dark:border-gray-500"
                          />
                          <Label className="text-sm cursor-pointer text-gray-700 dark:text-gray-300">{column.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white"
          >
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}