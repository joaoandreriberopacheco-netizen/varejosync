import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useNavigationTransition } from '@/lib/NavigationTransitionContext';
import { getCachedUserSession, setCachedUserSession } from '@/lib/userSessionCache';

import { base44 } from '@/api/base44Client';
import FontScaleInitializer from '@/components/accessibility/FontScaleInitializer';
import { buildMenuItems } from '@/components/config/usePermissoesResolvidas';
import { ChevronRight, WifiOff, Search } from 'lucide-react';
import PinSetupDialog from '@/components/auth/PinSetupDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from "@/components/ui/dialog.jsx";
import GlacialBottomNav from '@/components/navigation/GlacialBottomNav';
import GlacialSidebar from '@/components/navigation/GlacialSidebar';
import MobileUserMenu from '@/components/layout/MobileUserMenu';
import MobileFunctionSelector from '@/components/navigation/MobileFunctionSelector';
import QuickBudgetLauncher from '@/components/quick-budget/QuickBudgetLauncher';

/** Páginas com scroll interno no mobile (evita body + nested scroll e zoom por overflow). */
const MOBILE_FULL_VIEWPORT_PAGES = new Set(['Produtos', 'RelatorioMargem', 'RelatorioCatalogoEstoque']);
/** Páginas pesadas onde expandir o menu não deve reflowar todo o conteúdo. */
const DESKTOP_OVERLAY_SIDEBAR_PAGES = new Set(['VendasGestao']);

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const { triggerTransition } = useNavigationTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [perfilDeAcesso, setPerfilDeAcesso] = useState(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const location = useLocation();
  const [isHovering, setIsHovering] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [showMobileUserMenu, setShowMobileUserMenu] = useState(false);
  const [showDesktopUserPanel, setShowDesktopUserPanel] = useState(false);

  const fullscreenPages = ['PDV', 'PDVVendedor', 'PDVCaixa', 'AutoAtendimento', 'ExtratoConta', 'PedidoCompraDetalhe', 'AnexoCompartilhado'];
  const isFullscreen = fullscreenPages.some(page => location.pathname.includes(page));
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const useDesktopOverlaySidebar = !isMobile && DESKTOP_OVERLAY_SIDEBAR_PAGES.has(currentPageName);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    loadUser();
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      if (user) {
        let perfil = null;
        if (user.perfil_acesso_id) {
          try {
            const perfis = await base44.entities.PerfilDeAcesso.filter({ id: user.perfil_acesso_id });
            perfil = perfis?.[0] || null;
          } catch (e) {
            console.warn('Perfil de acesso não encontrado:', e);
          }
        }
        setCurrentUser(user);
        setPerfilDeAcesso(perfil);
        setCachedUserSession(user, perfil);
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      const cached = getCachedUserSession();
      if (cached?.user) {
        setCurrentUser(cached.user);
        if (cached.perfilDeAcesso) setPerfilDeAcesso(cached.perfilDeAcesso);
      } else {
        setLoadError(error);
      }
    } finally {
      setIsLoadingUser(false);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleProfileSwitch = async (newProfile) => {
    try {
      // Para admins: trocar perfil simula permissões — usa perfil_acesso_id se disponível
      await base44.auth.updateMe({ perfil: newProfile });
      window.location.reload();
    } catch (error) {
      console.error("Erro ao trocar perfil:", error);
    }
  };

  const toggleSubmenu = React.useCallback((menuName) => {
    setExpandedMenus(prev => {
      const newState = { ...prev };
      newState[menuName] = !newState[menuName];
      return newState;
    });
  }, []);

  // ── Quarter Master Logic: monta menu baseado em permissões resolvidas ──────
  const menuItems = React.useMemo(() => {
   if (!currentUser) return [];
   return buildMenuItems(currentUser, perfilDeAcesso);
  }, [currentUser, perfilDeAcesso]);

  const allSearchableItems = React.useMemo(() => {
   const items = [];
   menuItems.forEach(item => {
     if (item.page) items.push({ name: item.name, page: item.page, icon: item.icon, parent: null });
     if (item.submenu) {
       item.submenu.forEach(sub => {
         items.push({ name: sub.name, page: sub.page, icon: item.icon, parent: item.name });
       });
     }
   });
   return items;
  }, [menuItems]);

  const filteredSearchItems = React.useMemo(() => {
    if (!searchQuery) return [];
    const lowerQuery = searchQuery.toLowerCase();
    return allSearchableItems.filter(item => 
      item.name.toLowerCase().includes(lowerQuery) || 
      (item.parent && item.parent.toLowerCase().includes(lowerQuery))
    );
  }, [searchQuery, allSearchableItems]);

  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    
    // Listener para evento global de busca
    const handleGlobalSearch = () => {
      setIsSearchOpen(true);
    };
    window.addEventListener('open-global-search', handleGlobalSearch);
    
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener('open-global-search', handleGlobalSearch);
    };
  }, []);

  useEffect(() => {
    if (!showDesktopUserPanel) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-desktop-user-panel]')) {
        setShowDesktopUserPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDesktopUserPanel]);

  const handleMouseEnter = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleMobileMenuToggle = () => {
    setIsOpen(!isOpen);
  };

  const closeMobileMenu = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleNavigationLink = (e, to) => {
    e.preventDefault();
    triggerTransition(() => {
      navigate(to);
    });
  };

  const isPageActive = (item) => {
    if (item.page) {
      return currentPageName === item.page;
    }
    if (item.submenu) {
      return item.submenu.some(subItem => currentPageName === subItem.page);
    }
    return false;
  };

  if (isLoadingUser) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 font-din-1451">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
          <WifiOff className="w-8 h-8 text-red-500 dark:text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Erro de Conexão</h2>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.
        </p>
        <Button onClick={() => window.location.reload()}>
          Tentar Novamente
        </Button>
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-white dark:bg-background">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <FontScaleInitializer />
      <div className="min-h-screen flex font-din-1451 bg-background">


        {/* Sidebar Desktop */}
        {!isMobile && !showMobileMenu && (
          <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              height: '100%',
              width: isOpen ? '300px' : '64px',
              zIndex: 40,
              transition: 'width 0.22s ease-out',
            }}
          >
            <GlacialSidebar
              isOpen={isOpen}
              menuItems={menuItems}
              currentPageName={currentPageName}
              isMobile={false}
              currentUser={currentUser}
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
            />
          </div>
        )}

        <div 
          className={`flex-1 transition-[margin] duration-200 ease-out ${
            isMobile 
              ? `ml-0 pt-12 ${MOBILE_FULL_VIEWPORT_PAGES.has(currentPageName) ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'p38-layout-mobile-scroll-pad'}`
              : (useDesktopOverlaySidebar ? 'ml-16' : (isOpen ? 'ml-[300px]' : 'ml-16'))
          } ${MOBILE_FULL_VIEWPORT_PAGES.has(currentPageName) && !isMobile ? 'h-screen max-h-screen overflow-hidden' : ''}`}
          style={{ willChange: 'margin', paddingTop: isMobile ? `calc(3rem + env(safe-area-inset-top))` : undefined }}
        >
          {MOBILE_FULL_VIEWPORT_PAGES.has(currentPageName) ? (
            <div className="h-full min-h-0 overflow-hidden">
              {children}
            </div>
          ) : (
            <div className="p-4 md:p-6 overflow-x-hidden max-w-full">
              {children}
            </div>
          )}
        </div>
        {isMobile && !isFullscreen && (
          <GlacialBottomNav
            onMenuClick={() => setShowMobileMenu(true)}
            onProfileClick={() => setShowMobileUserMenu(true)}
            currentPageName={currentPageName}
          />
        )}
        {!isFullscreen && (
          <MobileFunctionSelector
            isOpen={showMobileMenu}
            onClose={() => setShowMobileMenu(false)}
            menuItems={menuItems}
            currentUser={currentUser}
          />
        )}
        {!isFullscreen && (
          <MobileUserMenu
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
            externalOpen={showMobileUserMenu}
            onExternalClose={() => setShowMobileUserMenu(false)}
          />
        )}
      </div>
      <QuickBudgetLauncher />
      {showPinSetup && (
        <PinSetupDialog
          isOpen={showPinSetup}
          onClose={() => { setShowPinSetup(false); loadUser(); }}
          user={currentUser}
        />
      )}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="p-0 gap-0 max-w-xl bg-card border-border/40 fixed top-4 md:top-[20%] translate-y-0 font-din-1451">
          <div className="flex items-center px-4 border-b border-border/40 sticky top-0 bg-card z-10">
            <Search className="w-5 h-5 mr-3 text-muted-foreground" />
            <Input 
              className="flex-1 h-14 border-none bg-transparent focus-visible:ring-0 px-0 text-lg text-foreground placeholder:text-muted-foreground" 
              placeholder="O que você procura?" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded border border-border/40">ESC</div>
          </div>
          <div className="max-h-[50vh] md:max-h-[300px] overflow-y-auto p-2">
             {filteredSearchItems.length === 0 && searchQuery && (
               <div className="p-4 text-center text-muted-foreground">
                 Nenhuma funcionalidade encontrada para "{searchQuery}"
               </div>
             )}
             {filteredSearchItems.length === 0 && !searchQuery && (
               <div className="p-4 text-center text-sm text-muted-foreground">
                 Digite para buscar páginas, relatórios e configurações...
               </div>
             )}
             {filteredSearchItems.map((item, idx) => {
               const Icon = item.icon;
               return (
                 <Link 
                   key={idx} 
                   to={createPageUrl(item.page)}
                   onClick={(e) => {
                     handleNavigationLink(e, createPageUrl(item.page));
                     setIsSearchOpen(false);
                     setSearchQuery("");
                     if(isMobile) setIsOpen(false);
                   }}
                   className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer group transition-colors"
                 >
                   <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-secondary text-muted-foreground group-hover:text-[#636b33] dark:group-hover:text-[#a4ce33] transition-colors">
                     <Icon className="w-4 h-4" />
                   </div>
                   <div>
                     <div className="font-medium text-foreground group-hover:text-[#4A5D23] dark:group-hover:text-[#a4ce33]">
                       {item.name}
                     </div>
                     {item.parent && (
                       <div className="text-xs text-muted-foreground flex items-center gap-1">
                         <span>{item.parent}</span>
                         <ChevronRight className="w-3 h-3" />
                       </div>
                     )}
                   </div>
                 </Link>
               );
             })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}