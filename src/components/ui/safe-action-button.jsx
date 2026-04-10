import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SafeActionButton({
  children,
  isLoading = false,
  loadingText = 'Processando...',
  disabled,
  className,
  onClick,
  ...props
}) {
  const handleClick = async (event) => {
    if (isLoading || disabled || !onClick) return;
    await onClick(event);
  };

  return (
    <Button
      {...props}
      disabled={disabled || isLoading}
      className={className}
      onClick={handleClick}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : children}
    </Button>
  );
}