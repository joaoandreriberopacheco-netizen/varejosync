import React from 'react';
import { TIPO_VINCULO, TIPO_VINCULO_LABELS } from '@/lib/folhaPrevisaoCalculos';

/**
 * Lista compacta de funcionários e sócios por centro de custo (texto preto).
 */
export default function FolhaPessoasPorCentroLista({ pessoas = [], colaboradoresMap = {}, className = '' }) {
  if (!pessoas.length) return null;

  return (
    <ul className={`mt-1.5 space-y-0.5 ${className}`.trim()}>
      {pessoas.map((pessoa) => {
        const nome =
          colaboradoresMap[pessoa.colaborador_id]?.nome ||
          pessoa.colaborador_nome ||
          pessoa.nome ||
          'Pessoa';
        const tipo =
          TIPO_VINCULO_LABELS[pessoa.tipo_vinculo || TIPO_VINCULO.FUNCIONARIO] ||
          TIPO_VINCULO_LABELS[TIPO_VINCULO.FUNCIONARIO];

        return (
          <li key={pessoa.id} className="text-sm font-medium text-foreground print:text-black">
            {nome}
            <span className="font-normal text-foreground/80 print:text-black/80"> — {tipo}</span>
          </li>
        );
      })}
    </ul>
  );
}
