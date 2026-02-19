import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Monitor, ArrowRight } from 'lucide-react';

export default function DashboardCaixa() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setUserData(u)).catch(() => {});
  }, []);

  const primeiroNome = userData?.full_name?.split(' ')[0] || 'Olá';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] font-glacial">
      <div className="text-center space-y-3 mb-10">
        <p className="text-xs text-gray-400 dark:text-gray-500 tracking-wide">VarejoSync</p>
        <h1 className="text-3xl md:text-4xl font-semibold text-gray-800 dark:text-gray-100">
          Olá, {primeiroNome}!
        </h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 font-light">
          Pronto para começar o turno?
        </p>
      </div>

      <Link to={createPageUrl('PDV?mode=caixa')}>
        <Button className="bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 text-white gap-2 h-12 px-8 text-base shadow-sm">
          <Monitor className="w-5 h-5" />
          Abrir PDV — Caixa
          <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>
    </div>
  );
}