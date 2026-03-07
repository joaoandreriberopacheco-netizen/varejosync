import React, { useState } from 'react';
import { TrendingUp, Package, DollarSign, BarChart3, Settings, Building2, Users, Sliders, Tags, Percent, Wallet, CreditCard, Smartphone, Bookmark, Wrench, Shield, MapPin } from 'lucide-react';
import { GlacialTabsList, GlacialTabsTrigger, GlacialSubTabsList, GlacialSubTabsTrigger } from '@/components/ui/GlacialTabs';
import TabelasPrecoManager from '../components/config/TabelasPrecoManager';
import ConfiguracoesVendaManager from '../components/config/ConfiguracoesVendaManager';
import PoliticasDescontoManager from '../components/config/PoliticasDescontoManager';
import AreasManager from '../components/config/AreasManager';
import ContasFinanceirasManager from '../components/config/ContasFinanceirasManager';
import CategoriasFinanceirasManager from '../components/config/CategoriasFinanceirasManager';
import ConfigEstoqueManager from '../components/config/ConfigEstoqueManager';
import MaquininhasManager from '../components/config/MaquininhasManager';
import FormasPagamentoManager from '../components/config/FormasPagamentoManager';
import ListaUsuariosApp from '../components/config/ListaUsuariosApp';
import DadosEmpresaManager from '../components/config/DadosEmpresaManager';
import PerfisDeAcessoManager from '../components/config/PerfisDeAcessoManager';
import RecomecarDoZero from '../components/config/RecomecarDoZero';

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState('vendas');
  const [vendaTab, setVendaTab] = useState('fluxo');
  const [opTab, setOpTab] = useState('estoque');
  const [finTab, setFinTab] = useState('contas');
  const [geralTab, setGeralTab] = useState('empresa');

  return (
    <div className="max-w-7xl mx-auto space-y-4 overflow-x-hidden">
      <div>
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 font-glacial">Configurações</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500">Regras de negócio e parâmetros do sistema</p>
      </div>

      {/* Tabs principais */}
      <GlacialTabsList scrollable>
        <GlacialTabsTrigger value="vendas"     activeValue={tab} onSelect={setTab} icon={TrendingUp}  label="Vendas" />
        <GlacialTabsTrigger value="operacoes"  activeValue={tab} onSelect={setTab} icon={Package}     label="Operações" />
        <GlacialTabsTrigger value="financeiro" activeValue={tab} onSelect={setTab} icon={DollarSign}  label="Financeiro" />
        <GlacialTabsTrigger value="relatorios" activeValue={tab} onSelect={setTab} icon={BarChart3}   label="Relatórios" />
        <GlacialTabsTrigger value="geral"      activeValue={tab} onSelect={setTab} icon={Settings}    label="Parâmetros" />
        <GlacialTabsTrigger value="sistema"    activeValue={tab} onSelect={setTab} icon={Wrench}      label="Ferramentas" />
      </GlacialTabsList>

      <div className="pt-1">
        {/* VENDAS */}
        {tab === 'vendas' && (
          <div className="space-y-4">
            <GlacialSubTabsList>
              <GlacialSubTabsTrigger value="fluxo"    activeValue={vendaTab} onSelect={setVendaTab} icon={Sliders}  label="Fluxo & Parâmetros" />
              <GlacialSubTabsTrigger value="tabelas"  activeValue={vendaTab} onSelect={setVendaTab} icon={Tags}     label="Tabelas de Preço" />
              <GlacialSubTabsTrigger value="desconto" activeValue={vendaTab} onSelect={setVendaTab} icon={Percent}  label="Políticas de Desconto" />
            </GlacialSubTabsList>
            <div>
              {vendaTab === 'fluxo'    && <ConfiguracoesVendaManager />}
              {vendaTab === 'tabelas'  && <TabelasPrecoManager />}
              {vendaTab === 'desconto' && <PoliticasDescontoManager />}
            </div>
          </div>
        )}

        {/* OPERAÇÕES */}
        {tab === 'operacoes' && (
          <div className="space-y-4">
            <GlacialSubTabsList>
              <GlacialSubTabsTrigger value="estoque" activeValue={opTab} onSelect={setOpTab} icon={Package} label="Estoque" />
              <GlacialSubTabsTrigger value="areas"   activeValue={opTab} onSelect={setOpTab} icon={MapPin}  label="Áreas/Setores" />
            </GlacialSubTabsList>
            <div>
              {opTab === 'estoque' && <ConfigEstoqueManager />}
              {opTab === 'areas'   && <AreasManager />}
            </div>
          </div>
        )}

        {/* FINANCEIRO */}
        {tab === 'financeiro' && (
          <div className="space-y-4">
            <GlacialSubTabsList>
              <GlacialSubTabsTrigger value="contas"      activeValue={finTab} onSelect={setFinTab} icon={Wallet}     label="Contas" />
              <GlacialSubTabsTrigger value="formas"      activeValue={finTab} onSelect={setFinTab} icon={CreditCard} label="Pagamentos" />
              <GlacialSubTabsTrigger value="maquininhas" activeValue={finTab} onSelect={setFinTab} icon={Smartphone} label="Maquininhas" />
              <GlacialSubTabsTrigger value="categorias"  activeValue={finTab} onSelect={setFinTab} icon={Bookmark}   label="Categorias" />
            </GlacialSubTabsList>
            <div>
              {finTab === 'contas'      && <ContasFinanceirasManager />}
              {finTab === 'formas'      && <FormasPagamentoManager />}
              {finTab === 'maquininhas' && <MaquininhasManager />}
              {finTab === 'categorias'  && <CategoriasFinanceirasManager />}
            </div>
          </div>
        )}

        {/* RELATÓRIOS */}
        {tab === 'relatorios' && (
          <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
            Configurações de relatórios em desenvolvimento
          </div>
        )}

        {/* PARÂMETROS GERAIS */}
        {tab === 'geral' && (
          <div className="space-y-4">
            <GlacialSubTabsList>
              <GlacialSubTabsTrigger value="empresa"       activeValue={geralTab} onSelect={setGeralTab} icon={Building2} label="Dados da Empresa" />
              <GlacialSubTabsTrigger value="usuarios-app"  activeValue={geralTab} onSelect={setGeralTab} icon={Users}     label="Usuários" />
              <GlacialSubTabsTrigger value="perfis-acesso" activeValue={geralTab} onSelect={setGeralTab} icon={Shield}    label="Perfis de Acesso" />
            </GlacialSubTabsList>
            <div>
              {geralTab === 'empresa'       && <DadosEmpresaManager />}
              {geralTab === 'usuarios-app'  && <ListaUsuariosApp />}
              {geralTab === 'perfis-acesso' && <PerfisDeAcessoManager />}
            </div>
          </div>
        )}

        {/* FERRAMENTAS */}
        {tab === 'sistema' && (
          <div className="space-y-6 pt-2">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ferramentas de Sistema</h2>
            </div>
            <RecomecarDoZero />
          </div>
        )}
      </div>
    </div>
  );
}