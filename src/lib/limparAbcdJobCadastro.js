import { limparAbcdJobProdutos } from '@/functions/limparAbcdJobProdutos';

function unwrap(resp) {
  return resp?.data ?? resp;
}

export async function previewLimparAbcdJobCadastro(somenteD = false) {
  return unwrap(await limparAbcdJobProdutos({ dry_run: true, somente_d: somenteD }));
}

export async function executarLimparAbcdJobCadastro({ somenteD = false, onProgress } = {}) {
  let offset = 0;
  let totalLimpos = 0;
  let passo = 0;
  let ultimo = null;

  while (true) {
    passo += 1;
    ultimo = unwrap(
      await limparAbcdJobProdutos({
        dry_run: false,
        somente_d: somenteD,
        offset,
        limit: 25,
      }),
    );

    totalLimpos += Number(ultimo?.limpos_neste_lote) || 0;
    onProgress?.({
      passo,
      totalLimpos,
      ...ultimo,
    });

    if (ultimo?.status === 'concluido' || ultimo?.next_offset == null) {
      return { totalLimpos, passos: passo, ultimo };
    }

    offset = Number(ultimo.next_offset) || 0;
    await new Promise((r) => setTimeout(r, 150));
  }
}
