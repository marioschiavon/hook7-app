import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para delay entre envios (rate limiting - 1 email por segundo)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface SendAnnouncementRequest {
  announcementId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Não autorizado");
    }

    // Verificar se é superadmin
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userError || userData?.role !== "superadmin") {
      throw new Error("Apenas superadmins podem enviar anúncios");
    }

    const { announcementId }: SendAnnouncementRequest = await req.json();

    // Buscar o anúncio
    const { data: announcement, error: announcementError } = await supabase
      .from("announcements")
      .select("*")
      .eq("id", announcementId)
      .single();

    if (announcementError || !announcement) {
      throw new Error("Anúncio não encontrado");
    }

    if (!announcement.send_email) {
      return new Response(
        JSON.stringify({ message: "Este anúncio não está configurado para envio de email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Buscar usuários conforme configuração do anúncio
    let targetEmails: string[] = [];

    if (announcement.recipient_type === 'specific' && announcement.recipient_emails) {
      // Emails específicos - limpar e validar
      targetEmails = announcement.recipient_emails
        .split(',')
        .map((email: string) => email.trim())
        .filter((email: string) => email.includes('@'));
        
      console.log(`📧 Enviando para ${targetEmails.length} emails específicos`);
    } else {
      // Todos os usuários
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("email")
        .not("email", "is", null);

      if (usersError || !users) {
        throw new Error("Erro ao buscar usuários");
      }
      
      targetEmails = users.map((u: any) => u.email);
      console.log(`📧 Enviando para ${targetEmails.length} usuários (todos)`);
    }

    if (targetEmails.length === 0) {
      throw new Error("Nenhum destinatário encontrado");
    }

    console.log(`🚀 Iniciando envio sequencial (1 email/segundo)`);

    const results = [];
    const DELAY_MS = 1000; // 1 segundo entre cada envio

    for (let i = 0; i < targetEmails.length; i++) {
      const email = targetEmails[i];
      
      try {
        console.log(`📧 [${i + 1}/${targetEmails.length}] Enviando para: ${email}`);
        
        const emailResponse = await resend.emails.send({
          from: "Hook7 <avisos@hook7.com.br>",
          to: [email],
          subject: announcement.email_subject || announcement.title,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
                ${announcement.title}
              </h1>
              <div style="background-color: ${
                announcement.type === 'error' ? '#fff5f5' :
                announcement.type === 'warning' ? '#fffaf0' :
                announcement.type === 'success' ? '#f0fdf4' :
                '#eff6ff'
              }; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${
                announcement.type === 'error' ? '#ef4444' :
                announcement.type === 'warning' ? '#f59e0b' :
                announcement.type === 'success' ? '#10b981' :
                '#3b82f6'
              };">
                <p style="color: #333; line-height: 1.6; margin: 0;">
                  ${announcement.message.replace(/\n/g, '<br>')}
                </p>
              </div>
              <p style="color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                Este é um anúncio automático do sistema Hook7.<br>
                Enviado em ${new Date().toLocaleString('pt-BR')}
              </p>
            </div>
          `,
        });

        // Log de sucesso
        await supabase.from("announcement_email_logs").insert({
          announcement_id: announcementId,
          user_email: email,
          status: "sent",
        });

        console.log(`✅ Enviado com sucesso: ${email}`);
        results.push({ email, success: true });

      } catch (error: any) {
        console.error(`❌ Erro ao enviar para ${email}:`, error.message);
        
        // Log de erro
        await supabase.from("announcement_email_logs").insert({
          announcement_id: announcementId,
          user_email: email,
          status: "failed",
          error_message: error.message,
        });

        results.push({ email, success: false, error: error.message });
      }

      // Aguardar 1 segundo antes do próximo (exceto no último)
      if (i < targetEmails.length - 1) {
        await delay(DELAY_MS);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        message: `Emails enviados: ${successCount} sucesso, ${failCount} falhas`,
        total: targetEmails.length,
        success: successCount,
        failed: failCount,
        results: results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Erro na função send-announcement-email:", error);
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
