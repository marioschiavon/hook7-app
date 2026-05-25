import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_REMINDERS_PER_TYPE = 5;
const DAYS_BETWEEN_REMINDERS = 2;
const DAYS_BEFORE_FIRST_REMINDER = 2;

interface UserToRemind {
  id: string;
  email: string;
  reminder_count: number;
}

function generateUnsubscribeToken(userId: string): string {
  // Simple base64 encoding of user ID - in production you might want something more secure
  return btoa(userId);
}

function getNoSubscriptionEmailHtml(unsubscribeToken: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">👋 Olá! Sentimos sua falta</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Você criou sua conta no <strong>Hook7</strong>, mas ainda não ativou sua assinatura.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Complete o processo para começar a usar nossa API de WhatsApp e automatizar suas mensagens!
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://hook7.com.br/dashboard" 
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 14px 28px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: bold;
                display: inline-block;">
        Continuar Cadastro →
      </a>
    </div>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 14px; color: #6b7280;">
        <strong>O que você ganha:</strong>
      </p>
      <ul style="font-size: 14px; color: #6b7280; padding-left: 20px;">
        <li>API simples para enviar mensagens WhatsApp</li>
        <li>Integração em minutos</li>
        <li>Suporte técnico</li>
      </ul>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px;">
    <p style="font-size: 12px; color: #9ca3af;">
      Você está recebendo este email porque criou uma conta no Hook7.
    </p>
    <a href="https://hook7.com.br/unsubscribe?token=${unsubscribeToken}" 
       style="font-size: 12px; color: #9ca3af;">
      Cancelar inscrição
    </a>
  </div>
</body>
</html>
  `;
}

function getNoSessionEmailHtml(unsubscribeToken: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📱 Falta pouco! Conecte seu WhatsApp</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>Ótima notícia!</strong> Sua assinatura está ativa no Hook7.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Agora só falta conectar seu número de WhatsApp para começar a usar a API.
    </p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="font-size: 14px; font-weight: bold; margin-bottom: 15px;">Como conectar:</p>
      <ol style="font-size: 14px; color: #4b5563; padding-left: 20px; margin: 0;">
        <li style="margin-bottom: 8px;">Acesse suas Sessões</li>
        <li style="margin-bottom: 8px;">Clique em "Iniciar Sessão"</li>
        <li style="margin-bottom: 8px;">Escaneie o QR Code com seu WhatsApp</li>
        <li>Pronto! Comece a usar a API</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://hook7.com.br/sessions" 
         style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                color: white; 
                padding: 14px 28px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: bold;
                display: inline-block;">
        Conectar Agora →
      </a>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px;">
    <p style="font-size: 12px; color: #9ca3af;">
      Você está recebendo este email porque tem uma assinatura ativa no Hook7.
    </p>
    <a href="https://hook7.com.br/unsubscribe?token=${unsubscribeToken}" 
       style="font-size: 12px; color: #9ca3af;">
      Cancelar inscrição
    </a>
  </div>
</body>
</html>
  `;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting onboarding reminders job...");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - DAYS_BEFORE_FIRST_REMINDER);

    // Get users without subscription (organization_id is null or subscription inactive)
    // who haven't unsubscribed and haven't received max reminders
    const { data: usersWithoutSub, error: noSubError } = await supabase
      .from("users")
      .select(`
        id,
        email,
        created_at,
        organization_id,
        unsubscribed_from_reminders,
        role
      `)
      .eq("unsubscribed_from_reminders", false)
      .neq("role", "superadmin")
      .lt("created_at", twoDaysAgo.toISOString());

    if (noSubError) {
      console.error("Error fetching users without subscription:", noSubError);
      throw noSubError;
    }

    console.log(`Found ${usersWithoutSub?.length || 0} potential users to check`);

    const emailsSent: { type: string; email: string; userId: string }[] = [];

    // Process users without subscription
    for (const user of usersWithoutSub || []) {
      if (!user.email) continue;

      // Check if user has active subscriptions (new model: subscriptions linked to sessions)
      let hasActiveSubscription = false;
      let hasConnectedSession = false;

      if (user.organization_id) {
        // Check for active subscriptions in the subscriptions table
        const { data: activeSubscriptions } = await supabase
          .from("subscriptions")
          .select("id, session_id, status")
          .eq("organization_id", user.organization_id)
          .eq("status", "active");

        hasActiveSubscription = (activeSubscriptions?.length || 0) > 0;

        if (hasActiveSubscription) {
          // Check for sessions with api_token (configured and potentially connected)
          const { data: connectedSessions } = await supabase
            .from("sessions")
            .select("id, status, api_token")
            .eq("organization_id", user.organization_id)
            .not("api_token", "is", null);

          hasConnectedSession = (connectedSessions?.length || 0) > 0;
        }
      }

      // Determine reminder type
      let reminderType: string | null = null;

      if (!hasActiveSubscription) {
        reminderType = "no_subscription";
      } else if (!hasConnectedSession) {
        reminderType = "no_session_connected";
      }

      if (!reminderType) continue;

      // Check reminder count and last sent date
      const { data: reminders } = await supabase
        .from("onboarding_reminders")
        .select("sent_at")
        .eq("user_id", user.id)
        .eq("reminder_type", reminderType)
        .order("sent_at", { ascending: false });

      const reminderCount = reminders?.length || 0;

      // Skip if max reminders reached
      if (reminderCount >= MAX_REMINDERS_PER_TYPE) {
        console.log(`User ${user.email} has reached max reminders for ${reminderType}`);
        continue;
      }

      // Check if last reminder was sent within the interval
      if (reminders && reminders.length > 0) {
        const lastSent = new Date(reminders[0].sent_at);
        const daysSinceLastReminder = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceLastReminder < DAYS_BETWEEN_REMINDERS) {
          console.log(`User ${user.email} was reminded ${daysSinceLastReminder.toFixed(1)} days ago, skipping`);
          continue;
        }
      }

      // Send email
      const unsubscribeToken = generateUnsubscribeToken(user.id);
      const emailHtml = reminderType === "no_subscription"
        ? getNoSubscriptionEmailHtml(unsubscribeToken)
        : getNoSessionEmailHtml(unsubscribeToken);

      const subject = reminderType === "no_subscription"
        ? "👋 Complete sua assinatura no Hook7"
        : "📱 Falta pouco! Conecte seu WhatsApp";

      try {
        const emailResponse = await resend.emails.send({
          from: "Hook7 <noreply@hook7.com.br>",
          to: [user.email],
          subject: subject,
          html: emailHtml,
        });

        console.log(`Email sent to ${user.email}:`, emailResponse);

        // Record the reminder
        const { error: insertError } = await supabase
          .from("onboarding_reminders")
          .insert({
            user_id: user.id,
            reminder_type: reminderType,
            email_sent_to: user.email,
          });

        if (insertError) {
          console.error(`Error recording reminder for ${user.email}:`, insertError);
        } else {
          emailsSent.push({ type: reminderType, email: user.email, userId: user.id });
        }
      } catch (emailError) {
        console.error(`Error sending email to ${user.email}:`, emailError);
      }
    }

    console.log(`Job completed. Emails sent: ${emailsSent.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: emailsSent.length,
        details: emailsSent,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-onboarding-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
