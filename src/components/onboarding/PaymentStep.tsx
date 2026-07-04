import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2, ArrowLeft, Clock } from "lucide-react";

interface PaymentStepProps {
  orgName: string;
  sessionName: string;
  onConfirm: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function PaymentStep({ orgName, sessionName, onConfirm, onBack, isLoading }: PaymentStepProps) {
  return (
    <Card className="bg-card border border-primary/30 shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Comece seu teste grátis</CardTitle>
        <CardDescription>
          Sem cartão de crédito. Cancele ou assine quando quiser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Resumo */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Organização:</span>
            <span className="font-medium">{orgName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Sessão:</span>
            <span className="font-medium">{sessionName}</span>
          </div>
        </div>

        {/* Trial */}
        <div className="text-center py-4 border-y">
          <div className="text-3xl font-bold text-primary">
            Grátis
          </div>
          <div className="text-muted-foreground text-sm">
            até 10 mensagens ou 48 horas, o que vier primeiro
          </div>
        </div>

        {/* Benefícios */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary flex-shrink-0" />
            <span>Conecte seu WhatsApp agora mesmo</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary flex-shrink-0" />
            <span>Envie mensagens reais via API</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary flex-shrink-0" />
            <span>Sem cartão de crédito necessário</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary flex-shrink-0" />
            <span>Assine só se quiser continuar depois</span>
          </div>
        </div>

        {/* Aviso do trial */}
        <div className="flex items-start gap-2 bg-muted/30 rounded-lg p-3">
          <Clock className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Ao atingir 10 mensagens enviadas ou 48 horas de teste, vamos pedir para você assinar para continuar usando.
          </p>
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1 h-12"
            disabled={isLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 h-12"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando...
              </>
            ) : (
              "Começar teste grátis"
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Ao continuar, você concorda com os{" "}
          <a href="/terms" className="text-primary hover:underline">Termos de Serviço</a>
        </p>
      </CardContent>
    </Card>
  );
}
