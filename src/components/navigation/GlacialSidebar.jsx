import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ChevronRight } from 'lucide-react';
import P38Logo from '@/components/brand/P38Logo';

export default function GlacialSidebar({ 
  isOpen, 
  onClose, 
  menuItems, 
  currentPageName,
  isMobile 
}) {
  const [expandedMenus, setExpandedMenus] = useState({});
  const location = useLocation();

  const toggleSubmenu = (menuName) => {
    setExpandedMenus(prev => {
      const newExpanded = {};
      if (!prev[menuName]) {
        newExpanded[menuName] = true;
      }
      return newExpanded;
    });
  };

  const isPageActive = (item) => {
    if (item.page) {
      return currentPageName === item.page || location.pathname.includes(item.page);
    }
    if (item.submenu) {
      return item.submenu.some(subItem => 
        currentPageName === subItem.page || location.pathname.includes(subItem.page)
      );
    }
    return false;
  };

  const closeMobileMenu = () => {
    if (isMobile) onClose?.();
  };

  return (
    <>
      {/* Backdrop Mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-900 transition-[width,transform] duration-200 ease-out z-40 flex flex-col ${
          isMobile 
            ? (isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full') 
            : (isOpen ? 'w-64' : 'w-16')
        } ${isMobile && !isOpen ? 'overflow-hidden' : ''}`}
        style={{ 
          boxShadow: '1px 0 0 0 rgba(0,0,0,0.05)',
          willChange: isMobile ? 'transform' : 'width' 
        }}
      >
        {/* Header */}
        <div className="p-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          {(isOpen || isMobile) ? (
            <div className="flex items-center gap-2">
              <P38Logo variant="icon-only" size="md" />
              <div>
                <h1 className="text-sm font-semibold text-gray-900 dark:text-white font-glacial">P38 ERP</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sistema</p>
              </div>
            </div>
          ) : (
            <P38Logo variant="icon-only" size="sm" />
          )}
        </div>

        {/* Menu Principal */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {(isOpen || isMobile) && (
            <p className="text-[10px] px-2 mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-wide">Menu</p>
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
                      className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={isActive ? 2 : 1.5} />
                      {(isOpen || isMobile) && (
                        <>
                          <span className="text-sm flex-1 text-left">{item.name}</span>
                          <ChevronRight 
                            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                          />
                        </>
                      )}
                    </button>
                    
                    {isExpanded && (isOpen || isMobile) && (
                      <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                        {item.submenu.map(subItem => {
                          const isSubActive = currentPageName === subItem.page || location.pathname.includes(subItem.page);
                          return (
                            <Link
                              key={subItem.page}
                              to={createPageUrl(subItem.page)}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-sm ${
                                isSubActive
                                  ? 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-medium'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                              }`}
                              onClick={closeMobileMenu}
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
                    className={`flex items-center gap-2 px-2 py-2 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={closeMobileMenu}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={isActive ? 2 : 1.5} />
                    {(isOpen || isMobile) && (
                      <span className="text-sm">{item.name}</span>
                    )}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}