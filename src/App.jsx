import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ReimpressaoDocumentos from '@/pages/ReimpressaoDocumentos';
import Home from '@/pages/Home';
import Notificacoes from '@/pages/Notificacoes';
import BalancoCaixa from '@/pages/BalancoCaixa';
import ProcessarVendas from '@/pages/ProcessarVendas';
import MovimentosCaixa from '@/pages/MovimentosCaixa';
import PDVVendedor from '@/pages/PDVVendedor';
import PDVCaixa from '@/pages/PDVCaixa';
import CaixasAtivos from '@/pages/CaixasAtivos';
import SugestoesCompra from '@/pages/SugestoesCompra';
import Cotacoes from '@/pages/Cotacoes';
import PedidosCompra from '@/pages/PedidosCompra';
import ContasFinanceiras from '@/pages/ContasFinanceiras';
import AprovacoesFinanceiras from '@/pages/AprovacoesFinanceiras';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
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
      <Route path="/BalancoCaixa" element={
        <LayoutWrapper currentPageName="BalancoCaixa">
          <BalancoCaixa />
        </LayoutWrapper>
      } />
      <Route path="/ProcessarVendas" element={
        <LayoutWrapper currentPageName="ProcessarVendas">
          <ProcessarVendas />
        </LayoutWrapper>
      } />
      <Route path="/MovimentosCaixa" element={
        <LayoutWrapper currentPageName="MovimentosCaixa">
          <MovimentosCaixa />
        </LayoutWrapper>
      } />
      <Route path="/PDVVendedor" element={
        <LayoutWrapper currentPageName="PDVVendedor">
          <PDVVendedor />
        </LayoutWrapper>
      } />
      <Route path="/PDVCaixa" element={
        <LayoutWrapper currentPageName="PDVCaixa">
          <PDVCaixa />
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
      <Route path="/ContasFinanceiras" element={
        <LayoutWrapper currentPageName="ContasFinanceiras">
          <ContasFinanceiras />
        </LayoutWrapper>
      } />
      <Route path="/AprovacoesFinanceiras" element={
        <LayoutWrapper currentPageName="AprovacoesFinanceiras">
          <AprovacoesFinanceiras />
        </LayoutWrapper>
      } />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App