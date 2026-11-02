-- ==========================================
-- CICLO DE VIDA DAS SESSÕES (exclusão e sincronização pelo servidor)
-- ==========================================
-- Depende de INSTANCE_MONITORING.sql e INSTANCE_CLEANUP.sql.
--
-- 1. Os campos que ligam uma sessão a uma instância do Hook7 (api_session, api_token…) e os de
--    cobrança passam a ser gravados só pelas edge functions. Antes, qualquer admin de organização
--    podia alterá-los direto pela API do Supabase — por exemplo apontar a própria sessão para a
--    instância de outro cliente.
-- 2. Exclusões pedidas pelo app que não conseguiram apagar a instância no Hook7 (API fora do ar)
--    ficam marcadas em evolution_instances.delete_requested_at; o instance-cleanup conclui depois,
--    mesmo com a instância conectada.
--
-- O script é idempotente: pode ser rodado de novo sem erro.

-- 1. Colunas de sessions que o navegador ainda pode alterar
REVOKE UPDATE ON public.sessions FROM authenticated;
GRANT UPDATE (updated_at, notification_phone, webhook_url, webhook_enabled, webhook_events, qr)
    ON public.sessions TO authenticated;

-- 2. Exclusão pendente no inventário do monitor
ALTER TABLE public.evolution_instances
    ADD COLUMN IF NOT EXISTS delete_requested_at TIMESTAMPTZ;

-- 3. Novo motivo de remoção: pedida pelo dono no app
ALTER TABLE public.instance_deletions DROP CONSTRAINT IF EXISTS instance_deletions_reason_check;
ALTER TABLE public.instance_deletions
    ADD CONSTRAINT instance_deletions_reason_check CHECK (reason IN ('inactive', 'superseded', 'requested'));
