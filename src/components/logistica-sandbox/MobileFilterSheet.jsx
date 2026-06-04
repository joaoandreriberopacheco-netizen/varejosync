import React from 'react';
import { ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MobileFilterSheet({ open, onOpenChange }) {
  return (
    <Button
      type="button"
      onClick={() => onOpenChange?.(!open)}
      className="h-11 w-11 rounded-2xl border-0 shadow-sm bg-card hover:bg-muted text-foreground/90 dark:text-gray-100 px-0"
    >
      <ListFilter className="w-4 h-4" />
    </Button>
  );
}