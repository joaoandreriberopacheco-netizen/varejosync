import React from 'react';

export default function ItinerarioMobileEmptyState({ title, description }) {
  return (
    <div className="rounded-3xl bg-card p-5 shadow-sm text-center">
      <p className="text-sm font-medium text-foreground dark:text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}