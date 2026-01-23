import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'URL do arquivo não fornecida' }, { status: 400 });
    }

    // Buscar arquivo
    const fileResponse = await fetch(file_url);
    const arrayBuffer = await fileResponse.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    let text = decoder.decode(arrayBuffer);
    
    // Remove BOM se existir
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }

    // Parse CSV (separado por ; ou ,)
    const lines = text.trim().split('\n');
    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());

    // Validar headers obrigatórios
    const codigoIndex = headers.findIndex(h => h.includes('codigo') || h.includes('código'));
    const nomeIndex = headers.findIndex(h => h.includes('nome') || h.includes('descri'));

    if (codigoIndex === -1 || nomeIndex === -1) {
      return Response.json({ 
        error: 'Colunas obrigatórias não encontradas. Necessário: Código e Nome/Descrição' 
      }, { status: 400 });
    }

    const descricaoIndex = headers.findIndex(h => h.includes('descri') && h !== headers[nomeIndex]);
    const corIndex = headers.findIndex(h => h.includes('cor'));
    const ordemIndex = headers.findIndex(h => h.includes('ordem'));
    const ativoIndex = headers.findIndex(h => h.includes('ativo'));

    // Buscar áreas existentes
    const areasExistentes = await base44.asServiceRole.entities.Area.list();
    const areasPorCodigo = {};
    areasExistentes.forEach(a => {
      areasPorCodigo[a.codigo?.toUpperCase()] = a;
    });

    const atualizadas = [];
    const criadas = [];
    const erros = [];
    const codigosImportados = new Set();

    // Processar cada linha
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const cols = lines[i].split(separator).map(c => c.trim());
      
      const codigo = cols[codigoIndex]?.toUpperCase();
      if (!codigo) {
        erros.push(`Linha ${i + 1}: Código vazio`);
        continue;
      }

      const nome = cols[nomeIndex];
      if (!nome) {
        erros.push(`Linha ${i + 1}: Nome vazio`);
        continue;
      }

      codigosImportados.add(codigo);

      const areaData = {
        codigo,
        nome: nome.toUpperCase(),
        descricao: descricaoIndex !== -1 ? cols[descricaoIndex]?.toUpperCase() : '',
        cor: corIndex !== -1 && cols[corIndex] ? cols[corIndex] : '#3b82f6',
        ordem: ordemIndex !== -1 && cols[ordemIndex] ? parseInt(cols[ordemIndex]) || 0 : 0,
        ativo: ativoIndex !== -1 && cols[ativoIndex] ? (cols[ativoIndex].toLowerCase() === 'sim' || cols[ativoIndex] === '1') : true
      };

      try {
        if (areasPorCodigo[codigo]) {
          // Atualizar existente
          await base44.asServiceRole.entities.Area.update(areasPorCodigo[codigo].id, areaData);
          atualizadas.push(codigo);
        } else {
          // Criar nova
          const novaArea = await base44.asServiceRole.entities.Area.create(areaData);
          criadas.push(codigo);
          areasPorCodigo[codigo] = novaArea;
        }
      } catch (error) {
        erros.push(`Linha ${i + 1} (${codigo}): ${error.message}`);
      }
    }

    // Atualizar produtos relacionados
    const produtos = await base44.asServiceRole.entities.Produto.list();
    let produtosAtualizados = 0;

    for (const produto of produtos) {
      if (produto.area_codigo && codigosImportados.has(produto.area_codigo.toUpperCase())) {
        const area = areasPorCodigo[produto.area_codigo.toUpperCase()];
        if (area && produto.area_id !== area.id) {
          await base44.asServiceRole.entities.Produto.update(produto.id, {
            area_id: area.id,
            area_codigo: area.codigo
          });
          produtosAtualizados++;
        }
      }
    }

    return Response.json({
      success: true,
      criadas: criadas.length,
      atualizadas: atualizadas.length,
      erros: erros.length,
      produtosAtualizados,
      detalhes: {
        criadas,
        atualizadas,
        erros: erros.slice(0, 10) // Primeiros 10 erros
      }
    });

  } catch (error) {
    console.error('Erro na importação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});