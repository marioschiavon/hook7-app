import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const { session_name, notification_phone } = await req.json();

    if (!session_name || typeof session_name !== 'string') throw new Error('session_name is required');

    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(session_name)) {
      throw new Error('Invalid session name format. Use only letters, numbers, hyphens and underscores');
    }
    if (session_name.length < 3 || session_name.length > 50) {
      throw new Error('Session name must be between 3 and 50 characters');
    }

    console.log(`[hook7] session: ${session_name}`);

    // User auth
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

    const { data: orgData, error: orgError } = await supabase
      .from('organizations').select('id, name').eq('id', userData.organization_id).single();
    if (orgError || !orgData) throw new Error('Organization not found');

    // Evolution Go credentials
    const hook7ApiUrl = Deno.env.get('HOOK7_API_URL');
    const hook7ApiKey = Deno.env.get('HOOK7_API_KEY');
    if (!hook7ApiUrl || !hook7ApiKey) throw new Error('Hook7 API not configured');

    // Admin client (needed for DB writes)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ── 1. Create instance (Evolution Go) ───────────────────────────────────
    console.log(`[hook7] Creating instance: ${session_name}`);

    let instanceApiKey: string | null = null;
    let instanceUuid: string | null = null;

    const createResponse = await fetch(`${hook7ApiUrl}/instance/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': hook7ApiKey },
      body: JSON.stringify({ name: session_name })
    });

    if (createResponse.ok) {
      const createData = await createResponse.json().catch(() => null);
      console.log('[hook7] Create response:', JSON.stringify(createData));
      // Evolution Go: { data: { id, name, token, ... }, message: "success" }
      instanceApiKey = createData?.data?.token ?? null;
      instanceUuid   = createData?.data?.id ?? null;
    } else {
      const errorText = await createResponse.text();
      console.warn(`[hook7] Create returned ${createResponse.status}: ${errorText}`);
      if (createResponse.status !== 400 && createResponse.status !== 409) {
        throw new Error(`Hook7 API error: ${createResponse.status} - ${errorText}`);
      }
      // Instance may already exist — fall through to /instance/all
    }

    // ── 2. Fetch existing instance if token not yet obtained ─────────────────
    if (!instanceApiKey) {
      console.log('[hook7] Fetching via /instance/all...');
      const allResponse = await fetch(`${hook7ApiUrl}/instance/all`, {
        headers: { 'apikey': hook7ApiKey }
      });

      if (allResponse.ok) {
        const allData = await allResponse.json();
        const instances: any[] = Array.isArray(allData) ? allData : (allData?.data ?? []);
        const existing = instances.find((i: any) => i.name === session_name);
        if (existing) {
          instanceApiKey = existing.token ?? existing.apikey ?? null;
          instanceUuid   = existing.id ?? null;
          console.log('[hook7] Existing instance token found:', !!instanceApiKey);
        }
      }
    }

    if (!instanceApiKey) throw new Error('Could not obtain instance API key from Hook7 API');

    // ── 3. Configure webhook via /instance/connect ───────────────────────────
    if (instanceUuid) {
      try {
        const supabaseWebhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`;
        const connectResponse = await fetch(`${hook7ApiUrl}/instance/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': hook7ApiKey,
            'instanceId': instanceUuid
          },
          body: JSON.stringify({
            webhookUrl: supabaseWebhookUrl,
            subscribe: ['MESSAGE', 'SEND_MESSAGE', 'CONNECTION', 'QRCODE']
          })
        });

        if (connectResponse.ok) {
          console.log('[hook7] Webhook configured via /instance/connect');
        } else {
          const connectErr = await connectResponse.text();
          console.warn(`[hook7] Webhook config: ${connectResponse.status} - ${connectErr}`);
        }
      } catch (connectError) {
        console.warn('[hook7] Non-critical: Failed to configure webhook:', connectError);
      }
    }

    // ── 4. Persist session to database ───────────────────────────────────────
    const { data: existingSession } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .eq('name', session_name)
      .maybeSingle();

    let sessionData;

    if (existingSession) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('sessions')
        .update({
          api_session: session_name,
          api_token: instanceApiKey,
          api_token_full: instanceApiKey,
          status: 'configured',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSession.id)
        .select().single();

      if (updateError) throw new Error('Failed to update session in database');
      sessionData = updated;
      console.log('[hook7] Session updated:', sessionData.id);
    } else {
      const { data: created, error: insertError } = await supabaseAdmin
        .from('sessions')
        .insert({
          organization_id: userData.organization_id,
          name: session_name,
          api_session: session_name,
          api_token: instanceApiKey,
          api_token_full: instanceApiKey,
          status: 'configured',
          requires_subscription: false,
          api_message_limit: 3000,
          api_message_usage: 0,
          notification_phone: notification_phone || null
        })
        .select().single();

      if (insertError) throw new Error('Failed to create session in database');
      sessionData = created;
      console.log('[hook7] Session created:', sessionData.id);
    }

    // Update organizations (legacy compatibility)
    await supabaseAdmin
      .from('organizations')
      .update({ api_session: session_name, api_token: instanceApiKey, api_token_full: instanceApiKey })
      .eq('id', userData.organization_id);

    return new Response(
      JSON.stringify({
        success: true,
        session: session_name,
        token: instanceApiKey,
        token_full: instanceApiKey,
        session_id: sessionData.id,
        session_name,
        organization_name: orgData.name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[hook7] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
