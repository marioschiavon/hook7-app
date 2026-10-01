import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

// Quando o cliente exclui uma sessão, a assinatura dela continua ativa no Stripe e fica
// "órfã" (session_id nulo ou apontando para uma sessão que não existe mais). Esta função
// vincula essa assinatura à sessão que o cliente está criando, em vez de cobrar de novo.
// Retorna { claimed: false } quando não há assinatura livre — aí o fluxo segue para o checkout.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const { session_name } = await req.json();
    if (!session_name || typeof session_name !== 'string') throw new Error('session_name is required');
    if (!/^[a-zA-Z0-9_-]{3,50}$/.test(session_name)) throw new Error('Invalid session name format');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users').select('organization_id').eq('id', user.id).single();
    const organizationId = userData?.organization_id;
    if (!organizationId) throw new Error('User organization not found');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ── 1. Procurar assinatura ativa sem sessão viva ───────────────────────────
    const { data: activeSubs, error: subsError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, session_id, stripe_subscription_id')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('next_payment_date', { ascending: false, nullsFirst: false });
    if (subsError) throw new Error('Erro ao buscar assinaturas');
    if (!activeSubs?.length) return json({ success: true, claimed: false });

    const linkedIds = activeSubs.map((s) => s.session_id).filter(Boolean) as string[];
    const { data: aliveSessions } = linkedIds.length
      ? await supabaseAdmin.from('sessions').select('id').in('id', linkedIds)
      : { data: [] as { id: string }[] };
    const alive = new Set((aliveSessions ?? []).map((s) => s.id));

    const orphan = activeSubs.find((s) => !s.session_id || !alive.has(s.session_id));
    if (!orphan) return json({ success: true, claimed: false });

    console.log(`[claim] Assinatura órfã ${orphan.id} encontrada para org ${organizationId}`);

    // ── 2. Garantir o registro da sessão (ainda bloqueada) ────────────────────
    const { data: existingSession } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('name', session_name)
      .maybeSingle();

    let sessionId = existingSession?.id as string | undefined;
    if (!sessionId) {
      const { data: created, error: insertError } = await supabaseAdmin
        .from('sessions')
        .insert({
          organization_id: organizationId,
          name: session_name,
          requires_subscription: true,
          status: 'pending_payment',
        })
        .select('id')
        .single();
      if (insertError || !created) throw new Error('Erro ao criar sessão');
      sessionId = created.id;
    }

    // ── 3. Vincular a assinatura (só se ninguém vinculou antes) ───────────────
    let claimQuery = supabaseAdmin
      .from('subscriptions')
      .update({ session_id: sessionId, updated_at: new Date().toISOString() })
      .eq('id', orphan.id);
    claimQuery = orphan.session_id
      ? claimQuery.eq('session_id', orphan.session_id)
      : claimQuery.is('session_id', null);
    const { data: claimedRows, error: claimError } = await claimQuery.select('id');
    if (claimError) throw new Error('Erro ao vincular assinatura');
    if (!claimedRows?.length) return json({ success: true, claimed: false });

    // ── 4. Liberar a sessão (mesmos campos do stripe-webhook) ─────────────────
    const { error: releaseError } = await supabaseAdmin
      .from('sessions')
      .update({ requires_subscription: false, message_limit: -1, status: 'configured' })
      .eq('id', sessionId);
    if (releaseError) throw new Error('Erro ao liberar sessão');

    // ── 5. Manter o metadata do Stripe coerente (não crítico) ─────────────────
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (orphan.stripe_subscription_id && stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });
        await stripe.subscriptions.update(orphan.stripe_subscription_id, {
          metadata: { session_id: sessionId, session_name },
        });
      } catch (stripeError) {
        console.warn('[claim] Não foi possível atualizar o metadata no Stripe:', stripeError);
      }
    }

    console.log(`[claim] Assinatura ${orphan.id} vinculada à sessão ${sessionId}`);
    return json({ success: true, claimed: true, session_id: sessionId });
  } catch (error: any) {
    console.error('[claim] Error:', error);
    return json({ success: false, error: error.message }, 400);
  }
});
