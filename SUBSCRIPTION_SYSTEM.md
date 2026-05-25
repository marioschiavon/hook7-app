# 🔐 Sistema de Assinaturas por Sessão - Hook7

## 📋 Visão Geral

O Hook7 agora implementa um modelo de assinatura **por sessão**, onde cada sessão WhatsApp possui sua própria assinatura independente no Stripe.

### Benefícios do Modelo:
- ✅ **Flexibilidade**: Cliente pode ter múltiplas sessões
- ✅ **Independência**: Cancelar uma sessão não afeta as outras
- ✅ **Escalabilidade**: Fácil gerenciar crescimento
- ✅ **Proteção Legacy**: Clientes antigos continuam funcionando normalmente

---

## 🏗️ Arquitetura

```
┌─────────────┐
│  Dashboard  │
└──────┬──────┘
       │
       ├── Cliente LEGACY? 
       │   ├── SIM → Cria sessão direto (sem cobrança)
       │   └── NÃO → Redireciona para /checkout?session_name=xxx
       │
       v
┌──────────────┐
│   Checkout   │
└──────┬───────┘
       │
       ├── 1. Chama generate-whatsapp-token (cria sessão)
       ├── 2. Chama create-stripe-checkout (vincula assinatura à sessão)
       └── 3. Redireciona para Stripe
       │
       v
┌────────────────────┐
│  Stripe      │
│  (Pagamento)       │
└────────┬───────────┘
       │
       v
┌────────────────────┐
│  Webhook MP        │
│  (Confirmação)     │
└────────┬───────────┘
       │
       └── Atualiza: sessions.requires_subscription = FALSE
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabela: `organizations`
```sql
is_legacy BOOLEAN DEFAULT FALSE
-- TRUE = Cliente antigo (não precisa pagar por sessão)
-- FALSE = Cliente novo (paga por cada sessão)
```

### Tabela: `sessions`
```sql
requires_subscription BOOLEAN DEFAULT TRUE
-- TRUE = Sessão bloqueada até pagamento
-- FALSE = Sessão liberada (pode usar)
```

### Tabela: `subscriptions`
```sql
session_id UUID REFERENCES sessions(id)
-- Vincula assinatura a uma sessão específica
-- Cada sessão = 1 assinatura no Stripe
```

---

## 🔄 Fluxo Completo

### 1️⃣ Cliente LEGACY (Antigo)
```
Dashboard → Criar Sessão → ✅ Criada imediatamente
                            requires_subscription = FALSE
                            Sem cobrança
```

### 2️⃣ Cliente NOVO (Primeira Sessão)
```
Dashboard → Criar Sessão
          ↓
   Checkout (session_name=xxx)
          ↓
   generate-whatsapp-token (cria sessão)
          ↓
   create-stripe-checkout (session_id)
          ↓
   Stripe (pagamento)
          ↓
   Webhook (confirma)
          ↓
   sessions.requires_subscription = FALSE ✅
```

### 3️⃣ Cliente NOVO (Segunda Sessão)
```
Repete o processo da primeira sessão
→ Nova assinatura independente no Stripe
```

### 4️⃣ Cancelamento de Assinatura
```
Cliente cancela no Stripe
          ↓
   Webhook recebe notificação
          ↓
   sessions.requires_subscription = TRUE (bloqueia APENAS essa sessão)
          ↓
   Outras sessões continuam funcionando ✅
```

---

## 🛡️ Proteção de Clientes Legacy

### O que é um cliente LEGACY?
Organizações criadas **antes de 11/11/2025** que já pagam por outro meio.

### Como funciona?
1. Ao executar a migração, todas as organizações existentes recebem `is_legacy = TRUE`
2. Todas as sessões existentes recebem `requires_subscription = FALSE`
3. Dashboard verifica `is_legacy` antes de redirecionar para checkout
4. Clientes legacy continuam criando sessões normalmente (sem cobrança)

### Código de Verificação:
```typescript
if (orgData.is_legacy) {
  // Cria sessão direto, sem checkout
  await supabase.functions.invoke('generate-whatsapp-token', {
    body: { session_name: sessionName }
  });
} else {
  // Redireciona para checkout
  navigate(`/checkout?session_name=${sessionName}`);
}
```

---

## 💰 Modelo de Cobrança

### Preço por Sessão
- **R$ 69,90/mês** por sessão
- Renovação automática via Stripe
- Cancelamento independente

### Limites
- Clientes legacy: mantêm limites existentes
- Clientes novos: ilimitado (paga por cada sessão)

---

## 🔧 Edge Functions

### `generate-whatsapp-token`
- **Input**: `{ session_name: string }`
- **Output**: `{ session_id, api_token, ... }`
- **Função**: Cria sessão no banco e gera token na API externa
- **Nova coluna**: `requires_subscription = TRUE` (por padrão)

### `create-stripe-checkout`
- **Input**: `{ session_id: string }`
- **Output**: `{ init_point, subscription_id }`
- **Função**: 
  1. Verifica se session_id existe
  2. Verifica se já tem assinatura ativa
  3. Cria assinatura no Stripe
  4. Vincula assinatura à sessão no banco
  5. Retorna URL de pagamento

### `stripe-webhook`
- **Input**: Notificação do Stripe
- **Função**:
  1. Busca assinatura por `preapproval_id`
  2. Atualiza status da assinatura
  3. **Libera ou bloqueia sessão específica** baseado no status
  4. Atualiza organization (compatibilidade)

---

## 🧪 Cenários de Teste

### ✅ Teste 1: Cliente Legacy Cria Sessão
```
1. Login como cliente antigo
2. Dashboard → "Criar Sessão"
3. Insere nome "teste-legacy"
4. ✅ Sessão criada imediatamente
5. ✅ Sem redirecionamento para checkout
6. ✅ requires_subscription = FALSE
```

### ✅ Teste 2: Cliente Novo Cria Primeira Sessão
```
1. Signup → Cria organização
2. Dashboard → "Criar Sessão"
3. Insere nome "minha-primeira-sessao"
4. ✅ Redireciona para /checkout?session_name=...
5. ✅ Exibe mensagem "Finalize o pagamento para criar..."
6. Clica "Assinar agora"
7. ✅ Mostra "Criando sessão..."
8. ✅ Mostra "Processando pagamento..."
9. ✅ Redireciona para Stripe
10. Paga no Stripe
11. ✅ Webhook libera sessão (requires_subscription = FALSE)
```

### ✅ Teste 3: Cliente Novo Cria Segunda Sessão
```
1. Cliente já tem 1 sessão ativa
2. Dashboard → "Criar Sessão"
3. Insere nome "minha-segunda-sessao"
4. ✅ Redireciona para checkout novamente
5. ✅ Nova assinatura criada (independente)
6. ✅ Agora tem 2 sessões, 2 assinaturas no MP
```

### ✅ Teste 4: Cancelamento de Uma Sessão
```
1. Cliente cancela assinatura no Stripe
2. ✅ Webhook recebe notificação
3. ✅ Atualiza apenas a sessão cancelada (requires_subscription = TRUE)
4. ✅ Outras sessões continuam funcionando
```

---

## 📊 Monitoramento

### Logs Importantes
```typescript
// create-stripe-checkout
console.log('Creating subscription for session:', session_id);
console.log('Session: ${sessionData.name}, Organization: ${orgName}');

// stripe-webhook
console.log('Webhook recebido:', preapprovalId);
console.log('Sessão ${session_id} ${subscriptionActive ? "liberada" : "bloqueada"}');
```

### Verificar no Dashboard Supabase
```sql
-- Ver sessões bloqueadas
SELECT * FROM sessions WHERE requires_subscription = TRUE;

-- Ver assinaturas por sessão
SELECT s.name, sub.status, sub.preapproval_id
FROM sessions s
LEFT JOIN subscriptions sub ON sub.session_id = s.id;

-- Ver clientes legacy
SELECT * FROM organizations WHERE is_legacy = TRUE;
```

---

## 🚀 Deploy

### 1. Executar Migração
```sql
-- Execute: SUBSCRIPTION_PER_SESSION_MIGRATION.sql
-- Protege clientes existentes como LEGACY
```

### 2. Edge Functions
- ✅ `create-stripe-checkout` (modificada)
- ✅ `stripe-webhook` (modificada)
- ✅ `generate-whatsapp-token` (sem alterações)

### 3. Frontend
- ✅ Dashboard.tsx (verifica is_legacy)
- ✅ Checkout.tsx (recebe session_name via query param)

---

## 📝 Notas Importantes

1. **Migração é Irreversível**: Após executar, todos os clientes atuais serão LEGACY
2. **Webhook Requer Permissão**: `verify_jwt = false` no `config.toml`
3. **Session_name Obrigatório**: Checkout não funciona sem query param
4. **TypeScript Types**: Após migração, executar regeneração de tipos do Supabase
5. **Compatibilidade**: Organizations mantêm `subscription_status` para compatibilidade

---

## 🆘 Solução de Problemas

### Erro: "session_id é obrigatório"
- Checkout foi acessado sem query param
- Solução: Sempre acessar via Dashboard → Criar Sessão

### Erro: "Já existe assinatura ativa"
- Tentou criar 2 assinaturas para mesma sessão
- Solução: Verificar `subscriptions` table

### Sessão não libera após pagamento
- Webhook pode não estar chegando
- Verificar logs: Dashboard Supabase → Edge Functions → stripe-webhook
- Verificar se URL do webhook está configurada no Stripe

### Cliente legacy sendo cobrado
- Verificar `organizations.is_legacy = TRUE`
- Se FALSE, executar: `UPDATE organizations SET is_legacy = TRUE WHERE created_at < NOW()`

---

## 📚 Referências

- [Documentação Stripe - Assinaturas](https://docs.stripe.com/billing/subscriptions/overview)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [RLS Policies Supabase](https://supabase.com/docs/guides/auth/row-level-security)
