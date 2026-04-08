import React from 'react';

export default function ItinerarioMobileEmptyState({ title, description }) {
  return (
    <div className="rounded-3xl bg-white dark:bg-gray-800 p-5 shadow-sm text-center">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}