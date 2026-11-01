import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAY_MS = 24 * 60 * 60 * 1000;

interface CleanupConfig {
  enabled: boolean;
  dry_run_until: string | null;
  inactive_days: number;
  warn_days_before: number;
  superseded_hours: number;
  max_deletions_per_run: number;
}

const DEFAULT_CONFIG: CleanupConfig = {
  enabled: true,
  dry_run_until: null,
  inactive_days: 15,
  warn_days_before: 3,
  superseded_hours: 48,
  max_deletions_per_run: 20,
};

interface InventoryRow {
  instance_name: string;
  state: string;
  phone: string | null;
  last_phone: string | null;
  profile_name: string | null;
  client_label: string | null;
  keep: boolean;
  disconnected_since: string | null;
}

interface Candidate {
  inst: InventoryRow;
  reason: 'inactive' | 'superseded';
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });

const describe = (inst: InventoryRow) => {
  const phone = inst.phone ?? inst.last_phone;
  return `Instância: ${inst.instance_name}${inst.client_label ? ` (${inst.client_label})` : ''}\nNúmero: ${phone ? `+${phone}` : '-'}\nDesconectada desde: ${inst.disconnected_since ? formatDate(inst.disconnected_since) : '-'}`;
};

// Chamada de hora em hora pelo pg_cron (job instance-cleanup, ver INSTANCE_CLEANUP.sql).
// Não envia nada ao Telegram: grava em monitor_alerts e o evolution-monitor entrega no minuto seguinte.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: vaultConfig } = await supabaseAdmin.rpc('monitor_get_config');
  const secrets = (vaultConfig ?? {}) as Record<string, string>;
  const monitorSecret = Deno.env.get('MONITOR_SECRET') || secrets.monitor_secret;
  if (!monitorSecret || req.headers.get('x-monitor-secret') !== monitorSecret) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const apiUrl = Deno.env.get('HOOK7_API_URL') || 'https://api.hook7.com.br';
  const apiKey = Deno.env.get('HOOK7_API_KEY');
  if (!apiKey) {
    console.error('HOOK7_API_KEY não configurada');
    return new Response(
      JSON.stringify({ error: 'Cleanup not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    const { data: configRow } = await supabaseAdmin
      .from('monitor_status')
      .select('value')
      .eq('key', 'cleanup_config')
      .maybeSingle();
    const config: CleanupConfig = { ...DEFAULT_CONFIG, ...((configRow?.value ?? {}) as Partial<CleanupConfig>) };

    if (!config.enabled) {
      return new Response(
        JSON.stringify({ success: true, skipped: 'disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dryRun = !!config.dry_run_until && now < new Date(config.dry_run_until).getTime();

    // Só limpa com o monitor em dia: com a API fora do ar o inventário pode estar desatualizado
    const { data: lastCheckRow } = await supabaseAdmin
      .from('monitor_status')
      .select('value')
      .eq('key', 'last_check')
      .maybeSingle();
    const lastCheck = (lastCheckRow?.value ?? {}) as { at?: string; api_ok?: boolean };
    if (!lastCheck.api_ok || !lastCheck.at || now - new Date(lastCheck.at).getTime() > 5 * 60 * 1000) {
      return new Response(
        JSON.stringify({ success: true, skipped: 'monitor_not_healthy' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [{ data: inventoryData, error: inventoryError }, { data: sessionsData }] = await Promise.all([
      supabaseAdmin
        .from('evolution_instances')
        .select('instance_name, state, phone, last_phone, profile_name, client_label, keep, disconnected_since')
        .is('removed_at', null),
      supabaseAdmin.from('sessions').select('api_session'),
    ]);
    if (inventoryError) throw inventoryError;

    const inventory = (inventoryData ?? []) as InventoryRow[];
    // Instâncias do app: removê-las quebraria a sessão do cliente no painel
    const appInstances = new Set((sessionsData ?? []).map((s) => s.api_session).filter(Boolean));

    const numberOf = (i: InventoryRow) => i.phone ?? i.last_phone;
    const openByPhone = new Map<string, InventoryRow[]>();
    for (const inst of inventory) {
      const phone = numberOf(inst);
      if (inst.state === 'open' && phone) {
        openByPhone.set(phone, [...(openByPhone.get(phone) ?? []), inst]);
      }
    }

    const alerts: Record<string, unknown>[] = [];
    const candidates: Candidate[] = [];

    for (const inst of inventory) {
      if (inst.state === 'open' || inst.keep || appInstances.has(inst.instance_name) || !inst.disconnected_since) continue;

      const downForMs = now - new Date(inst.disconnected_since).getTime();
      const phone = numberOf(inst);
      const supersededBy = phone ? (openByPhone.get(phone) ?? []).filter((o) => o.instance_name !== inst.instance_name) : [];

      if (supersededBy.length > 0 && downForMs >= config.superseded_hours * 60 * 60 * 1000) {
        candidates.push({ inst, reason: 'superseded' });
      } else if (downForMs >= config.inactive_days * DAY_MS) {
        candidates.push({ inst, reason: 'inactive' });
      } else if (downForMs >= (config.inactive_days - config.warn_days_before) * DAY_MS) {
        const removeAt = new Date(new Date(inst.disconnected_since).getTime() + config.inactive_days * DAY_MS).toISOString();
        alerts.push({
          kind: 'cleanup_warning',
          severity: 'info',
          instance_name: inst.instance_name,
          dedupe_key: `cleanup_warn:${inst.instance_name}:${inst.disconnected_since}`,
          message: `⏳ Instância será removida por inatividade\n\n${describe(inst)}\nRemoção em: ${formatDate(removeAt)}\n\nPara manter, marque "Manter" no painel de monitoramento.`,
        });
      }
    }

    // Mesmo número conectado em 2+ instâncias: só avisa, não dá para saber qual a integração usa
    for (const [phone, group] of openByPhone) {
      if (group.length < 2) continue;
      const names = group.map((i) => i.instance_name).sort();
      alerts.push({
        kind: 'duplicate_number',
        severity: 'security',
        instance_name: names[0],
        dedupe_key: `dup:${phone}:${names.join(',')}`,
        message: `⚠️ Número conectado em ${group.length} instâncias\n\nNúmero: +${phone}\n${names.map((n) => `• ${n}`).join('\n')}\n\nAs duas recebem todas as mensagens e disparam o webhook em dobro. Mantenha só uma conectada.`,
      });
    }

    let deleted = 0;
    let simulated = 0;
    let failed = 0;

    for (const { inst, reason } of candidates.slice(0, config.max_deletions_per_run)) {
      const reasonText = reason === 'superseded'
        ? `número conectado em outra instância há mais de ${config.superseded_hours}h`
        : `desconectada há mais de ${config.inactive_days} dias`;
      const logRow = {
        instance_name: inst.instance_name,
        reason,
        phone: numberOf(inst),
        client_label: inst.client_label,
        profile_name: inst.profile_name,
        disconnected_since: inst.disconnected_since,
      };

      if (dryRun) {
        // Uma simulação por instância e motivo (o índice único parcial garante o mesmo no banco)
        const { data: existing } = await supabaseAdmin
          .from('instance_deletions')
          .select('id')
          .eq('instance_name', inst.instance_name)
          .eq('reason', reason)
          .eq('dry_run', true)
          .maybeSingle();
        if (!existing) {
          await supabaseAdmin.from('instance_deletions').insert({ ...logRow, dry_run: true });
          simulated++;
          alerts.push({
            kind: 'cleanup_simulated',
            severity: 'info',
            instance_name: inst.instance_name,
            dedupe_key: `cleanup_sim:${inst.instance_name}:${reason}`,
            message: `🧪 Simulação: instância seria removida\n\n${describe(inst)}\nMotivo: ${reasonText}\n\nNada foi apagado. A remoção real começa em ${formatDate(config.dry_run_until!)}.`,
          });
        }
        continue;
      }

      let apiStatus: number | null = null;
      let apiResponse = '';
      try {
        const res = await fetch(`${apiUrl}/instance/delete/${encodeURIComponent(inst.instance_name)}`, {
          method: 'DELETE',
          headers: { 'apikey': apiKey },
        });
        apiStatus = res.status;
        apiResponse = (await res.text()).slice(0, 500);
      } catch (err: any) {
        apiResponse = String(err?.message ?? err).slice(0, 500);
      }

      // 404 = já não existia no Hook7; registramos como removida do mesmo jeito
      const ok = apiStatus !== null && ((apiStatus >= 200 && apiStatus < 300) || apiStatus === 404);
      await supabaseAdmin.from('instance_deletions').insert({ ...logRow, dry_run: false, api_status: apiStatus, api_response: apiResponse });

      if (ok) {
        deleted++;
        // Marca como removida já aqui, para o monitor não alertar "instância removida" de novo
        await supabaseAdmin
          .from('evolution_instances')
          .update({ state: 'removed', removed_at: nowIso, state_changed_at: nowIso })
          .eq('instance_name', inst.instance_name);
        alerts.push({
          kind: 'instance_deleted',
          severity: 'info',
          instance_name: inst.instance_name,
          dedupe_key: `cleanup_del:${inst.instance_name}:${nowIso}`,
          message: `🧹 Instância removida automaticamente\n\n${describe(inst)}\nMotivo: ${reasonText}`,
        });
      } else {
        failed++;
        alerts.push({
          kind: 'cleanup_failed',
          severity: 'critical',
          instance_name: inst.instance_name,
          dedupe_key: `cleanup_fail:${inst.instance_name}:${nowIso}`,
          message: `❌ Falha ao remover instância inativa\n\n${describe(inst)}\nResposta da API: ${apiStatus ?? 'sem resposta'} ${apiResponse.slice(0, 150)}`,
        });
      }
    }

    if (alerts.length > 0) {
      const { error } = await supabaseAdmin
        .from('monitor_alerts')
        .upsert(alerts, { onConflict: 'dedupe_key', ignoreDuplicates: true });
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        candidates: candidates.length,
        deleted,
        simulated,
        failed,
        duplicates: [...openByPhone.values()].filter((g) => g.length > 1).length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro no instance-cleanup:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
