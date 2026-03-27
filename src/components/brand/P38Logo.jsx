import React, { useState, useEffect } from 'react';

const ICON_ONLY_URL = 'https://media.base44.com/images/public/68a91b1a009497f8d44af37e/46a482fd7_image.png';

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

export default function P38Logo({ variant = 'horizontal', size = 'md', className = '' }) {
  const isDark = useDarkMode();
  const iconFilter = isDark ? 'brightness(0) invert(1)' : 'brightness(0)';
  const textColor = isDark ? '#ffffff' : '#111827';

  // Icon only (raio)
  if (variant === 'icon-only') {
    const sizes = { xs: 20, sm: 26, md: 32, lg: 40, xl: 52 };
    const px = sizes[size] || sizes.md;
    return (
      <img
        src={ICON_ONLY_URL}
        alt="P38"
        width={px}
        height={px}
        className={`object-contain select-none flex-none ${className}`}
        style={{ filter: iconFilter }}
        draggable={false}
      />
    );
  }

  // Horizontal: raio + "P38" + "ERP"
  if (variant === 'horizontal') {
    const configs = {
      xs:  { icon: 16, p38: 13, erp: 9,  gap: 4 },
      sm:  { icon: 22, p38: 17, erp: 11, gap: 5 },
      md:  { icon: 28, p38: 22, erp: 13, gap: 6 },
      lg:  { icon: 36, p38: 28, erp: 16, gap: 7 },
      xl:  { icon: 48, p38: 36, erp: 20, gap: 9 },
      xxl: { icon: 64, p38: 48, erp: 26, gap: 12 },
    };
    const cfg = configs[size] || configs.md;
    return (
      <div className={`flex items-center select-none ${className}`} style={{ gap: cfg.gap }}>
        <img
          src={ICON_ONLY_URL}
          alt=""
          width={cfg.icon}
          height={cfg.icon}
          style={{ filter: iconFilter, flexShrink: 0 }}
          draggable={false}
        />
        <div style={{ lineHeight: 1 }}>
          <span style={{ fontSize: cfg.p38, fontWeight: 700, color: textColor, fontFamily: 'Quicksand, sans-serif', letterSpacing: '-0.01em', display: 'block' }}>
            P38
          </span>
          <span style={{ fontSize: cfg.erp, fontWeight: 500, color: textColor, opacity: 0.55, fontFamily: 'Inter, sans-serif', letterSpacing: '0.06em', display: 'block', marginTop: 1 }}>
            ERP
          </span>
        </div>
      </div>
    );
  }

  // Vertical (empilhado)
  const configs = {
    sm:  { icon: 36, p38: 22, erp: 13 },
    md:  { icon: 48, p38: 28, erp: 16 },
    lg:  { icon: 64, p38: 36, erp: 20 },
    xxl: { icon: 96, p38: 54, erp: 28 },
  };
  const cfg = configs[size] || configs.md;
  return (
    <div className={`flex flex-col items-center select-none ${className}`} style={{ gap: 6 }}>
      <img
        src={ICON_ONLY_URL}
        alt=""
        width={cfg.icon}
        height={cfg.icon}
        style={{ filter: iconFilter }}
        draggable={false}
      />
      <div style={{ textAlign: 'center', lineHeight: 1 }}>
        <div style={{ fontSize: cfg.p38, fontWeight: 700, color: textColor, fontFamily: 'Quicksand, sans-serif' }}>P38</div>
        <div style={{ fontSize: cfg.erp, fontWeight: 500, color: textColor, opacity: 0.55, fontFamily: 'Inter, sans-serif', letterSpacing: '0.06em', marginTop: 2 }}>ERP</div>
      </div>
    </div>
  );
}