# Checklist — documentação da API vs realidade

Use este ficheiro sempre que uma integração tiver **documentação pública** (Swagger, portal, PDF) e vocês precisarem de **paridade segura** na casca 2.0. O objetivo não é “acreditar no PDF”: é **fechar lacunas antes** de modelar dados e de prometer prazos.

Complementa **[CRITICAL_PARITY_VALIDATION.md](./CRITICAL_PARITY_VALIDATION.md)** (fluxos internos) com uma camada explícita para **APIs de terceiros**.

## Identificação do alvo

| Campo | Preencher |
|---|---|
| Nome / produto | |
| Base URL (sandbox) | |
| Base URL (produção) | |
| Versão da API (`/v1`, etc.) | |
| Dono técnico no vosso lado | |
| Data da última leitura do doc | |

## 1. Autenticação e sessão

- [ ] Fluxo documentado coincide com o que funciona (ex.: `client_credentials`, refresh, escopos).
- [ ] `Content-Type` e encoding do body do token estão corretos (`application/x-www-form-urlencoded` vs JSON).
- [ ] Tempo de vida do token e o que fazer ao expirar (401, 403, corpo de erro).
- [ ] Cabeçalhos obrigatórios além de `Authorization` (tenant, correlation-id, etc.).
- [ ] Teste real: obter token e chamar **um GET simples** com sucesso.

## 2. Contrato HTTP (método, path, corpo)

- [ ] Para cada endpoint crítico: método HTTP confirmado (GET vs POST para “busca”).
- [ ] Paths com parâmetros (`{id}`) batem com exemplos reais (trailing slash, case).
- [ ] Corpo de criação/atualização: campos obrigatórios vs opcionais; null vs omitir campo.
- [ ] Formato de datas e números (timezone, vírgula vs ponto, int vs decimal).
- [ ] Charset e normalização de texto (acentos, NFC/NFD) se houver busca textual.

## 3. Listagens: paginação, filtros, ordenação

- [ ] Paginação documentada existe e funciona (cursor, offset, `page/size`).
- [ ] Limites máximos e defaults (evitar surpresas em lotes).
- [ ] Filtros combinados: comportamento com parâmetros vazios ou conflitantes.
- [ ] Ordenação estável quando o doc promete “mais recente primeiro”.

## 4. Modelo de dados vs persistência interna

- [ ] Entidade principal (ex.: `Processo`) mapeada para tabelas/colunas ou JSONB com critério explícito.
- [ ] Arrays aninhados (`partes`, `movimentacoes`): tamanho típico, necessidade de normalização, índices.
- [ ] IDs: UUID vs string opaca; estabilidade entre ambientes.
- [ ] Campos calculados ou só-leitura: não gravar como se fossem input.

## 5. Erros e idempotência

- [ ] Catálogo de códigos HTTP usados de facto (nem sempre bate com o doc).
- [ ] Corpo de erro: `message`, `code`, `request_id` — o que existe para suporte.
- [ ] Operações de escrita: repetir o mesmo POST é seguro? (idempotency key se existir.)
- [ ] Conflitos (409) e validação (422): como corrigir e retentar.

## 6. Limites operacionais

- [ ] Rate limit (por minuto/hora/dia) e cabeçalhos de quota, se houver.
- [ ] Tamanho máximo de payload e de anexos.
- [ ] Janelas de manutenção ou indisponibilidade conhecidas.

## 7. Webhooks (se aplicável)

- [ ] Eventos emitidos vs eventos que vocês realmente precisam.
- [ ] Formato do payload e versão do schema.
- [ ] Assinatura (HMAC, certificado): algoritmo, cabeçalhos, clock skew.
- [ ] Semântica de retry e deduplicação (IDs de evento).

## 8. Evidência e gate

- [ ] Coleção mínima (Postman/Insomnia) ou scripts com **requests reais** em sandbox.
- [ ] Registo de 3 respostas de exemplo por recurso crítico (anonimizadas).
- [ ] Decisão: `DOC_ALINHADA`, `DOC_PARCIAL` (lista de excepções), `DOC_INSUFICIENTE` (bloqueio).

### Classificação sugerida

| Resultado | Significado |
|---|---|
| `DOC_ALINHADA` | Comportamento observado cobre o que a casca precisa; excepções documentadas no repo. |
| `DOC_PARCIAL` | Dá para avançar com stubs e fila de esclarecimentos; risco controlado. |
| `DOC_INSUFICIENTE` | Não implementar produção até fechar auth, webhooks ou modelo de erro. |

## Ligação com P38 / repositório paralelo

- Manter um **inventário** no repositório paralelo: endpoint → estado (`espelhado` / `stub` / `fora de escopo`).
- Qualquer diferença entre doc e produção entra como **nota de paridade** (não só “bug da API”).
