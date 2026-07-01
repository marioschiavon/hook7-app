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
    // 1. Extract apikey from header (sent by Evolution API)
    const apiKey = req.headers.get('apikey');
    
    if (!apiKey) {
      console.error('Missing apikey header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing apikey' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse webhook payload
    const payload = await req.json();
    console.log('Webhook payload recebido:', JSON.stringify(payload, null, 2));

    const eventType = payload.event || 'UNKNOWN';
    const instanceName = payload.instance;

    console.log(`Received webhook event: ${eventType} for instance: ${instanceName}`);

    // 3. Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Find session by api_token (the apikey sent in header)
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, name, organization_id, webhook_url, webhook_enabled, webhook_events')
      .eq('api_token', apiKey)
      .maybeSingle();

    if (sessionError) {
      console.error('Error querying session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Internal error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!session) {
      console.error('No session found for apikey');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid apikey' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Session found: ${session.name} (${session.id})`);

    // 4.2 Track message limits if event is MESSAGES_UPSERT
    // Support both Evolution API (MESSAGES_UPSERT) and Evolution Go (MESSAGE) event names
    const isMessageEvent = eventType === 'MESSAGES_UPSERT' || eventType === 'MESSAGE' || eventType === 'SEND_MESSAGE';
    const isConnectionEvent = eventType === 'CONNECTION_UPDATE' || eventType === 'CONNECTION';

    if (isMessageEvent && payload.data) {
      // Data might be an array or single object depending on evolution version
      const messages = Array.isArray(payload.data) ? payload.data : [payload.data];
      
      const outgoingMessages = [];
      
      for (const msg of messages) {
        // Increment count only for outgoing messages (fromMe = true)
        if (msg?.key?.fromMe === true) {
          let type = 'text';
          if (msg.message?.imageMessage) type = 'image';
          else if (msg.message?.audioMessage) type = 'audio';
          else if (msg.message?.documentMessage) type = 'document';
          else if (msg.message?.videoMessage) type = 'video';
          
          outgoingMessages.push({
            session_id: session.id,
            phone_number: msg.key.remoteJid || 'unknown',
            type: type,
            status: 'sent',
          });
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
          .select('message_limit, messages_sent_this_month')
          .eq('id', session.id)
          .single();

        if (currentSession && currentSession.message_limit !== -1) {
          if (currentSession.messages_sent_this_month >= currentSession.message_limit) {
            console.log(`Session ${session.name} reached message limit (${currentSession.messages_sent_this_month}/${currentSession.message_limit}). Blocking...`);
            
            // Block the session by logging out from the WhatsApp API
            try {
              const API_URL = Deno.env.get('HOOK7_API_URL') || 'https://api.hook7.com.br';
              await fetch(`${API_URL}/instance/logout`, {
                method: 'DELETE',
                headers: { 'apikey': apiKey }
              });
              
              await supabaseAdmin
                .from('sessions')
                .update({ status: 'blocked_limit' })
                .eq('id', session.id);
                
              console.log('Session logged out successfully due to limit.');
            } catch (err) {
              console.error('Error logging out instance for limit breach:', err);
            }
          }
        }
      }
    }

    // 4.5 Sync connection status to database on CONNECTION_UPDATE / CONNECTION events
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
          'apikey': apiKey, // Forward the same apikey for client validation
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

    // 8. Log only failed webhook deliveries (success logs are redundant with Evolution API)
    if (status === 'failed' || status === 'error') {
      await supabaseAdmin.from('webhook_logs').insert({
        session_id: session.id,
        event_type: eventType,
        payload: forwardPayload,
        status,
        response_code: responseCode,
        error_message: errorMessage
      });
    }

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
