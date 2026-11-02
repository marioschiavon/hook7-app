import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Ressincroniza uma sessão do app com a instância de mesmo nome no Hook7. Usada quando o token
// salvo na sessão não é mais aceito (ex.: instância conectada direto pelo painel do Hook7).
// Busca a instância com a chave global, grava o token e o estado atuais na sessão e reaponta o
// webhook da instância para o app com o token novo.
//
// Só sincroniza a instância cujo nome já está em sessions.api_session da própria organização.
// Esse campo não pode ser alterado pelo navegador (ver SESSION_LIFECYCLE.sql), então não dá para
// usar isto para assumir a instância de outro cliente.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ success: false, error: 'Missing authorization header' }, 401);

    const { session_id } = await req.json();
    if (!session_id || typeof session_id !== 'string') return json({ success: false, error: 'session_id is required' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ success: false, error: 'User not authenticated' }, 401);

    // Regras de acesso: o usuário só enxerga sessões da própria organização
    const { data: session } = await supabase
      .from('sessions')
      .select('id, api_session, api_token, status')
      .eq('id', session_id)
      .maybeSingle();
    if (!session) return json({ success: false, error: 'Sessão não encontrada' }, 404);
    if (!session.api_session) return json({ success: true, found: false, reason: 'not_configured' });

    // Instância de outra organização com o mesmo nome? Nunca deveria acontecer, mas não sincroniza
    const { data: owners } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('api_session', session.api_session);
    if ((owners ?? []).some((o) => o.id !== session.id)) {
      return json({ success: false, error: 'Instância vinculada a mais de uma sessão' }, 409);
    }

    const apiUrl = Deno.env.get('HOOK7_API_URL') || 'https://api.hook7.com.br';
    const apiKey = Deno.env.get('HOOK7_API_KEY');
    if (!apiKey) return json({ success: false, error: 'Hook7 API not configured' }, 500);

    const res = await fetch(`${apiUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(session.api_session)}`, {
      headers: { 'apikey': apiKey },
    });
    if (!res.ok && res.status !== 404) return json({ success: false, error: `Hook7 API ${res.status}` }, 502);

    const body = res.ok ? await res.json().catch(() => []) : [];
    const instance = (Array.isArray(body) ? body : [])
      .map((i: any) => i?.instance ?? i)
      .find((i: any) => (i?.name ?? i?.instanceName) === session.api_session);

    if (!instance) return json({ success: true, found: false, reason: 'not_found' });

    const token: string | null = instance.token ?? instance.apikey ?? instance.hash?.apikey ?? null;
    const state: string = instance.connectionStatus ?? instance.status ?? 'close';
    const connected = state === 'open';

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (token) {
      update.api_token = token;
      update.api_token_full = token;
    }
    // Não mexe em status de cobrança/bloqueio; só reflete conexão
    if (!['pending_payment', 'blocked_limit'].includes(session.status ?? '')) {
      update.status = connected ? 'connected' : 'disconnected';
    }
    const { error: updateError } = await supabaseAdmin.from('sessions').update(update).eq('id', session.id);
    if (updateError) throw updateError;

    // O webhook da instância envia o token no header `apikey`; com o token novo, reaponta para o app
    if (token && token !== session.api_token) {
      const webhookConfig = {
        enabled: true,
        url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`,
        byEvents: false,
        base64: true,
        headers: { 'apikey': token },
        events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
      };
      const postWebhook = (payload: unknown) =>
        fetch(`${apiUrl}/webhook/set/${encodeURIComponent(session.api_session)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
          body: JSON.stringify(payload),
        });
      try {
        // Mesmo formato do hook7-generate-session: aninhado (Evolution 2.x), com fallback plano
        let webhookRes = await postWebhook({ webhook: webhookConfig });
        if (!webhookRes.ok) webhookRes = await postWebhook(webhookConfig);
        if (!webhookRes.ok) console.warn(`[session-sync] webhook/set ${webhookRes.status}`);
      } catch (err) {
        console.warn('[session-sync] Falha ao reconfigurar webhook:', err);
      }
    }

    return json({ success: true, found: true, connected, token_updated: !!token && token !== session.api_token, token });

  } catch (error: any) {
    console.error('[session-sync] Error:', error);
    return json({ success: false, error: error.message }, 500);
  }
});
