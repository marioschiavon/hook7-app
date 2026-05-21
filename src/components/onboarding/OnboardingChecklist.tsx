import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ChecklistStep {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const STEPS: ChecklistStep[] = [
  {
    id: "account",
    label: "Conta criada",
    description: "Bem-vindo ao Hook7! Sua conta já está ativa.",
    icon: "🎉",
  },
  {
    id: "org",
    label: "Organização configurada",
    description: "Crie sua organização para gerenciar suas sessões.",
    icon: "🏢",
  },
  {
    id: "session",
    label: "Primeira sessão criada",
    description: "Adicione uma sessão WhatsApp para começar.",
    icon: "📱",
  },
  {
    id: "connected",
    label: "WhatsApp conectado",
    description: "Conecte seu número via QR Code.",
    icon: "✅",
  },
  {
    id: "message",
    label: "Primeira mensagem enviada",
    description: "Envie uma mensagem de teste para validar a integração.",
    icon: "💬",
  },
];

const STORAGE_KEY = "hook7_onboarding_v1";
const DISMISSED_KEY = "hook7_onboarding_dismissed";

interface OnboardingState {
  completedSteps: string[];
  dismissed: boolean;
}

interface OnboardingChecklistProps {
  hasOrg: boolean;
  hasSessions: boolean;
  hasConnectedSession: boolean;
  hasSentMessage?: boolean;
}

export function OnboardingChecklist({
  hasOrg,
  hasSessions,
  hasConnectedSession,
  hasSentMessage = false,
}: OnboardingChecklistProps) {
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  // Compute completed steps from real data + localStorage for message sent
  const completedIds = [
    "account", // always done if logged in
    ...(hasOrg ? ["org"] : []),
    ...(hasSessions ? ["session"] : []),
    ...(hasConnectedSession ? ["connected"] : []),
    ...(hasSentMessage ? ["message"] : []),
  ];

  const completedCount = completedIds.length;
  const totalCount = STEPS.length;
  const progress = Math.round((completedCount / totalCount) * 100);
  const isComplete = completedCount === totalCount;

  useEffect(() => {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (stored === "true") setDismissed(true);
  }, []);

  // Auto-dismiss after completion with delay
  useEffect(() => {
    if (isComplete && !dismissed) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, "true");
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "rounded-xl border bg-gradient-to-br from-violet-500/5 via-background to-blue-500/5",
          "border-violet-500/20 shadow-sm overflow-hidden"
        )}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
          onClick={() => setExpanded((e) => !e)}
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-violet-500/10">
              <Zap className="h-4 w-4 text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {isComplete ? "🎉 Setup completo!" : "Comece aqui — Setup rápido"}
              </p>
              <p className="text-xs text-muted-foreground">
                {completedCount}/{totalCount} passos concluídos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 w-32">
              <Progress value={progress} className="h-1.5 flex-1" />
              <span className="text-xs font-semibold text-muted-foreground w-8 text-right">
                {progress}%
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Steps */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="px-5 pb-5 grid sm:grid-cols-5 gap-2">
                {STEPS.map((step, index) => {
                  const done = completedIds.includes(step.id);
                  const isNext = !done && completedIds.length === index;

                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "relative flex flex-col gap-2 p-3 rounded-lg border text-sm transition-all duration-200",
                        done
                          ? "bg-violet-500/8 border-violet-500/25 opacity-80"
                          : isNext
                          ? "bg-blue-500/5 border-blue-500/30 shadow-sm"
                          : "bg-muted/30 border-border/50 opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {done ? (
                          <CheckCircle2 className="h-4 w-4 text-violet-500 flex-shrink-0" />
                        ) : (
                          <Circle
                            className={cn(
                              "h-4 w-4 flex-shrink-0",
                              isNext ? "text-blue-500" : "text-muted-foreground/40"
                            )}
                          />
                        )}
                        <span className={cn("font-medium text-xs", done ? "line-through text-muted-foreground" : "")}>
                          {step.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                        {step.description}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
