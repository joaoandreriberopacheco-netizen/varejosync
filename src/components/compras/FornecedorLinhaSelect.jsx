import React, { useMemo } from 'react';
import SearchableFilterSelect from '@/components/compras/SearchableFilterSelect';

const FORNECEDOR_VAZIO = '__none__';

export default function FornecedorLinhaSelect({
  value,
  onChange,
  fornecedores = [],
  className,
}) {
  const options = useMemo(
    () => [
      { value: FORNECEDOR_VAZIO, label: 'Selecione...' },
      ...fornecedores.map((f) => ({ value: f.id, label: f.nome || f.razao_social || 'Sem nome' })),
    ],
    [fornecedores],
  );

  return (
    <SearchableFilterSelect
      value={value || FORNECEDOR_VAZIO}
      onChange={(v) => onChange(v === FORNECEDOR_VAZIO ? '' : v)}
      placeholder="Fornecedor"
      searchPlaceholder="Buscar fornecedor..."
      options={options}
      className={className || 'h-8 max-w-[14rem] rounded-lg text-xs'}
    />
  );
}

export { FORNECEDOR_VAZIO };
