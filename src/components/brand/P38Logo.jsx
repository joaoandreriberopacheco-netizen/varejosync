import React, { useState, useEffect } from 'react';

function useDarkMode() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const update = () => setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

// SVG inline do raio — sem dependência de URL externa
function LightningIcon({ size = 32, color = '#111827' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      style={{ flexShrink: 0, display: 'block' }}
    >
      <path d="M13 2L3 14h8l-1 8 11-12h-8l1-8z" />
    </svg>
  );
}

export default function P38Logo({ variant = 'horizontal', size = 'md', className = '' }) {
  const isDark = useDarkMode();
  const iconColor = isDark ? '#ffffff' : '#111827';
  const textColor = isDark ? '#ffffff' : '#111827';

  const sizeCfg = {
    xs:  { icon: 14, p38: 13, erp: 8,  gap: 4 },
    sm:  { icon: 20, p38: 16, erp: 10, gap: 5 },
    md:  { icon: 26, p38: 20, erp: 12, gap: 6 },
    lg:  { icon: 34, p38: 26, erp: 15, gap: 8 },
    xl:  { icon: 44, p38: 34, erp: 19, gap: 10 },
    xxl: { icon: 56, p38: 44, erp: 24, gap: 12 },
  };
  const cfg = sizeCfg[size] || sizeCfg.md;

  if (variant === 'icon-only') {
    return <LightningIcon size={cfg.icon} color={iconColor} />;
  }

  // horizontal (padrão): raio + "P38" e "ERP" na linha
  return (
    <div
      className={`flex items-center select-none ${className}`}
      style={{ gap: cfg.gap }}
    >
      <LightningIcon size={cfg.icon} color={iconColor} />
      <div style={{ lineHeight: 1 }}>
        <span style={{
          fontSize: cfg.p38,
          fontWeight: 700,
          color: textColor,
          fontFamily: 'Quicksand, sans-serif',
          letterSpacing: '-0.01em',
          display: 'block',
        }}>
          P38
        </span>
        <span style={{
          fontSize: cfg.erp,
          fontWeight: 500,
          color: textColor,
          opacity: 0.5,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.08em',
          display: 'block',
          marginTop: 1,
        }}>
          ERP
        </span>
      </div>
    </div>
  );
}