import AutoAtendimento from './pages/AutoAtendimento';
import CaixasAtivos from './pages/CaixasAtivos';
import Campanhas from './pages/Campanhas';
import Compras from './pages/Compras';
import Configuracoes from './pages/Configuracoes';
import Dashboard from './pages/Dashboard';
import DebugTenant from './pages/DebugTenant';
import EdicaoMassivaCustos from './pages/EdicaoMassivaCustos';
import Estoque from './pages/Estoque';
import Expedicao from './pages/Expedicao';
import Financeiro from './pages/Financeiro';
import FinanceiroModulo from './pages/FinanceiroModulo';
import Home from './pages/Home';
import HubLogistico from './pages/HubLogistico';
import Intervenientes from './pages/Intervenientes';
import Logistica from './pages/Logistica';
import Manual from './pages/Manual';
import MapaFuncionalidades from './pages/MapaFuncionalidades';
import Operacoes from './pages/Operacoes';
import PDV from './pages/PDV';
import Produtos from './pages/Produtos';
import RelatorioMargem from './pages/RelatorioMargem';
import Relatorios from './pages/Relatorios';
import TabelasPreco from './pages/TabelasPreco';
import Terceiros from './pages/Terceiros';
import Veiculos from './pages/Veiculos';
import Vendas from './pages/Vendas';
import VendasGestao from './pages/VendasGestao';
import VendasPerdidas from './pages/VendasPerdidas';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AutoAtendimento": AutoAtendimento,
    "CaixasAtivos": CaixasAtivos,
    "Campanhas": Campanhas,
    "Compras": Compras,
    "Configuracoes": Configuracoes,
    "Dashboard": Dashboard,
    "DebugTenant": DebugTenant,
    "EdicaoMassivaCustos": EdicaoMassivaCustos,
    "Estoque": Estoque,
    "Expedicao": Expedicao,
    "Financeiro": Financeiro,
    "FinanceiroModulo": FinanceiroModulo,
    "Home": Home,
    "HubLogistico": HubLogistico,
    "Intervenientes": Intervenientes,
    "Logistica": Logistica,
    "Manual": Manual,
    "MapaFuncionalidades": MapaFuncionalidades,
    "Operacoes": Operacoes,
    "PDV": PDV,
    "Produtos": Produtos,
    "RelatorioMargem": RelatorioMargem,
    "Relatorios": Relatorios,
    "TabelasPreco": TabelasPreco,
    "Terceiros": Terceiros,
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