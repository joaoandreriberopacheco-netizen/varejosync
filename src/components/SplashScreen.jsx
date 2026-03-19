import React, { useEffect, useState } from 'react';

/**
 * Tela Splash exibida após o login, por ~2.5s
 * Props:
 *   onFinish: () => void  — chamado quando a splash termina
 *   darkMode: boolean
 */
export default function SplashScreen({ onFinish, darkMode }) {
  const [phase, setPhase] = useState('in'); // 'in' | 'visible' | 'out'

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 50);
    const t2 = setTimeout(() => setPhase('out'), 2200);
    const t3 = setTimeout(() => onFinish?.(), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const logoLight = 'https://media.base44.com/images/public/68a91b1a009497f8d44af37e/75308ec3b_Gemini_Generated_Image_ieeqs1ieeqs1ieeq.png';
  const logoDark  = 'https://media.base44.com/images/public/68a91b1a009497f8d44af37e/36c577f1b_generated_image.png';

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
        background: darkMode ? '#000000' : '#ffffff',
        transition: 'opacity 0.5s ease',
        opacity: phase === 'visible' ? 1 : 0,
        pointerEvents: 'none',
      }}
    >
      <img
        src={darkMode ? logoDark : logoLight}
        alt="P38 | ERP"
        style={{
          width: 'min(320px, 70vw)',
          transition: 'transform 0.5s ease, opacity 0.5s ease',
          transform: phase === 'visible' ? 'scale(1)' : 'scale(0.92)',
          opacity: phase === 'visible' ? 1 : 0,
        }}
      />

      {/* Loader sutil */}
      <div
        style={{
          marginTop: 48,
          width: 32,
          height: 2,
          borderRadius: 2,
          background: darkMode ? '#333' : '#e5e7eb',
          overflow: 'hidden',
          transition: 'opacity 0.4s ease',
          opacity: phase === 'visible' ? 1 : 0,
        }}
      >
        <div
          style={{
            height: '100%',
            background: darkMode ? '#ffffff' : '#111827',
            borderRadius: 2,
            animation: 'splash-progress 2s ease forwards',
          }}
        />
      </div>

      <style>{`
        @keyframes splash-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}