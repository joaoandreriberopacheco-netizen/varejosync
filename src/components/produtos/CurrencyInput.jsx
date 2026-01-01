import React, { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

export default function CurrencyInput({ value, onChange, onEnter, placeholder, className, dataIndex, isPercentage = false }) {
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
    // Remove espaços e aceita tanto vírgula quanto ponto como separador decimal
    let cleaned = str.trim().replace(/\s/g, '');
    
    // Se tem vírgula e ponto, assume que ponto é separador de milhar
    if (cleaned.includes(',') && cleaned.includes('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } 
    // Se tem apenas vírgula, assume que é separador decimal
    else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }
    // Se tem apenas ponto e mais de 2 dígitos depois, assume separador decimal
    // Senão assume separador de milhar e remove
    else if (cleaned.includes('.')) {
      const parts = cleaned.split('.');
      if (parts.length === 2 && parts[1].length <= 2) {
        // É decimal: 10.50
        // mantém como está
      } else {
        // É milhar: 1.050 ou 1.050.000
        cleaned = cleaned.replace(/\./g, '');
      }
    }
    
    return parseFloat(cleaned) || 0;
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
      value={isEditing ? editValue : formatCurrency(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      onKeyPress={handleKeyPress}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      data-custo-index={dataIndex}
    />
  );
}