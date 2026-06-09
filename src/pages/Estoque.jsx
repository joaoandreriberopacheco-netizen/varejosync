import { Link } from 'react-router-dom';
import { ArrowLeftRight, Package, Ship, CheckSquare, PackageSearch, ClipboardList } from 'lucide-react';
import { createPageUrl } from '@/components/utils';

/**
 * Central de estoque: atalhos para fluxos diferentes, mantendo ajuste pontual separado de conferência/auditoria.
 */
export default function EstoquePage() {
  const links = [
    {
      to: createPageUrl('ContagemExpress'),
      icon: ClipboardList,
      title: 'Contagem Express',
      desc: 'Contagem rápida com carrinho e confirmação por PIN',
    },
    {
      to: createPageUrl('MovimentosInventario'),
      icon: ArrowLeftRight,
      title: 'Movimentos de inventário',
      desc: 'Entradas e saídas pontuais para ajustes manuais de saldo',
    },
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
      <div className="rounded-2xl border border-blue-200/80 bg-blue-50/90 p-5 dark:border-blue-900/50 dark:bg-blue-950/40">
        <h1 className="text-xl font-semibold text-foreground">Central de Estoque</h1>
        <p className="mt-2 text-sm leading-relaxed text-foreground/90">
          Escolha o fluxo correto para cada operação. Movimentos de inventário servem para ajustes pontuais;
          conferência e auditoria continuam separados para contagens formais.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {links.map(({ to, icon: Icon, title, desc }) => (
          <Link
            key={to}
            to={to}
            className="flex gap-3 rounded-2xl border border-border/40 bg-white p-4 transition-colors hover:bg-muted/40 dark:border-border/40 dark:bg-background dark:hover:bg-muted/80"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="font-medium text-foreground">{title}</h2>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
