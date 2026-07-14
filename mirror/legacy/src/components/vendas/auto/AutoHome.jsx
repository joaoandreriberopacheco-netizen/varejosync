import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Touchpad, MousePointerClick } from 'lucide-react';

export default function AutoHome({ onStart }) {
  return (
    <motion.div 
      className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-8 cursor-pointer"
      onClick={onStart}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -50 }}
    >
      <motion.div 
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="mb-8"
      >
        <ShoppingBag className="w-32 h-32 text-white/90" />
      </motion.div>
      
      <h1 className="text-4xl md:text-6xl font-bold mb-4 text-center">Bem-vindo</h1>
      <p className="text-xl md:text-2xl text-indigo-100 text-center max-w-md mb-12">
        Toque na tela para iniciar seu autoatendimento
      </p>

      <div className="flex items-center gap-3 text-sm font-medium uppercase tracking-widest opacity-70 animate-pulse">
        <MousePointerClick className="w-5 h-5" />
        Toque para começar
      </div>
    </motion.div>
  );
}