# Ecossistema A-29 + Essie — Visão e Plano de Modularização

**Documento:** visão estratégica e plano de separação de interfaces  
**Autor:** João André (com apoio de planeamento)  
**Data:** julho de 2026  
**Repositórios:** `varejosync` (P38 legado) → `a29-erp` (núcleo canónico) + **Essie** (app separada)

---

## 1. Resumo dos objetivos

Esta conversa consolidou uma direcção clara para o negócio e para a tecnologia:

1. **Agenda e rotina** — Sair de “avisos soltos” para uma agenda que junta compromissos pessoais, contas vencendo e tarefas do sistema (já iniciado no P38 como protótipo).
2. **Essie (S)** — App **à parte** do ERP: secretária inteligente inspirada em competência real (rotina, preparação, antecipação), não um módulo a mais dentro do P38.
3. **Um núcleo, várias portas** — Separar **experiências** (frente de caixa, supply, financeiro operacional, gerencial) sem separar **a verdade dos dados**.
4. **A-29 como instrumento** — Vercel + Supabase como base para “unir os tubos **sem vazamentos**”; o P38 serve a produção actual até ao corte.
5. **Rotinas, não tela em branco** — Workflows pré-estabelecidos (estilo do que funciona no Monday, sem a complexidade); preparação de reuniões com pauta; agentes por contexto (ex.: compras → confirmar embarque).
6. **Acções no mundo real** — Integrações (n8n, WhatsApp, voz) para mensagens e automações; Cursor constrói o produto, não opera o dia a dia.

---

## 2. O problema que estamos a resolver

| Sintoma | Causa |
|---------|--------|
| P38 “funciona muito bem” mas pesa | Um app único para vendas, estoque, financeiro, logística |
| Sensação de “partir em módulos” | Cada função precisa de interface focada |
| Tubos com vazamento | Apps separados sem base de dados única |
| Cansaço cognitivo diário | Reinventar o dia sem rotinas nem preparação |
| Reuniões improdutivas | Chegar sem pauta; surpresa em vez de preparação |

**Solução:** ecossistema com **Supabase (uma verdade)** + **interfaces modulares** + **Essie (rotina e acção)**.

---

## 3. Papéis: P38, A-29 e Essie

```
┌─────────────────────────────────────────────────────────────────┐
│  ESSIE — rotina, agenda, assistentes, preparação, acções        │
│  (app Vercel separada; expande além do ERP)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ lê / escreve (agenda, tarefas, alertas)
┌────────────────────────────┴────────────────────────────────────┐
│  A-29 — ECOSISTEMA ERP                                           │
│  Interfaces modulares (ver secção 5)                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│  SUPABASE — base única (produtos, vendas, pedidos, lançamentos,  │
│  estoque, tarefas, agenda_item, utilizadores, perfis)           │
└─────────────────────────────────────────────────────────────────┘

P38 (varejosync): produção actual / legado até corte Base44 → migração para A-29.
```

| Peça | Papel |
|------|--------|
| **P38** | Operar hoje; protótipos (agenda); correções até ao corte |
| **A-29** | Núcleo canónico: schema, APIs, módulos no Vercel |
| **Essie** | Secretária: rotinas, reuniões, resumos, acções (WhatsApp, etc.) |
| **Supabase** | Uma fonte de verdade — evita vazamentos entre apps |

---

## 4. Essie — o que é (rascunho de produto)

**Essie** não é Monday nem um ERP. É a camada de **organização e execução da rotina**.

### O que faz
- Resumo do dia (contas, tarefas, reuniões, pedidos críticos).
- Rotinas pré-definidas por função (menos “desenhar o dia do zero”).
- Preparação de reuniões: aviso antecipado + construção de pauta com agente.
- Assistentes por módulo: ex. compras → “5 pedidos; confirma embarque com estes fornecedores”.
- Acções com aprovação: mensagens WhatsApp, e-mail, registo no A-29.

### O que não faz
- Substituir lançamentos oficiais, stock ou PDV.
- Duplicar dados do negócio noutro silo.
- Exigir processos corporativos perfeitos antes de ser útil.

### Integrações sugeridas (fases)
1. Supabase + e-mail (Resend) + Google Calendar  
2. n8n (workflows visíveis) + WhatsApp (Zenvia ou Twilio)  
3. Voz / chamadas (opcional, fase posterior)

---

## 5. Plano de separação de interfaces (A-29)

Quatro **portas** sobre a **mesma base**. Cada utilizador vê só o que o perfil permite.

### 5.1 Mapa dos módulos

| Módulo | Nome interno | Quem usa | Foco | O que NÃO inclui |
|--------|--------------|----------|------|------------------|
| **A** | Frente de caixa | Caixa, vendedor balcão | Vender, receber, cliente, produto, turno | Relatórios gerenciais, configurações profundas, compras |
| **B** | Supply | Compras, logística, depósito | Pedidos de compra, cotações, embarque, recebimento, estoque operacional | DRE, conciliação bancária, aprovação financeira estratégica |
| **C** | Financeiro operacional | Quem lança e paga no dia a dia | **Somente lançamentos**: receitas, despesas, transferências, contas em aberto, fluxo do dia | Relatórios gerenciais completos, orçamento, folha, parametrização |
| **D** | Gerencial completo | Sócios, gestão, contabilidade | Visão 360°: KPIs, margem, aprovações, cadastros, configurações, todos os relatórios | — (acesso total, UI densa) |

### 5.2 Diagrama

```
                    ┌──────────────────┐
                    │    SUPABASE      │
                    │  (base única)    │
                    └────────┬─────────┘
         ┌──────────┬────────┼────────┬──────────┐
         ▼          ▼        ▼        ▼          ▼
    ┌─────────┐ ┌─────────┐ ┌─────────────┐ ┌──────────┐  ┌───────┐
    │ Frente  │ │ Supply  │ │ Financ.     │ │ Gerencial│  │ Essie │
    │ de caixa│ │         │ │ operacional │ │ completo │  │       │
    │  (A)    │ │  (B)    │ │ (C)         │ │   (D)    │  │       │
    └─────────┘ └─────────┘ └─────────────┘ └──────────┘  └───────┘
       PDV         Compras      Lançamentos      Tudo        Rotina
       Vendas      Estoque      Fluxo caixa      KPIs        Agenda
                   Logística    Pagar/receber    Config      Agentes
```

### 5.3 Regras para não haver “tubos com vazamento”

1. **Nenhum módulo guarda cópia oficial** de produto, pedido ou lançamento.
2. **Escrita sempre no Supabase** via APIs partilhadas (packages A-29).
3. **Perfis de acesso** definem módulo + acções (RLS no Supabase).
4. **Essie lê o mesmo banco**; agenda pessoal em `agenda_item`; negócio vem das tabelas ERP.
5. **Eventos entre módulos** via base de dados (ex.: venda → lançamento → stock), não via sync manual entre apps.

### 5.4 Entidades principais por módulo

| Módulo | Tabelas / domínios principais |
|--------|-------------------------------|
| **A — Frente de caixa** | `pedido_venda`, `rascunho_pedido_venda`, `turno_caixa`, `movimentos_caixa`, `produto` (leitura), `terceiro`, `formas_de_pagamento` |
| **B — Supply** | `pedido_compra`, `cotacao`, `movimentacao_estoque`, `conferencia_compra`, `eventos_logisticos`, `embarque`, `produto` |
| **C — Financeiro operacional** | `lancamento_financeiro`, `contas_financeiras`, `movimentos_caixa`, `formas_de_pagamento`, `terceiro` (leitura) |
| **D — Gerencial** | Todas + `categoria_financeira`, relatórios, `perfil_de_acesso`, parametrizações, aprovações |
| **Essie** | `agenda_item`, leitura cruzada de `lancamento_financeiro`, `tarefa`, `pedido_compra`, etc. |

---

## 6. Plano de implementação por fases

### Fase 0 — Hoje (P38)
- [x] Agenda unificada no menu (protótipo de `AgendaItem`)
- [ ] Aplicar migration `014_agenda_item` em produção Supabase
- [ ] Manter P38 estável até A-29 estar pronto para corte

### Fase 1 — Fundação A-29 (núcleo)
- Supabase como fonte de verdade (schema Drizzle / migrations)
- Auth único (utilizador + perfil de acesso)
- API partilhada (packages): produto, terceiro, lançamento, pedido
- Deploy Vercel do monorepo A-29

### Fase 2 — Primeira porta: Financeiro operacional (C)
- Interface mínima: **só lançamentos** + fluxo de caixa + contas em aberto
- Migrar utilizadores que hoje só “lançam e pagam”
- Validar: mesmos dados que o gerencial vê, sem duplicação

### Fase 3 — Frente de caixa (A)
- PDV / caixa como app ou rota dedicada no Vercel
- Performance e UX de balcão; zero menus de gestão

### Fase 4 — Supply (B)
- Compras + estoque operacional + logística
- Rotinas Essie: embarque, confirmação fornecedor (WhatsApp via n8n)

### Fase 5 — Gerencial completo (D)
- Painéis, relatórios, configurações, aprovações
- Substitui gradualmente o “P38 monolítico” para gestão

### Fase 6 — Essie em produção
- App separada no Vercel
- Rotinas v1: manhã, reunião, compras/embarque
- Integração n8n + WhatsApp

### Fase 7 — Corte Base44
- P38 em modo manutenção; A-29 + Essie como ecossistema activo

---

## 7. Perfis de utilizador (exemplo)

| Perfil | Módulos | Essie |
|--------|---------|-------|
| Caixa | A | Resumo turno, lembretes |
| Comprador | B | Rotina embarque, reunião compras |
| Financeiro (operacional) | C | Contas a vencer, lançamentos pendentes |
| Gerente / sócio | D (+ opcional C) | Resumo completo, KPIs |
| Administrador | D | Tudo + config |

---

## 8. Critérios de sucesso

1. Utilizador do caixa **não vê** menus de relatório gerencial.
2. Lançamento feito em **C** aparece instantaneamente em **D** — mesmo registo, mesmo ID.
3. Venda em **A** baixa stock visível em **B** sem export/import.
4. Essie mostra “5 pedidos sem embarque” **a partir dos mesmos dados** que **B** usa.
5. Nenhuma equipa descreve o dia como “abrir o sistema gigante e procurar”.

---

## 9. Próximos passos recomendados

1. Validar este plano contigo (ajustar nomes: Supply vs Compras/Logística).
2. Copiar documento para o repositório **a29-erp** (`docs/visao-ecossistema.md`).
3. Definir **MVP da Fase 2** (financeiro operacional): ecrãs mínimos + lista de APIs.
4. Esboçar **Essie v0**: só leitura — resumo do dia a partir do Supabase.
5. Escolher provedor WhatsApp (Zenvia vs Twilio) quando chegar Fase 4/6.

---

## 10. Frases de posicionamento

**A-29:** *Um negócio, uma base, a interface certa para cada função.*

**Essie:** *As rotinas do teu dia, ligadas ao teu negócio. Menos improviso, mais preparação.*

---

*Fim do documento.*
