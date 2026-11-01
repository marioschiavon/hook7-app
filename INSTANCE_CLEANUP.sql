-- ==========================================
-- LIMPEZA DE INSTÂNCIAS E NÚMEROS DUPLICADOS
-- ==========================================
-- Depende de INSTANCE_MONITORING.sql. A edge function instance-cleanup roda de hora em hora e:
--   1. avisa (Telegram) instâncias que serão removidas em breve por inatividade;
--   2. remove do Hook7 as desconectadas há mais de `inactive_days` dias;
--   3. remove as "sobras": desconectadas há mais de `superseded_hours` horas cujo número está
--      conectado em outra instância;
--   4. avisa quando um mesmo número está conectado em 2+ instâncias (não remove nada).
-- Toda remoção (ou simulação) fica registrada em instance_deletions.
-- Instâncias criadas pelo app (tabela sessions) e as marcadas como "manter" nunca são removidas.
--
-- O script é idempotente: pode ser rodado de novo sem erro.

-- 1. Novos campos do inventário
ALTER TABLE public.evolution_instances
    ADD COLUMN IF NOT EXISTS keep BOOLEAN NOT NULL DEFAULT FALSE,     -- nunca remover automaticamente
    ADD COLUMN IF NOT EXISTS disconnected_since TIMESTAMPTZ,          -- NULL enquanto conectada
    ADD COLUMN IF NOT EXISTS evolution_created_at TIMESTAMPTZ;        -- createdAt do Evolution

-- Superadmins alteram só o rótulo do cliente e a marcação "manter"
REVOKE UPDATE ON public.evolution_instances FROM authenticated;
GRANT UPDATE (client_label, keep) ON public.evolution_instances TO authenticated;

-- 2. Registro de remoções
CREATE TABLE IF NOT EXISTS public.instance_deletions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    instance_name TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('inactive', 'superseded')),
    dry_run BOOLEAN NOT NULL DEFAULT FALSE,     -- TRUE = só simulação, nada foi apagado
    phone TEXT,
    client_label TEXT,
    profile_name TEXT,
    disconnected_since TIMESTAMPTZ,
    api_status INTEGER,
    api_response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Uma simulação por instância e motivo, para não repetir o aviso a cada hora
CREATE UNIQUE INDEX IF NOT EXISTS idx_instance_deletions_dry_run_once
    ON public.instance_deletions (instance_name, reason) WHERE dry_run;
CREATE INDEX IF NOT EXISTS idx_instance_deletions_created
    ON public.instance_deletions (created_at DESC);

ALTER TABLE public.instance_deletions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins view instance deletions" ON public.instance_deletions;
CREATE POLICY "Superadmins view instance deletions"
ON public.instance_deletions
FOR SELECT
TO authenticated
USING ((SELECT public.is_superadmin()));

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'instance_deletions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.instance_deletions;
    END IF;
END $$;

-- 3. Configuração da limpeza. Começa em modo simulação por 7 dias.
-- Para mudar, ex.: UPDATE monitor_status SET value = value || '{"inactive_days": 20}' WHERE key = 'cleanup_config';
INSERT INTO public.monitor_status (key, value)
VALUES (
    'cleanup_config',
    jsonb_build_object(
        'enabled', TRUE,
        'dry_run_until', to_char((NOW() + INTERVAL '7 days') AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'inactive_days', 15,
        'warn_days_before', 3,
        'superseded_hours', 48,
        'max_deletions_per_run', 20
    )
)
ON CONFLICT (key) DO NOTHING;

-- 4. Agendamento (de hora em hora, aos 7 minutos)
SELECT cron.schedule(
    'instance-cleanup',
    '7 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://kfsvpbujmetlendgwnrs.supabase.co/functions/v1/instance-cleanup',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-monitor-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'monitor_secret')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
    );
    $$
);
