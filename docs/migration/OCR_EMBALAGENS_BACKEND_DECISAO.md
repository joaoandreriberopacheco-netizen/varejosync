# Decisão: OCR / LLM — embalagens e pedidos de compra

## Contexto

- Fluxos que analisam PDF/imagem ou estimam embalagens usam **`base44.integrations`** (ex.: `InvokeLLM`) a partir do bundle Vite, como em [`EstimativaEmbalagensIA.jsx`](../../src/pages/EstimativaEmbalagensIA.jsx) e matching em [`ImportadorPedidoCompra.jsx`](../../src/components/compras/ImportadorPedidoCompra.jsx).
- Funções em [`base44/functions/`](../../base44/functions/) correm na **infra Base44**; alterações são sensíveis em produção (ver regra `base44-functions-legado`).

## Decisão por camada

| Necessidade | Onde implementar | Motivo |
|-------------|------------------|--------|
| Parsing, UX, validação no cliente | `src/**/*.jsx`, `src/lib/*` | Deploy rápido com o repo Vercel; sem tocar na infra Base44. |
| Chamadas a modelo / integração já exposta | `base44.integrations` no cliente | Padrão actual do VarejoSync; mantém um só caminho. |
| Lógica nova pesada, segredos, ou quotas no servidor | Preferir **futura** rota no stack alvo (ex.: a29 / Edge) | Não expandir `base44/functions` sem necessidade explícita. |
| Backfill ou migração de dados em massa | `base44/functions` **só** se inevitável | Mudanças mínimas, reversíveis, alinhadas com operação. |

## Conclusão

Para **adaptar boas práticas do A29** sem migração de BD Base44: portar primeiro **UX + parsing + validação** para `src/`; reproduzir chamadas LLM no mesmo padrão `integrations`; evitar novas funções Base44 salvo pedido explícito de backfill.
