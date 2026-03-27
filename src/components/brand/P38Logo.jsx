import React, { useState, useEffect } from 'react';

const LOGO_URL = 'https://media.base44.com/images/public/68a91b1a009497f8d44af37e/b901a6773_AdobeExpress-file1.png';
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
  const filter = isDark ? 'brightness(0) invert(1)' : 'brightness(0)';

  if (variant === 'icon-only') {
    const sizes = { xs: 'h-5', sm: 'h-7', md: 'h-9', lg: 'h-11', xl: 'h-14' };
    return (
      <img
        src={ICON_ONLY_URL}
        alt="P38"
        className={`${sizes[size] || sizes.md} w-auto object-contain select-none ${className}`}
        style={{ filter }}
        draggable={false}
      />
    );
  }

  // horizontal (default) e vertical usam o mesmo asset
  const sizes = { xs: 'h-7', sm: 'h-9', md: 'h-11', lg: 'h-13', xl: 'h-16', xxl: 'h-20' };
  return (
    <img
      src={LOGO_URL}
      alt="P38 ERP"
      className={`${sizes[size] || sizes.md} w-auto object-contain select-none ${className}`}
      style={{ filter }}
      draggable={false}
    />
  );
}