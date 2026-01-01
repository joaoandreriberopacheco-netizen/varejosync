import React, { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

export default function CurrencyInput({ value, onChange, onEnter, placeholder, className, dataIndex, isPercentage = false }) {
  const inputRef = useRef(null);

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '';
    const numValue = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(numValue)) return '';
    
    return numValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const parseCurrency = (str) => {
    if (!str) return 0;
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const handleFocus = (e) => {
    e.target.select();
  };

  const handleChange = (e) => {
    const rawValue = e.target.value;
    const numValue = parseCurrency(rawValue);
    onChange(numValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (onEnter) {
        onEnter();
      } else {
        // Navigate to next input
        const nextIndex = parseInt(dataIndex) + 1;
        const nextInput = document.querySelector(`[data-custo-index="${nextIndex}"]`);
        if (nextInput) {
          nextInput.focus();
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = parseInt(dataIndex) + 1;
      const nextInput = document.querySelector(`[data-custo-index="${nextIndex}"]`);
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = parseInt(dataIndex) - 1;
      if (prevIndex >= 0) {
        const prevInput = document.querySelector(`[data-custo-index="${prevIndex}"]`);
        if (prevInput) prevInput.focus();
      }
    }
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={formatCurrency(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
      data-custo-index={dataIndex}
    />
  );
}