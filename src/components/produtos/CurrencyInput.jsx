import React, { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

export default function CurrencyInput({
  value,
  onChange,
  onEnter,
  placeholder,
  className,
  dataIndex,
  navIndex,
  isLast = false,
  enterKeyHint: enterKeyHintProp,
  isPercentage = false,
}) {
  const inputRef = useRef(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState('');

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
    let cleaned = str.trim().replace(/\s/g, '');

    if (cleaned.includes(',') && cleaned.includes('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    } else if (cleaned.includes('.')) {
      const parts = cleaned.split('.');
      if (!(parts.length === 2 && parts[1].length <= 2)) {
        cleaned = cleaned.replace(/\./g, '');
      }
    }

    const parsed = parseFloat(cleaned) || 0;
    return Math.round(parsed * 100) / 100;
  };

  const handleFocus = (e) => {
    setIsEditing(false);
    setEditValue('');
    e.target.select();
  };

  const handleChange = (e) => {
    const rawValue = e.target.value;
    
    // Se está no modo de edição (começou a digitar), usa o valor raw
    if (isEditing) {
      setEditValue(rawValue);
      const numValue = parseCurrency(rawValue);
      onChange(numValue);
    } else {
      const numValue = parseCurrency(rawValue);
      onChange(numValue);
    }
  };

  const handleKeyPress = (e) => {
    // Quando o usuário começa a digitar (qualquer tecla que não seja controle)
    if (!isEditing && e.key.length === 1) {
      setIsEditing(true);
      setEditValue('');
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const resolvedNavIndex = navIndex ?? (Number.isFinite(Number(dataIndex)) ? Number(dataIndex) : null);
  const enterKeyHint = enterKeyHintProp ?? (isLast ? 'done' : 'next');

  const focusNavIndex = (targetIndex) => {
    if (!Number.isFinite(targetIndex)) return false;
    const nextInput = document.querySelector(`[data-pricing-nav-index="${targetIndex}"]`);
    if (!nextInput) return false;
    nextInput.focus();
    return true;
  };

  const focusNext = () => {
    if (onEnter) {
      onEnter();
      return;
    }
    if (resolvedNavIndex == null) return;
    focusNavIndex(resolvedNavIndex + 1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      focusNext();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (resolvedNavIndex != null) focusNavIndex(resolvedNavIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (resolvedNavIndex != null) focusNavIndex(resolvedNavIndex - 1);
    }
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      enterKeyHint={enterKeyHint}
      value={isEditing ? editValue : formatCurrency(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      onKeyPress={handleKeyPress}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      data-pricing-nav-index={resolvedNavIndex ?? undefined}
      data-custo-index={resolvedNavIndex ?? dataIndex}
    />
  );
}