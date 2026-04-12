import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Ship, CheckSquare, PackageSearch } from 'lucide-react';
import { createPageUrl } from '@/components/utils';

/**
 * A página antiga “Módulo de Estoque” (movimentações genéricas na mesma tela) foi descontinuada.
 * O estoque continua sendo tratado em Conferência, Separação, Produtos e fluxos de compra/venda.
 */
export default function EstoquePage() {
  const links = [
    {
      to: createPageUrl('Produtos'),
      icon: Package,
      title: 'Produtos',
      desc: 'Cadastro, estoque atual e ajustes vinculados ao catálogo',
    },
    {
      to: createPageUrl('ConferenciaEstoque'),
      icon: CheckSquare,
      title: 'Conferência de estoque',
      desc: 'Contagens e conferências formais',
    },
    {
      to: createPageUrl('InterfaceSeparador'),
      icon: PackageSearch,
      title: 'Separação de pedidos',
      desc: 'Fila e separação para expedição',
    },
    {
      to: createPageUrl('ItinerarioFluvial'),
      icon: Ship,
      title: 'Boats',
      desc: 'Itinerário fluvial e logística',
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-5 dark:border-amber-900/50 dark:bg-amber-950/40">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Módulo de Estoque descontinuado</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          Esta tela unificada de movimentações não é mais usada. Use os fluxos abaixo, alinhados ao menu{' '}
          <strong className="font-medium">Estoque</strong> e <strong className="font-medium">Compras</strong>.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {links.map(({ to, icon: Icon, title, desc }) => (
          <Link
            key={to}
            to={to}
            className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800/80"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
              <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-medium text-gray-900 dark:text-white">{title}</h2>
              <p className="mt-0.5 text-xs leading-snug text-gray-500 dark:text-gray-400">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
