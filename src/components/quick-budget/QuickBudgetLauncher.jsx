import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import QuickBudgetPanel from './QuickBudgetPanel';

export default function QuickBudgetLauncher() {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'q') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {isMobile && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed left-0 bottom-28 z-40 h-16 w-7 rounded-r-2xl bg-white/92 dark:bg-gray-900/92 shadow-lg backdrop-blur-sm flex items-center justify-center text-gray-500"
          aria-label="Abrir orçamento rápido"
        >
          <Search className="w-4 h-4" />
        </button>
      )}

      <QuickBudgetPanel open={open} onOpenChange={setOpen} />
    </>
  );
}