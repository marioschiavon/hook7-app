import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Exclui uma sessão do app e a instância correspondente no Hook7.
// Usa a chave global da API, então funciona mesmo se o token salvo na sessão estiver errado.
//   - instância existe no Hook7 → desconecta e apaga lá, depois apaga a sessão;
//   - não existe → apaga só a sessão;
//   - o Hook7 não respondeu → apaga a sessão e marca a instância em evolution_instances.delete_requested_at;
//     o instance-cleanup conclui a remoção na próxima rodada.
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

    // A leitura com o cliente do usuário passa pelas regras de acesso: só enxerga sessões da própria organização
    const { data: session } = await supabase
      .from('sessions')
      .select('id, name, api_session, organization_id, status')
      .eq('id', session_id)
      .maybeSingle();
    if (!session) return json({ success: false, error: 'Sessão não encontrada' }, 404);

    // Excluir exige ser admin da organização (agentes só leem) ou superadmin
    const [{ data: profile }, { data: superadmin }] = await Promise.all([
      supabaseAdmin.from('users').select('role, organization_id').eq('id', user.id).maybeSingle(),
      supabaseAdmin.from('superadmin_users').select('user_id').eq('user_id', user.id).maybeSingle(),
    ]);
    const isOrgAdmin = ['admin', 'superadmin'].includes(profile?.role ?? '') && profile?.organization_id === session.organization_id;
    if (!isOrgAdmin && !superadmin) return json({ success: false, error: 'Sem permissão para excluir esta sessão' }, 403);

    if (session.status === 'pending_payment') {
      return json({ success: false, error: 'Sessão com pagamento pendente não pode ser excluída' }, 409);
    }

    const apiUrl = Deno.env.get('HOOK7_API_URL') || 'https://api.hook7.com.br';
    const apiKey = Deno.env.get('HOOK7_API_KEY');
    if (!apiKey) return json({ success: false, error: 'Hook7 API not configured' }, 500);

    // instance: 'deleted' | 'not_found' | 'pending' | 'none' (sessão nunca configurada)
    let instanceResult: 'deleted' | 'not_found' | 'pending' | 'none' = 'none';
    const instanceName = session.api_session;

    if (instanceName) {
      try {
        const found = await fetch(`${apiUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`, {
          headers: { 'apikey': apiKey },
        });
        let exists = false;
        if (found.ok) {
          const body = await found.json().catch(() => []);
          const list: any[] = Array.isArray(body) ? body : [];
          exists = list.some((i) => (i?.name ?? i?.instance?.instanceName) === instanceName);
        } else if (found.status !== 404) {
          throw new Error(`fetchInstances ${found.status}`);
        }

        if (!exists) {
          instanceResult = 'not_found';
        } else {
          // Desconecta antes de apagar; se já estiver desconectada o logout falha e tudo bem
          await fetch(`${apiUrl}/instance/logout/${encodeURIComponent(instanceName)}`, {
            method: 'DELETE',
            headers: { 'apikey': apiKey },
          }).catch(() => null);
          const del = await fetch(`${apiUrl}/instance/delete/${encodeURIComponent(instanceName)}`, {
            method: 'DELETE',
            headers: { 'apikey': apiKey },
          });
          if (!del.ok && del.status !== 404) throw new Error(`delete ${del.status}: ${(await del.text()).slice(0, 200)}`);
          instanceResult = 'deleted';
        }
      } catch (err) {
        console.error(`[delete-session] Hook7 indisponível para ${instanceName}:`, err);
        instanceResult = 'pending';
      }
    }

    const { error: deleteError } = await supabaseAdmin.from('sessions').delete().eq('id', session.id);
    if (deleteError) throw deleteError;

    if (instanceName && instanceResult === 'deleted') {
      // O monitor também perceberia na próxima rodada; marcar aqui evita o alerta "instância removida"
      await supabaseAdmin
        .from('evolution_instances')
        .update({ state: 'removed', removed_at: new Date().toISOString() })
        .eq('instance_name', instanceName);
      await supabaseAdmin.from('instance_deletions').insert({
        instance_name: instanceName,
        reason: 'requested',
        dry_run: false,
        api_status: 200,
        api_response: `Excluída pelo app (sessão ${session.name})`,
      });
    }

    if (instanceName && instanceResult === 'pending') {
      const { data: inventoryRow } = await supabaseAdmin
        .from('evolution_instances')
        .select('instance_name')
        .eq('instance_name', instanceName)
        .maybeSingle();
      if (inventoryRow) {
        await supabaseAdmin
          .from('evolution_instances')
          .update({ delete_requested_at: new Date().toISOString() })
          .eq('instance_name', instanceName);
      } else {
        await supabaseAdmin.from('evolution_instances').insert({
          instance_name: instanceName,
          state: 'unknown',
          delete_requested_at: new Date().toISOString(),
        });
      }
    }

    return json({ success: true, instance: instanceResult });

  } catch (error: any) {
    console.error('[delete-session] Error:', error);
    return json({ success: false, error: error.message }, 500);
  }
});
