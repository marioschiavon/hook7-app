import { supabase } from "@/integrations/supabase/client";

// Excluir uma sessão não cancela a assinatura dela no Stripe. Antes de mandar o cliente
// para o checkout, tentamos vincular essa assinatura ativa à nova sessão
// (Edge Function claim-orphan-subscription). Em caso de erro, segue o fluxo normal.
export async function claimOrphanSubscription(sessionName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("claim-orphan-subscription", {
      body: { session_name: sessionName },
    });
    if (error || !data?.success) return false;
    return data.claimed === true;
  } catch {
    return false;
  }
}

/** Cria a instância no Evolution API e grava o token na sessão. */
export async function provisionSession(sessionName: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("hook7-generate-session", {
    body: { session_name: sessionName },
  });
  if (error) throw error;
  if (!data?.success || !data.session_id) throw new Error(data?.error || "Erro ao configurar sessão");
}
