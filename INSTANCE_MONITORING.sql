-- ==========================================
-- MONITORAMENTO DE INSTÂNCIAS E ALERTAS (Etapa 1)
-- ==========================================
-- A fonte da verdade é o próprio Evolution API, não a tabela sessions: boa parte das instâncias
-- é criada por clientes de contrato direto na API e nunca passa pelo app.
--
-- A cada minuto o pg_cron chama a edge function evolution-monitor, que:
--   1. consulta /instance/fetchInstances com a chave global;
--   2. atualiza o inventário (evolution_instances) e grava mudanças de estado (instance_events);
--   3. gera alertas imediatos (instância criada/removida, número trocado, API fora do ar);
--   4. chama monitor_collect_alerts() para os alertas com espera (queda > 60s, queda em massa,
--      reconexão);
--   5. envia os pendentes de monitor_alerts ao Telegram.
--
-- O script é idempotente: pode ser rodado de novo sem erro.

-- 0. Upgrade da primeira versão (eventos ligados a sessions.session_id, job monitor-collect-alerts).
-- As tabelas antigas só são recriadas se estiverem vazias.
SELECT cron.unschedule('monitor-collect-alerts')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monitor-collect-alerts');

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'instance_events' AND column_name = 'session_id'
    ) THEN
        IF EXISTS (SELECT 1 FROM public.instance_events) OR EXISTS (SELECT 1 FROM public.monitor_alerts) THEN
            RAISE EXCEPTION 'instance_events/monitor_alerts da versão anterior têm dados; migre manualmente';
        END IF;
        DROP TABLE public.monitor_alerts;
        DROP TABLE public.instance_events;
    END IF;
END $$;

-- 1. Inventário de instâncias vistas no Evolution
CREATE TABLE IF NOT EXISTS public.evolution_instances (
    instance_name TEXT PRIMARY KEY,
    state TEXT NOT NULL,            -- open | connecting | close
    phone TEXT,                     -- número conectado atualmente
    last_phone TEXT,                -- último número que esteve conectado (detecta troca)
    profile_name TEXT,
    client_label TEXT,              -- identificação manual do cliente/contrato
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    state_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    removed_at TIMESTAMPTZ          -- deixou de aparecer no fetchInstances
);

ALTER TABLE public.evolution_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins view evolution instances" ON public.evolution_instances;
CREATE POLICY "Superadmins view evolution instances"
ON public.evolution_instances
FOR SELECT
TO authenticated
USING ((SELECT public.is_superadmin()));

-- 2. Histórico de conexões/desconexões
CREATE TABLE IF NOT EXISTS public.instance_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    instance_name TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('connected', 'disconnected')),
    status_reason INTEGER,          -- disconnectionReasonCode do Evolution (401 = deslogado, 428/408/503 = queda)
    phone TEXT,
    source TEXT NOT NULL DEFAULT 'watchdog',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instance_events_instance_created
    ON public.instance_events (instance_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instance_events_created
    ON public.instance_events (created_at DESC);

ALTER TABLE public.instance_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins view instance events" ON public.instance_events;
CREATE POLICY "Superadmins view instance events"
ON public.instance_events
FOR SELECT
TO authenticated
USING ((SELECT public.is_superadmin()));

-- 3. Fila de alertas
CREATE TABLE IF NOT EXISTS public.monitor_alerts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kind TEXT NOT NULL,             -- instance_down | instance_restored | mass_disconnect | api_down | api_restored
                                    -- instance_created | instance_removed | first_connection | phone_changed
    severity TEXT NOT NULL DEFAULT 'critical',  -- critical | security | info
    instance_name TEXT,
    event_id BIGINT REFERENCES public.instance_events(id) ON DELETE CASCADE,
    dedupe_key TEXT NOT NULL UNIQUE,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_monitor_alerts_pending
    ON public.monitor_alerts (created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_monitor_alerts_event ON public.monitor_alerts (event_id);

ALTER TABLE public.monitor_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins view monitor alerts" ON public.monitor_alerts;
CREATE POLICY "Superadmins view monitor alerts"
ON public.monitor_alerts
FOR SELECT
TO authenticated
USING ((SELECT public.is_superadmin()));

-- 4. Estado do próprio monitor (ex.: desde quando a API está fora do ar)
CREATE TABLE IF NOT EXISTS public.monitor_status (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.monitor_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins view monitor status" ON public.monitor_status;
CREATE POLICY "Superadmins view monitor status"
ON public.monitor_status
FOR SELECT
TO authenticated
USING ((SELECT public.is_superadmin()));

-- 5. Texto legível do código de desconexão do Evolution/Baileys
CREATE OR REPLACE FUNCTION public.monitor_reason_label(reason INTEGER)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE reason
        WHEN 401 THEN 'deslogada (pelo celular, painel ou API)'
        WHEN 403 THEN 'acesso negado pelo WhatsApp (possível banimento)'
        WHEN 408 THEN 'timeout de conexão'
        WHEN 428 THEN 'conexão fechada'
        WHEN 440 THEN 'substituída por outra sessão'
        WHEN 500 THEN 'erro interno'
        WHEN 503 THEN 'serviço indisponível'
        WHEN 515 THEN 'reinício necessário'
        ELSE COALESCE('código ' || reason::TEXT, 'motivo não informado')
    END;
$$;

-- 6. Alertas com espera. Chamada pela evolution-monitor a cada minuto; idempotente (dedupe_key).
CREATE OR REPLACE FUNCTION public.monitor_collect_alerts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    inserted INTEGER := 0;
    n INTEGER;
    down_count INTEGER;
BEGIN
    -- 6.1 Instância caída há mais de 60s (último evento é uma desconexão).
    -- Sessões do app bloqueadas por limite são ignoradas: a queda foi provocada pelo próprio sistema.
    INSERT INTO monitor_alerts (kind, severity, instance_name, event_id, dedupe_key, message)
    SELECT
        'instance_down',
        'critical',
        e.instance_name,
        e.id,
        'down:' || e.id,
        format(
            E'🔴 Instância desconectada\n\nInstância: %s\nCliente: %s\nNúmero: %s\nMotivo: %s\nDesde: %s',
            e.instance_name,
            COALESCE(i.client_label, o.name, '-'),
            COALESCE('+' || COALESCE(e.phone, i.last_phone), '-'),
            monitor_reason_label(e.status_reason),
            to_char(e.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI:SS')
        )
    FROM (
        SELECT DISTINCT ON (instance_name) *
        FROM instance_events
        WHERE created_at > NOW() - INTERVAL '1 day'
        ORDER BY instance_name, created_at DESC, id DESC
    ) e
    LEFT JOIN evolution_instances i ON i.instance_name = e.instance_name
    LEFT JOIN sessions s ON s.api_session = e.instance_name
    LEFT JOIN organizations o ON o.id = s.organization_id
    WHERE e.event_type = 'disconnected'
      AND e.created_at < NOW() - INTERVAL '60 seconds'
      AND s.status IS DISTINCT FROM 'blocked_limit'
    ON CONFLICT (dedupe_key) DO NOTHING;
    GET DIAGNOSTICS n = ROW_COUNT;
    inserted := inserted + n;

    -- 6.2 Instância voltou depois de um alerta de queda
    INSERT INTO monitor_alerts (kind, severity, instance_name, event_id, dedupe_key, message)
    SELECT
        'instance_restored',
        'info',
        c.instance_name,
        c.id,
        'up:' || c.id,
        format(
            E'🟢 Instância reconectada\n\nInstância: %s\nFicou fora: %s min',
            c.instance_name,
            GREATEST(1, ROUND(EXTRACT(EPOCH FROM (c.created_at - d.created_at)) / 60))::INTEGER
        )
    FROM instance_events c
    JOIN LATERAL (
        SELECT pe.id, pe.created_at
        FROM instance_events pe
        WHERE pe.instance_name = c.instance_name
          AND pe.created_at <= c.created_at
          AND pe.id <> c.id
        ORDER BY pe.created_at DESC, pe.id DESC
        LIMIT 1
    ) d ON TRUE
    JOIN monitor_alerts a ON a.event_id = d.id AND a.kind = 'instance_down'
    WHERE c.event_type = 'connected'
      AND c.created_at > NOW() - INTERVAL '1 day'
    ON CONFLICT (dedupe_key) DO NOTHING;
    GET DIAGNOSTICS n = ROW_COUNT;
    inserted := inserted + n;

    -- 6.3 Queda em massa: 3+ instâncias diferentes desconectadas nos últimos 3 min
    -- (possível banimento em lote, atualização do WhatsApp ou problema no servidor).
    SELECT COUNT(DISTINCT instance_name) INTO down_count
    FROM instance_events
    WHERE event_type = 'disconnected'
      AND created_at > NOW() - INTERVAL '3 minutes';

    IF down_count >= 3 THEN
        INSERT INTO monitor_alerts (kind, severity, dedupe_key, message)
        VALUES (
            'mass_disconnect',
            'critical',
            'mass:' || to_char(date_trunc('hour', NOW()) + floor(EXTRACT(MINUTE FROM NOW()) / 10) * INTERVAL '10 minutes', 'YYYYMMDDHH24MI'),
            format(E'🚨 Queda em massa\n\n%s instâncias desconectaram nos últimos 3 minutos. Verifique o servidor do Hook7.', down_count)
        )
        ON CONFLICT (dedupe_key) DO NOTHING;
        GET DIAGNOSTICS n = ROW_COUNT;
        inserted := inserted + n;
    END IF;

    RETURN inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.monitor_collect_alerts() FROM PUBLIC, anon, authenticated;

-- 7. Configuração do monitor guardada no Vault, lida pela edge function com a service role.
-- Antes de rodar, crie os segredos:
--   SELECT vault.create_secret('<texto aleatório>', 'monitor_secret');
--   SELECT vault.create_secret('<token do bot>', 'telegram_bot_token');
--   SELECT vault.create_secret('<id do chat>', 'telegram_chat_id');
CREATE OR REPLACE FUNCTION public.monitor_get_config()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT COALESCE(jsonb_object_agg(name, decrypted_secret), '{}'::jsonb)
    FROM vault.decrypted_secrets
    WHERE name IN ('monitor_secret', 'telegram_bot_token', 'telegram_chat_id');
$$;

REVOKE ALL ON FUNCTION public.monitor_get_config() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monitor_get_config() TO service_role;

-- 8. Agendamento (a cada minuto).
SELECT cron.schedule(
    'evolution-monitor',
    '* * * * *',
    $$
    SELECT net.http_post(
        url := 'https://kfsvpbujmetlendgwnrs.supabase.co/functions/v1/evolution-monitor',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-monitor-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'monitor_secret')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
    );
    $$
);

-- 9. Retenção: eventos com mais de 90 dias e alertas enviados com mais de 30 dias
SELECT cron.schedule(
    'monitor-retention',
    '30 3 * * *',
    $$
    DELETE FROM public.instance_events WHERE created_at < NOW() - INTERVAL '90 days';
    DELETE FROM public.monitor_alerts WHERE status = 'sent' AND created_at < NOW() - INTERVAL '30 days';
    $$
);
