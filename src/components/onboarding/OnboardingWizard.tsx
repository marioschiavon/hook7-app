import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StepIndicator } from "./StepIndicator";
import { OrganizationStep } from "./OrganizationStep";
import { SessionStep } from "./SessionStep";
import { PaymentStep } from "./PaymentStep";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Hook7Logo } from "@/components/Hook7Logo";

interface OnboardingWizardProps {
  initialStep?: number;
  existingOrgId?: string | null;
}

export function OnboardingWizard({ initialStep = 0, existingOrgId = null }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [orgName, setOrgName] = useState("");
  const [orgId, setOrgId] = useState<string | null>(existingOrgId);
  const [sessionName, setSessionName] = useState("");
  const [notificationPhone, setNotificationPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const steps = [
    { title: t('onboarding.step1.title'), description: t('onboarding.step1.description') },
    { title: t('onboarding.step2.title'), description: t('onboarding.step2.description') },
    { title: t('onboarding.step3.title'), description: t('onboarding.step3.description') },
  ];

  const handleCreateOrg = async () => {
    if (!orgName.trim()) {
      toast.error(t('onboarding.errors.enterOrgName'));
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('onboarding.errors.userNotAuthenticated'));

      // Criar organização
      const { data: newOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({ name: orgName.trim() })
        .select()
        .single();

      if (orgError) throw orgError;

      // Atualizar usuário com a organização
      const { error: userError } = await supabase
        .from("users")
        .update({ organization_id: newOrg.id })
        .eq("id", user.id);

      if (userError) throw userError;

      setOrgId(newOrg.id);
      toast.success(t('onboarding.success.orgCreated'));
      setCurrentStep(1);
    } catch (error: any) {
      console.error("Erro ao criar organização:", error);
      toast.error(error.message || t('onboarding.errors.createOrgError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionStep = () => {
    if (!sessionName.trim()) {
      toast.error(t('onboarding.errors.enterSessionName'));
      return;
    }

    const regex = /^[a-zA-Z0-9-_]+$/;
    if (!regex.test(sessionName)) {
      toast.error(t('onboarding.errors.invalidSessionName'));
      return;
    }

    if (sessionName.length < 3 || sessionName.length > 50) {
      toast.error(t('onboarding.errors.sessionNameLength'));
      return;
    }

    setCurrentStep(2);
  };

  const handlePayment = async () => {
    if (!orgId || !sessionName) {
      toast.error(t('onboarding.errors.incompleteData'));
      return;
    }

    setIsLoading(true);

    try {
      // Criar sessão pendente
      const { data: newSession, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          name: sessionName.trim(),
          organization_id: orgId,
          requires_subscription: true,
          status: "pending_payment",
          notification_phone: notificationPhone || null
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      toast.info(t('onboarding.success.redirectingPayment'));

      // Criar checkout Stripe
      const { data, error } = await supabase.functions.invoke("create-stripe-checkout", {
        body: { session_id: newSession.id }
      });

      if (error) throw error;

      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Erro ao criar sessão de pagamento");
      }
    } catch (error: any) {
      console.error("Erro no checkout:", error);
      toast.error(error.message || t('onboarding.errors.checkoutError'));
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      // Se já tem org existente, não pode voltar para o passo 0
      if (currentStep === 1 && existingOrgId) {
        navigate("/dashboard");
        return;
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handleExit = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10 pointer-events-none" />
      
      {/* Botão de Sair */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExit}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-20 gap-1.5"
      >
        <X className="h-4 w-4" />
        {t('onboarding.exit')}
      </Button>
      
      <div className="w-full max-w-lg relative z-10">
        {/* Logo e Título */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Hook7Logo
            size={64}
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">
            {t('onboarding.welcome')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('onboarding.setupDescription')}
          </p>
        </motion.div>

        {/* Indicador de Steps */}
        <StepIndicator 
          steps={steps} 
          currentStep={currentStep} 
        />

        {/* Conteúdo do Step */}
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div
              key="org-step"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <OrganizationStep
                orgName={orgName}
                setOrgName={setOrgName}
                onNext={handleCreateOrg}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="session-step"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
            <SessionStep
                sessionName={sessionName}
                setSessionName={setSessionName}
                notificationPhone={notificationPhone}
                setNotificationPhone={setNotificationPhone}
                onNext={handleSessionStep}
                onBack={handleBack}
                isLoading={isLoading}
                showBack={!existingOrgId}
              />
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="payment-step"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <PaymentStep
                orgName={orgName || "Sua organização"}
                sessionName={sessionName}
                onConfirm={handlePayment}
                onBack={handleBack}
                isLoading={isLoading}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tempo estimado */}
        <motion.p 
          className="text-center text-sm text-muted-foreground mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {t('onboarding.estimatedTime')}
        </motion.p>
      </div>
    </div>
  );
}
