import React from 'react'
import './App.css'
import { Toaster } from "@/components/ui/toaster"
import SplashScreen from '@/components/SplashScreen'
import NavigationTransitionOverlay from '@/components/NavigationTransitionOverlay'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { NavigationTransitionProvider, NavigationTransitionDetector } from '@/lib/NavigationTransitionContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ReimpressaoDocumentos from '@/pages/ReimpressaoDocumentos';
import Home from '@/pages/Home';
import Notificacoes from '@/pages/Notificacoes';
import PDVCaixa from '@/pages/PDVCaixa';
import PDVVendedor from '@/pages/PDVVendedor';
import CaixasAtivos from '@/pages/CaixasAtivos';
import SugestoesCompra from '@/pages/SugestoesCompra';
import Cotacoes from '@/pages/Cotacoes';
import PedidosCompra from '@/pages/PedidosCompra';
import AprovacoesFinanceiras from '@/pages/AprovacoesFinanceiras';
import TemplatesCompra from '@/pages/TemplatesCompra';
import PedidoCompraDetalhe from '@/pages/PedidoCompraDetalhe';
import ConferenciaEntrada from '@/pages/ConferenciaEntrada';
import TabelaPrecosConsulta from '@/pages/TabelaPrecosConsulta';
import ImportacaoProdutos from '@/pages/ImportacaoProdutos';
import EditorLayoutsTres from '@/pages/EditorLayoutsTres';
import DesignerDocumento from '@/pages/DesignerDocumento';
import GestaoTemplates from '@/pages/GestaoTemplates';
import LixeiraLancamentos from '@/pages/LixeiraLancamentos';
import SimuladorCartao from '@/pages/SimuladorCartao';
import ReversaoDespesasSangrias from '@/pages/ReversaoDespesasSangrias';
import ConsumoInterno from '@/pages/ConsumoInterno';
import AuditoriaPins from '@/pages/AuditoriaPins';
import AgefinConsulta from '@/pages/AgefinConsulta';
import ItinerarioFluvial from '@/pages/ItinerarioFluvial.jsx';
import AuditoriaCodigoProjeto from '@/pages/AuditoriaCodigoProjeto';
import ModoFlareProvider from '@/features/modo-flare/ModoFlareProvider';

const { Pages, Layout } = pagesConfig;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();
  const [showSplash, setShowSplash] = React.useState(() => !sessionStorage.getItem('p38_splash_shown'));

  const handleSplashFinish = () => {
    sessionStorage.setItem('p38_splash_shown', '1');
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }



  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <>
      <NavigationTransitionDetector />
      <Routes>
        <Route path="/" element={
        <LayoutWrapper currentPageName="Home">
          <Home />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/ReimpressaoDocumentos" element={
        <LayoutWrapper currentPageName="ReimpressaoDocumentos">
          <ReimpressaoDocumentos />
        </LayoutWrapper>
      } />
      <Route path="/Home" element={
        <LayoutWrapper currentPageName="Home">
          <Home />
        </LayoutWrapper>
      } />
      <Route path="/Notificacoes" element={
        <LayoutWrapper currentPageName="Notificacoes">
          <Notificacoes />
        </LayoutWrapper>
      } />
      <Route path="/PDVCaixa" element={
        <LayoutWrapper currentPageName="PDVCaixa">
          <PDVCaixa />
        </LayoutWrapper>
      } />
      <Route path="/PDVVendedor" element={
        <LayoutWrapper currentPageName="PDVVendedor">
          <PDVVendedor />
        </LayoutWrapper>
      } />
      <Route path="/CaixasAtivos" element={
        <LayoutWrapper currentPageName="CaixasAtivos">
          <CaixasAtivos />
        </LayoutWrapper>
      } />
      <Route path="/SugestoesCompra" element={
        <LayoutWrapper currentPageName="SugestoesCompra">
          <SugestoesCompra />
        </LayoutWrapper>
      } />
      <Route path="/Cotacoes" element={
        <LayoutWrapper currentPageName="Cotacoes">
          <Cotacoes />
        </LayoutWrapper>
      } />
      <Route path="/PedidosCompra" element={
        <LayoutWrapper currentPageName="PedidosCompra">
          <PedidosCompra />
        </LayoutWrapper>
      } />
      <Route path="/AprovacoesFinanceiras" element={
        <LayoutWrapper currentPageName="AprovacoesFinanceiras">
          <AprovacoesFinanceiras />
        </LayoutWrapper>
      } />
      <Route path="/TemplatesCompra" element={
        <LayoutWrapper currentPageName="TemplatesCompra">
          <TemplatesCompra />
        </LayoutWrapper>
      } />
      <Route path="/PedidoCompraDetalhe" element={
        <LayoutWrapper currentPageName="PedidoCompraDetalhe">
          <PedidoCompraDetalhe />
        </LayoutWrapper>
      } />

      <Route path="/ConferenciaEntrada" element={
        <LayoutWrapper currentPageName="ConferenciaEntrada">
          <ConferenciaEntrada />
        </LayoutWrapper>
      } />
      <Route path="/TabelaPrecosConsulta" element={
        <LayoutWrapper currentPageName="TabelaPrecosConsulta">
          <TabelaPrecosConsulta />
        </LayoutWrapper>
      } />
      <Route path="/ImportacaoProdutos" element={
        <LayoutWrapper currentPageName="ImportacaoProdutos">
          <ImportacaoProdutos />
        </LayoutWrapper>
      } />
      <Route path="/EditorLayoutsTres" element={
        <LayoutWrapper currentPageName="EditorLayoutsTres">
          <EditorLayoutsTres />
        </LayoutWrapper>
      } />

      <Route path="/DesignerDocumento" element={
        <LayoutWrapper currentPageName="DesignerDocumento">
          <DesignerDocumento />
        </LayoutWrapper>
      } />
      <Route path="/GestaoTemplates" element={<LayoutWrapper currentPageName="GestaoTemplates"><GestaoTemplates /></LayoutWrapper>} />
      <Route path="/LixeiraLancamentos" element={<LayoutWrapper currentPageName="LixeiraLancamentos"><LixeiraLancamentos /></LayoutWrapper>} />
      <Route path="/SimuladorCartao" element={<LayoutWrapper currentPageName="SimuladorCartao"><SimuladorCartao /></LayoutWrapper>} />
      <Route path="/ReversaoDespesasSangrias" element={<LayoutWrapper currentPageName="ReversaoDespesasSangrias"><ReversaoDespesasSangrias /></LayoutWrapper>} />
      <Route path="/ConsumoInterno" element={<LayoutWrapper currentPageName="ConsumoInterno"><ConsumoInterno /></LayoutWrapper>} />
      <Route path="/AuditoriaPins" element={<LayoutWrapper currentPageName="AuditoriaPins"><AuditoriaPins /></LayoutWrapper>} />
      <Route path="/AgefinConsulta" element={<LayoutWrapper currentPageName="AgefinConsulta"><AgefinConsulta /></LayoutWrapper>} />
      <Route path="/ItinerarioFluvial" element={<LayoutWrapper currentPageName="ItinerarioFluvial"><ItinerarioFluvial /></LayoutWrapper>} />
      <Route path="/AuditoriaCodigoProjeto" element={<LayoutWrapper currentPageName="AuditoriaCodigoProjeto"><AuditoriaCodigoProjeto /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <NavigationTransitionProvider>
          <Router>
            <ModoFlareProvider>
              <NavigationTracker />
              <NavigationTransitionOverlay />
              <AuthenticatedApp />
            </ModoFlareProvider>
          </Router>
          <VisualEditAgent />
        </NavigationTransitionProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App