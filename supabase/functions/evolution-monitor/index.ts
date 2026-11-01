import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Acima disso, alertas do mesmo tipo viram uma única mensagem-resumo (evita dezenas de
// notificações numa queda em massa ou quando um cliente cria várias instâncias de uma vez).
const BATCH_THRESHOLD = 5;
const MAX_ATTEMPTS = 5;
// Falhas seguidas antes de avisar que a API caiu (o cron roda a cada minuto)
const API_DOWN_AFTER_FAILURES = 2;
const FETCH_TIMEOUT_MS = 15000;

interface FetchedInstance {
  name: string;
  state: string;
  phone: string | null;
  profileName: string | null;
  reason: number | null;
}

interface InventoryRow {
  instance_name: string;
  state: string;
  phone: string | null;
  last_phone: string | null;
  profile_name: string | null;
  client_label: string | null;
  first_seen_at: string;
  state_changed_at: string;
  removed_at: string | null;
}

interface NewAlert {
  kind: string;
  severity: string;
  instance_name?: string;
  dedupe_key: string;
  message: string;
}

const formatTime = (iso: string | Date) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const jidToPhone = (jid?: string | null) => (jid ? jid.split('@')[0].split(':')[0] : null);

// O formato do /instance/fetchInstances mudou entre versões do Evolution; normalizamos os dois.
const normalizeInstance = (raw: any): FetchedInstance | null => {
  const v1 = raw?.instance;
  const name = raw?.name ?? v1?.instanceName;
  if (!name) return null;
  const reason = Number(raw?.disconnectionReasonCode);
  return {
    name,
    state: raw?.connectionStatus ?? v1?.status ?? 'close',
    phone: jidToPhone(raw?.ownerJid ?? v1?.owner) ?? raw?.number ?? null,
    profileName: raw?.profileName ?? v1?.profileName ?? null,
    reason: Number.isFinite(reason) ? reason : null,
  };
};

// Chamada a cada minuto pelo pg_cron (job evolution-monitor, ver INSTANCE_MONITORING.sql).
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Segredos do monitor ficam no Vault (monitor_get_config); variáveis de ambiente têm prioridade.
  const { data: vaultConfig } = await supabaseAdmin.rpc('monitor_get_config');
  const config = (vaultConfig ?? {}) as Record<string, string>;

  const monitorSecret = Deno.env.get('MONITOR_SECRET') || config.monitor_secret;
  if (!monitorSecret || req.headers.get('x-monitor-secret') !== monitorSecret) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || config.telegram_bot_token;
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID') || config.telegram_chat_id;
  const apiUrl = Deno.env.get('HOOK7_API_URL') || 'https://api.hook7.com.br';
  const apiKey = Deno.env.get('HOOK7_API_KEY');

  if (!botToken || !chatId || !apiKey) {
    console.error('TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID ou HOOK7_API_KEY não configurados');
    return new Response(
      JSON.stringify({ error: 'Monitor not configured' }),
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
    const now = new Date();
    const nowIso = now.toISOString();
    const alerts: NewAlert[] = [];

    // ── 1. Consultar o Evolution ─────────────────────────────────────────────
    let fetched: FetchedInstance[] | null = null;
    let fetchError = '';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(`${apiUrl}/instance/fetchInstances`, {
        headers: { 'apikey': apiKey },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        fetchError = `HTTP ${res.status}`;
      } else {
        const body = await res.json();
        fetched = (Array.isArray(body) ? body : []).map(normalizeInstance).filter((i): i is FetchedInstance => !!i);
      }
    } catch (err: any) {
      fetchError = err?.name === 'AbortError' ? `Timeout (${FETCH_TIMEOUT_MS / 1000}s)` : (err?.message || 'Falha de conexão');
    }

    // ── 2. Saúde da própria API ─────────────────────────────────────────────
    const { data: apiStatusRow } = await supabaseAdmin
      .from('monitor_status')
      .select('value')
      .eq('key', 'evolution_api')
      .maybeSingle();
    const apiStatus = (apiStatusRow?.value ?? {}) as { down_since?: string; failures?: number; alerted?: boolean };

    if (!fetched) {
      const failures = (apiStatus.failures ?? 0) + 1;
      const downSince = apiStatus.down_since ?? nowIso;
      let alerted = !!apiStatus.alerted;
      if (!alerted && failures >= API_DOWN_AFTER_FAILURES) {
        alerts.push({
          kind: 'api_down',
          severity: 'critical',
          dedupe_key: `api_down:${downSince}`,
          message: `🚨 API do Hook7 fora do ar\n\nNão responde desde ${formatTime(downSince)} (${failures} tentativas)\nErro: ${fetchError}\nURL: ${apiUrl}`,
        });
        alerted = true;
      }
      await supabaseAdmin.from('monitor_status').upsert({
        key: 'evolution_api',
        value: { down_since: downSince, failures, alerted, last_error: fetchError },
        updated_at: nowIso,
      });
    } else {
      if (apiStatus.alerted && apiStatus.down_since) {
        const minutes = Math.max(1, Math.round((now.getTime() - new Date(apiStatus.down_since).getTime()) / 60000));
        alerts.push({
          kind: 'api_restored',
          severity: 'info',
          dedupe_key: `api_up:${apiStatus.down_since}`,
          message: `✅ API do Hook7 voltou\n\nFicou fora: ${minutes} min\n${fetched.length} instâncias, ${fetched.filter((i) => i.state === 'open').length} conectadas`,
        });
      }
      if (apiStatus.failures || apiStatus.alerted) {
        await supabaseAdmin.from('monitor_status').upsert({ key: 'evolution_api', value: {}, updated_at: nowIso });
      }
    }

    // ── 3. Comparar com o inventário ────────────────────────────────────────
    let instancesSummary = { total: 0, open: 0 };

    if (fetched) {
      const { data: inventoryData, error: inventoryError } = await supabaseAdmin
        .from('evolution_instances')
        .select('instance_name, state, phone, last_phone, profile_name, client_label, first_seen_at, state_changed_at, removed_at');
      if (inventoryError) throw inventoryError;

      const inventory = new Map((inventoryData as InventoryRow[] ?? []).map((r) => [r.instance_name, r]));
      // Primeira execução: só popula o inventário, sem disparar um alerta por instância existente
      const bootstrap = inventory.size === 0;

      const upserts: Record<string, unknown>[] = [];
      const events: Record<string, unknown>[] = [];
      const fetchedNames = new Set<string>();

      for (const inst of fetched) {
        fetchedNames.add(inst.name);
        const prev = inventory.get(inst.name);
        const isOpen = inst.state === 'open';
        const label = prev?.client_label ? ` (${prev.client_label})` : '';

        if (!prev || prev.removed_at) {
          if (!bootstrap) {
            alerts.push({
              kind: 'instance_created',
              severity: 'security',
              instance_name: inst.name,
              dedupe_key: `created:${inst.name}:${nowIso}`,
              message: `🆕 Instância criada\n\nInstância: ${inst.name}${label}\nEstado: ${inst.state}`,
            });
          }
          upserts.push({
            instance_name: inst.name,
            state: inst.state,
            phone: inst.phone,
            last_phone: isOpen ? inst.phone : (prev?.last_phone ?? null),
            profile_name: inst.profileName,
            first_seen_at: prev?.first_seen_at ?? nowIso,
            last_seen_at: nowIso,
            state_changed_at: nowIso,
            removed_at: null,
          });
          continue;
        }

        const wasOpen = prev.state === 'open';

        if (wasOpen && !isOpen) {
          events.push({
            instance_name: inst.name,
            event_type: 'disconnected',
            status_reason: inst.reason,
            phone: prev.phone,
          });
        } else if (!wasOpen && isOpen) {
          events.push({ instance_name: inst.name, event_type: 'connected', phone: inst.phone });
        }

        if (isOpen && inst.phone) {
          if (!prev.last_phone) {
            alerts.push({
              kind: 'first_connection',
              severity: 'security',
              instance_name: inst.name,
              dedupe_key: `first:${inst.name}:${inst.phone}`,
              message: `🔐 Número conectado\n\nInstância: ${inst.name}${label}\nNúmero: +${inst.phone}\nPerfil: ${inst.profileName ?? '-'}`,
            });
          } else if (prev.last_phone !== inst.phone) {
            alerts.push({
              kind: 'phone_changed',
              severity: 'security',
              instance_name: inst.name,
              dedupe_key: `phone:${inst.name}:${inst.phone}:${nowIso}`,
              message: `⚠️ Número trocado na instância\n\nInstância: ${inst.name}${label}\nAntes: +${prev.last_phone}\nAgora: +${inst.phone}\nPerfil: ${inst.profileName ?? '-'}`,
            });
          }
        }

        const next = {
          state: inst.state,
          phone: isOpen ? inst.phone : prev.phone,
          last_phone: isOpen && inst.phone ? inst.phone : prev.last_phone,
          profile_name: inst.profileName ?? prev.profile_name,
        };
        // Só grava linhas que mudaram: o painel escuta essa tabela via Realtime, e regravar
        // todas as instâncias a cada minuto geraria um evento por instância por minuto.
        const changed = next.state !== prev.state || next.phone !== prev.phone
          || next.last_phone !== prev.last_phone || next.profile_name !== prev.profile_name;
        if (changed) {
          upserts.push({
            instance_name: inst.name,
            ...next,
            first_seen_at: prev.first_seen_at,
            last_seen_at: nowIso,
            state_changed_at: prev.state !== inst.state ? nowIso : prev.state_changed_at,
            removed_at: null,
          });
        }
      }

      // Instâncias que sumiram do Evolution (deletadas)
      for (const prev of inventory.values()) {
        if (fetchedNames.has(prev.instance_name) || prev.removed_at) continue;
        alerts.push({
          kind: 'instance_removed',
          severity: 'security',
          instance_name: prev.instance_name,
          dedupe_key: `removed:${prev.instance_name}:${nowIso}`,
          message: `🗑️ Instância removida\n\nInstância: ${prev.instance_name}${prev.client_label ? ` (${prev.client_label})` : ''}\nÚltimo número: ${prev.last_phone ? `+${prev.last_phone}` : '-'}`,
        });
        upserts.push({
          instance_name: prev.instance_name,
          state: 'removed',
          phone: prev.phone,
          last_phone: prev.last_phone,
          profile_name: prev.profile_name,
          first_seen_at: prev.first_seen_at,
          last_seen_at: nowIso,
          state_changed_at: nowIso,
          removed_at: nowIso,
        });
      }

      if (upserts.length > 0) {
        const { error } = await supabaseAdmin.from('evolution_instances').upsert(upserts);
        if (error) throw error;
      }
      if (events.length > 0) {
        const { error } = await supabaseAdmin.from('instance_events').insert(events);
        if (error) throw error;
      }

      instancesSummary = { total: fetched.length, open: fetched.filter((i) => i.state === 'open').length };

      if (bootstrap) {
        alerts.push({
          kind: 'monitor_started',
          severity: 'info',
          // Chave fixa: se o Evolution devolver zero instâncias o inventário segue vazio e isso
          // rodaria a cada minuto; o aviso de início sai uma vez só.
          dedupe_key: 'monitor_started',
          message: `📡 Monitor do Hook7 ativo\n\n${instancesSummary.total} instâncias encontradas, ${instancesSummary.open} conectadas.`,
        });
      }
    }

    // Pulso do monitor, usado pelo painel para mostrar a última verificação e a saúde da API
    await supabaseAdmin.from('monitor_status').upsert({
      key: 'last_check',
      value: { at: nowIso, api_ok: !!fetched, error: fetched ? null : fetchError, ...instancesSummary },
      updated_at: nowIso,
    });

    if (alerts.length > 0) {
      const { error } = await supabaseAdmin
        .from('monitor_alerts')
        .upsert(alerts, { onConflict: 'dedupe_key', ignoreDuplicates: true });
      if (error) throw error;
    }

    // ── 4. Alertas com espera (queda > 60s, queda em massa, reconexão) ──────
    const { error: collectError } = await supabaseAdmin.rpc('monitor_collect_alerts');
    if (collectError) console.error('Erro em monitor_collect_alerts:', collectError);

    // ── 5. Enviar pendentes ao Telegram ─────────────────────────────────────
    const { data: pending, error: pendingError } = await supabaseAdmin
      .from('monitor_alerts')
      .select('id, kind, instance_name, message, attempts')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(200);
    if (pendingError) throw pendingError;

    const batches: { text: string; alerts: NonNullable<typeof pending> }[] = [];
    const summaryTitles: Record<string, string> = {
      instance_down: '🔴 instâncias desconectadas',
      instance_restored: '🟢 instâncias reconectadas',
      instance_created: '🆕 instâncias criadas',
      instance_removed: '🗑️ instâncias removidas',
      first_connection: '🔐 números conectados',
    };
    const byKind = new Map<string, NonNullable<typeof pending>>();
    for (const a of pending ?? []) {
      byKind.set(a.kind, [...(byKind.get(a.kind) ?? []), a]);
    }
    for (const [kind, group] of byKind) {
      if (group.length > BATCH_THRESHOLD && summaryTitles[kind]) {
        const names = group.map((a) => a.instance_name ?? '?').slice(0, 30);
        const extra = group.length - names.length;
        batches.push({
          text: `${group.length} ${summaryTitles[kind]}\n\n${names.map((n) => `• ${n}`).join('\n')}${extra > 0 ? `\n… e mais ${extra}` : ''}`,
          alerts: group,
        });
      } else {
        for (const a of group) batches.push({ text: a.message, alerts: [a] });
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
      JSON.stringify({
        success: true,
        api_ok: !!fetched,
        instances: instancesSummary,
        alerts_sent: sent,
        alerts_failed: failed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro no evolution-monitor:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
