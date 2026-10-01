# Disparo Seguro — planejamento dos disparos automáticos (Plano Pro)

> Status: **planejamento** (nada implementado ainda) · Última atualização: 28/09/2026

Este documento registra como os disparos automáticos serão construídos no app. As decisões
comerciais vêm do repositório do site (`Hook7`):

- `docs/planos-e-precos.md` — §4 "Disparo Seguro" e §6 pendências do app
- `docs/manual-boas-praticas-whatsapp.md` — base de regras, publicado em
  [hook7.com.br/guia/boas-praticas-whatsapp](https://hook7.com.br/guia/boas-praticas-whatsapp)

---

## 1. Premissas

- Disparos são exclusivos do **Plano Pro** (R$ 149,90; número adicional R$ 69,90).
- **Não entram no teste grátis.**
- Vendidos **sem garantia contra bloqueio de número**. As proteções reduzem risco, não o
  eliminam. O cliente aceita esse risco de forma registrada (ver §5).
- As proteções são apresentadas como recurso do produto:
  1. aquecimento automático de número novo;
  2. intervalos aleatórios entre mensagens;
  3. limite diário por número;
  4. pausa automática quando a taxa de falha de entrega sobe.
- As proteções valem **somente para disparos feitos pelo painel**. Chamadas diretas à API
  (`/message/sendText/...`) vão direto ao Evolution e não passam por elas.

### O manual e a realidade técnica

O manual foi escrito com base na API oficial da Meta (templates, *quality rating*, limites
250 → 2.000 → 10.000). O Hook7 roda sobre Evolution API/Baileys e **não tem acesso a esses
sinais**. O produto usa sinais equivalentes medidos por nós (falha de envio, ausência de ACK
de entrega, opt-out, desconexões). O marketing não deve prometer monitoramento de
*quality rating*.

---

## 2. Arquitetura

```
Painel (criar campanha) ──► broadcast_campaigns + broadcast_recipients (fila no Postgres)
                                        │
pg_cron (a cada 1 min) ──► Edge Function `broadcast-worker`
                                        │  por sessão: pega 1 destinatário (FOR UPDATE SKIP LOCKED)
                                        │  checa janela, limites, opt-out, saúde da sessão
                                        ▼
                               Evolution /message/sendText (com delay = "digitando…")
                                        │
whatsapp-webhook ◄── MESSAGES_UPSERT / MESSAGES_UPDATE / CONNECTION_UPDATE
   ├─ "SAIR/PARAR/STOP/CANCELAR" → lista de supressão
   ├─ ACK de entrega/leitura → métricas
   └─ desconexão → pausa as campanhas da sessão
```

Regras do worker:
- Cada execução dura no máximo ~50 s; uma mensagem por vez por sessão.
- Limites checados **antes** do envio (hoje o limite de mensagens só age depois, via logout).
- Item preso em `sending` por mais de 5 min vira `unknown` e **não é reenviado** (melhor perder
  uma mensagem do que duplicar).
- Supressão checada no momento de cada envio, não só na criação da campanha.

### Tabelas novas (schema `public` — a confirmar)

| Tabela | Conteúdo |
|---|---|
| `contacts` (existente, ampliada) | + `opt_in_source`, `opt_in_at`, `opt_in_evidence`, `opt_in_categories`, `wa_valid`, `last_interaction_at` |
| `contact_lists`, `contact_list_members` | Listas do gerenciador de contatos |
| `suppression_list` | org + telefone + motivo (opt-out, inválido, manual) |
| `broadcast_campaigns` | sessão, categoria (marketing/utilidade), mensagem com variações, status (`draft/running/paused/auto_paused/done`), config de ritmo, motivo da pausa |
| `broadcast_recipients` | telefone, variáveis, status (`pending/sending/sent/failed/skipped/unknown`), `sent_at`, id da mensagem, ACK |
| `session_send_state` | `next_allowed_at`, contadores hora/dia, fase de aquecimento, indicador de saúde |
| `risk_acceptances` | usuário, data, IP, versão dos termos, configurações de risco aceitas |

Alteração em `sessions`: coluna `plan` (`api` | `pro`), já que a cobrança é por sessão.

---

## 3. Proteções

Valores são heurísticas de mercado, não números oficiais. Padrões seguros, ajustáveis dentro
de uma faixa, com pisos que o cliente não consegue ultrapassar.

| Proteção | Padrão | Piso fixo |
|---|---|---|
| Intervalo entre mensagens | aleatório, 20–60 s | mínimo 8 s |
| Pausa longa | a cada 20–40 msgs, 5–15 min | sempre ativa |
| Limite por hora | 60 | 120 |
| Limite diário (após aquecimento) | 300 | 1000 |
| Janela de envio | 8h–20h (America/Sao_Paulo), seg–sáb | nunca entre 22h e 7h |
| Simular "digitando…" | `delay` proporcional ao tamanho do texto | — |
| Marketing por contato | 2 por semana (a confirmar) | — |

### Aquecimento (manual §7)

| Período desde a conexão no Hook7 | Permitido |
|---|---|
| Dias 1–3 | Disparo bloqueado (apenas conversas iniciadas por clientes) |
| Dias 4–7 | Só campanhas de **Utilidade**, volume baixo e crescente |
| Dia 8 em diante | **Marketing** com volume crescente até o limite diário |

O cliente pode declarar que o número já é usado há meses e começar no dia 4, mediante aceite
registrado. Os pisos fixos continuam valendo.

### Qualidade da lista e do conteúdo (manual §2–§4)

- Normalização (DDI + DDD), remoção de duplicados e validação via Evolution
  `/chat/whatsappNumbers` antes de enviar.
- Importação exige origem/evidência do opt-in e declaração de que a lista não foi comprada.
- Contatos sem interação há mais de 90 dias marcados como **lista fria** (aviso).
- Campanha com categoria **Marketing** ou **Utilidade**; Marketing exige rodapé de opt-out.
- Variáveis (`{{nome}}`) e spintax (`{Olá|Oi}`); aviso forte para mensagem idêntica para mais
  de 50 destinatários, link encurtado ou vários links.
- Sem disparo para grupos nem adição de pessoas em grupos.

### Saúde e pausa automática (manual §5 e §8)

Indicador interno verde/amarelo/vermelho calculado com: falha de envio, entrega sem ACK,
opt-out (no lugar de "bloqueio"; manual cita 1–2%) e desconexões.

A campanha (não a sessão) é pausada quando:
- a sessão desconecta ou é deslogada — nunca reconectar e voltar a disparar sozinho;
- mais de 10% de falhas nos últimos 50 envios;
- opt-outs acima de 3% da campanha;
- entrega (ACK) muito baixa em relação ao enviado.

Retomada segue o manual: pausa o marketing, mostra o tempo de recuperação sugerido
(48–72 h amarelo, 7–14 dias vermelho) e **retoma com volume reduzido**.

### Checklist antes de enviar (manual §9)

Último passo do assistente de campanha: opt-in, segmentação e opt-out confirmados.

---

## 4. Termos de Uso e privacidade

Os Termos existem em **dois lugares**: site (`Hook7/app/termos/page.tsx`) e app
(`src/pages/TermsOfService.tsx`). As mudanças precisam entrar nos dois (ou o app passa a
apontar para o site).

- Nova cláusula: disparos sem garantia contra bloqueio; consentimento (LGPD) é obrigação do
  cliente; Hook7 pode pausar campanhas com sinais de abuso.
- §8 hoje diz que o Hook7 "coleta apenas e-mail" e "não armazena mensagens" — deixa de ser
  verdade com contatos e campanhas. Definir cliente como controlador e Hook7 como operador, e
  prazo de retenção (sugestão: apagar destinatários 90 dias após o fim da campanha).
- §9 diz "SPAM não gera suspensão automática" — ajustar para deixar claro que pausa de
  campanha não é suspensão de conta.

## 5. Aceite de risco

Registrado em `risk_acceptances` antes da primeira campanha e sempre que o cliente baixar uma
configuração abaixo do recomendado ou encurtar o aquecimento. Tela de aceite com link para o
guia de boas práticas.

---

## 6. Fases

**F0 — Base**
- Modelo de planos por sessão (`sessions.plan`), preço do Pro no Stripe, bloqueio no trial.
- Termos e privacidade atualizados (site e app).
- Migration SQL das tabelas acima.

**F1 — MVP**
- Gerenciador de contatos: importação CSV com normalização, listas, opt-in, supressão.
- Campanha de texto com variáveis e spintax, categoria e rodapé de opt-out.
- Worker com intervalos aleatórios, janela, limites e aquecimento.
- Opt-out pelo webhook; pausa automática na desconexão.
- Tela de progresso e aceite de risco.

**F2 — Saúde do número**
- Validação de números no WhatsApp.
- ACK de entrega/leitura, indicador de saúde, pausa por falha e opt-out, retomada gradual.
- Envio de mídia.

**F3 — Extras**
- Agendamento, segmentação, relatórios.
- Visão no admin de sessões com sinais de abuso.
- Página de boas práticas na ApiDocs para quem usa a API direto.

Fora deste escopo: chat interno do Pro (usará a mesma tabela de contatos).

---

## 7. Pendências de decisão

- [ ] Confirmar schema `public` (e não `hook7_app` da v2).
- [ ] Disparos via endpoint da API para clientes Pro, ou só no painel?
- [ ] Limite de marketing por contato: 2 por semana?
- [x] Novos preços (R$ 59,90) e trial (3 dias ou 200 msgs): feitos separadamente em 30/09/2026
      (ver `SUBSCRIPTION_SYSTEM.md` e `docs/STRIPE_SETUP.md`). Falta o preço do Pro.
