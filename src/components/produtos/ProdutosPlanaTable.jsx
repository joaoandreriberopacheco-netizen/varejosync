import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Copy, Package } from 'lucide-react';
import { isCadastroIncompleto, getStockStatusIndicator } from './ProdutosHelpers';
import { formatEstoqueApresentacao, getUnidadeExibicaoSigla, getCatalogUnitLabels, getCatalogoComercialView, resolveCustoTotalUnitBaseProduto } from '@/lib/productUnits';

const headMap = {
  status: 'Status',
  cadastro: 'Cadastro',
  codigo_interno: 'Código',
  codigo_barras: 'Cód. Barras',
  categoria: 'Categoria',
  tags: 'Tags',
  fornecedor: 'Fornecedor',
  preco_venda: 'Preço Venda',
  preco_custo: 'Custo Total',
  margem: 'Margem',
  valor_compra: 'Vl. Compra',
  markup: 'Markup %',
  estoque_atual: 'Estoque',
  estoque_minimo: 'Est. Mín',
  estoque_ideal: 'Est. Ideal',
  estoque_maximo: 'Est. Máx',
  tempo_reposicao: 'Repos.',
  peso: 'Peso',
  dimensoes: 'Dimensões',
  tipo: 'Tipo',
  unidade: 'Unid.',
  unidades_pacote: 'Un/Pct',
  show_comercial: 'Unidade comercial (PDV)',
  show_logistica: 'Unidade de exibição (sigla)',
  inventario_valorizado: 'Inventário valorizado',
};
const widthMap = {
  status: 'min-w-[100px]',
  cadastro: 'min-w-[110px]',
  codigo_interno: 'min-w-[110px]',
  codigo_barras: 'min-w-[130px]',
  categoria: 'min-w-[130px]',
  tags: 'min-w-[130px]',
  fornecedor: 'min-w-[140px]',
  preco_venda: 'min-w-[110px]',
  preco_custo: 'min-w-[110px]',
  margem: 'min-w-[90px]',
  valor_compra: 'min-w-[110px]',
  markup: 'min-w-[90px]',
  estoque_atual: 'min-w-[110px]',
  estoque_minimo: 'min-w-[90px]',
  estoque_ideal: 'min-w-[90px]',
  estoque_maximo: 'min-w-[90px]',
  tempo_reposicao: 'min-w-[100px]',
  peso: 'min-w-[90px]',
  dimensoes: 'min-w-[120px]',
  tipo: 'min-w-[90px]',
  unidade: 'min-w-[70px]',
  unidades_pacote: 'min-w-[90px]',
  show_comercial: 'min-w-[120px]',
  show_logistica: 'min-w-[120px]',
  inventario_valorizado: 'min-w-[120px]',
};

export default function ProdutosPlanaTable({ filteredProdutos, visibleColumns, handleEdit, setProdutoParaExcluir, formatarNumero, fornecedorMap, handleCreateSimilar }) {
  return (
    <div className="hidden md:block w-full h-full overflow-auto border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900">
      <Table>
        <TableHeader className="bg-gray-50 sticky top-0 z-20 dark:bg-gray-800">
          <TableRow>
            <TableHead className="sticky left-0 z-30 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 w-[50px] border-r border-gray-200 dark:border-gray-700 text-xs p-2" />
            <TableHead className="sticky left-[50px] z-30 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 min-w-[60px] border-r border-gray-200 dark:border-gray-700 text-xs text-center">Img</TableHead>
            <TableHead className="sticky left-[110px] z-30 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 min-w-[220px] border-r border-gray-200 dark:border-gray-700 text-xs">Produto</TableHead>
            {visibleColumns.map(col => <TableHead key={col} className={`${widthMap[col] || 'min-w-[90px]'} text-gray-700 dark:text-gray-300 text-xs`}>{headMap[col] || col}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProdutos.map(produto => {
            const cat = getCatalogoComercialView(produto);
            const margem =
              cat.precoVenda > 0 && cat.custoNaEmbalagem >= 0 ? cat.margemContribuicaoPct : 0;
            const cadastroStatus = isCadastroIncompleto(produto);

            return (
              <TableRow key={produto.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <TableCell className="sticky left-0 z-10 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-1">
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-3.5 w-3.5 text-gray-700 dark:text-gray-400" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="z-50 dark:bg-gray-800 dark:border-gray-700" sideOffset={5}>
                      <DropdownMenuItem onClick={() => handleEdit(produto)} className="dark:text-gray-200 dark:hover:bg-gray-700 text-xs"><Edit className="mr-2 h-3.5 w-3.5" />Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCreateSimilar(produto)} className="dark:text-gray-200 dark:hover:bg-gray-700 text-xs"><Copy className="mr-2 h-3.5 w-3.5" />Produto similar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setProdutoParaExcluir(produto)} className="text-red-600 dark:text-red-400 dark:hover:bg-gray-700 text-xs"><Trash2 className="mr-2 h-3.5 w-3.5" />{produto.ativo ? 'Excluir / Inativar' : 'Reativar'}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell className="sticky left-[50px] z-10 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-1 text-center">
                  <div className="w-10 h-10 mx-auto bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center overflow-hidden">
                    {produto.imagem_url ? <img src={produto.imagem_url} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-300" />}
                  </div>
                </TableCell>
                <TableCell className="sticky left-[110px] z-10 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
                  <div className="font-medium text-sm text-gray-700 dark:text-gray-200 uppercase">{produto.nome}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 uppercase">{produto.codigo_interno}</div>
                </TableCell>

                {visibleColumns.includes('codigo_interno') && <TableCell className="text-xs text-gray-700 dark:text-gray-300">{produto.codigo_interno}</TableCell>}
                {visibleColumns.includes('codigo_barras') && <TableCell className="text-xs text-gray-700 dark:text-gray-300">{produto.codigo_barras || '-'}</TableCell>}
                {visibleColumns.includes('categoria') && <TableCell className="text-xs text-gray-700 dark:text-gray-300">{produto.categoria_nome || '-'}</TableCell>}
                {visibleColumns.includes('tags') && <TableCell><div className="flex flex-wrap gap-1">{(produto.tags || []).slice(0, 2).map(tag => <span key={tag} className="text-[10px] px-1 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">#{tag}</span>)}</div></TableCell>}
                {visibleColumns.includes('status') && <TableCell>{getStockStatusIndicator(produto)}</TableCell>}
                {visibleColumns.includes('cadastro') && <TableCell>{cadastroStatus.incompleto ? <div className="flex flex-col gap-0.5">{cadastroStatus.checks.semCategoria && <span className="text-[10px] text-red-600 dark:text-red-400">Sem categoria</span>}{cadastroStatus.checks.semFornecedor && <span className="text-[10px] text-red-600 dark:text-red-400">Sem fornecedor</span>}{cadastroStatus.checks.semPrecoVenda && <span className="text-[10px] text-red-600 dark:text-red-400">Sem preço</span>}{cadastroStatus.checks.semCodigoBarras && <span className="text-[10px] text-red-600 dark:text-red-400">Sem cód. barras</span>}{cadastroStatus.checks.semImagem && <span className="text-[10px] text-red-600 dark:text-red-400">Sem imagem</span>}</div> : <span className="text-xs text-green-600 dark:text-green-400">Completo</span>}</TableCell>}
                {visibleColumns.includes('fornecedor') && <TableCell>{fornecedorMap[produto.fornecedor_padrao_id] ? <div className="text-xs text-gray-700 dark:text-gray-300">{fornecedorMap[produto.fornecedor_padrao_id]}</div> : <span className="text-xs text-gray-600 dark:text-gray-400">N/A</span>}</TableCell>}
                {visibleColumns.includes('preco_venda') && (
                  <TableCell className="text-xs text-gray-700 dark:text-gray-300">
                    <div className="flex flex-col leading-tight">
                      <span>R$ {formatarNumero(cat.precoVenda)}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">/{cat.sigla}</span>
                    </div>
                  </TableCell>
                )}
                {visibleColumns.includes('margem') && <TableCell className="text-xs text-gray-700 dark:text-gray-300">{formatarNumero(margem)}%</TableCell>}
                {visibleColumns.includes('preco_custo') && (
                  <TableCell className="text-xs text-gray-700 dark:text-gray-300">
                    <div className="flex flex-col leading-tight">
                      <span>R$ {formatarNumero(cat.custoNaEmbalagem)}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">/{cat.sigla}</span>
                    </div>
                  </TableCell>
                )}
                {visibleColumns.includes('valor_compra') && (
                  <TableCell className="text-xs text-gray-700 dark:text-gray-300">
                    <div className="flex flex-col leading-tight">
                      <span>R$ {formatarNumero(cat.valorCompraNaEmbalagem)}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">/{cat.sigla}</span>
                    </div>
                  </TableCell>
                )}
                {visibleColumns.includes('markup') && (
                  <TableCell className="text-xs text-gray-700 dark:text-gray-300">
                    {cat.markupSobreCustoPct > 0 ? `${formatarNumero(cat.markupSobreCustoPct)}%` : `${produto.preco_venda_percentual || 0}%`}
                  </TableCell>
                )}
                {visibleColumns.includes('estoque_atual') && (
                  <TableCell className="text-xs text-gray-700 dark:text-gray-300">
                    <div className="flex flex-col leading-tight">
                      <span>
                        {(() => {
                          const apresent = formatEstoqueApresentacao(produto);
                          if (apresent) return `${formatarNumero(apresent.quantidade)} ${apresent.sigla}`;
                          return `${formatarNumero(produto.estoque_atual)} ${(produto.unidade_principal || 'UN').toUpperCase()}`;
                        })()}
                      </span>
                      {(() => {
                        const apresent = formatEstoqueApresentacao(produto);
                        if (!apresent) return null;
                        return (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {apresent.rotulo ? `(${apresent.rotulo})` : 'unidade de exibição'}
                          </span>
                        );
                      })()}
                    </div>
                  </TableCell>
                )}
                {visibleColumns.includes('estoque_minimo') && <TableCell className="text-xs text-gray-700 dark:text-gray-300">{formatarNumero(produto.estoque_minimo)}</TableCell>}
                {visibleColumns.includes('estoque_ideal') && <TableCell className="text-xs text-gray-700 dark:text-gray-300">{formatarNumero(produto.estoque_ideal)}</TableCell>}
                {visibleColumns.includes('estoque_maximo') && <TableCell className="text-xs text-gray-700 dark:text-gray-300">{formatarNumero(produto.estoque_maximo)}</TableCell>}
                {visibleColumns.includes('tempo_reposicao') && <TableCell className="text-xs text-gray-700 dark:text-gray-300">{produto.tempo_reposicao_dias || 0}d</TableCell>}
                {visibleColumns.includes('peso') && <TableCell className="text-xs text-gray-700 dark:text-gray-300">{formatarNumero(produto.peso_kg)}kg</TableCell>}
                {visibleColumns.includes('dimensoes') && <TableCell className="text-xs text-gray-700 dark:text-gray-300">{produto.dimensoes_cm || '-'}</TableCell>}
                {visibleColumns.includes('tipo') && <TableCell className="text-xs text-gray-700 dark:text-gray-300">{produto.tipo}</TableCell>}
                {visibleColumns.includes('unidade') && (() => {
                  const { unidadeBase, unidadeComercial, mostramMesma } = getCatalogUnitLabels(produto);
                  return (
                    <TableCell className="text-xs text-gray-700 dark:text-gray-300">
                      <div className="flex flex-col leading-tight">
                        <span>{unidadeBase}</span>
                        {!mostramMesma && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            com. {unidadeComercial}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  );
                })()}
                {visibleColumns.includes('unidades_pacote') && <TableCell className="text-xs text-gray-700 dark:text-gray-300">{produto.unidades_por_pacote || 1}</TableCell>}
                {visibleColumns.includes('inventario_valorizado') && (() => {
                  const custo = resolveCustoTotalUnitBaseProduto(produto);
                  const lastro = custo * (produto.estoque_atual || 0);
                  return (
                    <TableCell className="text-xs text-gray-700 dark:text-gray-300">
                      {lastro > 0 ? `R$ ${formatarNumero(lastro)}` : '—'}
                    </TableCell>
                  );
                })()}
                {visibleColumns.includes('show_comercial') && (
                  <TableCell className="text-xs text-gray-700 dark:text-gray-300">
                    {getUnidadeExibicaoSigla(produto, produto.unidade_principal || 'UN')}
                  </TableCell>
                )}
                {visibleColumns.includes('show_logistica') && (
                  <TableCell className="text-xs text-gray-700 dark:text-gray-300">
                    {(produto.unidade_exibicao_sigla || getUnidadeExibicaoSigla(produto, produto.unidade_principal || 'UN') || produto.unidade_show_logistica || '-').toString().toUpperCase()}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}