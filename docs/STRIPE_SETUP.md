# Manual — Configurar a nova política de preços no Stripe

Atualizado em 30/09/2026. Vale para o código que usa `src/lib/pricing.ts` e
`supabase/functions/create-stripe-checkout/index.ts`.

## Resumo

- **Crie 2 produtos**, com **2 preços cada** → **4 preços** no total.
- Copie os 4 **Price IDs** (`price_...`) para 4 secrets do Supabase.
- **Não apague nem arquive** o preço antigo de R$ 69,90: as assinaturas atuais continuam nele.
- Faça tudo primeiro no **modo de teste**, depois repita no **modo live**
  (produtos e preços do teste não passam para o live; os IDs são diferentes).

| Produto | Preço | Valor | Recorrência | Secret no Supabase |
|---|---|---|---|---|
| Hook7 — Plano API | 1º número mensal | R$ 59,90 | Mensal | `STRIPE_PRICE_API_MONTHLY` |
| Hook7 — Plano API | 1º número anual | R$ 599,00 | Anual | `STRIPE_PRICE_API_ANNUAL` |
| Hook7 — Número adicional | Adicional mensal | R$ 39,90 | Mensal | `STRIPE_PRICE_EXTRA_MONTHLY` |
| Hook7 — Número adicional | Adicional anual | R$ 399,00 | Anual | `STRIPE_PRICE_EXTRA_ANNUAL` |

Produtos já criados no **live**:

- Hook7 — Plano API: `prod_VM9R7LlbHyrHSs`
- Hook7 — Número adicional: `prod_VM9S95kpBUDQQf`

Preços no **live**:

| Secret | Price ID | Valor |
|---|---|---|
| `STRIPE_PRICE_API_MONTHLY` | `price_1ULR8TQs5BDRSUmXs6xmK3mC` | R$ 59,90/mês |
| `STRIPE_PRICE_API_ANNUAL` | `price_1ULR98Qs5BDRSUmXl8NUKtsj` | R$ 599,00/ano |
| `STRIPE_PRICE_EXTRA_MONTHLY` | `price_1ULR9vQs5BDRSUmXbUi3VD5i` | R$ 39,90/mês |
| `STRIPE_PRICE_EXTRA_ANNUAL` | `price_1ULRAWQs5BDRSUmXf7rQVL2E` | R$ 399,00/ano |

> Por que 2 produtos e não 1? O nome do produto aparece na fatura, no recibo e no
> Portal do Cliente. Separar "Plano API" de "Número adicional" deixa claro para o
> cliente o que ele está pagando e facilita os relatórios no Stripe. Funcionaria com
> 1 produto e 4 preços, mas fica mais confuso.

## Como o sistema escolhe o preço

No checkout, a função `create-stripe-checkout`:

1. Lê o ciclo escolhido pelo cliente na tela `/checkout` (`monthly` ou `annual`).
2. Conta quantas **outras** sessões da organização já estão liberadas
   (`requires_subscription = false`).
   - Nenhuma → é o 1º número → `api_monthly` / `api_annual`.
   - Uma ou mais → é número adicional → `extra_monthly` / `extra_annual`.
3. Busca o Price ID no secret correspondente. Se o secret estiver vazio, o checkout
   falha com `Preço do Stripe não configurado (STRIPE_PRICE_...)`.
4. Grava `plan_key` nos metadados; o webhook salva isso em `subscriptions.plan_name`
   e usa para mostrar "/mês" ou "/ano" nos e-mails.

## Passo 1 — Criar os produtos e preços (modo de teste)

1. Entre no [Dashboard do Stripe](https://dashboard.stripe.com) e ative o
   **Modo de teste** (chave no canto superior direito).
2. Vá em **Catálogo de produtos → Adicionar produto**.
3. Produto 1:
   - **Nome:** `Hook7 — Plano API`
   - **Descrição:** `Conexão de 1 número de WhatsApp à API Hook7`
   - **Preço 1:** Recorrente · **R$ 59,90** · Moeda **BRL** · Período **Mensal**
     · Modelo de preço **Padrão** (valor fixo)
   - Clique em **Adicionar outro preço** → Recorrente · **R$ 599,00** · BRL ·
     Período **Anual**
   - Salvar.
4. Produto 2 (**Adicionar produto** de novo):
   - **Nome:** `Hook7 — Número adicional`
   - **Descrição:** `Número de WhatsApp adicional na mesma conta Hook7`
   - **Preço 1:** Recorrente · **R$ 39,90** · BRL · **Mensal**
   - **Preço 2:** Recorrente · **R$ 399,00** · BRL · **Anual**
   - Salvar.

Cuidados:

- Moeda tem que ser **BRL** (o checkout roda em `pt-BR` e o sistema divide
  `unit_amount` por 100 para gravar em reais).
- **Não** configure período de teste gratuito no preço. O teste grátis
  (3 dias / 200 mensagens) é controlado pelo próprio Hook7, não pelo Stripe.
- **Não** use "quantidade" nem preço por uso: cada sessão é uma assinatura separada
  com quantidade 1.
- Se quiser, preencha **Descrição do preço** (ex.: "Mensal", "Anual — pague 10,
  leve 12") para achar mais fácil depois.

## Passo 2 — Copiar os Price IDs

Em cada produto, clique no preço e copie o **ID do preço** (começa com `price_`,
**não** o `prod_` do produto). Anote assim:

```
STRIPE_PRICE_API_MONTHLY   = price_...   (59,90 mensal)
STRIPE_PRICE_API_ANNUAL    = price_...   (599,00 anual)
STRIPE_PRICE_EXTRA_MONTHLY = price_...   (39,90 mensal)
STRIPE_PRICE_EXTRA_ANNUAL  = price_...   (399,00 anual)
```

Confira duas vezes se o anual não ficou no lugar do mensal: é o erro mais comum.

## Passo 3 — Cadastrar os secrets no Supabase

Opção A — Painel: **Supabase → Project Settings → Edge Functions → Secrets**
(ou **Edge Functions → Secrets**) e adicione as 4 variáveis acima.

Opção B — CLI (troque pelos seus IDs):

```bash
supabase secrets set STRIPE_PRICE_API_MONTHLY=price_xxx STRIPE_PRICE_API_ANNUAL=price_xxx STRIPE_PRICE_EXTRA_MONTHLY=price_xxx STRIPE_PRICE_EXTRA_ANNUAL=price_xxx
```

Confirme também que já existem `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` do
**mesmo modo** (teste com teste, live com live). Price ID de teste com chave live
(ou o contrário) dá erro `No such price`.

## Passo 4 — Publicar as funções alteradas

```bash
supabase functions deploy create-stripe-checkout
```

```bash
supabase functions deploy stripe-webhook
```

```bash
supabase functions deploy check-trial-expiration
```

```bash
supabase functions deploy test-email
```

Depois faça o deploy do front-end (a tela `/checkout` com a escolha mensal/anual).

## Passo 5 — Conferir o webhook

Em **Desenvolvedores → Webhooks**, o endpoint
`https://<projeto>.supabase.co/functions/v1/stripe-webhook` precisa estar escutando:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Nada muda aqui em relação ao que já existia; só confira. Não é preciso criar um
webhook novo por causa dos produtos novos.

## Passo 6 — Portal do Cliente (opcional, mas recomendado)

Em **Configurações → Faturamento → Portal do cliente**:

- Se a opção **"Clientes podem trocar de plano"** estiver ligada, adicione os
  produtos novos e deixe só os preços compatíveis (ex.: mensal ↔ anual do
  **mesmo** produto). Se deixar o cliente trocar do "Número adicional" para o
  "Plano API" ou vice-versa, ele consegue pagar o preço errado.
- Se não quiser lidar com isso agora, deixe a troca de plano **desligada**; o
  cliente continua podendo cancelar e atualizar o cartão.

## Passo 7 — Testar (modo de teste)

Use o cartão `4242 4242 4242 4242`, qualquer data futura e qualquer CVC.

1. **Conta nova, 1º número, mensal** → no Stripe a assinatura deve estar em
   R$ 59,90/mês; em `subscriptions` deve aparecer `plan_name = api_monthly` e
   `amount = 59.9`.
2. **Mesma conta, 2º número, anual** → R$ 399,00/ano; `plan_name = extra_annual`.
3. **Conta nova, 1º número, anual** → R$ 599,00/ano; `plan_name = api_annual`.
4. Confira o e-mail de confirmação: o valor deve vir com "/mês" ou "/ano" certo.
5. Cancele uma assinatura de teste e veja se o e-mail de cancelamento sai correto.
6. Cartão de falha `4000 0000 0000 0341` → deve disparar o aviso de pagamento
   recusado.

Se der erro, veja os logs em **Supabase → Edge Functions → create-stripe-checkout
→ Logs**; a função registra `Plano: <plan_key> | Price: <price_id>`.

## Passo 8 — Ir para produção (modo live)

1. Desligue o modo de teste no Stripe.
2. Repita o **Passo 1** (criar os 2 produtos e 4 preços no live).
3. Repita os **Passos 2 e 3** com os Price IDs do live (e confirme que
   `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` são do live).
4. Faça uma compra real de valor baixo, se quiser validar, e reembolse depois.

## Clientes antigos (R$ 69,90)

- Quem já assina continua pagando R$ 69,90 até você decidir migrar. **Não
  arquive** o preço antigo enquanto houver assinaturas nele (arquivar não cancela
  ninguém, mas impede de reutilizar e confunde).
- Para migrar alguém: no Stripe, abra a assinatura → **Atualizar assinatura** →
  troque o preço para o novo equivalente (normalmente `api_monthly`). Escolha
  **sem proration** se quiser que o novo valor valha só a partir da próxima
  fatura. O webhook `customer.subscription.updated` atualiza o status, mas **não**
  atualiza `amount`/`plan_name` no banco; ajuste esses dois campos na tabela
  `subscriptions` manualmente se migrar alguém.
- Depois que ninguém mais usar o preço antigo, aí sim pode arquivá-lo.

## Observações

- A decisão "1º número x adicional" é feita **na hora do checkout**. Se o cliente
  depois cancelar o 1º número, os adicionais continuam no preço de adicional. Se
  isso importar, é preciso tratar manualmente (trocar o preço no Stripe).
- Se um dia os valores mudarem, altere nos **dois** lugares:
  `src/lib/pricing.ts` (o que aparece na tela) e `PLAN_PRICES` em
  `supabase/functions/create-stripe-checkout/index.ts`, e crie **preços novos**
  no Stripe (preço no Stripe não pode ter o valor editado).
