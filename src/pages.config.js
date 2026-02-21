/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Armazenagem from './pages/Armazenagem';
import AutoAtendimento from './pages/AutoAtendimento';
import CaixasAtivos from './pages/CaixasAtivos';
import Campanhas from './pages/Campanhas';
import Compras from './pages/Compras';
import ConferenciaEntrada from './pages/ConferenciaEntrada';
import ConferenciaItens from './pages/ConferenciaItens';
import ConferenciaVolumes from './pages/ConferenciaVolumes';
import Configuracoes from './pages/Configuracoes';
import ControleCaixasAtivos from './pages/ControleCaixasAtivos';
import ControleEntregas from './pages/ControleEntregas';
import Dashboard from './pages/Dashboard';
import DashboardCaixa from './pages/DashboardCaixa';
import DashboardVendedor from './pages/DashboardVendedor';
import DevolucaoTroca from './pages/DevolucaoTroca';
import DiscriminarVolumes from './pages/DiscriminarVolumes';
import EdicaoMassivaCustos from './pages/EdicaoMassivaCustos';
import EstimativaEmbalagensIA from './pages/EstimativaEmbalagensIA';
import Estoque from './pages/Estoque';
import ExclusaoDocumentos from './pages/ExclusaoDocumentos';
import Expedicao from './pages/Expedicao';
import ExtratoConta from './pages/ExtratoConta';
import Financeiro from './pages/Financeiro';
import FinanceiroAprovacoes from './pages/FinanceiroAprovacoes';
import FinanceiroModulo from './pages/FinanceiroModulo';
import Home from './pages/Home';
import HubLogistico from './pages/HubLogistico';
import ImportacaoProdutos from './pages/ImportacaoProdutos';
import InterfaceSeparador from './pages/InterfaceSeparador';
import Intervenientes from './pages/Intervenientes';
import Logistica from './pages/Logistica';
import LogsAutenticacao from './pages/LogsAutenticacao';
import Manual from './pages/Manual';
import MapaFuncionalidades from './pages/MapaFuncionalidades';
import Operacoes from './pages/Operacoes';
import OtimizacaoEstoqueIA from './pages/OtimizacaoEstoqueIA';
import PDV from './pages/PDV';
import PainelGerente from './pages/PainelGerente';
import Produtos from './pages/Produtos';
import RelatorioMargem from './pages/RelatorioMargem';
import Relatorios from './pages/Relatorios';
import TabelasPreco from './pages/TabelasPreco';
import Terceiros from './pages/Terceiros';
import TurnosFechados from './pages/TurnosFechados';
import Veiculos from './pages/Veiculos';
import Vendas from './pages/Vendas';
import VendasGestao from './pages/VendasGestao';
import VendasPerdidas from './pages/VendasPerdidas';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Armazenagem": Armazenagem,
    "AutoAtendimento": AutoAtendimento,
    "CaixasAtivos": CaixasAtivos,
    "Campanhas": Campanhas,
    "Compras": Compras,
    "ConferenciaEntrada": ConferenciaEntrada,
    "ConferenciaItens": ConferenciaItens,
    "ConferenciaVolumes": ConferenciaVolumes,
    "Configuracoes": Configuracoes,
    "ControleCaixasAtivos": ControleCaixasAtivos,
    "ControleEntregas": ControleEntregas,
    "Dashboard": Dashboard,
    "DashboardCaixa": DashboardCaixa,
    "DashboardVendedor": DashboardVendedor,
    "DevolucaoTroca": DevolucaoTroca,
    "DiscriminarVolumes": DiscriminarVolumes,
    "EdicaoMassivaCustos": EdicaoMassivaCustos,
    "EstimativaEmbalagensIA": EstimativaEmbalagensIA,
    "Estoque": Estoque,
    "ExclusaoDocumentos": ExclusaoDocumentos,
    "Expedicao": Expedicao,
    "ExtratoConta": ExtratoConta,
    "Financeiro": Financeiro,
    "FinanceiroAprovacoes": FinanceiroAprovacoes,
    "FinanceiroModulo": FinanceiroModulo,
    "Home": Home,
    "HubLogistico": HubLogistico,
    "ImportacaoProdutos": ImportacaoProdutos,
    "InterfaceSeparador": InterfaceSeparador,
    "Intervenientes": Intervenientes,
    "Logistica": Logistica,
    "LogsAutenticacao": LogsAutenticacao,
    "Manual": Manual,
    "MapaFuncionalidades": MapaFuncionalidades,
    "Operacoes": Operacoes,
    "OtimizacaoEstoqueIA": OtimizacaoEstoqueIA,
    "PDV": PDV,
    "PainelGerente": PainelGerente,
    "Produtos": Produtos,
    "RelatorioMargem": RelatorioMargem,
    "Relatorios": Relatorios,
    "TabelasPreco": TabelasPreco,
    "Terceiros": Terceiros,
    "TurnosFechados": TurnosFechados,
    "Veiculos": Veiculos,
    "Vendas": Vendas,
    "VendasGestao": VendasGestao,
    "VendasPerdidas": VendasPerdidas,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};