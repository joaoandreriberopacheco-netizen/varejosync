import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { notify } from '@/components/ui/notify';
import { Plus, Trash2, Shield, Users, Pencil } from 'lucide-react';
import PerfilFormTela, { MODULOS, contarPermissoes } from './PerfilFormTela';
import { garantirChavesPermissoes, perfilTemEscopoTotal } from '@/lib/perfilPermissoes';

export default function PerfisDeAcessoManager() {
  const [perfis, setPerfis] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null); // null = lista, 'novo' = criar, perfil = editar
  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    setLoading(true);
    const [p, u] = await Promise.all([
      base44.entities.PerfilDeAcesso.list(),
      base44.entities.User.list()
    ]);
    setPerfis(p);
    setUsuarios(u);
    setLoading(false);
  };

  const handleSalvar = async (form) => {
    const editandoExistente = editando && editando !== 'novo';
    if (!form.nome.trim()) {
      notify.warning('Nome obrigatório', 'Informe um nome para o perfil.');
      return;
    }
    try {
      const payload = {
        ...form,
        permissoes: garantirChavesPermissoes(form.permissoes, {
          novasComo: false,
          perfilAdministrador: perfilTemEscopoTotal(form),
        }),
      };
      if (editandoExistente) {
        await base44.entities.PerfilDeAcesso.update(editando.id, payload);
      } else {
        await base44.entities.PerfilDeAcesso.create(payload);
      }
      notify.success(editandoExistente ? 'Perfil atualizado' : 'Perfil criado', 'As permissões foram salvas.');
      setEditando(null);
      carregarDados();
    } catch (e) {
      notify.error('Erro ao salvar', e.message);
    }
  };

  const deletar = async (id) => {
    const emUso = usuarios.filter(u => u.perfil_acesso_id === id).length;
    if (emUso > 0) {
      notify.warning(`Perfil em uso por ${emUso} usuário(s)`, 'Desvincule os usuários antes de excluir.');
      return;
    }
    if (!window.confirm('Excluir este perfil?')) return;
    await base44.entities.PerfilDeAcesso.delete(id);
    notify.success('Perfil excluído');
    carregarDados();
  };

  // ── Modo tela de edição ─────────────────────────────────────────
  if (editando !== null) {
    return (
      <PerfilFormTela
        perfil={editando === 'novo' ? null : editando}
        onSalvar={handleSalvar}
        onCancelar={() => setEditando(null)}
      />
    );
  }

  // ── Lista ───────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Perfis de Acesso</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Defina o que cada função pode ver e fazer</p>
        </div>
        <Button
          onClick={() => setEditando('novo')}
          size="sm"
          className="bg-gray-800 hover:bg-gray-900 text-white dark:bg-gray-200 dark:text-gray-900 gap-1.5 h-8 px-3"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-xs">Novo Perfil</span>
        </Button>
      </div>

      {perfis.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm text-center py-14">
          <Shield className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum perfil criado ainda</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Crie perfis para controlar o acesso de cada usuário</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {perfis.map(perfil => {
            const totalAtivas = MODULOS.reduce((acc, m) => acc + contarPermissoes(perfil.permissoes, m.key).ativas, 0);
            const totalGeral = MODULOS.reduce((acc, m) => acc + contarPermissoes(perfil.permissoes, m.key).total, 0);
            const qtdUsuarios = usuarios.filter(u => u.perfil_acesso_id === perfil.id).length;
            const pct = totalGeral > 0 ? (totalAtivas / totalGeral) * 100 : 0;

            return (
              <div key={perfil.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm leading-tight">{perfil.nome}</p>
                      {perfil.descricao && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1 mt-0.5">{perfil.descricao}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => setEditando(perfil)}
                      className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deletar(perfil.id)}
                      className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md font-mono">
                    {totalAtivas}/{totalGeral}
                  </span>
                  {qtdUsuarios > 0 && (
                    <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {qtdUsuarios}
                    </span>
                  )}
                  {perfil.menu_compacto && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">Compacto</span>
                  )}
                  {!perfil.ativo && (
                    <span className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-md">Inativo</span>
                  )}
                </div>

                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1">
                  <div className="h-1 rounded-full bg-gray-600 dark:bg-gray-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}