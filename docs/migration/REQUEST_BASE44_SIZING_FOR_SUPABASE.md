# REQUEST_BASE44_SIZING_FOR_SUPABASE

**App ID:** `68a91b1a009497f8d44af37e`
**Gerado em:** 2026-04-15T05:26:25.384Z
**Fonte:** Assistente Base44 (leitura directa das entidades + metadados da plataforma)

---

## 1. Tamanho total da base / dados da app

| Entidade | Registos estimados | Notas |
|---|---|---|
| Produto | ~515 | código interno até 000015, importação em massa detectada |
| LancamentoFinanceiro | ~800–1 200 | alta frequência diária (PDV + recorrentes) |
| PedidoVenda | ~571 | último número PV-00571 |
| MovimentacaoEstoque | ~1 000–1 500 | 1 000º registo em skip=999 confirmado |
| Terceiro | ~200 | clientes + fornecedores |
| AnexoDocumento | ~100–150 | metadados; ficheiros no Google Drive |
| PedidoCompra | estimado ~80–120 | |
| TurnoCaixa | estimado ~60–80 | |
| Embarque, EventosLogisticos, ContaRecorrente, ContaPrevista, … | ~50–300 total | entidades auxiliares |

**Total registos estimados (todas as entidades):** **~5 000–8 000 documentos**

**Tamanho médio por registo:** ~2–5 KB (JSONB com arrays de itens/pagamentos)

**Estimativa total base de dados:** **~15–40 MB** (dados brutos; sem índices)

> ⚠️ **Métrica exacta não acessível ao assistente.** O dashboard Base44 → *Settings → Usage* mostra o tamanho real. Se precisar do valor exacto, abrir ticket de suporte ou verificar no painel de billing.

---

## 2. Storage de ficheiros (bytes + nº de objectos)

Os anexos são armazenados no **Google Drive** do utilizador conectado (OAuth), **não** no storage da Base44. O campo `drive_file_id` e `url_drive` em cada `AnexoDocumento` aponta para o Drive.

| Métrica | Valor detectado |
|---|---|
| Registos AnexoDocumento | ~100–150 |
| Maior ficheiro observado | 1 521 577 bytes (~1,5 MB — PDF Movistar) |
| Menor ficheiro observado | 199 264 bytes (~195 KB) |
| Tamanho médio estimado | ~400–600 KB/ficheiro |
| **Total estimado Google Drive** | **~60–90 MB** |
| Storage Base44 nativo | Não utilizado (0 objectos em base44.storage) |

> ⚠️ Para saber o total exacto do Drive, consultar: *Google Drive → Armazenamento* na conta do proprietário.

---

## 3. Egress mensal (API + ficheiros), últimos 30–90 dias

> ⚠️ **Não acessível ao assistente.** O Base44 não expõe métricas de egress/bandwidth via API de entidades. Para obter:
> 1. Dashboard Base44 → *Settings → Usage → API Calls / Bandwidth*
> 2. Ou abrir ticket oficial em support@base44.com solicitando relatório de egress dos últimos 90 dias para App ID `68a91b1a009497f8d44af37e`

**Estimativa conservadora baseada no volume observado:**
- ~50–100 vendas/dia × payload médio ~5 KB = ~250–500 KB/dia em escrita
- Leituras (PDV, relatórios, dashboards) estimadas em 10–50× as escritas
- **Egress estimado: 5–25 MB/dia → 150–750 MB/mês**

---

## 4. MAU / Utilizadores activos últimos 30 dias

| Utilizador | Email | Perfil | Último update |
|---|---|---|---|
| Compras Logistica (admin) | casaisraelcl@gmail.com | Administrador | 2026-04-02 |
| Silene A. Saldanha | siltbt2020@gmail.com | Vendas/Estoque | 2026-04-01 |
| JOAO ANDRE RIBERO PACHECO | joaoandreriberopacheco@gmail.com | Vendas/Estoque | 2026-03-24 |
| Carlos Frederico Farias Pacheco | caixa1.ci@gmail.com | Caixa/Vendas | 2026-03-23 |
| CARLOS FREDERICO PACHECO | casaisrael2017@gmail.com | Caixa/Vendas | 2026-03-23 |
| Esther Pacheco | pachecoesther.ci@gmail.com | Administrador | 2026-03-23 |
| Pacheco Patricia | prpachecopt021@gmail.com | Administrador | 2026-03-23 |

**Total utilizadores registados:** **7**
**MAU estimado (últimos 30 dias):** **3–5 utilizadores activos** (Compras Logistica + Silene são os operadores principais — geram >90% das escritas observadas)

> Nota: Service account `service+b7805bdd…` é o executor de automações backend — não é utilizador humano.

---

## 5. Invocações serverless últimos 30 dias + top funções

### Automações activas e execuções acumuladas

| Automação | Função | Tipo | Total runs | Sucesso | Falhas |
|---|---|---|---|---|---|
| Sincronizar estoque por movimentação | sincronizarEstoquePorMovimentacao | entity | **164** | 164 | 0 |
| Gerar Lançamentos Cartão (×2 schedules) | gerarLancamentosCartao | scheduled | **25 + 25 = 50** | 50 | 0 |
| Atualizar status lançamentos | atualizarStatusLancamentos | scheduled | 26 | 26 | 0 |
| Sincronizar deleção de movimentos | sincronizarDelecaoLancamentos | entity | 12 | 12 | 0 |
| Flare: Export para GitHub | exportFlareToGithub | entity | 0 | — | — |
| Excluir vínculos ao apagar conta recorrente | sincronizarExclusaoContaRecorrente | entity | 0 | — | — |
| Gerar ContasPrevistas Recorrentes | gerarContasPrevistasRecorrentes | scheduled | 0 | — | — |
| Sincronizar ContaPrevista → LancamentoFinanceiro | sincronizarContaPrevia | entity | 0 | — | — |
| Atualizar viagens transportadoras | atualizarViagensTransportadoras | scheduled | 0 | — | — |

**Total invocações automações desde criação:** **~252 runs**

### Funções backend adicionais (chamadas manuais via frontend)

Detectadas no código (~40+ funções deployadas). Top estimado por frequência de uso:

| # | Função | Uso estimado |
|---|---|---|
| 1 | processarVendaCaixa | Alta — invocada em cada venda PDV (~10–30×/dia) |
| 2 | sincronizarEstoquePorMovimentacao | Alta — por automação entity |
| 3 | gerarLancamentosCartao | Diária — por scheduler |
| 4 | gerarRelatorioPedido / gerarRelatorioMargem | Média — por demanda |
| 5 | uploadAnexoDrive | Média — por cada anexo |
| 6 | gerarNumeroSequencial | Alta — cada novo pedido/lançamento |
| 7 | gerenciarPin | Baixa — setup inicial |

> ⚠️ **Contagem exacta de invocações não acessível.** O Base44 não expõe logs de chamadas individuais via API de entidades. Para dados precisos: Dashboard → *Functions → [nome da função] → Logs / Invocations*, ou ticket de suporte.

---

## 6. Pico de ligações realtime + mensagens/mês

> ⚠️ **Não mensurável pelo assistente.** O Base44 usa Realtime internamente para actualizações de entidades (subscriptions no SDK). A app usa `base44.entities.X.subscribe()` em vários componentes (PDV, dashboards).

**Estimativa baseada no número de utilizadores:**
- Máximo de **5–7 sessões simultâneas** (número total de utilizadores)
- Actualizações realtime estimadas: ~100–500 mensagens/dia (vendas + movimentações)
- **Estimativa mensal: 3 000–15 000 mensagens realtime/mês**

> Para Supabase Realtime: o Free tier suporta 500 conexões simultâneas e 2M mensagens/mês — bem dentro dos limites desta app.

---

## 7. Volume mensal das integrações Core

| Integração | Uso observado | Estimativa mensal |
|---|---|---|
| **UploadFile / UploadPrivateFile** | Anexos PDF (NF, boletos) via Google Drive connector | ~20–50 uploads/mês |
| **InvokeLLM** | Usado em: importação PDF NF, estimativa embalagens, optimização estoque, tags IA | ~50–200 chamadas/mês |
| **SendEmail** | Não observado activamente no código de produção | ~0–10/mês |
| **GenerateImage** | enhanceLogo function — uso esporádico | ~0–5/mês |
| **ExtractDataFromUploadedFile** | Importação de NF/cotações PDF | ~10–30/mês |
| **Google Drive** (connector OAuth) | uploadAnexoDrive — cada anexo | ~20–50 operações/mês |
| **GitHub** (connector OAuth) | exportFlareToGithub, commitMigrationManifests | ~5–20 commits/mês |

> ⚠️ **Contagens exactas de integrações Core não acessíveis.** O Base44 contabiliza créditos de integração internamente. Para valores precisos: Dashboard → *Settings → Usage → Integration Credits*.

---

## Resumo Executivo para Sizing Supabase

| Dimensão | Valor estimado | Tier Supabase recomendado |
|---|---|---|
| Base de dados | ~15–40 MB | **Free** (500 MB incluídos) |
| Storage ficheiros | ~0 MB Base44 (Drive externo) | **Free** (1 GB incluído) |
| Utilizadores activos | 3–7 MAU | **Free** (50 000 MAU incluídos) |
| Edge Functions | ~250–500 invocações/mês | **Free** (500 000/mês incluídas) |
| Realtime | <15 000 msg/mês | **Free** (2 M/mês incluídas) |
| Egress estimado | ~150–750 MB/mês | **Free** (5 GB/mês incluídos) |

**Conclusão:** Esta app cabe confortavelmente no **Supabase Free Tier** com margem ampla. O Pro tier só será necessário se o volume de vendas crescer 10–20×.

---

## Métricas que requerem ticket oficial Base44

As seguintes métricas **não são acessíveis ao assistente** e requerem acesso ao painel de billing ou ticket de suporte:

1. **Tamanho exacto da base de dados** (bytes reais no MongoDB/storage Base44)
2. **Egress/bandwidth exacto** dos últimos 30–90 dias
3. **Contagem exacta de invocações** de funções serverless por função
4. **Créditos de integração Core consumidos** (LLM, uploads, etc.)
5. **Mensagens Realtime** históricas
6. **Conexões simultâneas peak** registadas

**Como obter:** Enviar email para support@base44.com com:
- App ID: `68a91b1a009497f8d44af37e`
- Período: últimos 90 dias
- Métricas solicitadas: database size, egress, function invocations, integration credits, realtime messages
