import { Webhook, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Webhooks = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground/90">Webhooks</h1>
      </div>

      <Card className="glass-card border-foreground/5">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="p-4 rounded-2xl bg-purple-500/10">
            <Webhook className="h-10 w-10 text-purple-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground/90">Em breve</h2>
            <p className="text-sm text-foreground/50 max-w-xs">
              O painel de webhooks está sendo desenvolvido. Configure seus eventos de webhook nas configurações de cada sessão.
            </p>
          </div>
          <Button
            variant="outline"
            className="mt-2 border-foreground/10 text-foreground/70 hover:text-foreground"
            onClick={() => navigate("/sessions")}
          >
            Ir para Sessões
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Webhooks;
