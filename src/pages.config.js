import Dashboard from './pages/Dashboard';
import Produtos from './pages/Produtos';
import Terceiros from './pages/Terceiros';
import Vendas from './pages/Vendas';
import Compras from './pages/Compras';
import Estoque from './pages/Estoque';
import Financeiro from './pages/Financeiro';
import EdicaoMassivaCustos from './pages/EdicaoMassivaCustos';
import Logistica from './pages/Logistica';
import TabelasPreco from './pages/TabelasPreco';
import Campanhas from './pages/Campanhas';
import Veiculos from './pages/Veiculos';
import Relatorios from './pages/Relatorios';
import MapaFuncionalidades from './pages/MapaFuncionalidades';
import Expedicao from './pages/Expedicao';
import Operacoes from './pages/Operacoes';
import PDV from './pages/PDV';
import VendasGestao from './pages/VendasGestao';
import FinanceiroModulo from './pages/FinanceiroModulo';
import Configuracoes from './pages/Configuracoes';
import CaixasAtivos from './pages/CaixasAtivos';
import VendasPerdidas from './pages/VendasPerdidas';
import Manual from './pages/Manual';
import DebugTenant from './pages/DebugTenant';
import AutoAtendimento from './pages/AutoAtendimento';
import RelatorioMargem from './pages/RelatorioMargem';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Produtos": Produtos,
    "Terceiros": Terceiros,
    "Vendas": Vendas,
    "Compras": Compras,
    "Estoque": Estoque,
    "Financeiro": Financeiro,
    "EdicaoMassivaCustos": EdicaoMassivaCustos,
    "Logistica": Logistica,
    "TabelasPreco": TabelasPreco,
    "Campanhas": Campanhas,
    "Veiculos": Veiculos,
    "Relatorios": Relatorios,
    "MapaFuncionalidades": MapaFuncionalidades,
    "Expedicao": Expedicao,
    "Operacoes": Operacoes,
    "PDV": PDV,
    "VendasGestao": VendasGestao,
    "FinanceiroModulo": FinanceiroModulo,
    "Configuracoes": Configuracoes,
    "CaixasAtivos": CaixasAtivos,
    "VendasPerdidas": VendasPerdidas,
    "Manual": Manual,
    "DebugTenant": DebugTenant,
    "AutoAtendimento": AutoAtendimento,
    "RelatorioMargem": RelatorioMargem,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};