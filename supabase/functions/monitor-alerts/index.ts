import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Acima disso as quedas individuais viram uma única mensagem-resumo (evita dezenas de
// notificações numa queda em massa).
const BATCH_THRESHOLD = 5;
const MAX_ATTEMPTS = 5;

// Chamada a cada minuto pelo pg_cron (job monitor-collect-alerts, ver INSTANCE_MONITORING.sql)
// somente quando há alertas pendentes em monitor_alerts.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const monitorSecret = Deno.env.get('MONITOR_SECRET');
  if (!monitorSecret || req.headers.get('x-monitor-secret') !== monitorSecret) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
  if (!botToken || !chatId) {
    console.error('TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID não configurados');
    return new Response(
      JSON.stringify({ error: 'Telegram not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const sendTelegram = async (text: string) => {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!res.ok) {
      throw new Error(`Telegram ${res.status}: ${await res.text()}`);
    }
  };

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: pending, error: fetchError } = await supabaseAdmin
      .from('monitor_alerts')
      .select('id, kind, message, attempts')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100);

    if (fetchError) throw fetchError;

    const alerts = pending ?? [];
    const downAlerts = alerts.filter((a) => a.kind === 'instance_down');

    // Cada item é um envio: uma mensagem e os alertas que ela representa
    const batches: { text: string; alerts: typeof alerts }[] = [];

    if (downAlerts.length > BATCH_THRESHOLD) {
      const names = downAlerts
        .map((a) => a.message.match(/Instância: (.+)/)?.[1] ?? '?')
        .slice(0, 30);
      const extra = downAlerts.length - names.length;
      batches.push({
        text: `🔴 ${downAlerts.length} instâncias desconectadas\n\n${names.map((n) => `• ${n}`).join('\n')}${extra > 0 ? `\n… e mais ${extra}` : ''}`,
        alerts: downAlerts,
      });
      for (const a of alerts.filter((a) => a.kind !== 'instance_down')) {
        batches.push({ text: a.message, alerts: [a] });
      }
    } else {
      for (const a of alerts) {
        batches.push({ text: a.message, alerts: [a] });
      }
    }

    let sent = 0;
    let failed = 0;

    for (const batch of batches) {
      const ids = batch.alerts.map((a) => a.id);
      try {
        await sendTelegram(batch.text);
        await supabaseAdmin
          .from('monitor_alerts')
          .update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null })
          .in('id', ids);
        sent += ids.length;
      } catch (err: any) {
        console.error('Erro ao enviar alerta ao Telegram:', err);
        failed += ids.length;
        for (const a of batch.alerts) {
          const attempts = a.attempts + 1;
          await supabaseAdmin
            .from('monitor_alerts')
            .update({
              attempts,
              last_error: String(err?.message ?? err).slice(0, 500),
              status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
            })
            .eq('id', a.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro no monitor-alerts:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
