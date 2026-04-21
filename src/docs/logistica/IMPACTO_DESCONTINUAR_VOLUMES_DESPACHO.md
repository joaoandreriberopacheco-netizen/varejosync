# Impacto: descontinuar "volumes" no despacho

## Contexto atual

Hoje o despacho trabalha com dois formatos de volume no embarque:

- `volumes_detalhados` (estruturado, array)
- `volumes` (texto legado resumido)

No salvamento de despacho, os dois campos sao preenchidos para retrocompatibilidade.

## Pontos de uso mapeados

### Persistencia e captura

- `src/components/compras/InformarEmbarque.jsx`
  - estado local `volumes`
  - abertura de `VolumesDialog`
  - serializacao para `volumes_detalhados` e para `volumes` (texto)
  - uso de `peso_kg` derivado

### Exibicao logistica

- `src/components/compras/PedidoCompraLogisticaTab.jsx`
  - card de embarque exibe `embarque.volumes` (texto)
  - exibe `embarque.peso_kg`

### Recepcao

- `src/components/compras/RecepcionarEmbarque.jsx`
  - no embarque orfao gerado automaticamente define:
    - `volumes: ''`
    - `volumes_detalhados: []`
  - nao depende do dialogo de volumes para fluxo de recebimento

## Riscos ao remover imediatamente

- Perda de informacao visual nos cards de embarque se `embarque.volumes` deixar de existir sem ajuste de UI.
- Quebra de compatibilidade em registros antigos que so possuem texto legado.
- Relatorios/exportacoes que possam consumir `volumes` textual (dependencias indiretas) podem ficar vazios.

## Estrategia recomendada (sem quebra)

1. **Fase 1 - Compatibilidade**
   - manter escrita dos dois campos
   - migrar UI para priorizar `volumes_detalhados`
   - usar `volumes` apenas como fallback de leitura

2. **Fase 2 - Congelamento do legado**
   - parar de exibir/editar `volumes` textual na UI nova
   - manter leitura passiva para historico antigo

3. **Fase 3 - Remocao controlada**
   - remover escrita de `volumes`
   - executar limpeza/migracao de consumidores remanescentes

## Decisao sugerida para esta entrega

- **Nao remover agora.**
- Na entrega atual (Boats + dossie), apenas registrar o impacto e manter comportamento de despacho inalterado.
