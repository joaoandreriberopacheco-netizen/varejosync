import React, { useEffect, useState } from 'react';
import ConsumoFormHeader from './ConsumoFormHeader';

export default function ConsumoFormShell({ onBack, desktop, mobile }) {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  const [mobileStep, setMobileStep] = useState(0);
  const stepLabels = ['Destino', 'Itens', 'Minuta'];

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-50 dark:bg-gray-900">
      <ConsumoFormHeader
        isDesktop={isDesktop}
        mobileStep={mobileStep}
        stepLabels={stepLabels}
        onBack={onBack}
      />
      <div className="flex-1 overflow-hidden">
        {isDesktop ? desktop : mobile({ mobileStep, setMobileStep, stepLabels })}
      </div>
    </div>
  );
}