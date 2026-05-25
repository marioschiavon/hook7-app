import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const testEmail = "contato@upevolution.com.br";
    const results = [];

    console.log("🚀 Iniciando envio de emails de teste para:", testEmail);

    // 1. Email de Assinatura Ativada (Stripe)
    try {
      console.log("📧 Enviando email 1/3: Assinatura Ativada...");
      const result1 = await resend.emails.send({
        from: 'Hook7 <suporte@hook7.com.br>',
        to: [testEmail],
        subject: '✅ [TESTE] Assinatura Ativada com Sucesso - Hook7',
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
              .test-badge { background: #fbbf24; color: #78350f; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <span class="test-badge">🧪 EMAIL DE TESTE</span>
                <h1 style="margin: 10px 0 0 0; font-size: 28px;">🎉 Assinatura Ativada!</h1>
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
                    <span class="detail-value">Sessão Teste</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="detail-label">Plano:</span>
                    <span class="detail-value">API Session</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="detail-label">Valor:</span>
                    <span class="detail-value">R$ 69,90/mês</span>
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
                
                <div class="footer">
                  <p>Este é um email de teste do sistema Hook7</p>
                  <p style="font-size: 12px; color: #9ca3af;">
                    Enviado em ${new Date().toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      results.push({ type: "Assinatura Ativada", status: "success" });
      console.log("✅ Email 1/3 enviado com sucesso");
    } catch (error: any) {
      results.push({ type: "Assinatura Ativada", status: "error", error: error.message });
      console.error("❌ Erro no email 1/3:", error.message);
    }

    // 2. Email de Cancelamento Agendado
    try {
      console.log("📧 Enviando email 2/3: Cancelamento Agendado...");
      const result2 = await resend.emails.send({
        from: 'Hook7 <suporte@hook7.com.br>',
        to: [testEmail],
        subject: '⚠️ [TESTE] Cancelamento Agendado - Hook7',
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
              .test-badge { background: #fbbf24; color: #78350f; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <span class="test-badge">🧪 EMAIL DE TESTE</span>
                <h1 style="margin: 10px 0 0 0; font-size: 28px;">⚠️ Cancelamento Agendado</h1>
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
                    <span class="detail-value">Sessão Teste</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="detail-label">Valor Pago:</span>
                    <span class="detail-value">R$ 69,90/mês</span>
                  </div>
                  
                  <div class="detail-row" style="border: none;">
                    <span class="detail-label">Sua sessão estará ativa até:</span>
                    <span class="detail-value">
                      <span class="highlight-date">${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    </span>
                  </div>
                </div>
                
                <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin: 20px 0;">
                  <p style="margin: 0; color: #1e40af;">
                    <strong>✨ Continue usando sem limitações!</strong><br>
                    Sua sessão permanece conectada e totalmente funcional até a data indicada acima.
                  </p>
                </div>
                
                <div class="footer">
                  <p>Este é um email de teste do sistema Hook7</p>
                  <p style="font-size: 12px; color: #9ca3af;">
                    Enviado em ${new Date().toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      results.push({ type: "Cancelamento Agendado", status: "success" });
      console.log("✅ Email 2/3 enviado com sucesso");
    } catch (error: any) {
      results.push({ type: "Cancelamento Agendado", status: "error", error: error.message });
      console.error("❌ Erro no email 2/3:", error.message);
    }

    // 3. Email de Anúncio/Aviso
    try {
      console.log("📧 Enviando email 3/3: Anúncio...");
      const result3 = await resend.emails.send({
        from: "Hook7 <avisos@hook7.com.br>",
        to: [testEmail],
        subject: "📢 [TESTE] Anúncio do Sistema - Hook7",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #fbbf24; color: #78350f; padding: 8px; text-align: center; border-radius: 4px; margin-bottom: 20px; font-weight: 600;">
              🧪 EMAIL DE TESTE
            </div>
            <h1 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
              📢 Anúncio Importante do Sistema
            </h1>
            <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <p style="color: #333; line-height: 1.6; margin: 0;">
                Este é um exemplo de anúncio enviado pelo sistema Hook7.<br><br>
                
                <strong>Funcionalidades testadas:</strong><br>
                • Envio de emails de assinatura (suporte@hook7.com.br)<br>
                • Envio de emails de avisos (avisos@hook7.com.br)<br>
                • Templates HTML responsivos<br>
                • Integração com Resend usando novo domínio
              </p>
            </div>
            <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="color: #333; line-height: 1.6; margin: 0;">
                <strong>✅ Teste Concluído com Sucesso!</strong><br>
                Se você está vendo este email, significa que a configuração do domínio hook7.com.br no Resend está funcionando corretamente.
              </p>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              Este é um anúncio automático do sistema Hook7.<br>
              Enviado em ${new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        `,
      });
      results.push({ type: "Anúncio", status: "success" });
      console.log("✅ Email 3/3 enviado com sucesso");
    } catch (error: any) {
      results.push({ type: "Anúncio", status: "error", error: error.message });
      console.error("❌ Erro no email 3/3:", error.message);
    }

    const successCount = results.filter(r => r.status === "success").length;
    const failCount = results.filter(r => r.status === "error").length;

    console.log(`\n✅ Teste concluído: ${successCount}/3 emails enviados com sucesso`);

    return new Response(
      JSON.stringify({
        message: `Teste de emails concluído: ${successCount} sucesso, ${failCount} falhas`,
        recipient: testEmail,
        results: results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Erro na função test-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
