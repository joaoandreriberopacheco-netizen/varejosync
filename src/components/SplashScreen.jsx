import React, { useEffect, useState } from 'react';
import P38Logo, { useBrandDarkMode } from '@/components/brand/P38Logo';

/**
 * Tela Splash — logotipo vertical oficial, animação de entrada e barra de progresso.
 */
export default function SplashScreen({ onFinish }) {
  const isDark = useBrandDarkMode();
  const [phase, setPhase] = useState('in'); // 'in' | 'visible' | 'out'
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 40);
    const t2 = setTimeout(() => setPhase('out'), 2400);
    const t3 = setTimeout(() => onFinish?.(), 3100);

    const totalMs = 2200;
    const interval = 50;
    const steps = totalMs / interval;
    let step = 0;
    const progressInterval = setInterval(() => {
      step++;
      const ratio = step / steps;
      const eased = 1 - Math.pow(1 - ratio, 2);
      setProgress(Math.min(95, eased * 100));
      if (step >= steps) {
        clearInterval(progressInterval);
        setProgress(100);
      }
    }, interval);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(progressInterval);
    };
  }, [onFinish]);

  const bg = isDark ? '#0d0d0d' : '#ffffff';

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
        opacity: phase === 'out' ? 0 : 1,
        pointerEvents: phase === 'out' ? 'none' : 'auto',
      }}
    >
      {/* Logo */}
      <div
        style={{
          transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.7s ease-out',
          transform: phase === 'visible' ? 'scale(1)' : 'scale(0.82)',
          opacity: phase === 'visible' ? 1 : 0,
        }}
      >
        <P38Logo surface="splash" />
      </div>

      {/* Barra de progresso */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          width: 120,
          height: 2,
          background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
          borderRadius: 1,
          overflow: 'hidden',
          opacity: phase === 'visible' ? 1 : 0,
          transition: 'opacity 0.3s ease-out',
        }}
      >
        <div
          style={{
            height: '100%',
            background: isDark ? '#ffffff' : '#000000',
            width: `${progress}%`,
            transition: 'width 0.05s linear',
            borderRadius: 1,
          }}
        />
      </div>
    </div>
  );
}