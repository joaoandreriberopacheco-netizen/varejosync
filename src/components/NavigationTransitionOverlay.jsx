import React, { useEffect, useState } from 'react';
import { useNavigationTransition } from '@/lib/NavigationTransitionContext';
import P38Logo from '@/components/brand/P38Logo';

export default function NavigationTransitionOverlay() {
  const { showTransition } = useNavigationTransition();
  const [phase, setPhase] = useState('in');
  const darkMode = document.documentElement.classList.contains('dark');

  useEffect(() => {
    if (showTransition) {
      setPhase('in');
      const t1 = setTimeout(() => setPhase('visible'), 30);
      const t2 = setTimeout(() => setPhase('out'), 300);
      
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      setPhase('in');
    }
  }, [showTransition]);

  if (!showTransition) return null;

  const bg = darkMode ? '#000000' : '#ffffff';
  const fillColor = darkMode ? '#ffffff' : '#111827';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: phase === 'visible' || phase === 'in' ? 1 : 0,
        pointerEvents: phase === 'out' ? 'none' : 'auto',
      }}
    >
      {/* Logo com animação de entrada suave */}
      <div
        style={{
          transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease-out',
          transform: phase === 'visible' ? 'scale(1)' : 'scale(0.8)',
          opacity: phase === 'visible' ? 1 : 0,
        }}
      >
        <P38Logo variant="horizontal" size="lg" />
      </div>

      {/* Efeito de chamas/fogo */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: phase === 'out' ? 1 : 0,
          transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, ${fillColor}20 0%, transparent 70%)`,
            filter: 'blur(40px)',
            animation: 'flame-dance-1 0.8s ease-in-out forwards',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: `radial-gradient(circle at 70% 30%, ${fillColor}20 0%, transparent 70%)`,
            filter: 'blur(40px)',
            animation: 'flame-dance-2 0.8s ease-in-out forwards',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${fillColor}30 0%, transparent 70%)`,
            filter: 'blur(50px)',
            animation: 'flame-expand 0.6s ease-out forwards',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to bottom, ${fillColor}0 0%, ${fillColor}40 50%, ${fillColor}0 100%)`,
            filter: 'blur(60px)',
            animation: 'fade-in 0.5s ease-out forwards',
          }}
        />
      </div>

      <style>{`
        @keyframes flame-dance-1 {
          0% { opacity: 0; transform: translateY(0) scale(1); }
          50% { opacity: 0.4; transform: translateY(-30px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-100px) scale(0.8); }
        }
        @keyframes flame-dance-2 {
          0% { opacity: 0; transform: translateY(0) scale(1); }
          50% { opacity: 0.4; transform: translateY(-30px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-100px) scale(0.8); }
        }
        @keyframes flame-expand {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          50% { opacity: 0.5; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(2); }
        }
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}