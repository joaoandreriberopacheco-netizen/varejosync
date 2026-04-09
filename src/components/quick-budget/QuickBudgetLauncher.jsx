import React, { useEffect, useState } from 'react';
import { Calculator } from 'lucide-react';
import QuickBudgetSheet from '@/components/quick-budget/QuickBudgetSheet';

export default function QuickBudgetLauncher() {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'q') {
        const target = event.target;
        const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable;
        if (typing) return;
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      {isMobile && !open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir orçamento rápido"
          className="fixed bottom-28 left-0 z-[45] flex h-16 w-7 items-center justify-center rounded-r-2xl bg-white/96 text-gray-500 shadow-[0_10px_28px_rgba(15,23,42,0.14)] backdrop-blur dark:bg-[#23212a]/96 dark:text-gray-300"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex -rotate-90 items-center gap-1 whitespace-nowrap text-[10px] font-medium tracking-[0.18em]">
            <Calculator className="h-3 w-3" />
            <span>ORÇAR</span>
          </div>
        </button>
      )}

      <QuickBudgetSheet open={open} onOpenChange={setOpen} isMobile={isMobile} />
    </>
  );
}