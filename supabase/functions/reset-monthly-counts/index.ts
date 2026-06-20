import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Chave secreta para proteger execução manual (opcional)
// Configurar em Supabase Secrets: RESET_SECRET=alguma-chave-aleatoria
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Aceitar chamada de cron (sem auth) ou chamada autenticada com service role
  const authHeader = req.headers.get('authorization');
  const resetSecret = Deno.env.get('RESET_SECRET');

  // Se RESET_SECRET estiver configurado, exigir no header X-Reset-Secret
  if (resetSecret) {
    const providedSecret = req.headers.get('x-reset-secret');
    if (providedSecret !== resetSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Resetar contadores de mensagens de todas as sessões
    const { data: resetData, error: resetError } = await supabase
      .from('sessions')
      .update({ messages_sent_this_month: 0 })
      .gt('messages_sent_this_month', 0)
      .select('id, name');

    if (resetError) {
      console.error('Erro ao resetar contadores:', resetError);
      throw resetError;
    }

    const resetCount = resetData?.length ?? 0;
    console.log(`Contadores resetados em ${resetCount} sessão(ões)`);

    // 2. Desbloquear sessões que atingiram o limite no mês anterior
    const { data: unblockData, error: unblockError } = await supabase
      .from('sessions')
      .update({ status: 'disconnected' })
      .eq('status', 'blocked_limit')
      .select('id, name');

    if (unblockError) {
      console.error('Erro ao desbloquear sessões:', unblockError);
      throw unblockError;
    }

    const unblockCount = unblockData?.length ?? 0;
    console.log(`${unblockCount} sessão(ões) desbloqueada(s)`);

    return new Response(
      JSON.stringify({
        success: true,
        reset_at: new Date().toISOString(),
        sessions_reset: resetCount,
        sessions_unblocked: unblockCount,
        sessions: resetData?.map(s => s.name) ?? [],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro no reset mensal:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
