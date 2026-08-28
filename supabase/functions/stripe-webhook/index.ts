import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { Resend } from "https://esm.sh/resend@2.0.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    console.error('❌ Signature ausente');
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
    
    // Verificar assinatura do webhook (segurança)
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    
    console.log('🔔 Webhook recebido:', event.type, '| ID:', event.id);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Processar eventos relevantes
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionId = session.metadata?.session_id;
        const organizationId = session.metadata?.organization_id;

        if (!organizationId) {
          console.error('❌ organization_id ausente no checkout session');
          break;
        }

        // Validar se a sessão ainda existe, senão buscar a mais recente da org
        let finalSessionId = sessionId;
        
        if (sessionId) {
          const { data: sessionExists } = await supabaseAdmin
            .from('sessions')
            .select('id')
            .eq('id', sessionId)
            .maybeSingle();

          if (!sessionExists) {
            console.warn('⚠️ Sessão original não encontrada:', sessionId);
            
            // Buscar sessão mais recente da organização como fallback
            const { data: latestSession } = await supabaseAdmin
              .from('sessions')
              .select('id, name')
              .eq('organization_id', organizationId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
              
            if (latestSession) {
              finalSessionId = latestSession.id;
              console.log('✅ Usando sessão mais recente da org:', latestSession.name, '| ID:', finalSessionId);
            } else {
              console.error('❌ Nenhuma sessão encontrada para a organização:', organizationId);
              break;
            }
          }
        } else {
          // Se não tinha session_id nos metadados, buscar a mais recente
          const { data: latestSession } = await supabaseAdmin
            .from('sessions')
            .select('id, name')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (latestSession) {
            finalSessionId = latestSession.id;
            console.log('✅ Session_id não estava nos metadados. Usando sessão:', latestSession.name);
          } else {
            console.error('❌ Nenhuma sessão encontrada para a organização:', organizationId);
            break;
          }
        }

        console.log('✅ Pagamento aprovado para session:', finalSessionId);

        // Buscar subscription do Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Verificar se já existe subscription para esta sessão
        const { data: existingSub } = await supabaseAdmin
          .from('subscriptions')
          .select('id')
          .eq('session_id', finalSessionId)
          .eq('payment_provider', 'stripe')
          .maybeSingle();

        if (existingSub) {
          console.log('⚠️ Subscription já existe, atualizando...');
          await supabaseAdmin.from('subscriptions').update({
            status: 'active',
            stripe_subscription_id: stripeSubscription.id,
            stripe_customer_id: session.customer as string,
            start_date: stripeSubscription.current_period_start 
              ? new Date(stripeSubscription.current_period_start * 1000).toISOString()
              : null,
            next_payment_date: stripeSubscription.current_period_end 
              ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
              : null,
            payer_email: session.customer_details?.email,
          }).eq('id', existingSub.id);
        } else {
          // Criar novo registro
          await supabaseAdmin.from('subscriptions').insert({
            session_id: finalSessionId,
            organization_id: organizationId,
            status: 'active',
            amount: (stripeSubscription.items.data[0].price.unit_amount || 0) / 100,
            stripe_subscription_id: stripeSubscription.id,
            stripe_customer_id: session.customer as string,
            payment_provider: 'stripe',
            start_date: stripeSubscription.current_period_start 
              ? new Date(stripeSubscription.current_period_start * 1000).toISOString()
              : null,
            next_payment_date: stripeSubscription.current_period_end 
              ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
              : null,
            payer_email: session.customer_details?.email,
          });
        }

        // Atualizar session para ativa e liberar o limite de mensagens do trial
        await supabaseAdmin.from('sessions').update({
          status: 'connected',
          requires_subscription: false,
          message_limit: -1,
        }).eq('id', finalSessionId);

        console.log('✅ Assinatura ativada para sessão:', finalSessionId);

        // Enviar email de confirmação
        if (session.customer_details?.email) {
          try {
            const sessionName = session.metadata?.session_name || 'Sua sessão';
            const amount = (stripeSubscription.items.data[0].price.unit_amount || 0) / 100;
            
            await resend.emails.send({
              from: 'Hook7 <suporte@hook7.com.br>',
              to: [session.customer_details.email],
              subject: '✅ Assinatura Ativada com Sucesso - Hook7',
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                    .success-badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 20px; }
                    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                    .detail-label { color: #6b7280; font-weight: 500; }
                    .detail-value { color: #111827; font-weight: 600; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
                    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1 style="margin: 0; font-size: 28px;">🎉 Assinatura Ativada!</h1>
                    </div>
                    <div class="content">
                      <div class="success-badge">✓ Pagamento Confirmado</div>
                      
                      <p style="font-size: 16px; margin-bottom: 20px;">
                        Olá! Sua assinatura do Hook7 foi ativada com sucesso e sua sessão já está pronta para uso.
                      </p>
                      
                      <div class="card">
                        <h2 style="margin-top: 0; color: #111827; font-size: 20px;">📋 Detalhes da Assinatura</h2>
                        
                        <div class="detail-row">
                          <span class="detail-label">Sessão:</span>
                          <span class="detail-value">${sessionName}</span>
                        </div>
                        
                        <div class="detail-row">
                          <span class="detail-label">Plano:</span>
                          <span class="detail-value">API Session</span>
                        </div>
                        
                        <div class="detail-row">
                          <span class="detail-label">Valor:</span>
                          <span class="detail-value">R$ ${amount.toFixed(2)}/mês</span>
                        </div>
                        
                        <div class="detail-row" style="border: none;">
                          <span class="detail-label">Status:</span>
                          <span class="detail-value" style="color: #10b981;">● Ativa</span>
                        </div>
                      </div>
                      
                      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin: 20px 0;">
                        <p style="margin: 0; color: #1e40af;">
                          <strong>✨ Próximos Passos:</strong><br>
                          Sua sessão está conectada e pronta para uso. Acesse o painel para começar a enviar mensagens via API.
                        </p>
                      </div>
                      
                      <div style="text-align: center;">
                        <a href="https://app.hook7.com.br" class="button">
                          Acessar Painel
                        </a>
                      </div>
                      
                      <div class="footer">
                        <p>Sua próxima cobrança será em ${new Date(stripeSubscription.current_period_end * 1000).toLocaleDateString('pt-BR')}</p>
                        <p style="font-size: 12px; color: #9ca3af;">
                          Se precisar de ajuda, responda este email ou acesse nossa central de suporte.
                        </p>
                      </div>
                    </div>
                  </div>
                </body>
                </html>
              `,
            });
            
            console.log('📧 Email de confirmação enviado para:', session.customer_details.email);
          } catch (emailError) {
            console.error('❌ Erro ao enviar email:', emailError);
          }
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const newStatus = subscription.status === 'active' ? 'active' : 
                         subscription.status === 'past_due' ? 'past_due' :
                         subscription.status === 'canceled' ? 'cancelled' : 'pending';

        const updateData: any = {
          status: newStatus,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
        };

        // Atualizar datas de período
        if (subscription.current_period_end) {
          updateData.current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
          updateData.next_payment_date = new Date(subscription.current_period_end * 1000).toISOString();
        }

        await supabaseAdmin.from('subscriptions')
          .update(updateData)
          .eq('stripe_subscription_id', subscription.id);

        console.log('✅ Assinatura atualizada:', subscription.id, '| Novo status:', newStatus, 
                    '| Cancelamento agendado:', subscription.cancel_at_period_end);

        // Enviar email quando cancelamento é agendado
        if (subscription.cancel_at_period_end && subscription.status === 'active') {
          const { data: subData } = await supabaseAdmin
            .from('subscriptions')
            .select('session_id, payer_email, amount')
            .eq('stripe_subscription_id', subscription.id)
            .single();

          if (subData && (subData as any).payer_email) {
            try {
              const { data: sessionData } = await supabaseAdmin
                .from('sessions')
                .select('name')
                .eq('id', (subData as any).session_id)
                .maybeSingle();

              const sessionName = (sessionData as any)?.name || 'Sua sessão';
              const amount = (subData as any).amount || 69.90;
              const periodEndDate = new Date(subscription.current_period_end * 1000);
              
              await resend.emails.send({
                from: 'Hook7 <suporte@hook7.com.br>',
                to: [(subData as any).payer_email],
                subject: '⚠️ Cancelamento Agendado - Hook7',
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                      .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                      .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                      .warning-badge { display: inline-block; background: #f97316; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 20px; }
                      .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                      .detail-label { color: #6b7280; font-weight: 500; }
                      .detail-value { color: #111827; font-weight: 600; }
                      .highlight-date { background: #fef3c7; padding: 4px 8px; border-radius: 4px; color: #92400e; font-weight: 700; }
                      .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
                      .button-secondary { background: #f97316; }
                      .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1 style="margin: 0; font-size: 28px;">⚠️ Cancelamento Agendado</h1>
                      </div>
                      <div class="content">
                        <div class="warning-badge">📅 Sua sessão continua ativa</div>
                        
                        <p style="font-size: 16px; margin-bottom: 20px;">
                          Confirmamos o cancelamento da sua assinatura do Hook7. <strong>Mas não se preocupe!</strong> Você pode continuar usando normalmente até o fim do período que já foi pago.
                        </p>
                        
                        <div class="card" style="border-left: 4px solid #f97316;">
                          <h2 style="margin-top: 0; color: #111827; font-size: 20px;">📋 Detalhes</h2>
                          
                          <div class="detail-row">
                            <span class="detail-label">Sessão:</span>
                            <span class="detail-value">${sessionName}</span>
                          </div>
                          
                          <div class="detail-row">
                            <span class="detail-label">Valor Pago:</span>
                            <span class="detail-value">R$ ${amount.toFixed(2)}/mês</span>
                          </div>
                          
                          <div class="detail-row" style="border: none;">
                            <span class="detail-label">Sua sessão estará ativa até:</span>
                            <span class="detail-value">
                              <span class="highlight-date">${periodEndDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} às ${periodEndDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </span>
                          </div>
                        </div>
                        
                        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin: 20px 0;">
                          <p style="margin: 0; color: #1e40af;">
                            <strong>✨ Continue usando sem limitações!</strong><br>
                            Sua sessão permanece conectada e totalmente funcional até a data indicada acima. Você pode enviar mensagens via API normalmente.
                          </p>
                        </div>
                        
                        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px; margin: 20px 0;">
                          <p style="margin: 0; color: #991b1b;">
                            <strong>⚠️ O que acontece após essa data:</strong><br>
                            • Sua sessão será desconectada automaticamente<br>
                            • Você não poderá mais enviar mensagens via API<br>
                            • Seus dados permanecerão seguros no sistema
                          </p>
                        </div>
                        
                        <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; border-radius: 4px; margin: 20px 0;">
                          <p style="margin: 0; color: #166534;">
                            <strong>💡 Mudou de ideia?</strong><br>
                            Você pode reverter o cancelamento a qualquer momento clicando no botão abaixo. Sua assinatura continuará normalmente sem interrupção.
                          </p>
                        </div>
                        
                        <div style="text-align: center;">
                          <a href="https://app.hook7.com.br/subscriptions" class="button button-secondary">
                            ↩️ Reverter Cancelamento
                          </a>
                          <br>
                          <a href="https://app.hook7.com.br" class="button" style="margin-top: 10px;">
                            Acessar Painel
                          </a>
                        </div>
                        
                        <div class="footer">
                          <p>Nós entendemos que planos mudam. Se precisar reativar no futuro, será sempre bem-vindo de volta! 💙</p>
                          <p style="font-size: 12px; color: #9ca3af;">
                            Dúvidas? Responda este email ou acesse nossa central de suporte.
                          </p>
                        </div>
                      </div>
                    </div>
                  </body>
                  </html>
                `,
              });
              
              console.log('📧 Email de cancelamento agendado enviado para:', (subData as any).payer_email);
            } catch (emailError) {
              console.error('❌ Erro ao enviar email de cancelamento agendado:', emailError);
            }
          }
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Buscar dados da subscription antes de atualizar
        const { data: subData } = await supabaseAdmin
          .from('subscriptions')
          .select('session_id, payer_email, amount')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        await supabaseAdmin.from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        // Bloquear sessão e buscar dados
        if (subData) {
          const { data: sessionData } = await supabaseAdmin
            .from('sessions')
            .select('name, api_session, api_token')
            .eq('id', (subData as any).session_id)
            .single();

          // Desativar sessão na API WPP
          if (sessionData?.api_session && sessionData?.api_token) {
            console.log('🔒 Desativando sessão na API WPP:', sessionData.api_session);
            
            // PASSO 1: Fechar sessão (close-session)
            try {
              const closeResponse = await fetch(
                `https://api.hook7.com.br/api/${sessionData.api_session}/close-session`,
                {
                  method: 'POST',
                  headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${sessionData.api_token}`
                  },
                  body: ''
                }
              );
              const closeResult = await closeResponse.json();
              console.log('✅ Close session result:', closeResult);
            } catch (e) {
              console.error('⚠️ Erro ao fechar sessão (continuando):', e);
            }

            // PASSO 2: Excluir sessão (logout-session)
            try {
              const logoutResponse = await fetch(
                `https://api.hook7.com.br/api/${sessionData.api_session}/logout-session`,
                {
                  method: 'POST',
                  headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${sessionData.api_token}`
                  },
                  body: ''
                }
              );
              const logoutResult = await logoutResponse.json();
              console.log('✅ Logout session result:', logoutResult);
            } catch (e) {
              console.error('⚠️ Erro ao fazer logout (continuando):', e);
            }
          }

          // Atualizar sessão no banco E limpar tokens (segurança)
          await supabaseAdmin.from('sessions').update({
            status: 'disconnected',
            requires_subscription: true,
            api_token: null,       // Limpar token
            api_token_full: null,  // Limpar token completo
            qr: null,              // Limpar QR code
          }).eq('id', (subData as any).session_id);
          
          console.log('🔒 Sessão bloqueada:', (subData as any).session_id);

          // Enviar email de notificação de cancelamento
          if ((subData as any).payer_email) {
            try {
              const sessionName = (sessionData as any)?.name || 'Sua sessão';
              const amount = (subData as any).amount || 0;
              
              await resend.emails.send({
                from: 'Hook7 <suporte@hook7.com.br>',
                to: [(subData as any).payer_email],
                subject: '⚠️ Assinatura Cancelada - Hook7',
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                      .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                      .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                      .warning-badge { display: inline-block; background: #dc2626; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 20px; }
                      .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                      .detail-label { color: #6b7280; font-weight: 500; }
                      .detail-value { color: #111827; font-weight: 600; }
                      .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
                      .button-secondary { background: #6b7280; }
                      .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1 style="margin: 0; font-size: 28px;">⚠️ Assinatura Cancelada</h1>
                      </div>
                      <div class="content">
                        <div class="warning-badge">⊗ Sessão Desconectada</div>
                        
                        <p style="font-size: 16px; margin-bottom: 20px;">
                          Sua assinatura do Hook7 foi cancelada e sua sessão foi desconectada automaticamente.
                        </p>
                        
                        <div class="card">
                          <h2 style="margin-top: 0; color: #111827; font-size: 20px;">📋 Detalhes do Cancelamento</h2>
                          
                          <div class="detail-row">
                            <span class="detail-label">Sessão:</span>
                            <span class="detail-value">${sessionName}</span>
                          </div>
                          
                          <div class="detail-row">
                            <span class="detail-label">Plano:</span>
                            <span class="detail-value">API Session</span>
                          </div>
                          
                          <div class="detail-row">
                            <span class="detail-label">Valor:</span>
                            <span class="detail-value">R$ ${amount.toFixed(2)}/mês</span>
                          </div>
                          
                          <div class="detail-row" style="border: none;">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value" style="color: #dc2626;">● Cancelada</span>
                          </div>
                        </div>
                        
                        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px; margin: 20px 0;">
                          <p style="margin: 0; color: #991b1b;">
                            <strong>⚠️ O que acontece agora:</strong><br>
                            • Sua sessão foi desconectada do WhatsApp<br>
                            • Você não poderá mais enviar mensagens via API<br>
                            • Seus dados permanecem seguros e podem ser restaurados
                          </p>
                        </div>
                        
                        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin: 20px 0;">
                          <p style="margin: 0; color: #1e40af;">
                            <strong>💡 Quer continuar usando?</strong><br>
                            Você pode reativar sua sessão a qualquer momento. Basta criar uma nova assinatura e sua sessão será reconectada automaticamente.
                          </p>
                        </div>
                        
                        <div style="text-align: center;">
                          <a href="https://app.hook7.com.br/subscriptions" class="button">
                            Reativar Assinatura
                          </a>
                          <br>
                          <a href="https://app.hook7.com.br" class="button button-secondary" style="margin-top: 10px;">
                            Acessar Painel
                          </a>
                        </div>
                        
                        <div class="footer">
                          <p>Se o cancelamento foi um erro, você pode reativar sua assinatura imediatamente.</p>
                          <p style="font-size: 12px; color: #9ca3af;">
                            Tem dúvidas? Responda este email ou acesse nossa central de suporte.
                          </p>
                        </div>
                      </div>
                    </div>
                  </body>
                  </html>
                `,
              });
              
              console.log('📧 Email de cancelamento enviado para:', (subData as any).payer_email);
            } catch (emailError) {
              console.error('❌ Erro ao enviar email de cancelamento:', emailError);
            }
          }
        }

        console.log('❌ Assinatura cancelada:', subscription.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        await supabaseAdmin.from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', invoice.subscription as string);

        console.log('⚠️ Pagamento falhou para subscription:', invoice.subscription);

        // Buscar dados da subscription para enviar email
        const { data: failedSubData } = await supabaseAdmin
          .from('subscriptions')
          .select('session_id, payer_email, amount')
          .eq('stripe_subscription_id', invoice.subscription as string)
          .single();

        // Buscar dados da sessão (usado tanto para email quanto WhatsApp)
        let failedSessionData: any = null;
        if (failedSubData && (failedSubData as any).session_id) {
          const { data } = await supabaseAdmin
            .from('sessions')
            .select('name, notification_phone')
            .eq('id', (failedSubData as any).session_id)
            .maybeSingle();
          failedSessionData = data;
        }

        const failedSessionName = failedSessionData?.name || 'Sua sessão';
        const failedAmount = (failedSubData as any)?.amount || 0;
        const failureReason = (invoice as any).last_finalization_error?.message || 
                              'Cartão recusado ou saldo insuficiente';

        // Enviar email de notificação
        if (failedSubData && (failedSubData as any).payer_email) {
          try {
            await resend.emails.send({
              from: 'Hook7 <suporte@hook7.com.br>',
              to: [(failedSubData as any).payer_email],
              subject: '⚠️ Problema com seu Pagamento - Hook7',
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                    .error-badge { display: inline-block; background: #ef4444; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 20px; }
                    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                    .detail-label { color: #6b7280; font-weight: 500; }
                    .detail-value { color: #111827; font-weight: 600; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
                    .button-danger { background: #ef4444; }
                    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1 style="margin: 0; font-size: 28px;">⚠️ Problema com seu Pagamento</h1>
                    </div>
                    <div class="content">
                      <div class="error-badge">✕ Pagamento Não Processado</div>
                      
                      <p style="font-size: 16px; margin-bottom: 20px;">
                        Não conseguimos processar o pagamento da sua assinatura do Hook7. Atualize seu método de pagamento para evitar a desconexão da sessão.
                      </p>
                      
                      <div class="card" style="border-left: 4px solid #ef4444;">
                        <h2 style="margin-top: 0; color: #111827; font-size: 20px;">📋 Detalhes</h2>
                        
                        <div class="detail-row">
                          <span class="detail-label">Sessão:</span>
                          <span class="detail-value">${failedSessionName}</span>
                        </div>
                        
                        <div class="detail-row">
                          <span class="detail-label">Valor:</span>
                          <span class="detail-value">R$ ${failedAmount.toFixed(2)}/mês</span>
                        </div>
                        
                        <div class="detail-row">
                          <span class="detail-label">Motivo:</span>
                          <span class="detail-value" style="color: #ef4444;">${failureReason}</span>
                        </div>
                        
                        <div class="detail-row" style="border: none;">
                          <span class="detail-label">Status:</span>
                          <span class="detail-value" style="color: #f97316;">● Pagamento Pendente</span>
                        </div>
                      </div>
                      
                      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px; margin: 20px 0;">
                        <p style="margin: 0; color: #991b1b;">
                          <strong>🔔 O que fazer agora:</strong><br>
                          1. Acesse a página de Assinaturas no painel<br>
                          2. Clique em "Atualizar Pagamento"<br>
                          3. Atualize seu cartão de crédito no portal do Stripe<br>
                          4. O pagamento será processado automaticamente
                        </p>
                      </div>
                      
                      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0;">
                        <p style="margin: 0; color: #92400e;">
                          <strong>⏰ Importante:</strong><br>
                          Se o pagamento não for regularizado, sua sessão poderá ser desconectada automaticamente. Atualize seu método de pagamento o mais rápido possível.
                        </p>
                      </div>
                      
                      <div style="text-align: center;">
                        <a href="https://app.hook7.com.br/subscriptions" class="button button-danger">
                          Atualizar Método de Pagamento
                        </a>
                        <br>
                        <a href="https://app.hook7.com.br" class="button" style="margin-top: 10px;">
                          Acessar Painel
                        </a>
                      </div>
                      
                      <div class="footer">
                        <p>Se você já atualizou seu método de pagamento, desconsidere este email.</p>
                        <p style="font-size: 12px; color: #9ca3af;">
                          Dúvidas? Responda este email ou acesse nossa central de suporte.
                        </p>
                      </div>
                    </div>
                  </div>
                </body>
                </html>
              `,
            });
            
            console.log('📧 Email de pagamento falho enviado para:', (failedSubData as any).payer_email);
          } catch (emailError) {
            console.error('❌ Erro ao enviar email de pagamento falho:', emailError);
          }
        }

        // Enviar notificação via WhatsApp
        const notificationPhone = failedSessionData?.notification_phone;
        if (notificationPhone) {
          try {
            const hook7Token = Deno.env.get('HOOK7_WHATSAPP_TOKEN');
            const hook7ApiUrl = Deno.env.get('HOOK7_API_URL') || 'https://api.hook7.com.br';
            // No Evolution API o nome da instância vai na URL
            const hook7Instance = Deno.env.get('HOOK7_WHATSAPP_INSTANCE');

            if (!hook7Instance || !hook7Token) {
              throw new Error('HOOK7_WHATSAPP_INSTANCE/HOOK7_WHATSAPP_TOKEN não configurados');
            }

            const whatsappMessage = 
              `⚠️ *Problema com seu Pagamento - Hook7*\n\n` +
              `Não conseguimos processar o pagamento da sua assinatura.\n\n` +
              `📋 *Detalhes:*\n` +
              `• Sessão: ${failedSessionName}\n` +
              `• Valor: R$ ${failedAmount.toFixed(2)}/mês\n` +
              `• Motivo: ${failureReason}\n\n` +
              `🔔 *O que fazer:*\n` +
              `1. Acesse o painel em hook7.com.br\n` +
              `2. Vá em Assinaturas\n` +
              `3. Clique em "Atualizar Pagamento"\n\n` +
              `⏰ Regularize para evitar a desconexão da sua sessão.`;

            await fetch(`${hook7ApiUrl}/message/sendText/${encodeURIComponent(hook7Instance)}`, {
              method: 'POST',
              headers: {
                'apikey': hook7Token,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                number: notificationPhone,
                text: whatsappMessage
              })
            });

            console.log('📱 WhatsApp de pagamento falho enviado para:', notificationPhone);
          } catch (whatsappError) {
            console.error('⚠️ Erro ao enviar WhatsApp de pagamento falho:', whatsappError);
          }
        }

        break;
      }

      default:
        console.log('ℹ️ Evento não processado:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Erro no webhook:', error.message);
    return new Response(error.message, { status: 400 });
  }
});
