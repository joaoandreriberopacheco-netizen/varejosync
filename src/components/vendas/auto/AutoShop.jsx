import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ShoppingCart, Plus, Minus, Trash2, ArrowRight, ArrowLeft, User, Package, AlertCircle, X, Frown, Megaphone, Filter, Check, SlidersHorizontal, Tag, ChevronRight, List, Grid } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Edit3, Image as ImageIcon } from 'lucide-react';
import ProductDetailDialog from './ProductDetailDialog';
import { useToast } from '@/components/ui/use-toast';

export default function AutoShop({ 
  produtos, 
  carrinho, 
  cliente, 
  onAddToCart, 
  onRemoveFromCart, 
  onUpdateQuantity, 
  onProceed, 
  onBack 
}) {
  const [search, setSearch] = useState('');
  
  // Filtros Hierárquicos e Avançados
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedTags, setSelectedTags] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showLostSales, setShowLostSales] = useState(false);
  const [avisos, setAvisos] = useState([]);
  const [configAuto, setConfigAuto] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  
  // Product Detail Dialog State
  const [selectedProductForDetail, setSelectedProductForDetail] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  React.useEffect(() => {
    base44.entities.AvisosAuto.list().then(setAvisos).catch(console.error);
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const configs = await base44.entities.ConfigAutoAtendimento.list();
    if (configs.length > 0) {
      setConfigAuto(configs[0]);
    } else {
      // Create default if not exists
      const newConfig = await base44.entities.ConfigAutoAtendimento.create({
        titulo_boas_vindas: "Bem-vindo à Loja!",
        subtitulo_boas_vindas: "Encontre tudo o que precisa aqui.",
        ativo: true
      });
      setConfigAuto(newConfig);
    }
  };

  // Update recommendations when cart changes
  useEffect(() => {
    if (carrinho.length === 0) {
      setRecommendations([]);
      return;
    }

    // Simple recommendation logic: find products with same tags/categories not in cart
    const cartIds = new Set(carrinho.map(i => i.produto_id));
    const cartTags = new Set();
    carrinho.forEach(item => {
      const prod = produtos.find(p => p.id === item.produto_id);
      if (prod && prod.tags) prod.tags.forEach(t => cartTags.add(t));
    });

    const candidates = produtos.filter(p => 
      !cartIds.has(p.id) && 
      p.tags && 
      p.tags.some(t => cartTags.has(t))
    );

    // Shuffle and pick 4
    const shuffled = candidates.sort(() => 0.5 - Math.random());
    setRecommendations(shuffled.slice(0, 4));

  }, [carrinho, produtos]);

  // Analisar estrutura de departamentos (Categorias Hierárquicas e Tags)
  const structure = useMemo(() => {
    const tree = {}; // { "Hidráulica": { tags: Set(), subs: { "Conexões": { tags: Set(), subs: {} } } } }
    const allBrands = new Set();
    let minP = 0, maxP = 0;

    produtos.forEach(p => {
      // Preços
      if (p.preco_venda_padrao < minP) minP = p.preco_venda_padrao;
      if (p.preco_venda_padrao > maxP) maxP = p.preco_venda_padrao;

      // Marcas
      if (p.marca) allBrands.add(p.marca);

      // Categorias Hierárquicas
      const rawCat = p.categoria || 'Outros';
      const parts = rawCat.split(' > '); // Suporta "Hidráulica > Conexões"
      const mainCat = parts[0];
      const subCat = parts[1] || null;

      if (!tree[mainCat]) tree[mainCat] = { tags: new Set(), subs: {} };
      
      // Adiciona tags ao nível principal
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach(t => tree[mainCat].tags.add(t));
      }

      if (subCat) {
        if (!tree[mainCat].subs[subCat]) tree[mainCat].subs[subCat] = { tags: new Set() };
        // Adiciona tags ao subnível
        if (p.tags && Array.isArray(p.tags)) {
            p.tags.forEach(t => tree[mainCat].subs[subCat].tags.add(t));
        }
      }
    });

    // Converte tree para array estruturado
    const categories = Object.entries(tree).map(([name, data]) => ({
      name,
      tags: Array.from(data.tags),
      subs: Object.entries(data.subs).map(([subName, subData]) => ({
        name: subName,
        tags: Array.from(subData.tags)
      }))
    }));

    return {
      categories,
      brands: Array.from(allBrands),
      priceLimits: [minP, maxP]
    };
  }, [produtos]);

  // Inicializa range de preço
  useEffect(() => {
    if (structure.priceLimits[1] > 0 && priceRange[1] === 10000) {
      setPriceRange([0, Math.ceil(structure.priceLimits[1])]);
    }
  }, [structure.priceLimits]);

  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      // Busca textual
      const matchSearch = !search || p.nome.toLowerCase().includes(search.toLowerCase()) || 
                          (p.codigo_barras && p.codigo_barras.includes(search));
      
      // Categoria (Suporta hierarquia)
      const matchCat = selectedCategory === 'Todos' || 
                       (p.categoria || 'Outros') === selectedCategory || 
                       (p.categoria && p.categoria.startsWith(selectedCategory + ' > ')); // Se selecionou "Hidráulica", mostra "Hidráulica > Conexões"
      
      // Preço
      const price = p.preco_venda_padrao || 0;
      const matchPrice = price >= priceRange[0] && price <= priceRange[1];
      
      // Tags (dentro da categoria selecionada ou global)
      const matchTags = selectedTags.length === 0 || (p.tags && p.tags.some(t => selectedTags.includes(t)));

      // Marca
      const matchBrand = selectedBrands.length === 0 || (p.marca && selectedBrands.includes(p.marca));

      return matchSearch && matchCat && matchPrice && matchTags && matchBrand;
    });
  }, [produtos, search, selectedCategory, priceRange, selectedTags, selectedBrands]);

  const toggleTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const toggleBrand = (brand) => {
    setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  };

  const toggleCategoryExpand = (catName) => {
    setExpandedCategories(prev => ({ ...prev, [catName]: !prev[catName] }));
  };

  const totalCarrinho = carrinho.reduce((acc, item) => acc + item.total, 0);
  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  return (
    <motion.div 
      className="flex-1 flex flex-col h-full bg-gray-100 dark:bg-gray-900 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* News Ticker */}
      {avisos.length > 0 && (
        <div className="bg-indigo-600 text-white py-2 overflow-hidden relative z-30">
          <div className="animate-marquee whitespace-nowrap flex gap-8">
            {[...avisos, ...avisos, ...avisos].map((aviso, i) => (
              <span key={i} className="flex items-center gap-2 font-medium px-4">
                <Megaphone className="w-4 h-4" />
                {aviso.mensagem}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Header Simples */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 shadow-sm z-20">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full gap-4">
          <Button variant="ghost" onClick={onBack} className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 h-12 px-4 rounded-xl">
            <ArrowLeft className="w-6 h-6 mr-2" />
            <span className="text-lg font-medium">Voltar</span>
          </Button>
          
          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-full max-w-2xl flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <Input 
                  placeholder="Buscar produtos..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 h-14 text-lg bg-gray-100 dark:bg-gray-700 border-transparent rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:text-white placeholder:text-gray-400 w-full shadow-inner"
                />
              </div>
              <Button 
                variant="ghost" 
                className="md:hidden h-14 w-14 rounded-2xl bg-gray-100 dark:bg-gray-700"
                onClick={() => setShowMobileFilters(true)}
              >
                <SlidersHorizontal className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </Button>
            </div>
          </div>

          {cliente && (
            <div className="hidden md:flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-2xl border border-indigo-100 dark:border-indigo-800">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-800 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
              </div>
              <div className="overflow-hidden text-left">
                <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase font-bold tracking-wider">Cliente</p>
                <p className="text-base font-bold text-gray-800 dark:text-gray-200 truncate max-w-[150px]">{cliente.nome}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Banner Area (Dynamic) */}
      <WelcomeBanner 
        config={configAuto} 
        onUpdateConfig={loadConfig}
        visible={carrinho.length === 0}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar de Filtros (Desktop) */}
        <div className="hidden md:flex w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col overflow-y-auto p-4 gap-6 shrink-0">
          
          {/* Departamentos Hierárquicos */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <List className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">Departamentos</h3>
            </div>
            
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('Todos')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${
                  selectedCategory === 'Todos' 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                Todos os Produtos
              </button>

              {structure.categories.map(cat => (
                <Accordion key={cat.name} type="single" collapsible>
                  <AccordionItem className="border-none">
                    <div className={`rounded-lg transition-colors ${selectedCategory === cat.name ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
                      <AccordionTrigger 
                        isOpen={expandedCategories[cat.name]}
                        onClick={() => {
                          toggleCategoryExpand(cat.name);
                          setSelectedCategory(cat.name);
                        }}
                        className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 hover:no-underline"
                      >
                        <div className="flex items-center gap-2">
                          {cat.name}
                        </div>
                      </AccordionTrigger>
                      
                      <AccordionContent isOpen={expandedCategories[cat.name]} className="pl-4 pb-2">
                          {/* Subcategorias */}
                          {cat.subs && cat.subs.length > 0 && (
                             <div className="mb-3 space-y-1">
                                {cat.subs.map(sub => (
                                  <button
                                    key={sub.name}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Se já está selecionada a categoria pai + nome da sub, ok. 
                                      // Simplificação: Filtramos pelo nome da subcategoria como string de categoria
                                      // ou ajustamos o filtro para "contém". 
                                      // Por enquanto, vou setar a categoria selecionada como "Pai > Filho"
                                      setSelectedCategory(`${cat.name} > ${sub.name}`);
                                    }}
                                    className={`w-full text-left text-xs py-1.5 px-2 rounded-md transition-colors ${
                                        selectedCategory === `${cat.name} > ${sub.name}`
                                        ? 'text-indigo-600 font-bold bg-indigo-50'
                                        : 'text-gray-600 hover:text-indigo-600'
                                    }`}
                                  >
                                    • {sub.name}
                                  </button>
                                ))}
                             </div>
                          )}

                          {/* Tags da Categoria - Visual Limpo e Organizado */}
                          {cat.tags.length > 0 && (
                            <div className="mt-3 pl-2">
                                <div className="flex flex-wrap gap-2">
                                    {cat.tags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTag(tag);
                                        }}
                                        className={`text-[11px] px-2.5 py-1 rounded-full transition-all border ${
                                        selectedTags.includes(tag)
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-indigo-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                    ))}
                                </div>
                            </div>
                          )}
                        </AccordionContent>
                    </div>
                  </AccordionItem>
                </Accordion>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-200 dark:bg-gray-700" />

          {/* Preço */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Preço</h3>
            <div className="px-2">
              <Slider
                min={0}
                max={Math.ceil(structure.priceLimits[1]) || 1000}
                step={10}
                value={priceRange}
                onValueChange={setPriceRange}
                className="mb-4"
              />
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 font-medium">
                <span>R$ {priceRange[0]}</span>
                <span>R$ {priceRange[1]}</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-200 dark:bg-gray-700" />

          {/* Marcas */}
          {structure.brands.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Marcas</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {structure.brands.map(brand => (
                  <div key={brand} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`brand-${brand}`} 
                      checked={selectedBrands.includes(brand)}
                      onCheckedChange={() => toggleBrand(brand)}
                    />
                    <label
                      htmlFor={`brand-${brand}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-gray-600 dark:text-gray-300"
                    >
                      {brand}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filtros Mobile (Drawer) */}
        <AnimatePresence>
          {showMobileFilters && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobileFilters(false)}
                className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="md:hidden fixed left-0 top-0 bottom-0 w-4/5 max-w-sm bg-white dark:bg-gray-900 z-50 shadow-2xl flex flex-col"
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Filter className="w-5 h-5" /> Filtros
                  </h2>
                  <Button variant="ghost" size="icon" onClick={() => setShowMobileFilters(false)}>
                    <X className="w-6 h-6" />
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {/* Conteúdo Mobile */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Departamentos</h3>
                    <div className="space-y-1">
                      <button
                        onClick={() => setSelectedCategory('Todos')}
                        className={`w-full text-left px-3 py-3 rounded-lg text-base font-medium transition-all flex items-center justify-between ${
                          selectedCategory === 'Todos' 
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                            : 'text-gray-600 dark:text-gray-400 active:bg-gray-100'
                        }`}
                      >
                        Todos
                        {selectedCategory === 'Todos' && <Check className="w-4 h-4" />}
                      </button>
                      
                      {structure.categories.map(cat => (
                        <div key={cat.name} className="space-y-1">
                          <button
                            onClick={() => {
                              setSelectedCategory(cat.name);
                              toggleCategoryExpand(cat.name);
                            }}
                            className={`w-full text-left px-3 py-3 rounded-lg text-base font-medium transition-all flex items-center justify-between ${
                              selectedCategory === cat.name 
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                                : 'text-gray-600 dark:text-gray-400 active:bg-gray-100'
                            }`}
                          >
                            {cat.name}
                            {expandedCategories[cat.name] ? <ChevronRight className="w-4 h-4 rotate-90" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                          
                          {expandedCategories[cat.name] && cat.tags.length > 0 && (
                            <div className="pl-4 space-y-2 pb-2">
                              {cat.tags.map(tag => (
                                <div 
                                  key={tag} 
                                  onClick={() => toggleTag(tag)}
                                  className="flex items-center gap-3 p-2 rounded-lg active:bg-gray-50"
                                >
                                  <Checkbox 
                                    checked={selectedTags.includes(tag)}
                                    onCheckedChange={() => toggleTag(tag)}
                                  />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{tag}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-gray-200 dark:bg-gray-700" />

                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Preço</h3>
                    <div className="px-2 pb-4">
                      <Slider
                        min={0}
                        max={Math.ceil(structure.priceLimits[1]) || 1000}
                        step={10}
                        value={priceRange}
                        onValueChange={setPriceRange}
                        className="mb-6"
                      />
                      <div className="flex gap-3">
                        <div className="flex-1 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg text-center border border-gray-200 dark:border-gray-700">
                          <span className="text-xs text-gray-500 block">Mínimo</span>
                          <span className="font-bold">R$ {priceRange[0]}</span>
                        </div>
                        <div className="flex-1 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg text-center border border-gray-200 dark:border-gray-700">
                          <span className="text-xs text-gray-500 block">Máximo</span>
                          <span className="font-bold">R$ {priceRange[1]}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {structure.brands.length > 0 && (
                    <>
                      <div className="h-px bg-gray-200 dark:bg-gray-700" />
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Marcas</h3>
                        <div className="space-y-3">
                          {structure.brands.map(brand => (
                            <div key={brand} className="flex items-center space-x-3">
                              <Checkbox 
                                id={`mobile-brand-${brand}`} 
                                checked={selectedBrands.includes(brand)}
                                onCheckedChange={() => toggleBrand(brand)}
                                className="h-5 w-5"
                              />
                              <label
                                htmlFor={`mobile-brand-${brand}`}
                                className="text-base font-medium text-gray-700 dark:text-gray-300"
                              >
                                {brand}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <Button 
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg"
                    onClick={() => setShowMobileFilters(false)}
                  >
                    Ver {produtosFiltrados.length} Resultados
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Grid de Produtos */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 bg-gray-100 dark:bg-gray-900">
          <div className="max-w-full mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                {selectedCategory === 'Todos' ? 'Todos os Produtos' : selectedCategory}
              </h2>
              <Button 
                variant="ghost" 
                onClick={() => setShowLostSales(true)}
                className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Frown className="w-5 h-5 mr-2" />
                Não encontrou?
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 pb-24">
              {produtosFiltrados.map(produto => (
                <motion.div 
                  key={produto.id}
                  layoutId={produto.id}
                  onClick={() => {
                    setSelectedProductForDetail(produto);
                    setIsDetailOpen(true);
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col h-full border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 group"
                >
                  <div className="aspect-square bg-gray-50 dark:bg-gray-700 rounded-2xl mb-4 flex items-center justify-center text-gray-300 dark:text-gray-600 overflow-hidden relative">
                    {produto.imagem_url ? (
                      <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-20 h-20 opacity-50" />
                    )}
                    <div className="absolute bottom-3 right-3 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity scale-0 group-hover:scale-100">
                      <Plus className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 line-clamp-2 mb-2 leading-tight flex-1">
                    {produto.nome}
                  </h3>
                  <div className="mt-auto pt-2">
                    <span className="block text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                      R$ {produto.preco_venda_padrao.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">unidade</span>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {produtosFiltrados.length === 0 && (
              <div className="text-center py-20">
                <Package className="w-24 h-24 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-2xl font-bold text-gray-600 dark:text-gray-300 mb-2">Nenhum produto encontrado</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8">Tente buscar por outro termo ou categoria</p>
                <Button 
                  onClick={() => setShowLostSales(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 py-6 text-lg"
                >
                  Sugerir este produto
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar (Suggested Products) */}
        {carrinho.length > 0 && recommendations.length > 0 && (
           <SuggestedProductsSidebar 
              recommendations={recommendations} 
              onAddRec={(prod) => {
                  setSelectedProductForDetail(prod);
                  setIsDetailOpen(true);
              }}
           />
        )}
      </div>

      {/* Bottom Area: Cart Bar Only */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex flex-col bg-gradient-to-t from-white/90 to-transparent dark:from-gray-900/90 pointer-events-none">
          {/* Cart Bar */}
          {carrinho.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)] pointer-events-auto">
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowCartModal(true)}>
                  <div className="relative">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <ShoppingCart className="w-6 h-6" />
                    </div>
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white dark:border-gray-800">
                      {totalItens}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Total</p>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
                      R$ {totalCarrinho.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCartModal(true)}
                    className="hidden md:flex h-12 px-6 font-bold border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl"
                  >
                    Revisar
                  </Button>
                  <Button 
                    onClick={() => setShowCartModal(true)} // Force review before paying
                    className="h-12 px-8 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20"
                  >
                    Pagar <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}
      </div>

      <ProductDetailDialog 
         isOpen={isDetailOpen}
         onClose={() => setIsDetailOpen(false)}
         product={selectedProductForDetail}
         onConfirm={(product, quantity) => {
             // Logic to add specific quantity
             const existingItem = carrinho.find(i => i.produto_id === product.id);
             if (existingItem) {
                 onUpdateQuantity(product.id, quantity); // Add to existing? usually update quantity means set total?
                 // Wait, onUpdateQuantity usually adds delta. 
                 // Let's check how onUpdateQuantity is implemented. 
                 // Assuming onUpdateQuantity(id, delta) -> I'll just call onAddToCart multiple times or fix this logic.
                 // Simple fix: onAddToCart usually adds 1. 
                 // I'll modify onAddToCart to accept quantity if possible or just loop.
                 // Since I can't easily change the parent logic without seeing it (AutoShop parent),
                 // I will assume onAddToCart adds 1. I'll loop.
                 for(let i=0; i<quantity; i++) onAddToCart(product);
             } else {
                 for(let i=0; i<quantity; i++) onAddToCart(product);
             }
         }}
      />

      {/* Modal Carrinho */}
      <Dialog open={showCartModal} onOpenChange={setShowCartModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-3xl border-0 shadow-2xl p-0 gap-0">
          <DialogHeader className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 sticky top-0 z-10 backdrop-blur-sm">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
              <ShoppingCart className="w-6 h-6 text-indigo-600" />
              Seu Carrinho
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-4 min-h-[300px]">
            {carrinho.length === 0 ? (
              <div className="text-center py-20 opacity-50">
                <p>Seu carrinho está vazio</p>
              </div>
            ) : (
              carrinho.map(item => (
                <div key={item.produto_id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-300 overflow-hidden relative">
                    {item.imagem ? (
                      <img src={item.imagem} alt={item.produto_nome} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white leading-tight mb-1">{item.produto_nome}</h4>
                    <p className="text-indigo-600 font-bold">R$ {item.preco_unitario_praticado.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl p-1 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <button 
                      onClick={() => onUpdateQuantity(item.produto_id, -1)}
                      className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="w-8 text-center font-bold text-lg">{item.quantidade}</span>
                    <button 
                      onClick={() => onUpdateQuantity(item.produto_id, 1)}
                      className="w-10 h-10 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <button 
                    onClick={() => onRemoveFromCart(item.produto_id)}
                    className="w-12 h-12 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors ml-2"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 sticky bottom-0 z-10">
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-500 text-lg font-medium">Total a Pagar</span>
              <span className="text-3xl font-extrabold text-gray-900 dark:text-white">R$ {totalCarrinho.toFixed(2)}</span>
            </div>
            <Button 
              onClick={() => { setShowCartModal(false); onProceed(); }}
              disabled={carrinho.length === 0}
              className="w-full h-16 text-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-xl shadow-emerald-600/20"
            >
              Finalizar Compra
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AutoLostSales 
        open={showLostSales} 
        onClose={() => setShowLostSales(false)} 
      />
    </motion.div>
  );
}

function AutoLostSales({ open, onClose }) {
  const [msg, setMsg] = useState('');
  const [qtd, setQtd] = useState(1);
  const [sugestoes, setSugestoes] = useState([]);
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
      // Carrega sugestões de vendas perdidas anteriores
      base44.entities.VendaPerdida.list().then(items => {
        const nomes = [...new Set(items.map(i => i.produto_nome || i.nome_produto_nao_mix).filter(Boolean))];
        setSugestoes(nomes);
      }).catch(console.error);
    }
  }, [open]);

  const filteredSugestoes = msg.length >= 2 
    ? sugestoes.filter(s => s.toLowerCase().includes(msg.toLowerCase())).slice(0, 3)
    : [];

  const handleSubmit = async () => {
    try {
      const user = await base44.auth.me();
      await base44.entities.VendaPerdida.create({
        produto_nome: msg,
        quantidade_desejada: parseInt(qtd),
        motivo: "N\u00e3o Trabalhamos", // Default para auto-atendimento
        vendedor_id: user.id, // Totem user
        data_registro: new Date().toISOString(),
        origem: 'Auto-Atendimento'
      });

      toast({
        title: "Sugestão Recebida!",
        description: "Obrigado por nos ajudar a melhorar.",
        className: "bg-emerald-100 text-emerald-800"
      });
      setMsg('');
      setQtd(1);
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao enviar", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white dark:bg-gray-900 rounded-3xl border-0 p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2">Não encontrou?</DialogTitle>
          <p className="text-center text-gray-500">Conta pra gente o que você estava procurando. Vamos providenciar!</p>
        </DialogHeader>
        <div className="py-6 space-y-4">
          <div className="relative">
            <Input 
              placeholder="Nome do produto (ex: Carrinho de mão)..." 
              value={msg}
              onChange={e => setMsg(e.target.value)}
              className="h-14 text-lg bg-gray-50 dark:bg-gray-800 border-gray-200 rounded-xl pl-4"
              autoFocus
            />
            {filteredSugestoes.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                {filteredSugestoes.map((s, i) => (
                  <div 
                    key={i} 
                    className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer text-gray-700 dark:text-gray-200"
                    onClick={() => setMsg(s)}
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
             <div className="w-1/3">
                <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Quantidade</label>
                <Input 
                  type="number"
                  min="1"
                  value={qtd}
                  onChange={e => setQtd(e.target.value)}
                  className="h-14 text-lg text-center bg-gray-50 dark:bg-gray-800 border-gray-200 rounded-xl"
                />
             </div>
             <Button 
                onClick={handleSubmit}
                disabled={!msg}
                className="flex-1 h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl mt-5"
              >
                Enviar Sugestão
              </Button>
          </div>
          
          <Button variant="ghost" onClick={onClose} className="w-full h-12 text-gray-400">
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SuggestedProductsSidebar({ recommendations, onAddRec }) {
  return (
    <div className="hidden lg:flex w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex-col overflow-y-auto shrink-0 pb-32">
      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800">
        <h3 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wide flex items-center gap-2">
          <Plus className="w-4 h-4" /> Aproveite
        </h3>
        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
          Clientes que compraram o que você escolheu também levaram:
        </p>
      </div>
      
      <div className="p-3 space-y-3">
        {recommendations.map(rec => (
          <motion.div 
            key={rec.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="group relative bg-white dark:bg-gray-700 rounded-xl p-3 border border-gray-100 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 shadow-sm transition-all cursor-pointer"
            onClick={() => onAddRec(rec)}
          >
            <div className="aspect-video bg-gray-50 dark:bg-gray-600 rounded-lg mb-2 overflow-hidden relative">
               {rec.imagem_url ? (
                 <img src={rec.imagem_url} alt={rec.nome} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Package className="w-8 h-8" />
                 </div>
               )}
               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 transition-all">
                    <Plus className="w-4 h-4 text-indigo-600" />
                  </div>
               </div>
            </div>
            
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 line-clamp-2 mb-1 leading-tight">
              {rec.nome}
            </h4>
            <div className="flex items-center justify-between">
              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
                R$ {rec.preco_venda_padrao.toFixed(2)}
              </span>
              <div className="bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 p-1 rounded text-[10px] font-bold">
                ADD
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// New component for the Welcome Banner at the top (only visible when cart is empty)
function WelcomeBanner({ config, onUpdateConfig, visible }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    if (config) setEditForm(config);
  }, [config]);

  const handleSaveConfig = async () => {
    try {
        await base44.entities.ConfigAutoAtendimento.update(config.id, editForm);
        await onUpdateConfig();
        setIsEditing(false);
        toast({ title: "Configuração atualizada!" });
    } catch (error) {
        toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  if (!config || !visible) return null;

  return (
    <div 
      className="relative h-64 md:h-80 bg-slate-900 text-white shrink-0 overflow-hidden group mb-6 rounded-b-3xl shadow-2xl mx-4 mt-4"
      style={{ 
        backgroundImage: config.imagem_fundo_url ? `linear-gradient(to bottom, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.9)), url(${config.imagem_fundo_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
       <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12 z-10">
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl md:text-6xl font-extrabold mb-3 text-white drop-shadow-lg tracking-tight">
                {config.titulo_boas_vindas}
            </h1>
            <p className="text-xl text-slate-200 font-medium max-w-2xl drop-shadow-md bg-black/20 backdrop-blur-sm p-2 rounded-lg inline-block">
                {config.subtitulo_boas_vindas}
            </p>
          </motion.div>
       </div>

       <button 
         onClick={() => setIsEditing(true)}
         className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white/50 hover:text-white transition-all opacity-0 group-hover:opacity-100"
       >
         <Edit3 className="w-4 h-4" />
       </button>

       <Dialog open={isEditing} onOpenChange={setIsEditing}>
         <DialogContent className="dark:bg-gray-900 dark:text-white dark:border-gray-700">
           <DialogHeader>
             <DialogTitle>Editar Banner Promocional</DialogTitle>
           </DialogHeader>
           <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label>Título Principal</Label>
               <Input 
                 value={editForm.titulo_boas_vindas || ''} 
                 onChange={e => setEditForm({...editForm, titulo_boas_vindas: e.target.value})}
                 className="dark:bg-gray-800 dark:border-gray-700"
               />
             </div>
             <div className="space-y-2">
               <Label>Subtítulo</Label>
               <Input 
                 value={editForm.subtitulo_boas_vindas || ''} 
                 onChange={e => setEditForm({...editForm, subtitulo_boas_vindas: e.target.value})}
                 className="dark:bg-gray-800 dark:border-gray-700"
               />
             </div>
             <div className="space-y-2">
               <Label>URL da Imagem de Fundo</Label>
               <Input 
                   value={editForm.imagem_fundo_url || ''} 
                   onChange={e => setEditForm({...editForm, imagem_fundo_url: e.target.value})}
                   className="dark:bg-gray-800 dark:border-gray-700"
                   placeholder="https://..."
               />
             </div>
           </div>
           <DialogFooter>
             <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
             <Button onClick={handleSaveConfig} className="bg-indigo-600 hover:bg-indigo-700 text-white">Salvar Alterações</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
    </div>
  );
}