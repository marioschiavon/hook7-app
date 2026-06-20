import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateWebhookRequest {
  session_id: string;
  webhook_url?: string;
  webhook_enabled?: boolean;
  webhook_events?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const body: UpdateWebhookRequest = await req.json();
    const { session_id, webhook_url, webhook_enabled, webhook_events } = body;

    if (!session_id) throw new Error('session_id is required');

    if (webhook_url && !webhook_url.startsWith('https://')) {
      throw new Error('Webhook URL must use HTTPS');
    }

    const validEvents = ['MESSAGE', 'SEND_MESSAGE', 'CONNECTION', 'QRCODE', 'READ_RECEIPT', 'PRESENCE'];
    if (webhook_events) {
      for (const event of webhook_events) {
        if (!validEvents.includes(event)) {
          throw new Error(`Invalid event type: ${event}`);
        }
      }
    }

    console.log(`[hook7-webhook] Updating webhook for session: ${session_id}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data: userData, error: userDataError } = await supabase
      .from('users').select('organization_id').eq('id', user.id).single();
    if (userDataError || !userData?.organization_id) throw new Error('User organization not found');

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, name, organization_id, api_token')
      .eq('id', session_id)
      .eq('organization_id', userData.organization_id)
      .single();

    if (sessionError || !session) throw new Error('Session not found or access denied');

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (webhook_url !== undefined)     updateData.webhook_url     = webhook_url;
    if (webhook_enabled !== undefined) updateData.webhook_enabled = webhook_enabled;
    if (webhook_events !== undefined)  updateData.webhook_events  = webhook_events;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await supabaseAdmin
      .from('sessions').update(updateData).eq('id', session_id);

    if (updateError) throw new Error('Failed to update session');

    // Note: In Evolution Go, the webhook (our Supabase URL) is configured at connect time
    // via POST /instance/connect. The customer's forwarding URL is stored in DB only and
    // is used by the whatsapp-webhook function to forward events. No Evolution Go API call needed here.

    console.log(`[hook7-webhook] Updated session ${session_id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook configuration updated', session_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[hook7-webhook] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
