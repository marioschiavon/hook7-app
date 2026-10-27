# Disparo Seguro — planejamento dos disparos automáticos (Plano Pro)

> Status: **planejamento** (nada implementado ainda) · Última atualização: 23/10/2026

Este documento registra como os disparos automáticos e o chat do Pro (§7) serão construídos
no app. As decisões
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
- O chat (§7) passa a guardar **conteúdo de mensagens e mídia**. Os Termos precisam dizer o
  que é guardado, para quê (exibir o histórico ao cliente) e por quanto tempo (§7.8).
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

As fases do chat estão em §7.9.

---

## 7. Chat do Pro (estilo WhatsApp Web)

Em 23/10/2026 o chat deixou de ser "comodidade, pode vir depois" e passou a ser parte central
do Pro: uma caixa de entrada que funciona como o WhatsApp Web, para o cliente atender no dia a
dia e responder quem reagiu às campanhas.

### 7.1 Princípios

- **A mesma experiência do WhatsApp Web, com a identidade visual do Hook7.** O layout e o
  comportamento são copiados: três áreas, balões, ✓/✓✓/✓✓ azul, separadores de data, resposta
  citada, "digitando…", atalhos. Logo, ícones, ilustrações, o nome e o verde da marca do
  WhatsApp não são usados (*trade dress* da Meta). Cores e fundo de conversa são do Hook7.
- **Exclusivo do Plano Pro.** A rota do chat fica bloqueada para sessões `plan = 'api'`.
- **Resposta manual sai na hora.** As proteções de §3 (intervalo, limite por hora, janela)
  valem para disparos, não para quem está conversando. A exceção é iniciar conversa nova (§7.7).
- **O que acontece no celular aparece no chat**, e vice-versa: mensagens enviadas pelo
  aparelho chegam como `fromMe` pelo webhook e entram no histórico.

### 7.2 Arquitetura

```
Evolution ──► whatsapp-webhook
                ├─ MESSAGES_UPSERT  → upsert em messages / chats (idempotente por wa_message_id)
                │                     mídia: media_status = 'pending' → chat-media-fetch
                ├─ MESSAGES_UPDATE  → status (sent/delivered/read) e ACK das campanhas
                ├─ MESSAGES_EDITED / MESSAGES_DELETE → edited_at / deleted_at
                ├─ PRESENCE_UPDATE  → Realtime broadcast (não grava; "digitando…", "online")
                └─ CHATS_UPSERT / CONTACTS_UPSERT → nome e foto do contato

Edge Function `chat-media-fetch` ──► Evolution getBase64FromMediaMessage ──► Storage `chat-media`

Painel (/chat) ◄── Supabase Realtime (postgres_changes em messages e chats, filtro por session_id)
      │
      └─► Edge Function `chat-send` ──► Evolution sendText / sendMedia / sendWhatsAppAudio
                                        markMessageAsRead (ao abrir a conversa)
```

- O webhook continua gravando em `message_logs` para a cobrança. `messages` é outra tabela,
  com o conteúdo.
- A mídia é baixada fora do webhook: a URL do WhatsApp expira, e baixar dentro do webhook
  atrasa a resposta ao Evolution. Não usar `webhook_base64` do Evolution (payload grande em
  todo evento).
- O envio passa sempre por `chat-send`, nunca do front direto para o Evolution: valida
  usuário, organização, plano e sessão conectada, e registra quem enviou.
- `chat-send` grava a mensagem como `pending` com um id temporário do cliente, chama o
  Evolution e completa o `wa_message_id`. O webhook do mesmo envio encontra a linha pelo
  `wa_message_id` e não duplica.

### 7.3 Tabelas

| Tabela | Conteúdo |
|---|---|
| `chats` | `organization_id`, `session_id`, `remote_jid` (único por sessão), `contact_id` (nulo em grupo), `is_group`, `name`, `avatar_url`, `last_message_at`, `last_message_preview`, `unread_count`, `archived_at`, `pinned_at`, `muted_until`, `last_campaign_id`, `last_inbound_at` |
| `messages` | `organization_id`, `session_id`, `chat_id`, `wa_message_id` (único por sessão), `from_me`, `sender_jid` (grupos), `sent_by_user_id` (quem respondeu pelo painel), `source` (`chat/phone/campaign/api`), `type` (`text/image/audio/video/document/sticker/location/contact/system`), `body`, `media_path`, `media_mime`, `media_size`, `media_duration`, `media_status` (`none/pending/ready/failed`), `quoted_wa_message_id`, `status` (`pending/sent/delivered/read/failed`), `edited_at`, `deleted_at`, `campaign_id`, `broadcast_recipient_id`, `wa_timestamp` |
| `message_reactions` | `message_id`, `reactor_jid`, `emoji` (única por reator e mensagem) |
| `quick_replies` | atalho (`/preco`) e texto, por organização (C2) |
| Storage `chat-media` | bucket privado, caminho `org/sessão/chat/mensagem`, acesso por URL assinada |

- Índice principal: `messages (chat_id, wa_timestamp desc)` para a rolagem infinita, e
  `chats (session_id, pinned_at, last_message_at desc)` para a lista.
- RLS por organização em todas as tabelas, igual a `sessions`.
- `chats` e `messages` entram na publicação do Realtime.
- `contacts` é a mesma tabela dos disparos. O chat cria o contato quando alguém escreve pela
  primeira vez e atualiza `last_interaction_at`.
- `type = 'system'` registra eventos na conversa ("Contato pediu para sair dos disparos",
  "Mensagem da campanha X").

### 7.4 Tela

Rota `/chat`, tela cheia, sem o layout do dashboard.

- **Coluna da esquerda:** seletor de número (a organização pode ter várias sessões Pro; o
  WhatsApp Web não tem isso), busca, filtros (Todas, Não lidas, Favoritas, Grupos, Respostas
  de campanha), lista com foto, nome, prévia, horário, não lidas, fixadas no topo, Arquivadas.
- **Conversa:** cabeçalho com nome e "online/digitando…", lista virtualizada com rolagem
  infinita, separadores Hoje/Ontem/data, balões com hora e ✓, citação clicável, mídia com
  prévia e player de áudio, mensagens apagadas e editadas sinalizadas.
- **Caixa de texto:** emoji, anexo (imagem, vídeo, documento), Enter envia e Shift+Enter
  quebra linha, gravar áudio (C2), resposta citada ao arrastar ou pelo menu do balão.
- **Painel do contato (direita):** dados, mídia trocada, campanhas recebidas, opt-in, opt-out,
  etiquetas.
- Atalhos do WhatsApp Web (Ctrl+Alt+N nova conversa, Ctrl+Alt+/ buscar, Esc fechar etc.).
- Celular: uma coluna por vez, como o app.

### 7.5 Escopo por fase

| Fase | Recursos |
|---|---|
| C1 — MVP | Lista, busca, não lidas, conversa com ✓✓ e "digitando…", texto e emoji, receber todos os tipos de mídia, enviar imagem e documento, responder citando, arquivar, fixar, silenciar, marcar como lida |
| C2 | Gravar áudio no navegador (converter para ogg/opus para sair como áudio de voz), reações, editar, apagar para todos, encaminhar, figurinhas, grupos com nome de quem falou, respostas rápidas, painel do contato completo |
| C3 | Vários atendentes (atribuir conversa, ver quem respondeu), etiquetas, notas internas, notificações do navegador |
| Fora | Ligações, Status, Comunidades e Canais: frágeis ou inexistentes no Baileys |

### 7.6 Integração com os disparos

- **Contatos únicos:** chat e campanhas usam `contacts`. A interação no chat atualiza
  `last_interaction_at`, que alimenta o aviso de **lista fria** (§3).
- **Mensagem da campanha no histórico:** o worker grava cada envio também em `messages`
  (`source = 'campaign'`, `campaign_id`), e a conversa mostra o selo "Campanha X".
- **Respostas de campanha:** mensagem recebida até 72 h depois de um envio da campanha marca
  `chats.last_campaign_id` e aparece no filtro "Respostas de campanha". Conta como resposta
  nas métricas da campanha, um sinal positivo para o indicador de saúde (§3).
- **Opt-out:** quando o webhook detecta SAIR/PARAR, grava em `suppression_list`, insere uma
  mensagem `system` na conversa e mostra o selo "Saiu dos disparos". O atendimento continua
  normal. Tirar alguém da supressão exige novo opt-in com evidência.
- **Aquecimento:** nos dias 1–3 o número só pode conversar com quem escreveu primeiro. O chat
  é a ferramenta desse período, e a tela mostra em que fase o número está.
- **Contato no meio de uma conversa:** o worker pula (e reagenda para mais tarde) o envio de
  marketing para um contato que trocou mensagens no chat na última hora (a confirmar).
- **Desconexão:** além de pausar as campanhas, o chat mostra um aviso fixo e desativa o envio
  até reconectar.

### 7.7 Proteções do chat

- **Iniciar conversa nova** (com quem nunca escreveu para o número) conta no limite diário
  de disparos e respeita o aquecimento. Sem isso, o chat vira um disparo manual sem proteção.
- Responder quem já escreveu não tem limite nem intervalo.
- Não há envio para vários contatos pelo chat: isso é campanha.

### 7.8 Privacidade e cobrança

- Retenção das mensagens e da mídia: prazo a definir (§8). Ao vencer, apagar mídia do Storage
  e o conteúdo de `messages`.
- Ao excluir a sessão, apagar `chats`, `messages` e a mídia dela.
- Hoje o gatilho de `message_logs` conta toda mensagem `fromMe` na franquia mensal, então cada
  resposta pelo chat consome a franquia. Confirmar se é o comportamento desejado (§8).

### 7.9 Fases do chat e ordem com os disparos

- **C0 (junto com F0):** tabelas de §7.3, bucket, gravação no webhook, `chat-send`, Termos.
- **C1, C2, C3:** conforme §7.5.

Ordem proposta (a confirmar): F0 → C1 → F1 → C2 → F2 → C3 → F3. O chat obriga a construir
contatos, gravação de mensagens e Realtime, que os disparos usam depois, e é a parte que o
cliente usa todos os dias.

---

## 8. Pendências de decisão

- [ ] Confirmar schema `public` (e não `hook7_app` da v2).
- [ ] Disparos via endpoint da API para clientes Pro, ou só no painel?
- [ ] Limite de marketing por contato: 2 por semana?
- [x] Novos preços (R$ 59,90) e trial (3 dias ou 200 msgs): feitos separadamente em 30/09/2026
      (ver `SUBSCRIPTION_SYSTEM.md` e `docs/STRIPE_SETUP.md`). Falta o preço do Pro.
- [ ] Chat: ordem com os disparos (proposta em §7.9).
- [ ] Chat: vários atendentes por organização já na C1 ou só na C3?
- [ ] Chat: importar o histórico ao conectar (quantos dias?) ou começar da conexão?
- [ ] Chat: prazo de retenção das mensagens e da mídia.
- [ ] Chat: respostas pelo chat consomem a franquia mensal?
- [ ] Chat: confirmar "mesma experiência, identidade Hook7" (§7.1) em vez de cópia visual.
- [ ] Chat: pular marketing para contato em conversa ativa (§7.6)?
