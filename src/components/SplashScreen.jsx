import React, { useEffect, useState } from 'react';
import P38Logo from '@/components/brand/P38Logo';

/**
 * Tela Splash com animação de chamas/fogo como transição fluida
 * Props:
 *   onFinish: () => void
 *   darkMode: boolean
 */
export default function SplashScreen({ onFinish, darkMode }) {
  const [phase, setPhase] = useState('in'); // 'in' | 'visible' | 'out'
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 80);
    const t2 = setTimeout(() => setPhase('out'), 1600);
    const t3 = setTimeout(() => onFinish?.(), 2500);
    
    // Anima a barra de progresso de 0 a 100% em 1.6 segundos
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const next = prev + (100 / 32); // 32 frames em 1.6s
        return next >= 100 ? 100 : next;
      });
    }, 50);
    
    return () => { 
      clearTimeout(t1); 
      clearTimeout(t2); 
      clearTimeout(t3);
      clearInterval(progressInterval);
    };
  }, [onFinish]);

  const bg = darkMode ? '#000000' : '#ffffff';
  const fillColor = darkMode ? '#ffffff' : '#111827';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: phase === 'visible' || phase === 'in' ? 1 : 0,
        pointerEvents: phase === 'out' ? 'none' : 'auto',
      }}
    >
      {/* Logo com animação de entrada suave */}
      <div
        style={{
          transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.7s ease-out',
          transform: phase === 'visible' ? 'scale(1)' : 'scale(0.8)',
          opacity: phase === 'visible' ? 1 : 0,
        }}
      >
        <P38Logo variant="horizontal" size="xxl" />
      </div>

      {/* Barra de progresso */}
      <div
        style={{
          position: 'absolute',
          bottom: '80px',
          width: '120px',
          height: '2px',
          background: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
          borderRadius: '1px',
          overflow: 'hidden',
          opacity: phase === 'visible' ? 1 : 0,
          transition: 'opacity 0.3s ease-out',
        }}
      >
        <div
          style={{
            height: '100%',
            background: darkMode ? '#ffffff' : '#111827',
            width: `${progress}%`,
            transition: 'width 0.05s linear',
            borderRadius: '1px',
          }}
        />
      </div>

      {/* Efeito de chamas/fogo com múltiplas camadas */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: phase === 'out' ? 1 : 0,
          transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Chama 1 - Canto superior esquerdo */}
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
            animation: 'flame-dance-1 2s ease-in-out forwards',
          }}
        />

        {/* Chama 2 - Canto superior direito */}
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
            animation: 'flame-dance-2 2s ease-in-out forwards',
          }}
        />

        {/* Chama 3 - Centro */}
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
            animation: 'flame-expand 1.5s ease-out forwards',
          }}
        />

        {/* Chama 4 - Cobertura geral */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to bottom, ${fillColor}0 0%, ${fillColor}40 50%, ${fillColor}0 100%)`,
            filter: 'blur(60px)',
            animation: 'fade-in 1.2s ease-out forwards',
          }}
        />
      </div>

      <style>{`
        @keyframes flame-dance-1 {
          0% {
            opacity: 0;
            transform: translateY(0) scale(1);
          }
          50% {
            opacity: 0.4;
            transform: translateY(-30px) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) scale(0.8);
          }
        }

        @keyframes flame-dance-2 {
          0% {
            opacity: 0;
            transform: translateY(0) scale(1);
          }
          50% {
            opacity: 0.4;
            transform: translateY(-30px) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) scale(0.8);
          }
        }

        @keyframes flame-expand {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(2);
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}