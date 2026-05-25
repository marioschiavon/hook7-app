-- ==========================================
-- MESSAGE TRACKING E LIMITES DE PLANO
-- ==========================================

-- 1. Adicionar colunas de limite e contagem na tabela 'sessions'
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS message_limit INTEGER DEFAULT -1, -- -1 significa ilimitado
ADD COLUMN IF NOT EXISTS messages_sent_this_month INTEGER DEFAULT 0;

-- Atualizar sessões antigas para ilimitadas (para não bloquear clientes existentes)
UPDATE sessions SET message_limit = -1 WHERE message_limit IS NULL;

-- 2. Criar a tabela de logs de mensagens
CREATE TABLE IF NOT EXISTS message_logs (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    type TEXT NOT NULL, -- 'text', 'image', 'audio', 'document'
    status TEXT NOT NULL, -- 'sent', 'failed'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS e Criar Políticas para message_logs
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own message logs"
ON message_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM sessions
        JOIN users ON users.organization_id = sessions.organization_id
        WHERE sessions.id = message_logs.session_id
        AND users.id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own message logs"
ON message_logs
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sessions
        JOIN users ON users.organization_id = sessions.organization_id
        WHERE sessions.id = message_logs.session_id
        AND users.id = auth.uid()
    )
);

-- 4. Criar uma função para atualizar a contagem de mensagens do mês na sessão
-- Esta função e trigger rodarão sempre que uma mensagem for logada como 'sent'
CREATE OR REPLACE FUNCTION increment_messages_sent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'sent' THEN
        UPDATE sessions
        SET messages_sent_this_month = messages_sent_this_month + 1
        WHERE id = NEW.session_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_messages_sent ON message_logs;

CREATE TRIGGER trg_increment_messages_sent
AFTER INSERT ON message_logs
FOR EACH ROW
EXECUTE FUNCTION increment_messages_sent();
