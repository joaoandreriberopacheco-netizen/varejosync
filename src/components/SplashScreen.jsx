import React, { useEffect, useState } from 'react';

/**
 * Tela Splash exibida após o login, por ~4s
 * Props:
 *   onFinish: () => void
 *   darkMode: boolean
 */
export default function SplashScreen({ onFinish, darkMode }) {
  const [phase, setPhase] = useState('in'); // 'in' | 'visible' | 'out'

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 80);
    const t2 = setTimeout(() => setPhase('out'), 6500);
    const t3 = setTimeout(() => onFinish?.(), 7100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const logoLight = 'https://media.base44.com/images/public/68a91b1a009497f8d44af37e/75308ec3b_Gemini_Generated_Image_ieeqs1ieeqs1ieeq.png';
  const logoDark  = 'https://media.base44.com/images/public/68a91b1a009497f8d44af37e/36c577f1b_generated_image.png';

  const bg   = darkMode ? '#000000' : '#ffffff';
  const bar  = darkMode ? '#333333' : '#e5e7eb';
  const fill = darkMode ? '#ffffff' : '#111827';

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
        transition: 'opacity 0.6s ease',
        opacity: phase === 'visible' ? 1 : 0,
        pointerEvents: 'none',
      }}
    >
      {/* Logo */}
      <img
        src={darkMode ? logoDark : logoLight}
        alt="P38 | ERP"
        style={{
          width: 'min(300px, 65vw)',
          transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.6s ease',
          transform: phase === 'visible' ? 'scale(1)' : 'scale(0.88)',
          opacity: phase === 'visible' ? 1 : 0,
        }}
      />

      {/* Versão */}
      <p style={{
        marginTop: 16,
        fontSize: 11,
        letterSpacing: '0.15em',
        color: darkMode ? '#555' : '#d1d5db',
        fontFamily: 'Inter, sans-serif',
        textTransform: 'uppercase',
        transition: 'opacity 0.6s ease',
        opacity: phase === 'visible' ? 1 : 0,
      }}>
        Sistema ERP
      </p>

      {/* Barra de progresso */}
      <div style={{
        marginTop: 48,
        width: 40,
        height: 2,
        borderRadius: 2,
        background: bar,
        overflow: 'hidden',
        opacity: phase === 'visible' ? 1 : 0,
        transition: 'opacity 0.6s ease',
      }}>
        <div style={{
          height: '100%',
          background: fill,
          borderRadius: 2,
          animation: 'splash-progress 3.5s ease forwards',
        }} />
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