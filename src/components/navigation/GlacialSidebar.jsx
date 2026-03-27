import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ChevronRight } from 'lucide-react';
import P38Logo from '@/components/brand/P38Logo';

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

export default function GlacialSidebar({
  isOpen,
  onClose,
  menuItems,
  currentPageName,
  isMobile
}) {
  const [expandedMenus, setExpandedMenus] = useState({});
  const location = useLocation();
  const isDark = useDarkMode();

  const c = isDark ? {
    bg: '#1f1d22',
    border: 'rgba(255,255,255,0.07)',
    text: '#f1f5f9',
    textSub: '#94a3b8',
    iconColor: '#94a3b8',
    activeBg: 'rgba(255,255,255,0.07)',
    hoverBg: 'rgba(255,255,255,0.05)',
    chevron: '#64748b',
    sectionLabel: '#64748b',
    subBorder: 'rgba(255,255,255,0.1)',
  } : {
    bg: '#ffffff',
    border: 'rgba(0,0,0,0.06)',
    text: '#1e293b',
    textSub: '#64748b',
    iconColor: '#6b7280',
    activeBg: 'rgba(0,0,0,0.05)',
    hoverBg: 'rgba(0,0,0,0.03)',
    chevron: '#9ca3af',
    sectionLabel: '#9ca3af',
    subBorder: 'rgba(0,0,0,0.08)',
  };

  const toggleSubmenu = (menuName) => {
    setExpandedMenus(prev => {
      const newExpanded = {};
      if (!prev[menuName]) newExpanded[menuName] = true;
      return newExpanded;
    });
  };

  const isPageActive = (item) => {
    if (item.page) return currentPageName === item.page || location.pathname.includes(item.page);
    if (item.submenu) return item.submenu.some(sub => currentPageName === sub.page || location.pathname.includes(sub.page));
    return false;
  };

  const closeMobileMenu = () => { if (isMobile) onClose?.(); };

  // Desktop: recolhido=64px, expandido=300px
  const desktopWidth = isOpen ? '300px' : '64px';
  const mobileTranslate = isOpen ? 'translateX(0)' : 'translateX(-100%)';

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.25)' }}
          onClick={closeMobileMenu}
        />
      )}

      <aside
        className="fixed left-0 top-0 h-full z-40 flex flex-col overflow-hidden"
        style={{
          background: c.bg,
          width: isMobile ? '300px' : desktopWidth,
          transform: isMobile ? mobileTranslate : 'none',
          transition: isMobile ? 'transform 0.22s ease-out' : 'width 0.22s ease-out',
          boxShadow: `1px 0 0 0 ${c.border}`,
          willChange: isMobile ? 'transform' : 'width',
        }}
      >
        {/* Header com logo */}
        <div
          className="flex items-center flex-shrink-0 px-4"
          style={{
            height: 64,
            borderBottom: `1px solid ${c.border}`,
          }}
        >
          {isOpen ? (
            <P38Logo variant="horizontal" size="md" />
          ) : (
            <div className="mx-auto">
              <P38Logo variant="icon-only" size="sm" />
            </div>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {isOpen && (
            <p
              className="text-[10px] px-3 mb-2 uppercase tracking-widest"
              style={{ color: c.sectionLabel }}
            >
              Menu
            </p>
          )}

          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = isPageActive(item);
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isExpanded = expandedMenus[item.name];

            return (
              <div key={item.name}>
                {hasSubmenu ? (
                  <>
                    <button
                      onClick={() => toggleSubmenu(item.name)}
                      className="w-full flex items-center rounded-xl transition-colors"
                      style={{
                        gap: 10,
                        padding: isOpen ? '10px 12px' : '10px',
                        justifyContent: isOpen ? 'flex-start' : 'center',
                        background: isActive ? c.activeBg : 'transparent',
                        color: isActive ? c.text : c.textSub,
                      }}
                    >
                      <Icon className="flex-shrink-0" size={18} style={{ color: isActive ? c.text : c.iconColor }} />
                      {isOpen && (
                        <>
                          <span className="flex-1 text-left text-sm font-medium" style={{ color: c.text }}>{item.name}</span>
                          <ChevronRight
                            size={14}
                            style={{ color: c.chevron, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                          />
                        </>
                      )}
                    </button>

                    {isExpanded && isOpen && (
                      <div
                        className="ml-8 mt-1 space-y-0.5 pl-3"
                        style={{ borderLeft: `2px solid ${c.subBorder}` }}
                      >
                        {item.submenu.map(subItem => {
                          const isSubActive = currentPageName === subItem.page || location.pathname.includes(subItem.page);
                          return (
                            <Link
                              key={subItem.page}
                              to={createPageUrl(subItem.page)}
                              onClick={closeMobileMenu}
                              className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors"
                              style={{
                                background: isSubActive ? c.activeBg : 'transparent',
                                color: isSubActive ? c.text : c.textSub,
                                fontWeight: isSubActive ? 600 : 400,
                              }}
                            >
                              {subItem.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={createPageUrl(item.page)}
                    onClick={closeMobileMenu}
                    className="flex items-center rounded-xl transition-colors"
                    style={{
                      gap: 10,
                      padding: isOpen ? '10px 12px' : '10px',
                      justifyContent: isOpen ? 'flex-start' : 'center',
                      background: isActive ? c.activeBg : 'transparent',
                      color: isActive ? c.text : c.textSub,
                    }}
                  >
                    <Icon className="flex-shrink-0" size={18} style={{ color: isActive ? c.text : c.iconColor }} />
                    {isOpen && (
                      <span className="text-sm font-medium" style={{ color: c.text }}>{item.name}</span>
                    )}
                  </Link>
                )}
              </div>
            );
          })}

          {/* Respiro no final */}
          <div style={{ height: 24 }} />
        </nav>
      </aside>
    </>
  );
}