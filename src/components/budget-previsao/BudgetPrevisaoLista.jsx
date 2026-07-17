import React from 'react';
import { P38MobileLineList } from '@/components/ui/p38-mobile-line';
import BudgetPrevisaoRow from './BudgetPrevisaoRow';

export default function BudgetPrevisaoLista({ visoes = [], onOpen }) {
  if (!visoes.length) return null;
  return (
    <P38MobileLineList className="block md:!block rounded-xl overflow-hidden">
      {visoes.map((visao, idx) => (
        <BudgetPrevisaoRow
          key={visao.modelo?.id || idx}
          visao={visao}
          onClick={onOpen}
          striped={idx % 2 === 1}
        />
      ))}
    </P38MobileLineList>
  );
}
