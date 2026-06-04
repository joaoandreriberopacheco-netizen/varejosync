import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MobileDetailHeader({ title, subtitle, onBack }) {
  return (
    <div className="flex items-center gap-3">
      <Button onClick={onBack} variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-muted text-foreground/90">
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <div className="min-w-0">
        <p className="text-lg font-semibold text-foreground dark:text-gray-100 font-glacial truncate">{title}</p>
        {subtitle ? <p className="text-xs text-muted-foreground truncate">{subtitle}</p> : null}
      </div>
    </div>
  );
}