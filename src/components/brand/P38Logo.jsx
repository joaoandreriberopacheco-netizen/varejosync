import React, { useState, useEffect } from 'react';

/** Coloque os PNGs oficiais em /public/brand/ — se ausentes, o componente volta ao vetor. */
const OFFICIAL_PNG = {
  horizontal: '/brand/p38-logo-full.png',
  mobile: '/brand/p38-logo-mobile.png',
  vertical: '/brand/p38-logo-mobile.png',
  icon: '/brand/p38-icon-192.png',
};

/** Sincroniza com a classe `dark` em <html> (Tailwind). */
function useBrandDarkMode() {
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

/**
 * Raio — logomarca oficial (silhueta única, preenchimento sólido).
 */
function LightningIcon({ size = 32, color = '#000000', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      style={{ flexShrink: 0, display: 'block' }}
      aria-hidden
    >
      <path d="M13 2L3 14h8l-1 8 11-12h-8l1-8z" />
    </svg>
  );
}

/**
 * P38 | ERP — marca unificada.
 *
 * variant:
 * - horizontal | full — desktop: raio + "P38 | ERP" em linha (modo claro: preto #000)
 * - mobile | compact — telas estreitas: raio + "P38" (sem "| ERP")
 * - vertical — stack central (splash, hero): raio, P38, "|", ERP
 * - icon-only — apenas o raio (sidebar recolhida, favicons internos)
 */
export default function P38Logo({
  variant = 'horizontal',
  size = 'md',
  className = '',
  useOfficialPng = true,
}) {
  const isDark = useBrandDarkMode();
  const [pngMissing, setPngMissing] = useState(false);
  const fg = isDark ? '#ffffff' : '#000000';

  const resolved =
    variant === 'full'
      ? 'horizontal'
      : variant === 'compact'
        ? 'mobile'
        : variant;

  const sizeCfg = {
    xs: { icon: 16, p38: 15, erp: 11, sep: 12, gap: 8, vGap: 6 },
    sm: { icon: 22, p38: 19, erp: 14, sep: 14, gap: 10, vGap: 8 },
    md: { icon: 28, p38: 24, erp: 17, sep: 17, gap: 12, vGap: 10 },
    lg: { icon: 36, p38: 30, erp: 20, sep: 20, gap: 14, vGap: 12 },
    xl: { icon: 46, p38: 38, erp: 25, sep: 24, gap: 16, vGap: 14 },
    xxl: { icon: 72, p38: 56, erp: 34, sep: 32, gap: 20, vGap: 18 },
  };
  const cfg = sizeCfg[size] || sizeCfg.md;

  const textP38 = {
    color: fg,
    fontFamily: "'Quicksand', sans-serif",
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1,
  };
  const textErp = {
    color: fg,
    fontFamily: "'Inter', system-ui, sans-serif",
    fontWeight: 400,
    letterSpacing: '0.14em',
    lineHeight: 1,
  };
  const sepStyle = {
    color: fg,
    fontWeight: 300,
    opacity: isDark ? 0.9 : 0.88,
    lineHeight: 1,
  };

  const pngKey =
    resolved === 'icon-only' ? 'icon' : resolved === 'mobile' ? 'mobile' : resolved === 'vertical' ? 'vertical' : 'horizontal';
  const pngSrc = OFFICIAL_PNG[pngKey];
  const pngHeight =
    resolved === 'vertical'
      ? Math.min(220, Math.round(cfg.icon + cfg.p38 + cfg.erp + cfg.vGap * 6))
      : resolved === 'icon-only'
        ? cfg.icon
        : Math.max(cfg.icon, Math.round(cfg.p38 * 1.25));

  if (useOfficialPng && !pngMissing && pngSrc) {
    return (
      <img
        src={pngSrc}
        alt="P38 ERP"
        role="img"
        className={`block w-auto select-none object-contain object-left ${isDark ? 'brightness-0 invert' : ''} ${className}`}
        style={{
          height: pngHeight,
          maxHeight:
            resolved === 'vertical'
              ? 240
              : size === 'xxl'
                ? 120
                : size === 'xl'
                  ? 80
                  : size === 'lg'
                    ? 64
                    : 52,
          maxWidth: resolved === 'vertical' ? 180 : 320,
        }}
        onError={() => setPngMissing(true)}
      />
    );
  }

  if (resolved === 'icon-only') {
    return <LightningIcon size={cfg.icon} color={fg} className={className} />;
  }

  if (resolved === 'mobile') {
    return (
      <div
        className={`flex items-center select-none ${className}`}
        style={{ gap: cfg.gap }}
        role="img"
        aria-label="P38 ERP"
      >
        <LightningIcon size={cfg.icon} color={fg} />
        <span
          className="font-glacial"
          style={{ ...textP38, fontSize: cfg.p38 }}
        >
          P38
        </span>
      </div>
    );
  }

  if (resolved === 'vertical') {
    return (
      <div
        className={`flex flex-col items-center select-none ${className}`}
        style={{ gap: cfg.vGap }}
        role="img"
        aria-label="P38 ERP"
      >
        <LightningIcon size={cfg.icon} color={fg} />
        <span className="font-glacial text-center" style={{ ...textP38, fontSize: cfg.p38 }}>
          P38
        </span>
        <span
          style={{
            ...sepStyle,
            fontSize: Math.max(10, cfg.p38 * 0.28),
            letterSpacing: '0.06em',
          }}
        >
          |
        </span>
        <span className="text-center uppercase" style={{ ...textErp, fontSize: cfg.erp }}>
          ERP
        </span>
      </div>
    );
  }

  // horizontal (default): raio + P38 | ERP — uma linha, hierarquia tipográfica oficial
  return (
    <div
      className={`flex items-center select-none ${className}`}
      style={{ gap: cfg.gap }}
      role="img"
      aria-label="P38 ERP"
    >
      <LightningIcon size={cfg.icon} color={fg} />
      <div className="flex items-center" style={{ gap: Math.max(6, cfg.gap * 0.45) }}>
        <span className="font-glacial" style={{ ...textP38, fontSize: cfg.p38 }}>
          P38
        </span>
        <span style={{ ...sepStyle, fontSize: cfg.sep }}>|</span>
        <span className="uppercase" style={{ ...textErp, fontSize: cfg.erp }}>
          ERP
        </span>
      </div>
    </div>
  );
}

export { LightningIcon, useBrandDarkMode };
