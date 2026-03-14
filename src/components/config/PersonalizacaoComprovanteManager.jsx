import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Save, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function PersonalizacaoComprovanteManager() {
  const [dadosEmpresa, setDadosEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    logo_url: '',
    mensagem_rodape: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const empresas = await base44.entities.DadosEmpresa.list();
      if (empresas && empresas.length > 0) {
        const empresa = empresas[0];
        setDadosEmpresa(empresa);
        setFormData({
          logo_url: empresa.logo_url || '',
          mensagem_rodape: empresa.mensagem_rodape || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, logo_url: file_url }));
      toast.success('Logo carregado com sucesso');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload do logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSalvar = async () => {
    if (!dadosEmpresa) {
      toast.error('Nenhuma empresa cadastrada');
      return;
    }

    try {
      setSalvando(true);
      await base44.entities.DadosEmpresa.update(dadosEmpresa.id, formData);
      toast.success('Configurações salvas com sucesso');
      await carregarDados();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">
          Personalização do Comprovante
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Configure a aparência dos comprovantes de venda impressos
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
        {/* Logo */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Logo da Empresa (será convertido para preto e branco)
          </label>
          
          {formData.logo_url && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <img 
                src={formData.logo_url} 
                alt="Logo atual" 
                className="max-w-[120px] max-h-[80px]"
                style={{ filter: 'grayscale(100%) contrast(200%)' }}
              />
              <div className="text-xs text-gray-500">
                Preview em preto e branco
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadLogo}
                className="hidden"
                disabled={uploadingLogo}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={uploadingLogo}
                onClick={() => document.querySelector('input[type="file"]')?.click()}
              >
                {uploadingLogo ? (
                  <>Enviando...</>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {formData.logo_url ? 'Alterar Logo' : 'Carregar Logo'}
                  </>
                )}
              </Button>
            </label>
            {formData.logo_url && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
              >
                Remover
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Recomendado: imagens PNG ou SVG com fundo transparente. Tamanho máximo: 2MB
          </p>
        </div>

        {/* Mensagem de Rodapé */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Mensagem de Rodapé
          </label>
          <Textarea
            value={formData.mensagem_rodape}
            onChange={(e) => setFormData(prev => ({ ...prev, mensagem_rodape: e.target.value }))}
            placeholder="Ex: OBRIGADO PELA PREFERÊNCIA!"
            maxLength={100}
            rows={2}
            className="font-mono text-xs"
          />
          <p className="text-xs text-gray-500">
            Máximo 100 caracteres. Será exibido em negrito após os detalhes do pagamento.
          </p>
        </div>

        {/* Preview */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Preview do Comprovante
          </h3>
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg flex justify-center">
            <div 
              className="bg-white p-4 shadow-lg"
              style={{ 
                width: '270px', 
                fontFamily: 'Courier, monospace',
                fontSize: '11px',
                color: '#000'
              }}
            >
              <div className="text-center space-y-1">
                {formData.logo_url && (
                  <img 
                    src={formData.logo_url} 
                    alt="Logo preview" 
                    className="mx-auto mb-2"
                    style={{ 
                      maxWidth: '100px', 
                      maxHeight: '60px',
                      filter: 'grayscale(100%) contrast(200%)'
                    }}
                  />
                )}
                <div className="font-bold text-sm">
                  {dadosEmpresa?.razao_social || 'VAREJOSYNC'}
                </div>
                <div className="text-[10px]">
                  {dadosEmpresa?.endereco || 'Endereço não cadastrado'}
                </div>
                {dadosEmpresa?.telefone && (
                  <div className="text-[10px]">Tel: {dadosEmpresa.telefone}</div>
                )}
              </div>
              <div className="my-2 text-center">
                ------------------------------------
              </div>
              <div className="text-center font-bold">
                RECIBO Nº 00001
              </div>
              <div className="my-2 text-center">
                ------------------------------------
              </div>
              <div className="text-[9px] space-y-1">
                <div>DATA: 14/03/2026 | HORA: 12:00 | VEND: ADMIN</div>
                <div>CLIENTE: <span className="font-bold">AVULSO</span></div>
              </div>
              <div className="my-2 text-center">
                ------------------------------------
              </div>
              {formData.mensagem_rodape && (
                <>
                  <div className="my-2 text-center">
                    ------------------------------------
                  </div>
                  <div className="text-center font-bold text-[11px]">
                    {formData.mensagem_rodape}
                  </div>
                </>
              )}
              <div className="text-center text-[9px] mt-4">
                <div>VAREJOSYNC ERP</div>
              </div>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            onClick={carregarDados}
            variant="outline"
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={salvando}
          >
            {salvando ? (
              <>Salvando...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}