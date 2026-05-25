import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Iniciando criação de checkout Stripe');

    // 1. Autenticar usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header não encontrado');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    console.log('✅ Usuário autenticado:', user.id);

    // 2. Buscar dados da sessão
    const { session_id } = await req.json();
    if (!session_id) {
      throw new Error('session_id não fornecido');
    }

    const { data: sessionData, error: sessionError } = await supabaseClient
      .from('sessions')
      .select('id, name, organization_id')
      .eq('id', session_id)
      .single();

    if (sessionError || !sessionData) {
      console.error('Erro ao buscar sessão:', sessionError);
      throw new Error('Sessão não encontrada');
    }

    console.log('✅ Sessão encontrada:', sessionData.name);

    // 3. Buscar email do usuário
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('email, organization_id')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData) {
      throw new Error('Dados do usuário não encontrados');
    }

    // Verificar permissão
    if (userData.organization_id !== sessionData.organization_id) {
      throw new Error('Usuário não tem permissão para criar assinatura desta sessão');
    }

    console.log('✅ Usuário autorizado. Email:', userData.email);

    // 4. Inicializar Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // 5. Criar ou obter customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: userData.email,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      console.log('✅ Customer existente encontrado:', customer.id);
    } else {
      customer = await stripe.customers.create({
        email: userData.email,
        metadata: {
          supabase_user_id: user.id,
          organization_id: sessionData.organization_id,
        }
      });
      console.log('✅ Novo customer criado:', customer.id);
    }

    // 6. Criar Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [
        {
          price: 'price_1SVWEfQs5BDRSUmXT5cPQTuh',
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      subscription_data: {
        description: `Hook7 - Sessão ${sessionData.name}`,
        metadata: {
          session_id: session_id,
          session_name: sessionData.name,
          organization_id: sessionData.organization_id,
        }
      },
      metadata: {
        session_id: session_id,
        session_name: sessionData.name,
        organization_id: sessionData.organization_id,
      },
      success_url: `${req.headers.get('origin') || 'https://hook7.com.br'}/dashboard?payment=success`,
      cancel_url: `${req.headers.get('origin') || 'https://hook7.com.br'}/checkout?session_name=${sessionData.name}&payment=cancelled`,
      locale: 'pt-BR',
      billing_address_collection: 'auto',
    });

    console.log('✅ Checkout session criada:', checkoutSession.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: checkoutSession.url,
        checkout_session_id: checkoutSession.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
