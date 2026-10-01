-- ==========================================
-- ASSINATURA SOBREVIVE À EXCLUSÃO DA SESSÃO
-- ==========================================
-- Excluir uma sessão não cancela a assinatura no Stripe. Para que a assinatura possa ser
-- reaproveitada na próxima sessão (Edge Function claim-orphan-subscription), o vínculo
-- subscriptions.session_id precisa virar NULL quando a sessão é excluída — e não apagar a
-- assinatura junto (CASCADE) nem impedir a exclusão.
-- Rodar no SQL Editor do Supabase.
-- ==========================================

-- 1. Diagnóstico: como a FK está hoje? (confdeltype: a = nada, c = CASCADE, n = SET NULL)
SELECT conname, confdeltype
FROM pg_constraint
WHERE conname = 'subscriptions_session_id_fkey';

-- 2. Garantir ON DELETE SET NULL
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_session_id_fkey;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;

-- 3. Assinaturas ativas sem sessão (serão reaproveitadas na próxima sessão criada)
SELECT sub.id, sub.organization_id, o.name AS organization, sub.payer_email,
       sub.stripe_subscription_id, sub.session_id, sub.next_payment_date
FROM public.subscriptions sub
LEFT JOIN public.sessions s ON s.id = sub.session_id
LEFT JOIN public.organizations o ON o.id = sub.organization_id
WHERE sub.status = 'active'
  AND (sub.session_id IS NULL OR s.id IS NULL);

-- Se a FK estava como CASCADE (passo 1 = 'c'), a assinatura do cliente que excluiu a sessão
-- foi apagada do banco, mas continua ativa no Stripe e não aparece no passo 3. Nesse caso,
-- procure a assinatura pelo e-mail do cliente no Stripe e recrie a linha:
--
-- INSERT INTO public.subscriptions
--   (organization_id, status, amount, plan_name, stripe_subscription_id, stripe_customer_id,
--    payment_provider, payer_email, next_payment_date)
-- VALUES
--   ('<organization_id>', 'active', 59.90, 'api_monthly', 'sub_...', 'cus_...',
--    'stripe', '<email>', '<data da próxima cobrança>');
--
-- Depois disso, o cliente cria a sessão normalmente e a assinatura é vinculada sozinha.
