-- ==========================================
-- RESET MENSAL DE CONTADORES DE MENSAGENS
-- ==========================================
-- Pré-requisito: habilitar pg_cron no Supabase Dashboard
-- Database → Extensions → pg_cron → Enable
-- ==========================================

-- Agendar reset mensal: todo dia 1 às 00:00 UTC
-- Zera contadores de mensagens E desbloqueia sessões que atingiram o limite
SELECT cron.schedule(
  'reset-monthly-message-counts',
  '0 0 1 * *',
  $$
    -- Resetar contadores de todas as sessões
    UPDATE sessions
    SET messages_sent_this_month = 0
    WHERE messages_sent_this_month > 0;

    -- Desbloquear sessões que foram bloqueadas por limite de mensagens
    -- (usuário precisará reconectar manualmente)
    UPDATE sessions
    SET status = 'disconnected'
    WHERE status = 'blocked_limit';
  $$
);

-- Para verificar os jobs agendados:
-- SELECT * FROM cron.job;

-- Para remover o job (se necessário):
-- SELECT cron.unschedule('reset-monthly-message-counts');

-- Para testar o reset manualmente (sem aguardar dia 1):
-- UPDATE sessions SET messages_sent_this_month = 0 WHERE messages_sent_this_month > 0;
-- UPDATE sessions SET status = 'disconnected' WHERE status = 'blocked_limit';
