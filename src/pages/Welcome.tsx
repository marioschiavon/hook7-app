import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { Loader2 } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [initialStep, setInitialStep] = useState(0);
  const [existingOrgId, setExistingOrgId] = useState<string | null>(null);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      // Verificar se usuário já tem organização
      const { data: userRecord } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();

      if (userRecord?.organization_id) {
        setExistingOrgId(userRecord.organization_id);
        
        // Verificar se já tem sessões
        const { count } = await supabase
          .from("sessions")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", userRecord.organization_id);

        if (count && count > 0) {
          // Já tem tudo configurado, vai pro dashboard
          navigate("/dashboard");
          return;
        }
        
        // Tem org mas não tem sessão, começa no passo 2
        setInitialStep(1);
      }

      // Verificar parâmetro de step na URL
      const stepParam = searchParams.get("step");
      if (stepParam === "2" && userRecord?.organization_id) {
        setInitialStep(1);
      }

      setLoading(false);
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Bem-vindo | Configure sua API WhatsApp - Hook7"
        description="Configure sua primeira sessão WhatsApp API em 3 passos simples. Organização, sessão e pagamento."
        noindex
      />
      <div className="min-h-screen bg-background">
        
        <OnboardingWizard 
          initialStep={initialStep}
          existingOrgId={existingOrgId}
        />
      </div>
    </>
  );
}

