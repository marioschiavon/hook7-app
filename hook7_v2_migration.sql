-- ==========================================
-- Migração Arquitetural Hook7 V2 (Isolamento Total)
-- Executar no schema 'hook7_app'
-- ATENÇÃO: Habilitar 'hook7_app' no API Exposed Schemas do Supabase após rodar.
-- ==========================================

-- 1. Criação do Schema e Configuração Base
CREATE SCHEMA IF NOT EXISTS hook7_app;

-- Extensão para geração de UUID (se não existir)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;

-- Função auxiliar para extrair tenants do usuário atual (Security Definer para performance no RLS)
CREATE OR REPLACE FUNCTION hook7_app.get_auth_user_tenants() 
RETURNS SETOF uuid 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
STABLE
AS $$
  SELECT tenant_id FROM hook7_app.tenant_users WHERE user_id = auth.uid();
$$;

-- ==========================================
-- 2. Criação das Tabelas
-- ==========================================

-- 2.1 Tenants
CREATE TABLE IF NOT EXISTS hook7_app.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 Tenant Users
CREATE TABLE IF NOT EXISTS hook7_app.tenant_users (
    tenant_id UUID NOT NULL REFERENCES hook7_app.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- Linkando com a base legada/auth segura
    role TEXT NOT NULL DEFAULT 'member', -- owner, admin, member
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, user_id)
);

-- 2.3 Plans
CREATE TABLE IF NOT EXISTS hook7_app.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price_monthly NUMERIC(10,2) NOT NULL,
    features JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 Subscriptions
CREATE TABLE IF NOT EXISTS hook7_app.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES hook7_app.tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES hook7_app.plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active', -- active, past_due, canceled
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5 Instances (Conexões/WhatsApp)
CREATE TABLE IF NOT EXISTS hook7_app.instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES hook7_app.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'disconnected',
    provider_reference TEXT, -- ID no provedor (Evolution API etc)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.6 Usage Counters (Contabilização de mensagens)
CREATE TABLE IF NOT EXISTS hook7_app.usage_counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES hook7_app.tenants(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL, -- ex: 'messages_sent'
    count BIGINT NOT NULL DEFAULT 0,
    billing_period_start TIMESTAMPTZ NOT NULL,
    billing_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.7 Webhook Endpoints
CREATE TABLE IF NOT EXISTS hook7_app.webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES hook7_app.tenants(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret TEXT,
    events TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8 Webhook Deliveries (Os disparos lógicos)
CREATE TABLE IF NOT EXISTS hook7_app.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint_id UUID NOT NULL REFERENCES hook7_app.webhook_endpoints(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.9 Webhook Attempts (Tentativas reais HTTP)
CREATE TABLE IF NOT EXISTS hook7_app.webhook_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID NOT NULL REFERENCES hook7_app.webhook_deliveries(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL DEFAULT 1,
    response_code INT,
    response_body TEXT,
    duration_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.10 Webhook Dead Letter Queue (DLQ)
CREATE TABLE IF NOT EXISTS hook7_app.webhook_dlq (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES hook7_app.tenants(id) ON DELETE CASCADE,
    delivery_id UUID NOT NULL REFERENCES hook7_app.webhook_deliveries(id) ON DELETE CASCADE,
    error_reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.11 Audit Logs
CREATE TABLE IF NOT EXISTS hook7_app.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES hook7_app.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 3. Índices para Performance e FKs
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON hook7_app.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON hook7_app.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_instances_tenant ON hook7_app.instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_counters_tenant_period ON hook7_app.usage_counters(tenant_id, billing_period_start);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_tenant ON hook7_app.webhook_endpoints(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON hook7_app.webhook_deliveries(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_attempts_delivery ON hook7_app.webhook_attempts(delivery_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON hook7_app.audit_logs(tenant_id);

-- ==========================================
-- 4. Habilitação de RLS em todas as tabelas
-- ==========================================
ALTER TABLE hook7_app.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE hook7_app.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hook7_app.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE hook7_app.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hook7_app.instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE hook7_app.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE hook7_app.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE hook7_app.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE hook7_app.webhook_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hook7_app.webhook_dlq ENABLE ROW LEVEL SECURITY;
ALTER TABLE hook7_app.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 5. Row Level Security Policies (Baseado em Tenant_ID)
-- ==========================================

-- Limpa policies antigas se existirem (para idempotência)
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'hook7_app'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Policy" ON hook7_app.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can view own tenant_users" ON hook7_app.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Public read access to plans" ON hook7_app.%I', tbl);
    END LOOP;
END $$;

-- 5.1 Tenants: Usuário vê os tenants onde ele está em tenant_users
CREATE POLICY "Tenant Isolation Policy" ON hook7_app.tenants
    FOR ALL USING (id IN (SELECT hook7_app.get_auth_user_tenants()));

-- 5.2 Tenant Users: Usuário vê os vínculos do seu próprio tenant ou de si mesmo
CREATE POLICY "Users can view own tenant_users" ON hook7_app.tenant_users
    FOR ALL USING (user_id = auth.uid() OR tenant_id IN (SELECT hook7_app.get_auth_user_tenants()));

-- 5.3 Plans: Todos os usuários logados podem ver os planos (somente leitura)
CREATE POLICY "Public read access to plans" ON hook7_app.plans
    FOR SELECT USING (auth.role() = 'authenticated');

-- 5.4 Demais Tabelas que possuem coluna tenant_id direta:
CREATE POLICY "Tenant Isolation Policy" ON hook7_app.subscriptions FOR ALL USING (tenant_id IN (SELECT hook7_app.get_auth_user_tenants()));
CREATE POLICY "Tenant Isolation Policy" ON hook7_app.instances FOR ALL USING (tenant_id IN (SELECT hook7_app.get_auth_user_tenants()));
CREATE POLICY "Tenant Isolation Policy" ON hook7_app.usage_counters FOR ALL USING (tenant_id IN (SELECT hook7_app.get_auth_user_tenants()));
CREATE POLICY "Tenant Isolation Policy" ON hook7_app.webhook_endpoints FOR ALL USING (tenant_id IN (SELECT hook7_app.get_auth_user_tenants()));
CREATE POLICY "Tenant Isolation Policy" ON hook7_app.webhook_dlq FOR ALL USING (tenant_id IN (SELECT hook7_app.get_auth_user_tenants()));
CREATE POLICY "Tenant Isolation Policy" ON hook7_app.audit_logs FOR ALL USING (tenant_id IN (SELECT hook7_app.get_auth_user_tenants()));

-- 5.5 Tabelas dependentes indiretas (Deliveries e Attempts não têm tenant_id na raiz por normalização)
CREATE POLICY "Tenant Isolation Policy" ON hook7_app.webhook_deliveries 
    FOR ALL USING (endpoint_id IN (SELECT id FROM hook7_app.webhook_endpoints WHERE tenant_id IN (SELECT hook7_app.get_auth_user_tenants())));

CREATE POLICY "Tenant Isolation Policy" ON hook7_app.webhook_attempts 
    FOR ALL USING (delivery_id IN (SELECT d.id FROM hook7_app.webhook_deliveries d JOIN hook7_app.webhook_endpoints e ON d.endpoint_id = e.id WHERE e.tenant_id IN (SELECT hook7_app.get_auth_user_tenants())));
