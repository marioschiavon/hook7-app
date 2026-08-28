import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event?: string;
  instance?: string;
  data?: any;
  // Evolution API v2 format
  apikey?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // 1. Parse webhook payload
    const payload = await req.json();
    console.log('Webhook payload recebido:', JSON.stringify(payload, null, 2));

    const eventType = payload.event || 'UNKNOWN';
    const instanceName = payload.instance;

    console.log(`Received webhook event: ${eventType} for instance: ${instanceName}`);

    // 2. Resolve the instance token: configuramos o webhook no Evolution API com
    // o header `apikey`, mas o Evolution também envia o token no corpo do evento.
    const apiKey = req.headers.get('apikey') || payload.apikey;

    if (!apiKey && !instanceName) {
      console.error('Missing apikey and instance');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing apikey' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Find session by api_token; se o token não bater, cai para o nome da instância
    const sessionColumns = 'id, name, api_session, organization_id, api_token, webhook_url, webhook_enabled, webhook_events';

    let session: any = null;
    let sessionError: any = null;

    if (apiKey) {
      const byToken = await supabaseAdmin
        .from('sessions')
        .select(sessionColumns)
        .eq('api_token', apiKey)
        .maybeSingle();
      session = byToken.data;
      sessionError = byToken.error;
    }

    if (!sessionError && !session && instanceName) {
      const byInstance = await supabaseAdmin
        .from('sessions')
        .select(sessionColumns)
        .eq('api_session', instanceName)
        .maybeSingle();
      session = byInstance.data;
      sessionError = byInstance.error;
    }

    if (sessionError) {
      console.error('Error querying session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Internal error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!session) {
      console.error('No session found for apikey/instance');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid apikey' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Session found: ${session.name} (${session.id})`);

    // 4.2 Track message limits if event is MESSAGES_UPSERT (Evolution API)
    const isMessageEvent = eventType === 'MESSAGES_UPSERT' || eventType === 'SEND_MESSAGE';
    const isConnectionEvent = eventType === 'CONNECTION_UPDATE';

    if (isMessageEvent && payload.data) {
      // Data might be an array or single object depending on evolution version
      const messages = Array.isArray(payload.data) ? payload.data : [payload.data];

      const outgoingMessages = [];
      const incomingMessages = [];

      for (const msg of messages) {
        let type = 'text';
        if (msg.message?.imageMessage) type = 'image';
        else if (msg.message?.audioMessage) type = 'audio';
        else if (msg.message?.documentMessage) type = 'document';
        else if (msg.message?.videoMessage) type = 'video';

        if (msg?.key?.fromMe === true) {
          // Increment count only for outgoing messages (fromMe = true)
          outgoingMessages.push({
            session_id: session.id,
            phone_number: msg.key.remoteJid || 'unknown',
            type: type,
            status: 'sent',
            direction: 'out',
          });
        } else if (msg?.key?.fromMe === false) {
          // status is intentionally never 'sent' here, so the billing trigger doesn't fire
          incomingMessages.push({
            session_id: session.id,
            phone_number: msg.key.remoteJid || 'unknown',
            type: type,
            status: 'received',
            direction: 'in',
          });
        }
      }

      if (incomingMessages.length > 0) {
        const { error: insertIncomingError } = await supabaseAdmin
          .from('message_logs')
          .insert(incomingMessages);

        if (insertIncomingError) {
          console.error('Error inserting incoming message logs:', insertIncomingError);
        }
      }

      if (outgoingMessages.length > 0) {
        // Insert into message_logs. The DB trigger will automatically increment messages_sent_this_month.
        const { error: insertError } = await supabaseAdmin
          .from('message_logs')
          .insert(outgoingMessages);

        if (insertError) {
          console.error('Error inserting message logs:', insertError);
        }

        // Check the current count to see if we need to block the session
        const { data: currentSession } = await supabaseAdmin
          .from('sessions')
          .select('trial_started_at, requires_subscription, message_limit, messages_sent_this_month')
          .eq('id', session.id)
          .single();

        if (currentSession && currentSession.message_limit !== -1) {
          if (currentSession.messages_sent_this_month >= currentSession.message_limit) {
            console.log(`Session ${session.name} reached message limit (${currentSession.messages_sent_this_month}/${currentSession.message_limit}). Blocking...`);

            // Block the session by logging out from the WhatsApp API
            try {
              const API_URL = Deno.env.get('HOOK7_API_URL') || 'https://api.hook7.com.br';
              await fetch(`${API_URL}/instance/logout/${encodeURIComponent(session.api_session || session.name)}`, {
                method: 'DELETE',
                headers: { 'apikey': session.api_token }
              });

              // Mark trial sessions as blocked so the expiration cron doesn't retry them,
              // and the frontend can compute trial state without relying on connection status.
              const isTrialSession = !!currentSession.trial_started_at && currentSession.requires_subscription;
              await supabaseAdmin
                .from('sessions')
                .update(isTrialSession ? { status: 'blocked_limit', trial_blocked_at: new Date().toISOString() } : { status: 'blocked_limit' })
                .eq('id', session.id);

              console.log('Session logged out successfully due to limit.');
            } catch (err) {
              console.error('Error logging out instance for limit breach:', err);
            }
          }
        }
      }
    }

    // 4.5 Sync connection status to database on CONNECTION_UPDATE events
    if (isConnectionEvent && payload.data) {
      const connectionState = payload.data?.state || payload.data?.instance?.state;
      
      if (connectionState === 'open') {
        await supabaseAdmin.from('sessions')
          .update({ status: 'connected', updated_at: new Date().toISOString() })
          .eq('id', session.id);
        console.log(`Session status updated to connected: ${session.name}`);
      } else if (connectionState === 'close') {
        await supabaseAdmin.from('sessions')
          .update({ status: 'disconnected', updated_at: new Date().toISOString() })
          .eq('id', session.id);
        console.log(`Session status updated to disconnected: ${session.name}`);
      }
    }

    // 5. Check if webhook is enabled and event is subscribed
    if (!session.webhook_enabled || !session.webhook_url) {
      console.log('Webhook not enabled or URL not configured, skipping forward');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook received but not forwarded (not configured)' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subscribedEvents = session.webhook_events || ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'];
    if (!subscribedEvents.includes(eventType)) {
      console.log(`Event ${eventType} not in subscribed events, skipping`);
      return new Response(
        JSON.stringify({ success: true, message: 'Event not subscribed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Validate webhook URL (must be HTTPS)
    if (!session.webhook_url.startsWith('https://')) {
      console.error('Webhook URL must use HTTPS');
      
      // Log the error
      await supabaseAdmin.from('webhook_logs').insert({
        session_id: session.id,
        event_type: eventType,
        payload: payload,
        status: 'error',
        error_message: 'Webhook URL must use HTTPS'
      });

      return new Response(
        JSON.stringify({ error: 'Webhook URL must use HTTPS' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Forward event to client's webhook URL
    console.log(`Forwarding event to: ${session.webhook_url}`);
    
    const forwardPayload = {
      event: eventType,
      instance: session.name,
      session_id: session.id,
      timestamp: new Date().toISOString(),
      data: payload.data || payload
    };

    let responseCode: number | null = null;
    let errorMessage: string | null = null;
    let status = 'pending';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const forwardResponse = await fetch(session.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': session.api_token, // Forward the instance token for client validation
          'X-Webhook-Event': eventType,
          'X-Session-Id': session.id,
          'X-Instance-Name': session.name
        },
        body: JSON.stringify(forwardPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      responseCode = forwardResponse.status;

      if (forwardResponse.ok) {
        status = 'delivered';
        console.log(`Webhook delivered successfully (${responseCode})`);
      } else {
        status = 'failed';
        errorMessage = `HTTP ${responseCode}`;
        console.error(`Webhook delivery failed: ${errorMessage}`);
      }
    } catch (fetchError: any) {
      status = 'failed';
      errorMessage = fetchError.name === 'AbortError' 
        ? 'Timeout (10s)' 
        : fetchError.message || 'Connection failed';
      console.error(`Webhook forward error: ${errorMessage}`);
    }

    // 8. Log every forwarded webhook delivery (used for the dashboard's delivery-rate stat)
    await supabaseAdmin.from('webhook_logs').insert({
      session_id: session.id,
      event_type: eventType,
      payload: forwardPayload,
      status,
      response_code: responseCode,
      error_message: errorMessage
    });

    const processingTime = Date.now() - startTime;
    console.log(`Webhook processed in ${processingTime}ms, status: ${status}`);

    return new Response(
      JSON.stringify({ 
        success: status === 'delivered', 
        status,
        processing_time_ms: processingTime
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in whatsapp-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
