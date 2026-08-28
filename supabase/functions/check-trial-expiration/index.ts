import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRIAL_HOURS = 48;

// Deve ser chamada periodicamente (ex.: a cada 15-30min) por um cron externo ou pg_cron,
// do mesmo jeito que reset-monthly-counts.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const resetSecret = Deno.env.get('RESET_SECRET');
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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const cutoff = new Date(Date.now() - TRIAL_HOURS * 60 * 60 * 1000).toISOString();

    // Sessões em trial (trial_started_at setado, ainda não assinaram, ainda não bloqueadas)
    // que já passaram das 48h.
    const { data: expiredSessions, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('id, name, api_session, api_token')
      .not('trial_started_at', 'is', null)
      .eq('requires_subscription', true)
      .is('trial_blocked_at', null)
      .lt('trial_started_at', cutoff);

    if (fetchError) {
      console.error('Erro ao buscar sessões em trial expirado:', fetchError);
      throw fetchError;
    }

    const API_URL = Deno.env.get('HOOK7_API_URL') || 'https://api.hook7.com.br';
    const blocked: string[] = [];

    for (const s of expiredSessions ?? []) {
      try {
        if (s.api_token && (s.api_session || s.name)) {
          await fetch(`${API_URL}/instance/logout/${encodeURIComponent(s.api_session || s.name)}`, {
            method: 'DELETE',
            headers: { 'apikey': s.api_token }
          });
        }

        await supabaseAdmin
          .from('sessions')
          .update({ status: 'disconnected', trial_blocked_at: new Date().toISOString() })
          .eq('id', s.id);

        blocked.push(s.name);
        console.log(`Trial expirado por tempo (48h): ${s.name}`);
      } catch (err) {
        console.error(`Erro ao expirar trial da sessão ${s.name}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked_at: new Date().toISOString(),
        sessions_expired: blocked.length,
        sessions: blocked,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro no check-trial-expiration:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
