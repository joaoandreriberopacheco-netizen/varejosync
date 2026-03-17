import React, { useState } from 'react';
import { Plus, Upload, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProdutoFAB({ onNovoClicked }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    {
      id: 'novo',
      label: 'Novo Produto',
      icon: Plus,
      onClick: () => {
        onNovoClicked?.();
        setIsOpen(false);
      }
    },
    {
      id: 'editar-massa',
      label: 'Edição em Massa',
      icon: Upload,
      onClick: () => {
        navigate('/ImportacaoProdutos');
        setIsOpen(false);
      }
    }
  ];

  return (
    <div className="fixed bottom-32 right-6 z-50">
      {/* Menu expandido */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="py-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors text-sm"
                >
                  <Icon className="w-4 h-4 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Overlay para fechar menu */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-transparent cursor-pointer"
          onClick={() => setIsOpen(false)}
          role="presentation"
        />
      )}

      {/* Botão principal FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200 ${
          isOpen
            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
            : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:shadow-xl'
        }`}
        title="Menu de ações"
      >
        <ChevronUp
          className={`w-6 h-6 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>
    </div>
  );
}