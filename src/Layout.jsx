import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

import { base44 } from '@/api/base44Client';
import { Toaster } from "@/components/ui/toaster";
import { 
  LayoutDashboard, 
  Monitor,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Settings,
  Menu,
  X,
  User,
  ChevronDown,
  Receipt,
  Sun,
  Moon,
  ChevronRight,
  ShoppingCart,
  Truck,
  Warehouse,
  BookOpen,
  WifiOff,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from "@/components/ui/dialog.jsx";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function Layout({ children, currentPageName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const [isHovering, setIsHovering] = useState(false);

  const fullscreenPages = ['PDV', 'PDVVendedor', 'PDVCaixa', 'AutoAtendimento'];
  const isFullscreen = fullscreenPages.some(page => location.pathname.includes(page));

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
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
        setCurrentUser(user);
      }
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
      setLoadError(error);
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
      await base44.auth.updateMe({ perfil: newProfile });
      window.location.reload();
    } catch (error) {
      console.error("Erro ao trocar perfil:", error);
    }
  };

  const toggleSubmenu = (menuName) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  const getMenuItemsForProfile = () => {
    const perfil = currentUser?.perfil || 'Admin';
    
    const allMenuItems = [
      { 
        name: 'PDV', 
        icon: Monitor, 
        submenu: [
          { name: 'Vendedor', page: 'PDV?mode=vendedor', roles: ['Admin', 'Vendedor', 'Gerente'] },
          { name: 'Caixa', page: 'PDV?mode=caixa', roles: ['Admin', 'Operador de Caixa', 'Gerente'] },
          { name: 'Supermercado', page: 'PDV?mode=supermercado', roles: ['Admin', 'Gerente'] },
          { name: 'Auto-Atendimento', page: 'AutoAtendimento', roles: ['Admin', 'Gerente'] }
        ],
        roles: ['Admin', 'Vendedor', 'Operador de Caixa', 'Gerente']
      },
      { 
        name: 'Dashboard', 
        icon: LayoutDashboard, 
        page: 'Dashboard',
        roles: ['Admin', 'Vendedor', 'Gerente', 'Financeiro']
      },
      { 
        name: 'Vendas', 
        icon: TrendingUp, 
        submenu: [
          { name: 'Gestão de Vendas', page: 'VendasGestao' },
          { name: 'Vendas Perdidas', page: 'VendasPerdidas' },
          { name: 'Controle de Entregas', page: 'ControleEntregas' },
          { name: 'Painel Gerencial', page: 'PainelGerente' }
        ],
        roles: ['Admin', 'Gerente']
      },
      { 
        name: 'Estoque', 
        icon: Package, 
        submenu: [
          { name: 'Produtos', page: 'Produtos' },
          { name: 'Compras', page: 'Compras' },
          { name: 'Logística', page: 'Logistica' },
          { name: 'Armazenagem', page: 'Armazenagem' },
          { name: 'Separação de Pedidos', page: 'InterfaceSeparador', roles: ['Admin', 'Gerente', 'Estoquista'] }
        ],
        roles: ['Admin', 'Gerente', 'Estoquista']
      },
      { 
        name: 'Financeiro', 
        icon: DollarSign, 
        submenu: [
          { name: 'Caixas Ativos', page: 'CaixasAtivos' },
          { name: 'Gestão Financeira', page: 'FinanceiroModulo' },
          { name: 'Formas de Pagamento', page: 'Configuracoes' }
        ],
        roles: ['Admin', 'Gerente', 'Financeiro']
      },
      { 
        name: 'Configurações', 
        icon: Settings, 
        submenu: [
          { name: 'Terceiros', page: 'Terceiros' },
          { name: 'Intervenientes', page: 'Intervenientes' },
          { name: 'Parâmetros', page: 'Configuracoes' }
        ],
        roles: ['Admin', 'Gerente']
      },
      { name: 'Relatórios', icon: BookOpen, page: 'Relatorios', roles: ['Admin', 'Gerente', 'Financeiro'] },
      { name: 'Manual', icon: BookOpen, page: 'Manual', roles: ['Admin', 'Gerente'] }
    ];

    return allMenuItems.filter(item => {
      if (!item.roles || item.roles.includes(perfil)) {
        if (item.submenu) {
          item.submenu = item.submenu.filter(sub => !sub.roles || sub.roles.includes(perfil));
        }
        return true;
      }
      return false;
    });
  };

  const menuItems = getMenuItemsForProfile();

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
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleMouseEnter = React.useCallback(() => {
    if (!isMobile) {
      setIsHovering(true);
      setIsOpen(true);
    }
  }, [isMobile]);

  const handleMouseLeave = React.useCallback(() => {
    if (!isMobile) {
      setIsHovering(false);
      setIsOpen(false);
    }
  }, [isMobile]);

  const handleMobileMenuToggle = () => {
    setIsOpen(!isOpen);
  };

  const closeMobileMenu = () => {
    if (isMobile) {
      setIsOpen(false);
    }
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

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 p-4">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
          <WifiOff className="w-8 h-8 text-red-500 dark:text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Erro de Conexão</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
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
        <div className="min-h-screen bg-white dark:bg-gray-900">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen flex font-sans bg-white dark:bg-gray-900">
        {isMobile && !isOpen && (
          <button
            onClick={handleMobileMenuToggle}
            className="fixed top-3 left-3 z-50 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-md backdrop-blur-sm"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        )}

        {isMobile && isOpen && (
          <div 
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
            onClick={closeMobileMenu}
          />
        )}

        <aside
          className={`fixed left-0 top-0 h-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 transition-[width,transform] duration-200 ease-out z-40 flex flex-col ${
            isMobile 
              ? (isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full') 
              : (isOpen ? 'w-64' : 'w-16')
          } ${isMobile && !isOpen ? 'overflow-hidden' : ''}`}
          style={{ willChange: isMobile ? 'transform' : 'width' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header */}
          <div className="p-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            {(isOpen || isMobile) ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-white border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm relative overflow-hidden">
                    <ShoppingCart className="w-5 h-5 text-gray-900 dark:text-white absolute" strokeWidth={2.5} />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-tl-lg"></div>
                  </div>
                  <div>
                    <h1 className="text-base font-semibold text-gray-900 dark:text-white font-glacial">VarejoSync</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sistema ERP</p>
                  </div>
                </div>
                {isMobile && (
                  <button onClick={closeMobileMenu} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                    <X className="w-4 h-4 text-gray-700 dark:text-white" />
                  </button>
                )}
              </>
            ) : (
              <div className="h-10 w-10 rounded-xl bg-white border border-gray-200 dark:border-gray-700 flex items-center justify-center mx-auto shadow-sm relative overflow-hidden">
                <ShoppingCart className="w-4 h-4 text-gray-900 dark:text-white" strokeWidth={2.5} />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-tl-lg"></div>
              </div>
            )}
          </div>

          {/* Busca e Toggle Tema */}
          {(isOpen || isMobile) && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 space-y-1">
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50"
              >
                <Search className="w-4 h-4" />
                <span className="text-left flex-1">Buscar...</span>
                <span className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 hidden lg:inline-block">Ctrl K</span>
              </button>

              <button 
                onClick={toggleDarkMode}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
              </button>
            </div>
          )}
          
          {/* Ícone de busca quando fechado */}
          {!isOpen && !isMobile && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
               <button 
                onClick={() => setIsSearchOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-2 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                title="Buscar (Ctrl + K)"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Menu Principal */}
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {(isOpen || isMobile) && (
              <p className="text-[10px] px-2 mb-1 text-gray-500 dark:text-gray-400">Menu</p>
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
                        onClick={() => {
                          // Close all other menus
                          const newExpanded = {};
                          if (!isExpanded) {
                            newExpanded[item.name] = true;
                          }
                          setExpandedMenus(newExpanded);
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded transition-colors ${
                          isActive
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
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
                        <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-gray-300 dark:border-gray-700 pl-2">
                          {item.submenu.map(subItem => {
                            const isSubActive = currentPageName === subItem.page;
                            return (
                              <Link
                                key={subItem.page}
                                to={createPageUrl(subItem.page)}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded transition-colors text-sm ${
                                  isSubActive
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                      className={`flex items-center gap-2 px-2 py-2 rounded transition-colors ${
                        isActive
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                      onClick={closeMobileMenu}
                    >
                      <Icon className="w-4 h-4" />
                      {(isOpen || isMobile) && (
                        <span className="text-sm">{item.name}</span>
                      )}
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            {currentUser && (isOpen || isMobile) && (
              <div className="p-2 space-y-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                      <div className="w-7 h-7 rounded bg-white flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-700" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium truncate text-gray-700 dark:text-white">{currentUser.full_name}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">{currentUser.perfil || 'Admin'}</div>
                      </div>
                      <ChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 dark:bg-gray-800 dark:border-gray-700">
                    <DropdownMenuLabel>Perfil Atual: {currentUser.perfil || 'Admin'}</DropdownMenuLabel>
                    {currentUser.role === 'admin' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-gray-500">Trocar Perfil (Apenas Admin)</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleProfileSwitch('Admin')} className="dark:hover:bg-gray-700 dark:text-gray-200">Admin</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleProfileSwitch('Vendedor')} className="dark:hover:bg-gray-700 dark:text-gray-200">Vendedor</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleProfileSwitch('Operador de Caixa')} className="dark:hover:bg-gray-700 dark:text-gray-200">Operador de Caixa</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleProfileSwitch('Gerente')} className="dark:hover:bg-gray-700 dark:text-gray-200">Gerente</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleProfileSwitch('Estoquista')} className="dark:hover:bg-gray-700 dark:text-gray-200">Estoquista</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleProfileSwitch('Financeiro')} className="dark:hover:bg-gray-700 dark:text-gray-200">Financeiro</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <button 
                  onClick={() => base44.auth.logout()}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-sm">Sair</span>
                </button>
              </div>
            )}

            {currentUser && !isOpen && !isMobile && (
              <div className="p-2 space-y-1">
                <div className="w-7 h-7 mx-auto rounded bg-white flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-700" />
                </div>
                <button 
                  onClick={() => base44.auth.logout()}
                  className="w-full flex items-center justify-center p-2 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Sair"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </aside>

        <div 
          className={`flex-1 transition-[margin] duration-200 ease-out ${
            isMobile 
              ? 'ml-0 pt-12' 
              : (isOpen ? 'ml-64' : 'ml-16')
          }`}
          style={{ willChange: 'margin' }}
        >
          <div className="p-4 md:p-6 overflow-x-hidden">
            {children}
          </div>
        </div>
      </div>
      <Toaster />
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="p-0 gap-0 max-w-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 top-[20%] translate-y-0">
          <div className="flex items-center px-4 border-b border-gray-200 dark:border-gray-800">
            <Search className="w-5 h-5 mr-3 text-gray-400" />
            <Input 
              className="flex-1 h-14 border-none bg-transparent focus-visible:ring-0 px-0 text-lg text-gray-800 dark:text-gray-200 placeholder:text-gray-400" 
              placeholder="O que você procura?" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <div className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">ESC</div>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">
             {filteredSearchItems.length === 0 && searchQuery && (
               <div className="p-4 text-center text-gray-500">
                 Nenhuma funcionalidade encontrada para "{searchQuery}"
               </div>
             )}
             {filteredSearchItems.length === 0 && !searchQuery && (
               <div className="p-4 text-center text-sm text-gray-400">
                 Digite para buscar páginas, relatórios e configurações...
               </div>
             )}
             {filteredSearchItems.map((item, idx) => {
               const Icon = item.icon;
               return (
                 <Link 
                   key={idx} 
                   to={createPageUrl(item.page)}
                   onClick={() => {
                     setIsSearchOpen(false);
                     setSearchQuery("");
                     if(isMobile) setIsOpen(false);
                   }}
                   className="flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer group transition-colors"
                 >
                   <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                     <Icon className="w-4 h-4" />
                   </div>
                   <div>
                     <div className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                       {item.name}
                     </div>
                     {item.parent && (
                       <div className="text-xs text-gray-500 flex items-center gap-1">
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